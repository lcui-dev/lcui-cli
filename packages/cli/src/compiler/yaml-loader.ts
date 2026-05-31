import { parse } from "yaml";
import { Loader } from "../types.js";

const YAMLLoader: Loader<string | Buffer, unknown> = (content) => parse(`${content}`);

export default YAMLLoader;
