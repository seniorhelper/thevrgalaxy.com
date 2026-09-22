/* theVRgalaxy — terrain: height styles, heightfield, glowing contour material, liquids, far horizon. */
import { THREE, makeNoise, rng, smooth, clamp, LOW } from './tvg-core.js';

export const HALF = 600;          // playable half-size (1.2 km across)
export const EDGE = 575;          // soft boundary
const GRID = LOW ? 192 : 288;     // heightfield resolution

/* Height functions per style. Return meters. Also returns special points (summit, volcano). */
export function makeHeight(cfg) {
  const T = cfg.terrain, N = makeNoise(T.seed), H = T.height, r = rng(T.seed * 7 + 3), f = 0.0032 * (T.rough || 1);
  const special = {};
  let fn;
  switch (T.style) {
    case 'jungle': fn = (x, z) => N.fbm(x * f, z * f) * H + N.ridge(x * f * 2.5, z * f * 2.5, 3) * H * 0.35 + 6; break;
    case 'craters': {
      const cr = []; for (let i = 0; i < 26; i++) cr.push([(r() - 0.5) * 1000, (r() - 0.5) * 1000, 20 + r() * 50]);
      fn = (x, z) => { let h = N.fbm(x * f, z * f) * H * 0.7 + 8; for (const c of cr) { const d = Math.hypot(x - c[0], z - c[1]) / c[2]; if (d < 1.4) h += (d < 1 ? -(1 - d * d) * 14 : 0) + Math.exp(-Math.pow((d - 1) * 4, 2)) * 5; } return h; };
      special.craters = cr; break;
    }
    case 'mountains': {
      const pk = [260, 230]; special.summit = pk;
      fn = (x, z) => { const d = Math.hypot(x - pk[0], z - pk[1]); const main = Math.exp(-Math.pow(d / 200, 2)) * H; const rid = N.ridge(x * 0.0022, z * 0.0022, 6); const range = Math.pow(rid, 2.2) * H * 0.55 * smooth(80, 420, Math.hypot(x + 380, z + 380)); return main + range + N.fbm(x * 0.01, z * 0.01, 3) * 6 + 6; };
      break;
    }
    case 'city': fn = (x, z) => 1 + N.fbm(x * 0.002, z * 0.002, 2) * 2; break;
    case 'islands': {
      const lvl = T.water.level;
      fn = (x, z) => { const n = N.fbm(x * f * 0.8, z * f * 0.8) * 0.5 + 0.5; const isl = smooth(0.45, 0.62, n); const d = Math.hypot(x + 380, z + 380); const home = Math.exp(-Math.pow(d / 70, 2)); return lvl - 14 + (Math.max(isl, home) * (H + 14)) + N.fbm(x * 0.012, z * 0.012, 3) * 4 * Math.max(isl, home); };
      break;
    }
    case 'mesa': fn = (x, z) => { const n = N.fbm(x * f, z * f) * 0.5 + 0.5; const steps = 5; const q = Math.floor(n * steps) / steps, fr = n * steps - Math.floor(n * steps); return (q + smooth(0.82, 1, fr) / steps) * H + 3; }; break;
    case 'volcanic': {
      const vc = [80, 60]; special.volcano = vc;
      fn = (x, z) => { const d = Math.hypot(x - vc[0], z - vc[1]); const cone = Math.max(0, 1 - d / 230); const crater = d < 40 ? -(1 - d / 40) * 50 : 0; const riv = Math.abs(N.fbm(x * 0.0035, z * 0.0035, 4)); const river = smooth(0.06, 0.0, riv) * -22; return Math.pow(cone, 1.6) * H + crater + N.ridge(x * f, z * f, 5) * H * 0.3 + river + 10; };
      break;
    }
    case 'plates': fn = (x, z) => { const gx = Math.floor(x / 48), gz = Math.floor(z / 48); const n = N.n2(gx * 0.37, gz * 0.37) * 0.5 + 0.5; return Math.floor(n * 5) * (H / 5) + 2; }; break;
    case 'sky': {
      const isl = []; for (let i = 0; i < 38; i++) isl.push([(r() - 0.5) * 1050, (r() - 0.5) * 1050, 22 + r() * 40, r() * H]); isl.push([-380, -380, 55, 20]); special.islands = isl;
      fn = (x, z) => { let best = -80; for (const s of isl) { const d = Math.hypot(x - s[0], z - s[1]) / s[2]; if (d < 1.15) { const top = s[3] + N.fbm(x * 0.02, z * 0.02, 3) * 4; const v = d < 1 ? top - Math.pow(d, 6) * 6 : top - (d - 1) * 400; if (v > best) best = v; } } return best; };
      break;
    }
    case 'dunes': fn = (x, z) => { const a = Math.sin(x * 0.012 + N.fbm(x * 0.002, z * 0.002) * 3) * 0.5 + 0.5; return Math.pow(a, 1.5) * H * 0.6 + N.fbm(x * f, z * f) * H * 0.5 + 8; }; break;
    case 'shadow': fn = (x, z) => { const s = N.ridge(x * f, z * f, 5); return Math.pow(s, 3) * H + N.fbm(x * 0.01, z * 0.01, 3) * 5 + 4; }; break;
    case 'needles': {
      const nd = []; for (let i = 0; i < 30; i++) nd.push([(r() - 0.5) * 1000, (r() - 0.5) * 1000, 10 + r() * 20, 30 + r() * H * 0.6]); nd.push([200, 180, 22, H]); special.summit = [200, 180]; nd.push([-380, -380, 60, 14]);
      fn = (x, z) => { let h = T.water.level - 10; for (const n of nd) { const d = Math.hypot(x - n[0], z - n[1]) / n[2]; if (d < 3) h = Math.max(h, n[3] * Math.exp(-d * d * 1.2) + (d < 1.5 ? 8 : 0)); } return h + N.fbm(x * 0.01, z * 0.01, 3) * 3; };
      break;
    }
    case 'arena': fn = (x, z) => { const d = Math.hypot(x, z); return d < 160 ? 2 + N.fbm(x * 0.02, z * 0.02, 2) : 2 + Math.pow((d - 160) / 440, 1.5) * H * 4 + N.ridge(x * 0.006, z * 0.006, 4) * H; }; break;
    default: fn = (x, z) => N.fbm(x * f, z * f) * H;
  }
  // soft outer rim so the world reads as a place with huge edges
  const base = fn;
  const out = (x, z) => { const d = Math.max(Math.abs(x), Math.abs(z)); const rim = smooth(EDGE - 40, HALF + 20, d); return base(x, z) + rim * rim * (T.style === 'sky' ? 0 : 60); };
  return { fn: out, special, noise: N };
}

