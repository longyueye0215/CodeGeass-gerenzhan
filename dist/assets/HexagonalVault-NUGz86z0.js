import{r as c,j as D}from"./react-B78sy4Ov.js";import{C as Ge,u as Be,a as Pe}from"./r3f-DOde8efc.js";import{g as he,d as Te,e as H,i as Ce,S as We,O as He,M as _e,h as ze,j as qe,F as je,w as ye,f as Ie,K as Ke}from"./three-CD21-ytW.js";const I=["#5227FF","#FF9FFC"],me=72,Q=4,be=`
void main() {
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`,Oe=`
precision highp float;

uniform sampler2D uVelocity;
uniform vec2 uSize;
uniform vec2 uCanvas;
uniform float uDt;
uniform float uDecay;
uniform float uBlend;
uniform vec2 uFrom;
uniform vec2 uTo;
uniform vec2 uBrushVelocity;
uniform float uRadius;

float segment(vec2 p, vec2 a, vec2 b) {
  vec2 e = b - a;
  float t = clamp(dot(p - a, e) / max(dot(e, e), 1e-4), 0.0, 1.0);
  return length(p - a - e * t);
}

void main() {
  vec2 uv = gl_FragCoord.xy / uSize;
  vec2 p = uv * uCanvas - uCanvas * 0.5;
  vec2 v = texture2D(uVelocity, uv).xy;
  vec2 carried = texture2D(uVelocity, uv - v * uDt / uCanvas).xy * uDecay;
  float d = segment(p, uFrom, uTo) / uRadius;
  float w = exp(-d * d * d * d) * uBlend;
  gl_FragColor = vec4(mix(carried, uBrushVelocity, w), 0.0, 1.0);
}
`,Ue=`
precision highp float;

uniform sampler2D uLight;
uniform sampler2D uVelocity;
uniform vec2 uSize;
uniform vec2 uCanvas;
uniform float uDt;
uniform float uDrift;
uniform vec2 uDecay;
uniform vec2 uFrom;
uniform vec2 uTo;
uniform float uRadius;
uniform float uEnergy;

float segment(vec2 p, vec2 a, vec2 b) {
  vec2 e = b - a;
  float t = clamp(dot(p - a, e) / max(dot(e, e), 1e-4), 0.0, 1.0);
  return length(p - a - e * t);
}

void main() {
  vec2 uv = gl_FragCoord.xy / uSize;
  vec2 p = uv * uCanvas - uCanvas * 0.5;
  vec2 v = texture2D(uVelocity, uv).xy;
  vec2 light = texture2D(uLight, uv - v * uDrift * uDt / uCanvas).xy * uDecay;
  float d = segment(p, uFrom, uTo) / uRadius;
  float paint = exp(-d * d) * uEnergy;
  gl_FragColor = vec4(max(light, vec2(paint)), 0.0, 1.0);
}
`,Ne=`
precision highp float;

#define MAX_PULSES ${Q}

uniform vec2 uResolution;
uniform float uCell;
uniform float uTime;
uniform float uClock;
uniform sampler2D uLight;
uniform vec3 uLens;
uniform float uLensRadius;
uniform vec4 uPulses[MAX_PULSES];
uniform float uPulseSpeed;
uniform float uLineWidth;
uniform float uLitWidth;
uniform float uLattice;
uniform float uGlow;
uniform float uGlowRadius;
uniform float uShimmer;
uniform float uVignette;
uniform float uGrain;
uniform float uCore;
uniform vec3 uColorA;
uniform vec3 uColorB;
uniform vec3 uBackground;
uniform float uInk;
uniform float uTransparent;
uniform float uHatch;
uniform float uHatchShift;

const float HALF_EDGE = 0.2886751;

vec3 toSrgb(vec3 c) {
  c = clamp(c, 0.0, 1.0);
  return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c));
}

float hash(vec2 p) {
  vec3 q = fract(vec3(p.xyx) * 0.1031);
  q += dot(q, q.yzx + 33.33);
  return fract((q.x + q.y) * q.z);
}

void main() {
  vec2 p = gl_FragCoord.xy - uResolution * 0.5;

  /* ---------- 舱门：六边形从中缝向两侧逐颗熄灭 ----------
     uHatch 0 → 整屏不透明；1 → 整屏透明。
     开口以「整颗六边形」为单位推进：同一颗六边形内所有像素共享同一个 c，
     所以任何时刻都不会切出半颗六边形，中缝也就不会出现那道竖直的缝。 */
  float hatchEase = uHatch * uHatch * (3.0 - 2.0 * uHatch);
  float hatchGap = hatchEase * (uResolution.x * 0.5 + uCell * 1.2) - uCell * 0.6;

  vec2 q = p.yx / uCell;
  vec2 s = vec2(1.0, 1.7320508);
  vec4 hc = floor(vec4(q, q - vec2(0.5, 1.0)) / s.xyxy) + 0.5;
  vec4 h = vec4(q - hc.xy * s, q - (hc.zw + 0.5) * s);
  vec2 o;
  vec2 c;
  if (dot(h.xy, h.xy) < dot(h.zw, h.zw)) {
    o = h.xy;
    c = hc.xy * s;
  } else {
    o = h.zw;
    c = (hc.zw + 0.5) * s;
  }

  /* c 在 q = p.yx / uCell 空间里，c.y * uCell 就是这颗六边形的屏幕 x 中心。
     uHatch 恰好为 0 时 hatchGap 是负值，整屏 doorAlpha 恒为 1（严丝合缝）。 */
  float cellX = c.y * uCell;
  float doorAlpha = smoothstep(
    hatchGap - uCell * 0.55,
    hatchGap + uCell * 0.55,
    abs(cellX)
  );

  vec2 dirs[3];
  dirs[0] = vec2(1.0, 0.0);
  dirs[1] = vec2(0.5, 0.8660254);
  dirs[2] = vec2(-0.5, 0.8660254);

  float nearest = 1e9;
  vec2 nearestMid = vec2(0.0);
  float lineLit = 0.0;
  float glowLit = 0.0;
  float haloLit = 0.0;
  float heatSum = 0.0;
  float heatWeight = 1e-4;
  float pulseLine = 0.0;
  float pulseGlow = 0.0;
  float pulseHeat = 0.0;
  float aa = 0.8;
  float glowRadius = max(uGlowRadius, 0.5);

  for (int e = 0; e < 6; e++) {
    int slot = e < 3 ? e : e - 3;
    vec2 n = dirs[slot] * (e < 3 ? 1.0 : -1.0);
    vec2 t = vec2(-n.y, n.x);
    vec2 rel = o - n * 0.5;
    float along = dot(rel, t);
    float across = dot(rel, n);
    float dist = length(vec2(across, max(abs(along) - HALF_EDGE, 0.0))) * uCell;
    vec2 midPx = (c + n * 0.5).yx * uCell;
    if (dist < nearest) {
      nearest = dist;
      nearestMid = midPx;
    }

    vec2 tPx = t.yx;
    vec2 endA = midPx - tPx * HALF_EDGE * uCell;
    vec2 endB = midPx + tPx * HALF_EDGE * uCell;
    float clampedAlong = clamp(along, -HALF_EDGE, HALF_EDGE) * uCell;
    float fall = exp(-dist / glowRadius);

    vec2 at = midPx + tPx * clampedAlong;
    vec2 wake = texture2D(uLight, at / uResolution + 0.5).rg;
    vec2 offset = (at - uLens.xy) / uLensRadius;
    float r2 = dot(offset, offset);
    float lens = (0.62 * exp(-r2 * 4.0) + 0.38 * exp(-r2 * 0.8)) * uLens.z;
    float lit = max(wake.x, lens);
    float warm = max(wake.y, lens) * smoothstep(0.0, 0.3, lit);
    lit = pow(lit, 1.4);

    float edgeWidth = mix(uLineWidth, uLitWidth, clamp(lit, 0.0, 1.0));
    float edgeCover = 1.0 - smoothstep(edgeWidth * 0.5 - aa, edgeWidth * 0.5 + aa, dist);
    float edgeLine = edgeCover * lit;
    float edgeGlow = fall * lit;
    lineLit = max(lineLit, edgeLine);
    glowLit = max(glowLit, edgeGlow);
    haloLit = max(haloLit, exp(-dist / (glowRadius * 1.8)) * lit * warm * warm);
    heatSum += warm * (edgeLine + edgeGlow);
    heatWeight += edgeLine + edgeGlow;

    float spark = 0.0;
    float head = 0.0;
    for (int k = 0; k < MAX_PULSES; k++) {
      vec4 pl = uPulses[k];
      float age = uClock - pl.z;
      if (pl.w <= 0.0 || age < 0.0 || age > 7.0) continue;
      float da = length(endA - pl.xy);
      float db = length(endB - pl.xy);
      float fromNear = da < db ? clampedAlong + HALF_EDGE * uCell : HALF_EDGE * uCell - clampedAlong;
      float jitter = (hash(floor(midPx * 0.25) + pl.z) - 0.5) * 0.3 * uCell;
      float front = age * uPulseSpeed - min(da, db) + jitter;
      float gap = fromNear - front;
      float fade = exp(-age * 0.55) * pl.w;
      float headK = exp(-gap * gap / (0.018 * uCell * uCell)) * fade;
      float tailK = (gap < 0.0 ? exp(gap / (0.7 * uCell)) : 0.0) * fade;
      spark += headK + tailK * 0.3;
      head = max(head, headK);
    }
    float pulseWidth = mix(uLineWidth, uLitWidth, clamp(spark, 0.0, 1.0));
    float pulseCover = 1.0 - smoothstep(pulseWidth * 0.5 - aa, pulseWidth * 0.5 + aa, dist);
    pulseLine = max(pulseLine, pulseCover * spark);
    pulseGlow = max(pulseGlow, fall * spark);
    pulseHeat = max(pulseHeat, head * max(pulseCover, fall));
  }

  float heat = heatSum / heatWeight;

  float baseLine = 1.0 - smoothstep(uLineWidth * 0.5 - aa, uLineWidth * 0.5 + aa, nearest);
  float sweep = 0.5 + 0.5 * sin(dot(nearestMid / uCell, vec2(0.21, 0.13)) - uTime * 0.35);
  float shimmer = pow(sweep, 8.0) * uShimmer;

  float energy = clamp(lineLit + pulseLine, 0.0, 1.6);
  float glow = clamp(glowLit + pulseGlow, 0.0, 1.6);
  float hot = clamp(heat * 0.9 + pulseHeat, 0.0, 1.0);
  vec3 cool = mix(uColorA, vec3(dot(uColorA, vec3(0.2126, 0.7152, 0.0722))) * 1.6, 0.2);
  vec3 lineColor = mix(cool, uColorB, smoothstep(0.2, 0.75, hot));
  float radial = length(p / uResolution.y);

  float dither = (fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715)))) - 0.5) / 255.0;
  float grain = (hash(gl_FragCoord.xy + fract(uTime) * 91.0) - 0.5) * uGrain * 0.05;

  if (uInk > 0.5) {
    vec3 ink = mix(uColorA, uColorB, smoothstep(0.2, 0.9, hot) * 0.6);
    vec3 neutral = vec3(0.08, 0.08, 0.1);
    vec3 color = uBackground * (1.0 - uVignette * 0.04 * smoothstep(0.2, 1.1, radial));
    color = mix(color, neutral, baseLine * uLattice * (0.22 + 0.12 * shimmer));
    color = mix(color, ink, clamp(glow * uGlow * 0.22 + haloLit * uGlow * 0.1, 0.0, 0.45));
    color = mix(color, ink, clamp(min(energy, 1.0) * 1.8, 0.0, 1.0));
    gl_FragColor = vec4((toSrgb(color) + dither + grain) * doorAlpha, doorAlpha);
    return;
  }

  vec3 latticeColor = mix(vec3(0.62, 0.62, 0.7), uColorA, 0.25);
  vec3 emission = latticeColor * baseLine * uLattice * (0.055 + 0.14 * shimmer);
  float white = smoothstep(0.55, 1.0, hot * min(energy, 1.0));
  vec3 core = mix(lineColor, vec3(1.0), uCore * white);
  emission += core * energy * (1.3 + 1.1 * white);
  emission += lineColor * glow * uGlow * 0.6;
  emission += mix(lineColor, uColorB, 0.5) * haloLit * uGlow * 0.12;

  if (uTransparent > 0.5) {
    vec3 light = 1.0 - exp(-emission * 1.05);
    float alpha = clamp(max(max(light.r, light.g), light.b), 0.0, 1.0) * doorAlpha;
    gl_FragColor = vec4((toSrgb(light) + (dither + grain) * step(0.004, alpha)) * doorAlpha, alpha);
    return;
  }

  vec3 base = uBackground * (1.0 + uVignette * 0.6 * (1.0 - smoothstep(0.0, 1.1, radial)));
  vec3 color = base + emission;
  color = 1.0 - exp(-color * 1.05);
  gl_FragColor = vec4((toSrgb(color) + dither + grain) * doorAlpha, doorAlpha);
}
`,i=(t,a,n)=>Math.min(n,Math.max(a,t)),Me=t=>{const a=t.trim().toLowerCase();return a==="transparent"?!0:/^#[0-9a-f]{8}$/.test(a)?a.endsWith("00"):/^#[0-9a-f]{4}$/.test(a)?a.endsWith("0"):a.match(/^(?:rgba?|hsla?)\(.*[,/]\s*(0|0?\.0+|0%)\s*\)$/)!==null},de=(t,a,n)=>{const h=a.trim();try{t.set(/^#[0-9a-f]{8}$/i.test(h)?h.slice(0,7):h)}catch{t.set(n)}return t},$e=t=>{let a=(Math.floor(t*7919)^795581713)>>>0;return()=>{a=a+1831565813>>>0;let n=a;return n=Math.imul(n^n>>>15,n|1),n^=n+Math.imul(n^n>>>7,n|61),((n^n>>>14)>>>0)/4294967296}},Je=t=>{const a=window.matchMedia("(min-resolution: 2dppx)");return a.addEventListener("change",t),window.addEventListener("resize",t),()=>{a.removeEventListener("change",t),window.removeEventListener("resize",t)}},Qe=()=>typeof window>"u"?1:window.devicePixelRatio||1,Ze=t=>{const a=window.matchMedia("(prefers-reduced-motion: reduce)");return a.addEventListener("change",t),()=>a.removeEventListener("change",t)},et=()=>typeof window<"u"&&window.matchMedia("(prefers-reduced-motion: reduce)").matches,le=(t,a)=>new je(t,a,{type:Ke,format:Ie,minFilter:ye,magFilter:ye,depthBuffer:!1,stencilBuffer:!1}),Le=(t,a)=>new qe({vertexShader:be,fragmentShader:t,uniforms:a,depthTest:!1,depthWrite:!1}),tt=(t,a)=>{const n=()=>({uSize:{value:new H(t,a)},uCanvas:{value:new H(1,1)},uDt:{value:0},uFrom:{value:new H},uTo:{value:new H},uRadius:{value:100}}),h=Le(Ue,{...n(),uLight:{value:null},uVelocity:{value:null},uDrift:{value:.5},uDecay:{value:new H(1,1)},uEnergy:{value:0}}),p=Le(Oe,{...n(),uVelocity:{value:null},uDecay:{value:1},uBlend:{value:0},uBrushVelocity:{value:new H}}),M=new We,v=new He(-1,1,1,-1,0,1),b=new _e(new ze(2,2),h);return b.frustumCulled=!1,M.add(b),{light:[le(t,a),le(t,a)],velocity:[le(t,a),le(t,a)],flip:0,scene:M,camera:v,lightMaterial:h,velocityMaterial:p,quad:b,width:t,height:a}},at=t=>{t.light.forEach(a=>a.dispose()),t.velocity.forEach(a=>a.dispose()),t.lightMaterial.dispose(),t.velocityMaterial.dispose(),t.quad.geometry.dispose()},ot=()=>({uResolution:{value:new H(1,1)},uCell:{value:me},uTime:{value:0},uClock:{value:0},uLight:{value:null},uLens:{value:new Te},uLensRadius:{value:100},uPulses:{value:Array.from({length:Q},()=>new Ce(0,0,-99,0))},uPulseSpeed:{value:400},uLineWidth:{value:1},uLitWidth:{value:1.8},uLattice:{value:.4},uGlow:{value:1.5},uGlowRadius:{value:4.5},uShimmer:{value:1},uVignette:{value:0},uGrain:{value:1},uCore:{value:.4},uColorA:{value:new he},uColorB:{value:new he},uBackground:{value:new he},uInk:{value:0},uTransparent:{value:0},uHatch:{value:0},uHatchShift:{value:.34}}),rt=({settings:t,pointerRef:a,wakeRef:n})=>{const{gl:h,size:p,viewport:M,invalidate:v}=Be(),b=c.useRef(null),K=c.useRef(null),_=c.useRef(null),se=c.useMemo(()=>ot(),[]),O=t.colors.join("|"),{backgroundColor:U}=t,ne=me*i(t.cellSize,.5,4)*M.dpr,Z=i(Math.round(ne/20),3,10),ee=Math.max(8,Math.ceil(p.width*M.dpr/Z)),te=Math.max(8,Math.ceil(p.height*M.dpr/Z));return c.useEffect(()=>{const y=tt(ee,te);return K.current=y,v(),()=>{K.current=null,at(y)}},[ee,te,v]),c.useEffect(()=>(n.current=v,()=>{n.current=null}),[v,n]),c.useEffect(()=>{const y=b.current;if(!y)return;const L=y.uniforms,V=O?O.split("|"):I;de(L.uColorA.value,V[0]??I[0],I[0]),de(L.uColorB.value,V[1]??V[0]??I[1],I[1]);const l=Me(U);de(L.uBackground.value,l?"#000000":U,"#000000");const s=L.uBackground.value,o=s.r*.2126+s.g*.7152+s.b*.0722;L.uInk.value=!l&&o>.2?1:0,L.uTransparent.value=l?1:0,v()},[O,U,v]),c.useEffect(()=>{v()},[t,p,v]),Pe((y,L)=>{const V=b.current,l=K.current;if(!V||!l)return;const s=V.uniforms,o=t,C=a.current,u=Math.min(Math.max(L,0),.1),N=!o.paused&&!o.reduced,d=y.viewport.dpr,m=me*i(o.cellSize,.5,4)*d,S=p.width*d,E=p.height*d,A=i(o.speed,0,4);if(!_.current||_.current.seed!==o.seed){const r=$e(o.seed+.5);_.current={time:0,clock:0,brushX:0,brushY:0,brushVX:0,brushVY:0,hasBrush:!1,tracking:!1,pointerX:0,pointerY:0,pointerVX:0,pointerVY:0,roaming:!1,roamX:(r()-.5)*.5*S,roamY:(r()-.5)*.4*E,heading:r()*Math.PI*2,roamClock:r()*40,roamIdle:0,roamDelay:0,phases:[0,1,2,3].map(()=>r()*Math.PI*2),energy:0,presence:0,lastPaint:-99,seed:o.seed,presses:C.presses,nextPulse:0,pulses:Array.from({length:Q},()=>new Ce(0,0,-99,0))}}const e=_.current;N&&(e.time+=u*A),o.reduced||(e.clock+=u);const f=o.interactive&&!o.reduced&&C.inside,g=o.autoplay&&!f,F=(C.x-p.width/2)*d,G=(p.height/2-C.y)*d;g&&!e.roaming&&(e.hasBrush?(e.roamX=i(e.brushX+e.brushVX*.2,-S*.5+m,S*.5-m),e.roamY=i(e.brushY+e.brushVY*.2,-E*.5+m,E*.5-m),Math.hypot(e.brushVX,e.brushVY)>m*.2&&(e.heading=Math.atan2(e.brushVY,e.brushVX)),e.roamDelay=.8):(e.brushX=e.roamX,e.brushY=e.roamY,e.brushVX=0,e.brushVY=0,e.hasBrush=!0,e.roamDelay=0),e.roamIdle=0),e.roaming=g;let B=0;if(g&&N){e.roamIdle+=u;const r=i((e.roamIdle-e.roamDelay)/1.6,0,1),j=r*r*(3-2*r);e.roamClock+=u*A*j;const W=e.roamClock,[Y,re,Re,Ye]=e.phases;let ge=.45*Math.sin(W*.43+Y)+.3*Math.sin(W*.27+re)+.18*Math.sin(W*.71+Re);const De=Math.max(S*.5-m*1.5,m),Ae=Math.max(E*.5-m*1.2,m),xe=Math.hypot(e.roamX/De,e.roamY/Ae)-.7;if(xe>0){const we=Math.atan2(-e.roamY,-e.roamX),Fe=Math.atan2(Math.sin(we-e.heading),Math.cos(we-e.heading));ge+=Fe*Math.min(xe*6,3)}e.heading+=ge*u*A*j,B=m*1.1*(.8+.2*Math.sin(W*.19+Ye))*A*j,e.roamX+=Math.cos(e.heading)*B*u,e.roamY+=Math.sin(e.heading)*B*u}if(f&&(!e.hasBrush||!e.tracking&&e.presence<.05)&&(e.brushX=F,e.brushY=G,e.brushVX=0,e.brushVY=0,e.hasBrush=!0),f&&!e.tracking&&(e.pointerX=F,e.pointerY=G,e.pointerVX=0,e.pointerVY=0),e.tracking=f,f&&u>0){const r=1-Math.exp(-u/.06);e.pointerVX+=((F-e.pointerX)/u-e.pointerVX)*r,e.pointerVY+=((G-e.pointerY)/u-e.pointerVY)*r,e.pointerX=F,e.pointerY=G}else e.pointerVX=0,e.pointerVY=0;const z=f||g,ae=f?F:e.roamX,oe=f?G:e.roamY,ue=e.brushX,ie=e.brushY;if(o.reduced&&g)e.brushX=ae,e.brushY=oe,e.brushVX=0,e.brushVY=0;else if(e.hasBrush&&u>0){const r=10*i(o.follow,.2,4),j=1.24*r,W=Math.max(4,Math.ceil(u/.008)),Y=u/W;for(let re=0;re<W;re++)z?(e.brushVX+=((ae-e.brushX)*r*r-e.brushVX*j)*Y,e.brushVY+=((oe-e.brushY)*r*r-e.brushVY*j)*Y):(e.brushVX*=Math.exp(-Y*6),e.brushVY*=Math.exp(-Y*6)),e.brushX+=e.brushVX*Y,e.brushY+=e.brushVY*Y}const X=Math.hypot(e.brushVX,e.brushVY)/d,k=Math.hypot(e.pointerVX,e.pointerVY)/d,P=B/d,$=f?1-Math.exp(-k/120):g?.85*(1-Math.exp(-P/120)):0;if(o.reduced)e.energy=0,e.presence=g?1:0;else{const r=$>e.energy?.08:.35;e.energy+=($-e.energy)*(1-Math.exp(-u/r)),e.presence+=((z?1:0)-e.presence)*(1-Math.exp(-u/.3))}if(e.energy>.01&&(e.lastPaint=e.clock),!z&&e.presence<.005&&e.energy<.005&&X<1&&(e.hasBrush=!1),C.presses!==e.presses&&(e.presses=C.presses,o.clickPulses&&o.interactive&&!o.reduced)){const r=e.nextPulse;e.nextPulse=(r+1)%Q,e.pulses[r].set((C.pressX-p.width/2)*d,(p.height/2-C.pressY)*d,e.clock,1)}const R=l.flip,x=1-R,w=i(o.trailWidth,.2,4)*2*m,J=1-Math.exp(-Math.max(k,P)/600),Ve=w*(.35+.25*J),ce=i(o.trailLength,.1,8)*.26,fe=e.hasBrush?e.energy:0,pe=r=>{r.uCanvas.value.set(S,E),r.uSize.value.set(l.width,l.height),r.uFrom.value.set(ue,ie),r.uTo.value.set(e.brushX,e.brushY),r.uDt.value=u},q=l.velocityMaterial.uniforms;pe(q),q.uRadius.value=w,q.uVelocity.value=l.velocity[R].texture,q.uDecay.value=Math.exp(-u/.25),q.uBlend.value=(1-Math.exp(-u/.05))*fe,q.uBrushVelocity.value.set(e.brushVX,e.brushVY);const T=l.lightMaterial.uniforms;pe(T),T.uRadius.value=Ve,T.uLight.value=l.light[R].texture,T.uVelocity.value=l.velocity[x].texture,T.uDrift.value=i(o.flow,0,1)*.8,T.uDecay.value.set(Math.exp(-u/ce),Math.exp(-u/(ce*.5))),T.uEnergy.value=fe*.7;const Se=h.getRenderTarget();l.quad.material=l.velocityMaterial,h.setRenderTarget(l.velocity[x]),h.render(l.scene,l.camera),l.quad.material=l.lightMaterial,h.setRenderTarget(l.light[x]),h.render(l.scene,l.camera),h.setRenderTarget(Se),l.flip=x;let ve=!1;for(let r=0;r<Q;r++)s.uPulses.value[r].copy(e.pulses[r]),e.pulses[r].w>0&&e.clock-e.pulses[r].z<7&&(ve=!0);s.uLight.value=l.light[x].texture,s.uLens.value.set(e.brushX,e.brushY,e.hasBrush?e.presence*(.45+.55*e.energy):0),s.uLensRadius.value=w,s.uResolution.value.set(S,E),s.uCell.value=m,s.uTime.value=e.time,s.uClock.value=e.clock,s.uPulseSpeed.value=i(o.pulseSpeed,.1,5)*5.5*m,s.uLineWidth.value=i(o.lineWidth,.2,4)*d,s.uLitWidth.value=i(o.litWidth,.5,8)*d,s.uLattice.value=i(o.lattice,0,3),s.uGlow.value=i(o.glow,0,3),s.uGlowRadius.value=i(o.glowRadius,.1,4)*4.5*d,s.uShimmer.value=i(o.shimmer,0,2),s.uVignette.value=i(o.vignette,0,1),s.uGrain.value=i(o.grain,0,1),s.uCore.value=i(o.core,0,1);const Ee=y.clock.elapsedTime*1e3;s.uHatch.value=o.hatchDuration>0?i((Ee-o.hatchStart)/o.hatchDuration,0,1):0,s.uHatchShift.value=i(o.hatchShift,0,1.5);const Xe=Math.abs((z?1:0)-e.presence)>.002||e.energy>.002||X>.5,ke=ve||Xe||e.clock-e.lastPaint<ce*6;!N&&!o.reduced&&ke&&v()}),D.jsxs("mesh",{frustumCulled:!1,children:[D.jsx("planeGeometry",{args:[2,2]}),D.jsx("shaderMaterial",{ref:b,vertexShader:be,fragmentShader:Ne,uniforms:se,depthTest:!1,depthWrite:!1})]})},ut=({colors:t=I,backgroundColor:a="#0a0a0a",cellSize:n=1.9,lineWidth:h=.5,litWidth:p=1.8,lattice:M=.4,glow:v=1.5,glowRadius:b=.5,core:K=.4,vignette:_=0,grain:se=1,trailLength:O=3,trailWidth:U=1,follow:ne=.5,flow:Z=.5,autoplay:ee=!0,shimmer:te=1,speed:y=1,interactive:L=!0,clickPulses:V=!0,pulseSpeed:l=1,seed:s=0,paused:o=!1,dpr:C=2,hatchStart:u=0,hatchDuration:N=0,hatchShift:d=.34,bare:m=!1,className:S,style:E,children:A})=>{const e=c.useRef(null),f=c.useRef({x:0,y:0,inside:!1,presses:0,pressX:0,pressY:0}),g=c.useRef(null),[F,G]=c.useState(!0),B=c.useSyncExternalStore(Ze,et,()=>!1),z=c.useSyncExternalStore(Je,Qe,()=>1),ae=Math.min(z,Math.max(C,.5)),oe=!o&&!B,ue=Me(a),ie={colors:t,backgroundColor:a,cellSize:n,lineWidth:h,litWidth:p,lattice:M,glow:v,glowRadius:b,core:K,vignette:_,grain:se,trailLength:O,trailWidth:U,follow:ne,flow:Z,autoplay:ee,shimmer:te,speed:y,interactive:L,clickPulses:V,pulseSpeed:l,seed:s,paused:o,reduced:B,hatchStart:u,hatchDuration:N,hatchShift:d};return c.useEffect(()=>{const X=e.current;if(!X||typeof IntersectionObserver>"u")return;const k=new IntersectionObserver(([P])=>G(P.isIntersecting),{rootMargin:"80px"});return k.observe(X),()=>k.disconnect()},[]),c.useEffect(()=>{const X=e.current;if(!X)return;const k=x=>{const w=X.getBoundingClientRect(),J=f.current;J.x=x.clientX-w.left,J.y=x.clientY-w.top,J.inside=!0},P=x=>{k(x),g.current?.()},$=x=>{k(x);const w=f.current;w.pressX=w.x,w.pressY=w.y,w.presses+=1,g.current?.()},R=()=>{f.current.inside=!1,g.current?.()};return window.addEventListener("pointermove",P,{passive:!0}),window.addEventListener("pointerdown",$,{passive:!0}),document.addEventListener("pointerleave",R,{passive:!0}),window.addEventListener("pointercancel",R,{passive:!0}),()=>{window.removeEventListener("pointermove",P),window.removeEventListener("pointerdown",$),document.removeEventListener("pointerleave",R),window.removeEventListener("pointercancel",R)}},[]),D.jsxs("div",{ref:e,className:["hv-root",S].filter(Boolean).join(" "),style:{backgroundColor:ue||m?void 0:a,...E},children:[D.jsx("div",{className:"hv-layer","aria-hidden":"true",children:D.jsx(Ge,{dpr:ae,frameloop:F&&oe?"always":"demand",gl:{antialias:!1,alpha:!0,premultipliedAlpha:!0,powerPreference:"high-performance"},style:{pointerEvents:"none"},children:D.jsx(rt,{settings:ie,pointerRef:f,wakeRef:g})})}),A?D.jsx("div",{className:"hv-content",children:A}):null]})};export{ut as HexagonalVault,ut as default};
