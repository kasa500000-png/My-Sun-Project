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

for (const key of [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "SUPABASE_DB_URL",
]) {
  if (!envExample.includes(`${key}=`)) fail(`.env.example is missing ${key}`);
}

if (!packageJson.scripts?.validate?.includes("npm run quality")) {
  fail("package validate script must include npm run quality");
}

const requiredManifestFields = ["name", "short_name", "id", "start_url", "scope", "display", "icons"];

for (const field of requiredManifestFields) {
  if (!manifest[field]) fail(`manifest is missing ${field}`);
}

if (manifest.display !== "standalone") fail("manifest display must be standalone");
if (manifest.lang !== "ko-KR") fail("manifest lang must be ko-KR");
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

const serviceWorkerHeaders = headers.find(item => item.source === "/sw.js")?.headers || [];
if (!serviceWorkerHeaders.some(item => item.key === "Cache-Control" && item.value.includes("no-store"))) {
  fail("service worker must be served with no-store cache headers");
}

const fitApp = read("components/FitLogApp.tsx");
const loginPage = read("app/login/page.tsx");
const clientSources = [fitApp, loginPage, read("components/ServiceWorkerBridge.tsx")].join("\n");
for (const forbiddenStorageApi of ["localStorage", "sessionStorage", "indexedDB"]) {
  if (clientSources.includes(forbiddenStorageApi)) {
    fail(`client must not use browser-local workout storage: ${forbiddenStorageApi}`);
  }
}

if (/user_id\s*[=:]/.test(fitApp) || /user_id=/.test(fitApp)) {
  fail("FitLogApp must not send user_id to fit APIs");
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
  const relativePath = `/images/muscle-focus-cards/${fileName}`;
  if (!existsPublicAsset(relativePath)) fail(`muscle card image is missing for ${key}: ${relativePath}`);
}

const muscleIds = new Set([...fitApp.matchAll(/muscleId:\s*"([^"]+)"/g)].map(match => match[1]));
for (const muscleId of muscleIds) {
  if (!muscleImageKeys.has(muscleId)) fail(`exercise muscleId has no focus card image mapping: ${muscleId}`);
}

for (const dir of ["public/images", "public/images/muscle-focus-cards"]) {
  for (const fileName of fs.readdirSync(path.join(root, dir))) {
    const filePath = path.join(root, dir, fileName);
    if (!fs.statSync(filePath).isFile()) continue;
    const size = fs.statSync(filePath).size;
    if (size > 2 * 1024 * 1024) fail(`image exceeds 2MB mobile budget: ${path.relative(root, filePath)}`);
  }
}

if (!process.exitCode) console.log("quality-check: ok");
