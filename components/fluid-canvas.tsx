"use client";

import { useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { EffectComposer, Bloom, ChromaticAberration } from "@react-three/postprocessing";
import { BlendFunction } from "postprocessing";
import * as THREE from "three";
import { FluidSimulator } from "@/lib/shaders/fluid-sim";
import {
  createMetaballMaterial,
  stepMetaballPhysics,
  updateMetaballUniforms,
} from "@/lib/shaders/metaballs";
import { useFluidStore } from "@/lib/store/fluid";
import { getPerformanceProfile, usePerformance } from "@/lib/store/performance";

const PANEL_SAMPLE_POSITIONS: ReadonlyArray<readonly [number, number]> = [
  [0.82, 0.12],
  [0.18, 0.12],
  [0.5, 0.88],
];
const PANEL_FALLOFF = 0.35;
const PANEL_DECAY = 0.86;

function FluidScene() {
  const simRef = useRef<FluidSimulator | null>(null);
  const displayMesh = useRef<THREE.Mesh>(null);
  const metaballMesh = useRef<THREE.Mesh>(null);
  const metaballMat = useRef<THREE.ShaderMaterial | null>(null);
  const { gl, size } = useThree();
  const preset = usePerformance((s) => s.preset);
  const profile = useMemo(() => getPerformanceProfile(preset), [preset]);
  const clearWave = useFluidStore((s) => s.clearWave);
  const metaballs = useFluidStore((s) => s.metaballs);
  const updateMetaballs = useFluidStore((s) => s.updateMetaballs);
  const mergeMetaballs = useFluidStore((s) => s.mergeMetaballs);
  const setDisplacement = useFluidStore((s) => s.setDisplacement);
  const setStats = useFluidStore((s) => s.setStats);
  const splatQueue = useRef<
    { x: number; y: number; dx: number; dy: number; strength?: number; radius?: number }[]
  >([]);
  const lastClearWave = useRef(0);
  const fpsAccum = useRef({ frames: 0, time: 0 });
  const velEstimate = useRef({ x: 0, y: 0, mag: 0 });
  const panelEnergy = useRef<{ dx: number; dy: number }[]>(
    PANEL_SAMPLE_POSITIONS.map(() => ({ dx: 0, dy: 0 })),
  );
  const chromaOffset = useMemo(() => new THREE.Vector2(0.0025, 0.0025), []);

  useEffect(() => {
    simRef.current = new FluidSimulator(
      gl,
      profile.simResolution,
      profile.pressureIterations,
    );
    simRef.current.setAspectRatio(size.width / size.height);
    metaballMat.current = createMetaballMaterial(size.width / size.height);

    return () => {
      simRef.current?.dispose();
      metaballMat.current?.dispose();
    };
  }, [gl, profile.simResolution, profile.pressureIterations, size.width, size.height]);

  useEffect(() => {
    simRef.current?.setIterations(profile.pressureIterations);
  }, [profile.pressureIterations]);

  useEffect(() => {
    if (clearWave !== lastClearWave.current) {
      lastClearWave.current = clearWave;
      simRef.current?.triggerClearWave();
    }
  }, [clearWave]);

  useFrame((state, delta) => {
    const sim = simRef.current;
    if (!sim) return;

    const aspect = size.width / size.height;
    sim.setAspectRatio(aspect);

    while (splatQueue.current.length > 0) {
      const s = splatQueue.current.shift()!;
      sim.splat(s);
      velEstimate.current = {
        x: s.dx * 40,
        y: s.dy * 40,
        mag: Math.hypot(s.dx, s.dy) * 40,
      };
      const sx = s.x;
      const sy = s.y;
      const dx = s.dx * 40;
      const dy = s.dy * 40;
      for (let i = 0; i < PANEL_SAMPLE_POSITIONS.length; i++) {
        const [px, py] = PANEL_SAMPLE_POSITIONS[i];
        const d = Math.hypot(sx - px, sy - py);
        if (d < PANEL_FALLOFF) {
          const w = 1 - d / PANEL_FALLOFF;
          panelEnergy.current[i].dx += dx * w;
          panelEnergy.current[i].dy += dy * w;
        }
      }
    }

    for (let i = 0; i < panelEnergy.current.length; i++) {
      panelEnergy.current[i].dx *= PANEL_DECAY;
      panelEnergy.current[i].dy *= PANEL_DECAY;
    }

    sim.step(Math.min(delta, 0.033), state.clock.elapsedTime);

    if (displayMesh.current) {
      displayMesh.current.material = sim.getDisplayMaterial();
    }

    const { balls, mergePairs } = stepMetaballPhysics(
      metaballs.map((m) => ({ x: m.x, y: m.y, radius: m.radius })),
      delta,
    );

    if (mergePairs.length > 0) {
      const [i, j] = mergePairs[0];
      mergeMetaballs(metaballs[i].id, metaballs[j].id);
    } else if (balls.length === metaballs.length) {
      updateMetaballs(
        metaballs.map((m, idx) => ({
          ...m,
          x: balls[idx].x,
          y: balls[idx].y,
        })),
      );
    }

    if (metaballMat.current && metaballMesh.current) {
      updateMetaballUniforms(
        metaballMat.current,
        balls,
        aspect,
        state.clock.elapsedTime,
      );
      metaballMesh.current.material = metaballMat.current;
    }

    setDisplacement(
      PANEL_SAMPLE_POSITIONS.map(([px, py], i) => ({
        x: px,
        y: py,
        dx: panelEnergy.current[i].dx,
        dy: panelEnergy.current[i].dy,
      })),
    );

    const t = Math.min(velEstimate.current.mag / 4, 1);
    const s = 0.0025 + t * 0.006;
    chromaOffset.set(s, s);
    if (typeof document !== "undefined") {
      document.documentElement.style.setProperty("--fluid-energy", t.toFixed(3));
    }

    fpsAccum.current.frames += 1;
    fpsAccum.current.time += delta;
    if (fpsAccum.current.time >= 0.5) {
      setStats({
        fps: Math.round(fpsAccum.current.frames / fpsAccum.current.time),
        velocityMag: velEstimate.current.mag,
        metaballCount: metaballs.length,
      });
      fpsAccum.current.frames = 0;
      fpsAccum.current.time = 0;
    }

    velEstimate.current.x *= 0.92;
    velEstimate.current.y *= 0.92;
    velEstimate.current.mag *= 0.92;
  });

  useEffect(() => {
    const handler = (e: CustomEvent) => {
      splatQueue.current.push(e.detail);
    };
    window.addEventListener("fluid-splat", handler as EventListener);
    return () => window.removeEventListener("fluid-splat", handler as EventListener);
  }, []);

  const showPost = profile.postPassCount >= 2;

  return (
    <>
      <mesh ref={displayMesh}>
        <planeGeometry args={[2, 2]} />
      </mesh>
      <mesh ref={metaballMesh} renderOrder={1}>
        <planeGeometry args={[2, 2]} />
        <shaderMaterial transparent depthWrite={false} />
      </mesh>
      {showPost && (
        <EffectComposer multisampling={0}>
          <Bloom
            intensity={0.35}
            luminanceThreshold={0.2}
            luminanceSmoothing={0.9}
            blendFunction={BlendFunction.ADD}
          />
          <ChromaticAberration
            offset={chromaOffset}
            blendFunction={BlendFunction.NORMAL}
            radialModulation={profile.postPassCount >= 3}
            modulationOffset={0.15}
          />
        </EffectComposer>
      )}
    </>
  );
}

export function dispatchFluidSplat(detail: {
  x: number;
  y: number;
  dx: number;
  dy: number;
  strength?: number;
  radius?: number;
}) {
  window.dispatchEvent(new CustomEvent("fluid-splat", { detail }));
}

type FluidCanvasProps = {
  className?: string;
};

export default function FluidCanvas({ className }: FluidCanvasProps) {
  const preset = usePerformance((s) => s.preset);
  const profile = useMemo(() => getPerformanceProfile(preset), [preset]);

  return (
    <div className={className}>
      <Canvas
        orthographic
        camera={{ position: [0, 0, 1], zoom: 1 }}
        gl={{
          antialias: false,
          alpha: true,
          powerPreference: "high-performance",
        }}
        dpr={profile.dpr}
        style={{ touchAction: "none" }}
      >
        <color attach="background" args={["#050810"]} />
        <FluidScene />
      </Canvas>
    </div>
  );
}
