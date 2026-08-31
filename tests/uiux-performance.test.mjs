import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = process.cwd();
const read = relativePath => fs.readFileSync(path.join(root, relativePath), "utf8");

const layout = read("app/layout.tsx");
const performanceCss = read("app/uiux-performance.css");
const serviceWorker = read("public/sw.js");
const fitApp = read("components/FitLogApp.tsx");

test("font stylesheet is discovered before nested CSS import resolves", () => {
  assert.match(layout, /rel="preconnect"/);
  assert.match(layout, /rel="preload" as="style"/);
  assert.match(layout, /pretendardvariable\.css/);
});

test("long screens have guarded offscreen rendering", () => {
  assert.match(performanceCss, /@supports \(content-visibility: auto\)/);
  assert.match(performanceCss, /contain-intrinsic-size/);
  assert.match(performanceCss, /@media print/);
});

test("small devices and user data preferences avoid expensive presentation", () => {
  assert.match(performanceCss, /prefers-reduced-transparency: reduce/);
  assert.match(performanceCss, /backdrop-filter: none/);
  assert.match(performanceCss, /prefers-reduced-data: reduce/);
});

test("private app data is not persisted in browser storage or navigation cache", () => {
  for (const token of ["localStorage", "sessionStorage", "indexedDB"]) {
    assert.doesNotMatch(fitApp, new RegExp(token));
  }
  assert.match(serviceWorker, /PUBLIC_NAVIGATION_PATHS/);
  assert.match(serviceWorker, /url\.pathname\.startsWith\("\/api\/"\)/);
});
