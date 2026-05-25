"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { dispatchFluidSplat } from "@/components/fluid-canvas";
import DisplacementOverlay, {
  DisplacementText,
} from "@/components/displacement-overlay";
import { GlassPanel, Readout, StatusBar, Tag } from "@/components/glass-panel";
import GlassRefractionFilters from "@/components/refraction-filter";
import { useFluidGestures, useMultiTouchClearWave } from "@/lib/input/fluid-gestures";
import { useFluidStore } from "@/lib/store/fluid";
import { usePerformance } from "@/lib/store/performance";

const FluidCanvasDynamic = dynamic(() => import("@/components/fluid-canvas"), {
  ssr: false,
  loading: () => (
    <div className="absolute inset-0 bg-midnight flex items-center justify-center">
      <span className="font-mono text-[10px] tracking-[0.3em] uppercase text-white/30 animate-pulse">
        Initializing fluid…
      </span>
    </div>
  ),
});

export default function FluidClient() {
  const containerRef = useRef<HTMLDivElement>(null);
  const started = useFluidStore((s) => s.started);
  const stats = useFluidStore((s) => s.stats);
  const preset = usePerformance((s) => s.preset);
  const initPerf = usePerformance((s) => s.init);
  const triggerClearWave = useFluidStore((s) => s.triggerClearWave);

  useEffect(() => {
    initPerf();
  }, [initPerf]);

  const onSplat = useCallback(
    (s: {
      x: number;
      y: number;
      dx: number;
      dy: number;
      strength?: number;
      radius?: number;
    }) => {
      dispatchFluidSplat(s);
    },
    [],
  );

  const onClearWave = useCallback(() => {
    triggerClearWave();
  }, [triggerClearWave]);

  const gestures = useFluidGestures({ onSplat, onClearWave });
  const { trackTouch } = useMultiTouchClearWave(onClearWave);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onStart = (e: TouchEvent) => trackTouch(e, el);
    const onMove = (e: TouchEvent) => trackTouch(e, el);
    const onEnd = (e: TouchEvent) => trackTouch(e, el);
    el.addEventListener("touchstart", onStart, { passive: false });
    el.addEventListener("touchmove", onMove, { passive: false });
    el.addEventListener("touchend", onEnd, { passive: false });
    el.addEventListener("touchcancel", onEnd, { passive: false });
    return () => {
      el.removeEventListener("touchstart", onStart);
      el.removeEventListener("touchmove", onMove);
      el.removeEventListener("touchend", onEnd);
      el.removeEventListener("touchcancel", onEnd);
    };
  }, [trackTouch]);

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 overflow-hidden touch-none select-none"
      style={{ height: "100dvh" }}
      {...gestures}
    >
      <div className="absolute inset-0 bg-midnight-gradient" />
      <FluidCanvasDynamic className="absolute inset-0 z-0" />
      <GlassRefractionFilters />

      <div className="absolute inset-0 z-10 pointer-events-none p-safe">
        <header className="flex items-start justify-between p-4 pt-[max(1rem,env(safe-area-inset-top))]">
          <GlassPanel
            className="pointer-events-auto min-w-[180px]"
            title="Fluid Glass"
            refractIndex={1}
          >
            <DisplacementOverlay sampleIndex={1}>
              <DisplacementText>
                <p className="font-mono text-lg tracking-[0.15em] uppercase gradient-iridescent">
                  Sensory
                </p>
              </DisplacementText>
            </DisplacementOverlay>
            <p className="font-mono text-[9px] text-white/35 mt-1 tracking-widest">
              GPU NAVIER-STOKES SANDBOX
            </p>
          </GlassPanel>

          <GlassPanel
            className="pointer-events-auto w-[140px]"
            title="Status"
            refractIndex={0}
          >
            <Readout label="FPS" value={stats.fps} />
            <Readout label="Tier" value={preset.toUpperCase()} className="mt-1.5" />
            <Readout
              label="Drops"
              value={stats.metaballCount}
              className="mt-1.5"
            />
            <StatusBar
              value={Math.min(1, stats.velocityMag / 3)}
              className="mt-2"
            />
          </GlassPanel>
        </header>

        <footer className="absolute bottom-0 left-0 right-0 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <GlassPanel
            className="mx-auto max-w-md pointer-events-auto"
            corners
            refractIndex={2}
          >
            <div className="flex flex-wrap gap-2 justify-center mb-2">
              <Tag active>Drag · Swirl</Tag>
              <Tag>Double-tap · Drop</Tag>
              <Tag>2-finger flick · Clear</Tag>
            </div>
            <DisplacementOverlay sampleIndex={2}>
              <p className="font-mono text-[9px] text-center text-white/40 tracking-[0.2em] uppercase">
                Touch the canvas to begin
              </p>
            </DisplacementOverlay>
          </GlassPanel>
        </footer>
      </div>

      <AnimatePresence>
        {!started && (
          <motion.div
            className="absolute inset-0 z-20 flex items-center justify-center bg-black/40 backdrop-blur-sm"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
          >
            <motion.div
              className="text-center px-6"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 1.05, opacity: 0 }}
            >
              <p className="font-mono text-sm tracking-[0.35em] uppercase text-white/70 mb-2">
                Fluid Glass
              </p>
              <p className="font-mono text-[10px] text-white/40 tracking-widest">
                Touch to begin
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="scanlines" />
    </div>
  );
}
