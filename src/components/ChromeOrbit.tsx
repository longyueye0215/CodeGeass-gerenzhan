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
import "./ChromeOrbit.css";

export type ChromeOrbitStudio = "dark" | "light";

export interface ChromeOrbitHandle {
  align: () => void;
  release: () => void;
  replay: () => void;
}

export interface ChromeOrbitProps {
  colors?: [string, string];
  studio?: ChromeOrbitStudio;
  rings?: number;
  size?: number;
  spacing?: number;
  bandWidth?: number;
  bandThickness?: number;
  roughness?: number;
  iridescence?: number;
  speed?: number;
  tilt?: number;
  lightDrift?: number;
  offsetX?: number;
  offsetY?: number;
  interactive?: boolean;
  parallax?: number;
  clickAlign?: boolean;
  alignHold?: number;
  haloTilt?: number;
  intro?: boolean;
  paused?: boolean;
  quality?: number;
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
}

interface Settings {
  colors: [string, string];
  studio: ChromeOrbitStudio;
  rings: number;
  size: number;
  spacing: number;
  bandWidth: number;
  bandThickness: number;
  roughness: number;
  iridescence: number;
  speed: number;
  tilt: number;
  lightDrift: number;
  offsetX: number;
  offsetY: number;
  interactive: boolean;
  parallax: number;
  clickAlign: boolean;
  alignHold: number;
  haloTilt: number;
  intro: boolean;
  paused: boolean;
  quality: number;
  reduced: boolean;
}

interface Controller {
  sync: () => void;
  destroy: () => void;
  align: () => void;
  release: () => void;
  replay: () => void;
}

interface Ring {
  pivot: THREE.Group;
  mesh: THREE.Mesh;
  axis: THREE.Vector3;
  angle: number;
  rate: number;
  base: number;
}

const FOV = 30;
const TAU = Math.PI * 2;

const subscribeToMotion = (notify: () => void) => {
  const media = window.matchMedia("(prefers-reduced-motion: reduce)");
  media.addEventListener("change", notify);
  return () => media.removeEventListener("change", notify);
};

const readMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const safeColor = (value: string, fallback: string) => {
  const color = new THREE.Color();
  try {
    color.setStyle(value);
    return color;
  } catch {
    return color.setStyle(fallback);
  }
};

