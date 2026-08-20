import { expect, test } from "@playwright/test";
import fs from "node:fs/promises";
import path from "node:path";
import { FIXED_NOW, installUiuxFixtures } from "./fixtures.mjs";

const EVIDENCE_ROOT = path.resolve(process.env.UIUX_EVIDENCE_DIR || "artifacts/uiux/runtime/after");

async function writeResults(results) {
  const reportDirectory = path.join(EVIDENCE_ROOT, "reports");
  await fs.mkdir(reportDirectory, { recursive: true });
  await fs.writeFile(
    path.join(reportDirectory, "interactions.json"),
    JSON.stringify({ viewport: { width: 390, height: 844 }, results }, null, 2),
    "utf8",
  );
}

test.use({ viewport: { width: 390, height: 844 } });

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(FIXED_NOW);
  await installUiuxFixtures(page);
});

test("authentication, workout and settings flows remain usable", async ({ page }) => {
  const results = [];

  await page.goto("/login");
  await page.getByRole("tab", { name: "회원가입 모드 선택" }).click();
  await page.locator("#auth-email").fill("visual@example.com");
  await page.locator("#auth-password").fill("abcdef");
  await page.locator("#auth-password-confirm").fill("abcdeg");
  await page.getByRole("button", { name: "회원가입하고 시작하기" }).click();
  await expect(page.locator("#password-confirm-error")).toContainText("입력한 비밀번호와 일치하지 않습니다.");
  results.push({ flow: "auth-validation", status: "pass" });

  await page.getByRole("button", { name: "비밀번호 표시하기" }).click();
  await expect(page.locator("#auth-password")).toHaveAttribute("type", "text");
  results.push({ flow: "password-toggle", status: "pass" });

  await page.goto("/uiux-visual?tab=home");
  await expect(page.getByRole("button", { name: /운동 기록하기/ }).first()).toBeVisible();
  await page.getByRole("button", { name: /운동 기록하기/ }).first().click();
  await expect(page).toHaveURL(/tab=train/);
  results.push({ flow: "home-to-workout", status: "pass" });

  const search = page.getByLabel("운동 검색");
  await search.fill("스쿼트");
  const squatButton = page.getByRole("button", { name: /스쿼트/ }).first();
  await expect(squatButton).toBeVisible();
  await squatButton.click();

  const exerciseDialog = page.getByRole("dialog", { name: /스쿼트 운동 입력/ });
  await expect(exerciseDialog).toBeVisible();
  await expect(exerciseDialog.getByLabel("세트 수")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(exerciseDialog).toBeHidden();
  results.push({ flow: "workout-search-open-close", status: "pass" });

  await page.goto("/uiux-visual?tab=member");
  await expect(page.getByRole("heading", { name: "운동 설정" })).toBeVisible();
  await page.getByRole("button", { name: /몸 상태 기록/ }).click();
  const settingsDialog = page.getByRole("dialog", { name: "내 정보 설정" });
  await expect(settingsDialog).toBeVisible();
  await page.mouse.click(4, 4);
  await expect(settingsDialog).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(settingsDialog).toBeHidden();
  results.push({ flow: "settings-backdrop-and-escape", status: "pass" });

  await writeResults(results);
});
