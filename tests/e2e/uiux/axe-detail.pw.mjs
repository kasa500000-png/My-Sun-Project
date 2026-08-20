import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import fs from "node:fs/promises";
import path from "node:path";
import { FIXED_NOW, installUiuxFixtures } from "./fixtures.mjs";

const EVIDENCE_ROOT = path.resolve(process.env.UIUX_EVIDENCE_DIR || "artifacts/uiux/runtime/after");

const SCREENS = [
  { id: "AUTH-01", path: "/login" },
  {
    id: "AUTH-02",
    path: "/login",
    prepare: page => page.getByRole("tab", { name: "회원가입 모드 선택" }).click(),
  },
  { id: "APP-01", path: "/uiux-visual?tab=home" },
  { id: "APP-02", path: "/uiux-visual?tab=train" },
  { id: "APP-03", path: "/uiux-visual?tab=log" },
  { id: "APP-04", path: "/uiux-visual?tab=balance" },
  { id: "APP-05", path: "/uiux-visual?tab=diet" },
  { id: "APP-06", path: "/uiux-visual?tab=member" },
  { id: "STATE-01", path: "/uiux-visual/loading" },
  { id: "STATE-03", path: "/uiux-screen-that-does-not-exist" },
  { id: "STATE-04", path: "/offline" },
];

test.use({ viewport: { width: 390, height: 844 } });

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(FIXED_NOW);
  await installUiuxFixtures(page);
});

test("record detailed WCAG findings for every representative screen", async ({ page }) => {
  const results = [];

  for (const screen of SCREENS) {
    await page.goto(screen.path, { waitUntil: "domcontentloaded" });
    if (screen.prepare) await screen.prepare(page);
    await expect(page.locator("main").first()).toBeVisible();

    const scan = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
      .analyze();

    results.push({
      screen: screen.id,
      path: screen.path,
      violations: scan.violations.map(violation => ({
        id: violation.id,
        impact: violation.impact,
        help: violation.help,
        helpUrl: violation.helpUrl,
        nodes: violation.nodes.map(node => ({
          target: node.target,
          html: node.html,
          failureSummary: node.failureSummary,
          impact: node.impact,
        })),
      })),
    });
  }

  const reportDirectory = path.join(EVIDENCE_ROOT, "reports");
  await fs.mkdir(reportDirectory, { recursive: true });
  await fs.writeFile(
    path.join(reportDirectory, "axe-details.json"),
    JSON.stringify({ viewport: { width: 390, height: 844 }, results }, null, 2),
    "utf8",
  );
});
