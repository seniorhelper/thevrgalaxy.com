/* theVRgalaxy — Orbi, the galaxy guide. A friendly battle-station bot who rides a saucer.
   Two modes: 'overlay' (screen corner, drawn in its own pass) and 'companion' (lives in the 3D world, works in VR). */
import { THREE, S, REDUCED, IS_TOUCH, canvasTex, glowTex, glowSprite, textSprite, byId, ALL, roundRect } from './tvg-core.js';
import { makeHologram, HOLO_KINDS } from './tvg-fx.js';
import { WEAPONS, ABILITIES, RIDDLES, WORLDS } from './tvg-data.js';

export const NAME = 'Orbi';
const Y = new THREE.Vector3(0, 1, 0);

/* ================= 3D build ================= */
function tex(c) { const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; }
function cnv(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
function hullTextures() {
  const c = cnv(1024, 512), g = c.getContext('2d'), e = cnv(1024, 512), ge = e.getContext('2d'); let x, y;
  g.fillStyle = '#8b96a6'; g.fillRect(0, 0, 1024, 512); ge.fillStyle = '#000'; ge.fillRect(0, 0, 1024, 512);
  for (let i = 0; i < 1600; i++) { x = Math.random() * 1024 | 0; y = Math.random() * 512 | 0; const v = 112 + Math.random() * 70 | 0; g.globalAlpha = 0.55; g.fillStyle = `rgb(${v - 8},${v},${v + 14})`; g.fillRect(x, y, 8 + Math.random() * 42 | 0, 4 + Math.random() * 18 | 0); }
  g.globalAlpha = 1; g.strokeStyle = 'rgba(36,44,58,.6)'; g.lineWidth = 1.5;
  for (y = 0; y <= 512; y += 32) { g.beginPath(); g.moveTo(0, y); g.lineTo(1024, y); g.stroke(); }
  for (x = 0; x <= 1024; x += 32) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 512); g.stroke(); }
  g.fillStyle = '#252c3a'; g.fillRect(0, 249, 1024, 14);
  for (let i = 0; i < 320; i++) { x = Math.random() * 1024; y = 40 + Math.random() * 432; if (Math.abs(y - 256) < 12) continue; ge.fillStyle = Math.random() > 0.85 ? '#ffd59a' : '#7fd4ff'; ge.fillRect(x, y, 2, 2); g.fillStyle = '#d6ebff'; g.fillRect(x, y, 2, 2); }
  for (x = 0; x < 1024; x += 16) { ge.fillStyle = '#5cc8ff'; ge.fillRect(x, 254, 7, 3); }
  return { map: tex(c), glow: tex(e), bump: new THREE.CanvasTexture(c) };
}
function vtex(stops, rings) { const c = cnv(4, 256), g = c.getContext('2d'), gr = g.createLinearGradient(0, 0, 0, 256); stops.forEach(s => gr.addColorStop(s[0], s[1])); g.fillStyle = gr; g.fillRect(0, 0, 4, 256); if (rings) { g.fillStyle = rings; for (let y = 36; y < 226; y += 26) g.fillRect(0, y, 4, 2); } return tex(c); }
function cap(r, ang, mat) { return new THREE.Mesh(new THREE.SphereGeometry(r, 64, 14, 0, Math.PI * 2, 0, ang), mat); }
function onSurface(o, dir, depth) { dir = dir.clone().normalize(); o.position.copy(dir).multiplyScalar(depth); o.lookAt(dir.multiplyScalar(5)); }

