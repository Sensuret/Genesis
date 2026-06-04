// =============================================================================
// Copy the canonical MT4 / MT5 EA sources from `integrations/mt-ea/...` into
// `public/ea/` so they're directly downloadable from the in-app setup
// wizard via /ea/GenesisSync.mq4 and /ea/GenesisSync.mq5.
//
// Runs as a `prebuild` / `predev` npm hook so the public copy can never drift
// from the source of truth in `integrations/mt-ea/`. The script is a no-op
// when the destination already exists with the same contents.
// =============================================================================

import { mkdir, copyFile, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..");

const PAIRS = [
  {
    from: path.join(repoRoot, "integrations", "mt-ea", "mq4", "GenesisSync.mq4"),
    to: path.join(repoRoot, "public", "ea", "GenesisSync.mq4")
  },
  {
    from: path.join(repoRoot, "integrations", "mt-ea", "mq5", "GenesisSync.mq5"),
    to: path.join(repoRoot, "public", "ea", "GenesisSync.mq5")
  }
];

async function sameContent(a, b) {
  if (!existsSync(b)) return false;
  const [bufA, bufB] = await Promise.all([readFile(a), readFile(b)]);
  return bufA.equals(bufB);
}

for (const { from, to } of PAIRS) {
  if (!existsSync(from)) {
    console.warn(`[copy-ea-sources] missing source: ${from} — skipping`);
    continue;
  }
  if (await sameContent(from, to)) continue;
  await mkdir(path.dirname(to), { recursive: true });
  await copyFile(from, to);
  console.log(`[copy-ea-sources] ${path.relative(repoRoot, from)} → ${path.relative(repoRoot, to)}`);
}
