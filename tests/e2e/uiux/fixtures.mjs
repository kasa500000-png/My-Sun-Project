export const FIXED_NOW = new Date("2026-08-20T06:00:00.000Z");

export const SESSIONS = [
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

export const SETTINGS = {
  weeklyGoal: 4,
  favoriteExerciseIds: ["bench-press", "lat-pulldown", "squat"],
  gender: "male",
  age: 34,
  heightCm: 178,
  weightKg: 76.5,
  activityLevel: "active",
};

export const MEALS = [
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

export const GOAL = {
  goalType: "maintain",
  targetCalories: 2200,
  targetProtein: 135,
  targetCarbsMin: 240,
  targetCarbsMax: 300,
  targetFatMin: 55,
  targetFatMax: 75,
};

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function json(route, body, status = 200) {
  return route.fulfill({
    status,
    contentType: "application/json; charset=utf-8",
    body: JSON.stringify(body),
  });
}

export async function installUiuxFixtures(page) {
  const state = {
    sessions: clone(SESSIONS),
    settings: clone(SETTINGS),
    meals: clone(MEALS),
    goal: clone(GOAL),
  };

  await page.route("https://example.supabase.co/**", route => json(route, { user: null }));
  await page.route("**/api/**", async route => {
    const request = route.request();
    const url = new URL(request.url());
    const method = request.method();

    if (url.pathname === "/api/fit-log") {
      if (method === "GET") return json(route, { sessions: state.sessions });
      if (method === "DELETE") {
        const id = url.searchParams.get("id");
        state.sessions = state.sessions.filter(item => item.id !== id);
        return json(route, { ok: true });
      }
      const payload = request.postDataJSON?.() || JSON.parse(request.postData() || "{}");
      const session = {
        ...payload,
        id: payload.id || "10000000-0000-4000-8000-000000000099",
        sets: (payload.sets || []).map((set, index) => ({
          ...set,
          id: set.id || `20000000-0000-4000-8000-${String(90 + index).padStart(12, "0")}`,
        })),
      };
      state.sessions = method === "PUT"
        ? state.sessions.map(item => item.id === session.id ? session : item)
        : [session, ...state.sessions];
      return json(route, { session });
    }

    if (url.pathname === "/api/fit-settings") {
      if (method === "GET") return json(route, { settings: state.settings });
      const payload = request.postDataJSON?.() || JSON.parse(request.postData() || "{}");
      state.settings = { ...state.settings, ...payload };
      return json(route, { settings: state.settings });
    }

    if (url.pathname === "/api/diet-goals") {
      if (method === "GET") return json(route, { goal: state.goal });
      const payload = request.postDataJSON?.() || JSON.parse(request.postData() || "{}");
      state.goal = { ...state.goal, ...payload };
      return json(route, { goal: state.goal });
    }

    if (url.pathname === "/api/diet-log") {
      if (method === "GET") {
        const start = url.searchParams.get("start") || "0000-01-01";
        const end = url.searchParams.get("end") || "9999-12-31";
        return json(route, { meals: state.meals.filter(item => item.date >= start && item.date <= end) });
      }
      if (method === "DELETE") {
        const id = url.searchParams.get("id");
        const date = url.searchParams.get("date");
        const slot = url.searchParams.get("slot");
        state.meals = state.meals.filter(item => id ? item.id !== id : !(item.date === date && item.slot === slot));
        return json(route, { ok: true });
      }
      const payload = request.postDataJSON?.() || JSON.parse(request.postData() || "{}");
      const meal = { ...payload, id: payload.id || "30000000-0000-4000-8000-000000000099" };
      state.meals = [meal, ...state.meals.filter(item => item.id !== meal.id)];
      return json(route, { meal });
    }

    if (url.pathname === "/api/diet/analyze") {
      return json(route, {
        foods: [
          { id: "ai-food-1", name: "닭가슴살 샐러드", portion: "1접시", calories: 390, carbs: 24, protein: 42, fat: 14 },
        ],
        feedback: "사진 분석 결과입니다. 음식명과 분량을 확인한 뒤 저장해 주세요.",
      });
    }

    if (url.pathname === "/api/auth/signup") return json(route, { ok: true });
    return json(route, { ok: true });
  });

  return state;
}
