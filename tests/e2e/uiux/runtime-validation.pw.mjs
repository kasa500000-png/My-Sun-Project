import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import fs from "node:fs/promises";
import path from "node:path";

const MODE = process.env.UIUX_MODE || "after";
const IS_AFTER = MODE === "after";
const FIXED_NOW = new Date("2026-08-20T06:00:00.000Z");
const EVIDENCE_ROOT = path.resolve(process.env.UIUX_EVIDENCE_DIR || `artifacts/uiux/runtime/${MODE}`);

const VIEWPORTS = [
  { id: "mobile-360", width: 360, height: 800 },
  { id: "mobile-390", width: 390, height: 844 },
  { id: "mobile-412", width: 412, height: 915 },
  { id: "tablet-768", width: 768, height: 1024 },
  { id: "desktop-1280", width: 1280, height: 800 },
  { id: "desktop-1440", width: 1440, height: 900 },
];

const SESSIONS = [
  {
    id: "10000000-0000-4000-8000-000000000001",
    date: "2026-08-20",
    routineName: "Push",
    durationMinutes: 62,
    memo: "마지막 세트까지 자세를 안정적으로 유지했습니다.",
    sets: [
      { id: "20000000-0000-4000-8000-000000000001", exerciseId: "bench-press", setNumber: 1, weight: 60, reps: 10 },
      { id: "20000000-0000-4000-8000-000000000002", exerciseId: "bench-press", setNumber: 2, weight: 65, reps: 8 },
      { id: "20000000-0000-4000-8000-000000000003", exerciseId: "bench-press", setNumber: 3, weight: 65, reps: 8 },
    ],
  },
  {
    id: "10000000-0000-4000-8000-000000000002",
    date: "2026-08-18",
    routineName: "Pull",
    durationMinutes: 55,
    memo: "광배근 수축을 천천히 확인했습니다.",
    sets: [
      { id: "20000000-0000-4000-8000-000000000004", exerciseId: "lat-pulldown", setNumber: 1, weight: 45, reps: 12 },
      { id: "20000000-0000-4000-8000-000000000005", exerciseId: "lat-pulldown", setNumber: 2, weight: 50, reps: 10 },
      { id: "20000000-0000-4000-8000-000000000006", exerciseId: "lat-pulldown", setNumber: 3, weight: 50, reps: 10 },
    ],
  },
  {
    id: "10000000-0000-4000-8000-000000000003",
    date: "2026-08-16",
    routineName: "하체",
    durationMinutes: 68,
    memo: "무릎 정렬과 호흡을 우선했습니다.",
    sets: [
      { id: "20000000-0000-4000-8000-000000000007", exerciseId: "squat", setNumber: 1, weight: 70, reps: 10 },
      { id: "20000000-0000-4000-8000-000000000008", exerciseId: "squat", setNumber: 2, weight: 80, reps: 8 },
      { id: "20000000-0000-4000-8000-000000000009", exerciseId: "squat", setNumber: 3, weight: 80, reps: 8 },
    ],
  },
];

const SETTINGS = {
  weeklyGoal: 4,
  favoriteExerciseIds: ["bench-press", "lat-pulldown", "squat"],
  gender: "male",
  age: 34,
  heightCm: 178,
  weightKg: 76.5,
  activityLevel: "active",
};

const MEALS = [
  {
    id: "30000000-0000-4000-8000-000000000001",
    date: "2026-08-20",
    slot: "breakfast",
    entryName: "출근 전 아침",
    feedback: "단백질과 탄수화물을 함께 섭취했습니다.",
    foods: [
      { id: "food-1", name: "그릭요거트", portion: "150g", calories: 140, carbs: 12, protein: 14, fat: 4 },
      { id: "food-2", name: "바나나", portion: "1개", calories: 105, carbs: 27, protein: 1, fat: 0 },
    ],
  },
  {
    id: "30000000-0000-4000-8000-000000000002",
    date: "2026-08-20",
    slot: "lunch",
    entryName: "점심 도시락",
    foods: [
      { id: "food-3", name: "현미밥", portion: "180g", calories: 285, carbs: 61, protein: 6, fat: 2 },
      { id: "food-4", name: "닭가슴살", portion: "150g", calories: 248, carbs: 0, protein: 46, fat: 5 },
      { id: "food-5", name: "구운 채소", portion: "1접시", calories: 90, carbs: 16, protein: 4, fat: 2 },
    ],
  },
  {
    id: "30000000-0000-4000-8000-000000000003",
    date: "2026-08-20",
    slot: "snack",
    entryName: "운동 전 간식",
    foods: [
      { id: "food-6", name: "프로틴 음료", portion: "1병", calories: 180, carbs: 12, protein: 25, fat: 4 },
    ],
  },
];

