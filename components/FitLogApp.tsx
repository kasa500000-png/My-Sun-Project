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

const MUSCLES: Muscle[] = [
  { id: "chest", name: "Chest", group: "Upper", color: "#111111" },
  { id: "back", name: "Back", group: "Upper", color: "#39393b" },
  { id: "shoulders", name: "Shoulders", group: "Upper", color: "#707072" },
  { id: "biceps", name: "Biceps", group: "Arms", color: "#9e9ea0" },
  { id: "triceps", name: "Triceps", group: "Arms", color: "#4b4b4d" },
  { id: "core", name: "Core", group: "Core", color: "#007d48" },
  { id: "quads", name: "Quads", group: "Lower", color: "#111111" },
  { id: "glutes", name: "Glutes", group: "Lower", color: "#d30005" },
  { id: "hamstrings", name: "Hamstrings", group: "Lower", color: "#39393b" },
  { id: "calves", name: "Calves", group: "Lower", color: "#707072" },
  { id: "cardio", name: "Cardio", group: "Cardio", color: "#1151ff" },
];

const EXERCISES: Exercise[] = [
  {
    id: "squat",
    name: "Squat",
    category: "Lower",
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
    name: "Leg Press",
    category: "Lower",
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
    name: "Hip Thrust",
    category: "Lower",
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
    name: "Lat Pulldown",
    category: "Back",
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
    name: "Seated Row",
    category: "Back",
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
    name: "Bench Press",
    category: "Chest",
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
    name: "Push-Up",
    category: "Chest",
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
    name: "Shoulder Press",
    category: "Shoulders",
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
    name: "Lateral Raise",
    category: "Shoulders",
    type: "weight",
    defaultRestSeconds: 45,
    impacts: [{ muscleId: "shoulders", impactRatio: 1 }],
  },
  {
    id: "plank",
    name: "Plank",
    category: "Core",
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
    name: "Running",
    category: "Cardio",
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
    name: "Stair Climber",
    category: "Cardio",
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
    label: "Lower Body",
    note: "Glute, quad, and hamstring strength.",
    exercises: ["squat", "leg-press", "hip-thrust", "stair-climber"],
  },
  {
    name: "UPPER BALANCE",
    label: "Upper Balance",
    note: "Back, chest, and shoulder balance.",
    exercises: ["lat-pulldown", "seated-row", "bench-press", "shoulder-press"],
  },
  {
    name: "CORE RESET",
    label: "Core Reset",
    note: "Core stability with easy conditioning.",
    exercises: ["plank", "push-up", "running"],
  },
];

