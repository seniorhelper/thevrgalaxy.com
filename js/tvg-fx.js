/* theVRgalaxy — effects: particles, planet shaders, black holes, holograms, jet flames, pop text. */
import { THREE, glowTex, glowSprite, textSprite, REDUCED, LOW } from './tvg-core.js';

/* ---------- pooled particles (one draw call) ---------- */
export class Particles {
  constructor(scene, cap = LOW ? 1600 : 3200) {
    this.cap = cap; this.i = 0; this.alive = 0;
    const g = new THREE.BufferGeometry();
    this.pos = new Float32Array(cap * 3); this.col = new Float32Array(cap * 3); this.size = new Float32Array(cap); this.alpha = new Float32Array(cap);
    this.vel = new Float32Array(cap * 3); this.life = new Float32Array(cap); this.max = new Float32Array(cap); this.grav = new Float32Array(cap); this.drag = new Float32Array(cap); this.s0 = new Float32Array(cap);
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3)); g.setAttribute('color', new THREE.BufferAttribute(this.col, 3)); g.setAttribute('size', new THREE.BufferAttribute(this.size, 1)); g.setAttribute('alpha', new THREE.BufferAttribute(this.alpha, 1));
    this.mat = new THREE.ShaderMaterial({
      uniforms: { map: { value: glowTex() }, scale: { value: 600 } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, vertexColors: true,
      vertexShader: 'attribute float size; attribute float alpha; varying vec3 vC; varying float vA; uniform float scale; void main(){ vC = color; vA = alpha; vec4 mv = modelViewMatrix*vec4(position,1.); gl_PointSize = size*scale/max(1.,-mv.z); gl_Position = projectionMatrix*mv; }',
      fragmentShader: 'uniform sampler2D map; varying vec3 vC; varying float vA; void main(){ vec4 t = texture2D(map, gl_PointCoord); gl_FragColor = vec4(vC*t.rgb, t.a*vA); if (gl_FragColor.a < .01) discard; }'
    });
    this.points = new THREE.Points(g, this.mat); this.points.frustumCulled = false; scene.add(this.points); this.geo = g;
  }
  emit(p, n, o = {}) {
    if (REDUCED) n = Math.ceil(n * 0.4);
    const c = new THREE.Color(o.color ?? 0x9fe6ff), c2 = o.color2 != null ? new THREE.Color(o.color2) : null;
    for (let k = 0; k < n; k++) {
      const i = this.i; this.i = (this.i + 1) % this.cap;
      const sp = (o.speed ?? 6) * (0.4 + Math.random() * 0.8);
      let dx = Math.random() * 2 - 1, dy = Math.random() * 2 - 1, dz = Math.random() * 2 - 1;
      if (o.dir) { dx = o.dir.x + dx * (o.spread ?? 0.3); dy = o.dir.y + dy * (o.spread ?? 0.3); dz = o.dir.z + dz * (o.spread ?? 0.3); }
      const l = Math.hypot(dx, dy, dz) || 1;
      this.pos[i * 3] = p.x + (o.jitter ? (Math.random() - .5) * o.jitter : 0); this.pos[i * 3 + 1] = p.y + (o.jitter ? (Math.random() - .5) * o.jitter : 0); this.pos[i * 3 + 2] = p.z + (o.jitter ? (Math.random() - .5) * o.jitter : 0);
      this.vel[i * 3] = dx / l * sp + (o.base ? o.base.x : 0); this.vel[i * 3 + 1] = dy / l * sp + (o.up || 0) + (o.base ? o.base.y : 0); this.vel[i * 3 + 2] = dz / l * sp + (o.base ? o.base.z : 0);
      const cc = c2 ? c.clone().lerp(c2, Math.random()) : c;
      this.col[i * 3] = cc.r; this.col[i * 3 + 1] = cc.g; this.col[i * 3 + 2] = cc.b;
      this.max[i] = this.life[i] = (o.life ?? 0.8) * (0.6 + Math.random() * 0.8); this.s0[i] = (o.size ?? 0.6) * (0.6 + Math.random() * 0.8);
      this.grav[i] = o.gravity ?? 0; this.drag[i] = o.drag ?? 1.5;
    }
  }
  update(dt) {
    for (let i = 0; i < this.cap; i++) {
      if (this.life[i] <= 0) { if (this.alpha[i] !== 0) { this.alpha[i] = 0; this.size[i] = 0; } continue; }
      this.life[i] -= dt; const k = Math.max(0, this.life[i] / this.max[i]), dr = Math.exp(-this.drag[i] * dt);
      this.vel[i * 3] *= dr; this.vel[i * 3 + 1] = this.vel[i * 3 + 1] * dr - this.grav[i] * dt; this.vel[i * 3 + 2] *= dr;
      this.pos[i * 3] += this.vel[i * 3] * dt; this.pos[i * 3 + 1] += this.vel[i * 3 + 1] * dt; this.pos[i * 3 + 2] += this.vel[i * 3 + 2] * dt;
      this.alpha[i] = Math.min(1, k * 1.6); this.size[i] = this.s0[i] * (0.4 + 0.6 * k);
    }
    this.geo.attributes.position.needsUpdate = true; this.geo.attributes.color.needsUpdate = true; this.geo.attributes.size.needsUpdate = true; this.geo.attributes.alpha.needsUpdate = true;
  }
  boom(p, color = 0xff8a3d, big = 1) {
    this.emit(p, 40 * big, { color, color2: 0xffffff, speed: 14 * big, life: 0.9, size: 1.3 * big, drag: 2.2 });
    this.emit(p, 26 * big, { color: 0x333344, speed: 5 * big, life: 1.6, size: 2.2 * big, drag: 1.2, up: 2 });
    this.emit(p, 30 * big, { color, speed: 20 * big, life: 0.5, size: 0.4, drag: 0.6, gravity: 14 });
  }
  sparkle(p, color = 0x9fe6ff, n = 30) { this.emit(p, n, { color, color2: 0xffffff, speed: 5, life: 1.4, size: 0.7, drag: 1.2, up: 2.5, jitter: 1.5 }); }
}

