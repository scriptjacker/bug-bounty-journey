// Interactive dotted globe. Raw WebGL, no library.
// Land dots come from Natural Earth (tools/build-globe.mjs); markers and arcs come from data/orgs.json.
import LAND from "./land-dots.js?v=bf1747b4";
import { ORIGIN, COUNTRIES } from "./globe-data.js?v=bf1747b4";

const DEG = Math.PI / 180;
const CAM = 4;                         // camera distance, globe radius is 1
const FOCAL = 0.74 * Math.sqrt(CAM * CAM - 1); // silhouette fills 74% so arcs have room above the surface
const HORIZON = 1 / CAM;               // a surface point is visible when its z is above this
const LABELS = ["NL", "DE", "US", "AU", "GB", "SE"];

const toVec = (lat, lon) => {
  const a = lat * DEG, b = lon * DEG;
  return [Math.cos(a) * Math.sin(b), Math.sin(a), Math.cos(a) * Math.cos(b)];
};
const norm = (v) => { const l = Math.hypot(v[0], v[1], v[2]); return [v[0] / l, v[1] / l, v[2] / l]; };

function slerp(a, b, t) {
  const dot = Math.min(1, Math.max(-1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2]));
  const w = Math.acos(dot);
  if (w < 1e-4) return a.slice();
  const s = Math.sin(w), k1 = Math.sin((1 - t) * w) / s, k2 = Math.sin(t * w) / s;
  return [a[0] * k1 + b[0] * k2, a[1] * k1 + b[1] * k2, a[2] * k1 + b[2] * k2];
}

// Rotation that brings (lat, lon) to the front, as a column major mat3.
function rotation(lon, lat) {
  const c = Math.cos(lon), s = Math.sin(lon), c2 = Math.cos(lat), s2 = Math.sin(lat);
  // yaw: x' = x c - z s, z' = z c + x s.  pitch: y'' = y c2 - z' s2, z'' = z' c2 + y s2
  return new Float32Array([
    c, -s * s2, s * c2,
    0, c2, s2,
    -s, -c * s2, c * c2,
  ]);
}
const apply = (m, v) => [
  m[0] * v[0] + m[3] * v[1] + m[6] * v[2],
  m[1] * v[0] + m[4] * v[1] + m[7] * v[2],
  m[2] * v[0] + m[5] * v[1] + m[8] * v[2],
];

const PROJECT = `
uniform mat3 uRot; uniform float uF; uniform float uD;
vec4 project(vec3 p) { return vec4(uF * p.xy, 0.0, uD - p.z); }
`;

const DOT_VS = `
attribute vec3 aPos;
uniform float uSize; uniform float uIntro;
varying float vAlpha;
${PROJECT}
void main() {
  vec3 p = uRot * aPos;
  gl_Position = project(p);
  float face = smoothstep(${HORIZON.toFixed(3)}, ${(HORIZON + 0.22).toFixed(3)}, p.z);
  // Dots fade in from the center of the visible disc outward during the intro.
  float prog = uIntro * 1.25;
  vAlpha = face * (1.0 - smoothstep(prog - 0.25, prog, length(p.xy)));
  gl_PointSize = uSize * (0.75 + 0.25 * p.z);
}`;
const DOT_FS = `
precision mediump float;
uniform vec4 uColor; varying float vAlpha;
void main() {
  float d = length(gl_PointCoord - 0.5);
  if (d > 0.5 || vAlpha < 0.01) discard;
  gl_FragColor = vec4(uColor.rgb, uColor.a * vAlpha * smoothstep(0.5, 0.3, d));
}`;

