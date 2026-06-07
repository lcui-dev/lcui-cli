import fs from "fs-extra";
import path from "path";
import crypto from "crypto";
import { fileURLToPath, pathToFileURL } from "url";
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
import { writeIfChanged, hashContent, hashFile, hashJSON } from "./fs-cache.js";
import {
  BuildManifest,
  ManifestEntry,
  ManifestOutput,
  hashConfig,
} from "./build-manifest.js";
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

/** 读取 @lcui/cli 自身的版本号，作为 manifest configHash 的一部分。 */
function readCliVersion(): string {
  try {
    // dist 目录: packages/cli/lib/compiler/index.js → ../../package.json
    const here = path.dirname(fileURLToPath(import.meta.url));
    const pkg = fs.readJSONSync(path.resolve(here, "..", "..", "package.json")) as {
      version?: string;
    };
    return pkg.version || "0.0.0";
  } catch {
    return "0.0.0";
  }
}

/** 把 module.rules[i].use 摊平成只含名字与选项的稳定形态，参与 configHash。 */
function serializeRuleUse(use: ModuleRuleUseConfig): unknown {
  const norm = (item: string | LoaderRule): unknown => {
    if (typeof item === "string") return { loader: item };
    return {
      loader: typeof item.loader === "string" ? item.loader : item.loader.name,
      options: item.options ?? {},
    };
  };
  if (typeof use === "string") return [norm(use)];
  if (Array.isArray(use)) return use.map(norm);
  return [norm(use)];
}

/**
 * 把项目根下常见的"会影响编译产物"的配置文件全部 hash。
 * 任意一个变化都会让整张 manifest 作废，迫使全量重编。
 *
 * 这些文件不能用模块 import 关系跟踪到（它们由 loader 内部 await postcssrc 等动态加载），
 * 因此放进 configHash 是最稳妥的做法。
 */
