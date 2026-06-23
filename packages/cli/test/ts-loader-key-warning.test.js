import assert from "assert";
import path from "path";
import compile from "../lib/compiler/index.js";
import { fixturesDir, withCwd, ensureLcuiReact, cleanGenerated } from "./helpers.js";

describe("ts-loader — React key warning includes source file path", () => {
  const fixtureDir = path.join(fixturesDir, "ts-loader-key-warning");

  before(function () {
    this.timeout(30000);
    ensureLcuiReact(fixtureDir);
    cleanGenerated(fixtureDir, "src");
  });

  it("prefixes React dev-mode warnings with 'in <filePath>:'", async function () {
    this.timeout(30000);

    // Intercept console.error to capture output.
    // compile.ts internally patches console.error during componentFunc execution,
    // adding "in <filePath>:" prefix. We capture that here.
    const captured = [];
    const realConsoleError = console.error;
    console.error = (...args) => {
      captured.push(args.map((a) => (typeof a === "string" ? a : String(a))).join(" "));
    };

    try {
      await withCwd(fixtureDir, () => compile(undefined, { skipXMake: true }));
    } finally {
      console.error = realConsoleError;
    }

    // At least one captured line should contain the file path and "key"
    const listPath = path.join(fixtureDir, "src", "list.tsx");
    const keyWarnings = captured.filter((line) => line.includes("key") && line.includes(listPath));

    assert.ok(
      keyWarnings.length > 0,
      `Expected at least one warning containing "${listPath}" and "key".\n` +
        `Captured console.error output:\n${captured.join("\n")}`
    );

    // Verify the prefix format is "in <filePath>:"
    assert.ok(
      keyWarnings.some((line) => line.startsWith(`in ${listPath}:`)),
      `Expected warning to start with "in ${listPath}:" prefix.\n` +
        `Matching warnings:\n${keyWarnings.join("\n")}`
    );
  });
});