const bandGeometry = (radius: number, width: number, thickness: number, segments: number) => {
  const corner = Math.min(width, thickness) * 0.42;
  const halfT = thickness / 2;
  const halfW = width / 2;
  const profile: { u: number; v: number; nu: number; nv: number }[] = [];
  const centres: [number, number, number][] = [
    [halfT - corner, halfW - corner, 0],
    [-halfT + corner, halfW - corner, Math.PI / 2],
    [-halfT + corner, -halfW + corner, Math.PI],
    [halfT - corner, -halfW + corner, (3 * Math.PI) / 2],
  ];
  const steps = 5;
  centres.forEach(([cu, cv, start]) => {
    for (let k = 0; k <= steps; k++) {
      const a = start + (k / steps) * (Math.PI / 2);
      profile.push({ u: cu + Math.cos(a) * corner, v: cv + Math.sin(a) * corner, nu: Math.cos(a), nv: Math.sin(a) });
    }
  });
  const rows = profile.length;
  const positions = new Float32Array((segments + 1) * rows * 3);
  const normals = new Float32Array((segments + 1) * rows * 3);
  for (let i = 0; i <= segments; i++) {
    const a = (i / segments) * TAU;
    const c = Math.cos(a);
    const s = Math.sin(a);
    profile.forEach((point, j) => {
      const k = (i * rows + j) * 3;
      const r = radius + point.u;
      positions[k] = c * r;
      positions[k + 1] = s * r;
      positions[k + 2] = point.v;
      normals[k] = c * point.nu;
      normals[k + 1] = s * point.nu;
      normals[k + 2] = point.nv;
    });
  }
  const indices: number[] = [];
  for (let i = 0; i < segments; i++) {
    for (let j = 0; j < rows; j++) {
      const a = i * rows + j;
      const b = i * rows + ((j + 1) % rows);
      const c = (i + 1) * rows + j;
      const d = (i + 1) * rows + ((j + 1) % rows);
      indices.push(a, c, b, b, c, d);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("normal", new THREE.BufferAttribute(normals, 3));
  geometry.setIndex(indices);
  return geometry;
};

const buildEnvironment = (renderer: THREE.WebGLRenderer, settings: Settings) => {
  const light = settings.studio === "light";
  const scene = new THREE.Scene();
  const disposables: { dispose: () => void }[] = [];
  const roomGeometry = new THREE.SphereGeometry(14, 48, 24);
  const shades = new Float32Array(roomGeometry.attributes.position.count * 3);
  const top = light ? new THREE.Color(0.9, 0.89, 0.94) : new THREE.Color(0.075, 0.07, 0.095);
  const horizon = light ? new THREE.Color(0.3, 0.29, 0.36) : new THREE.Color(0.018, 0.016, 0.024);
  const bottom = light ? new THREE.Color(0.06, 0.055, 0.08) : new THREE.Color(0.004, 0.004, 0.006);
  const mixed = new THREE.Color();
  for (let i = 0; i < roomGeometry.attributes.position.count; i++) {
    const y = roomGeometry.attributes.position.getY(i) / 14;
    if (y > 0) mixed.copy(horizon).lerp(top, Math.pow(y, 0.7));
    else mixed.copy(horizon).lerp(bottom, Math.pow(-y, 0.6));
    shades[i * 3] = mixed.r;
    shades[i * 3 + 1] = mixed.g;
    shades[i * 3 + 2] = mixed.b;
  }
  roomGeometry.setAttribute("color", new THREE.BufferAttribute(shades, 3));
  const roomMaterial = new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide });
  disposables.push(roomGeometry, roomMaterial);
  scene.add(new THREE.Mesh(roomGeometry, roomMaterial));
  const origin = new THREE.Vector3();
  const panel = (color: THREE.Color, intensity: number, w: number, h: number, x: number, y: number, z: number) => {
    const geometry = new THREE.PlaneGeometry(w, h);
    const material = new THREE.MeshBasicMaterial({ color: color.clone().multiplyScalar(intensity), side: THREE.DoubleSide });
    disposables.push(geometry, material);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, y, z);
    mesh.lookAt(origin);
    scene.add(mesh);
  };
  const white = new THREE.Color(1, 1, 1);
  const gelA = safeColor(settings.colors[0], "#7B5CFF");
  const gelB = safeColor(settings.colors[1], "#FF7AD9");
  panel(white, light ? 2.6 : 6, 13, 5, -3, 8.5, 2);
  panel(white, light ? 2.2 : 4.5, 2.6, 18, 9.5, 0.5, -1);
  panel(white, light ? 1.6 : 3.2, 20, 1.6, 0, 3, 10.5);
  panel(white, light ? 1.2 : 2.2, 1.4, 14, -11, -1, 4);
  panel(white, light ? 0.8 : 1.2, 14, 2.4, 1, -10, -2);
  panel(gelA, light ? 1.4 : 2.4, 6, 8, -10, -2, -4);
  panel(gelB, light ? 1.4 : 2.2, 7, 4, 5, -8.5, 5);
  const pmrem = new THREE.PMREMGenerator(renderer);
  const target = pmrem.fromScene(scene, 0.03);
  pmrem.dispose();
  disposables.forEach((item) => item.dispose());
  return target;
};

