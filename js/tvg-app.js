/* theVRgalaxy — app: renderer, bloom, input, WebXR, main loop, hub <-> world switching. */
import { THREE, S, LOW, IS_TOUCH, REDUCED, Sound, byId, bySlug, ALL, textSprite, canvasTex, roundRect } from './tvg-core.js';
import { VRButton } from 'three/addons/webxr/VRButton.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { Hub } from './tvg-hub.js';
import { World } from './tvg-world.js';
import { UI } from './tvg-ui.js';
import { Orbi } from './tvg-orbi.js';
import { WORLDS } from './tvg-data.js';

/* ---------- input: keyboard, mouse drag, wheel, touch joystick, pinch, buttons ---------- */
class Input {
  constructor(app) {
    this.app = app; this.keys = new Set(); this.edge = new Set(); this.lookDX = 0; this.lookDY = 0; this.zoom = 1; this.fireHeld = false; this.joy = { x: 0, y: 0, id: null }; this.btn = new Set(); this.pointers = new Map(); this.pinch = 0;
    const cv = app.renderer.domElement;
    addEventListener('keydown', e => { if (e.target && /INPUT|TEXTAREA/.test(e.target.tagName)) return; const k = e.key.toLowerCase(); if (!this.keys.has(k)) this.edge.add(k); this.keys.add(k); if (this.app.world && [' ', 'arrowup', 'arrowdown'].includes(k)) e.preventDefault(); Sound.init(); });
    addEventListener('keyup', e => this.keys.delete(e.key.toLowerCase()));
    addEventListener('blur', () => { this.keys.clear(); this.fireHeld = false; this.btn.clear(); });
    cv.addEventListener('contextmenu', e => e.preventDefault());
    cv.addEventListener('pointerdown', e => {
      Sound.init(); this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, b: e.button, t: performance.now() });
      if (this.app.world) { cv.setPointerCapture(e.pointerId); if (e.pointerType === 'mouse' && e.button === 0) this.fireHeld = true; }
      if (this.pointers.size === 2) { const [a, b] = [...this.pointers.values()]; this.pinch = Math.hypot(a.x - b.x, a.y - b.y); }
    });
    cv.addEventListener('pointermove', e => {
      this.app.pointer.x = e.clientX; this.app.pointer.y = e.clientY; const p = this.pointers.get(e.pointerId); if (!p) return;
      if (this.pointers.size === 2) { const [a, b] = [...this.pointers.values()]; p.x = e.clientX; p.y = e.clientY; const d = Math.hypot(a.x - b.x, a.y - b.y); if (this.pinch) this.zoom *= this.pinch / Math.max(1, d); this.pinch = d; return; }
      if (this.app.world) { this.lookDX += e.clientX - p.x; this.lookDY += e.clientY - p.y; }
      p.x = e.clientX; p.y = e.clientY;
    });
    const up = e => { const p = this.pointers.get(e.pointerId); this.pointers.delete(e.pointerId); if (this.pointers.size < 2) this.pinch = 0; if (e.pointerType === 'mouse' && e.button === 0) this.fireHeld = false;
      if (p && !this.app.world && Math.hypot(e.clientX - p.sx, e.clientY - p.sy) < 8 && performance.now() - p.t < 450 && this.app.hub) { if (!this.app.hub.pickAt(e.clientX, e.clientY)) { this.app.ui.hideCard(); this.app.hub.deselect(); } } };
    cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
    cv.addEventListener('wheel', e => { if (this.app.world) { e.preventDefault(); this.zoom *= Math.exp(e.deltaY * 0.0012); } }, { passive: false });
    // touch joystick
    const joy = document.getElementById('joy'), knob = document.getElementById('joy-k');
    const setJ = (e) => { const r = joy.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2, R = r.width / 2; let x = (e.clientX - cx) / R, y = (e.clientY - cy) / R; const l = Math.hypot(x, y); if (l > 1) { x /= l; y /= l; } this.joy.x = x; this.joy.y = y; knob.style.transform = `translate(${x * R * 0.55}px,${y * R * 0.55}px)`; };
    joy.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); Sound.init(); joy.setPointerCapture(e.pointerId); this.joy.id = e.pointerId; setJ(e); });
    joy.addEventListener('pointermove', e => { if (e.pointerId === this.joy.id) setJ(e); });
    const jend = e => { if (e.pointerId !== this.joy.id) return; this.joy = { x: 0, y: 0, id: null }; knob.style.transform = ''; };
    joy.addEventListener('pointerup', jend); joy.addEventListener('pointercancel', jend);
    document.querySelectorAll('.tbtn').forEach(b => { const k = b.dataset.k; b.addEventListener('pointerdown', e => { e.preventDefault(); Sound.init(); b.setPointerCapture(e.pointerId); if (!this.btn.has(k)) this.edge.add('btn:' + k); this.btn.add(k); b.classList.add('on'); }); const off = () => { this.btn.delete(k); b.classList.remove('on'); }; b.addEventListener('pointerup', off); b.addEventListener('pointercancel', off); });
  }
  read() {
    const k = this.keys, e = this.edge, b = this.btn, xr = this.app.xrInput;
    let mx = (k.has('d') || k.has('arrowright') ? 1 : 0) - (k.has('a') || k.has('arrowleft') ? 1 : 0), mz = (k.has('w') || k.has('arrowup') ? 1 : 0) - (k.has('s') || k.has('arrowdown') ? 1 : 0);
    if (this.joy.id !== null) { mx = this.joy.x; mz = -this.joy.y; }
    const out = {
      mx, mz, sprint: k.has('shift') && !S.has('dash'),
      jump: k.has(' ') || b.has('jump'), jumpPressed: e.has(' ') || e.has('btn:jump'),
      firing: this.fireHeld || k.has('f') || b.has('fire'), dash: e.has('shift') || e.has('btn:dash'),
      talkPressed: e.has('e') || e.has('btn:talk'), swapPressed: e.has('q') || e.has('btn:swap'), holsterPressed: e.has('h') || e.has('btn:holster'),
      lookDX: this.lookDX, lookDY: this.lookDY, zoom: this.zoom
    };
    if (xr) { out.mx = xr.mx; out.mz = xr.mz; out.jump = out.jump || xr.jet; out.jumpPressed = out.jumpPressed || xr.jumpPressed; out.firing = out.firing || xr.fire; out.lookDX = 0; out.lookDY = 0; out.talkPressed = out.talkPressed || xr.talk; out.swapPressed = out.swapPressed || xr.swap; }
    this.edge.clear(); this.lookDX = 0; this.lookDY = 0; this.zoom = 1; return out;
  }
}

