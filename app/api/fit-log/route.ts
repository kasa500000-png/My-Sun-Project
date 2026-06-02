import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase";
import { createSupabaseServer } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

type SetPayload = {
  exerciseId?: string;
  exercise_id?: string;
  setNumber?: number;
  set_number?: number;
  weight?: number | string | null;
  reps?: number | string | null;
  durationSeconds?: number | string | null;
  duration_seconds?: number | string | null;
  memo?: string | null;
};

const MAX_SETS_PER_SESSION = 200;

function asText(value: unknown, max = 1000) {
  if (value == null) return null;
  const text = String(value).trim();
  return text ? text.slice(0, max) : null;
}

function asNumber(value: unknown, fallback: number | null = null) {
  if (value === "" || value == null) return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function asBoundedNumber(value: unknown, min: number, max: number, fallback: number | null = null) {
  const number = asNumber(value, fallback);
  if (number == null) return fallback;
  return Math.min(Math.max(number, min), max);
}

function asBoundedInteger(value: unknown, min: number, max: number, fallback: number) {
  return Math.round(asBoundedNumber(value, min, max, fallback) || fallback);
}

function todayKst() {
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return kst.toISOString().slice(0, 10);
}

function asWorkoutDate(value: unknown) {
  const text = asText(value, 10);
  return text && /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : todayKst();
}

function asDurationMinutes(value: unknown) {
  const n = asNumber(value, 0) || 0;
  return Math.min(Math.max(Math.round(n), 0), 1440);
}

function asSetPayloads(value: unknown) {
  return (Array.isArray(value) ? value as SetPayload[] : []).slice(0, MAX_SETS_PER_SESSION);
}

function mapSession(row: any) {
  return {
    id: row.id,
    date: String(row.workout_date || row.date || todayKst()).slice(0, 10),
    routineName: row.routine_name || "운동",
    durationMinutes: Number(row.duration_minutes || 0),
    memo: row.memo || undefined,
    sets: (row.fit_set_logs || [])
      .slice()
      .sort((a: any, b: any) => Number(a.set_number || 0) - Number(b.set_number || 0))
      .map((set: any) => ({
        id: set.id,
        exerciseId: set.exercise_id,
        setNumber: Number(set.set_number || 1),
        weight: set.weight == null ? undefined : Number(set.weight),
        reps: set.reps == null ? undefined : Number(set.reps),
        durationSeconds: set.duration_seconds == null ? undefined : Number(set.duration_seconds),
        memo: set.memo || undefined,
      })),
  };
}

function userError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

function serverError(error: unknown, fallback: string) {
  console.error("[fit-log]", error);
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
    .from("fit_workout_sessions")
    .select("*, fit_set_logs(*)")
    .eq("user_id", userId)
    .order("workout_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(300);

  if (error) return serverError(error, "운동 기록을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.");
  return NextResponse.json({ sessions: (data || []).map(mapSession) });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const userId = await currentUserId();
  const sets = asSetPayloads(body.sets);
  if (!userId) return userError("로그인 정보를 확인할 수 없습니다. 다시 로그인해 주세요.", 401);
  if (sets.length === 0) return userError("저장할 운동을 하나 이상 입력해 주세요.");

  const sb = getServiceClient();
  const sessionPayload = {
    user_id: userId,
    workout_date: asWorkoutDate(body.date),
    routine_name: asText(body.routineName || body.routine_name, 120) || "운동",
    duration_minutes: asDurationMinutes(body.durationMinutes || body.duration_minutes),
    memo: asText(body.memo, 2000),
  };

  const { data: session, error: sessionError } = await sb
    .from("fit_workout_sessions")
    .insert(sessionPayload)
    .select("*")
    .single();

  if (sessionError) return serverError(sessionError, "운동 기록 저장에 실패했어요. 잠시 후 다시 시도해 주세요.");

  const setPayload = sets.map((set, index) => ({
    session_id: session.id,
    user_id: userId,
    exercise_id: asText(set.exerciseId || set.exercise_id, 120) || "unknown",
    set_number: asBoundedInteger(set.setNumber || set.set_number, 1, MAX_SETS_PER_SESSION, index + 1),
    weight: asBoundedNumber(set.weight, 0, 100000),
    reps: asBoundedInteger(set.reps, 0, 100000, 0),
    duration_seconds: asBoundedInteger(set.durationSeconds || set.duration_seconds, 0, 86400, 0),
    memo: asText(set.memo, 1000),
  }));

  const { error: setsError } = await sb.from("fit_set_logs").insert(setPayload);
  if (setsError) {
    await sb.from("fit_workout_sessions").delete().eq("id", session.id).eq("user_id", userId);
    return serverError(setsError, "운동 세트 저장에 실패했어요. 입력 내용을 확인한 뒤 다시 시도해 주세요.");
  }

  const { data, error } = await sb
    .from("fit_workout_sessions")
    .select("*, fit_set_logs(*)")
    .eq("id", session.id)
    .eq("user_id", userId)
    .single();

  if (error) return serverError(error, "저장된 운동 기록을 다시 불러오지 못했어요. 새로고침 후 확인해 주세요.");
  return NextResponse.json({ session: mapSession(data) });
}

export async function PUT(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const userId = await currentUserId();
  const id = String(body.id || "");
  const sets = asSetPayloads(body.sets);
  if (!userId) return userError("로그인 정보를 확인할 수 없습니다. 다시 로그인해 주세요.", 401);
  if (!id) return userError("수정할 기록 정보를 확인할 수 없습니다. 다시 시도해 주세요.");
  if (sets.length === 0) return userError("저장할 운동을 하나 이상 입력해 주세요.");

  const sb = getServiceClient();
  const sessionPayload = {
    workout_date: asWorkoutDate(body.date),
    routine_name: asText(body.routineName || body.routine_name, 120) || "운동",
    duration_minutes: asDurationMinutes(body.durationMinutes || body.duration_minutes),
    memo: asText(body.memo, 2000),
    updated_at: new Date().toISOString(),
  };

  const { error: sessionError } = await sb
    .from("fit_workout_sessions")
    .update(sessionPayload)
    .eq("id", id)
    .eq("user_id", userId);

  if (sessionError) return serverError(sessionError, "운동 기록 수정에 실패했어요. 잠시 후 다시 시도해 주세요.");

  const { error: deleteError } = await sb
    .from("fit_set_logs")
    .delete()
    .eq("session_id", id)
    .eq("user_id", userId);

  if (deleteError) return serverError(deleteError, "기존 세트를 정리하지 못했어요. 잠시 후 다시 시도해 주세요.");

  const setPayload = sets.map((set, index) => ({
    session_id: id,
    user_id: userId,
    exercise_id: asText(set.exerciseId || set.exercise_id, 120) || "unknown",
    set_number: asBoundedInteger(set.setNumber || set.set_number, 1, MAX_SETS_PER_SESSION, index + 1),
    weight: asBoundedNumber(set.weight, 0, 100000),
    reps: asBoundedInteger(set.reps, 0, 100000, 0),
    duration_seconds: asBoundedInteger(set.durationSeconds || set.duration_seconds, 0, 86400, 0),
    memo: asText(set.memo, 1000),
  }));

  const { error: setsError } = await sb.from("fit_set_logs").insert(setPayload);
  if (setsError) return serverError(setsError, "운동 세트 수정에 실패했어요. 입력 내용을 확인한 뒤 다시 시도해 주세요.");

  const { data, error } = await sb
    .from("fit_workout_sessions")
    .select("*, fit_set_logs(*)")
    .eq("id", id)
    .eq("user_id", userId)
    .single();

  if (error) return serverError(error, "수정된 기록을 다시 불러오지 못했어요. 새로고침 후 확인해 주세요.");
  return NextResponse.json({ session: mapSession(data) });
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id") || "";
  const userId = await currentUserId();
  if (!userId) return userError("로그인 정보를 확인할 수 없습니다. 다시 로그인해 주세요.", 401);
  if (!id) return userError("삭제할 기록 정보를 확인할 수 없습니다. 다시 시도해 주세요.");

  const sb = getServiceClient();
  const { error } = await sb
    .from("fit_workout_sessions")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);

  if (error) return serverError(error, "기록 삭제에 실패했어요. 잠시 후 다시 시도해 주세요.");
  return NextResponse.json({ ok: true });
}
