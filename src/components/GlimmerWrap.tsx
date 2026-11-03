import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useSyncExternalStore,
  type CSSProperties,
  type ReactNode,
} from "react";
import * as THREE from "three";
import "./GlimmerWrap.css";

export type GlimmerWrapDirection = "outward" | "inward";

export interface GlimmerWrapProps {
  colors?: [string, string];
  backgroundColor?: string;
  count?: number;
  size?: number;
  sizeVariance?: number;
  brightness?: number;
  spread?: number;
  hollow?: number;
  perspective?: number;
  centerX?: number;
  centerY?: number;
  speed?: number;
  direction?: GlimmerWrapDirection;
  twist?: number;
  turbulence?: number;
  trail?: number;
  glitter?: number;
  glintSize?: number;
  twinkle?: number;
  focus?: number;
  aperture?: number;
  boost?: number;
  parallax?: number;
  waves?: boolean;
  intro?: boolean;
  paused?: boolean;
  dpr?: number;
  children?: ReactNode;
  className?: string;
  style?: CSSProperties;
}

export interface GlimmerWrapHandle {
  wave: (x?: number, y?: number) => void;
  warp: (seconds?: number) => void;
  replay: () => void;
}

type Settings = Required<Omit<GlimmerWrapProps, "children" | "className" | "style">> & {
  reduced: boolean;
};

interface Controller {
  sync: () => void;
  wave: (x?: number, y?: number) => void;
  warp: (seconds?: number) => void;
  replay: () => void;
  destroy: () => void;
}

const MAX_STARS = 9000;
const MAX_WAVES = 4;
const LUT_SIZE = 8;
const TAU = Math.PI * 2;

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const subscribeToMotion = (notify: () => void) => {
  const media = window.matchMedia("(prefers-reduced-motion: reduce)");
  media.addEventListener("change", notify);
  return () => media.removeEventListener("change", notify);
};

const readMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const scratchColor = new THREE.Color();

const parseColor = (value: string): [number, number, number] | null => {
  const text = value.trim().toLowerCase();
  if (!text || text === "transparent" || text === "none") return null;
  try {
    scratchColor.setStyle(text, THREE.NoColorSpace);
  } catch {
    return null;
  }
  return [scratchColor.r, scratchColor.g, scratchColor.b];
};

const toLinear = (c: number) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
const toGamma = (c: number) => (c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055);

const toOklab = ([r, g, b]: [number, number, number]) => {
  const lr = toLinear(r);
  const lg = toLinear(g);
  const lb = toLinear(b);
  const l = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb);
  const m = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb);
  const s = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
};

const fromOklab = ([L, A, B]: number[]): [number, number, number] => {
  const l = Math.pow(L + 0.3963377774 * A + 0.2158037573 * B, 3);
  const m = Math.pow(L - 0.1055613458 * A - 0.0638541728 * B, 3);
  const s = Math.pow(L - 0.0894841775 * A - 1.291485548 * B, 3);
  return [
    clamp(toGamma(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s), 0, 1),
    clamp(toGamma(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s), 0, 1),
    clamp(toGamma(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s), 0, 1),
  ];
};

const random = (seed: number) => {
  let state = (Math.floor(Math.abs(seed)) % 2147483646) + 1;
  return () => {
    state = (state * 16807) % 2147483647;
    return (state - 1) / 2147483646;
  };
};

