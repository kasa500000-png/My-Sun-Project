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

const fitApp = read("components/FitLogApp.tsx");
if (/user_id\s*[=:]/.test(fitApp) || /user_id=/.test(fitApp)) {
  fail("FitLogApp must not send user_id to fit APIs");
}

if (!process.exitCode) console.log("quality-check: ok");
