/* theVRgalaxy — core: loaders, noise, save, audio, sky, shared helpers. Three.js r160. */
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import { WORLDS, allWorlds } from './tvg-data.js';

export const IS_TOUCH = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
export const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
export const LOW = IS_TOUCH || (navigator.hardwareConcurrency || 8) <= 4;
export const ALL = allWorlds();
export const byId = id => ALL.find(w => w.id === id);
export const bySlug = s => ALL.find(w => w.slug === s);

/* ---------- random + noise ---------- */
export function rng(seed) { let a = seed >>> 0 || 1; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
export function makeNoise(seed) {
  const r = rng(seed), p = new Uint8Array(512), perm = [];
  for (let i = 0; i < 256; i++) perm[i] = i;
  for (let i = 255; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [perm[i], perm[j]] = [perm[j], perm[i]]; }
  for (let i = 0; i < 512; i++) p[i] = perm[i & 255];
  const G = [[1, 1], [-1, 1], [1, -1], [-1, -1], [1, 0], [-1, 0], [0, 1], [0, -1]];
  const F2 = 0.5 * (Math.sqrt(3) - 1), G2 = (3 - Math.sqrt(3)) / 6;
  function n2(x, y) {
    const s = (x + y) * F2, i = Math.floor(x + s), j = Math.floor(y + s), t = (i + j) * G2;
    const x0 = x - (i - t), y0 = y - (j - t), i1 = x0 > y0 ? 1 : 0, j1 = 1 - i1;
    const x1 = x0 - i1 + G2, y1 = y0 - j1 + G2, x2 = x0 - 1 + 2 * G2, y2 = y0 - 1 + 2 * G2;
    const ii = i & 255, jj = j & 255; let n = 0, tt;
    tt = 0.5 - x0 * x0 - y0 * y0; if (tt > 0) { const g = G[p[ii + p[jj]] & 7]; tt *= tt; n += tt * tt * (g[0] * x0 + g[1] * y0); }
    tt = 0.5 - x1 * x1 - y1 * y1; if (tt > 0) { const g = G[p[ii + i1 + p[jj + j1]] & 7]; tt *= tt; n += tt * tt * (g[0] * x1 + g[1] * y1); }
    tt = 0.5 - x2 * x2 - y2 * y2; if (tt > 0) { const g = G[p[ii + 1 + p[jj + 1]] & 7]; tt *= tt; n += tt * tt * (g[0] * x2 + g[1] * y2); }
    return 70 * n;
  }
  function fbm(x, y, o = 5) { let a = 0, f = 1, amp = 1, sum = 0; for (let i = 0; i < o; i++) { a += n2(x * f, y * f) * amp; sum += amp; f *= 2; amp *= 0.5; } return a / sum; }
  function ridge(x, y, o = 5) { let a = 0, f = 1, amp = 1, sum = 0; for (let i = 0; i < o; i++) { const v = 1 - Math.abs(n2(x * f, y * f)); a += v * v * amp; sum += amp; f *= 2; amp *= 0.5; } return a / sum; }
  return { n2, fbm, ridge };
}
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
export function lerpAngle(a, b, t) { let d = b - a; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; return a + d * t; }
export function esc(s) { return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

/* ---------- textures ---------- */
export function canvasTex(w, h, draw, srgb = true) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; }
let _glow = null;
export function glowTex() { if (!_glow) _glow = canvasTex(128, 128, (g) => { const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.22, 'rgba(255,255,255,.75)'); gr.addColorStop(0.55, 'rgba(255,255,255,.18)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); }, false); return _glow; }
export function glowSprite(color, size = 1, opacity = 1) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false })); s.scale.setScalar(size); return s; }
export function textSprite(text, opts = {}) {
  const fs = opts.size || 64, pad = 24, font = `700 ${fs}px "Exo 2", system-ui, sans-serif`;
  const m = document.createElement('canvas').getContext('2d'); m.font = font; const w = Math.ceil(m.measureText(text).width) + pad * 2, h = fs + pad * 2;
  const tex = canvasTex(w, h, (g) => { g.font = font; g.textAlign = 'center'; g.textBaseline = 'middle'; if (opts.bg) { g.fillStyle = opts.bg; roundRect(g, 4, 4, w - 8, h - 8, h / 2 - 4); g.fill(); } g.shadowColor = opts.glow || 'rgba(0,160,255,.8)'; g.shadowBlur = 16; g.fillStyle = opts.color || '#e8f1ff'; g.fillText(text, w / 2, h / 2 + 2); });
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, depthTest: opts.depthTest !== false }));
  const sc = (opts.scale || 1) * 0.01; s.scale.set(w * sc, h * sc, 1); s.userData.aspect = w / h; return s;
}
export function roundRect(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }

