"use client";

import { useFluidStore } from "@/lib/store/fluid";
import { cn } from "@/lib/utils";
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

  const energy = Math.hypot(sample.dx, sample.dy);
  const chroma = Math.min(2.2, energy * 0.55);

  return (
    <div
      className={cn("relative inline-block", className)}
      style={{
        textShadow: chroma > 0.05
          ? `${chroma.toFixed(2)}px 0 rgba(255, 60, 180, 0.5), ${(-chroma).toFixed(2)}px 0 rgba(60, 220, 255, 0.5), 0 0 18px rgba(255, 255, 255, 0.07)`
          : "0 0 14px rgba(255, 255, 255, 0.05)",
      }}
    >
      {children}
    </div>
  );
}

export function DisplacementText({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <span className={cn("inline-block", className)}>{children}</span>;
}
