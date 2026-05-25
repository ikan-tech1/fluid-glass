"use client";

import { useEffect, useRef } from "react";
import { useFluidStore } from "@/lib/store/fluid";

const PANEL_COUNT = 3;

export const REFRACT_FILTER_PREFIX = "fluid-refract-";

export default function GlassRefractionFilters() {
  const turbRefs = useRef<(SVGFETurbulenceElement | null)[]>([]);
  const dispRefs = useRef<(SVGFEDisplacementMapElement | null)[]>([]);

  useEffect(() => {
    let frame = 0;
    let raf = 0;
    const tick = () => {
      frame++;
      const { displacement } = useFluidStore.getState();
      for (let i = 0; i < PANEL_COUNT; i++) {
        const sample = displacement[i];
        if (!sample) continue;
        const energy = Math.min(Math.hypot(sample.dx, sample.dy), 8);
        const scale = Math.min(energy * 1.6, 14);
        const base = 0.012 + Math.min(energy * 0.006, 0.05);
        const turb = turbRefs.current[i];
        const disp = dispRefs.current[i];
        if (turb) {
          turb.setAttribute(
            "baseFrequency",
            `${base.toFixed(4)} ${(base * 0.85).toFixed(4)}`,
          );
          turb.setAttribute("seed", String((frame >> 1) % 1024));
        }
        if (disp) {
          disp.setAttribute("scale", scale.toFixed(2));
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <svg
      aria-hidden
      width="0"
      height="0"
      style={{ position: "absolute", width: 0, height: 0, pointerEvents: "none" }}
    >
      <defs>
        {Array.from({ length: PANEL_COUNT }).map((_, i) => (
          <filter
            key={i}
            id={`${REFRACT_FILTER_PREFIX}${i}`}
            x="-15%"
            y="-15%"
            width="130%"
            height="130%"
            colorInterpolationFilters="sRGB"
          >
            <feTurbulence
              ref={(el) => {
                turbRefs.current[i] = el;
              }}
              type="fractalNoise"
              baseFrequency="0.02 0.018"
              numOctaves="2"
              seed="0"
              stitchTiles="stitch"
              result="noise"
            />
            <feDisplacementMap
              ref={(el) => {
                dispRefs.current[i] = el;
              }}
              in="SourceGraphic"
              in2="noise"
              scale="0"
              xChannelSelector="R"
              yChannelSelector="G"
            />
          </filter>
        ))}
      </defs>
    </svg>
  );
}
