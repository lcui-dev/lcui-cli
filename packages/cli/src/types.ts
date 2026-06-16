export interface ModuleMetadata {
  type: "javascript" | "asset";

  /** 资源文件所在路径 */
  path: string;

  /** 资源文件输出路径 */
  outputPath: string;

  /** 加载该资源时需要包含的 C 头文件 */
  headerFiles: string[];

  /**
   * 初始化代码
   * 加载该资源所需要执行的 C 代码
   **/
  initCode: string;
}

export interface Module extends Record<string, unknown> {
  default: unknown;
  metadata: ModuleMetadata;
}

export interface CompilerOptions {
  verbose?: boolean;
  clean?: boolean;
  /**
   * 忽略 build manifest，强制重编所有文件。
   * 等价于先删除 .lcui/build/manifest.json 再 build。
   */
  force?: boolean;
  /**
   * 编译完成后跳过 xmake 调用。
   * 即使存在 xmake.lua 也不会触发本机 C 编译，便于上层流程自行控制。
   */
  skipXMake?: boolean;
  /**
   * 模块所在的目录
   * 可以用作解析其他模块成员的上下文
   **/
  context: string;

  /** 根目录 */
  rootContext: string;

  distDir: string;
  appDir: string;
  sourceDir: string;
  buildDir: string;
  modulesDir: string;
  modulesOutputDir: string;
}

/**
 * 钩子处理函数。
 * 允许返回 void 或 Promise<void>；hook.call 会等待所有 tap 完成。
 */
export type HookHandler<Args extends unknown[]> = (...args: Args) => void | Promise<void>;

export interface Hook<Args extends unknown[] = unknown[]> {
  tap(name: string, fn: HookHandler<Args>): void;
  call(...args: Args): Promise<void>;
}

export interface CompilerContext extends CompilerOptions {
  /** 资源文件的路径 */
  resourcePath: string;

  /**
   * 当前正在编译的"顶层入口"路径。一个入口在 loader 链内可能 importModule
   * 出更多子模块；不论嵌套多深，这些子模块的依赖关系都会回溯到这个 entryPath，
   * 用作 build manifest 的 key。
   */
  entryPath?: string;

  /** 资源文件的输出路径 */
  resourceOutputPath: string;

  emitError(err: string | Error): void;

  /** 确定资源文件的输出路径 */
  resolveOutput(name: string): string;

  /** 确定资源文件的模块路径 */
  resolveModule(name: string): string;

  /** 引入与资源文件对应的模块 */
  importModule(name: string): Promise<Module>;

  /** 输出文件 */
  emitFile(name: string, content: string | Buffer): void;

  /**
   * 声明一个已存在的文件是该 entry 的产物（用于缓存校验）。
   * loader 可在生成骨架文件后调用此方法，确保该文件在 manifest 中被追踪，
   * 从而在文件被删除时能正确触发重新编译。
   */
  addOutput(filePath: string): void;

  /** 生成模块 */
  generateModule(
    name: string,
    generator: () => string | Buffer | Promise<string | Buffer>
  ): Promise<void>;

  logger: import("winston").Logger;
}

export interface LoaderContext extends CompilerContext {
  data: Record<string, unknown>;
  /**
   * 获取调用方在 LoaderRule.options 里配置的选项。
   * 调用处可通过类型参数 T 指定具体形态。
   */
  getOptions<T = LoaderOptions>(): T;
  /**
   * 声明该 loader 在处理当前资源时读取了一个外部文件。
   * 这些依赖会随同 entry 写入 build manifest，下次 build 时若依赖文件
   * 内容变化，则会失效缓存并重新跑 loader 链。
   *
   * 注意：通过 `importModule` 引入的子模块会自动作为依赖记录，loader
   * 一般无需手动 addDependency；仅在 loader 直接 fs.readFile / sass @import
   * 等场景下需要显式调用。
   */
  addDependency(filePath: string): void;
}

export interface CompilerInstance {
  options: CompilerOptions;
  logger: import("winston").Logger;
  hooks: {
    loadModule: Hook<[file: string, data: Record<string, unknown>]>;
    done: Hook<[]>;
  };
  /**
   * 本次 build 真正写盘 / 内容发生改变的所有产物文件绝对路径。
   * AppPlugin 与外部插件可据此决定是否触发下游构建（例如 xmake）。
   */
  changedOutputs: Set<string>;
}

export interface ComponentConfig {
  headerFilePath: string;
  resourceLoaderName: string;
  assets: Module[];
  components: string[];
}

export interface ResourceNode {
  name: string;
  text?: string;
  attributes?: Record<string, unknown>;
  children?: ResourceNode[];
}

export type LoaderOptions = Record<string, unknown>;

export interface UILoaderOptions extends LoaderOptions {
  filePath: string;
  indent?: number;
}

export type LoaderInput = string | Buffer | ResourceNode | object;

/**
 * 单个 loader 的类型。
 * - TIn  : 该 loader 接受的输入（上一个 loader 的输出 / 源文件 Buffer）
 * - TOut : 该 loader 的输出；允许 void，例如 file-loader 只产生副作用
 */
export type Loader<TIn = LoaderInput, TOut = LoaderInput | void> = (
  this: LoaderContext,
  content: TIn
) => TOut | Promise<TOut>;

/**
 * 异构 loader 集合中使用的宽松类型。
 * loaderMap、ResolvedLoaderRule 等"装载不同形态 loader 的容器"使用它。
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyLoader = Loader<any, any>;

export type ResolvedLoaderRule = {
  loader: AnyLoader;
  options: LoaderOptions;
};

export type LoaderRule = {
  loader: string | AnyLoader;
  options: LoaderOptions;
};

export type ModuleRuleUseConfig = string | LoaderRule | (LoaderRule | string)[];

export interface ModuleRule {
  test: RegExp | ((path: string) => boolean);
  use: ModuleRuleUseConfig;
}

export interface ModuleCacheItem {
  state: "pending" | "loading" | "loaded";
  outputPath: string;
  exports: Promise<Module>;
  resolve: (exports: Module) => void;
  reject: (err: Error) => void;
}

export type ModuleCacheMap = Record<string, ModuleCacheItem>;

/**
 * 把任意 catch 出来的 unknown 规整成 Error。
 * 配合 useUnknownInCatchVariables 使用。
 */
export function toError(e: unknown): Error {
  if (e instanceof Error) {
    return e;
  }
  return new Error(typeof e === "string" ? e : JSON.stringify(e));
}

/**
 * 让 loader 可以在 Error 实例上挂一个标志，
 * 表示错误已被 emitError 报告过、上层不需要重复输出。
 */
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  interface Error {
    isReported?: boolean;
  }
}