/* ---------- floating pop text (works in VR) ---------- */
export class PopText {
  constructor(scene) { this.scene = scene; this.list = []; }
  add(text, pos, color = '#ffffff', size = 1) {
    const s = textSprite(text, { size: 72, color, glow: color, scale: 0.9 * size }); s.position.copy(pos); s.renderOrder = 20; s.material.depthTest = false;
    this.scene.add(s); this.list.push({ s, t: 0, vy: 2.2 });
  }
  update(dt) {
    for (let i = this.list.length - 1; i >= 0; i--) { const p = this.list[i]; p.t += dt; p.s.position.y += p.vy * dt; p.vy *= 0.97; p.s.material.opacity = Math.max(0, 1 - Math.max(0, p.t - 0.6) / 0.6); if (p.t > 1.2) { this.scene.remove(p.s); p.s.material.map.dispose(); p.s.material.dispose(); this.list.splice(i, 1); } }
  }
}

/* ---------- procedural planets (hub + skies) ---------- */
const PLANET_VS = 'varying vec3 vN; varying vec3 vO; varying vec3 vW; varying vec3 vV; void main(){ vO = normalize(position); vN = normalize(normalMatrix*normal); vec4 w = modelMatrix*vec4(position,1.); vW = w.xyz; vec4 mv = viewMatrix*w; vV = normalize(-mv.xyz); gl_Position = projectionMatrix*mv; }';
const NOISE = `
  float h(vec3 p){ p = fract(p*0.3183099+.1); p *= 17.0; return fract(p.x*p.y*p.z*(p.x+p.y+p.z)); }
  float n3(vec3 x){ vec3 i=floor(x), f=fract(x); f=f*f*(3.-2.*f);
    return mix(mix(mix(h(i),h(i+vec3(1,0,0)),f.x),mix(h(i+vec3(0,1,0)),h(i+vec3(1,1,0)),f.x),f.y),mix(mix(h(i+vec3(0,0,1)),h(i+vec3(1,0,1)),f.x),mix(h(i+vec3(0,1,1)),h(i+vec3(1,1,1)),f.x),f.y),f.z); }
  float fbm(vec3 p){ float a=0., w=.5; for(int i=0;i<6;i++){ a+=w*n3(p); p*=2.02; w*=.5; } return a; }`;
