import * as THREE from "three";

export const BASE_VERTEX = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position, 1.0);
  }
`;

export const SPLAT_FRAGMENT = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  uniform sampler2D uTarget;
  uniform float aspectRatio;
  uniform vec3 uColor;
  uniform vec2 uPoint;
  uniform float uRadius;
  uniform float uStrength;

  void main() {
    vec2 p = vUv - uPoint;
    p.x *= aspectRatio;
    vec2 prev = texture2D(uTarget, vUv).xy;
    float d = length(p);
    float influence = exp(-d * d / uRadius) * uStrength;
    vec2 splat = uColor.xy * influence;
    gl_FragColor = vec4(prev + splat, 0.0, 1.0);
  }
`;

export const ADVECTION_FRAGMENT = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  uniform sampler2D uVelocity;
  uniform sampler2D uSource;
  uniform vec2 uTexelSize;
  uniform float uDissipation;
  uniform float uDt;

  void main() {
    vec2 coord = vUv - uDt * texture2D(uVelocity, vUv).xy * uTexelSize;
    vec4 result = texture2D(uSource, coord);
    gl_FragColor = uDissipation * result;
  }
`;

export const DIVERGENCE_FRAGMENT = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  uniform sampler2D uVelocity;
  uniform vec2 uTexelSize;

  void main() {
    float L = texture2D(uVelocity, vUv - vec2(uTexelSize.x, 0.0)).x;
    float R = texture2D(uVelocity, vUv + vec2(uTexelSize.x, 0.0)).x;
    float T = texture2D(uVelocity, vUv + vec2(0.0, uTexelSize.y)).y;
    float B = texture2D(uVelocity, vUv - vec2(0.0, uTexelSize.y)).y;
    float div = 0.5 * (R - L + T - B);
    gl_FragColor = vec4(div, 0.0, 0.0, 1.0);
  }
`;

export const PRESSURE_FRAGMENT = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  uniform sampler2D uPressure;
  uniform sampler2D uDivergence;
  uniform vec2 uTexelSize;

  void main() {
    float L = texture2D(uPressure, vUv - vec2(uTexelSize.x, 0.0)).x;
    float R = texture2D(uPressure, vUv + vec2(uTexelSize.x, 0.0)).x;
    float T = texture2D(uPressure, vUv + vec2(0.0, uTexelSize.y)).x;
    float B = texture2D(uPressure, vUv - vec2(0.0, uTexelSize.y)).x;
    float div = texture2D(uDivergence, vUv).x;
    float pressure = (L + R + B + T - div) * 0.25;
    gl_FragColor = vec4(pressure, 0.0, 0.0, 1.0);
  }
`;

export const GRADIENT_SUBTRACT_FRAGMENT = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  uniform sampler2D uPressure;
  uniform sampler2D uVelocity;
  uniform vec2 uTexelSize;

  void main() {
    float L = texture2D(uPressure, vUv - vec2(uTexelSize.x, 0.0)).x;
    float R = texture2D(uPressure, vUv + vec2(uTexelSize.x, 0.0)).x;
    float T = texture2D(uPressure, vUv + vec2(0.0, uTexelSize.y)).x;
    float B = texture2D(uPressure, vUv - vec2(0.0, uTexelSize.y)).x;
    vec2 velocity = texture2D(uVelocity, vUv).xy;
    velocity -= vec2(R - L, T - B);
    gl_FragColor = vec4(velocity, 0.0, 1.0);
  }
`;

export const CURL_FRAGMENT = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  uniform sampler2D uVelocity;
  uniform vec2 uTexelSize;

  void main() {
    float L = texture2D(uVelocity, vUv - vec2(uTexelSize.x, 0.0)).y;
    float R = texture2D(uVelocity, vUv + vec2(uTexelSize.x, 0.0)).y;
    float T = texture2D(uVelocity, vUv + vec2(0.0, uTexelSize.y)).x;
    float B = texture2D(uVelocity, vUv - vec2(0.0, uTexelSize.y)).x;
    float curl = R - L - T + B;
    gl_FragColor = vec4(curl * 0.5, 0.0, 0.0, 1.0);
  }
