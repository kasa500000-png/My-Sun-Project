import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase";
import { createSupabaseServer } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const DEFAULT_SETTINGS = {
  weeklyGoal: 3,
  favoriteExerciseIds: [] as string[],
  gender: "",
  age: null as number | null,
  heightCm: null as number | null,
  weightKg: null as number | null,
  activityLevel: "",
};

type SettingsRow = {
  weekly_goal: number | string | null;
  favorite_exercise_ids: unknown;
  gender: string | null;
  age: number | string | null;
  height_cm: number | string | null;
  weight_kg: number | string | null;
  activity_level: string | null;
};

function clampWeeklyGoal(value: unknown) {
  const goal = Math.floor(Number(value) || DEFAULT_SETTINGS.weeklyGoal);
  return Math.min(Math.max(goal, 1), 14);
}

function sanitizeExerciseIds(value: unknown) {
  if (!Array.isArray(value)) return [];
  return Array.from(new Set(value.map(String).map(item => item.trim()).filter(Boolean))).slice(0, 100);
}

function sanitizeGender(value: unknown) {
  const gender = String(value || "");
  return ["female", "male", "other", ""].includes(gender) ? gender : "";
}

function sanitizeAge(value: unknown) {
  if (value === "" || value == null) return null;
  const number = Math.floor(Number(value));
  if (!Number.isFinite(number)) return null;
  return number >= 10 && number <= 100 ? number : null;
}

function sanitizeActivityLevel(value: unknown) {
  const activity = String(value || "");
  return ["sedentary", "light", "moderate", "active", ""].includes(activity) ? activity : "";
}

function sanitizeBodyNumber(value: unknown) {
  if (value === "" || value == null) return null;
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) return null;
  return Math.round(number * 10) / 10;
}

function sanitizeHeight(value: unknown) {
  const number = sanitizeBodyNumber(value);
  if (number == null) return null;
  return number >= 80 && number <= 230 ? number : null;
}

function sanitizeWeight(value: unknown) {
  const number = sanitizeBodyNumber(value);
  if (number == null) return null;
  return number >= 20 && number <= 250 ? number : null;
}

function mapSettings(row: SettingsRow | null) {
  return {
    weeklyGoal: clampWeeklyGoal(row?.weekly_goal),
    favoriteExerciseIds: sanitizeExerciseIds(row?.favorite_exercise_ids),
    gender: sanitizeGender(row?.gender),
    age: sanitizeAge(row?.age),
    heightCm: sanitizeHeight(row?.height_cm),
    weightKg: sanitizeWeight(row?.weight_kg),
    activityLevel: sanitizeActivityLevel(row?.activity_level),
  };
}

function isMissingTable(error: unknown) {
  if (typeof error !== "object" || error === null) return false;
  const code = "code" in error ? error.code : "";
  const message = "message" in error ? error.message : "";
  return code === "42P01" || String(message || "").includes("fit_user_settings");
}

function userError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

function serverError(error: unknown, fallback: string) {
  console.error("[fit-settings]", error);
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
    .from("fit_user_settings")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    if (isMissingTable(error)) return NextResponse.json({ settings: DEFAULT_SETTINGS, setupRequired: true });
    return serverError(error, "내 정보 설정을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.");
  }

  return NextResponse.json({ settings: data ? mapSettings(data) : DEFAULT_SETTINGS });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const userId = await currentUserId();
  if (!userId) return userError("로그인 정보를 확인할 수 없습니다. 다시 로그인해 주세요.", 401);

  const payload = {
    user_id: userId,
    weekly_goal: clampWeeklyGoal(body.weeklyGoal ?? body.weekly_goal),
    favorite_exercise_ids: sanitizeExerciseIds(body.favoriteExerciseIds ?? body.favorite_exercise_ids),
    gender: sanitizeGender(body.gender),
    age: sanitizeAge(body.age),
    height_cm: sanitizeHeight(body.heightCm ?? body.height_cm),
    weight_kg: sanitizeWeight(body.weightKg ?? body.weight_kg),
    activity_level: sanitizeActivityLevel(body.activityLevel ?? body.activity_level),
    updated_at: new Date().toISOString(),
  };

  const sb = getServiceClient();
  const { data, error } = await sb
    .from("fit_user_settings")
    .upsert(payload, { onConflict: "user_id" })
    .select("*")
    .single();

  if (error) {
    if (isMissingTable(error)) {
      return userError("내 정보 저장 테이블이 아직 준비되지 않았어요. 관리자에게 설정 확인을 요청해 주세요.", 500);
    }
    return serverError(error, "내 정보 설정 저장에 실패했어요. 잠시 후 다시 시도해 주세요.");
  }

  return NextResponse.json({ settings: mapSettings(data) });
}
