import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";

const DEFAULT_SETTINGS = {
  weeklyGoal: 3,
  favoriteExerciseIds: [] as string[],
  gender: "",
  heightCm: null as number | null,
  weightKg: null as number | null,
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

function sanitizeBodyNumber(value: unknown) {
  if (value === "" || value == null) return null;
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) return null;
  return Math.round(number * 10) / 10;
}

function mapSettings(row: any) {
  return {
    weeklyGoal: clampWeeklyGoal(row?.weekly_goal),
    favoriteExerciseIds: sanitizeExerciseIds(row?.favorite_exercise_ids),
    gender: sanitizeGender(row?.gender),
    heightCm: sanitizeBodyNumber(row?.height_cm),
    weightKg: sanitizeBodyNumber(row?.weight_kg),
  };
}

function isMissingTable(error: any) {
  return error?.code === "42P01" || String(error?.message || "").includes("fit_user_settings");
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("user_id") || "";
  if (!userId) return NextResponse.json({ error: "user_id required" }, { status: 400 });

  const sb = getServiceClient();
  const { data, error } = await sb
    .from("fit_user_settings")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    if (isMissingTable(error)) return NextResponse.json({ settings: DEFAULT_SETTINGS, setupRequired: true });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ settings: data ? mapSettings(data) : DEFAULT_SETTINGS });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const userId = String(body.user_id || "");
  if (!userId) return NextResponse.json({ error: "user_id required" }, { status: 400 });

  const payload = {
    user_id: userId,
    weekly_goal: clampWeeklyGoal(body.weeklyGoal ?? body.weekly_goal),
    favorite_exercise_ids: sanitizeExerciseIds(body.favoriteExerciseIds ?? body.favorite_exercise_ids),
    gender: sanitizeGender(body.gender),
    height_cm: sanitizeBodyNumber(body.heightCm ?? body.height_cm),
    weight_kg: sanitizeBodyNumber(body.weightKg ?? body.weight_kg),
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
      return NextResponse.json({ error: "fit_user_settings table is missing. Run supabase/migration-fit-log.sql first." }, { status: 500 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ settings: mapSettings(data) });
}
