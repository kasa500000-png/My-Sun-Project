import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = process.cwd();
const read = relativePath => fs.readFileSync(path.join(root, relativePath), "utf8");
const exists = relativePath => fs.existsSync(path.join(root, relativePath));

const layout = read("app/layout.tsx");
const context = read("docs/uiux/00-project-context.md");
const inventory = read("docs/uiux/02-screen-inventory.md");
const responsive = read("docs/uiux/10-responsive-layout.md");
const packageJson = JSON.parse(read("package.json"));

const requiredCss = [
  "globals.css",
  "uiux-foundation.css",
  "uiux-accessibility.css",
  "uiux-responsive.css",
  "uiux-components.css",
  "uiux-navigation.css",
  "uiux-loading.css",
  "uiux-auth.css",
  "uiux-dashboard.css",
  "uiux-workout.css",
  "uiux-search.css",
  "uiux-analysis.css",
  "uiux-goals.css",
  "uiux-forms.css",
  "uiux-data.css",
  "uiux-pwa.css",
  "uiux-settings.css",
  "uiux-motion.css",
  "uiux-performance.css",
];

test("official product identity follows the repository", () => {
  assert.match(context, /공식 앱 이름: 마이썬 운동일지/);
  assert.doesNotMatch(layout, /SwingLog/);
  assert.match(layout, /title: "마이썬 운동일지"/);
});

test("all UIUX styles are loaded and present", () => {
  for (const cssFile of requiredCss) {
    assert.match(layout, new RegExp(cssFile.replaceAll(".", "\\.")));
    assert.ok(exists(path.join("app", cssFile)), `${cssFile} must exist`);
  }
});

test("screen inventory covers public, protected and system states", () => {
  for (const id of ["AUTH-01", "AUTH-02", "APP-01", "APP-02", "APP-03", "APP-04", "APP-05", "APP-06", "STATE-01", "STATE-02", "STATE-03", "STATE-04"]) {
    assert.match(inventory, new RegExp(id));
  }
});

test("cross-device verification matrix stays explicit", () => {
  for (const viewport of ["360×800", "390×844", "412×915", "768×1024", "1280×800", "1440×900"]) {
    assert.match(responsive, new RegExp(viewport));
  }
});

test("each completed stage has an auditable log", () => {
  for (let stage = 1; stage <= 29; stage += 1) {
    const id = String(stage).padStart(2, "0");
    assert.ok(exists(path.join(".logs", "uiux", `stage-${id}.md`)), `stage-${id}.md must exist`);
  }
});

test("validate includes every repository quality gate", () => {
  const validate = packageJson.scripts.validate;
  for (const command of ["typecheck", "lint", "npm test", "quality", "build"]) {
    assert.match(validate, new RegExp(command.replace(" ", "\\s+")));
  }
});