const createOrbit = (root: HTMLDivElement, settingsRef: { current: Settings }): Controller | null => {
  const canvas = document.createElement("canvas");
  canvas.setAttribute("aria-hidden", "true");
  canvas.style.position = "absolute";
  canvas.style.inset = "0";
  canvas.style.width = "100%";
  canvas.style.height = "100%";
  canvas.style.display = "block";
  canvas.style.pointerEvents = "none";
  root.prepend(canvas);

  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, alpha: true, premultipliedAlpha: true, antialias: true });
  } catch {
    canvas.remove();
    return null;
  }
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 100);
  const assembly = new THREE.Group();
  scene.add(assembly);
  let environment: THREE.WebGLRenderTarget | null = null;
  let environmentKey = "";
  let rings: Ring[] = [];
  let ringKey = "";
  const material = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    metalness: 1,
    roughness: 0.1,
    iridescence: 0.25,
    iridescenceIOR: 1.35,
    iridescenceThicknessRange: [180, 520],
    envMapIntensity: 1,
    side: THREE.DoubleSide,
  });

  const align = { value: 1, velocity: 0, target: 1, releaseAt: -1 };
  const tiltSpring = { x: 0, y: 0, vx: 0, vy: 0 };
  const pointer = { x: 0, y: 0, inside: false, id: -1, downX: 0, downY: 0, downT: 0 };
  let clock = 0;
  let envAngle = 0;
  let introAt = -1;
  let fade = 1;
  let started = false;
  let width = 1;
  let height = 1;
  let raf = 0;
  let last = 0;
  let visible = true;
  let destroyed = false;
  let sized = false;
  let frames = 0;

  const animating = () => {
    const settings = settingsRef.current;
    return !settings.reduced && !settings.paused;
  };

  const ensureEnvironment = () => {
    const settings = settingsRef.current;
    const key = [settings.studio, settings.colors[0], settings.colors[1]].join("|");
    if (key === environmentKey) return;
    environmentKey = key;
    environment?.dispose();
    environment = buildEnvironment(renderer, settings);
    scene.environment = environment.texture;
  };

  const ensureRings = () => {
    const settings = settingsRef.current;
    const count = Math.round(clamp(settings.rings, 1, 9));
    const spacing = clamp(settings.spacing, 0.01, 0.3);
    const widthBand = clamp(settings.bandWidth, 0.004, 0.25);
    const thick = clamp(settings.bandThickness, 0.002, 0.12);
    const key = [count, spacing, widthBand, thick].join("|");
    if (key === ringKey) return;
    ringKey = key;
    const previous = rings;
    previous.forEach((ring) => ring.mesh.geometry.dispose());
    assembly.clear();
    rings = [];
    let parent: THREE.Object3D = assembly;
    for (let i = 0; i < count; i++) {
      const radius = Math.max(0.12, 1 - i * spacing);
      const pivot = new THREE.Group();
      const mesh = new THREE.Mesh(bandGeometry(radius, widthBand, thick, 320), material);
      pivot.add(mesh);
      parent.add(pivot);
      parent = pivot;
      const axis = i % 2 === 0 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0);
      axis.applyAxisAngle(new THREE.Vector3(0, 0, 1), (i % 3) * 0.35).normalize();
      const keep = previous[i];
      const angle = keep ? keep.angle : 0.6 + i * 1.37;
      rings.push({
        pivot,
        mesh,
        axis,
        angle,
        rate: (i % 2 === 0 ? 1 : -1) * (0.16 + 0.05 * i),
        base: keep ? keep.base : Math.round(angle / TAU) * TAU,
      });
    }
  };

  const place = () => {
    const settings = settingsRef.current;
    const aspect = width / height;
    const size = clamp(settings.size, 0.1, 2);
    const half = Math.tan((FOV * Math.PI) / 360);
    const fit = aspect < 1 ? aspect : 1;
    const distance = 1 / (size * half * fit);
    camera.aspect = aspect;
    camera.position.set(0, 0, distance);
    camera.near = distance * 0.05;
    camera.far = distance * 4;
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
    const viewHalfH = distance * half;
    assembly.position.set(clamp(settings.offsetX, -1, 1) * viewHalfH * aspect, clamp(settings.offsetY, -1, 1) * viewHalfH, 0);
  };

  const pose = () => {
    const settings = settingsRef.current;
    const a = align.value;
    const free = 1 - a;
    const tilt = (clamp(settings.tilt, -90, 90) * Math.PI) / 180;
    const drift = clock * 0.05 * clamp(settings.speed, 0, 4);
    const yaw = Math.atan2(Math.sin(drift), Math.cos(drift));
    const halo = (clamp(settings.haloTilt, 0, 85) * Math.PI) / 180;
    assembly.rotation.set(tilt * free + halo * a + tiltSpring.y, yaw * free - 0.18 * a + tiltSpring.x, 0.12 * a);
    const scale = introAt >= 0 ? 0.92 + 0.08 * fade : 1;
    assembly.scale.setScalar(scale);
    rings.forEach((ring) => {
      const relative = ring.angle - ring.base;
      ring.pivot.quaternion.setFromAxisAngle(ring.axis, relative * free);
    });
  };

  const apply = () => {
    const settings = settingsRef.current;
    material.roughness = clamp(settings.roughness, 0, 0.6);
    material.iridescence = clamp(settings.iridescence, 0, 1);
    scene.environmentRotation.set(0, envAngle, 0);
    canvas.style.opacity = String(fade);
  };

  const render = () => {
    if (!sized) return;
    ensureEnvironment();
    ensureRings();
    place();
    pose();
    apply();
    renderer.render(scene, camera);
  };

  const setAlign = (target: number) => {
    if (target > 0.5 && align.target < 0.5) {
      rings.forEach((ring) => {
        ring.base = Math.round(ring.angle / TAU) * TAU;
      });
    }
    align.target = target;
  };

  const step = (dt: number) => {
    const settings = settingsRef.current;
    clock += dt;
    envAngle += dt * 0.06 * clamp(settings.lightDrift, 0, 4);
    if (introAt >= 0) {
      introAt += dt;
      fade = clamp(introAt / 0.7, 0, 1);
      if (introAt > 0.55 && align.target > 0.5 && align.releaseAt < 0) setAlign(0);
      if (introAt > 3) introAt = -1;
    } else fade = 1;
    if (align.releaseAt >= 0 && clock >= align.releaseAt) {
      align.releaseAt = -1;
      setAlign(0);
    }
    const stiffness = 9;
    const damping = 2 * 0.72 * Math.sqrt(stiffness);
    align.velocity += (stiffness * (align.target - align.value) - damping * align.velocity) * dt;
    align.value += align.velocity * dt;
    const free = clamp(1 - align.value, 0, 1);
    const speed = clamp(settings.speed, 0, 4);
    rings.forEach((ring) => {
      ring.angle += ring.rate * speed * dt * free;
    });
    const reach = clamp(settings.parallax, 0, 2);
    const tx = settings.interactive && pointer.inside ? pointer.x * 0.32 * reach : 0;
    const ty = settings.interactive && pointer.inside ? -pointer.y * 0.22 * reach : 0;
    const omega = 3;
    tiltSpring.vx += (omega * omega * (tx - tiltSpring.x) - 2 * omega * tiltSpring.vx) * dt;
    tiltSpring.vy += (omega * omega * (ty - tiltSpring.y) - 2 * omega * tiltSpring.vy) * dt;
    tiltSpring.x += tiltSpring.vx * dt;
    tiltSpring.y += tiltSpring.vy * dt;
  };

  const tick = (now: number) => {
    raf = 0;
    if (destroyed) return;
    const dt = Math.min(0.1, Math.max(0, (now - last) / 1000));
    last = now;
    frames++;
    if (frames % 30 === 0 && (Math.abs(root.clientWidth - width) > 1 || Math.abs(root.clientHeight - height) > 1)) resize();
    if (animating()) step(dt);
    render();
    if (visible && !document.hidden && animating()) raf = requestAnimationFrame(tick);
  };

  function wake() {
    if (destroyed || raf || !visible) return;
    last = performance.now();
    raf = requestAnimationFrame(tick);
  }

  function resize() {
    const rect = root.getBoundingClientRect();
    if (rect.width < 2 || rect.height < 2) {
      sized = false;
      return;
    }
    sized = true;
    width = rect.width;
    height = rect.height;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2) * clamp(settingsRef.current.quality, 0.25, 1));
    renderer.setSize(width, height, false);
    if (!started) {
      started = true;
      const settings = settingsRef.current;
      if (settings.intro && animating()) {
        introAt = 0;
        fade = 0;
        align.value = 1;
        align.target = 1;
      } else {
        align.value = 0;
        align.target = 0;
      }
    }
    render();
    wake();
  }

  const onMove = (event: PointerEvent) => {
    const rect = root.getBoundingClientRect();
    pointer.x = clamp(((event.clientX - rect.left) / rect.width) * 2 - 1, -1, 1);
    pointer.y = clamp(((event.clientY - rect.top) / rect.height) * 2 - 1, -1, 1);
    pointer.inside = event.pointerType !== "touch";
    wake();
  };

  const onLeave = () => {
    pointer.inside = false;
    wake();
  };

  const toggle = () => {
    const settings = settingsRef.current;
    if (align.target > 0.5) {
      align.releaseAt = -1;
      setAlign(0);
    } else {
      setAlign(1);
      const hold = clamp(settings.alignHold, 0, 60);
      align.releaseAt = hold > 0 ? clock + hold : -1;
    }
    wake();
  };

  const onDown = (event: PointerEvent) => {
    const settings = settingsRef.current;
    if (!settings.interactive || !settings.clickAlign || !animating()) return;
    if (event.pointerType === "mouse") {
      if (event.button === 0) toggle();
      return;
    }
    pointer.id = event.pointerId;
    pointer.downX = event.clientX;
    pointer.downY = event.clientY;
    pointer.downT = performance.now();
  };

  const onUp = (event: PointerEvent) => {
    if (pointer.id !== event.pointerId) return;
    pointer.id = -1;
    const settings = settingsRef.current;
    if (!settings.interactive || !settings.clickAlign || !animating()) return;
    if (Math.hypot(event.clientX - pointer.downX, event.clientY - pointer.downY) > 10) return;
    if (performance.now() - pointer.downT > 450) return;
    toggle();
  };

  const onCancel = () => {
    pointer.id = -1;
  };

  root.addEventListener("pointermove", onMove);
  root.addEventListener("pointerleave", onLeave);
  root.addEventListener("pointerdown", onDown);
  root.addEventListener("pointerup", onUp);
  root.addEventListener("pointercancel", onCancel);
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(root);
  const intersection = new IntersectionObserver(
    (entries) => {
      visible = entries.some((entry) => entry.isIntersecting);
      if (visible) wake();
    },
    { rootMargin: "80px" },
  );
  intersection.observe(root);
  const onVisibility = () => {
    if (!document.hidden) wake();
  };
  document.addEventListener("visibilitychange", onVisibility);
  const onLost = (event: Event) => event.preventDefault();
  canvas.addEventListener("webglcontextlost", onLost);
  resize();

  return {
    sync: () => {
      if (!animating()) {
        introAt = -1;
        fade = 1;
        align.value = align.target > 0.5 ? 1 : 0;
        align.velocity = 0;
      }
      const ratio = Math.min(window.devicePixelRatio || 1, 2) * clamp(settingsRef.current.quality, 0.25, 1);
      if (!sized || Math.abs(ratio - renderer.getPixelRatio()) > 1e-3) resize();
      else render();
      wake();
    },
    destroy: () => {
      destroyed = true;
      cancelAnimationFrame(raf);
      root.removeEventListener("pointermove", onMove);
      root.removeEventListener("pointerleave", onLeave);
      root.removeEventListener("pointerdown", onDown);
      root.removeEventListener("pointerup", onUp);
      root.removeEventListener("pointercancel", onCancel);
      document.removeEventListener("visibilitychange", onVisibility);
      canvas.removeEventListener("webglcontextlost", onLost);
      resizeObserver.disconnect();
      intersection.disconnect();
      rings.forEach((ring) => ring.mesh.geometry.dispose());
      material.dispose();
      environment?.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      canvas.remove();
    },
    align: () => {
      if (align.target < 0.5) toggle();
      else align.releaseAt = -1;
      if (!animating()) {
        align.value = 1;
        render();
      }
    },
    release: () => {
      align.releaseAt = -1;
      setAlign(0);
      if (!animating()) {
        align.value = 0;
        render();
      }
      wake();
    },
    replay: () => {
      if (!animating()) return;
      introAt = 0;
      fade = 0;
      align.value = 1;
      align.velocity = 0;
      setAlign(1);
      align.releaseAt = -1;
      wake();
    },
  };
};

