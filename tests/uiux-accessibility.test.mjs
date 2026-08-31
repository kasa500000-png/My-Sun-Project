import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = process.cwd();
const read = relativePath => fs.readFileSync(path.join(root, relativePath), "utf8");

const layout = read("app/layout.tsx");
const login = read("app/login/page.tsx");
const foundationCss = read("app/uiux-foundation.css");
const accessibilityCss = read("app/uiux-accessibility.css");
const responsiveCss = read("app/uiux-responsive.css");
const loadingCss = read("app/uiux-loading.css");
const statePage = read("components/ui/AppStatePage.tsx");
const statusMessage = read("components/ui/StatusMessage.tsx");
const fieldMessage = read("components/ui/FieldMessage.tsx");
const errorPage = read("app/error.tsx");
const notFoundPage = read("app/not-found.tsx");
const offlinePage = read("app/offline/page.tsx");
const serviceWorker = read("public/sw.js");

test("viewport keeps browser zoom available", () => {
  assert.match(layout, /maximumScale:\s*5/);
  assert.match(layout, /userScalable:\s*true/);
  assert.match(layout, /viewportFit:\s*"cover"/);
});

test("keyboard users can skip repeated chrome", () => {
  assert.match(layout, /href="#app-content"/);
  assert.match(layout, /본문으로 건너뛰기/);
  assert.match(layout, /id="app-content"/);
  assert.match(layout, /tabIndex=\{-1\}/);
});

test("authentication exposes an accessible tab and field contract", () => {
  assert.match(login, /role="tablist"/);
  assert.match(login, /role="tab"/);
  assert.match(login, /role="tabpanel"/);
  assert.match(login, /aria-labelledby=\{activeTabId\}/);
  assert.match(login, /aria-label="로그인 모드 선택"/);
  assert.match(login, /aria-label="회원가입 모드 선택"/);
  assert.match(login, /type="email"/);
  assert.match(login, /autoComplete="email"/);
  assert.match(login, /aria-invalid=\{fieldError === "email"\}/);
  assert.match(login, /aria-describedby=/);
  assert.match(login, /aria-pressed=\{showPassword\}/);
});

test("status and field messages expose live semantics", () => {
  assert.match(statusMessage, /role=\{tone === "danger" \? "alert" : "status"\}/);
  assert.match(statusMessage, /aria-live=\{ariaLive\}/);
  assert.match(statusMessage, /aria-atomic="true"/);
  assert.match(fieldMessage, /role=\{isError \? "alert" : undefined\}/);
});

test("shared state pages provide labelled headings and actions", () => {
  assert.match(statePage, /aria-labelledby=\{titleId\}/);
  for (const source of [errorPage, notFoundPage, offlinePage]) {
    assert.match(source, /AppStatePage/);
  }
  assert.match(errorPage, /화면 다시 불러오기/);
  assert.match(notFoundPage, /저장된 운동·식단 데이터에는 영향을 주지 않았습니다/);
});

test("focus, contrast, safe areas and motion preferences are represented", () => {
  assert.match(accessibilityCss, /:focus-visible/);
  assert.match(accessibilityCss, /prefers-contrast:\s*more/);
  assert.match(accessibilityCss, /forced-colors:\s*active/);
  assert.match(loadingCss, /prefers-reduced-motion:\s*reduce/);
  assert.match(foundationCss, /safe-area-inset-bottom/);
  assert.match(responsiveCss, /var\(--mysun-safe-bottom\)/);
  assert.match(responsiveCss, /font-size:\s*16px/);
});

test("service worker excludes private navigation and API data", () => {
  assert.match(serviceWorker, /PUBLIC_NAVIGATION_PATHS/);
  assert.match(serviceWorker, /new Set\(\["\/login", "\/offline"\]\)/);
  assert.match(serviceWorker, /url\.pathname\.startsWith\("\/api\/"\)/);
  assert.match(serviceWorker, /url\.pathname\.startsWith\("\/auth\/"\)/);
  assert.doesNotMatch(serviceWorker, /cache\.put\(request, copy\).*request\.mode === "navigate"/s);
});