const MARK_VS = `
attribute vec3 aPos; attribute vec2 aInfo; // x: size factor, y: seed
uniform float uSize; uniform float uIntro;
varying float vAlpha; varying float vSeed; varying float vCore;
${PROJECT}
void main() {
  vec3 p = uRot * aPos;
  gl_Position = project(p);
  vAlpha = smoothstep(${HORIZON.toFixed(3)}, ${(HORIZON + 0.18).toFixed(3)}, p.z) * smoothstep(0.35, 0.8, uIntro);
  vSeed = aInfo.y;
  vCore = 0.12 + 0.06 * aInfo.x;
  gl_PointSize = uSize * (3.0 + 2.0 * aInfo.x);
}`;
const MARK_FS = `
precision mediump float;
uniform vec3 uColor; uniform vec3 uHome; uniform float uTime;
varying float vAlpha; varying float vSeed; varying float vCore;
void main() {
  if (vAlpha < 0.01) discard;
  float d = length(gl_PointCoord - 0.5);
  float phase = fract(uTime * 0.35 + vSeed);
  float r = vCore + phase * (0.5 - vCore);
  float ring = (1.0 - smoothstep(0.0, 0.045, abs(d - r))) * (1.0 - phase) * 0.8;
  float core = 1.0 - smoothstep(vCore - 0.05, vCore, d);
  vec3 col = vSeed < 0.0 ? uHome : uColor;
  float a = max(core, ring) * vAlpha;
  if (a < 0.01) discard;
  gl_FragColor = vec4(col, a);
}`;

const ARC_VS = `
attribute vec4 aA; attribute vec4 aB; attribute vec2 aCorner; attribute float aSeed;
uniform vec2 uRes; uniform float uWidth;
varying float vT; varying float vSeed; varying float vVis;
${PROJECT}
void main() {
  vec3 pa = uRot * aA.xyz, pb = uRot * aB.xyz;
  vec4 ca = project(pa), cb = project(pb);
  vec2 sa = ca.xy / ca.w * uRes, sb = cb.xy / cb.w * uRes;
  vec2 dir = sb - sa;
  float len = length(dir);
  vec2 n = len > 1e-4 ? vec2(-dir.y, dir.x) / len : vec2(0.0);
  bool atA = aCorner.x < 0.5;
  vec4 c = atA ? ca : cb;
  vec3 p = atA ? pa : pb;
  c.xy += n * aCorner.y * uWidth / uRes * c.w;
  gl_Position = c;
  vT = atA ? aA.w : aB.w;
  vSeed = aSeed;
  vVis = smoothstep(-0.05, 0.4, p.z);
}`;
const ARC_FS = `
precision mediump float;
uniform vec3 uColor; uniform float uTime; uniform float uIntro;
varying float vT; varying float vSeed; varying float vVis;
void main() {
  float drawn = step(vT, clamp(uIntro * 1.6 - vSeed * 0.6, 0.0, 1.0));
  float head = fract(uTime * 0.16 + vSeed);
  float d = head - vT;
  float pulse = step(0.0, d) * (1.0 - smoothstep(0.0, 0.28, d));
  float a = (0.16 + 0.84 * pulse) * vVis * drawn;
  if (a < 0.01) discard;
  gl_FragColor = vec4(uColor, a);
}`;

function compile(gl, vs, fs) {
  const prog = gl.createProgram();
  for (const [type, src] of [[gl.VERTEX_SHADER, vs], [gl.FRAGMENT_SHADER, fs]]) {
    const sh = gl.createShader(type);
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(sh));
    gl.attachShader(prog, sh);
  }
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
  const loc = new Proxy({}, {
    get: (cache, name) => cache[name] ?? (cache[name] = name.startsWith("u") ? gl.getUniformLocation(prog, name) : gl.getAttribLocation(prog, name)),
  });
  return { prog, loc };
}

function buffer(gl, data) {
  const b = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, b);
  gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
  return b;
}

function landPoints() {
  const bin = atob(LAND);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  const ll = new Int16Array(bytes.buffer);
  const out = new Float32Array((ll.length / 2) * 3);
  for (let i = 0, j = 0; i < ll.length; i += 2, j += 3) out.set(toVec(ll[i] / 100, ll[i + 1] / 100), j);
  return out;
}