export function planetMaterial(pc, lightDir) {
  const u = {
    c1: { value: new THREE.Color(pc.c1) }, c2: { value: new THREE.Color(pc.c2) }, c3: { value: new THREE.Color(pc.c3) },
    glow: { value: pc.glow || 0 }, bands: { value: pc.bands || 0 }, cracks: { value: pc.cracks || 0 }, lights: { value: pc.lights || 0 }, clouds: { value: pc.clouds || 0 },
    kind: { value: pc.type || 0 }, uT: { value: 0 }, L: { value: (lightDir || new THREE.Vector3(1, 0.3, 0.4)).clone().normalize() }, locked: { value: 0 }, seed: { value: (pc.type || 0) * 7.13 }
  };
  return new THREE.ShaderMaterial({
    uniforms: u, vertexShader: PLANET_VS,
    fragmentShader: `uniform vec3 c1,c2,c3,L; uniform float glow,bands,cracks,lights,clouds,kind,uT,locked,seed; varying vec3 vN; varying vec3 vO; varying vec3 vW; varying vec3 vV;
      ${NOISE}
      void main(){
        vec3 p = vO*2.2 + seed; float n = fbm(p + vec3(uT*.01,0.,0.));
        float lat = vO.y;
        float band = sin(lat*18. + n*6. + uT*.05)*.5+.5;
        float t = mix(n, band, bands);
        vec3 col = mix(c1, c2, smoothstep(.25,.75,t));
        col = mix(col, c3, smoothstep(.72,.95,fbm(p*2.3 - 5.))*.8);
        float cr = 0.;
        if (cracks > 0.) { float r = abs(fbm(p*3.1) - .5); cr = smoothstep(.035, .0, r) * cracks; }
        float sw = 0.;
        if (kind > 3.5 && kind < 4.5) { float a = atan(vO.z, vO.x); sw = smoothstep(.6,1.,sin(a*6. + lat*9. + uT*.6)) * .6; }
        vec3 nW = normalize(vN);
        float d = dot(normalize(vV), nW);
        float diff = max(dot(nW, normalize((viewMatrix*vec4(L,0.)).xyz)), 0.);
        vec3 lit = col*(.06 + 1.05*diff);
        float night = 1. - smoothstep(0., .25, diff);
        float city = 0.;
        if (lights > 0.) { vec3 q = floor(vO*90.); city = step(.93, h(q)) * night * lights * step(.35, fbm(p*1.7)); }
        float cl = 0.;
        if (clouds > 0.) { cl = smoothstep(.55,.8,fbm(p*1.6 + vec3(uT*.03,0.,uT*.02))) * clouds; lit = mix(lit, vec3(1.)*(.12+diff), cl*.85); }
        vec3 em = c3*cr*1.6 + c2*glow*.22*pow(n,2.) + vec3(1.,.85,.5)*city*1.4 + c3*sw;
        float rim = pow(1. - max(d,0.), 3.);
        vec3 outc = lit + em + c2*rim*.35;
        if (locked > .5) { float g = dot(outc, vec3(.33)); outc = mix(outc, vec3(g)*.35 + vec3(.02,.04,.08), .8); }
        gl_FragColor = vec4(outc, 1.);
      }`
  });
}
export function atmosphere(color, radius) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(radius * 1.16, 48, 32), new THREE.ShaderMaterial({
    uniforms: { c: { value: new THREE.Color(color) }, a: { value: 1 } }, side: THREE.BackSide, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: 'varying vec3 vN; varying vec3 vV; void main(){ vN = normalize(normalMatrix*normal); vec4 mv = modelViewMatrix*vec4(position,1.); vV = normalize(-mv.xyz); gl_Position = projectionMatrix*mv; }',
    fragmentShader: 'uniform vec3 c; uniform float a; varying vec3 vN; varying vec3 vV; void main(){ float f = pow(1. - abs(dot(vN, vV)), 1.2); float i = smoothstep(0., .6, 1. - f) * pow(f, 1.3) * 2.2; gl_FragColor = vec4(c, i*a); }'
  })); return m;
}
export function planetRing(color, r0, r1, style = 1) {
  const g = new THREE.RingGeometry(r0, r1, 160, 1);
  const m = new THREE.Mesh(g, new THREE.ShaderMaterial({
    uniforms: { c: { value: new THREE.Color(color) }, r0: { value: r0 }, r1: { value: r1 }, st: { value: style }, uT: { value: 0 } }, side: THREE.DoubleSide, transparent: true, depthWrite: false,
    vertexShader: 'varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }',
    fragmentShader: 'uniform vec3 c; uniform float r0,r1,st,uT; varying vec3 vP; float h(float x){ return fract(sin(x*91.3)*43758.5); } void main(){ float r = (length(vP.xy)-r0)/(r1-r0); float b = h(floor(r*60.)); float a = (.25 + .75*b) * smoothstep(0.,.08,r) * smoothstep(1.,.85,r); if (st > 1.5) { float ang = atan(vP.y, vP.x); a *= .6 + .4*sin(ang*24. + uT*.4); } gl_FragColor = vec4(c*(.7+.6*b), a*.75); }'
  })); m.rotation.x = -Math.PI / 2; return m;
}
/* a whole planet for the hub */
export function makePlanet(pc, radius) {
  const g = new THREE.Group();
  const mat = planetMaterial(pc); const body = new THREE.Mesh(new THREE.SphereGeometry(radius, 96, 64), mat); g.add(body);
  const atm = atmosphere(pc.atmo || pc.c2, radius); g.add(atm);
  if (pc.ring) { const r = planetRing(pc.ringColor || pc.c2, radius * 1.35, radius * (pc.ring > 1 ? 2.3 : 1.9), pc.ring); r.rotation.x = -Math.PI / 2 + 0.35; g.add(r); g.userData.ring = r; }
  g.userData.body = body; g.userData.mat = mat; g.userData.atm = atm; g.userData.radius = radius; return g;
}

