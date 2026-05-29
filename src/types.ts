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
}

export interface CompilerInstance {
  options: CompilerOptions;
  logger: import("winston").Logger;
  hooks: {
    loadModule: Hook<[file: string, data: Record<string, unknown>]>;
    done: Hook<[]>;
  };
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
