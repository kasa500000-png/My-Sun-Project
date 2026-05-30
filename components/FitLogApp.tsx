"use client";

import { useEffect, useMemo, useState } from "react";
import { createSupabaseBrowser } from "@/lib/supabase-browser";

type Tab = "home" | "train" | "log" | "balance" | "member";
type ExerciseType = "weight" | "time" | "bodyweight";

type MuscleImpact = {
  muscleId: string;
  impactRatio: number;
};

type Exercise = {
  id: string;
  name: string;
  category: string;
  type: ExerciseType;
  impacts: MuscleImpact[];
  defaultRestSeconds: number;
};

type SetLog = {
  id: string;
  exerciseId: string;
  setNumber: number;
  weight?: number;
  reps?: number;
  durationSeconds?: number;
  memo?: string;
};

type WorkoutSession = {
  id: string;
  date: string;
  routineName: string;
  durationMinutes: number;
  memo?: string;
  sets: SetLog[];
};

type DraftSet = {
  exerciseId: string;
  weight: string;
  reps: string;
  memo: string;
};

type Muscle = {
  id: string;
  name: string;
  group: string;
  color: string;
};

type FitLogAppProps = {
  userId: string;
  userEmail?: string | null;
};

type MuscleIconKey =
  | "chest"
  | "back"
  | "shoulders"
  | "arms"
  | "core"
  | "quads"
  | "glutes"
  | "hamstrings"
  | "calves"
  | "cardio"
  | "lower"
  | "upper";

type MuscleZone = {
  x: number;
  y: number;
  w: number;
  h: number;
  r?: number;
  rotate?: number;
};

type MuscleCallout = {
  x: number;
  y: number;
  size?: number;
};

const MUSCLE_ICON_POSITIONS: Record<MuscleIconKey, { col: number; row: number }> = {
  chest: { col: 0, row: 0 },
  back: { col: 1, row: 0 },
  shoulders: { col: 2, row: 0 },
  arms: { col: 3, row: 0 },
  core: { col: 0, row: 1 },
  quads: { col: 1, row: 1 },
  glutes: { col: 2, row: 1 },
  hamstrings: { col: 3, row: 1 },
  calves: { col: 0, row: 2 },
  cardio: { col: 1, row: 2 },
  lower: { col: 2, row: 2 },
  upper: { col: 3, row: 2 },
};

const MUSCLE_BODY_ZONES: Record<string, MuscleZone[]> = {
  chest: [
    { x: 18.7, y: 25.7, w: 9.1, h: 6.5, r: 46, rotate: -8 },
    { x: 29.4, y: 25.7, w: 9.1, h: 6.5, r: 46, rotate: 8 },
  ],
  back: [
    { x: 62.7, y: 24.6, w: 9.7, h: 16.8, r: 40, rotate: 12 },
    { x: 73.4, y: 24.6, w: 9.7, h: 16.8, r: 40, rotate: -12 },
    { x: 67.7, y: 32.2, w: 10.8, h: 17.6, r: 42 },
  ],
  shoulders: [
    { x: 13.2, y: 23.1, w: 7.5, h: 7, r: 50, rotate: -18 },
    { x: 36.6, y: 23.1, w: 7.5, h: 7, r: 50, rotate: 18 },
    { x: 58.1, y: 22.6, w: 7.5, h: 7.2, r: 50, rotate: -18 },
    { x: 82.1, y: 22.6, w: 7.5, h: 7.2, r: 50, rotate: 18 },
  ],
  biceps: [
    { x: 10.6, y: 32.2, w: 4.9, h: 14.5, r: 45, rotate: 9 },
    { x: 42.2, y: 32.2, w: 4.9, h: 14.5, r: 45, rotate: -9 },
  ],
  triceps: [
    { x: 55.6, y: 32.8, w: 4.8, h: 15.4, r: 45, rotate: -5 },
    { x: 87.4, y: 32.8, w: 4.8, h: 15.4, r: 45, rotate: 5 },
  ],
  core: [
    { x: 22.1, y: 34.8, w: 15.2, h: 18.7, r: 36 },
  ],
  quads: [
    { x: 18.9, y: 55.2, w: 7.2, h: 19.4, r: 38, rotate: 4 },
    { x: 31.1, y: 55.2, w: 7.2, h: 19.4, r: 38, rotate: -4 },
  ],
  glutes: [
    { x: 65.2, y: 50.7, w: 9.5, h: 10.7, r: 48, rotate: -6 },
    { x: 75.2, y: 50.7, w: 9.5, h: 10.7, r: 48, rotate: 6 },
  ],
  hamstrings: [
    { x: 66.2, y: 60.2, w: 7.6, h: 19.8, r: 38, rotate: 5 },
    { x: 76.2, y: 60.2, w: 7.6, h: 19.8, r: 38, rotate: -5 },
  ],
  calves: [
    { x: 20.1, y: 75.3, w: 6.4, h: 14.2, r: 42, rotate: 4 },
    { x: 31.3, y: 75.3, w: 6.4, h: 14.2, r: 42, rotate: -4 },
    { x: 66.2, y: 77.4, w: 7.1, h: 12.6, r: 42, rotate: 2 },
    { x: 76.4, y: 77.4, w: 7.1, h: 12.6, r: 42, rotate: -2 },
  ],
  cardio: [
    { x: 17.2, y: 18.8, w: 23.1, h: 70.8, r: 48 },
    { x: 61.8, y: 18.8, w: 24.4, h: 70.8, r: 48 },
  ],
};

const MUSCLE_CALLOUT_POSITIONS: Record<string, MuscleCallout> = {
  chest: { x: 24, y: 25, size: 19 },
  back: { x: 70, y: 28, size: 19 },
  shoulders: { x: 52, y: 23, size: 17 },
  biceps: { x: 42, y: 35, size: 16 },
  triceps: { x: 88, y: 35, size: 16 },
  core: { x: 25, y: 41, size: 18 },
  quads: { x: 25, y: 58, size: 18 },
  glutes: { x: 71, y: 51, size: 17 },
  hamstrings: { x: 76, y: 64, size: 17 },
  calves: { x: 72, y: 78, size: 16 },
  cardio: { x: 50, y: 82, size: 17 },
};

const MUSCLES: Muscle[] = [
  { id: "chest", name: "가슴", group: "상체", color: "#111111" },
  { id: "back", name: "등", group: "상체", color: "#39393b" },
  { id: "shoulders", name: "어깨", group: "상체", color: "#707072" },
  { id: "biceps", name: "이두", group: "팔", color: "#9e9ea0" },
  { id: "triceps", name: "삼두", group: "팔", color: "#4b4b4d" },
  { id: "core", name: "코어", group: "코어", color: "#007d48" },
  { id: "quads", name: "앞허벅지", group: "하체", color: "#111111" },
  { id: "glutes", name: "둔근", group: "하체", color: "#d30005" },
  { id: "hamstrings", name: "햄스트링", group: "하체", color: "#39393b" },
  { id: "calves", name: "종아리", group: "하체", color: "#707072" },
  { id: "cardio", name: "유산소", group: "전신", color: "#1151ff" },
];

