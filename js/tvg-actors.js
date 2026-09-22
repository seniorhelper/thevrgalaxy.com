/* theVRgalaxy — actors: player, aliens, drones, bosses, projectiles. */
import { THREE, S, spawnModel, glowSprite, Sound, clamp, lerpAngle, faceTexture, REDUCED } from './tvg-core.js';
import { jetFlame } from './tvg-fx.js';
import { WEAPONS, CHARACTERS } from './tvg-data.js';

const V = () => new THREE.Vector3();

/* ================= player ================= */
export class Player {
  constructor(world) {
    this.w = world; this.pos = V(); this.vel = V(); this.yaw = 0; this.onGround = true; this.hp = 100; this.maxHp = 100 + (S.has('heal') ? 25 : 0);
    this.maxFuel = 100 * (S.has('fuel') ? 1.5 : 1) * (S.has('fuel2') ? 1.5 : 1); this.fuel = this.maxFuel; this.jumps = 0; this.jetting = false;
    this.weapon = S.weapons[S.weapons.length - 1] || 'blaster'; this.cool = 0; this.holstered = false; this.hurtT = 9; this.dashCool = 0; this.safe = V(); this.riding = false; this.dead = false;
    this.group = new THREE.Group(); world.scene.add(this.group);
  }
  async load() {
    const ch = CHARACTERS.find(c => c.id === S.char) || CHARACTERS[0];
    const m = await spawnModel(ch.model, { height: ch.kind === 'hero' ? 1.9 : 1.8 });
    if (m) {
      this.model = m; this.group.add(m); m.rotation.y = 0;
      m.traverse(o => { if (o.isMesh) { o.frustumCulled = false; o.castShadow = true; if (/gun|pistol|rifle|weapon|sword|knife/i.test(o.name) && ch.kind === 'human') o.visible = false; } });
      if (ch.face && S.face) this.addFace(m);
      m.userData.play && m.userData.play(['Idle_Gun', 'Idle', 'Idle_Neutral']);
    } else { const b = new THREE.Mesh(new THREE.CapsuleGeometry(0.4, 1, 6, 12), new THREE.MeshStandardMaterial({ color: 0x38f0ff })); b.position.y = 0.9; b.castShadow = true; this.group.add(b); }
    // jetpack (two tanks + flames)
    const pack = new THREE.Group(); const tm = new THREE.MeshStandardMaterial({ color: 0xc2ccd9, metalness: 0.8, roughness: 0.25 }), am = new THREE.MeshStandardMaterial({ color: 0x2ea8ff, emissive: 0x2ea8ff, emissiveIntensity: 0.8 });
    for (const sx of [-1, 1]) { const t = new THREE.Mesh(new THREE.CapsuleGeometry(0.11, 0.42, 4, 12), tm); t.position.set(sx * 0.16, 1.18, -0.28); t.castShadow = true; pack.add(t); const band = new THREE.Mesh(new THREE.TorusGeometry(0.115, 0.018, 6, 20), am); band.rotation.x = Math.PI / 2; band.position.set(sx * 0.16, 1.28, -0.28); pack.add(band); const f = jetFlame(0x4cc3ff); f.position.set(sx * 0.16, 0.9, -0.28); f.scale.set(1, 0.001, 1); pack.add(f); (this.flames || (this.flames = [])).push(f); }
    const fl = glowSprite(0x4cc3ff, 1.2, 0); fl.position.set(0, 0.6, -0.3); pack.add(fl); this.jetGlow = fl; this.group.add(pack); this.pack = pack;
    this.jetLight = new THREE.PointLight(0x4cc3ff, 0, 8, 2); this.jetLight.position.set(0, 0.6, -0.4); this.group.add(this.jetLight);
    // blaster glow at hand
    this.muzzle = glowSprite(WEAPONS[this.weapon].color, 0.6, 0.0); this.muzzle.position.set(0.35, 1.25, 0.45); this.group.add(this.muzzle);
  }
  addFace(m) {
    const tex = faceTexture(S.face); let headBone = null; m.traverse(o => { if (!headBone && o.isBone && /head/i.test(o.name)) headBone = o; });
    const inner = m.userData.inner; const s = inner.scale.x || 1;
    const hr = 0.125, g = new THREE.Group();
    const skin = new THREE.Mesh(new THREE.SphereGeometry(hr, 20, 16), new THREE.MeshStandardMaterial({ color: 0xe0ac7e, roughness: 0.7 })); g.add(skin);
    const geo = new THREE.SphereGeometry(hr * 1.08, 24, 18, Math.PI / 2 - 1.05, 2.1, Math.PI * 0.12, Math.PI * 0.72);
    const cap = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: tex, transparent: true, alphaTest: 0.25 })); cap.position.set(0, -hr * 0.02, hr * 0.02); cap.scale.set(1, 1.04, 1); g.add(cap);
    const hair = new THREE.Mesh(new THREE.SphereGeometry(hr * 1.06, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.42), new THREE.MeshStandardMaterial({ color: 0x3a2412, roughness: 0.8 })); hair.position.y = hr * 0.1; g.add(hair);
    m.traverse(o => { if (o.isMesh && /head/i.test(o.name) && !/hair/i.test(o.name)) o.visible = false; });
    if (headBone) { g.scale.setScalar(1 / s); g.position.set(0, hr * 0.55 / s, 0.02 / s); headBone.add(g); } else { g.position.set(0, 1.62, 0.02); m.add(g); }
  }
  setWeapon(k) { this.weapon = k; this.muzzle.material.color.set(WEAPONS[k].color); }
  hurt(d, from) {
    if (this.dead || this.riding) return; const dmg = d * (S.has('shield') ? 0.6 : 1); this.hp -= dmg; this.hurtT = 0; Sound.hurt(); this.w.app.ui.vignette(Math.min(1, dmg / 20));
    if (from) { const k = this.pos.clone().sub(from).setY(0).normalize().multiplyScalar(6); this.vel.add(k); this.vel.y = Math.max(this.vel.y, 4); }
    if (this.model && this.model.userData.play) this.model.userData.play('HitReact', 0.1, true);
    if (this.hp <= 0) this.die();
  }
  die() { this.dead = true; this.hp = 0; this.w.app.ui.toast('Knocked out! Beaming you back to the landing pad.'); this.w.particles.sparkle(this.pos.clone().setY(this.pos.y + 1), 0xff4f79, 60); setTimeout(() => this.respawn(), 1600); }
  respawn(p) { this.pos.copy(p || this.w.spawn); this.vel.set(0, 0, 0); this.hp = this.maxHp; this.fuel = this.maxFuel; this.dead = false; }
  update(dt, input, camYaw) {
    const w = this.w; if (this.dead) { this.group.visible = false; return; } this.group.visible = !w.app.inVR;
    if (this.riding) return;
    // move relative to camera
    let mx = input.mx, mz = input.mz; const len = Math.hypot(mx, mz); if (len > 1) { mx /= len; mz /= len; }
    const sin = Math.sin(camYaw), cos = Math.cos(camYaw);
    const dx = cos * mx - sin * mz, dz = -sin * mx - cos * mz; // world move from camera-relative input
    const inLiquid = w.liquidAt(this.pos);
    const speed = (input.sprint ? 14 : 10.5) * (inLiquid === 'water' || inLiquid === 'ocean' ? 0.55 : 1) * (this.onGround ? 1 : 0.95);
    const targetVX = dx * speed, targetVZ = dz * speed;
    const acc = this.onGround ? 12 : 4;
    this.vel.x += (targetVX - this.vel.x) * Math.min(1, acc * dt); this.vel.z += (targetVZ - this.vel.z) * Math.min(1, acc * dt);
    if (len > 0.1) this.yaw = lerpAngle(this.yaw, Math.atan2(dx, dz), 1 - Math.exp(-dt * 12));
    if (input.firing && !this.holstered) this.yaw = lerpAngle(this.yaw, camYaw + Math.PI, 1 - Math.exp(-dt * 18));
    // dash
    this.dashCool -= dt; if (input.dash && S.has('dash') && this.dashCool <= 0) { this.dashCool = 1.2; const f = new THREE.Vector3(Math.sin(this.yaw), 0, Math.cos(this.yaw)).multiplyScalar(34); this.vel.x = f.x; this.vel.z = f.z; this.vel.y = Math.max(this.vel.y, 3); Sound.burst(0.3, 1400, 0.25); w.particles.emit(this.pos.clone().setY(this.pos.y + 1), 30, { color: 0x9fe6ff, speed: 3, life: 0.5, size: 0.6 }); }
    // jump / double jump / jetpack
    if (input.jumpPressed) { if (this.onGround) { this.vel.y = 13; this.onGround = false; this.jumps = 1; Sound.tone(300, 0.12, 'sine', 0.1, 200); this.model && this.model.userData.play && this.model.userData.play(['Jump', 'Jump_Idle', 'Run'], 0.1); } else if (S.has('djump') && this.jumps === 1) { this.vel.y = 13; this.jumps = 2; w.particles.emit(this.pos, 20, { color: 0xb08cff, speed: 4, life: 0.5 }); } }
    this.jetting = input.jump && !this.onGround && this.fuel > 0 && (this.vel.y < 2 || this.jumps >= 1) && !(input.jumpPressed);
    if (this.jetting) { this.vel.y = Math.min(this.vel.y + 42 * dt, 15); this.fuel = Math.max(0, this.fuel - 24 * dt); this.vel.x *= 1 + dt * 0.4; this.vel.z *= 1 + dt * 0.4; }
    else if (this.onGround) this.fuel = Math.min(this.maxFuel, this.fuel + 28 * dt);
    // gravity + integrate
    this.vel.y -= 30 * dt; this.pos.addScaledVector(this.vel, dt);
    // ground
    const g = w.groundAt(this.pos.x, this.pos.z, this.pos.y);
    if (this.pos.y <= g.h) { this.pos.y = g.h; if (this.vel.y < -22) this.hurt(Math.min(25, (-this.vel.y - 22) * 1.5)); if (g.bounce) { this.vel.y = g.bounce; this.onGround = false; Sound.tone(200, 0.3, 'sine', 0.2, 500); w.particles.emit(this.pos, 25, { color: 0x8dff4a, speed: 6, up: 5, life: 0.6, gravity: 12 }); } else { this.vel.y = 0; if (!this.onGround) { this.model && this.model.userData.play && this.model.userData.play(['Jump_Land', 'Idle'], 0.08, true); } this.onGround = true; this.jumps = 0; } if (!g.liquid) this.safe.copy(this.pos); }
    else this.onGround = false;
    // liquids
    if (inLiquid === 'lava') { this.hurt(28 * dt * 3); this.vel.y = Math.max(this.vel.y, 9); }
    if ((inLiquid === 'void' || inLiquid === 'cloud') && this.pos.y < w.waterLevel - 6) { this.respawn(this.safe.clone().add(new THREE.Vector3(0, 3, 0))); this.hurt(8); w.app.ui.toast(inLiquid === 'cloud' ? 'The clouds tossed you back up!' : 'The void spat you back out.'); }
    if ((inLiquid === 'water' || inLiquid === 'ocean' || inLiquid === 'oil' || inLiquid === 'mirror') && this.pos.y < w.waterLevel - 0.9) { this.pos.y = w.waterLevel - 0.9; this.vel.y = Math.max(this.vel.y, 0); this.onGround = true; this.jumps = 0; }
    // boundary: soft push back
    const r = Math.hypot(this.pos.x, this.pos.z), lim = 575; if (r > lim) { this.pos.x *= lim / r; this.pos.z *= lim / r; if (!this.edgeWarn) { this.edgeWarn = true; w.app.ui.toast('That\u2019s the edge of the world. The horizon goes on forever, but your oxygen doesn\u2019t.'); setTimeout(() => this.edgeWarn = false, 8000); } }
    // regen
    this.hurtT += dt; if (this.hurtT > 5 && this.hp < this.maxHp) this.hp = Math.min(this.maxHp, this.hp + 4 * dt);
    // anims
    const hs = Math.hypot(this.vel.x, this.vel.z), P = this.model && this.model.userData.play;
    if (P && this.onGround) { if (hs > 1.5) P(input.firing ? ['Run_Gun_Shoot', 'Run_Gun', 'Run'] : (this.holstered ? ['Run'] : ['Run_Gun', 'Run']), 0.2); else P(this.holstered ? ['Idle', 'Idle_Neutral'] : ['Idle_Gun', 'Idle', 'Idle_Neutral'], 0.25); }
    else if (P && !this.onGround && this.jetting) P(['Jump_Idle', 'Jump', 'Idle'], 0.2);
    if (this.model && this.model.userData.mixer) this.model.userData.mixer.update(dt);
    this.group.position.copy(this.pos); this.group.rotation.y = this.yaw;
    // jet fx
    const jp = this.jetting ? 1 : 0; this.flames.forEach(f => { f.scale.y += ((jp ? 1.1 + Math.random() * 0.3 : 0.001) - f.scale.y) * Math.min(1, dt * 14); f.userData.mat.uniforms.p.value = jp; f.userData.mat.uniforms.uT.value = w.t; });
    this.jetGlow.material.opacity += ((jp ? 0.9 : 0) - this.jetGlow.material.opacity) * Math.min(1, dt * 10); this.jetLight.intensity = this.jetGlow.material.opacity * 30;
    if (jp) { const back = new THREE.Vector3(-Math.sin(this.yaw) * 0.3, 0.75, -Math.cos(this.yaw) * 0.3).add(this.pos); w.particles.emit(back, LOW_FX() ? 2 : 4, { color: 0x4cc3ff, color2: 0xffffff, speed: 3, life: 0.45, size: 0.55, dir: new THREE.Vector3(0, -1, 0), spread: 0.25, base: new THREE.Vector3(0, -8, 0) }); }
    Sound.jet(jp);
    this.muzzle.material.opacity *= Math.exp(-dt * 14); this.muzzle.visible = !this.holstered;
    this.cool -= dt;
  }
  muzzleWorld() { return this.muzzle.getWorldPosition(new THREE.Vector3()); }
}
const LOW_FX = () => REDUCED;