/* ---------- models ---------- */
const loader = new GLTFLoader();
const cache = new Map();
export function loadModel(name) {
  if (!cache.has(name)) cache.set(name, new Promise((res) => loader.load('/models/' + name + '.glb', g => res(g), undefined, (e) => { console.warn('model failed', name, e); res(null); })));
  return cache.get(name);
}
/* Clone a model (skinned-safe), normalize to a target height, optional tint + glow. */
export async function spawnModel(name, opts = {}) {
  const g = await loadModel(name); if (!g) return null;
  const obj = SkeletonUtils.clone(g.scene);
  const tint = opts.tint ? new THREE.Color(opts.tint) : null, glow = opts.glow ? new THREE.Color(opts.glow) : null;
  obj.traverse(o => {
    if (!o.isMesh) return; o.castShadow = opts.shadow !== false; o.receiveShadow = !!opts.receive;
    if (tint || glow || opts.cloneMat) {
      o.material = o.material.clone();
      if (tint && o.material.color) o.material.color.lerp(tint, opts.tintAmt ?? 0.55);
      if (glow && o.material.emissive) { o.material.emissive.copy(glow); o.material.emissiveIntensity = opts.glowAmt ?? 0.45; }
    }
  });
  if (opts.height) { const box = new THREE.Box3().setFromObject(obj); const h = box.max.y - box.min.y || 1; obj.scale.multiplyScalar(opts.height / h); const b2 = new THREE.Box3().setFromObject(obj); obj.position.y -= b2.min.y; const wrap = new THREE.Group(); wrap.add(obj); wrap.userData.inner = obj; attachAnims(wrap, obj, g.animations); return wrap; }
  const wrap = new THREE.Group(); wrap.add(obj); wrap.userData.inner = obj; attachAnims(wrap, obj, g.animations); return wrap;
}
function attachAnims(wrap, obj, clips) {
  if (!clips || !clips.length) return;
  const mixer = new THREE.AnimationMixer(obj), map = {};
  for (const c of clips) map[c.name] = c;
  wrap.userData.mixer = mixer; wrap.userData.clips = map; wrap.userData.cur = null;
  wrap.userData.play = (names, fade = 0.25, once = false) => {
    const list = Array.isArray(names) ? names : [names]; let clip = null; for (const n of list) if (map[n]) { clip = map[n]; break; }
    if (!clip) return null; const a = mixer.clipAction(clip);
    if (wrap.userData.cur === a && !once) return a;
    a.reset(); a.enabled = true; a.setEffectiveWeight(1);
    if (once) { a.setLoop(THREE.LoopOnce, 1); a.clampWhenFinished = true; } else a.setLoop(THREE.LoopRepeat, Infinity);
    a.play(); if (wrap.userData.cur && wrap.userData.cur !== a) wrap.userData.cur.crossFadeTo(a, fade, false);
    wrap.userData.cur = a; return a;
  };
}
/* Instanced static props: one draw call per mesh part, thousands of copies. */
export async function instanceProps(name, transforms, opts = {}) {
  const g = await loadModel(name); if (!g || !transforms.length) return null;
  const group = new THREE.Group(); const src = g.scene; src.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(src); const baseH = (box.max.y - box.min.y) || 1; const minY = box.min.y;
  const tint = opts.tint ? new THREE.Color(opts.tint) : null, glow = opts.glow ? new THREE.Color(opts.glow) : null;
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), pos = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
  src.traverse(o => {
    if (!o.isMesh) return;
    let mat = o.material.clone(); if (tint && mat.color) mat.color.lerp(tint, 0.55); if (glow && mat.emissive) { mat.emissive.copy(glow); mat.emissiveIntensity = 0.55; }
    const im = new THREE.InstancedMesh(o.geometry, mat, transforms.length); im.castShadow = !LOW || opts.bigShadow; im.receiveShadow = true;
    transforms.forEach((t, i) => {
      const s = t.s / baseH; q.setFromAxisAngle(up, t.r); sc.set(s, s, s); pos.set(t.x, t.y - minY * s, t.z);
      m4.compose(pos, q, sc).multiply(o.matrixWorld); im.setMatrixAt(i, m4);
    });
    im.instanceMatrix.needsUpdate = true; im.computeBoundingSphere(); group.add(im);
  });
  return group;
}