/* Precomputed heightfield with bilinear sampling (fast for AI, props, player). */
export class HeightField {
  constructor(fn) {
    this.n = GRID; this.size = HALF * 2; this.step = this.size / (GRID - 1); this.d = new Float32Array(GRID * GRID);
    for (let j = 0; j < GRID; j++) for (let i = 0; i < GRID; i++) this.d[j * GRID + i] = fn(-HALF + i * this.step, -HALF + j * this.step);
  }
  at(x, z) {
    const fx = clamp((x + HALF) / this.step, 0, this.n - 1.001), fz = clamp((z + HALF) / this.step, 0, this.n - 1.001);
    const i = Math.floor(fx), j = Math.floor(fz), u = fx - i, v = fz - j, n = this.n, d = this.d;
    const a = d[j * n + i], b = d[j * n + i + 1], c = d[(j + 1) * n + i], e = d[(j + 1) * n + i + 1];
    return a * (1 - u) * (1 - v) + b * u * (1 - v) + c * (1 - u) * v + e * u * v;
  }
  normal(x, z, out = new THREE.Vector3()) { const e = 1.5; return out.set(this.at(x - e, z) - this.at(x + e, z), 2 * e, this.at(x, z - e) - this.at(x, z + e)).normalize(); }
  slope(x, z) { return 1 - this.normal(x, z).y; }
}

