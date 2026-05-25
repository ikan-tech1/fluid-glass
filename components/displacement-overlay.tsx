"use client";

import { useFluidStore } from "@/lib/store/fluid";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import type { ReactNode } from "react";

type DisplacementOverlayProps = {
  children: ReactNode;
  className?: string;
  sampleIndex?: number;
};

export default function DisplacementOverlay({
  children,
  className,
  sampleIndex = 0,
}: DisplacementOverlayProps) {
  const samples = useFluidStore((s) => s.displacement);
  const sample = samples[sampleIndex] ?? { dx: 0, dy: 0 };

  const offsetX = sample.dx * 12;
  const offsetY = sample.dy * 12;
  const chroma = Math.min(3, Math.hypot(sample.dx, sample.dy) * 8);

  return (
    <motion.div
      className={cn("relative inline-block", className)}
      animate={{
        x: offsetX,
        y: offsetY,
      }}
      transition={{ type: "spring", stiffness: 400, damping: 35, mass: 0.5 }}
      style={{
        textShadow: `
          ${chroma}px 0 rgba(255, 60, 180, 0.55),
          ${-chroma}px 0 rgba(60, 220, 255, 0.55),
          0 0 20px rgba(255, 255, 255, 0.08)
        `,
      }}
    >
      {children}
    </motion.div>
  );
}

export function DisplacementText({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const velocityMag = useFluidStore((s) => s.stats.velocityMag);
  const warp = Math.min(velocityMag * 0.8, 6);

  return (
    <span
      className={cn("inline-block transition-transform duration-75", className)}
      style={{
        transform: `skewX(${warp * 0.15}deg) scale(${1 + warp * 0.008})`,
        filter: `blur(${Math.max(0, warp * 0.05)}px)`,
      }}
    >
      {children}
    </span>
  );
}