export function buildOrbi() {
  const H = hullTextures();
  const hullMat = new THREE.MeshStandardMaterial({ map: H.map, bumpMap: H.bump, bumpScale: 0.6, emissiveMap: H.glow, emissive: 0xffffff, emissiveIntensity: 1.2, metalness: 0.45, roughness: 0.42 });
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x1b2230, metalness: 0.7, roughness: 0.35 });
  const glowMat = new THREE.MeshBasicMaterial({ color: 0x4cc3ff });
  const tipMat = new THREE.MeshBasicMaterial({ color: 0x9fe6ff });
  const bot = new THREE.Group(), body = new THREE.Group(); bot.add(body);
  const hull = new THREE.Mesh(new THREE.SphereGeometry(1, 96, 64), hullMat); hull.castShadow = true; body.add(hull);
  const trench = new THREE.Mesh(new THREE.TorusGeometry(1, 0.03, 12, 160), darkMat); trench.rotation.x = Math.PI / 2; body.add(trench);
  [0.052, -0.052].forEach(y => { const m = new THREE.Mesh(new THREE.TorusGeometry(Math.sqrt(1 - y * y) + 0.004, 0.007, 8, 160), glowMat); m.rotation.x = Math.PI / 2; m.position.y = y; body.add(m); });
  // trench bridges + surface turrets (greebles)
  const gre = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), darkMat, 90); const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), s = new THREE.Vector3();
  const eyeDir = new THREE.Vector3(0, 0.3, 1).normalize();
  let k = 0;
  for (let i = 0; i < 24; i++) { const a = i / 24 * Math.PI * 2; p.set(Math.cos(a) * 1.0, 0, Math.sin(a) * 1.0); q.setFromUnitVectors(new THREE.Vector3(0, 0, 1), p.clone().normalize()); s.set(0.05, 0.13, 0.04); m4.compose(p, q, s); gre.setMatrixAt(k++, m4); }
  while (k < 90) { const d = new THREE.Vector3(Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random() * 2 - 1).normalize(); if (d.angleTo(eyeDir) < 0.6 || Math.abs(d.y) < 0.12 || d.y < -0.8 || (d.x > 0.2 && d.y > 0.8)) continue; p.copy(d).multiplyScalar(1.0); q.setFromUnitVectors(Y, d); const sz = 0.03 + Math.random() * 0.05; s.set(sz, sz * (1 + Math.random() * 2), sz); m4.compose(p, q, s); gre.setMatrixAt(k++, m4); }
  gre.castShadow = true; body.add(gre);
  // the big friendly eye (dish)
  const dish = cap(1.004, 0.4, new THREE.MeshStandardMaterial({ map: vtex([[0, '#141c2a'], [0.7, '#283246'], [0.9, '#56627a'], [1, '#aeb9c9']], 'rgba(120,140,172,.4)'), metalness: 0.5, roughness: 0.4 }));
  dish.quaternion.setFromUnitVectors(Y, eyeDir); body.add(dish);
  const socket = new THREE.Mesh(new THREE.TorusGeometry(0.385, 0.022, 10, 64), darkMat); onSurface(socket, eyeDir, 0.93); body.add(socket);
  const iris = cap(1.009, 0.2, new THREE.MeshBasicMaterial({ map: vtex([[0, '#01060c'], [0.28, '#04131f'], [0.34, '#c6f2ff'], [0.46, '#4cc3ff'], [0.8, '#1463d8'], [1, '#081c42']]) })); body.add(iris);
  const hl = cap(1.013, 0.032, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85 })); body.add(hl);
  const smileG = new THREE.Group(); const smile = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.021, 10, 40, Math.PI * 0.7), glowMat); smile.rotation.z = -Math.PI / 2 - Math.PI * 0.35; smileG.add(smile); onSurface(smileG, new THREE.Vector3(0, -0.12, 1), 1.008); body.add(smileG);
  const antDir = new THREE.Vector3(0.4, 1, 0.15).normalize();
  const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.024, 0.42, 12), darkMat); rod.quaternion.setFromUnitVectors(Y, antDir); rod.position.copy(antDir).multiplyScalar(1.19); body.add(rod);
  const tip = new THREE.Mesh(new THREE.SphereGeometry(0.045, 16, 12), tipMat); tip.position.copy(antDir).multiplyScalar(1.42); body.add(tip);
  const tipGlow = glowSprite(0x4cc3ff, 0.3, 0.8); tipGlow.position.copy(tip.position); body.add(tipGlow);
  [-1, 1].forEach(sx => { const pod = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, 0.1, 32), darkMat); pod.rotation.z = Math.PI / 2; pod.position.set(sx, 0.05, 0); body.add(pod); const ring = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.013, 8, 40), glowMat); ring.rotation.y = Math.PI / 2; ring.position.set(sx * 1.056, 0.05, 0); body.add(ring); });
  const nozzle = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.22, 0.14, 32), darkMat); nozzle.position.y = -1.01; body.add(nozzle);
  const nozRing = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.018, 8, 40), glowMat); nozRing.rotation.x = Math.PI / 2; nozRing.position.y = -1.08; body.add(nozRing);
  const thrust = glowSprite(0x2ea8ff, 0.75, 0.9); thrust.position.y = -1.28; bot.add(thrust);
  const haloTilt = new THREE.Group(); haloTilt.rotation.set(1.25, 0, 0.3); bot.add(haloTilt); const halo = new THREE.Group(); haloTilt.add(halo);
  halo.add(new THREE.Mesh(new THREE.TorusGeometry(1.42, 0.01, 8, 160), new THREE.MeshBasicMaterial({ color: 0x4cc3ff, transparent: true, opacity: 0.55 })));
  for (let n = 0; n < 5; n++) { const a = n / 5 * Math.PI * 2, nd = new THREE.Mesh(new THREE.SphereGeometry(0.032, 12, 8), tipMat); nd.position.set(Math.cos(a) * 1.42, Math.sin(a) * 1.42, 0); halo.add(nd); }
  // holo emitter on top
  const emitter = new THREE.Group(); emitter.position.set(0, 1.0, 0); body.add(emitter);
  const eyeLight = new THREE.PointLight(0x4cc3ff, 2, 4, 2); eyeLight.position.copy(eyeDir).multiplyScalar(1.5); body.add(eyeLight);
  bot.userData = { body, iris, hl, smile, halo, haloTilt, tipGlow, thrust, hullMat, eyeDir, irisDir: eyeDir.clone(), emitter };
  return bot;
}
export function buildSaucer(bump) {
  const ufo = new THREE.Group(), spin = new THREE.Group(); ufo.add(spin);
  const prof = [[0, -0.26], [0.5, -0.3], [1.2, -0.22], [1.85, -0.06], [2, 0], [1.85, 0.07], [1.3, 0.16], [0.8, 0.2], [0, 0.21]].map(p => new THREE.Vector2(p[0], p[1]));
  const hull = new THREE.Mesh(new THREE.LatheGeometry(prof, 96), new THREE.MeshStandardMaterial({ color: 0xc2ccd9, metalness: 0.7, roughness: 0.3 })); hull.castShadow = true; spin.add(hull);
  const band = new THREE.Mesh(new THREE.TorusGeometry(1.55, 0.04, 8, 96), new THREE.MeshStandardMaterial({ color: 0x3a4456, metalness: 0.8, roughness: 0.3 })); band.rotation.x = Math.PI / 2; band.position.y = 0.1; spin.add(band);
  const dome = new THREE.Mesh(new THREE.SphereGeometry(0.78, 48, 24, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x6fcfff, emissive: 0x0b5fd6, emissiveIntensity: 0.6, transparent: true, opacity: 0.55, roughness: 0.08, metalness: 0.1 })); dome.position.y = 0.18; ufo.add(dome);
  const domeGlow = glowSprite(0x2ea8ff, 1.6, 0.35); domeGlow.position.y = 0.45; ufo.add(domeGlow);
  const rim = []; for (let r = 0; r < 18; r++) { const a = r / 18 * Math.PI * 2, m = new THREE.MeshBasicMaterial({ color: 0x4cc3ff }), l = new THREE.Mesh(new THREE.SphereGeometry(0.055, 10, 8), m); l.position.set(Math.cos(a) * 1.93, 0.01, Math.sin(a) * 1.93); spin.add(l); rim.push(m); }
  const under = new THREE.Mesh(new THREE.TorusGeometry(0.85, 0.05, 10, 64), new THREE.MeshBasicMaterial({ color: 0x4cc3ff })); under.rotation.x = Math.PI / 2; under.position.y = -0.27; ufo.add(under);
  const underGlow = glowSprite(0x4cc3ff, 1, 0.7); underGlow.position.y = -0.34; underGlow.scale.set(2.4, 1, 1); ufo.add(underGlow);
  ufo.userData = { spin, rim }; return ufo;
}
export function buildBeam() {
  const geo = new THREE.CylinderGeometry(0.45, 1.25, 1, 48, 1, true); geo.translate(0, -0.5, 0);
  const U = { uT: { value: 0 }, uO: { value: 0 }, uDir: { value: 1 } };
  const beam = new THREE.Mesh(geo, new THREE.ShaderMaterial({
    uniforms: U, transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending,
    vertexShader: 'varying float vH; varying vec3 vN; varying vec3 vV; void main(){ vH = -position.y; vec4 mv = modelViewMatrix*vec4(position,1.); vN = normalize(normalMatrix*normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix*mv; }',
    fragmentShader: 'uniform float uT, uO, uDir; varying float vH; varying vec3 vN; varying vec3 vV; void main(){ float rim = 1. - abs(dot(vN, vV)); float bands = .6 + .4*sin(vH*16. + uT*2.2*uDir); float fade = smoothstep(0., .06, vH)*(1. - smoothstep(.72, 1., vH)); float a = (.16 + .55*rim)*bands*fade*uO; gl_FragColor = vec4(vec3(.36,.8,1.)*(.75 + rim*.6), a); }'
  }));
  beam.userData.U = U; beam.visible = false; beam.renderOrder = 5; return beam;
}

