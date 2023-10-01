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

  appDirPath: string;
  buildDirPath: string;
  assetsDirPath: string;

  importModule(name: string): Promise<void>;

  generateModule(name: string, generator: () => Promise<void>): void;

  emitError(err: Error): void;
}

interface LoaderContext extends ImporterContext {
  async(): (err: Error, data?: LoaderInput) => void;
  resolve(path: string): string;
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
