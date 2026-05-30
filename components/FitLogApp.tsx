"use client";

import { useEffect, useMemo, useState } from "react";
import { createSupabaseBrowser } from "@/lib/supabase-browser";

type Tab = "home" | "workout" | "history" | "analysis" | "profile";
type ExerciseType = "weight" | "time" | "distance" | "bodyweight";

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

type SyncMode = "checking" | "cloud" | "local";

const STORAGE_KEY = "hari-fit-log-v1";

const MUSCLES: Muscle[] = [
  { id: "chest", name: "가슴", group: "상체", color: "#f97373" },
  { id: "back", name: "등", group: "상체", color: "#4697d6" },
  { id: "shoulders", name: "어깨", group: "상체", color: "#62b889" },
  { id: "biceps", name: "이두", group: "팔", color: "#9b8ae8" },
  { id: "triceps", name: "삼두", group: "팔", color: "#e4a548" },
  { id: "core", name: "복부/코어", group: "몸통", color: "#35b5a4" },
  { id: "quads", name: "대퇴사두근", group: "하체", color: "#f05d8a" },
  { id: "glutes", name: "둔근", group: "하체", color: "#d175c6" },
  { id: "hamstrings", name: "햄스트링", group: "하체", color: "#7fbe52" },
  { id: "calves", name: "종아리", group: "하체", color: "#d39c43" },
  { id: "cardio", name: "전신/유산소", group: "전신", color: "#4f9ef7" },
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
    name: "하체 루틴",
    note: "둔근과 허벅지 중심",
    exercises: ["squat", "leg-press", "hip-thrust", "stair-climber"],
  },
  {
    name: "상체 밸런스",
    note: "등, 가슴, 어깨를 가볍게",
    exercises: ["lat-pulldown", "seated-row", "bench-press", "shoulder-press"],
  },
  {
    name: "코어 회복",
    note: "짧게 움직이는 날",
    exercises: ["plank", "push-up", "running"],
  },
];

const SAMPLE_SESSIONS: WorkoutSession[] = [
  {
    id: "sample-1",
    date: daysAgo(1),
    routineName: "하체 루틴",
    durationMinutes: 48,
    memo: "레그 프레스가 안정적이었고 힙 쓰러스트 자극이 좋았음.",
    sets: [
      { id: "s1", exerciseId: "squat", setNumber: 1, weight: 20, reps: 15 },
      { id: "s2", exerciseId: "squat", setNumber: 2, weight: 30, reps: 12 },
      { id: "s3", exerciseId: "squat", setNumber: 3, weight: 35, reps: 10 },
      { id: "s4", exerciseId: "hip-thrust", setNumber: 1, weight: 40, reps: 12 },
      { id: "s5", exerciseId: "hip-thrust", setNumber: 2, weight: 50, reps: 10 },
      { id: "s6", exerciseId: "stair-climber", setNumber: 1, durationSeconds: 720, reps: 1 },
    ],
  },
  {
    id: "sample-2",
    date: daysAgo(4),
    routineName: "상체 밸런스",
    durationMinutes: 42,
    memo: "등 위주로 진행. 다음에는 어깨 볼륨을 조금 더.",
    sets: [
      { id: "s7", exerciseId: "lat-pulldown", setNumber: 1, weight: 25, reps: 12 },
      { id: "s8", exerciseId: "lat-pulldown", setNumber: 2, weight: 30, reps: 10 },
      { id: "s9", exerciseId: "seated-row", setNumber: 1, weight: 25, reps: 12 },
      { id: "s10", exerciseId: "bench-press", setNumber: 1, weight: 15, reps: 12 },
      { id: "s11", exerciseId: "shoulder-press", setNumber: 1, weight: 12, reps: 10 },
    ],
  },
];

function daysAgo(days: number) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return toDateInput(date);
}

function toDateInput(date: Date) {
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}

function today() {
  return toDateInput(new Date());
}

function byId<T extends { id: string }>(items: T[]) {
  return new Map(items.map(item => [item.id, item]));
}

const exerciseById = byId(EXERCISES);
const muscleById = byId(MUSCLES);

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
  return MUSCLES.map(muscle => ({
    ...muscle,
    score: Math.round(scores.get(muscle.id) || 0),
  })).sort((a, b) => b.score - a.score);
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

