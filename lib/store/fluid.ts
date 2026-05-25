"use client";

import { create } from "zustand";

export type Metaball = {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  merging?: string;
};

export type DisplacementSample = {
  x: number;
  y: number;
  dx: number;
  dy: number;
};

export type FluidStats = {
  velocityMag: number;
  dyeEnergy: number;
  metaballCount: number;
  fps: number;
};

type FluidState = {
  metaballs: Metaball[];
  displacement: DisplacementSample[];
  clearWave: number;
  stats: FluidStats;
  started: boolean;
  addMetaball: (x: number, y: number) => void;
  updateMetaballs: (balls: Metaball[]) => void;
  mergeMetaballs: (a: string, b: string) => void;
  triggerClearWave: () => void;
  setDisplacement: (samples: DisplacementSample[]) => void;
  setStats: (stats: Partial<FluidStats>) => void;
  setStarted: (v: boolean) => void;
};

let idCounter = 0;

function vibrate(pattern: number | number[]) {
  if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
    try {
      navigator.vibrate(pattern);
    } catch {
      // ignore — some browsers reject if not in a user gesture
    }
  }
}

export const useFluidStore = create<FluidState>((set, getState) => ({
  metaballs: [],
  displacement: [],
  clearWave: 0,
  stats: { velocityMag: 0, dyeEnergy: 0, metaballCount: 0, fps: 60 },
  started: false,

  addMetaball: (x, y) => {
    const ball: Metaball = {
      id: `mb-${++idCounter}`,
      x,
      y,
      vx: 0,
      vy: 0,
      radius: 0.06 + Math.random() * 0.02,
    };
    set({ metaballs: [...getState().metaballs, ball] });
    vibrate(12);
  },

  updateMetaballs: (balls) => set({ metaballs: balls }),

  mergeMetaballs: (a, b) => {
    const balls = getState().metaballs;
    const ba = balls.find((m) => m.id === a);
    const bb = balls.find((m) => m.id === b);
    if (!ba || !bb) return;
    const merged: Metaball = {
      id: `mb-${++idCounter}`,
      x: (ba.x + bb.x) / 2,
      y: (ba.y + bb.y) / 2,
      vx: (ba.vx + bb.vx) / 2,
      vy: (ba.vy + bb.vy) / 2,
      radius: Math.min(0.14, ba.radius + bb.radius * 0.85),
    };
    set({
      metaballs: balls.filter((m) => m.id !== a && m.id !== b).concat(merged),
    });
    vibrate([18, 30, 24]);
  },

  triggerClearWave: () => {
    set({ clearWave: getState().clearWave + 1 });
    vibrate([8, 30, 8, 30, 14]);
  },

  setDisplacement: (samples) => set({ displacement: samples }),

  setStats: (stats) =>
    set({ stats: { ...getState().stats, ...stats } }),

  setStarted: (v) => set({ started: v }),
}));