const EXERCISES: Exercise[] = [
  {
    id: "squat",
    name: "스쿼트",
    category: "하체",
    type: "weight",
    defaultRestSeconds: 90,
    impacts: [
      { muscleId: "quads", impactRatio: 0.4 },
      { muscleId: "glutes", impactRatio: 0.3 },
      { muscleId: "hamstrings", impactRatio: 0.15 },
      { muscleId: "core", impactRatio: 0.15 },
    ],
  },
  {
    id: "leg-press",
    name: "레그 프레스",
    category: "하체",
    type: "weight",
    defaultRestSeconds: 90,
    impacts: [
      { muscleId: "quads", impactRatio: 0.5 },
      { muscleId: "glutes", impactRatio: 0.3 },
      { muscleId: "hamstrings", impactRatio: 0.2 },
    ],
  },
  {
    id: "hip-thrust",
    name: "힙 쓰러스트",
    category: "하체",
    type: "weight",
    defaultRestSeconds: 90,
    impacts: [
      { muscleId: "glutes", impactRatio: 0.7 },
      { muscleId: "hamstrings", impactRatio: 0.2 },
      { muscleId: "core", impactRatio: 0.1 },
    ],
  },
  {
    id: "lat-pulldown",
    name: "랫 풀다운",
    category: "등",
    type: "weight",
    defaultRestSeconds: 75,
    impacts: [
      { muscleId: "back", impactRatio: 0.6 },
      { muscleId: "biceps", impactRatio: 0.2 },
      { muscleId: "shoulders", impactRatio: 0.1 },
      { muscleId: "core", impactRatio: 0.1 },
    ],
  },
  {
    id: "seated-row",
    name: "시티드 로우",
    category: "등",
    type: "weight",
    defaultRestSeconds: 75,
    impacts: [
      { muscleId: "back", impactRatio: 0.6 },
      { muscleId: "biceps", impactRatio: 0.2 },
      { muscleId: "shoulders", impactRatio: 0.1 },
      { muscleId: "core", impactRatio: 0.1 },
    ],
  },
  {
    id: "bench-press",
    name: "벤치 프레스",
    category: "가슴",
    type: "weight",
    defaultRestSeconds: 90,
    impacts: [
      { muscleId: "chest", impactRatio: 0.55 },
      { muscleId: "triceps", impactRatio: 0.25 },
      { muscleId: "shoulders", impactRatio: 0.2 },
    ],
  },
  {
    id: "push-up",
    name: "푸시업",
    category: "가슴",
    type: "bodyweight",
    defaultRestSeconds: 60,
    impacts: [
      { muscleId: "chest", impactRatio: 0.45 },
      { muscleId: "triceps", impactRatio: 0.25 },
      { muscleId: "shoulders", impactRatio: 0.15 },
      { muscleId: "core", impactRatio: 0.15 },
    ],
  },
  {
    id: "shoulder-press",
    name: "숄더 프레스",
    category: "어깨",
    type: "weight",
    defaultRestSeconds: 75,
    impacts: [
      { muscleId: "shoulders", impactRatio: 0.65 },
      { muscleId: "triceps", impactRatio: 0.2 },
      { muscleId: "core", impactRatio: 0.15 },
    ],
  },
  {
    id: "lateral-raise",
    name: "사이드 레터럴 레이즈",
    category: "어깨",
    type: "weight",
    defaultRestSeconds: 45,
    impacts: [{ muscleId: "shoulders", impactRatio: 1 }],
  },
  {
    id: "plank",
    name: "플랭크",
    category: "코어",
    type: "time",
    defaultRestSeconds: 45,
    impacts: [
      { muscleId: "core", impactRatio: 0.75 },
      { muscleId: "shoulders", impactRatio: 0.15 },
      { muscleId: "glutes", impactRatio: 0.1 },
    ],
  },
  {
    id: "running",
    name: "러닝",
    category: "유산소",
    type: "time",
    defaultRestSeconds: 0,
    impacts: [
      { muscleId: "cardio", impactRatio: 0.45 },
      { muscleId: "quads", impactRatio: 0.2 },
      { muscleId: "hamstrings", impactRatio: 0.15 },
      { muscleId: "glutes", impactRatio: 0.1 },
      { muscleId: "calves", impactRatio: 0.1 },
    ],
  },
  {
    id: "stair-climber",
    name: "천국의 계단",
    category: "유산소",
    type: "time",
    defaultRestSeconds: 0,
    impacts: [
      { muscleId: "cardio", impactRatio: 0.35 },
      { muscleId: "glutes", impactRatio: 0.25 },
      { muscleId: "quads", impactRatio: 0.25 },
      { muscleId: "calves", impactRatio: 0.15 },
    ],
  },
];

const ROUTINES = [
  {
    name: "LOWER BODY",
    label: "하체 집중",
    note: "둔근, 허벅지, 유산소까지 가볍게.",
    exercises: ["squat", "leg-press", "hip-thrust", "stair-climber"],
  },
  {
    name: "UPPER BALANCE",
    label: "상체 밸런스",
    note: "등, 가슴, 어깨를 균형 있게.",
    exercises: ["lat-pulldown", "seated-row", "bench-press", "shoulder-press"],
  },
  {
    name: "CORE RESET",
    label: "코어 리셋",
    note: "코어 안정감과 가벼운 전신 운동.",
    exercises: ["plank", "push-up", "running"],
  },
];

const tabItems: Array<{ id: Tab; label: string }> = [
  { id: "home", label: "홈" },
  { id: "train", label: "기록" },
  { id: "log", label: "일지" },
  { id: "balance", label: "분석" },
  { id: "member", label: "내정보" },
];

function today() {
  const date = new Date();
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}

function byId<T extends { id: string }>(items: T[]) {
  return new Map(items.map(item => [item.id, item]));
}

const exerciseById = byId(EXERCISES);

function parseNumber(value: string | number | undefined) {
  const n = Number(value || 0);
  return Number.isFinite(n) ? n : 0;
}

function setVolume(set: SetLog) {
  const exercise = exerciseById.get(set.exerciseId);
  if (exercise?.type === "time") return Math.max(Number(set.durationSeconds || 0) / 60, 1) * 25;
  return Math.max(Number(set.weight || 0), exercise?.type === "bodyweight" ? 10 : 0) * Math.max(Number(set.reps || 0), 1);
}

function scoreSessions(sessions: WorkoutSession[]) {
  const scores = new Map<string, number>();
  for (const session of sessions) {
    for (const set of session.sets) {
      const exercise = exerciseById.get(set.exerciseId);
      if (!exercise) continue;
      const volume = setVolume(set);
      for (const impact of exercise.impacts) {
        scores.set(impact.muscleId, (scores.get(impact.muscleId) || 0) + volume * impact.impactRatio);
      }
    }
  }
  return MUSCLES.map(muscle => ({ ...muscle, score: Math.round(scores.get(muscle.id) || 0) }))
    .sort((a, b) => b.score - a.score);
}

function groupScores(scores: Array<Muscle & { score: number }>) {
  const groups = new Map<string, { name: string; score: number; color: string }>();
  for (const score of scores) {
    const current = groups.get(score.group) || { name: score.group, score: 0, color: score.color };
    current.score += score.score;
    groups.set(score.group, current);
  }
  return Array.from(groups.values()).sort((a, b) => b.score - a.score);
}

function sessionStats(session: WorkoutSession) {
  const totalSets = session.sets.length;
  const volume = Math.round(session.sets.reduce((sum, set) => sum + setVolume(set), 0));
  const exercises = new Set(session.sets.map(set => set.exerciseId)).size;
  return { totalSets, volume, exercises };
}

function formatDate(date: string) {
  const parsed = new Date(`${date}T00:00:00`);
  return new Intl.DateTimeFormat("ko-KR", {
    month: "long",
    day: "numeric",
    weekday: "short",
  }).format(parsed);
}

