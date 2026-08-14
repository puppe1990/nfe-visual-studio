import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const root = join(import.meta.dirname, "..");
const html = pathToFileURL(join(root, "scripts/og-card.html")).href;
const out = join(root, "public/og.png");

const result = spawnSync(
  "npx",
  [
    "playwright",
    "screenshot",
    "--viewport-size=1200,630",
    "--wait-for-timeout=2000",
    html,
    out,
  ],
  { stdio: "inherit" },
);

process.exit(result.status ?? 1);