function readProjectConfigHashes(rootContext: string): Record<string, string> {
  const candidates = [
    "tsconfig.json",
    "postcss.config.js",
    "postcss.config.cjs",
    "postcss.config.mjs",
    "postcss.config.ts",
    ".postcssrc",
    ".postcssrc.js",
    ".postcssrc.json",
    "tailwind.config.js",
    "tailwind.config.cjs",
    "tailwind.config.mjs",
    "tailwind.config.ts",
    "lcui.config.js",
  ];
  const out: Record<string, string> = {};
  for (const name of candidates) {
    const p = path.join(rootContext, name);
    const h = hashFile(p);
    if (h) out[name] = h;
  }
  return out;
}

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

  // ---- 增量编译基础设施 ----
  const cliVersion = readCliVersion();
  const configHash = hashConfig({
    cliVersion,
    // compilerConfig 含 plugins 实例，无法直接 JSON 序列化；
    // 用 rule.test.source / loader.name 这种稳定特征代替结构体序列化。
    rules: compilerConfig.module.rules.map((r) => ({
      test: r.test instanceof Function ? `fn:${r.test.toString()}` : `re:${r.test.source}`,
      use: serializeRuleUse(r.use),
    })),
    resolve: compilerConfig.resolve,
    plugins: (compilerConfig.plugins || []).map((p) => ({
      name: (p as { name?: string }).name ?? p.constructor.name,
    })),
    // 项目级配置文件内容也参与 hash：tsconfig / postcss.config 改了就整体作废
    projectConfigs: readProjectConfigHashes(options.rootContext),
  });
  const manifest = new BuildManifest(
    path.join(options.buildDir, "manifest.json"),
    cliVersion,
    configHash
  );
  if (!options.force) {
    manifest.load();
  } else {
    logger.info("Force rebuild: ignoring existing build manifest.");
  }
  // 本次 build 真实写盘的产物列表，用于决定是否调用 xmake
  const changedOutputs = new Set<string>();
  // 记录每个入口在本次 build 中产出的产物，用于回写 manifest
  const pendingEntryOutputs = new Map<string, ManifestOutput[]>();
  // 记录每个入口在本次 build 中收集到的依赖（通过 importModule 或 addDependency）
  const pendingEntryDeps = new Map<string, Set<string>>();
  // 跳过 loader 链时，把 manifest 里记录的依赖原样写回 pendingEntryDeps，
  // 确保下一轮 manifest 仍包含完整依赖图。
  const skippedEntries = new Set<string>();

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
    changedOutputs,
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
  function wrapImportError(sourcePath: string, outputPath: string, cause: Error): Error {
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
      const wrote = writeIfChanged(cache.outputPath, content);
      if (wrote) {
        changedOutputs.add(cache.outputPath);
      }
      recordEntryOutput(context, cache.outputPath, content);
      try {
        // Add content hash to URL to bust Node's ESM cache.
        // Without this, the same URL always returns the cached module object,
        // causing stale content to be used in subsequent builds.
        const contentHash = crypto.createHash('md5').update(content).digest('hex').slice(0, 8);
        const importUrl = pathToFileURL(cache.outputPath).href + `?v=${contentHash}`;
        cache.resolve((await import(importUrl)) as Module);
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

  async function loadModule(
    resourcePath: string,
    loaders: ResolvedLoaderRule[],
    entryPath: string
  ) {
    const data: Record<string, unknown> = {};
    const context = createCompilerContext(resourcePath, entryPath);
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
                addDependency(filePath: string) {
                  recordEntryDependency(entryPath, filePath);
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
      data,
    };
  }

  async function importModule(
    resourcePath: string,
    loaders: ResolvedLoaderRule[],
    context: CompilerContext
  ): Promise<Module> {
    const resolvedPath = resolveModuleImportPath(resourcePath, context);
    // 把"父入口 → 这个被引入资源"作为依赖记录下来。
    // 注意：这里把"被解析后的真实路径"作为依赖目标，便于下次 hash 校验。
    if (context.entryPath && context.entryPath !== resolvedPath) {
      recordEntryDependency(context.entryPath, resolvedPath);
    }
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
      // 子模块自己也是一个 entry：它的依赖、产物都归属在 resolvedPath 名下。
      const result = await loadModule(resolvedPath, loaders, resolvedPath);
      if (result.content !== undefined) {
        context.logger.debug(
          `Generating ${path.relative(context.rootContext, result.resourceOutputPath)}`
        );
        // loader 链最终产物应是 string 或 Buffer 才能写盘；
        // 当前 LoaderInput 也允许 ResourceNode / object，运行时若真出现这种非序列化形态
        // 将由 fs.writeFileSync 自身抛错，保留原行为。
        // TODO: 考虑在此显式 narrow 并给出更明确的错误信息，或在 loader 链规范上强制末端为 string|Buffer。
        const writable = result.content as string | NodeJS.ArrayBufferView;
        const wrote = writeIfChanged(result.resourceOutputPath, writable);
        if (wrote) {
          changedOutputs.add(result.resourceOutputPath);
        }
        recordEntryOutput(
          { ...context, entryPath: resolvedPath } as CompilerContext,
          result.resourceOutputPath,
          writable
        );
      }
      // entry 编译完成后把本次收集到的依赖 / 产物 / componentConfig 落盘到 manifest
      finalizeEntry(resolvedPath, loaders, result.data);
      try {
        // Add content hash to URL to bust Node's ESM cache.
        const contentStr = typeof result.content === 'string' ? result.content : JSON.stringify(result.content ?? '');
        const contentHash = crypto.createHash('md5').update(contentStr).digest('hex').slice(0, 8);
        const importUrl = pathToFileURL(cache.outputPath).href + `?v=${contentHash}`;
        cache.resolve((await import(importUrl)) as Module);
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

  function createCompilerContext(resourcePath: string, entryPath?: string): CompilerContext {
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
      entryPath: entryPath ?? resourcePath,
      resourceOutputPath: `${outputPath}.h`,
      context: path.dirname(resourcePath),
      emitFile(name, content) {
        const outputPath = path.resolve(options.distDir, name);
        const outputDir = path.dirname(outputPath);
        if (!fs.existsSync(outputDir)) {
          fs.mkdirpSync(outputDir);
        }
        logger.info(`Emitting ${name}`);
        const writable =
          typeof content === "string" ? content : new Uint8Array(content);
        const wrote = writeIfChanged(outputPath, writable);
        if (wrote) {
          changedOutputs.add(outputPath);
        }
        recordEntryOutput(context, outputPath, writable);
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

  /** 记录该 entry 输出了一个产物（用于回写 manifest）。 */
  function recordEntryOutput(
    context: CompilerContext,
    outputPath: string,
    content: string | NodeJS.ArrayBufferView
  ) {
    const entry = context.entryPath;
    if (!entry) return;
    if (!pendingEntryOutputs.has(entry)) {
      pendingEntryOutputs.set(entry, []);
    }
    pendingEntryOutputs.get(entry)!.push({
      path: outputPath,
      hash: hashContent(content),
    });
  }

  /** 记录该 entry 读取了某个外部依赖文件（用于回写 manifest）。 */
  function recordEntryDependency(entryPath: string, depPath: string) {
    if (!entryPath || !depPath) return;
    if (entryPath === depPath) return;
    if (!pendingEntryDeps.has(entryPath)) {
      pendingEntryDeps.set(entryPath, new Set());
    }
    pendingEntryDeps.get(entryPath)!.add(depPath);
  }

  /** entry 编译结束后，把 sourceHash + deps + outputs 落到 manifest。 */
  function finalizeEntry(
    entryPath: string,
    loaders: ResolvedLoaderRule[],
    data: Record<string, unknown>
  ) {
    if (!fs.existsSync(entryPath)) return;
    const sourceHash = hashFile(entryPath);
    if (!sourceHash) return;

    const deps: Record<string, string> = {};
    const collected = pendingEntryDeps.get(entryPath);
    if (collected) {
      for (const dep of collected) {
        const h = hashFile(dep);
        if (h) deps[dep] = h;
      }
    }
    const outputs = pendingEntryOutputs.get(entryPath) ?? [];
    const entry: ManifestEntry = {
      sourceHash,
      loaders: loaders.map((l) => l.loader.name || "anonymous"),
      loaderOptionsHash: hashJSON(loaders.map((l) => ({ name: l.loader.name, options: l.options }))),
      dependencies: deps,
      outputs,
      componentConfig: extractComponentConfigForEntry(entryPath, data),
    };
    manifest.set(entryPath, entry);
  }

  /**
   * ts-loader 会把"该入口产出的 component 元数据"写到 data.components 里，
   * 其 key 是 path.relative(rootContext, resourcePath)。我们只取属于当前 entry 的那一条。
   */
  function extractComponentConfigForEntry(
    entryPath: string,
    data: Record<string, unknown>
  ): unknown {
    if (!data.components || typeof data.components !== "object") return undefined;
    const components = data.components as Record<string, unknown>;
    const key = path.relative(options.rootContext, entryPath);
    if (key in components) {
      return { [key]: components[key] };
    }
    return undefined;
  }

  /**
   * 增量短路：若 manifest 里该 entry 的源/依赖/产物全部命中，则跳过 loader 链。
   * 跳过时仍需把 componentConfig merge 回 AppComponentsCompiler（通过触发 loadModule 钩子）。
   */
  async function tryReuseEntry(
    entryPath: string,
    loaders: ResolvedLoaderRule[]
  ): Promise<boolean> {
    if (options.force) return false;
    const cached = manifest.get(entryPath);
    if (!cached) return false;
    const sourceHash = hashFile(entryPath);
    if (!sourceHash) return false;
    const loaderOptionsHash = hashJSON(
      loaders.map((l) => ({ name: l.loader.name, options: l.options }))
    );
    if (
      cached.sourceHash !== sourceHash ||
      cached.loaderOptionsHash !== loaderOptionsHash
    ) {
      return false;
    }
    if (!manifest.validateDependencies(cached)) return false;
    if (!manifest.validateOutputs(cached)) return false;

    // 命中：复用产物，无需再跑 loader
    logger.debug(`Skip ${path.relative(options.rootContext, entryPath)} (up-to-date)`);

    // 把 manifest 里记录的 componentConfig 再喂给插件链，
    // 保证 AppPlugin 在 done 阶段能拿到该入口的 components 信息。
    if (cached.componentConfig && typeof cached.componentConfig === "object") {
      await compiler.hooks.loadModule.call(entryPath, {
        components: cached.componentConfig as Record<string, unknown>,
      });
    }
    skippedEntries.add(entryPath);
    // 把已有依赖与产物原样保留到本轮 pending，让 finalize 时 manifest 仍能完整保存。
    pendingEntryOutputs.set(entryPath, [...cached.outputs]);
    const deps = new Set<string>();
    Object.keys(cached.dependencies).forEach((d) => deps.add(d));
    pendingEntryDeps.set(entryPath, deps);
    // 把 outputPath 加进 moduleCacheMap，让本进程内其他入口若 import 它能拿到 metadata。
    primeModuleCache(entryPath, cached);
    return true;
  }

  /**
   * 跳过编译的 entry 仍需要在 moduleCacheMap 中有一份"已 loaded"的占位，
   * 否则其他入口 importModule(它) 时会触发重新计算 outputPath / 重读 mjs。
   *
   * 这里只填一份最小可用的 Module：default=null，metadata 从 cached.outputs 里挑出 .mjs 一份作为
   * outputPath。若该 .mjs 不存在则不做预热（让真正的 importModule 走原逻辑触发重编）。
   */
  function primeModuleCache(entryPath: string, cached: ManifestEntry) {
    const context = createCompilerContext(entryPath, entryPath);
    const cacheItem = useModuleCache(entryPath, context);
    if (cacheItem.state !== "pending") return;
    const mjs = cached.outputs.find((o) => o.path.endsWith(".mjs"));
    if (!mjs || !fs.existsSync(mjs.path)) return;
    cacheItem.state = "loading";
    // 仍然走一次真实 import，确保 .mjs 里的副作用（注册组件等）被执行
    import(pathToFileURL(mjs.path).href).then(
      (mod) => cacheItem.resolve(mod as Module),
      (err) => cacheItem.reject(toError(err))
    );
  }

  async function compileFile(filePath: string): Promise<unknown> {
    if (fs.statSync(filePath).isDirectory()) {
      return Promise.all(
        fs.readdirSync(filePath).map((name) => compileFile(path.join(filePath, name)))
      );
    }
    const loaders = matchLoaders(filePath);
    if (loaders.length > 0) {
      // 先尝试增量命中
      if (await tryReuseEntry(filePath, loaders)) {
        return undefined;
      }
      await importModule(filePath, loaders, createCompilerContext(filePath, filePath));
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
    manifest.save();
    logger.info("Compilation completed!");
  } catch (err) {
    logger.error("Compilation failed!");
    logger.error(`For more details, please refer to the log file: ${logFile}`);
    void err;
    throw new Error("Compilation failed!");
  }
}
