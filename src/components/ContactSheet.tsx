import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
} from "react";
import * as THREE from "three";

export interface ContactSheetItem {
  src: string;
  alt: string;
  title?: string;
  subtitle?: string;
  href?: string;
}

export interface ContactSheetProps {
  items?: ContactSheetItem[];
  count?: number;
  speed?: number;
  rush?: number;
  spiral?: number;
  blankArea?: number;
  size?: number;
  sizeVariance?: number;
  aspect?: number;
  radius?: number;
  border?: number;
  borderColor?: string;
  rim?: number;
  roll?: number;
  develop?: number;
  edgeFade?: number;
  shadow?: number;
  hoverSlow?: number;
  catchOnHover?: boolean;
  draggable?: boolean;
  wheel?: boolean;
  captions?: boolean;
  backgroundColor?: string;
  paused?: boolean;
  dpr?: number;
  ariaLabel?: string;
  onOpen?: (item: ContactSheetItem, index: number) => void;
  onClose?: () => void;
  className?: string;
  style?: CSSProperties;
}

export interface ContactSheetHandle {
  boost: (amount: number) => void;
  open: (index?: number) => void;
  close: () => void;
}

type Settings = Required<
  Omit<ContactSheetProps, "className" | "style" | "onOpen" | "onClose" | "ariaLabel" | "items">
> & {
  reduced: boolean;
  held: boolean;
};

interface Controller {
  sync: () => void;
  boost: (amount: number) => void;
  open: (index?: number) => void;
  close: () => void;
  destroy: () => void;
}

interface Callbacks {
  onOpen: (index: number) => void;
  onClose: () => void;
}

interface Overlay {
  caption: HTMLElement;
  title: HTMLElement;
  subtitle: HTMLElement;
}

interface Picture {
  image: HTMLImageElement;
  texture: THREE.Texture;
  aspect: number;
  ready: boolean;
  uploaded: boolean;
  fade: number;
  used: number;
}

interface Card {
  mesh: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>;
  w: number;
  rho0: number;
  theta: number;
  scale: number;
  roll: number;
  image: number;
  grip: number;
  x: number;
  y: number;
  sw: number;
  sh: number;
  rot: number;
  alpha: number;
  reveal: number;
  shown: boolean;
}

const MAX_CARDS = 96;
const TAU = Math.PI * 2;
const CAPTION_SPACE = 64;

