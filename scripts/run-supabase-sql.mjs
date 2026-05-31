import fs from "node:fs";
import path from "node:path";
import pg from "pg";

const { Client } = pg;

function loadDotEnv(filePath) {
  if (!fs.existsSync(filePath)) return;

  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match) continue;

    const [, key, rawValue] = match;
    if (process.env[key]) continue;

    let value = rawValue.trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

function connectionLabel(connectionString) {
  try {
    const url = new URL(connectionString);
    return `${url.protocol}//${url.username ? `${url.username}@` : ""}${url.host}${url.pathname}`;
  } catch {
    return "configured database URL";
  }
}

const cwd = process.cwd();
loadDotEnv(path.join(cwd, ".env.local"));

const sqlPath = process.argv[2] || "supabase/migration-fit-log.sql";
const resolvedSqlPath = path.resolve(cwd, sqlPath);
const connectionString = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL;

if (!connectionString) {
  console.error("Missing SUPABASE_DB_URL or DATABASE_URL.");
  console.error("Add the Supabase Postgres connection string to .env.local, then rerun this command.");
  process.exit(1);
}

if (!fs.existsSync(resolvedSqlPath)) {
  console.error(`SQL file not found: ${resolvedSqlPath}`);
  process.exit(1);
}

const sql = fs.readFileSync(resolvedSqlPath, "utf8").trim();
if (!sql) {
  console.error(`SQL file is empty: ${resolvedSqlPath}`);
  process.exit(1);
}

const client = new Client({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

try {
  console.log(`Running SQL file: ${path.relative(cwd, resolvedSqlPath)}`);
  console.log(`Target database: ${connectionLabel(connectionString)}`);
  await client.connect();
  await client.query(sql);
  console.log("SQL execution completed.");
} catch (error) {
  console.error("SQL execution failed.");
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  await client.end().catch(() => {});
}
