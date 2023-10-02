interface ModuleInfo {
  path: string;
  outputPath: string;
  content: LoaderInput;
}

interface ImporterContext {
  /**
   * 模块所在的目录
   * 可以用作解析其他模块成员的上下文
   **/
  context: string;

  /** 根目录 */
  rootContext: string;

  /** 资源文件的路径 */
  resourcePath: string;

  /** 资源文件的输出路径 */
  resourceOutputPath: string;

  appDirPath: string;
  buildDirPath: string;
  assetsDirPath: string;

  emitError(err: Error): void;

  /** 确定资源文件的输出路径 */
  resolveOutput(name: string): string;

  /** 确定资源文件的模块路径 */
  resolveModule(name: string): string;

  /** 引入模块 */
  importModule(name: string): Promise<any>;

  /** 生成模块 */
  generateModule(name: string, generator: () => Promise<void>): Promise<void>;
}

interface LoaderContext extends ImporterContext {
  /** 获取配置选项 */
  getOptions(): any;
}

interface ResourceNode {
  name: string;
  text?: string;
  attributes?: Record<string, any>;
  children?: ResourceNode[];
}

type LoaderOptions = Record<string, any>;

type LoaderInput = string | Buffer | ResourceNode;

type Loader = (
  this: LoaderContext,
  content: LoaderInput
) => LoaderInput | Promise<undefined>;

type ModuleRuleUseConfig =
  | string
  | (
      | {
          loader: string | Loader;
          options: LoaderOptions;
        }
      | string
    )[];

interface ModuleRule {
  test: RegExp | ((path: string) => boolean);
  use: ModuleRuleUseConfig;
}

interface ModuleCacheItem {
  state: "pending" | "loading" | "loaded";
  promise: Promise<LoaderInput>;
  resolve: () => void;
  reject: (err: Error) => void;
}

type ModuleCacheMap = Record<string, ModuleCacheItem>;