`;

export const VORTICITY_FRAGMENT = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  uniform sampler2D uVelocity;
  uniform sampler2D uCurl;
  uniform vec2 uTexelSize;
  uniform float uCurlStrength;

  void main() {
    float L = abs(texture2D(uCurl, vUv - vec2(uTexelSize.x, 0.0)).x);
    float R = abs(texture2D(uCurl, vUv + vec2(uTexelSize.x, 0.0)).x);
    float T = abs(texture2D(uCurl, vUv + vec2(0.0, uTexelSize.y)).x);
    float B = abs(texture2D(uCurl, vUv - vec2(0.0, uTexelSize.y)).x);
    vec2 curl = vec2(T - B, L - R);
    curl = normalize(curl + 1e-5);
    float force = texture2D(uCurl, vUv).x * uCurlStrength;
    vec2 velocity = texture2D(uVelocity, vUv).xy;
    velocity += curl * force;
    gl_FragColor = vec4(velocity, 0.0, 1.0);
  }
`;

export const DYE_SPLAT_FRAGMENT = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  uniform sampler2D uTarget;
  uniform float aspectRatio;
  uniform vec3 uColor;
  uniform vec2 uPoint;
  uniform float uRadius;
  uniform float uStrength;

  void main() {
    vec2 p = vUv - uPoint;
    p.x *= aspectRatio;
    vec3 prev = texture2D(uTarget, vUv).rgb;
    float d = length(p);
    float influence = exp(-d * d / uRadius) * uStrength;
    vec3 splat = uColor * influence;
    gl_FragColor = vec4(prev + splat, 1.0);
  }
`;

export const CLEAR_WAVE_FRAGMENT = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  uniform sampler2D uTarget;
  uniform float uTime;
  uniform float uWaveY;
  uniform float uStrength;

  void main() {
    vec4 prev = texture2D(uTarget, vUv);
    float wave = smoothstep(uWaveY - 0.08, uWaveY + 0.02, vUv.y);
    float sweep = smoothstep(0.0, 1.0, uTime);
    float mask = wave * sweep;
    gl_FragColor = prev * (1.0 - mask * uStrength);
  }
`;

export const DISPLAY_FRAGMENT = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  uniform sampler2D uDye;
  uniform float uTime;

  vec3 iridescent(vec3 dye, vec2 uv) {
    float lum = dot(dye, vec3(0.299, 0.587, 0.114));
    float hue = atan(dye.g - dye.b, dye.r - dye.b) + uTime * 0.15;
    vec3 palette;
    palette.r = 0.5 + 0.5 * sin(hue * 2.0 + 0.0);
    palette.g = 0.5 + 0.5 * sin(hue * 2.0 + 2.094);
    palette.b = 0.5 + 0.5 * sin(hue * 2.0 + 4.188);
    vec3 base = mix(vec3(0.04, 0.06, 0.12), palette, clamp(lum * 3.5, 0.0, 1.0));
    return base + dye * 1.8;
  }

  void main() {
    vec3 dye = texture2D(uDye, vUv).rgb;
    vec3 color = iridescent(dye, vUv);
    float alpha = clamp(length(dye) * 2.5, 0.0, 1.0);
    gl_FragColor = vec4(color, alpha);
  }
