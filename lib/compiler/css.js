let identCount = 0;

export default {
  test(filePath) {
    return filePath.endsWith(".css") && !filePath.endsWith("module.css");
  },
  compile(input) {
    const cssCode = JSON.stringify(
      input
        .split("\n")
        .map((line) => line.trimEnd())
        .join("\n")
    )
      .split("\\n")
      .join("\\\n");
    return [
      `static const char *css_str_${identCount++} = "\\`,
      `${cssCode.substring(1, cssCode.length - 1)}\\`,
      '";\n',
    ].join("\n");
  },
};
