import fs from "fs-extra";
import path from "path";
import { createHash } from "crypto";

/**
 * 把任意内容规整为 Buffer，方便用 Buffer.equals 比较。
 */
function toBuffer(content: string | Buffer | NodeJS.ArrayBufferView): Buffer {
  if (Buffer.isBuffer(content)) {
    return content;
  }
  if (typeof content === "string") {
    return Buffer.from(content);
  }
  return Buffer.from(content.buffer, content.byteOffset, content.byteLength);
}

/**
 * 仅当目标文件不存在或内容不同（按字节比较）时才写盘。
 * 返回 true 表示真的写了，false 表示跳过。
 *
 * 这是增量编译的"防 mtime 抖动"基础设施：xmake 等下游工具通常以 mtime
 * 作为重编判据，只要产物字节没变就避免刷新 mtime，xmake 自然会 no-op。
 */
export function writeIfChanged(
  filePath: string,
  content: string | Buffer | NodeJS.ArrayBufferView
): boolean {
  const next = toBuffer(content);
  if (fs.existsSync(filePath)) {
    try {
      const stat = fs.statSync(filePath);
      if (stat.isFile() && stat.size === next.length) {
        const old = fs.readFileSync(filePath);
        if (old.equals(next)) {
          return false;
        }
      }
    } catch {
      // 任何 stat/read 失败都退化为强制写入
    }
  } else {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirpSync(dir);
    }
  }
  fs.writeFileSync(filePath, next);
  return true;
}

/** 计算缓冲区内容的 sha256（hex），用于产物 / 源文件指纹。 */
export function hashContent(content: string | Buffer | NodeJS.ArrayBufferView): string {
  return createHash("sha256").update(toBuffer(content)).digest("hex");
}

/**
 * 计算文件 sha256；文件不存在时返回 ""，以便上层用空串表示"丢失"。
 */
export function hashFile(filePath: string): string {
  try {
    if (!fs.existsSync(filePath)) return "";
    const stat = fs.statSync(filePath);
    if (!stat.isFile()) return "";
    return hashContent(fs.readFileSync(filePath));
  } catch {
    return "";
  }
}

/**
 * 对 JSON 可序列化对象做稳定 hash（键有序），用于 loader options / 配置摘要。
 */
export function hashJSON(value: unknown): string {
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