/* Terrain mesh with vertex colors + glowing contour lines (onBeforeCompile). */
export function terrainMesh(cfg, hf) {
  const T = cfg.terrain, seg = hf.n - 1; const geo = new THREE.PlaneGeometry(HALF * 2, HALF * 2, seg, seg); geo.rotateX(-Math.PI / 2);
  const p = geo.attributes.position, cols = new Float32Array(p.count * 3), C = T.colors.map(c => new THREE.Color(c)), tmp = new THREE.Color(), nrm = new THREE.Vector3();
  let minH = 1e9, maxH = -1e9; for (let i = 0; i < p.count; i++) { const h = hf.d[i]; minH = Math.min(minH, h); maxH = Math.max(maxH, h); }
  const wl = T.water && T.water.level != null ? T.water.level : minH;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getZ(i), h = hf.d[i]; p.setY(i, h);
    const k = clamp((h - wl) / Math.max(1, maxH - wl), 0, 1); const sl = hf.slope(x, z);
    if (k < 0.33) tmp.copy(C[0]).lerp(C[1], k / 0.33); else if (k < 0.7) tmp.copy(C[1]).lerp(C[2], (k - 0.33) / 0.37); else tmp.copy(C[2]).lerp(C[3], (k - 0.7) / 0.3);
    if (sl > 0.25) tmp.lerp(C[0].clone().multiplyScalar(0.7), clamp((sl - 0.25) * 1.6, 0, 0.6));
    const jit = (Math.sin(x * 12.9898 + z * 78.233) * 43758.5453) % 1; tmp.multiplyScalar(0.92 + Math.abs(jit) * 0.12);
    cols[i * 3] = tmp.r; cols[i * 3 + 1] = tmp.g; cols[i * 3 + 2] = tmp.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(cols, 3)); geo.computeVertexNormals();
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.88, metalness: 0.04, flatShading: T.style === 'plates' || T.style === 'mesa' });
  const glow = T.glowLines ? new THREE.Color(T.glowLines) : null;
  const U = { gCol: { value: glow || new THREE.Color(0) }, gOn: { value: glow ? 1 : 0 }, gGrid: { value: T.style === 'city' || T.style === 'plates' ? 1 : 0 }, uT: { value: 0 } };
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, U);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vGW;').replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvGW = (modelMatrix*vec4(transformed,1.)).xyz;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vGW; uniform vec3 gCol; uniform float gOn, gGrid, uT;')
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        if (gOn > .5) {
          float f = fract(vGW.y / 9.); float dl = min(f, 1. - f); float line = 1. - smoothstep(0., .045, dl);
          float pulse = .65 + .35*sin(uT*.8 - length(vGW.xz)*.02);
          float g = 0.; if (gGrid > .5) { vec2 q = abs(fract(vGW.xz/24.) - .5); g = 1. - smoothstep(.0, .02, .5 - max(q.x, q.y)); }
          totalEmissiveRadiance += gCol * (line*.9 + g*1.2) * pulse;
        }`);
  };
  mat.userData.U = U;
  const m = new THREE.Mesh(geo, mat); m.receiveShadow = true; m.castShadow = false; return m;
}

/* Liquids: water, ocean, slime, lava, oil, void, cloud, ice, mirror. */
export function liquidMesh(cfg, env) {
  const W = cfg.terrain.water; if (!W || W.type === 'none') return null;
  const modes = { water: 0, ocean: 0, slime: 1, lava: 2, oil: 3, void: 4, cloud: 5, ice: 6, mirror: 7 };
  const U = { c: { value: new THREE.Color(W.color) }, sky: { value: new THREE.Color(cfg.sky.mid) }, sun: { value: new THREE.Color(cfg.sky.sun) }, sunDir: { value: new THREE.Vector3().fromArray(cfg.sky.sunDir).normalize() }, mode: { value: modes[W.type] ?? 0 }, uT: { value: 0 }, fogC: { value: new THREE.Color(cfg.sky.fog) }, fogD: { value: cfg.sky.fogD } };
  const mat = new THREE.ShaderMaterial({
    uniforms: U, transparent: true, depthWrite: W.type === 'ice' || W.type === 'lava' || W.type === 'cloud',
    vertexShader: 'varying vec3 vW; void main(){ vec4 w = modelMatrix*vec4(position,1.); vW = w.xyz; gl_Position = projectionMatrix*viewMatrix*w; }',
    fragmentShader: `uniform vec3 c, sky, sun, sunDir, fogC; uniform float mode, uT, fogD; varying vec3 vW;
      float h(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
      float n2(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f); return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y); }
      float fbm(vec2 p){ float a=0., w=.5; for(int i=0;i<5;i++){ a+=w*n2(p); p*=2.03; w*=.5; } return a; }
      void main(){
        vec2 p = vW.xz; vec3 V = normalize(cameraPosition - vW); float fr = pow(1. - max(V.y, 0.), 3.);
        float w1 = fbm(p*.04 + vec2(uT*.03, uT*.02)), w2 = fbm(p*.11 - vec2(uT*.05, -uT*.04));
        vec3 N = normalize(vec3((w1-.5)*.6 + (w2-.5)*.3, 1., (w2-.5)*.6));
        vec3 R = reflect(-V, N); float sp = pow(max(dot(R, sunDir), 0.), 120.);
        vec3 col; float a = .82;
        if (mode < .5) { col = mix(c*.55, sky, fr*.8) + sun*sp*2.; a = .78 + fr*.2; }
        else if (mode < 1.5) { float b = fbm(p*.3 + uT*.2); col = c*(.55 + .7*b) + vec3(.9,1.,.5)*pow(b, 6.)*1.5 + sun*sp; a = .9; }
        else if (mode < 2.5) { float cr = fbm(p*.07 + vec2(uT*.02)); float hot = smoothstep(.45, .75, cr); col = mix(vec3(.25,.03,0.), c*1.6, hot) + vec3(1.,.8,.3)*pow(hot, 3.)*1.8; a = 1.; }
        else if (mode < 3.5) { col = mix(c*.4, vec3(.8,.3,1.), fr) + sun*sp*1.5 + vec3(.3,.1,.5)*sin(w1*20.)*.15; a = .92; }
        else if (mode < 4.5) { vec2 g = abs(fract(p/30.) - .5); float gl = 1. - smoothstep(0., .03, .5 - max(g.x, g.y)); col = c*gl*1.4 + c*.08*fbm(p*.02 + uT*.01); a = .6 + gl*.4; }
        else if (mode < 5.5) { float cl = fbm(p*.012 + vec2(uT*.01, 0.)); col = mix(c*.8, vec3(1.), smoothstep(.35, .75, cl)); a = .96; }
        else if (mode < 6.5) { float cr = fbm(p*.2); col = mix(c*.8, vec3(1.), cr*.5) + sun*sp*.6 + vec3(.6,.9,1.)*smoothstep(.49,.5,fract(fbm(p*.05)*6.))*.2; a = 1.; }
        else { col = mix(sky*1.1, c, .25) + sun*pow(max(dot(R, sunDir), 0.), 400.)*4.; a = .92; }
        float dist = length(cameraPosition - vW); float fo = 1. - exp(-pow(fogD*dist, 2.)); col = mix(col, fogC, fo);
        gl_FragColor = vec4(col, a);
      }`
  });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(8000, 8000, 1, 1), mat); m.rotation.x = -Math.PI / 2; m.position.y = W.level; m.renderOrder = 2; m.userData.U = U; m.userData.type = W.type; return m;
}

/* Horizon: giant distant mountain ring so borders feel endless. */
export function horizonRing(cfg) {
  const N = makeNoise(cfg.terrain.seed + 99), segs = 256, rings = 6, pos = [], col = [], idx = [], c0 = new THREE.Color(cfg.terrain.colors[1]).multiplyScalar(0.6), c1 = new THREE.Color(cfg.sky.fog);
  const flat = cfg.terrain.style === 'sky' || cfg.terrain.style === 'islands' || cfg.terrain.style === 'needles';
  for (let j = 0; j <= rings; j++) for (let i = 0; i <= segs; i++) {
    const a = i / segs * Math.PI * 2, rad = 900 + j * 420, amp = flat ? 60 : 180 + j * 120;
    const hh = j === 0 ? -20 : Math.max(0, N.ridge(Math.cos(a) * 3 + j, Math.sin(a) * 3 + j * 2, 5)) * amp * (j === rings ? 0.3 : 1) - (flat ? 40 : 0);
    pos.push(Math.cos(a) * rad, hh, Math.sin(a) * rad); const cc = c0.clone().lerp(c1, j / rings * 0.9); col.push(cc.r, cc.g, cc.b);
  }
  for (let j = 0; j < rings; j++) for (let i = 0; i < segs; i++) { const a = j * (segs + 1) + i, b = a + segs + 1; idx.push(a, b, a + 1, b, b + 1, a + 1); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.setIndex(idx); g.computeVertexNormals();
  const m = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide })); return m;
}