const tabItems: Array<{ id: Tab; label: string }> = [
  { id: "home", label: "Home" },
  { id: "train", label: "Train" },
  { id: "log", label: "Log" },
  { id: "balance", label: "Balance" },
  { id: "member", label: "Member" },
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
  return new Intl.DateTimeFormat("en", {
    month: "short",
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
      if (!res.ok) throw new Error(data.error || "Could not load training logs.");
      setSessions(Array.isArray(data.sessions) ? data.sessions : []);
    } catch (error) {
      setToast(error instanceof Error ? error.message : "Could not load training logs.");
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
    if (lowGroups.includes("Upper")) return "Upper Balance";
    if (lowGroups.includes("Core")) return "Core Reset";
    return "Lower Body";
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
      setToast("Enter at least one set before saving.");
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
      if (!res.ok) throw new Error(data.error || "Could not save this workout.");
      setSessions(items => [data.session, ...items]);
      setDraftMemo("");
      setDraftSets(defaultDraft(routineName));
      setActiveTab("balance");
      setToast("Workout saved to Supabase.");
    } catch (error) {
      setToast(error instanceof Error ? error.message : "Could not save this workout.");
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
      setToast(data.error || "Could not delete this log.");
      return;
    }
    setSessions(items => items.filter(item => item.id !== id));
    setToast("Training log deleted.");
  }

  async function signOut() {
    const supabase = createSupabaseBrowser();
    await supabase?.auth.signOut();
    window.location.href = "/login";
  }

  return (
    <main className="min-h-screen bg-white text-[#111111]">
      <UtilityBar userEmail={userEmail} onSignOut={signOut} />
      <PrimaryNav activeTab={activeTab} setActiveTab={setActiveTab} />

      {activeTab === "home" && (
        <HomeView
          loading={loadingSessions}
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

function UtilityBar({ userEmail, onSignOut }: { userEmail?: string | null; onSignOut: () => void }) {
  return (
    <div className="hidden h-9 items-center justify-between bg-[#f5f5f5] px-8 text-xs font-medium text-[#111111] md:flex">
      <span>MYSUN FIT LOG</span>
      <div className="flex items-center gap-4">
        <span className="max-w-[260px] truncate">{userEmail || "SIGNED IN"}</span>
        <button className="underline underline-offset-4" onClick={onSignOut}>Sign Out</button>
      </div>
    </div>
  );
}

function PrimaryNav({ activeTab, setActiveTab }: { activeTab: Tab; setActiveTab: (tab: Tab) => void }) {
  return (
    <header className="sticky top-0 z-30 border-b border-[#e5e5e5] bg-white">
      <div className="mx-auto flex h-16 max-w-[1440px] items-center justify-between px-4 md:px-8">
        <button className="grid h-10 w-10 place-items-center rounded-full bg-[#f5f5f5] text-sm font-medium md:hidden" onClick={() => setActiveTab("home")}>
          MS
        </button>
        <button className="hidden text-xl font-black md:block" onClick={() => setActiveTab("home")}>MYSUN</button>
        <nav className="hidden items-center gap-7 md:flex">
          {tabItems.map(tab => (
            <button
              key={tab.id}
              className={`h-16 border-b-2 text-base font-medium ${activeTab === tab.id ? "border-[#111111]" : "border-transparent"}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </nav>
        <button className="rounded-full bg-[#111111] px-5 py-2 text-sm font-medium text-white" onClick={() => setActiveTab("train")}>
          Start
        </button>
      </div>
    </header>
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
      <section className="relative min-h-[560px] overflow-hidden bg-[#111111] md:min-h-[680px]">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-90"
          style={{ backgroundImage: "url('/images/training-hero.png')" }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/72 via-black/28 to-transparent" />
        <div className="relative mx-auto flex min-h-[560px] max-w-[1440px] flex-col justify-end px-4 pb-10 text-white md:min-h-[680px] md:px-8 md:pb-16">
          <p className="text-sm font-medium uppercase text-white/75">Supabase synced training diary</p>
          <h1 className="mt-4 max-w-4xl text-[58px] font-black uppercase leading-[0.88] md:text-[108px]">
            Train. Log. Balance.
          </h1>
          <div className="mt-8 flex flex-wrap gap-3">
            <button className="h-12 rounded-full bg-white px-8 text-base font-medium text-[#111111]" onClick={onStart}>
              Start Session
            </button>
            <button className="h-12 rounded-full bg-[#111111] px-8 text-base font-medium text-white ring-1 ring-white/40" onClick={onAnalyze}>
              View Balance
            </button>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-[1440px] gap-8 px-4 py-10 pb-24 md:grid-cols-[1fr_1fr] md:px-8">
        <div>
          <SectionTitle kicker="THIS WEEK" title="Member Training" />
          <MetricGrid
            items={[
              { label: "Sessions", value: loading ? "-" : `${weekStats.count}` },
              { label: "Sets", value: loading ? "-" : `${weekStats.sets}` },
              { label: "Minutes", value: loading ? "-" : `${weekStats.minutes}` },
              { label: "Load", value: loading ? "-" : `${Math.round(weekStats.volume)}` },
            ]}
          />
          <div className="mt-8 border-t border-[#cacacb] pt-5">
            <p className="text-sm font-medium uppercase text-[#707072]">Recommended next</p>
            <h2 className="mt-2 text-3xl font-medium">{recommendedRoutine}</h2>
            <p className="mt-3 max-w-xl leading-7 text-[#39393b]">
              Built from the least-loaded muscle groups in the last seven days, then saved only to your Supabase account.
            </p>
            <button className="mt-6 h-12 rounded-full bg-[#111111] px-8 text-base font-medium text-white" onClick={onStart}>
              Train This
            </button>
          </div>
        </div>

        <div className="grid gap-8">
          <FlatPanel title={recent ? recent.routineName : "No logs yet"} kicker="LATEST">
            {recent ? (
              <div>
                <p className="text-sm font-medium text-[#707072]">{formatDate(recent.date)}</p>
                <div className="mt-4 grid grid-cols-3 gap-2">
                  <SmallStudioStat label="Sets" value={`${sessionStats(recent).totalSets}`} />
                  <SmallStudioStat label="Moves" value={`${sessionStats(recent).exercises}`} />
                  <SmallStudioStat label="Min" value={`${recent.durationMinutes}`} />
                </div>
              </div>
            ) : (
              <EmptyState text="Create the first training record to light up the archive and muscle balance map." action="Record First Workout" onClick={onStart} />
            )}
          </FlatPanel>
          <FlatPanel title={topToday.length ? "Today Load" : "Week Load"} kicker="BODY MAP">
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
      const name = exercise?.name || "Exercise";
      map.set(name, [...(map.get(name) || []), { set, index }]);
    });
    return Array.from(map.entries());
  }, [draftSets]);

  return (
    <section className="mx-auto grid max-w-[1440px] gap-8 px-4 py-10 pb-24 md:grid-cols-[minmax(0,1fr)_360px] md:px-8">
      <div>
        <SectionTitle kicker="TRAIN" title="Record Session" />
        <div className="mb-8 grid gap-3 md:grid-cols-3">
          <Field label="Routine">
            <select className="nike-input" value={routineName} onChange={event => setRoutineName(event.target.value)}>
              {ROUTINES.map(routine => <option key={routine.label}>{routine.label}</option>)}
            </select>
          </Field>
          <Field label="Date">
            <input className="nike-input" type="date" value={draftDate} onChange={event => setDraftDate(event.target.value)} />
          </Field>
          <Field label="Minutes">
            <input className="nike-input" inputMode="numeric" value={draftDuration} onChange={event => setDraftDuration(event.target.value)} />
          </Field>
        </div>

        <div className="border-y border-[#cacacb]">
          <div className="flex flex-col gap-3 border-b border-[#e5e5e5] py-6 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-medium uppercase text-[#707072]">Set Entry</p>
              <h2 className="text-3xl font-medium">{routineName}</h2>
            </div>
            <div className="flex gap-2">
              <select className="nike-input h-12 min-w-0" value={selectedExercise} onChange={event => setSelectedExercise(event.target.value)}>
                {EXERCISES.map(exercise => <option key={exercise.id} value={exercise.id}>{exercise.name}</option>)}
              </select>
              <button className="nike-secondary h-12 px-5" onClick={() => addSet()}>Add Set</button>
            </div>
          </div>

          {grouped.map(([exerciseName, sets]) => {
            const exercise = exerciseById.get(sets[0]?.set.exerciseId || "");
            return (
              <div key={exerciseName} className="border-b border-[#e5e5e5] py-6 last:border-b-0">
                <div className="mb-4 flex items-center justify-between gap-4">
                  <div>
                    <h3 className="text-xl font-medium">{exerciseName}</h3>
                    <p className="text-sm font-medium text-[#707072]">{exercise?.category} / Rest {exercise?.defaultRestSeconds || 0}s</p>
                  </div>
                  <button className="h-10 rounded-full bg-[#111111] px-5 text-sm font-medium text-white" onClick={() => addSet(exercise?.id)}>
                    +1
                  </button>
                </div>
                <div className="grid gap-2">
                  {sets.map(({ set, index }, visibleIndex) => {
                    const isTime = exercise?.type === "time";
                    return (
                      <div key={`${set.exerciseId}-${index}`} className="grid grid-cols-[48px_1fr_1fr_44px] items-end gap-2 bg-[#f5f5f5] p-2 md:grid-cols-[72px_1fr_1fr_44px]">
                        <div className="pb-3 text-center text-sm font-medium text-[#707072]">{visibleIndex + 1}</div>
                        <Field label={isTime ? "Effort" : "KG"} compact>
                          <input className="nike-input bg-white" inputMode="decimal" value={set.weight} onChange={event => updateDraftSet(index, { weight: event.target.value })} placeholder={isTime ? "Easy" : "0"} />
                        </Field>
                        <Field label={isTime ? "Min" : "Reps"} compact>
                          <input className="nike-input bg-white" inputMode="numeric" value={set.reps} onChange={event => updateDraftSet(index, { reps: event.target.value })} placeholder={isTime ? "10" : "12"} />
                        </Field>
                        <button className="mb-1 h-10 rounded-full bg-white text-sm font-medium text-[#d30005]" onClick={() => removeSet(index)} aria-label="Remove set">
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
        <FlatPanel title="Live Muscle Load" kicker="Draft">
          <BodyMap scores={currentDraftScores} />
        </FlatPanel>
        <div className="bg-[#f5f5f5] p-5">
          <Field label="Memo">
            <textarea className="nike-input min-h-28 resize-none bg-white" value={draftMemo} onChange={event => setDraftMemo(event.target.value)} placeholder="Energy, soreness, or notes for next time." />
          </Field>
          <button className="mt-5 h-12 w-full rounded-full bg-[#111111] text-base font-medium text-white disabled:opacity-50" onClick={finishWorkout} disabled={saving}>
            {saving ? "Saving..." : "Finish Workout"}
          </button>
        </div>
      </aside>
    </section>
  );
}

function HistoryView({ loading, sessions, deleteSession }: { loading: boolean; sessions: WorkoutSession[]; deleteSession: (id: string) => void }) {
  return (
    <section className="mx-auto max-w-[1440px] px-4 py-10 pb-24 md:px-8">
      <SectionTitle kicker="LOG" title="Training Archive" />
      {loading ? (
        <EmptyState text="Loading your Supabase training logs." />
      ) : sessions.length === 0 ? (
        <EmptyState text="No saved workouts yet. Record the first session to build your archive." />
      ) : (
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {sessions.map(session => {
            const stats = sessionStats(session);
            const scores = scoreSessions([session]).filter(item => item.score > 0).slice(0, 3);
            return (
              <article key={session.id} className="border-t border-[#cacacb] pt-5">
                <div className="aspect-square bg-[#f5f5f5] p-5">
                  <p className="text-sm font-medium text-[#707072]">{formatDate(session.date)}</p>
                  <h3 className="mt-2 text-2xl font-medium">{session.routineName}</h3>
                  <div className="mt-8 grid grid-cols-3 gap-2">
                    <SmallStudioStat label="Sets" value={`${stats.totalSets}`} />
                    <SmallStudioStat label="Moves" value={`${stats.exercises}`} />
                    <SmallStudioStat label="Min" value={`${session.durationMinutes}`} />
                  </div>
                  {session.memo && <p className="mt-6 line-clamp-3 text-sm leading-6 text-[#39393b]">{session.memo}</p>}
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {scores.map(score => (
                    <span key={score.id} className="rounded-full bg-[#f5f5f5] px-3 py-1 text-xs font-medium text-[#111111]">
                      {score.name} {score.score}
                    </span>
                  ))}
                </div>
                <button className="mt-4 text-sm font-medium text-[#d30005] underline underline-offset-4" onClick={() => deleteSession(session.id)}>
                  Delete
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
  const pieData = groupBalance.length ? groupBalance : [{ name: "No logs", score: 1, color: "#cacacb" }];

  return (
    <section className="mx-auto grid max-w-[1440px] gap-8 px-4 py-10 pb-24 md:grid-cols-[0.9fr_1.1fr] md:px-8">
      <div className="grid gap-8 self-start">
        <FlatPanel title={topToday.length ? "Today Load" : "Week Load"} kicker="Body Map">
          <BodyMap scores={topToday.length ? topToday : topWeek} />
        </FlatPanel>
        <div className="bg-[#111111] p-6 text-white md:p-8">
          <p className="text-sm font-medium uppercase text-[#9e9ea0]">Coach Note</p>
          <h2 className="mt-3 text-3xl font-medium leading-tight">
            {groupBalance[0]?.name || "Training"} carries the highest load this week.
          </h2>
          <p className="mt-4 leading-7 text-white/75">
            A good next session is {recommendedRoutine}.
            {missing.length > 0 && ` Still untouched: ${missing.map(item => item.name).join(", ")}.`}
          </p>
        </div>
      </div>

      <div className="grid gap-8">
        <MetricGrid
          items={[
            { label: "Sessions", value: `${weekStats.count}` },
            { label: "Sets", value: `${weekStats.sets}` },
            { label: "Minutes", value: `${weekStats.minutes}` },
            { label: "Load", value: `${Math.round(weekStats.volume)}` },
          ]}
        />
        <FlatPanel title="Part Balance" kicker="This Week">
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
        <FlatPanel title="Muscle Ranking" kicker="Top Load">
          <BarRanking data={topWeek.slice(0, 8)} />
        </FlatPanel>
      </div>
    </section>
  );
}

function ProfileView({ userEmail, sessionCount, onSignOut }: { userEmail?: string | null; sessionCount: number; onSignOut: () => void }) {
  return (
    <section className="mx-auto max-w-[960px] px-4 py-10 pb-24 md:px-8">
      <SectionTitle kicker="MEMBER" title="Account" />
      <div className="grid gap-8 md:grid-cols-2">
        <div className="bg-[#f5f5f5] p-6">
          <p className="text-sm font-medium uppercase text-[#707072]">Signed in</p>
          <h2 className="mt-2 break-all text-2xl font-medium">{userEmail || "Supabase Account"}</h2>
          <p className="mt-4 leading-7 text-[#39393b]">
            Every workout is tied to this Supabase user. The app no longer stores backup workout data in local browser storage.
          </p>
        </div>
        <div className="bg-[#111111] p-6 text-white">
          <p className="text-sm font-medium uppercase text-[#9e9ea0]">Saved Sessions</p>
          <p className="mt-3 text-7xl font-black leading-none">{sessionCount}</p>
          <button className="mt-8 h-12 rounded-full bg-white px-8 text-base font-medium text-[#111111]" onClick={onSignOut}>
            Sign Out
          </button>
        </div>
      </div>
    </section>
  );
}

function BodyMap({ scores }: { scores: Array<Muscle & { score: number }> }) {
  const scoreMap = new Map(scores.map(item => [item.id, item.score]));
  const max = Math.max(...scores.map(item => item.score), 1);
  const intensity = (ids: string[]) => {
    const value = ids.reduce((sum, id) => sum + (scoreMap.get(id) || 0), 0);
    return Math.min(1, value / max);
  };
  const color = (ids: string[]) => {
    const v = intensity(ids);
    if (v <= 0) return "#e5e5e5";
    if (v < 0.25) return "#9e9ea0";
    if (v < 0.55) return "#707072";
    if (v < 0.8) return "#39393b";
    return "#111111";
  };

  return (
    <div className="grid gap-8 md:grid-cols-[150px_1fr] md:items-center">
      <div className="relative mx-auto h-64 w-32">
        <div className="absolute left-1/2 top-0 h-12 w-12 -translate-x-1/2 rounded-full bg-[#cacacb]" />
        <div className="absolute left-1/2 top-14 h-24 w-20 -translate-x-1/2 rounded-[36px]" style={{ background: color(["chest", "back", "core"]) }} />
        <div className="absolute left-[7px] top-[76px] h-24 w-7 rotate-12 rounded-full" style={{ background: color(["shoulders", "biceps", "triceps"]) }} />
        <div className="absolute right-[7px] top-[76px] h-24 w-7 -rotate-12 rounded-full" style={{ background: color(["shoulders", "biceps", "triceps"]) }} />
        <div className="absolute left-[37px] top-[132px] h-28 w-8 rotate-3 rounded-full" style={{ background: color(["quads", "hamstrings", "glutes"]) }} />
        <div className="absolute right-[37px] top-[132px] h-28 w-8 -rotate-3 rounded-full" style={{ background: color(["quads", "hamstrings", "glutes"]) }} />
      </div>
      <div className="grid gap-4">
        {scores.slice(0, 5).map((item, index) => <MuscleRow key={item.id} item={item} max={max} index={index} />)}
        {scores.length === 0 && <p className="text-base leading-7 text-[#707072]">Save a workout and the muscle map will fill in here.</p>}
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
    <div className="mt-6 grid place-items-center">
      <div className="grid h-56 w-56 place-items-center rounded-full" style={{ background: `conic-gradient(${stops})` }}>
        <div className="grid h-32 w-32 place-items-center rounded-full bg-white text-center">
          <div>
            <p className="text-sm font-medium text-[#707072]">Total</p>
            <p className="text-3xl font-medium">{Math.round(total)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function BarRanking({ data }: { data: Array<Muscle & { score: number }> }) {
  const max = Math.max(...data.map(item => item.score), 1);
  if (data.length === 0) return <p className="mt-4 text-base leading-7 text-[#707072]">Save workouts and the weekly ranking will appear here.</p>;
  return (
    <div className="mt-6 grid gap-4">
      {data.map(item => (
        <div key={item.id} className="grid grid-cols-[92px_1fr_48px] items-center gap-3">
          <span className="truncate text-sm font-medium text-[#39393b]">{item.name}</span>
          <div className="h-7 bg-[#f5f5f5]">
            <div className="h-7 bg-[#111111]" style={{ width: `${Math.max(7, (item.score / max) * 100)}%` }} />
          </div>
          <span className="text-right text-sm font-medium text-[#707072]">{item.score}</span>
        </div>
      ))}
    </div>
  );
}

function MuscleRow({ item, max, index }: { item: Muscle & { score: number }; max: number; index: number }) {
  const width = `${Math.max(8, (item.score / Math.max(max, 1)) * 100)}%`;
  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3">
        <span className="text-sm font-medium">{index + 1}. {item.name}</span>
        <span className="text-sm font-medium text-[#707072]">{item.score}</span>
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
        <div key={item.label} className="bg-[#f5f5f5] p-5">
          <p className="text-sm font-medium text-[#707072]">{item.label}</p>
          <p className="mt-4 text-4xl font-medium leading-none">{item.value}</p>
        </div>
      ))}
    </div>
  );
}

function FlatPanel({ title, kicker, children }: { title: string; kicker: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-[#cacacb] pt-5">
      <p className="text-sm font-medium uppercase text-[#707072]">{kicker}</p>
      <h2 className="mt-1 text-3xl font-medium">{title}</h2>
      <div className="mt-6">{children}</div>
    </section>
  );
}

function SectionTitle({ kicker, title }: { kicker: string; title: string }) {
  return (
    <div className="mb-8">
      <p className="text-sm font-medium uppercase text-[#707072]">{kicker}</p>
      <h1 className="mt-1 text-5xl font-black uppercase leading-[0.9] md:text-7xl">{title}</h1>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode; compact?: boolean }) {
  return (
    <label className="grid gap-2">
      <span className="text-xs font-medium uppercase text-[#707072]">{label}</span>
      {children}
    </label>
  );
}

function EmptyState({ text, action, onClick }: { text: string; action?: string; onClick?: () => void }) {
  return (
    <div className="bg-[#f5f5f5] p-8">
      <p className="max-w-md text-base leading-7 text-[#39393b]">{text}</p>
      {action && onClick && (
        <button className="mt-6 h-12 rounded-full bg-[#111111] px-8 text-base font-medium text-white" onClick={onClick}>
          {action}
        </button>
      )}
    </div>
  );
}

function SmallStudioStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white p-3">
      <p className="text-xs font-medium uppercase text-[#707072]">{label}</p>
      <p className="mt-2 text-2xl font-medium">{value}</p>
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
