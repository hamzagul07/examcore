#!/usr/bin/env node
// Run a SQL query against Supabase via the Management API.
//
// Usage:
//   node scripts/supa-query.mjs "select now()"
//   echo "select * from profiles limit 5" | node scripts/supa-query.mjs
//   node scripts/supa-query.mjs --file path/to/query.sql
//
// Reads credentials from .env.local:
//   - NEXT_PUBLIC_SUPABASE_URL  (used to derive the project ref)
//   - SUPABASE_ACCESS_TOKEN     (Supabase personal/management access token)
//
// NOTE: this runs SQL with full privileges. Treat it like psql as an admin.

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function loadEnvLocal() {
  const env = {};
  let raw;
  try {
    raw = readFileSync(resolve(process.cwd(), ".env.local"), "utf8");
  } catch {
    return env;
  }
  for (const line of raw.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    let val = m[2];
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    env[m[1]] = val;
  }
  return env;
}

function getSql() {
  const args = process.argv.slice(2);
  const fileIdx = args.indexOf("--file");
  if (fileIdx !== -1) {
    const p = args[fileIdx + 1];
    if (!p) throw new Error("--file requires a path");
    return readFileSync(resolve(process.cwd(), p), "utf8");
  }
  const positional = args.filter((a) => !a.startsWith("--"));
  if (positional.length) return positional.join(" ");
  // fall back to stdin
  try {
    return readFileSync(0, "utf8");
  } catch {
    return "";
  }
}

async function main() {
  const env = { ...loadEnvLocal(), ...process.env };
  const url = env.NEXT_PUBLIC_SUPABASE_URL || "";
  const token = env.SUPABASE_ACCESS_TOKEN;
  const refMatch = url.match(/https?:\/\/([^.]+)\.supabase\./);
  const ref = env.SUPABASE_PROJECT_REF || (refMatch && refMatch[1]);

  if (!token) throw new Error("SUPABASE_ACCESS_TOKEN not found in .env.local");
  if (!ref) throw new Error("Could not determine project ref from NEXT_PUBLIC_SUPABASE_URL");

  const query = getSql().trim();
  if (!query) throw new Error("No SQL provided (arg, --file, or stdin)");

  const res = await fetch(
    `https://api.supabase.com/v1/projects/${ref}/database/query`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query }),
    }
  );

  const text = await res.text();
  if (!res.ok) {
    console.error(`HTTP ${res.status} ${res.statusText}`);
    console.error(text);
    process.exit(1);
  }

  let data;
  try {
    data = JSON.parse(text);
  } catch {
    console.log(text);
    return;
  }
  console.log(JSON.stringify(data, null, 2));
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
