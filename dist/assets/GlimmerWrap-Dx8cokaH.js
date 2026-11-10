import{r as I,j as xe}from"./react-B78sy4Ov.js";import{W as Je,S as Qe,O as et,n as tt,Y as at,d as De,x as nt,r as ot,Z as Be,s as rt,e as be,M as it,q as Ne,X as st,E as lt,I as ct,J as ut,K as ft,_ as Re,t as dt}from"./three-w10evGE7.js";const vt=9e3,ie=4,J=8,We=Math.PI*2,n=(a,o,c)=>Math.min(c,Math.max(o,a)),pt=a=>{const o=window.matchMedia("(prefers-reduced-motion: reduce)");return o.addEventListener("change",a),()=>o.removeEventListener("change",a)},mt=()=>typeof window<"u"&&window.matchMedia("(prefers-reduced-motion: reduce)").matches,me=new Ne,he=a=>{const o=a.trim().toLowerCase();if(!o||o==="transparent"||o==="none")return null;try{me.setStyle(o,dt)}catch{return null}return[me.r,me.g,me.b]},Se=a=>a<=.04045?a/12.92:Math.pow((a+.055)/1.055,2.4),ke=a=>a<=.0031308?a*12.92:1.055*Math.pow(a,1/2.4)-.055,Oe=([a,o,c])=>{const L=Se(a),v=Se(o),f=Se(c),h=Math.cbrt(.4122214708*L+.5363325363*v+.0514459929*f),G=Math.cbrt(.2119034982*L+.6806995451*v+.1073969566*f),H=Math.cbrt(.0883024619*L+.2817188376*v+.6299787005*f);return[.2104542553*h+.793617785*G-.0040720468*H,1.9779984951*h-2.428592205*G+.4505937099*H,.0259040371*h+.7827717662*G-.808675766*H]},Pe=([a,o,c])=>{const L=Math.pow(a+.3963377774*o+.2158037573*c,3),v=Math.pow(a-.1055613458*o-.0638541728*c,3),f=Math.pow(a-.0894841775*o-1.291485548*c,3);return[n(ke(4.0767416621*L-3.3077115913*v+.2309699292*f),0,1),n(ke(-1.2684380046*L+2.6097574011*v-.3413193965*f),0,1),n(ke(-.0041960863*L-.7034186147*v+1.707614701*f),0,1)]},ht=a=>{let o=Math.floor(Math.abs(a))%2147483646+1;return()=>(o=o*16807%2147483647,(o-1)/2147483646)},gt=`
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
uniform vec4 uWaves[${ie}];
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
  for (int i = 0; i < ${ie}; i++) {
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
`,wt=`
precision highp float;
uniform vec3 uLut[${J}];
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
  float x = clamp(t, 0.0, 1.0) * ${J-1}.0;
  int i = int(floor(x));
  int j = min(i + 1, ${J-1});
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
`,yt=(a,o,c)=>{const L=a.ownerDocument,v=L.defaultView??window,f=L.createElement("canvas");f.setAttribute("aria-hidden","true"),f.style.cssText="position:absolute;inset:0;width:100%;height:100%;display:block";let h;try{h=new Je({canvas:f,alpha:!1,antialias:!1,powerPreference:"high-performance"})}catch{return null}o.appendChild(f);const G=new Qe,H=new et(-1,1,1,-1,-1,1),Q=new tt(2,2),A=new at;A.index=Q.index,A.setAttribute("position",Q.getAttribute("position")),A.instanceCount=0;const se=Array.from({length:J},()=>new De(1,1,1)),ee=Array.from({length:ie},()=>new nt(0,0,0,0)),M=new ot({uniforms:{uView:{value:new be(1,1)},uCenter:{value:new be(0,0)},uFocal:{value:300},uTravel:{value:0},uExposure:{value:0},uTime:{value:0},uSpread:{value:1},uHollow:{value:.2},uNear:{value:.05},uTwist:{value:0},uTurbulence:{value:0},uLook:{value:new be(0,0)},uSize:{value:1.6},uSizeVariance:{value:.6},uBrightness:{value:1},uFocus:{value:.6},uAperture:{value:.4},uGlitter:{value:.4},uGlintSize:{value:1},uTwinkle:{value:.5},uFade:{value:0},uDpr:{value:1},uWaves:{value:ee},uLut:{value:se},uGlintColor:{value:new De(1,1,1)},uInk:{value:0}},vertexShader:gt,fragmentShader:wt,transparent:!0,side:rt,depthTest:!1,depthWrite:!1,blending:Be}),le=new it(A,M);le.frustumCulled=!1,G.add(le);let b=0,S=0,_=1,j=!1,te=-1,C=[.04,.04,.04],ae="",V=!1,ce=-10,D=0,ue=0,U=1,ne=0,X=0,O=!1,w=null;const r={yaw:0,pitch:0,yawV:0,pitchV:0,tx:0,ty:0},E=[];let P=-1,z=!1,k=0,B=0,N=!1,$=!1,Z=!1,T=!1;const R=()=>performance.now()/1e3,W=()=>{const t=c.current,e=Math.round(a.clientWidth),i=Math.round(a.clientHeight);if(e<2||i<2)return j=!1,!1;const l=Math.min(v.devicePixelRatio||1,Math.max(t.dpr,.5));return j&&e===b&&i===S&&l===_?!1:(j=!0,b=e,S=i,_=l,h.setPixelRatio(_),h.setSize(b,S,!1),T=!1,!0)},ge=()=>{C=he(c.current.backgroundColor)??[0,0,0]},Le=()=>{const t=c.current,e=[C.join(","),t.colors[0],t.colors[1]].join("|");if(e===ae)return;ae=e,V=.2126*C[0]+.7152*C[1]+.0722*C[2]>.55;const i=(he(t.backgroundColor),1);h.setClearColor(new Ne().setRGB(C[0],C[1],C[2],st),i);const l=Oe(he(t.colors[0])??[1,1,1]),p=Oe(he(t.colors[1])??[.69,.62,.94]),d=g=>Math.hypot(g[1],g[2]),re=(g,F)=>{if(!V)return g;let m=g;d(g)<.03&&d(F)>=.03&&(m=F);const de=d(m);if(de<.03)return[.34,0,0];const ve=Math.max(1,.15/de);return[n(m[0],.4,.55),m[1]*ve,m[2]*ve]},x=re(l,p),q=re(p,l);for(let g=0;g<J;g++){const F=g/(J-1),m=Pe([x[0]+(q[0]-x[0])*F,x[1]+(q[1]-x[1])*F,x[2]+(q[2]-x[2])*F]);se[g].set(m[0],m[1],m[2])}const Y=V?Pe([Math.min((x[0]+q[0])/2,.42),(x[1]+q[1])/2,(x[2]+q[2])/2]):[1,1,1];M.uniforms.uGlintColor.value.set(Y[0],Y[1],Y[2]),M.uniforms.uInk.value=V?1:0,M.blending=V?lt:Be,V&&(M.blendEquation=ct,M.blendSrc=ut,M.blendDst=ft),M.needsUpdate=!0,T=!1},Me=()=>{const t=c.current,e=n(Math.round(t.count),0,vt);if(e===te)return;te=e;const i=ht(9173),l=new Float32Array(Math.max(e,1)*4),p=new Float32Array(Math.max(e,1)*4);for(let d=0;d<e;d++)l[d*4]=i(),l[d*4+1]=i()*100,l[d*4+2]=i()*100,l[d*4+3]=i(),p[d*4]=Math.pow(i(),1.6),p[d*4+1]=i(),p[d*4+2]=i(),p[d*4+3]=i();A.setAttribute("aSeed",new Re(l,4)),A.setAttribute("aLook",new Re(p,4)),A.instanceCount=e,T=!1},y=()=>{$||Z||!N||k||(k=requestAnimationFrame(Xe))},ze=(t,e)=>{if(c.current.reduced||!j)return;const l=t===void 0?b/2:n(t,0,1)*b,p=e===void 0?S/2:n(e,0,1)*S;E.length>=ie&&E.shift(),E.push({x:l,y:p,born:R()}),y()},_e=(t=1.2)=>{c.current.reduced||(X=Math.max(X,R()+n(t,.1,10)),y())},Ue=()=>{P=-1,z=!1,y()};function Xe(t){if(k=0,$||Z||!j&&(W(),!j))return;const e=c.current,i=B&&t-B<100?Math.min(Math.max((t-B)/1e3,0),.05):1/60;B=t;const l=R(),p=e.reduced;W(),l-ce>1.2&&(ce=l,ge()),Le(),Me(),P<0&&(P=l,z=p||!e.intro);let d=1,re=1;if(!z){const u=l-P;d=1-Math.pow(1-n(u/1.1,0,1),3),re=1+7*Math.exp(-u/.45),u>2.6&&(z=!0)}const x=!e.paused&&!p,q=x&&(O||l<X),Y=q?Math.max(e.boost,1):1,g=We/(q?.9:1.3),F=Math.max(1,Math.ceil(i*240)),m=i/F;for(let u=0;u<F;u++)ne+=(g*g*(Y-U)-2*g*ne)*m,U+=ne*m;const de=e.direction==="inward"?-1:1,ve=n(e.speed,0,5)*.1,Ie=x?ve*U*re:0;D+=Ie*i*de,(D>1e4||D<-1e4)&&(D-=Math.round(D)),x&&(ue+=i);const He=p?0:n(e.parallax,0,1),K=We/1.1;for(let u=0;u<F;u++)r.yawV+=(K*K*(r.tx*He*.16-r.yaw)-2*K*r.yawV)*m,r.pitchV+=(K*K*(r.ty*He*.11-r.pitch)-2*K*r.pitchV)*m,r.yaw+=r.yawV*m,r.pitch+=r.pitchV*m;const $e=Math.hypot(b,S);let je=0;for(let u=E.length-1;u>=0;u--)l-E[u].born>2.4&&E.splice(u,1);for(let u=0;u<ie;u++){const pe=E[u];if(!pe){ee[u].set(0,0,0,0);continue}const ye=l-pe.born,Ye=ye*$e*.42,Ke=Math.exp(-ye/.9)*Math.min(ye/.06,1);ee[u].set(pe.x,pe.y,Ye,Ke),je++}const Ze=Math.min(b,S),s=M.uniforms;s.uView.value.set(b,S),s.uCenter.value.set(n(e.centerX,-1,2)*b,n(e.centerY,-1,2)*S),s.uFocal.value=Ze*.42,s.uTravel.value=D,s.uExposure.value=Math.min(Ie*n(e.trail,0,1)*.6,.6),s.uTime.value=ue,s.uSpread.value=n(e.spread,.1,4),s.uHollow.value=n(e.hollow,0,.95),s.uNear.value=.26-.235*n(e.perspective,0,1),s.uTwist.value=n(e.twist,-2,2),s.uTurbulence.value=n(e.turbulence,0,2),s.uLook.value.set(r.yaw,r.pitch),s.uSize.value=n(e.size,.2,8),s.uSizeVariance.value=n(e.sizeVariance,0,1),s.uBrightness.value=n(e.brightness,0,3)*(V?1.3:1),s.uFocus.value=n(e.focus,0,1),s.uAperture.value=n(e.aperture,0,1)*1.6,s.uGlitter.value=p?0:n(e.glitter,0,2),s.uGlintSize.value=n(e.glintSize,0,3),s.uTwinkle.value=p?0:n(e.twinkle,0,1),s.uFade.value=d,s.uDpr.value=_,h.render(G,H),T=!0,(x||!z||je>0||Math.abs(U-Y)>.001||Math.abs(r.yawV)+Math.abs(r.pitchV)>1e-5)&&y()}const Te=t=>{const e=a.getBoundingClientRect();return{x:t.clientX-e.left,y:t.clientY-e.top}},Ae=t=>t instanceof Element&&!!t.closest("a,button,input,textarea,select,label,summary,[role=button],[contenteditable=true]");let oe=0;const Ce=t=>{const e=Te(t);t.pointerType!=="touch"&&(r.tx=n(e.x/Math.max(b,1)*2-1,-1,1),r.ty=n(e.y/Math.max(S,1)*2-1,-1,1)),w&&w.id===t.pointerId&&Math.hypot(e.x-w.x,e.y-w.y)>10&&(w.moved=!0,t.pointerType==="touch"&&(O=!1,v.clearTimeout(oe))),y()},Ee=t=>{t.pointerType!=="touch"&&(r.tx=0,r.ty=0,y())},Fe=t=>{if(!t.isPrimary||t.button>0||Ae(t.target))return;const e=Te(t);w={id:t.pointerId,x:e.x,y:e.y,at:performance.now(),moved:!1},v.clearTimeout(oe),oe=v.setTimeout(()=>{w&&!w.moved&&(O=!0,y())},180)},fe=t=>{if(!w||w.id!==t.pointerId)return;const e=w;w=null,v.clearTimeout(oe);const i=O;O=!1,y(),!(t.type==="pointercancel"||i||e.moved||Ae(t.target))&&c.current.waves&&ze(e.x/Math.max(b,1),e.y/Math.max(S,1))};a.addEventListener("pointermove",Ce),a.addEventListener("pointerleave",Ee),a.addEventListener("pointerdown",Fe),a.addEventListener("pointerup",fe),a.addEventListener("pointercancel",fe);const Ge=new ResizeObserver(()=>{W()&&y()});Ge.observe(a);const we=typeof IntersectionObserver>"u"?null:new IntersectionObserver(([t])=>{N=t.isIntersecting,N?(B=0,y()):(k&&cancelAnimationFrame(k),k=0)},{rootMargin:"80px"});we?we.observe(a):N=!0;const Ve=t=>{t.preventDefault(),Z=!0,k&&cancelAnimationFrame(k),k=0},qe=()=>{Z=!1,ae="",te=-1,y()};return f.addEventListener("webglcontextlost",Ve),f.addEventListener("webglcontextrestored",qe),W(),ge(),Le(),Me(),h.compile(G,H),y(),{sync:()=>{W(),ge(),T||y(),y()},wave:ze,warp:_e,replay:Ue,destroy:()=>{$=!0,k&&cancelAnimationFrame(k),v.clearTimeout(oe),we?.disconnect(),Ge.disconnect(),a.removeEventListener("pointermove",Ce),a.removeEventListener("pointerleave",Ee),a.removeEventListener("pointerdown",Fe),a.removeEventListener("pointerup",fe),a.removeEventListener("pointercancel",fe),f.removeEventListener("webglcontextlost",Ve),f.removeEventListener("webglcontextrestored",qe),M.dispose(),A.dispose(),Q.dispose(),h.dispose(),h.getContext().isContextLost()||h.forceContextLoss(),f.remove()}}},xt=I.forwardRef(function({colors:o=["#FFFFFF","#B19EEF"],backgroundColor:c="transparent",count:L=1500,size:v=1.6,sizeVariance:f=.6,brightness:h=1,spread:G=1,hollow:H=.06,perspective:Q=.7,centerX:A=.5,centerY:se=.5,speed:ee=.5,direction:M="outward",twist:le=0,turbulence:b=0,trail:S=.08,glitter:_=.5,glintSize:j=1,twinkle:te=.5,focus:C=.62,aperture:ae=.45,boost:V=7,parallax:ce=.5,waves:D=!0,intro:ue=!0,paused:U=!1,dpr:ne=2,children:X,className:O,style:w},r){const E=I.useRef(null),P=I.useRef(null),z=I.useRef(null),k=I.useSyncExternalStore(pt,mt,()=>!1),B={colors:o,backgroundColor:c,count:L,size:v,sizeVariance:f,brightness:h,spread:G,hollow:H,perspective:Q,centerX:A,centerY:se,speed:ee,direction:M,twist:le,turbulence:b,trail:S,glitter:_,glintSize:j,twinkle:te,focus:C,aperture:ae,boost:V,parallax:ce,waves:D,intro:ue,paused:U,dpr:ne,reduced:k},N=I.useRef(B);I.useEffect(()=>{N.current=B,z.current?.sync()}),I.useEffect(()=>{const T=E.current,R=P.current;if(!T||!R)return;const W=yt(T,R,N);return z.current=W,()=>{W?.destroy(),z.current=null}},[]),I.useImperativeHandle(r,()=>({wave:(T,R)=>z.current?.wave(T,R),warp:T=>z.current?.warp(T),replay:()=>z.current?.replay()}),[]);const $=c.trim().toLowerCase(),Z=$==="transparent"||$==="";return xe.jsxs("div",{ref:E,className:["gw-root","relative isolate h-full min-h-[320px] w-full overflow-hidden",O].filter(Boolean).join(" "),style:{backgroundColor:Z?void 0:c,touchAction:"pan-y",...w},children:[xe.jsx("div",{ref:P,"aria-hidden":"true",style:{position:"absolute",inset:0,zIndex:0}}),X?xe.jsx("div",{style:{position:"relative",zIndex:1,height:"100%"},children:X}):null]})});xt.displayName="GlimmerWrap";export{xt as GlimmerWrap,xt as default};
