import fs from "fs";
import { parse } from 'yaml';
import { compileJson } from "./json.js";

function compileYamlFile(filePath) {
  const content = fs.readFileSync(filePath, { encoding: "utf-8" });
  const data = parse(content);
  return compileJson(data, { filePath });
}

export {
  compileYamlFile
}