const vertexShader = `
attribute vec4 aSeed;
attribute vec4 aLook;
uniform vec2 uView;
uniform vec2 uCenter;
uniform float uFocal;
uniform float uTravel;
uniform float uExposure;
uniform float uTime;
uniform float uSpread;
uniform float uHollow;
uniform float uNear;
uniform float uTwist;
uniform float uTurbulence;
uniform vec2 uLook;
uniform float uSize;
uniform float uSizeVariance;
uniform float uBrightness;
uniform float uFocus;
uniform float uAperture;
uniform float uGlitter;
uniform float uGlintSize;
uniform float uTwinkle;
uniform float uFade;
uniform float uDpr;
uniform vec4 uWaves[${MAX_WAVES}];
varying vec2 vLocal;
varying float vHalfLength;
varying float vSigma;
varying float vIntensity;
varying float vGlint;
varying float vSpike;
varying vec2 vSpikeAxis;
varying float vTone;

float hash(float n) {
  return fract(sin(n * 12.9898 + 78.233) * 43758.5453);
}

vec3 place(float cycle, float depth) {
  float radius = mix(uHollow, 1.0, sqrt(hash(aSeed.y * 91.7 + cycle * 1.371)));
  float angle = hash(aSeed.z * 47.3 + cycle * 2.113) * 6.2831853;
  angle += uTwist * (1.0 - depth) * 2.6;
  vec2 offset = vec2(cos(angle), sin(angle)) * radius * uSpread;
  float wobble = uTurbulence * 0.09;
  offset += wobble * vec2(
    sin(depth * 11.0 + aSeed.x * 31.0 + uTime * 0.7),
    cos(depth * 9.0 + aSeed.w * 27.0 - uTime * 0.6)
  );
  float z = mix(uNear, 1.0, depth);
  return vec3(offset, z);
}

vec3 project(vec3 p) {
  float cy = cos(uLook.x);
  float sy = sin(uLook.x);
  float cp = cos(uLook.y);
  float sp = sin(uLook.y);
  vec3 q = vec3(p.x * cy - p.z * sy, p.y, p.x * sy + p.z * cy);
  q = vec3(q.x, q.y * cp - q.z * sp, q.y * sp + q.z * cp);
  float z = max(q.z, 0.02);
  return vec3(uCenter + uFocal * q.xy / z, z);
}

void main() {
  float cycle = aSeed.x + uTravel;
  float k = floor(cycle);
  float depth = 1.0 - fract(cycle);
  vec3 star = place(k, depth);
  float previousDepth = clamp(depth + uExposure, 0.0, 1.0);
  vec3 before = place(k, previousDepth);
  vec3 now = project(star);
  vec3 then = project(before);

  float sizeFactor = mix(1.0, 0.35 + 1.3 * aSeed.w, uSizeVariance);
  float sizePx = uSize * sizeFactor * pow(1.0 / star.z, 0.5);
  float focusZ = mix(uNear, 1.0, uFocus);
  float coc = uAperture * 1.1 * abs(1.0 / star.z - 1.0 / focusZ);
  float core = max(sizePx * 0.5, 0.5 / uDpr);
  float sigma = sqrt(core * core + coc * coc);
  float energy = max((core * core) / (sigma * sigma), 0.035);

  vec2 segment = now.xy - then.xy;
  float streak = length(segment);
  vec2 axis = streak > 1e-3 ? segment / streak : vec2(1.0, 0.0);
  energy *= (sigma * 2.5) / (sigma * 2.5 + streak);

  float far = 1.0 - smoothstep(0.76, 1.0, depth);
  float near = smoothstep(0.0, 0.09, depth);
  // 闪烁频率从 1.1~3.4Hz 降到 0.2~0.55Hz，振幅也收一半，避免刺眼
  float twinkle = 1.0 - uTwinkle * 0.28 * (0.5 + 0.5 * sin(uTime * (0.22 + 0.33 * aLook.y) + aLook.y * 40.0));

  float glint = 0.0;
  if (uGlitter > 0.0) {
    // 十字星光的出现频率同样降到 1/5，不再满屏乱闪
    float rate = (0.006 + 0.03 * aLook.w) * uGlitter;
    float phase = fract(uTime * rate + aLook.z);
    float width = 0.22 * rate;
    glint = phase < width ? pow(sin(3.14159265 * phase / width), 2.0) : 0.0;
  }
  for (int i = 0; i < ${MAX_WAVES}; i++) {
    vec4 w = uWaves[i];
    if (w.w <= 0.001) continue;
    float d = abs(distance(now.xy, w.xy) - w.z);
    float band = 34.0 + w.z * 0.08;
    float catchLight = step(0.68, hash(aSeed.z * 13.1 + float(i) * 7.7));
    glint = max(glint, 0.5 * w.w * catchLight * exp(-d * d / (band * band)));
  }

  float intensity = uBrightness * energy * far * near * twinkle * uFade * (1.0 + 2.2 * glint);
  float spike = uGlintSize * glint * (4.0 + 5.0 * aSeed.w) * clamp(1.4 - coc / 6.0, 0.25, 1.0);
  float reach = max(sigma * 3.0, spike) + 1.0 + glint * (sigma * 6.0 + 4.0);
  float halfLength = streak * 0.5;
  vec2 middle = (now.xy + then.xy) * 0.5;
  vec2 normal = vec2(-axis.y, axis.x);
  vec2 local = vec2(position.x * (halfLength + reach), position.y * reach);
  vec2 screen = middle + axis * local.x + normal * local.y;

  vec2 clip = vec2(screen.x / uView.x * 2.0 - 1.0, 1.0 - screen.y / uView.y * 2.0);
  bool hidden = intensity < 0.002 || now.z <= 0.021;
  gl_Position = hidden ? vec4(2.0, 2.0, 2.0, 1.0) : vec4(clip, 0.0, 1.0);

  float spikeAngle = aSeed.w * 6.2831853 + 0.4;
  float relative = spikeAngle - atan(axis.y, axis.x);
  vLocal = local;
  vHalfLength = halfLength;
  vSigma = sigma;
  vIntensity = intensity;
  vGlint = glint;
  vSpike = spike;
  vSpikeAxis = vec2(cos(relative), sin(relative));
  vTone = aLook.x;
}
`;