/* ================= aliens (friendly or jammed) ================= */
export class Alien {
  constructor(world, model, home, jammed, opts = {}) {
    this.w = world; this.model = model; this.home = home.clone(); this.pos = home.clone(); this.jammed = jammed; this.tune = 0; this.target = home.clone(); this.t = Math.random() * 10; this.cool = 0; this.flyer = !!opts.flyer; this.big = opts.scale || 1;
    this.radius = 1.1 * this.big; this.name = opts.name || 'friend'; this.wave = 0;
    this.group = new THREE.Group(); this.group.add(model); world.scene.add(this.group); model.scale.multiplyScalar(this.big);
    this.aura = glowSprite(0xff2f4a, 3.2 * this.big, jammed ? 0.55 : 0); this.aura.position.y = 1 * this.big; this.group.add(this.aura);
    this.play(jammed ? ['Idle', 'Flying_Idle'] : ['Idle', 'Flying_Idle']);
  }
  play(n, f, once) { const P = this.model.userData.play; return P ? P(n, f, once) : null; }
  hitBy(p) {
    if (!this.jammed) return false; this.tune += p.tune; Sound.hit(); this.play(['HitRecieve', 'HitReact'], 0.08, true);
    this.w.particles.emit(p.mesh.position, 10, { color: 0x9fe6ff, speed: 4, life: 0.4 });
    if (this.tune >= 100) this.free(); return true;
  }
  free() {
    this.jammed = false; this.tune = 100; this.aura.material.color.set(0x7cffd4); this.aura.material.opacity = 0.7; setTimeout(() => { this.aura.material.opacity = 0; }, 1500);
    this.w.particles.sparkle(this.pos.clone().setY(this.pos.y + 1.5), 0x7cffd4, 50); Sound.freed();
    this.w.pops.add('Freed! +1 friend', this.pos.clone().setY(this.pos.y + 3), '#7cffd4', 1.1);
    S.friends++; S.freedTotal++; S.save(); this.w.onFreed(this);
    this.play(['Dance', 'Yes', 'Wave'], 0.2, false); this.danceT = 3;
  }
  update(dt) {
    const w = this.w, pl = w.player, d = this.pos.distanceTo(pl.pos); this.t += dt; this.cool -= dt;
    const far = d > 160; if (far) { this.group.visible = d < 260; return; } this.group.visible = true;
    let speed = 0;
    if (this.danceT > 0) { this.danceT -= dt; if (this.danceT <= 0) this.play(['Idle', 'Flying_Idle']); }
    else if (this.jammed && d < 26 && !pl.dead && !(this.boss && pl.holstered)) { this.target.copy(pl.pos); speed = 5.5; if (d < 2.2 + this.radius && this.cool <= 0) { this.cool = 1.6; pl.hurt(7, this.pos); this.play(['Bite_Front', 'Headbutt', 'Punch'], 0.05, true); } }
    else if (!this.jammed && d < 9 && !pl.dead) { this.target.copy(pl.pos); speed = d > 4 ? 4 : 0; }
    else { if (this.pos.distanceTo(this.target) < 2 || Math.random() < dt * 0.1) { const a = Math.random() * 6.283, r = 6 + Math.random() * 18; this.target.set(this.home.x + Math.cos(a) * r, 0, this.home.z + Math.sin(a) * r); } speed = 2.2; }
    const to = this.target.clone().sub(this.pos).setY(0); const dl = to.length();
    if (dl > 0.3 && speed > 0) { to.normalize(); const nx = this.pos.x + to.x * speed * dt, nz = this.pos.z + to.z * speed * dt; if (w.liquidAt(new THREE.Vector3(nx, w.hf.at(nx, nz), nz)) !== 'lava' || this.flyer) { this.pos.x = nx; this.pos.z = nz; } this.group.rotation.y = lerpAngle(this.group.rotation.y, Math.atan2(to.x, to.z), 1 - Math.exp(-dt * 6)); if (!this.danceT) this.play(this.flyer ? ['Fast_Flying', 'Flying_Idle'] : ['Walk', 'Run', 'Idle'], 0.25); }
    else if (!this.danceT && speed === 0) { if (!this.jammed && d < 6) { this.group.rotation.y = lerpAngle(this.group.rotation.y, Math.atan2(pl.pos.x - this.pos.x, pl.pos.z - this.pos.z), 1 - Math.exp(-dt * 5)); } this.play(this.flyer ? ['Flying_Idle'] : ['Idle'], 0.3); }
    const gy = w.hf.at(this.pos.x, this.pos.z); this.pos.y = this.flyer ? Math.max(gy, w.waterLevel) + 2.5 + Math.sin(this.t * 1.5) * 0.5 : Math.max(gy, w.solidWaterLevel());
    this.group.position.copy(this.pos);
    if (this.jammed) { this.aura.material.opacity = 0.35 + 0.2 * Math.sin(this.t * 3); if (Math.random() < dt * 3) w.particles.emit(this.pos.clone().setY(this.pos.y + 1 * this.big), 3, { color: 0xff2f4a, speed: 2, life: 0.4, size: 0.35, jitter: 1.4 * this.big }); }
    if (this.model.userData.mixer) this.model.userData.mixer.update(dt);
  }
}

