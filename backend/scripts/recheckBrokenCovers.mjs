/**
 * Re-verify the books flagged broken by verifyAndFixCovers.mjs's first pass.
 * That pass ran at concurrency 25 and got rate-limited by Open Library (HTTP 429),
 * producing mass false positives. This re-checks slowly (low concurrency, backoff
 * on 429) against the CURRENT cover_url in the DB to find genuinely dead covers.
 *
 * Usage (from backend/): node scripts/recheckBrokenCovers.mjs
 */
import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CONCURRENCY = 3;
const USER_AGENT = "LeafLibrary/1.0 (cover re-verification; real books only)";

let env = {};
const envPaths = [
  path.resolve(process.cwd(), ".env.local"),
  path.resolve(process.cwd(), "frontend", ".env.local"),
  path.resolve(process.cwd(), "..", "frontend", ".env.local"),
  path.resolve(process.cwd(), "backend", ".env.local"),
];
const envPath = envPaths.find((p) => fs.existsSync(p));
if (envPath) {
  fs.readFileSync(envPath, "utf8")
    .split("\n")
    .forEach((line) => {
      const m = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (!m) return;
      let val = m[2] || "";
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      env[m[1]] = val;
    });
}

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase URL or service role key in .env.local");
  process.exit(1);
}
const supabase = createClient(supabaseUrl, supabaseKey);

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function checkUrl(url, retries = 4) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);
    try {
      let res = await fetch(url, {
        method: "HEAD",
        signal: controller.signal,
        headers: { "User-Agent": USER_AGENT },
        redirect: "follow",
      });
      if (res.status === 405 || res.status === 501) {
        res = await fetch(url, {
          method: "GET",
          signal: controller.signal,
          headers: { "User-Agent": USER_AGENT, Range: "bytes=0-2047" },
          redirect: "follow",
        });
      }
      if (res.status === 429) {
        clearTimeout(timer);
        await sleep(1500 * (attempt + 1));
        continue;
      }
      if (!res.ok) return { ok: false, reason: `HTTP ${res.status}` };
      const len = Number(res.headers.get("content-length") || 0);
      if (len > 0 && len < 200) return { ok: false, reason: `tiny (${len}b)` };
      return { ok: true };
    } catch (err) {
      if (attempt < retries) {
        await sleep(1000 * (attempt + 1));
        continue;
      }
      return { ok: false, reason: err.name === "AbortError" ? "timeout" : err.message };
    } finally {
      clearTimeout(timer);
    }
  }
  return { ok: false, reason: "rate-limited" };
}

async function runPool(items, worker, concurrency) {
  let idx = 0;
  let active = 0;
  return new Promise((resolve) => {
    const next = () => {
      if (idx >= items.length && active === 0) return resolve();
      while (active < concurrency && idx < items.length) {
        const item = items[idx++];
        active++;
        worker(item)
          .catch(() => {})
          .finally(() => {
            active--;
            next();
          });
      }
    };
    next();
  });
}

async function main() {
  const broken = JSON.parse(fs.readFileSync(path.resolve(__dirname, "broken-covers.json"), "utf8"));

  // Re-fetch current cover_url from the DB — some of these may have been
  // updated by the repair pass, most weren't.
  const ids = broken.map((b) => b.id);
  const current = new Map();
  const pageSize = 500;
  for (let i = 0; i < ids.length; i += pageSize) {
    const chunk = ids.slice(i, i + pageSize);
    const { data, error } = await supabase.from("books").select("id, title, author_name, cover_url").in("id", chunk);
    if (error) throw error;
    for (const row of data) current.set(row.id, row);
  }

  const stillBroken = [];
  let checked = 0;
  console.log(`Re-checking ${ids.length} previously-flagged books at concurrency ${CONCURRENCY} with 429 backoff…`);

  await runPool(
    ids,
    async (id) => {
      const row = current.get(id);
      checked++;
      if (!row || !row.cover_url) {
        stillBroken.push(row || { id });
      } else {
        const result = await checkUrl(row.cover_url);
        if (!result.ok) stillBroken.push({ ...row, reason: result.reason });
      }
      if (checked % 50 === 0 || checked === ids.length) {
        process.stdout.write(`\rChecked ${checked}/${ids.length} — ${stillBroken.length} genuinely broken so far…`);
      }
    },
    CONCURRENCY
  );

  console.log(`\n\nGenuinely broken: ${stillBroken.length} / ${ids.length} re-checked (rest were false positives from rate-limiting).`);
  fs.writeFileSync(
    path.resolve(__dirname, "genuinely-broken-covers.json"),
    JSON.stringify(stillBroken, null, 2)
  );
  console.log("Wrote scripts/genuinely-broken-covers.json.");
}

main().catch((err) => {
  console.error("\nFatal error:", err);
  process.exit(1);
});
