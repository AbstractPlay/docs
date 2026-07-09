#!/usr/bin/env node
/**
 * Mirror CI submodule checkout: init submodules, then fetch latest develop tip.
 */
const { execSync } = require("child_process");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const SUBMODULES = [
  "vendor/renderer",
  "vendor/gameslib",
  "vendor/node-backend",
  "vendor/recranks",
  "vendor/backend-crons",
];
const BRANCH = process.env.VENDOR_BRANCH || "develop";

function run(cmd) {
  execSync(cmd, { cwd: ROOT, stdio: "inherit", shell: true });
}

console.log(`Syncing submodules to latest origin/${BRANCH} (resets vendor working trees, like CI)...`);

run("git submodule sync --recursive");
run(`git submodule update --init --recursive ${SUBMODULES.join(" ")}`);

for (const sub of SUBMODULES) {
  const dir = path.join(ROOT, sub);
  run(`git -C "${dir}" reset --hard`);
  run(`git -C "${dir}" clean -fd`);
  run(`git -C "${dir}" fetch --depth=1 origin ${BRANCH}`);
  run(`git -C "${dir}" checkout FETCH_HEAD`);
}

console.log(`Submodules synced to latest origin/${BRANCH}`);