/* ================= static drones ================= */
export class Drone {
  constructor(world, model, home, opts = {}) {
    this.w = world; this.model = model; this.home = home.clone(); this.pos = home.clone(); this.pos.y += 10; this.hp = opts.hp || 30; this.maxHp = this.hp; this.t = Math.random() * 10; this.cool = 1 + Math.random() * 2; this.alive = true;
    this.walker = !!opts.walker; this.boss = !!opts.boss; this.radius = opts.radius || 1.3; this.scale = opts.scale || 1; this.slow = 0; this.strafe = Math.random() < 0.5 ? 1 : -1;
    this.group = new THREE.Group(); this.group.add(model); model.scale.multiplyScalar(this.scale); world.scene.add(this.group);
    model.traverse(o => { if (o.isMesh && o.material && o.material.emissive) { o.material = o.material.clone(); o.material.emissive.set(0xff2f4a); o.material.emissiveIntensity = 0.35; } });
    this.eye = glowSprite(0xff2f4a, 2.2 * this.scale, 0.8); this.eye.position.y = (this.walker ? 1.4 : 0.6) * this.scale; this.group.add(this.eye);
    this.model.userData.play && this.model.userData.play(this.walker ? ['Idle', 'Walk'] : ['Flying_Idle', 'Idle']);
  }
  hitBy(p) {
    if (!this.alive) return false; this.hp -= p.dmg; if (p.weapon === 'slime') this.slow = 3; Sound.hit();
    this.w.particles.emit(p.mesh.position, 8, { color: 0xffb070, speed: 6, life: 0.3, size: 0.4 });
    this.model.userData.play && this.model.userData.play(['HitReact', 'HitRecieve'], 0.05, true);
    if (this.hp <= 0) this.kill(); return true;
  }
  kill() {
    this.alive = false; Sound.pop(); this.w.particles.boom(this.pos.clone().setY(this.pos.y + 0.6 * this.scale), 0xff8a3d, this.boss ? 4 : 1);
    this.w.pops.add(this.boss ? 'DRONE MOTHER DOWN!' : 'Pop!', this.pos.clone().setY(this.pos.y + 2 * this.scale), '#ffd23f', this.boss ? 2.2 : 0.9);
    this.w.scene.remove(this.group); this.w.onDroneDown(this);
  }
  update(dt) {
    if (!this.alive) return; const w = this.w, pl = w.player, d = this.pos.distanceTo(pl.pos); this.t += dt; this.slow -= dt;
    if (d > 200 && !this.boss) { this.group.visible = false; return; } this.group.visible = true;
    const sp = (this.boss ? 5 : 7) * (this.slow > 0 ? 0.35 : 1);
    let goal;
    if (d < (this.boss ? 140 : 55) && !pl.dead) {
      const to = pl.pos.clone().sub(this.pos).setY(0).normalize(); const side = new THREE.Vector3(-to.z, 0, to.x).multiplyScalar(this.strafe);
      const want = this.boss ? 30 : 16; goal = pl.pos.clone().addScaledVector(to, -want).addScaledVector(side, 8);
      this.cool -= dt; if (this.cool <= 0) { this.cool = this.boss ? 0.9 : 1.8 + Math.random() * 1.4; this.fire(); }
    } else { goal = this.home.clone().add(new THREE.Vector3(Math.cos(this.t * 0.3) * 15, 0, Math.sin(this.t * 0.3) * 15)); }
    const gh = w.groundAt(goal.x, goal.z, 999).h;
    goal.y = this.walker ? gh : Math.max(gh, w.waterLevel) + (this.boss ? 26 : 7 + Math.sin(this.t) * 2);
    const mv = goal.sub(this.pos); const L = mv.length(); if (L > 0.1) this.pos.addScaledVector(mv.normalize(), Math.min(L, sp * dt));
    if (this.walker) this.pos.y = w.groundAt(this.pos.x, this.pos.z, 999).h;
    this.group.position.copy(this.pos); this.group.rotation.y = lerpAngle(this.group.rotation.y, Math.atan2(pl.pos.x - this.pos.x, pl.pos.z - this.pos.z), 1 - Math.exp(-dt * 4));
    if (this.walker && this.model.userData.play) this.model.userData.play(L > 0.5 ? ['Walk', 'Run'] : ['Idle'], 0.3);
    this.eye.material.opacity = 0.6 + 0.2 * Math.sin(this.t * 2);
    if (this.model.userData.mixer) this.model.userData.mixer.update(dt);
  }
  fire() {
    const w = this.w, from = this.pos.clone().setY(this.pos.y + (this.walker ? 1.4 : 0.5) * this.scale), aim = w.player.pos.clone().setY(w.player.pos.y + 1);
    const n = this.boss ? 5 : 1;
    for (let i = 0; i < n; i++) { const dir = aim.clone().sub(from).normalize(); if (n > 1) dir.applyAxisAngle(new THREE.Vector3(0, 1, 0), (i - 2) * 0.12); w.shots.fire(from, dir, { enemy: true, speed: this.boss ? 26 : 22, dmg: this.boss ? 9 : 7, color: 0xff2f4a, size: this.boss ? 0.9 : 0.5 }); }
    Sound.tone(this.boss ? 160 : 260, 0.15, 'square', 0.05, -80);
    this.model.userData.play && this.model.userData.play(['Shoot', 'Punch', 'Weapon', 'Headbutt'], 0.05, true);
  }
}

