import { compileJson } from "./json.js";

export async function compileJavaScriptFile(filePath) {
  const data = await import(filePath);
  return compileJson(data, { filePath });
}