/* ---------- the app ---------- */
export class App {
  constructor() {
    this.pointer = { x: innerWidth / 2, y: innerHeight / 2 }; this.clock = new THREE.Clock(); this.t = 0; this.world = null; this.inVR = false; this.hudT = 0;
    const R = this.renderer = new THREE.WebGLRenderer({ antialias: !LOW, powerPreference: 'high-performance' });
    R.setPixelRatio(Math.min(devicePixelRatio, LOW ? 1.5 : 2)); R.setSize(innerWidth, innerHeight); R.outputColorSpace = THREE.SRGBColorSpace; R.toneMapping = THREE.ACESFilmicToneMapping; R.toneMappingExposure = 1.05;
    R.shadowMap.enabled = true; R.shadowMap.type = THREE.PCFSoftShadowMap; R.xr.enabled = true;
    document.getElementById('stage').appendChild(R.domElement); R.domElement.setAttribute('aria-label', '3D galaxy'); R.domElement.tabIndex = 0;
    this.ui = new UI(this); this.input = new Input(this); this.orbi = new Orbi(this);
    this.hub = new Hub(this); this.useScene(this.hub.scene, this.hub.camera); this.ui.mode('hub'); this.orbi.layout(); this.orbi.arrive();
    this.setupVR();
    addEventListener('resize', () => this.resize());
    R.setAnimationLoop(() => this.loop());
    // deep link: /?world=slug
    const q = new URLSearchParams(location.search).get('world'); if (q) { const w = bySlug(q.toLowerCase()); if (w && (S.unlocked(w.id) || S.found.includes(w.id))) setTimeout(() => this.enterWorld(w.id), 600); else if (w && w.kind !== 'hidden') setTimeout(() => this.ui.toast(`${w.name} is still locked. Collect ${w.unlock} Harmony Shard${w.unlock > 1 ? 's' : ''} to wake it up.`, 6000), 1200); }
    addEventListener('popstate', () => { if (this.world && !new URLSearchParams(location.search).get('world')) this.backToHub(true); });
    setTimeout(() => this.ui.heroAway(), 14000);
  }
  useScene(scene, camera) {
    if (this.composer) this.composer.dispose();
    const c = this.composer = new EffectComposer(this.renderer); c.setPixelRatio(Math.min(devicePixelRatio, LOW ? 1 : 1.5)); c.setSize(innerWidth, innerHeight);
    c.addPass(new RenderPass(scene, camera));
    this.bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), LOW ? 0.7 : 0.95, 0.6, 0.22); c.addPass(this.bloom); c.addPass(new OutputPass());
    this.activeScene = scene; this.activeCam = camera;
  }
  resize() { this.renderer.setSize(innerWidth, innerHeight); if (this.composer) this.composer.setSize(innerWidth, innerHeight); this.hub && this.hub.resize(); this.world && this.world.resize(); this.orbi.layout(); }
  nextUnlockName() { const w = WORLDS.find(x => x.kind === 'lock' && x.unlock === S.shards.length); return w ? w.name : null; }
  /* ---------- scene switching ---------- */
  async enterWorld(id, via) {
    if (this.loadingWorld) return; const cfg = byId(id); if (!cfg) return;
    if (!via && !S.unlocked(id) && !S.found.includes(id)) { this.ui.toast('That world is still locked.'); return; }
    if (!S.seenIntro && !via) { S.seenIntro = true; S.save(); this.ui.intro(() => this.enterWorld(id, via)); return; }
    this.loadingWorld = true; this.ui.hideCard(); Sound.init();
    const go = async () => {
      this.ui.loading(true, cfg.name, 0.02, 'Warming up the engines');
      try {
        const w = new World(this, cfg); await w.build((p, txt) => this.ui.loading(true, cfg.name, p, txt));
        if (this.world) { this.detachRig(); this.world.dispose(); }
        this.world = w; this.hub.controls.enabled = false; this.useScene(w.scene, w.camera); w.updateCamera(0.016); w.camera.position.copy(w.player.pos).add(new THREE.Vector3(6, 5, 8));
        this.orbi.reset(); this.orbi.setMode('companion', w.scene); this.orbi.arrive(); this.ui.mode('world'); this.ui.worldIntro(cfg); Sound.music(cfg.music);
        if (this.inVR) this.attachRig();
        const url = '/?world=' + cfg.slug; if (location.pathname + location.search !== url) history.pushState({ w: cfg.slug }, '', url);
        document.title = `${cfg.name} · theVRgalaxy`;
      } catch (err) { console.error(err); this.ui.toast('That world hit a glitch while loading. Try again?', 6000); this.showError(err); }
      this.ui.loading(false); this.loadingWorld = false;
    };
    if (!this.world && !REDUCED) { this.hub.warpTo(id, go); } else go();
  }
  backToHub(fromPop) {
    if (!this.world) return; this.detachRig(); this.world.dispose(); this.world = null; Sound.jet(0);
    this.hub.dispose(); this.hub = new Hub(this); this.useScene(this.hub.scene, this.hub.camera);
    this.orbi.reset(); this.orbi.setMode('overlay'); this.orbi.layout(); this.orbi.arrive(); this.ui.mode('hub'); Sound.music({ root: 146.8, scale: [0, 2, 4, 7, 9] });
    if (this.inVR) this.attachRig();
    if (!fromPop) history.pushState({}, '', '/'); document.title = 'theVRgalaxy · Free VR Game in Your Browser';
  }
  /* ---------- WebXR ---------- */
  setupVR() {
    const R = this.renderer; const btn = VRButton.createButton(R); btn.classList.add('vr-btn'); btn.removeAttribute('style'); document.getElementById('tb-vr').appendChild(btn);
    const fix = () => { btn.removeAttribute('style'); }; new MutationObserver(fix).observe(btn, { attributes: true, attributeFilter: ['style'] });
    this.rig = new THREE.Group(); this.ctrl = [0, 1].map(i => { const c = R.xr.getController(i); const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(0, 0, -1)]), new THREE.LineBasicMaterial({ color: 0x4cc3ff, transparent: true, opacity: 0.7 })); line.scale.z = 30; c.add(line); c.userData = { fire: false, hand: null }; c.addEventListener('connected', e => { c.userData.hand = e.data.handedness; c.userData.src = e.data; }); c.addEventListener('selectstart', () => { c.userData.fire = true; this.vrSelect(c); }); c.addEventListener('selectend', () => { c.userData.fire = false; }); c.addEventListener('squeezestart', () => { c.userData.jet = true; }); c.addEventListener('squeezeend', () => { c.userData.jet = false; }); this.rig.add(c); return c; });
    this.vrHud = null; this.snapCool = 0;
    R.xr.addEventListener('sessionstart', () => { this.inVR = true; Sound.init(); this.attachRig(); document.body.classList.add('in-vr'); });
    R.xr.addEventListener('sessionend', () => { this.inVR = false; this.detachRig(); document.body.classList.remove('in-vr'); this.xrInput = null; });
  }
  attachRig() {
    const scene = this.world ? this.world.scene : this.hub.scene, cam = this.world ? this.world.camera : this.hub.camera;
    this.rig.position.copy(this.world ? this.world.player.pos : new THREE.Vector3(0, 60, 300)); this.rig.rotation.set(0, 0, 0); scene.add(this.rig); this.rig.add(cam); cam.position.set(0, this.world ? 1.6 : 0, 0); cam.rotation.set(0, 0, 0);
    if (!this.vrHud) { this.vrHud = textSprite(' ', { size: 48 }); } cam.add(this.vrHud); this.vrHud.position.set(0, -0.32, -1.1); this.vrHud.scale.set(0.5, 0.06, 1);
    if (!this.world) this.hub.controls.enabled = false;
  }
  detachRig() { if (this.rig.parent) this.rig.parent.remove(this.rig); const cam = this.activeCam; if (cam && cam.parent === this.rig) { this.rig.remove(cam); if (this.world) this.world.scene.add(cam); } if (this.vrHud && this.vrHud.parent) this.vrHud.parent.remove(this.vrHud); if (!this.world && this.hub) this.hub.controls.enabled = true; }
  vrSelect(c) {
    if (this.world) return; // in a world, trigger = fire (handled in read)
    const ray = new THREE.Raycaster(); const m = c.matrixWorld; ray.ray.origin.setFromMatrixPosition(m); ray.ray.direction.set(0, 0, -1).transformDirection(m);
    const hits = ray.intersectObjects(this.hub.planets.map(p => p.userData.body), false);
    if (hits.length) { const p = this.hub.planets.find(pl => pl.userData.body === hits[0].object); const w = p.userData.world; if (this.hub.sel === p && S.unlocked(w.id)) this.enterWorld(w.id); else this.hub.select(p); }
  }
  readXR(dt) {
    const s = this.renderer.xr.getSession(); if (!s) { this.xrInput = null; return; }
    const o = { mx: 0, mz: 0, jet: false, fire: false, jumpPressed: false, talk: false, swap: false };
    let turn = 0;
    for (const src of s.inputSources) { const gp = src.gamepad; if (!gp) continue; const ax = gp.axes, x = ax.length >= 4 ? ax[2] : ax[0] || 0, y = ax.length >= 4 ? ax[3] : ax[1] || 0;
      if (src.handedness === 'left') { o.mx = Math.abs(x) > 0.15 ? x : 0; o.mz = Math.abs(y) > 0.15 ? -y : 0; if (gp.buttons[4] && gp.buttons[4].pressed) o.talk = true; if (gp.buttons[5] && gp.buttons[5].pressed) o.swap = true; }
      else { if (Math.abs(x) > 0.6) turn = Math.sign(x); if (gp.buttons[4] && gp.buttons[4].pressed) { if (!this._aWas) o.jumpPressed = true; this._aWas = true; } else this._aWas = false; } }
    for (const c of this.ctrl) { if (c.userData.fire) o.fire = true; if (c.userData.jet) o.jet = true; }
    // edge-trigger talk/swap
    o.talk = o.talk && !this._tWas; this._tWas = o.talk || (this._tWas && o.talk); o.swap = o.swap && !this._sWas; this._sWas = o.swap;
    // snap turn
    this.snapCool -= dt; if (turn && this.snapCool <= 0) { this.rig.rotation.y -= turn * Math.PI / 6; this.snapCool = 0.35; }
    // movement relative to head
    if (this.world) { const cam = this.renderer.xr.getCamera(); const e = new THREE.Euler().setFromQuaternion(cam.getWorldQuaternion(new THREE.Quaternion()), 'YXZ'); this.world.camYaw = e.y; }
    const rc = this.ctrl.find(c => c.userData.hand === 'right') || this.ctrl[0]; const m = rc.matrixWorld; this.aimRay = { origin: new THREE.Vector3().setFromMatrixPosition(m), dir: new THREE.Vector3(0, 0, -1).transformDirection(m) };
    this.xrInput = o;
  }
  updateVrHud() {
    if (!this.vrHud || !this.world) return; const p = this.world.player, txt = `LIFE ${Math.ceil(p.hp)}   JET ${Math.round(p.fuel / p.maxFuel * 100)}%   ${this.world.statusText()}`;
    if (txt === this._vrTxt) return; this._vrTxt = txt; const W = 1400, H = 90;
    const tex = canvasTex(W, H, g => { g.fillStyle = 'rgba(3,9,22,.7)'; roundRect(g, 2, 2, W - 4, H - 4, 40); g.fill(); g.font = '700 46px system-ui, sans-serif'; g.fillStyle = '#e8f1ff'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(txt, W / 2, H / 2); });
    if (this.vrHud.material.map) this.vrHud.material.map.dispose(); this.vrHud.material.map = tex; this.vrHud.material.depthTest = false; this.vrHud.renderOrder = 40; this.vrHud.material.needsUpdate = true; this.vrHud.scale.set(0.9, 0.9 * H / W, 1);
  }
  /* ---------- loop ---------- */
  loop() {
    const dt = Math.min(0.05, this.clock.getDelta()); this.t += dt; const R = this.renderer;
    if (this.inVR) this.readXR(dt);
    if (this.world) {
      const inp = this.input.read(); this.world.update(dt, inp);
      this.hudT -= dt; if (this.hudT <= 0) { this.hudT = 0.08; this.ui.hud(this.world); if (this.inVR) this.updateVrHud(); }
      const w = this.world, cam = this.inVR ? R.xr.getCamera() : w.camera, pl = w.player;
      const right = new THREE.Vector3(1, 0, 0).applyQuaternion(cam.getWorldQuaternion(new THREE.Quaternion())); right.y = 0; right.normalize();
      const park = pl.pos.clone().addScaledVector(right, this.inVR ? 0.9 : 1.6).add(new THREE.Vector3(0, this.inVR ? 1.9 : 2.8, 0));
      this.orbi.update(dt, this.t, this.pointer, { park, scale: this.inVR ? 0.16 : 0.34, look: cam.getWorldPosition(new THREE.Vector3()) });
      if (this.inVR) R.render(w.scene, w.camera); else this.composer.render();
    } else {
      this.input.read(); this.hub.update(dt);
      this.orbi.update(dt, this.t, this.pointer);
      if (this.inVR) R.render(this.hub.scene, this.hub.camera); else { this.composer.render(); this.orbi.renderOverlay(R); }
    }
  }
  showError(err) { const b = document.getElementById('err'); if (!b) return; b.hidden = false; b.textContent = 'Something glitched: ' + (err && err.message ? err.message : String(err)) + ' (a screenshot of this helps fix it)'; }
}

export function start() {
  const ok = (() => { try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch (e) { return false; } })();
  if (!ok) { document.getElementById('nogl').hidden = false; return; }
  const app = new App(); window.TVG = app;
  addEventListener('error', e => app.showError(e.error || e.message));
  addEventListener('unhandledrejection', e => app.showError(e.reason));
}
