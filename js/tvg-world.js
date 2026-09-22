/* theVRgalaxy — the world engine. Reads a world config and builds a huge playable planet. */
import { THREE, S, LOW, REDUCED, IS_TOUCH, rng, clamp, spawnModel, instanceProps, loadModel, glowSprite, textSprite, makeSky, makeMoon, Sound, canvasTex, byId, disposeTree } from './tvg-core.js';
import { HALF, makeHeight, HeightField, terrainMesh, liquidMesh, horizonRing } from './tvg-terrain.js';
import { Particles, PopText, makeBlackHole, makeGateRing, makeCollectible, holoMaterial } from './tvg-fx.js';
import { Player, Alien, Drone, Shots } from './tvg-actors.js';
import { WEAPONS, ABILITIES } from './tvg-data.js';

const ALIEN_H = { 'alien-greenblob': 1.3, 'alien-pinkblob': 1.3, 'alien-spikyblob': 1.4, 'alien-mushnub': 1.2, 'alien-glub': 1.4, 'alien-cactoro': 1.6, 'alien-yeti': 2.4, 'alien-squidle': 1.6, 'alien-ghost': 1.8, 'alien-hywirl': 1.6, 'alien-birb': 1.3, 'alien-armabee': 1.5, 'alien-warden': 3, 'alien-mushking': 4.5, 'drone-large': 2.4 };
const DRONE = { 'drone-mini': [1.0, 20], 'drone-small': [1.4, 30], 'drone-flyer': [1.8, 40], 'drone-cyber': [1.8, 45], 'drone-large': [2.6, 90] };
const V3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);

