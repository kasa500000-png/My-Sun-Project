"use client";

import { useEffect, useMemo, useState } from "react";
import { createSupabaseBrowser } from "@/lib/supabase-browser";

type Tab = "home" | "train" | "log" | "balance" | "member";
type ExerciseType = "weight" | "time" | "bodyweight";
type HistoryRange = "day" | "week" | "month" | "year";
type BodyFilter = "all" | "upper" | "lower" | "core";

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
  | "adductors"
  | "glutes"
  | "abductors"
  | "hamstrings"
  | "calves"
  | "cardio"
  | "lower"
  | "upper";

type MuscleDetailShape = {
  d: string;
  fibers?: string[];
  opacity?: number;
  strokeWidth?: number;
};

const MUSCLE_FOCUS_IMAGES: Record<MuscleIconKey, string> = {
  chest: "/images/muscle-focus-cards/chest.png",
  back: "/images/muscle-focus-cards/back.png",
  shoulders: "/images/muscle-focus-cards/shoulders.png",
  arms: "/images/muscle-focus-cards/arms.png",
  core: "/images/muscle-focus-cards/core.png",
  quads: "/images/muscle-focus-cards/quads.png",
  adductors: "/images/muscle-focus-cards/adductors.png",
  glutes: "/images/muscle-focus-cards/glutes.png",
  abductors: "/images/muscle-focus-cards/abductors.png",
  hamstrings: "/images/muscle-focus-cards/hamstrings.png",
  calves: "/images/muscle-focus-cards/calves.png",
  cardio: "/images/muscle-focus-cards/cardio.png",
  lower: "/images/muscle-focus-cards/lower.png",
  upper: "/images/muscle-focus-cards/upper.png",
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
  { id: "chest", name: "가슴", group: "상체", color: "#111111" },
  { id: "back", name: "등", group: "상체", color: "#39393b" },
  { id: "shoulders", name: "어깨", group: "상체", color: "#707072" },
  { id: "biceps", name: "이두", group: "팔", color: "#9e9ea0" },
  { id: "triceps", name: "삼두", group: "팔", color: "#4b4b4d" },
  { id: "core", name: "코어", group: "코어", color: "#007d48" },
  { id: "quads", name: "앞허벅지", group: "하체", color: "#111111" },
  { id: "adductors", name: "내전근", group: "하체", color: "#707072" },
  { id: "glutes", name: "둔근", group: "하체", color: "#d30005" },
  { id: "abductors", name: "중둔근", group: "하체", color: "#9e9ea0" },
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
    id: "hip-adduction",
    name: "힙 어덕션",
    category: "하체",
    type: "weight",
    defaultRestSeconds: 60,
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
    impacts: [
      { muscleId: "abductors", impactRatio: 0.65 },
      { muscleId: "glutes", impactRatio: 0.25 },
      { muscleId: "core", impactRatio: 0.1 },
    ],
  },
  {
    id: "bulgarian-split-squat",
    name: "불가리안 스플릿 스쿼트",
    category: "하체",
    type: "weight",
    defaultRestSeconds: 90,
    impacts: [
      { muscleId: "quads", impactRatio: 0.35 },
      { muscleId: "glutes", impactRatio: 0.35 },
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
    id: "pull-up",
    name: "풀업",
    category: "등",
    type: "bodyweight",
    defaultRestSeconds: 90,
    impacts: [
      { muscleId: "back", impactRatio: 0.5 },
      { muscleId: "biceps", impactRatio: 0.25 },
      { muscleId: "shoulders", impactRatio: 0.15 },
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
    id: "ab-slide",
    name: "AB슬라이드",
    category: "코어",
    type: "bodyweight",
    defaultRestSeconds: 60,
    impacts: [
      { muscleId: "core", impactRatio: 0.65 },
      { muscleId: "shoulders", impactRatio: 0.15 },
      { muscleId: "back", impactRatio: 0.1 },
      { muscleId: "chest", impactRatio: 0.1 },
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
    exercises: ["squat", "leg-press", "hip-thrust", "hip-adduction", "hip-abduction", "bulgarian-split-squat", "stair-climber"],
  },
  {
    name: "UPPER BALANCE",
    label: "상체 밸런스",
    note: "등, 가슴, 어깨를 균형 있게.",
    exercises: ["lat-pulldown", "pull-up", "seated-row", "bench-press", "shoulder-press"],
  },
  {
    name: "CORE RESET",
    label: "코어 리셋",
    note: "코어 안정감과 가벼운 전신 운동.",
    exercises: ["plank", "ab-slide", "push-up", "running"],
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
  const first = addDays(start, -start.getDay());
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
  core: ["core"],
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

function clampSetCount(value: string | number) {
  const count = Math.floor(Number(value) || 1);
  return Math.min(Math.max(count, 1), 20);
}

function intensityMultiplier(value: string | number | undefined) {
  const numeric = String(Number(value || 2) || 2);
  return INTENSITY_LEVELS.find(level => level.value === numeric)?.multiplier || 1;
}

function setVolume(set: SetLog) {
  const exercise = exerciseById.get(set.exerciseId);
  if (exercise?.type === "time") return Math.max(Number(set.durationSeconds || 0) / 60, 1) * 25 * intensityMultiplier(set.weight);
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

function normalizeSearchText(value: string) {
  return value.toLocaleLowerCase("ko-KR").replace(/\s+/g, "");
}

function exerciseSearchText(exercise: Exercise) {
  const routineLabels = ROUTINES
    .filter(routine => routine.exercises.includes(exercise.id))
    .map(routine => routine.label)
    .join(" ");
  return normalizeSearchText(`${exercise.name} ${exercise.category} ${routineLabels}`);
}

function workoutNameForSets(sets: Array<{ exerciseId: string }>, fallback = ROUTINES[0].label) {
  const routineLabels = ROUTINES
    .filter(routine => sets.some(set => routine.exercises.includes(set.exerciseId)))
    .map(routine => routine.label);

  if (routineLabels.length === 0) return fallback;
  if (routineLabels.length === 1) return routineLabels[0];
  return "복합 루틴";
}

function draftSetsFromSession(session: WorkoutSession): DraftSet[] {
  return session.sets.map(set => {
    const exercise = exerciseById.get(set.exerciseId);
    const isTime = exercise?.type === "time";
    return {
      exerciseId: set.exerciseId,
      weight: isTime ? String(set.weight || 2) : String(set.weight || ""),
      reps: isTime ? String(Math.round((set.durationSeconds || 0) / 60) || "") : String(set.reps || ""),
      memo: set.memo || "",
    };
  });
}

function routineLabelFromSession(session: WorkoutSession) {
  return ROUTINES.find(routine => routine.exercises.includes(session.sets[0]?.exerciseId || ""))?.label || ROUTINES[0].label;
}

function muscleIconKey(muscleId: string, group?: string): MuscleIconKey {
  if (muscleId === "biceps" || muscleId === "triceps") return "arms";
  if (muscleId in MUSCLE_FOCUS_IMAGES) return muscleId as MuscleIconKey;
  if (group === "하체") return "lower";
  if (group === "상체") return "upper";
  return "cardio";
}

export default function FitLogApp({ userId, userEmail }: FitLogAppProps) {
  const [activeTab, setActiveTab] = useState<Tab>("home");
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [lastSavedSession, setLastSavedSession] = useState<WorkoutSession | null>(null);
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
  const topToday = todayScores.filter(item => item.score > 0);

  const currentDraftScores = useMemo(() => {
    const pseudo: WorkoutSession = {
      id: "draft",
      date: draftDate,
      routineName,
      durationMinutes: parseNumber(draftDuration),
      sets: draftSets.map((set, index) => {
        const exercise = exerciseById.get(set.exerciseId);
        const isTime = exercise?.type === "time";
        return {
          id: `draft-${index}`,
          exerciseId: set.exerciseId,
          setNumber: index + 1,
          weight: isTime ? parseNumber(set.weight) || 2 : parseNumber(set.weight),
          reps: isTime ? 1 : parseNumber(set.reps),
          durationSeconds: isTime ? parseNumber(set.reps) * 60 : undefined,
        };
      }),
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

  function addSet(exerciseId = selectedExercise, count = 1) {
    const exercise = exerciseById.get(exerciseId);
    const nextSets = Array.from({ length: clampSetCount(count) }, () => ({
      exerciseId,
      weight: exercise?.type === "time" ? "2" : "",
      reps: "",
      memo: "",
    }));
    setDraftSets(items => [...items, ...nextSets]);
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
          weight: isTime ? parseNumber(set.weight) || 2 : parseNumber(set.weight),
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
      routineName: workoutNameForSets(validSets, routineName),
      durationMinutes: Math.max(parseNumber(draftDuration), 1),
      memo: draftMemo.trim() || undefined,
      sets: validSets,
    };

    setSaving(true);
    try {
      const res = await fetch("/api/fit-log", {
        method: editingSessionId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...nextSession, id: editingSessionId || nextSession.id, user_id: userId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "운동 기록 저장에 실패했어요.");
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
    const res = await fetch(`/api/fit-log?id=${encodeURIComponent(id)}&user_id=${encodeURIComponent(userId)}`, {
      method: "DELETE",
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setToast(data.error || "기록 삭제에 실패했어요.");
      return;
    }
    setSessions(items => items.filter(item => item.id !== id));
    if (lastSavedSession?.id === id) setLastSavedSession(null);
    if (editingSessionId === id) setEditingSessionId(null);
    setToast("기록을 삭제했어요.");
  }

  function editSession(session: WorkoutSession) {
    setEditingSessionId(session.id);
    setRoutineName(routineLabelFromSession(session));
    setDraftDate(session.date);
    setDraftDuration(String(session.durationMinutes || 45));
    setDraftMemo(session.memo || "");
    setDraftSets(draftSetsFromSession(session));
    setSelectedExercise(session.sets[0]?.exerciseId || defaultExerciseForRoutine(session.routineName));
    setActiveTab("train");
    setToast("수정할 운동을 불러왔어요.");
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
          editingSessionId={editingSessionId}
          lastSavedSession={lastSavedSession}
          onEditSession={editSession}
          saving={saving}
        />
      )}

      {activeTab === "log" && (
        <HistoryView loading={loadingSessions} sessions={sortedSessions} deleteSession={deleteSession} />
      )}

      {activeTab === "balance" && (
        <AnalysisView
          sessions={sortedSessions}
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
  const [range, setRange] = useState<SummaryRange>("today");
  const [modalOpen, setModalOpen] = useState(false);
  const rangedSessions = useMemo(() => sessionsForSummaryRange(sessions, range), [sessions, range]);
  const summary = useMemo(() => workoutSummary(rangedSessions), [rangedSessions]);
  const rangeScores = useMemo(() => scoreSessions(rangedSessions).filter(item => item.score > 0), [rangedSessions]);

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
          <MuscleMapPanel range={range} setRange={setRange} scores={rangeScores} />
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
  selectedExercise: string;
  setSelectedExercise: (value: string) => void;
  addSet: (exerciseId?: string, count?: number) => void;
  removeSet: (index: number) => void;
  updateDraftSet: (index: number, patch: Partial<DraftSet>) => void;
  currentDraftScores: Array<Muscle & { score: number }>;
  finishWorkout: () => void | Promise<void>;
  editingSessionId: string | null;
  lastSavedSession: WorkoutSession | null;
  onEditSession: (session: WorkoutSession) => void;
  saving: boolean;
}) {
  const [exerciseSearch, setExerciseSearch] = useState("");
  const [setCount, setSetCount] = useState("1");
  const grouped = useMemo(() => {
    const map = new Map<string, Array<{ set: DraftSet; index: number }>>();
    draftSets.forEach((set, index) => {
      const exercise = exerciseById.get(set.exerciseId);
      const name = exercise?.name || "운동";
      map.set(name, [...(map.get(name) || []), { set, index }]);
    });
    return Array.from(map.entries());
  }, [draftSets]);
  const currentRoutine = ROUTINES.find(routine => routine.label === routineName) || ROUTINES[0];
  const routineExerciseIds = useMemo(() => new Set(currentRoutine.exercises), [currentRoutine]);
  const searchQuery = normalizeSearchText(exerciseSearch);
  const availableExercises = useMemo(() => {
    if (searchQuery) {
      return EXERCISES.filter(exercise => exerciseSearchText(exercise).includes(searchQuery));
    }
    return EXERCISES.filter(exercise => routineExerciseIds.has(exercise.id));
  }, [routineExerciseIds, searchQuery]);
  const selectedExerciseValue = availableExercises.some(exercise => exercise.id === selectedExercise)
    ? selectedExercise
    : availableExercises[0]?.id || selectedExercise;

  useEffect(() => {
    if (availableExercises.length > 0 && !availableExercises.some(exercise => exercise.id === selectedExercise)) {
      setSelectedExercise(availableExercises[0].id);
    }
  }, [availableExercises, selectedExercise, setSelectedExercise]);

  function handleRoutineChange(value: string) {
    setRoutineName(value);
    setExerciseSearch("");
    setSelectedExercise(defaultExerciseForRoutine(value));
  }

  function addSelectedExercise() {
    if (!availableExercises.length) return;
    addSet(selectedExerciseValue, clampSetCount(setCount));
  }

  return (
    <section className="mx-auto grid max-w-[1440px] gap-7 px-4 py-7 pb-28 md:grid-cols-[minmax(0,1fr)_360px] md:px-8 md:py-10">
      <div>
        <SectionTitle kicker="운동 기록" title="오늘 운동" />
        <div className="mb-6 grid gap-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="날짜">
              <input className="nike-input" type="date" value={draftDate} onChange={event => setDraftDate(event.target.value)} />
            </Field>
            <Field label="운동 시간(분)">
              <input className="nike-input" inputMode="numeric" value={draftDuration} onChange={event => setDraftDuration(event.target.value)} />
            </Field>
          </div>
        </div>

        <div className="border-y border-[#cacacb]">
          <div className="grid gap-3 border-b border-[#e5e5e5] py-5">
            <div>
              <p className="text-sm font-medium text-[#707072]">세트 입력</p>
              <h2 className="text-2xl font-semibold">운동 추가</h2>
            </div>
            <div className="grid gap-3">
              <Field label="루틴 운동">
                <select className="nike-input h-12 min-w-0" value={routineName} onChange={event => handleRoutineChange(event.target.value)}>
                  {ROUTINES.map(routine => <option key={routine.label}>{routine.label}</option>)}
                </select>
              </Field>
              <Field label="검색">
                <input
                  className="nike-input h-12 min-w-0"
                  value={exerciseSearch}
                  onChange={event => setExerciseSearch(event.target.value)}
                  placeholder="운동 이름을 검색해 주세요"
                />
              </Field>
              <div className="grid gap-2">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs font-medium text-[#707072]">
                    {exerciseSearch ? "검색 결과" : `${routineName} 운동 목록`}
                  </p>
                  <span className="text-xs font-semibold text-[#707072]">{availableExercises.length}개</span>
                </div>
                <div className="grid gap-2">
                  {availableExercises.map(exercise => {
                    const selected = selectedExerciseValue === exercise.id;
                    return (
                      <button
                        key={exercise.id}
                        type="button"
                        className={`flex items-center justify-between gap-3 p-4 text-left ${selected ? "bg-[#111111] text-white" : "bg-[#f5f5f5] text-[#111111]"}`}
                        onClick={() => setSelectedExercise(exercise.id)}
                        aria-pressed={selected}
                      >
                        <span className="min-w-0">
                          <span className="block truncate text-base font-semibold">{exercise.name}</span>
                          <span className={`mt-1 block text-xs font-medium ${selected ? "text-white/65" : "text-[#707072]"}`}>
                            {exercise.category} / 휴식 {exercise.defaultRestSeconds}초
                          </span>
                        </span>
                        <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs font-black ${selected ? "bg-white text-[#111111]" : "bg-white text-[#707072]"}`}>
                          {selected ? "✓" : ""}
                        </span>
                      </button>
                    );
                  })}
                  {availableExercises.length === 0 && (
                    <div className="bg-[#f5f5f5] p-4 text-sm font-semibold text-[#707072]">
                      검색 결과가 없어요
                    </div>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
                <Field label="세트 수">
                  <input
                    className="nike-input h-12 min-w-0 px-3 text-center"
                    inputMode="numeric"
                    value={setCount}
                    onChange={event => setSetCount(event.target.value)}
                    onBlur={() => setSetCount(String(clampSetCount(setCount)))}
                  />
                </Field>
                <button className="mt-5 h-12 rounded-full bg-[#111111] px-5 text-sm font-medium text-white disabled:opacity-40" onClick={addSelectedExercise} disabled={availableExercises.length === 0}>
                  추가
                </button>
              </div>
            </div>
            {draftSets.length > 0 && (
              <div className="rounded-[24px] bg-[#f5f5f5] px-4 py-3 text-sm font-semibold text-[#39393b]">
                오늘 입력 중: {workoutNameForSets(draftSets, routineName)} · {draftSets.length}세트
              </div>
            )}
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
                          {isTime ? (
                            <IntensityPicker value={set.weight || "2"} onChange={value => updateDraftSet(index, { weight: value })} />
                          ) : (
                            <input className="nike-input bg-white px-3" inputMode="decimal" value={set.weight} onChange={event => updateDraftSet(index, { weight: event.target.value })} placeholder="0" />
                          )}
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
        <div className="bg-[#f5f5f5] p-5">
          <Field label="메모">
            <textarea className="nike-input min-h-28 resize-none bg-white" value={draftMemo} onChange={event => setDraftMemo(event.target.value)} placeholder="컨디션, 통증, 다음에 기억할 점을 적어주세요." />
          </Field>
          <button className="mt-5 h-12 w-full rounded-full bg-[#111111] text-base font-medium text-white disabled:opacity-50" onClick={finishWorkout} disabled={saving}>
            {saving ? "저장 중..." : editingSessionId ? "수정 저장" : "운동 저장"}
          </button>
        </div>
        {lastSavedSession && (
          <SavedWorkoutPanel session={lastSavedSession} onEdit={() => onEditSession(lastSavedSession)} />
        )}
        <FlatPanel title="예상 자극" kicker="입력 중">
          <BodyMap scores={currentDraftScores} />
        </FlatPanel>
        {lastSavedSession && (
          <FlatPanel title="기록된 자극" kicker="방금 저장">
            <BodyMap scores={scoreSessions([lastSavedSession]).filter(item => item.score > 0)} />
          </FlatPanel>
        )}
      </aside>
    </section>
  );
}

function IntensityPicker({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <div className="grid grid-cols-3 overflow-hidden rounded-full bg-white p-1">
      {INTENSITY_LEVELS.map(level => (
        <button
          key={level.value}
          type="button"
          className={`h-10 rounded-full px-2 text-[11px] font-semibold ${value === level.value ? "bg-[#111111] text-white" : "text-[#707072]"}`}
          onClick={() => onChange(level.value)}
        >
          {level.label}
        </button>
      ))}
    </div>
  );
}

function SavedWorkoutPanel({ session, onEdit }: { session: WorkoutSession; onEdit: () => void }) {
  const stats = sessionStats(session);
  const exercises = Array.from(new Set(session.sets.map(set => exerciseById.get(set.exerciseId)?.name || "운동")));

  return (
    <section className="bg-[#111111] p-5 text-white">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-white/60">방금 저장</p>
          <h2 className="mt-1 text-2xl font-semibold">{session.routineName}</h2>
          <p className="mt-1 text-sm font-medium text-white/60">{formatDate(session.date)}</p>
        </div>
        <button className="h-10 rounded-full bg-white px-4 text-sm font-semibold text-[#111111]" onClick={onEdit}>
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
          <span key={exercise} className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white">
            {exercise}
          </span>
        ))}
      </div>
    </section>
  );
}

function HistoryView({ loading, sessions, deleteSession }: { loading: boolean; sessions: WorkoutSession[]; deleteSession: (id: string) => void }) {
  const [calendarMonth, setCalendarMonth] = useState(() => startOfMonth(parseDate(today())));
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [range, setRange] = useState<HistoryRange>("week");
  const [rangeCursor, setRangeCursor] = useState(() => parseDate(today()));
  const [bodyFilter, setBodyFilter] = useState<BodyFilter>("all");

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
    <section className="mx-auto max-w-[1440px] px-4 py-7 pb-28 md:px-8 md:py-10">
      <SectionTitle kicker="운동 일지" title="기록 모아보기" />
      {loading ? (
        <EmptyState text="운동 기록을 불러오는 중입니다." />
      ) : sessions.length === 0 ? (
        <EmptyState text="아직 저장된 운동 기록이 없어요. 첫 운동을 기록해 보세요." />
      ) : (
        <div className="grid gap-8 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
          <section className="self-start border-t border-[#cacacb] pt-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-[#707072]">캘린더</p>
                <h2 className="mt-1 text-2xl font-semibold">{formatMonth(calendarMonth)}</h2>
              </div>
              <div className="flex gap-2">
                <button className="grid h-10 w-10 place-items-center rounded-full bg-[#f5f5f5] text-lg font-semibold" onClick={() => moveCalendar(-1)} aria-label="이전 달">
                  ‹
                </button>
                <button className="grid h-10 w-10 place-items-center rounded-full bg-[#111111] text-lg font-semibold text-white" onClick={() => moveCalendar(1)} aria-label="다음 달">
                  ›
                </button>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-7 gap-1 text-center text-xs font-semibold text-[#707072]">
              {["일", "월", "화", "수", "목", "금", "토"].map(day => <span key={day}>{day}</span>)}
            </div>
            <div className="mt-2 grid grid-cols-7 gap-1">
              {calendarDays.map(day => {
                const dateKey = toDateKey(day.date);
                const daySessions = sessionsByDate.get(dateKey) || [];
                const hasRecord = daySessions.length > 0;
                const isToday = dateKey === today();
                return (
                  <button
                    key={dateKey}
                    className={`relative grid aspect-square place-items-center rounded-md text-sm font-semibold ${
                      hasRecord
                        ? "bg-[#e9f8ee] text-[#0f5132] ring-1 ring-[#97d7aa]"
                        : day.inMonth
                          ? "bg-[#f5f5f5] text-[#111111]"
                          : "bg-white text-[#cacacb]"
                    }`}
                    onClick={() => hasRecord && setSelectedDate(dateKey)}
                    disabled={!hasRecord}
                    aria-label={`${formatDate(dateKey)} 운동 기록 ${daySessions.length}개`}
                  >
                    <span>{day.date.getDate()}</span>
                    {isToday && <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-[#d30005]" />}
                    {hasRecord && (
                      <span className="absolute bottom-1.5 left-1/2 flex -translate-x-1/2 items-center gap-0.5">
                        <i className="h-1.5 w-1.5 rounded-full bg-[#1f9d55]" />
                        {daySessions.length > 1 && <b className="text-[9px] leading-none">{daySessions.length}</b>}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </section>

          <section className="border-t border-[#cacacb] pt-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-[#707072]">기록 탐색</p>
                <h2 className="mt-1 text-2xl font-semibold">{period.label}</h2>
              </div>
              <div className="flex gap-2">
                <button className="grid h-10 w-10 place-items-center rounded-full bg-[#f5f5f5] text-lg font-semibold" onClick={() => movePeriod(-1)} aria-label="이전 기간">
                  ‹
                </button>
                <button className="grid h-10 w-10 place-items-center rounded-full bg-[#111111] text-lg font-semibold text-white" onClick={() => movePeriod(1)} aria-label="다음 기간">
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

            <SegmentedControl
              className="mt-3"
              items={[
                { id: "all", label: "전체" },
                { id: "upper", label: "상체" },
                { id: "lower", label: "하체" },
                { id: "core", label: "코어" },
              ]}
              value={bodyFilter}
              onChange={value => setBodyFilter(value as BodyFilter)}
            />

            <div className="mt-5 grid grid-cols-3 gap-2">
              <SmallStudioStat label="횟수" value={`${filteredStats.count}`} />
              <SmallStudioStat label="운동" value={`${filteredStats.exercises}`} />
              <SmallStudioStat label="시간" value={`${filteredStats.minutes}분`} />
            </div>

            <div className="mt-6 grid gap-3">
              {filteredSessions.length === 0 ? (
                <p className="bg-[#f5f5f5] p-5 text-sm leading-6 text-[#707072]">선택한 조건에 맞는 운동 기록이 없습니다.</p>
              ) : (
                filteredSessions.map(session => (
                  <WorkoutHistoryCard key={session.id} session={session} deleteSession={deleteSession} />
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
    <div className={`grid grid-cols-4 gap-1 rounded-full bg-[#f5f5f5] p-1 ${className}`}>
      {items.map(item => (
        <button
          key={item.id}
          className={`h-10 rounded-full text-xs font-semibold ${value === item.id ? "bg-[#111111] text-white" : "text-[#707072]"}`}
          onClick={() => onChange(item.id)}
          type="button"
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

function WorkoutHistoryCard({ session, deleteSession }: { session: WorkoutSession; deleteSession: (id: string) => void }) {
  const stats = sessionStats(session);
  const scores = scoreSessions([session]).filter(item => item.score > 0).slice(0, 3);

  return (
    <article className="bg-[#f5f5f5] p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-[#707072]">{formatDate(session.date)}</p>
          <h3 className="mt-1 text-xl font-semibold">{session.routineName}</h3>
        </div>
        <button className="shrink-0 text-sm font-semibold text-[#d30005]" onClick={() => deleteSession(session.id)}>
          삭제
        </button>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2">
        <SmallStudioStat label="세트" value={`${stats.totalSets}`} />
        <SmallStudioStat label="운동" value={`${stats.exercises}`} />
        <SmallStudioStat label="시간" value={`${session.durationMinutes}분`} />
      </div>
      {scores.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {scores.map(score => (
            <span key={score.id} className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-[#111111]">
              {score.name} {score.score}
            </span>
          ))}
        </div>
      )}
      {session.memo && <p className="mt-4 line-clamp-2 text-sm leading-6 text-[#39393b]">{session.memo}</p>}
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
  const stats = summarizeSessions(sessions);

  return (
    <div className="fixed inset-0 z-50 grid place-items-end bg-black/45 p-0 md:place-items-center md:p-6" role="dialog" aria-modal="true">
      <div className="max-h-[82svh] w-full overflow-y-auto rounded-t-2xl bg-white p-5 shadow-2xl md:max-w-lg md:rounded-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-[#707072]">운동 완료</p>
            <h2 className="mt-1 text-2xl font-semibold">{title}</h2>
          </div>
          <button className="grid h-10 w-10 place-items-center rounded-full bg-[#111111] text-lg font-semibold text-white" onClick={onClose} aria-label="닫기">
            ×
          </button>
        </div>
        <div className="mt-5 grid grid-cols-3 gap-2">
          <SmallStudioStat label="기록" value={`${stats.count}`} />
          <SmallStudioStat label="운동" value={`${stats.exercises}`} />
          <SmallStudioStat label="시간" value={`${stats.minutes}분`} />
        </div>
        <div className="mt-5 grid gap-3">
          {sessions.map(session => (
            <WorkoutHistoryCard key={session.id} session={session} deleteSession={deleteSession} />
          ))}
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
}: {
  sessions: WorkoutSession[];
  weekStats: { count: number; sets: number; minutes: number; volume: number };
  weeklyScores: Array<Muscle & { score: number }>;
  todayScores: Array<Muscle & { score: number }>;
  groupBalance: Array<{ name: string; score: number; color: string }>;
  recommendedRoutine: string;
}) {
  const [range, setRange] = useState<SummaryRange>("week");
  const rangedSessions = useMemo(() => sessionsForSummaryRange(sessions, range), [sessions, range]);
  const rangeScores = useMemo(() => scoreSessions(rangedSessions), [rangedSessions]);
  const activeScores = rangeScores.filter(item => item.score > 0);
  const rangeGroupBalance = useMemo(() => groupScores(rangeScores).filter(item => item.score > 0), [rangeScores]);
  const rangeStats = useMemo(() => summarizeSessions(rangedSessions), [rangedSessions]);
  const missing = rangeScores.filter(item => item.score === 0).slice(0, 3);
  const pieData = rangeGroupBalance.length ? rangeGroupBalance : [{ name: "기록 없음", score: 1, color: "#cacacb" }];

  return (
    <section className="mx-auto grid max-w-[1440px] gap-7 px-4 py-7 pb-28 md:grid-cols-[0.9fr_1.1fr] md:px-8 md:py-10">
      <div className="grid gap-7 self-start">
        <MuscleMapPanel range={range} setRange={setRange} scores={activeScores} />
        <div className="bg-[#111111] p-6 text-white">
          <p className="text-sm font-medium text-[#9e9ea0]">코치 메모</p>
          <h2 className="mt-3 text-2xl font-semibold leading-tight">
            {summaryRangeLabels[range]}는 {rangeGroupBalance[0]?.name || "운동 기록"} 비중이 가장 높아요.
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
            { label: "운동", value: `${rangeStats.count}` },
            { label: "세트", value: `${rangeStats.sets}` },
            { label: "시간", value: `${rangeStats.minutes}분` },
            { label: "부하", value: `${Math.round(rangeStats.volume)}` },
          ]}
        />
        <FlatPanel title="부위 밸런스" kicker={summaryRangeLabels[range]}>
          <DonutChart data={pieData} />
          <div className="mt-8 grid gap-2">
            {rangeGroupBalance.map(item => (
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
          <BarRanking data={activeScores.slice(0, 8)} />
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
    <div className="flex gap-1 overflow-x-auto rounded-full bg-[#f5f5f5] p-1">
      {(Object.keys(summaryRangeLabels) as SummaryRange[]).map(item => (
        <button
          key={item}
          className={`h-9 shrink-0 rounded-full px-3 text-xs font-semibold ${value === item ? "bg-[#111111] text-white" : "text-[#111111]"}`}
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
      <div className="bg-[#f5f5f5] p-3">
        {visibleScores.length > 0 ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {visibleScores.map((item, index) => (
              <MuscleFocusCard key={item.id} item={item} total={total} index={index} />
            ))}
          </div>
        ) : (
          <div className="bg-white p-6 text-center text-sm font-semibold leading-6 text-[#707072]">
            운동을 저장하면 자극 부위별 이미지가 표시돼요
          </div>
        )}
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

function MuscleFocusCard({ item, total, index }: { item: Muscle & { score: number }; total: number; index: number }) {
  const key = muscleIconKey(item.id, item.group);
  const percent = Math.round((item.score / total) * 100);
  const imageSrc = MUSCLE_FOCUS_IMAGES[key] || MUSCLE_FOCUS_IMAGES.upper;

  return (
    <div className="bg-white p-3">
      <img
        className="mx-auto aspect-square w-full max-w-[118px] rounded-full border border-[#eef0f2] bg-white object-cover"
        src={imageSrc}
        alt=""
        aria-hidden="true"
      />
      <div className="mt-3 flex items-center justify-between gap-2">
        <span className="truncate text-sm font-semibold">{index + 1}. {item.name}</span>
        <span className="shrink-0 text-sm font-semibold text-[#707072]">{percent}%</span>
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
