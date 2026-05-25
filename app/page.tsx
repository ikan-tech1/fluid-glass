import FluidClient from "./fluid-client";
import { Suspense } from "react";

export const metadata = {
  title: "Fluid Glass — GPU Fluid Sandbox",
  description:
    "Glassmorphic fluid physics sandbox with Navier-Stokes simulation, metaball droplets, and iridescent visuals.",
};

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="fixed inset-0 bg-midnight flex items-center justify-center">
          <span className="font-mono text-[10px] tracking-[0.3em] uppercase text-white/30">
            Loading…
          </span>
        </div>
      }
    >
      <FluidClient />
    </Suspense>
  );
}