/* ================= projectiles ================= */
export class Shots {
  constructor(world) { this.w = world; this.list = []; this.geo = new THREE.SphereGeometry(1, 12, 8); this.ringGeo = new THREE.TorusGeometry(1, 0.18, 8, 32); }
  fire(from, dir, o) {
    const W = o.weapon ? WEAPONS[o.weapon] : null, color = o.color ?? (W ? W.color : 0xffffff), size = o.size ?? (W ? W.size : 0.3);
    const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false });
    const mesh = new THREE.Mesh(o.weapon === 'ring' ? this.ringGeo : this.geo, mat); mesh.scale.setScalar(size); mesh.position.copy(from);
    const glow = glowSprite(color, size * 5, 0.7); mesh.add(glow); glow.scale.setScalar(5);
    this.w.scene.add(mesh);
    const speed = o.speed ?? (W ? W.speed : 60), vel = dir.clone().multiplyScalar(speed); if (W && W.arc) vel.y += 8;
    this.list.push({ mesh, vel, life: o.life ?? 2.2, enemy: !!o.enemy, weapon: o.weapon, dmg: o.dmg ?? (W ? W.dmg : 10), tune: W ? W.tune : 0, pierce: W && W.pierce, hit: new Set(), grav: W && W.arc ? 18 : 0, splash: W && W.splash, pull: W && W.pull, age: 0 });
  }
  update(dt) {
    const w = this.w;
    for (let i = this.list.length - 1; i >= 0; i--) {
      const p = this.list[i]; p.age += dt; p.life -= dt; p.vel.y -= p.grav * dt; p.mesh.position.addScaledVector(p.vel, dt);
      if (p.weapon === 'ring') { p.mesh.lookAt(p.mesh.position.clone().add(p.vel)); p.mesh.rotateZ(p.age * 12); }
      if (p.weapon === 'gravity') { for (const d of w.drones) if (d.alive && d.pos.distanceTo(p.mesh.position) < p.pull) d.pos.lerp(p.mesh.position, dt * 2.5); if (p.age > 1.1) { this.explode(p, 12); this.kill(i); continue; } }
      let dead = p.life <= 0; const pos = p.mesh.position;
      if (!dead && pos.y < w.groundAt(pos.x, pos.z, pos.y).h) { dead = true; if (p.splash) this.explode(p, p.splash); else w.particles.emit(pos, 6, { color: p.mesh.material.color, speed: 3, life: 0.3, size: 0.4 }); }
      if (!dead && p.enemy) { const pl = w.player; if (!pl.dead && pos.distanceTo(pl.pos.clone().setY(pl.pos.y + 1)) < 1.1) { pl.hurt(p.dmg, pos); dead = true; } }
      else if (!dead) {
        for (const t of w.targets()) { if (p.hit.has(t)) continue; const tp = t.hitPos ? t.hitPos() : t.pos; if (tp.distanceTo(pos) < (t.radius || 1.2) + p.mesh.scale.x) { p.hit.add(t); const used = t.hitBy(p); if (used && p.splash) { this.explode(p, p.splash); dead = true; break; } if (used && !p.pierce) { dead = true; break; } } }
      }
      if (dead) this.kill(i);
    }
  }
  explode(p, r) { const w = this.w, pos = p.mesh.position; w.particles.boom(pos, p.mesh.material.color.getHex(), r > 8 ? 1.4 : 0.8); for (const t of w.targets()) { const tp = t.hitPos ? t.hitPos() : t.pos; if (!p.hit.has(t) && tp.distanceTo(pos) < r) { p.hit.add(t); t.hitBy(p); } } }
  kill(i) { const p = this.list[i]; this.w.scene.remove(p.mesh); p.mesh.material.dispose(); p.mesh.children.forEach(c => c.material && c.material.dispose()); this.list.splice(i, 1); }
  clear() { while (this.list.length) this.kill(this.list.length - 1); }
}
