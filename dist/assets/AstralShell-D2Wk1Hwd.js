import{r as x,j as Y}from"./react-B78sy4Ov.js";import{C as ye,u as we,a as Me}from"./r3f-CklRHUaY.js";import{e as oe,$ as ne,d as $,Q as re,R as Se,a0 as be,l as le,m as Z,q as Le,E as Re,I as Fe,J as ae,K as ce,x as Ae,X as Pe}from"./three-w10evGE7.js";const Q=4,he=35,ee=["#7C6BFF","#FFE6FA"],ve=`
uniform float uClock;
uniform float uDepthFade;
uniform vec4 uPulseTime;
uniform vec3 uPulseOrigin[${Q}];
uniform float uPulseSpeed;

float pulseGlow(vec3 direction) {
  float glow = 0.0;
  for (int k = 0; k < ${Q}; k++) {
    float age = uClock - uPulseTime[k];
    if (age < 0.0 || age > 12.0) continue;
    float travelled = acos(clamp(dot(direction, uPulseOrigin[k]), -1.0, 1.0));
    float front = age * uPulseSpeed - travelled;
    glow += exp(-front * front * 60.0) * exp(-age * 0.38);
  }
  return glow;
}
`,me=`
${ve}
uniform float uTime;
uniform float uWorldRadius;
uniform vec2 uPointer;
uniform float uHover;
uniform float uHoverRadius;
uniform float uAspect;

void shellLight(vec4 mv, out vec4 clip, out float depthLight, out float hover, out float front) {
  vec4 center = modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0);
  float facing = clamp((mv.z - center.z) / max(uWorldRadius, 1e-4), -1.0, 1.0);
  front = smoothstep(-0.6, 0.6, facing);
  float rim = 1.0 - abs(facing);
  depthLight = mix(1.0 - uDepthFade, 1.0, front) * (1.0 + rim * rim * 0.45);
  clip = projectionMatrix * mv;
  vec2 ndc = clip.xy / clip.w;
  vec2 delta = (ndc - uPointer) * vec2(uAspect, 1.0);
  hover = exp(-dot(delta, delta) / max(uHoverRadius * uHoverRadius, 1e-4)) * uHover * front;
}
`,ke=`
${me}

attribute float aDegree;
attribute float aSeed;

uniform float uSize;
uniform float uPixelRatio;

varying float vBright;
varying float vHeat;

void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vec4 clip;
  float depthLight;
  float hover;
  float front;
  shellLight(mv, clip, depthLight, hover, front);
  float pulse = pulseGlow(normalize(position)) * mix(1.0 - uDepthFade * 0.8, 1.0, front);
  float hub = min(aDegree / 6.0, 1.0);
  float twinkle = 0.78 + 0.22 * sin(uTime * (0.5 + aSeed * 1.3) + aSeed * 40.0);
  vHeat = clamp(hover * 0.9 + pulse, 0.0, 1.0);
  vBright = depthLight * (0.5 + 0.5 * hub) * twinkle + hover * 1.1 + pulse * 1.3;
  gl_Position = clip;
  vec4 center = modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0);
  float scale = center.z / min(mv.z, -1e-3);
  gl_PointSize = uSize * uPixelRatio * scale * (0.65 + 0.7 * hub) * (1.0 + vHeat * 0.7);
}
`,Ee=`
precision highp float;

uniform vec3 uBase;
uniform vec3 uHot;
uniform float uInk;

varying float vBright;
varying float vHeat;

void main() {
  vec2 c = gl_PointCoord - 0.5;
  float r = length(c) * 2.0;
  float disc = 1.0 - smoothstep(0.35, 1.0, r);
  float amount = disc * vBright;
  if (amount < 0.003) discard;
  vec3 color = mix(uBase, uHot, clamp(vHeat + 0.25, 0.0, 1.0));
  if (uInk > 0.5) {
    float alpha = clamp(amount * 0.9, 0.0, 1.0);
    gl_FragColor = vec4(color * alpha, alpha);
  } else {
    gl_FragColor = vec4(color * amount, clamp(amount, 0.0, 1.0));
  }
}
`,Ce=`
${me}

attribute float aLength;

uniform float uReach;
uniform float uLineOpacity;

varying float vBright;
varying float vHover;
varying float vFront;
varying float vSpan;
varying vec3 vDirection;

void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vec4 clip;
  float depthLight;
  float hover;
  float front;
  shellLight(mv, clip, depthLight, hover, front);
  float span = 1.0 - smoothstep(uReach * 0.35, uReach, aLength);
  vBright = depthLight * uLineOpacity * (0.35 + 0.65 * span) + hover * 0.55;
  vHover = hover;
  vFront = front;
  vSpan = mix(0.55, 1.0, span);
  vDirection = position;
  gl_Position = clip;
}
`,Xe=`
precision highp float;

${ve}

uniform vec3 uBase;
uniform vec3 uHot;
uniform float uInk;
uniform float uLineGain;

varying float vBright;
varying float vHover;
varying float vFront;
varying float vSpan;
varying vec3 vDirection;

void main() {
  float pulse = pulseGlow(normalize(vDirection)) * mix(1.0 - uDepthFade * 0.8, 1.0, vFront);
  float heat = clamp(vHover * 0.8 + pulse, 0.0, 1.0);
  vec3 color = mix(uBase, uHot, heat);
  float amount = (vBright + pulse * 0.8) * vSpan * uLineGain;
  if (uInk > 0.5) {
    float alpha = clamp(amount * 0.85, 0.0, 1.0);
    gl_FragColor = vec4(color * alpha, alpha);
  } else {
    gl_FragColor = vec4(color * amount, clamp(amount, 0.0, 1.0));
  }
}
`,M=(t,a,c)=>Math.min(c,Math.max(a,t)),ue=t=>t*Math.PI/180,ge=t=>{const a=t.trim().toLowerCase();return a==="transparent"?!0:/^#[0-9a-f]{8}$/.test(a)?a.endsWith("00"):/^#[0-9a-f]{4}$/.test(a)?a.endsWith("0"):a.match(/^(?:rgba?|hsla?)\(.*[,/]\s*(0|0?\.0+|0%)\s*\)$/)!==null},_=new Le,de=(t,a,c)=>{const u=a.trim();try{_.set(/^#[0-9a-f]{8}$/i.test(u)?u.slice(0,7):u)}catch{_.set(c)}const f={r:0,g:0,b:0};return _.getRGB(f,Pe),t.set(f.r,f.g,f.b)},De=t=>{let a=(Math.floor(t*9973)^625341585)>>>0;return()=>{a=a+1831565813>>>0;let c=a;return c=Math.imul(c^c>>>15,c|1),c^=c+Math.imul(c^c>>>7,c|61),((c^c>>>14)>>>0)/4294967296}},Ye=t=>{const a=window.matchMedia("(min-resolution: 2dppx)");return a.addEventListener("change",t),window.addEventListener("resize",t),()=>{a.removeEventListener("change",t),window.removeEventListener("resize",t)}},Te=()=>typeof window>"u"?1:window.devicePixelRatio||1,ze=t=>{const a=window.matchMedia("(prefers-reduced-motion: reduce)");return a.addEventListener("change",t),()=>a.removeEventListener("change",t)},He=()=>typeof window<"u"&&window.matchMedia("(prefers-reduced-motion: reduce)").matches,xe=(t,a,c)=>{const u=Math.hypot(t,a,c)||1;return[t/u,a/u,c/u]},pe=t=>{const a=t()*2-1,c=t()*Math.PI*2,u=Math.sqrt(1-a*a);return[u*Math.cos(c),u*Math.sin(c),a]},fe=(t,a,c)=>{const u=()=>{const f=Math.max(c(),1e-6),P=c();return Math.sqrt(-2*Math.log(f))*Math.cos(Math.PI*2*P)};return xe(t[0]+u()*a,t[1]+u()*a,t[2]+u()*a)},Be=(t,a,c)=>{const u=M(t[0]*a[0]+t[1]*a[1]+t[2]*a[2],-1,1),f=Math.acos(u);if(f<1e-4)return t.slice();const P=Math.sin(f),d=Math.sin((1-c)*f)/P,S=Math.sin(c*f)/P;return xe(t[0]*d+a[0]*S,t[1]*d+a[1]*S,t[2]*d+a[2]*S)},Oe=(t,a,c,u,f,P)=>{const d=De(P+.37),S=[],W=Math.max(8,Math.round(t/90));for(let n=0;n<W;n++)S.push(pe(d));const s=[];for(let n=0;n<W;n++){const r=S.map((e,o)=>({j:o,d:o===n?1/0:1-(e[0]*S[n][0]+e[1]*S[n][1]+e[2]*S[n][2])})).sort((e,o)=>e.d-o.d);for(let e=0;e<3;e++){const o=r[e].j;s.some(([i,p])=>i===n&&p===o||i===o&&p===n)||s.push([n,o])}}const O=1-M(u,0,1)*.85,h=new Float32Array(t*3);for(let n=0;n<t;n++){const r=d();let e;if(r<O)e=pe(d);else if(r<O+(1-O)*.35){const o=S[Math.floor(d()*S.length)];e=fe(o,.07+d()*.06,d)}else{const[o,i]=s[Math.floor(d()*s.length)];e=fe(Be(S[o],S[i],d()),.018+d()*.02,d)}h.set(e,n*3)}const k=Math.max(c,.05),T=new Map,U=(n,r,e)=>`${Math.floor(n/k)},${Math.floor(r/k)},${Math.floor(e/k)}`;for(let n=0;n<t;n++){const r=U(h[n*3],h[n*3+1],h[n*3+2]),e=T.get(r);e?e.push(n):T.set(r,[n])}const z=new Float32Array(t),b=new Set,X=[],V=[],N=c*c,F=[],L=(n,r,e,o)=>{const i=n<r?n*t+r:r*t+n;b.has(i)||(b.add(i),X.push(n,r),V.push(e),o&&(z[n]+=1,z[r]+=1))};for(let n=0;n<t;n++){F.length=0;const r=h[n*3],e=h[n*3+1],o=h[n*3+2],i=Math.floor(r/k),p=Math.floor(e/k),D=Math.floor(o/k);for(let y=i-1;y<=i+1;y++)for(let E=p-1;E<=p+1;E++)for(let H=D-1;H<=D+1;H++){const q=T.get(`${y},${E},${H}`);if(q)for(const A of q){if(A===n)continue;const B=h[A*3]-r,j=h[A*3+1]-e,m=h[A*3+2]-o,C=B*B+j*j+m*m;C<N&&F.push({j:A,d:C})}}F.sort((y,E)=>y.d-E.d);for(let y=0;y<Math.min(a,F.length);y++)L(n,F[y].j,Math.sqrt(F[y].d),!0)}const R=Math.round(t*M(f,0,2));for(let n=0;n<R;n++){const r=Math.floor(d()*t);for(let e=0;e<6;e++){const o=Math.floor(d()*t);if(o===r)continue;const i=h[o*3]-h[r*3],p=h[o*3+1]-h[r*3+1],D=h[o*3+2]-h[r*3+2],y=Math.hypot(i,p,D);if(y>.45&&y<1.6){L(r,o,y,!1);break}}}const v=new Float32Array(t);for(let n=0;n<t;n++)v[n]=d();return{points:h,degree:z,seeds:v,edges:Uint32Array.from(X),lengths:Float32Array.from(V)}},Ve=()=>({uTime:{value:0},uClock:{value:0},uWorldRadius:{value:1},uDepthFade:{value:.7},uPointer:{value:new oe(9,9)},uHover:{value:0},uHoverRadius:{value:.22},uAspect:{value:1},uPulseTime:{value:new Ae(-99,-99,-99,-99)},uPulseOrigin:{value:Array.from({length:Q},()=>new $(0,0,1))},uPulseSpeed:{value:1.2},uSize:{value:3},uPixelRatio:{value:1},uReach:{value:.3},uLineOpacity:{value:.5},uLineGain:{value:1},uBase:{value:new $},uHot:{value:new $},uInk:{value:0}}),qe=({settings:t,pointerRef:a,wakeRef:c})=>{const{size:u,invalidate:f}=we(),P=x.useRef(null),d=x.useRef(null),S=x.useRef(null),W=x.useRef({time:0,clock:0,quaternion:new ne,spinVelocity:new oe,lastDragX:0,lastDragY:0,dragging:!1,hover:0,pointerX:9,pointerY:9,presses:0,pulseTimes:[-99,-99,-99,-99],pulseOrigins:Array.from({length:Q},()=>new $(0,0,1)),nextPulse:0,lean:new oe}),s=x.useMemo(()=>({axis:new $,turn:new ne,base:new ne,point:new $,euler:new be,raycaster:new Se,ndc:new oe,sphere:new re,inverse:new ne}),[]),O=x.useMemo(()=>Ve(),[]),h=Math.round(M(t.nodes,100,2500)),k=Math.round(M(t.connections,1,8)),T=M(t.reach,.05,1),U=M(t.clustering,0,1),z=M(t.chords,0,2),b=x.useMemo(()=>Oe(h,k,T,U,z,t.seed),[h,k,T,U,z,t.seed]),X=x.useMemo(()=>{const L=new le;L.setAttribute("position",new Z(b.points,3)),L.setAttribute("aDegree",new Z(b.degree,1)),L.setAttribute("aSeed",new Z(b.seeds,1)),L.boundingSphere=new re(new $,2);const R=b.edges.length/2,v=new Float32Array(R*6),n=new Float32Array(R*2);for(let e=0;e<R;e++){const o=b.edges[e*2],i=b.edges[e*2+1];v.set(b.points.subarray(o*3,o*3+3),e*6),v.set(b.points.subarray(i*3,i*3+3),e*6+3),n[e*2]=b.lengths[e],n[e*2+1]=b.lengths[e]}const r=new le;return r.setAttribute("position",new Z(v,3)),r.setAttribute("aLength",new Z(n,1)),r.boundingSphere=new re(new $,2),{nodes:L,lines:r}},[b]),[V,N]=t.colors,{backgroundColor:F}=t;return x.useEffect(()=>()=>{X.nodes.dispose(),X.lines.dispose()},[X]),x.useEffect(()=>(c.current=f,()=>{c.current=null}),[f,c]),x.useEffect(()=>{const L=d.current;if(!L)return;const R=L.uniforms;de(R.uBase.value,V??ee[0],ee[0]),de(R.uHot.value,N??V??ee[1],ee[1]);const v=ge(F);_.set(v?"#000000":F);const n=_.r*.2126+_.g*.7152+_.b*.0722,r=!v&&n>.35;R.uInk.value=r?1:0;for(const e of[d.current,S.current])e&&(e.blending=Re,e.blendEquation=Fe,e.blendSrc=ae,e.blendDst=r?ce:ae,e.blendSrcAlpha=ae,e.blendDstAlpha=ce,e.needsUpdate=!0);f()},[V,N,F,f]),x.useEffect(()=>{f()},[t,u,f]),Me((L,R)=>{const v=P.current,n=d.current;if(!v||!n)return;const r=n.uniforms,e=W.current,o=t,i=a.current,p=Math.min(Math.max(R,0),.05),D=!o.paused&&!o.reduced;D&&(e.time+=p),o.reduced||(e.clock+=p);const y=u.width/Math.max(u.height,1),E=L.camera,H=E.position.z*Math.tan(ue(he)/2),q=M(o.radius,.05,1.5)*2*H;v.position.set((M(o.originX,-.5,1.5)-.5)*2*H*y,(M(o.originY,-.5,1.5)-.5)*2*H,0),v.scale.setScalar(q);const A=o.draggable&&o.interactive&&i.down;if(A){e.dragging||(e.lastDragX=i.dragX,e.lastDragY=i.dragY,e.spinVelocity.set(0,0));const l=i.dragX-e.lastDragX,g=i.dragY-e.lastDragY;e.lastDragX=i.dragX,e.lastDragY=i.dragY;const K=1/Math.max(p,1/240);e.spinVelocity.set(l*3.2*K*.35,g*3.2*K*.35),s.axis.set(0,1,0),s.turn.setFromAxisAngle(s.axis,l*3.2),e.quaternion.premultiply(s.turn),s.axis.set(1,0,0),s.turn.setFromAxisAngle(s.axis,-g*3.2),e.quaternion.premultiply(s.turn)}else{const l=Math.exp(-p*1.6);if(e.spinVelocity.multiplyScalar(l),s.axis.set(0,1,0),s.turn.setFromAxisAngle(s.axis,e.spinVelocity.x*p),e.quaternion.premultiply(s.turn),s.axis.set(1,0,0),s.turn.setFromAxisAngle(s.axis,-e.spinVelocity.y*p),e.quaternion.premultiply(s.turn),D){const g=M(o.spin,-4,4)*.11;s.axis.set(.18,1,.08).normalize(),s.turn.setFromAxisAngle(s.axis,g*p),e.quaternion.premultiply(s.turn)}}e.dragging=A,e.quaternion.normalize();const B=o.interactive&&!o.reduced&&i.inside,j=B?(i.x-.5)*2:0,m=B?(i.y-.5)*2:0,C=1-Math.exp(-p*2.4);e.lean.x+=(j-e.lean.x)*C,e.lean.y+=(m-e.lean.y)*C,s.euler.set(ue(M(o.tilt,-90,90))-e.lean.y*.12,e.lean.x*.16,0),s.base.setFromEuler(s.euler),v.quaternion.copy(s.base).multiply(e.quaternion),v.updateMatrixWorld();const I=B&&!A?1:0;if(e.hover+=(I-e.hover)*(1-Math.exp(-p*5)),B){const l=1-Math.exp(-p*14);e.pointerX>5&&(e.pointerX=i.x,e.pointerY=i.y),e.pointerX+=(i.x-e.pointerX)*l,e.pointerY+=(i.y-e.pointerY)*l}else e.hover<.002&&(e.pointerX=9,e.pointerY=9);if(i.presses!==e.presses&&(e.presses=i.presses,o.clickPulse&&o.interactive&&!o.reduced&&i.travel<.02)){s.ndc.set(i.pressX,i.pressY),s.raycaster.setFromCamera(s.ndc,E),s.sphere.set(v.position,q);const l=s.raycaster.ray;l.intersectSphere(s.sphere,s.point)||l.closestPointToPoint(v.position,s.point),s.point.sub(v.position).normalize(),s.inverse.copy(v.quaternion).invert(),s.point.applyQuaternion(s.inverse);const g=e.nextPulse;e.nextPulse=(e.nextPulse+1)%Q,e.pulseOrigins[g].copy(s.point),e.pulseTimes[g]=e.clock}const J=M(o.pulseSpeed,.1,5),te=Math.PI/J+1;let G=!1;for(let l=0;l<Q;l++)e.clock-e.pulseTimes[l]<te&&(G=!0),r.uPulseOrigin.value[l].copy(e.pulseOrigins[l]);r.uTime.value=e.time,r.uClock.value=e.clock,r.uWorldRadius.value=q,r.uDepthFade.value=M(o.depthFade,0,1),r.uPointer.value.set(e.pointerX*2-1,e.pointerY*2-1),r.uHover.value=e.hover*M(o.hoverBoost,0,3),r.uHoverRadius.value=M(o.hoverRadius,.02,1),r.uAspect.value=y,r.uPulseTime.value.set(e.pulseTimes[0],e.pulseTimes[1],e.pulseTimes[2],e.pulseTimes[3]),r.uPulseSpeed.value=J,r.uSize.value=3.2*M(o.nodeSize,0,4),r.uPixelRatio.value=L.viewport.dpr,r.uLineGain.value=1+(Math.max(L.viewport.dpr,1)-1)*.85,r.uReach.value=T,r.uLineOpacity.value=M(o.lineOpacity,0,2);const w=A||G||e.spinVelocity.lengthSq()>1e-6||Math.abs(e.hover-I)>.002||Math.abs(e.lean.x-j)>.001||Math.abs(e.lean.y-m)>.001;!D&&w&&f()}),Y.jsxs("group",{ref:P,children:[Y.jsx("lineSegments",{geometry:X.lines,frustumCulled:!1,children:Y.jsx("shaderMaterial",{ref:S,vertexShader:Ce,fragmentShader:Xe,uniforms:O,transparent:!0,depthTest:!1,depthWrite:!1})}),Y.jsx("points",{geometry:X.nodes,frustumCulled:!1,children:Y.jsx("shaderMaterial",{ref:d,vertexShader:ke,fragmentShader:Ee,uniforms:O,transparent:!0,depthTest:!1,depthWrite:!1})})]})},Ge=({colors:t=ee,backgroundColor:a="#0a0a0a",nodes:c=2400,connections:u=4,reach:f=.2,clustering:P=.85,chords:d=.35,radius:S=.4,originX:W=.5,originY:s=.5,lineOpacity:O=.7,nodeSize:h=.8,depthFade:k=.7,spin:T=1,tilt:U=18,interactive:z=!0,draggable:b=!0,hoverRadius:X=.22,hoverBoost:V=1,clickPulse:N=!0,pulseSpeed:F=1.2,seed:L=0,paused:R=!1,dpr:v=2,className:n,style:r,children:e})=>{const o=x.useRef(null),i=x.useRef({x:.5,y:.5,inside:!1,down:!1,lastClientX:0,lastClientY:0,dragX:0,dragY:0,presses:0,pressX:0,pressY:0,travel:0}),p=x.useRef(null),[D,y]=x.useState(!0),E=x.useSyncExternalStore(ze,He,()=>!1),H=x.useSyncExternalStore(Ye,Te,()=>1),q=Math.min(H,Math.max(v,.5)),A=!R&&!E,B=ge(a),j={colors:t,backgroundColor:a,nodes:c,connections:u,reach:f,clustering:P,chords:d,radius:S,originX:W,originY:s,lineOpacity:O,nodeSize:h,depthFade:k,spin:T,tilt:U,interactive:z,draggable:b,hoverRadius:X,hoverBoost:V,clickPulse:N,pulseSpeed:F,seed:L,paused:R,reduced:E};return x.useEffect(()=>{const m=o.current;if(!m||typeof IntersectionObserver>"u")return;const C=new IntersectionObserver(([I])=>y(I.isIntersecting),{rootMargin:"80px"});return C.observe(m),()=>C.disconnect()},[]),x.useEffect(()=>{const m=o.current;if(!m)return;const C=w=>{const l=m.getBoundingClientRect(),g=i.current;return g.x=(w.clientX-l.left)/Math.max(l.width,1),g.y=1-(w.clientY-l.top)/Math.max(l.height,1),g.inside=!0,l},I=w=>{const l=C(w),g=i.current;if(g.down){const K=1/Math.max(l.height,1),se=(w.clientX-g.lastClientX)*K,ie=(w.clientY-g.lastClientY)*K;g.dragX+=se,g.dragY+=ie,g.travel+=Math.hypot(se,ie)}g.lastClientX=w.clientX,g.lastClientY=w.clientY,p.current?.()},J=w=>{C(w);const l=i.current;l.down=!0,l.travel=0,l.lastClientX=w.clientX,l.lastClientY=w.clientY,p.current?.()},te=w=>{const l=i.current;l.down&&l.travel<.02&&(l.pressX=l.x*2-1,l.pressY=l.y*2-1,l.presses+=1),l.down=!1,w.pointerType!=="mouse"&&(l.inside=!1),p.current?.()},G=()=>{const w=i.current;w.inside=!1,w.down=!1,p.current?.()};return m.addEventListener("pointermove",I,{passive:!0}),m.addEventListener("pointerdown",J,{passive:!0}),m.addEventListener("pointerup",te,{passive:!0}),m.addEventListener("pointerleave",G,{passive:!0}),m.addEventListener("pointercancel",G,{passive:!0}),()=>{m.removeEventListener("pointermove",I),m.removeEventListener("pointerdown",J),m.removeEventListener("pointerup",te),m.removeEventListener("pointerleave",G),m.removeEventListener("pointercancel",G)}},[]),Y.jsxs("div",{ref:o,className:["as-root",n].filter(Boolean).join(" "),style:{backgroundColor:B?void 0:a,touchAction:b&&z?"none":void 0,...r},children:[Y.jsx("div",{className:"as-layer","aria-hidden":"true",children:Y.jsx(ye,{dpr:q,frameloop:D&&A?"always":"demand",camera:{fov:he,near:.1,far:100,position:[0,0,10]},gl:{antialias:!0,alpha:!0,premultipliedAlpha:!0,powerPreference:"high-performance"},style:{pointerEvents:"none"},children:Y.jsx(qe,{settings:j,pointerRef:i,wakeRef:p})})}),e?Y.jsx("div",{className:"as-content",children:e}):null]})};export{Ge as AstralShell,Ge as default};
