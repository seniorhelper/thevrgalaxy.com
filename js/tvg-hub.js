/* theVRgalaxy — the galaxy hub: 15 worlds floating around a black-hole core. */
import { THREE, S, LOW, REDUCED, ALL, byId, rng, glowSprite, textSprite, makeSky, Sound } from './tvg-core.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { makePlanet, makeBlackHole, Particles, planetRing } from './tvg-fx.js';

export class Hub {
  constructor(app) {
    this.app = app; this.scene = new THREE.Scene(); this.t = 0; this.planets = []; this.sel = null; this.fly = null;
    const cam = this.camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.5, 12000); cam.position.set(0, 160, 520);
    this.controls = new OrbitControls(cam, app.renderer.domElement);
    Object.assign(this.controls, { enableDamping: true, dampingFactor: 0.06, minDistance: 18, maxDistance: 1400, rotateSpeed: 0.6, zoomSpeed: 1.1, panSpeed: 0.8, autoRotate: !REDUCED, autoRotateSpeed: 0.25, screenSpacePanning: true });
    this.controls.minPolarAngle = 0; this.controls.maxPolarAngle = Math.PI; // full 360 in every direction
    this.controls.addEventListener('start', () => { this.controls.autoRotate = false; clearTimeout(this.arT); });
    this.controls.addEventListener('end', () => { clearTimeout(this.arT); this.arT = setTimeout(() => { if (!REDUCED) this.controls.autoRotate = true; }, 9000); });
    this.build();
  }
  build() {
    const sc = this.scene;
    // sky: the real panorama, with a procedural fallback while it loads (or if it fails)
    const fb = makeSky({ top: '#01020a', mid: '#050a20', bot: '#0a0420', neb: '#3a2a8a', stars: 1.4, sun: '#9fd3ff', sunDir: [0.5, 0.2, -0.8] }); sc.add(fb); this.fallbackSky = fb;
    new THREE.TextureLoader().load(LOW ? '/images/sky-2048.webp' : '/images/sky-4096.webp', (tx) => {
      tx.mapping = THREE.EquirectangularReflectionMapping; tx.colorSpace = THREE.SRGBColorSpace; sc.background = tx; sc.backgroundIntensity = 0.85; fb.visible = false;
    }, undefined, () => { });
    sc.add(new THREE.AmbientLight(0x6a7aa8, 0.35));
    const sun = new THREE.PointLight(0xffe0b0, 3.2, 0, 0); sun.position.set(0, 0, 0); sc.add(sun); // the core glows and lights every world
    const key = new THREE.DirectionalLight(0xbfd6ff, 0.6); key.position.set(300, 400, 200); sc.add(key);
    // galactic core black hole
    this.core = makeBlackHole(16, 0xffb070, 0x6a3dff); sc.add(this.core);
    this.coreLabel = textSprite('The Galactic Core', { size: 72, scale: 3, color: '#ffd6a0', glow: '#ff8a3d' }); this.coreLabel.position.set(0, -34, 0); sc.add(this.coreLabel);
    // two wandering black holes, pure scenery... mostly
    this.bh = [makeBlackHole(7, 0xff4fd8, 0x38f0ff), makeBlackHole(5, 0x7cffd4, 0x1d8cff)];
    this.bh[0].position.set(-620, 140, -420); this.bh[1].position.set(700, -180, 360); this.bh.forEach(b => sc.add(b));
    // galaxy dust: a spiral of colored points
    const r = rng(7), N = LOW ? 7000 : 16000, pos = new Float32Array(N * 3), col = new Float32Array(N * 3), c = new THREE.Color();
    for (let i = 0; i < N; i++) {
      const arm = i % 4, rad = 40 + Math.pow(r(), 0.8) * 900, a = rad * 0.006 + arm * Math.PI / 2 + (r() - 0.5) * 0.7;
      pos[i * 3] = Math.cos(a) * rad + (r() - 0.5) * 40; pos[i * 3 + 1] = (r() - 0.5) * (30 + 60 * (1 - rad / 940)); pos[i * 3 + 2] = Math.sin(a) * rad + (r() - 0.5) * 40;
      c.setHSL((0.55 + arm * 0.12 + r() * 0.1) % 1, 0.8, 0.55 + r() * 0.3); col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
    }
    const dg = new THREE.BufferGeometry(); dg.setAttribute('position', new THREE.BufferAttribute(pos, 3)); dg.setAttribute('color', new THREE.BufferAttribute(col, 3));
    this.dust = new THREE.Points(dg, new THREE.PointsMaterial({ size: 2.2, vertexColors: true, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true })); sc.add(this.dust);
    // big neon nebula clouds
    [['#ff4fd8', -300, 60, -200, 520], ['#38f0ff', 380, -40, 160, 600], ['#7cffd4', 60, 90, 520, 420], ['#ffb070', -420, -80, 380, 460], ['#b08cff', 200, 120, -560, 540]].forEach(n => { const s = glowSprite(new THREE.Color(n[0]), n[4], 0.16); s.position.set(n[1], n[2], n[3]); sc.add(s); });
    // asteroid belt (instanced)
    const rockGeo = new THREE.IcosahedronGeometry(1, 1); const rp = rockGeo.attributes.position; for (let i = 0; i < rp.count; i++) { const v = new THREE.Vector3().fromBufferAttribute(rp, i).multiplyScalar(0.75 + r() * 0.5); rp.setXYZ(i, v.x, v.y, v.z); } rockGeo.computeVertexNormals();
    const NB = LOW ? 700 : 1600; this.belt = new THREE.InstancedMesh(rockGeo, new THREE.MeshStandardMaterial({ color: 0x8a8076, roughness: 0.95, metalness: 0.05, flatShading: true }), NB);
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), s3 = new THREE.Vector3();
    for (let i = 0; i < NB; i++) { const a = r() * Math.PI * 2, rad = 330 + r() * 50; v.set(Math.cos(a) * rad, (r() - 0.5) * 14, Math.sin(a) * rad); e.set(r() * 6, r() * 6, r() * 6); q.setFromEuler(e); const sz = 0.6 + Math.pow(r(), 3) * 5; s3.set(sz, sz * (0.6 + r() * 0.6), sz); m4.compose(v, q, s3); this.belt.setMatrixAt(i, m4); }
    sc.add(this.belt);
    // the worlds
    const known = ALL.filter(w => w.kind !== 'hidden');
    known.forEach((w, i) => { const a = i * 0.93 + 0.4, rad = 90 + i * 22; this.addPlanet(w, new THREE.Vector3(Math.cos(a) * rad, Math.sin(i * 1.7) * 18, Math.sin(a) * rad)); });
    const hiddenPos = { 13: new THREE.Vector3(-260, 150, -120), 14: new THREE.Vector3(240, -140, 220), 15: new THREE.Vector3(0, 0, 0) };
    ALL.filter(w => w.kind === 'hidden').forEach(w => { if (S.found.includes(w.id) && w.id !== 15) this.addPlanet(w, hiddenPos[w.id]); });
    this.particles = new Particles(sc, 1200);
    this.corePortal = S.hiddenReady(15) || S.found.includes(15);
    if (this.corePortal) { this.core.userData.disk.material.uniforms.a.value.set(0xff2f6a); this.core.userData.disk.material.uniforms.b.value.set(0xffd23f); this.coreLabel.material.map.dispose(); sc.remove(this.coreLabel); this.coreLabel = textSprite('The Heart is open', { size: 72, scale: 3, color: '#ffd23f', glow: '#ff2f6a' }); this.coreLabel.position.set(0, -34, 0); sc.add(this.coreLabel); }
    this.raycaster = new THREE.Raycaster(); this.ndc = new THREE.Vector2();
  }
  addPlanet(w, pos) {
    const pc = w.planet, R = pc.size * 1.35, g = makePlanet(pc, R); g.position.copy(pos);
    const open = S.unlocked(w.id); g.userData.mat.uniforms.locked.value = open ? 0 : 1; g.userData.world = w; g.userData.orbitR = Math.hypot(pos.x, pos.z); g.userData.orbitA = Math.atan2(pos.z, pos.x); g.userData.orbitY = pos.y;
    g.userData.body.rotation.z = 0.3; this.scene.add(g);
    const label = textSprite(w.name, { size: 96, scale: 1.6 + R * 0.05, color: open ? '#ffffff' : '#9fb3cc', glow: pc.atmo }); label.position.set(0, R * 1.9 + 3, 0); g.add(label);
    const sub = textSprite(open ? (S.done[w.id] ? '✦ Harmony restored' : 'Tap to land') : `🔒 ${w.unlock} shard${w.unlock > 1 ? 's' : ''} to unlock`, { size: 56, scale: 1.3, color: open ? '#9fe6ff' : '#7189a8' }); sub.position.set(0, R * 1.9 - 1.5, 0); g.add(sub);
    // moons
    g.userData.moons = []; const mr = rng(w.id * 13); const nm = Math.floor(mr() * 3);
    for (let i = 0; i < nm; i++) { const mm = new THREE.Mesh(new THREE.SphereGeometry(R * (0.12 + mr() * 0.12), 32, 24), new THREE.MeshStandardMaterial({ color: new THREE.Color(pc.c3).lerp(new THREE.Color(0x888888), 0.5), roughness: 0.9 })); mm.userData.o = { r: R * (2.2 + i * 0.7), s: 0.3 + mr() * 0.4, a: mr() * 6, tilt: mr() - 0.5 }; g.add(mm); g.userData.moons.push(mm); }
    // selection ring
    const ring = new THREE.Mesh(new THREE.TorusGeometry(R * 1.55, 0.18, 8, 120), new THREE.MeshBasicMaterial({ color: new THREE.Color(pc.atmo), transparent: true, opacity: 0, blending: THREE.AdditiveBlending })); ring.rotation.x = Math.PI / 2; g.add(ring); g.userData.selRing = ring;
    this.planets.push(g);
  }
  pickAt(clientX, clientY) {
    this.ndc.set(clientX / innerWidth * 2 - 1, -(clientY / innerHeight) * 2 + 1); this.raycaster.setFromCamera(this.ndc, this.camera);
    const bodies = this.planets.map(p => p.userData.body); const hits = this.raycaster.intersectObjects(bodies, false);
    if (hits.length) { const p = this.planets.find(pl => pl.userData.body === hits[0].object); this.select(p); return true; }
    const coreHit = this.raycaster.intersectObject(this.core.userData.core, false); if (coreHit.length) { this.app.ui.coreCard(this.corePortal); return true; }
    // a generous screen-space pick for small planets
    let best = null, bd = 60; const v = new THREE.Vector3();
    for (const p of this.planets) { v.copy(p.position).project(this.camera); if (v.z > 1) continue; const sx = (v.x + 1) / 2 * innerWidth, sy = (1 - v.y) / 2 * innerHeight, d = Math.hypot(sx - clientX, sy - clientY); if (d < bd) { bd = d; best = p; } }
    if (best) { this.select(best); return true; } return false;
  }
  select(p) {
    Sound.ui(); this.sel = p; this.controls.autoRotate = false;
    const R = p.userData.radius; const dir = this.camera.position.clone().sub(p.position).normalize();
    this.fly = { from: this.controls.target.clone(), to: p.position.clone(), camFrom: this.camera.position.clone(), camTo: p.position.clone().add(dir.multiplyScalar(R * 6.5)).add(new THREE.Vector3(0, R * 1.5, 0)), t: 0, follow: p };
    this.app.ui.planetCard(p.userData.world);
  }
  deselect() { this.sel = null; this.fly = null; }
  warpTo(id, done) {
    const p = this.planets.find(pl => pl.userData.world.id === id); const target = p ? p.position.clone() : new THREE.Vector3();
    this.warp = { t: 0, from: this.camera.position.clone(), to: target, done };
  }
  update(dt) {
    this.t += dt; const t = this.t;
    this.core.userData.cam = this.camera.position; this.core.userData.tick(t); this.bh.forEach(b => { b.userData.cam = this.camera.position; b.userData.tick(t * 1.3); });
    this.dust.rotation.y += dt * 0.004; this.belt.rotation.y += dt * 0.01;
    for (const p of this.planets) {
      const u = p.userData, w = u.world; u.orbitA += dt * (0.012 / Math.max(0.6, u.orbitR / 180));
      if (w.id !== 15) { p.position.set(Math.cos(u.orbitA) * u.orbitR, u.orbitY + Math.sin(t * 0.2 + w.id) * 2, Math.sin(u.orbitA) * u.orbitR); }
      u.body.rotation.y += dt * (w.planet.spin || 0.1); u.mat.uniforms.uT.value = t; u.mat.uniforms.L.value.copy(p.position).multiplyScalar(-1).normalize();
      if (u.ring) u.ring.material.uniforms.uT.value = t;
      for (const m of u.moons) { const o = m.userData.o; o.a += dt * o.s; m.position.set(Math.cos(o.a) * o.r, Math.sin(o.a) * o.r * o.tilt, Math.sin(o.a) * o.r); }
      u.selRing.material.opacity += ((this.sel === p ? 0.8 : 0) - u.selRing.material.opacity) * Math.min(1, dt * 5); u.selRing.rotation.z += dt * 0.4;
    }
    if (this.fly) { const f = this.fly; f.t = Math.min(1, f.t + dt * 0.8); const e = 1 - Math.pow(1 - f.t, 3); const to = f.follow.position; this.controls.target.lerpVectors(f.from, to, e); if (f.t < 1) this.camera.position.lerpVectors(f.camFrom, f.camTo.clone().add(to.clone().sub(f.to)), e); else { this.controls.target.copy(to); } }
    if (this.warp) {
      const w = this.warp; w.t += dt; const k = Math.min(1, w.t / 1.6), e = k * k * k;
      this.camera.position.lerpVectors(w.from, w.to, e * 0.96); this.camera.fov = 55 + e * 55; this.camera.updateProjectionMatrix(); this.controls.target.copy(w.to);
      if (!REDUCED) this.particles.emit(this.camera.position.clone().add(new THREE.Vector3((Math.random() - 0.5) * 20, (Math.random() - 0.5) * 20, (Math.random() - 0.5) * 20)), 12, { color: 0x9fe6ff, color2: 0xff4fd8, speed: 40, life: 0.4, size: 2, dir: w.to.clone().sub(w.from).normalize().multiplyScalar(-1), spread: 0.1 });
      if (k >= 1 && !w.fired) { w.fired = true; w.done && w.done(); }
    }
    this.particles.update(dt);
    this.controls.update();
  }
  resize() { this.camera.aspect = innerWidth / innerHeight; this.camera.updateProjectionMatrix(); }
  dispose() { this.controls.dispose(); }
}