/* ---------- black holes (some are portals) ---------- */
export function makeBlackHole(radius = 6, color = 0xff8a3d, color2 = 0x6a3dff) {
  const g = new THREE.Group();
  const core = new THREE.Mesh(new THREE.SphereGeometry(radius, 48, 32), new THREE.MeshBasicMaterial({ color: 0x000000 })); g.add(core);
  const disk = new THREE.Mesh(new THREE.RingGeometry(radius * 1.25, radius * 4.2, 180, 1), new THREE.ShaderMaterial({
    uniforms: { a: { value: new THREE.Color(color) }, b: { value: new THREE.Color(color2) }, uT: { value: 0 }, r0: { value: radius * 1.25 }, r1: { value: radius * 4.2 } }, side: THREE.DoubleSide, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: 'varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }',
    fragmentShader: `uniform vec3 a,b; uniform float uT,r0,r1; varying vec3 vP; ${NOISE}
      void main(){ float r = (length(vP.xy)-r0)/(r1-r0); float ang = atan(vP.y, vP.x); float sw = ang + (1.-r)*5. - uT*.9*(1.4-r);
        float n = fbm(vec3(cos(sw)*3., sin(sw)*3., r*6.)); float heat = pow(1.-r, 2.2);
        vec3 col = mix(b, a, heat) + vec3(1.)*pow(heat,6.)*1.5; float al = smoothstep(0.,.05,r) * smoothstep(1.,.3,r) * (.35 + .9*n);
        gl_FragColor = vec4(col*(.6+n), al); }`
  })); disk.rotation.x = -Math.PI / 2 + 0.25; g.add(disk);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(radius * 1.12, radius * 0.05, 12, 120), new THREE.MeshBasicMaterial({ color: 0xffe6c0, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending })); g.add(ring);
  const halo = glowSprite(new THREE.Color(color), radius * 9, 0.45); g.add(halo);
  g.userData = { disk, ring, halo, core, radius, portal: false };
  g.userData.tick = (t) => { disk.material.uniforms.uT.value = t; ring.lookAt(g.userData.cam || new THREE.Vector3(0, 0, 1e3)); halo.material.opacity = 0.38 + 0.08 * Math.sin(t * 0.7); };
  return g;
}

