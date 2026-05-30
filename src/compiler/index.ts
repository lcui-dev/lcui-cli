import fs from "fs-extra";
import path from "path";
import { pathToFileURL } from "url";
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
import { resolveRootDir } from "../utils.js";
import {
  AnyLoader,
  CompilerContext,
  CompilerInstance,
  CompilerOptions,
  Hook,
  HookHandler,
  LoaderInput,
  LoaderOptions,
  LoaderRule,
  Module,
  ModuleCacheItem,
  ModuleCacheMap,
  ModuleRuleUseConfig,
  ResolvedLoaderRule,
  toError,
} from "../types.js";

const loaderMap: Record<string, AnyLoader> = {
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
  const rootContext = resolveRootDir();
  const mkdir = (dirPath: string): string => {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirpSync(dirPath);
    }
    return dirPath;
  };
  return {
    rootContext,
    distDir: mkdir(path.join(rootContext, "dist")),
    buildDir: mkdir(path.join(rootContext, ".lcui/build")),
    appDir: path.join(rootContext, "app"),
    sourceDir: path.join(rootContext, "src"),
    modulesDir: path.join(rootContext, "node_modules"),
    modulesOutputDir: mkdir(path.join(rootContext, "vendor.node_modules")),
  };
}

function resolveLoaders(config: ModuleRuleUseConfig): ResolvedLoaderRule[] {
  let loaders: (LoaderRule | string)[];

  if (typeof config === "string") {
    loaders = [{ loader: config, options: {} }];
  } else if (Array.isArray(config)) {
    loaders = config;
  } else {
    loaders = [config];
  }
  return loaders.map((item) => {
    let loader: AnyLoader | undefined;
    let options: LoaderOptions = {};

    if (typeof item === "string") {
      loader = loaderMap[item];
    } else if (typeof item.loader === "string") {
      loader = loaderMap[item.loader];
      options = item.options || {};
    } else {
      loader = item.loader;
      options = item.options || {};
    }
    if (!loader) {
      throw new Error(`Invalid loader configuration: ${JSON.stringify(item)}`);
    }
    return { loader, options };
  });
}

function resolveModuleExt(modulePath: string): string {
  const { dir, name, ext } = path.parse(modulePath);
  const newExt = compilerConfig.resolve.extensions.includes(ext) ? "" : ext;
  return path.join(dir, `${name}${newExt}.mjs`);
}