const defaultItems: ContactSheetItem[] = [
  {
    src: "https://pro.reactbits.dev/demo-media/portrait-sienna.webp",
    alt: "Studio portrait with short natural hair and a burnt-orange top",
    title: "Sienna",
    subtitle: "Studio portrait",
  },
  {
    src: "https://pro.reactbits.dev/demo-media/portrait-silver.webp",
    alt: "Studio portrait with cropped grey hair and a black shirt",
    title: "Silver",
    subtitle: "Studio portrait",
  },
  {
    src: "https://pro.reactbits.dev/demo-media/portrait-indigo.webp",
    alt: "Studio portrait with short dark hair and a cobalt jacket",
    title: "Indigo",
    subtitle: "Studio portrait",
  },
  {
    src: "https://pro.reactbits.dev/demo-media/portrait-rose.webp",
    alt: "Studio portrait with curly red hair and burgundy clothing",
    title: "Rose",
    subtitle: "Studio portrait",
  },
  {
    src: "https://pro.reactbits.dev/demo-media/portrait-olive.webp",
    alt: "Studio portrait with a dark bob and an olive top",
    title: "Olive",
    subtitle: "Studio portrait",
  },
  {
    src: "https://pro.reactbits.dev/demo-media/portrait-pearl.webp",
    alt: "Studio portrait with long black hair and an ivory shirt",
    title: "Pearl",
    subtitle: "Studio portrait",
  },
  {
    src: "https://pro.reactbits.dev/demo-media/portrait-teal.webp",
    alt: "Studio portrait with a shaved head and a teal jacket",
    title: "Teal",
    subtitle: "Studio portrait",
  },
  {
    src: "https://pro.reactbits.dev/demo-media/portrait-ochre.webp",
    alt: "Studio portrait with curly dark hair and an ochre knit",
    title: "Ochre",
    subtitle: "Studio portrait",
  },
];

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const smooth = (edge0: number, edge1: number, value: number) => {
  const t = clamp((value - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
};

const subscribeToMotion = (notify: () => void) => {
  const media = window.matchMedia("(prefers-reduced-motion: reduce)");
  media.addEventListener("change", notify);
  return () => media.removeEventListener("change", notify);
};

const readMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const parseColor = (value: string) => {
  const hex = value.trim().replace("#", "");
  if (!/^[0-9a-f]{3}(?:[0-9a-f]{3})?$/i.test(hex)) return null;
  const full = hex.length === 3 ? hex.replace(/./g, (c) => c + c) : hex;
  return [0, 2, 4].map((offset) => Number.parseInt(full.slice(offset, offset + 2), 16) / 255);
};

const isLight = (value: string) => {
  const rgb = parseColor(value);
  if (!rgb) return false;
  return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2] > 0.6;
};

const springTo = (
  value: number,
  velocity: number,
  target: number,
  dt: number,
  response: number,
  ratio: number,
) => {
  const omega = TAU / Math.max(response, 0.02);
  const substeps = Math.max(1, Math.ceil(dt / (1 / 240)));
  const h = dt / substeps;
  let v = velocity;
  let x = value;
  for (let i = 0; i < substeps; i++) {
    v += (omega * omega * (target - x) - 2 * ratio * omega * v) * h;
    x += v * h;
  }
  return [x, v] as const;
};

const advance = (w: number, distance: number, rush: number) => {
  if (rush < 1e-3) return w * Math.exp(-distance);
  const base = Math.pow(w, rush) - rush * distance;
  if (base <= 1e-6) return 1e-4;
  return Math.pow(base, 1 / rush);
};

const hiddenStyle: CSSProperties = {
  position: "absolute",
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  overflow: "hidden",
  clip: "rect(0, 0, 0, 0)",
  whiteSpace: "nowrap",
  border: 0,
};

const stageStyle: CSSProperties = {
  position: "absolute",
  inset: 0,
  touchAction: "pan-y",
  userSelect: "none",
  WebkitUserSelect: "none",
  WebkitTouchCallout: "none",
};

const captionStyle: CSSProperties = {
  position: "absolute",
  left: 0,
  right: 0,
  top: 0,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: 4,
  padding: "0 16px",
  textAlign: "center",
  pointerEvents: "none",
  opacity: 0,
  willChange: "transform, opacity",
};

const titleStyle: CSSProperties = {
  maxWidth: "100%",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  fontSize: 16,
  fontWeight: 600,
  lineHeight: 1.25,
  letterSpacing: "-0.012em",
};

const subtitleStyle: CSSProperties = {
  maxWidth: "100%",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  fontSize: 13,
  lineHeight: 1.4,
  opacity: 0.55,
};

const vertexShader = `
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const fragmentShader = `
precision highp float;

uniform sampler2D uImage;
uniform float uImageAspect;
uniform vec2 uSize;
uniform float uMargin;
uniform float uRadius;
uniform float uBorder;
uniform vec3 uBorderColor;
uniform float uRim;
uniform float uReveal;
uniform float uDevelop;
uniform float uAlpha;
uniform float uShadow;
uniform float uLift;
uniform vec3 uBackground;
uniform vec2 uResolution;
uniform float uEdge;
varying vec2 vUv;

float roundBox(vec2 p, vec2 b, float r) {
  vec2 q = abs(p) - b + r;
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
}

void main() {
  vec2 full = uSize + 2.0 * uMargin;
  vec2 p = (vUv - 0.5) * full;
  float radius = min(uRadius, 0.5 * min(uSize.x, uSize.y));
  float d = roundBox(p, 0.5 * uSize, radius);
  float px = max(fwidth(d), 1e-4);
  float card = 1.0 - smoothstep(-0.7 * px, 0.7 * px, d);

  vec2 frag = gl_FragCoord.xy;
  float edgeDistance = min(min(frag.x, uResolution.x - frag.x), min(frag.y, uResolution.y - frag.y));
  float edge = uEdge > 0.5 ? smoothstep(0.0, uEdge, edgeDistance) : 1.0;

  float height = uSize.y;
  float sd = roundBox(p - vec2(0.0, -height * (0.03 + 0.03 * uLift)), 0.5 * uSize * 0.96, radius);
  float blur = height * (0.08 + 0.06 * uLift);
  float shade = (1.0 - smoothstep(-blur * 0.6, blur, sd)) * uShadow * (0.42 + 0.22 * uLift);

  float inner = min(uBorder, 0.45 * min(uSize.x, uSize.y));
  vec2 box = max(uSize - 2.0 * inner, vec2(1.0));
  float di = roundBox(p, 0.5 * box, max(radius - inner * 0.6, 0.0));
  float photo = 1.0 - smoothstep(-0.7 * px, 0.7 * px, di);
  float boxAspect = box.x / box.y;
  vec2 uv = p / box;
  if (boxAspect > uImageAspect) {
    uv.y *= uImageAspect / boxAspect;
  } else {
    uv.x *= boxAspect / uImageAspect;
  }
  uv += 0.5;
  vec3 image = texture2D(uImage, uv).rgb;

  float luma = dot(image, vec3(0.2126, 0.7152, 0.0722));
  float print = step(0.5, uBorder);
  vec3 ground = mix(uBackground, uBorderColor, print);
  float base = dot(ground, vec3(0.2126, 0.7152, 0.0722));
  float dark = step(base, 0.5);
  float contrast = abs(luma - base) / max(max(base, 1.0 - base), 0.25);
  float window = 0.3;
  float threshold = 1.0 - uReveal * (1.0 + window);
  float tonal = smoothstep(threshold, threshold + window, contrast);
  vec3 mono = vec3(luma);
  vec3 tinted = mix(mono, image, smoothstep(0.5, 0.95, uReveal));
  vec3 developedImage = mix(image, tinted, uDevelop);
  vec3 paper = mix(mix(uBackground, vec3(dark), 0.07), uBorderColor, print);
  float develop = mix(smoothstep(0.0, 1.0, uReveal), tonal, uDevelop);
  float paperShown = uDevelop * max(1.0 - dark, print);
  vec3 photoColor = mix(paper, developedImage, develop);
  float paperIn = mix(develop, smoothstep(0.0, 0.18, uReveal), paperShown);
  photoColor = mix(developedImage, photoColor, paperShown);

  vec3 color3 = mix(uBorderColor, photoColor, photo);
  float rimMask = card * (1.0 - smoothstep(0.0, 1.6 * px, -d));
  color3 = mix(color3, mix(vec3(1.0), vec3(0.0), 1.0 - dark), rimMask * uRim * smoothstep(0.3, 1.0, uReveal));
  float amount = mix(mix(smoothstep(0.0, 1.0, uReveal), paperIn, photo), smoothstep(0.0, 0.18, uReveal), print * uDevelop);
  float alpha = card * uAlpha * edge * amount;
  float shadowAlpha = (1.0 - card) * shade * uAlpha * edge * uReveal;
  float total = alpha + shadowAlpha * (1.0 - alpha);
  if (total < 0.002) discard;
  gl_FragColor = vec4(color3 * alpha, total);
}
`;

const createStream = (
  root: HTMLElement,
  stage: HTMLElement,
  overlay: Overlay,
  settingsRef: { current: Settings },
  itemsRef: { current: ContactSheetItem[] },
  callbacks: Callbacks,
): Controller | null => {
  const doc = root.ownerDocument;
  const view = doc.defaultView ?? window;
  const canvas = doc.createElement("canvas");
  canvas.style.cssText = "position:absolute;inset:0;width:100%;height:100%;display:block";
  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: false,
      premultipliedAlpha: true,
      powerPreference: "high-performance",
    });
  } catch {
    return null;
  }
  stage.appendChild(canvas);
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, -10, 10);
  const plane = new THREE.PlaneGeometry(1, 1);
  const blank = new THREE.DataTexture(new Uint8Array([128, 128, 128, 255]), 1, 1);
  blank.needsUpdate = true;
  const resolution = new THREE.Vector2(1, 1);
  const background = new THREE.Color(0x0a0a0a);
  const paper = new THREE.Color(0xffffff);
  const anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());

  const cards: Card[] = Array.from({ length: MAX_CARDS }, () => {
    const material = new THREE.ShaderMaterial({
      uniforms: {
        uImage: { value: blank as THREE.Texture },
        uImageAspect: { value: 0.8 },
        uSize: { value: new THREE.Vector2(100, 125) },
        uMargin: { value: 20 },
        uRadius: { value: 12 },
        uBorder: { value: 0 },
        uBorderColor: { value: paper },
        uRim: { value: 0.12 },
        uReveal: { value: 0 },
        uDevelop: { value: 0.85 },
        uAlpha: { value: 0 },
        uShadow: { value: 0.5 },
        uLift: { value: 0 },
        uBackground: { value: background },
        uResolution: { value: resolution },
        uEdge: { value: 0 },
      },
      vertexShader,
      fragmentShader,
      transparent: true,
      premultipliedAlpha: true,
      depthTest: false,
      depthWrite: false,
    });
    const mesh = new THREE.Mesh(plane, material);
    mesh.frustumCulled = false;
    mesh.visible = false;
    scene.add(mesh);
    return {
      mesh,
      w: 1,
      rho0: 0.2,
      theta: 0,
      scale: 1,
      roll: 0,
      image: 0,
      grip: 0,
      x: 0,
      y: 0,
      sw: 0,
      sh: 0,
      rot: 0,
      alpha: 0,
      reveal: 0,
      shown: false,
    };
  });

  let pictures: Picture[] = [];
  let itemsKey = "";
  let width = 0;
  let height = 0;
  let dpr = 1;
  let sized = false;
  let seeded = false;
  let phi = 0;
  let spinVelocity = 0;
  let zoomVelocity = 0;
  let pendingZoom = 0;
  let inside = 0;
  let pointerInside = false;
  let pointerX = 0;
  let pointerY = 0;
  let hovered = -1;
  let openId = -1;
  let openTarget = 0;
  let openT = 0;
  let openV = 0;
  let shownCaption = -1;
  let captionOpacity = -1;
  let captionTop = Number.NaN;
  let raf = 0;
  let last = 0;
  let visible = false;
  let destroyed = false;
  let lost = false;
  let consumed = false;
  let clock = 0;
  let order: Card[] = [];
  let press: {
    id: number;
    x: number;
    y: number;
    moved: boolean;
    radius: number;
    angle: number;
    samples: { t: number; zoom: number; angle: number }[];
  } | null = null;

  let seed = (Math.random() * 4294967296) | 0;
  const random = () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  const count = () => clamp(Math.round(settingsRef.current.count), 1, MAX_CARDS);
  const halfDiagonal = () => Math.hypot(width, height) / 2;
  const minSide = () => Math.min(width, height);

  const loadPictures = () => {
    const items = itemsRef.current;
    const key = items.map((item) => item.src).join("\u0000");
    if (key === itemsKey) return;
    itemsKey = key;
    pictures.forEach((picture) => {
      picture.image.onload = null;
      picture.texture.dispose();
    });
    pictures = items.map((item) => {
      const image = new Image();
      image.crossOrigin = "anonymous";
      image.decoding = "async";
      const texture = new THREE.Texture(image);
      texture.colorSpace = THREE.NoColorSpace;
      texture.minFilter = THREE.LinearMipmapLinearFilter;
      texture.magFilter = THREE.LinearFilter;
      texture.generateMipmaps = true;
      texture.anisotropy = anisotropy;
      const picture: Picture = {
        image,
        texture,
        aspect: 0.8,
        ready: false,
        uploaded: false,
        fade: 0,
        used: -1,
      };
      image.onload = () => {
        if (destroyed) return;
        const finish = () => {
          if (destroyed || picture.ready) return;
          picture.aspect = image.naturalWidth / Math.max(image.naturalHeight, 1);
          picture.ready = true;
          texture.needsUpdate = true;
          schedule();
        };
        image.decode().then(finish, finish);
      };
      image.src = item.src;
      return picture;
    });
    for (const card of cards) card.image = Math.floor(random() * Math.max(pictures.length, 1));
    openId = -1;
    openTarget = 0;
    openT = 0;
  };

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
    resolution.set(width * dpr, height * dpr);
    camera.left = -width / 2;
    camera.right = width / 2;
    camera.top = height / 2;
    camera.bottom = -height / 2;
    camera.updateProjectionMatrix();
    return true;
  };

  const readBackground = () => {
    const value = settingsRef.current.backgroundColor;
    if (parseColor(value)) {
      background.setStyle(value, THREE.NoColorSpace);
      return;
    }
    let node: HTMLElement | null = root;
    while (node) {
      const fill = view.getComputedStyle(node).backgroundColor;
      if (fill && fill !== "transparent" && !/rgba\([^)]*,\s*0\)$/.test(fill)) {
        background.setStyle(fill, THREE.NoColorSpace);
        return;
      }
      node = node.parentElement;
    }
    const ink = new THREE.Color();
    ink.setStyle(view.getComputedStyle(root).color || "#fff", THREE.NoColorSpace);
    background.setHex(ink.r + ink.g + ink.b > 1.5 ? 0x0a0a0a : 0xffffff, THREE.NoColorSpace);
  };

  const syncColors = () => {
    readBackground();
    const value = settingsRef.current.borderColor;
    if (parseColor(value)) paper.setStyle(value, THREE.NoColorSpace);
  };

  const pickImage = () => {
    const n = pictures.length;
    if (!n) return 0;
    const onScreen = new Uint8Array(n);
    const active = count();
    for (let i = 0; i < active; i++) {
      const card = cards[i];
      if (card.shown && card.image < n) onScreen[card.image] += 1;
    }
    let best = 0;
    let score = Infinity;
    for (let k = 0; k < n; k++) {
      const picture = pictures[k];
      const candidate = onScreen[k] * 1000 + picture.used + random() * 0.5 + (picture.ready ? 0 : 500);
      if (candidate < score) {
        score = candidate;
        best = k;
      }
    }
    pictures[best].used = clock;
    return best;
  };

  const exitRadius = (card: Card, angle: number) => {
    const settings = settingsRef.current;
    const R = halfDiagonal();
    const c = Math.abs(Math.cos(angle));
    const s = Math.abs(Math.sin(angle));
    const reach = Math.min(c > 1e-4 ? width / 2 / c : Infinity, s > 1e-4 ? height / 2 / s : Infinity);
    const aspect = clamp(settings.aspect, 0.4, 2.5);
    const grow = 2 * clamp(settings.size, 0.03, 0.8) * minSide() * card.scale * 0.5 * Math.hypot(aspect, 1) * 1.05;
    const room = R - grow;
    return room > R * 0.08 ? reach / room : 1.6;
  };

  const pickAngle = (w = 1) => {
    const active = count();
    let best = random() * TAU;
    let bestScore = -1;
    for (let k = 0; k < 12; k++) {
      const angle = random() * TAU;
      let nearest = TAU;
      for (let i = 0; i < active; i++) {
        const card = cards[i];
        if (!card.shown) continue;
        const near = Math.abs(Math.log(Math.max(card.w, 1e-4) / Math.max(w, 1e-4)));
        if (near > 0.9) continue;
        const delta = Math.abs(Math.atan2(Math.sin(angle - card.theta - phi), Math.cos(angle - card.theta - phi)));
        nearest = Math.min(nearest, delta + near * 0.9);
      }
      if (nearest > bestScore) {
        bestScore = nearest;
        best = angle;
      }
    }
    return best;
  };

  const respawn = (card: Card, inward: boolean, w = 1) => {
    const settings = settingsRef.current;
    card.theta = pickAngle(w) - phi;
    card.rho0 = clamp(settings.blankArea, 0.02, 0.7) * (1 + random() * 0.45);
    card.scale = 1 + clamp(settings.sizeVariance, 0, 0.9) * (random() * 2 - 1);
    card.roll = random() * 2 - 1;
    card.image = pickImage();
    card.grip = 0;
    if (inward) {
      const out = exitRadius(card, card.theta + phi);
      card.w = clamp(card.rho0 / out, 1e-3, 0.999);
    } else {
      card.w = 1;
    }
  };

  const seedCard = (card: Card, fraction: number) => {
    const rush = clamp(settingsRef.current.rush, 0, 1);
    const R = halfDiagonal();
    const typicalOut = (width + height) / 4 / Math.max(R * 0.9, 1);
    const typicalEnd = clamp((clamp(settingsRef.current.blankArea, 0.02, 0.7) * 1.22) / Math.max(typicalOut, 0.05), 0.05, 0.95);
    const lifeGuess = rush < 1e-3 ? Math.log(1 / typicalEnd) : (1 - Math.pow(typicalEnd, rush)) / rush;
    card.shown = false;
    respawn(card, false, advance(1, lifeGuess * fraction, rush));
    const out = exitRadius(card, card.theta + phi);
    const wEnd = clamp(card.rho0 / out, 1e-3, 1);
    const life = rush < 1e-3 ? Math.log(1 / wEnd) : (1 - Math.pow(wEnd, rush)) / rush;
    card.w = advance(1, life * fraction, rush);
    card.shown = true;
  };

  const seedStream = () => {
    const active = count();
    for (let i = 0; i < MAX_CARDS; i++) cards[i].shown = false;
    for (let i = 0; i < active; i++) seedCard(cards[i], (i + random() * 0.85) / active);
    seeded = true;
  };

  const schedule = () => {
    if (destroyed || lost || !visible || raf) return;
    raf = requestAnimationFrame(frame);
  };

  const open = (index?: number) => {
    let id = -1;
    if (typeof index === "number" && pictures.length) {
      const target = ((Math.round(index) % pictures.length) + pictures.length) % pictures.length;
      let best = -1;
      for (const card of order) {
        if (card.image === target && card.alpha > 0.2) best = cards.indexOf(card);
      }
      if (best < 0) {
        let biggest = -1;
        let size = -1;
        for (let i = 0; i < count(); i++) {
          if (cards[i].shown && cards[i].sh > size) {
            size = cards[i].sh;
            biggest = i;
          }
        }
        if (biggest >= 0) cards[biggest].image = target;
        best = biggest;
      }
      id = best;
    } else {
      let score = -Infinity;
      for (let i = 0; i < count(); i++) {
        const card = cards[i];
        if (!card.shown || card.alpha < 0.3) continue;
        const value = card.sh - Math.hypot(card.x - width / 2, card.y - height / 2) * 0.2;
        if (value > score) {
          score = value;
          id = i;
        }
      }
    }
    if (id < 0) return;
    openId = id;
    openTarget = 1;
    cards[id].grip = 1;
    callbacks.onOpen(cards[id].image);
    schedule();
  };

  const close = () => {
    if (openId < 0 || openTarget === 0) return;
    openTarget = 0;
    callbacks.onClose();
    schedule();
  };

  const boost = (amount: number) => {
    pendingZoom += clamp(amount, -4, 4);
    schedule();
  };

  const uploadOne = () => {
    let best: Picture | null = null;
    let bestUse = Infinity;
    for (const card of cards) {
      if (!card.shown) continue;
      const picture = pictures[card.image];
      if (picture && picture.ready && !picture.uploaded && card.w < bestUse) {
        bestUse = card.w;
        best = picture;
      }
    }
    if (!best) {
      for (const picture of pictures) {
        if (picture.ready && !picture.uploaded) {
          best = picture;
          break;
        }
      }
    }
    if (!best) return false;
    renderer.initTexture(best.texture);
    best.uploaded = true;
    return true;
  };

  const focusRect = (card: Card) => {
    const settings = settingsRef.current;
    const picture = pictures[card.image];
    const aspect = picture ? picture.aspect : clamp(settings.aspect, 0.4, 2.5);
    const reserve = settings.captions ? CAPTION_SPACE : 0;
    const room = Math.max(height - reserve, height * 0.6);
    let fh = room * 0.74;
    if (fh * aspect > width * 0.86) fh = (width * 0.86) / aspect;
    return { x: width / 2, y: (height - reserve) / 2 + 6, w: fh * aspect, h: fh, aspect };
  };

  function frame(time: number) {
    raf = 0;
    if (destroyed || lost) return;
    if (!sized) {
      readSize();
      if (!sized) return;
    }
    const settings = settingsRef.current;
    const dt = last && time - last < 100 ? Math.min(Math.max((time - last) / 1000, 0), 0.05) : 1 / 60;
    last = time;
    clock += dt;
    const reduced = settings.reduced;
    let busy = false;

    if (Math.floor(clock / 1.2) !== Math.floor((clock - dt) / 1.2)) syncColors();
    readSize();
    if (!seeded) seedStream();
    if (uploadOne()) busy = true;
    for (const picture of pictures) {
      if (picture.uploaded && picture.fade < 1) {
        picture.fade = reduced ? 1 : Math.min(1, picture.fade + dt / 0.6);
        busy = true;
      }
    }

    const active = count();
    for (let i = active; i < MAX_CARDS; i++) {
      if (cards[i].shown) {
        cards[i].shown = false;
        cards[i].mesh.visible = false;
      }
    }
    for (let i = 0; i < active; i++) {
      if (!cards[i].shown) seedCard(cards[i], random() * 0.92);
    }

    const rush = clamp(settings.rush, 0, 1);
    const target = pointerInside && !press ? 1 : 0;
    inside += (target - inside) * (1 - Math.exp(-dt / (target > inside ? 0.35 : 0.6)));
    const stopped = settings.paused || settings.held || reduced;
    const cruise = stopped ? 0 : settings.speed;
    const slow = 1 - clamp(settings.hoverSlow, 0, 1) * inside * (settings.catchOnHover ? 1 : 0.6);

    [openT, openV] = springTo(openT, openV, openTarget, dt, reduced ? 0.06 : 0.62, 0.88);
    if (Math.abs(openT - openTarget) > 1e-4 || Math.abs(openV) > 1e-4) busy = true;
    else {
      openT = openTarget;
      openV = 0;
      if (openTarget === 0 && openId >= 0) {
        openId = -1;
      }
    }
    const calm = 1 - 0.9 * openT;

    const zoomStep = pendingZoom * (1 - Math.exp(-dt / (reduced ? 0.04 : 0.18)));
    pendingZoom -= zoomStep;
    if (Math.abs(pendingZoom) < 1e-5) pendingZoom = 0;
    else busy = true;
    if (!press || !press.moved) {
      zoomVelocity *= Math.exp(-dt / (reduced ? 0.05 : 0.7));
      spinVelocity *= Math.exp(-dt / (reduced ? 0.05 : 1.1));
    }
    if (Math.abs(zoomVelocity) < 1e-4) zoomVelocity = 0;
    if (Math.abs(spinVelocity) < 1e-4) spinVelocity = 0;
    if (zoomVelocity || spinVelocity) busy = true;
    if (!press || !press.moved) phi += spinVelocity * dt;

    const flow = cruise * slow * calm;
    const extra = zoomStep + (press && press.moved ? 0 : zoomVelocity * dt);
    if (flow !== 0) busy = true;

    const R = halfDiagonal();
    const side = minSide();
    const aspect = clamp(settings.aspect, 0.4, 2.5);
    const baseSize = 2 * clamp(settings.size, 0.03, 0.8) * side;
    const spiral = settings.spiral;
    const rollMax = (clamp(settings.roll, 0, 30) * Math.PI) / 180;
    const maxDim = Math.max(width, height);

    for (let i = 0; i < active; i++) {
      const card = cards[i];
      const held = i === openId;
      const gripTarget = held ? 1 : settings.catchOnHover && i === hovered ? 1 : 0;
      card.grip += (gripTarget - card.grip) * (1 - Math.exp(-dt / (gripTarget > card.grip ? 0.16 : 0.5)));
      if (Math.abs(card.grip - gripTarget) < 1e-3) card.grip = gripTarget;
      else busy = true;
      if (!held) {
        const travel = flow * (1 - card.grip) * dt + extra * (1 - card.grip * 0.85);
        if (travel !== 0) card.w = advance(card.w, travel, rush);
      }
      const rho = card.rho0 / card.w;
      const angle = card.theta + phi + spiral * Math.log(Math.max(rho / card.rho0, 1e-4));
      const s = baseSize * rho * card.scale;
      card.sh = s;
      card.sw = s * aspect;
      card.x = width / 2 + Math.cos(angle) * rho * R;
      card.y = height / 2 + Math.sin(angle) * rho * R;
      card.rot = rollMax * card.roll;
      const out = exitRadius(card, angle);
      if (!held && rho > out && card.grip < 0.5) {
        respawn(card, false);
        continue;
      }
      if (!held && card.w > 1.0001) {
        respawn(card, true);
        continue;
      }
      const picture = pictures[card.image];
      const developing = smooth(card.rho0, card.rho0 * 1.5, rho);
      card.reveal = Math.max(developing, card.grip);
      const giant = 1 - smooth(maxDim * 0.7, maxDim * 1.05, card.sh);
      card.alpha = (picture ? picture.fade : 0) * giant;
    }

    order = cards.slice(0, active).sort((a, b) => b.w - a.w);
    if (pointerInside && !press) refreshHover();

    const focus = openId >= 0 ? cards[openId] : null;
    const rect = focus ? focusRect(focus) : null;
    const ease = openT;
    const rimAmount = clamp(settings.rim, 0, 1);
    const borderPx = clamp(settings.border, 0, 0.3);
    const radiusPx = Math.max(0, settings.radius);
    const developAmount = clamp(settings.develop, 0, 1);
    const shadowAmount = clamp(settings.shadow, 0, 1);
    const edgePx = clamp(settings.edgeFade, 0, 1) * side * 0.22 * dpr;

    for (let k = 0; k < order.length; k++) {
      const card = order[k];
      const mesh = card.mesh;
      const isFocus = card === focus;
      let x = card.x;
      let y = card.y;
      let w = card.sw;
      let h = card.sh;
      let rot = card.rot;
      let alpha = card.alpha * (isFocus ? 1 : 1 - 0.72 * ease);
      let reveal = card.reveal;
      let lift = card.grip;
      let radius = radiusPx * Math.min(1, card.sh / Math.max(baseSize * 0.5, 1));
      let imageAspect = pictures[card.image]?.aspect ?? aspect;
      if (isFocus && rect) {
        x += (rect.x - x) * ease;
        y += (rect.y - y) * ease;
        w += (rect.w - w) * ease;
        h += (rect.h - h) * ease;
        rot *= 1 - ease;
        alpha = Math.max(alpha, ease);
        reveal = 1;
        lift = 1;
        radius += (Math.max(radiusPx, 10) - radius) * ease;
        imageAspect = rect.aspect;
      }
      const visibleCard = alpha > 0.003 && w > 0.5;
      mesh.visible = visibleCard;
      if (!visibleCard) continue;
      const scale = 1 + 0.05 * card.grip * (1 - (isFocus ? ease : 0));
      w *= scale;
      h *= scale;
      const margin = Math.max(8, h * 0.22);
      mesh.position.set(x - width / 2, height / 2 - y, 0);
      mesh.rotation.set(0, 0, -rot);
      mesh.scale.set(w + 2 * margin, h + 2 * margin, 1);
      mesh.renderOrder = isFocus ? 10000 : k;
      const u = mesh.material.uniforms;
      const picture = pictures[card.image];
      u.uImage.value = picture?.uploaded ? picture.texture : blank;
      u.uImageAspect.value = imageAspect;
      u.uSize.value.set(w, h);
      u.uMargin.value = margin;
      u.uRadius.value = radius;
      u.uBorder.value = borderPx * Math.min(w, h);
      u.uRim.value = rimAmount * (0.6 + 0.4 * lift);
      u.uReveal.value = reveal;
      u.uDevelop.value = developAmount;
      u.uAlpha.value = alpha;
      u.uShadow.value = shadowAmount;
      u.uLift.value = lift;
      u.uEdge.value = isFocus ? edgePx * (1 - ease) : edgePx;
    }

    paintCaption(focus, rect, ease);
    renderer.render(scene, camera);

    if (busy || press || pointerInside || flow !== 0) schedule();
  }

  function paintCaption(focus: Card | null, rect: ReturnType<typeof focusRect> | null, ease: number) {
    const settings = settingsRef.current;
    if (!settings.captions || !focus || !rect) {
      if (captionOpacity !== 0) {
        captionOpacity = 0;
        overlay.caption.style.opacity = "0";
      }
      return;
    }
    if (focus.image !== shownCaption) {
      shownCaption = focus.image;
      const item = itemsRef.current[focus.image];
      overlay.title.textContent = item ? item.title ?? item.alt : "";
      overlay.subtitle.textContent = item?.subtitle ?? "";
      overlay.subtitle.style.display = item?.subtitle ? "" : "none";
    }
    const top = rect.y + rect.h / 2 + 22;
    if (Number.isNaN(captionTop) || Math.abs(top - captionTop) > 0.25) {
      captionTop = top;
      overlay.caption.style.top = `${top.toFixed(2)}px`;
    }
    const opacity = smooth(0.55, 1, ease);
    if (Math.abs(opacity - captionOpacity) > 0.002) {
      captionOpacity = opacity;
      overlay.caption.style.opacity = opacity.toFixed(3);
      overlay.caption.style.transform = `translate3d(0, ${((1 - opacity) * 8).toFixed(2)}px, 0)`;
    }
  }

  const hitTest = (px: number, py: number) => {
    for (let k = order.length - 1; k >= 0; k--) {
      const card = order[k];
      if (!card.mesh.visible || card.alpha < 0.3 || card.reveal < 0.45) continue;
      const dx = px - card.x;
      const dy = py - card.y;
      const c = Math.cos(-card.rot);
      const s = Math.sin(-card.rot);
      const lx = dx * c - dy * s;
      const ly = dx * s + dy * c;
      const pad = card.grip * 6;
      if (Math.abs(lx) <= card.sw / 2 + pad && Math.abs(ly) <= card.sh / 2 + pad) return cards.indexOf(card);
    }
    return -1;
  };

  function refreshHover() {
    if (openTarget > 0) {
      hovered = -1;
      if (root.style.cursor !== "pointer") root.style.cursor = "pointer";
      return;
    }
    const next = hitTest(pointerX, pointerY);
    hovered = next;
    const cursor = next >= 0 ? "pointer" : settingsRef.current.draggable ? "grab" : "";
    if (root.style.cursor !== cursor) root.style.cursor = cursor;
  }

  const local = (event: PointerEvent | MouseEvent) => {
    const rect = root.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  };

  const onMove = (event: PointerEvent) => {
    const point = local(event);
    if (event.pointerType !== "touch") {
      pointerInside = true;
      pointerX = point.x;
      pointerY = point.y;
    }
    if (press && press.id === event.pointerId) {
      const dx = point.x - width / 2;
      const dy = point.y - height / 2;
      const radius = Math.max(Math.hypot(dx, dy), minSide() * 0.08);
      const angle = Math.atan2(dy, dx);
      if (!press.moved && Math.hypot(event.clientX - press.x, event.clientY - press.y) > 6) {
        press.moved = true;
        hovered = -1;
        root.style.cursor = "grabbing";
        zoomVelocity = 0;
        spinVelocity = 0;
        try {
          stage.setPointerCapture(event.pointerId);
        } catch {}
      }
      if (press.moved) {
        const zoom = clamp(Math.log(radius / press.radius), -0.3, 0.3);
        const turn = Math.atan2(Math.sin(angle - press.angle), Math.cos(angle - press.angle));
        const rush = clamp(settingsRef.current.rush, 0, 1);
        for (let i = 0; i < count(); i++) {
          if (i === openId) continue;
          cards[i].w = advance(cards[i].w, zoom, rush);
        }
        phi += turn;
        press.radius = radius;
        press.angle = angle;
        const t = performance.now();
        press.samples.push({ t, zoom, angle: turn });
        while (press.samples.length > 2 && t - press.samples[0].t > 110) press.samples.shift();
      }
    }
    schedule();
  };

  const onDown = (event: PointerEvent) => {
    if (!event.isPrimary || event.button > 0) return;
    consumed = false;
    if (!settingsRef.current.draggable) return;
    const point = local(event);
    const dx = point.x - width / 2;
    const dy = point.y - height / 2;
    press = {
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      moved: false,
      radius: Math.max(Math.hypot(dx, dy), minSide() * 0.08),
      angle: Math.atan2(dy, dx),
      samples: [],
    };
    schedule();
  };

  const finish = (event: PointerEvent) => {
    if (!press || press.id !== event.pointerId) return;
    const ended = press;
    press = null;
    try {
      if (stage.hasPointerCapture(event.pointerId)) stage.releasePointerCapture(event.pointerId);
    } catch {}
    if (ended.moved) {
      consumed = true;
      const t = performance.now();
      const recent = ended.samples.filter((sample) => t - sample.t < 110);
      if (recent.length && t - recent[recent.length - 1].t < 60 && !settingsRef.current.reduced) {
        const span = Math.max((t - recent[0].t) / 1000, 1 / 60);
        const zoom = recent.reduce((sum, sample) => sum + sample.zoom, 0);
        const turn = recent.reduce((sum, sample) => sum + sample.angle, 0);
        zoomVelocity = clamp(zoom / span, -3, 3);
        spinVelocity = clamp(turn / span, -4, 4);
      }
      root.style.cursor = settingsRef.current.draggable ? "grab" : "";
    }
    schedule();
  };

  const onClick = (event: MouseEvent) => {
    if (consumed) {
      consumed = false;
      return;
    }
    if (openTarget > 0) {
      close();
      return;
    }
    const point = local(event);
    const hit = hitTest(point.x, point.y);
    if (hit >= 0) {
      openId = hit;
      openTarget = 1;
      cards[hit].grip = 1;
      callbacks.onOpen(cards[hit].image);
      schedule();
    }
  };

  const onLeave = (event: PointerEvent) => {
    if (press && press.id === event.pointerId) return;
    pointerInside = false;
    hovered = -1;
    root.style.cursor = "";
    schedule();
  };

  const onWheel = (event: WheelEvent) => {
    if (!settingsRef.current.wheel) return;
    event.preventDefault();
    if (openTarget > 0) {
      close();
      return;
    }
    const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? height : 1;
    const delta = clamp((Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY) * unit, -240, 240);
    pendingZoom += delta * 0.0024;
    schedule();
  };

  const onKey = (event: KeyboardEvent) => {
    if (event.target !== root) return;
    if (event.key === "ArrowUp" || event.key === "ArrowRight") {
      event.preventDefault();
      boost(0.32);
    } else if (event.key === "ArrowDown" || event.key === "ArrowLeft") {
      event.preventDefault();
      boost(-0.32);
    } else if (event.key === "Enter") {
      event.preventDefault();
      if (openTarget > 0) close();
      else open();
    } else if (event.key === "Escape" && openTarget > 0) {
      event.preventDefault();
      close();
    }
  };

  stage.addEventListener("pointerdown", onDown);
  stage.addEventListener("pointermove", onMove);
  stage.addEventListener("pointerup", finish);
  stage.addEventListener("pointercancel", finish);
  stage.addEventListener("pointerleave", onLeave);
  stage.addEventListener("click", onClick);
  stage.addEventListener("wheel", onWheel, { passive: false });
  root.addEventListener("keydown", onKey);

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
    itemsKey = "";
    loadPictures();
    schedule();
  };
  canvas.addEventListener("webglcontextlost", onLost);
  canvas.addEventListener("webglcontextrestored", onRestored);

  readSize();
  syncColors();
  cards[0].mesh.visible = true;
  renderer.compile(scene, camera);
  cards[0].mesh.visible = false;
  loadPictures();
  schedule();

  return {
    sync: () => {
      readSize();
      syncColors();
      loadPictures();
      shownCaption = -1;
      schedule();
    },
    boost,
    open,
    close,
    destroy: () => {
      destroyed = true;
      if (raf) cancelAnimationFrame(raf);
      observer?.disconnect();
      resizer.disconnect();
      stage.removeEventListener("pointerdown", onDown);
      stage.removeEventListener("pointermove", onMove);
      stage.removeEventListener("pointerup", finish);
      stage.removeEventListener("pointercancel", finish);
      stage.removeEventListener("pointerleave", onLeave);
      stage.removeEventListener("click", onClick);
      stage.removeEventListener("wheel", onWheel);
      root.removeEventListener("keydown", onKey);
      root.style.cursor = "";
      canvas.removeEventListener("webglcontextlost", onLost);
      canvas.removeEventListener("webglcontextrestored", onRestored);
      pictures.forEach((picture) => {
        picture.image.onload = null;
        picture.texture.dispose();
      });
      cards.forEach((card) => card.mesh.material.dispose());
      blank.dispose();
      plane.dispose();
      renderer.dispose();
      if (!renderer.getContext().isContextLost()) renderer.forceContextLoss();
      canvas.remove();
    },
  };
};

export const ContactSheet = forwardRef<ContactSheetHandle, ContactSheetProps>(function ContactSheet(
  {
    items = defaultItems,
    count = 18,
    speed = 0.1,
    rush = 0.35,
    spiral = 0,
    blankArea = 0.2,
    size = 0.17,
    sizeVariance = 0.25,
    aspect = 0.8,
    radius = 12,
    border = 0,
    borderColor = "#FFFFFF",
    rim = 0.12,
    roll = 0,
    develop = 0.85,
    edgeFade = 0.35,
    shadow = 0.5,
    hoverSlow = 0.6,
    catchOnHover = true,
    draggable = true,
    wheel = true,
    captions = true,
    backgroundColor = "transparent",
    paused = false,
    dpr = 2,
    ariaLabel = "Contact sheet. Photos stream outward from the center. Scroll or drag to move through them, click a photo to open it.",
    onOpen,
    onClose,
    className,
    style,
  },
  ref,
) {
  const rootRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const captionRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLSpanElement>(null);
  const subtitleRef = useRef<HTMLSpanElement>(null);
  const controllerRef = useRef<Controller | null>(null);
  const reduced = useSyncExternalStore(subscribeToMotion, readMotion, () => false);
  const list = items.length ? items : defaultItems;
  const itemsRef = useRef(list);
  const [held, setHeld] = useState(false);
  const [openIndex, setOpenIndex] = useState(-1);
  const [failed, setFailed] = useState(false);

  const settings: Settings = {
    count,
    speed,
    rush,
    spiral,
    blankArea,
    size,
    sizeVariance,
    aspect,
    radius,
    border,
    borderColor,
    rim,
    roll,
    develop,
    edgeFade,
    shadow,
    hoverSlow,
    catchOnHover,
    draggable,
    wheel,
    captions,
    backgroundColor,
    paused,
    dpr,
    reduced,
    held,
  };
  const settingsRef = useRef(settings);
  const callbacksRef = useRef({ onOpen, onClose });

  useEffect(() => {
    settingsRef.current = settings;
    itemsRef.current = list;
    callbacksRef.current = { onOpen, onClose };
    controllerRef.current?.sync();
  });

  useEffect(() => {
    const root = rootRef.current;
    const stage = stageRef.current;
    const caption = captionRef.current;
    const title = titleRef.current;
    const subtitle = subtitleRef.current;
    if (!root || !stage || !caption || !title || !subtitle) return;
    const controller = createStream(root, stage, { caption, title, subtitle }, settingsRef, itemsRef, {
      onOpen: (index) => {
        setOpenIndex(index);
        const item = itemsRef.current[index];
        if (item) callbacksRef.current.onOpen?.(item, index);
      },
      onClose: () => {
        setOpenIndex(-1);
        callbacksRef.current.onClose?.();
      },
    });
    if (!controller) {
      const frame = requestAnimationFrame(() => setFailed(true));
      return () => cancelAnimationFrame(frame);
    }
    controllerRef.current = controller;
    return () => {
      controller.destroy();
      controllerRef.current = null;
    };
  }, []);

  useImperativeHandle(
    ref,
    () => ({
      boost: (amount: number) => controllerRef.current?.boost(amount),
      open: (index?: number) => controllerRef.current?.open(index),
      close: () => controllerRef.current?.close(),
    }),
    [],
  );

  const backgroundValue = backgroundColor.trim().toLowerCase();
  const transparent = backgroundValue === "transparent" || backgroundValue === "";
  const light = !transparent && isLight(backgroundValue);
  const ink = transparent ? "currentColor" : light ? "#0a0a0a" : "#fafafa";
  const opened = openIndex >= 0 ? list[openIndex] : null;

  return (
    <div
      ref={rootRef}
      className={["cs-root", className].filter(Boolean).join(" ")}
      style={{ backgroundColor: transparent ? undefined : backgroundColor, color: ink, ...style }}
      role="region"
      aria-roledescription="gallery"
      aria-label={ariaLabel}
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === " " && event.target === event.currentTarget) {
          event.preventDefault();
          setHeld((value) => !value);
        }
      }}
    >
      <div ref={stageRef} style={stageStyle} />
      {failed ? (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(96px, 1fr))",
            gap: 12,
            padding: 24,
            alignContent: "center",
          }}
        >
          {list.slice(0, 12).map((item, index) => (
            <img
              key={`${item.src}-${index}`}
              src={item.src}
              alt={item.alt}
              style={{ width: "100%", aspectRatio: String(aspect), objectFit: "cover", borderRadius: radius }}
            />
          ))}
        </div>
      ) : null}
      <ul style={hiddenStyle}>
        {list.map((item, index) => (
          <li key={`${item.src}-${index}`}>
            {item.title ? `${item.title}${item.subtitle ? `, ${item.subtitle}` : ""}` : item.alt}
          </li>
        ))}
      </ul>
      <div aria-live="polite" style={hiddenStyle}>
        {opened ? `Opened ${opened.title ?? opened.alt}` : ""}
      </div>
      <div ref={captionRef} aria-hidden="true" style={captionStyle}>
        <span ref={titleRef} style={titleStyle} />
        <span ref={subtitleRef} style={subtitleStyle} />
      </div>
    </div>
  );
});

ContactSheet.displayName = "ContactSheet";

export default ContactSheet;
