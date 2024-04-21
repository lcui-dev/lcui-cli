import path from "path";
import AppPlugin from "../app-plugin/index.js";

export default {
  module: {
    rules: [
      {
        test: /\.ui\.json$/,
        use: "ui-loader",
      },
      {
        test: /\.xml$/,
        use: ["ui-loader", "xml-loader"],
      },
      {
        test: /\.ya?ml$/,
        use: ["ui-loader", "yaml-loader"],
      },
      {
        test: (filePath) => {
          const { name, ext } = path.parse(filePath);
          return (
            !name.startsWith("_") &&
            name.endsWith(".module") &&
            [".css", ".scss", ".sass"].includes(ext)
          );
        },
        use: [
          {
            loader: "css-loader",
            options: {
              modules: true,
            },
          },
          "sass-loader",
        ],
      },
      {
        test: (filePath) => {
          const { name, ext } = path.parse(filePath);
          return (
            !name.startsWith("_") &&
            !name.endsWith(".module") &&
            [".css", ".scss", ".sass"].includes(ext)
          );
        },
        use: ["css-loader", "sass-loader"],
      },
      {
        test: /\.json$/,
        use: ['ts-loader', 'json-loader'],
      },
      {
        test: /(layout|page)\.(ts|tsx|js|jsx)$/,
        use: [
          "ui-loader",
          {
            loader: "ts-loader",
            options: {
              target: 'AppRouter'
            }
          }
        ],
      },
      {
        test: /\.(ts|tsx|js|jsx)$/,
        use: ["ui-loader", "ts-loader"],
      },
      {
        test: /\.(ttf|bmp|png|jpe?g)$/i,
        use: {
          loader: "file-loader",
          options: {
            outputPath: "assets",
            name: "[name].[pathhash:8].[ext]",
          },
        },
      },
    ],
  },
  resolve: {
    extensions: [".ts", ".tsx", ".mjs", ".js", ".jsx"],
  },
  plugins: [
    new AppPlugin()
  ]
};