export class World {
  constructor(app, cfg) {
    this.app = app; this.cfg = cfg; this.id = cfg.id; this.t = 0; this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(62, innerWidth / innerHeight, 0.2, 9000);
    this.camYaw = Math.PI * 0.25; this.camPitch = 0.32; this.camDist = IS_TOUCH ? 8.5 : 9.5;
    this.aliens = []; this.drones = []; this.items = []; this.cols = []; this.extra = []; this.anim = []; this.done = !!S.done[cfg.id];
    this.r = rng(cfg.terrain.seed * 31 + 5);
  }
  /* ---------- helpers used by actors ---------- */
  solidWaterLevel() { const W = this.cfg.terrain.water; return W && W.type === 'ice' ? W.level : -1e9; }
  liquidAt(p) { const W = this.cfg.terrain.water; if (!W || W.type === 'none' || W.type === 'ice') return null; if (p.y <= W.level + 0.05 && this.hf.at(p.x, p.z) < W.level) return W.type; return null; }
  groundAt(x, z, y) {
    let h = this.hf.at(x, z), bounce = 0, liquid = false; const W = this.cfg.terrain.water;
    if (W && W.type === 'ice') h = Math.max(h, W.level);
    if (W && W.type === 'slime' && h < W.level) { h = W.level - 0.2; bounce = 22; liquid = true; }
    if (W && W.type === 'lava' && h < W.level) liquid = true;
    for (const c of this.cols) { const dx = x - c.x, dz = z - c.z; if (dx * dx + dz * dz < c.r * c.r && y >= c.top - 1.4) { if (c.top > h) { h = c.top; bounce = c.bounce || 0; liquid = false; } } }
    return { h, bounce, liquid };
  }
  targets() { const t = []; for (const d of this.drones) if (d.alive) t.push(d); for (const a of this.aliens) if (a.jammed || a.boss) t.push(a); if (this.crystals) t.push(...this.crystals); if (this.coaster) t.push(...this.coaster.targets.filter(x => x.alive)); if (this.warden) t.push(this.warden); return t; }
  landPoint(minD = 60, maxD = 520, tries = 200, minH = null) {
    const wl = this.waterLevel + 1;
    for (let i = 0; i < tries; i++) { const a = this.r() * Math.PI * 2, d = minD + this.r() * (maxD - minD); const x = this.spawn.x * 0.2 + Math.cos(a) * d, z = this.spawn.z * 0.2 + Math.sin(a) * d; if (Math.abs(x) > 560 || Math.abs(z) > 560) continue; const h = this.hf.at(x, z); if (h < wl || (minH != null && h < minH)) continue; if (this.hf.slope(x, z) > 0.4) continue; if (Math.hypot(x - this.spawn.x, z - this.spawn.z) < 18) continue; return V3(x, h, z); }
    return V3((this.r() - 0.5) * 400, 20, (this.r() - 0.5) * 400);
  }
  /* ---------- build ---------- */
  async build(progress = () => { }) {
    const cfg = this.cfg, sc = this.scene, R = this.app.renderer;
    progress(0.05, 'Shaping the land');
    const hm = makeHeight(cfg); this.special = hm.special; this.hf = new HeightField(hm.fn);
    const W = cfg.terrain.water; this.waterLevel = W && W.type !== 'none' ? W.level : -1e9;
    // spawn: preferred corner, find flat dry land
    this.spawn = this.findSpawn();
    // sky + fog + environment
    const sky = makeSky(cfg.sky); sc.add(sky); this.sky = sky;
    sc.fog = new THREE.FogExp2(new THREE.Color(cfg.sky.fog), cfg.sky.fogD);
    for (const m of cfg.sky.moons || []) { const mm = makeMoon(m[0], m[1], m[2]); sc.add(mm); this.extra.push(mm); }
    const envScene = new THREE.Scene(); const skyCopy = makeSky(cfg.sky); envScene.add(skyCopy);
    const pm = new THREE.PMREMGenerator(R); this.envRT = pm.fromScene(envScene, 0.02); sc.environment = this.envRT.texture; pm.dispose(); skyCopy.geometry.dispose(); skyCopy.material.dispose();
    // lights
    const sunDir = V3().fromArray(cfg.sky.sunDir).normalize(); this.sunDir = sunDir;
    const hemi = new THREE.HemisphereLight(new THREE.Color(cfg.sky.mid).lerp(new THREE.Color(0xffffff), 0.35), new THREE.Color(cfg.terrain.colors[0]), 1.25); sc.add(hemi);
    const sun = new THREE.DirectionalLight(new THREE.Color(cfg.sky.sun), 2.6); sun.castShadow = true; const ss = LOW ? 1024 : 2048; sun.shadow.mapSize.set(ss, ss);
    const sh = sun.shadow.camera; sh.left = -70; sh.right = 70; sh.top = 70; sh.bottom = -70; sh.near = 10; sh.far = 600; sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.5; sc.add(sun); sc.add(sun.target); this.sun = sun;
    const fill = new THREE.DirectionalLight(new THREE.Color(cfg.sky.neb), 0.5); fill.position.copy(sunDir.clone().multiplyScalar(-1).setY(0.4)); sc.add(fill);
    progress(0.15, 'Painting the ground');
    this.terrain = terrainMesh(cfg, this.hf); sc.add(this.terrain);
    this.liquid = liquidMesh(cfg); if (this.liquid) sc.add(this.liquid);
    sc.add(horizonRing(cfg));
    // a distant black hole in every sky
    const bh = makeBlackHole(90, new THREE.Color(cfg.sky.neb).getHex(), new THREE.Color(cfg.sky.top).lerp(new THREE.Color(0x6a3dff), 0.6).getHex()); bh.position.copy(V3(-sunDir.x, 0.45, -sunDir.z).normalize().multiplyScalar(2800)); bh.traverse(o => { if (o.material) o.material.fog = false; }); sc.add(bh); this.skyHole = bh;
    // landing pad
    this.buildPad();
    if ((cfg.features || []).includes('city')) this.buildCity();
    progress(0.25, 'Growing the props');
    await this.buildProps();
    progress(0.5, 'Building wonders');
    await this.buildFeatures();
    progress(0.65, 'Waking the locals');
    this.particles = new Particles(sc); this.pops = new PopText(sc); this.shots = new Shots(this);
    this.player = new Player(this); await this.player.load(); this.player.respawn(this.spawn);
    await this.buildActors();
    progress(0.85, 'Hiding secrets');
    await this.buildMission();
    await this.buildGlyphs();
    await this.buildPickups();
    this.buildPortals();
    progress(1, 'Ready');
  }
  findSpawn() {
    const st = this.cfg.terrain.style, wl = this.waterLevel;
    let base = st === 'arena' ? [0, 120] : [-380, -380];
    for (let rad = 0; rad < 400; rad += 6) for (let a = 0; a < 6.28; a += 0.4) { const x = base[0] + Math.cos(a) * rad, z = base[1] + Math.sin(a) * rad; const h = this.hf.at(x, z); if (h > wl + 1 && this.hf.slope(x, z) < 0.12) return V3(x, h, z); }
    return V3(base[0], Math.max(this.hf.at(base[0], base[1]), wl + 1), base[1]);
  }
  buildPad() {
    const p = this.spawn, g = new THREE.Group(); g.position.copy(p);
    const pad = new THREE.Mesh(new THREE.CylinderGeometry(6, 6.6, 0.6, 48), new THREE.MeshStandardMaterial({ color: 0x2a3244, metalness: 0.8, roughness: 0.3 })); pad.position.y = 0.2; pad.receiveShadow = true; pad.castShadow = true; g.add(pad);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(5.6, 0.12, 8, 80), new THREE.MeshBasicMaterial({ color: 0x4cc3ff })); ring.rotation.x = Math.PI / 2; ring.position.y = 0.52; g.add(ring);
    const ring2 = ring.clone(); ring2.scale.setScalar(0.6); g.add(ring2);
    this.scene.add(g); this.cols.push({ x: p.x, z: p.z, r: 6.2, top: p.y + 0.5 }); this.spawn.y = p.y + 0.5;
    spawnModel('ship-finn', { height: 4 }).then(m => { if (!m) return; m.position.set(p.x + 12, p.y, p.z + 4); m.rotation.y = -0.8; this.scene.add(m); });
    const lbl = textSprite('Landing Pad', { size: 64, scale: 1.2, color: '#9fe6ff' }); lbl.position.set(p.x, p.y + 6, p.z); this.scene.add(lbl);
  }
  async buildProps() {
    const cfg = this.cfg, jobs = []; this.propSpots = {};
    for (const pd of cfg.props) {
      const list = [], n = LOW ? Math.ceil(pd.n * 0.65) : pd.n;
      for (let i = 0, tries = 0; i < n && tries < n * 12; tries++) {
        const x = (this.r() - 0.5) * 1120, z = (this.r() - 0.5) * 1120, h = this.hf.at(x, z);
        if (h < this.waterLevel + 0.4 && cfg.terrain.water.type !== 'ice') continue; if (this.hf.slope(x, z) > 0.35) continue;
        if (Math.hypot(x - this.spawn.x, z - this.spawn.z) < 14) continue; if (this.city && this.inStreet && this.inStreet(x, z)) continue;
        if (cfg.terrain.style === 'city' && Math.hypot(x, z) < 70) continue;
        const s = pd.s[0] + this.r() * (pd.s[1] - pd.s[0]); list.push({ x, y: h - 0.1, z, s, r: this.r() * Math.PI * 2 }); i++;
        if (/rock-large|ruin|dome|base|house/.test(pd.m)) this.cols.push({ x, z, r: s * (pd.m.startsWith('ruin') ? 0.35 : 0.42), top: h + s * (pd.m.startsWith('rock') ? 0.75 : 0.95), side: true });
      }
      this.propSpots[pd.m] = list;
      jobs.push(instanceProps(pd.m, list, { tint: pd.tint, glow: pd.glow }).then(g => g && this.scene.add(g)));
    }
    await Promise.all(jobs);
  }
  /* ---------- special features ---------- */
  async buildFeatures() {
    const F = this.cfg.features || [], sc = this.scene;
    if (F.includes('glowshrooms')) this.buildGlowShrooms(0xff4fd8, 0x38f0ff, 320);
    if (F.includes('fireflies') || F.includes('spores') || F.includes('embers') || F.includes('wisps') || F.includes('sparks')) this.ambient = { color: F.includes('embers') ? 0xff8a3d : F.includes('wisps') ? 0xb08cff : F.includes('spores') ? 0x7cffd4 : F.includes('sparks') ? 0xffd23f : 0xfff27a, rise: F.includes('embers') ? 3 : 0.5 };
    if (F.includes('bounce')) this.buildBouncePads();
    if (F.includes('camps')) this.buildCamps();
    if (F.includes('coaster')) await this.buildCoaster();
    if (F.includes('crystals')) this.buildCrystals();
    if (F.includes('auroras')) this.buildAuroras();
    if (F.includes('geysers') || F.includes('sandgeysers')) this.buildGeysers(F.includes('sandgeysers') ? 0xffd6a0 : 0xff5a1f);
    if (F.includes('whales')) this.buildWhales();
    if (F.includes('giantshrooms')) this.buildGiantShrooms();
    if (F.includes('clouds')) this.buildClouds();
    if (F.includes('rainbows')) this.buildRainbows();
    if (F.includes('balloons')) this.buildBalloons();
    if (F.includes('twinsuns')) { const s2 = glowSprite(0xffb070, 900, 0.8); s2.material.fog = false; s2.position.copy(V3(-0.6, 0.22, -0.75).normalize().multiplyScalar(3500)); sc.add(s2); }
    if (F.includes('inverted')) this.buildFloatingIslands();
    if (F.includes('heart')) this.buildHeart();
    if (F.includes('conveyors')) this.buildPipes();
  }
  buildGlowShrooms(c1, c2, n) {
    if (LOW) n = Math.floor(n * 0.6);
    const stem = new THREE.CylinderGeometry(0.12, 0.2, 1, 8); stem.translate(0, 0.5, 0); const capG = new THREE.SphereGeometry(0.6, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2); capG.translate(0, 1, 0);
    const sm = new THREE.InstancedMesh(stem, new THREE.MeshStandardMaterial({ color: 0xe6e0ff, roughness: 0.6 }), n); const cm = new THREE.InstancedMesh(capG, new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 1.1, roughness: 0.4 }), n);
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), c = new THREE.Color();
    for (let i = 0; i < n; i++) { const p = this.landPoint(10, 540, 40); const s = 0.8 + this.r() * 2.2; m4.compose(p, q, V3(s, s * (0.8 + this.r() * 0.8), s)); sm.setMatrixAt(i, m4); cm.setMatrixAt(i, m4); c.set(this.r() < 0.5 ? c1 : c2); cm.setColorAt(i, c); }
    cm.instanceColor.needsUpdate = true; sm.castShadow = true; cm.castShadow = true; this.scene.add(sm, cm);
  }
  buildBouncePads() {
    for (let i = 0; i < 26; i++) {
      const p = this.landPoint(20, 520); const g = new THREE.Group(); g.position.copy(p);
      const disc = new THREE.Mesh(new THREE.CylinderGeometry(3, 3.4, 0.5, 32), new THREE.MeshStandardMaterial({ color: 0x8dff4a, emissive: 0x6aff2a, emissiveIntensity: 0.9, roughness: 0.2 })); disc.position.y = 0.25; g.add(disc);
      const t = new THREE.Mesh(new THREE.TorusGeometry(3.2, 0.2, 8, 40), new THREE.MeshBasicMaterial({ color: 0xe6ff5a })); t.rotation.x = Math.PI / 2; t.position.y = 0.55; g.add(t); this.anim.push({ o: t, f: (o, tt) => { o.scale.setScalar(1 + 0.05 * Math.sin(tt * 3 + i)); } });
      this.scene.add(g); this.cols.push({ x: p.x, z: p.z, r: 3, top: p.y + 0.5, bounce: 30 });
    }
  }
  buildCamps() {
    const pk = this.special.summit, top = this.hf.at(pk[0], pk[1]); this.summit = V3(pk[0], top, pk[1]); this.camps = [];
    for (let i = 1; i <= 6; i++) {
      const k = i / 7, x = this.spawn.x + (pk[0] - this.spawn.x) * k + Math.sin(i * 2.1) * 40, z = this.spawn.z + (pk[1] - this.spawn.z) * k + Math.cos(i * 1.7) * 40, h = this.hf.at(x, z);
      const p = V3(x, h, z); this.camps.push(p);
      const fire = glowSprite(0x4cc3ff, 5, 0.9); fire.position.set(x, h + 1.4, z); this.scene.add(fire); this.anim.push({ o: fire, f: (o, tt) => { o.material.opacity = 0.7 + 0.2 * Math.sin(tt * 4 + i); } });
      if (!LOW) { const pl = new THREE.PointLight(0x4cc3ff, 40, 30, 2); pl.position.set(x, h + 2, z); this.scene.add(pl); }
      spawnModel('dome', { height: 3 }).then(m => { if (m) { m.position.set(x + 4, h, z + 2); this.scene.add(m); } });
      const lb = textSprite(`Camp ${i}`, { size: 56, scale: 1.1, color: '#9fe6ff' }); lb.position.set(x, h + 5, z); this.scene.add(lb);
    }
  }
  buildCity() {
    // mall-born megatowers: one instanced draw call with windows computed in the shader
    const sc = this.scene, blocks = [], S0 = 44; this.city = true; this.inStreet = (x, z) => { const fx = ((x % S0) + S0) % S0, fz = ((z % S0) + S0) % S0; return fx < 9 || fz < 9; };
    for (let gx = -12; gx <= 12; gx++) for (let gz = -12; gz <= 12; gz++) {
      const cx = gx * S0 + S0 / 2 + 4.5, cz = gz * S0 + S0 / 2 + 4.5; const d = Math.hypot(cx, cz); if (d < 75 || d > 560 || Math.hypot(cx - this.spawn.x, cz - this.spawn.z) < 40) continue;
      if (this.r() < 0.12) continue; const w = 14 + this.r() * 14, dd = 14 + this.r() * 14, hgt = 14 + Math.pow(this.r(), 1.6) * (d < 260 ? 140 : 70);
      blocks.push({ x: cx, z: cz, w, d: dd, h: hgt, kind: this.r() < 0.22 ? 'arcade' : 'tower' });
    }
    const boxG = new THREE.BoxGeometry(1, 1, 1); boxG.translate(0, 0.5, 0);
    const mat = new THREE.MeshStandardMaterial({ color: 0x14102a, metalness: 0.6, roughness: 0.35 });
    const U = { uT: { value: 0 } };
    mat.onBeforeCompile = (s) => {
      Object.assign(s.uniforms, U);
      s.vertexShader = s.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vCW; varying vec3 vCN;').replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvec4 cw = vec4(transformed,1.);\n#ifdef USE_INSTANCING\ncw = instanceMatrix*cw;\n#endif\ncw = modelMatrix*cw; vCW = cw.xyz; vCN = normal;');
      s.fragmentShader = s.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vCW; varying vec3 vCN; uniform float uT;\nfloat ch(vec3 p){ return fract(sin(dot(p, vec3(12.9898,78.233,37.719)))*43758.5453); }')
        .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
          if (abs(vCN.y) < .5) { float u = (abs(vCN.x) > .5 ? vCW.z : vCW.x); vec2 cell = vec2(floor(u/2.6), floor(vCW.y/3.4)); vec2 f = fract(vec2(u/2.6, vCW.y/3.4));
            float win = step(.18, f.x)*step(f.x, .82)*step(.25, f.y)*step(f.y, .8); float r = ch(vec3(cell, floor(vCW.x/40.)+floor(vCW.z/40.)*7.));
            vec3 wc = r > .92 ? vec3(1.,.35,.85) : r > .8 ? vec3(.3,.95,1.) : vec3(1.,.82,.55);
            totalEmissiveRadiance += wc * win * step(.55, r) * (.9 + .1*sin(uT*.4 + r*20.)) * 1.3; }`);
    };
    const im = new THREE.InstancedMesh(boxG, mat, blocks.length); const trim = new THREE.InstancedMesh(boxG, new THREE.MeshBasicMaterial({ color: 0xffffff }), blocks.length * 4);
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), c = new THREE.Color(), neon = [0xff4fd8, 0x38f0ff, 0x7cffd4, 0xffd23f, 0xb08cff];
    blocks.forEach((b, i) => {
      m4.compose(V3(b.x, 0, b.z), q, V3(b.w, b.h, b.d)); im.setMatrixAt(i, m4);
      c.set(neon[i % neon.length]); for (let k = 0; k < 4; k++) { const sx = k & 1 ? 1 : -1, sz = k & 2 ? 1 : -1; m4.compose(V3(b.x + sx * b.w / 2, 0, b.z + sz * b.d / 2), q, V3(0.4, b.h, 0.4)); trim.setMatrixAt(i * 4 + k, m4); trim.setColorAt(i * 4 + k, c); }
      this.cols.push({ x: b.x, z: b.z, r: Math.min(b.w, b.d) * 0.62, top: b.h, side: true });
    });
    trim.instanceColor.needsUpdate = true; im.castShadow = true; im.receiveShadow = true; sc.add(im, trim); mat.userData.U = U; this.cityMat = mat;
    // arcade rings (the old mall atriums, turned inside out and lit up)
    blocks.filter(b => b.kind === 'arcade').forEach((b, i) => { for (let y = 8; y < b.h; y += 12) { const rr = new THREE.Mesh(new THREE.TorusGeometry(Math.max(b.w, b.d) * 0.62, 0.35, 6, 40), new THREE.MeshBasicMaterial({ color: neon[(i + y) % neon.length] })); rr.rotation.x = Math.PI / 2; rr.position.set(b.x, y, b.z); sc.add(rr); } const dome = new THREE.Mesh(new THREE.SphereGeometry(Math.min(b.w, b.d) * 0.5, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x38f0ff, emissive: 0x0b5fd6, emissiveIntensity: 0.8, transparent: true, opacity: 0.6, roughness: 0.1 })); dome.position.set(b.x, b.h, b.z); sc.add(dome); });
    // holo signs
    const words = ['HARMONY', 'NOODLES 24/7', 'ORBI LOVES YOU', 'SLIME SALE', 'BE KIND', 'NEON RIFT', 'HUGS FREE', 'SKY MALL', 'ZAP THE STATIC', 'FRIENDS WELCOME'];
    blocks.filter(b => b.h > 40).slice(0, 22).forEach((b, i) => { const s = textSprite(words[i % words.length], { size: 90, scale: 5, color: '#ffffff', glow: '#' + new THREE.Color(neon[i % 5]).getHexString() }); s.position.set(b.x, b.h + 8, b.z); sc.add(s); });
    this.cityBlocks = blocks;
  }
  async buildCoaster() {
    // a huge looping ride over the void, with two vertical loops and a corkscrew
    const pts = [], N = 26, base = this.waterLevel + 30;
    for (let i = 0; i < N; i++) { const a = i / N * Math.PI * 2, rad = 210 + Math.sin(a * 3) * 70; pts.push(V3(Math.cos(a) * rad, base + 20 + Math.sin(a * 2) * 26 + Math.cos(a * 5) * 10, Math.sin(a) * rad)); }
    const withLoops = []; pts.forEach((p, i) => { withLoops.push(p); if (i === 6 || i === 17) { const nx = pts[(i + 1) % N], dir = nx.clone().sub(p).setY(0).normalize(); const R0 = 18; for (let k = 1; k < 9; k++) { const th = k / 9 * Math.PI * 2; withLoops.push(p.clone().addScaledVector(dir, 12 + Math.sin(th) * R0).add(V3(0, (1 - Math.cos(th)) * R0, 0)).add(V3(-dir.z, 0, dir.x).multiplyScalar(k * 0.9))); } } });
    const curve = new THREE.CatmullRomCurve3(withLoops, true, 'centripetal', 0.5); const L = curve.getLength();
    const samples = 900, frames = curve.computeFrenetFrames(samples, true), railPts = [[], []];
    for (let i = 0; i <= samples; i++) { const u = i / samples, p = curve.getPointAt(u), b = frames.binormals[i % samples] || frames.binormals[0]; railPts[0].push(p.clone().addScaledVector(b, 0.9)); railPts[1].push(p.clone().addScaledVector(b, -0.9)); }
    const railMat = new THREE.MeshStandardMaterial({ color: 0xffd23f, emissive: 0xff8a3d, emissiveIntensity: 0.7, metalness: 0.7, roughness: 0.3 });
    for (const rp of railPts) { const rc = new THREE.CatmullRomCurve3(rp, true); const tube = new THREE.Mesh(new THREE.TubeGeometry(rc, 1400, 0.16, 6, true), railMat); tube.castShadow = true; this.scene.add(tube); }
    const spine = new THREE.Mesh(new THREE.TubeGeometry(curve, 1400, 0.3, 8, true), new THREE.MeshStandardMaterial({ color: 0x5b1a8a, emissive: 0xff4fd8, emissiveIntensity: 0.5, metalness: 0.6, roughness: 0.4 })); spine.castShadow = true; this.scene.add(spine);
    // ties + support pillars
    const tieN = 360, ties = new THREE.InstancedMesh(new THREE.BoxGeometry(2.4, 0.18, 0.5), new THREE.MeshStandardMaterial({ color: 0x38f0ff, emissive: 0x38f0ff, emissiveIntensity: 0.6 }), tieN);
    const pil = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.35, 0.5, 1, 8), new THREE.MeshStandardMaterial({ color: 0x3a1450, metalness: 0.5, roughness: 0.5 }), 90); let pc = 0;
    const m4 = new THREE.Matrix4(), mx = new THREE.Matrix4();
    for (let i = 0; i < tieN; i++) { const u = i / tieN, fi = Math.floor(u * samples), p = curve.getPointAt(u), T = frames.tangents[fi], Nn = frames.normals[fi], B = frames.binormals[fi]; mx.makeBasis(B, Nn, T); m4.copy(mx).setPosition(p.clone().addScaledVector(Nn, -0.35)); ties.setMatrixAt(i, m4); if (i % 4 === 0 && pc < 90 && Nn.y > 0.6) { const gy = Math.max(this.hf.at(p.x, p.z), this.waterLevel - 20); const hh = p.y - gy; if (hh > 2) { m4.compose(V3(p.x, gy + hh / 2, p.z), new THREE.Quaternion(), V3(1, hh, 1)); pil.setMatrixAt(pc++, m4); } } }
    pil.count = pc; ties.castShadow = true; this.scene.add(ties, pil);
    // station arch at u=0 on an island
    const s0 = curve.getPointAt(0), stPos = s0.clone(); const arch = new THREE.Mesh(new THREE.TorusGeometry(7, 0.6, 12, 60, Math.PI), new THREE.MeshStandardMaterial({ color: 0xffd23f, emissive: 0xffd23f, emissiveIntensity: 1.2 })); arch.position.copy(stPos); arch.lookAt(stPos.clone().add(frames.tangents[0])); this.scene.add(arch);
    const plat = new THREE.Mesh(new THREE.BoxGeometry(12, 1, 18), new THREE.MeshStandardMaterial({ color: 0x3a1450, metalness: 0.5, roughness: 0.4 })); plat.position.copy(stPos).add(V3(0, -1.6, 0)); plat.receiveShadow = true; plat.castShadow = true; this.scene.add(plat);
    this.cols.push({ x: plat.position.x, z: plat.position.z, r: 8, top: plat.position.y + 0.5 });
    const sign = textSprite('STAR COASTER · press E to ride', { size: 72, scale: 3, color: '#ffd23f', glow: '#ff4fd8' }); sign.position.copy(stPos).add(V3(0, 9, 0)); this.scene.add(sign);
    // a bridge of floating stepping stones from the landing pad to the station
    const from = this.spawn.clone(), to = plat.position.clone(); const steps = Math.ceil(from.distanceTo(to) / 14);
    for (let i = 1; i < steps; i++) { const p = from.clone().lerp(to, i / steps); p.y = Math.max(from.y, to.y) * (i / steps) + from.y * (1 - i / steps) + Math.sin(i / steps * Math.PI) * 8; const st = new THREE.Mesh(new THREE.CylinderGeometry(3, 2, 1, 16), new THREE.MeshStandardMaterial({ color: 0xff7ab8, emissive: 0xff4fd8, emissiveIntensity: 0.5 })); st.position.copy(p); st.castShadow = true; st.receiveShadow = true; this.scene.add(st); this.cols.push({ x: p.x, z: p.z, r: 2.8, top: p.y + 0.5 }); }
    // cart
    const cart = new THREE.Group(); const body = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1, 3.4), new THREE.MeshStandardMaterial({ color: 0xff4fd8, metalness: 0.6, roughness: 0.3, emissive: 0x5b1a8a, emissiveIntensity: 0.4 })); body.position.y = 0.6; body.castShadow = true; cart.add(body);
    const nose = new THREE.Mesh(new THREE.ConeGeometry(1.1, 1.4, 16), body.material); nose.rotation.x = Math.PI / 2; nose.position.set(0, 0.6, 2.3); cart.add(nose);
    const glow = glowSprite(0xff4fd8, 4, 0.6); glow.position.y = -0.2; cart.add(glow); this.scene.add(cart);
    // Static targets along the track
    const targets = []; const tMat = new THREE.MeshStandardMaterial({ color: 0xff2f4a, emissive: 0xff2f4a, emissiveIntensity: 1.2, roughness: 0.3 });
    for (let i = 0; i < 32; i++) { const u = 0.03 + i / 32 * 0.95, fi = Math.floor(u * samples), p = curve.getPointAt(u), B = frames.binormals[fi], Nn = frames.normals[fi]; const side = (i % 2 ? 1 : -1) * (5 + (i % 3) * 3); const m = new THREE.Mesh(new THREE.OctahedronGeometry(1.1, 0), tMat); m.position.copy(p).addScaledVector(B, side).addScaledVector(Nn, 3 + (i % 4)); this.scene.add(m); const tg = { mesh: m, pos: m.position, radius: 1.8, alive: true, hitBy: (pp) => { if (!tg.alive || !this.coaster.riding) return false; tg.alive = false; m.visible = false; this.particles.boom(m.position, 0xff2f4a, 0.8); Sound.pop(); this.coaster.hits++; this.pops.add(`${this.coaster.hits}!`, m.position.clone(), '#ffd23f', 1.2); return true; } }; targets.push(tg); }
    this.coaster = { curve, frames, samples, L, cart, u: 0, riding: false, hits: 0, targets, station: plat.position.clone(), speed: 0 };
  }
  rideCoaster(on) {
    const C = this.coaster; if (!C) return; C.riding = on; this.player.riding = on;
    if (on) { C.u = 0; C.hits = 0; C.speed = 14; C.targets.forEach(t => { t.alive = true; t.mesh.visible = true; }); this.app.ui.toast('Blast the red Static targets! Hold fire and aim with your view.'); Sound.tone(300, 0.6, 'sawtooth', 0.12, 600); }
    else { this.player.respawn(C.station.clone().add(V3(0, 1.2, 4))); }
  }
  buildCrystals() {
    this.crystals = []; this.crystalNext = 0; const notes = [130.8, 164.8, 196, 261.6, 329.6], cols = [0x6a3dff, 0x3d74ff, 0x38f0ff, 0x7cffd4, 0xfff27a], sizes = [22, 17, 13, 9.5, 6.5];
    const spots = []; for (let i = 0; i < 5; i++) { let p; for (let k = 0; k < 40; k++) { p = this.landPoint(60, 380); if (spots.every(s => s.distanceTo(p) > 70)) break; } spots.push(p); }
    const order = [2, 0, 4, 1, 3];
    order.forEach((si, idx) => {
      const p = spots[si], sz = sizes[idx], g = new THREE.Group(); g.position.copy(p);
      const mat = new THREE.MeshStandardMaterial({ color: cols[idx], emissive: cols[idx], emissiveIntensity: 0.25, metalness: 0.2, roughness: 0.05, transparent: true, opacity: 0.88 });
      for (let k = 0; k < 7; k++) { const c = new THREE.Mesh(new THREE.OctahedronGeometry(1, 0), mat); const hh = sz * (k === 0 ? 1 : 0.35 + this.r() * 0.4); c.scale.set(hh * 0.22, hh * 0.6, hh * 0.22); c.position.set(k ? (this.r() - 0.5) * sz * 0.5 : 0, hh * 0.5, k ? (this.r() - 0.5) * sz * 0.5 : 0); c.rotation.set((this.r() - 0.5) * 0.5, this.r() * 3, (this.r() - 0.5) * 0.5); c.castShadow = true; g.add(c); }
      const light = new THREE.PointLight(cols[idx], 0, 40, 2); light.position.y = sz * 0.6; g.add(light);
      this.scene.add(g); this.cols.push({ x: p.x, z: p.z, r: sz * 0.18, top: p.y + sz, side: true });
      const cr = { pos: p.clone().setY(p.y + sz * 0.5), radius: sz * 0.35, mat, light, idx, g, cool: 0, hitBy: () => this.hitCrystal(cr) };
      this.crystals.push(cr);
    });
    this.crystalNotes = notes;
  }
  hitCrystal(cr) {
    if (this.done || cr.cool > 0) return true; cr.cool = 0.5; Sound.note(this.crystalNotes[cr.idx]);
    if (cr.idx === this.crystalNext) { this.crystalNext++; cr.mat.emissiveIntensity = 1.6; cr.light.intensity = 200; this.particles.sparkle(cr.pos, cr.mat.color.getHex(), 50); this.pops.add(['Low note!', 'Higher...', 'Higher!', 'Almost!', 'Perfect!'][cr.idx], cr.pos.clone().add(V3(0, 6, 0)), '#ffffff', 1.3); if (this.crystalNext >= 5) this.complete(); }
    else { Sound.tone(110, 0.6, 'sawtooth', 0.12, -40); this.app.ui.toast('Out of tune! Start again from the biggest crystal (lowest note).'); this.crystalNext = 0; this.crystals.forEach(c => { c.mat.emissiveIntensity = 0.25; c.light.intensity = 0; }); }
    return true;
  }
  buildAuroras() {
    const cols = [0x7cffd4, 0xb08cff, 0x38f0ff];
    cols.forEach((c, i) => { const g = new THREE.PlaneGeometry(1400, 220, 80, 1); const p = g.attributes.position; for (let k = 0; k < p.count; k++) { const x = p.getX(k); p.setZ(k, Math.sin(x * 0.004 + i) * 120); } const m = new THREE.Mesh(g, new THREE.ShaderMaterial({ uniforms: { c: { value: new THREE.Color(c) }, uT: { value: 0 } }, transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, fog: false, vertexShader: 'varying vec2 vU; void main(){ vU = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }', fragmentShader: 'uniform vec3 c; uniform float uT; varying vec2 vU; void main(){ float b = .5+.5*sin(vU.x*40. + uT*.3 + sin(vU.x*9. + uT*.2)*3.); float a = pow(vU.y, 1.6)*(1.-vU.y)*2.4*b; gl_FragColor = vec4(c, a*.55); }' })); m.position.set(0, 260 + i * 40, -300 + i * 250); m.rotation.y = i * 0.7; this.scene.add(m); this.anim.push({ o: m, f: (o, tt) => { o.material.uniforms.uT.value = tt; } }); });
  }
  buildGeysers(color) {
    this.geysers = []; for (let i = 0; i < 14; i++) { const p = this.landPoint(30, 500); const vent = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 2.6, 1.2, 16), new THREE.MeshStandardMaterial({ color: 0x2a1a10, emissive: color, emissiveIntensity: 0.6, roughness: 0.8 })); vent.position.copy(p).add(V3(0, 0.3, 0)); this.scene.add(vent); this.geysers.push({ p, t: this.r() * 6, color }); }
  }
  buildWhales() {
    this.whales = [];
    for (let i = 0; i < 5; i++) {
      const g = new THREE.Group(), c = [0x7cffd4, 0x1d8cff, 0xb08cff, 0xff9ae6, 0x9fe6ff][i];
      const mat = new THREE.MeshStandardMaterial({ color: 0x0a2a5a, emissive: c, emissiveIntensity: 0.25, roughness: 0.4, metalness: 0.2 });
      const body = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 20), mat); body.scale.set(5, 4, 16); g.add(body);
      const tail = new THREE.Mesh(new THREE.ConeGeometry(4, 8, 4), mat); tail.rotation.x = -Math.PI / 2; tail.scale.set(2, 0.3, 1); tail.position.z = -18; g.add(tail);
      for (const sx of [-1, 1]) { const fin = new THREE.Mesh(new THREE.BoxGeometry(8, 0.4, 3), mat); fin.position.set(sx * 6, -1.5, 2); fin.rotation.z = sx * 0.4; g.add(fin); }
      for (let k = 0; k < 14; k++) { const s = glowSprite(c, 1.6, 0.9); s.position.set((this.r() - 0.5) * 7, 1 + this.r() * 3, (this.r() - 0.5) * 26); g.add(s); }
      g.scale.setScalar(1.4 + i * 0.3); this.scene.add(g); this.whales.push({ g, a: i * 1.3, r: 180 + i * 60, y: 90 + i * 18, s: 0.03 + i * 0.006, tail });
    }
  }
  buildGiantShrooms() {
    this.bigShrooms = []; const colsC = [0xff7ab8, 0x7cffd4, 0xb08cff, 0xffd23f];
    for (let i = 0; i < 14; i++) {
      const p = this.landPoint(50, 480), hgt = 26 + this.r() * 40, cr = 11 + this.r() * 9, c = colsC[i % 4];
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 3.6, hgt, 20), new THREE.MeshStandardMaterial({ color: 0xf0e6ff, roughness: 0.7 })); stem.position.copy(p).add(V3(0, hgt / 2, 0)); stem.castShadow = true; this.scene.add(stem);
      const cap = new THREE.Mesh(new THREE.SphereGeometry(cr, 40, 20, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 0.35, roughness: 0.45 })); cap.scale.y = 0.45; cap.position.copy(p).add(V3(0, hgt, 0)); cap.castShadow = true; this.scene.add(cap);
      for (let k = 0; k < 10; k++) { const a = this.r() * 6.28, rr = this.r() * cr * 0.85, dot = new THREE.Mesh(new THREE.SphereGeometry(0.9 + this.r(), 10, 8), new THREE.MeshBasicMaterial({ color: 0xffffff })); const yy = Math.sqrt(Math.max(0, 1 - (rr / cr) ** 2)) * cr * 0.45; dot.position.set(p.x + Math.cos(a) * rr, p.y + hgt + yy, p.z + Math.sin(a) * rr); this.scene.add(dot); }
      const topY = p.y + hgt + cr * 0.45; this.cols.push({ x: p.x, z: p.z, r: cr * 0.9, top: topY - 1, bounce: 20 }); this.cols.push({ x: p.x, z: p.z, r: 3, top: topY - 2, side: true });
      this.bigShrooms.push(V3(p.x, topY, p.z));
      // little bounce shroom at the foot so you can get up
      const bp = p.clone().add(V3(cr * 0.9, 0, 0)); bp.y = this.hf.at(bp.x, bp.z); const small = new THREE.Mesh(new THREE.SphereGeometry(3, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x7cffd4, emissive: 0x7cffd4, emissiveIntensity: 0.6 })); small.scale.y = 0.5; small.position.copy(bp); this.scene.add(small); this.cols.push({ x: bp.x, z: bp.z, r: 2.8, top: bp.y + 1.2, bounce: 32 });
    }
  }
  buildClouds() {
    const n = LOW ? 260 : 520, im = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 2), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, emissive: 0xffc6e6, emissiveIntensity: 0.25 }), n);
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion();
    for (let i = 0; i < n; i++) { const cl = Math.floor(i / 8), cx = (rng(cl + 9)() - 0.5) * 1100, cz = (rng(cl + 99)() - 0.5) * 1100, cy = -40 + rng(cl + 999)() * 160; const s = 6 + this.r() * 12; m4.compose(V3(cx + (this.r() - 0.5) * 30, cy + (this.r() - 0.5) * 8, cz + (this.r() - 0.5) * 30), q, V3(s, s * 0.6, s)); im.setMatrixAt(i, m4); }
    this.scene.add(im);
  }
  buildRainbows() {
    for (let i = 0; i < 3; i++) { const m = new THREE.Mesh(new THREE.TorusGeometry(160 + i * 40, 8, 12, 80, Math.PI), new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false, vertexShader: 'varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }', fragmentShader: 'varying vec3 vP; vec3 hue(float h){ return clamp(abs(mod(h*6.+vec3(0.,4.,2.),6.)-3.)-1.,0.,1.); } void main(){ float r = length(vP.xy); float k = fract(r*.12); gl_FragColor = vec4(hue(k), .35); }' })); m.position.set((i - 1) * 380, -20, -200 - i * 180); m.rotation.y = i * 0.6; this.scene.add(m); }
  }
  buildBalloons() {
    const n = 80, im = new THREE.InstancedMesh(new THREE.SphereGeometry(1.4, 16, 12), new THREE.MeshStandardMaterial({ roughness: 0.2, metalness: 0.1, emissiveIntensity: 0.3 }), n), c = new THREE.Color(), m4 = new THREE.Matrix4(), q = new THREE.Quaternion();
    const base = []; for (let i = 0; i < n; i++) { const p = V3((this.r() - 0.5) * 900, this.waterLevel + 30 + this.r() * 80, (this.r() - 0.5) * 900); base.push(p); m4.compose(p, q, V3(1, 1.2, 1)); im.setMatrixAt(i, m4); c.setHSL(this.r(), 0.9, 0.6); im.setColorAt(i, c); }
    im.instanceColor.needsUpdate = true; this.scene.add(im);
    this.anim.push({ o: im, f: (o, tt) => { for (let i = 0; i < n; i += 4) { m4.compose(base[i].clone().add(V3(0, Math.sin(tt * 0.6 + i) * 2, 0)), q, V3(1, 1.2, 1)); o.setMatrixAt(i, m4); } o.instanceMatrix.needsUpdate = true; } });
  }
  buildFloatingIslands() {
    const mat = new THREE.MeshStandardMaterial({ color: 0x120a2a, emissive: 0x6a3dff, emissiveIntensity: 0.15, roughness: 0.8, flatShading: true });
    for (let i = 0; i < 26; i++) { const r0 = 10 + this.r() * 30, cone = new THREE.Mesh(new THREE.ConeGeometry(r0, r0 * 2.2, 7), mat); cone.rotation.x = Math.PI; cone.position.set((this.r() - 0.5) * 1000, 120 + this.r() * 220, (this.r() - 0.5) * 1000); this.scene.add(cone); const edge = new THREE.Mesh(new THREE.TorusGeometry(r0 * 0.95, 0.4, 6, 7), new THREE.MeshBasicMaterial({ color: 0xb08cff })); edge.rotation.x = Math.PI / 2; edge.position.copy(cone.position).add(V3(0, r0 * 1.1, 0)); this.scene.add(edge); this.anim.push({ o: cone, e: edge, y0: cone.position.y, k: this.r() * 6, f: (o, tt, a) => { o.position.y = a.y0 + Math.sin(tt * 0.2 + a.k) * 6; a.e.position.y = o.position.y + r0 * 1.1; } }); }
  }
  buildPipes() {
    const mat = new THREE.MeshStandardMaterial({ color: 0x5b6270, metalness: 0.8, roughness: 0.3 });
    for (let i = 0; i < 30; i++) { const a = this.landPoint(20, 520), b = a.clone().add(V3((this.r() - 0.5) * 60, 0, (this.r() - 0.5) * 60)); b.y = this.hf.at(b.x, b.z); const mid = a.clone().lerp(b, 0.5).add(V3(0, 12 + this.r() * 20, 0)); const c = new THREE.QuadraticBezierCurve3(a, mid, b); const t = new THREE.Mesh(new THREE.TubeGeometry(c, 40, 0.8, 10, false), mat); t.castShadow = true; this.scene.add(t); }
  }
  buildHeart() {
    const g = new THREE.Group(); g.position.set(0, 40, 0);
    const heart = new THREE.Shape(); heart.moveTo(0, -10); heart.bezierCurveTo(-14, 0, -12, 11, 0, 5); heart.bezierCurveTo(12, 11, 14, 0, 0, -10);
    const geo = new THREE.ExtrudeGeometry(heart, { depth: 4, bevelEnabled: true, bevelSize: 1, bevelThickness: 1, bevelSegments: 4 }); geo.center();
    const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: 0x3a0a24, emissive: 0xff2f6a, emissiveIntensity: 0.4, metalness: 0.3, roughness: 0.2 })); g.add(m); this.heartMesh = m;
    const halo = glowSprite(0xff2f6a, 90, 0.35); g.add(halo); this.scene.add(g); this.heartG = g; this.anim.push({ o: g, f: (o, tt) => { o.rotation.y = tt * 0.15; o.position.y = 40 + Math.sin(tt * 0.5) * 3; } });
  }
}

/* ---------- part 2: actors, missions, secrets, loop ---------- */
Object.assign(World.prototype, {
  async buildActors() {
    const cfg = this.cfg, jobs = [], needFree = cfg.mission.type === 'free' ? cfg.mission.n + 4 : 0; let jammedLeft = needFree;
    const total = cfg.aliens.reduce((a, b) => a + b[1], 0);
    for (const [m, n0, jam] of cfg.aliens) {
      const n = LOW ? Math.ceil(n0 * 0.75) : n0;
      for (let i = 0; i < n; i++) {
        const home = this.landPoint(25, 520); let jammed = this.r() < jam; if (!jammed && jammedLeft > 0 && jam > 0.3) jammed = true; if (jammed) jammedLeft--;
        const big = m === 'alien-mushking';
        jobs.push(spawnModel(m, { height: ALIEN_H[m] || 1.5 }).then(mod => { if (!mod) return; const clips = mod.userData.clips || {}; const a = new Alien(this, mod, home, big ? false : jammed, { flyer: !!clips.Flying_Idle, scale: 1, name: m.replace('alien-', '') }); if (big) a.king = true; this.aliens.push(a); }));
      }
    }
    void total;
    for (const [m, n0] of cfg.drones) { const n = LOW ? Math.ceil(n0 * 0.7) : n0; const D = DRONE[m] || [1.5, 30]; for (let i = 0; i < n; i++) { const home = this.landPoint(60, 540); jobs.push(spawnModel(m, { height: D[0] }).then(mod => { if (mod) this.drones.push(new Drone(this, mod, home, { hp: D[1], walker: m === 'drone-large', radius: D[0] * 0.7 })); })); } }
    await Promise.all(jobs);
  },
  async buildMission() {
    const M = this.cfg.mission; this.m = { type: M.type, n: M.n || 1, got: 0, rings: [], active: 0, timer: 0 };
    const kindOf = { 'Spark Cell': ['cell', 0xff4fd8], 'Song Pearl': ['pearl', 0xe6f8ff], 'Spore Lantern': ['lantern', 0x7cffd4], 'Relic Tablet': ['tablet', 0xffd23f] };
    if (M.type === 'collect') {
      const [kind, col] = kindOf[M.item] || ['cell', 0xff4fd8]; let spots = [];
      if (M.item === 'Spore Lantern' && this.bigShrooms) spots = this.bigShrooms.slice(0, M.n).map(p => p.clone().add(V3(0, 2, 0)));
      else if (M.item === 'Relic Tablet') { const ruins = [].concat(this.propSpots['ruin-temple'] || [], this.propSpots['ruin-wonder'] || [], this.propSpots['ruin-tower'] || [], this.propSpots['ruin-market'] || []); spots = ruins.slice(0, M.n).map(r => V3(r.x + r.s * 0.5, r.y + 1.5, r.z + r.s * 0.5)); }
      while (spots.length < M.n) { const p = this.landPoint(80 + spots.length * 40, 520); if (spots.every(s => s.distanceTo(p) > 60)) spots.push(p.add(V3(0, 1.6, 0))); }
      spots.forEach((p, i) => { const o = makeCollectible(kind, col); o.position.copy(p); this.scene.add(o); this.items.push({ o, pos: p, kind: 'mission', idx: i }); });
    }
    if (M.type === 'summit') { const pk = this.special.summit, top = this.hf.at(pk[0], pk[1]); this.summit = V3(pk[0], top, pk[1]); const beacon = makeCollectible('shard', 0x9fe6ff); beacon.scale.setScalar(2.2); beacon.position.copy(this.summit).add(V3(0, 4, 0)); this.scene.add(beacon); this.beacon = beacon; const pillar = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.5, 1200, 16, 1, true), new THREE.MeshBasicMaterial({ color: 0x9fe6ff, transparent: true, opacity: 0.12, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false })); pillar.position.copy(this.summit).add(V3(0, 600, 0)); this.scene.add(pillar); if (!this.camps && this.cfg.features.includes('camps')) this.buildCamps(); }
    if (M.type === 'race') {
      const n = M.n; let p = this.spawn.clone().add(V3(20, 0, 20)), dir = new THREE.Vector3(1, 0, 1).normalize();
      for (let i = 0; i < n; i++) { dir.applyAxisAngle(V3(0, 1, 0), (this.r() - 0.4) * 1.2); p = p.clone().addScaledVector(dir, 48 + this.r() * 26); p.x = clamp(p.x, -520, 520); p.z = clamp(p.z, -520, 520); if (Math.abs(p.x) >= 520 || Math.abs(p.z) >= 520) dir.multiplyScalar(-1); const gy = Math.max(this.hf.at(p.x, p.z), this.waterLevel, this.cfg.terrain.style === 'sky' ? 30 : -1e9); p.y = gy + 12 + this.r() * 22; const ring = makeGateRing(this.cfg.id === 7 ? 0xff8a3d : 0xff7ab8, 6); ring.position.copy(p); this.scene.add(ring); this.m.rings.push({ g: ring, pos: p.clone() }); }
      this.m.rings.forEach((r, i) => { const nx = this.m.rings[i + 1] ? this.m.rings[i + 1].pos : r.pos.clone().add(dir); r.g.lookAt(nx); r.normal = nx.clone().sub(r.pos).normalize(); });
      this.refreshRings();
    }
    if (M.type === 'boss') {
      const mod = await spawnModel('drone-cyber', { height: 2 }); if (mod) { const b = new Drone(this, mod, V3(0, 0, 0), { hp: 900, boss: true, scale: 6, radius: 7 }); b.pos.set(0, 40, 0); this.boss = b; this.drones.push(b); const lbl = textSprite('STATIC DRONE MOTHER', { size: 72, scale: 3, color: '#ff4f79', glow: '#ff2f4a' }); lbl.position.y = 18; b.group.add(lbl); }
    }
    if (M.type === 'final') {
      const mod = await spawnModel('alien-warden', { height: 3 }); if (mod) { const a = new Alien(this, mod, V3(0, this.hf.at(0, 0), 0), true, { flyer: true, scale: 6, name: 'Warden' }); a.boss = true; a.hitBy = (p) => { a.tune = 0; this.wardenHits = (this.wardenHits || 0) + 1; a.big = Math.min(12, a.big * 1.035); a.model.scale.multiplyScalar(1.035); a.aura.scale.multiplyScalar(1.03); Sound.tone(80, 0.4, 'sawtooth', 0.12, 40); if (this.wardenHits === 6) this.app.orbi.speak('Uh... it gets BIGGER every time you shoot it. What if we tried something else?'); if (this.wardenHits === 14) this.app.ui.toast('Shooting only feeds the Static. Maybe put the blaster away?'); return true; }; a.update = ((orig) => (dt) => { orig.call(a, dt); a.pos.y = this.hf.at(a.pos.x, a.pos.z) + 10 + Math.sin(this.t) * 2; a.group.position.copy(a.pos); })(a.update); a.hitPos = () => a.pos.clone().add(V3(0, 6, 0)); a.radius = 8; this.warden = a; this.aliens.push(a); }
    }
    if (M.type === 'free') { /* counted in onFreed */ }
  },
  refreshRings() { this.m.rings.forEach((r, i) => { const on = i === this.m.active, next = i === this.m.active + 1; r.g.visible = i >= this.m.active; r.g.userData.torus.material.emissiveIntensity = on ? 2.4 : next ? 0.8 : 0.3; r.g.scale.setScalar(on ? 1.15 : 1); }); },
  async buildGlyphs() {
    const got = S.glyphs[this.id] || [], spots = [];
    // 1: the highest point we can find
    let best = null; for (let i = 0; i < 400; i++) { const x = (this.r() - 0.5) * 1080, z = (this.r() - 0.5) * 1080, h = this.hf.at(x, z); if (!best || h > best.y) best = V3(x, h, z); } spots.push(best.clone().add(V3(0, 2.5, 0)));
    // 2: far corner near the edge
    const c = this.r() * 6.28; const fx = Math.cos(c) * 520, fz = Math.sin(c) * 520; spots.push(V3(fx, Math.max(this.hf.at(fx, fz), this.waterLevel) + 2, fz));
    // 3: on a rooftop / cap / high in the air
    if (this.cityBlocks) { const b = this.cityBlocks.reduce((a, b2) => b2.h > a.h ? b2 : a); spots.push(V3(b.x, b.h + 2, b.z)); } else if (this.bigShrooms) spots.push(this.bigShrooms[this.bigShrooms.length - 1].clone().add(V3(0, 3, 0))); else { const p = this.landPoint(120, 420); spots.push(p.add(V3(0, 38, 0))); }
    // 4: near the sky black hole's shadow, a far valley
    const p4 = this.landPoint(300, 540); spots.push(p4.add(V3(0, 1.5, 0)));
    // 5: behind the landing pad, tucked low
    spots.push(this.spawn.clone().add(V3(-26, 0, -22)).setY(Math.max(this.hf.at(this.spawn.x - 26, this.spawn.z - 22), this.waterLevel) + 1.2));
    spots.forEach((p, i) => { if (got.includes(i)) return; const o = makeCollectible('glyph', 0xb08cff); o.children[2].visible = false; o.scale.setScalar(0.9); o.position.copy(p); this.scene.add(o); this.items.push({ o, pos: p, kind: 'glyph', idx: i }); });
  },
  async buildPickups() {
    const n = LOW ? 10 : 16;
    for (let i = 0; i < n; i++) { const kind = i % 2 ? 'fuel' : 'health'; const p = this.landPoint(20, 520).add(V3(0, 1.2, 0)); const m = await spawnModel(kind === 'fuel' ? 'pickup-fuel' : 'pickup-health', { height: 1.2 }); const o = m || makeCollectible('cell', kind === 'fuel' ? 0x4cc3ff : 0x7cff6b); const glow = glowSprite(kind === 'fuel' ? 0x4cc3ff : 0x7cff6b, 3, 0.5); o.add(glow); o.position.copy(p); this.scene.add(o); this.items.push({ o, pos: p, kind, idx: i }); }
  },
  buildPortals() {
    const sc = this.scene;
    if (this.id === 7) { // Magmara: the dark eye
      const vc = this.special.volcano || [80, 60]; const p = V3(vc[0], this.hf.at(vc[0], vc[1]) + 30, vc[1]); const bh = makeBlackHole(6, 0x6a3dff, 0x120a2a); bh.position.copy(p); sc.add(bh); this.portal = { g: bh, pos: p, to: 13, open: (S.glyphs[7] || []).length >= 5 };
      if (!this.portal.open) { bh.userData.disk.visible = false; bh.userData.halo.material.color.set(0x220a10); }
    }
    if (this.id === 8) { // Aquara: the spinning sea
      const p = this.landPoint(380, 540); p.y = this.waterLevel + 0.4; const bh = makeBlackHole(5, 0x7cffd4, 0x1d8cff); bh.position.copy(p); sc.add(bh); this.portal = { g: bh, pos: p, to: 14, open: S.friends >= 20 };
      if (!this.portal.open) bh.visible = false;
    }
  },
  /* ---------- events ---------- */
  onFreed(a) {
    if (this.m.type === 'free' && !this.done) { this.m.got++; this.app.ui.toast(`${this.m.got} / ${this.m.n} freed`); if (this.m.got >= this.m.n) this.complete(); }
    if (this.portal && this.portal.to === 14 && !this.portal.open && S.friends >= 20) this.openPortal();
  },
  onDroneDown(d) {
    if (this.r() < 0.35) { const kind = this.r() < 0.5 ? 'health' : 'fuel'; const o = makeCollectible('cell', kind === 'fuel' ? 0x4cc3ff : 0x7cff6b); o.children[2].visible = false; o.scale.setScalar(0.8); const p = d.pos.clone(); p.y = this.groundAt(p.x, p.z, 999).h + 1.2; o.position.copy(p); this.scene.add(o); this.items.push({ o, pos: p, kind, idx: -1, once: true }); }
    if (d === this.boss && !this.done) this.complete();
  },
  openPortal() {
    const P = this.portal; P.open = true; P.g.visible = true; P.g.userData.disk.visible = true; P.g.userData.halo.material.color.set(0x6a3dff);
    this.app.ui.toast(P.to === 13 ? 'Deep in the volcano, something just opened its eye...' : 'The sea is spinning. Twenty voices were enough.', 7000); Sound.shard();
  },
  complete() {
    if (this.done) return; this.done = true; const cfg = this.cfg, first = !S.done[cfg.id]; S.done[cfg.id] = true;
    const rw = cfg.reward || {}; let rewardText = '';
    if (cfg.kind !== 'hidden' && !S.shards.includes(cfg.id)) S.shards.push(cfg.id);
    if (rw.weapon && !S.weapons.includes(rw.weapon)) { S.weapons.push(rw.weapon); this.player.setWeapon(rw.weapon); rewardText = `New weapon: ${WEAPONS[rw.weapon].name}. ${WEAPONS[rw.weapon].desc}`; }
    if (rw.ability && !S.abilities.includes(rw.ability)) { S.abilities.push(rw.ability); rewardText = `New power: ${ABILITIES[rw.ability].name}. ${ABILITIES[rw.ability].desc}`; if (rw.ability === 'heal') this.player.maxHp += 25; if (rw.ability === 'fuel' || rw.ability === 'fuel2') this.player.maxFuel *= 1.5; }
    if (rw.badge) rewardText = `Badge earned: ${rw.badge}.`;
    S.save(); Sound.shard();
    // shard ceremony: a giant spinning shard rises with a burst of light
    const sh = makeCollectible('shard', 0xffd23f); sh.children[2].visible = false; sh.position.copy(this.player.pos).add(V3(0, 3, 0)); sh.scale.setScalar(0.01); this.scene.add(sh);
    this.anim.push({ o: sh, t0: this.t, f: (o, tt, a) => { const k = Math.min(1, (tt - a.t0) / 2); o.scale.setScalar(0.01 + k * 2.6); o.position.y = this.player.pos.y + 3 + k * 5; o.rotation.y = tt * 2; if (k < 1 && Math.random() < 0.5) this.particles.sparkle(o.position, 0xffd23f, 6); } });
    this.particles.sparkle(this.player.pos.clone().add(V3(0, 2, 0)), 0xffd23f, 120);
    const unlockedNext = first && cfg.kind !== 'hidden' ? this.app.nextUnlockName() : null;
    setTimeout(() => this.app.ui.missionComplete(cfg, rewardText, unlockedNext), 1400);
  },
  statusText() {
    const m = this.m; if (!m) return ''; if (this.done) return 'Harmony restored! Explore, or head back to the galaxy.';
    switch (m.type) {
      case 'collect': return `${m.got} / ${m.n} ${this.cfg.mission.item}s`;
      case 'free': return `${m.got} / ${m.n} freed`;
      case 'summit': return this.summit ? `${Math.max(0, Math.round(this.summit.y - this.player.pos.y))} m to the summit` : '';
      case 'race': return m.active === 0 ? `${m.n} rings. Timer starts at the first ring.` : `Ring ${m.active + 1} / ${m.n} · ${Math.max(0, Math.ceil(m.timer))}s`;
      case 'boss': return this.boss ? `Drone Mother: ${Math.max(0, Math.ceil(this.boss.hp / this.boss.maxHp * 100))}%` : '';
      case 'coaster': return this.coaster && this.coaster.riding ? `Targets: ${this.coaster.hits} / ${m.n}` : 'Find the Star Coaster station';
      case 'crystal': return `Crystals in tune: ${this.crystalNext || 0} / 5`;
      case 'final': return this.player && this.player.holstered ? 'Blaster holstered. Walk close to the Warden...' : 'The Warden is waiting.';
    }
    return '';
  },
  objective() {
    const m = this.m; if (!m || this.done) return null; const pl = this.player.pos;
    if (m.type === 'collect') { let b = null, bd = 1e9; for (const it of this.items) if (it.kind === 'mission') { const d = it.pos.distanceTo(pl); if (d < bd) { bd = d; b = it.pos; } } return b; }
    if (m.type === 'free') { let b = null, bd = 1e9; for (const a of this.aliens) if (a.jammed && !a.boss) { const d = a.pos.distanceTo(pl); if (d < bd) { bd = d; b = a.pos; } } return b; }
    if (m.type === 'summit') return this.summit; if (m.type === 'race') return m.rings[m.active] ? m.rings[m.active].pos : null;
    if (m.type === 'boss') return this.boss && this.boss.alive ? this.boss.pos : null; if (m.type === 'coaster') return this.coaster ? this.coaster.station : null;
    if (m.type === 'crystal') return this.crystals ? (this.crystals.find(c => c.idx === this.crystalNext) || {}).pos : null; if (m.type === 'final') return this.warden ? this.warden.pos : null;
    return null;
  },
  nearestGlyph() { let b = null, bd = 1e9; for (const it of this.items) if (it.kind === 'glyph') { const d = it.pos.distanceTo(this.player.pos); if (d < bd) { bd = d; b = it.pos; } } return b; },
  /* ---------- interaction (E) ---------- */
  talk() {
    const pl = this.player;
    if (this.coaster && !this.coaster.riding && pl.pos.distanceTo(this.coaster.station) < 14) { this.rideCoaster(true); return; }
    if (this.warden && !this.done) { const d = Math.hypot(pl.pos.x - this.warden.pos.x, pl.pos.z - this.warden.pos.z); if (d < 26) { if (pl.holstered) { this.finale(); } else { this.app.orbi.speak('It won\u2019t listen while your blaster is out. Try holstering it (H).'); } return; } }
    let best = null, bd = 6; for (const a of this.aliens) { if (a.jammed || a.boss) continue; const d = a.pos.distanceTo(pl.pos); if (d < bd) { bd = d; best = a; } }
    if (best) { const lines = this.friendLines(best); best.play(['Yes', 'Wave', 'Dance'], 0.1, true); this.app.orbi.speak(`${cap(best.name)}: ${lines}`); this.app.ui.toast(`${cap(best.name)}: ${lines}`, 6000); Sound.tone(520, 0.1, 'sine', 0.1, 200); return; }
    this.app.ui.toast('Nobody to talk to here. Walk up to a friendly alien (no red crackle) and press talk.');
  },
  friendLines(a) {
    if (a.king) return 'Zzz... oh! A visitor. The lanterns are on top of my cousins. Bounce, little one. Bounce!';
    const g = this.cfg.glyphs, pool = [...g.slice(0, 3), 'Thanks for waking me up! I forgot how nice it is to not be grumpy.', 'I thought you were going to fight me. You tuned me instead. That\u2019s so much better.', 'Look for the glyphs. They glow purple and spin like a knot.'];
    const rd = { 7: 'The glyphs here burn hot. Five of them wake the dark eye in the volcano.', 8: 'The sea counts friends. At twenty, something spins open far from here.', 12: 'The tablets say the Static lives at the core. It is not a monster. Just very, very loud.' }[this.id];
    if (rd && Math.random() < 0.45) return rd; return pool[Math.floor(Math.random() * pool.length)];
  },
  finale() {
    if (this.done) return; const a = this.warden; this.player.riding = true; this.app.ui.toast('...', 2000);
    this.drones.forEach(d => d.alive && d.kill());
    let k = 0; const iv = setInterval(() => { k++; a.model.scale.multiplyScalar(0.94); a.aura.material.color.set(0xffd23f); this.particles.sparkle(a.pos.clone().add(V3(0, 5, 0)), [0xffd23f, 0xff7ab8, 0x7cffd4][k % 3], 40); if (k > 18) { clearInterval(iv); a.jammed = false; a.play(['Yes', 'Flying_Idle'], 0.3); this.heartMesh && (this.heartMesh.material.emissive.set(0xffd23f), this.heartMesh.material.emissiveIntensity = 1.4); this.player.riding = false; this.complete(); setTimeout(() => this.app.ui.win(), 3200); } }, 160);
    Sound.shard(); S.friends++; S.save();
  },
  /* ---------- main loop ---------- */
  update(dt, input) {
    this.t += dt; const t = this.t, pl = this.player, sens = (S.settings.sens || 1);
    // camera look + zoom (full 360 spin, near-full vertical)
    this.camYaw -= input.lookDX * 0.0055 * sens; this.camPitch = clamp(this.camPitch + input.lookDY * 0.0045 * sens, -1.35, 1.45); this.camDist = clamp(this.camDist * input.zoom, 2.2, 70);
    // actions
    if (input.swapPressed && S.weapons.length > 1) { const i = S.weapons.indexOf(pl.weapon); pl.setWeapon(S.weapons[(i + 1) % S.weapons.length]); Sound.ui(); this.app.ui.toast(WEAPONS[pl.weapon].name); }
    if (input.holsterPressed) { pl.holstered = !pl.holstered; Sound.ui(); this.app.ui.toast(pl.holstered ? 'Blaster holstered. Peaceful mode.' : 'Blaster ready.'); }
    if (input.talkPressed) this.talk();
    // coaster ride
    const C = this.coaster;
    if (C && C.riding) {
      const p = C.curve.getPointAt(C.u), T = C.curve.getTangentAt(C.u); C.speed = clamp(C.speed + (-T.y * 30 - 0.4) * dt, 14, 48); C.u += C.speed * dt / C.L;
      const fi = Math.floor(C.u % 1 * C.samples), Nn = C.frames.normals[fi] || V3(0, 1, 0); C.cart.position.copy(p).addScaledVector(Nn, 0.4); C.cart.lookAt(p.clone().add(T)); pl.pos.copy(C.cart.position); pl.group.position.copy(pl.pos).addScaledVector(Nn, 0.5); pl.group.lookAt(pl.group.position.clone().add(T));
      if (C.u >= 1) { C.riding = false; const hits = C.hits; this.rideCoaster(false); if (hits >= this.m.n) this.complete(); else this.app.ui.toast(`You hit ${hits} of ${this.m.n}. Ride again (press E at the station)!`, 5000); }
    } else if (C) { const p = C.curve.getPointAt(0); C.cart.position.copy(p); C.cart.lookAt(p.clone().add(C.curve.getTangentAt(0))); }
    pl.update(dt, input, this.camYaw);
    // side collisions (towers, rocks)
    for (const c of this.cols) { if (!c.side) continue; const dx = pl.pos.x - c.x, dz = pl.pos.z - c.z, d2 = dx * dx + dz * dz; if (d2 < c.r * c.r && pl.pos.y < c.top - 0.3) { const d = Math.sqrt(d2) || 0.01; pl.pos.x = c.x + dx / d * c.r; pl.pos.z = c.z + dz / d * c.r; } }
    // firing
    if (input.firing && !pl.holstered && !pl.dead && pl.cool <= 0) this.fire(input);
    // actors
    for (const a of this.aliens) a.update(dt); for (const d of this.drones) d.update(dt);
    if (this.boss && this.boss.alive && Math.random() < dt / 10 && this.drones.filter(d => d.alive).length < 26) { spawnModel('drone-mini', { height: 1 }).then(m => { if (m && this.boss && this.boss.alive) this.drones.push(new Drone(this, m, this.boss.pos.clone(), { hp: 20 })); }); }
    this.shots.update(dt);
    // items
    for (let i = this.items.length - 1; i >= 0; i--) {
      const it = this.items[i]; it.o.rotation.y += dt * 1.4; it.o.position.y = it.pos.y + Math.sin(t * 2 + i) * 0.25;
      if (it.hideT) { it.hideT -= dt; if (it.hideT <= 0) it.o.visible = true; continue; }
      if (pl.pos.distanceTo(it.pos) < 2.8 || (pl.pos.distanceTo(it.pos) < 4 && pl.jetting)) this.collect(it, i);
    }
    // summit
    if (this.m.type === 'summit' && !this.done && this.summit && pl.pos.distanceTo(this.summit) < 10) this.complete();
    if (this.beacon) { this.beacon.rotation.y += dt; }
    if (this.camps) for (const c of this.camps) if (pl.pos.distanceTo(c) < 7 && pl.fuel < pl.maxFuel) { pl.fuel = pl.maxFuel; if (!this.campMsgT || t - this.campMsgT > 6) { this.campMsgT = t; this.app.ui.toast('Camp! Jet fuel refilled.'); Sound.pickup(); } }
    // race
    if (this.m.type === 'race' && !this.done) {
      const r = this.m.rings[this.m.active]; if (this.m.active > 0) { this.m.timer -= dt; if (this.m.timer <= 0) { this.app.ui.toast('Out of time! The rings reset. Try again from ring 1.', 5000); this.m.active = 0; this.refreshRings(); } }
      if (r) { const rel = pl.pos.clone().add(V3(0, 1, 0)).sub(r.pos); if (rel.length() < 6.6 && Math.abs(rel.dot(r.normal)) < 2.5) { if (this.m.active === 0) this.m.timer = this.cfg.mission.time; this.m.active++; pl.fuel = Math.min(pl.maxFuel, pl.fuel + pl.maxFuel * 0.6); Sound.pickup(); this.particles.sparkle(r.pos, 0xffd23f, 50); this.pops.add(`${this.m.active} / ${this.m.n}`, r.pos.clone().add(V3(0, 7, 0)), '#ffd23f', 1.4); this.refreshRings(); if (this.m.active >= this.m.n) this.complete(); } }
      this.m.rings.forEach((rr, i) => { rr.g.rotation.z += dt * (i === this.m.active ? 1 : 0.2); });
    }
    // crystals cooldown
    if (this.crystals) this.crystals.forEach(c => { c.cool -= dt; });
    // geysers
    if (this.geysers) for (const g of this.geysers) { g.t -= dt; if (g.t < 0) { g.t = 5 + this.r() * 4; } if (g.t < 1.4 && pl.pos.distanceTo(g.p) < 120) { this.particles.emit(g.p.clone().add(V3(0, 1, 0)), 6, { color: g.color, color2: 0xffd23f, speed: 4, up: 30, life: 1.1, size: 1.1, gravity: 20, drag: 0.3, jitter: 1.2 }); if (pl.pos.distanceTo(g.p) < 3.2 && pl.pos.y < g.p.y + 3) { pl.vel.y = 32; pl.onGround = false; } } }
    // portals
    if (this.portal) { const P = this.portal; P.g.userData.cam = this.camera.position; P.g.userData.tick(t); if (!P.open && P.to === 13 && (S.glyphs[7] || []).length >= 5) this.openPortal(); if (P.open && pl.pos.distanceTo(P.pos) < 9) { if (!S.found.includes(P.to)) S.found.push(P.to); S.save(); this.portal = null; this.app.ui.toast('Through the black hole...', 3000); this.app.enterWorld(P.to, true); return; } }
    // whales, anims, ambient
    if (this.whales) for (const w of this.whales) { w.a += dt * w.s; w.g.position.set(Math.cos(w.a) * w.r, w.y + Math.sin(t * 0.3 + w.r) * 8, Math.sin(w.a) * w.r); w.g.rotation.y = -w.a; w.tail.rotation.y = Math.sin(t * 1.2 + w.r) * 0.3; }
    for (const a of this.anim) a.f(a.o, t, a);
    if (this.ambient && Math.random() < dt * (LOW ? 8 : 18)) { const p = pl.pos.clone().add(V3((Math.random() - 0.5) * 60, Math.random() * 14, (Math.random() - 0.5) * 60)); this.particles.emit(p, 1, { color: this.ambient.color, speed: 0.4, up: this.ambient.rise, life: 4, size: 0.5, drag: 0.2 }); }
    if (this.cfg.features.includes('wind') && pl.pos.y > 140 && Math.random() < dt * 10) { const p = pl.pos.clone().add(V3((Math.random() - 0.5) * 30, Math.random() * 10 - 3, (Math.random() - 0.5) * 30)); this.particles.emit(p, 1, { color: 0xffffff, speed: 1, base: V3(-14, 0, -4), life: 1.2, size: 0.35, drag: 0 }); }
    // uniforms + shadow light follow
    this.sky.userData.u.uT.value = t; this.sky.position.copy(this.camera.position);
    if (this.liquid) this.liquid.userData.U.uT.value = t; if (this.terrain.material.userData.U) this.terrain.material.userData.U.uT.value = t; if (this.cityMat) this.cityMat.userData.U.uT.value = t;
    this.skyHole.userData.cam = this.camera.position; this.skyHole.userData.tick(t);
    this.sun.position.copy(pl.pos).addScaledVector(this.sunDir, 250); this.sun.target.position.copy(pl.pos);
    this.particles.update(dt); this.pops.update(dt);
    this.updateCamera(dt);
  },
  updateCamera(dt) {
    if (this.app.inVR) { this.app.rig.position.copy(this.player.pos); return; }
    const pl = this.player, cam = this.camera; const tgt = pl.pos.clone().add(V3(0, 1.7, 0));
    if (this.coaster && this.coaster.riding) { const C = this.coaster, T = C.curve.getTangentAt(Math.min(0.999, C.u)); const base = C.cart.position.clone().add(V3(0, 2.4, 0)).addScaledVector(T, -5.5); const look = C.cart.position.clone().addScaledVector(T, 12); const off = new THREE.Vector3(Math.sin(this.camYaw) * 3, this.camPitch * 3, Math.cos(this.camYaw) * 3); cam.position.lerp(base, 1 - Math.exp(-dt * 10)); cam.lookAt(look.add(off.multiplyScalar(-1))); return; }
    const cp = Math.cos(this.camPitch), off = V3(Math.sin(this.camYaw) * cp, Math.sin(this.camPitch), Math.cos(this.camYaw) * cp).multiplyScalar(this.camDist);
    const want = tgt.clone().add(off); const gh = this.groundAt(want.x, want.z, want.y + 50).h; if (want.y < gh + 0.6) want.y = gh + 0.6;
    cam.position.lerp(want, 1 - Math.exp(-dt * 14)); cam.lookAt(tgt);
  },
  fire(input) {
    const pl = this.player, W = WEAPONS[pl.weapon]; pl.cool = W.rate;
    let origin, dir;
    if (this.app.inVR && this.app.aimRay) { origin = this.app.aimRay.origin.clone(); dir = this.app.aimRay.dir.clone(); }
    else { origin = pl.muzzleWorld(); const cd = new THREE.Vector3(); this.camera.getWorldDirection(cd); const aimPt = this.camera.position.clone().addScaledVector(cd, 220);
      // aim assist toward whatever is closest to the crosshair
      let best = null, ba = IS_TOUCH ? 0.2 : 0.11; for (const t of this.targets()) { const tp = t.hitPos ? t.hitPos() : t.pos; const to = tp.clone().sub(this.camera.position); const dist = to.length(); if (dist > 180) continue; const ang = to.normalize().angleTo(cd); if (ang < ba) { ba = ang; best = tp; } }
      dir = (best || aimPt).clone().sub(origin).normalize(); }
    this.shots.fire(origin, dir, { weapon: pl.weapon }); Sound.shot(pl.weapon); pl.muzzle.material.opacity = 1;
    if (this.coaster && this.coaster.riding) pl.cool *= 0.8;
  },
  collect(it, i) {
    const pl = this.player;
    if (it.kind === 'health') { if (pl.hp >= pl.maxHp) return; pl.hp = Math.min(pl.maxHp, pl.hp + 35); this.pops.add('+35 life', it.pos.clone().add(V3(0, 2, 0)), '#7cff6b'); Sound.pickup(); }
    else if (it.kind === 'fuel') { if (pl.fuel >= pl.maxFuel) return; pl.fuel = pl.maxFuel; this.pops.add('Jet fuel!', it.pos.clone().add(V3(0, 2, 0)), '#4cc3ff'); Sound.pickup(); }
    else if (it.kind === 'glyph') { const g = S.glyphs[this.id] || (S.glyphs[this.id] = []); if (!g.includes(it.idx)) g.push(it.idx); S.save(); Sound.shard(); this.particles.sparkle(it.pos, 0xb08cff, 70); this.app.ui.glyph(this.cfg, it.idx, g.length); this.scene.remove(it.o); this.items.splice(i, 1); return; }
    else if (it.kind === 'mission') { this.m.got++; Sound.pickup(); this.particles.sparkle(it.pos, 0xffd23f, 60); this.pops.add(`${this.m.got} / ${this.m.n}`, it.pos.clone().add(V3(0, 2.5, 0)), '#ffd23f', 1.4); this.scene.remove(it.o); this.items.splice(i, 1); if (this.m.got >= this.m.n) this.complete(); else this.app.ui.toast(`${this.cfg.mission.item} ${this.m.got} of ${this.m.n}!`); return; }
    if (it.once) { this.scene.remove(it.o); this.items.splice(i, 1); return; }
    it.o.visible = false; it.hideT = 30; this.particles.sparkle(it.pos, 0xffffff, 20);
  },
  resize() { this.camera.aspect = innerWidth / innerHeight; this.camera.updateProjectionMatrix(); },
  dispose() { Sound.jet(0); this.shots && this.shots.clear(); disposeTree(this.scene); if (this.envRT) this.envRT.dispose(); this.scene.clear(); }
});
function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
