"use client";

import { useCallback, useRef } from "react";
import type { SplatInput } from "@/lib/shaders/fluid-sim";
import { useFluidStore } from "@/lib/store/fluid";

export type FluidGestureHandlers = {
  onPointerDown: (e: React.PointerEvent) => void;
  onPointerMove: (e: React.PointerEvent) => void;
  onPointerUp: (e: React.PointerEvent) => void;
  onPointerCancel: (e: React.PointerEvent) => void;
};

type PointerState = {
  id: number;
  x: number;
  y: number;
  lastX: number;
  lastY: number;
  startY: number;
  startTime: number;
};

type GestureOptions = {
  onSplat: (splat: SplatInput) => void;
  onClearWave: () => void;
};

const DOUBLE_TAP_MS = 320;
const DOUBLE_TAP_DIST = 0.04;
const FLICK_VELOCITY = 1.2;
const BOTTOM_ZONE = 0.18;

export function useFluidGestures({
  onSplat,
  onClearWave,
}: GestureOptions): FluidGestureHandlers {
  const pointers = useRef<Map<number, PointerState>>(new Map());
  const lastTap = useRef<{ x: number; y: number; time: number } | null>(null);
  const addMetaball = useFluidStore((s) => s.addMetaball);
  const setStarted = useFluidStore((s) => s.setStarted);
  const triggerClearWave = useFluidStore((s) => s.triggerClearWave);

  const norm = useCallback((e: React.PointerEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) / rect.width,
      y: (e.clientY - rect.top) / rect.height,
      dx: e.movementX / rect.width,
      dy: e.movementY / rect.height,
    };
  }, []);

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.currentTarget.setPointerCapture(e.pointerId);
      setStarted(true);
      const { x, y } = norm(e);
      pointers.current.set(e.pointerId, {
        id: e.pointerId,
        x,
        y,
        lastX: x,
        lastY: y,
        startY: y,
        startTime: performance.now(),
      });
    },
    [norm, setStarted],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      const ptr = pointers.current.get(e.pointerId);
      if (!ptr) return;
      const { x, y, dx, dy } = norm(e);

      if (Math.abs(dx) > 0.0001 || Math.abs(dy) > 0.0001) {
        onSplat({
          x,
          y,
          dx,
          dy,
          strength: 1.2,
        });
      }

      ptr.lastX = ptr.x;
      ptr.lastY = ptr.y;
      ptr.x = x;
      ptr.y = y;
    },
    [norm, onSplat],
  );

  const onPointerUp = useCallback(
    (e: React.PointerEvent) => {
      const ptr = pointers.current.get(e.pointerId);
      if (!ptr) return;

      const now = performance.now();
      const { x, y } = norm(e);
      const dt = now - ptr.startTime;

      // Two-finger bottom flick clear wave (check before removing pointer)
      const others = Array.from(pointers.current.values()).filter(
        (p) => p.id !== e.pointerId,
      );
      if (others.length === 1) {
        const other = others[0];
        const fromBottom =
          ptr.startY > 1 - BOTTOM_ZONE && other.startY > 1 - BOTTOM_ZONE;
        const flickUp = y - ptr.startY < -FLICK_VELOCITY * 0.08;
        const otherFlick = other.y - other.startY < -FLICK_VELOCITY * 0.08;
        if (fromBottom && flickUp && otherFlick) {
          triggerClearWave();
          onClearWave();
        }
      }

      // Double-tap → metaball droplet
      const tap = lastTap.current;
      if (
        tap &&
        now - tap.time < DOUBLE_TAP_MS &&
        Math.hypot(x - tap.x, y - tap.y) < DOUBLE_TAP_DIST &&
        dt < 250
      ) {
        addMetaball(x, y);
        onSplat({
          x,
          y,
          dx: 0,
          dy: 0,
          strength: 2.5,
          radius: 0.004,
        });
        lastTap.current = null;
      } else if (dt < 250) {
        lastTap.current = { x, y, time: now };
      }

      pointers.current.delete(e.pointerId);
    },
    [addMetaball, norm, onClearWave, onSplat, triggerClearWave],
  );

  const onPointerUpWrapped = onPointerUp;

  const onPointerCancel = useCallback((e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);
  }, []);

  return {
    onPointerDown,
    onPointerMove,
    onPointerUp: onPointerUpWrapped,
    onPointerCancel,
  };
}

export function useMultiTouchClearWave(onClearWave: () => void) {
  const touches = useRef<Map<number, { y: number; startY: number }>>(new Map());
  const triggerClearWave = useFluidStore((s) => s.triggerClearWave);

  const trackTouch = useCallback(
    (e: TouchEvent, el: HTMLElement) => {
      const rect = el.getBoundingClientRect();
      for (let i = 0; i < e.changedTouches.length; i++) {
        const t = e.changedTouches[i];
        const y = (t.clientY - rect.top) / rect.height;
        if (e.type === "touchstart") {
          touches.current.set(t.identifier, { y, startY: y });
        } else if (e.type === "touchmove") {
          const prev = touches.current.get(t.identifier);
          if (prev) touches.current.set(t.identifier, { ...prev, y });
        } else if (e.type === "touchend" || e.type === "touchcancel") {
          const prev = touches.current.get(t.identifier);
          touches.current.delete(t.identifier);
          if (!prev) continue;
          const remaining = Array.from(touches.current.values());
          if (remaining.length >= 1) {
            const fromBottom =
              prev.startY > 1 - BOTTOM_ZONE &&
              remaining.some((r) => r.startY > 1 - BOTTOM_ZONE);
            const flick = prev.y - prev.startY < -0.12;
            const otherFlick = remaining.some((r) => r.y - r.startY < -0.12);
            if (fromBottom && flick && otherFlick) {
              triggerClearWave();
              onClearWave();
            }
          }
        }
      }
    },
    [onClearWave, triggerClearWave],
  );

  return { trackTouch };
}
