import fs from "fs-extra";
import path from "path";
import winston from "winston";
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
      throw new Error(`Invalid loader configuration: ${JSON.stringify(item)}`);
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
 * @param {CompilerContext} context
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
  throw new Error(`${name}: File does not exist`);
}

function createLogger(logFile, verbose) {
  const levelKey = Symbol.for("level");
  const fmt = winston.format;
  const logFormatter = fmt.printf((info) => {
    if (info[levelKey] === "info" || info[levelKey] === "debug") {
      return info.message;
    }
    return `${info.level}: ${info.message}`;
  });
  return winston.createLogger({
    level: verbose ? "debug" : "info",
    transports: [
      new winston.transports.Console({
        level: verbose ? "debug" : "info",
        format: fmt.combine(fmt.colorize(), logFormatter),
      }),
      new winston.transports.File({
        filename: logFile,
        format: logFormatter,
      }),
    ],
  });
}

/**
 * @param {string} file 文件或目录路径
 * @param {CompilerOptions} compilerOptions 编译选项
 */
export default async function compile(file, compilerOptions) {
  /** @type {CompilerOptions} */
  const options = {
    ...getDirs(),
    ...compilerOptions,
  };
  const logFile = path.join(options.buildDirPath, "compile.log");
  const logger = createLogger(logFile, options.verbose);

  /** @type {ModuleCacheMap} */
  const mdouleCacheMap = {};

  /**
   * @param {string} resourcePath
   * @param {string | Error} error
   */
  function printError(resourcePath, error) {
    logger.error(
      `in ${resourcePath}:\n${
        error instanceof Error ? `${error.message}\n${error.stack}` : error
      }`
    );
  }

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

  /**
   * 加载模块
   * @param {string} resourcePath
   * @param {LoaderRule[]} loaders
   * @param {CompilerContext} context
   */
  async function loadModule(resourcePath, loaders, context) {
    return loaders.reduceRight(async (inputPromise, config) => {
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
        context.emitError(
          `ModuleLoaderError (from ${config.loader.name}): ${err.message}\n${err.stack}`
        );
        err.isReported = true;
        throw err;
      }
    }, Promise.resolve(fs.readFileSync(resourcePath)));
  }

  /**
   * 加载模块
   * @param {string} resourcePath
   * @param {LoaderRule[]} loaders
   * @param {CompilerContext} context
   */
  async function importModule(resourcePath, loaders, context) {
    const resolvedPath = isNodeModulePath(resourcePath)
      ? resourcePath
      : path.resolve(context.context, resourcePath);
    const cache = useModuleCache(resolvedPath, context);

    if (cache.state !== "pending") {
      return cache.exports;
    }
    cache.state = "loading";
    if (loaders.length < 1) {
      cache.resolve({ default: null, metadata: { type: "javascript" } });
      return cache.exports;
    }
    try {
      context.logger.info(
        `Compling ${path.relative(context.rootContext, resourcePath)}`
      );
      const result = await loadModule(resourcePath, loaders, context);
      if (result !== undefined) {
        context.logger.debug(
          `Generating ${path.relative(
            context.rootContext,
            context.resourceOutputPath
          )}`
        );
        fs.writeFileSync(context.resourceOutputPath, result);
      }
      cache.resolve(await import(`file://${cache.outputPath}`));
    } catch (err) {
      if (!err.isReported) {
        context.emitError(err);
      }
      cache.reject(err);
      throw err;
    }
    return cache.exports;
  }

  function createCompilerContext(resourcePath) {
    /** @type {CompilerContext} */
    const context = {
      ...options,
      logger,
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
      await importModule(filePath, loaders, createCompilerContext(filePath));
    }
  }

  if (!fs.existsSync(file)) {
    throw new Error(`${file}: no such file or directory`);
  }
  try {
    await compileFile(path.resolve(file));
    logger.info("Compilation completed!");
  } catch (err) {
    logger.error("Compilation failed!");
    logger.error(`For more details, please refer to the log file: ${logFile}`);
    throw new Error("Compilation failed!");
  }
}