const GOAL = {
  goalType: "maintain",
  targetCalories: 2200,
  targetProtein: 135,
  targetCarbsMin: 240,
  targetCarbsMax: 300,
  targetFatMin: 55,
  targetFatMax: 75,
};

function json(route, body, status = 200) {
  return route.fulfill({
    status,
    contentType: "application/json; charset=utf-8",
    body: JSON.stringify(body),
  });
}

async function installFixtures(page) {
  await page.route("https://example.supabase.co/**", route => json(route, { user: null }));
  await page.route("**/api/**", route => {
    const request = route.request();
    const url = new URL(request.url());

    if (url.pathname === "/api/fit-log") return json(route, { sessions: SESSIONS });
    if (url.pathname === "/api/fit-settings") return json(route, { settings: SETTINGS });
    if (url.pathname === "/api/diet-goals") return json(route, { goal: GOAL });
    if (url.pathname === "/api/diet-log") {
      const start = url.searchParams.get("start") || "0000-01-01";
      const end = url.searchParams.get("end") || "9999-12-31";
      return json(route, { meals: MEALS.filter(item => item.date >= start && item.date <= end) });
    }
    if (url.pathname === "/api/diet/analyze") {
      return json(route, {
        foods: [{ id: "ai-food-1", name: "닭가슴살 샐러드", portion: "1접시", calories: 390, carbs: 24, protein: 42, fat: 14 }],
        feedback: "사진 분석 결과입니다. 음식명과 분량을 확인한 뒤 저장해 주세요.",
      });
    }
    if (url.pathname === "/api/auth/signup") return json(route, { ok: true });
    return json(route, { ok: true });
  });
}

async function stabilize(page) {
  await page.waitForLoadState("load", { timeout: 5_000 }).catch(() => undefined);
  await page.evaluate(async () => {
    if (!document.fonts?.ready) return;
    await Promise.race([
      document.fonts.ready,
      new Promise(resolve => window.setTimeout(resolve, 800)),
    ]);
  });
  await page.addStyleTag({
    content: `
      html { scroll-behavior: auto !important; }
      *, *::before, *::after {
        animation-duration: 0s !important;
        animation-delay: 0s !important;
        transition-duration: 0s !important;
        caret-color: transparent !important;
      }
    `,
  });
  await page.waitForTimeout(100);
}

async function layoutAudit(page) {
  return page.evaluate(() => {
    const viewportWidth = window.innerWidth;
    const documentWidth = document.documentElement.scrollWidth;
    const smallTargets = Array.from(document.querySelectorAll("button, a[href], input, select, textarea"))
      .filter(element => {
        const style = window.getComputedStyle(element);
        if (style.display === "none" || style.visibility === "hidden") return false;
        const rect = element.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0 && (rect.width < 40 || rect.height < 40);
      })
      .slice(0, 30)
      .map(element => {
        const rect = element.getBoundingClientRect();
        return {
          tag: element.tagName.toLowerCase(),
          name: element.getAttribute("aria-label") || element.textContent?.trim().replace(/\s+/g, " ").slice(0, 80) || "",
          width: Math.round(rect.width),
          height: Math.round(rect.height),
        };
      });

    return {
      viewportWidth,
      documentWidth,
      horizontalOverflow: Math.max(0, documentWidth - viewportWidth),
      smallTargets,
    };
  });
}