const fragmentShader = `
precision highp float;
uniform vec3 uLut[${LUT_SIZE}];
uniform vec3 uGlintColor;
uniform float uInk;
varying vec2 vLocal;
varying float vHalfLength;
varying float vSigma;
varying float vIntensity;
varying float vGlint;
varying float vSpike;
varying vec2 vSpikeAxis;
varying float vTone;

vec3 tone(float t) {
  float x = clamp(t, 0.0, 1.0) * ${LUT_SIZE - 1}.0;
  int i = int(floor(x));
  int j = min(i + 1, ${LUT_SIZE - 1});
  return mix(uLut[i], uLut[j], x - float(i));
}

void main() {
  float along = max(abs(vLocal.x) - vHalfLength, 0.0);
  float d2 = along * along + vLocal.y * vLocal.y;
  float core = exp(-d2 / (2.0 * vSigma * vSigma));
  float halo = exp(-sqrt(d2) / (vSigma * 3.0 + 1.5)) * 0.16 * vGlint;
  float spikes = 0.0;
  if (vSpike > 0.5) {
    vec2 q = vec2(dot(vLocal, vSpikeAxis), dot(vLocal, vec2(-vSpikeAxis.y, vSpikeAxis.x)));
    float width = 0.6;
    float decay = vSpike * 0.3;
    spikes = exp(-abs(q.x) / decay) * exp(-q.y * q.y / (2.0 * width * width))
      + exp(-abs(q.y) / decay) * exp(-q.x * q.x / (2.0 * width * width));
    spikes *= vGlint * 0.7;
  }
  float light = (core + halo + spikes) * vIntensity;
  vec3 color = mix(tone(vTone), uGlintColor, clamp(vGlint * 0.7, 0.0, 1.0));
  if (uInk > 0.5) {
    float alpha = clamp(light, 0.0, 1.0);
    if (alpha < 0.002) discard;
    gl_FragColor = vec4(color * alpha, alpha);
  } else {
    if (light < 0.0015) discard;
    gl_FragColor = vec4(color * light, 1.0);
  }
}
`;

