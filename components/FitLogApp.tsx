"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createSupabaseBrowser } from "@/lib/supabase-browser";

const UI = {
  surface: "bg-[#f8f4f0]",
  surfaceActive: "bg-[#edf8f1]",
  surfacePressed: "active:bg-[#efe7e2]",
  card: "bg-[#fffdfb] ring-1 ring-[#e8ddd7] shadow-[0_14px_34px_rgba(58,48,50,0.06)]",
  border: "border-[#eadfda]",
  divider: "border-[#ded4cf]",
  textMuted: "text-[#7a7470]",
  textBody: "text-[#4b4541]",
  successText: "text-[#2f8c63]",
  dangerText: "text-[#c84653]",
  primaryButton: "rounded-full bg-[#242124] font-semibold text-[#fffdfb] transition disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none active:scale-[0.99]",
  secondaryButton: "rounded-full bg-[#f8f4f0] font-semibold text-[#242124] transition disabled:cursor-not-allowed disabled:opacity-45 active:bg-[#efe7e2]",
  dangerButton: "rounded-full bg-[#f8f4f0] font-semibold text-[#c84653] transition disabled:cursor-not-allowed disabled:opacity-45",
  pill: "rounded-full px-3 py-2 text-sm font-semibold",
};

const API_TIMEOUT_MS = 15000;
const DIET_ANALYZE_TIMEOUT_MS = 90000;

type Tab = "home" | "train" | "log" | "balance" | "diet" | "member";
type ExerciseType = "weight" | "time" | "bodyweight";
type VolumeType =
  | "time"
  | "standard"
  | "barbell"
  | "machine"
  | "cable"
  | "dumbbell_both"
  | "dumbbell_unilateral"
  | "bodyweight_factor"
  | "bodyweight_or_assist"
  | "bodyweight_or_added"
  | "machine_or_dumbbell"
  | "dumbbell_or_cable"
  | "barbell_or_dumbbell"
  | "barbell_or_machine"
  | "smith_machine"
  | "single_weight"
  | "weight_or_machine"
  | "dumbbell_unilateral_lower"
  | "machine_unilateral"
  | "cable_unilateral"
  | "bodyweight_factor_or_added"
  | "time_unilateral"
  | "bodyweight_or_weighted"
  | "time_or_bodyweight"
  | "weight_or_dumbbell"
  | "single_weight_unilateral"
  | "carry_both"
  | "carry_unilateral"
  | "carry_single"
  | "sled_push"
  | "time_or_distance"
  | "cardio_basic"
  | "cardio_distance"
  | "cardio_incline"
  | "cardio_level"
  | "cardio_interval"
  | "cardio_recovery";
type HistoryRange = "day" | "week" | "month" | "year";
type BodyFilter = "all" | "upper" | "lower" | "core";

const TAB_VALUES: Tab[] = ["home", "train", "log", "balance", "diet", "member"];

function tabFromSearchParam(value: string | null): Tab | null {
  return value && TAB_VALUES.includes(value as Tab) ? value as Tab : null;
}

function redirectToLoginWithCurrentPath() {
  if (typeof window === "undefined") return;
  const next = `${window.location.pathname}${window.location.search}` || "/";
  window.location.href = `/login?next=${encodeURIComponent(next)}`;
}

function apiErrorMessage(data: unknown) {
  if (typeof data !== "object" || data === null || !("error" in data)) return null;
  const message = data.error;
  return typeof message === "string" && message.trim() ? message : null;
}

function assertApiResponse(response: Response, data: unknown, fallback: string) {
  if (response.status === 401) {
    redirectToLoginWithCurrentPath();
    throw new Error(apiErrorMessage(data) || "로그인이 만료되었습니다. 다시 로그인해 주세요.");
  }

  if (!response.ok) {
    throw new Error(apiErrorMessage(data) || fallback);
  }
}

async function appFetch(input: RequestInfo | URL, init?: RequestInit, timeoutMs = API_TIMEOUT_MS) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(input, { ...init, signal: init?.signal || controller.signal });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error("응답이 지연되고 있습니다. 네트워크를 확인한 뒤 다시 시도해 주세요.");
    }
    throw new Error("네트워크 연결이 불안정합니다. 연결 상태를 확인한 뒤 다시 시도해 주세요.");
  } finally {
    window.clearTimeout(timeout);
  }
}

function useEscapeToClose(enabled: boolean, onClose: () => void) {
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [enabled, onClose]);
}

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
  subTabs?: string[];
  detail?: string;
  recordLabel?: string;
  volumeType?: VolumeType;
  bodyweightFactor?: number;
  defaultRpe?: number;
  met?: number;
};

type SetLog = {
  id: string;
  exerciseId: string;
  setNumber: number;
  bodyWeight?: number;
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
  setCount: string;
  bodyWeight?: string;
  weight: string;
  reps: string;
  memo: string;
};

type UserSettings = {
  weeklyGoal: number;
  favoriteExerciseIds: string[];
  gender: string;
  age: number | null;
  heightCm: number | null;
  weightKg: number | null;
  activityLevel: string;
};

type Muscle = {
  id: string;
  name: string;
  group: string;
  color: string;
};

type FitLogAppProps = {
  userEmail?: string | null;
};

const DEFAULT_SETTINGS: UserSettings = {
  weeklyGoal: 3,
  favoriteExerciseIds: [],
  gender: "",
  age: null,
  heightCm: null,
  weightKg: null,
  activityLevel: "",
};

type MuscleIconKey =
  | "chest"
  | "back"
  | "shoulders"
  | "biceps"
  | "triceps"
  | "arms"
  | "core"
  | "rectusAbs"
  | "obliques"
  | "transverseAbs"
  | "lowerAbs"
  | "hipFlexors"
  | "erectors"
  | "quads"
  | "adductors"
  | "glutes"
  | "abductors"
  | "hamstrings"
  | "calves"
  | "cardio"
  | "recovery"
  | "lower"
  | "upper";

type MuscleDetailShape = {
  d: string;
  fibers?: string[];
  opacity?: number;
  strokeWidth?: number;
};

const MUSCLE_FOCUS_IMAGES: Record<MuscleIconKey, string> = {
  chest: "/images/muscle-focus-cards/chest.webp",
  back: "/images/muscle-focus-cards/back.webp",
  shoulders: "/images/muscle-focus-cards/shoulders.webp",
  biceps: "/images/muscle-focus-cards/biceps.webp",
  triceps: "/images/muscle-focus-cards/triceps.webp",
  arms: "/images/muscle-focus-cards/arms.webp",
  core: "/images/muscle-focus-cards/core.webp",
  rectusAbs: "/images/muscle-focus-cards/rectusAbs.webp",
  obliques: "/images/muscle-focus-cards/obliques.webp",
  transverseAbs: "/images/muscle-focus-cards/transverseAbs.webp",
  lowerAbs: "/images/muscle-focus-cards/lowerAbs.webp",
  hipFlexors: "/images/muscle-focus-cards/hipFlexors.webp",
  erectors: "/images/muscle-focus-cards/erectors.webp",
  quads: "/images/muscle-focus-cards/quads.webp",
  adductors: "/images/muscle-focus-cards/adductors.webp",
  glutes: "/images/muscle-focus-cards/glutes.webp",
  abductors: "/images/muscle-focus-cards/abductors.webp",
  hamstrings: "/images/muscle-focus-cards/hamstrings.webp",
  calves: "/images/muscle-focus-cards/calves.webp",
  cardio: "/images/muscle-focus-cards/cardio.webp",
  recovery: "/images/muscle-focus-cards/recovery.webp",
  lower: "/images/muscle-focus-cards/lower.webp",
  upper: "/images/muscle-focus-cards/upper.webp",
};

const MUSCLE_DETAIL_SHAPES: Record<string, MuscleDetailShape[]> = {
  chest: [
    {
      d: "M18.4 25.7 C19.7 22.9 24.1 22.5 27.3 25.4 C26.6 29.5 22.4 31.2 18.5 28.9 Z",
      fibers: ["M19.4 27.2 C21.8 25.7 24.5 25.8 26.7 27.2", "M20.2 28.7 C22.2 27.8 24.1 27.9 26.1 28.8"],
    },
    {
      d: "M29.1 25.4 C32.3 22.5 36.7 22.9 38 25.7 L37.9 28.9 C34 31.2 29.8 29.5 29.1 25.4 Z",
      fibers: ["M29.7 27.2 C32 25.8 34.7 25.7 37 27.2", "M30.3 28.8 C32.3 27.9 34.3 27.8 36.3 28.7"],
    },
  ],
  back: [
    {
      d: "M62.4 24.8 C66.7 26.3 68.4 31.2 68.8 43.2 C65.6 40.9 63.1 35.4 61.5 29.4 Z",
      fibers: ["M63.4 27.1 C65.7 31.2 66.7 35.4 67.4 40.2", "M65.1 27.8 C66 32 66.4 35.5 66.5 38.4"],
    },
    {
      d: "M77.4 24.8 C73.1 26.3 71.4 31.2 71 43.2 C74.2 40.9 76.7 35.4 78.3 29.4 Z",
      fibers: ["M76.4 27.1 C74.1 31.2 73.1 35.4 72.4 40.2", "M74.7 27.8 C73.8 32 73.4 35.5 73.3 38.4"],
    },
    {
      d: "M68.9 27.1 C69.5 27.6 70.3 27.6 70.9 27.1 L70.6 46.6 C70.1 47.5 69.6 47.5 69.1 46.6 Z",
      opacity: 0.78,
    },
  ],
  shoulders: [
    { d: "M12.8 23.4 C15.5 20.4 19 21.6 20.6 24.7 C18.4 28.7 15.4 29.3 12.8 27.5 Z", fibers: ["M14 24.2 C15.6 25 17.1 25.2 19.3 24.7"] },
    { d: "M36.5 23.4 C33.8 20.4 30.3 21.6 28.7 24.7 C30.9 28.7 33.9 29.3 36.5 27.5 Z", fibers: ["M35.3 24.2 C33.7 25 32.2 25.2 30 24.7"] },
    { d: "M58 22.9 C60.9 20.5 64.4 21.7 65.7 25.1 C63.8 28.9 60.5 29.2 58 27.3 Z", fibers: ["M59.3 23.9 C61 24.9 62.7 25.1 64.4 24.7"] },
    { d: "M82.2 22.9 C79.3 20.5 75.8 21.7 74.5 25.1 C76.4 28.9 79.7 29.2 82.2 27.3 Z", fibers: ["M80.9 23.9 C79.2 24.9 77.5 25.1 75.8 24.7"] },
  ],
  biceps: [
    { d: "M10.7 32.1 C12.8 34.5 13 42.1 11.1 46.7 C9.4 42.4 9.1 35.5 10.7 32.1 Z", fibers: ["M11.1 34 C11.8 37.6 11.7 41.7 10.8 45"] },
    { d: "M42.1 32.1 C40 34.5 39.8 42.1 41.7 46.7 C43.4 42.4 43.7 35.5 42.1 32.1 Z", fibers: ["M41.7 34 C41 37.6 41.1 41.7 42 45"] },
  ],
  triceps: [
    { d: "M56 32.4 C58.1 35.1 58.3 43.4 56.1 48 C54.5 43.2 54.3 36.2 56 32.4 Z", fibers: ["M56.3 34.5 C57.1 38.5 57 42.8 56.1 46.2"] },
    { d: "M87.1 32.4 C85 35.1 84.8 43.4 87 48 C88.6 43.2 88.8 36.2 87.1 32.4 Z", fibers: ["M86.8 34.5 C86 38.5 86.1 42.8 87 46.2"] },
  ],
  core: [
    { d: "M22.3 35.1 C24.1 34 26.1 34 27.8 35.1 L27.4 39.4 C25.6 40.1 24.4 40.1 22.7 39.4 Z", fibers: ["M24.9 35.4 L24.9 39.4"] },
    { d: "M29.1 35.1 C30.8 34 32.8 34 34.6 35.1 L34.2 39.4 C32.5 40.1 31.2 40.1 29.5 39.4 Z", fibers: ["M31.9 35.4 L31.9 39.4"] },
    { d: "M22.6 40.5 C24.2 39.8 25.9 39.8 27.3 40.5 L27 44.6 C25.4 45.3 24.5 45.3 22.9 44.6 Z" },
    { d: "M29.6 40.5 C31 39.8 32.7 39.8 34.3 40.5 L34 44.6 C32.4 45.3 31.5 45.3 29.9 44.6 Z" },
    { d: "M23 45.6 C24.6 45 25.9 45 27.1 45.6 L26.8 49.8 C25.4 50.5 24.7 50.5 23.3 49.8 Z" },
    { d: "M29.8 45.6 C31 45 32.4 45 33.9 45.6 L33.6 49.8 C32.2 50.5 31.5 50.5 30.1 49.8 Z" },
    { d: "M18.9 36.6 C20.9 41.2 21.2 46.7 20.1 52.8 C17.4 48 16.5 41.2 18.9 36.6 Z", opacity: 0.72 },
    { d: "M38.1 36.6 C36.1 41.2 35.8 46.7 36.9 52.8 C39.6 48 40.5 41.2 38.1 36.6 Z", opacity: 0.72 },
  ],
  quads: [
    { d: "M18.8 55.4 C22.6 58.4 23.2 68.2 20.4 75.1 C17.5 68.8 16.9 60.1 18.8 55.4 Z", fibers: ["M19.5 58.5 C20.9 63.1 20.7 68.4 19.9 72.9"] },
    { d: "M31.3 55.4 C27.5 58.4 26.9 68.2 29.7 75.1 C32.6 68.8 33.2 60.1 31.3 55.4 Z", fibers: ["M30.6 58.5 C29.2 63.1 29.4 68.4 30.2 72.9"] },
    { d: "M23.6 56.2 C25.3 60.4 25.3 66.2 24 72.4 C22.3 66.8 22 60.8 23.6 56.2 Z", opacity: 0.76 },
    { d: "M26.7 56.2 C25 60.4 25 66.2 26.3 72.4 C28 66.8 28.3 60.8 26.7 56.2 Z", opacity: 0.76 },
  ],
  glutes: [
    { d: "M64.8 51 C66.8 47.7 70.3 47.5 72.2 50.9 C71.8 55.5 68 57.4 64.7 55 Z", fibers: ["M65.8 52.7 C67.4 51.2 69.5 51 71.2 52.5"] },
    { d: "M75.4 51 C73.4 47.7 69.9 47.5 68 50.9 C68.4 55.5 72.2 57.4 75.5 55 Z", fibers: ["M74.4 52.7 C72.8 51.2 70.7 51 69 52.5"] },
  ],
  hamstrings: [
    { d: "M66.1 60.4 C69.3 64 69 73.3 66.8 80.1 C64.6 73.6 64.2 64.4 66.1 60.4 Z", fibers: ["M66.6 63.3 C67.4 68.4 67.2 73.7 66.5 78.1"] },
    { d: "M76.4 60.4 C73.2 64 73.5 73.3 75.7 80.1 C77.9 73.6 78.3 64.4 76.4 60.4 Z", fibers: ["M75.9 63.3 C75.1 68.4 75.3 73.7 76 78.1"] },
  ],
  calves: [
    { d: "M20 75.2 C22.9 78 22.5 85.8 20.3 89.3 C18.2 85.4 17.8 79.1 20 75.2 Z", fibers: ["M20.4 78.3 C21.1 82 20.8 85.4 20.1 88"] },
    { d: "M31.5 75.2 C28.6 78 29 85.8 31.2 89.3 C33.3 85.4 33.7 79.1 31.5 75.2 Z", fibers: ["M31.1 78.3 C30.4 82 30.7 85.4 31.4 88"] },
    { d: "M66.1 77.2 C68.9 80.1 68.5 86.5 66.5 90.3 C64.2 86.5 63.9 80.4 66.1 77.2 Z" },
    { d: "M76.5 77.2 C73.7 80.1 74.1 86.5 76.1 90.3 C78.4 86.5 78.7 80.4 76.5 77.2 Z" },
  ],
  cardio: [
    { d: "M15.8 20.5 C23 16.9 35.1 17.2 41 21.4 L38.8 87.5 C32.4 90.1 22.9 90.1 16.6 87.5 Z", opacity: 0.36 },
    { d: "M59.5 20.5 C66.7 16.9 78.8 17.2 84.7 21.4 L82.5 87.5 C76.1 90.1 66.6 90.1 60.3 87.5 Z", opacity: 0.36 },
  ],
};

const MUSCLE_BODY_SHAPES: Record<string, MuscleDetailShape[]> = {
  chest: [
    {
      d: "M14.8 23.8 C18.5 20.9 25.5 21.1 28.7 25.1 C28.1 29.3 23.1 31.4 15.8 28.6 Z",
      fibers: ["M16.6 25.5 C20.2 23.8 24.3 24 27.2 25.9", "M17.4 27.9 C20.9 29.1 24.2 29 27.1 27.3"],
    },
    {
      d: "M30.2 25.1 C33.4 21.1 40.4 20.9 44.1 23.8 L43 28.6 C35.7 31.4 30.8 29.3 30.2 25.1 Z",
      fibers: ["M31.8 25.9 C34.7 24 38.8 23.8 42.4 25.5", "M31.9 27.3 C34.8 29 38.1 29.1 41.6 27.9"],
    },
  ],
  back: [
    {
      d: "M58.8 23.7 C63.4 26.2 67.3 33.8 69 42.6 C64.1 40.2 59.7 34.2 56.8 28.2 Z",
      fibers: ["M60.1 27.1 C63.3 31.1 65.6 35.5 67.4 40.1", "M62.5 26.2 C64.3 31 65.2 35.1 65.6 38.4"],
      opacity: 0.72,
    },
    {
      d: "M80.7 23.7 C76.1 26.2 72.2 33.8 70.5 42.6 C75.4 40.2 79.8 34.2 82.7 28.2 Z",
      fibers: ["M79.4 27.1 C76.2 31.1 73.9 35.5 72.1 40.1", "M77 26.2 C75.2 31 74.3 35.1 73.9 38.4"],
      opacity: 0.72,
    },
  ],
  shoulders: [
    { d: "M7.8 22.9 C10.3 20.8 14.1 21.7 16.1 24.6 C14.7 28.5 10.6 29.5 7.2 27.2 Z", fibers: ["M9 24.7 C10.9 24 13.1 24.3 14.9 25.3"], opacity: 0.86 },
    { d: "M47.1 22.9 C44.6 20.8 40.8 21.7 38.8 24.6 C40.2 28.5 44.3 29.5 47.7 27.2 Z", fibers: ["M45.9 24.7 C44 24 41.8 24.3 40 25.3"], opacity: 0.86 },
    { d: "M55.3 23.2 C58.1 21.2 61.7 22.3 63 25.1 C61.6 28.6 58 29.4 55 27 Z", fibers: ["M56.4 24.8 C58.1 24.1 60.1 24.3 61.6 25.3"], opacity: 0.74 },
    { d: "M88.8 23.2 C86 21.2 82.4 22.3 81.1 25.1 C82.5 28.6 86.1 29.4 89.1 27 Z", fibers: ["M87.7 24.8 C86 24.1 84 24.3 82.5 25.3"], opacity: 0.74 },
  ],
  biceps: [
    { d: "M7.3 30 C10.7 32.9 10.4 40.9 8.6 44.8 C6.4 40.1 5.7 33.4 7.3 30 Z", fibers: ["M8.1 32.5 C8.8 36 8.7 40.2 8.1 43.3"], opacity: 0.78 },
    { d: "M47.5 30 C44.1 32.9 44.4 40.9 46.2 44.8 C48.4 40.1 49.1 33.4 47.5 30 Z", fibers: ["M46.7 32.5 C46 36 46.1 40.2 46.7 43.3"], opacity: 0.78 },
  ],
  triceps: [
    { d: "M52.1 30.7 C55.5 33.5 55.1 40.4 53.6 43.6 C51.4 40.1 50.8 34.1 52.1 30.7 Z", fibers: ["M52.9 32.9 C53.7 36.1 53.5 39.8 53 42.4"], opacity: 0.7 },
    { d: "M91.2 30.7 C87.8 33.5 88.2 40.4 89.7 43.6 C91.9 40.1 92.5 34.1 91.2 30.7 Z", fibers: ["M90.4 32.9 C89.6 36.1 89.8 39.8 90.3 42.4"], opacity: 0.7 },
  ],
  core: [
    { d: "M22.1 31.4 C24 30.4 26.1 30.4 27.8 31.5 L27.3 35.2 C25.8 35.9 24.1 35.9 22.6 35.2 Z", fibers: ["M24.95 31.7 L24.95 35.3"] },
    { d: "M29.2 31.5 C30.9 30.4 33 30.4 34.9 31.4 L34.4 35.2 C32.9 35.9 31.2 35.9 29.7 35.2 Z", fibers: ["M32.05 31.7 L32.05 35.3"] },
    { d: "M22.6 36.3 C24.1 35.6 25.7 35.6 27.2 36.3 L26.8 40.2 C25.5 40.8 24.3 40.8 23 40.2 Z" },
    { d: "M29.8 36.3 C31.3 35.6 32.9 35.6 34.4 36.3 L34 40.2 C32.7 40.8 31.5 40.8 30.2 40.2 Z" },
    { d: "M23 41.1 C24.5 40.5 25.6 40.5 26.8 41.1 L26.4 45.3 C25.2 45.9 24.6 45.9 23.4 45.3 Z" },
    { d: "M30.2 41.1 C31.4 40.5 32.5 40.5 34 41.1 L33.6 45.3 C32.4 45.9 31.8 45.9 30.6 45.3 Z" },
    { d: "M18.2 33.6 C20.5 37.4 20.5 42.2 19.4 46.8 C16.7 43.2 16.4 37.2 18.2 33.6 Z", opacity: 0.56 },
    { d: "M39 33.6 C36.7 37.4 36.7 42.2 37.8 46.8 C40.5 43.2 40.8 37.2 39 33.6 Z", opacity: 0.56 },
  ],
  quads: [
    { d: "M16.8 45.8 C21.4 50 21.3 59.5 18.9 64.8 C15.3 59.1 14.2 50.8 16.8 45.8 Z", fibers: ["M18 49.2 C19.1 53.7 19 58.8 18.2 63"] },
    { d: "M34.5 45.8 C29.9 50 30 59.5 32.4 64.8 C36 59.1 37.1 50.8 34.5 45.8 Z", fibers: ["M33.3 49.2 C32.2 53.7 32.3 58.8 33.1 63"] },
    { d: "M23.3 46.7 C25.2 51.1 25.1 57.5 23.6 63.5 C21.9 57.8 21.6 51.7 23.3 46.7 Z", opacity: 0.62 },
    { d: "M28.4 46.7 C26.5 51.1 26.6 57.5 28.1 63.5 C29.8 57.8 30.1 51.7 28.4 46.7 Z", opacity: 0.62 },
  ],
  glutes: [
    { d: "M61.6 42.3 C64.3 38.9 71 38.9 73.6 42.5 C73.1 48.1 67.2 50.4 61.8 47.7 Z", fibers: ["M63.4 44.4 C66.4 42.1 69.8 42.1 72.1 44.6"] },
    { d: "M86.8 42.3 C84.1 38.9 77.4 38.9 74.8 42.5 C75.3 48.1 81.2 50.4 86.6 47.7 Z", fibers: ["M85 44.4 C82 42.1 78.6 42.1 76.3 44.6"] },
  ],
  hamstrings: [
    { d: "M62.9 50.2 C66.6 54.1 66.5 63 63.9 68.6 C60.8 63.3 60.3 54.5 62.9 50.2 Z", fibers: ["M63.8 53 C64.8 57.7 64.7 62.8 63.7 67"] },
    { d: "M84.7 50.2 C81 54.1 81.1 63 83.7 68.6 C86.8 63.3 87.3 54.5 84.7 50.2 Z", fibers: ["M83.8 53 C82.8 57.7 82.9 62.8 83.9 67"] },
  ],
  calves: [
    { d: "M18 63.8 C21.7 67.4 21.5 75.7 18.7 80.2 C15.7 75.5 15.6 68.2 18 63.8 Z", fibers: ["M18.7 66.8 C19.7 70.6 19.6 75.1 18.5 78.7"] },
    { d: "M33.1 63.8 C29.4 67.4 29.6 75.7 32.4 80.2 C35.4 75.5 35.5 68.2 33.1 63.8 Z", fibers: ["M32.4 66.8 C31.4 70.6 31.5 75.1 32.6 78.7"] },
    { d: "M65.4 63.8 C68.8 67.3 68.5 75.4 66 80.1 C63.2 75.4 63 68.2 65.4 63.8 Z", opacity: 0.7 },
    { d: "M81.8 63.8 C78.4 67.3 78.7 75.4 81.2 80.1 C84 75.4 84.2 68.2 81.8 63.8 Z", opacity: 0.7 },
  ],
  cardio: [
    { d: "M8.5 22.3 C17.1 18.8 36.1 19 46.8 23.4 L43.2 81.8 C33.7 85.5 20.7 85.5 10.4 81.8 Z", opacity: 0.2 },
    { d: "M54.2 22.3 C62.8 18.8 82 19 92.5 23.4 L89 81.8 C79.5 85.5 66.4 85.5 56.1 81.8 Z", opacity: 0.2 },
  ],
};

const MUSCLES: Muscle[] = [
  { id: "chest", name: "가슴", group: "상체", color: "#242124" },
  { id: "back", name: "등", group: "상체", color: "#4b4541" },
  { id: "shoulders", name: "어깨", group: "상체", color: "#7a7470" },
  { id: "biceps", name: "이두", group: "팔", color: "#9e9ea0" },
  { id: "triceps", name: "삼두", group: "팔", color: "#4b4b4d" },
  { id: "core", name: "코어", group: "코어", color: "#2f8c63" },
  { id: "rectusAbs", name: "복직근", group: "코어", color: "#242124" },
  { id: "obliques", name: "복사근", group: "코어", color: "#4b4541" },
  { id: "transverseAbs", name: "복횡근", group: "코어", color: "#2f8c63" },
  { id: "lowerAbs", name: "하복부", group: "코어", color: "#4b4b4d" },
  { id: "hipFlexors", name: "고관절굴곡근", group: "코어", color: "#7a7470" },
  { id: "erectors", name: "척추기립근", group: "코어", color: "#9e9ea0" },
  { id: "quads", name: "대퇴사두", group: "하체", color: "#242124" },
  { id: "adductors", name: "내전근", group: "하체", color: "#7a7470" },
  { id: "glutes", name: "둔근", group: "하체", color: "#c84653" },
  { id: "abductors", name: "중둔근", group: "하체", color: "#9e9ea0" },
  { id: "hamstrings", name: "햄스트링", group: "하체", color: "#4b4541" },
  { id: "calves", name: "종아리", group: "하체", color: "#7a7470" },
  { id: "cardio", name: "유산소", group: "전신", color: "#1151ff" },
  { id: "recovery", name: "회복", group: "전신", color: "#2f8c63" },
];

const UPPER_SUB_TABS = ["전체", "Push", "Pull", "어깨", "팔", "체중운동"];
const LOWER_SUB_TABS = ["전체", "대퇴사두", "햄스트링", "둔근/힙", "종아리", "체중운동", "머신"];
const CORE_SUB_TABS = ["전체", "복직근", "복사근", "하복부", "코어 안정화", "허리/기립근", "시간형"];
const FULL_BODY_SUB_TABS = ["전체", "맨몸", "덤벨/케틀벨", "고강도", "이동형", "힙/하체 중심", "상체/코어 중심"];
const CARDIO_SUB_TABS = ["전체", "걷기/러닝", "실내기구", "고강도", "저강도", "인터벌", "회복"];

const UPPER_EXERCISE_IDS = [
  "bench-press",
  "incline-dumbbell-press",
  "chest-press-machine",
  "cable-fly",
  "push-up",
  "dips",
  "lat-pulldown",
  "pull-up",
  "seated-row",
  "barbell-row",
  "one-arm-dumbbell-row",
  "dumbbell-pullover",
  "face-pull",
  "shoulder-press",
  "dumbbell-shoulder-press",
  "lateral-raise",
  "rear-delt-fly",
  "dumbbell-curl",
  "hammer-curl",
  "triceps-pushdown",
  "overhead-triceps-extension",
];

const LOWER_EXERCISE_IDS = [
  "squat",
  "leg-press",
  "leg-extension",
  "leg-curl",
  "romanian-deadlift",
  "hip-thrust",
  "hip-abduction",
  "hip-adduction",
  "bulgarian-split-squat",
  "lunge",
  "step-up",
  "glute-kickback",
  "cable-kickback",
  "smith-machine-squat",
  "goblet-squat",
  "calf-raise",
  "hip-bridge",
  "walking-lunge",
  "sumo-squat",
  "back-extension",
];

const CORE_EXERCISE_IDS = [
  "plank",
  "side-plank",
  "crunch",
  "sit-up",
  "leg-raise",
  "hanging-leg-raise",
  "russian-twist",
  "bicycle-crunch",
  "mountain-climber",
  "dead-bug",
  "bird-dog",
  "heel-touch",
  "cable-crunch",
  "flutter-kick",
  "v-up",
  "toe-touch",
  "plank-shoulder-tap",
  "hollow-body-hold",
  "ab-slide",
  "back-extension",
  "superman",
];

const FULL_BODY_EXERCISE_IDS = [
  "burpee",
  "mountain-climber",
  "jumping-jack",
  "squat-jump",
  "inchworm",
  "bear-crawl",
  "plank-to-push-up",
  "push-up-shoulder-tap",
  "kettlebell-swing",
  "dumbbell-thruster",
  "clean-and-press",
  "deadlift",
  "snatch",
  "medicine-ball-slam",
  "battle-rope",
  "farmers-walk",
  "suitcase-carry",
  "sandbag-carry",
  "sled-push",
  "turkish-get-up",
];

const CARDIO_EXERCISE_IDS = [
  "walking",
  "brisk-walking",
  "running",
  "treadmill-walking",
  "treadmill-running",
  "indoor-cycle",
  "outdoor-bike",
  "stepmill",
  "elliptical",
  "rowing-machine",
  "stair-climber",
  "jump-rope",
  "interval-running",
  "hiit",
  "stair-climbing",
  "hiking",
  "swimming",
  "dance-cardio",
  "boxing-cardio",
  "recovery-walking",
];

function isUpperRoutineTab(routine: { label: string; value: string }) {
  return routine.value === "상체 밸런스" || routine.label === "상체";
}

function isLowerRoutineTab(routine: { label: string; value: string }) {
  return routine.value === "하체 집중" || routine.label === "하체";
}

function isCoreRoutineTab(routine: { label: string; value: string }) {
  return routine.value === "코어 리셋" || routine.label === "코어";
}

function isFullBodyRoutineTab(routine: { label: string; value: string }) {
  return routine.value === "전신" || routine.label === "전신";
}

function isCardioRoutineTab(routine: { label: string; value: string }) {
  return routine.value === "유산소" || routine.label === "유산소";
}

function routineSubTabs(routine: { label: string; value: string }) {
  if (isUpperRoutineTab(routine)) return UPPER_SUB_TABS;
  if (isLowerRoutineTab(routine)) return LOWER_SUB_TABS;
  if (isCoreRoutineTab(routine)) return CORE_SUB_TABS;
  if (isFullBodyRoutineTab(routine)) return FULL_BODY_SUB_TABS;
  if (isCardioRoutineTab(routine)) return CARDIO_SUB_TABS;
  return [];
}

