import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase";

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

function todayKst() {
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return kst.toISOString().slice(0, 10);
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

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("user_id") || "";
  if (!userId) return NextResponse.json({ error: "user_id required" }, { status: 400 });

  const sb = getServiceClient();
  const { data, error } = await sb
    .from("fit_workout_sessions")
    .select("*, fit_set_logs(*)")
    .eq("user_id", userId)
    .order("workout_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(300);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ sessions: (data || []).map(mapSession) });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const userId = String(body.user_id || "");
  const sets = Array.isArray(body.sets) ? body.sets as SetPayload[] : [];
  if (!userId) return NextResponse.json({ error: "user_id required" }, { status: 400 });
  if (sets.length === 0) return NextResponse.json({ error: "sets required" }, { status: 400 });

  const sb = getServiceClient();
  const sessionPayload = {
    user_id: userId,
    workout_date: body.date || todayKst(),
    routine_name: asText(body.routineName || body.routine_name, 120) || "운동",
    duration_minutes: asNumber(body.durationMinutes || body.duration_minutes, 0),
    memo: asText(body.memo, 2000),
  };

  const { data: session, error: sessionError } = await sb
    .from("fit_workout_sessions")
    .insert(sessionPayload)
    .select("*")
    .single();

  if (sessionError) return NextResponse.json({ error: sessionError.message }, { status: 500 });

  const setPayload = sets.map((set, index) => ({
    session_id: session.id,
    user_id: userId,
    exercise_id: asText(set.exerciseId || set.exercise_id, 120) || "unknown",
    set_number: asNumber(set.setNumber || set.set_number, index + 1),
    weight: asNumber(set.weight),
    reps: asNumber(set.reps),
    duration_seconds: asNumber(set.durationSeconds || set.duration_seconds),
    memo: asText(set.memo, 1000),
  }));

  const { error: setsError } = await sb.from("fit_set_logs").insert(setPayload);
  if (setsError) {
    await sb.from("fit_workout_sessions").delete().eq("id", session.id).eq("user_id", userId);
    return NextResponse.json({ error: setsError.message }, { status: 500 });
  }

  const { data, error } = await sb
    .from("fit_workout_sessions")
    .select("*, fit_set_logs(*)")
    .eq("id", session.id)
    .eq("user_id", userId)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ session: mapSession(data) });
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id") || "";
  const userId = searchParams.get("user_id") || "";
  if (!id || !userId) return NextResponse.json({ error: "id, user_id required" }, { status: 400 });

  const sb = getServiceClient();
  const { error } = await sb
    .from("fit_workout_sessions")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
