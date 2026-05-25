import * as THREE from "three";
import { BASE_VERTEX } from "./fluid-sim";

export type MetaballUniform = {
  x: number;
  y: number;
  radius: number;
};

export const METABALL_FRAGMENT = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  uniform float uTime;
  uniform float uAspect;
  uniform vec3 uBalls[16];
  uniform int uBallCount;

  void main() {
    vec2 p = vUv;
    p.x *= uAspect;
    float field = 0.0;
    for (int i = 0; i < 16; i++) {
      if (i >= uBallCount) break;
      vec3 ball = uBalls[i];
      vec2 bp = vec2(ball.x, ball.y);
      bp.x *= uAspect;
      float d = length(p - bp);
      field += ball.z * ball.z / (d * d + 0.0008);
    }

    float alpha = smoothstep(0.85, 1.35, field);
    if (alpha < 0.01) discard;

    float fresnel = pow(clamp(1.0 - field * 0.35, 0.0, 1.0), 2.5);
    vec3 base = vec3(0.15, 0.85, 1.0);
    vec3 highlight = vec3(1.0, 0.35, 0.75);
    vec3 color = mix(base, highlight, fresnel);
    color += vec3(0.08) * sin(uTime * 2.0 + field * 4.0);

    gl_FragColor = vec4(color, alpha * 0.92);
  }
`;

export function createMetaballMaterial(aspect: number) {
  const balls = Array.from({ length: 16 }, () => new THREE.Vector3(0, 0, 0.05));
  return new THREE.ShaderMaterial({
    vertexShader: BASE_VERTEX,
    fragmentShader: METABALL_FRAGMENT,
    uniforms: {
      uTime: { value: 0 },
      uAspect: { value: aspect },
      uBalls: { value: balls },
      uBallCount: { value: 0 },
    },
    transparent: true,
    depthWrite: false,
    depthTest: false,
  });
}

export function updateMetaballUniforms(
  material: THREE.ShaderMaterial,
  balls: MetaballUniform[],
  aspect: number,
  time: number,
) {
  const uniforms = material.uniforms;
  uniforms.uAspect.value = aspect;
  uniforms.uTime.value = time;
  uniforms.uBallCount.value = Math.min(balls.length, 16);
  const arr = uniforms.uBalls.value as THREE.Vector3[];
  for (let i = 0; i < 16; i++) {
    if (i < balls.length) {
      arr[i].set(balls[i].x, 1 - balls[i].y, balls[i].radius);
    } else {
      arr[i].set(0, 0, 0);
    }
  }
}

const MERGE_DIST = 0.12;
const SNAP_DIST = 0.055;
const SURFACE_TENSION = 0.08;

export function stepMetaballPhysics(
  balls: MetaballUniform[],
  dt: number,
): { balls: MetaballUniform[]; mergePairs: [number, number][] } {
  const next = balls.map((b) => ({ ...b, vx: 0, vy: 0 })) as (MetaballUniform & {
    vx: number;
    vy: number;
  })[];
  const mergePairs: [number, number][] = [];

  for (let i = 0; i < next.length; i++) {
    for (let j = i + 1; j < next.length; j++) {
      const dx = next[j].x - next[i].x;
      const dy = next[j].y - next[i].y;
      const dist = Math.hypot(dx, dy);
      const minDist = next[i].radius + next[j].radius;

      if (dist < SNAP_DIST) {
        mergePairs.push([i, j]);
        continue;
      }

      if (dist < MERGE_DIST && dist > 0.001) {
        const nx = dx / dist;
        const ny = dy / dist;
        const stretch = (minDist * 1.4 - dist) * SURFACE_TENSION;
        next[i].vx -= nx * stretch;
        next[i].vy -= ny * stretch;
        next[j].vx += nx * stretch;
        next[j].vy += ny * stretch;
      }
    }
  }

  for (const b of next) {
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.vx *= 0.92;
    b.vy *= 0.92;
    b.x = Math.max(0.05, Math.min(0.95, b.x));
    b.y = Math.max(0.05, Math.min(0.95, b.y));
  }

  return { balls: next, mergePairs };
}