const EXERCISES: Exercise[] = [
  {
    id: "squat",
    name: "스쿼트",
    category: "하체",
    type: "weight",
    defaultRestSeconds: 120,
    subTabs: ["대퇴사두", "둔근/힙"],
    detail: "대퇴사두 · 둔근 중심",
    recordLabel: "바벨 총 중량 × 횟수 × 세트",
    volumeType: "barbell",
    impacts: [
      { muscleId: "quads", impactRatio: 0.45 },
      { muscleId: "glutes", impactRatio: 0.3 },
      { muscleId: "hamstrings", impactRatio: 0.15 },
      { muscleId: "core", impactRatio: 0.1 },
    ],
  },
  {
    id: "leg-press",
    name: "레그 프레스",
    category: "하체",
    type: "weight",
    defaultRestSeconds: 90,
    subTabs: ["대퇴사두", "머신"],
    detail: "대퇴사두 · 둔근 중심",
    recordLabel: "머신 중량 × 횟수 × 세트",
    volumeType: "machine",
    impacts: [
      { muscleId: "quads", impactRatio: 0.5 },
      { muscleId: "glutes", impactRatio: 0.3 },
      { muscleId: "hamstrings", impactRatio: 0.15 },
      { muscleId: "calves", impactRatio: 0.05 },
    ],
  },
  {
    id: "leg-extension",
    name: "레그 익스텐션",
    category: "하체",
    type: "weight",
    defaultRestSeconds: 60,
    subTabs: ["대퇴사두", "머신"],
    detail: "대퇴사두 중심",
    recordLabel: "머신 중량 × 횟수 × 세트",
    volumeType: "machine",
    impacts: [
      { muscleId: "quads", impactRatio: 0.95 },
      { muscleId: "core", impactRatio: 0.05 },
    ],
  },
  {
    id: "leg-curl",
    name: "레그 컬",
    category: "하체",
    type: "weight",
    defaultRestSeconds: 60,
    subTabs: ["햄스트링", "머신"],
    detail: "햄스트링 중심",
    recordLabel: "머신 중량 × 횟수 × 세트",
    volumeType: "machine",
    impacts: [
      { muscleId: "hamstrings", impactRatio: 0.9 },
      { muscleId: "calves", impactRatio: 0.1 },
    ],
  },
  {
    id: "romanian-deadlift",
    name: "루마니안 데드리프트",
    category: "하체",
    type: "weight",
    defaultRestSeconds: 90,
    subTabs: ["햄스트링", "둔근/힙"],
    detail: "햄스트링 · 둔근 중심",
    recordLabel: "중량 × 횟수 × 세트",
    volumeType: "barbell_or_dumbbell",
    impacts: [
      { muscleId: "hamstrings", impactRatio: 0.4 },
      { muscleId: "glutes", impactRatio: 0.35 },
      { muscleId: "back", impactRatio: 0.15 },
      { muscleId: "core", impactRatio: 0.1 },
    ],
  },
  {
    id: "hip-thrust",
    name: "힙 쓰러스트",
    category: "하체",
    type: "weight",
    defaultRestSeconds: 90,
    subTabs: ["둔근/힙"],
    detail: "둔근 중심",
    recordLabel: "중량 × 횟수 × 세트",
    volumeType: "barbell_or_machine",
    impacts: [
      { muscleId: "glutes", impactRatio: 0.75 },
      { muscleId: "hamstrings", impactRatio: 0.15 },
      { muscleId: "core", impactRatio: 0.1 },
    ],
  },
  {
    id: "hip-adduction",
    name: "힙 어덕션",
    category: "하체",
    type: "weight",
    defaultRestSeconds: 60,
    subTabs: ["둔근/힙", "머신"],
    detail: "내전근 · 안쪽 허벅지 중심",
    recordLabel: "머신 중량 × 횟수 × 세트",
    volumeType: "machine",
    impacts: [
      { muscleId: "adductors", impactRatio: 0.8 },
      { muscleId: "quads", impactRatio: 0.1 },
      { muscleId: "core", impactRatio: 0.1 },
    ],
  },
  {
    id: "hip-abduction",
    name: "힙 어브덕션",
    category: "하체",
    type: "weight",
    defaultRestSeconds: 60,
    subTabs: ["둔근/힙", "머신"],
    detail: "중둔근 · 측면힙 중심",
    recordLabel: "머신 중량 × 횟수 × 세트",
    volumeType: "machine",
    impacts: [
      { muscleId: "abductors", impactRatio: 0.8 },
      { muscleId: "glutes", impactRatio: 0.2 },
    ],
  },
  {
    id: "bulgarian-split-squat",
    name: "불가리안 스플릿 스쿼트",
    category: "하체",
    type: "weight",
    defaultRestSeconds: 90,
    subTabs: ["둔근/힙", "대퇴사두", "체중운동"],
    detail: "둔근 · 대퇴사두 중심",
    recordLabel: "덤벨 한 손 중량 × 2 × 한쪽 횟수 × 세트 × 좌우",
    volumeType: "dumbbell_unilateral_lower",
    impacts: [
      { muscleId: "glutes", impactRatio: 0.4 },
      { muscleId: "quads", impactRatio: 0.35 },
      { muscleId: "hamstrings", impactRatio: 0.15 },
      { muscleId: "core", impactRatio: 0.1 },
    ],
  },
  {
    id: "lunge",
    name: "런지",
    category: "하체",
    type: "weight",
    defaultRestSeconds: 75,
    subTabs: ["대퇴사두", "둔근/힙", "체중운동"],
    detail: "둔근 · 대퇴사두 중심",
    recordLabel: "덤벨 한 손 중량 × 2 × 한쪽 횟수 × 세트 × 좌우",
    volumeType: "dumbbell_unilateral_lower",
    impacts: [
      { muscleId: "glutes", impactRatio: 0.35 },
      { muscleId: "quads", impactRatio: 0.35 },
      { muscleId: "hamstrings", impactRatio: 0.2 },
      { muscleId: "core", impactRatio: 0.1 },
    ],
  },
  {
    id: "step-up",
    name: "스텝업",
    category: "하체",
    type: "weight",
    defaultRestSeconds: 75,
    subTabs: ["둔근/힙", "대퇴사두", "체중운동"],
    detail: "둔근 · 대퇴사두 중심",
    recordLabel: "덤벨 한 손 중량 × 2 × 한쪽 횟수 × 세트 × 좌우",
    volumeType: "dumbbell_unilateral_lower",
    impacts: [
      { muscleId: "glutes", impactRatio: 0.4 },
      { muscleId: "quads", impactRatio: 0.35 },
      { muscleId: "hamstrings", impactRatio: 0.15 },
      { muscleId: "core", impactRatio: 0.1 },
    ],
  },
  {
    id: "glute-kickback",
    name: "글루트 킥백",
    category: "하체",
    type: "weight",
    defaultRestSeconds: 60,
    subTabs: ["둔근/힙", "머신"],
    detail: "둔근 중심",
    recordLabel: "머신 중량 × 한쪽 횟수 × 세트 × 좌우",
    volumeType: "machine_unilateral",
    impacts: [
      { muscleId: "glutes", impactRatio: 0.8 },
      { muscleId: "hamstrings", impactRatio: 0.1 },
      { muscleId: "core", impactRatio: 0.1 },
    ],
  },
  {
    id: "cable-kickback",
    name: "케이블 킥백",
    category: "하체",
    type: "weight",
    defaultRestSeconds: 60,
    subTabs: ["둔근/힙"],
    detail: "둔근 중심",
    recordLabel: "케이블 중량 × 한쪽 횟수 × 세트 × 좌우",
    volumeType: "cable_unilateral",
    impacts: [
      { muscleId: "glutes", impactRatio: 0.8 },
      { muscleId: "hamstrings", impactRatio: 0.1 },
      { muscleId: "core", impactRatio: 0.1 },
    ],
  },
  {
    id: "smith-machine-squat",
    name: "스미스머신 스쿼트",
    category: "하체",
    type: "weight",
    defaultRestSeconds: 90,
    subTabs: ["대퇴사두", "둔근/힙", "머신"],
    detail: "대퇴사두 · 둔근 중심",
    recordLabel: "스미스머신 총 중량 × 횟수 × 세트",
    volumeType: "smith_machine",
    impacts: [
      { muscleId: "quads", impactRatio: 0.45 },
      { muscleId: "glutes", impactRatio: 0.35 },
      { muscleId: "hamstrings", impactRatio: 0.1 },
      { muscleId: "core", impactRatio: 0.1 },
    ],
  },
  {
    id: "goblet-squat",
    name: "고블릿 스쿼트",
    category: "하체",
    type: "weight",
    defaultRestSeconds: 75,
    subTabs: ["대퇴사두", "둔근/힙", "체중운동"],
    detail: "대퇴사두 · 둔근 중심",
    recordLabel: "양손으로 든 총 중량 × 횟수 × 세트",
    volumeType: "single_weight",
    impacts: [
      { muscleId: "quads", impactRatio: 0.45 },
      { muscleId: "glutes", impactRatio: 0.3 },
      { muscleId: "core", impactRatio: 0.15 },
      { muscleId: "adductors", impactRatio: 0.1 },
    ],
  },
  {
    id: "calf-raise",
    name: "카프 레이즈",
    category: "하체",
    type: "weight",
    defaultRestSeconds: 60,
    subTabs: ["종아리", "머신"],
    detail: "종아리 중심",
    recordLabel: "중량 × 횟수 × 세트",
    volumeType: "weight_or_machine",
    impacts: [
      { muscleId: "calves", impactRatio: 1 },
    ],
  },
  {
    id: "hip-bridge",
    name: "힙 브릿지",
    category: "하체",
    type: "bodyweight",
    defaultRestSeconds: 60,
    subTabs: ["둔근/힙", "체중운동"],
    detail: "둔근 중심",
    recordLabel: "체중 × 0.50 × 횟수 × 세트",
    volumeType: "bodyweight_factor_or_added",
    bodyweightFactor: 0.5,
    impacts: [
      { muscleId: "glutes", impactRatio: 0.75 },
      { muscleId: "hamstrings", impactRatio: 0.15 },
      { muscleId: "core", impactRatio: 0.1 },
    ],
  },
  {
    id: "walking-lunge",
    name: "워킹 런지",
    category: "하체",
    type: "weight",
    defaultRestSeconds: 75,
    subTabs: ["대퇴사두", "둔근/힙", "체중운동"],
    detail: "둔근 · 대퇴사두 중심",
    recordLabel: "덤벨 한 손 중량 × 2 × 한쪽 횟수 × 세트 × 좌우",
    volumeType: "dumbbell_unilateral_lower",
    impacts: [
      { muscleId: "glutes", impactRatio: 0.35 },
      { muscleId: "quads", impactRatio: 0.35 },
      { muscleId: "hamstrings", impactRatio: 0.2 },
      { muscleId: "core", impactRatio: 0.1 },
    ],
  },
  {
    id: "sumo-squat",
    name: "스모 스쿼트",
    category: "하체",
    type: "weight",
    defaultRestSeconds: 75,
    subTabs: ["둔근/힙", "대퇴사두", "체중운동"],
    detail: "둔근 · 내전근 중심",
    recordLabel: "양손으로 든 총 중량 × 횟수 × 세트",
    volumeType: "single_weight",
    impacts: [
      { muscleId: "glutes", impactRatio: 0.35 },
      { muscleId: "adductors", impactRatio: 0.3 },
      { muscleId: "quads", impactRatio: 0.25 },
      { muscleId: "core", impactRatio: 0.1 },
    ],
  },
  {
    id: "back-extension",
    name: "백 익스텐션",
    category: "하체 / 코어",
    type: "bodyweight",
    defaultRestSeconds: 60,
    subTabs: ["햄스트링", "둔근/힙", "허리/기립근"],
    detail: "척추기립근 · 둔근 · 햄스트링 중심",
    recordLabel: "체중 × 0.45 × 횟수 × 세트",
    volumeType: "bodyweight_factor_or_added",
    bodyweightFactor: 0.45,
    impacts: [
      { muscleId: "erectors", impactRatio: 0.45 },
      { muscleId: "glutes", impactRatio: 0.3 },
      { muscleId: "hamstrings", impactRatio: 0.2 },
      { muscleId: "core", impactRatio: 0.05 },
    ],
  },
  {
    id: "lat-pulldown",
    name: "랫풀다운",
    category: "등",
    type: "weight",
    defaultRestSeconds: 75,
    subTabs: ["Pull"],
    detail: "광배근 중심",
    recordLabel: "머신 중량 × 횟수 × 세트",
    volumeType: "machine",
    impacts: [
      { muscleId: "back", impactRatio: 0.65 },
      { muscleId: "biceps", impactRatio: 0.25 },
      { muscleId: "shoulders", impactRatio: 0.1 },
    ],
  },
  {
    id: "pull-up",
    name: "풀업",
    category: "등",
    type: "bodyweight",
    defaultRestSeconds: 90,
    subTabs: ["Pull", "체중운동"],
    detail: "광배근 중심",
    recordLabel: "체중 × 횟수 × 세트",
    volumeType: "bodyweight_or_assist",
    bodyweightFactor: 1,
    impacts: [
      { muscleId: "back", impactRatio: 0.75 },
      { muscleId: "biceps", impactRatio: 0.2 },
      { muscleId: "core", impactRatio: 0.05 },
    ],
  },
  {
    id: "seated-row",
    name: "시티드 로우",
    category: "등",
    type: "weight",
    defaultRestSeconds: 75,
    subTabs: ["Pull"],
    detail: "등 중앙 중심",
    recordLabel: "머신 중량 × 횟수 × 세트",
    volumeType: "machine",
    impacts: [
      { muscleId: "back", impactRatio: 0.75 },
      { muscleId: "biceps", impactRatio: 0.15 },
      { muscleId: "shoulders", impactRatio: 0.1 },
    ],
  },
  {
    id: "bench-press",
    name: "벤치프레스",
    category: "가슴",
    type: "weight",
    defaultRestSeconds: 90,
    subTabs: ["Push"],
    detail: "가슴 중심",
    recordLabel: "바벨 총 중량 × 횟수 × 세트",
    volumeType: "barbell",
    impacts: [
      { muscleId: "chest", impactRatio: 0.6 },
      { muscleId: "triceps", impactRatio: 0.25 },
      { muscleId: "shoulders", impactRatio: 0.15 },
    ],
  },
  {
    id: "incline-dumbbell-press",
    name: "인클라인 덤벨프레스",
    category: "윗가슴",
    type: "weight",
    defaultRestSeconds: 90,
    subTabs: ["Push"],
    detail: "윗가슴 중심",
    recordLabel: "덤벨 한 손 중량 × 2 × 횟수 × 세트",
    volumeType: "dumbbell_both",
    impacts: [
      { muscleId: "chest", impactRatio: 0.55 },
      { muscleId: "shoulders", impactRatio: 0.25 },
      { muscleId: "triceps", impactRatio: 0.2 },
    ],
  },
  {
    id: "chest-press-machine",
    name: "체스트 프레스 머신",
    category: "가슴",
    type: "weight",
    defaultRestSeconds: 90,
    subTabs: ["Push"],
    detail: "가슴 중심",
    recordLabel: "머신 중량 × 횟수 × 세트",
    volumeType: "machine",
    impacts: [
      { muscleId: "chest", impactRatio: 0.65 },
      { muscleId: "triceps", impactRatio: 0.2 },
      { muscleId: "shoulders", impactRatio: 0.15 },
    ],
  },
  {
    id: "cable-fly",
    name: "케이블 플라이",
    category: "가슴",
    type: "weight",
    defaultRestSeconds: 60,
    subTabs: ["Push"],
    detail: "가슴 고립",
    recordLabel: "케이블 중량 × 횟수 × 세트",
    volumeType: "cable",
    impacts: [
      { muscleId: "chest", impactRatio: 0.85 },
      { muscleId: "shoulders", impactRatio: 0.15 },
    ],
  },
  {
    id: "push-up",
    name: "푸쉬업",
    category: "가슴",
    type: "bodyweight",
    defaultRestSeconds: 60,
    subTabs: ["Push", "체중운동"],
    detail: "가슴 중심",
    recordLabel: "체중 × 0.65 × 횟수 × 세트",
    volumeType: "bodyweight_factor",
    bodyweightFactor: 0.65,
    impacts: [
      { muscleId: "chest", impactRatio: 0.55 },
      { muscleId: "triceps", impactRatio: 0.25 },
      { muscleId: "shoulders", impactRatio: 0.15 },
      { muscleId: "core", impactRatio: 0.05 },
    ],
  },
  {
    id: "dips",
    name: "딥스",
    category: "가슴 / 삼두",
    type: "bodyweight",
    defaultRestSeconds: 90,
    subTabs: ["Push", "체중운동"],
    detail: "삼두 · 가슴 중심",
    recordLabel: "체중 × 0.90 × 횟수 × 세트",
    volumeType: "bodyweight_or_added",
    bodyweightFactor: 0.9,
    impacts: [
      { muscleId: "triceps", impactRatio: 0.4 },
      { muscleId: "chest", impactRatio: 0.4 },
      { muscleId: "shoulders", impactRatio: 0.15 },
      { muscleId: "core", impactRatio: 0.05 },
    ],
  },
  {
    id: "barbell-row",
    name: "바벨 로우",
    category: "등",
    type: "weight",
    defaultRestSeconds: 90,
    subTabs: ["Pull"],
    detail: "등 중앙 중심",
    recordLabel: "바벨 총 중량 × 횟수 × 세트",
    volumeType: "barbell",
    impacts: [
      { muscleId: "back", impactRatio: 0.65 },
      { muscleId: "shoulders", impactRatio: 0.15 },
      { muscleId: "biceps", impactRatio: 0.1 },
      { muscleId: "core", impactRatio: 0.1 },
    ],
  },
  {
    id: "one-arm-dumbbell-row",
    name: "원암 덤벨로우",
    category: "등",
    type: "weight",
    defaultRestSeconds: 75,
    subTabs: ["Pull"],
    detail: "광배근 중심",
    recordLabel: "덤벨 한 손 중량 × 횟수 × 세트 × 2",
    volumeType: "dumbbell_unilateral",
    impacts: [
      { muscleId: "back", impactRatio: 0.75 },
      { muscleId: "biceps", impactRatio: 0.15 },
      { muscleId: "shoulders", impactRatio: 0.1 },
    ],
  },
  {
    id: "dumbbell-pullover",
    name: "덤벨 풀오버",
    category: "등 / 가슴",
    type: "weight",
    defaultRestSeconds: 75,
    subTabs: ["Pull", "Push"],
    detail: "광배근 · 가슴 보조",
    recordLabel: "덤벨 1개 총 중량 × 횟수 × 세트",
    volumeType: "single_weight",
    impacts: [
      { muscleId: "back", impactRatio: 0.45 },
      { muscleId: "chest", impactRatio: 0.35 },
      { muscleId: "triceps", impactRatio: 0.1 },
      { muscleId: "shoulders", impactRatio: 0.1 },
    ],
  },
  {
    id: "face-pull",
    name: "페이스풀",
    category: "후면어깨",
    type: "weight",
    defaultRestSeconds: 60,
    subTabs: ["Pull", "어깨"],
    detail: "후면어깨 중심",
    recordLabel: "케이블 중량 × 횟수 × 세트",
    volumeType: "cable",
    impacts: [
      { muscleId: "shoulders", impactRatio: 0.65 },
      { muscleId: "back", impactRatio: 0.35 },
    ],
  },
  {
    id: "shoulder-press",
    name: "숄더프레스",
    category: "어깨",
    type: "weight",
    defaultRestSeconds: 75,
    subTabs: ["어깨", "Push"],
    detail: "어깨 중심",
    recordLabel: "중량 × 횟수 × 세트",
    volumeType: "barbell",
    impacts: [
      { muscleId: "shoulders", impactRatio: 0.7 },
      { muscleId: "triceps", impactRatio: 0.25 },
      { muscleId: "chest", impactRatio: 0.05 },
    ],
  },
  {
    id: "dumbbell-shoulder-press",
    name: "덤벨 숄더프레스",
    category: "어깨",
    type: "weight",
    defaultRestSeconds: 75,
    subTabs: ["어깨", "Push"],
    detail: "어깨 중심",
    recordLabel: "덤벨 한 손 중량 × 2 × 횟수 × 세트",
    volumeType: "dumbbell_both",
    impacts: [
      { muscleId: "shoulders", impactRatio: 0.75 },
      { muscleId: "triceps", impactRatio: 0.2 },
      { muscleId: "core", impactRatio: 0.05 },
    ],
  },
  {
    id: "lateral-raise",
    name: "사이드 레터럴 레이즈",
    category: "어깨",
    type: "weight",
    defaultRestSeconds: 45,
    subTabs: ["어깨"],
    detail: "측면어깨 중심",
    recordLabel: "덤벨 한 손 중량 × 2 × 횟수 × 세트",
    volumeType: "dumbbell_both",
    impacts: [
      { muscleId: "shoulders", impactRatio: 0.85 },
      { muscleId: "back", impactRatio: 0.15 },
    ],
  },
  {
    id: "rear-delt-fly",
    name: "리어델트 플라이",
    category: "후면어깨",
    type: "weight",
    defaultRestSeconds: 60,
    subTabs: ["어깨", "Pull"],
    detail: "후면어깨 중심",
    recordLabel: "중량 × 횟수 × 세트",
    volumeType: "machine_or_dumbbell",
    impacts: [
      { muscleId: "shoulders", impactRatio: 0.75 },
      { muscleId: "back", impactRatio: 0.25 },
    ],
  },
  {
    id: "dumbbell-curl",
    name: "덤벨 컬",
    category: "이두",
    type: "weight",
    defaultRestSeconds: 60,
    subTabs: ["팔"],
    detail: "이두 중심",
    recordLabel: "덤벨 한 손 중량 × 2 × 횟수 × 세트",
    volumeType: "dumbbell_both",
    impacts: [{ muscleId: "biceps", impactRatio: 1 }],
  },
  {
    id: "hammer-curl",
    name: "해머 컬",
    category: "이두 / 전완",
    type: "weight",
    defaultRestSeconds: 60,
    subTabs: ["팔"],
    detail: "상완근 · 이두 중심",
    recordLabel: "덤벨 한 손 중량 × 2 × 횟수 × 세트",
    volumeType: "dumbbell_both",
    impacts: [{ muscleId: "biceps", impactRatio: 1 }],
  },
  {
    id: "triceps-pushdown",
    name: "트라이셉스 푸시다운",
    category: "삼두",
    type: "weight",
    defaultRestSeconds: 60,
    subTabs: ["팔", "Push"],
    detail: "삼두 중심",
    recordLabel: "케이블 중량 × 횟수 × 세트",
    volumeType: "cable",
    impacts: [{ muscleId: "triceps", impactRatio: 1 }],
  },
  {
    id: "overhead-triceps-extension",
    name: "오버헤드 트라이셉스 익스텐션",
    category: "삼두",
    type: "weight",
    defaultRestSeconds: 60,
    subTabs: ["팔", "Push"],
    detail: "삼두 장두 중심",
    recordLabel: "중량 × 횟수 × 세트",
    volumeType: "dumbbell_or_cable",
    impacts: [
      { muscleId: "triceps", impactRatio: 0.9 },
      { muscleId: "core", impactRatio: 0.1 },
    ],
  },
  {
    id: "plank",
    name: "플랭크",
    category: "코어",
    type: "time",
    defaultRestSeconds: 60,
    subTabs: ["코어 안정화", "시간형"],
    detail: "복횡근 · 전체 코어 중심",
    recordLabel: "시간 × 세트",
    volumeType: "time",
    impacts: [
      { muscleId: "transverseAbs", impactRatio: 0.45 },
      { muscleId: "rectusAbs", impactRatio: 0.25 },
      { muscleId: "obliques", impactRatio: 0.15 },
      { muscleId: "shoulders", impactRatio: 0.1 },
      { muscleId: "glutes", impactRatio: 0.05 },
    ],
  },
  {
    id: "side-plank",
    name: "사이드 플랭크",
    category: "코어",
    type: "time",
    defaultRestSeconds: 60,
    subTabs: ["복사근", "코어 안정화", "시간형"],
    detail: "복사근 중심",
    recordLabel: "한쪽 시간 × 세트 × 좌우",
    volumeType: "time_unilateral",
    impacts: [
      { muscleId: "obliques", impactRatio: 0.55 },
      { muscleId: "transverseAbs", impactRatio: 0.25 },
      { muscleId: "glutes", impactRatio: 0.1 },
      { muscleId: "shoulders", impactRatio: 0.1 },
    ],
  },
  {
    id: "crunch",
    name: "크런치",
    category: "코어",
    type: "bodyweight",
    defaultRestSeconds: 45,
    subTabs: ["복직근"],
    detail: "상복부 중심",
    recordLabel: "체중 × 0.20 × 횟수 × 세트",
    volumeType: "bodyweight_factor",
    bodyweightFactor: 0.2,
    impacts: [
      { muscleId: "rectusAbs", impactRatio: 0.9 },
      { muscleId: "transverseAbs", impactRatio: 0.1 },
    ],
  },
  {
    id: "sit-up",
    name: "싯업",
    category: "코어",
    type: "bodyweight",
    defaultRestSeconds: 60,
    subTabs: ["복직근"],
    detail: "복직근 중심",
    recordLabel: "체중 × 0.30 × 횟수 × 세트",
    volumeType: "bodyweight_factor",
    bodyweightFactor: 0.3,
    impacts: [
      { muscleId: "rectusAbs", impactRatio: 0.7 },
      { muscleId: "hipFlexors", impactRatio: 0.2 },
      { muscleId: "transverseAbs", impactRatio: 0.1 },
    ],
  },
  {
    id: "leg-raise",
    name: "레그 레이즈",
    category: "코어",
    type: "bodyweight",
    defaultRestSeconds: 60,
    subTabs: ["하복부"],
    detail: "하복부 중심",
    recordLabel: "체중 × 0.35 × 횟수 × 세트",
    volumeType: "bodyweight_factor",
    bodyweightFactor: 0.35,
    impacts: [
      { muscleId: "lowerAbs", impactRatio: 0.6 },
      { muscleId: "hipFlexors", impactRatio: 0.25 },
      { muscleId: "transverseAbs", impactRatio: 0.15 },
    ],
  },
  {
    id: "hanging-leg-raise",
    name: "행잉 레그 레이즈",
    category: "코어",
    type: "bodyweight",
    defaultRestSeconds: 75,
    subTabs: ["하복부"],
    detail: "하복부 · 고관절굴곡근 중심",
    recordLabel: "체중 × 0.45 × 횟수 × 세트",
    volumeType: "bodyweight_factor",
    bodyweightFactor: 0.45,
    impacts: [
      { muscleId: "lowerAbs", impactRatio: 0.55 },
      { muscleId: "hipFlexors", impactRatio: 0.25 },
      { muscleId: "biceps", impactRatio: 0.1 },
      { muscleId: "back", impactRatio: 0.1 },
    ],
  },
  {
    id: "russian-twist",
    name: "러시안 트위스트",
    category: "코어",
    type: "bodyweight",
    defaultRestSeconds: 60,
    subTabs: ["복사근"],
    detail: "복사근 중심",
    recordLabel: "체중 × 0.25 × 횟수 × 세트",
    volumeType: "bodyweight_or_weighted",
    bodyweightFactor: 0.25,
    impacts: [
      { muscleId: "obliques", impactRatio: 0.6 },
      { muscleId: "rectusAbs", impactRatio: 0.2 },
      { muscleId: "transverseAbs", impactRatio: 0.1 },
      { muscleId: "hipFlexors", impactRatio: 0.1 },
    ],
  },
  {
    id: "bicycle-crunch",
    name: "바이시클 크런치",
    category: "코어",
    type: "bodyweight",
    defaultRestSeconds: 60,
    subTabs: ["복사근", "복직근"],
    detail: "복사근 · 복직근 중심",
    recordLabel: "체중 × 0.25 × 횟수 × 세트",
    volumeType: "bodyweight_factor",
    bodyweightFactor: 0.25,
    impacts: [
      { muscleId: "obliques", impactRatio: 0.45 },
      { muscleId: "rectusAbs", impactRatio: 0.35 },
      { muscleId: "lowerAbs", impactRatio: 0.2 },
    ],
  },
  {
    id: "mountain-climber",
    name: "마운틴 클라이머",
    category: "코어",
    type: "time",
    defaultRestSeconds: 45,
    subTabs: ["하복부", "코어 안정화", "시간형", "맨몸", "고강도", "상체/코어 중심"],
    detail: "하복부 · 심폐 중심",
    recordLabel: "시간 × 세트",
    volumeType: "time_or_bodyweight",
    bodyweightFactor: 0.45,
    impacts: [
      { muscleId: "lowerAbs", impactRatio: 0.35 },
      { muscleId: "transverseAbs", impactRatio: 0.25 },
      { muscleId: "shoulders", impactRatio: 0.2 },
      { muscleId: "cardio", impactRatio: 0.2 },
    ],
  },
  {
    id: "dead-bug",
    name: "데드버그",
    category: "코어",
    type: "bodyweight",
    defaultRestSeconds: 45,
    subTabs: ["코어 안정화"],
    detail: "복횡근 중심",
    recordLabel: "체중 × 0.20 × 횟수 × 세트",
    volumeType: "bodyweight_factor",
    bodyweightFactor: 0.2,
    impacts: [
      { muscleId: "transverseAbs", impactRatio: 0.6 },
      { muscleId: "lowerAbs", impactRatio: 0.2 },
      { muscleId: "hipFlexors", impactRatio: 0.2 },
    ],
  },
  {
    id: "bird-dog",
    name: "버드독",
    category: "코어",
    type: "bodyweight",
    defaultRestSeconds: 45,
    subTabs: ["코어 안정화", "허리/기립근"],
    detail: "복횡근 · 척추기립근 중심",
    recordLabel: "체중 × 0.20 × 횟수 × 세트",
    volumeType: "bodyweight_factor",
    bodyweightFactor: 0.2,
    impacts: [
      { muscleId: "transverseAbs", impactRatio: 0.4 },
      { muscleId: "erectors", impactRatio: 0.3 },
      { muscleId: "glutes", impactRatio: 0.2 },
      { muscleId: "shoulders", impactRatio: 0.1 },
    ],
  },
  {
    id: "heel-touch",
    name: "힐터치",
    category: "코어",
    type: "bodyweight",
    defaultRestSeconds: 45,
    subTabs: ["복사근"],
    detail: "복사근 중심",
    recordLabel: "체중 × 0.20 × 횟수 × 세트",
    volumeType: "bodyweight_factor",
    bodyweightFactor: 0.2,
    impacts: [
      { muscleId: "obliques", impactRatio: 0.7 },
      { muscleId: "rectusAbs", impactRatio: 0.2 },
      { muscleId: "transverseAbs", impactRatio: 0.1 },
    ],
  },
  {
    id: "cable-crunch",
    name: "케이블 크런치",
    category: "코어",
    type: "weight",
    defaultRestSeconds: 60,
    subTabs: ["복직근"],
    detail: "복직근 중심",
    recordLabel: "케이블 중량 × 횟수 × 세트",
    volumeType: "cable",
    impacts: [
      { muscleId: "rectusAbs", impactRatio: 0.85 },
      { muscleId: "transverseAbs", impactRatio: 0.15 },
    ],
  },
  {
    id: "flutter-kick",
    name: "플러터 킥",
    category: "코어",
    type: "time",
    defaultRestSeconds: 45,
    subTabs: ["하복부", "시간형"],
    detail: "하복부 중심",
    recordLabel: "시간 × 세트",
    volumeType: "time_or_bodyweight",
    bodyweightFactor: 0.3,
    impacts: [
      { muscleId: "lowerAbs", impactRatio: 0.6 },
      { muscleId: "hipFlexors", impactRatio: 0.25 },
      { muscleId: "transverseAbs", impactRatio: 0.15 },
    ],
  },
  {
    id: "v-up",
    name: "브이업",
    category: "코어",
    type: "bodyweight",
    defaultRestSeconds: 60,
    subTabs: ["복직근", "하복부"],
    detail: "복직근 · 하복부 중심",
    recordLabel: "체중 × 0.35 × 횟수 × 세트",
    volumeType: "bodyweight_factor",
    bodyweightFactor: 0.35,
    impacts: [
      { muscleId: "rectusAbs", impactRatio: 0.45 },
      { muscleId: "lowerAbs", impactRatio: 0.35 },
      { muscleId: "hipFlexors", impactRatio: 0.2 },
    ],
  },
  {
    id: "toe-touch",
    name: "토터치",
    category: "코어",
    type: "bodyweight",
    defaultRestSeconds: 45,
    subTabs: ["복직근"],
    detail: "상복부 중심",
    recordLabel: "체중 × 0.25 × 횟수 × 세트",
    volumeType: "bodyweight_factor",
    bodyweightFactor: 0.25,
    impacts: [
      { muscleId: "rectusAbs", impactRatio: 0.75 },
      { muscleId: "lowerAbs", impactRatio: 0.15 },
      { muscleId: "transverseAbs", impactRatio: 0.1 },
    ],
  },
  {
    id: "plank-shoulder-tap",
    name: "플랭크 숄더탭",
    category: "코어",
    type: "time",
    defaultRestSeconds: 45,
    subTabs: ["코어 안정화", "시간형"],
    detail: "코어 · 어깨 중심",
    recordLabel: "시간 × 세트",
    volumeType: "time_or_bodyweight",
    bodyweightFactor: 0.45,
    impacts: [
      { muscleId: "transverseAbs", impactRatio: 0.4 },
      { muscleId: "obliques", impactRatio: 0.2 },
      { muscleId: "shoulders", impactRatio: 0.25 },
      { muscleId: "glutes", impactRatio: 0.15 },
    ],
  },
  {
    id: "hollow-body-hold",
    name: "할로우 바디 홀드",
    category: "코어",
    type: "time",
    defaultRestSeconds: 45,
    subTabs: ["코어 안정화", "시간형", "복직근"],
    detail: "복횡근 · 복직근 중심",
    recordLabel: "시간 × 세트",
    volumeType: "time",
    impacts: [
      { muscleId: "transverseAbs", impactRatio: 0.45 },
      { muscleId: "rectusAbs", impactRatio: 0.35 },
      { muscleId: "lowerAbs", impactRatio: 0.2 },
    ],
  },
  {
    id: "ab-slide",
    name: "AB슬라이드",
    category: "코어",
    type: "bodyweight",
    defaultRestSeconds: 60,
    subTabs: ["코어 안정화", "복직근"],
    detail: "복직근 · 코어 안정화 중심",
    recordLabel: "체중 × 0.45 × 횟수 × 세트",
    volumeType: "bodyweight_factor",
    bodyweightFactor: 0.45,
    impacts: [
      { muscleId: "rectusAbs", impactRatio: 0.45 },
      { muscleId: "transverseAbs", impactRatio: 0.25 },
      { muscleId: "shoulders", impactRatio: 0.15 },
      { muscleId: "back", impactRatio: 0.1 },
      { muscleId: "chest", impactRatio: 0.05 },
    ],
  },
  {
    id: "superman",
    name: "슈퍼맨",
    category: "코어",
    type: "time",
    defaultRestSeconds: 45,
    subTabs: ["허리/기립근", "시간형"],
    detail: "척추기립근 중심",
    recordLabel: "시간 × 세트",
    volumeType: "time_or_bodyweight",
    bodyweightFactor: 0.25,
    impacts: [
      { muscleId: "erectors", impactRatio: 0.6 },
      { muscleId: "glutes", impactRatio: 0.2 },
      { muscleId: "hamstrings", impactRatio: 0.1 },
      { muscleId: "shoulders", impactRatio: 0.1 },
    ],
  },
  {
    id: "burpee",
    name: "버피",
    category: "전신",
    type: "bodyweight",
    defaultRestSeconds: 60,
    subTabs: ["맨몸", "고강도"],
    detail: "전신 · 심폐 중심",
    recordLabel: "체중 × 0.75 × 횟수 × 세트",
    volumeType: "bodyweight_factor",
    bodyweightFactor: 0.75,
    impacts: [
      { muscleId: "quads", impactRatio: 0.15 },
      { muscleId: "glutes", impactRatio: 0.15 },
      { muscleId: "chest", impactRatio: 0.2 },
      { muscleId: "triceps", impactRatio: 0.15 },
      { muscleId: "core", impactRatio: 0.2 },
      { muscleId: "cardio", impactRatio: 0.15 },
    ],
  },
  {
    id: "jumping-jack",
    name: "점핑잭",
    category: "전신",
    type: "time",
    defaultRestSeconds: 45,
    subTabs: ["맨몸", "고강도"],
    detail: "전신 · 심폐 중심",
    recordLabel: "시간 × 세트",
    volumeType: "time_or_bodyweight",
    bodyweightFactor: 0.35,
    impacts: [
      { muscleId: "quads", impactRatio: 0.2 },
      { muscleId: "glutes", impactRatio: 0.15 },
      { muscleId: "shoulders", impactRatio: 0.2 },
      { muscleId: "core", impactRatio: 0.15 },
      { muscleId: "calves", impactRatio: 0.1 },
      { muscleId: "cardio", impactRatio: 0.2 },
    ],
  },
  {
    id: "squat-jump",
    name: "스쿼트 점프",
    category: "전신",
    type: "bodyweight",
    defaultRestSeconds: 60,
    subTabs: ["맨몸", "고강도", "힙/하체 중심"],
    detail: "하체 · 둔근 중심",
    recordLabel: "체중 × 0.55 × 횟수 × 세트",
    volumeType: "bodyweight_factor",
    bodyweightFactor: 0.55,
    impacts: [
      { muscleId: "quads", impactRatio: 0.4 },
      { muscleId: "glutes", impactRatio: 0.3 },
      { muscleId: "calves", impactRatio: 0.15 },
      { muscleId: "core", impactRatio: 0.1 },
      { muscleId: "cardio", impactRatio: 0.05 },
    ],
  },
  {
    id: "inchworm",
    name: "인치웜",
    category: "전신",
    type: "bodyweight",
    defaultRestSeconds: 60,
    subTabs: ["맨몸", "상체/코어 중심"],
    detail: "코어 · 어깨 · 햄스트링 중심",
    recordLabel: "체중 × 0.60 × 횟수 × 세트",
    volumeType: "bodyweight_factor",
    bodyweightFactor: 0.6,
    impacts: [
      { muscleId: "core", impactRatio: 0.3 },
      { muscleId: "shoulders", impactRatio: 0.25 },
      { muscleId: "hamstrings", impactRatio: 0.2 },
      { muscleId: "chest", impactRatio: 0.15 },
      { muscleId: "triceps", impactRatio: 0.1 },
    ],
  },
  {
    id: "bear-crawl",
    name: "베어 크롤",
    category: "전신",
    type: "time",
    defaultRestSeconds: 45,
    subTabs: ["맨몸", "이동형", "상체/코어 중심"],
    detail: "코어 · 어깨 · 하체 중심",
    recordLabel: "시간 × 세트",
    volumeType: "time_or_distance",
    impacts: [
      { muscleId: "transverseAbs", impactRatio: 0.3 },
      { muscleId: "shoulders", impactRatio: 0.25 },
      { muscleId: "quads", impactRatio: 0.15 },
      { muscleId: "glutes", impactRatio: 0.15 },
      { muscleId: "cardio", impactRatio: 0.15 },
    ],
  },
  {
    id: "plank-to-push-up",
    name: "플랭크 투 푸쉬업",
    category: "전신",
    type: "bodyweight",
    defaultRestSeconds: 60,
    subTabs: ["맨몸", "상체/코어 중심"],
    detail: "코어 · 가슴 · 삼두 중심",
    recordLabel: "체중 × 0.65 × 횟수 × 세트",
    volumeType: "bodyweight_factor",
    bodyweightFactor: 0.65,
    impacts: [
      { muscleId: "core", impactRatio: 0.35 },
      { muscleId: "chest", impactRatio: 0.25 },
      { muscleId: "triceps", impactRatio: 0.2 },
      { muscleId: "shoulders", impactRatio: 0.2 },
    ],
  },
  {
    id: "push-up-shoulder-tap",
    name: "푸쉬업 숄더탭",
    category: "전신",
    type: "bodyweight",
    defaultRestSeconds: 60,
    subTabs: ["맨몸", "상체/코어 중심"],
    detail: "가슴 · 어깨 · 코어 중심",
    recordLabel: "체중 × 0.60 × 횟수 × 세트",
    volumeType: "bodyweight_factor",
    bodyweightFactor: 0.6,
    impacts: [
      { muscleId: "chest", impactRatio: 0.3 },
      { muscleId: "core", impactRatio: 0.3 },
      { muscleId: "shoulders", impactRatio: 0.25 },
      { muscleId: "triceps", impactRatio: 0.15 },
    ],
  },
  {
    id: "kettlebell-swing",
    name: "케틀벨 스윙",
    category: "전신",
    type: "weight",
    defaultRestSeconds: 60,
    subTabs: ["덤벨/케틀벨", "힙/하체 중심"],
    detail: "둔근 · 햄스트링 · 코어 중심",
    recordLabel: "중량 × 횟수 × 세트",
    volumeType: "single_weight",
    impacts: [
      { muscleId: "glutes", impactRatio: 0.4 },
      { muscleId: "hamstrings", impactRatio: 0.25 },
      { muscleId: "core", impactRatio: 0.2 },
      { muscleId: "back", impactRatio: 0.15 },
    ],
  },
  {
    id: "dumbbell-thruster",
    name: "덤벨 쓰러스터",
    category: "전신",
    type: "weight",
    defaultRestSeconds: 75,
    subTabs: ["덤벨/케틀벨", "고강도", "힙/하체 중심"],
    detail: "하체 · 어깨 · 삼두 중심",
    recordLabel: "덤벨 한 손 중량 × 2 × 횟수 × 세트",
    volumeType: "dumbbell_both",
    impacts: [
      { muscleId: "quads", impactRatio: 0.35 },
      { muscleId: "glutes", impactRatio: 0.25 },
      { muscleId: "shoulders", impactRatio: 0.25 },
      { muscleId: "triceps", impactRatio: 0.1 },
      { muscleId: "core", impactRatio: 0.05 },
    ],
  },
  {
    id: "clean-and-press",
    name: "클린 앤 프레스",
    category: "전신",
    type: "weight",
    defaultRestSeconds: 90,
    subTabs: ["덤벨/케틀벨", "고강도"],
    detail: "하체 · 등 · 어깨 중심",
    recordLabel: "중량 × 횟수 × 세트",
    volumeType: "weight_or_dumbbell",
    impacts: [
      { muscleId: "quads", impactRatio: 0.15 },
      { muscleId: "glutes", impactRatio: 0.15 },
      { muscleId: "back", impactRatio: 0.25 },
      { muscleId: "shoulders", impactRatio: 0.25 },
      { muscleId: "core", impactRatio: 0.1 },
      { muscleId: "triceps", impactRatio: 0.1 },
    ],
  },
  {
    id: "deadlift",
    name: "데드리프트",
    category: "전신",
    type: "weight",
    defaultRestSeconds: 90,
    subTabs: ["덤벨/케틀벨", "힙/하체 중심"],
    detail: "햄스트링 · 둔근 · 등 중심",
    recordLabel: "총 중량 × 횟수 × 세트",
    volumeType: "barbell_or_dumbbell",
    impacts: [
      { muscleId: "hamstrings", impactRatio: 0.3 },
      { muscleId: "glutes", impactRatio: 0.3 },
      { muscleId: "back", impactRatio: 0.25 },
      { muscleId: "core", impactRatio: 0.15 },
    ],
  },
  {
    id: "snatch",
    name: "스내치",
    category: "전신",
    type: "weight",
    defaultRestSeconds: 90,
    subTabs: ["덤벨/케틀벨", "고강도"],
    detail: "하체 · 등 · 어깨 중심",
    recordLabel: "한쪽 중량 × 횟수 × 세트 × 좌우",
    volumeType: "single_weight_unilateral",
    impacts: [
      { muscleId: "quads", impactRatio: 0.15 },
      { muscleId: "glutes", impactRatio: 0.15 },
      { muscleId: "back", impactRatio: 0.2 },
      { muscleId: "shoulders", impactRatio: 0.25 },
      { muscleId: "core", impactRatio: 0.15 },
      { muscleId: "triceps", impactRatio: 0.1 },
    ],
  },
  {
    id: "medicine-ball-slam",
    name: "메디신볼 슬램",
    category: "전신",
    type: "weight",
    defaultRestSeconds: 60,
    subTabs: ["고강도", "상체/코어 중심"],
    detail: "코어 · 등 · 어깨 중심",
    recordLabel: "중량 × 횟수 × 세트",
    volumeType: "single_weight",
    impacts: [
      { muscleId: "core", impactRatio: 0.35 },
      { muscleId: "back", impactRatio: 0.25 },
      { muscleId: "shoulders", impactRatio: 0.2 },
      { muscleId: "triceps", impactRatio: 0.1 },
      { muscleId: "cardio", impactRatio: 0.1 },
    ],
  },
  {
    id: "battle-rope",
    name: "배틀로프",
    category: "전신",
    type: "time",
    defaultRestSeconds: 45,
    subTabs: ["고강도", "시간형", "상체/코어 중심"],
    detail: "어깨 · 팔 · 코어 · 심폐 중심",
    recordLabel: "시간 × 세트",
    volumeType: "time",
    impacts: [
      { muscleId: "shoulders", impactRatio: 0.35 },
      { muscleId: "biceps", impactRatio: 0.12 },
      { muscleId: "triceps", impactRatio: 0.13 },
      { muscleId: "core", impactRatio: 0.25 },
      { muscleId: "cardio", impactRatio: 0.15 },
    ],
  },
  {
    id: "farmers-walk",
    name: "파머스 워크",
    category: "전신",
    type: "weight",
    defaultRestSeconds: 60,
    subTabs: ["이동형", "덤벨/케틀벨"],
    detail: "전완 · 승모 · 코어 중심",
    recordLabel: "총 중량 × 거리/시간 × 세트",
    volumeType: "carry_both",
    impacts: [
      { muscleId: "biceps", impactRatio: 0.3 },
      { muscleId: "back", impactRatio: 0.25 },
      { muscleId: "core", impactRatio: 0.3 },
      { muscleId: "quads", impactRatio: 0.08 },
      { muscleId: "glutes", impactRatio: 0.07 },
    ],
  },
  {
    id: "suitcase-carry",
    name: "수트케이스 캐리",
    category: "전신",
    type: "weight",
    defaultRestSeconds: 60,
    subTabs: ["이동형", "덤벨/케틀벨", "상체/코어 중심"],
    detail: "복사근 · 전완 · 어깨 중심",
    recordLabel: "한쪽 중량 × 거리/시간 × 세트 × 좌우",
    volumeType: "carry_unilateral",
    impacts: [
      { muscleId: "obliques", impactRatio: 0.35 },
      { muscleId: "biceps", impactRatio: 0.25 },
      { muscleId: "back", impactRatio: 0.2 },
      { muscleId: "shoulders", impactRatio: 0.1 },
      { muscleId: "quads", impactRatio: 0.05 },
      { muscleId: "glutes", impactRatio: 0.05 },
    ],
  },
  {
    id: "sandbag-carry",
    name: "샌드백 캐리",
    category: "전신",
    type: "weight",
    defaultRestSeconds: 75,
    subTabs: ["이동형", "고강도"],
    detail: "코어 · 하체 · 등 중심",
    recordLabel: "중량 × 거리/시간 × 세트",
    volumeType: "carry_single",
    impacts: [
      { muscleId: "core", impactRatio: 0.3 },
      { muscleId: "back", impactRatio: 0.25 },
      { muscleId: "quads", impactRatio: 0.13 },
      { muscleId: "glutes", impactRatio: 0.12 },
      { muscleId: "biceps", impactRatio: 0.1 },
      { muscleId: "cardio", impactRatio: 0.1 },
    ],
  },
  {
    id: "sled-push",
    name: "슬레드 푸시",
    category: "전신",
    type: "weight",
    defaultRestSeconds: 90,
    subTabs: ["이동형", "고강도", "힙/하체 중심"],
    detail: "하체 · 둔근 · 심폐 중심",
    recordLabel: "중량 × 거리 × 세트",
    volumeType: "sled_push",
    impacts: [
      { muscleId: "quads", impactRatio: 0.35 },
      { muscleId: "glutes", impactRatio: 0.3 },
      { muscleId: "calves", impactRatio: 0.15 },
      { muscleId: "core", impactRatio: 0.1 },
      { muscleId: "cardio", impactRatio: 0.1 },
    ],
  },
  {
    id: "turkish-get-up",
    name: "터키쉬 겟업",
    category: "전신",
    type: "weight",
    defaultRestSeconds: 90,
    subTabs: ["덤벨/케틀벨", "상체/코어 중심", "힙/하체 중심"],
    detail: "어깨 · 코어 · 둔근 중심",
    recordLabel: "한쪽 중량 × 횟수 × 세트 × 좌우",
    volumeType: "single_weight_unilateral",
    impacts: [
      { muscleId: "shoulders", impactRatio: 0.3 },
      { muscleId: "core", impactRatio: 0.3 },
      { muscleId: "glutes", impactRatio: 0.2 },
      { muscleId: "quads", impactRatio: 0.05 },
      { muscleId: "hamstrings", impactRatio: 0.05 },
      { muscleId: "biceps", impactRatio: 0.1 },
    ],
  },
  {
    id: "running",
    name: "러닝",
    category: "유산소",
    type: "time",
    defaultRestSeconds: 0,
    subTabs: ["걷기/러닝", "고강도"],
    detail: "러닝",
    recordLabel: "시간 · 거리 · RPE",
    volumeType: "cardio_distance",
    defaultRpe: 7,
    met: 8.3,
    impacts: [
      { muscleId: "cardio", impactRatio: 0.6 },
      { muscleId: "quads", impactRatio: 0.13 },
      { muscleId: "glutes", impactRatio: 0.12 },
      { muscleId: "calves", impactRatio: 0.1 },
      { muscleId: "core", impactRatio: 0.05 },
    ],
  },
  {
    id: "walking",
    name: "걷기",
    category: "유산소",
    type: "time",
    defaultRestSeconds: 0,
    subTabs: ["걷기/러닝", "저강도", "회복"],
    detail: "저강도 유산소",
    recordLabel: "시간 · 거리 · RPE",
    volumeType: "cardio_basic",
    defaultRpe: 3,
    met: 3.5,
    impacts: [
      { muscleId: "cardio", impactRatio: 0.5 },
      { muscleId: "quads", impactRatio: 0.18 },
      { muscleId: "hamstrings", impactRatio: 0.17 },
      { muscleId: "glutes", impactRatio: 0.1 },
      { muscleId: "core", impactRatio: 0.05 },
    ],
  },
  {
    id: "brisk-walking",
    name: "빠르게 걷기",
    category: "유산소",
    type: "time",
    defaultRestSeconds: 0,
    subTabs: ["걷기/러닝", "저강도"],
    detail: "빠른 걷기",
    recordLabel: "시간 · 거리 · 속도 · RPE",
    volumeType: "cardio_basic",
    defaultRpe: 4,
    met: 4.3,
    impacts: [
      { muscleId: "cardio", impactRatio: 0.55 },
      { muscleId: "quads", impactRatio: 0.15 },
      { muscleId: "hamstrings", impactRatio: 0.15 },
      { muscleId: "glutes", impactRatio: 0.1 },
      { muscleId: "core", impactRatio: 0.05 },
    ],
  },
  {
    id: "treadmill-walking",
    name: "트레드밀 걷기",
    category: "유산소",
    type: "time",
    defaultRestSeconds: 0,
    subTabs: ["걷기/러닝", "실내기구", "저강도", "회복"],
    detail: "실내 걷기",
    recordLabel: "시간 · 속도 · 경사 · RPE",
    volumeType: "cardio_incline",
    defaultRpe: 4,
    met: 4,
    impacts: [
      { muscleId: "cardio", impactRatio: 0.5 },
      { muscleId: "quads", impactRatio: 0.15 },
      { muscleId: "hamstrings", impactRatio: 0.15 },
      { muscleId: "glutes", impactRatio: 0.15 },
      { muscleId: "core", impactRatio: 0.05 },
    ],
  },
  {
    id: "treadmill-running",
    name: "트레드밀 러닝",
    category: "유산소",
    type: "time",
    defaultRestSeconds: 0,
    subTabs: ["걷기/러닝", "실내기구", "고강도"],
    detail: "실내 러닝",
    recordLabel: "시간 · 속도 · 경사 · RPE",
    volumeType: "cardio_incline",
    defaultRpe: 7,
    met: 8.3,
    impacts: [
      { muscleId: "cardio", impactRatio: 0.6 },
      { muscleId: "quads", impactRatio: 0.13 },
      { muscleId: "glutes", impactRatio: 0.12 },
      { muscleId: "calves", impactRatio: 0.1 },
      { muscleId: "core", impactRatio: 0.05 },
    ],
  },
  {
    id: "indoor-cycle",
    name: "실내 사이클",
    category: "유산소",
    type: "time",
    defaultRestSeconds: 0,
    subTabs: ["실내기구", "저강도", "회복"],
    detail: "사이클",
    recordLabel: "시간 · 저항 · 거리 · RPE",
    volumeType: "cardio_level",
    defaultRpe: 5,
    met: 6.8,
    impacts: [
      { muscleId: "cardio", impactRatio: 0.55 },
      { muscleId: "quads", impactRatio: 0.25 },
      { muscleId: "glutes", impactRatio: 0.1 },
      { muscleId: "hamstrings", impactRatio: 0.1 },
    ],
  },
  {
    id: "outdoor-bike",
    name: "야외 자전거",
    category: "유산소",
    type: "time",
    defaultRestSeconds: 0,
    subTabs: ["저강도", "고강도"],
    detail: "자전거",
    recordLabel: "시간 · 거리 · 속도 · RPE",
    volumeType: "cardio_distance",
    defaultRpe: 5,
    met: 6.8,
    impacts: [
      { muscleId: "cardio", impactRatio: 0.55 },
      { muscleId: "quads", impactRatio: 0.25 },
      { muscleId: "glutes", impactRatio: 0.1 },
      { muscleId: "hamstrings", impactRatio: 0.1 },
    ],
  },
  {
    id: "stepmill",
    name: "스텝밀",
    category: "유산소",
    type: "time",
    defaultRestSeconds: 0,
    subTabs: ["실내기구", "고강도"],
    detail: "스텝밀",
    recordLabel: "시간 · 레벨 · RPE",
    volumeType: "cardio_level",
    defaultRpe: 7,
    met: 9,
    impacts: [
      { muscleId: "cardio", impactRatio: 0.5 },
      { muscleId: "glutes", impactRatio: 0.25 },
      { muscleId: "quads", impactRatio: 0.2 },
      { muscleId: "core", impactRatio: 0.05 },
    ],
  },
  {
    id: "elliptical",
    name: "일립티컬",
    category: "유산소",
    type: "time",
    defaultRestSeconds: 0,
    subTabs: ["실내기구", "저강도", "회복"],
    detail: "일립티컬",
    recordLabel: "시간 · 레벨 · RPE",
    volumeType: "cardio_level",
    defaultRpe: 5,
    met: 5,
    impacts: [
      { muscleId: "cardio", impactRatio: 0.6 },
      { muscleId: "quads", impactRatio: 0.13 },
      { muscleId: "glutes", impactRatio: 0.12 },
      { muscleId: "shoulders", impactRatio: 0.1 },
      { muscleId: "core", impactRatio: 0.05 },
    ],
  },
  {
    id: "rowing-machine",
    name: "로잉머신",
    category: "유산소",
    type: "time",
    defaultRestSeconds: 0,
    subTabs: ["실내기구", "고강도"],
    detail: "로잉",
    recordLabel: "시간 · 거리 · 페이스 · RPE",
    volumeType: "cardio_distance",
    defaultRpe: 7,
    met: 7,
    impacts: [
      { muscleId: "cardio", impactRatio: 0.45 },
      { muscleId: "back", impactRatio: 0.25 },
      { muscleId: "quads", impactRatio: 0.1 },
      { muscleId: "glutes", impactRatio: 0.1 },
      { muscleId: "core", impactRatio: 0.1 },
    ],
  },
  {
    id: "stair-climber",
    name: "천국의 계단",
    category: "유산소",
    type: "time",
    defaultRestSeconds: 0,
    subTabs: ["실내기구", "고강도"],
    detail: "계단 머신",
    recordLabel: "시간 · 레벨 · RPE",
    volumeType: "cardio_level",
    defaultRpe: 7,
    met: 9,
    impacts: [
      { muscleId: "cardio", impactRatio: 0.5 },
      { muscleId: "glutes", impactRatio: 0.25 },
      { muscleId: "quads", impactRatio: 0.2 },
      { muscleId: "core", impactRatio: 0.05 },
    ],
  },
  {
    id: "jump-rope",
    name: "줄넘기",
    category: "유산소",
    type: "time",
    defaultRestSeconds: 0,
    subTabs: ["고강도", "인터벌"],
    detail: "줄넘기",
    recordLabel: "시간 · 횟수 · RPE",
    volumeType: "cardio_basic",
    defaultRpe: 8,
    met: 11.8,
    impacts: [
      { muscleId: "cardio", impactRatio: 0.55 },
      { muscleId: "calves", impactRatio: 0.25 },
      { muscleId: "shoulders", impactRatio: 0.1 },
      { muscleId: "core", impactRatio: 0.1 },
    ],
  },
  {
    id: "interval-running",
    name: "인터벌 러닝",
    category: "유산소",
    type: "time",
    defaultRestSeconds: 0,
    subTabs: ["걷기/러닝", "인터벌", "고강도"],
    detail: "인터벌",
    recordLabel: "총 운동시간 · RPE · 인터벌 보정",
    volumeType: "cardio_interval",
    defaultRpe: 8,
    met: 10,
    impacts: [
      { muscleId: "cardio", impactRatio: 0.7 },
      { muscleId: "quads", impactRatio: 0.1 },
      { muscleId: "glutes", impactRatio: 0.1 },
      { muscleId: "calves", impactRatio: 0.05 },
      { muscleId: "core", impactRatio: 0.05 },
    ],
  },
  {
    id: "hiit",
    name: "HIIT",
    category: "유산소",
    type: "time",
    defaultRestSeconds: 0,
    subTabs: ["고강도", "인터벌"],
    detail: "고강도 인터벌",
    recordLabel: "총 운동시간 · RPE · 인터벌 보정",
    volumeType: "cardio_interval",
    defaultRpe: 8,
    met: 10,
    impacts: [
      { muscleId: "cardio", impactRatio: 0.65 },
      { muscleId: "quads", impactRatio: 0.08 },
      { muscleId: "glutes", impactRatio: 0.08 },
      { muscleId: "chest", impactRatio: 0.05 },
      { muscleId: "shoulders", impactRatio: 0.04 },
      { muscleId: "core", impactRatio: 0.1 },
    ],
  },
  {
    id: "stair-climbing",
    name: "계단 오르기",
    category: "유산소",
    type: "time",
    defaultRestSeconds: 0,
    subTabs: ["고강도"],
    detail: "계단",
    recordLabel: "시간 · 층수 · RPE",
    volumeType: "cardio_level",
    defaultRpe: 7,
    met: 8.8,
    impacts: [
      { muscleId: "cardio", impactRatio: 0.5 },
      { muscleId: "glutes", impactRatio: 0.25 },
      { muscleId: "quads", impactRatio: 0.2 },
      { muscleId: "core", impactRatio: 0.05 },
    ],
  },
  {
    id: "hiking",
    name: "등산",
    category: "유산소",
    type: "time",
    defaultRestSeconds: 0,
    subTabs: ["저강도", "고강도"],
    detail: "등산",
    recordLabel: "시간 · 거리 · 고도 · RPE",
    volumeType: "cardio_distance",
    defaultRpe: 6,
    met: 6,
    impacts: [
      { muscleId: "cardio", impactRatio: 0.5 },
      { muscleId: "glutes", impactRatio: 0.2 },
      { muscleId: "quads", impactRatio: 0.2 },
      { muscleId: "calves", impactRatio: 0.05 },
      { muscleId: "core", impactRatio: 0.05 },
    ],
  },
  {
    id: "swimming",
    name: "수영",
    category: "유산소",
    type: "time",
    defaultRestSeconds: 0,
    subTabs: ["저강도", "고강도"],
    detail: "수영",
    recordLabel: "시간 · 거리 · RPE",
    volumeType: "cardio_distance",
    defaultRpe: 6,
    met: 7,
    impacts: [
      { muscleId: "cardio", impactRatio: 0.55 },
      { muscleId: "back", impactRatio: 0.2 },
      { muscleId: "shoulders", impactRatio: 0.15 },
      { muscleId: "core", impactRatio: 0.1 },
    ],
  },
  {
    id: "dance-cardio",
    name: "댄스 cardio",
    category: "유산소",
    type: "time",
    defaultRestSeconds: 0,
    subTabs: ["저강도", "고강도"],
    detail: "댄스 유산소",
    recordLabel: "시간 · RPE",
    volumeType: "cardio_basic",
    defaultRpe: 5,
    met: 6,
    impacts: [
      { muscleId: "cardio", impactRatio: 0.6 },
      { muscleId: "quads", impactRatio: 0.1 },
      { muscleId: "glutes", impactRatio: 0.1 },
      { muscleId: "core", impactRatio: 0.15 },
      { muscleId: "shoulders", impactRatio: 0.05 },
    ],
  },
  {
    id: "boxing-cardio",
    name: "복싱 cardio",
    category: "유산소",
    type: "time",
    defaultRestSeconds: 0,
    subTabs: ["고강도", "인터벌"],
    detail: "복싱 유산소",
    recordLabel: "라운드 · 시간 · RPE",
    volumeType: "cardio_interval",
    defaultRpe: 8,
    met: 9,
    impacts: [
      { muscleId: "cardio", impactRatio: 0.55 },
      { muscleId: "shoulders", impactRatio: 0.2 },
      { muscleId: "biceps", impactRatio: 0.07 },
      { muscleId: "triceps", impactRatio: 0.08 },
      { muscleId: "core", impactRatio: 0.1 },
    ],
  },
  {
    id: "recovery-walking",
    name: "저강도 회복 걷기",
    category: "유산소",
    type: "time",
    defaultRestSeconds: 0,
    subTabs: ["회복", "저강도", "걷기/러닝"],
    detail: "회복 걷기",
    recordLabel: "시간 · 거리 · RPE",
    volumeType: "cardio_recovery",
    defaultRpe: 2,
    met: 2.8,
    impacts: [
      { muscleId: "cardio", impactRatio: 0.4 },
      { muscleId: "quads", impactRatio: 0.15 },
      { muscleId: "hamstrings", impactRatio: 0.15 },
      { muscleId: "recovery", impactRatio: 0.25 },
      { muscleId: "core", impactRatio: 0.05 },
    ],
  },
];