function relativeDay(date: string) {
  const diff = Math.round((new Date(`${today()}T00:00:00`).getTime() - new Date(`${date}T00:00:00`).getTime()) / 86400000);
  if (diff === 0) return "오늘";
  if (diff === 1) return "어제";
  return `${diff}일 전`;
}

function defaultDraft(routineName = ROUTINES[0].name): DraftSet[] {
  const routine = ROUTINES.find(item => item.name === routineName) || ROUTINES[0];
  return routine.exercises.flatMap(exerciseId => [
    { exerciseId, weight: "", reps: "", memo: "" },
    { exerciseId, weight: "", reps: "", memo: "" },
  ]);
}

function useBodyScroll() {
  useEffect(() => {
    const prevBody = document.body.style.overflow;
    const prevHtml = document.documentElement.style.overflow;
    document.body.style.overflow = "auto";
    document.documentElement.style.overflow = "auto";
    return () => {
      document.body.style.overflow = prevBody;
      document.documentElement.style.overflow = prevHtml;
    };
  }, []);
}

export default function FitLogApp() {
  useBodyScroll();
  const [activeTab, setActiveTab] = useState<Tab>("home");
  const [sessions, setSessions] = useState<WorkoutSession[]>(SAMPLE_SESSIONS);
  const [userId, setUserId] = useState("");
  const [syncMode, setSyncMode] = useState<SyncMode>("checking");
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [routineName, setRoutineName] = useState(ROUTINES[0].name);
  const [draftDate, setDraftDate] = useState(today());
  const [draftDuration, setDraftDuration] = useState("45");
  const [draftMemo, setDraftMemo] = useState("");
  const [draftSets, setDraftSets] = useState<DraftSet[]>(() => defaultDraft());
  const [selectedExercise, setSelectedExercise] = useState(EXERCISES[0].id);
  const [toast, setToast] = useState("");

  useEffect(() => {
    const supabase = createSupabaseBrowser();
    if (!supabase) {
      setSyncMode("local");
      return;
    }
    supabase.auth.getUser().then(({ data }) => {
      const nextUserId = data.user?.id || "";
      setUserId(nextUserId);
      setSyncMode(nextUserId ? "cloud" : "local");
    }).catch(() => {
      setSyncMode("local");
    });
  }, []);

  useEffect(() => {
    if (syncMode === "checking") return;
    if (syncMode === "cloud" && userId) {
      setLoadingSessions(true);
      fetch(`/api/fit-log?user_id=${encodeURIComponent(userId)}`)
        .then(res => res.json().then(data => ({ ok: res.ok, data })))
        .then(({ ok, data }) => {
          if (!ok) throw new Error(data.error || "운동 기록을 불러오지 못했어요.");
          setSessions(Array.isArray(data.sessions) ? data.sessions : []);
        })
        .catch(error => {
          setToast(error instanceof Error ? error.message : "운동 기록을 불러오지 못했어요.");
          setSessions([]);
        })
        .finally(() => setLoadingSessions(false));
      return;
    }

    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      setLoadingSessions(false);
      return;
    }
    try {
      const parsed = JSON.parse(raw) as WorkoutSession[];
      if (Array.isArray(parsed)) setSessions(parsed);
    } catch {
      setSessions(SAMPLE_SESSIONS);
    }
    setLoadingSessions(false);
  }, [syncMode, userId]);

  useEffect(() => {
    if (syncMode === "local") {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
    }
  }, [sessions, syncMode]);

  useEffect(() => {
    const next = defaultDraft(routineName);
    setDraftSets(next);
    setSelectedExercise(next[0]?.exerciseId || EXERCISES[0].id);
  }, [routineName]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 2600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const sortedSessions = useMemo(
    () => [...sessions].sort((a, b) => b.date.localeCompare(a.date)),
    [sessions],
  );
  const weekSessions = useMemo(() => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 6);
    const cutoffText = toDateInput(cutoff);
    return sessions.filter(session => session.date >= cutoffText);
  }, [sessions]);
  const todaySessions = useMemo(() => sessions.filter(session => session.date === today()), [sessions]);
  const weeklyScores = useMemo(() => scoreSessions(weekSessions), [weekSessions]);
  const todayScores = useMemo(() => scoreSessions(todaySessions), [todaySessions]);
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
    if (lowGroups.includes("몸통")) return "코어 회복";
    return "하체 루틴";
  }, [weeklyScores]);

  const topToday = todayScores.filter(item => item.score > 0).slice(0, 3);
  const topWeek = weeklyScores.filter(item => item.score > 0).slice(0, 5);
  const groupBalance = groupScores(weeklyScores).filter(item => item.score > 0);

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

    if (syncMode === "cloud" && userId) {
      try {
        const res = await fetch("/api/fit-log", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...nextSession, user_id: userId }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "운동 기록 저장에 실패했어요.");
        setSessions(items => [data.session, ...items]);
        setToast("Supabase에 운동 기록을 저장했어요.");
      } catch (error) {
        setToast(error instanceof Error ? error.message : "운동 기록 저장에 실패했어요.");
        return;
      }
    } else {
      setSessions(items => [nextSession, ...items]);
      setToast("운동 기록 저장 완료. 오늘의 근육 분석이 업데이트됐어요.");
    }

    setDraftMemo("");
    setDraftSets(defaultDraft(routineName));
    setActiveTab("analysis");
  }

  async function deleteSession(id: string) {
    if (syncMode === "cloud" && userId) {
      const res = await fetch(`/api/fit-log?id=${encodeURIComponent(id)}&user_id=${encodeURIComponent(userId)}`, {
        method: "DELETE",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setToast(data.error || "기록 삭제에 실패했어요.");
        return;
      }
    }
    setSessions(items => items.filter(item => item.id !== id));
    setToast("기록을 삭제했어요.");
  }

  function resetDemo() {
    setSessions(SAMPLE_SESSIONS);
    setToast("샘플 기록으로 다시 채웠어요.");
  }

  return (
    <main className="min-h-screen bg-[#f7f3ec] text-[#20231f]">
      <div className="mx-auto flex min-h-screen w-full max-w-[1180px] flex-col pb-24 md:pb-8">
        <TopBar syncMode={syncMode} loadingSessions={loadingSessions} />

        {activeTab === "home" && (
          <HomeView
            weekStats={weekStats}
            recent={sortedSessions[0]}
            topToday={topToday}
            topWeek={topWeek}
            recommendedRoutine={recommendedRoutine}
            onStart={() => {
              setRoutineName(recommendedRoutine);
              setActiveTab("workout");
            }}
          />
        )}

        {activeTab === "workout" && (
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
          />
        )}

        {activeTab === "history" && (
          <HistoryView sessions={sortedSessions} deleteSession={deleteSession} />
        )}

        {activeTab === "analysis" && (
          <AnalysisView
            weekStats={weekStats}
            weeklyScores={weeklyScores}
            todayScores={todayScores}
            groupBalance={groupBalance}
            recommendedRoutine={recommendedRoutine}
          />
        )}

        {activeTab === "profile" && (
          <ProfileView resetDemo={resetDemo} sessionCount={sessions.length} syncMode={syncMode} />
        )}
      </div>

      <TabBar activeTab={activeTab} setActiveTab={setActiveTab} />

      {toast && (
        <div className="fixed bottom-24 left-1/2 z-50 w-[calc(100vw-28px)] max-w-sm -translate-x-1/2 rounded-full bg-[#20231f] px-5 py-3 text-center text-sm font-bold text-white shadow-xl">
          {toast}
        </div>
      )}
    </main>
  );
}

