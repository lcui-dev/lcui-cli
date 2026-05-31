/**
 * Download the upstream Fluent System Icons font assets needed by the
 * convert.js generator. Called automatically via the `prebuild` npm hook.
 *
 * The pinned upstream tag is recorded in `fonts-version.json` so builds are
 * reproducible. Update that file (and add a changeset) to bump the icon set.
 *
 * Files that already exist are skipped, which makes incremental local builds
 * cheap. Set `FORCE_FETCH_FONTS=1` to re-download.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { pipeline } from "node:stream/promises";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pkgRoot = path.resolve(__dirname, "..");
const fontsDir = path.join(pkgRoot, "fonts");
const manifestPath = path.join(pkgRoot, "fonts-version.json");

const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
const { repo, ref, files } = manifest;

if (!repo || !ref || !Array.isArray(files) || files.length === 0) {
  console.error("fonts-version.json is missing required fields (repo, ref, files).");
  process.exit(1);
}

const force = process.env.FORCE_FETCH_FONTS === "1";

fs.mkdirSync(fontsDir, { recursive: true });

async function download(file) {
  const target = path.join(fontsDir, file);
  if (!force && fs.existsSync(target) && fs.statSync(target).size > 0) {
    console.log(`[fetch-fonts] skip (cached) ${file}`);
    return;
  }
  const url = `https://raw.githubusercontent.com/${repo}/${ref}/fonts/${file}`;
  console.log(`[fetch-fonts] GET  ${url}`);

  const headers = {};
  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }
  const res = await fetch(url, { headers });
  if (!res.ok || !res.body) {
    throw new Error(`Failed to download ${file}: HTTP ${res.status} ${res.statusText}`);
  }

  const tmp = `${target}.tmp`;
  await pipeline(res.body, fs.createWriteStream(tmp));
  fs.renameSync(tmp, target);
  console.log(`[fetch-fonts] saved ${path.relative(pkgRoot, target)}`);
}

try {
  for (const file of files) {
    // eslint-disable-next-line no-await-in-loop
    await download(file);
  }
} catch (err) {
  console.error(`[fetch-fonts] ${err.message}`);
  process.exit(1);
}
