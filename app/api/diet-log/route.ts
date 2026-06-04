import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase";
import { createSupabaseServer } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type FoodPayload = {
  id?: string;
  name?: string;
  portion?: string;
  calories?: number | string | null;
  carbs?: number | string | null;
  protein?: number | string | null;
  fat?: number | string | null;
};

type FoodRow = {
  id: string;
  name: string | null;
  portion: string | null;
  calories: number | string | null;
  carbs: number | string | null;
  protein: number | string | null;
  fat: number | string | null;
  sort_order: number | string | null;
};

type MealRow = {
  id: string;
  meal_date: string | null;
  meal_slot: string | null;
  entry_name: string | null;
  image_url: string | null;
  ai_feedback: string | null;
  fit_diet_food_items?: FoodRow[] | null;
};

const MEAL_SLOTS = new Set(["morning", "lunch", "afternoon", "snack"]);
const MAX_FOODS_PER_MEAL = 30;
const MAX_IMAGE_URL_LENGTH = 1_000_000;

function todayKst() {
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return kst.toISOString().slice(0, 10);
}

function asText(value: unknown, max = 1000) {
  if (value == null) return null;
  const text = String(value).trim();
  return text ? text.slice(0, max) : null;
}

function asDate(value: unknown, fallback = todayKst()) {
  const text = asText(value, 10);
  return text && /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : fallback;
}

function asMealSlot(value: unknown) {
  const text = asText(value, 20) || "";
  return MEAL_SLOTS.has(text) ? text : "";
}

function asNumber(value: unknown, max = 100000) {
  if (value === "" || value == null) return 0;
  const number = Number(value);
  return Number.isFinite(number) ? Math.min(Math.max(Math.round(number), 0), max) : 0;
}

function asFoods(value: unknown) {
  return (Array.isArray(value) ? value as FoodPayload[] : []).slice(0, MAX_FOODS_PER_MEAL);
}

function asImageUrl(value: unknown) {
  const text = asText(value, MAX_IMAGE_URL_LENGTH);
  if (!text) return null;
  if (text.startsWith("data:image/")) return text;
  if (text.startsWith("https://")) return text;
  return null;
}

function mapMeal(row: MealRow) {
  return {
    id: row.id,
    date: asDate(row.meal_date),
    slot: row.meal_slot || "lunch",
    entryName: row.entry_name || undefined,
    imageUrl: row.image_url || undefined,
    feedback: row.ai_feedback || undefined,
    foods: (row.fit_diet_food_items || [])
      .slice()
      .sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0))
      .map(food => ({
        id: food.id,
        name: food.name || "음식",
        portion: food.portion || "1인분",
        calories: Number(food.calories || 0),
        carbs: Number(food.carbs || 0),
        protein: Number(food.protein || 0),
        fat: Number(food.fat || 0),
      })),
  };
}

function userError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

function serverError(error: unknown, fallback: string) {
  console.error("[diet-log]", error);
  return NextResponse.json({ error: fallback }, { status: 500 });
}

function isMissingTable(error: unknown) {
  if (typeof error !== "object" || error === null) return false;
  const code = "code" in error ? error.code : "";
  const message = "message" in error ? error.message : "";
  return code === "42P01" || String(message || "").includes("fit_diet_");
}

async function currentUserId() {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id || null;
}