function isNodeModulePath(name: string): boolean {
  const { root, dir } = path.parse(name.replace(/\\|\//g, "/"));
  return !root && dir !== "." && dir !== ".." && !dir.startsWith(`./`) && !dir.startsWith(`../`);
}

/**
 * 将绝对路径"摊平"为不含 `..`、不含盘符冒号的安全相对段，
 * 用于把项目外的文件收容到 buildDir 内的 [external] 子目录。
 *
 * - Windows 盘符统一大写，避免同一文件因大小写不同被视作两个模块。
 * - UNC 路径（\\server\share\...）暂按 server/share/... 摊平。
 */
function flattenAbsolutePath(p: string): string {
  const norm = p.replace(/\\/g, "/");
  const drive = /^([a-zA-Z]):(.*)$/.exec(norm);
  if (drive) {
    return `${drive[1].toUpperCase()}/${drive[2].replace(/^\/+/, "")}`;
  }
  // UNC: //server/share/...
  if (norm.startsWith("//")) {
    return norm.replace(/^\/+/, "");
  }
  // POSIX: /foo/bar
  return norm.replace(/^\/+/, "");
}

/**
 * 确定模块的引入路径
 */
function resolveModuleImportPath(name: string, context: CompilerContext): string {
  if (!name.startsWith(context.rootContext) && isNodeModulePath(name)) {
    const { dir, ext } = path.parse(name);
    // 对于直接引入包名的，不做进一步解析，由 Node.js 确定模块文件路径
    if (!dir || !ext) {
      return name;
    }
    return path.join(context.modulesDir, name);
  }
  return path.resolve(context.context, name);
}

/**
 * 确定模块路径
 */
function resolveModuleOutputPath(name: string, context: CompilerContext): string {
  let fullPath = name;
  if (!name.startsWith(context.rootContext) && isNodeModulePath(name)) {
    const { dir, ext } = path.parse(name);
    // 对于直接引入包名的，不做进一步解析，由 Node.js 确定模块文件路径
    if (!dir || !ext) {
      return name;
    }
    fullPath = path.join(context.modulesDir, name);
  } else {
    fullPath = path.resolve(context.context, name);
  }
  const resolvedPath = ["", ...compilerConfig.resolve.extensions]
    .map((ext) => `${fullPath}${ext}`)
    .find((p) => fs.existsSync(p));
  if (!resolvedPath) {
    throw new Error(`${name}: File does not exist`);
  }
  const modulesPath = path.join(context.buildDir, "node_modules");
  const rel = path.relative(context.rootContext, resolvedPath);

  // 项目外文件（相对路径以 .. 开头，或在 Windows 下跨盘 path.relative 返回绝对路径）
  // 统一收容到 buildDir/[external]/ 下，避免把 .mjs 产物写到项目目录之外。
  if (rel.startsWith("..") || path.isAbsolute(rel)) {
    return resolveModuleExt(
      path.join(context.buildDir, "[external]", flattenAbsolutePath(resolvedPath))
    );
  }

  const outputPath = resolveModuleExt(path.join(context.buildDir, rel));
  // 更改路径，避免 import 语句中的模块路径被解析到构建目录中的 node_modules
  if (outputPath.startsWith(modulesPath)) {
    return path.join(context.buildDir, "[modules]", outputPath.substring(modulesPath.length));
  }
  return outputPath;
}

function createLogger(logFile: string, verbose: boolean | undefined): winston.Logger {
  const levelKey = Symbol.for("level");
  const fmt = winston.format;
  const logFormatter = fmt.printf((info) => {
    const level = (info as unknown as Record<symbol, string>)[levelKey];
    if (level === "info" || level === "debug") {
      return info.message as string;
    }
    return `${info.level}: ${info.message as string}`;
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

export default async function compile(file: string, compilerOptions: CompilerOptions) {
  const options: CompilerOptions = {
    ...getDirs(),
    clean: !file,
    ...compilerOptions,
  };
  const logFile = path.join(options.buildDir, "compile.log");
  const logger = createLogger(logFile, options.verbose);

  function createHook<Args extends unknown[]>(): Hook<Args> {
    const taps: { name: string; fn: HookHandler<Args> }[] = [];
    return {
      tap(name, fn) {
        taps.push({ name, fn });
      },
      async call(...args: Args) {
        await Promise.all(
          taps.map(async ({ name, fn }) => {
            try {
              await fn(...args);
            } catch (err) {
              const e = toError(err);
              logger.error(`in ${name}:\n${e.message}\n${e.stack ?? ""}`);
              throw e;
            }
          })
        );
      },
    };
  }

  const compiler: CompilerInstance = {
    options,
    logger,
    hooks: {
      loadModule: createHook<[string, Record<string, unknown>]>(),
      done: createHook<[]>(),
    },
  };

  if (Array.isArray(compilerConfig.plugins)) {
    compilerConfig.plugins.forEach((plugin) => plugin.apply(compiler));
  }

  const moduleCacheMap: ModuleCacheMap = {};

  function printError(resourcePath: string, error: string | Error) {
    logger.error(
      `in ${resourcePath}:\n${error instanceof Error ? `${error.message}\n${error.stack}` : error}`
    );
  }

  /**
   * 从已生成的 .mjs 中挑出"可疑"的 import 路径——尤其是裸 Windows 绝对路径
   * （形如 `X:/...`），它们会触发 ERR_UNSUPPORTED_ESM_URL_SCHEME。
   * 仅用于诊断输出，失败时静默返回 []。
   */
  function collectSuspiciousImports(modulePath: string): string[] {
    try {
      if (!fs.existsSync(modulePath)) return [];
      const src = fs.readFileSync(modulePath, "utf8");
      const out: string[] = [];
      const lines = src.split(/\r?\n/);
      const specRe = /(?:from|import)\s*\(?\s*["']([^"']+)["']/g;
      lines.forEach((line, idx) => {
        let m: RegExpExecArray | null;
        specRe.lastIndex = 0;
        while ((m = specRe.exec(line))) {
          const spec = m[1];
          // 裸 Windows 绝对路径，如 F:/... 或 F:\...
          if (/^[a-zA-Z]:[\\/]/.test(spec)) {
            out.push(`  line ${idx + 1}: ${line.trim()}`);
          }
        }
      });
      return out;
    } catch {
      return [];
    }
  }

  /**
   * 把动态 import 抛出的底层错误包成"带定位信息"的错误：
   *   - 源 TSX / 资源文件路径
   *   - 生成的 .mjs 产物路径
   *   - 可疑 import 行（仅当能识别到时）
   *   - 原始 cause stack
   * 这样 logger 至少能把问题落到本项目文件上，而不仅仅是 Node ESM 内部栈。
   */
  function wrapImportError(
    sourcePath: string,
    outputPath: string,
    cause: Error
  ): Error {
    const suspicious = collectSuspiciousImports(outputPath);
    const parts: string[] = [
      `Failed to import compiled module`,
      `  source : ${sourcePath}`,
      `  output : ${outputPath}`,
      `  reason : ${cause.message}`,
    ];
    if (suspicious.length > 0) {
      parts.push(
        `  suspicious imports (bare Windows absolute paths trigger ERR_UNSUPPORTED_ESM_URL_SCHEME):`
      );
      parts.push(...suspicious);
    }
    const wrapped = new Error(parts.join("\n"));
    // 不把 wrapped.message 前置到 stack 里。printError 会单独打印 message 与
    // stack；若 stack 中再包含 message，控制台会出现内容重复。
    wrapped.stack = `--- cause stack ---\n${cause.stack ?? "(no stack)"}`;
    // 保留 isReported 语义，避免上层重复 emitError
    wrapped.isReported = cause.isReported;
    return wrapped;
  }

  function useModuleCache(modulePath: string, context: CompilerContext): ModuleCacheItem {
    const outputPath = resolveModuleOutputPath(modulePath, context);
    const outputDirPath = path.dirname(outputPath);
    const existing = moduleCacheMap[outputPath];
    if (existing) {
      return existing;
    }
    if (outputDirPath.startsWith(context.buildDir) && !fs.existsSync(outputDirPath)) {
      fs.mkdirpSync(outputDirPath);
    }
    // 构造 cache 时同时初始化好 exports/resolve/reject，避免任何中间 null 状态。
    let resolveFn!: (exports: Module) => void;
    let rejectFn!: (err: Error) => void;
    const exports = new Promise<Module>((resolve, reject) => {
      resolveFn = (m) => {
        cache.state = "loaded";
        resolve(m);
      };
      rejectFn = (e) => {
        cache.state = "loaded";
        reject(e);
      };
    });
    const cache: ModuleCacheItem = {
      state: "pending",
      outputPath,
      exports,
      resolve: resolveFn,
      reject: rejectFn,
    };
    moduleCacheMap[outputPath] = cache;
    return cache;
  }

  async function generateModule(
    modulePath: string,
    moduleGenerator: () => string | Buffer | Promise<string | Buffer>,
    context: CompilerContext
  ): Promise<void> {
    const cache = useModuleCache(modulePath, context);
    context.logger.debug(`Generating ${path.relative(context.rootContext, cache.outputPath)}`);
    try {
      const content = await moduleGenerator();
      fs.writeFileSync(cache.outputPath, content);
      try {
        cache.resolve(
          (await import(pathToFileURL(cache.outputPath).href)) as Module
        );
      } catch (importErr) {
        const ie = toError(importErr);
        const wrapped = wrapImportError(modulePath, cache.outputPath, ie);
        printError(modulePath, wrapped);
        wrapped.isReported = true;
        cache.reject(wrapped);
      }
    } catch (err) {
      const e = toError(err);
      printError(modulePath, e);
      cache.reject(e);
    }
  }

  async function loadModule(resourcePath: string, loaders: ResolvedLoaderRule[]) {
    const data: Record<string, unknown> = {};
    const context = createCompilerContext(resourcePath);
    const content: LoaderInput = await loaders.reduceRight<Promise<LoaderInput>>(
      async (inputPromise, config) => {
        const input = await inputPromise;
        try {
          return await (function LOADER_EXECUTION() {
            return config.loader.call(
              {
                ...context,
                data,
                getOptions<T = LoaderOptions>(): T {
                  return config.options as unknown as T;
                },
              },
              input
            );
          })();
        } catch (err) {
          const e = toError(err);
          context.emitError(
            `ModuleLoaderError (from ${config.loader.name}): ${e.message}\n${e.stack ?? ""}`
          );
          e.isReported = true;
          throw e;
        }
      },
      Promise.resolve(fs.readFileSync(resourcePath))
    );
    await compiler.hooks.loadModule.call(resourcePath, data);
    return {
      content,
      resourceOutputPath: context.resourceOutputPath,
    };
  }

  async function importModule(
    resourcePath: string,
    loaders: ResolvedLoaderRule[],
    context: CompilerContext
  ): Promise<Module> {
    const resolvedPath = resolveModuleImportPath(resourcePath, context);
    const cache = useModuleCache(resolvedPath, context);

    if (cache.state !== "pending") {
      return cache.exports;
    }
    cache.state = "loading";
    if (loaders.length < 1) {
      cache.resolve({
        default: null,
        metadata: {
          type: "javascript",
          path: resourcePath,
          headerFiles: [],
          initCode: "",
          outputPath: cache.outputPath,
        },
      });
      return cache.exports;
    }
    try {
      context.logger.info(`Compiling ${path.relative(context.rootContext, resolvedPath)}`);
      const result = await loadModule(resolvedPath, loaders);
      if (result.content !== undefined) {
        context.logger.debug(
          `Generating ${path.relative(context.rootContext, result.resourceOutputPath)}`
        );
        // loader 链最终产物应是 string 或 Buffer 才能写盘；
        // 当前 LoaderInput 也允许 ResourceNode / object，运行时若真出现这种非序列化形态
        // 将由 fs.writeFileSync 自身抛错，保留原行为。
        // TODO: 考虑在此显式 narrow 并给出更明确的错误信息，或在 loader 链规范上强制末端为 string|Buffer。
        const writable = result.content as string | NodeJS.ArrayBufferView;
        fs.writeFileSync(result.resourceOutputPath, writable);
      }
      try {
        cache.resolve(
          (await import(pathToFileURL(cache.outputPath).href)) as Module
        );
      } catch (importErr) {
        const ie = toError(importErr);
        throw wrapImportError(resolvedPath, cache.outputPath, ie);
      }
    } catch (err) {
      const e = toError(err);
      if (!e.isReported) {
        context.emitError(e);
        e.isReported = true;
      }
      cache.reject(e);
      throw e;
    }
    return cache.exports;
  }

  function createCompilerContext(resourcePath: string): CompilerContext {
    let outputPath = resourcePath;
    if (resourcePath.startsWith(options.modulesDir)) {
      outputPath = path.join(
        options.modulesOutputDir,
        resourcePath.substring(options.modulesDir.length + 1)
      );
      if (!fs.existsSync(path.dirname(outputPath))) {
        fs.mkdirpSync(path.dirname(outputPath));
      }
    }
    const context: CompilerContext = {
      ...options,
      logger,
      resourcePath,
      resourceOutputPath: `${outputPath}.h`,
      context: path.dirname(resourcePath),
      emitFile(name, content) {
        const outputPath = path.resolve(options.distDir, name);
        const outputDir = path.dirname(outputPath);
        if (!fs.existsSync(outputDir)) {
          fs.mkdirpSync(outputDir);
        }
        logger.info(`Emitting ${name}`);
        fs.writeFileSync(
          outputPath,
          typeof content === "string" ? content : new Uint8Array(content)
        );
      },
      emitError(error) {
        printError(resourcePath, error);
      },
      resolveOutput(name) {
        // TODO: 引入项目目录外的文件时，将路径转换成 buildDir 内
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

  function matchLoaders(resourcePath: string): ResolvedLoaderRule[] {
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

  async function compileFile(filePath: string): Promise<unknown> {
    if (fs.statSync(filePath).isDirectory()) {
      return Promise.all(
        fs.readdirSync(filePath).map((name) => compileFile(path.join(filePath, name)))
      );
    }
    const loaders = matchLoaders(filePath);
    if (loaders.length > 0) {
      await importModule(filePath, loaders, createCompilerContext(filePath));
    }
    return undefined;
  }

  try {
    if (file) {
      if (!fs.existsSync(file)) {
        throw new Error(`${file}: no such file or directory`);
      }
      await compileFile(path.resolve(file));
    } else {
      if (fs.existsSync(options.appDir)) {
        await compileFile(options.appDir);
      }
      if (fs.existsSync(options.sourceDir)) {
        await compileFile(options.sourceDir);
      }
    }
    await compiler.hooks.done.call();
    logger.info("Compilation completed!");
  } catch (err) {
    logger.error("Compilation failed!");
    logger.error(`For more details, please refer to the log file: ${logFile}`);
    void err;
    throw new Error("Compilation failed!");
  }
}
