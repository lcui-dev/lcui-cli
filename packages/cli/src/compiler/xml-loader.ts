import { Element, xml2js } from "xml-js";
import { Loader, LoaderContext } from "../types.js";

interface XMLElement extends Element {
  children: XMLElement[];
}

const XMLLoader: Loader<string | Buffer, XMLElement | void> = function XMLLoader(
  this: LoaderContext,
  content
) {
  const data = xml2js(`${content}`, {
    ignoreCdata: true,
    ignoreDeclaration: true,
    ignoreComment: true,
    ignoreInstruction: true,
    ignoreDoctype: true,
    elementsKey: "children",
  }) as XMLElement;
  const root = data.children.find((node) => node.name === "lcui-app");
  if (root) {
    return root;
  }
  this.emitError(new Error("invalid xml file"));
};

export default XMLLoader;
