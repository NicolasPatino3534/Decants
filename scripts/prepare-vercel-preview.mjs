import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const root = process.cwd();
const productionConfig = readJson(path.join(root, "vercel.json"));
const previewConfig = readJson(path.join(root, "vercel.preview.json"));

assertProductionCron(productionConfig);
assertPreviewHasNoScheduler(previewConfig);

const output = mkdtempSync(path.join(tmpdir(), "decants-preview-source-"));
const trackedFiles = gitBuffer("ls-tree", "-r", "-z", "--name-only", "HEAD")
  .toString("utf8")
  .split("\0")
  .filter(Boolean);

for (const relativePath of trackedFiles) {
  assertNoTrackedSecretFile(relativePath);
  if (relativePath === "vercel.json") continue;

  const destination = path.join(output, relativePath);
  mkdirSync(path.dirname(destination), { recursive: true });
  writeFileSync(destination, gitBuffer("show", `HEAD:${relativePath}`));
}

writeFileSync(
  path.join(output, "vercel.json"),
  `${JSON.stringify(previewConfig, null, 2)}\n`,
  "utf8",
);

console.error(
  `Prepared ${trackedFiles.length} tracked files from HEAD; production cron preserved in the repository and omitted from the Preview artifact.`,
);
console.log(output);

function gitBuffer(...args) {
  return execFileSync("git", args, {
    cwd: root,
    encoding: "buffer",
    maxBuffer: 64 * 1024 * 1024,
    stdio: ["ignore", "pipe", "inherit"],
  });
}

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, "utf8"));
}

function assertProductionCron(config) {
  const expected = {
    path: "/api/cron/release-stock",
    schedule: "*/10 * * * *",
  };
  if (
    !Array.isArray(config.crons) ||
    config.crons.length !== 1 ||
    config.crons[0]?.path !== expected.path ||
    config.crons[0]?.schedule !== expected.schedule
  ) {
    throw new Error(
      "Refusing to prepare Preview because the production reservation cron changed unexpectedly.",
    );
  }
}

function assertPreviewHasNoScheduler(config) {
  if ("crons" in config) {
    throw new Error(
      "vercel.preview.json must omit crons entirely. Preview release is controlled manually.",
    );
  }
}

function assertNoTrackedSecretFile(relativePath) {
  const name = path.basename(relativePath).toLowerCase();
  if (name === ".env.example") return;
  if (name === ".env" || name.startsWith(".env.")) {
    throw new Error(
      `Refusing to package tracked environment file: ${relativePath}`,
    );
  }
}