const ChromeOrbit = forwardRef<ChromeOrbitHandle, ChromeOrbitProps>(function ChromeOrbit(
  {
    colors = ["#7B5CFF", "#FF7AD9"],
    studio = "dark",
    rings = 4,
    size = 0.8,
    spacing = 0.09,
    bandWidth = 0.085,
    bandThickness = 0.018,
    roughness = 0.16,
    iridescence = 0.25,
    speed = 1,
    tilt = 18,
    lightDrift = 1,
    offsetX = 0,
    offsetY = 0,
    interactive = true,
    parallax = 1,
    clickAlign = true,
    alignHold = 2.5,
    haloTilt = 62,
    intro = true,
    paused = false,
    quality = 1,
    className,
    style,
    children,
  },
  ref,
) {
  const rootRef = useRef<HTMLDivElement>(null);
  const controllerRef = useRef<Controller | null>(null);
  const reduced = useSyncExternalStore(subscribeToMotion, readMotion, () => false);
  const settingsRef = useRef<Settings>({
    colors,
    studio,
    rings,
    size,
    spacing,
    bandWidth,
    bandThickness,
    roughness,
    iridescence,
    speed,
    tilt,
    lightDrift,
    offsetX,
    offsetY,
    interactive,
    parallax,
    clickAlign,
    alignHold,
    haloTilt,
    intro,
    paused,
    quality,
    reduced,
  });

  useEffect(() => {
    settingsRef.current = {
      colors,
      studio,
      rings,
      size,
      spacing,
      bandWidth,
      bandThickness,
      roughness,
      iridescence,
      speed,
      tilt,
      lightDrift,
      offsetX,
      offsetY,
      interactive,
      parallax,
      clickAlign,
      alignHold,
      haloTilt,
      intro,
      paused,
      quality,
      reduced,
    };
    controllerRef.current?.sync();
  });

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const controller = createOrbit(root, settingsRef);
    controllerRef.current = controller;
    return () => {
      controller?.destroy();
      controllerRef.current = null;
    };
  }, []);

  useImperativeHandle(
    ref,
    () => ({
      align: () => controllerRef.current?.align(),
      release: () => controllerRef.current?.release(),
      replay: () => controllerRef.current?.replay(),
    }),
    [],
  );

  return (
    <div
      ref={rootRef}
      className={["co-root", "relative isolate h-full min-h-[240px] w-full overflow-hidden", className].filter(Boolean).join(" ")}
      style={{ touchAction: "pan-y", ...style }}
    >
      {children && <div className="co-content">{children}</div>}
    </div>
  );
});

ChromeOrbit.displayName = "ChromeOrbit";

export { ChromeOrbit };
export default ChromeOrbit;