function arcGeometry(origin) {
  const SEG = 48;
  const targets = COUNTRIES.filter((c) => c[0] !== "IN");
  const verts = [];
  targets.forEach((c, k) => {
    const b = toVec(c[2], c[3]);
    const w = Math.acos(Math.min(1, origin[0] * b[0] + origin[1] * b[1] + origin[2] * b[2]));
    const lift = 0.05 + 0.24 * (w / Math.PI);
    const pts = [];
    for (let i = 0; i <= SEG; i++) {
      const t = i / SEG, p = norm(slerp(origin, b, t)), h = 1 + lift * Math.sin(Math.PI * t);
      pts.push([p[0] * h, p[1] * h, p[2] * h, t]);
    }
    const seed = (k * 0.61803) % 1;
    for (let i = 0; i < SEG; i++) {
      const A = pts[i], B = pts[i + 1];
      // two triangles per segment: corners (end, side)
      for (const [e, s] of [[0, -1], [0, 1], [1, -1], [1, -1], [0, 1], [1, 1]]) verts.push(...A, ...B, e, s, seed);
    }
  });
  return { data: new Float32Array(verts), count: verts.length / 11 };
}

function readColors() {
  const cs = getComputedStyle(document.documentElement);
  const rgb = (name) => cs.getPropertyValue(name).split(",").map((v) => parseFloat(v) / 255);
  const light = document.documentElement.dataset.theme === "light";
  return { dot: rgb("--globe-dot"), accent: rgb("--globe-accent"), home: light ? [0.05, 0.06, 0.08] : [0.93, 0.94, 0.95], dotAlpha: light ? 0.5 : 0.42 };
}

