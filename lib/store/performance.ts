"use client";

import { create } from "zustand";

export type PerformancePreset = "low" | "medium" | "high" | "ultra";

export type PerformanceProfile = {
  preset: PerformancePreset;
  dpr: [number, number];
  simResolution: number;
  pressureIterations: number;
  postPassCount: number;
  backdropBlur: boolean;
};

const PROFILES: Record<PerformancePreset, PerformanceProfile> = {
  low: {
    preset: "low",
    dpr: [0.75, 1],
    simResolution: 512,
    pressureIterations: 10,
    postPassCount: 1,
    backdropBlur: false,
  },
  medium: {
    preset: "medium",
    dpr: [0.9, 1.25],
    simResolution: 768,
    pressureIterations: 15,
    postPassCount: 2,
    backdropBlur: true,
  },
  high: {
    preset: "high",
    dpr: [1, 1.5],
    simResolution: 1024,
    pressureIterations: 20,
    postPassCount: 3,
    backdropBlur: true,
  },
  ultra: {
    preset: "ultra",
    dpr: [1.25, 2],
    simResolution: 1024,
    pressureIterations: 25,
    postPassCount: 4,
    backdropBlur: true,
  },
};

function detectPreset(): PerformancePreset {
  if (typeof window === "undefined") return "high";
  const mobile =
    /Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent,
    ) || window.matchMedia("(max-width: 768px)").matches;
  if (mobile) return "low";
  const cores = navigator.hardwareConcurrency ?? 4;
  if (cores >= 8) return "ultra";
  if (cores >= 4) return "high";
  return "medium";
}

type PerfState = {
  preset: PerformancePreset;
  setPreset: (p: PerformancePreset) => void;
  profile: () => PerformanceProfile;
  init: () => void;
};

export const usePerformance = create<PerfState>((set, getState) => ({
  preset: "high",
  setPreset: (preset) => set({ preset }),
  profile: () => PROFILES[getState().preset],
  init: () => {
    const detected = detectPreset();
    set({ preset: detected });
  },
}));

export function getPerformanceProfile(
  preset: PerformancePreset,
): PerformanceProfile {
  return PROFILES[preset];
}