const createField = (
  root: HTMLElement,
  stage: HTMLElement,
  settingsRef: { current: Settings },
): Controller | null => {
  const doc = root.ownerDocument;
  const view = doc.defaultView ?? window;
  const canvas = doc.createElement("canvas");
  canvas.setAttribute("aria-hidden", "true");
  canvas.style.cssText = "position:absolute;inset:0;width:100%;height:100%;display:block";
  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, alpha: false, antialias: false, powerPreference: "high-performance" });
  } catch {
    return null;
  }
  stage.appendChild(canvas);

  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, -1, 1);
  const base = new THREE.PlaneGeometry(2, 2);
  const geometry = new THREE.InstancedBufferGeometry();
  geometry.index = base.index;
  geometry.setAttribute("position", base.getAttribute("position"));
  geometry.instanceCount = 0;
  const lut = Array.from({ length: LUT_SIZE }, () => new THREE.Vector3(1, 1, 1));
  const waveUniforms = Array.from({ length: MAX_WAVES }, () => new THREE.Vector4(0, 0, 0, 0));
  const material = new THREE.ShaderMaterial({
    uniforms: {
      uView: { value: new THREE.Vector2(1, 1) },
      uCenter: { value: new THREE.Vector2(0, 0) },
      uFocal: { value: 300 },
      uTravel: { value: 0 },
      uExposure: { value: 0 },
      uTime: { value: 0 },
      uSpread: { value: 1 },
      uHollow: { value: 0.2 },
      uNear: { value: 0.05 },
      uTwist: { value: 0 },
      uTurbulence: { value: 0 },
      uLook: { value: new THREE.Vector2(0, 0) },
      uSize: { value: 1.6 },
      uSizeVariance: { value: 0.6 },
      uBrightness: { value: 1 },
      uFocus: { value: 0.6 },
      uAperture: { value: 0.4 },
      uGlitter: { value: 0.4 },
      uGlintSize: { value: 1 },
      uTwinkle: { value: 0.5 },
      uFade: { value: 0 },
      uDpr: { value: 1 },
      uWaves: { value: waveUniforms },
      uLut: { value: lut },
      uGlintColor: { value: new THREE.Vector3(1, 1, 1) },
      uInk: { value: 0 },
    },
    vertexShader,
    fragmentShader,
    transparent: true,
    side: THREE.DoubleSide,
    depthTest: false,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.frustumCulled = false;
  scene.add(mesh);

  let width = 0;
  let height = 0;
  let dpr = 1;
  let sized = false;
  let starCount = -1;
  let page: [number, number, number] = [0.04, 0.04, 0.04];
  let colorKey = "";
  let ink = false;
  let backgroundAt = -10;
  let travel = 0;
  let time = 0;
  let speedFactor = 1;
  let speedVelocity = 0;
  let warpUntil = 0;
  let holding = false;
  let press: { id: number; x: number; y: number; at: number; moved: boolean } | null = null;
  const look = { yaw: 0, pitch: 0, yawV: 0, pitchV: 0, tx: 0, ty: 0 };
  const waves: { x: number; y: number; born: number }[] = [];
  let introAt = -1;
  let introDone = false;
  let raf = 0;
  let last = 0;
  let visible = false;
  let destroyed = false;
  let lost = false;
  let rendered = false;

  const clock = () => performance.now() / 1000;

  const readSize = () => {
    const settings = settingsRef.current;
    const nextWidth = Math.round(root.clientWidth);
    const nextHeight = Math.round(root.clientHeight);
    if (nextWidth < 2 || nextHeight < 2) {
      sized = false;
      return false;
    }
    const nextDpr = Math.min(view.devicePixelRatio || 1, Math.max(settings.dpr, 0.5));
    if (sized && nextWidth === width && nextHeight === height && nextDpr === dpr) return false;
    sized = true;
    width = nextWidth;
    height = nextHeight;
    dpr = nextDpr;
    renderer.setPixelRatio(dpr);
    renderer.setSize(width, height, false);
    rendered = false;
    return true;
  };

  const readPage = (): [number, number, number] => {
    let node: HTMLElement | null = root.parentElement;
    while (node) {
      const fill = view.getComputedStyle(node).backgroundColor;
      const match = fill.match(/rgba?\(([^)]+)\)/);
      if (match) {
        const parts = match[1].split(",").map((part) => Number.parseFloat(part));
        if (parts.length < 4 || parts[3] > 0.05) return [parts[0] / 255, parts[1] / 255, parts[2] / 255];
      }
      node = node.parentElement;
    }
    const text = view.getComputedStyle(root).color.match(/rgba?\(([^)]+)\)/);
    if (text) {
      const parts = text[1].split(",").map((part) => Number.parseFloat(part));
      return parts[0] + parts[1] + parts[2] > 382 ? [0.04, 0.04, 0.04] : [1, 1, 1];
    }
    return [0.04, 0.04, 0.04];
  };

  const refreshPage = () => {
    // 透明底时不能去推断「页面底色」——组件会据此判断明暗并给星星染色，
    // 叠在深色图层时会算成浅底从而把星星染黑。透明一律按纯黑处理。
    page = parseColor(settingsRef.current.backgroundColor) ?? [0, 0, 0];
  };

  const syncColors = () => {
    const settings = settingsRef.current;
    const key = [page.join(","), settings.colors[0], settings.colors[1]].join("|");
    if (key === colorKey) return;
    colorKey = key;
    ink = 0.2126 * page[0] + 0.7152 * page[1] + 0.0722 * page[2] > 0.55;
    const clearAlpha = parseColor(settings.backgroundColor) ? 1 : 1;
    renderer.setClearColor(new THREE.Color().setRGB(page[0], page[1], page[2], THREE.SRGBColorSpace), clearAlpha);
    const first = toOklab(parseColor(settings.colors[0]) ?? [1, 1, 1]);
    const second = toOklab(parseColor(settings.colors[1]) ?? [0.69, 0.62, 0.94]);
    const chromaOf = (lab: number[]) => Math.hypot(lab[1], lab[2]);
    const adapt = (lab: number[], other: number[]) => {
      if (!ink) return lab;
      let source = lab;
      if (chromaOf(lab) < 0.03 && chromaOf(other) >= 0.03) source = other;
      const chroma = chromaOf(source);
      if (chroma < 0.03) return [0.34, 0, 0];
      const scale = Math.max(1, 0.15 / chroma);
      return [clamp(source[0], 0.4, 0.55), source[1] * scale, source[2] * scale];
    };
    const a = adapt(first, second);
    const b = adapt(second, first);
    for (let i = 0; i < LUT_SIZE; i++) {
      const t = i / (LUT_SIZE - 1);
      const rgb = fromOklab([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]);
      lut[i].set(rgb[0], rgb[1], rgb[2]);
    }
    const glint = ink
      ? fromOklab([Math.min((a[0] + b[0]) / 2, 0.42), (a[1] + b[1]) / 2, (a[2] + b[2]) / 2])
      : ([1, 1, 1] as [number, number, number]);
    material.uniforms.uGlintColor.value.set(glint[0], glint[1], glint[2]);
    material.uniforms.uInk.value = ink ? 1 : 0;
    material.blending = ink ? THREE.CustomBlending : THREE.AdditiveBlending;
    if (ink) {
      material.blendEquation = THREE.AddEquation;
      material.blendSrc = THREE.OneFactor;
      material.blendDst = THREE.OneMinusSrcAlphaFactor;
    }
    material.needsUpdate = true;
    rendered = false;
  };

  const ensureStars = () => {
    const settings = settingsRef.current;
    const count = clamp(Math.round(settings.count), 0, MAX_STARS);
    if (count === starCount) return;
    starCount = count;
    const rng = random(9173);
    const seeds = new Float32Array(Math.max(count, 1) * 4);
    const looks = new Float32Array(Math.max(count, 1) * 4);
    for (let i = 0; i < count; i++) {
      seeds[i * 4] = rng();
      seeds[i * 4 + 1] = rng() * 100;
      seeds[i * 4 + 2] = rng() * 100;
      seeds[i * 4 + 3] = rng();
      looks[i * 4] = Math.pow(rng(), 1.6);
      looks[i * 4 + 1] = rng();
      looks[i * 4 + 2] = rng();
      looks[i * 4 + 3] = rng();
    }
    geometry.setAttribute("aSeed", new THREE.InstancedBufferAttribute(seeds, 4));
    geometry.setAttribute("aLook", new THREE.InstancedBufferAttribute(looks, 4));
    geometry.instanceCount = count;
    rendered = false;
  };

  const schedule = () => {
    if (destroyed || lost || !visible || raf) return;
    raf = requestAnimationFrame(frame);
  };

  const wave = (x?: number, y?: number) => {
    const settings = settingsRef.current;
    if (settings.reduced || !sized) return;
    const px = x === undefined ? width / 2 : clamp(x, 0, 1) * width;
    const py = y === undefined ? height / 2 : clamp(y, 0, 1) * height;
    if (waves.length >= MAX_WAVES) waves.shift();
    waves.push({ x: px, y: py, born: clock() });
    schedule();
  };

  const warp = (seconds = 1.2) => {
    if (settingsRef.current.reduced) return;
    warpUntil = Math.max(warpUntil, clock() + clamp(seconds, 0.1, 10));
    schedule();
  };

  const replay = () => {
    introAt = -1;
    introDone = false;
    schedule();
  };

  function frame(now: number) {
    raf = 0;
    if (destroyed || lost) return;
    if (!sized) {
      readSize();
      if (!sized) return;
    }
    const settings = settingsRef.current;
    const dt = last && now - last < 100 ? Math.min(Math.max((now - last) / 1000, 0), 0.05) : 1 / 60;
    last = now;
    const seconds = clock();
    const reduced = settings.reduced;

    readSize();
    if (seconds - backgroundAt > 1.2) {
      backgroundAt = seconds;
      refreshPage();
    }
    syncColors();
    ensureStars();

    if (introAt < 0) {
      introAt = seconds;
      introDone = reduced || !settings.intro;
    }
    let fade = 1;
    let introBoost = 1;
    if (!introDone) {
      const elapsed = seconds - introAt;
      fade = 1 - Math.pow(1 - clamp(elapsed / 1.1, 0, 1), 3);
      introBoost = 1 + 7 * Math.exp(-elapsed / 0.45);
      if (elapsed > 2.6) introDone = true;
    }

    const running = !settings.paused && !reduced;
    const boosting = running && (holding || seconds < warpUntil);
    const goal = boosting ? Math.max(settings.boost, 1) : 1;
    const omega = TAU / (boosting ? 0.9 : 1.3);
    const steps = Math.max(1, Math.ceil(dt * 240));
    const h = dt / steps;
    for (let s = 0; s < steps; s++) {
      speedVelocity += (omega * omega * (goal - speedFactor) - 2 * omega * speedVelocity) * h;
      speedFactor += speedVelocity * h;
    }
    const direction = settings.direction === "inward" ? -1 : 1;
    const cruise = clamp(settings.speed, 0, 5) * 0.1;
    const rate = running ? cruise * speedFactor * introBoost : 0;
    travel += rate * dt * direction;
    if (travel > 1e4 || travel < -1e4) travel -= Math.round(travel);
    if (running) time += dt;

    const parallax = reduced ? 0 : clamp(settings.parallax, 0, 1);
    const lookOmega = TAU / 1.1;
    for (let s = 0; s < steps; s++) {
      look.yawV += (lookOmega * lookOmega * (look.tx * parallax * 0.16 - look.yaw) - 2 * lookOmega * look.yawV) * h;
      look.pitchV += (lookOmega * lookOmega * (look.ty * parallax * 0.11 - look.pitch) - 2 * lookOmega * look.pitchV) * h;
      look.yaw += look.yawV * h;
      look.pitch += look.pitchV * h;
    }

    const diagonal = Math.hypot(width, height);
    let waveCount = 0;
    for (let i = waves.length - 1; i >= 0; i--) {
      if (seconds - waves[i].born > 2.4) waves.splice(i, 1);
    }
    for (let i = 0; i < MAX_WAVES; i++) {
      const item = waves[i];
      if (!item) {
        waveUniforms[i].set(0, 0, 0, 0);
        continue;
      }
      const age = seconds - item.born;
      const radius = age * diagonal * 0.42;
      const strength = Math.exp(-age / 0.9) * Math.min(age / 0.06, 1);
      waveUniforms[i].set(item.x, item.y, radius, strength);
      waveCount++;
    }

    const minSide = Math.min(width, height);
    const u = material.uniforms;
    u.uView.value.set(width, height);
    u.uCenter.value.set(clamp(settings.centerX, -1, 2) * width, clamp(settings.centerY, -1, 2) * height);
    u.uFocal.value = minSide * 0.42;
    u.uTravel.value = travel;
    u.uExposure.value = Math.min(rate * clamp(settings.trail, 0, 1) * 0.6, 0.6);
    u.uTime.value = time;
    u.uSpread.value = clamp(settings.spread, 0.1, 4);
    u.uHollow.value = clamp(settings.hollow, 0, 0.95);
    u.uNear.value = 0.26 - 0.235 * clamp(settings.perspective, 0, 1);
    u.uTwist.value = clamp(settings.twist, -2, 2);
    u.uTurbulence.value = clamp(settings.turbulence, 0, 2);
    u.uLook.value.set(look.yaw, look.pitch);
    u.uSize.value = clamp(settings.size, 0.2, 8);
    u.uSizeVariance.value = clamp(settings.sizeVariance, 0, 1);
    u.uBrightness.value = clamp(settings.brightness, 0, 3) * (ink ? 1.3 : 1);
    u.uFocus.value = clamp(settings.focus, 0, 1);
    u.uAperture.value = clamp(settings.aperture, 0, 1) * 1.6;
    u.uGlitter.value = reduced ? 0 : clamp(settings.glitter, 0, 2);
    u.uGlintSize.value = clamp(settings.glintSize, 0, 3);
    u.uTwinkle.value = reduced ? 0 : clamp(settings.twinkle, 0, 1);
    u.uFade.value = fade;
    u.uDpr.value = dpr;

    renderer.render(scene, camera);
    rendered = true;

    const moving =
      running ||
      !introDone ||
      waveCount > 0 ||
      Math.abs(speedFactor - goal) > 1e-3 ||
      Math.abs(look.yawV) + Math.abs(look.pitchV) > 1e-5;
    if (moving) schedule();
  }

  const local = (event: PointerEvent) => {
    const rect = root.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  };

  const isControl = (target: EventTarget | null) =>
    target instanceof Element &&
    !!target.closest("a,button,input,textarea,select,label,summary,[role=button],[contenteditable=true]");

  let holdTimer = 0;
  const onMove = (event: PointerEvent) => {
    const point = local(event);
    if (event.pointerType !== "touch") {
      look.tx = clamp((point.x / Math.max(width, 1)) * 2 - 1, -1, 1);
      look.ty = clamp((point.y / Math.max(height, 1)) * 2 - 1, -1, 1);
    }
    if (press && press.id === event.pointerId && Math.hypot(point.x - press.x, point.y - press.y) > 10) {
      press.moved = true;
      if (event.pointerType === "touch") {
        holding = false;
        view.clearTimeout(holdTimer);
      }
    }
    schedule();
  };

  const onLeave = (event: PointerEvent) => {
    if (event.pointerType === "touch") return;
    look.tx = 0;
    look.ty = 0;
    schedule();
  };

  const onDown = (event: PointerEvent) => {
    if (!event.isPrimary || event.button > 0 || isControl(event.target)) return;
    const point = local(event);
    press = { id: event.pointerId, x: point.x, y: point.y, at: performance.now(), moved: false };
    view.clearTimeout(holdTimer);
    holdTimer = view.setTimeout(() => {
      if (press && !press.moved) {
        holding = true;
        schedule();
      }
    }, 180);
  };

  const onUp = (event: PointerEvent) => {
    if (!press || press.id !== event.pointerId) return;
    const ended = press;
    press = null;
    view.clearTimeout(holdTimer);
    const wasHolding = holding;
    holding = false;
    schedule();
    if (event.type === "pointercancel" || wasHolding || ended.moved || isControl(event.target)) return;
    if (settingsRef.current.waves) wave(ended.x / Math.max(width, 1), ended.y / Math.max(height, 1));
  };

  root.addEventListener("pointermove", onMove);
  root.addEventListener("pointerleave", onLeave);
  root.addEventListener("pointerdown", onDown);
  root.addEventListener("pointerup", onUp);
  root.addEventListener("pointercancel", onUp);

  const resizer = new ResizeObserver(() => {
    if (readSize()) schedule();
  });
  resizer.observe(root);

  const observer =
    typeof IntersectionObserver === "undefined"
      ? null
      : new IntersectionObserver(
          ([entry]) => {
            visible = entry.isIntersecting;
            if (visible) {
              last = 0;
              schedule();
            } else {
              if (raf) cancelAnimationFrame(raf);
              raf = 0;
            }
          },
          { rootMargin: "80px" },
        );
  if (observer) observer.observe(root);
  else visible = true;

  const onLost = (event: Event) => {
    event.preventDefault();
    lost = true;
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
  };
  const onRestored = () => {
    lost = false;
    colorKey = "";
    starCount = -1;
    schedule();
  };
  canvas.addEventListener("webglcontextlost", onLost);
  canvas.addEventListener("webglcontextrestored", onRestored);

  readSize();
  refreshPage();
  syncColors();
  ensureStars();
  renderer.compile(scene, camera);
  schedule();

  return {
    sync: () => {
      readSize();
      refreshPage();
      if (!rendered) schedule();
      schedule();
    },
    wave,
    warp,
    replay,
    destroy: () => {
      destroyed = true;
      if (raf) cancelAnimationFrame(raf);
      view.clearTimeout(holdTimer);
      observer?.disconnect();
      resizer.disconnect();
      root.removeEventListener("pointermove", onMove);
      root.removeEventListener("pointerleave", onLeave);
      root.removeEventListener("pointerdown", onDown);
      root.removeEventListener("pointerup", onUp);
      root.removeEventListener("pointercancel", onUp);
      canvas.removeEventListener("webglcontextlost", onLost);
      canvas.removeEventListener("webglcontextrestored", onRestored);
      material.dispose();
      geometry.dispose();
      base.dispose();
      renderer.dispose();
      if (!renderer.getContext().isContextLost()) renderer.forceContextLoss();
      canvas.remove();
    },
  };
};