/* ---------- holograms: Orbi projects these ---------- */
export function holoMaterial(color = 0x4cc3ff) {
  return new THREE.ShaderMaterial({
    uniforms: { c: { value: new THREE.Color(color) }, uT: { value: 0 }, op: { value: 1 } }, transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending,
    vertexShader: 'varying vec3 vN; varying vec3 vV; varying float vY; void main(){ vN = normalize(normalMatrix*normal); vec4 w = modelMatrix*vec4(position,1.); vY = w.y; vec4 mv = viewMatrix*w; vV = normalize(-mv.xyz); gl_Position = projectionMatrix*mv; }',
    fragmentShader: 'uniform vec3 c; uniform float uT, op; varying vec3 vN; varying vec3 vV; varying float vY; void main(){ float f = pow(1. - abs(dot(vN, vV)), 2.); float scan = .55 + .45*sin(vY*40. - uT*2.); gl_FragColor = vec4(c*(1.+f), (.18 + .8*f) * scan * op); }'
  });
}
function heartShape() { const s = new THREE.Shape(); s.moveTo(0, -1); s.bezierCurveTo(-1.4, 0, -1.2, 1.1, 0, 0.5); s.bezierCurveTo(1.2, 1.1, 1.4, 0, 0, -1); return s; }
function starShape() { const s = new THREE.Shape(); for (let i = 0; i < 10; i++) { const r = i % 2 ? 0.45 : 1, a = i / 10 * Math.PI * 2 + Math.PI / 2; const x = Math.cos(a) * r, y = Math.sin(a) * r; i ? s.lineTo(x, y) : s.moveTo(x, y); } s.closePath(); return s; }
export const HOLO_KINDS = ['planet', 'heart', 'star', 'alien', 'galaxy', 'knot', 'ufo', 'crystal'];
export function makeHologram(kind, color = 0x4cc3ff) {
  const g = new THREE.Group(), mat = holoMaterial(color), wire = new THREE.MeshBasicMaterial({ color, wireframe: true, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false });
  const add = (geo, w = true) => { const m = new THREE.Mesh(geo, mat); g.add(m); if (w) { const ww = new THREE.Mesh(geo, wire); g.add(ww); } return m; };
  const ext = { depth: 0.3, bevelEnabled: true, bevelSize: 0.06, bevelThickness: 0.06, bevelSegments: 2 };
  switch (kind) {
    case 'planet': { add(new THREE.IcosahedronGeometry(0.7, 3)); const r = add(new THREE.TorusGeometry(1.1, 0.03, 8, 80), false); r.rotation.x = 1.2; break; }
    case 'heart': { const geo = new THREE.ExtrudeGeometry(heartShape(), ext); geo.center(); add(geo); break; }
    case 'star': { const geo = new THREE.ExtrudeGeometry(starShape(), ext); geo.center(); add(geo); break; }
    case 'alien': { add(new THREE.SphereGeometry(0.7, 24, 18)); for (const sx of [-1, 1]) { const e = add(new THREE.SphereGeometry(0.2, 12, 10), false); e.position.set(sx * 0.28, 0.1, 0.55); e.scale.set(1, 1.5, 0.6); const a = add(new THREE.CylinderGeometry(0.02, 0.02, 0.6), false); a.position.set(sx * 0.3, 0.9, 0); a.rotation.z = sx * -0.4; const t = add(new THREE.SphereGeometry(0.08, 10, 8), false); t.position.set(sx * 0.42, 1.18, 0); } break; }
    case 'galaxy': { const n = 900, pos = new Float32Array(n * 3); for (let i = 0; i < n; i++) { const arm = i % 3, r = Math.pow(Math.random(), 0.7) * 1.2, a = r * 4 + arm * 2.094 + (Math.random() - .5) * 0.5; pos[i * 3] = Math.cos(a) * r; pos[i * 3 + 1] = (Math.random() - .5) * 0.08; pos[i * 3 + 2] = Math.sin(a) * r; } const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.add(new THREE.Points(geo, new THREE.PointsMaterial({ color, size: 0.05, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false }))); g.rotation.x = 0.5; break; }
    case 'knot': add(new THREE.TorusKnotGeometry(0.55, 0.16, 120, 12)); break;
    case 'ufo': { const s = add(new THREE.SphereGeometry(0.9, 32, 12), true); s.scale.set(1, 0.22, 1); const d = add(new THREE.SphereGeometry(0.4, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2), false); d.position.y = 0.1; break; }
    case 'crystal': add(new THREE.OctahedronGeometry(0.8, 0)); break;
  }
  g.userData.mat = mat; g.userData.kind = kind; return g;
}