/* ---------- save ---------- */
const KEY = 'tvg-save-v1';
export const S = {
  char: 'finn', face: null, shards: [], glyphs: {}, friends: 0, weapons: ['blaster'], abilities: [], found: [], done: {}, seenIntro: false, settings: { sound: true, music: true, sens: 1 }, orbiAway: false, freedTotal: 0,
  load() { try { const d = JSON.parse(localStorage.getItem(KEY) || 'null'); if (d) Object.assign(this, d, { settings: Object.assign({}, this.settings, d.settings || {}) }); } catch (e) { } return this; },
  save() { try { const d = {}; for (const k of ['char', 'face', 'shards', 'glyphs', 'friends', 'weapons', 'abilities', 'found', 'done', 'seenIntro', 'settings', 'orbiAway', 'freedTotal']) d[k] = this[k]; localStorage.setItem(KEY, JSON.stringify(d)); } catch (e) { } },
  reset() { try { localStorage.removeItem(KEY); } catch (e) { } location.href = '/'; },
  glyphCount() { return Object.values(this.glyphs).reduce((a, b) => a + b.length, 0); },
  has(a) { return this.abilities.includes(a); },
  unlocked(id) {
    const w = byId(id); if (!w) return false;
    if (w.kind === 'open') return true;
    if (w.kind === 'lock') return this.shards.length >= w.unlock;
    return this.found.includes(id);
  },
  /* hidden world conditions */
  hiddenReady(id) {
    const w = byId(id); if (!w || w.kind !== 'hidden') return false; const f = w.find;
    if (f.shards && this.shards.length < f.shards) return false;
    if (f.hidden && !f.hidden.every(h => this.done[h])) return false;
    if (f.glyphs && (this.glyphs[f.world] || []).length < f.glyphs) return false;
    if (f.friends && this.friends < f.friends) return false;
    return true;
  }
}.load();