export const GlimmerWrap = forwardRef<GlimmerWrapHandle, GlimmerWrapProps>(function GlimmerWrap(
  {
    colors = ["#FFFFFF", "#B19EEF"],
    backgroundColor = "transparent",
    count = 1500,
    size = 1.6,
    sizeVariance = 0.6,
    brightness = 1,
    spread = 1,
    hollow = 0.06,
    perspective = 0.7,
    centerX = 0.5,
    centerY = 0.5,
    speed = 0.5,
    direction = "outward",
    twist = 0,
    turbulence = 0,
    trail = 0.08,
    glitter = 0.5,
    glintSize = 1,
    twinkle = 0.5,
    focus = 0.62,
    aperture = 0.45,
    boost = 7,
    parallax = 0.5,
    waves = true,
    intro = true,
    paused = false,
    dpr = 2,
    children,
    className,
    style,
  },
  ref,
) {
  const rootRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const controllerRef = useRef<Controller | null>(null);
  const reduced = useSyncExternalStore(subscribeToMotion, readMotion, () => false);

  const settings: Settings = {
    colors,
    backgroundColor,
    count,
    size,
    sizeVariance,
    brightness,
    spread,
    hollow,
    perspective,
    centerX,
    centerY,
    speed,
    direction,
    twist,
    turbulence,
    trail,
    glitter,
    glintSize,
    twinkle,
    focus,
    aperture,
    boost,
    parallax,
    waves,
    intro,
    paused,
    dpr,
    reduced,
  };
  const settingsRef = useRef(settings);

  useEffect(() => {
    settingsRef.current = settings;
    controllerRef.current?.sync();
  });

  useEffect(() => {
    const root = rootRef.current;
    const stage = stageRef.current;
    if (!root || !stage) return;
    const controller = createField(root, stage, settingsRef);
    controllerRef.current = controller;
    return () => {
      controller?.destroy();
      controllerRef.current = null;
    };
  }, []);

  useImperativeHandle(
    ref,
    () => ({
      wave: (x?: number, y?: number) => controllerRef.current?.wave(x, y),
      warp: (seconds?: number) => controllerRef.current?.warp(seconds),
      replay: () => controllerRef.current?.replay(),
    }),
    [],
  );

  const backgroundValue = backgroundColor.trim().toLowerCase();
  const transparent = backgroundValue === "transparent" || backgroundValue === "";

  return (
    <div
      ref={rootRef}
      className={["gw-root", "relative isolate h-full min-h-[320px] w-full overflow-hidden", className].filter(Boolean).join(" ")}
      style={{ backgroundColor: transparent ? undefined : backgroundColor, touchAction: "pan-y", ...style }}
    >
      <div ref={stageRef} aria-hidden="true" style={{ position: "absolute", inset: 0, zIndex: 0 }} />
      {children ? <div style={{ position: "relative", zIndex: 1, height: "100%" }}>{children}</div> : null}
    </div>
  );
});

GlimmerWrap.displayName = "GlimmerWrap";

export default GlimmerWrap;
