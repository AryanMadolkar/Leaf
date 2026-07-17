/**
 * Legacy entrypoint — procedural fake-book padding has been removed.
 * Use generateRealCatalog.mjs for a real Open Library catalog.
 */
import { spawnSync } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
console.warn(
  "generate500Books.mjs no longer creates fake books. Delegating to generateRealCatalog.mjs…"
);
const result = spawnSync(process.execPath, [path.join(__dirname, "generateRealCatalog.mjs")], {
  stdio: "inherit",
});
process.exit(result.status ?? 1);
