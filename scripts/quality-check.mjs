import fs from "node:fs";
import path from "node:path";
import config from "../next.config.js";

const root = process.cwd();

function fail(message) {
  console.error(`quality-check: ${message}`);
  process.exitCode = 1;
}

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function existsPublicAsset(src) {
  return fs.existsSync(path.join(root, "public", src.replace(/^\//, "")));
}

const manifest = JSON.parse(read("public/manifest.webmanifest"));
const packageJson = JSON.parse(read("package.json"));
const envExample = read(".env.example");
const fitLogMigration = read("supabase/migration-fit-log.sql");
const fitLogRoute = read("app/api/fit-log/route.ts");

for (const routePath of [
  "app/api/fit-log/route.ts",
  "app/api/fit-settings/route.ts",
  "app/api/auth/signup/route.ts",
  "app/auth/callback/route.ts",
]) {
  if (!read(routePath).includes('runtime = "nodejs"')) {
    fail(`${routePath} must explicitly use the nodejs runtime`);
  }
}

for (const token of [
  "restoreSessionSnapshot",
  "existingSession",
  "기존 기록은 복원했습니다",
]) {
  if (!fitLogRoute.includes(token)) fail(`fit-log PUT update rollback guard is missing ${token}`);
}

for (const key of [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "SUPABASE_DB_URL",
]) {
  if (!envExample.includes(`${key}=`)) fail(`.env.example is missing ${key}`);
}

for (const constraintName of [
  "fit_sessions_duration_minutes_range",
  "fit_sets_set_number_range",
  "fit_sets_non_negative_metrics",
  "fit_settings_body_metrics_range",
]) {
  if (!fitLogMigration.includes(constraintName)) fail(`migration is missing constraint ${constraintName}`);
}

if (!packageJson.scripts?.validate?.includes("npm run quality")) {
  fail("package validate script must include npm run quality");
}

const requiredManifestFields = ["name", "short_name", "id", "start_url", "scope", "display", "icons"];

for (const field of requiredManifestFields) {
  if (!manifest[field]) fail(`manifest is missing ${field}`);
}

if (manifest.display !== "standalone") fail("manifest display must be standalone");
if (manifest.orientation !== "portrait") fail("manifest orientation must be portrait");
if (manifest.lang !== "ko-KR") fail("manifest lang must be ko-KR");
if (manifest.id !== "/") fail("manifest id must use the app root");
if (manifest.start_url !== "/") fail("manifest start_url must use the app root");
if (manifest.scope !== "/") fail("manifest scope must use the app root");
if (manifest.theme_color !== "#fffdfb") fail("manifest theme_color must match the app surface");
if (manifest.background_color !== "#fffdfb") fail("manifest background_color must match the app surface");
if (!Array.isArray(manifest.icons) || manifest.icons.length < 2) fail("manifest must include install icons");

for (const icon of manifest.icons || []) {
  if (!icon.src || !existsPublicAsset(icon.src)) fail(`manifest icon is missing on disk: ${icon.src}`);
}

for (const shortcut of manifest.shortcuts || []) {
  for (const icon of shortcut.icons || []) {
    if (!icon.src || !existsPublicAsset(icon.src)) fail(`shortcut icon is missing on disk: ${icon.src}`);
  }
}

const serviceWorker = read("public/sw.js");
for (const token of ["install", "activate", "fetch", "CACHE_NAME"]) {
  if (!serviceWorker.includes(token)) fail(`service worker is missing ${token}`);
}
if (!serviceWorker.includes('url.pathname.startsWith("/auth/")')) {
  fail("service worker must not cache auth callback routes");
}

const headers = await config.headers();
const globalHeaders = new Set(headers.find(item => item.source === "/:path*")?.headers.map(item => item.key));
for (const key of [
  "Strict-Transport-Security",
  "X-Content-Type-Options",
  "X-Frame-Options",
  "Cross-Origin-Opener-Policy",
  "Referrer-Policy",
  "Permissions-Policy",
]) {
  if (!globalHeaders.has(key)) fail(`global security header is missing ${key}`);
}

const apiHeaders = headers.find(item => item.source === "/api/:path*")?.headers || [];
if (!apiHeaders.some(item => item.key === "Cache-Control" && item.value.includes("no-store"))) {
  fail("fit APIs must be served with Cache-Control: no-store");
}

const authHeaders = headers.find(item => item.source === "/auth/:path*")?.headers || [];
if (!authHeaders.some(item => item.key === "Cache-Control" && item.value.includes("no-store"))) {
  fail("auth callback routes must be served with Cache-Control: no-store");
}

const serviceWorkerHeaders = headers.find(item => item.source === "/sw.js")?.headers || [];
if (!serviceWorkerHeaders.some(item => item.key === "Cache-Control" && item.value.includes("no-store"))) {
  fail("service worker must be served with no-store cache headers");
}

const fitApp = read("components/FitLogApp.tsx");
const loginPage = read("app/login/page.tsx");
const rootLayout = read("app/layout.tsx");
const serviceSupabase = read("lib/supabase.ts");
if (!serviceSupabase.includes("cachedServiceClient")) {
  fail("Supabase service client should be cached at module scope");
}

for (const layoutToken of [
  "metadataBase",
  "appleWebApp",
  "viewportFit",
  "userScalable",
  "themeColor",
  "colorScheme",
]) {
  if (!rootLayout.includes(layoutToken)) fail(`layout metadata is missing ${layoutToken}`);
}

if (!rootLayout.includes('rel="preconnect"') || !rootLayout.includes("https://cdn.jsdelivr.net")) {
  fail("layout must preconnect to the font CDN used by global CSS");
}

const clientSources = [fitApp, loginPage, read("components/ServiceWorkerBridge.tsx")].join("\n");
for (const forbiddenStorageApi of ["localStorage", "sessionStorage", "indexedDB"]) {
  if (clientSources.includes(forbiddenStorageApi)) {
    fail(`client must not use browser-local workout storage: ${forbiddenStorageApi}`);
  }
}

if (/user_id\s*[=:]/.test(fitApp) || /user_id=/.test(fitApp)) {
  fail("FitLogApp must not send user_id to fit APIs");
}

if (/\bany\b/.test(fitApp)) {
  fail("FitLogApp must avoid any in client data handling");
}

if (!fitApp.includes("return false;") || !fitApp.includes("if (saved) setActiveModal(null)")) {
  fail("profile settings modal must stay open when saving fails");
}

const buttonsWithoutType = [...fitApp.matchAll(/<button\b(?![^>]*\btype=)[^>]*>/g)];
if (buttonsWithoutType.length > 0) {
  fail(`FitLogApp has ${buttonsWithoutType.length} button(s) without explicit type`);
}

const loginButtonsWithoutType = [...loginPage.matchAll(/<button\b(?![^>]*\btype=)[^>]*>/g)];
if (loginButtonsWithoutType.length > 0) {
  fail(`login page has ${loginButtonsWithoutType.length} button(s) without explicit type`);
}

if (!loginPage.includes('type="submit"')) {
  fail("login page must have an explicit submit button");
}

for (const authModeLabel of ["로그인 모드 선택", "회원가입 모드 선택"]) {
  if (!loginPage.includes(`aria-label="${authModeLabel}"`)) {
    fail(`login mode toggle is missing aria-label: ${authModeLabel}`);
  }
}

for (const source of [fitApp, loginPage]) {
  if (!source.includes("네트워크 연결이 불안정합니다")) {
    fail("client fetch failures must show a Korean network error message");
  }
}

const dialogOverlays = [...fitApp.matchAll(/<div[^>]*role="dialog"[^>]*>/g)];
if (dialogOverlays.length === 0) {
  fail("FitLogApp must expose modal dialogs with role=dialog");
}

for (const match of dialogOverlays) {
  const overlayTag = match[0];
  const dialogSnippet = fitApp.slice(match.index, match.index + 600);
  if (!overlayTag.includes("onClick=")) {
    fail("modal dialog backdrop must close on outside click");
  }
  if (!dialogSnippet.includes("stopPropagation()")) {
    fail("modal dialog panel must stop click propagation");
  }
}

const muscleImageEntries = [...fitApp.matchAll(/([a-zA-Z][\w]*):\s*"\/images\/muscle-focus-cards\/([^"]+)"/g)];
const muscleImageKeys = new Set(muscleImageEntries.map(match => match[1]));
for (const [, key, fileName] of muscleImageEntries) {
  if (!fileName.endsWith(".webp")) fail(`muscle card image should use WebP for mobile performance: ${key}`);
  const relativePath = `/images/muscle-focus-cards/${fileName}`;
  if (!existsPublicAsset(relativePath)) fail(`muscle card image is missing for ${key}: ${relativePath}`);
}

const muscleIds = new Set([...fitApp.matchAll(/muscleId:\s*"([^"]+)"/g)].map(match => match[1]));
for (const muscleId of muscleIds) {
  if (!muscleImageKeys.has(muscleId)) fail(`exercise muscleId has no focus card image mapping: ${muscleId}`);
}

const exerciseImpactBlocks = [...fitApp.matchAll(/id:\s*"([^"]+)"[\s\S]*?impacts:\s*\[([\s\S]*?)\]/g)];
for (const [, exerciseId, body] of exerciseImpactBlocks) {
  const impactMuscleIds = [...body.matchAll(/muscleId:\s*"([^"]+)"/g)].map(match => match[1]);
  const duplicateMuscleIds = impactMuscleIds.filter((id, index) => impactMuscleIds.indexOf(id) !== index);
  if (duplicateMuscleIds.length > 0) {
    fail(`exercise has duplicate muscle impact ids: ${exerciseId}`);
  }

  const impactSum = [...body.matchAll(/impactRatio:\s*([0-9.]+)/g)]
    .map(match => Number(match[1]))
    .reduce((total, value) => total + value, 0);
  if (Math.abs(impactSum - 1) > 0.011) {
    fail(`exercise impact ratios must add up to 1: ${exerciseId}`);
  }
}

const exerciseListStart = fitApp.indexOf("const EXERCISES: Exercise[]");
const exerciseListEnd = fitApp.indexOf("const ROUTINES");
const exerciseListSource = fitApp.slice(exerciseListStart, exerciseListEnd);
const exerciseIds = [...exerciseListSource.matchAll(/id:\s*"([^"]+)"/g)].map(match => match[1]);
const routineExerciseIds = [...fitApp.matchAll(/const [A-Z_]+_EXERCISE_IDS = \[([\s\S]*?)\];/g)]
  .flatMap(match => [...match[1].matchAll(/"([^"]+)"/g)].map(idMatch => idMatch[1]));
const exerciseIdSet = new Set(exerciseIds);
const routineExerciseIdSet = new Set(routineExerciseIds);

for (const routineExerciseId of routineExerciseIdSet) {
  if (!exerciseIdSet.has(routineExerciseId)) fail(`routine references unknown exercise id: ${routineExerciseId}`);
}

for (const exerciseId of exerciseIds) {
  if (!routineExerciseIdSet.has(exerciseId)) fail(`exercise is not visible in any routine tab: ${exerciseId}`);
}

for (const dir of ["public/images", "public/images/muscle-focus-cards"]) {
  for (const fileName of fs.readdirSync(path.join(root, dir))) {
    const filePath = path.join(root, dir, fileName);
    if (!fs.statSync(filePath).isFile()) continue;
    const size = fs.statSync(filePath).size;
    if (size > 2 * 1024 * 1024) fail(`image exceeds 2MB mobile budget: ${path.relative(root, filePath)}`);
  }
}

function publicAssetBytes(relativeDir) {
  const absoluteDir = path.join(root, relativeDir);
  return fs.readdirSync(absoluteDir, { withFileTypes: true }).reduce((total, entry) => {
    const entryPath = path.join(relativeDir, entry.name);
    if (entry.isDirectory()) return total + publicAssetBytes(entryPath);
    return total + fs.statSync(path.join(root, entryPath)).size;
  }, 0);
}

const publicAssetBudgetBytes = 10 * 1024 * 1024;
const publicAssetTotalBytes = publicAssetBytes("public");
if (publicAssetTotalBytes > publicAssetBudgetBytes) {
  fail(`public assets exceed 10MB mobile budget: ${Math.round(publicAssetTotalBytes / 1024)}KB`);
}

if (!process.exitCode) console.log("quality-check: ok");