const ROUTINES = [
  {
    name: "LOWER BODY",
    label: "하체 집중",
    note: "둔근, 허벅지, 유산소까지 가볍게.",
    exercises: LOWER_EXERCISE_IDS,
  },
  {
    name: "UPPER BALANCE",
    label: "상체 밸런스",
    note: "등, 가슴, 어깨를 균형 있게.",
    exercises: UPPER_EXERCISE_IDS,
  },
  {
    name: "CORE RESET",
    label: "코어 리셋",
    note: "코어 안정감과 가벼운 전신 운동.",
    exercises: CORE_EXERCISE_IDS,
  },
];

const ROUTINE_TABS = [
  {
    label: "상체",
    value: "상체 밸런스",
    exercises: UPPER_EXERCISE_IDS,
  },
  {
    label: "하체",
    value: "하체 집중",
    exercises: LOWER_EXERCISE_IDS,
  },
  {
    label: "코어",
    value: "코어 리셋",
    exercises: CORE_EXERCISE_IDS,
  },
  {
    label: "전신",
    value: "전신",
    exercises: FULL_BODY_EXERCISE_IDS,
  },
  {
    label: "유산소",
    value: "유산소",
    exercises: CARDIO_EXERCISE_IDS,
  },
];

const tabItems: Array<{ id: Tab; label: string; icon: SoftIconName }> = [
  { id: "home", label: "홈", icon: "home" },
  { id: "log", label: "일지", icon: "log" },
  { id: "balance", label: "분석", icon: "analysis" },
  { id: "diet", label: "식단", icon: "diet" },
  { id: "member", label: "내정보", icon: "member" },
];

type SoftIconName =
  | "home"
  | "record"
  | "log"
  | "analysis"
  | "diet"
  | "member"
  | "memo"
  | "save"
  | "edit"
  | "check"
  | "search";

const softIconPaths: Record<SoftIconName, ReactNode> = {
  home: <><path d="M4 10.5 12 4l8 6.5" /><path d="M6.5 10v9h11v-9" /><path d="M10 19v-5h4v5" /></>,
  record: <><path d="M7 4.5h7l3 3V19H7z" /><path d="M13.5 4.5v4h4" /><path d="M9.5 13h5" /><path d="M9.5 16h5" /></>,
  log: <><path d="M7 4.5h10" /><path d="M7 9h10" /><path d="M7 13.5h7" /><path d="M6 20h12" /><path d="M5 4.5v15" /></>,
  analysis: <><path d="M5 18V9" /><path d="M12 18V5" /><path d="M19 18v-7" /><path d="M4 19h16" /></>,
  diet: <><path d="M7 4.5v7" /><path d="M4.5 4.5v4A2.5 2.5 0 0 0 7 11v8" /><path d="M9.5 4.5v4A2.5 2.5 0 0 1 7 11" /><path d="M16 4.5v14.5" /><path d="M16 4.5c2.2 1 3.5 3 3.5 5.5 0 2.2-1.2 3.5-3.5 3.5" /></>,
  member: <><path d="M12 12a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z" /><path d="M5 20a7 7 0 0 1 14 0" /></>,
  memo: <><path d="M5 5h14v12H8l-3 3z" /><path d="M8 9h8" /><path d="M8 12.5h6" /></>,
  save: <><path d="M5 4.5h11l3 3V19H5z" /><path d="M8 4.5v5h7" /><path d="M8 16h8" /></>,
  edit: <><path d="M4.5 19.5l4.5-1 9-9a2.1 2.1 0 0 0-3-3l-9 9z" /><path d="m13.5 8.5 2 2" /></>,
  check: <path d="m5 12 4 4 10-10" />,
  search: <><circle cx="11" cy="11" r="5.5" /><path d="m16 16 3.5 3.5" /></>,
};

function SoftIcon({ name, className = "h-4 w-4" }: { name: SoftIconName; className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {softIconPaths[name]}
    </svg>
  );
}

function CloseButton({ onClick, label = "닫기" }: { onClick: () => void; label?: string }) {
  return (
    <button
      type="button"
      className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#f8f4f0] text-[#4b4541] ring-1 ring-[#eadfda] transition hover:bg-[#f2e8e3] active:bg-[#eadfda]"
      onClick={onClick}
      aria-label={label}
    >
      <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M6 6l12 12" />
        <path d="M18 6 6 18" />
      </svg>
    </button>
  );
}

function today() {
  const date = new Date();
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}

function parseDate(value: string) {
  return new Date(`${value}T00:00:00`);
}

function toDateKey(date: Date) {
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function endOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

function addDays(date: Date, amount: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

function addMonths(date: Date, amount: number) {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1);
}

function addYears(date: Date, amount: number) {
  return new Date(date.getFullYear() + amount, date.getMonth(), date.getDate());
}

function startOfWeek(date: Date) {
  const next = new Date(date);
  const day = next.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  next.setDate(next.getDate() + diff);
  return next;
}

function buildCalendarDays(month: Date) {
  const start = startOfMonth(month);
  const first = startOfWeek(start);
  return Array.from({ length: 42 }, (_, index) => {
    const date = addDays(first, index);
    return {
      date,
      inMonth: date.getMonth() === month.getMonth(),
    };
  });
}

function formatMonth(date: Date) {
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "long",
  }).format(date);
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("ko-KR").format(value);
}

function formatDateShort(date: Date) {
  return new Intl.DateTimeFormat("ko-KR", {
    month: "long",
    day: "numeric",
  }).format(date);
}

function addPeriod(date: Date, range: HistoryRange, direction: -1 | 1) {
  if (range === "day") return addDays(date, direction);
  if (range === "week") return addDays(date, direction * 7);
  if (range === "month") return addMonths(date, direction);
  return addYears(date, direction);
}

function getHistoryPeriod(range: HistoryRange, cursor: Date) {
  if (range === "day") {
    const date = toDateKey(cursor);
    return { start: date, end: date, label: formatDate(date) };
  }

  if (range === "week") {
    const start = startOfWeek(cursor);
    const end = addDays(start, 6);
    return {
      start: toDateKey(start),
      end: toDateKey(end),
      label: `${formatDateShort(start)} - ${formatDateShort(end)}`,
    };
  }

  if (range === "month") {
    const start = startOfMonth(cursor);
    const end = endOfMonth(cursor);
    return {
      start: toDateKey(start),
      end: toDateKey(end),
      label: formatMonth(cursor),
    };
  }

  const start = new Date(cursor.getFullYear(), 0, 1);
  const end = new Date(cursor.getFullYear(), 11, 31);
  return {
    start: toDateKey(start),
    end: toDateKey(end),
    label: `${cursor.getFullYear()}년`,
  };
}

function byId<T extends { id: string }>(items: T[]) {
  return new Map(items.map(item => [item.id, item]));
}

const exerciseById = byId(EXERCISES);

const BODY_FILTER_MUSCLES: Record<Exclude<BodyFilter, "all">, string[]> = {
  upper: ["chest", "back", "shoulders", "biceps", "triceps"],
  lower: ["quads", "adductors", "glutes", "abductors", "hamstrings", "calves"],
  core: ["core", "rectusAbs", "obliques", "transverseAbs", "lowerAbs", "hipFlexors", "erectors"],
};

const INTENSITY_LEVELS = [
  { value: "1", label: "가볍게", multiplier: 0.75 },
  { value: "2", label: "보통", multiplier: 1 },
  { value: "3", label: "강하게", multiplier: 1.25 },
];

function parseNumber(value: string | number | undefined) {
  const n = Number(value || 0);
  return Number.isFinite(n) ? n : 0;
}

function clampWeeklyGoal(value: unknown) {
  const goal = Math.floor(Number(value) || DEFAULT_SETTINGS.weeklyGoal);
  return Math.min(Math.max(goal, 1), 14);
}

