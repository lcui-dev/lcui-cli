export default {
  module: {
    rules: [
      {
        test: /\.json$/,
        use: "json-loader",
      },
      {
        test: /\.xml$/,
        use: ["json-loader", "xml-loader"],
      },
      {
        test: /\.ya?ml$/,
        use: ["json-loader", "yaml-loader"],
      },
      {
        test: /^.*\.module.(css|sass|scss)$/,
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
        test: /^(?!.*\.module\.(css|sass|scss)$).*\.(css|sass|scss)$/,
        use: ["css-loader", "sass-loader"],
      },
      {
        test: /\.tsx?$|\.jsx?$/,
        use: ["json-loader", "ts-loader"],
      },
      {
        test: /\.(ttf|bmp|png|jpe?g)$/i,
        use: {
          loader: "file-loader",
          options: {
            outputPath: "assets",
            name: "[name].[pathhash].[ext]",
          },
        },
      },
    ],
  },
  resolve: {
    extensions: [".ts", ".tsx", ".js", ".jsx"],
  },
};
