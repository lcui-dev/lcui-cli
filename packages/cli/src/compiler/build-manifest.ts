import fs from "fs-extra";
import path from "path";
import { hashContent, hashFile } from "./fs-cache.js";

export const MANIFEST_VERSION = 1;

export interface ManifestOutput {
  /** 产物绝对路径或相对 rootContext 的路径 */
  path: string;
  /** 产物 sha256 */
  hash: string;
}

export interface ManifestEntry {
  /** 源文件 sha256 */
  sourceHash: string;
  /** 命中的 loader 名字链（从外到内） */
  loaders: string[];
  /** loader 选项的稳定 hash */
  loaderOptionsHash: string;
  /** 依赖（解析后的绝对路径 → sha256） */
  dependencies: Record<string, string>;
  /** 该入口产生的所有产物文件 */
  outputs: ManifestOutput[];
  /**
   * 该入口的 components 元数据（只在 ts-loader 触发的 entry 上有），
   * 跳过 loader 时需要 merge 回 AppComponentsCompiler。
   */
  componentConfig?: unknown;
}

export interface ManifestData {
  version: number;
  /** @lcui/cli 版本号 */
  compilerVersion: string;
  /** compilerConfig + tsconfig + 其它影响产物的全局配置的 hash */
  configHash: string;
  /** key 为源文件的绝对路径（统一正斜杠） */
  entries: Record<string, ManifestEntry>;
}

function normalizePath(p: string): string {
  return p.replace(/\\/g, "/");
}

export class BuildManifest {
  private data: ManifestData;
  private dirty = false;

  constructor(
    private file: string,
    compilerVersion: string,
    configHash: string
  ) {
    this.data = {
      version: MANIFEST_VERSION,
      compilerVersion,
      configHash,
      entries: {},
    };
  }

  /**
   * 从磁盘加载 manifest；若版本 / compilerVersion / configHash 不一致则丢弃。
   */
  load(): void {
    if (!fs.existsSync(this.file)) return;
    let raw: ManifestData;
    try {
      raw = fs.readJSONSync(this.file) as ManifestData;
    } catch {
      return;
    }
    if (
      !raw ||
      raw.version !== MANIFEST_VERSION ||
      raw.compilerVersion !== this.data.compilerVersion ||
      raw.configHash !== this.data.configHash ||
      typeof raw.entries !== "object" ||
      raw.entries === null
    ) {
      return;
    }
    this.data.entries = raw.entries;
  }

  save(): void {
    if (!this.dirty) return;
    fs.mkdirpSync(path.dirname(this.file));
    fs.writeJSONSync(this.file, this.data, { spaces: 2 });
  }

  /** 强制清空（--force / clean 时调用）。 */
  clear(): void {
    this.data.entries = {};
    this.dirty = true;
  }

  get(sourcePath: string): ManifestEntry | undefined {
    return this.data.entries[normalizePath(sourcePath)];
  }

  set(sourcePath: string, entry: ManifestEntry): void {
    this.data.entries[normalizePath(sourcePath)] = entry;
    this.dirty = true;
  }

  remove(sourcePath: string): void {
    const key = normalizePath(sourcePath);
    if (this.data.entries[key]) {
      delete this.data.entries[key];
      this.dirty = true;
    }
  }

  /**
   * 校验源文件 hash + loader 选项 hash 是否与 entry 一致。
   */
  isEntrySourceUpToDate(
    entry: ManifestEntry,
    sourceHash: string,
    loaderOptionsHash: string
  ): boolean {
    return entry.sourceHash === sourceHash && entry.loaderOptionsHash === loaderOptionsHash;
  }

  /**
   * 校验 entry 的所有依赖文件仍存在且 hash 未变。
   */
  validateDependencies(entry: ManifestEntry): boolean {
    for (const [dep, hash] of Object.entries(entry.dependencies)) {
      const current = hashFile(dep);
      if (!current || current !== hash) {
        return false;
      }
    }
    return true;
  }

  /**
   * 校验 entry 的所有产物文件仍存在且 hash 未变。
   * 若任一产物被外部修改 / 删除，则视为失效，需要重编。
   */
  validateOutputs(entry: ManifestEntry): boolean {
    for (const out of entry.outputs) {
      const current = hashFile(out.path);
      if (!current || current !== out.hash) {
        return false;
      }
    }
    return true;
  }
}

/** 计算一段配置（任意可 JSON 序列化对象）的 hash。 */
export function hashConfig(value: unknown): string {
  return hashContent(stableStringify(value));
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(",")}]`;
  }
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(obj[k])}`).join(",")}}`;
}
