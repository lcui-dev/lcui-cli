import fs from "fs-extra";
import path from "path";
import compilerConfig from "./compiler/config.js";

/** @type {Record<string, Loader>} */
const loaderMap = {};

function getDirs() {
  const rootContext = process.cwd();
  const appDir = path.join(rootContext, "app");
  const dirs = {
    rootContext,
    appDirPath,
    buildDirPath: path.join(rootContext, ".lcui/build"),
    sourceDirPath: path.join(rootContext, "src"),
    assetsDirPath: path.join(appDir, "assets"),
  };
  Object.keys(dirs).forEach((key) => {
    if (!fs.existsSync(dirs[key])) {
      fs.mkdirpSync(dirs[key]);
    }
  });
  return dirs;
}

/**
 * 确定加载器配置
 * @param {ModuleRuleUseConfig} config
 */
function resolveLoaders(config) {
  const loaders =
    typeof config === "string" ? [{ loader: config, options: {} }] : config;

  if (!Array.isArray(loaders)) {
    throw new Error(`invalid loader configuration for this file`);
  }
  return loaders.map((loaderConfig) => {
    let { loader, options } =
      typeof loaderConfig === "string"
        ? { loader: loaderConfig, options: {} }
        : loaderConfig;

    if (typeof loaderConfig === "string") {
      loader = loaderConfig.loader;
    }
    if (typeof loader === "string") {
      loader = loaderMap[loaderConfig.loader];
    }
    return { loader, options };
  });
}

function resolveModuleExt(modulePath) {
  const { dir, name, ext } = path.parse(modulePath);
  const newExt = compilerConfig.resolve.extensions.includes(ext) ? "" : ext;
  return path.join(dir, `${name}${newExt}.js`);
}

/**
 * 确定模块路径
 * @param {string} name
 * @param {ImporterContext} context
 */
function resolveModulePath(name, context) {
  const fullPath = path.resolve(context.context, name);
  const resolvedPath = ["", ...compilerConfig.resolve.extensions]
    .map((ext) => `${fullPath}${ext}`)
    .find((p) => fs.existsSync(p));
  if (resolvedPath) {
    return resolveModuleExt(resolvedPath);
  }
  return null;
}

/**
 * 确定模块输出路径
 * @param {string} name
 * @param {ImporterContext} context
 */
function resolveModuleOutputPath(name, context) {
  return resolveModuleExt(
    path.resolve(context.buildDirPath, path.relative(context.rootContext, name))
  );
}

export default async function compile(file, compilerOptions) {
  const errors = [];
  const options = {
    ...getDirs(),
    ...compilerOptions,
  };

  /** @type {ModuleCacheMap} */
  const mdouleCacheMap = {};

  function useModuleCache(mdoulePath) {
    let cache = mdouleCacheMap[mdoulePath];
    if (cache) {
      return cache;
    }
    cache = {
      state: "pending",
      promise: new Promise((resolve, reject) => {
        cache.resolve = () => {
          cache.state = "loaded";
          resolve();
        };
        cache.reject = (err) => {
          cache.state = "loaded";
          reject(err);
        };
      }),
    };
    mdouleCacheMap[resourcePath] = cache;
    return cache;
  }

  async function generateModule(modulePath, moduleGenerator, context) {
    const cache = useModuleCache(modulePath);
    try {
      const content = await moduleGenerator();
      const outputPath = resolveModuleOutputPath(modulePath, context);
      fs.writeFileSync(outputPath, content);
    } catch (err) {
      if (cache.state === "loaded") {
        errors.push({
          resourcePath: context.resourcePath,
          error: err,
        });
      } else {
        cache.reject(err);
      }
      return;
    }
    if (cache.state != "loaded") {
      cache.resolve();
    }
  }

  async function importModule(resourcePath, context) {
    const cache = useModuleCache(resourcePath);
    if (cache.state === "pending") {
      cache.state = "loading";
      compileModule(resourcePath, context);
    }
    return cache.promise;
  }

  async function loadModule(resourcePath, context) {
    const cache = useModuleCache(resourcePath);
    if (cache.state === "pending") {
      cache.state = "loading";
      await compileModule(resourcePath, context);
      cache.resolve();
    }
  }

  function createImporterContext(resourcePath) {
    /** @type {ImporterContext} */
    const context = {
      ...options,
      resourcePath,
      resourceOutputPath: `${resourcePath}.h`,
      emitError(error) {
        errors.push({ resourcePath, error });
      },
      resolveOutput(name) {
        // TODO: 引入项目目录外的文件时，将路径转换成 buildDirPath 内
        return path.resolve(context.context, `${name}.h`);
      },
      resolveModule(name) {
        return resolveModulePath(name, context);
      },
      importModule(name) {
        return importModule(resolveModulePath(name), context);
      },
      generateModule(name, generator) {
        return generateModule(resolveModulePath(name), generator, context);
      },
    };
    return context;
  }

  /**
   * 编译模块
   * @param {string} resourcePath
   * @param {ImporterContext} context
   * @returns {void}
   */
  async function compileModule(resourcePath, context) {
    const matchedRule = compilerConfig.module.rules.find((rule) => {
      if (rule.test instanceof Function) {
        return rule.test(filePath);
      }
      return rule.test.test(filePath);
    });
    if (!matchedRule) {
      const err = new Error("no matching loader found");
      emitError(err);
      return err;
    }
    const result = await resolveLoaders(matchedRule.use).reduceRight(
      (inputPromise, config) =>
        inputPromise.then((input) => {
          if (input instanceof Error) {
            return input;
          }
          try {
            return await(function LOADER_EXECUTION() {
              return config.loader.call(
                {
                  ...context,
                  getOptions() {
                    return config.options;
                  },
                },
                input
              );
            })();
          } catch (err) {
            return err;
          }
        }),
      Promise.resolve(fs.readFileSync(resourcePath))
    );
    if (result instanceof Error) {
      context.emitError(result);
    } else if (result !== undefined) {
      fs.writeFileSync(context.outputPath, result);
    }
  }

  async function compileFile(filePath) {
    if (fs.statSync(filePath).isDirectory()) {
      return Promise.all(
        fs
          .readdirSync(filePath)
          .map((name) => compileFile(path.join(filePath, name)))
      );
    }
    return loadModule(filePath, createImporterContext(filePath));
  }

  if (fs.existsSync(file)) {
    throw new Error(`${file}: no such file or directory`);
  }
  await compileFile(file);
}
