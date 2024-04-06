import fs from "fs-extra";
import path from "path";
import winston from "winston";
import compilerConfig from "./config.js";
import CSSLoader from "./css-loader.js";
import FileLoader from "./file-loader.js";
import SassLoader from "./sass-loader.js";
import TsLoader from "./ts-loader.js";
import UILoader from "./ui-loader.js";
import XMLLoader from "./xml-loader.js";
import YAMLLoader from "./yaml-loader.js";
import JSONLoader from "./json-loader.js";

/** @type {Record<string, Loader>} */
const loaderMap = {
  "file-loader": FileLoader,
  "ui-loader": UILoader,
  "css-loader": CSSLoader,
  "sass-loader": SassLoader,
  "xml-loader": XMLLoader,
  "yaml-loader": YAMLLoader,
  "ts-loader": TsLoader,
  "json-loader": JSONLoader,
};

function getDirs() {
  const rootContext = process.cwd();
  const mkdir = (dirPath) => {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirpSync(dirPath);
    }
    return dirPath;
  };
  return {
    rootContext,
    appDirPath: mkdir(path.join(rootContext, "app")),
    buildDirPath: mkdir(path.join(rootContext, ".lcui/build")),
    sourceDirPath: mkdir(path.join(rootContext, "src")),
    modulesDirPath: path.join(rootContext, "node_modules"),
    modulesOutputDirPath: mkdir(path.join(rootContext, "vendor.node_modules")),
  };
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
 * 确定模块的引入路径
 * @param {string} name
 * @param {CompilerContext} context
 */
function resolveModuleImportPath(name, context) {
  if (!name.startsWith(context.rootContext) && isNodeModulePath(name)) {
    const { dir, ext } = path.parse(name);
    // 对于直接引入包名的，不做进一步解析，由 Node.js 确定模块文件路径
    if (!dir || !ext) {
      return name;
    }
    return path.join(context.modulesDirPath, name);
  }
  return path.resolve(context.context, name);
}

/**
 * 确定模块路径
 * @param {string} name
 * @param {CompilerContext} context
 */
function resolveModuleOutputPath(name, context) {
  let fullPath = name;
  if (!name.startsWith(context.rootContext) && isNodeModulePath(name)) {
    const { dir, ext } = path.parse(name);
    // 对于直接引入包名的，不做进一步解析，由 Node.js 确定模块文件路径
    if (!dir || !ext) {
      return name;
    }
    fullPath = path.join(context.modulesDirPath, name);
  } else {
    fullPath = path.resolve(context.context, name);
  }
  const resolvedPath = ["", ...compilerConfig.resolve.extensions]
    .map((ext) => `${fullPath}${ext}`)
    .find((p) => fs.existsSync(p));
  if (!resolvedPath) {
    throw new Error(`${name}: File does not exist`);
  }
  const modulesPath = path.join(context.buildDirPath, "node_modules");
  const outputPath = resolveModuleExt(
    path.join(
      context.buildDirPath,
      path.relative(context.rootContext, resolvedPath)
    )
  );
  // 更改路径，避免 import 语句中的模块路径被解析到构建目录中的 node_modules
  if (outputPath.startsWith(modulesPath)) {
    return path.join(
      context.buildDirPath,
      "[modules]",
      outputPath.substring(modulesPath.length)
    );
  }
  return outputPath;
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

  function createHook() {
    const taps = [];
    return {
      tap(name, fn) {
        taps.push({ name, fn });
      },
      async call(...args) {
        await Promise.all(
          taps.map(async ({ name, fn }) => {
            try {
              await fn(...args);
            } catch (err) {
              logger.error(
                `in ${name}:\n${
                  err instanceof Error ? `${err.message}\n${err.stack}` : err
                }`
              );
              throw err;
            }
          })
        );
      },
    };
  }

  /** @type {CompilerInstance} */
  const compiler = {
    options,
    logger,
    hooks: {
      loadModule: createHook(),
      done: createHook(),
    },
  };

  if (Array.isArray(compilerConfig.plugins)) {
    compilerConfig.plugins.forEach((plugin) => plugin.apply(compiler));
  }

  /** @type {ModuleCacheMap} */
  const moduleCacheMap = {};

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

  /**
   * @param {string} modulePath
   * @param {LoaderContext} context
   * @returns {ModuleCacheItem}
   */
  function useModuleCache(modulePath, context) {
    const outputPath = resolveModuleOutputPath(modulePath, context);
    const outputDirPath = path.dirname(outputPath);
    let cache = moduleCacheMap[outputPath];
    if (cache) {
      return cache;
    }
    if (
      outputDirPath.startsWith(context.buildDirPath) &&
      !fs.existsSync(outputDirPath)
    ) {
      fs.mkdirpSync(outputDirPath);
    }
    cache = {
      state: "pending",
      outputPath,
    };
    moduleCacheMap[outputPath] = cache;
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
    context.logger.debug(
      `Generating ${path.relative(context.rootContext, cache.outputPath)}`
    );
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
   */
  async function loadModule(resourcePath, loaders) {
    const data = {};
    const context = createCompilerContext(resourcePath);
    const content = await loaders.reduceRight(async (inputPromise, config) => {
      const input = await inputPromise;
      try {
        return await (function LOADER_EXECUTION() {
          return config.loader.call(
            {
              ...context,
              data,
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
    compiler.hooks.loadModule.call(resourcePath, data);
    return {
      content,
      resourceOutputPath: context.resourceOutputPath,
    };
  }

  /**
   * 加载模块
   * @param {string} resourcePath
   * @param {LoaderRule[]} loaders
   * @param {CompilerContext} context
   */
  async function importModule(resourcePath, loaders, context) {
    const resolvedPath = resolveModuleImportPath(resourcePath, context);
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
        `Compiling ${path.relative(context.rootContext, resolvedPath)}`
      );
      const result = await loadModule(resolvedPath, loaders);
      if (result.content !== undefined) {
        context.logger.debug(
          `Generating ${path.relative(
            context.rootContext,
            result.resourceOutputPath
          )}`
        );
        fs.writeFileSync(result.resourceOutputPath, result.content);
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
    let outputPath = resourcePath;
    if (resourcePath.startsWith(options.modulesDirPath)) {
      outputPath = path.join(
        options.modulesOutputDirPath,
        resourcePath.substring(options.modulesDirPath.length + 1)
      );
      if (!fs.existsSync(path.dirname(outputPath))) {
        fs.mkdirpSync(path.dirname(outputPath));
      }
    }
    /** @type {CompilerContext} */
    const context = {
      ...options,
      logger,
      resourcePath,
      resourceOutputPath: `${outputPath}.h`,
      context: path.dirname(resourcePath),
      emitFile(name, content) {
        const outputPath = path.resolve(options.appDirPath, name);
        const outputDir = path.dirname(outputPath);
        if (!fs.existsSync(outputDir)) {
          fs.mkdirpSync(outputDir);
        }
        logger.info(`Emitting ${name}`);
        fs.writeFile(outputPath, content);
      },
      emitError(error) {
        printError(resourcePath, error);
      },
      resolveOutput(name) {
        // TODO: 引入项目目录外的文件时，将路径转换成 buildDirPath 内
        return path.resolve(context.context, `${name}.h`);
      },
      resolveModule(name) {
        return resolveModuleOutputPath(name, context);
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
    compiler.hooks.done.call();
    logger.info("Compilation completed!");
  } catch (err) {
    logger.error("Compilation failed!");
    logger.error(`For more details, please refer to the log file: ${logFile}`);
    throw new Error("Compilation failed!");
  }
}