/* ---------- audio (all synthesized, no files) ---------- */
export const Sound = {
  ctx: null, master: null, musicGain: null, musicNodes: [], jetNode: null,
  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    this.ctx = new AC(); this.master = this.ctx.createGain(); this.master.gain.value = S.settings.sound ? 0.6 : 0; this.master.connect(this.ctx.destination);
    this.musicGain = this.ctx.createGain(); this.musicGain.gain.value = S.settings.music ? 0.18 : 0; this.musicGain.connect(this.master);
    const len = this.ctx.sampleRate; const b = this.ctx.createBuffer(1, len, len); const d = b.getChannelData(0); for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1; this.noise = b;
  },
  setOn(on) { S.settings.sound = on; S.save(); if (this.master) this.master.gain.value = on ? 0.6 : 0; },
  tone(f, dur = 0.15, type = 'sine', vol = 0.3, slide = 0, delay = 0) {
    if (!this.ctx) return; const t = this.ctx.currentTime + delay, o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t); if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, f + slide), t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(this.master); o.start(t); o.stop(t + dur + 0.05);
  },
  burst(dur = 0.3, freq = 800, vol = 0.3, q = 1) {
    if (!this.ctx) return; const t = this.ctx.currentTime, s = this.ctx.createBufferSource(), f = this.ctx.createBiquadFilter(), g = this.ctx.createGain();
    s.buffer = this.noise; f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = q; g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(this.master); s.start(t); s.stop(t + dur);
  },
  shot(w) { const m = { blaster: [880, -500, 'square', 0.08], slime: [220, -120, 'sine', 0.2], ring: [520, 400, 'sawtooth', 0.1], prism: [1400, 200, 'triangle', 0.04], gravity: [120, -60, 'sine', 0.3] }[w] || [880, -500, 'square', 0.08]; this.tone(m[0], 0.12, m[2], m[3], m[1]); },
  pop() { this.burst(0.35, 600, 0.35, 0.8); this.tone(160, 0.3, 'sine', 0.25, -100); },
  hit() { this.tone(420, 0.06, 'square', 0.06, -100); },
  hurt() { this.tone(180, 0.25, 'sawtooth', 0.12, -90); },
  pickup() { [0, 4, 7, 12].forEach((n, i) => this.tone(523.25 * Math.pow(2, n / 12), 0.18, 'triangle', 0.14, 0, i * 0.06)); },
  freed() { [0, 7, 12, 16, 19].forEach((n, i) => this.tone(392 * Math.pow(2, n / 12), 0.35, 'sine', 0.13, 0, i * 0.08)); },
  shard() { [0, 4, 7, 11, 12, 16, 19, 24].forEach((n, i) => this.tone(261.6 * Math.pow(2, n / 12), 0.6, 'sine', 0.12, 0, i * 0.09)); },
  ui() { this.tone(660, 0.07, 'sine', 0.08); },
  note(n) { this.tone(n, 1.2, 'sine', 0.2); this.tone(n * 2, 1.0, 'sine', 0.05); },
  jet(level) {
    if (!this.ctx) return;
    if (!this.jetNode) { const s = this.ctx.createBufferSource(); s.buffer = this.noise; s.loop = true; const f = this.ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 900; const g = this.ctx.createGain(); g.gain.value = 0; s.connect(f); f.connect(g); g.connect(this.master); s.start(); this.jetNode = { s, f, g }; }
    this.jetNode.g.gain.setTargetAtTime(level * 0.22, this.ctx.currentTime, 0.05); this.jetNode.f.frequency.setTargetAtTime(500 + level * 900, this.ctx.currentTime, 0.1);
  },
  music(cfg) {
    this.stopMusic(); if (!this.ctx || !cfg) return;
    const root = cfg.root, sc = cfg.scale; let step = 0; const self = this;
    const pad = this.ctx.createOscillator(), pg = this.ctx.createGain(), pf = this.ctx.createBiquadFilter(); pad.type = 'sawtooth'; pad.frequency.value = root / 2; pf.type = 'lowpass'; pf.frequency.value = 420; pg.gain.value = 0.25;
    pad.connect(pf); pf.connect(pg); pg.connect(this.musicGain); pad.start();
    const pad2 = this.ctx.createOscillator(); pad2.type = 'sine'; pad2.frequency.value = root * Math.pow(2, sc[2] / 12) / 2; const g2 = this.ctx.createGain(); g2.gain.value = 0.3; pad2.connect(g2); g2.connect(this.musicGain); pad2.start();
    this.musicNodes = [pad, pad2];
    this.musicTimer = setInterval(() => {
      if (!self.ctx || !S.settings.music) return; const n = sc[(step * 3 + (step >> 2)) % sc.length] + (step % 8 < 4 ? 12 : 0);
      const t = self.ctx.currentTime, o = self.ctx.createOscillator(), g = self.ctx.createGain(); o.type = 'triangle'; o.frequency.value = root * Math.pow(2, n / 12);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.22, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.1); o.connect(g); g.connect(self.musicGain); o.start(t); o.stop(t + 1.2); step++;
    }, 420);
  },
  stopMusic() { clearInterval(this.musicTimer); for (const n of this.musicNodes) { try { n.stop(); } catch (e) { } } this.musicNodes = []; },
  setMusic(on) { S.settings.music = on; S.save(); if (this.musicGain) this.musicGain.gain.value = on ? 0.18 : 0; }
};

