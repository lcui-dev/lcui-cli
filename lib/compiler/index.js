import fs from "fs-extra";
import path from "path";
import compilerConfig from "./config.js";
import CSSLoader from "./css-loader.js";
import FileLoader from "./file-loader.js";
import SassLoader from "./sass-loader.js";
import TsLoader from "./tsx-loader.js";
import UILoader from "./ui-loader.js";
import XMLLoader from "./xml-loader.js";
import YAMLLoader from "./yaml-loader.js";

/** @type {Record<string, Loader>} */
const loaderMap = {
  "file-loader": FileLoader,
  "ui-loader": UILoader,
  "css-loader": CSSLoader,
  "sass-loader": SassLoader,
  "xml-loader": XMLLoader,
  "yaml-loader": YAMLLoader,
  "ts-loader": TsLoader,
};

class ModuleResolveError extends Error {
  constructor(msg) {
    super(msg);
    this.name = "ModuleResolveError";
  }
}

function getDirs() {
  const rootContext = process.cwd();
  const appDirPath = path.join(rootContext, "app");
  const dirs = {
    rootContext,
    appDirPath,
    buildDirPath: path.join(rootContext, ".lcui/build"),
    sourceDirPath: path.join(rootContext, "src"),
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
  let loaders;

  if (typeof config === "string") {
    loaders = [{ loader: config, options: {} }];
  } else if (Array.isArray(config)) {
    loaders = config;
  } else {
    loaders = [config];
  }
  return loaders.map((item) => {
    let loader;
    let options = {};

    if (typeof item === "string") {
      loader = loaderMap[item];
    } else if (typeof item.loader === "string") {
      loader = loaderMap[item.loader];
      options = item.options || {};
    }
    if (!loader) {
      throw new Error(`invalid loader configuration: ${JSON.stringify(item)}`);
    }
    return { loader, options };
  });
}

function resolveModuleExt(modulePath) {
  const { dir, name, ext } = path.parse(modulePath);
  const newExt = compilerConfig.resolve.extensions.includes(ext) ? "" : ext;
  return path.join(dir, `${name}${newExt}.mjs`);
}

function isNodeModulePath(name) {
  const { root, dir } = path.parse(name.replace(/\\|\//g, "/"));
  return (
    !root &&
    dir !== "." &&
    dir !== ".." &&
    !dir.startsWith(`./`) &&
    !dir.startsWith(`../`)
  );
}

/**
 * 确定模块路径
 * @param {string} name
 * @param {ImporterContext} context
 */
function resolveModulePath(name, context) {
  // TODO: 支持 alias 配置路径别名
  if (!name.startsWith(context.rootContext) && isNodeModulePath(name)) {
    const { dir, ext } = path.parse(name);
    if (!dir || !ext) {
      return name;
    }
    return path.join(context.buildDirPath, "node_modules", `${name}.mjs`);
  }
  const fullPath = path.resolve(context.context, name);
  const resolvedPath = ["", ...compilerConfig.resolve.extensions]
    .map((ext) => `${fullPath}${ext}`)
    .find((p) => fs.existsSync(p));
  if (resolvedPath) {
    return resolveModuleExt(
      path.join(
        context.buildDirPath,
        path.relative(context.rootContext, resolvedPath)
      )
    );
  }
  throw new ModuleResolveError(`${name}: File does not exist`);
}

function printError(resourcePath, error) {
  console.error(`Error in: ${resourcePath}:`);
  console.error(error);
}

export default async function compile(file, compilerOptions) {
  const options = {
    ...getDirs(),
    ...compilerOptions,
  };

  /** @type {ModuleCacheMap} */
  const mdouleCacheMap = {};

  function useModuleCache(modulePath, context) {
    const outputPath = resolveModulePath(modulePath, context);
    const outputDirPath = path.dirname(outputPath);
    let cache = mdouleCacheMap[outputPath];
    if (cache) {
      return cache;
    }
    if (!fs.existsSync(outputDirPath)) {
      fs.mkdirpSync(outputDirPath);
    }
    cache = {
      state: "pending",
      outputPath,
    };
    mdouleCacheMap[outputPath] = cache;
    cache.exports = new Promise((resolve, reject) => {
      cache.resolve = (exports) => {
        cache.state = "loaded";
        resolve(exports);
      };
      cache.reject = (err) => {
        cache.state = "loaded";
        reject(err);
      };
    });
    return cache;
  }

  async function generateModule(modulePath, moduleGenerator, context) {
    const cache = useModuleCache(modulePath, context);
    try {
      const content = await moduleGenerator();
      fs.writeFileSync(cache.outputPath, content);
      cache.resolve(await import(`file://${cache.outputPath}`));
    } catch (err) {
      printError(modulePath, err);
      cache.reject(err);
    }
  }

  async function importModule(resourcePath, loaders, context) {
    const resolvedPath = isNodeModulePath(resourcePath)
      ? resourcePath
      : path.resolve(context.context, resourcePath);
    const cache = useModuleCache(resolvedPath, context);
    if (cache.state === "pending") {
      cache.state = "loading";
      if (loaders.length > 0) {
        try {
          await compileModule(resolvedPath, loaders, context);
          cache.resolve(await import(`file://${cache.outputPath}`));
        } catch (err) {
          err.message = `in ${resolvedPath}:\n${err.message}`;
          context.emitError(err);
          cache.reject(err);
        }
      } else {
        cache.resolve({ default: null, metadata: { type: "javascript" } });
      }
    }
    return cache.exports;
  }

  function createImporterContext(resourcePath) {
    /** @type {ImporterContext} */
    const context = {
      ...options,
      resourcePath,
      resourceOutputPath: `${resourcePath}.h`,
      context: path.dirname(resourcePath),
      emitError(error) {
        printError(resourcePath, error);
      },
      resolveOutput(name) {
        // TODO: 引入项目目录外的文件时，将路径转换成 buildDirPath 内
        return path.resolve(context.context, `${name}.h`);
      },
      resolveModule(name) {
        return resolveModulePath(name, context);
      },
      importModule(name) {
        const loaders = matchLoaders(name);
        return importModule(name, loaders, context);
      },
      generateModule(name, generator) {
        return generateModule(name, generator, context);
      },
    };
    return context;
  }

  function matchLoaders(resourcePath) {
    const matchedRule = compilerConfig.module.rules.find((rule) => {
      if (rule.test instanceof Function) {
        return rule.test(resourcePath);
      }
      return rule.test.test(resourcePath);
    });
    if (!matchedRule) {
      return [];
    }
    return resolveLoaders(matchedRule.use);
  }

  /**
   * 编译模块
   * @param {string} resourcePath
   * @param {LoaderRule[]} loaders
   * @param {ImporterContext} context
   */
  async function compileModule(resourcePath, loaders, context) {
    const result = await loaders.reduceRight(async (inputPromise, config) => {
      const input = await inputPromise;
      try {
        return await (function LOADER_EXECUTION() {
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
        err.message = `(from ${config.loader.name}): ${err.message}`;
        context.emitError(err);
        throw err;
      }
    }, Promise.resolve(fs.readFileSync(resourcePath)));
    if (result !== undefined) {
      fs.writeFileSync(context.resourceOutputPath, result);
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
    const loaders = matchLoaders(filePath);
    if (loaders.length > 0) {
      await importModule(filePath, loaders, createImporterContext(filePath));
    }
  }

  if (!fs.existsSync(file)) {
    throw new Error(`${file}: no such file or directory`);
  }
  try {
    await compileFile(path.resolve(file));
  } catch (err) {
    throw new Error("Compilation failed!");
  }
}