export function mountGlobe(root) {
  const canvas = root.querySelector("canvas");
  const labelLayer = root.querySelector(".globe__labels");
  // Refuse software rendering: without a real GPU the static image looks the same and costs nothing.
  const force = root.hasAttribute("data-globe-force");
  const gl = canvas.getContext("webgl", { antialias: true, alpha: true, premultipliedAlpha: true, powerPreference: "low-power", failIfMajorPerformanceCaveat: !force });
  if (!gl) { root.classList.add("no-webgl"); return; }
  if (!force) {
    const info = gl.getExtension("WEBGL_debug_renderer_info");
    const renderer = String(gl.getParameter(info ? info.UNMASKED_RENDERER_WEBGL : gl.RENDERER));
    if (/swiftshader|llvmpipe|softpipe|software|basic render/i.test(renderer)) {
      gl.getExtension("WEBGL_lose_context")?.loseContext();
      root.classList.add("no-webgl");
      return;
    }
  }
  root.classList.add("is-live");

  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const origin = toVec(ORIGIN[0], ORIGIN[1]);

  const dots = compile(gl, DOT_VS, DOT_FS);
  const marks = compile(gl, MARK_VS, MARK_FS);
  const arcs = compile(gl, ARC_VS, ARC_FS);

  const land = landPoints();
  const landBuf = buffer(gl, land);
  const maxCount = Math.max(...COUNTRIES.map((c) => c[4]));
  const markData = [];
  COUNTRIES.forEach((c, i) => markData.push(...toVec(c[2], c[3]), Math.log(1 + c[4]) / Math.log(1 + maxCount), c[0] === "IN" ? -1 : (i * 0.37) % 1));
  if (!COUNTRIES.some((c) => c[0] === "IN")) markData.push(...origin, 0.4, -1);
  const markBuf = buffer(gl, new Float32Array(markData));
  const markCount = markData.length / 5;
  const arc = arcGeometry(origin);
  const arcBuf = buffer(gl, arc.data);

  // Labels for the biggest countries, positioned in CSS pixels every frame.
  const labelled = LABELS.map((code) => COUNTRIES.find((c) => c[0] === code)).filter(Boolean).map((c) => {
    const el = document.createElement("span");
    el.className = "globe__label";
    el.innerHTML = `${c[1]}<b>${c[4]}</b>`;
    labelLayer.appendChild(el);
    return { el, v: toVec(c[2], c[3]), last: "" };
  });

  let colors = readColors();
  let size = 0, dpr = 1, maxPoint = gl.getParameter(gl.ALIASED_POINT_SIZE_RANGE)[1] || 64;
  // Start over Europe, tilted so India and the northern hemisphere sit in view.
  let yaw = 38 * DEG, pitch = 24 * DEG, vYaw = 0, vPitch = 0;
  let dragging = false, lastX = 0, lastY = 0, idleUntil = 0;
  let visible = false, raf = 0, t0 = performance.now(), introStart = 0;

  let dprCap = 2;
  function resize(width = canvas.clientWidth) {
    dpr = Math.min(window.devicePixelRatio || 1, dprCap);
    size = Math.max(1, Math.round(width * dpr));
    canvas.width = size;
    canvas.height = size;
    gl.viewport(0, 0, size, size);
    if (!raf) frame(performance.now());
  }

  function draw(now) {
    const time = reduce ? 6 : (now - t0) / 1000;
    const intro = reduce ? 1 : introStart ? Math.min(1, (now - introStart) / 2600) : 0;
    const easeIntro = 1 - Math.pow(1 - intro, 3);
    const rot = rotation(yaw, pitch);
    const px = size / 300; // base dot size in device pixels, scaled with the canvas

    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.enable(gl.BLEND);
    gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

    // land
    gl.useProgram(dots.prog);
    gl.uniformMatrix3fv(dots.loc.uRot, false, rot);
    gl.uniform1f(dots.loc.uF, FOCAL); gl.uniform1f(dots.loc.uD, CAM);
    gl.uniform1f(dots.loc.uSize, Math.min(maxPoint, px * 2.1));
    gl.uniform1f(dots.loc.uIntro, easeIntro);
    gl.uniform4f(dots.loc.uColor, ...colors.dot, colors.dotAlpha);
    gl.bindBuffer(gl.ARRAY_BUFFER, landBuf);
    gl.enableVertexAttribArray(dots.loc.aPos);
    gl.vertexAttribPointer(dots.loc.aPos, 3, gl.FLOAT, false, 0, 0);
    gl.drawArrays(gl.POINTS, 0, land.length / 3);
    gl.disableVertexAttribArray(dots.loc.aPos);

    // arcs
    gl.useProgram(arcs.prog);
    gl.uniformMatrix3fv(arcs.loc.uRot, false, rot);
    gl.uniform1f(arcs.loc.uF, FOCAL); gl.uniform1f(arcs.loc.uD, CAM);
    gl.uniform2f(arcs.loc.uRes, size / 2, size / 2);
    gl.uniform1f(arcs.loc.uWidth, Math.max(0.7, 0.9 * dpr));
    gl.uniform3f(arcs.loc.uColor, ...colors.accent);
    gl.uniform1f(arcs.loc.uTime, time);
    gl.uniform1f(arcs.loc.uIntro, easeIntro);
    gl.bindBuffer(gl.ARRAY_BUFFER, arcBuf);
    const stride = 11 * 4;
    const attrs = [["aA", 4, 0], ["aB", 4, 16], ["aCorner", 2, 32], ["aSeed", 1, 40]];
    for (const [n, c, o] of attrs) { gl.enableVertexAttribArray(arcs.loc[n]); gl.vertexAttribPointer(arcs.loc[n], c, gl.FLOAT, false, stride, o); }
    gl.drawArrays(gl.TRIANGLES, 0, arc.count);
    for (const [n] of attrs) gl.disableVertexAttribArray(arcs.loc[n]);

    // country markers
    gl.useProgram(marks.prog);
    gl.uniformMatrix3fv(marks.loc.uRot, false, rot);
    gl.uniform1f(marks.loc.uF, FOCAL); gl.uniform1f(marks.loc.uD, CAM);
    gl.uniform1f(marks.loc.uSize, Math.min(maxPoint / 6, px * 2.6));
    gl.uniform1f(marks.loc.uIntro, easeIntro);
    gl.uniform1f(marks.loc.uTime, time);
    gl.uniform3f(marks.loc.uColor, ...colors.accent);
    gl.uniform3f(marks.loc.uHome, ...colors.home);
    gl.bindBuffer(gl.ARRAY_BUFFER, markBuf);
    gl.enableVertexAttribArray(marks.loc.aPos);
    gl.enableVertexAttribArray(marks.loc.aInfo);
    gl.vertexAttribPointer(marks.loc.aPos, 3, gl.FLOAT, false, 20, 0);
    gl.vertexAttribPointer(marks.loc.aInfo, 2, gl.FLOAT, false, 20, 12);
    gl.drawArrays(gl.POINTS, 0, markCount);
    gl.disableVertexAttribArray(marks.loc.aPos);
    gl.disableVertexAttribArray(marks.loc.aInfo);

    // HTML labels
    const css = size / dpr, half = css / 2;
    for (const l of labelled) {
      const p = apply(rot, l.v);
      const w = CAM - p.z;
      const x = half + (FOCAL * p.x / w) * half;
      const y = half - (FOCAL * p.y / w) * half;
      const o = Math.max(0, Math.min(1, (p.z - HORIZON - 0.25) / 0.25)) * Math.max(0, (easeIntro - 0.6) / 0.4);
      const key = `${x | 0},${y | 0},${o.toFixed(2)}`;
      if (key !== l.last) {
        l.el.style.transform = `translate3d(${(x + 10).toFixed(1)}px, ${(y - 11).toFixed(1)}px, 0)`;
        l.el.style.opacity = o.toFixed(2);
        l.last = key;
      }
    }
  }

  // Adaptive quality: when the device cannot hold a smooth frame rate, drop resolution first,
  // then stop the idle spin (the globe still renders and still responds to dragging).
  let prev = performance.now(), slow = 0, sampled = 0, calm = false;
  function govern(interval) {
    if (dragging || sampled++ < 45) return; // skip warm up while the page is still loading
    slow = interval > 30 ? slow + 1 : Math.max(0, slow - 2);
    if (slow < 24) return;
    slow = 0;
    if (dprCap > 1 && dpr > 1) { dprCap = 1; resize(); }
    else calm = true;
  }
  function frame(now) {
    raf = 0;
    const interval = now - prev;
    const dt = Math.min(0.05, interval / 1000);
    prev = now;
    if (!dragging) {
      yaw += vYaw; pitch += vPitch;
      vYaw *= 0.94; vPitch *= 0.9;
      if (!reduce && !calm && now > idleUntil) yaw += dt * 0.07;
      pitch += (24 * DEG - pitch) * Math.min(1, dt * 0.8) * (Math.abs(vPitch) < 1e-4 ? 1 : 0);
    }
    pitch = Math.max(-0.6, Math.min(1.1, pitch));
    draw(now);
    govern(interval);
    const animating = (!reduce && !calm) || dragging || Math.abs(vYaw) > 1e-5 || Math.abs(vPitch) > 1e-5;
    if (visible && !document.hidden && animating) raf = requestAnimationFrame(frame);
  }
  const kick = () => { if (!raf && size) { prev = performance.now(); raf = requestAnimationFrame(frame); } };

  canvas.addEventListener("pointerdown", (e) => {
    dragging = true; lastX = e.clientX; lastY = e.clientY; vYaw = vPitch = 0;
    canvas.setPointerCapture(e.pointerId);
    kick();
  });
  canvas.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    const k = 3.2 / canvas.clientWidth;
    const dx = (e.clientX - lastX) * k, dy = (e.clientY - lastY) * k;
    yaw -= dx; pitch += dy; vYaw = -dx; vPitch = dy;
    lastX = e.clientX; lastY = e.clientY;
  });
  const release = () => { if (!dragging) return; dragging = false; idleUntil = performance.now() + 2500; kick(); };
  canvas.addEventListener("pointerup", release);
  canvas.addEventListener("pointercancel", release);

  new ResizeObserver(([entry]) => resize(entry.contentRect.width)).observe(canvas);
  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (visible) { if (!introStart) introStart = performance.now(); kick(); }
  }).observe(canvas);
  document.addEventListener("visibilitychange", kick);
  document.addEventListener("themechange", () => { colors = readColors(); kick(); if (reduce) draw(performance.now()); });

  canvas.addEventListener("webglcontextlost", (e) => { e.preventDefault(); cancelAnimationFrame(raf); raf = 0; root.classList.add("no-webgl"); });
}