const SCREENS = [
  {
    id: "AUTH-01",
    path: "/login",
    afterReady: page => expect(page.getByRole("heading", { name: "다시 만나 반가워요" })).toBeVisible(),
  },
  {
    id: "AUTH-02",
    path: "/login",
    prepare: page => IS_AFTER
      ? page.getByRole("tab", { name: "회원가입 모드 선택" }).click()
      : page.getByRole("button", { name: "회원가입 모드 선택" }).click(),
    afterReady: page => expect(page.getByRole("heading", { name: "기록을 시작해 볼까요?" })).toBeVisible(),
  },
  {
    id: "APP-01",
    path: "/uiux-visual?tab=home",
    afterReady: page => expect(page.getByRole("button", { name: /운동 기록하기/ }).first()).toBeVisible(),
  },
  {
    id: "APP-02",
    path: "/uiux-visual?tab=train",
    afterReady: page => expect(page.getByLabel("운동 검색")).toBeVisible(),
  },
  {
    id: "APP-03",
    path: "/uiux-visual?tab=log",
    afterReady: page => expect(page.getByRole("heading", { name: "기록 모아보기" })).toBeVisible(),
  },
  {
    id: "APP-04",
    path: "/uiux-visual?tab=balance",
    afterReady: page => expect(page.getByRole("heading", { name: "다음 운동을 정해볼까요?" })).toBeVisible(),
  },
  {
    id: "APP-05",
    path: "/uiux-visual?tab=diet",
    afterReady: page => expect(page.getByRole("heading", { name: "오늘 먹은 걸 남겨요" })).toBeVisible(),
  },
  {
    id: "APP-06",
    path: "/uiux-visual?tab=member",
    afterReady: page => expect(page.getByRole("heading", { name: "운동 설정" })).toBeVisible(),
  },
  {
    id: "STATE-01",
    path: "/uiux-visual/loading",
    afterReady: page => expect(page.getByText("기록을 준비하고 있어요")).toBeVisible(),
  },
  {
    id: "STATE-02",
    path: "/uiux-visual/error",
    afterReady: page => expect(page.getByRole("heading", { name: "기록을 불러오는 중 잠시 멈췄어요" })).toBeVisible(),
  },
  {
    id: "STATE-03",
    path: "/uiux-screen-that-does-not-exist",
    afterReady: page => expect(page.getByRole("heading", { name: "요청한 화면을 찾지 못했어요" })).toBeVisible(),
  },
  {
    id: "STATE-04",
    path: "/offline",
    afterReady: page => expect(page.getByRole("heading", { name: "연결이 돌아오면 안전하게 이어갈 수 있어요" })).toBeVisible(),
  },
];

async function capture(page, viewport, screen) {
  const consoleErrors = [];
  const pageErrors = [];
  const onConsole = message => {
    if (message.type() === "error") consoleErrors.push(message.text());
  };
  const onPageError = error => pageErrors.push(error.message);
  page.on("console", onConsole);
  page.on("pageerror", onPageError);

  await page.goto(screen.path, { waitUntil: "domcontentloaded" });
  if (screen.prepare) await screen.prepare(page);
  await stabilize(page);
  if (IS_AFTER && screen.afterReady) await screen.afterReady(page);
  else await expect(page.locator("main").first()).toBeVisible();

  const layout = await layoutAudit(page);
  let axe = null;
  if (viewport.id === "mobile-390") {
    const scan = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
      .analyze();
    axe = scan.violations.map(violation => ({
      id: violation.id,
      impact: violation.impact,
      help: violation.help,
      nodes: violation.nodes.length,
    }));
  }

  const directory = path.join(EVIDENCE_ROOT, screen.id);
  await fs.mkdir(directory, { recursive: true });
  const screenshotPath = path.join(directory, `${viewport.id}.png`);
  await page.screenshot({ path: screenshotPath, fullPage: true, animations: "disabled", caret: "hide" });

  page.off("console", onConsole);
  page.off("pageerror", onPageError);

  const result = {
    id: screen.id,
    path: screen.path,
    screenshot: path.relative(process.cwd(), screenshotPath),
    layout,
    axe,
    consoleErrors: screen.id === "STATE-02" ? [] : consoleErrors,
    pageErrors: screen.id === "STATE-02" ? [] : pageErrors,
  };

  if (IS_AFTER) {
    expect(layout.horizontalOverflow, `${screen.id} horizontal overflow`).toBeLessThanOrEqual(1);
    expect(result.pageErrors, `${screen.id} page errors`).toEqual([]);
    expect(result.consoleErrors, `${screen.id} console errors`).toEqual([]);
    expect((axe || []).filter(item => item.impact === "critical"), `${screen.id} critical axe violations`).toEqual([]);
  }

  return result;
}

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(FIXED_NOW);
  await installFixtures(page);
});

