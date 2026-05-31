import fs from "fs";
import path from "path";

const fonts = [
  {
    className: "fui-icon-filled",
    name: "FluentSystemIcons-Filled",
  },
  {
    className: "fui-icon-regular",
    name: "FluentSystemIcons-Regular",
  },
];

const iconFileMain = `
type IconName = keyof typeof iconMap;

interface IconComponent {
  (props: IconProps): React.JSX.Element;
  shouldPreRender: boolean;
}

interface IconProps extends WidgetProps {
  className?: string;
  fontSize?: number;
  style?: React.CSSProperties;
}

interface IconExProps extends IconProps {
  name: IconName;
  filled?: boolean;
}

function clsx(...args) {
  return args.filter(Boolean).join(' ');
}

export function Icon({ className, name, filled, fontSize, style, ...props }: IconExProps) {
  const iconData = iconMap[name];
  const error = <text>unknown icon: {name}</text>;

  if (!iconData) {
    return error;
  }

  const styleName = filled ? 'filled' : 'regular';
  const codeMap = iconData[styleName];

  if (!codeMap) {
    return error;
  }

  const sizeList = Object.keys(codeMap).map(Number).sort();
  const size = (fontSize && sizeList.filter((s) => s >= fontSize)[0]) || sizeList[0];
  const code = codeMap[size];
  return (
    <text
      className={clsx(\`fui-icon-\${styleName}\`, className)}
      style={{
        fontSize: typeof fontSize === 'number' ? \`\${fontSize || size}px\` : undefined,
        ...style
      }}
      {...props}
    >
      {String.fromCodePoint(code)}
    </text>
  );
}

Icon.shouldPreRender = true;`;

function generateIconCode(ident, name, filled = false) {
  return `
export const ${ident}: IconComponent = (props) => <Icon name="${name}" ${
    filled ? "filled " : ""
  }{...props} />;
${ident}.shouldPreRender = true;`;
}

function capitalizeFirstLetter(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function outputFile(filePath, content) {
  console.log(`output ${filePath}`);
  fs.writeFileSync(filePath, content, {
    encoding: "utf-8",
  });
}

function convert(fontsDirPath) {
  const iconMap = {};
  const iconCssOutput = [];
  const iconTsxOutput = ['import React, { WidgetProps } from "@lcui/react";'];
  if (!fs.existsSync("dist")) {
    fs.mkdirSync("dist");
  }
  fonts.forEach((font) => {
    const jsonFile = path.join(fontsDirPath, `${font.name}.json`);
    const jsonData = JSON.parse(
      fs.readFileSync(jsonFile, { encoding: "utf-8" })
    );
    const iconList = Object.keys(jsonData)
      .sort()
      .map((key) => ({
        code: jsonData[key],
        name: key.replace("ic_fluent_", "").replace(/_/g, "-"),
      }));
    const mainCss = [
      "@font-face {",
      `  font-family: "${font.name}";`,
      `  src: url("${font.name}.ttf");`,
      "}\n",
      `.${font.className} {`,
      `  font-family: "${font.name}";`,
      "  font-style: normal;",
      "}\n",
    ].join("\n");
    const fullCss = `${mainCss}\n${iconList
      .map(
        ({ code, name }) =>
          `.${name} {\n  content: "\\${code.toString(16)}";\n}`
      )
      .join("\n")}`;

    iconCssOutput.push(mainCss);

    iconList.forEach((icon) => {
      // wchar_t 类型占用 2 字节，因此字符码不能大于它的最大值
      if (icon.code > 0xffff) {
        console.warn(
          `Ignored ${icon.name} because its codepoint ${icon.code} has exceeded the maximum value of wchar_t type`
        );
        return;
      }
      const list = icon.name.replace("-regular|-filled", "").split("-");
      const style = icon.name.includes("-filled") ? "filled" : "regular";
      const size = list[list.length - 2];
      const name = list.slice(0, list.length - 2).join("-");
      if (!iconMap[name]) {
        iconMap[name] = {
          regular: {},
          filled: {},
          hasFilledStyle: false,
          hasRegularStyle: false,
        };
      }
      iconMap[name][style][size] = icon.code;
      if (style === "regular") {
        iconMap[name].hasRegularStyle = true;
      } else {
        iconMap[name].hasFilledStyle = true;
      }
    });

    outputFile(path.join("dist", `${font.name}.css`), `${fullCss}\n`);
    console.log(`output ${path.join("dist", `${font.name}.ttf`)}`);
    fs.copyFileSync(
      path.join(fontsDirPath, `${font.name}.ttf`),
      path.join("dist", `${font.name}.ttf`)
    );
  });
  iconTsxOutput.push(
    `\nconst iconMap = ${JSON.stringify(iconMap, null, 2)};`,
    iconFileMain
  );
  Object.keys(iconMap)
    .sort()
    .forEach((key) => {
      const ident = key.split("-").map(capitalizeFirstLetter).join("");
      if (iconMap[key].hasRegularStyle) {
        iconTsxOutput.push(generateIconCode(ident, key));
      }
      if (iconMap[key].hasFilledStyle) {
        iconTsxOutput.push(generateIconCode(`${ident}Filled`, key, true));
      }
    });
  outputFile(path.join("dist", "style.css"), iconCssOutput.join("\n"));
  outputFile(path.join("src", "index.tsx"), iconTsxOutput.join("\n"));
}

if (process.argv.length > 2) {
  convert(process.argv[2]);
}