function defaultDraft(routineLabel = ROUTINES[0].label): DraftSet[] {
  const routine = ROUTINES.find(item => item.label === routineLabel) || ROUTINES[0];
  return routine.exercises.flatMap(exerciseId => [
    { exerciseId, weight: "", reps: "", memo: "" },
    { exerciseId, weight: "", reps: "", memo: "" },
  ]);
}

function routineNote(label: string) {
  return ROUTINES.find(item => item.label === label)?.note || "오늘 컨디션에 맞춰 가볍게 시작해요.";
}

function muscleIconKey(muscleId: string, group?: string): MuscleIconKey {
  if (muscleId === "biceps" || muscleId === "triceps") return "arms";
  if (muscleId in MUSCLE_ICON_POSITIONS) return muscleId as MuscleIconKey;
  if (group === "하체") return "lower";
  if (group === "상체") return "upper";
  return "cardio";
}

export default function FitLogApp({ userId, userEmail }: FitLogAppProps) {
  const [activeTab, setActiveTab] = useState<Tab>("home");
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [saving, setSaving] = useState(false);
  const [routineName, setRoutineName] = useState(ROUTINES[0].label);
  const [draftDate, setDraftDate] = useState(today());
  const [draftDuration, setDraftDuration] = useState("45");
  const [draftMemo, setDraftMemo] = useState("");
  const [draftSets, setDraftSets] = useState<DraftSet[]>(() => defaultDraft());
  const [selectedExercise, setSelectedExercise] = useState(EXERCISES[0].id);
  const [toast, setToast] = useState("");

  useEffect(() => {
    void loadSessions();
  }, [userId]);

  useEffect(() => {
    const next = defaultDraft(routineName);
    setDraftSets(next);
    setSelectedExercise(next[0]?.exerciseId || EXERCISES[0].id);
  }, [routineName]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 3200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  async function loadSessions() {
    setLoadingSessions(true);
    try {
      const res = await fetch(`/api/fit-log?user_id=${encodeURIComponent(userId)}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "운동 기록을 불러오지 못했어요.");
      setSessions(Array.isArray(data.sessions) ? data.sessions : []);
    } catch (error) {
      setToast(error instanceof Error ? error.message : "운동 기록을 불러오지 못했어요.");
      setSessions([]);
    } finally {
      setLoadingSessions(false);
    }
  }

  const sortedSessions = useMemo(
    () => [...sessions].sort((a, b) => b.date.localeCompare(a.date)),
    [sessions],
  );

  const weekSessions = useMemo(() => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 6);
    const offset = cutoff.getTimezoneOffset() * 60000;
    const cutoffText = new Date(cutoff.getTime() - offset).toISOString().slice(0, 10);
    return sessions.filter(session => session.date >= cutoffText);
  }, [sessions]);

  const todaySessions = useMemo(() => sessions.filter(session => session.date === today()), [sessions]);
  const weeklyScores = useMemo(() => scoreSessions(weekSessions), [weekSessions]);
  const todayScores = useMemo(() => scoreSessions(todaySessions), [todaySessions]);
  const groupBalance = useMemo(() => groupScores(weeklyScores).filter(item => item.score > 0), [weeklyScores]);
  const topWeek = weeklyScores.filter(item => item.score > 0).slice(0, 6);
  const topToday = todayScores.filter(item => item.score > 0).slice(0, 4);

  const currentDraftScores = useMemo(() => {
    const pseudo: WorkoutSession = {
      id: "draft",
      date: draftDate,
      routineName,
      durationMinutes: parseNumber(draftDuration),
      sets: draftSets.map((set, index) => ({
        id: `draft-${index}`,
        exerciseId: set.exerciseId,
        setNumber: index + 1,
        weight: parseNumber(set.weight),
        reps: parseNumber(set.reps),
      })),
    };
    return scoreSessions([pseudo]).filter(item => item.score > 0);
  }, [draftDate, draftDuration, draftSets, routineName]);

  const weekStats = useMemo(() => {
    const sets = weekSessions.reduce((sum, session) => sum + session.sets.length, 0);
    const minutes = weekSessions.reduce((sum, session) => sum + session.durationMinutes, 0);
    const volume = weekSessions.reduce((sum, session) => sum + sessionStats(session).volume, 0);
    return { count: weekSessions.length, sets, minutes, volume };
  }, [weekSessions]);

  const recommendedRoutine = useMemo(() => {
    const groupData = groupScores(weeklyScores);
    const lowGroups = [...groupData].sort((a, b) => a.score - b.score).slice(0, 2).map(item => item.name);
    if (lowGroups.includes("상체")) return "상체 밸런스";
    if (lowGroups.includes("코어")) return "코어 리셋";
    return "하체 집중";
  }, [weeklyScores]);

  function updateDraftSet(index: number, patch: Partial<DraftSet>) {
    setDraftSets(items => items.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  }

  function addSet(exerciseId = selectedExercise) {
    setDraftSets(items => [...items, { exerciseId, weight: "", reps: "", memo: "" }]);
  }

  function removeSet(index: number) {
    setDraftSets(items => items.filter((_, i) => i !== index));
  }

  async function finishWorkout() {
    const validSets = draftSets
      .map((set, index) => {
        const exercise = exerciseById.get(set.exerciseId);
        const isTime = exercise?.type === "time";
        return {
          id: `${Date.now()}-${index}`,
          exerciseId: set.exerciseId,
          setNumber: index + 1,
          weight: isTime ? undefined : parseNumber(set.weight),
          reps: isTime ? 1 : parseNumber(set.reps),
          durationSeconds: isTime ? parseNumber(set.reps) * 60 : undefined,
          memo: set.memo.trim() || undefined,
        };
      })
      .filter(set => (set.durationSeconds || 0) > 0 || (set.reps || 0) > 0);

    if (validSets.length === 0) {
      setToast("저장할 세트를 하나 이상 입력해 주세요.");
      return;
    }

    const nextSession: WorkoutSession = {
      id: `${Date.now()}`,
      date: draftDate,
      routineName,
      durationMinutes: Math.max(parseNumber(draftDuration), 1),
      memo: draftMemo.trim() || undefined,
      sets: validSets,
    };

    setSaving(true);
    try {
      const res = await fetch("/api/fit-log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...nextSession, user_id: userId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "운동 기록 저장에 실패했어요.");
      setSessions(items => [data.session, ...items]);
      setDraftMemo("");
      setDraftSets(defaultDraft(routineName));
      setActiveTab("balance");
      setToast("운동 기록을 저장했어요.");
    } catch (error) {
      setToast(error instanceof Error ? error.message : "운동 기록 저장에 실패했어요.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteSession(id: string) {
    const res = await fetch(`/api/fit-log?id=${encodeURIComponent(id)}&user_id=${encodeURIComponent(userId)}`, {
      method: "DELETE",
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setToast(data.error || "기록 삭제에 실패했어요.");
      return;
    }
    setSessions(items => items.filter(item => item.id !== id));
    setToast("기록을 삭제했어요.");
  }

  async function signOut() {
    const supabase = createSupabaseBrowser();
    await supabase?.auth.signOut();
    window.location.href = "/login";
  }

  return (
    <main className="min-h-screen bg-white text-[#111111]">
      <TopBar userEmail={userEmail} onSignOut={signOut} setActiveTab={setActiveTab} />

      {activeTab === "home" && (
        <HomeDashboard
          loading={loadingSessions}
          sessions={sortedSessions}
          weekStats={weekStats}
          recent={sortedSessions[0]}
          topToday={topToday}
          topWeek={topWeek}
          recommendedRoutine={recommendedRoutine}
          onStart={() => {
            setRoutineName(recommendedRoutine);
            setActiveTab("train");
          }}
          onAnalyze={() => setActiveTab("balance")}
        />
      )}

      {activeTab === "train" && (
        <WorkoutView
          routineName={routineName}
          setRoutineName={setRoutineName}
          draftDate={draftDate}
          setDraftDate={setDraftDate}
          draftDuration={draftDuration}
          setDraftDuration={setDraftDuration}
          draftMemo={draftMemo}
          setDraftMemo={setDraftMemo}
          draftSets={draftSets}
          selectedExercise={selectedExercise}
          setSelectedExercise={setSelectedExercise}
          addSet={addSet}
          removeSet={removeSet}
          updateDraftSet={updateDraftSet}
          currentDraftScores={currentDraftScores}
          finishWorkout={finishWorkout}
          saving={saving}
        />
      )}

      {activeTab === "log" && (
        <HistoryView loading={loadingSessions} sessions={sortedSessions} deleteSession={deleteSession} />
      )}

      {activeTab === "balance" && (
        <AnalysisView
          weekStats={weekStats}
          weeklyScores={weeklyScores}
          todayScores={todayScores}
          groupBalance={groupBalance}
          recommendedRoutine={recommendedRoutine}
        />
      )}

      {activeTab === "member" && (
        <ProfileView userEmail={userEmail} sessionCount={sessions.length} onSignOut={signOut} />
      )}

      <MobileTabBar activeTab={activeTab} setActiveTab={setActiveTab} />

      {toast && (
        <div className="fixed bottom-24 left-1/2 z-50 w-[calc(100vw-32px)] max-w-sm -translate-x-1/2 rounded-full bg-[#111111] px-5 py-3 text-center text-sm font-medium text-white">
          {toast}
        </div>
      )}
    </main>
  );
}

function TopBar({
  userEmail,
  onSignOut,
  setActiveTab,
}: {
  userEmail?: string | null;
  onSignOut: () => void;
  setActiveTab: (tab: Tab) => void;
}) {
  return (
    <header className="sticky top-0 z-30 border-b border-[#e5e5e5] bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-[1440px] items-center justify-between px-4 md:h-16 md:px-8">
        <button className="text-base font-black md:text-xl" onClick={() => setActiveTab("home")}>
          마이썬 운동일지
        </button>
        <div className="flex items-center gap-2">
          <span className="hidden max-w-[220px] truncate text-xs font-medium text-[#707072] md:inline">{userEmail}</span>
          <button className="h-9 rounded-full bg-[#111111] px-4 text-sm font-medium text-white" onClick={() => setActiveTab("train")}>
            기록
          </button>
          <button className="hidden h-9 rounded-full bg-[#f5f5f5] px-4 text-sm font-medium text-[#111111] md:inline" onClick={onSignOut}>
            로그아웃
          </button>
        </div>
      </div>
    </header>
  );
}

type SummaryRange = "week" | "month" | "year";

const summaryRangeLabels: Record<SummaryRange, string> = {
  week: "이번 주",
  month: "이번 달",
  year: "올해",
};

function rangeStart(range: SummaryRange) {
  const now = new Date();
  if (range === "year") return `${now.getFullYear()}-01-01`;
  if (range === "month") {
    const month = String(now.getMonth() + 1).padStart(2, "0");
    return `${now.getFullYear()}-${month}-01`;
  }

  const day = new Date(now);
  const weekday = now.getDay();
  const daysFromMonday = weekday === 0 ? 6 : weekday - 1;
  day.setDate(now.getDate() - daysFromMonday);
  const offset = day.getTimezoneOffset() * 60000;
  return new Date(day.getTime() - offset).toISOString().slice(0, 10);
}

function workoutSummary(sessions: WorkoutSession[]) {
  const minutes = sessions.reduce((sum, session) => sum + session.durationMinutes, 0);
  const scores = scoreSessions(sessions);
  const buckets = { upper: 0, lower: 0, core: 0 };

  for (const item of scores) {
    if (item.group === "하체") buckets.lower += item.score;
    else if (item.group === "코어") buckets.core += item.score;
    else if (item.group === "상체" || item.group === "팔") buckets.upper += item.score;
  }

  const total = buckets.upper + buckets.lower + buckets.core;
  const percent = (value: number) => (total ? Math.round((value / total) * 100) : 0);

  return {
    count: sessions.length,
    minutes,
    balance: {
      upper: percent(buckets.upper),
      lower: percent(buckets.lower),
      core: percent(buckets.core),
    },
  };
}

function HomeDashboard({
  loading,
  sessions,
  recent,
  topToday,
  topWeek,
  recommendedRoutine,
  onStart,
  onAnalyze,
}: {
  loading: boolean;
  sessions: WorkoutSession[];
  weekStats: { count: number; sets: number; minutes: number; volume: number };
  recent?: WorkoutSession;
  topToday: Array<Muscle & { score: number }>;
  topWeek: Array<Muscle & { score: number }>;
  recommendedRoutine: string;
  onStart: () => void;
  onAnalyze: () => void;
}) {
  const [range, setRange] = useState<SummaryRange>("week");
  const [modalOpen, setModalOpen] = useState(false);
  const start = rangeStart(range);
  const rangedSessions = useMemo(() => sessions.filter(session => session.date >= start), [sessions, start]);
  const summary = useMemo(() => workoutSummary(rangedSessions), [rangedSessions]);

  return (
    <>
      <section className="relative min-h-[64svh] overflow-hidden bg-[#111111] md:min-h-[680px]">
        <div
          className="absolute inset-0 bg-cover bg-center md:bg-[center_45%]"
          style={{ backgroundImage: "url('/images/mysun-home-hero.jpg')" }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/82 via-black/20 to-transparent md:bg-gradient-to-r md:from-black/72 md:via-black/22" />
        <div className="relative mx-auto flex min-h-[64svh] max-w-[1440px] flex-col justify-end px-4 pb-7 text-white md:min-h-[680px] md:px-8 md:pb-14">
          <p className="text-sm font-semibold text-white/80">오늘도 천천히, 꾸준히</p>
          <h1 className="mt-3 max-w-[720px] text-[44px] font-black leading-[0.95] md:text-[86px]">
            마이썬 운동일지
          </h1>
          <div className="mt-6 grid grid-cols-2 gap-2 md:flex md:flex-wrap">
            <button className="h-12 rounded-full bg-white px-6 text-base font-medium text-[#111111]" onClick={onStart}>
              운동 기록
            </button>
            <button className="h-12 rounded-full bg-[#111111] px-6 text-base font-medium text-white ring-1 ring-white/35" onClick={onAnalyze}>
              운동 분석
            </button>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-[1440px] gap-7 px-4 py-7 pb-28 md:grid-cols-[1fr_1fr] md:px-8 md:py-10">
        <div>
          <div className="mb-6 flex items-end justify-between gap-3">
            <SectionTitle kicker={summaryRangeLabels[range]} title="운동 요약" />
            <div className="mb-1 flex rounded-full bg-[#f5f5f5] p-1">
              {(Object.keys(summaryRangeLabels) as SummaryRange[]).map(item => (
                <button
                  key={item}
                  className={`h-9 rounded-full px-3 text-xs font-semibold ${range === item ? "bg-[#111111] text-white" : "text-[#111111]"}`}
                  onClick={() => setRange(item)}
                >
                  {summaryRangeLabels[item]}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-2">
            <button className="bg-[#f5f5f5] p-5 text-left" onClick={() => setModalOpen(true)}>
              <p className="text-sm font-medium text-[#707072]">운동 횟수</p>
              <p className="mt-4 text-4xl font-semibold leading-none">{loading ? "-" : `${summary.count}회`}</p>
            </button>
            <button className="bg-[#f5f5f5] p-5 text-left" onClick={() => setModalOpen(true)}>
              <p className="text-sm font-medium text-[#707072]">운동 시간</p>
              <p className="mt-4 text-4xl font-semibold leading-none">{loading ? "-" : `${summary.minutes}분`}</p>
            </button>
            <button className="bg-[#f5f5f5] p-5 text-left" onClick={() => setModalOpen(true)}>
              <p className="text-sm font-medium text-[#707072]">운동 밸런스</p>
              <BalanceBars balance={summary.balance} />
            </button>
          </div>

          <div className="mt-7 border-t border-[#cacacb] pt-5">
            <p className="text-sm font-medium text-[#707072]">추천 루틴</p>
            <h2 className="mt-2 text-2xl font-semibold">{recommendedRoutine}</h2>
            <p className="mt-2 text-sm leading-6 text-[#39393b]">{routineNote(recommendedRoutine)}</p>
            <button className="mt-5 h-12 w-full rounded-full bg-[#111111] px-8 text-base font-medium text-white md:w-auto" onClick={onStart}>
              이 루틴으로 시작
            </button>
          </div>
        </div>

        <div className="grid gap-7">
          <FlatPanel title={recent ? recent.routineName : "아직 기록이 없어요"} kicker="최근 기록">
            {recent ? (
              <div>
                <p className="text-sm font-medium text-[#707072]">{formatDate(recent.date)}</p>
                <div className="mt-4 grid grid-cols-3 gap-2">
                  <SmallStudioStat label="세트" value={`${sessionStats(recent).totalSets}`} />
                  <SmallStudioStat label="운동" value={`${sessionStats(recent).exercises}`} />
                  <SmallStudioStat label="시간" value={`${recent.durationMinutes}`} />
                </div>
              </div>
            ) : (
              <EmptyState text="첫 운동을 기록하면 이곳에 최근 일지가 표시됩니다." action="첫 운동 기록" onClick={onStart} />
            )}
          </FlatPanel>
          <FlatPanel title={topToday.length ? "오늘의 자극" : "이번 주 자극"} kicker="근육 지도">
            <BodyMap scores={topToday.length ? topToday : topWeek} />
          </FlatPanel>
        </div>
      </section>

      {modalOpen && (
        <WorkoutSummaryModal
          rangeLabel={summaryRangeLabels[range]}
          sessions={rangedSessions}
          onClose={() => setModalOpen(false)}
        />
      )}
    </>
  );
}

function BalanceBars({ balance }: { balance: { upper: number; lower: number; core: number } }) {
  const rows = [
    { label: "상체", value: balance.upper },
    { label: "하체", value: balance.lower },
    { label: "코어", value: balance.core },
  ];

  return (
    <div className="mt-4 grid gap-3">
      {rows.map(row => (
        <div key={row.label}>
          <div className="mb-1 flex justify-between text-sm font-semibold">
            <span>{row.label}</span>
            <span>{row.value}%</span>
          </div>
          <div className="h-2 bg-white">
            <div className="h-2 bg-[#111111]" style={{ width: `${row.value}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function WorkoutSummaryModal({
  rangeLabel,
  sessions,
  onClose,
}: {
  rangeLabel: string;
  sessions: WorkoutSession[];
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 bg-black/45 px-4 py-8" role="dialog" aria-modal="true">
      <div className="mx-auto flex max-h-[86svh] max-w-md flex-col bg-white">
        <div className="flex items-center justify-between border-b border-[#e5e5e5] p-5">
          <div>
            <p className="text-sm font-medium text-[#707072]">{rangeLabel}</p>
            <h2 className="text-2xl font-semibold">운동 기록</h2>
          </div>
          <button className="h-10 w-10 rounded-full bg-[#f5f5f5] text-lg font-semibold" onClick={onClose} aria-label="닫기">
            X
          </button>
        </div>
        <div className="overflow-y-auto p-5">
          {sessions.length === 0 ? (
            <p className="bg-[#f5f5f5] p-5 text-sm leading-6 text-[#707072]">선택한 기간에 등록된 운동 기록이 없습니다.</p>
          ) : (
            <div className="grid gap-3">
              {sessions.map(session => {
                const stats = sessionStats(session);
                return (
                  <article key={session.id} className="border-t border-[#cacacb] pt-4">
                    <p className="text-sm font-medium text-[#707072]">{formatDate(session.date)}</p>
                    <h3 className="mt-1 text-xl font-semibold">{session.routineName}</h3>
                    <div className="mt-3 grid grid-cols-3 gap-2">
                      <SmallStudioStat label="세트" value={`${stats.totalSets}`} />
                      <SmallStudioStat label="운동" value={`${stats.exercises}`} />
                      <SmallStudioStat label="시간" value={`${session.durationMinutes}`} />
                    </div>
                    {session.memo && <p className="mt-3 text-sm leading-6 text-[#39393b]">{session.memo}</p>}
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function HomeView({
  loading,
  weekStats,
  recent,
  topToday,
  topWeek,
  recommendedRoutine,
  onStart,
  onAnalyze,
}: {
  loading: boolean;
  weekStats: { count: number; sets: number; minutes: number; volume: number };
  recent?: WorkoutSession;
  topToday: Array<Muscle & { score: number }>;
  topWeek: Array<Muscle & { score: number }>;
  recommendedRoutine: string;
  onStart: () => void;
  onAnalyze: () => void;
}) {
  return (
    <>
      <section className="relative min-h-[72svh] overflow-hidden bg-[#111111] md:min-h-[680px]">
        <div
          className="absolute inset-0 bg-cover bg-center md:bg-[center_45%]"
          style={{ backgroundImage: "url('/images/mysun-home-hero.jpg')" }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/82 via-black/20 to-transparent md:bg-gradient-to-r md:from-black/72 md:via-black/22" />
        <div className="relative mx-auto flex min-h-[72svh] max-w-[1440px] flex-col justify-end px-4 pb-7 text-white md:min-h-[680px] md:px-8 md:pb-14">
          <p className="text-sm font-semibold text-white/80">오늘도 천천히, 꾸준히</p>
          <h1 className="mt-3 max-w-[720px] text-[44px] font-black leading-[0.95] md:text-[86px]">
            마이썬 운동일지
          </h1>
          <p className="mt-4 max-w-sm text-base leading-7 text-white/80">
            운동을 기록하고, 이번 주 몸의 밸런스를 한눈에 확인해요.
          </p>
          <div className="mt-6 grid grid-cols-2 gap-2 md:flex md:flex-wrap">
            <button className="h-12 rounded-full bg-white px-6 text-base font-medium text-[#111111]" onClick={onStart}>
              운동 기록
            </button>
            <button className="h-12 rounded-full bg-[#111111] px-6 text-base font-medium text-white ring-1 ring-white/35" onClick={onAnalyze}>
              밸런스 보기
            </button>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-[1440px] gap-7 px-4 py-7 pb-28 md:grid-cols-[1fr_1fr] md:px-8 md:py-10">
        <div>
          <SectionTitle kicker="이번 주" title="운동 요약" />
          <MetricGrid
            items={[
              { label: "운동", value: loading ? "-" : `${weekStats.count}` },
              { label: "세트", value: loading ? "-" : `${weekStats.sets}` },
              { label: "시간", value: loading ? "-" : `${weekStats.minutes}분` },
              { label: "부하", value: loading ? "-" : `${Math.round(weekStats.volume)}` },
            ]}
          />
          <div className="mt-7 border-t border-[#cacacb] pt-5">
            <p className="text-sm font-medium text-[#707072]">추천 루틴</p>
            <h2 className="mt-2 text-2xl font-semibold">{recommendedRoutine}</h2>
            <p className="mt-2 text-sm leading-6 text-[#39393b]">{routineNote(recommendedRoutine)}</p>
            <button className="mt-5 h-12 w-full rounded-full bg-[#111111] px-8 text-base font-medium text-white md:w-auto" onClick={onStart}>
              이 루틴으로 시작
            </button>
          </div>
        </div>

        <div className="grid gap-7">
          <FlatPanel title={recent ? recent.routineName : "아직 기록이 없어요"} kicker="최근 기록">
            {recent ? (
              <div>
                <p className="text-sm font-medium text-[#707072]">{formatDate(recent.date)}</p>
                <div className="mt-4 grid grid-cols-3 gap-2">
                  <SmallStudioStat label="세트" value={`${sessionStats(recent).totalSets}`} />
                  <SmallStudioStat label="운동" value={`${sessionStats(recent).exercises}`} />
                  <SmallStudioStat label="시간" value={`${recent.durationMinutes}`} />
                </div>
              </div>
            ) : (
              <EmptyState text="첫 운동을 기록하면 이곳에 최근 일지가 표시됩니다." action="첫 운동 기록" onClick={onStart} />
            )}
          </FlatPanel>
          <FlatPanel title={topToday.length ? "오늘의 자극" : "이번 주 자극"} kicker="근육 지도">
            <BodyMap scores={topToday.length ? topToday : topWeek} />
          </FlatPanel>
        </div>
      </section>
    </>
  );
}

function WorkoutView({
  routineName,
  setRoutineName,
  draftDate,
  setDraftDate,
  draftDuration,
  setDraftDuration,
  draftMemo,
  setDraftMemo,
  draftSets,
  selectedExercise,
  setSelectedExercise,
  addSet,
  removeSet,
  updateDraftSet,
  currentDraftScores,
  finishWorkout,
  saving,
}: {
  routineName: string;
  setRoutineName: (value: string) => void;
  draftDate: string;
  setDraftDate: (value: string) => void;
  draftDuration: string;
  setDraftDuration: (value: string) => void;
  draftMemo: string;
  setDraftMemo: (value: string) => void;
  draftSets: DraftSet[];
  selectedExercise: string;
  setSelectedExercise: (value: string) => void;
  addSet: (exerciseId?: string) => void;
  removeSet: (index: number) => void;
  updateDraftSet: (index: number, patch: Partial<DraftSet>) => void;
  currentDraftScores: Array<Muscle & { score: number }>;
  finishWorkout: () => void | Promise<void>;
  saving: boolean;
}) {
  const grouped = useMemo(() => {
    const map = new Map<string, Array<{ set: DraftSet; index: number }>>();
    draftSets.forEach((set, index) => {
      const exercise = exerciseById.get(set.exerciseId);
      const name = exercise?.name || "운동";
      map.set(name, [...(map.get(name) || []), { set, index }]);
    });
    return Array.from(map.entries());
  }, [draftSets]);

  return (
    <section className="mx-auto grid max-w-[1440px] gap-7 px-4 py-7 pb-28 md:grid-cols-[minmax(0,1fr)_360px] md:px-8 md:py-10">
      <div>
        <SectionTitle kicker="운동 기록" title="오늘 운동" />
        <div className="mb-6 grid gap-3">
          <Field label="루틴">
            <select className="nike-input" value={routineName} onChange={event => setRoutineName(event.target.value)}>
              {ROUTINES.map(routine => <option key={routine.label}>{routine.label}</option>)}
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="날짜">
              <input className="nike-input" type="date" value={draftDate} onChange={event => setDraftDate(event.target.value)} />
            </Field>
            <Field label="시간">
              <input className="nike-input" inputMode="numeric" value={draftDuration} onChange={event => setDraftDuration(event.target.value)} />
            </Field>
          </div>
        </div>

        <div className="border-y border-[#cacacb]">
          <div className="grid gap-3 border-b border-[#e5e5e5] py-5">
            <div>
              <p className="text-sm font-medium text-[#707072]">세트 입력</p>
              <h2 className="text-2xl font-semibold">{routineName}</h2>
            </div>
            <div className="grid grid-cols-[1fr_auto] gap-2">
              <select className="nike-input h-12 min-w-0" value={selectedExercise} onChange={event => setSelectedExercise(event.target.value)}>
                {EXERCISES.map(exercise => <option key={exercise.id} value={exercise.id}>{exercise.name}</option>)}
              </select>
              <button className="h-12 rounded-full bg-[#111111] px-5 text-sm font-medium text-white" onClick={() => addSet()}>
                추가
              </button>
            </div>
          </div>

          {grouped.map(([exerciseName, sets]) => {
            const exercise = exerciseById.get(sets[0]?.set.exerciseId || "");
            return (
              <div key={exerciseName} className="border-b border-[#e5e5e5] py-5 last:border-b-0">
                <div className="mb-4 flex items-center justify-between gap-4">
                  <div>
                    <h3 className="text-xl font-semibold">{exerciseName}</h3>
                    <p className="text-sm font-medium text-[#707072]">{exercise?.category} / 휴식 {exercise?.defaultRestSeconds || 0}초</p>
                  </div>
                  <button className="h-10 rounded-full bg-[#111111] px-4 text-sm font-medium text-white" onClick={() => addSet(exercise?.id)}>
                    +1
                  </button>
                </div>
                <div className="grid gap-2">
                  {sets.map(({ set, index }, visibleIndex) => {
                    const isTime = exercise?.type === "time";
                    return (
                      <div key={`${set.exerciseId}-${index}`} className="grid grid-cols-[34px_1fr_1fr_40px] items-end gap-2 bg-[#f5f5f5] p-2">
                        <div className="pb-3 text-center text-sm font-medium text-[#707072]">{visibleIndex + 1}</div>
                        <Field label={isTime ? "강도" : "KG"} compact>
                          <input className="nike-input bg-white px-3" inputMode="decimal" value={set.weight} onChange={event => updateDraftSet(index, { weight: event.target.value })} placeholder={isTime ? "보통" : "0"} />
                        </Field>
                        <Field label={isTime ? "분" : "횟수"} compact>
                          <input className="nike-input bg-white px-3" inputMode="numeric" value={set.reps} onChange={event => updateDraftSet(index, { reps: event.target.value })} placeholder={isTime ? "10" : "12"} />
                        </Field>
                        <button className="mb-1 h-10 rounded-full bg-white text-sm font-medium text-[#d30005]" onClick={() => removeSet(index)} aria-label="세트 삭제">
                          X
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <aside className="grid gap-6 self-start">
        <FlatPanel title="예상 자극" kicker="입력 중">
          <BodyMap scores={currentDraftScores} />
        </FlatPanel>
        <div className="bg-[#f5f5f5] p-5">
          <Field label="메모">
            <textarea className="nike-input min-h-28 resize-none bg-white" value={draftMemo} onChange={event => setDraftMemo(event.target.value)} placeholder="컨디션, 통증, 다음에 기억할 점을 적어주세요." />
          </Field>
          <button className="mt-5 h-12 w-full rounded-full bg-[#111111] text-base font-medium text-white disabled:opacity-50" onClick={finishWorkout} disabled={saving}>
            {saving ? "저장 중..." : "운동 저장"}
          </button>
        </div>
      </aside>
    </section>
  );
}

function HistoryView({ loading, sessions, deleteSession }: { loading: boolean; sessions: WorkoutSession[]; deleteSession: (id: string) => void }) {
  return (
    <section className="mx-auto max-w-[1440px] px-4 py-7 pb-28 md:px-8 md:py-10">
      <SectionTitle kicker="운동 일지" title="기록 모아보기" />
      {loading ? (
        <EmptyState text="운동 기록을 불러오는 중입니다." />
      ) : sessions.length === 0 ? (
        <EmptyState text="아직 저장된 운동 기록이 없어요. 첫 운동을 기록해 보세요." />
      ) : (
        <div className="grid gap-7 md:grid-cols-2 lg:grid-cols-3">
          {sessions.map(session => {
            const stats = sessionStats(session);
            const scores = scoreSessions([session]).filter(item => item.score > 0).slice(0, 3);
            return (
              <article key={session.id} className="border-t border-[#cacacb] pt-5">
                <div className="bg-[#f5f5f5] p-5">
                  <p className="text-sm font-medium text-[#707072]">{formatDate(session.date)}</p>
                  <h3 className="mt-2 text-2xl font-semibold">{session.routineName}</h3>
                  <div className="mt-6 grid grid-cols-3 gap-2">
                    <SmallStudioStat label="세트" value={`${stats.totalSets}`} />
                    <SmallStudioStat label="운동" value={`${stats.exercises}`} />
                    <SmallStudioStat label="시간" value={`${session.durationMinutes}`} />
                  </div>
                  {session.memo && <p className="mt-5 line-clamp-3 text-sm leading-6 text-[#39393b]">{session.memo}</p>}
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {scores.map(score => (
                    <span key={score.id} className="rounded-full bg-[#f5f5f5] px-3 py-1 text-xs font-medium text-[#111111]">
                      {score.name} {score.score}
                    </span>
                  ))}
                </div>
                <button className="mt-4 text-sm font-medium text-[#d30005] underline underline-offset-4" onClick={() => deleteSession(session.id)}>
                  삭제
                </button>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

function AnalysisView({
  weekStats,
  weeklyScores,
  todayScores,
  groupBalance,
  recommendedRoutine,
}: {
  weekStats: { count: number; sets: number; minutes: number; volume: number };
  weeklyScores: Array<Muscle & { score: number }>;
  todayScores: Array<Muscle & { score: number }>;
  groupBalance: Array<{ name: string; score: number; color: string }>;
  recommendedRoutine: string;
}) {
  const topWeek = weeklyScores.filter(item => item.score > 0);
  const topToday = todayScores.filter(item => item.score > 0);
  const missing = weeklyScores.filter(item => item.score === 0).slice(0, 3);
  const pieData = groupBalance.length ? groupBalance : [{ name: "기록 없음", score: 1, color: "#cacacb" }];

  return (
    <section className="mx-auto grid max-w-[1440px] gap-7 px-4 py-7 pb-28 md:grid-cols-[0.9fr_1.1fr] md:px-8 md:py-10">
      <div className="grid gap-7 self-start">
        <FlatPanel title={topToday.length ? "오늘 자극" : "이번 주 자극"} kicker="근육 지도">
          <BodyMap scores={topToday.length ? topToday : topWeek} />
        </FlatPanel>
        <div className="bg-[#111111] p-6 text-white">
          <p className="text-sm font-medium text-[#9e9ea0]">코치 메모</p>
          <h2 className="mt-3 text-2xl font-semibold leading-tight">
            이번 주는 {groupBalance[0]?.name || "운동 기록"} 비중이 가장 높아요.
          </h2>
          <p className="mt-4 text-sm leading-6 text-white/75">
            다음 운동은 {recommendedRoutine} 루틴을 추천해요.
            {missing.length > 0 && ` 아직 부족한 부위는 ${missing.map(item => item.name).join(", ")}입니다.`}
          </p>
        </div>
      </div>

      <div className="grid gap-7">
        <MetricGrid
          items={[
            { label: "운동", value: `${weekStats.count}` },
            { label: "세트", value: `${weekStats.sets}` },
            { label: "시간", value: `${weekStats.minutes}분` },
            { label: "부하", value: `${Math.round(weekStats.volume)}` },
          ]}
        />
        <FlatPanel title="부위 밸런스" kicker="이번 주">
          <DonutChart data={pieData} />
          <div className="mt-8 grid gap-2">
            {groupBalance.map(item => (
              <div key={item.name} className="flex items-center justify-between border-t border-[#e5e5e5] py-3">
                <span className="flex items-center gap-3 text-base font-medium">
                  <i className="h-3 w-3 rounded-full" style={{ background: item.color }} />
                  {item.name}
                </span>
                <span className="text-base font-medium text-[#707072]">{item.score}</span>
              </div>
            ))}
          </div>
        </FlatPanel>
        <FlatPanel title="근육 순위" kicker="자극량">
          <BarRanking data={topWeek.slice(0, 8)} />
        </FlatPanel>
      </div>
    </section>
  );
}

function ProfileView({ userEmail, sessionCount, onSignOut }: { userEmail?: string | null; sessionCount: number; onSignOut: () => void }) {
  return (
    <section className="mx-auto max-w-[960px] px-4 py-7 pb-28 md:px-8 md:py-10">
      <SectionTitle kicker="내 정보" title="계정" />
      <div className="grid gap-4 md:grid-cols-2">
        <div className="bg-[#f5f5f5] p-6">
          <p className="text-sm font-medium text-[#707072]">로그인 계정</p>
          <h2 className="mt-2 break-all text-2xl font-semibold">{userEmail || "내 계정"}</h2>
          <p className="mt-4 text-sm leading-6 text-[#39393b]">
            운동 기록은 이 계정의 클라우드 데이터로 저장됩니다.
          </p>
        </div>
        <div className="bg-[#111111] p-6 text-white">
          <p className="text-sm font-medium text-[#9e9ea0]">저장된 운동</p>
          <p className="mt-3 text-6xl font-black leading-none">{sessionCount}</p>
          <button className="mt-8 h-12 w-full rounded-full bg-white px-8 text-base font-medium text-[#111111]" onClick={onSignOut}>
            로그아웃
          </button>
        </div>
      </div>
    </section>
  );
}

function BodyMap({ scores }: { scores: Array<Muscle & { score: number }> }) {
  const activeScores = scores.filter(item => item.score > 0);
  const max = Math.max(...activeScores.map(item => item.score), 1);
  const total = activeScores.reduce((sum, item) => sum + item.score, 0) || 1;

  return (
    <div className="grid gap-5">
      <div className="bg-[#f5f5f5] p-3">
        <div className="relative mx-auto max-w-[360px] overflow-hidden bg-white">
          <img
            className="block w-full select-none"
            src="/images/muscle-body-base.png"
            alt="전체 신체 근육 지도"
            draggable={false}
          />
          {activeScores.map(item => (
            <MuscleBodyOverlay key={item.id} item={item} max={max} />
          ))}
          {activeScores.map(item => (
            <MuscleDetailCallout key={`detail-${item.id}`} item={item} max={max} total={total} />
          ))}
          {activeScores.length === 0 && (
            <div className="absolute inset-x-5 bottom-5 rounded-full bg-white/90 px-4 py-3 text-center text-sm font-semibold text-[#707072]">
              기록하면 자극 부위가 표시돼요
            </div>
          )}
        </div>
      </div>
      <div>
        <p className="mb-3 text-xs font-semibold text-[#707072]">전체 자극 대비 비율</p>
        <div className="grid gap-4">
          {activeScores.slice(0, 5).map((item, index) => <MuscleRow key={item.id} item={item} total={total} index={index} />)}
          {activeScores.length === 0 && <p className="text-base leading-7 text-[#707072]">운동을 저장하면 전체 신체 이미지 위에 자극 부위가 표시됩니다.</p>}
        </div>
      </div>
    </div>
  );
}

function MuscleBodyOverlay({ item, max }: { item: Muscle & { score: number }; max: number }) {
  const zones = MUSCLE_BODY_ZONES[item.id] || MUSCLE_BODY_ZONES[muscleIconKey(item.id, item.group)] || [];
  const ratio = Math.min(1, item.score / Math.max(max, 1));
  const opacity = 0.14 + ratio * 0.28;

  return (
    <>
      {zones.map((zone, index) => (
        <span
          key={`${item.id}-${index}`}
          className="pointer-events-none absolute bg-[#d30005] mix-blend-multiply"
          title={item.name}
          style={{
            left: `${zone.x}%`,
            top: `${zone.y}%`,
            width: `${zone.w}%`,
            height: `${zone.h}%`,
            borderRadius: `${zone.r ?? 45}%`,
            opacity,
            filter: "blur(0.2px)",
            transform: zone.rotate ? `rotate(${zone.rotate}deg)` : undefined,
          }}
        />
      ))}
    </>
  );
}

function MuscleDetailCallout({ item, max, total }: { item: Muscle & { score: number }; max: number; total: number }) {
  const position = MUSCLE_CALLOUT_POSITIONS[item.id] || MUSCLE_CALLOUT_POSITIONS[muscleIconKey(item.id, item.group)];
  if (!position) return null;

  const iconPosition = MUSCLE_ICON_POSITIONS[muscleIconKey(item.id, item.group)];
  const intensity = Math.min(1, item.score / Math.max(max, 1));
  const percent = Math.round((item.score / total) * 100);
  const size = position.size ?? 17;

  return (
    <div
      className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-white shadow-[0_0_0_1px_rgba(17,17,17,0.16)]"
      title={`${item.name} ${percent}%`}
      style={{
        left: `${position.x}%`,
        top: `${position.y}%`,
        width: `${size}%`,
        aspectRatio: "1 / 1",
        opacity: 0.82 + intensity * 0.18,
      }}
    >
      <div
        className="h-full w-full rounded-full bg-cover bg-no-repeat"
        style={{
          backgroundImage: "url('/images/muscle-focus-sheet.png')",
          backgroundSize: "400% 300%",
          backgroundPosition: `${(iconPosition.col / 3) * 100}% ${(iconPosition.row / 2) * 100}%`,
        }}
      />
      <span className="absolute -right-1 -top-1 rounded-full bg-[#111111] px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">
        {percent}%
      </span>
    </div>
  );
}

function DonutChart({ data }: { data: Array<{ name: string; score: number; color: string }> }) {
  const total = data.reduce((sum, item) => sum + item.score, 0) || 1;
  let cursor = 0;
  const stops = data.map(item => {
    const start = cursor;
    const end = cursor + (item.score / total) * 360;
    cursor = end;
    return `${item.color} ${start}deg ${end}deg`;
  }).join(", ");

  return (
    <div className="mt-6 grid place-items-center">
        <div className="grid h-52 w-52 place-items-center rounded-full" style={{ background: `conic-gradient(${stops})` }}>
        <div className="grid h-32 w-32 place-items-center rounded-full bg-white text-center">
          <div>
            <p className="text-sm font-medium text-[#707072]">합계</p>
            <p className="text-3xl font-medium">{Math.round(total)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function BarRanking({ data }: { data: Array<Muscle & { score: number }> }) {
  const total = data.reduce((sum, item) => sum + item.score, 0) || 1;
  if (data.length === 0) return <p className="mt-4 text-base leading-7 text-[#707072]">운동을 저장하면 주간 순위가 표시됩니다.</p>;
  return (
    <div className="mt-6 grid gap-4">
      {data.map(item => {
        const percent = Math.round((item.score / total) * 100);
        return (
          <div key={item.id} className="grid grid-cols-[76px_1fr_44px] items-center gap-3">
            <span className="truncate text-sm font-medium text-[#39393b]">{item.name}</span>
            <div className="h-7 bg-[#f5f5f5]">
              <div className="h-7 bg-[#111111]" style={{ width: `${Math.max(7, percent)}%` }} />
            </div>
            <span className="text-right text-sm font-medium text-[#707072]">{percent}%</span>
          </div>
        );
      })}
    </div>
  );
}

function MuscleRow({ item, total, index }: { item: Muscle & { score: number }; total: number; index: number }) {
  const percent = Math.round((item.score / total) * 100);
  const width = `${Math.max(6, percent)}%`;
  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3">
        <span className="text-sm font-medium">{index + 1}. {item.name}</span>
        <span className="text-sm font-medium text-[#707072]">{percent}%</span>
      </div>
      <div className="h-2 bg-[#f5f5f5]">
        <div className="h-2 bg-[#111111]" style={{ width }} />
      </div>
    </div>
  );
}

function MetricGrid({ items }: { items: Array<{ label: string; value: string }> }) {
  return (
    <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
      {items.map(item => (
        <div key={item.label} className="bg-[#f5f5f5] p-4">
          <p className="text-sm font-medium text-[#707072]">{item.label}</p>
          <p className="mt-4 text-3xl font-semibold leading-none">{item.value}</p>
        </div>
      ))}
    </div>
  );
}

function FlatPanel({ title, kicker, children }: { title: string; kicker: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-[#cacacb] pt-5">
      <p className="text-sm font-medium text-[#707072]">{kicker}</p>
      <h2 className="mt-1 text-2xl font-semibold">{title}</h2>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function SectionTitle({ kicker, title }: { kicker: string; title: string }) {
  return (
    <div className="mb-6">
      <p className="text-sm font-medium text-[#707072]">{kicker}</p>
      <h1 className="mt-1 text-4xl font-black leading-tight md:text-6xl">{title}</h1>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode; compact?: boolean }) {
  return (
    <label className="grid gap-2">
      <span className="text-xs font-medium text-[#707072]">{label}</span>
      {children}
    </label>
  );
}

function EmptyState({ text, action, onClick }: { text: string; action?: string; onClick?: () => void }) {
  return (
    <div className="bg-[#f5f5f5] p-6">
      <p className="max-w-md text-base leading-7 text-[#39393b]">{text}</p>
      {action && onClick && (
        <button className="mt-6 h-12 w-full rounded-full bg-[#111111] px-8 text-base font-medium text-white md:w-auto" onClick={onClick}>
          {action}
        </button>
      )}
    </div>
  );
}

function SmallStudioStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white p-3">
      <p className="text-xs font-medium text-[#707072]">{label}</p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
    </div>
  );
}

function MobileTabBar({ activeTab, setActiveTab }: { activeTab: Tab; setActiveTab: (tab: Tab) => void }) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-[#e5e5e5] bg-white px-2 pb-[max(10px,env(safe-area-inset-bottom))] pt-2 md:hidden">
      <div className="grid grid-cols-5 gap-1">
        {tabItems.map(tab => (
          <button
            key={tab.id}
            className={`h-12 rounded-full text-[11px] font-medium ${activeTab === tab.id ? "bg-[#111111] text-white" : "bg-[#f5f5f5] text-[#111111]"}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </nav>
  );
}
