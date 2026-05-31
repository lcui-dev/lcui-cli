/**
 * Root ESLint configuration for the lcui-toolkit monorepo.
 * Targets ESLint 8 + @typescript-eslint 7.
 *
 * Each workspace inherits this configuration; formatting concerns are owned
 * by Prettier, so this file intentionally avoids style rules.
 */
module.exports = {
  root: true,
  env: {
    node: true,
    es2021: true,
  },
  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
  },
  extends: ["eslint:recommended"],
  ignorePatterns: [
    "node_modules/",
    "vendor.node_modules/",
    "lib/",
    "dist/",
    "build/",
    "coverage/",
    ".nyc_output/",
    ".lcui/",
    ".xmake/",
    "packages/cli/test/fixtures/*/project/",
    "packages/fluent-icons/src/",
    "packages/fluent-icons/fonts/",
  ],
  overrides: [
    // TypeScript sources across all packages
    {
      files: ["packages/*/src/**/*.ts", "packages/*/src/**/*.tsx"],
      parser: "@typescript-eslint/parser",
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        ecmaFeatures: { jsx: true },
      },
      plugins: ["@typescript-eslint"],
      extends: ["eslint:recommended", "plugin:@typescript-eslint/recommended"],
      rules: {
        "no-unused-vars": "off",
        "@typescript-eslint/no-unused-vars": [
          "warn",
          { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
        ],
        "@typescript-eslint/no-explicit-any": "off",
        "@typescript-eslint/no-this-alias": "off",
      },
    },

    // Mocha / node test files (plain JS / MJS)
    {
      files: ["packages/*/test/**/*.{js,mjs}"],
      env: { node: true, mocha: true },
      parserOptions: { sourceType: "module" },
    },

    // TSX fixtures used by ts-loader tests
    {
      files: ["packages/cli/test/fixtures/**/*.{ts,tsx}"],
      parser: "@typescript-eslint/parser",
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        ecmaFeatures: { jsx: true },
      },
      plugins: ["@typescript-eslint"],
      extends: ["eslint:recommended", "plugin:@typescript-eslint/recommended"],
      rules: {
        "no-unused-vars": "off",
        "@typescript-eslint/no-unused-vars": "off",
      },
    },

    // Node CLI entry (plain JS, ESM)
    {
      files: ["packages/cli/bin/**/*.js", "packages/fluent-icons/scripts/**/*.{js,mjs}"],
      parserOptions: { sourceType: "module" },
    },

    // CommonJS config files
    {
      files: [".eslintrc.{js,cjs}", "*.cjs"],
      env: { node: true },
      parserOptions: { sourceType: "script" },
    },
  ],
  rules: {},
};
