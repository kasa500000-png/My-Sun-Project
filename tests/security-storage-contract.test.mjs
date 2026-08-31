import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = process.cwd();
const read = relativePath => fs.readFileSync(path.join(root, relativePath), "utf8");
const exists = relativePath => fs.existsSync(path.join(root, relativePath));

const analyzeRoute = read("app/api/diet/analyze/route.ts");
const dietLogRoute = read("app/api/diet-log/route.ts");
const storageModule = read("lib/diet-image-storage.ts");
const migration = read("supabase/migration-ai-storage-security.sql");
const packageJson = JSON.parse(read("package.json"));

test("AI analysis requires a user and consumes a persistent quota before xAI", () => {
  assert.match(analyzeRoute, /createSupabaseServer/);
  assert.match(analyzeRoute, /if \(!userId\).*401/s);
  assert.match(analyzeRoute, /consume_fit_ai_analysis_quota/);
  assert.match(analyzeRoute, /Retry-After/);
  assert.match(analyzeRoute, /sameOriginRequest/);
  assert.doesNotMatch(analyzeRoute, /console\.error\([^\n]*result\.data/);
});

test("diet photos use a private Storage path instead of persisting new base64 values", () => {
  assert.match(dietLogRoute, /prepareDietImage/);
  assert.match(dietLogRoute, /image_path: preparedImage\.imagePath/);
  assert.match(dietLogRoute, /signedDietImageUrls/);
  assert.match(storageModule, /createSignedUrls/);
  assert.match(storageModule, /MAX_IMAGE_BYTES = 6 \* 1024 \* 1024/);
  assert.doesNotMatch(dietLogRoute, /image_url:\s*asImageUrl/);
});

test("database migration creates a private bucket and server-only quota function", () => {
  assert.match(migration, /fit-diet-images/);
  assert.match(migration, /public\s*=\s*EXCLUDED\.public/);
  assert.match(migration, /fit_ai_usage_buckets/);
  assert.match(migration, /pg_advisory_xact_lock/);
  assert.match(migration, /GRANT EXECUTE[\s\S]*service_role/);
  assert.match(migration, /REVOKE ALL[\s\S]*anon, authenticated/);
});

test("staging and legacy-image migration operations are explicit scripts", () => {
  assert.ok(exists("scripts/staging-crud-smoke.mjs"));
  assert.ok(exists("scripts/migrate-diet-images-to-storage.mjs"));
  assert.ok(exists(".github/workflows/staging-crud-smoke.yml"));
  assert.match(packageJson.scripts["smoke:staging"], /staging-crud-smoke/);
  assert.match(packageJson.scripts["migrate:diet-images"], /migrate-diet-images-to-storage/);
});
