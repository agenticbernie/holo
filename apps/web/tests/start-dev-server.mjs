import { spawn, spawnSync } from "node:child_process";

const astro = spawn("pnpm", ["exec", "astro", "dev", "--force", "--host", "127.0.0.1"], {
  stdio: "inherit",
});

let stopping = false;
const stop = () => {
  if (stopping) return;
  stopping = true;
  spawnSync("pnpm", ["exec", "astro", "dev", "stop"], { stdio: "inherit" });
  process.exit(0);
};

process.on("SIGINT", stop);
process.on("SIGTERM", stop);
astro.on("error", () => process.exit(1));

setInterval(() => {
  if (!stopping && astro.exitCode !== null && astro.exitCode !== 0) process.exit(astro.exitCode);
}, 250);
