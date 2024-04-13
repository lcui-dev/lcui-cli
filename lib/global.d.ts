interface ModuleMetadata {
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

interface Module extends Record<string, any> {
  default: any;
  metadata: ModuleMetadata;
}

interface CompilerOptions {
  verbose?: boolean;
  /**
   * 模块所在的目录
   * 可以用作解析其他模块成员的上下文
   **/
  context: string;

  /** 根目录 */
  rootContext: string;

  appDirPath: string;

  buildDirPath: string;

  modulesDirPath: string;
  modulesOutputDirPath: string;
}

interface Hook<T = ((...args: any[]) => Promise<void>)> {
  tap(name: string, fn: T): void;
  call: T;
}

interface CompilerContext extends CompilerOptions {
  /** 资源文件的路径 */
  resourcePath: string;

  /** 资源文件的输出路径 */
  resourceOutputPath: string;

  emitError(err: Error): void;

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
    generator: () => Promise<string | Buffer>
  ): Promise<void>;

  logger: import("winston").Logger
}

interface LoaderContext extends CompilerContext {
  data: Record<string, any>;
  /** 获取配置选项 */
  getOptions(): any;
}

interface CompilerInstance {
  options: CompilerOptions;
  logger: import("winston").Logger;
  hooks: {
    loadModule: Hook<(file: string, data: Record<string, any>) => void>;
    done: Hook;
  };
}

interface ComponentConfig {
  headerFilePath: string;
  resourceLoaderName: string;
  assets: Module[];
  components: string[];
}

interface ResourceNode {
  name: string;
  text?: string;
  attributes?: Record<string, any>;
  children?: ResourceNode[];
}

type LoaderOptions = Record<string, any>;

interface UILoaderOptions extends LoaderOptions {
  indent?: number;
}

type LoaderInput = string | Buffer | ResourceNode;

type Loader = (
  this: LoaderContext,
  content: LoaderInput
) => LoaderInput | Promise<undefined>;

type LoaderRule = {
  loader: string | Loader;
  options: LoaderOptions;
};

type ModuleRuleUseConfig = string | (LoaderRule | string)[];

interface ModuleRule {
  test: RegExp | ((path: string) => boolean);
  use: ModuleRuleUseConfig;
}

interface ModuleCacheItem {
  state: "pending" | "loading" | "loaded";
  outputPath: string;
  exports: Promise<Module>;
  resolve: (exports: Module) => void;
  reject: (err: Error) => void;
}

type ModuleCacheMap = Record<string, ModuleCacheItem>;
