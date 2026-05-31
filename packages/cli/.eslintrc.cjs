/**
 * ESLint configuration (legacy / .eslintrc style).
 * Targets ESLint 8 + @typescript-eslint 7.
 *
 * Scope:
 *  - TypeScript sources under ./src use the TS parser and @typescript-eslint/recommended.
 *  - Plain JS (bin/, test/*.js) uses eslint:recommended in Node + Mocha env.
 *  - .eslintrc.cjs and similar config files are scripts, not modules.
 *
 * Formatting concerns are owned by Prettier; this config intentionally avoids style rules.
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
    "test/fixtures/*/project/",
  ],
  overrides: [
    // TypeScript sources
    {
      files: ["src/**/*.ts", "src/**/*.tsx"],
      parser: "@typescript-eslint/parser",
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        ecmaFeatures: { jsx: true },
      },
      plugins: ["@typescript-eslint"],
      extends: ["eslint:recommended", "plugin:@typescript-eslint/recommended"],
      rules: {
        // TS handles undeclared identifiers; the core rule produces false positives on types.
        "no-unused-vars": "off",
        "@typescript-eslint/no-unused-vars": [
          "warn",
          { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
        ],
        // Allow `any` for now; the codebase uses it intentionally in a few places.
        "@typescript-eslint/no-explicit-any": "off",
        // Loader functions intentionally capture `this` into a local for use inside nested closures.
        "@typescript-eslint/no-this-alias": "off",
      },
    },

    // Mocha test files (plain JS)
    {
      files: ["test/**/*.js"],
      env: { node: true, mocha: true },
      parserOptions: { sourceType: "module" },
    },

    // TSX fixtures used by ts-loader tests
    {
      files: ["test/fixtures/**/*.{ts,tsx}"],
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
      files: ["bin/**/*.js"],
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
