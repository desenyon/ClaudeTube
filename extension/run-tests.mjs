import { spawnSync } from "node:child_process";
import { readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const srcDir = path.join(root, "src");

const testFiles = readdirSync(srcDir)
  .filter((file) => file.endsWith(".test.ts"))
  .map((file) => path.join("src", file));

if (testFiles.length === 0) {
  console.error("No test files found in extension/src");
  process.exit(1);
}

const result = spawnSync("npx", ["tsx", "--test", ...testFiles], {
  cwd: root,
  stdio: "inherit",
  shell: true,
});

process.exit(result.status ?? 1);
