/** @type {Loader} */
export default async function JSONLoader(content) {
  return `export default ${content}\n`;
}
