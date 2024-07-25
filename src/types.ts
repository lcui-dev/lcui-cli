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

export interface Module extends Record<string, any> {
  default: any;
  metadata: ModuleMetadata;
}

export interface CompilerOptions {
  verbose?: boolean;
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

export interface Hook<T = (...args: any[]) => any> {
  tap(name: string, fn: T): void;
  call: T;
}

export interface CompilerContext extends CompilerOptions {
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
    generator: () => string | Buffer | Promise<string | Buffer>
  ): Promise<void>;

  logger: import("winston").Logger;
}

export interface LoaderContext extends CompilerContext {
  data: Record<string, any>;
  /** 获取配置选项 */
  getOptions(): any;
}

export interface CompilerInstance {
  options: CompilerOptions;
  logger: import("winston").Logger;
  hooks: {
    loadModule: Hook<(file: string, data: Record<string, any>) => void>;
    done: Hook;
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
  attributes?: Record<string, any>;
  children?: ResourceNode[];
}

export type LoaderOptions = Record<string, any>;

export interface UILoaderOptions extends LoaderOptions {
  indent?: number;
}

export type LoaderInput = string | Buffer | ResourceNode;

export type Loader = (
  this: LoaderContext,
  content: LoaderInput
) => LoaderInput | Promise<LoaderInput>;

export type LoaderRule = {
  loader: string | Loader;
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