/* ---------- sky dome: gradient + nebula + stars, unique per world ---------- */
export function makeSky(cfg) {
  const u = {
    top: { value: new THREE.Color(cfg.top) }, mid: { value: new THREE.Color(cfg.mid) }, bot: { value: new THREE.Color(cfg.bot) }, neb: { value: new THREE.Color(cfg.neb) },
    sunDir: { value: new THREE.Vector3().fromArray(cfg.sunDir).normalize() }, sunCol: { value: new THREE.Color(cfg.sun) }, stars: { value: cfg.stars }, uT: { value: 0 }
  };
  const mat = new THREE.ShaderMaterial({
    uniforms: u, side: THREE.BackSide, depthWrite: false, fog: false,
    vertexShader: 'varying vec3 vD; void main(){ vD = normalize(position); vec4 p = projectionMatrix*modelViewMatrix*vec4(position,1.); gl_Position = p.xyww; }',
    fragmentShader: `
      uniform vec3 top, mid, bot, neb, sunDir, sunCol; uniform float stars, uT; varying vec3 vD;
      float h(vec3 p){ p = fract(p*0.3183099 + .1); p *= 17.0; return fract(p.x*p.y*p.z*(p.x+p.y+p.z)); }
      float n3(vec3 x){ vec3 i=floor(x), f=fract(x); f=f*f*(3.-2.*f);
        return mix(mix(mix(h(i),h(i+vec3(1,0,0)),f.x),mix(h(i+vec3(0,1,0)),h(i+vec3(1,1,0)),f.x),f.y),mix(mix(h(i+vec3(0,0,1)),h(i+vec3(1,0,1)),f.x),mix(h(i+vec3(0,1,1)),h(i+vec3(1,1,1)),f.x),f.y),f.z); }
      float fbm(vec3 p){ float a=0., w=.5; for(int i=0;i<5;i++){ a+=w*n3(p); p*=2.03; w*=.5; } return a; }
      void main(){
        vec3 d = normalize(vD); float y = d.y;
        vec3 c = y > 0. ? mix(mid, top, pow(clamp(y,0.,1.), .7)) : mix(mid, bot, pow(clamp(-y*2.2,0.,1.), .6));
        c = mix(c, bot, smoothstep(.25, -.02, y) * .55);
        float nb = fbm(d*2.4 + vec3(0., uT*.004, 0.)); float nb2 = fbm(d*5.1 - 3.);
        c += neb * pow(nb, 2.6) * 1.1 * smoothstep(-.2, .5, y) + neb * .25 * pow(nb2, 4.);
        vec3 sp = floor(d*420.); float s = h(sp); float tw = .75 + .25*sin(uT*.6 + s*40.);
        float st = step(.9965, s) * tw * stars * smoothstep(-.05, .3, y);
        vec3 sp2 = floor(d*160.); float s2 = step(.9985, h(sp2+7.)) * stars;
        c += vec3(st) + vec3(s2) * vec3(.8,.9,1.);
        float sd = max(dot(d, sunDir), 0.); c += sunCol * (pow(sd, 900.)*6. + pow(sd, 14.)*.35 + pow(sd, 3.)*.08);
        gl_FragColor = vec4(c, 1.);
      }`
  });
  const m = new THREE.Mesh(new THREE.SphereGeometry(4000, 48, 24), mat); m.frustumCulled = false; m.renderOrder = -10; m.userData.u = u; return m;
}
/* big moons/planets hanging in the sky */
export function makeMoon(color, size, dir, dist = 2600) {
  const c = new THREE.Color(color);
  const mat = new THREE.ShaderMaterial({
    uniforms: { c: { value: c }, l: { value: new THREE.Vector3(0.6, 0.5, 0.6).normalize() } }, fog: false, transparent: true,
    vertexShader: 'varying vec3 vN; varying vec3 vP; void main(){ vN = normalize(normalMatrix*normal); vP = position; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }',
    fragmentShader: 'uniform vec3 c, l; varying vec3 vN; varying vec3 vP; float h(vec3 p){ return fract(sin(dot(p, vec3(12.9898,78.233,37.719)))*43758.5453); } void main(){ float d = max(dot(vN, normalize(vec3(.5,.4,.8))), 0.); float cr = h(floor(vP*0.25)); float rim = pow(1.-abs(vN.z), 3.); vec3 col = c*(.18 + .9*d) * (.85 + .15*cr) + c*rim*.6; gl_FragColor = vec4(col, 1.); }'
  });
  const m = new THREE.Mesh(new THREE.SphereGeometry(size, 48, 32), mat);
  m.position.copy(new THREE.Vector3().fromArray(dir).normalize().multiplyScalar(dist)); m.frustumCulled = false;
  const halo = glowSprite(c, size * 3.2, 0.35); halo.material.fog = false; m.add(halo); return m;
}

/* ---------- misc ---------- */
export function disposeTree(o) { o.traverse(n => { if (n.geometry) n.geometry.dispose(); if (n.material) { (Array.isArray(n.material) ? n.material : [n.material]).forEach(m => { for (const k in m) { const v = m[k]; if (v && v.isTexture && v !== _glow) v.dispose(); } m.dispose(); }); } }); }
export function faceTexture(dataURL) { if (!dataURL) return null; const img = new Image(); img.src = dataURL; const t = new THREE.Texture(img); t.colorSpace = THREE.SRGBColorSpace; img.onload = () => { t.needsUpdate = true; }; return t; }
/* selfie oval (same idea as the mall face cutout) */
export function facePath(g, W, H) {
  const cx = W / 2; g.beginPath(); g.moveTo(cx, 8);
  g.bezierCurveTo(W * 0.92, 8, W * 0.98, H * 0.42, W * 0.9, H * 0.62); g.bezierCurveTo(W * 0.84, H * 0.8, W * 0.66, H - 6, cx, H - 6);
  g.bezierCurveTo(W * 0.34, H - 6, W * 0.16, H * 0.8, W * 0.1, H * 0.62); g.bezierCurveTo(W * 0.02, H * 0.42, W * 0.08, 8, cx, 8); g.closePath();
}
export { THREE, WORLDS };
