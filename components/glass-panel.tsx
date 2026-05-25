"use client";

import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { getPerformanceProfile, usePerformance } from "@/lib/store/performance";

export function GlassPanel({
  className,
  children,
  title,
  right,
  corners = true,
}: {
  className?: string;
  children: ReactNode;
  title?: string;
  right?: ReactNode;
  corners?: boolean;
}) {
  const preset = usePerformance((s) => s.preset);
  const profile = getPerformanceProfile(preset);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 280, damping: 28 }}
      className={cn(
        "relative rounded-lg p-3",
        profile.backdropBlur ? "glass" : "glass-fallback",
        corners && "hud-corner chromatic-edge",
        className,
      )}
    >
      {corners && (
        <>
          <span className="corner-tr" />
          <span className="corner-bl" />
        </>
      )}
      {(title || right) && (
        <div className="flex items-center justify-between mb-2 px-0.5">
          {title && (
            <h3 className="font-mono text-[10px] tracking-[0.25em] uppercase text-white/45">
              {title}
            </h3>
          )}
          {right}
        </div>
      )}
      {children}
    </motion.div>
  );
}

export function Readout({
  label,
  value,
  unit,
  className,
}: {
  label: string;
  value: ReactNode;
  unit?: string;
  className?: string;
}) {
  return (
    <div className={cn("flex items-baseline justify-between gap-4", className)}>
      <span className="font-mono text-[9px] tracking-widest uppercase text-white/40">
        {label}
      </span>
      <span className="font-mono text-[11px] tabular text-white glow-text">
        {value}
        {unit && <span className="text-white/40 ml-0.5">{unit}</span>}
      </span>
    </div>
  );
}

export function StatusBar({
  value,
  color = "rgba(255,0,170,0.9)",
  className,
}: {
  value: number;
  color?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "h-[2px] bg-white/8 overflow-hidden rounded-full",
        className,
      )}
    >
      <motion.div
        className="h-full rounded-full"
        style={{ background: color, boxShadow: `0 0 8px ${color}` }}
        animate={{ width: `${Math.min(100, value * 100)}%` }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
      />
    </div>
  );
}

export function Tag({
  children,
  active,
}: {
  children: ReactNode;
  active?: boolean;
}) {
  return (
    <span
      className={cn(
        "font-mono text-[8px] tracking-[0.2em] uppercase px-1.5 py-0.5 rounded border",
        active
          ? "border-fuchsia-400/50 text-fuchsia-300/90 bg-fuchsia-500/10"
          : "border-white/10 text-white/35 bg-white/3",
      )}
    >
      {children}
    </span>
  );
}