for (const viewport of VIEWPORTS) {
  test.describe(viewport.id, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } });

    test(`capture ${MODE} visual matrix`, async ({ page }) => {
      const results = [];
      for (const screen of SCREENS) results.push(await capture(page, viewport, screen));

      const reportDirectory = path.join(EVIDENCE_ROOT, "reports");
      await fs.mkdir(reportDirectory, { recursive: true });
      await fs.writeFile(
        path.join(reportDirectory, `${viewport.id}.json`),
        JSON.stringify({ mode: MODE, viewport, results }, null, 2),
        "utf8",
      );
    });
  });
}

test.describe("representative improved interactions", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test(`validate ${MODE} keyboard, form and modal flows`, async ({ page }) => {
    test.skip(!IS_AFTER, "Baseline is captured visually; strict interactions apply to the improved app.");
    const results = [];

    await page.goto("/login");
    await page.getByRole("tab", { name: "회원가입 모드 선택" }).click();
    await page.getByLabel("이메일").fill("visual@example.com");
    await page.getByLabel("비밀번호", { exact: true }).fill("abcdef");
    await page.getByLabel("비밀번호 확인").fill("abcdeg");
    await page.getByRole("button", { name: "회원가입하고 시작하기" }).click();
    await expect(page.getByRole("alert")).toContainText("입력한 비밀번호와 일치하지 않습니다.");
    results.push({ flow: "auth-validation", status: "pass" });

    await page.getByRole("button", { name: "비밀번호 표시하기" }).click();
    await expect(page.getByLabel("비밀번호", { exact: true })).toHaveAttribute("type", "text");
    results.push({ flow: "password-toggle", status: "pass" });

    await page.goto("/uiux-visual?tab=home");
    await stabilize(page);
    await page.getByRole("button", { name: /운동 기록하기/ }).first().click();
    await expect(page).toHaveURL(/tab=train/);
    await page.getByLabel("운동 검색").fill("벤치프레스");
    await page.getByRole("button", { name: /벤치프레스/ }).first().click();
    const exerciseDialog = page.getByRole("dialog", { name: "벤치프레스 운동 입력" });
    await expect(exerciseDialog).toBeVisible();
    await expect(exerciseDialog.getByLabel("세트 수")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(exerciseDialog).toBeHidden();
    results.push({ flow: "home-to-workout-search-modal", status: "pass" });

    await page.goto("/uiux-visual?tab=member");
    await stabilize(page);
    await page.getByRole("button", { name: /몸 상태 기록/ }).click();
    const settingsDialog = page.getByRole("dialog", { name: "내 정보 설정" });
    await expect(settingsDialog).toBeVisible();
    await page.mouse.click(4, 4);
    await expect(settingsDialog).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(settingsDialog).toBeHidden();
    results.push({ flow: "settings-backdrop-protection", status: "pass" });

    const reportDirectory = path.join(EVIDENCE_ROOT, "reports");
    await fs.mkdir(reportDirectory, { recursive: true });
    await fs.writeFile(
      path.join(reportDirectory, "interactions.json"),
      JSON.stringify({ mode: MODE, viewport: { width: 390, height: 844 }, results }, null, 2),
      "utf8",
    );
  });
});
