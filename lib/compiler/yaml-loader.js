import { parse } from "yaml";

/**
 * @type {Loader}
 */
export default function YAMLLoader(content) {
  return parse(content);
}
