import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase";
import { createSupabaseServer } from "@/lib/supabase-server";
import {
  DietImageInputError,
  prepareDietImage,
  removeDietImage,
  signedDietImageUrls,
  type StoredDietImageState,
} from "@/lib/diet-image-storage";

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
  image_path: string | null;
  ai_feedback: string | null;
  fit_diet_food_items?: FoodRow[] | null;
};

type ExistingMealRow = Pick<MealRow, "id" | "image_url" | "image_path">;

const MEAL_SLOTS = new Set(["morning", "lunch", "afternoon", "snack"]);
const MAX_FOODS_PER_MEAL = 30;

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

function mapMeal(row: MealRow, signedImageUrl?: string) {
  return {
    id: row.id,
    date: asDate(row.meal_date),
    slot: row.meal_slot || "lunch",
    entryName: row.entry_name || undefined,
    imageUrl: signedImageUrl || row.image_url || undefined,
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
  return NextResponse.json({ error: message }, { status, headers: { "Cache-Control": "no-store" } });
}

function serverError(error: unknown, fallback: string) {
  console.error("[diet-log]", error);
  return NextResponse.json({ error: fallback }, { status: 500, headers: { "Cache-Control": "no-store" } });
}

function isMissingTable(error: unknown) {
  if (typeof error !== "object" || error === null) return false;
  const code = "code" in error ? error.code : "";
  const message = "message" in error ? error.message : "";
  return code === "42P01" || code === "42703" || String(message || "").includes("fit_diet_");
}

async function currentUserId() {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id || null;
}

function existingImageState(row: ExistingMealRow | null): StoredDietImageState {
  return {
    imagePath: row?.image_path || null,
    legacyImageUrl: row?.image_url || null,
  };
}

async function mealResponse(sb: ReturnType<typeof getServiceClient>, row: MealRow) {
  const signed = await signedDietImageUrls(sb, [row]);
  return mapMeal(row, row.image_path ? signed.get(row.image_path) : undefined);
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

  const rows = (data || []) as MealRow[];
  const signed = await signedDietImageUrls(sb, rows);
  return NextResponse.json(
    { meals: rows.map(row => mapMeal(row, row.image_path ? signed.get(row.image_path) : undefined)) },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({})) as Record<string, unknown>;
  const userId = await currentUserId();
  if (!userId) return userError("로그인 정보를 확인할 수 없습니다. 다시 로그인해 주세요.", 401);

  const date = asDate(body.date);
  const slot = asMealSlot(body.slot);
  const foods = asFoods(body.foods);
  if (!slot) return userError("식사 구분을 확인할 수 없습니다.");
  if (foods.length === 0) return userError("저장할 음식 정보를 하나 이상 입력해 주세요.");

  const sb = getServiceClient();
  const requestedId = asText(body.id, 64);
  let existing: ExistingMealRow | null = null;
  let existingError: unknown = null;

  if (requestedId) {
    const result = await sb
      .from("fit_diet_meal_logs")
      .select("id, image_url, image_path")
      .eq("id", requestedId)
      .eq("user_id", userId)
      .maybeSingle();
    existing = result.data as ExistingMealRow | null;
    existingError = result.error;
  } else if (slot !== "snack") {
    const result = await sb
      .from("fit_diet_meal_logs")
      .select("id, image_url, image_path")
      .eq("user_id", userId)
      .eq("meal_date", date)
      .eq("meal_slot", slot)
      .maybeSingle();
    existing = result.data as ExistingMealRow | null;
    existingError = result.error;
  }

  if (existingError) {
    if (isMissingTable(existingError)) return userError("식단 저장 테이블이 아직 준비되지 않았습니다. Supabase SQL을 먼저 실행해 주세요.", 500);
    return serverError(existingError, "기존 식단 기록을 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.");
  }
  if (requestedId && !existing) return userError("수정할 식단 기록을 찾을 수 없습니다.", 404);

  let preparedImage;
  try {
    preparedImage = await prepareDietImage(sb, userId, date, body.imageUrl, existingImageState(existing));
  } catch (error) {
    if (error instanceof DietImageInputError) return userError(error.message, error.status);
    return serverError(error, error instanceof Error ? error.message : "식단 사진 저장에 실패했습니다.");
  }

  const mealPayload = {
    user_id: userId,
    meal_date: date,
    meal_slot: slot,
    entry_name: asText(body.entryName, 120),
    image_url: preparedImage.legacyImageUrl,
    image_path: preparedImage.imagePath,
    ai_feedback: asText(body.feedback, 1000),
    updated_at: new Date().toISOString(),
  };

  let meal: MealRow | null = null;
  let mealError: unknown = null;

  if (existing) {
    const result = await sb
      .from("fit_diet_meal_logs")
      .update(mealPayload)
      .eq("id", existing.id)
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

  if (mealError || !meal) {
    await removeDietImage(sb, preparedImage.uploadedPath);
    if (isMissingTable(mealError)) return userError("식단 저장 테이블이 아직 준비되지 않았습니다. Supabase SQL을 먼저 실행해 주세요.", 500);
    return serverError(mealError, "식단 기록 저장에 실패했습니다. 잠시 후 다시 시도해 주세요.");
  }

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

  await removeDietImage(sb, preparedImage.oldPathToDelete);
  return NextResponse.json(
    { meal: await mealResponse(sb, data as MealRow) },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function DELETE(req: NextRequest) {
  const userId = await currentUserId();
  if (!userId) return userError("로그인 정보를 확인할 수 없습니다. 다시 로그인해 주세요.", 401);

  const { searchParams } = new URL(req.url);
  const id = asText(searchParams.get("id"), 64);
  const date = asDate(searchParams.get("date"));
  const slot = asMealSlot(searchParams.get("slot"));
  if (!id && slot === "snack") return userError("간식 기록은 삭제할 항목 ID가 필요합니다.");

  const sb = getServiceClient();
  let lookup = sb.from("fit_diet_meal_logs").select("id, image_url, image_path").eq("user_id", userId);
  if (id) lookup = lookup.eq("id", id);
  else if (slot) lookup = lookup.eq("meal_date", date).eq("meal_slot", slot);
  else return userError("삭제할 식단 기록 정보를 확인할 수 없습니다.");

  const { data: existing, error: lookupError } = await lookup.maybeSingle();
  if (lookupError) return serverError(lookupError, "삭제할 식단 기록을 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.");
  if (!existing) return userError("삭제할 식단 기록을 찾을 수 없습니다.", 404);

  const { error } = await sb
    .from("fit_diet_meal_logs")
    .delete()
    .eq("id", existing.id)
    .eq("user_id", userId);
  if (error) return serverError(error, "식단 기록 삭제에 실패했습니다. 잠시 후 다시 시도해 주세요.");

  await removeDietImage(sb, existing.image_path);
  return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
}