`;

function createMaterial(
  fragmentShader: string,
  uniforms: Record<string, THREE.IUniform>,
) {
  return new THREE.ShaderMaterial({
    vertexShader: BASE_VERTEX,
    fragmentShader,
    uniforms,
    depthTest: false,
    depthWrite: false,
  });
}

function createDoubleFBO(
  width: number,
  height: number,
  type: THREE.TextureDataType = THREE.HalfFloatType,
) {
  const opts: THREE.RenderTargetOptions = {
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    format: THREE.RGBAFormat,
    type,
    depthBuffer: false,
    stencilBuffer: false,
  };
  const read = new THREE.WebGLRenderTarget(width, height, opts);
  const write = new THREE.WebGLRenderTarget(width, height, opts);
  return {
    read,
    write,
    swap() {
      const tmp = this.read;
      this.read = this.write;
      this.write = tmp;
    },
    dispose() {
      read.dispose();
      write.dispose();
    },
  };
}

export type SplatInput = {
  x: number;
  y: number;
  dx: number;
  dy: number;
  color?: THREE.Color;
  radius?: number;
  strength?: number;
};

export class FluidSimulator {
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.OrthographicCamera;
  private quad: THREE.Mesh;
  private width: number;
  private height: number;
  private iterations: number;
  private aspectRatio: number;

  private velocity: ReturnType<typeof createDoubleFBO>;
  private dye: ReturnType<typeof createDoubleFBO>;
  private pressure: ReturnType<typeof createDoubleFBO>;
  private divergence: THREE.WebGLRenderTarget;
  private curl: THREE.WebGLRenderTarget;

  private splatMat: THREE.ShaderMaterial;
  private dyeSplatMat: THREE.ShaderMaterial;
  private advectionMat: THREE.ShaderMaterial;
  private divergenceMat: THREE.ShaderMaterial;
  private pressureMat: THREE.ShaderMaterial;
  private gradientMat: THREE.ShaderMaterial;
  private curlMat: THREE.ShaderMaterial;
  private vorticityMat: THREE.ShaderMaterial;
  private clearWaveMat: THREE.ShaderMaterial;
  private displayMat: THREE.ShaderMaterial;

  private clearWaveTime = 0;
  private clearWaveActive = false;

  constructor(
    renderer: THREE.WebGLRenderer,
    resolution: number,
    iterations: number,
  ) {
    this.renderer = renderer;
    this.width = resolution;
    this.height = resolution;
    this.iterations = iterations;
    this.aspectRatio = 1;

    this.scene = new THREE.Scene();
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const geometry = new THREE.PlaneGeometry(2, 2);
    this.quad = new THREE.Mesh(geometry);
    this.scene.add(this.quad);

    const texelSize = new THREE.Vector2(1 / this.width, 1 / this.height);

    this.velocity = createDoubleFBO(this.width, this.height);
    this.dye = createDoubleFBO(this.width, this.height, THREE.HalfFloatType);
    this.pressure = createDoubleFBO(this.width, this.height);
    this.divergence = new THREE.WebGLRenderTarget(this.width, this.height, {
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter,
      format: THREE.RGBAFormat,
      type: THREE.HalfFloatType,
      depthBuffer: false,
    });
    this.curl = new THREE.WebGLRenderTarget(this.width, this.height, {
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter,
      format: THREE.RGBAFormat,
      type: THREE.HalfFloatType,
      depthBuffer: false,
    });

    this.splatMat = createMaterial(SPLAT_FRAGMENT, {
      uTarget: { value: null },
      aspectRatio: { value: this.aspectRatio },
      uColor: { value: new THREE.Vector3() },
      uPoint: { value: new THREE.Vector2() },
      uRadius: { value: 0.0025 },
      uStrength: { value: 1 },
    });

    this.dyeSplatMat = createMaterial(DYE_SPLAT_FRAGMENT, {
      uTarget: { value: null },
      aspectRatio: { value: this.aspectRatio },
      uColor: { value: new THREE.Vector3() },
      uPoint: { value: new THREE.Vector2() },
      uRadius: { value: 0.0025 },
      uStrength: { value: 1 },
    });

    this.advectionMat = createMaterial(ADVECTION_FRAGMENT, {
      uVelocity: { value: null },
      uSource: { value: null },
      uTexelSize: { value: texelSize.clone() },
      uDissipation: { value: 0.98 },
      uDt: { value: 0.016 },
    });

    this.divergenceMat = createMaterial(DIVERGENCE_FRAGMENT, {
      uVelocity: { value: null },
      uTexelSize: { value: texelSize.clone() },
    });

    this.pressureMat = createMaterial(PRESSURE_FRAGMENT, {
      uPressure: { value: null },
      uDivergence: { value: null },
      uTexelSize: { value: texelSize.clone() },
    });

    this.gradientMat = createMaterial(GRADIENT_SUBTRACT_FRAGMENT, {
      uPressure: { value: null },
      uVelocity: { value: null },
      uTexelSize: { value: texelSize.clone() },
    });

    this.curlMat = createMaterial(CURL_FRAGMENT, {
      uVelocity: { value: null },
      uTexelSize: { value: texelSize.clone() },
    });

    this.vorticityMat = createMaterial(VORTICITY_FRAGMENT, {
      uVelocity: { value: null },
      uCurl: { value: null },
      uTexelSize: { value: texelSize.clone() },
      uCurlStrength: { value: 25 },
    });

    this.clearWaveMat = createMaterial(CLEAR_WAVE_FRAGMENT, {
      uTarget: { value: null },
      uTime: { value: 0 },
      uWaveY: { value: 0 },
      uStrength: { value: 0.95 },
    });

    this.displayMat = createMaterial(DISPLAY_FRAGMENT, {
      uDye: { value: null },
      uTime: { value: 0 },
    });
  }

  setAspectRatio(aspect: number) {
    this.aspectRatio = aspect;
    this.splatMat.uniforms.aspectRatio.value = aspect;
    this.dyeSplatMat.uniforms.aspectRatio.value = aspect;
  }

  setIterations(n: number) {
    this.iterations = n;
  }

  getVelocityTexture(): THREE.Texture {
    return this.velocity.read.texture;
  }

  getDyeTexture(): THREE.Texture {
    return this.dye.read.texture;
  }

  getDisplayMaterial(): THREE.ShaderMaterial {
    return this.displayMat;
  }

  private blit(material: THREE.ShaderMaterial, target: THREE.WebGLRenderTarget | null) {
    this.quad.material = material;
    this.renderer.setRenderTarget(target);
    this.renderer.render(this.scene, this.camera);
  }

  splat(input: SplatInput) {
    const color = input.color ?? new THREE.Color().setHSL(Math.random(), 0.9, 0.55);
    const radius = input.radius ?? 0.0025;
    const strength = input.strength ?? 1;

    this.splatMat.uniforms.uTarget.value = this.velocity.read.texture;
    this.splatMat.uniforms.uPoint.value.set(input.x, 1 - input.y);
    this.splatMat.uniforms.uColor.value.set(input.dx * 800, -input.dy * 800, 0);
    this.splatMat.uniforms.uRadius.value = radius;
    this.splatMat.uniforms.uStrength.value = strength;
    this.blit(this.splatMat, this.velocity.write);
    this.velocity.swap();

    this.dyeSplatMat.uniforms.uTarget.value = this.dye.read.texture;
    this.dyeSplatMat.uniforms.uPoint.value.set(input.x, 1 - input.y);
    this.dyeSplatMat.uniforms.uColor.value.set(color.r, color.g, color.b);
    this.dyeSplatMat.uniforms.uRadius.value = radius * 1.5;
    this.dyeSplatMat.uniforms.uStrength.value = strength * 0.8;
    this.blit(this.dyeSplatMat, this.dye.write);
    this.dye.swap();
  }

  triggerClearWave() {
    this.clearWaveTime = 0;
    this.clearWaveActive = true;
  }

  private applyClearWave() {
    if (!this.clearWaveActive) return;
    this.clearWaveTime += 0.035;
    const waveY = this.clearWaveTime * 1.2;

    this.clearWaveMat.uniforms.uTime.value = this.clearWaveTime;
    this.clearWaveMat.uniforms.uWaveY.value = waveY;

    this.clearWaveMat.uniforms.uTarget.value = this.dye.read.texture;
    this.blit(this.clearWaveMat, this.dye.write);
    this.dye.swap();

    this.clearWaveMat.uniforms.uTarget.value = this.velocity.read.texture;
    this.blit(this.clearWaveMat, this.velocity.write);
    this.velocity.swap();

    if (this.clearWaveTime > 1.2) {
      this.clearWaveActive = false;
    }
  }

  step(dt: number, time: number) {
    const texel = new THREE.Vector2(1 / this.width, 1 / this.height);

    this.advectionMat.uniforms.uTexelSize.value.copy(texel);
    this.advectionMat.uniforms.uDt.value = dt;
    this.advectionMat.uniforms.uDissipation.value = 0.99;
    this.advectionMat.uniforms.uVelocity.value = this.velocity.read.texture;
    this.advectionMat.uniforms.uSource.value = this.velocity.read.texture;
    this.blit(this.advectionMat, this.velocity.write);
    this.velocity.swap();

    this.curlMat.uniforms.uVelocity.value = this.velocity.read.texture;
    this.curlMat.uniforms.uTexelSize.value.copy(texel);
    this.blit(this.curlMat, this.curl);

    this.vorticityMat.uniforms.uVelocity.value = this.velocity.read.texture;
    this.vorticityMat.uniforms.uCurl.value = this.curl.texture;
    this.vorticityMat.uniforms.uTexelSize.value.copy(texel);
    this.blit(this.vorticityMat, this.velocity.write);
    this.velocity.swap();

    this.divergenceMat.uniforms.uVelocity.value = this.velocity.read.texture;
    this.divergenceMat.uniforms.uTexelSize.value.copy(texel);
    this.blit(this.divergenceMat, this.divergence);

    this.pressureMat.uniforms.uDivergence.value = this.divergence.texture;
    this.pressureMat.uniforms.uTexelSize.value.copy(texel);
    for (let i = 0; i < this.iterations; i++) {
      this.pressureMat.uniforms.uPressure.value = this.pressure.read.texture;
      this.blit(this.pressureMat, this.pressure.write);
      this.pressure.swap();
    }

    this.gradientMat.uniforms.uPressure.value = this.pressure.read.texture;
    this.gradientMat.uniforms.uVelocity.value = this.velocity.read.texture;
    this.gradientMat.uniforms.uTexelSize.value.copy(texel);
    this.blit(this.gradientMat, this.velocity.write);
    this.velocity.swap();

    this.advectionMat.uniforms.uDissipation.value = 0.985;
    this.advectionMat.uniforms.uVelocity.value = this.velocity.read.texture;
    this.advectionMat.uniforms.uSource.value = this.dye.read.texture;
    this.blit(this.advectionMat, this.dye.write);
    this.dye.swap();

    this.applyClearWave();

    this.displayMat.uniforms.uDye.value = this.dye.read.texture;
    this.displayMat.uniforms.uTime.value = time;
  }

  sampleVelocityAt(u: number, v: number): THREE.Vector2 {
    // Approximate sample — full GPU readback is too slow per frame;
    // canvas component will use a lightweight CPU-side estimate from recent splats.
    void u;
    void v;
    return new THREE.Vector2(0, 0);
  }

  dispose() {
    this.velocity.dispose();
    this.dye.dispose();
    this.pressure.dispose();
    this.divergence.dispose();
    this.curl.dispose();
    this.quad.geometry.dispose();
    [
      this.splatMat,
      this.dyeSplatMat,
      this.advectionMat,
      this.divergenceMat,
      this.pressureMat,
      this.gradientMat,
      this.curlMat,
      this.vorticityMat,
      this.clearWaveMat,
      this.displayMat,
    ].forEach((m) => m.dispose());
  }
}