function TopBar({ syncMode, loadingSessions }: { syncMode: SyncMode; loadingSessions: boolean }) {
  return (
    <header className="sticky top-0 z-20 flex items-center justify-between gap-4 bg-[#f7f3ec]/90 px-4 py-4 backdrop-blur md:px-6">
      <div>
        <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#63a889]">Fit Diary</p>
        <h1 className="text-2xl font-black text-[#20382f]">하루핏 로그</h1>
      </div>
      <div className="rounded-full border border-[#d9d0c3] bg-white px-4 py-2 text-right shadow-sm">
        <p className="text-[11px] font-bold text-[#8b8175]">
          {loadingSessions || syncMode === "checking" ? "동기화 확인" : syncMode === "cloud" ? "Supabase 연결" : "로컬 저장"}
        </p>
        <p className="text-sm font-black text-[#20382f]">{formatDate(today())}</p>
      </div>
    </header>
  );
}

function HomeView({
  weekStats,
  recent,
  topToday,
  topWeek,
  recommendedRoutine,
  onStart,
}: {
  weekStats: { count: number; sets: number; minutes: number; volume: number };
  recent?: WorkoutSession;
  topToday: Array<Muscle & { score: number }>;
  topWeek: Array<Muscle & { score: number }>;
  recommendedRoutine: string;
  onStart: () => void;
}) {
  return (
    <section className="grid gap-5 px-4 md:grid-cols-[1.15fr_0.85fr] md:px-6">
      <div className="rounded-b-[28px] bg-[#20382f] px-5 py-7 text-white shadow-lg md:rounded-[28px] md:p-8">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-[#a9d8c2]">오늘의 운동</p>
        <h2 className="mt-3 max-w-lg text-3xl font-black leading-tight md:text-5xl">
          오늘 몸이 어디를 썼는지 바로 보여줄게요.
        </h2>
        <p className="mt-4 max-w-xl text-sm leading-6 text-white/70">
          세트와 무게를 기록하면 근육별 사용량과 주간 밸런스를 자동으로 계산합니다.
        </p>
        <button
          className="mt-6 h-12 rounded-full bg-[#ff7f66] px-6 text-sm font-black text-white shadow-lg transition hover:brightness-105"
          onClick={onStart}
        >
          운동 시작하기
        </button>
      </div>

      <div className="grid gap-3">
        <MetricStrip
          items={[
            { label: "이번 주 운동", value: `${weekStats.count}회` },
            { label: "총 세트", value: `${weekStats.sets}세트` },
            { label: "운동 시간", value: `${weekStats.minutes}분` },
          ]}
        />
        <div className="rounded-2xl border border-[#e1d8cd] bg-white p-5 shadow-sm">
          <p className="text-xs font-black uppercase tracking-[0.14em] text-[#8b8175]">추천 루틴</p>
          <div className="mt-3 flex items-center justify-between gap-4">
            <div>
              <h3 className="text-xl font-black text-[#20382f]">{recommendedRoutine}</h3>
              <p className="mt-1 text-sm text-[#70685f]">이번 주 부족한 부위를 채우는 방향이에요.</p>
            </div>
            <span className="rounded-full bg-[#dff2ea] px-3 py-2 text-xs font-black text-[#1f7b5c]">추천</span>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-[#e1d8cd] bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.14em] text-[#8b8175]">최근 기록</p>
            <h3 className="mt-1 text-xl font-black text-[#20382f]">
              {recent ? recent.routineName : "아직 기록이 없어요"}
            </h3>
          </div>
          {recent && <span className="text-sm font-bold text-[#70685f]">{relativeDay(recent.date)}</span>}
        </div>
        {recent ? (
          <div className="mt-4 grid grid-cols-3 gap-2">
            {[
              { label: "세트", value: `${sessionStats(recent).totalSets}` },
              { label: "운동", value: `${sessionStats(recent).exercises}` },
              { label: "분", value: `${recent.durationMinutes}` },
            ].map(item => (
              <div key={item.label} className="rounded-xl bg-[#f7f3ec] p-3">
                <p className="text-xs font-bold text-[#8b8175]">{item.label}</p>
                <p className="mt-1 text-lg font-black text-[#20382f]">{item.value}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-4 text-sm text-[#70685f]">첫 운동을 저장하면 여기에 최근 기록이 표시됩니다.</p>
        )}
      </div>

      <div className="rounded-2xl border border-[#e1d8cd] bg-white p-5 shadow-sm">
        <p className="text-xs font-black uppercase tracking-[0.14em] text-[#8b8175]">근육 사용 요약</p>
        <div className="mt-4 grid gap-3">
          {(topToday.length ? topToday : topWeek).slice(0, 4).map((item, index) => (
            <MuscleRow key={item.id} item={item} max={(topToday[0] || topWeek[0])?.score || 1} index={index} />
          ))}
        </div>
      </div>
    </section>
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
    <section className="grid gap-5 px-4 md:grid-cols-[minmax(0,1fr)_340px] md:px-6">
      <div className="grid gap-4">
        <div className="rounded-2xl border border-[#e1d8cd] bg-white p-5 shadow-sm">
          <div className="grid gap-3 md:grid-cols-3">
            <label className="grid gap-2">
              <span className="text-xs font-black text-[#70685f]">루틴</span>
              <select className="h-11 rounded-xl border border-[#d9d0c3] bg-[#fbfaf7] px-3 font-bold outline-none" value={routineName} onChange={event => setRoutineName(event.target.value)}>
                {ROUTINES.map(routine => (
                  <option key={routine.name}>{routine.name}</option>
                ))}
              </select>
            </label>
            <label className="grid gap-2">
              <span className="text-xs font-black text-[#70685f]">날짜</span>
              <input className="h-11 rounded-xl border border-[#d9d0c3] bg-[#fbfaf7] px-3 font-bold outline-none" type="date" value={draftDate} onChange={event => setDraftDate(event.target.value)} />
            </label>
            <label className="grid gap-2">
              <span className="text-xs font-black text-[#70685f]">운동 시간</span>
              <input className="h-11 rounded-xl border border-[#d9d0c3] bg-[#fbfaf7] px-3 font-bold outline-none" inputMode="numeric" value={draftDuration} onChange={event => setDraftDuration(event.target.value)} />
            </label>
          </div>
        </div>

        <div className="rounded-2xl border border-[#e1d8cd] bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.14em] text-[#8b8175]">세트 입력</p>
              <h2 className="mt-1 text-2xl font-black text-[#20382f]">{routineName}</h2>
            </div>
            <div className="flex gap-2">
              <select className="h-11 min-w-0 rounded-full border border-[#d9d0c3] bg-[#fbfaf7] px-3 text-sm font-bold outline-none" value={selectedExercise} onChange={event => setSelectedExercise(event.target.value)}>
                {EXERCISES.map(exercise => (
                  <option key={exercise.id} value={exercise.id}>{exercise.name}</option>
                ))}
              </select>
              <button className="h-11 rounded-full border border-[#20382f] px-4 text-sm font-black text-[#20382f]" onClick={() => addSet()}>
                세트 추가
              </button>
            </div>
          </div>

          <div className="mt-5 grid gap-5">
            {grouped.map(([exerciseName, sets]) => {
              const exercise = exerciseById.get(sets[0]?.set.exerciseId || "");
              return (
                <div key={exerciseName} className="border-t border-[#eee7dc] pt-4 first:border-t-0 first:pt-0">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div>
                      <h3 className="font-black text-[#20382f]">{exerciseName}</h3>
                      <p className="text-xs font-bold text-[#8b8175]">{exercise?.category} · 휴식 {exercise?.defaultRestSeconds || 0}초</p>
                    </div>
                    <button className="rounded-full bg-[#dff2ea] px-3 py-2 text-xs font-black text-[#1f7b5c]" onClick={() => addSet(exercise?.id)}>
                      +1
                    </button>
                  </div>
                  <div className="grid gap-2">
                    {sets.map(({ set, index }, visibleIndex) => {
                      const isTime = exercise?.type === "time";
                      return (
                        <div key={`${set.exerciseId}-${index}`} className="grid grid-cols-[42px_1fr_1fr_38px] items-end gap-2 rounded-xl bg-[#fbfaf7] p-2">
                          <div className="pb-3 text-center text-xs font-black text-[#8b8175]">{visibleIndex + 1}세트</div>
                          <label className="grid gap-1">
                            <span className="text-[11px] font-black text-[#8b8175]">{isTime ? "강도" : "kg"}</span>
                            <input className="h-10 min-w-0 rounded-lg border border-[#e1d8cd] bg-white px-3 font-black outline-none" inputMode="decimal" value={set.weight} onChange={event => updateDraftSet(index, { weight: event.target.value })} placeholder={isTime ? "보통" : "0"} />
                          </label>
                          <label className="grid gap-1">
                            <span className="text-[11px] font-black text-[#8b8175]">{isTime ? "분" : "횟수"}</span>
                            <input className="h-10 min-w-0 rounded-lg border border-[#e1d8cd] bg-white px-3 font-black outline-none" inputMode="numeric" value={set.reps} onChange={event => updateDraftSet(index, { reps: event.target.value })} placeholder={isTime ? "10" : "12"} />
                          </label>
                          <button className="mb-1 h-9 rounded-full bg-[#f4dfdb] text-sm font-black text-[#af4f42]" onClick={() => removeSet(index)} aria-label="세트 삭제">
                            x
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
      </div>

      <aside className="grid gap-4 self-start">
        <BodyMap scores={currentDraftScores} title="입력 중인 자극" />
        <div className="rounded-2xl border border-[#e1d8cd] bg-white p-5 shadow-sm">
          <label className="grid gap-2">
            <span className="text-xs font-black uppercase tracking-[0.14em] text-[#8b8175]">메모</span>
            <textarea className="min-h-24 rounded-xl border border-[#d9d0c3] bg-[#fbfaf7] p-3 text-sm outline-none" value={draftMemo} onChange={event => setDraftMemo(event.target.value)} placeholder="컨디션, 자극, 통증 여부를 짧게 남겨요." />
          </label>
          <button className="mt-4 h-12 w-full rounded-full bg-[#ff7f66] px-5 text-sm font-black text-white shadow-lg" onClick={finishWorkout}>
            운동 완료
          </button>
        </div>
      </aside>
    </section>
  );
}

function HistoryView({ sessions, deleteSession }: { sessions: WorkoutSession[]; deleteSession: (id: string) => void }) {
  return (
    <section className="grid gap-4 px-4 md:px-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.14em] text-[#8b8175]">기록</p>
          <h2 className="text-2xl font-black text-[#20382f]">날짜별 운동 일지</h2>
        </div>
        <span className="rounded-full bg-white px-4 py-2 text-sm font-black text-[#20382f] shadow-sm">{sessions.length}개</span>
      </div>
      <div className="grid gap-3">
        {sessions.map(session => {
          const stats = sessionStats(session);
          const scores = scoreSessions([session]).filter(item => item.score > 0).slice(0, 3);
          return (
            <article key={session.id} className="rounded-2xl border border-[#e1d8cd] bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="text-xs font-black text-[#8b8175]">{formatDate(session.date)} · {relativeDay(session.date)}</p>
                  <h3 className="mt-1 text-xl font-black text-[#20382f]">{session.routineName}</h3>
                  {session.memo && <p className="mt-2 text-sm leading-6 text-[#70685f]">{session.memo}</p>}
                </div>
                <button className="self-start rounded-full border border-[#e8c8bf] px-3 py-2 text-xs font-black text-[#af4f42]" onClick={() => deleteSession(session.id)}>
                  삭제
                </button>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2">
                <SmallStat label="세트" value={`${stats.totalSets}`} />
                <SmallStat label="운동 수" value={`${stats.exercises}`} />
                <SmallStat label="시간" value={`${session.durationMinutes}분`} />
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {scores.map(score => (
                  <span key={score.id} className="rounded-full px-3 py-2 text-xs font-black text-white" style={{ background: score.color }}>
                    {score.name} {score.score}
                  </span>
                ))}
              </div>
            </article>
          );
        })}
      </div>
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
  const pieData = groupBalance.length ? groupBalance : [{ name: "기록 없음", score: 1, color: "#c9c1b7" }];

  return (
    <section className="grid gap-5 px-4 md:grid-cols-[0.95fr_1.05fr] md:px-6">
      <div className="grid gap-4">
        <BodyMap scores={topToday.length ? topToday : topWeek} title={topToday.length ? "오늘의 근육 사용" : "이번 주 근육 사용"} />
        <div className="rounded-2xl border border-[#e1d8cd] bg-white p-5 shadow-sm">
          <p className="text-xs font-black uppercase tracking-[0.14em] text-[#8b8175]">피드백</p>
          <h3 className="mt-2 text-xl font-black text-[#20382f]">
            이번 주는 {groupBalance[0]?.name || "운동 기록"} 비중이 가장 높아요.
          </h3>
          <p className="mt-3 text-sm leading-6 text-[#70685f]">
            다음 운동은 <b className="text-[#20382f]">{recommendedRoutine}</b>으로 밸런스를 맞추면 좋아요.
            {missing.length > 0 && ` 아직 ${missing.map(item => item.name).join(", ")} 기록이 부족해요.`}
          </p>
        </div>
      </div>

      <div className="grid gap-4">
        <MetricStrip
          items={[
            { label: "주간 운동", value: `${weekStats.count}회` },
            { label: "주간 세트", value: `${weekStats.sets}` },
            { label: "볼륨 점수", value: `${Math.round(weekStats.volume)}` },
          ]}
        />
        <div className="rounded-2xl border border-[#e1d8cd] bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.14em] text-[#8b8175]">주간 밸런스</p>
              <h3 className="mt-1 text-xl font-black text-[#20382f]">부위별 비중</h3>
            </div>
          </div>
          <DonutChart data={pieData} />
          <div className="grid gap-2">
            {groupBalance.map(item => (
              <div key={item.name} className="flex items-center justify-between rounded-xl bg-[#fbfaf7] px-3 py-2">
                <span className="flex items-center gap-2 text-sm font-black text-[#20382f]">
                  <i className="h-3 w-3 rounded-full" style={{ background: item.color }} />
                  {item.name}
                </span>
                <span className="text-sm font-black text-[#70685f]">{item.score}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-[#e1d8cd] bg-white p-5 shadow-sm">
          <p className="text-xs font-black uppercase tracking-[0.14em] text-[#8b8175]">근육 랭킹</p>
          <BarRanking data={topWeek.slice(0, 8)} />
        </div>
      </div>
    </section>
  );
}

function ProfileView({ resetDemo, sessionCount, syncMode }: { resetDemo: () => void; sessionCount: number; syncMode: SyncMode }) {
  return (
    <section className="grid gap-4 px-4 md:grid-cols-2 md:px-6">
      <div className="rounded-2xl border border-[#e1d8cd] bg-white p-5 shadow-sm">
        <p className="text-xs font-black uppercase tracking-[0.14em] text-[#8b8175]">마이페이지</p>
        <h2 className="mt-2 text-2xl font-black text-[#20382f]">
          {syncMode === "cloud" ? "Supabase 동기화 중" : "로컬 MVP 설정"}
        </h2>
        <p className="mt-3 text-sm leading-6 text-[#70685f]">
          {syncMode === "cloud"
            ? "로그인된 계정 기준으로 운동 기록을 Supabase에 저장합니다. 휴대폰과 웹에서 같은 기록을 이어볼 수 있어요."
            : "로그인 전에는 브라우저 localStorage에 저장합니다. Supabase 계정으로 로그인하면 클라우드 저장을 사용할 수 있어요."}
        </p>
        {syncMode !== "cloud" && (
          <a className="mt-4 inline-flex h-11 items-center rounded-full bg-[#20382f] px-5 text-sm font-black text-white" href="/login">
            로그인하고 동기화
          </a>
        )}
      </div>
      <div className="rounded-2xl border border-[#e1d8cd] bg-white p-5 shadow-sm">
        <SmallStat label="저장된 운동 기록" value={`${sessionCount}개`} />
        <button className="mt-4 h-11 rounded-full bg-[#20382f] px-5 text-sm font-black text-white" onClick={resetDemo}>
          샘플 기록 복원
        </button>
      </div>
    </section>
  );
}

function BodyMap({ scores, title }: { scores: Array<Muscle & { score: number }>; title: string }) {
  const scoreMap = new Map(scores.map(item => [item.id, item.score]));
  const max = Math.max(...scores.map(item => item.score), 1);
  const intensity = (ids: string[]) => {
    const value = ids.reduce((sum, id) => sum + (scoreMap.get(id) || 0), 0);
    return Math.min(1, value / max);
  };
  const color = (ids: string[]) => {
    const v = intensity(ids);
    if (v <= 0) return "#ece5dc";
    if (v < 0.25) return "#f8cfc7";
    if (v < 0.55) return "#ff9c83";
    if (v < 0.8) return "#f56f5f";
    return "#d94d59";
  };

  return (
    <div className="rounded-2xl border border-[#e1d8cd] bg-white p-5 shadow-sm">
      <p className="text-xs font-black uppercase tracking-[0.14em] text-[#8b8175]">Body Map</p>
      <h3 className="mt-1 text-xl font-black text-[#20382f]">{title}</h3>
      <div className="mt-5 grid grid-cols-[140px_1fr] items-center gap-5">
        <div className="relative mx-auto h-64 w-32">
          <div className="absolute left-1/2 top-0 h-12 w-12 -translate-x-1/2 rounded-full bg-[#d8c7b4]" />
          <div className="absolute left-1/2 top-14 h-24 w-20 -translate-x-1/2 rounded-[36px] border-4 border-white shadow-sm" style={{ background: color(["chest", "back", "core"]) }} />
          <div className="absolute left-[7px] top-[76px] h-24 w-7 rotate-12 rounded-full border-4 border-white shadow-sm" style={{ background: color(["shoulders", "biceps", "triceps"]) }} />
          <div className="absolute right-[7px] top-[76px] h-24 w-7 -rotate-12 rounded-full border-4 border-white shadow-sm" style={{ background: color(["shoulders", "biceps", "triceps"]) }} />
          <div className="absolute left-[37px] top-[132px] h-28 w-8 rotate-3 rounded-full border-4 border-white shadow-sm" style={{ background: color(["quads", "hamstrings", "glutes"]) }} />
          <div className="absolute right-[37px] top-[132px] h-28 w-8 -rotate-3 rounded-full border-4 border-white shadow-sm" style={{ background: color(["quads", "hamstrings", "glutes"]) }} />
        </div>
        <div className="grid gap-3">
          {scores.slice(0, 5).map((item, index) => (
            <MuscleRow key={item.id} item={item} max={max} index={index} />
          ))}
          {scores.length === 0 && <p className="text-sm leading-6 text-[#70685f]">운동을 입력하면 근육 자극 지도가 채워집니다.</p>}
        </div>
      </div>
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
    <div className="mt-5 grid place-items-center">
      <div
        className="grid h-52 w-52 place-items-center rounded-full shadow-inner"
        style={{ background: `conic-gradient(${stops || "#ece5dc 0deg 360deg"})` }}
      >
        <div className="grid h-28 w-28 place-items-center rounded-full bg-white text-center shadow-sm">
          <div>
            <p className="text-xs font-black text-[#8b8175]">총점</p>
            <p className="text-2xl font-black text-[#20382f]">{Math.round(total)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function BarRanking({ data }: { data: Array<Muscle & { score: number }> }) {
  const max = Math.max(...data.map(item => item.score), 1);
  if (data.length === 0) {
    return <p className="mt-4 rounded-xl bg-[#fbfaf7] p-4 text-sm text-[#70685f]">운동 기록을 저장하면 랭킹 차트가 표시됩니다.</p>;
  }
  return (
    <div className="mt-5 grid gap-3">
      {data.map(item => (
        <div key={item.id} className="grid grid-cols-[86px_1fr_42px] items-center gap-3">
          <span className="truncate text-sm font-black text-[#70685f]">{item.name}</span>
          <div className="h-7 overflow-hidden rounded-r-full bg-[#f0e9df]">
            <div
              className="h-7 rounded-r-full"
              style={{ width: `${Math.max(7, (item.score / max) * 100)}%`, background: item.color }}
            />
          </div>
          <span className="text-right text-xs font-black text-[#8b8175]">{item.score}</span>
        </div>
      ))}
    </div>
  );
}

function MuscleRow({ item, max, index }: { item: Muscle & { score: number }; max: number; index: number }) {
  const width = `${Math.max(8, (item.score / Math.max(max, 1)) * 100)}%`;
  return (
    <div className="grid gap-1">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-black text-[#20382f]">{index + 1}. {item.name}</span>
        <span className="text-xs font-black text-[#8b8175]">{item.score}</span>
      </div>
      <div className="h-2 rounded-full bg-[#f0e9df]">
        <div className="h-2 rounded-full" style={{ width, background: item.color }} />
      </div>
    </div>
  );
}

function MetricStrip({ items }: { items: Array<{ label: string; value: string }> }) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {items.map(item => (
        <div key={item.label} className="rounded-2xl border border-[#e1d8cd] bg-white p-4 shadow-sm">
          <p className="text-xs font-bold text-[#8b8175]">{item.label}</p>
          <p className="mt-1 text-xl font-black text-[#20382f]">{item.value}</p>
        </div>
      ))}
    </div>
  );
}

function SmallStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-[#fbfaf7] p-3">
      <p className="text-xs font-bold text-[#8b8175]">{label}</p>
      <p className="mt-1 text-lg font-black text-[#20382f]">{value}</p>
    </div>
  );
}

function TabBar({ activeTab, setActiveTab }: { activeTab: Tab; setActiveTab: (tab: Tab) => void }) {
  const tabs: Array<{ id: Tab; label: string; mark: string }> = [
    { id: "home", label: "홈", mark: "⌂" },
    { id: "workout", label: "운동", mark: "+" },
    { id: "history", label: "기록", mark: "▤" },
    { id: "analysis", label: "분석", mark: "◒" },
    { id: "profile", label: "설정", mark: "·" },
  ];
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-[#e1d8cd] bg-white/95 px-3 pb-[max(10px,env(safe-area-inset-bottom))] pt-2 shadow-[0_-10px_30px_rgba(32,35,31,0.08)] backdrop-blur md:left-1/2 md:right-auto md:w-[560px] md:-translate-x-1/2 md:rounded-t-3xl md:border">
      <div className="grid grid-cols-5 gap-1">
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`grid h-14 place-items-center rounded-2xl text-xs font-black transition ${activeTab === tab.id ? "bg-[#20382f] text-white" : "text-[#70685f]"}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <span className="text-lg leading-none">{tab.mark}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}
