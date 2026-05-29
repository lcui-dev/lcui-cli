import { Loader } from "../types.js";

const JSONLoader: Loader<string | Buffer, string> = async (content) => {
  return `export default ${content}\n`;
};

export default JSONLoader;