function sanitizeExerciseIds(value: unknown) {
  if (!Array.isArray(value)) return [];
  const allowed = new Set(EXERCISES.map(exercise => exercise.id));
  return Array.from(new Set(value.map(String).filter(id => allowed.has(id))));
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

function sanitizeAge(value: unknown) {
  if (value === "" || value == null) return null;
  const number = Math.floor(Number(value));
  if (!Number.isFinite(number)) return null;
  return number >= 10 && number <= 100 ? number : null;
}

const ACTIVITY_LEVELS = [
  { value: "", label: "자동 추정", factor: null, description: "주간 운동 목표 기준으로 추정" },
  { value: "sedentary", label: "낮음", factor: 1.2, description: "주로 앉아서 생활" },
  { value: "light", label: "가벼움", factor: 1.375, description: "가벼운 활동 또는 주 1~3회 운동" },
  { value: "moderate", label: "보통", factor: 1.55, description: "주 3~5회 운동" },
  { value: "active", label: "높음", factor: 1.725, description: "주 5회 이상 활동적" },
] as const;

function sanitizeActivityLevel(value: unknown) {
  const activity = String(value || "");
  return ACTIVITY_LEVELS.some(level => level.value === activity) ? activity : "";
}

function activityFactor(settings: UserSettings) {
  const selected = ACTIVITY_LEVELS.find(level => level.value === settings.activityLevel);
  if (selected?.factor) return selected.factor;
  if (settings.weeklyGoal >= 5) return 1.55;
  if (settings.weeklyGoal >= 3) return 1.375;
  return 1.2;
}

function clampSetCount(value: string | number) {
  const count = Math.floor(Number(value) || 1);
  return Math.min(Math.max(count, 1), 20);
}

function intensityMultiplier(value: string | number | undefined) {
  const numeric = String(Number(value || 2) || 2);
  return INTENSITY_LEVELS.find(level => level.value === numeric)?.multiplier || 1;
}

function isCardioExercise(exercise?: Exercise) {
  return Boolean(exercise?.volumeType?.startsWith("cardio_"));
}

function isBodyWeightVolumeExercise(exercise?: Exercise) {
  return Boolean(exercise && [
    "bodyweight_factor",
    "bodyweight_factor_or_added",
    "bodyweight_or_weighted",
    "bodyweight_or_added",
    "bodyweight_or_assist",
    "time_or_bodyweight",
  ].includes(exercise.volumeType || ""));
}

function needsBodyWeightInput(exercise?: Exercise) {
  return Boolean(exercise && exercise.type !== "time" && isBodyWeightVolumeExercise(exercise));
}

function hasExternalLoadInput(exercise: Exercise) {
  return [
    "bodyweight_factor_or_added",
    "bodyweight_or_weighted",
    "bodyweight_or_added",
    "bodyweight_or_assist",
  ].includes(exercise.volumeType || "");
}

function formatKg(value?: string | number) {
  const numeric = Number(value || 0);
  return numeric > 0 ? `${numeric}KG` : "";
}

function cardioRpe(value: string | number | undefined, fallback = 5) {
  const rpe = Math.round(Number(value || fallback) || fallback);
  return Math.min(Math.max(rpe, 1), 10);
}

function draftSetCount(set: DraftSet) {
  return clampSetCount(set.setCount || 1);
}

function expandDraftSets(draftSets: DraftSet[], idPrefix: string): SetLog[] {
  return draftSets.flatMap((set, draftIndex) => {
    const exercise = exerciseById.get(set.exerciseId);
    const isTime = exercise?.type === "time";
    return Array.from({ length: draftSetCount(set) }, (_, setIndex) => ({
      id: `${idPrefix}-${draftIndex}-${setIndex}`,
      exerciseId: set.exerciseId,
      setNumber: 0,
      bodyWeight: needsBodyWeightInput(exercise) ? parseNumber(set.bodyWeight || "") : undefined,
      weight: isTime ? parseNumber(set.weight) || (isCardioExercise(exercise) ? exercise?.defaultRpe || 5 : 2) : parseNumber(set.weight),
      reps: isTime ? 1 : parseNumber(set.reps),
      durationSeconds: isTime ? parseNumber(set.reps) * 60 : undefined,
      memo: set.memo.trim() || undefined,
    }));
  }).map((set, index) => ({ ...set, setNumber: index + 1 }));
}

function setVolume(set: SetLog) {
  const exercise = exerciseById.get(set.exerciseId);
  if (exercise?.type === "time") {
    if (isCardioExercise(exercise)) {
      const minutes = Math.max(Number(set.durationSeconds || 0) / 60, 1);
      const rpe = cardioRpe(set.weight, exercise.defaultRpe || 5);
      const base = minutes * rpe;
      switch (exercise.volumeType) {
        case "cardio_interval":
          return Math.round(base * 1.2);
        case "cardio_recovery":
          return Math.round(base * 0.8);
        case "cardio_incline":
        case "cardio_level":
          return Math.round(base * 1.1);
        default:
          return Math.round(base);
      }
    }
    const base = Math.max(Number(set.durationSeconds || 0) / 60, 1) * 25 * intensityMultiplier(set.weight);
    return exercise.volumeType === "time_unilateral" ? base * 2 : base;
  }
  const weight = Math.max(Number(set.weight || 0), 0);
  const reps = Math.max(Number(set.reps || 0), 1);
  const bodyWeight = Math.max(Number(set.bodyWeight || 0), 0) || 55;

  switch (exercise?.volumeType) {
    case "dumbbell_both":
      return weight * 2 * reps;
    case "dumbbell_unilateral":
      return weight * reps * 2;
    case "dumbbell_unilateral_lower":
      return weight * 2 * reps * 2;
    case "single_weight_unilateral":
      return weight * reps * 2;
    case "machine_unilateral":
    case "cable_unilateral":
      return weight * reps * 2;
    case "carry_both":
    case "carry_single":
    case "sled_push":
      return weight * reps;
    case "carry_unilateral":
      return weight * reps * 2;
    case "bodyweight_factor":
      return bodyWeight * (exercise.bodyweightFactor || 1) * reps;
    case "bodyweight_factor_or_added":
      return (bodyWeight * (exercise.bodyweightFactor || 1) + weight) * reps;
    case "bodyweight_or_weighted":
      return weight > 0 ? weight * reps : bodyWeight * (exercise.bodyweightFactor || 1) * reps;
    case "bodyweight_or_added":
      return (bodyWeight * (exercise.bodyweightFactor || 1) + weight) * reps;
    case "bodyweight_or_assist":
      return Math.max(bodyWeight * (exercise.bodyweightFactor || 1) - weight, 0) * reps;
    default:
      return Math.max(weight, exercise?.type === "bodyweight" ? 10 : 0) * reps;
  }
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

const ANALYSIS_BODY_GROUPS = [
  { name: "가슴", ids: ["chest"], color: "#242124" },
  { name: "등", ids: ["back"], color: "#4b4541" },
  { name: "어깨", ids: ["shoulders"], color: "#7a7470" },
  { name: "팔", ids: ["biceps", "triceps"], color: "#9e9ea0" },
  { name: "코어", ids: ["core", "rectusAbs", "obliques", "transverseAbs", "lowerAbs", "hipFlexors", "erectors"], color: "#2f8c63" },
  { name: "하체", ids: ["quads", "adductors", "glutes", "abductors", "hamstrings", "calves"], color: "#6aa77b" },
  { name: "심폐", ids: ["cardio", "recovery"], color: "#c48f6a" },
] as const;

const ANALYSIS_RECOMMENDATION_GROUPS = ["하체", "코어", "등", "어깨", "팔", "가슴", "심폐"] as const;
const MUSCLE_RANK_EXCLUDED_IDS = new Set(["core", "cardio", "recovery"]);

function analysisBodyBalance(scores: Array<Muscle & { score: number }>) {
  const scoreMap = new Map(scores.map(item => [item.id, item.score]));
  return ANALYSIS_BODY_GROUPS.map(group => ({
    name: group.name,
    color: group.color,
    score: group.ids.reduce((sum, id) => sum + (scoreMap.get(id) || 0), 0),
  })).filter(item => item.score > 0).sort((a, b) => b.score - a.score);
}

function koreanObjectParticle(value: string) {
  const last = value.charCodeAt(value.length - 1);
  if (last < 0xac00 || last > 0xd7a3) return "를";
  return (last - 0xac00) % 28 === 0 ? "를" : "을";
}

function sessionStats(session: WorkoutSession) {
  const totalSets = session.sets.length;
  const volume = Math.round(session.sets.reduce((sum, set) => sum + setVolume(set), 0));
  const exercises = new Set(session.sets.map(set => set.exerciseId)).size;
  return { totalSets, volume, exercises };
}

function bodyWeightLoadText(exercise: Exercise | undefined, bodyWeight?: string | number, externalWeight?: string | number) {
  if (!needsBodyWeightInput(exercise)) return "";

  const bodyText = formatKg(bodyWeight);
  const loadText = bodyText ? `체중 ${bodyText}` : "체중 미설정";
  const externalText = formatKg(externalWeight);
  if (!externalText || !exercise) return loadText;

  if (exercise.volumeType === "bodyweight_or_assist") return `${loadText} · 보조 ${externalText}`;
  if (exercise.volumeType === "bodyweight_or_weighted") return `${loadText} · 중량 ${externalText}`;
  return `${loadText} · 추가 ${externalText}`;
}

function sessionExerciseSummaries(session: WorkoutSession) {
  const groups = new Map<string, { name: string; category: string; load: string; reps: string; sets: number }>();

  for (const set of session.sets) {
    const exercise = exerciseById.get(set.exerciseId);
    const name = exercise?.name || "운동";
    const category = exercise?.category || "운동";
    const cardio = isCardioExercise(exercise);
    const intensity = INTENSITY_LEVELS.find(level => level.value === String(Number(set.weight || 2) || 2))?.label || "보통";
    const load = exercise?.type === "time"
      ? cardio ? `RPE ${cardioRpe(set.weight, exercise?.defaultRpe || 5)}` : `강도 ${intensity}`
      : needsBodyWeightInput(exercise)
        ? bodyWeightLoadText(exercise, set.bodyWeight, set.weight)
      : Number(set.weight || 0) > 0
        ? `${Number(set.weight)}KG`
        : exercise?.type === "bodyweight"
          ? "체중"
          : "0KG";
    const reps = exercise?.type === "time"
      ? `${Math.max(Math.round(Number(set.durationSeconds || 0) / 60), 1)}분`
      : `${Number(set.reps || 0)}회`;
    const key = `${set.exerciseId}:${load}:${reps}`;
    const current = groups.get(key) || { name, category, load, reps, sets: 0 };
    current.sets += 1;
    groups.set(key, current);
  }

  return Array.from(groups.values()).sort((a, b) => a.name.localeCompare(b.name, "ko"));
}

function summarizeSessions(sessions: WorkoutSession[]) {
  const exerciseIds = new Set<string>();
  let sets = 0;
  let minutes = 0;
  let volume = 0;

  for (const session of sessions) {
    sets += session.sets.length;
    minutes += session.durationMinutes;
    volume += sessionStats(session).volume;
    for (const set of session.sets) {
      exerciseIds.add(set.exerciseId);
    }
  }

  return {
    count: sessions.length,
    sets,
    minutes,
    volume,
    exercises: exerciseIds.size,
  };
}

function sessionMatchesBodyFilter(session: WorkoutSession, filter: BodyFilter) {
  if (filter === "all") return true;
  const targets = new Set(BODY_FILTER_MUSCLES[filter]);
  return scoreSessions([session]).some(item => targets.has(item.id) && item.score > 0);
}

function formatDate(date: string) {
  const parsed = new Date(`${date}T00:00:00`);
  return new Intl.DateTimeFormat("ko-KR", {
    month: "long",
    day: "numeric",
    weekday: "short",
  }).format(parsed);
}

function defaultDraft(): DraftSet[] {
  return [];
}

function defaultExerciseForRoutine(routineLabel = ROUTINES[0].label) {
  return ROUTINES.find(item => item.label === routineLabel)?.exercises[0] || EXERCISES[0].id;
}

function routineNote(label: string) {
  return ROUTINES.find(item => item.label === label)?.note || "오늘 컨디션에 맞춰 가볍게 시작해요.";
}

function homeRoutineTitle(label: string) {
  if (label === "하체 집중") return "하체 가볍게 채우기";
  if (label === "상체 밸런스") return "상체 균형 맞추기";
  if (label === "코어 리셋") return "코어 가볍게 깨우기";
  return label;
}

function homeRoutineMeta(label: string) {
  if (label === "하체 집중") return "15분 · 초급 · 4개 운동";
  if (label === "상체 밸런스") return "20분 · 초급 · 4개 운동";
  if (label === "코어 리셋") return "12분 · 초급 · 3개 운동";
  return "15분 · 초급 · 추천 루틴";
}

function homeRoutineButton(label: string) {
  if (label === "하체 집중") return "15분 루틴 시작";
  if (label === "상체 밸런스") return "상체 루틴 시작";
  if (label === "코어 리셋") return "코어 루틴 시작";
  return "가볍게 시작하기";
}

function normalizeSearchText(value: string) {
  return value.toLocaleLowerCase("ko-KR").replace(/\s+/g, "");
}

function exerciseSearchText(exercise: Exercise) {
  const routineLabels = ROUTINES
    .filter(routine => routine.exercises.includes(exercise.id))
    .map(routine => routine.label)
    .join(" ");
  return normalizeSearchText(`${exercise.name} ${exercise.category} ${routineLabels} ${(exercise.subTabs || []).join(" ")} ${exercise.detail || ""} ${exercise.recordLabel || ""}`);
}

function exerciseImpactSummary(exercise: Exercise, limit?: number) {
  const totals = new Map<string, number>();
  for (const impact of exercise.impacts) {
    totals.set(impact.muscleId, (totals.get(impact.muscleId) || 0) + impact.impactRatio);
  }
  const entries = Array.from(totals.entries())
    .sort((a, b) => b[1] - a[1]);
  const visible = typeof limit === "number" ? entries.slice(0, limit) : entries;
  const hiddenCount = typeof limit === "number" ? Math.max(0, entries.length - visible.length) : 0;
  const summary = visible
    .map(([muscleId, ratio]) => {
      const muscle = MUSCLES.find(item => item.id === muscleId);
      return `${muscle?.name || muscleId} ${Math.round(ratio * 100)}%`;
    })
    .join(" · ");
  return hiddenCount > 0 ? `${summary} 외 ${hiddenCount}` : summary;
}

function workoutNameForSets(sets: Array<{ exerciseId: string }>, fallback = ROUTINES[0].label) {
  const fallbackTab = ROUTINE_TABS.find(tab => tab.value === fallback || tab.label === fallback);
  if (fallbackTab && sets.every(set => fallbackTab.exercises.includes(set.exerciseId))) {
    return fallbackTab.value;
  }

  const routineLabels = ROUTINES
    .filter(routine => sets.some(set => routine.exercises.includes(set.exerciseId)))
    .map(routine => routine.label);

  if (routineLabels.length === 0) return fallback;
  if (routineLabels.length === 1) return routineLabels[0];
  return "복합 루틴";
}

function draftSetsFromSession(session: WorkoutSession): DraftSet[] {
  const groups = new Map<string, SetLog[]>();
  for (const set of session.sets) {
    groups.set(set.exerciseId, [...(groups.get(set.exerciseId) || []), set]);
  }

  return Array.from(groups.entries()).map(([exerciseId, sets]) => {
    const first = sets[0];
    const exercise = exerciseById.get(exerciseId);
    const isTime = exercise?.type === "time";
    return {
      exerciseId,
      setCount: String(sets.length || 1),
      bodyWeight: needsBodyWeightInput(exercise) ? String(first.bodyWeight || "") : "",
      weight: isTime ? String(first.weight || 2) : String(first.weight || ""),
      reps: isTime ? String(Math.round((first.durationSeconds || 0) / 60) || "") : String(first.reps || ""),
      memo: first.memo || "",
    };
  });
}

function routineLabelFromSession(session: WorkoutSession) {
  const savedTab = ROUTINE_TABS.find(tab => tab.value === session.routineName || tab.label === session.routineName);
  if (savedTab) return savedTab.value;
  return ROUTINE_TABS.find(routine => routine.exercises.includes(session.sets[0]?.exerciseId || ""))?.value || ROUTINES[0].label;
}

function muscleIconKey(muscleId: string, group?: string): MuscleIconKey {
  if (muscleId in MUSCLE_FOCUS_IMAGES) return muscleId as MuscleIconKey;
  if (muscleId === "biceps" || muscleId === "triceps") return "arms";
  if (["rectusAbs", "obliques", "transverseAbs", "lowerAbs", "hipFlexors", "erectors"].includes(muscleId)) return "core";
  if (group === "하체") return "lower";
  if (group === "상체") return "upper";
  if (group === "코어") return "core";
  return "cardio";
}

export default function FitLogApp({ userEmail }: FitLogAppProps) {
  const [activeTab, setActiveTab] = useState<Tab>("home");
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [lastSavedSession, setLastSavedSession] = useState<WorkoutSession | null>(null);
  const [routineName, setRoutineName] = useState(ROUTINES[0].label);
  const [draftDate, setDraftDate] = useState(today());
  const [draftDuration, setDraftDuration] = useState("60");
  const [draftMemo, setDraftMemo] = useState("");
  const [draftSets, setDraftSets] = useState<DraftSet[]>(() => defaultDraft());
  const [selectedExercise, setSelectedExercise] = useState(EXERCISES[0].id);
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
  const [savingSettings, setSavingSettings] = useState(false);
  const [toast, setToast] = useState("");
  const [isOnline, setIsOnline] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    void loadSessions();
    void loadSettings();
  }, []);

  useEffect(() => {
    const tab = tabFromSearchParam(new URLSearchParams(window.location.search).get("tab"));
    if (tab) setActiveTab(tab);
  }, []);

  useEffect(() => {
    setIsOnline(navigator.onLine);
    const updateOnline = () => setIsOnline(navigator.onLine);
    window.addEventListener("online", updateOnline);
    window.addEventListener("offline", updateOnline);
    return () => {
      window.removeEventListener("online", updateOnline);
      window.removeEventListener("offline", updateOnline);
    };
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 3200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [activeTab]);

  function selectTab(tab: Tab) {
    setActiveTab(tab);
    const url = new URL(window.location.href);
    url.searchParams.set("tab", tab);
    window.history.replaceState(null, "", url);
    window.requestAnimationFrame(() => {
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    });
  }

  async function loadSessions() {
    setLoadingSessions(true);
    try {
      const res = await appFetch("/api/fit-log", { cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      assertApiResponse(res, data, "운동 기록을 불러오지 못했어요.");
      setSessions(Array.isArray(data.sessions) ? data.sessions : []);
      setLoadError("");
    } catch (error) {
      const message = error instanceof Error ? error.message : "운동 기록을 불러오지 못했어요.";
      setLoadError(message);
      setToast(message);
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
  const topToday = todayScores.filter(item => item.score > 0);

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

  async function loadSettings() {
    try {
      const res = await appFetch("/api/fit-settings", { cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      assertApiResponse(res, data, "설정을 불러오지 못했어요.");
      setSettings({
        weeklyGoal: clampWeeklyGoal(data.settings?.weeklyGoal),
        favoriteExerciseIds: sanitizeExerciseIds(data.settings?.favoriteExerciseIds),
        gender: sanitizeGender(data.settings?.gender),
        age: sanitizeAge(data.settings?.age),
        heightCm: sanitizeBodyNumber(data.settings?.heightCm),
        weightKg: sanitizeBodyNumber(data.settings?.weightKg),
        activityLevel: sanitizeActivityLevel(data.settings?.activityLevel),
      });
    } catch {
      setSettings(DEFAULT_SETTINGS);
    }
  }

  async function saveSettings(nextSettings: UserSettings) {
    if (!isOnline) {
      setToast("인터넷 연결을 확인한 뒤 다시 저장해 주세요.");
      return false;
    }

    const normalized = {
      weeklyGoal: clampWeeklyGoal(nextSettings.weeklyGoal),
      favoriteExerciseIds: sanitizeExerciseIds(nextSettings.favoriteExerciseIds),
      gender: sanitizeGender(nextSettings.gender),
      age: sanitizeAge(nextSettings.age),
      heightCm: sanitizeBodyNumber(nextSettings.heightCm),
      weightKg: sanitizeBodyNumber(nextSettings.weightKg),
      activityLevel: sanitizeActivityLevel(nextSettings.activityLevel),
    };

    setSavingSettings(true);
    try {
      const res = await appFetch("/api/fit-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(normalized),
      });
      const data = await res.json().catch(() => ({}));
      assertApiResponse(res, data, "설정 저장에 실패했어요.");
      setSettings(data.settings || normalized);
      setToast("내 정보 설정을 저장했어요.");
      return true;
    } catch (error) {
      setToast(error instanceof Error ? error.message : "설정 저장에 실패했어요.");
      return false;
    } finally {
      setSavingSettings(false);
    }
  }

  function saveDraftExercise(exerciseId: string, draft: Omit<DraftSet, "exerciseId">) {
    setDraftSets(items => {
      const nextDraft = { exerciseId, ...draft };
      const existingIndex = items.findIndex(item => item.exerciseId === exerciseId);
      if (existingIndex >= 0) {
        return items.map((item, index) => (index === existingIndex ? nextDraft : item));
      }
      return [...items, nextDraft];
    });
  }

  function addSet(exerciseId = selectedExercise, count = 1) {
    const exercise = exerciseById.get(exerciseId);
    setDraftSets(items => {
      const existingIndex = items.findIndex(item => item.exerciseId === exerciseId);
      if (existingIndex >= 0) {
        return items.map((item, index) => (
          index === existingIndex
            ? { ...item, setCount: String(draftSetCount(item) + clampSetCount(count)) }
            : item
        ));
      }

      return [...items, {
        exerciseId,
        setCount: String(clampSetCount(count)),
        weight: exercise?.type === "time" ? "2" : "",
        reps: "",
        memo: "",
      }];
    });
  }

  function removeSet(index: number) {
    setDraftSets(items => items.filter((_, i) => i !== index));
  }

  async function finishWorkout() {
    if (saving) return;

    if (!isOnline) {
      setToast("인터넷 연결을 확인한 뒤 다시 저장해 주세요.");
      return;
    }

    const validSets = expandDraftSets(draftSets, `${Date.now()}`)
      .filter(set => (set.durationSeconds || 0) > 0 || (set.reps || 0) > 0);

    if (validSets.length === 0) {
      setToast("저장할 세트를 하나 이상 입력해 주세요.");
      return;
    }

    const nextSession: WorkoutSession = {
      id: `${Date.now()}`,
      date: draftDate,
      routineName: workoutNameForSets(validSets, routineName),
      durationMinutes: Math.max(parseNumber(draftDuration), 1),
      memo: draftMemo.trim() || undefined,
      sets: validSets,
    };

    setSaving(true);
    try {
      const res = await appFetch("/api/fit-log", {
        method: editingSessionId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...nextSession, id: editingSessionId || nextSession.id }),
      });
      const data = await res.json().catch(() => ({}));
      assertApiResponse(res, data, "운동 기록 저장에 실패했어요.");
      setSessions(items => {
        const exists = items.some(item => item.id === data.session.id);
        if (exists) return items.map(item => (item.id === data.session.id ? data.session : item));
        return [data.session, ...items];
      });
      setLastSavedSession(data.session);
      setEditingSessionId(null);
      setDraftMemo("");
      setDraftSets(defaultDraft());
      setToast(editingSessionId ? "운동 기록을 수정했어요." : "운동 기록을 저장했어요.");
    } catch (error) {
      setToast(error instanceof Error ? error.message : "운동 기록 저장에 실패했어요.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteSession(id: string) {
    if (!isOnline) {
      setToast("인터넷 연결을 확인한 뒤 다시 삭제해 주세요.");
      return;
    }

    const confirmed = window.confirm("이 운동 기록을 삭제할까요? 삭제 후에는 복구할 수 없습니다.");
    if (!confirmed) return;

    try {
      const res = await appFetch(`/api/fit-log?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      const data = await res.json().catch(() => ({}));
      assertApiResponse(res, data, "기록 삭제에 실패했어요.");
      setSessions(items => items.filter(item => item.id !== id));
      if (lastSavedSession?.id === id) setLastSavedSession(null);
      if (editingSessionId === id) setEditingSessionId(null);
      setToast("기록을 삭제했어요.");
    } catch {
      setToast("네트워크 문제로 기록을 삭제하지 못했어요. 잠시 후 다시 시도해 주세요.");
    }
  }

  function editSession(session: WorkoutSession) {
    setEditingSessionId(session.id);
    setRoutineName(routineLabelFromSession(session));
    setDraftDate(session.date);
    setDraftDuration(String(session.durationMinutes || 60));
    setDraftMemo(session.memo || "");
    setDraftSets(draftSetsFromSession(session));
    setSelectedExercise(session.sets[0]?.exerciseId || defaultExerciseForRoutine(session.routineName));
    selectTab("train");
    setToast("수정할 운동을 불러왔어요.");
  }

  async function signOut() {
    try {
      const supabase = createSupabaseBrowser();
      await supabase?.auth.signOut();
    } finally {
      window.location.href = "/login";
    }
  }

  return (
    <main className="mysun-page min-h-screen">
      <TopBar userEmail={userEmail} onSignOut={signOut} setActiveTab={selectTab} />

      {!isOnline && (
        <div className="sticky top-[57px] z-30 border-y border-[#eadfda] bg-[#fff6d8] px-4 py-2 text-center text-sm font-semibold text-[#5f4a22]" role="status">
          오프라인 상태입니다. 기록 저장은 연결 후 다시 시도해 주세요.
        </div>
      )}

      {loadError && (
        <div className="sticky top-[57px] z-30 flex items-center justify-between gap-3 border-y border-[#eadfda] bg-[#fff6d8] px-4 py-2 text-sm font-semibold text-[#5f4a22]" role="alert">
          <span className="min-w-0">{loadError}</span>
          <button type="button" className="shrink-0 rounded-full bg-[#fffdfb] px-3 py-2 text-xs font-bold text-[#242124]" onClick={() => void loadSessions()}>
            다시 시도
          </button>
        </div>
      )}

      {activeTab === "home" && (
        <HomeDashboard
          loading={loadingSessions}
          sessions={sortedSessions}
          weekStats={weekStats}
          recent={sortedSessions[0]}
          recommendedRoutine={recommendedRoutine}
          settings={settings}
          onStart={() => {
            setRoutineName(recommendedRoutine);
            selectTab("train");
          }}
          onAnalyze={() => selectTab("balance")}
        />
      )}

      {activeTab === "train" && (
        <WorkoutEntryView
          routineName={routineName}
          setRoutineName={setRoutineName}
          draftDate={draftDate}
          setDraftDate={setDraftDate}
          draftDuration={draftDuration}
          setDraftDuration={setDraftDuration}
          draftMemo={draftMemo}
          setDraftMemo={setDraftMemo}
          draftSets={draftSets}
          removeSet={removeSet}
          saveDraftExercise={saveDraftExercise}
          favoriteExerciseIds={settings.favoriteExerciseIds}
          bodyWeightKg={settings.weightKg}
          finishWorkout={finishWorkout}
          editingSessionId={editingSessionId}
          lastSavedSession={lastSavedSession}
          onEditSession={editSession}
          saving={saving}
        />
      )}

      {activeTab === "log" && (
        <HistoryView loading={loadingSessions} sessions={sortedSessions} deleteSession={deleteSession} onStart={() => selectTab("train")} />
      )}

      {activeTab === "balance" && (
        <AnalysisView
          sessions={sortedSessions}
          weekStats={weekStats}
          weeklyScores={weeklyScores}
          todayScores={todayScores}
          groupBalance={groupBalance}
          recommendedRoutine={recommendedRoutine}
          onStart={() => {
            setRoutineName(recommendedRoutine);
            selectTab("train");
          }}
        />
      )}

      {activeTab === "diet" && (
        <DietView settings={settings} />
      )}

      {activeTab === "member" && (
        <ProfileView
          userEmail={userEmail}
          settings={settings}
          saving={savingSettings}
          onSave={saveSettings}
          onSignOut={signOut}
        />
      )}

      <MobileTabBar activeTab={activeTab} setActiveTab={selectTab} />

      {toast && (
        <div className="fixed bottom-[calc(6rem+env(safe-area-inset-bottom))] left-1/2 z-50 w-[calc(100vw-32px)] max-w-sm -translate-x-1/2 rounded-full bg-[#242124] px-5 py-3 text-center text-sm font-medium text-[#fffdfb]" role="status" aria-live="polite">
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
    <header className="sticky top-0 z-30 border-b border-[#eadfda] bg-[#fffdfb]/92 shadow-[0_8px_24px_rgba(58,48,50,0.05)] backdrop-blur">
      <div className="mx-auto flex h-14 max-w-[1440px] items-center justify-between px-4 md:h-16 md:px-8">
        <button type="button" className="inline-flex items-center gap-2 whitespace-nowrap text-[15px] font-bold md:text-xl" onClick={() => setActiveTab("home")}><span className="h-2.5 w-2.5 rounded-full bg-[#9cc9ac]" aria-hidden="true" />마이썬 운동일지</button>
        <div className="flex items-center gap-2">
          <span className="hidden max-w-[220px] truncate text-xs font-medium text-[#7a7470] md:inline">{userEmail}</span>
          <button type="button" className="inline-flex h-9 items-center gap-1.5 rounded-full bg-[#242124] px-4 text-sm font-semibold text-[#fffdfb] shadow-[0_8px_18px_rgba(36,33,36,0.16)]" onClick={() => setActiveTab("train")}><SoftIcon name="record" className="h-3.5 w-3.5" />기록</button>
          <button type="button" className="hidden h-9 rounded-full bg-[#f8f4f0] px-4 text-sm font-semibold text-[#242124] md:inline" onClick={onSignOut}>
            로그아웃
          </button>
        </div>
      </div>
    </header>
  );
}

type SummaryRange = "today" | "week" | "month" | "year";

const summaryRangeLabels: Record<SummaryRange, string> = {
  today: "오늘",
  week: "이번 주",
  month: "이번 달",
  year: "올해",
};

function rangeStart(range: SummaryRange) {
  const now = new Date();
  if (range === "today") return today();
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

function sessionsForSummaryRange(sessions: WorkoutSession[], range: SummaryRange) {
  const start = rangeStart(range);
  const end = today();
  if (range === "today") return sessions.filter(session => session.date === start);
  return sessions.filter(session => session.date >= start && session.date <= end);
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
  recommendedRoutine,
  settings,
  onStart,
  onAnalyze,
}: {
  loading: boolean;
  sessions: WorkoutSession[];
  weekStats: { count: number; sets: number; minutes: number; volume: number };
  recent?: WorkoutSession;
  recommendedRoutine: string;
  settings: UserSettings;
  onStart: () => void;
  onAnalyze: () => void;
}) {
  const [range, setRange] = useState<SummaryRange>("today");
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"range" | "recent">("range");
  const rangedSessions = useMemo(() => sessionsForSummaryRange(sessions, range), [sessions, range]);
  const summary = useMemo(() => workoutSummary(rangedSessions), [rangedSessions]);
  const rangeScores = useMemo(() => scoreSessions(rangedSessions).filter(item => item.score > 0), [rangedSessions]);
  const weekScores = useMemo(() => scoreSessions(sessionsForSummaryRange(sessions, "week")).filter(item => item.score > 0), [sessions]);
  const weekProgress = useMemo(() => sessionsForSummaryRange(sessions, "week").length, [sessions]);
  const weeklyGoal = clampWeeklyGoal(settings.weeklyGoal);
  const weeklyGoalPercent = Math.min(Math.round((weekProgress / weeklyGoal) * 100), 100);
  const goalRemaining = Math.max(weeklyGoal - weekProgress, 0);
  const hasRangedSessions = summary.count > 0;
  const goalComplete = goalRemaining === 0;
  const recommendedReason = goalRemaining > 0
    ? `이번 주 목표까지 ${goalRemaining}회 남았어요.`
    : "이번 주 목표는 완료했어요. 오늘은 균형만 맞춰도 충분해요.";
  const previewScores = rangeScores.length > 0 ? rangeScores : weekScores;
  const previewRangeLabel = rangeScores.length > 0 ? summaryRangeLabels[range] : weekScores.length > 0 ? "이번 주" : summaryRangeLabels[range];
  const previewMode = rangeScores.length > 0 ? "active" : weekScores.length > 0 ? "fallbackWeek" : "empty";

  return (
    <>
      <section className="relative min-h-[26svh] overflow-hidden bg-[#242124] md:min-h-[380px]">
        <div
          className="absolute inset-0 bg-cover bg-center md:bg-[center_45%]"
          style={{ backgroundImage: "url('/images/mysun-home-hero.webp')" }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#242124]/18 via-transparent to-transparent" />
      </section>

      <section className="mysun-section grid gap-5 pt-5 md:gap-7">
        <div className="mysun-card p-4 md:p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold text-[#7a7470]">{goalComplete ? "이번 주 목표 완료" : "이번 주 목표"}</p>
              <h2 className="mt-1 text-2xl font-semibold">{weekProgress}/{weeklyGoal}회 완료</h2>
            </div>
            <span className="rounded-full bg-[#edf8f1] px-3 py-1 text-xs font-bold text-[#2f8c63]">
              {weeklyGoalPercent}%
            </span>
          </div>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-[#eadfda]">
            <div className="h-full rounded-full bg-[#2f8c63]" style={{ width: `${weeklyGoalPercent}%` }} />
          </div>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm font-medium leading-6 text-[#4b4541]">
              {goalRemaining > 0 ? `${goalRemaining}회만 더 기록하면 목표 달성입니다.` : "이번 주 목표를 채웠어요. 오늘 운동도 추가로 남길 수 있어요."}
            </p>
            <button type="button" className="mysun-primary-action shrink-0 px-5 text-sm" onClick={onStart}>
              {goalComplete ? "추가 운동 기록하기" : "운동 기록하기"}
            </button>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]">
          <div className="mysun-card grid gap-4 p-4 md:p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="mt-1 text-2xl font-semibold">운동 요약</h2>
              </div>
              {hasRangedSessions && (
                <button type="button" className="rounded-full bg-[#f8f4f0] px-3 py-2 text-xs font-bold text-[#4b4541]" onClick={() => {
                  setModalMode("range");
                  setModalOpen(true);
                }}>
                  기록 보기
                </button>
              )}
            </div>
            <div className="mysun-tabbar">
              {(Object.keys(summaryRangeLabels) as SummaryRange[]).map(item => (
                <button
                  type="button"
                  key={item}
                  className={`mysun-tab px-3 ${range === item ? "mysun-tab-active" : "mysun-tab-idle"}`}
                  aria-pressed={range === item}
                  onClick={() => setRange(item)}
                >
                  {summaryRangeLabels[item]}
                </button>
              ))}
            </div>
            {hasRangedSessions ? (
              <>
                <div className="grid grid-cols-2 gap-2">
                  <HomeStatTile label="운동" value={loading ? "-" : `${summary.count}회`} />
                  <HomeStatTile label="시간" value={loading ? "-" : `${summary.minutes}분`} />
                </div>
                <button type="button" className="rounded-[14px] bg-[#f8f4f0] p-4 text-left" onClick={() => {
                  setModalMode("range");
                  setModalOpen(true);
                }}>
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-[#242124]">운동 밸런스</p>
                    <p className="text-xs font-semibold text-[#7a7470]">상체 / 하체 / 코어</p>
                  </div>
                  <BalanceBars balance={summary.balance} />
                </button>
              </>
            ) : (
              <div className="rounded-[18px] bg-[#f8f4f0] p-5">
                <h3 className="text-lg font-semibold">{range === "today" ? "오늘은 아직 기록이 없어요." : "선택한 기간에 기록이 없어요."}</h3>
                <p className="mt-2 text-sm font-medium leading-6 text-[#4b4541]">
                  {range === "today" && goalComplete
                    ? "목표는 달성했지만, 오늘 운동도 추가로 남길 수 있어요."
                    : "방금 한 운동이 있다면 바로 남겨보세요."}
                </p>
                <button type="button" className="mysun-primary-action mt-4 w-full text-sm" onClick={onStart}>
                  운동 기록하기
                </button>
              </div>
            )}
          </div>

          <div className="mysun-card p-5">
            <p className="text-sm font-medium text-[#7a7470]">오늘 추천</p>
            <div className="mt-3 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-semibold">{homeRoutineTitle(recommendedRoutine)}</h2>
                <p className="mt-2 text-xs font-bold text-[#2f8c63]">{homeRoutineMeta(recommendedRoutine)}</p>
                <p className="mt-2 text-sm leading-6 text-[#4b4541]">{recommendedReason}</p>
                <p className="mt-1 text-sm leading-6 text-[#4b4541]">{routineNote(recommendedRoutine)}</p>
              </div>
              <span className="shrink-0 rounded-full bg-[#f8f4f0] px-3 py-1 text-xs font-bold text-[#4b4541]">
                추천
              </span>
            </div>
            <button type="button" className="mysun-secondary-action mt-5 w-full text-base" onClick={onStart}>
              {homeRoutineButton(recommendedRoutine)}
            </button>
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <FlatPanel title={recent ? "마지막 운동" : "아직 기록이 없어요"} kicker="최근 기록">
            {recent ? (
              <HomeRecentRecordCard session={recent} onOpen={() => {
                setModalMode("recent");
                setModalOpen(true);
              }} />
            ) : (
              <EmptyState text="첫 운동을 기록하면 이곳에 최근 일지가 표시됩니다." action="첫 운동 기록" onClick={onStart} />
            )}
          </FlatPanel>

          <HomeAnalysisPreview
            rangeLabel={previewRangeLabel}
            scores={previewScores}
            mode={previewMode}
            onAnalyze={onAnalyze}
            onStart={onStart}
          />
        </div>
      </section>

      {modalOpen && (
        <WorkoutSummaryModal
          rangeLabel={modalMode === "recent" ? "최근 기록" : summaryRangeLabels[range]}
          sessions={modalMode === "recent" && recent ? [recent] : rangedSessions}
          onClose={() => setModalOpen(false)}
        />
      )}
    </>
  );
}

function HomeStatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[14px] bg-[#f8f4f0] p-4">
      <p className="text-xs font-semibold text-[#7a7470]">{label}</p>
      <p className="mt-3 text-[30px] font-semibold leading-none text-[#242124]">{value}</p>
    </div>
  );
}

function HomeRecentRecordCard({ session, onOpen }: { session: WorkoutSession; onOpen: () => void }) {
  const stats = sessionStats(session);
  const exercises = sessionExerciseSummaries(session).slice(0, 2);

  return (
    <button type="button" className="w-full rounded-[16px] bg-[#f8f4f0] p-4 text-left transition active:scale-[0.99]" onClick={onOpen}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[#7a7470]">
            {formatDate(session.date)} · {session.durationMinutes}분
          </p>
          <h3 className="mt-1 truncate text-xl font-semibold text-[#242124]">{session.routineName}</h3>
          <p className="mt-1 text-sm font-medium text-[#7a7470]">
            {stats.exercises}개 운동 · {stats.totalSets}세트
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-[#fffdfb] px-3 py-2 text-xs font-bold text-[#242124]">
          자세히
        </span>
      </div>

      {exercises.length > 0 && (
        <p className="mt-4 line-clamp-2 text-sm font-semibold leading-6 text-[#242124]">
          {exercises.map(item => `${item.name} ${item.sets}세트`).join(" · ")}
        </p>
      )}
    </button>
  );
}

function HomeAnalysisPreview({
  rangeLabel,
  scores,
  mode,
  onAnalyze,
  onStart,
}: {
  rangeLabel: string;
  scores: Array<Muscle & { score: number }>;
  mode: "active" | "fallbackWeek" | "empty";
  onAnalyze: () => void;
  onStart: () => void;
}) {
  const topScores = scores.slice(0, 3);
  const total = scores.reduce((sum, item) => sum + item.score, 0);

  return (
    <section className="mysun-card p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-[#7a7470]">분석 미리보기</p>
          <h2 className="mt-1 text-2xl font-semibold">{rangeLabel} 자극 부위</h2>
        </div>
        {mode !== "empty" && (
          <button type="button" className="rounded-full bg-[#f8f4f0] px-3 py-2 text-xs font-bold text-[#4b4541]" onClick={onAnalyze}>
            분석 보기
          </button>
        )}
      </div>

      {topScores.length > 0 && total > 0 ? (
        <div className="mt-5 grid gap-3">
          {mode === "fallbackWeek" && (
            <p className="rounded-[14px] bg-[#f8f4f0] p-3 text-sm font-medium leading-6 text-[#4b4541]">
              오늘 기록은 없어도, 이번 주 기록 기준으로 자극 부위를 확인할 수 있어요.
            </p>
          )}
          {topScores.map(item => {
            const percent = Math.round((item.score / total) * 100);
            return (
              <div key={item.id}>
                <div className="mb-1 flex items-center justify-between text-sm font-semibold">
                  <span>{item.name}</span>
                  <span className="text-[#7a7470]">{percent}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-[#f8f4f0]">
                  <div className="h-full rounded-full bg-[#242124]" style={{ width: `${Math.max(percent, 8)}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="mt-5 rounded-[18px] bg-[#f8f4f0] p-5">
          <p className="text-sm font-semibold text-[#242124]">오늘 분석할 기록이 없어요.</p>
          <p className="mt-2 text-sm font-medium leading-6 text-[#4b4541]">
            오늘 운동을 기록하면 자극 부위를 바로 확인할 수 있어요.
          </p>
          <button type="button" className="mysun-primary-action mt-4 w-full text-sm" onClick={onStart}>
            운동 기록하기
          </button>
        </div>
      )}
    </section>
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
          <div className="h-2 bg-[#fffdfb]">
            <div className="h-2 bg-[#242124]" style={{ width: `${row.value}%` }} />
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
  useEscapeToClose(true, onClose);

  return (
    <div className="fixed inset-0 z-50 grid place-items-end bg-[#242124]/48 p-0 backdrop-blur-sm md:place-items-center md:p-6" role="dialog" aria-modal="true" aria-label="운동 기록 목록" onClick={onClose}>
      <div className="flex max-h-[calc(100svh-0.75rem)] w-full flex-col overflow-hidden rounded-t-[22px] bg-[#fffdfb] shadow-[0_-18px_48px_rgba(58,48,50,0.18)] md:max-h-[88svh] md:max-w-lg md:rounded-[22px]" onClick={event => event.stopPropagation()}>
        <div className={`flex items-center justify-between border-b p-5 ${UI.border}`}>
          <div>
            <p className={`text-sm font-medium ${UI.textMuted}`}>{rangeLabel}</p>
            <h2 className="text-2xl font-semibold">운동 기록</h2>
          </div>
          <CloseButton onClick={onClose} />
        </div>
        <div className="min-h-0 overflow-y-auto p-5">
          {sessions.length === 0 ? (
            <p className={`${UI.surface} p-5 text-sm leading-6 ${UI.textMuted}`}>선택한 기간에 등록된 운동 기록이 없습니다.</p>
          ) : (
            <div className="grid gap-3">
              {sessions.map(session => <WorkoutSessionDetailCard key={session.id} session={session} />)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function draftExerciseSummary(set: DraftSet) {
  const exercise = exerciseById.get(set.exerciseId);
  const isTime = exercise?.type === "time";
  const intensity = INTENSITY_LEVELS.find(level => level.value === String(Number(set.weight || 2) || 2))?.label || "보통";
  const load = isTime
    ? isCardioExercise(exercise) ? `RPE ${cardioRpe(set.weight, exercise?.defaultRpe || 5)}` : `강도 ${intensity}`
    : needsBodyWeightInput(exercise)
      ? bodyWeightLoadText(exercise, set.bodyWeight, set.weight)
      : set.weight ? `${set.weight}KG` : exercise?.type === "bodyweight" ? "체중" : "무게 미입력";
  const reps = isTime ? `${set.reps || 0}분` : `${set.reps || 0}회`;
  return `${draftSetCount(set)}세트 · ${load} · ${reps}`;
}

function emptyDraftForExercise(exercise: Exercise, bodyWeightKg?: number | null): Omit<DraftSet, "exerciseId"> {
  return {
    setCount: "1",
    bodyWeight: needsBodyWeightInput(exercise) && bodyWeightKg ? String(bodyWeightKg) : "",
    weight: exercise.type === "time" ? String(isCardioExercise(exercise) ? exercise.defaultRpe || 5 : 2) : "",
    reps: "",
    memo: "",
  };
}

function WorkoutEntryView({
  routineName,
  setRoutineName,
  draftDate,
  setDraftDate,
  draftDuration,
  setDraftDuration,
  draftMemo,
  setDraftMemo,
  draftSets,
  removeSet,
  saveDraftExercise,
  favoriteExerciseIds,
  bodyWeightKg,
  finishWorkout,
  editingSessionId,
  lastSavedSession,
  onEditSession,
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
  removeSet: (index: number) => void;
  saveDraftExercise: (exerciseId: string, draft: Omit<DraftSet, "exerciseId">) => void;
  favoriteExerciseIds: string[];
  bodyWeightKg: number | null;
  finishWorkout: () => void | Promise<void>;
  editingSessionId: string | null;
  lastSavedSession: WorkoutSession | null;
  onEditSession: (session: WorkoutSession) => void;
  saving: boolean;
}) {
  const [exerciseSearch, setExerciseSearch] = useState("");
  const [editingExerciseId, setEditingExerciseId] = useState<string | null>(null);
  const [routineSubTab, setRoutineSubTab] = useState("전체");
  const currentRoutine = ROUTINE_TABS.find(routine => routine.value === routineName || routine.label === routineName) || ROUTINE_TABS[0];
  const currentSubTabs = routineSubTabs(currentRoutine);
  const hasSubTabs = currentSubTabs.length > 0;
  const searchQuery = normalizeSearchText(exerciseSearch);
  const favoriteSet = useMemo(() => new Set(favoriteExerciseIds), [favoriteExerciseIds]);
  const draftByExerciseId = useMemo(() => {
    const map = new Map<string, { draft: DraftSet; index: number }>();
    draftSets.forEach((draft, index) => map.set(draft.exerciseId, { draft, index }));
    return map;
  }, [draftSets]);
  const visibleExercises = useMemo(() => {
    const routineIds = new Set(currentRoutine.exercises);
    return EXERCISES
      .filter(exercise => routineIds.has(exercise.id))
      .filter(exercise => !hasSubTabs || routineSubTab === "전체" || exercise.subTabs?.includes(routineSubTab))
      .filter(exercise => !searchQuery || exerciseSearchText(exercise).includes(searchQuery))
      .sort((a, b) => Number(favoriteSet.has(b.id)) - Number(favoriteSet.has(a.id)) || a.name.localeCompare(b.name, "ko"));
  }, [currentRoutine, favoriteSet, hasSubTabs, routineSubTab, searchQuery]);
  const editingExercise = editingExerciseId ? exerciseById.get(editingExerciseId) : undefined;
  const editingDraft = editingExerciseId ? draftByExerciseId.get(editingExerciseId)?.draft : undefined;
  const savedScores = useMemo(
    () => (lastSavedSession ? scoreSessions([lastSavedSession]).filter(item => item.score > 0) : []),
    [lastSavedSession],
  );
  const savedFeedbackRef = useRef<HTMLDivElement | null>(null);
  const lastScrolledSavedId = useRef<string | null>(lastSavedSession?.id || null);
  const [memoModalOpen, setMemoModalOpen] = useState(false);

  useEffect(() => {
    if (!lastSavedSession?.id) {
      lastScrolledSavedId.current = null;
      return;
    }
    if (lastScrolledSavedId.current === lastSavedSession.id) return;
    lastScrolledSavedId.current = lastSavedSession.id;
    window.setTimeout(() => {
      savedFeedbackRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 120);
  }, [lastSavedSession?.id]);

  function handleRoutineTab(value: string) {
    setRoutineName(value);
    setExerciseSearch("");
    setRoutineSubTab("전체");
    setEditingExerciseId(null);
  }

  function removeDraftByExerciseId(exerciseId: string) {
    const target = draftByExerciseId.get(exerciseId);
    if (target) removeSet(target.index);
  }

  return (
    <section className="mysun-section grid gap-6 pb-32 md:grid-cols-[minmax(0,1fr)_360px]">
      <div>
        <SectionTitle kicker="운동 기록" title="오늘 운동" />
        <div className="mb-5 grid gap-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="날짜">
              <input className="nike-input" type="date" value={draftDate} onChange={event => setDraftDate(event.target.value)} />
            </Field>
            <Field label="운동 시간(분)">
              <input className="nike-input" inputMode="numeric" value={draftDuration} onChange={event => setDraftDuration(event.target.value)} />
            </Field>
          </div>
        </div>

        <div className="mysun-sticky-actions sticky top-[57px] z-20 mb-4 flex items-center justify-between gap-3 px-3 py-2.5">
          <div className="min-w-0">
            <p className={`text-xs font-semibold ${UI.textMuted}`}>오늘 담은 운동</p>
            <p className="mt-0.5 truncate text-base font-semibold">
              {draftSets.length > 0 ? `${draftSets.length}개 운동을 담았어요` : "운동을 선택해 오늘 루틴을 만들어요"}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              className={`mysun-secondary-action min-h-9 px-3 text-xs ${draftMemo.trim() ? `${UI.surfaceActive} ${UI.successText}` : ""}`}
              onClick={() => setMemoModalOpen(true)}
            >
              <span className="inline-flex items-center gap-1.5">
                <SoftIcon name="memo" className="h-3.5 w-3.5" />
                <span>{draftMemo.trim() ? "메모 수정" : "메모"}</span>
              </span>
            </button>
            <button
              type="button"
              className="mysun-primary-action min-h-9 px-3.5 text-xs"
              onClick={finishWorkout}
              disabled={saving}
              aria-busy={saving}
            >
              <span className="inline-flex items-center gap-1.5">
                <SoftIcon name="save" className="h-3.5 w-3.5" />
                <span>{saving ? "저장 중" : editingSessionId ? "수정 저장" : "저장"}</span>
              </span>
            </button>
          </div>
        </div>

        <div className="grid gap-3">
          <Field label="운동 검색">
            <input
              className="nike-input h-12 min-w-0 bg-[#f8f4f0]"
              value={exerciseSearch}
              onChange={event => setExerciseSearch(event.target.value)}
              placeholder="운동 이름을 검색해요"
            />
          </Field>

          <div className="mysun-tabbar">
            {ROUTINE_TABS.map(routine => (
              <button
                key={routine.label}
                type="button"
                className={`mysun-tab ${routine.value === routineName || routine.label === routineName ? "mysun-tab-active" : "mysun-tab-idle"}`}
                aria-pressed={routine.value === routineName || routine.label === routineName}
                onClick={() => handleRoutineTab(routine.value)}
              >
                {routine.label}
              </button>
            ))}
          </div>

          {hasSubTabs && (
            <div className="mysun-subtabbar">
              {currentSubTabs.map(tab => (
                <button
                  key={tab}
                  type="button"
                  className={`h-9 shrink-0 rounded-full px-4 text-xs font-semibold ${routineSubTab === tab ? "bg-[#242124] text-[#fffdfb]" : "bg-[#f8f4f0] text-[#7a7470]"}`}
                  aria-pressed={routineSubTab === tab}
                  onClick={() => setRoutineSubTab(tab)}
                >
                  {tab}
                </button>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between gap-3 pt-1">
            <p className={`text-xs font-medium ${UI.textMuted}`}>{exerciseSearch ? "검색 결과" : `${currentRoutine.label} 운동 목록`}</p>
            <span className={`text-xs font-semibold ${UI.textMuted}`}>{visibleExercises.length}개</span>
          </div>

          <div className="grid gap-2">
            {visibleExercises.map(exercise => {
              const saved = draftByExerciseId.get(exercise.id)?.draft;
              const favorite = favoriteSet.has(exercise.id);
              const primaryPart = exercise.subTabs?.[0] || exercise.detail || exercise.category;
              const secondaryPart = exercise.subTabs?.[1] ? ` · ${exercise.subTabs[1]}` : "";
              const partLabel = `${exercise.category} · ${primaryPart}${secondaryPart}`;
              return (
                <button
                  key={exercise.id}
                  type="button"
                  className={`mysun-exercise-row ${saved ? "mysun-exercise-row-active" : ""}`}
                  onClick={() => setEditingExerciseId(exercise.id)}
                >
                  {saved && <span className="absolute inset-y-0 left-0 w-1 bg-[#2f8c63]" />}
                  <span className="min-w-0 pl-1">
                    <span className="flex min-w-0 items-center gap-2">
                      {favorite && <b className="shrink-0 rounded-full bg-[#edf8f1] px-2 py-0.5 text-[10px] font-bold text-[#2f8c63]">자주 하는 운동</b>}
                      <span className="truncate text-[15px] font-bold">{exercise.name}</span>
                    </span>
                    <span className={`mt-2 flex flex-wrap items-center gap-1.5 text-[11px] font-medium leading-5 ${UI.textMuted}`}>
                      <span className="truncate">{partLabel}</span>
                      <span className="rounded-full bg-[#f8f4f0] px-2 py-0.5">휴식 {exercise.defaultRestSeconds}초</span>
                    </span>
                    {saved && (
                      <span className="mt-2 inline-flex w-fit items-center gap-1.5 rounded-full bg-[#fffdfb] px-2.5 py-1 text-xs font-semibold text-[#2f8c63] ring-1 ring-[#b9dfc5]">
                        <SoftIcon name="check" className="h-3.5 w-3.5" />
                        {draftExerciseSummary(saved)}
                      </span>
                    )}
                  </span>
                  <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-bold ${saved ? "bg-[#fffdfb] text-[#2f8c63]" : "bg-[#242124] text-[#fffdfb]"}`}>
                    <SoftIcon name={saved ? "edit" : "record"} className="h-3.5 w-3.5" />
                    <span>{saved ? "수정" : "입력"}</span>
                  </span>
                </button>
              );
            })}

            {visibleExercises.length === 0 && (
              <div className={`${UI.surface} rounded-[14px] p-4 text-sm font-semibold ${UI.textMuted}`}>
                검색 결과가 없어요. 다른 이름으로 찾아보세요.
              </div>
            )}
          </div>

          {draftSets.length > 0 && (
            <div className="border-t border-[#eadfda] pt-4">
              <p className={`text-sm font-medium ${UI.textMuted}`}>입력된 운동</p>
              <div className="mt-3 grid gap-2">
                {draftSets.map((draft, index) => {
                  const exercise = exerciseById.get(draft.exerciseId);
                  return (
                    <div key={draft.exerciseId} className="mysun-panel flex items-center justify-between gap-3 p-3">
                      <button className="min-w-0 flex-1 text-left" type="button" onClick={() => setEditingExerciseId(draft.exerciseId)}>
                        <span className="block truncate text-sm font-semibold">{exercise?.name || "운동"}</span>
                        <span className={`mt-1 block text-xs font-semibold ${UI.textMuted}`}>{draftExerciseSummary(draft)}</span>
                      </button>
                      <button className="shrink-0 rounded-full bg-[#fffdfb] px-3 py-2 text-xs font-semibold text-[#c84653]" type="button" onClick={() => removeSet(index)}>
                        삭제
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
        {lastSavedSession && (
          <div ref={savedFeedbackRef} className="mt-6 grid scroll-mt-24 gap-6 md:hidden">
            <SavedWorkoutPanel session={lastSavedSession} onEdit={() => onEditSession(lastSavedSession)} />
            <FlatPanel title="기록된 자극" kicker="방금 저장">
              <BodyMap scores={savedScores} />
            </FlatPanel>
          </div>
        )}
      </div>

      <aside className="hidden gap-6 self-start md:grid">
        {lastSavedSession && (
          <SavedWorkoutPanel session={lastSavedSession} onEdit={() => onEditSession(lastSavedSession)} />
        )}
        {lastSavedSession && (
          <FlatPanel title="기록된 자극" kicker="방금 저장">
            <BodyMap scores={savedScores} />
          </FlatPanel>
        )}
      </aside>

      {editingExercise && (
        <ExerciseEntryModal
          key={editingExercise.id}
          exercise={editingExercise}
          draft={editingDraft}
          bodyWeightKg={bodyWeightKg}
          onClose={() => setEditingExerciseId(null)}
          onRemove={editingDraft ? () => {
            removeDraftByExerciseId(editingExercise.id);
            setEditingExerciseId(null);
          } : undefined}
          onSave={draft => {
            saveDraftExercise(editingExercise.id, draft);
            setEditingExerciseId(null);
          }}
        />
      )}
      {memoModalOpen && (
        <MemoEntryModal
          value={draftMemo}
          onChange={setDraftMemo}
          onClose={() => setMemoModalOpen(false)}
        />
      )}
    </section>
  );
}


function MemoEntryModal({
  value,
  onChange,
  onClose,
}: {
  value: string;
  onChange: (value: string) => void;
  onClose: () => void;
}) {
  useEscapeToClose(true, onClose);

  return (
    <div className="fixed inset-0 z-50 grid place-items-end bg-[#242124]/48 p-0 backdrop-blur-sm md:place-items-center md:p-6" role="dialog" aria-modal="true" aria-label="운동 메모 입력" onClick={onClose}>
      <div className="mysun-bottom-sheet md:max-h-[88svh]" onClick={event => event.stopPropagation()}>
        <div className={`flex items-start justify-between gap-4 border-b bg-[#fffdfb] p-5 ${UI.border}`}>
          <div>
            <p className="text-sm font-medium text-[#7a7470]">운동 기록</p>
            <h2 className="mt-1 text-2xl font-semibold">메모 추가</h2>
          </div>
          <CloseButton onClick={onClose} />
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          <Field label="메모">
            <textarea
              className="nike-input min-h-40 resize-none bg-[#fffdfb]"
              value={value}
              onChange={event => onChange(event.target.value)}
              placeholder="컨디션, 통증, 다음에 기억할 점을 적어주세요."
              autoFocus
            />
          </Field>
        </div>
        <div className="mysun-sheet-footer">
            <button type="button" className={`${UI.primaryButton} h-12 text-base`} onClick={onClose}>
            완료
          </button>
          {value.trim() && (
            <button type="button" className={`${UI.dangerButton} h-12 px-5 text-sm`} onClick={() => onChange("")}>
              삭제
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function ExerciseEntryModal({
  exercise,
  draft,
  bodyWeightKg,
  onClose,
  onSave,
  onRemove,
}: {
  exercise: Exercise;
  draft?: DraftSet;
  bodyWeightKg: number | null;
  onClose: () => void;
  onSave: (draft: Omit<DraftSet, "exerciseId">) => void;
  onRemove?: () => void;
}) {
  useEscapeToClose(true, onClose);

  const bodyWeightRequired = needsBodyWeightInput(exercise);
  const showExternalLoad = exercise.type !== "time" && hasExternalLoadInput(exercise);
  const initialDraft = draft || { exerciseId: exercise.id, ...emptyDraftForExercise(exercise, bodyWeightKg) };
  const [setCount, setSetCount] = useState(initialDraft.setCount);
  const [bodyWeight, setBodyWeight] = useState(initialDraft.bodyWeight || (bodyWeightRequired && bodyWeightKg ? String(bodyWeightKg) : ""));
  const [weight, setWeight] = useState(initialDraft.weight);
  const [reps, setReps] = useState(initialDraft.reps);
  const isTime = exercise.type === "time";
  const isCardio = isCardioExercise(exercise);
  const weightLabel = isTime
    ? isCardio ? "RPE" : "강도"
    : exercise.volumeType === "bodyweight_or_assist"
      ? "보조중량(KG)"
      : exercise.volumeType === "bodyweight_or_added" || exercise.volumeType === "bodyweight_factor_or_added"
        ? "추가중량(KG)"
        : exercise.volumeType === "carry_both"
          ? "총 중량(KG)"
          : exercise.volumeType === "carry_unilateral"
            ? "한쪽 중량(KG)"
        : "KG";
  const isCarry = ["carry_both", "carry_unilateral", "carry_single", "sled_push"].includes(exercise.volumeType || "");
  const isUnilateral = ["dumbbell_unilateral_lower", "machine_unilateral", "cable_unilateral", "time_unilateral", "single_weight_unilateral", "carry_unilateral"].includes(exercise.volumeType || "");
  const repsLabel = isTime ? "분" : isCarry ? "거리/시간" : "횟수";
  const canSave = parseNumber(reps) > 0 && (!bodyWeightRequired || parseNumber(bodyWeight) > 0);

  function handleSave() {
    onSave({
      setCount: String(clampSetCount(setCount)),
      bodyWeight: bodyWeightRequired ? bodyWeight : "",
      weight: isTime ? weight || "2" : weight,
      reps,
      memo: initialDraft.memo || "",
    });
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-end bg-[#242124]/48 p-0 backdrop-blur-sm md:place-items-center md:p-6" role="dialog" aria-modal="true" aria-label={`${exercise.name} 운동 입력`} onClick={onClose}>
      <div className="mysun-bottom-sheet" onClick={event => event.stopPropagation()}>
        <div className={`flex items-start justify-between gap-4 border-b bg-[#fffdfb] p-5 ${UI.border}`}>
          <div className="min-w-0">
            <p className={`text-sm font-medium ${UI.textMuted}`}>{exercise.category}</p>
            <h2 className="mt-1 truncate text-2xl font-semibold">{exercise.name}</h2>
            {exercise.detail && <p className="mt-2 text-sm font-semibold text-[#242124]">{exercise.detail}</p>}
          </div>
          <CloseButton onClick={onClose} />
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-5 pb-4">
          <div className="grid gap-5">
            <div className={`grid gap-3 p-4 ${UI.surface}`}>
              {exercise.recordLabel && (
                <div>
                  <p className={`text-xs font-semibold ${UI.textMuted}`}>이렇게 기록해요</p>
                  <p className="mt-1 text-sm font-medium leading-5 text-[#242124]">{exercise.recordLabel}</p>
                </div>
              )}
              <div>
                <p className={`text-xs font-semibold ${UI.textMuted}`}>자극 부위</p>
                <p className="mt-1 text-sm font-medium leading-6 text-[#242124]">{exerciseImpactSummary(exercise)}</p>
              </div>
            </div>

            <div className="grid gap-3">
              <Field label="세트 수">
                <input
                  className="nike-input bg-[#fffdfb] px-3 text-center"
                  inputMode="numeric"
                  value={setCount}
                  onChange={event => setSetCount(event.target.value)}
                  onFocus={event => event.currentTarget.select()}
                  onBlur={() => setSetCount(String(clampSetCount(setCount)))}
                />
              </Field>
              {bodyWeightRequired && (
                <Field label="체중(KG)">
                  <input
                    className="nike-input bg-[#fffdfb] px-3"
                    inputMode="decimal"
                    value={bodyWeight}
                    onChange={event => setBodyWeight(event.target.value)}
                    placeholder="미설정"
                  />
                </Field>
              )}
              <div className={`grid gap-2 ${showExternalLoad || isTime || !bodyWeightRequired ? "grid-cols-2" : "grid-cols-1"}`}>
                {(showExternalLoad || isTime || !bodyWeightRequired) && (
                  <Field label={weightLabel}>
                    {isTime && isCardio ? (
                      <RpePicker value={weight || String(exercise.defaultRpe || 5)} onChange={setWeight} />
                    ) : isTime ? (
                      <IntensityPicker value={weight || "2"} onChange={setWeight} />
                    ) : (
                      <input className="nike-input bg-[#fffdfb] px-3" inputMode="decimal" value={weight} onChange={event => setWeight(event.target.value)} placeholder="0" />
                    )}
                  </Field>
                )}
                <Field label={repsLabel}>
                  <input className="nike-input bg-[#fffdfb] px-3" inputMode="numeric" value={reps} onChange={event => setReps(event.target.value)} placeholder={isTime ? "10" : isCarry ? "30" : "12"} />
                </Field>
              </div>
            </div>

            <div className={`grid gap-2 p-4 ${UI.surface}`}>
              {bodyWeightRequired && (
                <p className={`text-xs font-semibold ${parseNumber(bodyWeight) > 0 ? UI.textMuted : UI.dangerText}`}>
                  {bodyWeightKg
                    ? `내 정보 체중 ${bodyWeightKg}KG이 기본 입력됩니다.`
                    : "내 정보에 체중이 미설정되어 있어 수기로 입력해 주세요."}
                </p>
              )}
              <p className={`text-xs font-semibold ${UI.textMuted}`}>
                저장 시 {clampSetCount(setCount)}세트로 계산됩니다.
              </p>
              {isUnilateral && (
                <p className={`text-xs font-semibold ${UI.textMuted}`}>
                  편측 운동은 한쪽 기준으로 입력하면 좌우 합산 Volume이 자동 계산됩니다.
                </p>
              )}
              {isCarry && (
                <p className={`text-xs font-semibold ${UI.textMuted}`}>
                  이동형 운동은 거리(m) 또는 시간(초)을 거리/시간 칸에 입력하면 부하로 계산됩니다.
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="mysun-sheet-footer">
          <button type="button" className={`${UI.primaryButton} h-12 text-base`} onClick={handleSave} disabled={!canSave}>
            입력 저장
          </button>
          {onRemove && (
            <button type="button" className={`${UI.dangerButton} h-12 px-5 text-sm`} onClick={onRemove}>
              삭제
            </button>
          )}
        </div>
      </div>
    </div>
  );
}


function IntensityPicker({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <div className="grid grid-cols-3 overflow-hidden rounded-full bg-[#fffdfb] p-1">
      {INTENSITY_LEVELS.map(level => (
        <button
          key={level.value}
          type="button"
          className={`h-10 rounded-full px-2 text-[11px] font-semibold ${value === level.value ? "bg-[#242124] text-[#fffdfb]" : "text-[#7a7470]"}`}
          onClick={() => onChange(level.value)}
        >
          {level.label}
        </button>
      ))}
    </div>
  );
}

function RpePicker({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <div className="grid grid-cols-5 gap-1">
      {Array.from({ length: 10 }, (_, index) => String(index + 1)).map(level => (
        <button
          key={level}
          type="button"
          className={`h-9 rounded-full text-xs font-bold ${value === level ? "bg-[#242124] text-[#fffdfb]" : "bg-[#fffdfb] text-[#7a7470] ring-1 ring-[#eadfda]"}`}
          onClick={() => onChange(level)}
        >
          {level}
        </button>
      ))}
    </div>
  );
}

function SavedWorkoutPanel({ session, onEdit }: { session: WorkoutSession; onEdit: () => void }) {
  const stats = sessionStats(session);
  const exercises = Array.from(new Set(session.sets.map(set => exerciseById.get(set.exerciseId)?.name || "운동")));

  return (
    <section className="rounded-[20px] bg-[#fffdfb] p-5 text-[#242124] shadow-[0_14px_36px_rgba(58,48,50,0.06)] ring-1 ring-[#eadfda]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-[#7a7470]">방금 저장</p>
          <h2 className="mt-1 text-2xl font-semibold">{session.routineName}</h2>
          <p className="mt-1 text-sm font-medium text-[#7a7470]">{formatDate(session.date)}</p>
        </div>
        <button type="button" className="h-10 rounded-full bg-[#242124] px-4 text-sm font-semibold text-[#fffdfb]" onClick={onEdit}>
          수정
        </button>
      </div>
      <div className="mt-5 grid grid-cols-3 gap-2">
        <SmallStudioStat label="세트" value={`${stats.totalSets}`} />
        <SmallStudioStat label="운동" value={`${stats.exercises}`} />
        <SmallStudioStat label="시간" value={`${session.durationMinutes}분`} />
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {exercises.map(exercise => (
          <span key={exercise} className="rounded-full bg-[#f8f4f0] px-3 py-1 text-xs font-semibold text-[#4b4541]">
            {exercise}
          </span>
        ))}
      </div>
    </section>
  );
}

function HistoryView({
  loading,
  sessions,
  deleteSession,
  onStart,
}: {
  loading: boolean;
  sessions: WorkoutSession[];
  deleteSession: (id: string) => void;
  onStart: () => void;
}) {
  const [calendarMonth, setCalendarMonth] = useState(() => startOfMonth(parseDate(today())));
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [range, setRange] = useState<HistoryRange>("week");
  const [rangeCursor, setRangeCursor] = useState(() => parseDate(today()));
  const [bodyFilter, setBodyFilter] = useState<BodyFilter>("all");
  const [calendarExpanded, setCalendarExpanded] = useState(false);
  const [focusedSession, setFocusedSession] = useState<WorkoutSession | null>(null);

  const sessionsByDate = useMemo(() => {
    const map = new Map<string, WorkoutSession[]>();
    for (const session of sessions) {
      map.set(session.date, [...(map.get(session.date) || []), session]);
    }
    return map;
  }, [sessions]);

  const calendarDays = useMemo(() => buildCalendarDays(calendarMonth), [calendarMonth]);
  const selectedSessions = selectedDate ? sessionsByDate.get(selectedDate) || [] : [];
  const period = useMemo(() => getHistoryPeriod(range, rangeCursor), [range, rangeCursor]);
  const filteredSessions = useMemo(
    () => sessions
      .filter(session => session.date >= period.start && session.date <= period.end)
      .filter(session => sessionMatchesBodyFilter(session, bodyFilter))
      .sort((a, b) => b.date.localeCompare(a.date)),
    [bodyFilter, period.end, period.start, sessions],
  );
  const filteredStats = useMemo(() => summarizeSessions(filteredSessions), [filteredSessions]);
  const rangeHasRecords = filteredSessions.length > 0;
  const monthSessions = useMemo(() => {
    const start = toDateKey(startOfMonth(calendarMonth));
    const end = toDateKey(endOfMonth(calendarMonth));
    return sessions.filter(session => session.date >= start && session.date <= end);
  }, [calendarMonth, sessions]);
  const monthStats = useMemo(() => summarizeSessions(monthSessions), [monthSessions]);
  const monthWorkoutDays = useMemo(() => new Set(monthSessions.map(session => session.date)).size, [monthSessions]);
  const filterCounts = useMemo(() => ({
    all: sessions
      .filter(session => session.date >= period.start && session.date <= period.end)
      .length,
    upper: sessions
      .filter(session => session.date >= period.start && session.date <= period.end)
      .filter(session => sessionMatchesBodyFilter(session, "upper"))
      .length,
    lower: sessions
      .filter(session => session.date >= period.start && session.date <= period.end)
      .filter(session => sessionMatchesBodyFilter(session, "lower"))
      .length,
    core: sessions
      .filter(session => session.date >= period.start && session.date <= period.end)
      .filter(session => sessionMatchesBodyFilter(session, "core"))
      .length,
  }), [period.end, period.start, sessions]);

  function moveCalendar(direction: -1 | 1) {
    setCalendarMonth(current => addMonths(current, direction));
  }

  function movePeriod(direction: -1 | 1) {
    setRangeCursor(current => addPeriod(current, range, direction));
  }

  function chooseRange(nextRange: HistoryRange) {
    setRange(nextRange);
  }

  return (
    <section className="mx-auto max-w-[960px] px-4 py-7 pb-[calc(9rem+env(safe-area-inset-bottom))] md:px-8 md:py-10">
      <div className="mb-5">
        <p className={`text-sm font-medium ${UI.textMuted}`}>운동 일지</p>
        <h1 className="mt-1 text-[31px] font-bold leading-tight md:text-5xl">기록 모아보기</h1>
      </div>
      {loading ? (
        <EmptyState text="운동 기록을 불러오는 중입니다." />
      ) : sessions.length === 0 ? (
        <EmptyState text="아직 저장된 운동 기록이 없어요. 첫 운동을 기록해 보세요." action="운동 기록하기" onClick={onStart} />
      ) : (
        <div className="grid gap-5">
          <section className="mysun-card p-4 md:p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className={`text-sm font-medium ${UI.textMuted}`}>선택 기간</p>
                <h2 className="mt-1 text-2xl font-semibold">{period.label}</h2>
                <p className="mt-2 text-sm font-semibold text-[#4b4541]">
                  {filteredStats.count}회 · {filteredStats.exercises}종목 · {filteredStats.minutes}분
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                <button type="button" className={`grid h-10 w-10 place-items-center text-lg ${UI.secondaryButton}`} onClick={() => movePeriod(-1)} aria-label="이전 기간">
                  ‹
                </button>
                <button type="button" className={`grid h-10 w-10 place-items-center text-lg ${UI.secondaryButton}`} onClick={() => movePeriod(1)} aria-label="다음 기간">
                  ›
                </button>
              </div>
            </div>

            <SegmentedControl
              className="mt-5"
              items={[
                { id: "day", label: "일별" },
                { id: "week", label: "주별" },
                { id: "month", label: "월별" },
                { id: "year", label: "년별" },
              ]}
              value={range}
              onChange={value => chooseRange(value as HistoryRange)}
            />
          </section>

          <section className="mysun-card p-4 md:p-5">
            <button
              type="button"
              className="flex w-full items-center justify-between gap-3 text-left"
              onClick={() => setCalendarExpanded(value => !value)}
              aria-expanded={calendarExpanded}
            >
              <div>
                <p className={`text-sm font-medium ${UI.textMuted}`}>캘린더</p>
                <h2 className="mt-1 text-xl font-semibold">{formatMonth(calendarMonth)} · 운동한 날 {monthWorkoutDays}일</h2>
                <p className="mt-1 text-sm font-medium text-[#4b4541]">
                  {monthWorkoutDays > 0 ? `총 ${monthStats.minutes}분 기록했어요.` : "이번 달 운동 흔적을 쌓아보세요."}
                </p>
              </div>
              <span className="rounded-full bg-[#f8f4f0] px-3 py-2 text-xs font-bold text-[#4b4541]">
                {calendarExpanded ? "접기" : "보기"}
              </span>
            </button>

            {calendarExpanded && (
              <div className="mt-5">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div className="flex flex-wrap gap-3 text-[11px] font-semibold text-[#7a7470]">
                    <span className="inline-flex items-center gap-1"><i className="h-2 w-2 rounded-full bg-[#242124]" />오늘</span>
                    <span className="inline-flex items-center gap-1"><i className="h-2 w-2 rounded-full bg-[#4da36f]" />기록 있음</span>
                    <span className="inline-flex items-center gap-1"><i className="h-2 w-4 rounded-full bg-[#f1eadf]" />선택 기간</span>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <button type="button" className={`grid h-9 w-9 place-items-center text-base ${UI.secondaryButton}`} onClick={() => moveCalendar(-1)} aria-label="이전 달">
                      ‹
                    </button>
                    <button type="button" className={`grid h-9 w-9 place-items-center text-base ${UI.secondaryButton}`} onClick={() => moveCalendar(1)} aria-label="다음 달">
                      ›
                    </button>
                  </div>
                </div>

                <div className={`grid grid-cols-7 gap-1 text-center text-xs font-semibold ${UI.textMuted}`}>
                  {["월", "화", "수", "목", "금", "토", "일"].map(day => <span key={day}>{day}</span>)}
                </div>
                <div className="mt-2 grid grid-cols-7 gap-1">
                  {calendarDays.map(day => {
                    const dateKey = toDateKey(day.date);
                    const daySessions = sessionsByDate.get(dateKey) || [];
                    const hasRecord = daySessions.length > 0;
                    const isToday = dateKey === today();
                    const isInPeriod = dateKey >= period.start && dateKey <= period.end;
                    const recordTone = daySessions.length > 1
                      ? "bg-[#d9f1e2] text-[#24583e] ring-1 ring-[#8bcda2]"
                      : "bg-[#e9f8ee] text-[#2c6548] ring-1 ring-[#b9dfc5]";
                    return (
                      <button type="button"
                        key={dateKey}
                        className={`relative grid aspect-square place-items-center rounded-[12px] text-sm font-semibold transition ${
                          hasRecord
                            ? recordTone
                            : isInPeriod
                            ? "bg-[#f1eadf] text-[#242124]"
                            : day.inMonth
                              ? "bg-[#fffdfb] text-[#242124] ring-1 ring-[#eadfda]"
                              : "bg-[#fffdfb] text-[#ded4cf]"
                        } ${isInPeriod ? "shadow-[inset_0_0_0_2px_rgba(36,33,36,0.12)]" : ""}`}
                        onClick={() => hasRecord && setSelectedDate(dateKey)}
                        disabled={!hasRecord}
                        aria-label={`${formatDate(dateKey)} 운동 기록 ${daySessions.length}개`}
                      >
                        <span>{day.date.getDate()}</span>
                        {isToday && <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-[#242124]" />}
                        {hasRecord && (
                          <span className="absolute bottom-1.5 left-1/2 flex -translate-x-1/2 items-center gap-0.5">
                            <i className="h-1.5 w-1.5 rounded-full bg-[#4da36f]" />
                            {daySessions.length > 1 && <b className="text-[9px] leading-none text-[#2c6548]">{daySessions.length}</b>}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </section>

          <section className="grid gap-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className={`text-sm font-medium ${UI.textMuted}`}>기록 리스트</p>
                <h2 className="mt-1 text-2xl font-semibold">{rangeHasRecords ? `기록 ${filteredSessions.length}개` : "기록 없음"}</h2>
              </div>
            </div>

            <FilterChips
              items={[
                { id: "all", label: `전체 ${filterCounts.all}` },
                { id: "upper", label: `상체 ${filterCounts.upper}` },
                { id: "lower", label: `하체 ${filterCounts.lower}` },
                { id: "core", label: `코어 ${filterCounts.core}` },
              ]}
              value={bodyFilter}
              onChange={value => setBodyFilter(value as BodyFilter)}
            />

            <div className="grid gap-3">
              {filteredSessions.length === 0 ? (
                <EmptyState
                  text="선택한 조건에 맞는 운동 기록이 없습니다. 기간이나 부위 필터를 바꾸거나 새 운동을 기록해 보세요."
                  action="운동 기록하기"
                  onClick={onStart}
                />
              ) : (
                filteredSessions.map(session => (
                  <WorkoutHistoryCard
                    key={session.id}
                    session={session}
                    deleteSession={deleteSession}
                    onOpen={() => setFocusedSession(session)}
                  />
                ))
              )}
            </div>
          </section>
        </div>
      )}

      {selectedDate && selectedSessions.length > 0 && (
        <WorkoutHistoryModal
          title={formatDate(selectedDate)}
          sessions={selectedSessions}
          onClose={() => setSelectedDate(null)}
          deleteSession={deleteSession}
        />
      )}
      {focusedSession && (
        <WorkoutHistoryModal
          title={focusedSession.routineName}
          sessions={[focusedSession]}
          onClose={() => setFocusedSession(null)}
          deleteSession={deleteSession}
        />
      )}
    </section>
  );
}

function SegmentedControl({
  items,
  value,
  onChange,
  className = "",
}: {
  items: Array<{ id: string; label: string }>;
  value: string;
  onChange: (value: string) => void;
  className?: string;
}) {
  return (
    <div className={`grid grid-cols-4 gap-1 rounded-full bg-[#f8f4f0] p-1 ring-1 ring-[#eadfda] ${className}`}>
      {items.map(item => (
        <button
          key={item.id}
          type="button"
          className={`h-10 rounded-full text-xs font-semibold ${value === item.id ? "bg-[#242124] text-[#fffdfb]" : "text-[#7a7470]"}`}
          aria-pressed={value === item.id}
          onClick={() => onChange(item.id)}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

function FilterChips({
  items,
  value,
  onChange,
}: {
  items: Array<{ id: string; label: string }>;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1">
      {items.map(item => (
        <button
          key={item.id}
          type="button"
          className={`h-9 shrink-0 rounded-full px-4 text-xs font-semibold transition ${
            value === item.id
              ? "bg-[#242124] text-[#fffdfb]"
              : "bg-[#f8f4f0] text-[#7a7470] ring-1 ring-[#eadfda]"
          }`}
          aria-pressed={value === item.id}
          onClick={() => onChange(item.id)}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

function WorkoutSessionDetailCard({
  session,
  deleteSession,
  showScores = false,
}: {
  session: WorkoutSession;
  deleteSession?: (id: string) => void;
  showScores?: boolean;
}) {
  const scores = showScores ? scoreSessions([session]).filter(item => item.score > 0).slice(0, 3) : [];

  return (
    <article className={`${UI.surface} rounded-[14px] p-5`}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className={`text-sm font-medium ${UI.textMuted}`}>{formatDate(session.date)}</p>
            <span className={`${UI.pill} bg-[#fffdfb]`}>{session.durationMinutes}분</span>
          </div>
          <h3 className="mt-1 truncate text-xl font-semibold">{session.routineName}</h3>
        </div>
        {deleteSession && (
          <button type="button"
            className={`shrink-0 rounded-full bg-[#fffdfb] px-3 text-sm font-semibold ${UI.dangerText}`}
            onClick={() => deleteSession(session.id)}
          >
            삭제
          </button>
        )}
      </div>
      <SessionExerciseList session={session} />
      {scores.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {scores.map(score => (
            <span key={score.id} className="rounded-full bg-[#fffdfb] px-3 py-1 text-xs font-semibold text-[#242124]">
              {score.name} {score.score}
            </span>
          ))}
        </div>
      )}
      {session.memo && <p className={`mt-4 line-clamp-2 text-sm leading-6 ${UI.textBody}`}>{session.memo}</p>}
    </article>
  );
}

function SessionExerciseList({ session }: { session: WorkoutSession }) {
  const items = sessionExerciseSummaries(session);
  if (items.length === 0) return null;

  return (
    <div className="mt-4 grid gap-2">
      {items.map(item => (
        <div key={`${item.name}-${item.load}-${item.reps}`} className={`grid grid-cols-[minmax(0,1fr)_auto] gap-3 p-3 ${UI.card}`}>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-[#242124]">{item.name}</p>
            <p className={`mt-1 text-xs font-medium ${UI.textMuted}`}>{item.category}</p>
          </div>
          <div className="text-right">
            <p className="text-sm font-semibold text-[#242124]">{item.load} · {item.reps}</p>
            <p className={`mt-1 text-xs font-semibold ${UI.textMuted}`}>{item.sets}세트</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function WorkoutHistoryCard({
  session,
  deleteSession,
  onOpen,
}: {
  session: WorkoutSession;
  deleteSession: (id: string) => void;
  onOpen: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const stats = sessionStats(session);
  const exercises = sessionExerciseSummaries(session);
  const visibleExercises = exercises.slice(0, 3);
  const scores = scoreSessions([session]).filter(item => item.score > 0).slice(0, 3);

  return (
    <article className="relative rounded-[18px] bg-[#fffdfb] p-4 shadow-[0_10px_28px_rgba(58,48,50,0.05)] ring-1 ring-[#eadfda]">
      <div className="flex items-start justify-between gap-3">
        <button type="button" className="min-w-0 flex-1 text-left" onClick={onOpen}>
          <p className={`text-sm font-medium ${UI.textMuted}`}>
            {formatDate(session.date)} · {session.durationMinutes}분 · {stats.exercises}종목
          </p>
          <h3 className="mt-1 truncate text-xl font-semibold text-[#242124]">{session.routineName}</h3>
        </button>
        <button
          type="button"
          className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#f8f4f0] text-lg font-bold text-[#4b4541]"
          aria-label="기록 더보기"
          aria-expanded={menuOpen}
          onClick={event => {
            event.stopPropagation();
            setMenuOpen(value => !value);
          }}
        >
          ⋯
        </button>
      </div>

      {menuOpen && (
        <div className="absolute right-4 top-14 z-10 w-40 overflow-hidden rounded-[14px] bg-[#fffdfb] shadow-[0_16px_40px_rgba(58,48,50,0.16)] ring-1 ring-[#eadfda]">
          <button
            type="button"
            className="w-full px-4 py-3 text-left text-sm font-semibold text-[#242124]"
            onClick={() => {
              setMenuOpen(false);
              onOpen();
            }}
          >
            상세 보기
          </button>
          <button
            type="button"
            className={`w-full px-4 py-3 text-left text-sm font-semibold ${UI.dangerText}`}
            onClick={() => {
              setMenuOpen(false);
              deleteSession(session.id);
            }}
          >
            삭제
          </button>
        </div>
      )}

      <button type="button" className="mt-4 grid w-full gap-2 text-left" onClick={onOpen}>
        {visibleExercises.map(item => (
          <div key={`${item.name}-${item.load}-${item.reps}`} className="flex items-center justify-between gap-3">
            <p className="min-w-0 truncate text-sm font-semibold text-[#242124]">{item.name}</p>
            <p className="shrink-0 text-right text-sm font-medium text-[#4b4541]">
              {item.reps} · {item.sets}세트
            </p>
          </div>
        ))}
        {exercises.length > visibleExercises.length && (
          <p className={`text-xs font-semibold ${UI.textMuted}`}>외 {exercises.length - visibleExercises.length}개 운동</p>
        )}
      </button>

      {scores.length > 0 && (
        <button type="button" className={`mt-4 block text-left text-sm font-medium leading-6 ${UI.textMuted}`} onClick={onOpen}>
          주요 자극: {scores.map(score => score.name).join(" · ")}
        </button>
      )}
      {session.memo && <p className={`mt-3 line-clamp-2 text-sm leading-6 ${UI.textBody}`}>{session.memo}</p>}
    </article>
  );
}

function WorkoutHistoryModal({
  title,
  sessions,
  onClose,
  deleteSession,
}: {
  title: string;
  sessions: WorkoutSession[];
  onClose: () => void;
  deleteSession: (id: string) => void;
}) {
  useEscapeToClose(true, onClose);

  return (
    <div className="fixed inset-0 z-50 grid place-items-end bg-[#242124]/48 p-0 backdrop-blur-sm md:place-items-center md:p-6" role="dialog" aria-modal="true" aria-label="날짜별 운동 기록" onClick={onClose}>
      <div className="flex max-h-[calc(100svh-0.75rem)] w-full flex-col overflow-hidden rounded-t-[22px] bg-[#fffdfb] shadow-[0_-18px_48px_rgba(58,48,50,0.18)] md:max-h-[88svh] md:max-w-lg md:rounded-[22px]" onClick={event => event.stopPropagation()}>
        <div className={`flex items-start justify-between gap-4 border-b bg-[#fffdfb] p-5 ${UI.border}`}>
          <div>
            <p className={`text-sm font-medium ${UI.textMuted}`}>운동 완료</p>
            <h2 className="mt-1 text-2xl font-semibold">{title}</h2>
          </div>
          <CloseButton onClick={onClose} />
        </div>
        <div className="min-h-0 overflow-y-auto p-5">
        <div className="grid gap-3">
          {sessions.map(session => (
            <WorkoutSessionDetailCard key={session.id} session={session} deleteSession={deleteSession} showScores />
          ))}
        </div>
        </div>
      </div>
    </div>
  );
}

function AnalysisView({
  sessions,
  weekStats,
  weeklyScores,
  todayScores,
  groupBalance,
  recommendedRoutine,
  onStart,
}: {
  sessions: WorkoutSession[];
  weekStats: { count: number; sets: number; minutes: number; volume: number };
  weeklyScores: Array<Muscle & { score: number }>;
  todayScores: Array<Muscle & { score: number }>;
  groupBalance: Array<{ name: string; score: number; color: string }>;
  recommendedRoutine: string;
  onStart: () => void;
}) {
  const [range, setRange] = useState<SummaryRange>("week");
  const rangedSessions = useMemo(() => sessionsForSummaryRange(sessions, range), [sessions, range]);
  const rangeScores = useMemo(() => scoreSessions(rangedSessions), [rangedSessions]);
  const activeScores = rangeScores.filter(item => item.score > 0);
  const detailedScores = activeScores.filter(item => !MUSCLE_RANK_EXCLUDED_IDS.has(item.id));
  const rangeGroupBalance = useMemo(() => analysisBodyBalance(rangeScores), [rangeScores]);
  const rangeStats = useMemo(() => summarizeSessions(rangedSessions), [rangedSessions]);
  const pieData = rangeGroupBalance.length ? rangeGroupBalance : [{ name: "기록 없음", score: 1, color: "#ded4cf" }];
  const totalScore = activeScores.reduce((sum, item) => sum + item.score, 0);
  const topScores = detailedScores.slice(0, 3);
  const topScorePercent = totalScore && topScores.length
    ? Math.round((topScores.reduce((sum, item) => sum + item.score, 0) / totalScore) * 100)
    : 0;
  const groupScoreMap = new Map(rangeGroupBalance.map(item => [item.name, item.score]));
  const topGroup = rangeGroupBalance[0]?.name;
  const topFocusText = topScores.length ? topScores.map(item => item.name).join(" · ") : topGroup || "주요 부위";
  const topFocusScore = topScores.length
    ? topScores.reduce((sum, item) => sum + item.score, 0)
    : topGroup
      ? groupScoreMap.get(topGroup) || 0
      : 0;
  const displayedTopPercent = totalScore && topFocusScore ? Math.round((topFocusScore / totalScore) * 100) : topScorePercent;
  const lowGroup = rangeStats.count > 0
    ? [...ANALYSIS_RECOMMENDATION_GROUPS].sort((a, b) => (groupScoreMap.get(a) || 0) - (groupScoreMap.get(b) || 0))[0]
    : undefined;
  const primaryActionLabel = recommendedRoutine === "하체 집중" ? "하체 15분 시작" : homeRoutineButton(recommendedRoutine);
  const analysisTitle = rangeStats.count === 0
    ? `${summaryRangeLabels[range]} 분석할 기록이 없어요`
    : `${summaryRangeLabels[range]}는 ${topGroup || topScores[0]?.name || "운동"}${koreanObjectParticle(topGroup || topScores[0]?.name || "운동")} 많이 썼어요`;
  const analysisCopy = rangeStats.count === 0
    ? "운동을 1회 이상 기록하면 자극 부위와 밸런스를 분석할 수 있어요."
    : `${summaryRangeLabels[range]} 기록된 ${rangeStats.count}회 운동 기준으로 ${topFocusText}가 전체 자극의 약 ${displayedTopPercent}%를 차지해요.`;
  const recommendationCopy = rangeStats.count === 0
    ? "첫 운동을 기록하면 다음 운동 추천이 더 정확해져요."
    : lowGroup
      ? `${lowGroup} 자극이 적은 편이에요. 다음 운동은 ${homeRoutineTitle(recommendedRoutine)}로 균형을 맞춰보세요.`
      : `다음 운동은 ${homeRoutineTitle(recommendedRoutine)}로 균형을 맞춰보세요.`;

  return (
    <section className="mx-auto grid w-full max-w-[1080px] gap-6 overflow-x-hidden px-4 py-7 pb-[calc(9rem+env(safe-area-inset-bottom))] md:px-8 md:py-10">
      <div>
        <p className={`text-sm font-medium ${UI.textMuted}`}>운동 분석</p>
        <h1 className="mt-1 text-[31px] font-bold leading-tight md:text-5xl">다음 운동을 정해볼까요?</h1>
      </div>

      <RangePills value={range} onChange={setRange} />

      <div className="mysun-card min-w-0 p-5 md:p-6">
        <p className="text-sm font-medium text-[#7a7470]">핵심 인사이트</p>
        <h2 className="mt-3 text-2xl font-semibold leading-tight md:text-3xl">{analysisTitle}</h2>
        <p className="mt-4 text-sm font-medium leading-6 text-[#4b4541]">{analysisCopy}</p>
        <div className="mt-4 rounded-[16px] bg-[#f8f4f0] p-4">
          <p className="text-xs font-semibold text-[#7a7470]">추천 행동</p>
          <p className="mt-1 text-sm font-semibold leading-6 text-[#242124]">{recommendationCopy}</p>
        </div>
        <div className="mt-5 grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-2">
          <button type="button" className="mysun-primary-action text-sm" onClick={onStart}>
            {primaryActionLabel}
          </button>
          <button type="button" className="mysun-secondary-action text-sm" onClick={onStart}>
            직접 기록하기
          </button>
        </div>
      </div>

      <MetricGrid
        items={[
          { label: "운동 기록", value: `${rangeStats.count}회` },
          { label: "총 세트", value: `${rangeStats.sets}세트` },
          { label: "운동 시간", value: `${rangeStats.minutes}분` },
          { label: "누적 부하", value: `${formatNumber(Math.round(rangeStats.volume))}점` },
        ]}
      />

      {rangeStats.count === 0 ? (
        <EmptyState text="아직 분석할 운동 기록이 부족해요. 운동을 기록하면 부위별 자극과 밸런스를 계산합니다." action="운동 기록하기" onClick={onStart} />
      ) : (
        <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
          <div className="grid min-w-0 gap-6 self-start">
            <FlatPanel title="많이 자극한 근육" kicker="가로로 전체 확인">
              <TopMuscleCards scores={detailedScores} total={totalScore} />
            </FlatPanel>
            <details className="rounded-[22px] bg-[#fffdfb] p-5 shadow-[0_14px_36px_rgba(58,48,50,0.06)] ring-1 ring-[#eadfda]">
              <summary className="cursor-pointer list-none text-sm font-semibold text-[#242124]">
                지표 기준 보기
              </summary>
              <p className={`mt-4 text-sm leading-6 ${UI.textBody}`}>
                누적 부하는 운동 시간, 세트 수, 반복 횟수, 중량과 난이도를 반영한 앱 기준 점수예요.
                근육 자극은 이 부하를 운동별 근육 기여도에 따라 나눈 값이에요.
              </p>
              {rangeStats.count < 2 && (
                <p className="mt-3 rounded-[14px] bg-[#f8f4f0] p-3 text-sm font-medium leading-6 text-[#4b4541]">
                  현재 {rangeStats.count}회 기록 기준입니다. 기록이 늘어나면 분석 신뢰도가 높아집니다.
                </p>
              )}
            </details>
          </div>

          <div className="grid min-w-0 gap-6">
        <FlatPanel title="부위 밸런스" kicker={summaryRangeLabels[range]}>
          <DonutChart data={pieData} />
          <div className="mt-8 grid gap-2">
            {rangeGroupBalance.map(item => (
              <div key={item.name} className="flex items-center justify-between border-t border-[#eadfda] py-3">
                <span className="flex items-center gap-3 text-base font-medium">
                  <i className="h-3 w-3 rounded-full" style={{ background: item.color }} />
                  {item.name}
                </span>
                <span className="text-base font-medium text-[#7a7470]">{formatNumber(item.score)}점</span>
              </div>
            ))}
          </div>
        </FlatPanel>
        <FlatPanel title="근육별 자극 순위" kicker="전체 자극 대비 비율">
          <BarRanking data={detailedScores.slice(0, 8)} totalScore={totalScore} />
        </FlatPanel>
          </div>
        </div>
      )}
    </section>
  );
}

const DIET_MEALS = [
  { id: "morning", label: "아침", hint: "커피, 샌드위치, 간단한 아침을 남겨요." },
  { id: "lunch", label: "점심", hint: "오늘의 에너지를 채운 식사를 기록해요." },
  { id: "afternoon", label: "저녁", hint: "저녁 식사와 운동 후 식사까지 기록해요." },
  { id: "snack", label: "간식", hint: "디저트, 음료, 작은 간식도 좋아요." },
] as const;

const DIET_MEAL_COLORS: Record<string, string> = {
  morning: "bg-[#f3c96a]",
  lunch: "bg-[#65b985]",
  afternoon: "bg-[#d9796f]",
  snack: "bg-[#8f7ad8]",
};

type DietMealSlot = (typeof DIET_MEALS)[number]["id"];

type DietFoodItem = {
  id: string;
  name: string;
  portion: string;
  calories: number;
  carbs: number;
  protein: number;
  fat: number;
};

type DietMealLog = {
  id?: string;
  date?: string;
  slot: DietMealSlot;
  entryName?: string;
  imageUrl?: string;
  feedback?: string;
  foods: DietFoodItem[];
};

type DietAnalyzeResponse = {
  foods?: DietFoodItem[];
  feedback?: string;
  error?: string;
};

type DietLogResponse = {
  meal?: DietMealLog;
  meals?: DietMealLog[];
  setupRequired?: boolean;
  error?: string;
};

type DietGoal = {
  goalType: string;
  targetCalories: number | null;
  targetProtein: number | null;
  targetCarbsMin?: number | null;
  targetCarbsMax?: number | null;
  targetFatMin?: number | null;
  targetFatMax?: number | null;
};

type DietGoalResponse = {
  goal?: DietGoal;
  setupRequired?: boolean;
  error?: string;
};

function emptyDietFood(): DietFoodItem {
  return { id: `manual-${Date.now()}`, name: "직접 입력 음식", portion: "1인분", calories: 0, carbs: 0, protein: 0, fat: 0 };
}

const DIET_IMAGE_MAX_DIMENSION = 1024;
const DIET_IMAGE_TARGET_BYTES = 850_000;

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") resolve(reader.result);
      else reject(new Error("이미지 파일을 읽지 못했습니다."));
    };
    reader.onerror = () => reject(new Error("이미지 파일을 읽지 못했습니다."));
    reader.readAsDataURL(file);
  });
}

function dataUrlBytes(dataUrl: string) {
  const base64 = dataUrl.split(",")[1] || "";
  return Math.ceil((base64.length * 3) / 4);
}

function loadImageFromDataUrl(dataUrl: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("이미지 미리보기를 만들지 못했습니다."));
    image.src = dataUrl;
  });
}

function resizedImageDataUrl(image: HTMLImageElement, maxDimension: number, quality: number) {
  const maxSourceDimension = Math.max(image.naturalWidth, image.naturalHeight);
  const scale = Math.min(1, maxDimension / maxSourceDimension);
  const width = Math.max(1, Math.round(image.naturalWidth * scale));
  const height = Math.max(1, Math.round(image.naturalHeight * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("이미지 압축을 처리하지 못했습니다.");
  context.drawImage(image, 0, 0, width, height);
  return canvas.toDataURL("image/jpeg", quality);
}

async function prepareDietImageDataUrl(file: File) {
  if (!file.type.startsWith("image/")) throw new Error("이미지 파일만 업로드할 수 있습니다.");
  const sourceDataUrl = await readFileAsDataUrl(file);
  const image = await loadImageFromDataUrl(sourceDataUrl);

  for (const dimension of [DIET_IMAGE_MAX_DIMENSION, 1080, 900, 720]) {
    for (const quality of [0.78, 0.68, 0.58, 0.48]) {
      const dataUrl = resizedImageDataUrl(image, dimension, quality);
      if (dataUrlBytes(dataUrl) <= DIET_IMAGE_TARGET_BYTES) return dataUrl;
    }
  }

  return resizedImageDataUrl(image, 720, 0.42);
}

async function readDietApiResponse(response: Response): Promise<DietAnalyzeResponse> {
  const text = await response.text();
  if (!text) return {};

  try {
    return JSON.parse(text) as DietAnalyzeResponse;
  } catch {
    return {
      error: response.ok
        ? "AI 분석 응답을 해석하지 못했습니다. 직접 입력으로 기록해 주세요."
        : "사진 용량이 크거나 서버 응답을 처리하지 못했습니다. 사진을 압축해 다시 시도해 주세요.",
    };
  }
}

function dietTotals(foods: DietFoodItem[]) {
  return foods.reduce((total, item) => ({
    calories: total.calories + item.calories,
    carbs: total.carbs + item.carbs,
    protein: total.protein + item.protein,
    fat: total.fat + item.fat,
  }), { calories: 0, carbs: 0, protein: 0, fat: 0 });
}

function dietFeedback(totalCalories: number, targetCalories: number, totalProtein: number, targetProtein: number) {
  if (totalCalories === 0) return "먹은 음식을 사진으로 남기면 오늘의 영양 흐름을 확인할 수 있어요.";
  if (totalProtein < targetProtein * 0.7) return "단백질이 목표보다 부족한 편이에요. 다음 식사에 계란, 두부, 닭가슴살, 생선류를 더해보세요.";
  if (totalCalories > targetCalories * 1.15) return "오늘은 목표보다 섭취량이 높은 편이에요. 다음 식사는 단백질과 채소 중심으로 가볍게 구성해보세요.";
  if (totalCalories < targetCalories * 0.8) return "오늘 섭취량은 아직 낮은 편이에요. 다음 식사에 탄수화물과 단백질을 함께 챙겨보세요.";
  return "오늘은 목표에 가까운 흐름이에요. 단백질과 채소를 유지하면 더 균형이 좋아져요.";
}

function isDietMealSlot(value: unknown): value is DietMealSlot {
  return typeof value === "string" && DIET_MEALS.some(meal => meal.id === value);
}

function dietMealOrder(slot: DietMealSlot) {
  return DIET_MEALS.findIndex(meal => meal.id === slot);
}

function sortDietMeals(meals: DietMealLog[]) {
  return meals.slice().sort((a, b) => {
    const dateCompare = (a.date || "").localeCompare(b.date || "");
    if (dateCompare !== 0) return dateCompare;
    const slotCompare = dietMealOrder(a.slot) - dietMealOrder(b.slot);
    if (slotCompare !== 0) return slotCompare;
    return (a.id || "").localeCompare(b.id || "");
  });
}

function replaceDietMealLog(logs: DietMealLog[], savedMeal: DietMealLog) {
  const isSameRecord = (log: DietMealLog) => {
    if (savedMeal.id && log.id === savedMeal.id) return true;
    return savedMeal.slot !== "snack"
      && log.date === savedMeal.date
      && log.slot === savedMeal.slot;
  };

  return sortDietMeals([
    ...logs.filter(log => !isSameRecord(log)),
    savedMeal,
  ]);
}

function groupDietMealsBySlot(meals: DietMealLog[]) {
  const map = new Map<DietMealSlot, DietMealLog[]>();
  for (const meal of meals) {
    if (!isDietMealSlot(meal.slot)) continue;
    map.set(meal.slot, [...(map.get(meal.slot) || []), meal]);
  }
  return map;
}

function loggedDietSlotCount(meals: DietMealLog[]) {
  return new Set(meals.filter(meal => meal.foods.length > 0).map(meal => meal.slot)).size;
}

function inclusiveDayCount(start: string, end: string) {
  const from = parseDate(start);
  const to = parseDate(end);
  const diff = Math.round((to.getTime() - from.getTime()) / 86400000) + 1;
  return Math.max(1, diff);
}

const DIET_GOAL_PRESETS: Record<string, { calorieDelta: number; calorieMultiplier: number; proteinPerKg: number }> = {
  fat_loss: { calorieDelta: 0, calorieMultiplier: 0.88, proteinPerKg: 1.6 },
  maintain: { calorieDelta: 0, calorieMultiplier: 1, proteinPerKg: 1.3 },
  muscle_gain: { calorieDelta: 200, calorieMultiplier: 1, proteinPerKg: 1.8 },
  bulk: { calorieDelta: 400, calorieMultiplier: 1, proteinPerKg: 1.9 },
  healthy: { calorieDelta: 0, calorieMultiplier: 1, proteinPerKg: 1.2 },
};

function roundToNearest(value: number, step: number) {
  return Math.round(value / step) * step;
}

function estimatedBmr(settings: UserSettings) {
  if (!settings.weightKg || !settings.heightCm || !settings.age) return null;
  const sexConstant = settings.gender === "male" ? 5 : settings.gender === "female" ? -161 : -78;
  return (10 * settings.weightKg) + (6.25 * settings.heightCm) - (5 * settings.age) + sexConstant;
}

function calculatedDietGoal(settings: UserSettings, goalType = "healthy"): DietGoal {
  const preset = DIET_GOAL_PRESETS[goalType] || DIET_GOAL_PRESETS.healthy;
  const bmr = estimatedBmr(settings);
  const baseCalories = bmr
    ? bmr * activityFactor(settings)
    : settings.weightKg
      ? settings.weightKg * 30
      : 1800;
  const targetCalories = Math.min(
    Math.max(roundToNearest((baseCalories * preset.calorieMultiplier) + preset.calorieDelta, 10), 800),
    6000,
  );
  const targetProtein = Math.min(
    Math.max(Math.round((settings.weightKg || 55) * preset.proteinPerKg), 0),
    400,
  );
  const fatMin = Math.max(0, Math.round((targetCalories * 0.2) / 9));
  const fatMax = Math.max(fatMin, Math.round((targetCalories * 0.3) / 9));
  const carbsMin = Math.max(0, Math.round((targetCalories - (targetProtein * 4) - (fatMax * 9)) / 4));
  const carbsMax = Math.max(carbsMin, Math.round((targetCalories - (targetProtein * 4) - (fatMin * 9)) / 4));

  return {
    goalType,
    targetCalories,
    targetProtein,
    targetCarbsMin: carbsMin,
    targetCarbsMax: carbsMax,
    targetFatMin: fatMin,
    targetFatMax: fatMax,
  };
}

function hasCompleteDietGoalProfile(settings: UserSettings) {
  return Boolean(settings.gender && settings.age && settings.heightCm && settings.weightKg);
}

function defaultDietGoal(settings: UserSettings): DietGoal {
  return calculatedDietGoal(settings, "healthy");
}

function dietGoalTypeLabel(goalType: string) {
  switch (goalType) {
    case "fat_loss": return "체중 감량";
    case "maintain": return "체중 유지";
    case "muscle_gain": return "근육 증가";
    case "bulk": return "벌크업";
    default: return "건강한 식습관";
  }
}

function activityLevelLabel(value: string) {
  return ACTIVITY_LEVELS.find(level => level.value === value)?.label || "자동 추정";
}

function DietView({ settings }: { settings: UserSettings }) {
  const [mealLogs, setMealLogs] = useState<DietMealLog[]>([]);
  const [periodMealLogs, setPeriodMealLogs] = useState<DietMealLog[]>([]);
  const [monthlyMealLogs, setMonthlyMealLogs] = useState<DietMealLog[]>([]);
  const [loadingDiet, setLoadingDiet] = useState(true);
  const [loadingDietMonth, setLoadingDietMonth] = useState(true);
  const [savingDiet, setSavingDiet] = useState(false);
  const [dietError, setDietError] = useState("");
  const [dietGoal, setDietGoal] = useState<DietGoal>(() => defaultDietGoal(settings));
  const [goalDraft, setGoalDraft] = useState<DietGoal>(() => defaultDietGoal(settings));
  const [goalDialogOpen, setGoalDialogOpen] = useState(false);
  const [summaryDialogOpen, setSummaryDialogOpen] = useState(false);
  const [savingGoal, setSavingGoal] = useState(false);
  const [goalError, setGoalError] = useState("");
  const [entryDialogOpen, setEntryDialogOpen] = useState(false);
  const [entryDate, setEntryDate] = useState(today());
  const [entryMeal, setEntryMeal] = useState<DietMealSlot>("lunch");
  const [entryMenuHint, setEntryMenuHint] = useState("");
  const [reviewMeal, setReviewMeal] = useState<DietMealSlot | null>(null);
  const [reviewDate, setReviewDate] = useState(today());
  const [reviewMenuHint, setReviewMenuHint] = useState("");
  const [reviewImage, setReviewImage] = useState<string | undefined>();
  const [reviewFoods, setReviewFoods] = useState<DietFoodItem[]>([]);
  const [reviewFeedback, setReviewFeedback] = useState("");
  const [analysisError, setAnalysisError] = useState("");
  const [analysisStatus, setAnalysisStatus] = useState<"idle" | "analyzing" | "ready">("idle");
  const [dietCalendarMonth, setDietCalendarMonth] = useState(() => startOfMonth(parseDate(today())));
  const [dietRange, setDietRange] = useState<HistoryRange>("day");
  const [dietRangeCursor, setDietRangeCursor] = useState(() => parseDate(today()));
  const [selectedDietDate, setSelectedDietDate] = useState<string | null>(null);
  const dietDate = today();
  const dietPeriod = useMemo(() => getHistoryPeriod(dietRange, dietRangeCursor), [dietRange, dietRangeCursor]);
  const effectivePeriodEnd = dietPeriod.end > dietDate ? dietDate : dietPeriod.end;
  const dietPeriodDays = inclusiveDayCount(dietPeriod.start, effectivePeriodEnd >= dietPeriod.start ? effectivePeriodEnd : dietPeriod.start);
  const fallbackGoal = defaultDietGoal(settings);
  const targetCalories = dietGoal.targetCalories || fallbackGoal.targetCalories || 1800;
  const targetProtein = dietGoal.targetProtein || fallbackGoal.targetProtein || 90;
  const periodTargetCalories = targetCalories * dietPeriodDays;
  const periodTargetProtein = targetProtein * dietPeriodDays;
  const allFoods = periodMealLogs.flatMap(log => log.foods || []);
  const totals = dietTotals(allFoods);
  const calorieProgress = Math.min(140, Math.round((totals.calories / periodTargetCalories) * 100));
  const proteinProgress = Math.min(140, Math.round((totals.protein / periodTargetProtein) * 100));
  const loggedCount = loggedDietSlotCount(periodMealLogs);
  const feedback = dietFeedback(totals.calories, periodTargetCalories, totals.protein, periodTargetProtein);
  const reviewMealLabel = DIET_MEALS.find(meal => meal.id === reviewMeal)?.label || "식사";
  const todayLabel = formatDate(dietDate);
  const dietPeriodTitle = dietRange === "day" ? formatDate(dietPeriod.start) : dietPeriod.label;
  const hasPreciseDietProfile = hasCompleteDietGoalProfile(settings);
  const autoGoalPreview = calculatedDietGoal(settings, goalDraft.goalType || "healthy");
  const dietCalendarDays = useMemo(() => buildCalendarDays(dietCalendarMonth), [dietCalendarMonth]);
  const dietMealsByDate = useMemo(() => {
    const map = new Map<string, DietMealLog[]>();
    for (const meal of monthlyMealLogs) {
      const date = meal.date || dietDate;
      map.set(date, [...(map.get(date) || []), meal]);
    }
    for (const [date, meals] of map) {
      map.set(date, sortDietMeals(meals));
    }
    return map;
  }, [dietDate, monthlyMealLogs]);
  const selectedDietLogs = selectedDietDate ? dietMealsByDate.get(selectedDietDate) || [] : [];
  const periodMealsByDate = useMemo(() => {
    const map = new Map<string, DietMealLog[]>();
    for (const meal of periodMealLogs) {
      const date = meal.date || dietDate;
      map.set(date, [...(map.get(date) || []), meal]);
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, meals]) => ({ date, meals: sortDietMeals(meals) }));
  }, [dietDate, periodMealLogs]);
  const monthDietLogs = useMemo(() => {
    const start = toDateKey(startOfMonth(dietCalendarMonth));
    const end = toDateKey(endOfMonth(dietCalendarMonth));
    return monthlyMealLogs.filter(meal => (meal.date || "") >= start && (meal.date || "") <= end);
  }, [dietCalendarMonth, monthlyMealLogs]);
  const monthDietDays = useMemo(() => new Set(monthDietLogs.map(meal => meal.date)).size, [monthDietLogs]);
  const monthDietTotals = useMemo(() => dietTotals(monthDietLogs.flatMap(meal => meal.foods)), [monthDietLogs]);
  const entryDateMeals = useMemo(() => {
    const map = new Map<string, DietMealLog>();
    for (const meal of [...monthlyMealLogs, ...periodMealLogs, ...mealLogs]) {
      if ((meal.date || dietDate) !== entryDate || !isDietMealSlot(meal.slot)) continue;
      const key = meal.id || `${meal.date || dietDate}-${meal.slot}-${meal.entryName || ""}`;
      map.set(key, meal);
    }
    return sortDietMeals(Array.from(map.values()));
  }, [dietDate, entryDate, mealLogs, monthlyMealLogs, periodMealLogs]);

  useEscapeToClose(goalDialogOpen, () => {
    setGoalDraft(dietGoal);
    setGoalDialogOpen(false);
  });
  useEscapeToClose(entryDialogOpen, () => setEntryDialogOpen(false));
  useEscapeToClose(summaryDialogOpen, () => setSummaryDialogOpen(false));
  useEscapeToClose(Boolean(selectedDietDate), () => setSelectedDietDate(null));

  useEffect(() => {
    async function loadDietGoal() {
      setGoalError("");
      try {
        const response = await appFetch("/api/diet-goals", { cache: "no-store" });
        const data = await response.json() as DietGoalResponse;
        assertApiResponse(response, data, "식단 목표를 불러오지 못했습니다.");
        if (data.setupRequired) {
          const fallback = defaultDietGoal(settings);
          setDietGoal(fallback);
          setGoalDraft(fallback);
          setGoalError("식단 목표 테이블이 아직 준비되지 않았습니다. Supabase SQL을 확인해 주세요.");
          return;
        }
        const fallback = calculatedDietGoal(settings, data.goal?.goalType || "healthy");
        const nextGoal = {
          ...fallback,
          ...(data.goal || {}),
          targetCalories: data.goal?.targetCalories || fallback.targetCalories,
          targetProtein: data.goal?.targetProtein || fallback.targetProtein,
        };
        setDietGoal(nextGoal);
        setGoalDraft(nextGoal);
      } catch (error) {
        const fallback = defaultDietGoal(settings);
        setDietGoal(fallback);
        setGoalDraft(fallback);
        setGoalError(error instanceof Error ? error.message : "식단 목표를 불러오지 못했습니다.");
      }
    }

    void loadDietGoal();
  }, [settings.activityLevel, settings.age, settings.gender, settings.heightCm, settings.weightKg, settings.weeklyGoal]);

  function applyCalculatedGoal(goalType = goalDraft.goalType || "healthy") {
    setGoalDraft(calculatedDietGoal(settings, goalType));
    setGoalError("");
  }

  useEffect(() => {
    async function loadDietPeriod() {
      setLoadingDiet(true);
      setDietError("");
      try {
        const response = await appFetch(`/api/diet-log?start=${encodeURIComponent(dietPeriod.start)}&end=${encodeURIComponent(dietPeriod.end)}`, { cache: "no-store" });
        const data = await response.json() as DietLogResponse;
        assertApiResponse(response, data, "식단 기록을 불러오지 못했습니다.");
        if (data.setupRequired) {
          setDietError("식단 저장 테이블이 아직 준비되지 않았습니다. Supabase SQL을 실행해 주세요.");
          setMealLogs([]);
          setPeriodMealLogs([]);
          return;
        }
        const meals = sortDietMeals((data.meals || []).filter(meal => isDietMealSlot(meal.slot)));
        setMealLogs(meals);
        setPeriodMealLogs(meals);
      } catch (error) {
        setDietError(error instanceof Error ? error.message : "식단 기록을 불러오지 못했습니다.");
      } finally {
        setLoadingDiet(false);
      }
    }

    void loadDietPeriod();
  }, [dietPeriod.end, dietPeriod.start]);

  useEffect(() => {
    async function loadDietMonth() {
      setLoadingDietMonth(true);
      setDietError("");
      try {
        const start = toDateKey(startOfMonth(dietCalendarMonth));
        const end = toDateKey(endOfMonth(dietCalendarMonth));
        const response = await appFetch(`/api/diet-log?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`, { cache: "no-store" });
        const data = await response.json() as DietLogResponse;
        assertApiResponse(response, data, "월간 식단 기록을 불러오지 못했습니다.");
        if (data.setupRequired) {
          setDietError("식단 저장 테이블이 아직 준비되지 않았습니다. Supabase SQL을 실행해 주세요.");
          setMonthlyMealLogs([]);
          return;
        }
        setMonthlyMealLogs((data.meals || []).filter(meal => isDietMealSlot(meal.slot)));
      } catch (error) {
        setDietError(error instanceof Error ? error.message : "월간 식단 기록을 불러오지 못했습니다.");
      } finally {
        setLoadingDietMonth(false);
      }
    }

    void loadDietMonth();
  }, [dietCalendarMonth]);

  async function saveDietGoal() {
    if (savingGoal) return;
    setSavingGoal(true);
    setGoalError("");
    try {
      const response = await appFetch("/api/diet-goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(goalDraft),
      });
      const data = await response.json() as DietGoalResponse;
      assertApiResponse(response, data, "식단 목표 저장에 실패했습니다.");
      if (!data.goal) throw new Error("저장된 식단 목표를 확인하지 못했습니다.");
      setDietGoal(data.goal);
      setGoalDraft(data.goal);
      setGoalDialogOpen(false);
    } catch (error) {
      setGoalError(error instanceof Error ? error.message : "식단 목표 저장에 실패했습니다.");
    } finally {
      setSavingGoal(false);
    }
  }

  function openDietEntryDialog(date = dietRange === "day" ? dietPeriod.start : dietDate, meal: DietMealSlot = "lunch") {
    setEntryDate(date);
    setEntryMeal(meal);
    setEntryMenuHint("");
    setReviewMeal(null);
    setReviewDate(date);
    setReviewMenuHint("");
    setReviewImage(undefined);
    setReviewFoods([]);
    setReviewFeedback("");
    setAnalysisError("");
    setAnalysisStatus("idle");
    setEntryDialogOpen(true);
  }

  async function openPhotoAnalysis(mealId: DietMealSlot, files: FileList | null, date = dietDate, menuHint = "") {
    const file = files?.[0];
    if (!file) return;

    setReviewMeal(mealId);
    setReviewDate(date);
    setReviewMenuHint(menuHint.trim());
    setReviewImage(undefined);
    setReviewFoods([]);
    setReviewFeedback("");
    setAnalysisError("");
    setAnalysisStatus("analyzing");

    try {
      const imageDataUrl = await prepareDietImageDataUrl(file);
      setReviewImage(imageDataUrl);
      const response = await appFetch("/api/diet/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageDataUrl, mealSlot: mealId, menuHint }),
      }, DIET_ANALYZE_TIMEOUT_MS);
      const data = await readDietApiResponse(response);

      if (!response.ok) {
        throw new Error(apiErrorMessage(data) || "AI 분석에 실패했습니다. 직접 입력으로 기록해 주세요.");
      }

      setReviewFoods((data.foods || []).map((food, index) => ({
        id: food.id || `ai-food-${Date.now()}-${index}`,
        name: food.name || "확인 필요 음식",
        portion: food.portion || "1인분",
        calories: Math.max(0, Number(food.calories) || 0),
        carbs: Math.max(0, Number(food.carbs) || 0),
        protein: Math.max(0, Number(food.protein) || 0),
        fat: Math.max(0, Number(food.fat) || 0),
      })));
      setReviewFeedback(data.feedback || "분석 결과를 확인한 뒤 음식과 분량을 저장해 주세요.");
    } catch (error) {
      setAnalysisError(error instanceof Error ? error.message : "AI 분석 중 문제가 발생했습니다. 직접 입력으로 기록해 주세요.");
      setReviewFoods([emptyDietFood()]);
    } finally {
      setAnalysisStatus("ready");
    }
  }

  function openManualEntry(mealId: DietMealSlot, date = dietDate, menuHint = "") {
    setReviewMeal(mealId);
    setReviewDate(date);
    setReviewMenuHint(menuHint.trim());
    setReviewImage(undefined);
    setReviewFoods([{ ...emptyDietFood(), name: menuHint.trim() || "직접 입력 음식" }]);
    setReviewFeedback("");
    setAnalysisError("");
    setAnalysisStatus("ready");
  }

  function updateReviewFood(id: string, field: keyof Omit<DietFoodItem, "id">, value: string) {
    setReviewFoods(foods => foods.map(food => {
      if (food.id !== id) return food;
      if (field === "name" || field === "portion") return { ...food, [field]: value };
      return { ...food, [field]: Math.max(0, Number(value) || 0) };
    }));
  }

  async function saveReviewMeal() {
    if (!reviewMeal || savingDiet) return;
    setSavingDiet(true);
    setDietError("");
    setAnalysisError("");

    try {
      const response = await appFetch("/api/diet-log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: reviewDate,
          slot: reviewMeal,
          entryName: reviewMenuHint,
          imageUrl: reviewImage,
          feedback: reviewFeedback,
          foods: reviewFoods,
        }),
      });
      const data = await response.json() as DietLogResponse;
      assertApiResponse(response, data, "식단 기록 저장에 실패했습니다.");
      const savedMeal = data.meal;
      if (!savedMeal || !isDietMealSlot(savedMeal.slot)) throw new Error("저장된 식단 기록을 확인하지 못했습니다.");

      setMealLogs(logs => replaceDietMealLog(logs, savedMeal));
      setPeriodMealLogs(logs => (
        savedMeal.date && savedMeal.date >= dietPeriod.start && savedMeal.date <= dietPeriod.end
          ? replaceDietMealLog(logs, savedMeal)
          : logs
      ));
      setMonthlyMealLogs(logs => replaceDietMealLog(logs, savedMeal));
      setReviewMeal(null);
      setReviewMenuHint("");
      setReviewFoods([]);
      setReviewImage(undefined);
      setReviewFeedback("");
      setAnalysisError("");
      setAnalysisStatus("idle");
      setEntryDialogOpen(false);
    } catch (error) {
      setAnalysisError(error instanceof Error ? error.message : "식단 기록 저장에 실패했습니다.");
    } finally {
      setSavingDiet(false);
    }
  }

  async function deleteMeal(log: DietMealLog) {
    setDietError("");

    try {
      const query = log.id
        ? `id=${encodeURIComponent(log.id)}`
        : `date=${encodeURIComponent(log.date || dietDate)}&slot=${encodeURIComponent(log.slot)}`;
      const response = await appFetch(`/api/diet-log?${query}`, { method: "DELETE" });
      const data = await response.json() as DietLogResponse;
      assertApiResponse(response, data, "식단 기록 삭제에 실패했습니다.");
      setMealLogs(logs => logs.filter(item => log.id ? item.id !== log.id : !(item.date === log.date && item.slot === log.slot)));
      setPeriodMealLogs(logs => logs.filter(item => log.id ? item.id !== log.id : !(item.date === log.date && item.slot === log.slot)));
      setMonthlyMealLogs(logs => logs.filter(item => log.id ? item.id !== log.id : !(item.date === log.date && item.slot === log.slot)));
    } catch (error) {
      setDietError(error instanceof Error ? error.message : "식단 기록 삭제에 실패했습니다.");
    }
  }

  return (
    <section className="mx-auto grid w-full max-w-[960px] min-w-0 gap-6 overflow-x-hidden px-4 py-7 pb-[calc(9rem+env(safe-area-inset-bottom))] md:px-8 md:py-10">
      <div className="min-w-0">
        <div className="flex min-w-0 items-start justify-between gap-3">
          <div className="min-w-0">
            <p className={`text-sm font-medium ${UI.textMuted}`}>식단</p>
            <h1 className="mt-1 text-[31px] font-bold leading-tight md:text-5xl">오늘 먹은 걸 남겨요</h1>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button type="button" className="rounded-full bg-[#f8f4f0] px-4 py-3 text-sm font-semibold text-[#242124] ring-1 ring-[#eadfda] active:scale-[0.99]" onClick={() => { setGoalDraft(dietGoal); setGoalDialogOpen(true); }}>
              목표
            </button>
            <button type="button" className="rounded-full bg-[#242124] px-4 py-3 text-sm font-semibold text-[#fffdfb] active:scale-[0.99]" onClick={() => openDietEntryDialog()}>
              등록
            </button>
          </div>
        </div>
        <p className="mt-4 text-sm font-semibold text-[#7a7470]">{todayLabel} · 오늘</p>
        {dietError && (
          <p className="mt-4 rounded-[16px] bg-[#fff5f2] p-4 text-sm font-semibold leading-6 text-[#9d3d35] ring-1 ring-[#f1c4bc]">
            {dietError}
          </p>
        )}
        {goalError && (
          <p className="mt-4 rounded-[16px] bg-[#fff5f2] p-4 text-sm font-semibold leading-6 text-[#9d3d35] ring-1 ring-[#f1c4bc]">
            {goalError}
          </p>
        )}
        {loadingDiet && (
          <p className="mt-4 rounded-[16px] bg-[#f8f4f0] p-4 text-sm font-semibold leading-6 text-[#7a7470]">
            저장된 오늘 식단을 불러오고 있어요.
          </p>
        )}
      </div>

      <section className="mysun-card grid min-w-0 gap-4 p-4 md:p-5">
        <div className="flex items-center justify-between gap-3">
          <button type="button" className={`grid h-10 w-10 place-items-center text-base ${UI.secondaryButton}`} onClick={() => setDietRangeCursor(current => addPeriod(current, dietRange, -1))} aria-label="이전 기간">
            ‹
          </button>
          <div className="min-w-0 text-center">
            <p className="text-xs font-bold text-[#7a7470]">선택 기간</p>
            <p className="mt-1 truncate text-base font-bold text-[#242124]">{dietPeriodTitle}</p>
          </div>
          <button type="button" className={`grid h-10 w-10 place-items-center text-base ${UI.secondaryButton}`} onClick={() => setDietRangeCursor(current => addPeriod(current, dietRange, 1))} aria-label="다음 기간">
            ›
          </button>
        </div>
        <div className="grid grid-cols-4 gap-1 rounded-[22px] bg-[#f8f4f0] p-1">
          {[
            ["day", "일"],
            ["week", "주"],
            ["month", "월"],
            ["year", "년"],
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              className={`h-11 rounded-[18px] text-sm font-bold transition ${dietRange === value ? "bg-[#242124] text-[#fffdfb] shadow-[0_10px_22px_rgba(36,33,36,0.14)]" : "text-[#7a7470]"}`}
              onClick={() => {
                setDietRange(value as HistoryRange);
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </section>

      <button
        type="button"
        className="mysun-card w-full min-w-0 p-5 text-left transition active:scale-[0.995]"
        onClick={() => setSummaryDialogOpen(true)}
        aria-label="식단 요약 상세 보기"
      >
        <div className="flex min-w-0 items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-sm font-medium text-[#7a7470]">{dietRange === "day" ? "선택일 식단 요약" : "선택 기간 식단 요약"}</p>
            <h2 className="mt-2 text-2xl font-semibold">{formatNumber(totals.calories)} kcal / 목표 {formatNumber(periodTargetCalories)} kcal</h2>
            <p className="mt-1 text-sm font-semibold text-[#7a7470]">목표 대비 {calorieProgress}% · 기록 구간 {loggedCount}/4</p>
          </div>
          <span className="shrink-0 rounded-full bg-[#edf8f1] px-3 py-2 text-xs font-bold text-[#2f8c63]">{Math.min(100, calorieProgress)}%</span>
        </div>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-[#f8f4f0]">
          <div className="h-full rounded-full bg-[#2f8c63]" style={{ width: `${Math.min(100, calorieProgress)}%` }} />
        </div>
        <div className="mt-5 grid min-w-0 grid-cols-3 gap-2">
          <MacroBox label="탄수화물" value={`${totals.carbs}g`} />
          <MacroBox label="단백질" value={`${totals.protein}/${periodTargetProtein}g`} />
          <MacroBox label="지방" value={`${totals.fat}g`} />
        </div>
        <p className="mt-3 text-sm font-semibold text-[#7a7470]">단백질 목표 {proteinProgress}% 달성</p>
        <p className="mt-4 rounded-[16px] bg-[#f8f4f0] p-4 text-sm font-medium leading-6 text-[#4b4541]">
          {feedback}
        </p>
        <p className="mt-3 text-right text-xs font-bold text-[#7a7470]">식단별 상세 보기</p>
      </button>

      <section className="mysun-card min-w-0 p-4 md:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className={`text-sm font-medium ${UI.textMuted}`}>식단 캘린더</p>
            <h2 className="mt-1 text-xl font-semibold">{formatMonth(dietCalendarMonth)} · 기록한 날 {monthDietDays}일</h2>
            <p className="mt-1 text-sm font-medium text-[#4b4541]">
              {loadingDietMonth ? "월간 식단을 불러오고 있어요." : `${formatNumber(monthDietTotals.calories)} kcal · 탄 ${monthDietTotals.carbs}g / 단 ${monthDietTotals.protein}g / 지 ${monthDietTotals.fat}g`}
            </p>
          </div>
          <div className="flex shrink-0 gap-2">
            <button type="button" className={`grid h-9 w-9 place-items-center text-base ${UI.secondaryButton}`} onClick={() => setDietCalendarMonth(current => addMonths(current, -1))} aria-label="이전 달">
              ‹
            </button>
            <button type="button" className={`grid h-9 w-9 place-items-center text-base ${UI.secondaryButton}`} onClick={() => setDietCalendarMonth(current => addMonths(current, 1))} aria-label="다음 달">
              ›
            </button>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2 text-[11px] font-semibold text-[#7a7470]">
          {DIET_MEALS.map(meal => (
            <span key={meal.id} className="inline-flex items-center gap-1">
              <i className={`h-2 w-2 rounded-full ${DIET_MEAL_COLORS[meal.id]}`} />
              {meal.label}
            </span>
          ))}
          <span className="inline-flex items-center gap-1"><i className="h-2 w-5 rounded-full bg-[#e7b85b]" />탄</span>
          <span className="inline-flex items-center gap-1"><i className="h-2 w-5 rounded-full bg-[#2f8c63]" />단</span>
          <span className="inline-flex items-center gap-1"><i className="h-2 w-5 rounded-full bg-[#d9796f]" />지</span>
        </div>

        <div className={`mt-4 grid grid-cols-7 gap-1 text-center text-xs font-semibold ${UI.textMuted}`}>
          {["월", "화", "수", "목", "금", "토", "일"].map(day => <span key={day}>{day}</span>)}
        </div>
        <div className="mt-2 grid grid-cols-7 gap-1">
          {dietCalendarDays.map(day => {
            const dateKey = toDateKey(day.date);
            const dayMeals = dietMealsByDate.get(dateKey) || [];
            const hasRecord = dayMeals.length > 0;
            const isToday = dateKey === dietDate;
            const dayTotals = dietTotals(dayMeals.flatMap(meal => meal.foods));
            return (
              <button
                key={dateKey}
                type="button"
                className={`relative grid min-h-[74px] rounded-[13px] p-1.5 text-left transition ${
                  hasRecord
                    ? "bg-[#fffdfb] text-[#242124] shadow-[0_8px_20px_rgba(58,48,50,0.04)] ring-1 ring-[#b9dfc5]"
                    : day.inMonth
                      ? "bg-[#fffdfb] text-[#242124] ring-1 ring-[#eadfda]"
                      : "bg-[#fffdfb] text-[#ded4cf]"
                } ${isToday ? "shadow-[inset_0_0_0_2px_rgba(36,33,36,0.16)]" : ""}`}
                onClick={() => hasRecord && setSelectedDietDate(dateKey)}
                disabled={!hasRecord}
                aria-label={`${formatDate(dateKey)} 식단 기록 ${dayMeals.length}개`}
              >
                <span className="text-xs font-bold">{day.date.getDate()}</span>
                {isToday && <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-[#242124]" />}
                {hasRecord && (
                  <span className="mt-1 grid gap-1">
                    <span className="truncate text-[9px] font-bold leading-none text-[#2f8c63]">{formatNumber(dayTotals.calories)}kcal</span>
                    <span className="flex gap-0.5">
                      {DIET_MEALS.map(meal => (
                        <i key={meal.id} className={`h-1.5 flex-1 rounded-full ${dayMeals.some(log => log.slot === meal.id) ? DIET_MEAL_COLORS[meal.id] : "bg-[#eee6e0]"}`} />
                      ))}
                    </span>
                    <DietMacroStrip totals={dayTotals} />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </section>

      {entryDialogOpen && (
        <div
          className="fixed inset-0 z-50 grid place-items-end bg-[#242124]/48 p-0 backdrop-blur-sm md:place-items-center md:p-6"
          role="dialog"
          aria-modal="true"
          aria-label="식단 기록 추가"
          onClick={() => setEntryDialogOpen(false)}
        >
          <div
            className="max-h-[86vh] w-full max-w-[520px] overflow-y-auto rounded-t-[28px] bg-[#fffdfb] p-5 shadow-[0_-18px_48px_rgba(36,33,36,0.22)] md:rounded-[28px]"
            onClick={event => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[#7a7470]">식단 기록</p>
                <h2 className="mt-1 text-2xl font-bold text-[#242124]">사진으로 식단을 남겨요</h2>
                <p className="mt-2 text-sm font-medium leading-6 text-[#7a7470]">
                  날짜와 식사 구간을 먼저 고른 뒤 사진을 추가해 주세요.
                </p>
              </div>
              <button
                type="button"
                className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#f8f4f0] text-lg font-bold text-[#242124]"
                onClick={() => setEntryDialogOpen(false)}
                aria-label="닫기"
              >
                ×
              </button>
            </div>

            <div className="mt-5 grid gap-4">
              <label className="grid gap-2">
                <span className="text-sm font-semibold text-[#7a7470]">날짜</span>
                <input
                  type="date"
                  className="h-12 rounded-full bg-[#f8f4f0] px-4 text-base font-semibold text-[#242124] outline-none ring-1 ring-[#eadfda]"
                  value={entryDate}
                  onChange={event => setEntryDate(event.target.value || dietDate)}
                />
              </label>

              <div className="grid gap-2">
                <p className="text-sm font-semibold text-[#7a7470]">식사 구간</p>
                <div className="grid grid-cols-4 gap-1 rounded-[22px] bg-[#f8f4f0] p-1">
                  {DIET_MEALS.map(meal => (
                    (() => {
                      const registeredCount = entryDateMeals.filter(log => log.slot === meal.id && (log.foods || []).length > 0).length;
                      const registered = registeredCount > 0;
                      const active = entryMeal === meal.id;
                      return (
                        <button
                          key={meal.id}
                          type="button"
                          className={`grid min-h-12 rounded-[18px] px-1.5 py-2 text-sm font-bold leading-tight transition ${
                            active && registered
                              ? "bg-[#2f8c63] text-[#fffdfb]"
                              : active
                                ? "bg-[#242124] text-[#fffdfb]"
                                : registered
                                  ? "bg-[#edf8f1] text-[#2f6f51] ring-1 ring-[#b9dfc5]"
                                  : "text-[#7a7470]"
                          }`}
                          onClick={() => setEntryMeal(meal.id)}
                        >
                          <span>{meal.label}</span>
                          {registered && (
                            <span className={`mt-0.5 text-[10px] font-bold ${active ? "text-[#fffdfb]" : "text-[#2f8c63]"}`}>
                              {meal.id === "snack" ? `${registeredCount}개` : "저장됨"}
                            </span>
                          )}
                        </button>
                      );
                    })()
                  ))}
                </div>
                <p className="text-xs font-semibold leading-5 text-[#7a7470]">
                  아침, 점심, 저녁은 날짜별 1개만 저장되고 새 기록 저장 시 대체됩니다. 간식은 여러 개 저장할 수 있습니다.
                </p>
              </div>

              <label className="grid gap-2">
                <span className="text-sm font-semibold text-[#7a7470]">메뉴 이름 또는 힌트</span>
                <input
                  className="h-12 rounded-full bg-[#f8f4f0] px-4 text-base font-semibold text-[#242124] outline-none ring-1 ring-[#eadfda]"
                  value={entryMenuHint}
                  onChange={event => setEntryMenuHint(event.target.value)}
                  placeholder="예: 김밥, 계란, 컵라면"
                />
              </label>

              <div className="grid grid-cols-2 gap-2">
                <label className="cursor-pointer rounded-full bg-[#242124] px-4 py-3 text-center text-sm font-bold text-[#fffdfb] active:scale-[0.99]">
                  사진 추가
                  <input
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    onChange={event => {
                      void openPhotoAnalysis(entryMeal, event.target.files, entryDate, entryMenuHint);
                      event.currentTarget.value = "";
                    }}
                  />
                </label>
                <button
                  type="button"
                  className="rounded-full bg-[#f8f4f0] px-4 py-3 text-sm font-bold text-[#242124] ring-1 ring-[#eadfda]"
                  onClick={() => {
                    openManualEntry(entryMeal, entryDate, entryMenuHint);
                  }}
                >
                  직접 입력
                </button>
              </div>

              {(reviewMeal || analysisStatus !== "idle" || analysisError) && (
                <div className="grid min-w-0 gap-4 rounded-[22px] bg-[#fffdfb] p-4 ring-1 ring-[#eadfda]">
                  <div>
                    <p className={`text-sm font-medium ${UI.textMuted}`}>AI 분석 결과</p>
                    <h3 className="mt-1 text-xl font-bold text-[#242124]">
                      {reviewMeal ? `${reviewMealLabel} 분석 결과를 확인해요` : "사진을 추가하거나 직접 입력해보세요"}
                    </h3>
                    {reviewMeal && (
                      <p className="mt-2 text-sm font-semibold text-[#7a7470]">
                        {formatDate(reviewDate)}{reviewMenuHint ? ` · ${reviewMenuHint}` : ""}
                      </p>
                    )}
                  </div>

                  {reviewImage ? (
                    <img src={reviewImage} alt={`${reviewMealLabel} 식단 사진 미리보기`} className="aspect-[4/3] w-full rounded-[18px] object-cover" />
                  ) : (
                    <div className="grid aspect-[4/3] place-items-center rounded-[18px] bg-[#f8f4f0] p-6 text-center text-sm font-semibold leading-6 text-[#7a7470]">
                      {analysisStatus === "analyzing" ? "사진을 준비하고 있어요." : "음식 사진을 올리면 이곳에서 분석 결과를 확인합니다."}
                    </div>
                  )}

                  {analysisStatus === "analyzing" && (
                    <div className="rounded-[16px] bg-[#edf8f1] p-4 text-sm font-semibold leading-6 text-[#2f6f51] ring-1 ring-[#b9dfc5]">
                      음식을 분석하고 있어요. 사진 속 음식과 분량을 확인하는 중이며, 최대 1분 정도 걸릴 수 있습니다.
                    </div>
                  )}

                  {analysisError && (
                    <div className="rounded-[16px] bg-[#fff5f2] p-4 text-sm font-semibold leading-6 text-[#9d3d35] ring-1 ring-[#f1c4bc]">
                      {analysisError}
                    </div>
                  )}

                  {reviewFeedback && !analysisError && (
                    <div className="rounded-[16px] bg-[#edf8f1] p-4 text-sm font-semibold leading-6 text-[#2f6f51]">
                      {reviewFeedback}
                    </div>
                  )}

                  {analysisStatus === "ready" && (
                    <div className="grid min-w-0 gap-3">
                      {reviewFoods.map(food => (
                        <div key={food.id} className="grid min-w-0 gap-2 rounded-[16px] bg-[#f8f4f0] p-3">
                          <div className="grid grid-cols-[minmax(0,1fr)_90px] gap-2">
                            <input className="min-w-0 rounded-full bg-[#fffdfb] px-3 py-2 text-sm font-semibold outline-none ring-1 ring-[#eadfda]" value={food.name} onChange={event => updateReviewFood(food.id, "name", event.target.value)} aria-label="음식명" />
                            <input className="min-w-0 rounded-full bg-[#fffdfb] px-3 py-2 text-sm font-semibold outline-none ring-1 ring-[#eadfda]" value={food.portion} onChange={event => updateReviewFood(food.id, "portion", event.target.value)} aria-label="분량" />
                          </div>
                          <div className="grid grid-cols-4 gap-2">
                            <NutritionInput label="kcal" value={food.calories} onChange={value => updateReviewFood(food.id, "calories", value)} />
                            <NutritionInput label="탄" value={food.carbs} onChange={value => updateReviewFood(food.id, "carbs", value)} />
                            <NutritionInput label="단" value={food.protein} onChange={value => updateReviewFood(food.id, "protein", value)} />
                            <NutritionInput label="지" value={food.fat} onChange={value => updateReviewFood(food.id, "fat", value)} />
                          </div>
                        </div>
                      ))}
                      <div className="grid grid-cols-2 gap-2">
                        <button type="button" className="rounded-full bg-[#f8f4f0] px-4 py-3 text-sm font-semibold text-[#242124]" onClick={() => setReviewFoods(foods => [...foods, emptyDietFood()])}>
                          음식 추가
                        </button>
                        <button type="button" className="rounded-full bg-[#242124] px-4 py-3 text-sm font-semibold text-[#fffdfb] disabled:opacity-40" onClick={() => void saveReviewMeal()} disabled={savingDiet || reviewFoods.length === 0}>
                          {savingDiet ? "저장 중" : "저장"}
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="rounded-[16px] bg-[#f8f4f0] p-4">
                    <p className="text-xs font-semibold text-[#7a7470]">AI 정확도 안내</p>
                    <p className="mt-2 text-sm font-semibold leading-6 text-[#242124]">
                      사진 기반 추정값입니다. 실제 조리법과 분량에 따라 차이가 있을 수 있으니 저장 전 음식과 분량을 확인해 주세요.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {selectedDietDate && (
        <div
          className="fixed inset-0 z-50 grid place-items-end bg-[#242124]/48 p-0 backdrop-blur-sm md:place-items-center md:p-6"
          role="dialog"
          aria-modal="true"
          aria-label="날짜별 식단 상세"
          onClick={() => setSelectedDietDate(null)}
        >
          <div
            className="max-h-[86vh] w-full max-w-[560px] overflow-y-auto rounded-t-[28px] bg-[#fffdfb] p-5 shadow-[0_-18px_48px_rgba(36,33,36,0.22)] md:rounded-[28px]"
            onClick={event => event.stopPropagation()}
          >
            <DietDayDetail
              date={selectedDietDate}
              meals={selectedDietLogs}
              onClose={() => setSelectedDietDate(null)}
            />
          </div>
        </div>
      )}

      {summaryDialogOpen && (
        <div
          className="fixed inset-0 z-50 grid place-items-end bg-[#242124]/48 p-0 backdrop-blur-sm md:place-items-center md:p-6"
          role="dialog"
          aria-modal="true"
          aria-label="오늘 식단 상세"
          onClick={() => setSummaryDialogOpen(false)}
        >
          <div
            className="max-h-[86vh] w-full max-w-[560px] overflow-y-auto rounded-t-[28px] bg-[#fffdfb] p-5 shadow-[0_-18px_48px_rgba(36,33,36,0.22)] md:rounded-[28px]"
            onClick={event => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[#7a7470]">식단 상세</p>
                <h2 className="mt-1 text-2xl font-bold text-[#242124]">식단별 분석 결과</h2>
                <p className="mt-2 text-sm font-medium leading-6 text-[#7a7470]">
                  {dietPeriodTitle} · {loggedCount}/4 구간 · {formatNumber(totals.calories)} kcal
                </p>
              </div>
              <button
                type="button"
                className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#f8f4f0] text-lg font-bold text-[#242124]"
                onClick={() => setSummaryDialogOpen(false)}
                aria-label="닫기"
              >
                ×
              </button>
            </div>

            <div className="mt-5 grid grid-cols-3 gap-2">
              <MacroBox label="탄수화물" value={`${totals.carbs}g`} />
              <MacroBox label="단백질" value={`${totals.protein}g`} />
              <MacroBox label="지방" value={`${totals.fat}g`} />
            </div>

            <div className="mt-5 grid gap-3">
              {periodMealLogs.length === 0 ? (
                <article className="rounded-[20px] bg-[#f8f4f0] p-5 text-center ring-1 ring-[#eadfda]">
                  <p className="text-base font-bold text-[#242124]">선택한 기간에는 식단 기록이 없어요.</p>
                  <p className="mt-2 text-sm font-semibold leading-6 text-[#7a7470]">사진을 추가하거나 직접 입력해서 식단을 남겨보세요.</p>
                  <button
                    type="button"
                    className="mt-4 rounded-full bg-[#242124] px-5 py-3 text-sm font-bold text-[#fffdfb]"
                    onClick={() => {
                      setSummaryDialogOpen(false);
                      openDietEntryDialog(dietRange === "day" ? dietPeriod.start : dietDate);
                    }}
                  >
                    식단 추가
                  </button>
                </article>
              ) : (
                periodMealsByDate.map(({ date, meals }) => (
                  <article key={date} className="min-w-0 rounded-[20px] bg-[#f8f4f0] p-4 ring-1 ring-[#eadfda]">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-[#7a7470]">{formatDate(date)}</p>
                        <h3 className="mt-1 text-xl font-bold text-[#242124]">
                          {formatNumber(dietTotals(meals.flatMap(meal => meal.foods)).calories)} kcal
                        </h3>
                      </div>
                      <span className="shrink-0 rounded-full bg-[#edf8f1] px-3 py-1.5 text-xs font-bold text-[#2f8c63]">{meals.length}개</span>
                    </div>

                    <div className="mt-4 grid gap-3">
                      {meals.map(log => {
                        const meal = DIET_MEALS.find(item => item.id === log.slot);
                        const mealTotals = dietTotals(log.foods || []);
                        return (
                          <div key={log.id || `${log.date}-${log.slot}`} className="grid gap-3 rounded-[18px] bg-[#fffdfb] p-3 ring-1 ring-[#eadfda]">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-[#7a7470]">{meal?.label || "식사"}{log.entryName ? ` · ${log.entryName}` : ""}</p>
                                <p className="mt-1 truncate text-sm font-bold text-[#242124]">{log.foods.map(food => food.name).join(", ")}</p>
                                <p className="mt-1 text-xs font-semibold text-[#7a7470]">
                                  {formatNumber(mealTotals.calories)} kcal · 탄 {mealTotals.carbs}g · 단 {mealTotals.protein}g · 지 {mealTotals.fat}g
                                </p>
                              </div>
                              <button type="button" className="shrink-0 text-xs font-bold text-[#c84653]" onClick={() => void deleteMeal(log)}>
                                삭제
                              </button>
                            </div>
                            {log.imageUrl && <img src={log.imageUrl} alt={`${meal?.label || "식사"} 식단 사진`} className="aspect-[4/3] w-full rounded-[16px] object-cover" />}
                            <div className="grid gap-2">
                              {log.foods.map(food => (
                                <div key={food.id} className="rounded-[14px] bg-[#f8f4f0] p-3">
                                  <div className="flex min-w-0 items-start justify-between gap-3">
                                    <div className="min-w-0">
                                      <p className="truncate text-sm font-bold text-[#242124]">{food.name}</p>
                                      <p className="mt-1 text-xs font-semibold text-[#7a7470]">{food.portion}</p>
                                    </div>
                                    <span className="shrink-0 text-sm font-bold text-[#242124]">{formatNumber(food.calories)} kcal</span>
                                  </div>
                                  <p className="mt-2 text-xs font-semibold text-[#7a7470]">
                                    탄 {food.carbs}g · 단 {food.protein}g · 지 {food.fat}g
                                  </p>
                                </div>
                              ))}
                            </div>
                            {log.feedback && (
                              <p className="rounded-[14px] bg-[#f8f4f0] p-3 text-sm font-semibold leading-6 text-[#4b4541]">
                                {log.feedback}
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </article>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {goalDialogOpen && (
        <div className="fixed inset-0 z-50 grid place-items-end bg-[#242124]/48 p-0 backdrop-blur-sm md:place-items-center md:p-6" role="dialog" aria-modal="true" aria-label="식단 목표 설정" onClick={() => { setGoalDraft(dietGoal); setGoalDialogOpen(false); }}>
          <div className="max-h-[86vh] w-full max-w-[520px] overflow-y-auto rounded-t-[28px] bg-[#fffdfb] p-5 shadow-[0_-18px_48px_rgba(36,33,36,0.22)] md:rounded-[28px]" onClick={event => event.stopPropagation()}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-[#7a7470]">식단 목표</p>
                <h2 className="mt-1 text-2xl font-bold text-[#242124]">목표를 설정해요</h2>
                <p className="mt-2 text-sm font-medium leading-6 text-[#7a7470]">
                  오늘 식단 요약의 목표 칼로리와 단백질 기준으로 사용됩니다.
                </p>
              </div>
              <button type="button" className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#f8f4f0] text-lg font-bold text-[#242124]" onClick={() => { setGoalDraft(dietGoal); setGoalDialogOpen(false); }} aria-label="닫기">
                ×
              </button>
            </div>

            <div className="mt-5 grid gap-4">
              <label className="grid gap-2">
                <span className="text-sm font-semibold text-[#7a7470]">목표 유형</span>
                <select
                  className="h-12 rounded-full bg-[#f8f4f0] px-4 text-base font-semibold text-[#242124] outline-none ring-1 ring-[#eadfda]"
                  value={goalDraft.goalType}
                  onChange={event => applyCalculatedGoal(event.target.value)}
                >
                  <option value="healthy">건강한 식습관</option>
                  <option value="fat_loss">체중 감량</option>
                  <option value="maintain">체중 유지</option>
                  <option value="muscle_gain">근육 증가</option>
                  <option value="bulk">벌크업</option>
                </select>
              </label>

              <div className="grid grid-cols-2 gap-3">
                <label className="grid gap-2">
                  <span className="text-sm font-semibold text-[#7a7470]">목표 칼로리</span>
                  <div className="flex items-center rounded-full bg-[#f8f4f0] px-4 ring-1 ring-[#eadfda]">
                    <input
                      type="number"
                      min={800}
                      max={6000}
                      inputMode="numeric"
                      className="h-12 min-w-0 flex-1 bg-transparent text-base font-bold text-[#242124] outline-none"
                      value={goalDraft.targetCalories ?? ""}
                      onChange={event => setGoalDraft(goal => ({ ...goal, targetCalories: event.target.value ? Number(event.target.value) : null }))}
                    />
                    <span className="text-sm font-bold text-[#7a7470]">kcal</span>
                  </div>
                </label>

                <label className="grid gap-2">
                  <span className="text-sm font-semibold text-[#7a7470]">목표 단백질</span>
                  <div className="flex items-center rounded-full bg-[#f8f4f0] px-4 ring-1 ring-[#eadfda]">
                    <input
                      type="number"
                      min={0}
                      max={400}
                      inputMode="numeric"
                      className="h-12 min-w-0 flex-1 bg-transparent text-base font-bold text-[#242124] outline-none"
                      value={goalDraft.targetProtein ?? ""}
                      onChange={event => setGoalDraft(goal => ({ ...goal, targetProtein: event.target.value ? Number(event.target.value) : null }))}
                    />
                    <span className="text-sm font-bold text-[#7a7470]">g</span>
                  </div>
                </label>
              </div>

              {goalError && (
                <p className="rounded-[16px] bg-[#fff5f2] p-4 text-sm font-semibold leading-6 text-[#9d3d35] ring-1 ring-[#f1c4bc]">
                  {goalError}
                </p>
              )}

              <div className="rounded-[18px] bg-[#f8f4f0] p-4 text-sm font-semibold leading-6 text-[#4b4541]">
                {hasPreciseDietProfile
                  ? `내 정보 기준으로 ${dietGoalTypeLabel(goalDraft.goalType)} 목표를 계산합니다. 활동량은 ${activityLevelLabel(settings.activityLevel)} 기준입니다.`
                  : "성별, 나이, 키, 체중을 모두 입력하면 더 정확한 목표 칼로리와 단백질을 자동 계산합니다. 정보가 부족하면 체중 기반 추정값을 사용합니다."}
              </div>

              <div className="rounded-[18px] bg-[#fffdfb] p-4 text-sm font-semibold leading-6 text-[#4b4541] ring-1 ring-[#eadfda]">
                자동 계산값: {formatNumber(autoGoalPreview.targetCalories || 0)} kcal · 단백질 {autoGoalPreview.targetProtein || 0}g
                {autoGoalPreview.targetCarbsMin != null && autoGoalPreview.targetCarbsMax != null && autoGoalPreview.targetFatMin != null && autoGoalPreview.targetFatMax != null && (
                  <span className="mt-1 block text-xs text-[#7a7470]">
                    탄수화물 {autoGoalPreview.targetCarbsMin}~{autoGoalPreview.targetCarbsMax}g · 지방 {autoGoalPreview.targetFatMin}~{autoGoalPreview.targetFatMax}g
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button type="button" className="rounded-full bg-[#f8f4f0] px-4 py-4 text-sm font-bold text-[#242124]" onClick={() => applyCalculatedGoal()}>
                  자동 계산
                </button>
                <button type="button" className="rounded-full bg-[#242124] px-4 py-4 text-sm font-bold text-[#fffdfb] disabled:opacity-40" onClick={() => void saveDietGoal()} disabled={savingGoal}>
                  {savingGoal ? "저장 중" : "목표 저장"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function ProfileView({
  userEmail,
  settings,
  saving,
  onSave,
  onSignOut,
}: {
  userEmail?: string | null;
  settings: UserSettings;
  saving: boolean;
  onSave: (settings: UserSettings) => boolean | Promise<boolean>;
  onSignOut: () => void;
}) {
  const [weeklyGoal, setWeeklyGoal] = useState(String(settings.weeklyGoal));
  const [gender, setGender] = useState(settings.gender);
  const [age, setAge] = useState(settings.age == null ? "" : String(settings.age));
  const [heightCm, setHeightCm] = useState(settings.heightCm == null ? "" : String(settings.heightCm));
  const [weightKg, setWeightKg] = useState(settings.weightKg == null ? "" : String(settings.weightKg));
  const [activityLevel, setActivityLevel] = useState(settings.activityLevel);
  const [favoriteExerciseIds, setFavoriteExerciseIds] = useState<string[]>(settings.favoriteExerciseIds);
  const [activeModal, setActiveModal] = useState<"profile" | "goal" | "favorites" | null>(null);
  const [favoriteRoutineTab, setFavoriteRoutineTab] = useState(ROUTINE_TABS[0].value);
  const [favoriteSubTab, setFavoriteSubTab] = useState("전체");
  const [favoriteSearch, setFavoriteSearch] = useState("");
  const favoriteSet = useMemo(() => new Set(favoriteExerciseIds), [favoriteExerciseIds]);
  const favoritePreview = useMemo(
    () => favoriteExerciseIds
      .map(id => exerciseById.get(id)?.name)
      .filter(Boolean)
      .slice(0, 3)
      .join(" · "),
    [favoriteExerciseIds],
  );
  const genderText = gender === "female" ? "여성" : gender === "male" ? "남성" : gender === "other" ? "기타" : "미입력";
  const favoriteRoutine = ROUTINE_TABS.find(routine => routine.value === favoriteRoutineTab || routine.label === favoriteRoutineTab) || ROUTINE_TABS[0];
  const favoriteSubTabs = routineSubTabs(favoriteRoutine);
  const hasFavoriteSubTabs = favoriteSubTabs.length > 0;
  const favoriteSearchQuery = normalizeSearchText(favoriteSearch);
  const visibleFavoriteExercises = useMemo(() => {
    const routineIds = new Set(favoriteRoutine.exercises);
    return EXERCISES
      .filter(exercise => routineIds.has(exercise.id))
      .filter(exercise => !hasFavoriteSubTabs || favoriteSubTab === "전체" || exercise.subTabs?.includes(favoriteSubTab))
      .filter(exercise => !favoriteSearchQuery || exerciseSearchText(exercise).includes(favoriteSearchQuery))
      .sort((a, b) => Number(favoriteSet.has(b.id)) - Number(favoriteSet.has(a.id)) || a.name.localeCompare(b.name, "ko"));
  }, [favoriteRoutine, favoriteSet, favoriteSearchQuery, favoriteSubTab, hasFavoriteSubTabs]);

  useEscapeToClose(Boolean(activeModal), closeModal);

  useEffect(() => {
    syncLocalFromSettings();
  }, [settings]);

  function syncLocalFromSettings() {
    setWeeklyGoal(String(settings.weeklyGoal));
    setGender(settings.gender);
    setAge(settings.age == null ? "" : String(settings.age));
    setHeightCm(settings.heightCm == null ? "" : String(settings.heightCm));
    setWeightKg(settings.weightKg == null ? "" : String(settings.weightKg));
    setActivityLevel(settings.activityLevel);
    setFavoriteExerciseIds(settings.favoriteExerciseIds);
  }

  function closeModal() {
    syncLocalFromSettings();
    setActiveModal(null);
  }

  function handleFavoriteRoutineTab(value: string) {
    setFavoriteRoutineTab(value);
    setFavoriteSubTab("전체");
  }

  function toggleFavorite(exerciseId: string) {
    setFavoriteExerciseIds(items => (
      items.includes(exerciseId)
        ? items.filter(id => id !== exerciseId)
        : [...items, exerciseId]
    ));
  }

  async function handleSave() {
    const saved = await onSave({
      weeklyGoal: clampWeeklyGoal(weeklyGoal),
      favoriteExerciseIds,
      gender: sanitizeGender(gender),
      age: sanitizeAge(age),
      heightCm: sanitizeBodyNumber(heightCm),
      weightKg: sanitizeBodyNumber(weightKg),
      activityLevel: sanitizeActivityLevel(activityLevel),
    });
    if (saved) setActiveModal(null);
  }

  return (
    <section className="mx-auto max-w-[960px] px-4 py-7 pb-28 md:px-8 md:py-10">
      <SectionTitle kicker="내 정보" title="운동 설정" />
      <div className="grid gap-5">
        <div className="rounded-[20px] bg-[#fffdfb] p-5 text-[#242124] shadow-[0_14px_36px_rgba(58,48,50,0.06)] ring-1 ring-[#eadfda]">
          <p className="text-sm font-medium text-[#7a7470]">로그인 계정</p>
          <h2 className="mt-2 break-all text-xl font-semibold">{userEmail || "내 계정"}</h2>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <button className={`${UI.card} rounded-[16px] p-5 text-left`} type="button" onClick={() => setActiveModal("profile")}>
            <p className={`text-sm font-medium ${UI.textMuted}`}>개인 운동 정보</p>
            <h2 className="mt-2 text-2xl font-semibold">몸 상태 기록</h2>
            <p className="mt-4 text-sm font-semibold text-[#242124]">{genderText}</p>
            <p className={`mt-1 text-sm leading-6 ${UI.textMuted}`}>
              나이 {age || "-"}세 · 키 {heightCm || "-"}cm · 몸무게 {weightKg || "-"}kg
            </p>
            <p className={`mt-1 text-sm leading-6 ${UI.textMuted}`}>
              활동량 {activityLevelLabel(activityLevel)}
            </p>
            <span className={`mt-5 inline-flex ${UI.pill} bg-[#fffdfb] text-xs`}>수정하기</span>
          </button>

          <button className={`${UI.card} rounded-[16px] p-5 text-left`} type="button" onClick={() => setActiveModal("goal")}>
            <p className={`text-sm font-medium ${UI.textMuted}`}>주간 운동 목표</p>
            <h2 className="mt-2 text-2xl font-semibold">{clampWeeklyGoal(weeklyGoal)}회 / 주</h2>
            <p className={`mt-4 text-sm leading-6 ${UI.textMuted}`}>홈 화면 목표 진행률에 표시됩니다.</p>
            <span className={`mt-5 inline-flex ${UI.pill} bg-[#fffdfb] text-xs`}>목표 변경</span>
          </button>

          <button className={`${UI.card} rounded-[16px] p-5 text-left`} type="button" onClick={() => setActiveModal("favorites")}>
            <p className={`text-sm font-medium ${UI.textMuted}`}>개인 루틴 운동</p>
            <h2 className="mt-2 text-2xl font-semibold">{favoriteExerciseIds.length}개 선택</h2>
            <p className={`mt-4 line-clamp-2 text-sm leading-6 ${UI.textMuted}`}>
              {favoritePreview || "기록 탭 상단에 고정할 운동을 선택하세요."}
            </p>
            <span className={`mt-5 inline-flex ${UI.pill} bg-[#fffdfb] text-xs`}>운동 선택</span>
          </button>
        </div>

        <div className="grid gap-3">
          <button type="button" className={`${UI.secondaryButton} h-12 px-8 text-base`} onClick={onSignOut}>
            로그아웃
          </button>
        </div>
      </div>

      {activeModal && (
        <div className="fixed inset-0 z-50 grid place-items-end bg-[#242124]/48 p-0 backdrop-blur-sm md:place-items-center md:p-6" role="dialog" aria-modal="true" aria-label="내 정보 설정" onClick={() => setActiveModal(null)}>
          <div className="flex max-h-[calc(100svh-0.75rem)] w-full flex-col overflow-hidden rounded-t-[22px] bg-[#fffdfb] shadow-[0_-18px_48px_rgba(58,48,50,0.18)] md:max-h-[90svh] md:max-w-lg md:rounded-[22px]" onClick={event => event.stopPropagation()}>
            <div className={`flex items-start justify-between gap-4 border-b bg-[#fffdfb] p-5 ${UI.border}`}>
              <div>
                <p className={`text-sm font-medium ${UI.textMuted}`}>내 정보</p>
                <h2 className="mt-1 text-2xl font-semibold">
                  {activeModal === "profile" ? "개인 운동 정보" : activeModal === "goal" ? "주간 운동 목표" : "개인 루틴 운동"}
                </h2>
              </div>
              <CloseButton onClick={closeModal} />
            </div>
            <div className="min-h-0 overflow-y-auto p-5">

            {activeModal === "profile" && (
              <div className="grid gap-3">
                <Field label="성별">
                  <select className="nike-input bg-[#fffdfb]" value={gender} onChange={event => setGender(event.target.value)}>
                    <option value="">선택 안 함</option>
                    <option value="female">여성</option>
                    <option value="male">남성</option>
                    <option value="other">기타</option>
                  </select>
                </Field>
                <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-3">
                  <Field label="나이">
                    <input className="nike-input bg-[#fffdfb]" inputMode="numeric" value={age} onChange={event => setAge(event.target.value)} placeholder="예: 28" />
                  </Field>
                  <Field label="키(cm)">
                    <input className="nike-input bg-[#fffdfb]" inputMode="decimal" value={heightCm} onChange={event => setHeightCm(event.target.value)} placeholder="예: 165" />
                  </Field>
                  <Field label="몸무게(kg)">
                    <input className="nike-input bg-[#fffdfb]" inputMode="decimal" value={weightKg} onChange={event => setWeightKg(event.target.value)} placeholder="예: 55" />
                  </Field>
                </div>
                <Field label="활동량">
                  <select className="nike-input bg-[#fffdfb]" value={activityLevel} onChange={event => setActivityLevel(event.target.value)}>
                    {ACTIVITY_LEVELS.map(level => (
                      <option key={level.value || "auto"} value={level.value}>{level.label} · {level.description}</option>
                    ))}
                  </select>
                </Field>
                <p className={`text-sm leading-6 ${UI.textMuted}`}>운동 분석, 체중형 운동 볼륨, 식단 목표 자동 계산에 활용합니다.</p>
              </div>
            )}

            {activeModal === "goal" && (
              <div className="grid gap-3">
                <div className="grid grid-cols-[1fr_auto] gap-3">
                  <input
                    className="nike-input bg-[#fffdfb] text-center text-xl font-semibold"
                    inputMode="numeric"
                    value={weeklyGoal}
                    onChange={event => setWeeklyGoal(event.target.value)}
                    onBlur={() => setWeeklyGoal(String(clampWeeklyGoal(weeklyGoal)))}
                  />
                  <span className={`grid h-12 place-items-center px-5 text-sm ${UI.secondaryButton} ${UI.textMuted}`}>회 / 주</span>
                </div>
                <p className={`text-sm leading-6 ${UI.textMuted}`}>1주 기준 1회부터 14회까지 설정할 수 있습니다.</p>
              </div>
            )}

            {activeModal === "favorites" && (
              <div>
                <p className={`text-sm leading-6 ${UI.textMuted}`}>
                  선택한 운동은 기록 탭 운동 목록 상단에 고정되고 즐겨찾기 표시가 붙습니다.
                </p>
                <div className="mt-4 grid gap-3">
                  <Field label="검색">
                    <input
                      className="nike-input h-12 min-w-0 bg-[#fffdfb]"
                      value={favoriteSearch}
                      onChange={event => setFavoriteSearch(event.target.value)}
                      placeholder="운동 이름을 검색하세요"
                    />
                  </Field>

                  <div className={`flex gap-1 overflow-x-auto rounded-full p-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${UI.surface}`}>
                    {ROUTINE_TABS.map(routine => (
                      <button
                        key={routine.label}
                        type="button"
                        className={`h-9 min-w-[72px] shrink-0 rounded-full px-3 text-xs font-semibold ${routine.value === favoriteRoutine.value ? "bg-[#242124] text-[#fffdfb]" : "text-[#7a7470]"}`}
                        aria-pressed={routine.value === favoriteRoutine.value}
                        onClick={() => handleFavoriteRoutineTab(routine.value)}
                      >
                        {routine.label}
                      </button>
                    ))}
                  </div>

                  {hasFavoriteSubTabs && (
                    <div className={`flex gap-1 overflow-x-auto rounded-full p-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${UI.card}`}>
                      {favoriteSubTabs.map(tab => (
                        <button
                          key={tab}
                          type="button"
                          className={`h-9 shrink-0 rounded-full px-4 text-xs font-semibold ${favoriteSubTab === tab ? "bg-[#242124] text-[#fffdfb]" : `${UI.surface} ${UI.textMuted}`}`}
                          aria-pressed={favoriteSubTab === tab}
                          onClick={() => setFavoriteSubTab(tab)}
                        >
                          {tab}
                        </button>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center justify-between gap-3">
                    <p className={`text-xs font-medium ${UI.textMuted}`}>{favoriteSearch ? "검색 결과" : `${favoriteRoutine.label} 운동 목록`}</p>
                    <span className={`text-xs font-semibold ${UI.textMuted}`}>{visibleFavoriteExercises.length}개</span>
                  </div>
                </div>

                <div className="mt-4 grid max-h-[48svh] gap-2 overflow-y-auto pr-1">
                  {visibleFavoriteExercises.map(exercise => {
                    const selected = favoriteSet.has(exercise.id);
                    return (
                      <button
                        key={exercise.id}
                        type="button"
                        className={`flex items-center justify-between gap-3 p-4 text-left ring-1 ${selected ? `${UI.surfaceActive} ring-[#b9dfc5]` : `${UI.surface} ring-transparent`}`}
                        onClick={() => toggleFavorite(exercise.id)}
                      >
                        <span className="min-w-0">
                          <span className="block truncate text-[15px] font-bold">{exercise.name}</span>
                          <span className={`mt-1 block text-xs font-medium ${UI.textMuted}`}>{exercise.category}</span>
                        </span>
                        <span className={`shrink-0 rounded-full px-3 py-2 text-xs font-bold ${selected ? "bg-[#fffdfb] text-[#2f8c63]" : "bg-[#fffdfb] text-[#7a7470]"}`}>
                          {selected ? "즐겨찾기" : "선택"}
                        </span>
                      </button>
                    );
                  })}
                  {visibleFavoriteExercises.length === 0 && (
                    <div className={`${UI.surface} rounded-[14px] p-4 text-sm font-semibold ${UI.textMuted}`}>
                      검색 결과가 없습니다.
                    </div>
                  )}
                </div>
              </div>
            )}

            <button type="button" className={`${UI.primaryButton} mt-6 h-12 w-full px-8 text-base`} onClick={handleSave} disabled={saving} aria-busy={saving}>
              {saving ? "저장 중" : "저장"}
            </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function MuscleMapPanel({
  range,
  setRange,
  scores,
}: {
  range: SummaryRange;
  setRange: (range: SummaryRange) => void;
  scores: Array<Muscle & { score: number }>;
}) {
  return (
    <FlatPanel title={`${summaryRangeLabels[range]} 자극`} kicker="근육 지도">
      <RangePills value={range} onChange={setRange} />
      <div className="mt-5">
        <BodyMap scores={scores} />
      </div>
    </FlatPanel>
  );
}

function RangePills({ value, onChange }: { value: SummaryRange; onChange: (value: SummaryRange) => void }) {
  return (
    <div className="flex gap-1 overflow-x-auto rounded-full bg-[#f8f4f0] p-1 ring-1 ring-[#eadfda]">
      {(Object.keys(summaryRangeLabels) as SummaryRange[]).map(item => (
        <button type="button"
          key={item}
          className={`h-9 shrink-0 rounded-full px-3 text-xs font-semibold ${value === item ? "bg-[#242124] text-[#fffdfb]" : "text-[#242124]"}`}
          aria-pressed={value === item}
          onClick={() => onChange(item)}
        >
          {summaryRangeLabels[item]}
        </button>
      ))}
    </div>
  );
}

function BodyMap({ scores }: { scores: Array<Muscle & { score: number }> }) {
  const activeScores = scores.filter(item => item.score > 0);
  const total = activeScores.reduce((sum, item) => sum + item.score, 0) || 1;
  const visibleScores = activeScores.slice(0, 6);

  return (
    <div className="grid gap-5">
      <div className="rounded-[16px] bg-[#f8f4f0] p-3">
        {visibleScores.length > 0 ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {visibleScores.map((item, index) => (
              <MuscleFocusCard key={item.id} item={item} total={total} index={index} />
            ))}
          </div>
        ) : (
          <div className="bg-[#fffdfb] p-6 text-center text-sm font-semibold leading-6 text-[#7a7470]">
            운동을 저장하면 자극 부위 카드와 비율이 표시됩니다.
          </div>
        )}
      </div>
      <div>
        <p className="mb-3 text-xs font-semibold text-[#7a7470]">전체 자극 대비 비율</p>
        <div className="grid gap-4">
          {activeScores.slice(0, 5).map((item, index) => <MuscleRow key={item.id} item={item} total={total} index={index} />)}
          {activeScores.length === 0 && <p className="text-base leading-7 text-[#7a7470]">운동을 저장하면 전체 신체 이미지 위에 자극 부위가 표시됩니다.</p>}
        </div>
      </div>
    </div>
  );
}

function MuscleFocusCard({ item, total, index }: { item: Muscle & { score: number }; total: number; index: number }) {
  const key = muscleIconKey(item.id, item.group);
  const percent = Math.round((item.score / total) * 100);
  const imageSrc = MUSCLE_FOCUS_IMAGES[key] || MUSCLE_FOCUS_IMAGES.upper;

  return (
    <div className="rounded-[14px] bg-[#fffdfb] p-3">
      <img
        className="mx-auto aspect-square w-full max-w-[118px] rounded-full border border-[#eef0f2] bg-[#fffdfb] object-cover"
        src={imageSrc}
        alt=""
        aria-hidden="true"
        width={236}
        height={236}
        loading="lazy"
        decoding="async"
      />
      <div className="mt-3 flex items-center justify-between gap-2">
        <span className="truncate text-sm font-semibold">{index + 1}. {item.name}</span>
        <span className="shrink-0 text-sm font-semibold text-[#7a7470]">{percent}%</span>
      </div>
    </div>
  );
}

function TopMuscleCards({ scores, total }: { scores: Array<Muscle & { score: number }>; total: number }) {
  if (scores.length === 0 || total <= 0) {
    return <p className="text-sm leading-6 text-[#7a7470]">운동을 저장하면 많이 자극한 근육 카드가 표시됩니다.</p>;
  }

  return (
    <div className="w-full min-w-0 overflow-x-auto overscroll-x-contain pb-2" aria-label="많이 자극한 근육 전체 순위">
      <div className="flex w-max gap-2">
      {scores.map((item, index) => (
        <div key={item.id} className="w-[126px] shrink-0">
          <MuscleFocusCard item={item} total={total} index={index} />
        </div>
      ))}
      </div>
    </div>
  );
}

function muscleShapeBounds(pathData: string, padding = 0) {
  const values = pathData.match(/-?\d+(?:\.\d+)?/g)?.map(Number) ?? [];
  const xs: number[] = [];
  const ys: number[] = [];

  for (let index = 0; index < values.length - 1; index += 2) {
    xs.push(values[index]);
    ys.push(values[index + 1]);
  }

  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  return {
    x: minX - padding,
    y: minY - padding,
    w: Math.max(1, maxX - minX + padding * 2),
    h: Math.max(1, maxY - minY + padding * 2),
  };
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
        <div className="grid h-32 w-32 place-items-center rounded-full bg-[#fffdfb] text-center">
          <div>
            <p className="text-sm font-medium text-[#7a7470]">합계</p>
            <p className="text-[26px] font-medium">{formatNumber(Math.round(total))}점</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function BarRanking({ data, totalScore }: { data: Array<Muscle & { score: number }>; totalScore?: number }) {
  const total = totalScore || data.reduce((sum, item) => sum + item.score, 0) || 1;
  if (data.length === 0) return <p className="mt-4 text-base leading-7 text-[#7a7470]">운동을 저장하면 주간 순위가 표시됩니다.</p>;
  return (
    <div className="mt-6 grid gap-4">
      {data.map((item, index) => {
        const percent = Math.round((item.score / total) * 100);
        const barColor = index < 3 ? "#242124" : "#9e9ea0";
        return (
          <div key={item.id}>
            <div className="mb-2 flex items-center justify-between gap-3">
              <span className="truncate text-sm font-semibold text-[#242124]">{item.name}</span>
              <span className="shrink-0 text-sm font-medium text-[#7a7470]">{percent}% · {formatNumber(item.score)}점</span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-[#f8f4f0]">
              <div className="h-full rounded-full" style={{ width: `${Math.max(6, percent)}%`, background: barColor }} />
            </div>
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
        <span className="text-sm font-medium text-[#7a7470]">{percent}%</span>
      </div>
      <div className="h-2 bg-[#f8f4f0]">
        <div className="h-2 bg-[#242124]" style={{ width }} />
      </div>
    </div>
  );
}

function MetricGrid({ items }: { items: Array<{ label: string; value: string }> }) {
  return (
    <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
      {items.map(item => (
        <div key={item.label} className={`${UI.surface} rounded-[16px] p-4 shadow-[0_10px_24px_rgba(58,48,50,0.045)] ring-1 ring-[#eadfda]`}>
          <p className={`text-sm font-medium ${UI.textMuted}`}>{item.label}</p>
          <p className="mt-4 text-[30px] font-semibold leading-none">{item.value}</p>
        </div>
      ))}
    </div>
  );
}

function FlatPanel({ title, kicker, children }: { title: string; kicker: string; children: React.ReactNode }) {
  return (
    <section className="min-w-0 overflow-hidden rounded-[22px] bg-[#fffdfb] p-5 shadow-[0_14px_36px_rgba(58,48,50,0.06)] ring-1 ring-[#eadfda]">
      <p className={`text-sm font-medium ${UI.textMuted}`}>{kicker}</p>
      <h2 className="mt-1 text-2xl font-semibold">{title}</h2>
      <div className="mt-5 min-w-0">{children}</div>
    </section>
  );
}

function SectionTitle({ kicker, title }: { kicker: string; title: string }) {
  return (
    <div className="mb-6">
      <p className={`text-sm font-medium ${UI.textMuted}`}>{kicker}</p>
      <h1 className="mt-1 text-[31px] font-bold leading-tight md:text-6xl">{title}</h1>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode; compact?: boolean }) {
  return (
    <label className="grid gap-2">
      <span className={`text-xs font-medium ${UI.textMuted}`}>{label}</span>
      {children}
    </label>
  );
}

function EmptyState({ text, action, onClick }: { text: string; action?: string; onClick?: () => void }) {
  return (
    <div className={`${UI.surface} rounded-[18px] p-6 ring-1 ring-[#eadfda]`}>
      <p className={`max-w-md text-base leading-7 ${UI.textBody}`}>{text}</p>
      {action && onClick && (
        <button type="button" className={`${UI.primaryButton} mt-6 h-12 w-full px-8 text-base md:w-auto`} onClick={onClick}>
          {action}
        </button>
      )}
    </div>
  );
}

function SmallStudioStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[14px] bg-[#fffdfb] p-3">
      <p className="text-xs font-medium text-[#7a7470]">{label}</p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
    </div>
  );
}

function MacroBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-[14px] bg-[#fffdfb] p-3 ring-1 ring-[#eadfda]">
      <p className="truncate text-xs font-medium text-[#7a7470]">{label}</p>
      <p className="mt-2 truncate text-lg font-semibold text-[#242124]">{value}</p>
    </div>
  );
}

function DietMacroStrip({ totals }: { totals: { calories: number; carbs: number; protein: number; fat: number } }) {
  const macroCalories = (totals.carbs * 4) + (totals.protein * 4) + (totals.fat * 9);
  const carbs = macroCalories > 0 ? Math.max((totals.carbs * 4 / macroCalories) * 100, totals.carbs > 0 ? 8 : 0) : 0;
  const protein = macroCalories > 0 ? Math.max((totals.protein * 4 / macroCalories) * 100, totals.protein > 0 ? 8 : 0) : 0;
  const fat = macroCalories > 0 ? Math.max((totals.fat * 9 / macroCalories) * 100, totals.fat > 0 ? 8 : 0) : 0;

  if (macroCalories <= 0) return <span className="h-1.5 rounded-full bg-[#eee6e0]" />;

  return (
    <span className="flex h-1.5 overflow-hidden rounded-full bg-[#eee6e0]">
      <i className="bg-[#e7b85b]" style={{ width: `${carbs}%` }} />
      <i className="bg-[#2f8c63]" style={{ width: `${protein}%` }} />
      <i className="bg-[#d9796f]" style={{ width: `${fat}%` }} />
    </span>
  );
}

function DietDayDetail({ date, meals, onClose }: { date: string; meals: DietMealLog[]; onClose: () => void }) {
  const totals = dietTotals(meals.flatMap(meal => meal.foods));
  const mealsBySlot = groupDietMealsBySlot(meals);

  return (
    <>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[#7a7470]">식단 상세</p>
          <h2 className="mt-1 text-2xl font-bold text-[#242124]">{formatDate(date)}</h2>
          <p className="mt-2 text-sm font-medium leading-6 text-[#7a7470]">
            {meals.length}/4 기록 · {formatNumber(totals.calories)} kcal
          </p>
        </div>
        <button
          type="button"
          className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#f8f4f0] text-lg font-bold text-[#242124]"
          onClick={onClose}
          aria-label="닫기"
        >
          ×
        </button>
      </div>

      <div className="mt-5 grid grid-cols-3 gap-2">
        <MacroBox label="탄수화물" value={`${totals.carbs}g`} />
        <MacroBox label="단백질" value={`${totals.protein}g`} />
        <MacroBox label="지방" value={`${totals.fat}g`} />
      </div>
      <div className="mt-3">
        <DietMacroStrip totals={totals} />
      </div>

      <div className="mt-5 grid gap-3">
        {DIET_MEALS.map(meal => {
          const slotLogs = mealsBySlot.get(meal.id) || [];
          const mealTotals = dietTotals(slotLogs.flatMap(log => log.foods || []));

          return (
            <article key={meal.id} className="rounded-[20px] bg-[#f8f4f0] p-4 ring-1 ring-[#eadfda]">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-bold text-[#7a7470]">{meal.label}</p>
                  <h3 className="mt-1 text-xl font-bold text-[#242124]">
                    {slotLogs.length > 0 ? `${formatNumber(mealTotals.calories)} kcal` : "기록 없음"}
                  </h3>
                </div>
                <i className={`h-3 w-3 shrink-0 rounded-full ${DIET_MEAL_COLORS[meal.id]}`} />
              </div>

              {slotLogs.length > 0 ? (
                <div className="mt-4 grid gap-3">
                  <div className="grid grid-cols-3 gap-2">
                    <MacroBox label="탄수화물" value={`${mealTotals.carbs}g`} />
                    <MacroBox label="단백질" value={`${mealTotals.protein}g`} />
                    <MacroBox label="지방" value={`${mealTotals.fat}g`} />
                  </div>
                  {slotLogs.map(log => (
                    <div key={log.id || `${log.date}-${log.slot}`} className="grid gap-3 rounded-[16px] bg-[#fffdfb] p-3 ring-1 ring-[#eadfda]">
                      {log.imageUrl && (
                        <img src={log.imageUrl} alt={`${meal.label} 식단 사진`} className="aspect-[4/3] w-full rounded-[16px] object-cover" />
                      )}
                      <div className="grid gap-2">
                        {log.foods.map(food => (
                          <div key={food.id} className="rounded-[14px] bg-[#f8f4f0] p-3">
                            <div className="flex min-w-0 items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="truncate text-sm font-bold text-[#242124]">{food.name}</p>
                                <p className="mt-1 text-xs font-semibold text-[#7a7470]">{food.portion}</p>
                              </div>
                              <span className="shrink-0 text-sm font-bold text-[#242124]">{formatNumber(food.calories)} kcal</span>
                            </div>
                            <p className="mt-2 text-xs font-semibold text-[#7a7470]">
                              탄 {food.carbs}g · 단 {food.protein}g · 지 {food.fat}g
                            </p>
                          </div>
                        ))}
                      </div>
                      {log.feedback && (
                        <p className="rounded-[14px] bg-[#f8f4f0] p-3 text-sm font-semibold leading-6 text-[#4b4541]">
                          {log.feedback}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-3 text-sm font-semibold text-[#7a7470]">이 구간은 아직 등록된 식단이 없습니다.</p>
              )}
            </article>
          );
        })}
      </div>
    </>
  );
}

function NutritionInput({ label, value, onChange }: { label: string; value: number; onChange: (value: string) => void }) {
  return (
    <label className="min-w-0">
      <span className="mb-1 block text-center text-[11px] font-bold text-[#7a7470]">{label}</span>
      <input
        className="h-10 w-full min-w-0 rounded-full bg-[#fffdfb] px-2 text-center text-sm font-semibold outline-none ring-1 ring-[#eadfda]"
        inputMode="numeric"
        value={value}
        onChange={event => onChange(event.target.value)}
      />
    </label>
  );
}

function MobileTabBar({ activeTab, setActiveTab }: { activeTab: Tab; setActiveTab: (tab: Tab) => void }) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-[#eadfda] bg-[#fffdfb]/92 px-2 pb-[calc(0.625rem+env(safe-area-inset-bottom))] pt-2 shadow-[0_-14px_34px_rgba(58,48,50,0.08)] backdrop-blur md:hidden" aria-label="하단 메뉴">
      <div className="grid grid-cols-5 gap-1">
        {tabItems.map(tab => (
          <button
            key={tab.id}
            type="button"
            className={`flex h-12 flex-col items-center justify-center gap-0.5 rounded-full text-[11px] font-semibold transition ${activeTab === tab.id ? "bg-[#242124] text-[#fffdfb]" : "bg-[#f8f4f0] text-[#4b4541]"}`}
            onClick={() => setActiveTab(tab.id)}
            aria-current={activeTab === tab.id ? "page" : undefined}
          >
            <SoftIcon name={tab.icon} className="h-4 w-4" />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}