export async function GET(req: NextRequest) {
  const userId = await currentUserId();
  if (!userId) return userError("로그인 정보를 확인할 수 없습니다. 다시 로그인해 주세요.", 401);

  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date");
  const start = searchParams.get("start");
  const end = searchParams.get("end");

  const fromDate = asDate(start || date);
  const toDate = asDate(end || date || start || fromDate, fromDate);

  const sb = getServiceClient();
  const { data, error } = await sb
    .from("fit_diet_meal_logs")
    .select("*, fit_diet_food_items(*)")
    .eq("user_id", userId)
    .gte("meal_date", fromDate)
    .lte("meal_date", toDate)
    .order("meal_date", { ascending: false })
    .order("created_at", { ascending: true })
    .limit(500);

  if (error) {
    if (isMissingTable(error)) return NextResponse.json({ meals: [], setupRequired: true });
    return serverError(error, "식단 기록을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.");
  }

  return NextResponse.json({ meals: (data || []).map(mapMeal) });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const userId = await currentUserId();
  if (!userId) return userError("로그인 정보를 확인할 수 없습니다. 다시 로그인해 주세요.", 401);

  const date = asDate(body.date);
  const slot = asMealSlot(body.slot);
  const foods = asFoods(body.foods);
  if (!slot) return userError("식사 구분을 확인할 수 없습니다.");
  if (foods.length === 0) return userError("저장할 음식 정보를 하나 이상 입력해 주세요.");

  const sb = getServiceClient();
  const mealPayload = {
    user_id: userId,
    meal_date: date,
    meal_slot: slot,
    entry_name: asText(body.entryName, 120),
    image_url: asImageUrl(body.imageUrl),
    ai_feedback: asText(body.feedback, 1000),
    updated_at: new Date().toISOString(),
  };

  const requestedId = asText(body.id, 64);
  let meal: MealRow | null = null;
  let mealError: unknown = null;

  if (requestedId) {
    const result = await sb
      .from("fit_diet_meal_logs")
      .update(mealPayload)
      .eq("id", requestedId)
      .eq("user_id", userId)
      .select("*")
      .single();
    meal = result.data as MealRow | null;
    mealError = result.error;
  } else if (slot !== "snack") {
    const existing = await sb
      .from("fit_diet_meal_logs")
      .select("id")
      .eq("user_id", userId)
      .eq("meal_date", date)
      .eq("meal_slot", slot)
      .maybeSingle();

    if (existing.error) {
      mealError = existing.error;
    } else if (existing.data?.id) {
      const result = await sb
        .from("fit_diet_meal_logs")
        .update(mealPayload)
        .eq("id", existing.data.id)
        .eq("user_id", userId)
        .select("*")
        .single();
      meal = result.data as MealRow | null;
      mealError = result.error;
    } else {
      const result = await sb
        .from("fit_diet_meal_logs")
        .insert(mealPayload)
        .select("*")
        .single();
      meal = result.data as MealRow | null;
      mealError = result.error;
    }
  } else {
    const result = await sb
      .from("fit_diet_meal_logs")
      .insert(mealPayload)
      .select("*")
      .single();
    meal = result.data as MealRow | null;
    mealError = result.error;
  }

  if (mealError) {
    if (isMissingTable(mealError)) return userError("식단 저장 테이블이 아직 준비되지 않았습니다. Supabase SQL을 먼저 실행해 주세요.", 500);
    return serverError(mealError, "식단 기록 저장에 실패했습니다. 잠시 후 다시 시도해 주세요.");
  }
  if (!meal) return userError("저장할 식단 기록을 확인하지 못했습니다.", 500);

  const { error: deleteError } = await sb
    .from("fit_diet_food_items")
    .delete()
    .eq("meal_log_id", meal.id)
    .eq("user_id", userId);

  if (deleteError) return serverError(deleteError, "기존 식단 항목을 정리하지 못했습니다. 잠시 후 다시 시도해 주세요.");

  const foodPayload = foods.map((food, index) => ({
    meal_log_id: meal.id,
    user_id: userId,
    name: asText(food.name, 120) || "음식",
    portion: asText(food.portion, 80) || "1인분",
    calories: asNumber(food.calories, 10000),
    carbs: asNumber(food.carbs, 2000),
    protein: asNumber(food.protein, 2000),
    fat: asNumber(food.fat, 2000),
    sort_order: index + 1,
  }));

  const { error: foodError } = await sb.from("fit_diet_food_items").insert(foodPayload);
  if (foodError) return serverError(foodError, "식단 음식 항목 저장에 실패했습니다. 입력 내용을 확인해 주세요.");

  const { data, error } = await sb
    .from("fit_diet_meal_logs")
    .select("*, fit_diet_food_items(*)")
    .eq("id", meal.id)
    .eq("user_id", userId)
    .single();

  if (error) return serverError(error, "저장된 식단 기록을 다시 불러오지 못했습니다. 새로고침 후 확인해 주세요.");
  return NextResponse.json({ meal: mapMeal(data) });
}

export async function DELETE(req: NextRequest) {
  const userId = await currentUserId();
  if (!userId) return userError("로그인 정보를 확인할 수 없습니다. 다시 로그인해 주세요.", 401);

  const { searchParams } = new URL(req.url);
  const id = asText(searchParams.get("id"), 64);
  const date = asDate(searchParams.get("date"));
  const slot = asMealSlot(searchParams.get("slot"));

  const sb = getServiceClient();
  let query = sb.from("fit_diet_meal_logs").delete().eq("user_id", userId).select("id");
  if (id) query = query.eq("id", id);
  else if (slot) query = query.eq("meal_date", date).eq("meal_slot", slot);
  else return userError("삭제할 식단 기록 정보를 확인할 수 없습니다.");

  const { data, error } = await query.maybeSingle();
  if (error) return serverError(error, "식단 기록 삭제에 실패했습니다. 잠시 후 다시 시도해 주세요.");
  if (!data) return userError("삭제할 식단 기록을 찾을 수 없습니다.", 404);

  return NextResponse.json({ ok: true });
}