/* ================= brain ================= */
const pick = a => a[Math.floor(Math.random() * a.length)];
function norm(q) {
  return (' ' + q.toLowerCase().replace(/[’']/g, '').replace(/[^a-z0-9?! ]+/g, ' ').replace(/(.)\1{2,}/g, '$1$1').replace(/\s+/g, ' ') + ' ')
    .replace(/ wh?a+ss?u+p+ | wazz?u+p+ | wassup | whatsup | whats up | whaddup | wuzzup | sup /g, ' whatsup ')
    .replace(/ whats (happening|happenin|good|new|poppin|popping|crackin|cracking|going on) | what is (happening|going on) /g, ' whatshappening ')
    .replace(/ how r u | how are u | how are you | how ya doin | how you doin | how are ya | hows it going | how is it going | how u doin | how do you do /g, ' howareyou ');
}
const JOKES = [
  'Why did the planet break up with the moon? It needed space.', 'How do you throw a party in space? You planet.', 'What\u2019s a robot\u2019s favorite snack? Micro-chips.',
  'Why did the star go to school? To get a little brighter.', 'What do aliens put on toast? Space jam.', 'Why are black holes so good at secrets? Nothing ever gets out.',
  'How does the moon cut its hair? Eclipse it.', 'What did Mars say to Saturn? Give me a ring sometime.', 'Why did the astronaut break up? Too much space in the relationship. Wait, that\u2019s the planet one. I\u2019m recycling jokes. I\u2019m eco-friendly.',
  'I asked a slime blob for directions. It just said \u201cgo with the flow.\u201d', 'Why don\u2019t aliens eat clowns? They taste funny.', 'What kind of music do planets like? Neptunes.',
  'My UFO pilot says my jokes are out of this world. He also says that about the weather.', 'What\u2019s a black hole\u2019s favorite game? Hide and seek. It always wins.', 'Why did the comet stay home? It was feeling a little spacey.'
];
const UPLIFT = [
  'Hey, for real: you\u2019re doing better than you think. Most people never even find the jetpack.',
  'Bad days happen, even on glowing jungle planets. They pass. You stay awesome.',
  'You know what I like about you? You keep going. That\u2019s the whole secret to this galaxy.',
  'Deep breath. In through the nose, out through the thrusters. Better?'
];
const HOLO_LINES = { planet: 'A hologram planet, fresh off the printer.', heart: 'A heart. Obviously. I\u2019m a very emotional battle-station.', star: 'A star, for you. You\u2019ve earned it.', alien: 'This is my friend Zib. Zib says hi.', galaxy: 'Our whole galaxy. You\u2019re about here. Roughly. Everywhere, really.', knot: 'A space knot. Sailors in the Rift use these. I just like how it spins.', ufo: 'A tiny hologram of my ride. Still parks badly.', crystal: 'A crystal from Crystalis. It hums a little if you listen.' };

function worldTip(w) {
  const tips = {
    lumora: 'Spark Cells glow pink. Check under the light trees and on the ridges. Jet up to spot them.',
    gloopa: 'Slime pools are bouncy! Jammed blobs have a red crackle around them. Pulse them until it pops.',
    'vertigo-peaks': 'Follow the tallest peak. Camps with blue flames refill your jet fuel. Hop between them.',
    'neon-rift': 'The Drone Mother floats over the city center. Take out her escorts first, then hit her glowing core.',
    'coaster-nebula': 'Find the coaster station (big glowing arch). Hop in, then aim and blast the red targets as you ride.',
    crystalis: 'Big crystal = low note, small crystal = high note. Shoot them from biggest to smallest.',
    magmara: 'Lava hurts! Keep your fuel up and chain the Fire Rings. The next ring always glows brighter.',
    aquara: 'Song Pearls sit on the islands. The sea is safe to swim but slow. Jet from island to island.',
    mechanica: 'Rustbots are the big walkers with red crackle. Free them. The little drones? Pop away.',
    sporeveil: 'The giant mushroom caps bounce you sky high. Lanterns sit right on top.',
    cloudrift: 'Keep your jetpack topped off and chain the Sky Rings. Fall off, and the clouds toss you back.',
    dunestar: 'Relic Tablets hide inside the ruins. Look for the tall broken towers.'
  };
  return tips[w.slug] || 'Explore everywhere. This world is full of surprises, and a few are really well hidden.';
}

export function answer(q, ctx) {
  const t = norm(q), has = (re) => re.test(t);
  const w = ctx.world, mode = ctx.mode;
  const hr = new Date().getHours();
  // named worlds first (only known worlds; hidden ones only if found)
  for (const wd of ALL) {
    if (wd.kind === 'hidden' && !S.found.includes(wd.id)) continue;
    const nm = wd.name.toLowerCase(), first = nm.split(' ')[0];
    if (t.includes(' ' + nm + ' ') || (first.length > 4 && t.includes(' ' + first))) {
      const st = S.unlocked(wd.id) ? (S.done[wd.id] ? 'You already beat it, legend.' : 'It\u2019s open, go for it!') : `It unlocks at ${wd.unlock} Harmony Shard${wd.unlock > 1 ? 's' : ''}.`;
      return { text: `${wd.name}: ${wd.tag}. ${wd.mission.text} ${S.unlocked(wd.id) ? worldTip(wd) : ''} ${st}`.replace(/\s+/g, ' ') };
    }
  }
  if (has(/ (hologram|holo|show me something|make art|art |draw|project) /)) return { text: pick(['One hologram, coming right up!', 'Projecting! Try not to be too impressed.', 'Hologram mode: engaged.']), holo: true };
  if (has(/ joke| funny| make me laugh| laugh /)) return { text: pick(JOKES) };
  if (has(/ whatsup /)) return { text: pick(['Not much, just floating at a steady 3 feet off the ground. You?', 'Oh, you know. Guarding the galaxy, practicing my smile. What\u2019s up with you?', 'The sky, mostly. And about 400 billion stars. What are we doing today?']) };
  if (has(/ whatshappening /)) return { text: pick(['Big stuff! The Static is jamming worlds and we\u2019re the ones fixing it. Want a mission?', 'Aliens to befriend, drones to pop, secrets to find. The usual Tuesday.']) };
  if (has(/ howareyou /)) return { text: pick(['Fully charged and extremely floaty. How about you?', 'Better now that you\u2019re here. How are you doing?', 'Great! My antenna has never been glowier. You?']) };
  if (has(/ (hell?o+|hi+|he+y+|heya|heyo|hiya|howdy|yo+|hola|aloha|bonjour|greetings|ello|hallo|gday|salut|hai) /)) {
    const tod = hr < 12 ? 'Good morning' : hr < 18 ? 'Good afternoon' : 'Good evening';
    return { text: pick([`Hey hey! Welcome to the galaxy. What are we exploring today?`, `${tod}, Wayfinder! Ready to save some worlds?`, `Hi! I\u2019m ${NAME}. Ask me anything: missions, secrets, jokes. Especially jokes.`, `Oh hello! You look like someone who\u2019s about to find something amazing.`]) };
  }
  if (has(/ good (morning|afternoon|evening|night) /)) return { text: has(/night/) ? 'Good night! Save your progress by just leaving. I remember everything.' : 'Right back at you! What\u2019s the plan today?' };
  if (has(/ (im|i am|doing|feeling) (good|great|fine|ok|okay|awesome|amazing|well|alright) | not bad /)) return { text: pick(['Love that. Let\u2019s put that energy into saving a galaxy.', 'Awesome! Then let\u2019s go do something legendary.']) };
  if (has(/ (sad|down|bad day|tired|lonely|upset|bored|depressed|stressed|anxious|mad|angry|not good|terrible|awful) /)) return { text: pick(UPLIFT) + (has(/depressed|really bad|awful|hopeless/) ? ' And if things feel heavy for real, talking to someone you trust helps a ton. Games are great, people are better.' : '') };
  if (has(/ (who|what) are you | your name | whats your name | who is orbi | about you /)) return { text: `I\u2019m ${NAME}! A battle-station-shaped hover bot who decided to be a tour guide instead. I explain things, give clues, tell jokes, and make holograms.` };
  if (has(/ are you (real|ai|a robot|alive|human) /)) return { text: 'I\u2019m a guide bot built for this galaxy. I run on scripts, starlight, and a truly unreasonable amount of optimism.' };
  if (has(/ (who made|who built|who created|your creator|made you) /)) return { text: 'I was built right here for theVRgalaxy, to help explorers like you. My UFO came with me. Nobody knows who built the UFO.' };
  if (has(/ (death ?star|battle ?station|empire) /)) return { text: pick(['Death Star? I prefer \u201cLife Orb.\u201d Same curves, way better attitude.', 'The only thing I blow up is your sense of wonder.']) };
  if (has(/ (thank|thanks|thx|ty |appreciate) /)) return { text: pick(['Anytime! That\u2019s what orbiting is for.', 'You just made my antenna glow.', 'Happy to help, Wayfinder.']) };
  if (has(/ (lol|haha|lmao|hehe|rofl) /)) return { text: pick(['I KNOW. I\u2019m hilarious. Want another one?', 'Your laugh just charged my battery 3%.']) };
  if (has(/ (love you|ily|you are the best|youre the best|youre cool|you are cool|youre awesome|you rock) /)) return { text: pick(['Aww. You\u2019re pretty stellar yourself.', 'Stop it, you\u2019ll make my trench glow.']) };
  if (has(/ (stupid|dumb|suck|hate you|useless|shut up) /)) return { text: pick(['Ouch! I\u2019ll forgive you, because friends do that. Want a joke to reset?', 'Noted! I\u2019ll try harder. Ask me about your mission and I\u2019ll prove my worth.']) };
  if (has(/ (bye|goodbye|see ya|later|cya|gotta go|leave) /)) return { text: 'Tap the X on my window and my ride beams me home. Call me back anytime with the Call Orbi button.' };
  if (has(/ (vr|virtual reality|headset|quest|vision pro|goggles|webxr|oculus) /)) return { text: 'VR mode: open theVRgalaxy.com in your headset\u2019s browser (Meta Quest Browser works great) and tap Enter VR. Left stick moves, right stick turns, trigger fires, grip is the jetpack. No headset? It all works in regular 3D too.' };
  if (has(/ (control|controls|keys|buttons|how do i play|how to play|keyboard|mouse) /)) return { text: IS_TOUCH ? 'Left thumb joystick moves. Drag anywhere else to spin the camera all the way around, pinch to zoom. Buttons on the right: jump/jet, fire, talk, swap weapon.' : 'WASD moves, mouse drag spins the camera 360, scroll to zoom. Space = jump (hold for jetpack), click or F = fire, E = talk, Q = swap weapon, H = holster, Shift = dash once you earn it.' };
  if (has(/ (jet|jetpack|fly|flying|boost|thrust|fuel) /)) return { text: `Hold jump in the air to fire your jetpack. The fuel gauge is the blue arc next to your life gauge. It refills when you land. ${S.has('fuel') || S.has('fuel2') ? 'You\u2019ve got the bigger tanks, so go wild.' : 'Bigger tanks are a reward on some worlds.'}` };
  for (const k in WEAPONS) { const nm = WEAPONS[k].name.toLowerCase(), f = nm.split(' ')[0]; if (t.includes(' ' + nm + ' ') || (['prism', 'gravity', 'tuner'].includes(f) && t.includes(' ' + f + ' '))) return { text: `${WEAPONS[k].name}: ${WEAPONS[k].desc}` }; }
  if (has(/ (meaning of life|purpose) /)) return { text: 'Honestly? Be kind, explore a lot, and never pass up a chance to ride a space roller coaster.' };
  if (has(/ (what is the static|whats the static|static|story|lore|war) /) && !has(/ (jammed|free|freeing|crackle) /)) return { text: 'The fifteen worlds used to sing one song, the Harmony. The Static jammed it, and now everyone hears threats in everything. Your job: free the worlds, gather the shards, and find where the Static really comes from. Spoiler: it\u2019s not who you think.' };
  if (has(/ (weapon|weapons|gun|blaster|shoot|shooting|fire) /)) { const list = S.weapons.map(k => WEAPONS[k].name).join(', '); return { text: `Every weapon fires Harmony: drones pop, jammed aliens get freed. You have: ${list}. Swap with Q (or the swap button). New weapons are rewards on Gloopa, Neon Rift, Crystalis and Mechanica.` }; }
  if (has(/ (holster|put away|stop shooting|peace|peaceful) /)) return { text: 'Press H (or the holster button) to put your blaster away. Some problems get smaller when you stop shooting at them. Just saying.' };
  if (has(/ (health|life|hp|heal|hurt|die|dying|dead|respawn) /)) return { text: 'The big ring gauge is your life. Green health pickups fill it back up, and it slowly refills if you stay out of trouble. If it empties, you pop back at the landing pad. No progress lost.' };
  if (has(/ (shard|shards|progress|how many|how far|score) /)) return { text: `You have ${S.shards.length} of 12 Harmony Shards, ${S.glyphCount()} Star Glyphs, and ${S.friends} friends. Every shard wakes up another world.` };
  if (has(/ (secret|secrets|hidden|clue|clues|hint|hints|easter egg|mystery) /)) { const r = RIDDLES.find(r => r.need(S)); return { text: 'Okay, lean in. ' + (r ? r.text : 'Keep exploring. The galaxy rewards the curious.') + ' That\u2019s all I can say. Orbi\u2019s honor.' }; }
  if (has(/ (glyph|glyphs) /)) return { text: 'Star Glyphs are spinning knot-shaped holograms. Five per world, tucked in weird spots: up high, behind rocks, far from the path. Each one tells a piece of the story, and some add up to something bigger.' };
  if (has(/ (friend|friends|befriend|jammed|free|freeing|crackle|red) /)) return { text: 'Aliens with a red crackle are jammed by the Static. Hit them with Harmony pulses until the crackle pops. Then they\u2019re your friend! Walk up to friendly aliens and press E to chat. They know things.' };
  if (has(/ (story|lore|why|war|fighting|point of the game|whats the point|goal) /)) return { text: 'The fifteen worlds used to sing one song, the Harmony. The Static jammed it, and now everyone hears threats in everything. Your job: free the worlds, gather the shards, and find where the Static really comes from. Spoiler: it\u2019s not who you think.' };
  if (has(/ (black hole|blackhole|portal|portals|wormhole) /)) return { text: 'Most black holes are just really dramatic scenery. But some open like an eye when the conditions are right, and those are doors. Fly into an open one and see where it goes.' };
  if (has(/ (character|avatar|skin|change character|selfie|face|photo|my face) /)) return { text: 'Tap the character button at the top. Pick an astronaut (Finn, Barbara, Fernando, Rae) or a human explorer. Humans can wear your own face: upload a selfie and it wraps right onto their head.' };
  if (has(/ (save|saving|progress lost|lose progress) /)) return { text: 'Your progress saves automatically on this device. Shards, glyphs, friends, weapons. All of it.' };
  if (has(/ (sound|music|mute|volume|audio) /)) return { text: 'Sound and music toggles are in the top bar. I recommend music on. I composed none of it but I hum along.' };
  if (has(/ (map|compass|lost|where am i|which way|direction) /)) return { text: 'Look at the compass at the top: the arrow points to your next objective. ' + (S.has('map') ? 'With Glyph Sense, a second marker points to the nearest Star Glyph.' : 'Earn Glyph Sense on Dunestar and it\u2019ll point to hidden glyphs too.') };
  if (has(/ (locked|unlock|how do i unlock|cant play|cant open) /)) return { text: 'Locked worlds wake up as you collect Harmony Shards. Beat any world\u2019s main mission to earn its shard.' };
  if (has(/ (coaster|roller|ride) /)) return { text: 'The Star Coaster is on Coaster Nebula. Hop in at the glowing station and blast targets while it loops. Hands inside the ride. Blaster outside.' };
  if (has(/ (mountain|climb|summit|peak) /)) return { text: 'Vertigo Peaks has the tallest mountains in the galaxy. Walk the ridges, jet the cliffs, and refuel at every camp.' };
  if (has(/ (slime|goo|bounce) /)) return { text: 'Gloopa is the slime world. Slime pools bounce you way up. Also: slime is just water that decided to be happy.' };
  if (has(/ (lava|fire|volcano) /)) return { text: 'Magmara: lava rivers, fire trees, geysers. Don\u2019t stand in the lava. Please. For me.' };
  if (has(/ (help|what can you do|what do you do|options|commands) /)) return { text: 'I can explain controls, missions, weapons, VR mode, and characters. I give secret clues (carefully), tell jokes, and project holograms. Try: \u201cany secret clues?\u201d or \u201cshow me a hologram.\u201d' };
  if (has(/ (mission|objective|what do i do|what now|next|stuck|how do i win|what should i do|quest|first) /)) {
    if (mode === 'world' && w) return { text: `${w.mission.text} ${worldTip(w)}${ctx.status ? ' Right now: ' + ctx.status + '.' : ''}` };
    const next = WORLDS.find(x => S.unlocked(x.id) && !S.done[x.id]);
    return { text: next ? `Head to ${next.name}: tap it in the galaxy, then Land. ${next.mission.text}` : 'You\u2019ve cleared every world I know about. Which means... there are worlds I don\u2019t know about. Ask me for clues.' };
  }
  if (has(/ (age|how old) /)) return { text: 'I\u2019m about 4.6 billion years old in star years. In bot years I\u2019m three. I look great for both.' };
  if (has(/ (favorite|favourite) /)) return { text: pick(['Favorite world? Lumora. Favorite color? The blue of my own eye, sorry. Favorite human? Currently you.', 'My favorite thing is when a freed alien does its happy dance.']) };
  if (has(/ (meaning of life|purpose) /)) return { text: 'Honestly? Be kind, explore a lot, and never pass up a chance to ride a space roller coaster.' };
  if (has(/ (sleep|tired|rest) /)) return { text: 'I nap in my UFO between tours. It has a cup holder. Luxury.' };
  if (has(/ (yes|yeah|yep|sure|ok|okay|yup) /)) return { text: pick(['Great! Ask me about your mission, secrets, or anything.', 'Let\u2019s do it!']) };
  if (has(/ (no|nope|nah) /)) return { text: pick(['No worries. I\u2019ll just be over here, hovering majestically.', 'Fair enough! I\u2019m here if you need me.']) };
  return { text: pick(['Hmm, that one\u2019s outside my orbit. Ask me about your mission, secrets, weapons, or VR mode.', 'My antenna didn\u2019t catch that. Try asking \u201cwhat do I do?\u201d or \u201cany clues?\u201d', 'I don\u2019t know that one yet, but I do know 15 jokes. Want one?']) };
}

/* ================= controller ================= */
export class Orbi {
  constructor(app) {
    this.app = app; this.state = 'away'; this.mode = 'overlay'; this.greeted = false; this.panelOpen = false; this.talk = 0; this.talkK = 0; this.holo = null; this.holoT = 0; this.nextHolo = 35;
    this.bot = buildOrbi(); this.ufo = buildSaucer(); this.beam = buildBeam(); this.bot.visible = false; this.ufo.visible = false;
    this.beamO = 0; this.botK = 1; this.base = new THREE.Vector3(); this.park = new THREE.Vector3(); this.S = 1; this.tilt = 0; this.tweens = [];
    this.look = new THREE.Vector3(0, 0, 10);
    // overlay pass
    this.oScene = new THREE.Scene(); this.oCam = new THREE.PerspectiveCamera(35, 1, 1, 60); this.oCam.position.set(0, 0, 10);
    this.oScene.add(new THREE.HemisphereLight(0x9cc8ff, 0x0a0f1e, 1.4)); const k = new THREE.DirectionalLight(0xffffff, 2.6); k.position.set(-4, 5, 6); this.oScene.add(k); const r = new THREE.DirectionalLight(0x2ea8ff, 2.2); r.position.set(4, -1, -6); this.oScene.add(r);
    this.bubble = null;
    this.buildDOM(); this.setMode('overlay');
  }
  /* ---------- DOM ---------- */
  buildDOM() {
    const w = document.createElement('div');
    w.innerHTML = `<button id="gb-hit" type="button" aria-label="Chat with ${NAME}"></button>
<div id="gb-greet" role="button" tabindex="0"></div>
<section id="gb-panel" role="dialog" aria-label="Chat with ${NAME}" aria-hidden="true">
 <div class="gb-head"><div class="orb" aria-hidden="true"></div><div><h2>${NAME}</h2><span>Your galaxy guide</span></div>
 <button class="gb-x" type="button" aria-label="Send ${NAME} home">&#x2715;</button></div>
 <div class="gb-log" aria-live="polite"></div><div class="gb-chips"></div>
 <form class="gb-form" autocomplete="off"><label class="gb-sr" for="gb-in">Message ${NAME}</label><input id="gb-in" type="text" maxlength="300" placeholder="Ask ${NAME} anything"><button type="submit">Send</button></form>
</section>
<button id="gb-talk" type="button" aria-label="Chat with ${NAME}"><span class="orb" aria-hidden="true"></span>Ask ${NAME}</button>
<button id="gb-dock" type="button"><svg viewBox="0 0 28 18" aria-hidden="true"><ellipse cx="14" cy="11" rx="13" ry="4.2" fill="#8b96a6"/><path d="M8 9.5a6 6 0 0 1 12 0z" fill="#6fcfff"/><ellipse cx="14" cy="12.4" rx="6" ry="1.3" fill="#4cc3ff"/></svg>Call ${NAME}</button>`;
    while (w.firstChild) document.body.appendChild(w.firstChild);
    const $ = s => document.querySelector(s);
    Object.assign(this, { hit: $('#gb-hit'), greet: $('#gb-greet'), panel: $('#gb-panel'), log: $('.gb-log'), chipsEl: $('.gb-chips'), form: $('.gb-form'), inp: $('#gb-in'), dock: $('#gb-dock'), talkBtn: $('#gb-talk') });
    this.talkBtn.addEventListener('click', () => this.panelOpen ? this.closePanel() : this.openPanel());
    this.hit.addEventListener('click', () => this.panelOpen ? this.closePanel() : this.openPanel());
    this.greet.addEventListener('click', () => this.openPanel());
    this.greet.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); this.openPanel(); } });
    $('.gb-x').addEventListener('click', () => { S.orbiAway = true; S.save(); this.pickUp(); });
    this.dock.addEventListener('click', () => { S.orbiAway = false; S.save(); this.dropOff(); });
    this.form.addEventListener('submit', e => { e.preventDefault(); this.send(this.inp.value); });
    addEventListener('keydown', e => { if (e.key === 'Escape' && this.panelOpen) { this.closePanel(); } });
    this.panel.addEventListener('keydown', e => e.stopPropagation());
    this.renderChips();
  }
  renderChips() {
    const c = this.mode === 'companion' && this.app.world ? ['What\u2019s my mission?', 'How do I use the jetpack?', 'Any secret clues?', 'Show me a hologram', 'Tell me a joke'] : ['What do I do first?', 'Any secret clues?', 'How does VR mode work?', 'Show me a hologram', 'Tell me a joke'];
    this.chipsEl.innerHTML = ''; c.forEach(x => { const b = document.createElement('button'); b.type = 'button'; b.textContent = x; b.addEventListener('click', () => this.send(x)); this.chipsEl.appendChild(b); });
  }
  add(text, who) { const m = document.createElement('div'); m.className = 'gb-m ' + who; m.textContent = text; this.log.appendChild(m); this.log.scrollTop = this.log.scrollHeight; return m; }
  say(text, opts = {}) {
    const m = this.add('', 'bot'); m.innerHTML = `<span class="gb-typing" aria-label="${NAME} is typing"><i></i><i></i><i></i></span>`; this.talk = 1;
    setTimeout(() => { m.textContent = text; this.log.scrollTop = this.log.scrollHeight; setTimeout(() => { this.talk = 0; }, 900); this.busy = false; this.speak(text); if (opts.holo) this.showHolo(); }, REDUCED ? 200 : 550 + Math.min(900, text.length * 7));
  }
  send(q) { q = (q || '').trim(); if (!q || this.busy) return; this.busy = true; this.add(q, 'me'); this.inp.value = ''; const r = answer(q, this.context()); this.say(r.text, r); }
  context() { const w = this.app.world ? this.app.world.cfg : null; return { mode: this.app.world ? 'world' : 'hub', world: w, status: this.app.world ? this.app.world.statusText() : '' }; }
  openPanel() { if (this.state !== 'idle') return; this.hideGreet(); this.panelOpen = true; this.panel.classList.add('open'); this.panel.setAttribute('aria-hidden', 'false'); this.renderChips(); if (!this.greeted) { this.greeted = true; const w = this.app.world; this.say(w ? `Welcome to ${w.cfg.name}! ${w.cfg.mission.text} Ask me for tips anytime.` : `Hey there, Wayfinder! I\u2019m ${NAME}. Spin the galaxy, pinch to zoom, and tap a glowing world to land. Ask me anything.`); } if (!IS_TOUCH) setTimeout(() => this.inp.focus({ preventScroll: true }), 80); }
  closePanel(silent) { this.panelOpen = false; this.panel.classList.remove('open'); this.panel.setAttribute('aria-hidden', 'true'); if (!silent && this.state === 'idle') setTimeout(() => this.showGreet(), 400); }
  showGreet(text) { if (this.panelOpen || this.state !== 'idle' || this.mode !== 'overlay') return; this.greet.textContent = text || (this.greeted ? 'Need a hint? Tap me.' : `Hey! I\u2019m ${NAME}. Want a tour of the galaxy?`); this.greet.classList.add('show'); }
  hideGreet() { this.greet.classList.remove('show'); }
  /* floating speech bubble in 3D (companion + VR) */
  speak(text) {
    if (this.mode !== 'companion') return;
    if (this.bubble) { this.bot.parent && this.bot.parent.remove(this.bubble); this.bubble.material.map.dispose(); this.bubble = null; }
    const words = text.split(' '), lines = []; let cur = ''; for (const wd of words) { if ((cur + ' ' + wd).length > 34) { lines.push(cur); cur = wd; } else cur = cur ? cur + ' ' + wd : wd; } if (cur) lines.push(cur);
    const L = lines.slice(0, 6), W = 900, Hh = 70 + L.length * 64;
    const tx = canvasTex(W, Hh, (g) => { g.fillStyle = 'rgba(3,9,22,.85)'; roundRect(g, 4, 4, W - 8, Hh - 8, 36); g.fill(); g.strokeStyle = 'rgba(46,168,255,.6)'; g.lineWidth = 4; g.stroke(); g.font = '600 46px "Exo 2", system-ui, sans-serif'; g.fillStyle = '#e8f1ff'; g.textBaseline = 'top'; L.forEach((l, i) => g.fillText(l, 40, 36 + i * 64)); });
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tx, transparent: true, depthTest: false })); sp.renderOrder = 30; const sc = 0.0028; sp.scale.set(W * sc, Hh * sc, 1);
    this.bubble = sp; this.bubbleT = 7 + L.length; if (this.bot.parent) this.bot.parent.add(sp);
  }
  /* ---------- holograms ---------- */
  showHolo(kind) {
    if (this.holo) { this.holo.parent && this.holo.parent.remove(this.holo); this.holo = null; }
    kind = kind || pick(HOLO_KINDS); const h = makeHologram(kind, pick([0x4cc3ff, 0xff4fd8, 0x7cffd4, 0xffd23f, 0xb08cff]));
    this.holo = h; this.holoT = 0; h.scale.setScalar(0.001); this.bot.userData.emitter.add(h); h.position.y = 1.4;
    if (!this.panelOpen && this.mode === 'overlay') this.showGreet(HOLO_LINES[kind]); else if (this.mode === 'companion' && !this.panelOpen) this.speak(HOLO_LINES[kind]);
  }
  /* ---------- modes ---------- */
  setMode(mode, scene) {
    this.mode = mode; const target = mode === 'overlay' ? this.oScene : scene;
    for (const o of [this.bot, this.ufo, this.beam]) target.add(o);
    if (this.bubble) { this.bubble.parent && this.bubble.parent.remove(this.bubble); this.bubble = null; }
    document.body.classList.toggle('gb-companion', mode === 'companion');
    this.hideGreet(); this.renderChips();
  }
  layout() {
    if (this.mode !== 'overlay') return; const w = innerWidth, h = innerHeight, mobile = w < 640;
    this.oCam.aspect = w / h; this.oCam.updateProjectionMatrix(); this.halfH = 10 * Math.tan(THREE.MathUtils.degToRad(17.5)); this.halfW = this.halfH * this.oCam.aspect;
    this.rPx = mobile ? 40 : 52; this.S = this.rPx / h * 2 * this.halfH;
    const px = w - (mobile ? 62 : 96), py = h - (mobile ? 150 : 106);
    this.park.set((px / w * 2 - 1) * this.halfW, -(py / h * 2 - 1) * this.halfH, 0);
    if (this.state === 'idle') this.base.copy(this.park); this.hit.style.width = this.hit.style.height = (this.rPx * 2) + 'px';
  }
  toScreen(v) { return { x: (v.x / this.halfW + 1) / 2 * innerWidth, y: (1 - v.y / this.halfH) / 2 * innerHeight }; }
  hover() { const v = this.park.clone(); v.y += 3.4 * this.S; if (this.mode === 'overlay') { const top = this.halfH - 0.5 * this.S; if (v.y > top) v.y = top; } return v; }
  ufoBottom() { return this.ufo.position.clone().add(new THREE.Vector3(0, -0.32 * this.S, 0)); }
  offTop(side) { if (this.mode === 'overlay') return new THREE.Vector3(side * (this.halfW + 4 * this.S), this.halfH + 4 * this.S, 0); return this.park.clone().add(new THREE.Vector3(side * 60, 80, -30)); }
  tween(d, fn) { if (REDUCED) d = Math.min(d, 0.25); return new Promise(res => this.tweens.push({ t: 0, d, fn, res })); }
  dropOff() {
    if (this.state !== 'away') return Promise.resolve(); this.state = 'arriving'; this.dock.style.display = 'none';
    const e3 = k => 1 - Math.pow(1 - k, 3), ez = k => k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2, ei = k => k * k * k;
    const hv = this.hover(), start = this.offTop(1); this.ufo.scale.setScalar(this.S * 0.95); this.ufo.position.copy(start); this.ufo.visible = true;
    return this.tween(1.6, k => { const e = e3(k); this.ufo.position.lerpVectors(start, this.hover(), e); this.tilt = (1 - e) * 0.35; })
      .then(() => { this.beam.userData.U.uDir.value = -1; return this.tween(0.5, k => { this.beamO = k; }); })
      .then(() => { const from = this.ufoBottom(); this.bot.visible = true; return this.tween(1.5, k => { const e = ez(k); this.base.lerpVectors(from, this.park, e); this.botK = 0.22 + 0.78 * e; }); })
      .then(() => this.tween(0.45, k => { this.beamO = 1 - k; }))
      .then(() => { const f = this.ufo.position.clone(), to = this.offTop(0.6); return this.tween(1.1, k => { const e = ei(k); this.ufo.position.lerpVectors(f, to, e); this.tilt = -0.3 * e; }); })
      .then(() => { this.ufo.visible = false; this.state = 'idle'; if (this.mode === 'overlay') { this.hit.style.display = 'block'; this.showGreet(); } else { this.talkBtn.style.display = 'inline-flex'; }
        if (this.mode !== 'overlay') this.speak(this.app.world ? `${this.app.world.cfg.name}! ${this.app.world.cfg.mission.text}` : 'Hi!'); });
  }
  pickUp() {
    if (this.state !== 'idle') return Promise.resolve(); this.state = 'leaving'; this.closePanel(true); this.hideGreet(); this.hit.style.display = 'none'; this.talkBtn.style.display = 'none';
    const e3 = k => 1 - Math.pow(1 - k, 3), ez = k => k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2, ei = k => k * k * k;
    const start = this.offTop(0.6); this.ufo.scale.setScalar(this.S * 0.95); this.ufo.position.copy(start); this.ufo.visible = true;
    const from0 = this.base.clone();
    return this.tween(1.2, k => { const e = e3(k); this.ufo.position.lerpVectors(start, this.hover(), e); this.tilt = (1 - e) * -0.3; })
      .then(() => { this.beam.userData.U.uDir.value = 1; return this.tween(0.5, k => { this.beamO = k; }); })
      .then(() => { const to = this.ufoBottom(); return this.tween(1.3, k => { const e = ez(k); this.base.lerpVectors(from0, to, e); this.botK = 1 - 0.78 * e; }); })
      .then(() => { this.bot.visible = false; return this.tween(0.45, k => { this.beamO = 1 - k; }); })
      .then(() => { const f = this.ufo.position.clone(), to = this.offTop(1); return this.tween(1.1, k => { const e = ei(k); this.ufo.position.lerpVectors(f, to, e); this.tilt = 0.3 * e; }); })
      .then(() => { this.ufo.visible = false; this.state = 'away'; this.dock.style.display = 'inline-flex'; });
  }
  /* instantly hide (scene switch) */
  reset() { this.tweens = []; this.state = 'away'; this.bot.visible = false; this.ufo.visible = false; this.beamO = 0; this.hit.style.display = 'none'; this.talkBtn.style.display = 'none'; this.dock.style.display = 'none'; this.hideGreet(); this.closePanel(true); if (this.holo) { this.holo.parent && this.holo.parent.remove(this.holo); this.holo = null; } }
  arrive() { this.reset(); if (S.orbiAway) { this.dock.style.display = 'inline-flex'; return; } setTimeout(() => this.dropOff(), REDUCED ? 100 : 900); }

  /* ---------- per frame ---------- */
  update(dt, t, pointer, companion) {
    for (let i = this.tweens.length - 1; i >= 0; i--) { const tw = this.tweens[i]; tw.t += dt; const k = Math.min(1, tw.t / tw.d); tw.fn(k); if (k >= 1) { this.tweens.splice(i, 1); tw.res(); } }
    const calm = REDUCED ? 0 : 1, B = this.bot, U = B.userData;
    if (this.mode === 'companion' && companion) {
      this.S = companion.scale; this.park.copy(companion.park);
      if (this.state === 'idle') this.base.lerp(this.park, 1 - Math.exp(-dt * 4));
      this.look.copy(companion.look);
    }
    if (!B.visible && !this.ufo.visible && this.beamO <= 0) return false;
    B.scale.setScalar(this.S * this.botK);
    B.position.copy(this.base); B.position.y += Math.sin(t * 1.6) * 0.06 * this.S * (this.state === 'idle' ? 1 : 0.3) * calm;
    // where to look: full range. Overlay = pointer; companion = given target
    let yaw, pitch, dx = 0, dy = 0;
    if (this.mode === 'overlay') {
      const sp = this.toScreen(B.position); dx = THREE.MathUtils.clamp((pointer.x - sp.x) / innerWidth, -0.6, 0.6); dy = THREE.MathUtils.clamp((pointer.y - sp.y) / innerHeight, -0.6, 0.6);
      if (this.panelOpen) { dx = -0.45; dy = -0.05; }
      if (this.holo) { dy = -0.5; dx *= 0.3; }
      yaw = dx * 2.0; pitch = dy * 1.3;
      if (this.state === 'idle') { this.hit.style.left = (sp.x - this.rPx) + 'px'; this.hit.style.top = (sp.y - this.rPx) + 'px'; this.greet.style.right = Math.max(8, innerWidth - sp.x - this.rPx * 0.4) + 'px'; this.greet.style.bottom = (innerHeight - sp.y + this.rPx + 14) + 'px'; }
    } else {
      const to = this.look.clone().sub(B.position); const par = B.parent; const yawT = Math.atan2(to.x, to.z), dist = Math.hypot(to.x, to.z); pitch = -Math.atan2(to.y, dist);
      B.rotation.y = THREE.MathUtils.lerp(B.rotation.y, yawT, 1 - Math.exp(-dt * 3)); yaw = 0; if (this.holo) pitch = -0.6; void par;
    }
    const body = U.body;
    body.rotation.y += (THREE.MathUtils.clamp(yaw, -1.2, 1.2) * 0.75 - body.rotation.y) * Math.min(1, dt * 4);
    body.rotation.x += (THREE.MathUtils.clamp(pitch, -0.8, 0.8) * 0.6 - body.rotation.x) * Math.min(1, dt * 4);
    // iris: full dish range on top of body turn
    const ix = THREE.MathUtils.clamp(yaw * 0.16, -0.19, 0.19), iy = THREE.MathUtils.clamp(-pitch * 0.18, -0.17, 0.17);
    const tgt = new THREE.Vector3(U.eyeDir.x + ix, U.eyeDir.y + iy, U.eyeDir.z).normalize(); U.irisDir.lerp(tgt, 1 - Math.exp(-dt * 8)).normalize();
    U.iris.quaternion.setFromUnitVectors(Y, U.irisDir);
    U.hl.quaternion.setFromUnitVectors(Y, new THREE.Vector3(U.irisDir.x - 0.075, U.irisDir.y + 0.08, U.irisDir.z).normalize());
    this.talkK += (this.talk - this.talkK) * Math.min(1, dt * 7);
    const sm = 1 + this.talkK * (0.18 + 0.08 * Math.sin(t * 9) * calm); U.smile.scale.set(sm, 1 + this.talkK * 0.25, 1);
    U.halo.rotation.z += dt * 0.5 * calm; U.haloTilt.rotation.y = Math.sin(t * 0.3) * 0.15 * calm;
    const pulse = 0.5 + 0.5 * Math.sin(t * 1.8); U.tipGlow.material.opacity = 0.45 + 0.4 * pulse * calm; U.tipGlow.scale.setScalar(0.26 + 0.08 * pulse * calm);
    U.thrust.material.opacity = 0.65 + 0.25 * Math.sin(t * 2.4) * calm; U.hullMat.emissiveIntensity = 1.05 + 0.15 * Math.sin(t * 0.9) * calm;
    // holograms
    if (this.state === 'idle') { this.nextHolo -= dt; if (this.nextHolo <= 0 && !this.panelOpen) { this.nextHolo = 45 + Math.random() * 40; this.showHolo(); } }
    if (this.holo) {
      this.holoT += dt; const h = this.holo, k = Math.min(1, this.holoT / 0.6), out = this.holoT > 7 ? Math.max(0, 1 - (this.holoT - 7) / 0.6) : 1;
      h.scale.setScalar(Math.max(0.001, k * out) * 0.9); h.rotation.y += dt * 0.8; h.userData.mat.uniforms.uT.value = t; h.userData.mat.uniforms.op.value = out;
      if (this.holoT > 7.6) { h.parent && h.parent.remove(h); this.holo = null; }
    }
    // speech bubble follows
    if (this.bubble) { this.bubble.position.copy(B.position).add(new THREE.Vector3(0, 2.2 * this.S + 0.9, 0)); this.bubbleT -= dt; this.bubble.material.opacity = Math.min(1, this.bubbleT); if (this.bubbleT <= 0) { this.bubble.parent && this.bubble.parent.remove(this.bubble); this.bubble.material.map.dispose(); this.bubble = null; } }
    // saucer + beam
    const F = this.ufo.userData;
    if (this.ufo.visible) { F.spin.rotation.y += dt * 1.1 * calm; this.ufo.rotation.z = this.tilt + Math.sin(t * 1.3) * 0.03 * calm; this.ufo.rotation.x = this.mode === 'overlay' ? 0.18 : 0; for (let j = 0; j < F.rim.length; j++) { const q = 0.5 + 0.5 * Math.sin(t * 2.2 - j * 0.7); F.rim[j].color.setRGB(0.1 + 0.5 * q, 0.45 + 0.4 * q, 0.9 + 0.1 * q); } }
    const on = this.beamO > 0.001 && this.ufo.visible; this.beam.visible = on;
    if (on) { const top = this.ufoBottom(), L = Math.max(0.5 * this.S, top.y - (this.park.y - 1.35 * this.S)), us = this.S * 0.95; this.beam.position.copy(top); this.beam.scale.set(us, L, us); this.beam.userData.U.uT.value = t; this.beam.userData.U.uO.value = this.beamO; }
    return true;
  }
  /* overlay pass: drawn on top of whatever the main renderer drew */
  renderOverlay(renderer) {
    if (this.mode !== 'overlay') return; if (!this.bot.visible && !this.ufo.visible && this.beamO <= 0) return;
    renderer.autoClear = false; renderer.clearDepth(); renderer.render(this.oScene, this.oCam); renderer.autoClear = true;
  }
}
