import { parse } from "yaml";
import { Loader } from "../types.js";

const YAMLLoader: Loader = (content) => parse(`${content}`);

export default YAMLLoader;