/* ---------- jet flames ---------- */
export function jetFlame(color = 0x4cc3ff) {
  const geo = new THREE.ConeGeometry(0.16, 1, 16, 1, true); geo.translate(0, -0.5, 0);
  const mat = new THREE.ShaderMaterial({
    uniforms: { c: { value: new THREE.Color(color) }, uT: { value: 0 }, p: { value: 0 } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    vertexShader: 'varying float vH; varying vec3 vN; varying vec3 vV; void main(){ vH = -position.y; vN = normalize(normalMatrix*normal); vec4 mv = modelViewMatrix*vec4(position,1.); vV = normalize(-mv.xyz); gl_Position = projectionMatrix*mv; }',
    fragmentShader: 'uniform vec3 c; uniform float uT, p; varying float vH; varying vec3 vN; varying vec3 vV; void main(){ float core = pow(abs(dot(vN, vV)), 1.5); float fl = .8 + .2*sin(vH*20. - uT*30.); vec3 col = mix(vec3(1.), c, smoothstep(0., .5, vH)); float a = (1. - vH) * core * fl * p; gl_FragColor = vec4(col*1.6, a); }'
  });
  const m = new THREE.Mesh(geo, mat); m.userData.mat = mat; return m;
}

/* ---------- ring gates (races) ---------- */
export function makeGateRing(color = 0xff8a3d, r = 5) {
  const g = new THREE.Group();
  const t = new THREE.Mesh(new THREE.TorusGeometry(r, 0.35, 16, 80), new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 1.6, roughness: 0.3 })); g.add(t);
  const inner = new THREE.Mesh(new THREE.CircleGeometry(r - 0.3, 48), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.12, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending })); g.add(inner);
  g.userData.torus = t; g.userData.r = r; return g;
}
/* collectible glyph / item holograms */
export function makeCollectible(kind, color) {
  const g = new THREE.Group(); let geo;
  if (kind === 'glyph') geo = new THREE.TorusKnotGeometry(0.5, 0.12, 80, 8, 2, 5);
  else if (kind === 'pearl') geo = new THREE.SphereGeometry(0.6, 24, 16);
  else if (kind === 'tablet') geo = new THREE.BoxGeometry(1.1, 1.5, 0.2);
  else if (kind === 'lantern') geo = new THREE.OctahedronGeometry(0.7, 1);
  else if (kind === 'shard') geo = new THREE.OctahedronGeometry(1.1, 0);
  else geo = new THREE.IcosahedronGeometry(0.6, 1);
  const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 1.4, metalness: 0.3, roughness: 0.25 })); m.castShadow = true; g.add(m);
  const halo = glowSprite(new THREE.Color(color), 4, 0.55); g.add(halo);
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.5, 40, 12, 1, true), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.12, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })); beam.position.y = 20; g.add(beam);
  g.userData.mesh = m; g.userData.halo = halo; return g;
}
