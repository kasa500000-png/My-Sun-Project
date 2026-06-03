import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase";
import { createSupabaseServer } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type GoalRow = {
  goal_type: string | null;
  target_calories: number | string | null;
  target_protein: number | string | null;
  target_carbs_min: number | string | null;
  target_carbs_max: number | string | null;
  target_fat_min: number | string | null;
  target_fat_max: number | string | null;
};

const DEFAULT_GOAL = {
  goalType: "healthy",
  targetCalories: null as number | null,
  targetProtein: null as number | null,
  targetCarbsMin: null as number | null,
  targetCarbsMax: null as number | null,
  targetFatMin: null as number | null,
  targetFatMax: null as number | null,
};

const GOAL_TYPES = new Set(["fat_loss", "maintain", "muscle_gain", "bulk", "healthy"]);

function sanitizeGoalType(value: unknown) {
  const text = String(value || "healthy");
  return GOAL_TYPES.has(text) ? text : "healthy";
}

function sanitizeNumber(value: unknown, min: number, max: number) {
  if (value === "" || value == null) return null;
  const number = Number(value);
  if (!Number.isFinite(number)) return null;
  return Math.min(Math.max(Math.round(number), min), max);
}

function mapGoal(row: GoalRow | null) {
  return {
    goalType: sanitizeGoalType(row?.goal_type),
    targetCalories: sanitizeNumber(row?.target_calories, 800, 6000),
    targetProtein: sanitizeNumber(row?.target_protein, 0, 400),
    targetCarbsMin: sanitizeNumber(row?.target_carbs_min, 0, 800),
    targetCarbsMax: sanitizeNumber(row?.target_carbs_max, 0, 800),
    targetFatMin: sanitizeNumber(row?.target_fat_min, 0, 300),
    targetFatMax: sanitizeNumber(row?.target_fat_max, 0, 300),
  };
}

function isMissingTable(error: unknown) {
  if (typeof error !== "object" || error === null) return false;
  const code = "code" in error ? error.code : "";
  const message = "message" in error ? error.message : "";
  return code === "42P01" || String(message || "").includes("fit_nutrition_goals");
}

function userError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

function serverError(error: unknown, fallback: string) {
  console.error("[diet-goals]", error);
  return NextResponse.json({ error: fallback }, { status: 500 });
}

async function currentUserId() {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id || null;
}

export async function GET() {
  const userId = await currentUserId();
  if (!userId) return userError("로그인 정보를 확인할 수 없습니다. 다시 로그인해 주세요.", 401);

  const sb = getServiceClient();
  const { data, error } = await sb
    .from("fit_nutrition_goals")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    if (isMissingTable(error)) return NextResponse.json({ goal: DEFAULT_GOAL, setupRequired: true });
    return serverError(error, "식단 목표를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.");
  }

  return NextResponse.json({ goal: data ? mapGoal(data) : DEFAULT_GOAL });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const userId = await currentUserId();
  if (!userId) return userError("로그인 정보를 확인할 수 없습니다. 다시 로그인해 주세요.", 401);

  const targetCalories = sanitizeNumber(body.targetCalories ?? body.target_calories, 800, 6000);
  const targetProtein = sanitizeNumber(body.targetProtein ?? body.target_protein, 0, 400);
  if (targetCalories == null) return userError("목표 칼로리는 800~6000kcal 범위로 입력해 주세요.");
  if (targetProtein == null) return userError("목표 단백질은 0~400g 범위로 입력해 주세요.");

  const payload = {
    user_id: userId,
    goal_type: sanitizeGoalType(body.goalType ?? body.goal_type),
    target_calories: targetCalories,
    target_protein: targetProtein,
    target_carbs_min: sanitizeNumber(body.targetCarbsMin ?? body.target_carbs_min, 0, 800),
    target_carbs_max: sanitizeNumber(body.targetCarbsMax ?? body.target_carbs_max, 0, 800),
    target_fat_min: sanitizeNumber(body.targetFatMin ?? body.target_fat_min, 0, 300),
    target_fat_max: sanitizeNumber(body.targetFatMax ?? body.target_fat_max, 0, 300),
    updated_at: new Date().toISOString(),
  };

  const sb = getServiceClient();
  const { data, error } = await sb
    .from("fit_nutrition_goals")
    .upsert(payload, { onConflict: "user_id" })
    .select("*")
    .single();

  if (error) {
    if (isMissingTable(error)) return userError("식단 목표 테이블이 아직 준비되지 않았습니다. Supabase SQL을 먼저 실행해 주세요.", 500);
    return serverError(error, "식단 목표 저장에 실패했습니다. 잠시 후 다시 시도해 주세요.");
  }

  return NextResponse.json({ goal: mapGoal(data) });
}
