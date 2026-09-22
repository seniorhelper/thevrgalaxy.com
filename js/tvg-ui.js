/* theVRgalaxy — UI: top bar, hero, planet cards, HUD (SVG life gauge), character select + selfie, story screens. */
import { S, Sound, esc, byId, ALL, IS_TOUCH, facePath } from './tvg-core.js';
import { STORY, CHARACTERS, WEAPONS } from './tvg-data.js';

const $ = (s, r = document) => r.querySelector(s);
const el = (html) => { const d = document.createElement('div'); d.innerHTML = html.trim(); return d.firstChild; };

export class UI {
  constructor(app) {
    this.app = app; this.root = $('#ui'); this.toasts = [];
    this.root.insertAdjacentHTML('beforeend', `
<header class="tb" id="tb">
  <a class="tb-brand" href="/" aria-label="theVRgalaxy home"><img src="/images/logo.webp" alt="" width="40" height="40"><span>the<b>VR</b>galaxy</span></a>
  <div class="tb-pill" id="tb-shards" title="Harmony Shards"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2l5 8-5 12-5-12z" fill="#ffd23f"/></svg><span>0/12</span></div>
  <div class="tb-pill" id="tb-friends" title="Friends"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-7-4.4-9.5-9A5.5 5.5 0 0 1 12 6a5.5 5.5 0 0 1 9.5 6c-2.5 4.6-9.5 9-9.5 9z" fill="#ff7ab8"/></svg><span>0</span></div>
  <nav class="tb-btns">
    <button type="button" id="tb-galaxy" class="tb-b" hidden>&#x2190; Galaxy</button>
    <button type="button" id="tb-char" class="tb-b">Character</button>
    <button type="button" id="tb-guide" class="tb-b">Guide</button>
    <button type="button" id="tb-sound" class="tb-b tb-i" aria-label="Sound on" aria-pressed="true">&#x1F50A;</button>
    <button type="button" id="tb-music" class="tb-b tb-i" aria-label="Music on" aria-pressed="true">&#x266B;</button>
    <span id="tb-vr"></span>
  </nav>
</header>
<section class="hero" id="hero" aria-label="Welcome">
  <p class="hero-k">A free VR game in your browser</p>
  <h1 class="hero-t" aria-label="The VR Galaxy"><span>THE</span><span>VR</span><span>GALAXY</span></h1>
  <p class="hero-s">15 worlds. 3 are hidden. Nobody has found them all.</p>
  <p class="hero-h">${IS_TOUCH ? 'Drag to spin the galaxy · pinch to zoom · tap a world' : 'Drag to spin the galaxy · scroll to zoom · click a world'}</p>
</section>
<section class="card" id="card" aria-live="polite" hidden></section>
<section class="hud" id="hud" hidden>
  <div class="hud-life" aria-label="Life and jet fuel">
    <svg viewBox="0 0 200 200" aria-hidden="true">
      <defs><linearGradient id="lg" x1="0" x2="1" y1="1" y2="0"><stop offset="0" stop-color="#ff4f79"/><stop offset=".5" stop-color="#ffd23f"/><stop offset="1" stop-color="#7cff6b"/></linearGradient>
      <linearGradient id="fg" x1="0" x2="0" y1="1" y2="0"><stop offset="0" stop-color="#2ea8ff"/><stop offset="1" stop-color="#9fe6ff"/></linearGradient>
      <filter id="gl"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
      <circle cx="100" cy="100" r="84" fill="rgba(4,10,24,.65)" stroke="rgba(120,180,255,.25)" stroke-width="2"/>
      <circle cx="100" cy="100" r="72" fill="none" stroke="rgba(255,255,255,.08)" stroke-width="14"/>
      <circle id="hp-ring" cx="100" cy="100" r="72" fill="none" stroke="url(#lg)" stroke-width="14" stroke-linecap="round" transform="rotate(-90 100 100)" stroke-dasharray="452.4" stroke-dashoffset="0" filter="url(#gl)"/>
      <path d="M100 30 a70 70 0 0 0 0 0" fill="none"/>
      <circle cx="100" cy="100" r="92" fill="none" stroke="rgba(255,255,255,.06)" stroke-width="6" stroke-dasharray="144.5 434" transform="rotate(130 100 100)"/>
      <circle id="fuel-ring" cx="100" cy="100" r="92" fill="none" stroke="url(#fg)" stroke-width="6" stroke-linecap="round" stroke-dasharray="144.5 434" transform="rotate(130 100 100)" filter="url(#gl)"/>
      <path d="M100 124s-26-16-26-34a14 14 0 0 1 26-7 14 14 0 0 1 26 7c0 18-26 34-26 34z" fill="#ff4f79" opacity=".9"/>
      <text id="hp-txt" x="100" y="160" text-anchor="middle" font-size="26" font-weight="900" fill="#fff">100</text>
    </svg>
  </div>
  <div class="hud-mission"><h2 id="hud-wname">World</h2><p id="hud-mtext"></p><p id="hud-status" class="st"></p></div>
  <div class="hud-compass" aria-hidden="true"><div class="cmp-track" id="cmp-track"></div><div class="cmp-obj" id="cmp-obj">&#x25BC;</div><div class="cmp-gly" id="cmp-gly">&#x25C6;</div></div>
  <div class="hud-weap" id="hud-weap"><span class="wi">✦</span><span class="wn">Tuner Blaster</span></div>
  <div class="xhair" aria-hidden="true"></div>
</section>
<div class="touch" id="touch" hidden>
  <div class="joy" id="joy"><div class="joy-k" id="joy-k"></div></div>
  <button type="button" class="tbtn t-fire" data-k="fire">FIRE</button>
  <button type="button" class="tbtn t-jump" data-k="jump">JUMP<small>hold = jet</small></button>
  <button type="button" class="tbtn t-talk" data-k="talk">TALK</button>
  <button type="button" class="tbtn t-swap" data-k="swap">SWAP</button>
  <button type="button" class="tbtn t-hol" data-k="holster">HOLSTER</button>
  <button type="button" class="tbtn t-dash" data-k="dash">DASH</button>
</div>
<div class="vig" id="vig"></div>
<div class="toasts" id="toasts" aria-live="polite"></div>
<section class="modal" id="modal" hidden><div class="modal-in" role="dialog" aria-modal="true"></div></section>
<section class="loading" id="loading" hidden><div><p class="ld-k">Landing on</p><h2 id="ld-name">World</h2><div class="ld-bar"><i id="ld-fill"></i></div><p id="ld-txt">Loading</p></div></section>`);
    $('#tb-char').onclick = () => this.charSelect();
    $('#tb-guide').onclick = () => this.guide(true);
    $('#tb-galaxy').onclick = () => this.app.backToHub();
    const sb = $('#tb-sound'), mb = $('#tb-music');
    const setS = () => { sb.setAttribute('aria-pressed', S.settings.sound); sb.innerHTML = S.settings.sound ? '&#x1F50A;' : '&#x1F507;'; sb.setAttribute('aria-label', S.settings.sound ? 'Sound on' : 'Sound off'); mb.setAttribute('aria-pressed', S.settings.music); mb.style.opacity = S.settings.music ? 1 : 0.45; };
    sb.onclick = () => { Sound.init(); Sound.setOn(!S.settings.sound); setS(); }; mb.onclick = () => { Sound.init(); Sound.setMusic(!S.settings.music); setS(); }; setS();
    const g = $('#guide'); if (g) { g.querySelector('.guide-x').onclick = () => this.guide(false); g.addEventListener('keydown', e => e.stopPropagation()); }
    this.counts();
  }
  counts() { $('#tb-shards span').textContent = `${S.shards.length}/12`; $('#tb-friends span').textContent = S.friends; }
  guide(open) { const g = $('#guide'); if (!g) return; g.hidden = !open; document.body.classList.toggle('guide-open', open); if (open) g.querySelector('.guide-x').focus(); }
  mode(m) {
    const hub = m === 'hub'; $('#hero').hidden = !hub || !!this.heroGone; $('#hud').hidden = hub; $('#touch').hidden = hub || !IS_TOUCH; $('#tb-galaxy').hidden = hub; $('#tb-char').hidden = !hub; this.hideCard(); this.counts();
    document.body.classList.toggle('in-world', !hub);
  }
  heroAway() { if (this.heroGone) return; this.heroGone = true; const h = $('#hero'); h.classList.add('gone'); setTimeout(() => { h.hidden = true; }, 900); }
  toast(text, ms = 3200) {
    const box = $('#toasts'), t = el(`<div class="toast">${esc(text)}</div>`); box.appendChild(t); while (box.children.length > 3) box.firstChild.remove();
    setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 500); }, ms);
  }
  vignette(k) { const v = $('#vig'); v.style.transition = 'none'; v.style.opacity = Math.min(0.8, 0.25 + k); requestAnimationFrame(() => { v.style.transition = 'opacity .9s ease-out'; v.style.opacity = 0; }); }
  /* ---------- hub cards ---------- */
  planetCard(w) {
    const open = S.unlocked(w.id), done = S.done[w.id], c = $('#card'); this.heroAway();
    const glyphs = (S.glyphs[w.id] || []).length;
    c.innerHTML = `<button type="button" class="card-x" aria-label="Close">&#x2715;</button>
      <p class="card-k" style="color:${w.planet.atmo}">World ${w.id <= 12 ? w.id : '???'}${w.kind === 'hidden' ? ' · Hidden world' : ''}</p>
      <h2 class="card-t" style="--c:${w.planet.atmo}">${esc(w.name)}</h2>
      <p class="card-s">${esc(w.tag)}</p>
      <p class="card-m"><b>Mission:</b> ${esc(w.mission.text)}</p>
      <ul class="card-meta"><li>${done ? '✦ Harmony restored' : open ? 'Open' : `🔒 Unlocks at ${w.unlock} Harmony Shard${w.unlock > 1 ? 's' : ''}`}</li><li>Star Glyphs: ${glyphs} / 5</li></ul>
      <div class="card-b">${open ? `<button type="button" class="btn big" id="card-go">Land on ${esc(w.name)} &#x2192;</button>` : `<button type="button" class="btn big" disabled>Locked</button>`}</div>`;
    c.hidden = false; c.querySelector('.card-x').onclick = () => { this.hideCard(); this.app.hub.deselect(); };
    const go = $('#card-go'); if (go) go.onclick = () => { Sound.init(); this.app.enterWorld(w.id); };
  }
  coreCard(open) {
    const c = $('#card'); this.heroAway();
    c.innerHTML = `<button type="button" class="card-x" aria-label="Close">&#x2715;</button><p class="card-k" style="color:#ffb070">The center of everything</p><h2 class="card-t" style="--c:#ff8a3d">The Galactic Core</h2>
      <p class="card-s">${open ? 'The core is glowing gold. Something is waiting inside.' : 'A giant black hole. The Static seems to come from here. It won\u2019t open. Not yet.'}</p>
      <div class="card-b">${open ? '<button type="button" class="btn big" id="card-go">Fly into the core &#x2192;</button>' : ''}</div>`;
    c.hidden = false; c.querySelector('.card-x').onclick = () => this.hideCard();
    const go = $('#card-go'); if (go) go.onclick = () => { if (!S.found.includes(15)) S.found.push(15); S.save(); Sound.init(); this.app.enterWorld(15, true); };
  }
  hideCard() { const c = $('#card'); c.hidden = true; c.innerHTML = ''; }
  /* ---------- loading + world intro ---------- */
  loading(on, name, pct = 0, txt = '') { const l = $('#loading'); l.hidden = !on; if (name) $('#ld-name').textContent = name; $('#ld-fill').style.width = Math.round(pct * 100) + '%'; if (txt) $('#ld-txt').textContent = txt; }
  worldIntro(w) {
    $('#hud-wname').textContent = w.name; $('#hud-mtext').textContent = w.mission.text;
    const b = el(`<div class="wintro"><p>${w.kind === 'hidden' ? 'Hidden world discovered' : 'Now landing'}</p><h2 style="--c:${w.planet.atmo}">${esc(w.name)}</h2><p class="wi-s">${esc(w.tag)}</p></div>`);
    document.body.appendChild(b); setTimeout(() => b.classList.add('out'), 3400); setTimeout(() => b.remove(), 4400);
  }
  hud(world) {
    const p = world.player; if (!p) return;
    const k = Math.max(0, p.hp / p.maxHp); $('#hp-ring').setAttribute('stroke-dashoffset', (452.4 * (1 - k)).toFixed(1)); $('#hp-txt').textContent = Math.ceil(p.hp);
    const f = p.fuel / p.maxFuel; $('#fuel-ring').setAttribute('stroke-dasharray', `${(144.5 * f).toFixed(1)} 578`);
    const W = WEAPONS[p.weapon]; const wEl = $('#hud-weap'); wEl.querySelector('.wi').textContent = p.holstered ? '☮' : W.icon; wEl.querySelector('.wn').textContent = p.holstered ? 'Holstered' : W.name; wEl.style.setProperty('--c', '#' + W.color.toString(16).padStart(6, '0'));
    $('#hud-status').textContent = world.statusText();
    // compass
    const yaw = world.camYaw; const cmp = (pos, elx) => { if (!pos) { elx.style.opacity = 0; return; } const a = Math.atan2(pos.x - p.pos.x, pos.z - p.pos.z); let d = a - (yaw + Math.PI); while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; elx.style.opacity = 1; elx.style.left = (50 - Math.max(-1, Math.min(1, d / 1.4)) * 46) + '%'; };
    cmp(world.objective(), $('#cmp-obj')); cmp(S.has('map') ? world.nearestGlyph() : null, $('#cmp-gly'));
    $('#cmp-track').style.backgroundPositionX = (-(yaw / (Math.PI * 2)) * 800) + 'px';
    this.counts();
  }
  /* ---------- modals ---------- */
  modal(html, cls = '') { const m = $('#modal'), inn = m.querySelector('.modal-in'); inn.className = 'modal-in ' + cls; inn.innerHTML = html; m.hidden = false; document.body.classList.add('modal-open'); const x = inn.querySelector('[data-close]'); if (x) setTimeout(() => x.focus(), 50); inn.querySelectorAll('[data-close]').forEach(b => b.onclick = () => this.closeModal()); return inn; }
  closeModal() { $('#modal').hidden = true; document.body.classList.remove('modal-open'); }
  missionComplete(w, reward, next) {
    this.modal(`<p class="md-k">Harmony restored</p><h2 class="md-t">${esc(w.name)} is free!</h2>
      ${w.kind !== 'hidden' ? `<p class="md-big">✦ Harmony Shard ${S.shards.length} / 12</p>` : ''}
      ${reward ? `<p class="md-r">${esc(reward)}</p>` : ''}${next ? `<p class="md-n">A new world woke up: <b>${esc(next)}</b></p>` : ''}
      <div class="md-b"><button type="button" class="btn big" id="md-hub">Back to the galaxy</button><button type="button" class="btn ghost" data-close>Keep exploring</button></div>`);
    $('#md-hub').onclick = () => { this.closeModal(); this.app.backToHub(); };
  }
  glyph(w, idx, count) {
    this.modal(`<p class="md-k" style="color:#b08cff">Star Glyph ${count} / 5 · ${esc(w.name)}</p><h2 class="md-t">&#x25C6;</h2><p class="md-lore">\u201C${esc(w.glyphs[idx])}\u201D</p><div class="md-b"><button type="button" class="btn big" data-close>Keep going</button></div>`, 'glyph');
    if (count >= 5) setTimeout(() => this.toast(`All 5 Star Glyphs on ${w.name}! The galaxy noticed.`, 5000), 400);
  }
  win() {
    this.modal(`<p class="md-k">The end. And the beginning.</p><h2 class="md-t huge">YOU SAVED THE GALAXY</h2>${STORY.win.map(l => `<p class="md-lore">${esc(l)}</p>`).join('')}
      <p class="md-big">We all get along. There was never anything to fight for.</p><div class="md-b"><button type="button" class="btn big" id="md-hub">Return to a singing galaxy</button></div>`, 'win');
    $('#md-hub').onclick = () => { this.closeModal(); this.app.backToHub(); };
  }
  intro(onDone) {
    let i = 0; const lines = STORY.intro;
    const show = () => { const inn = this.modal(`<p class="md-k">${esc(STORY.title)}</p><p class="md-story">${esc(lines[i])}</p><div class="md-dots">${lines.map((_, k) => `<i class="${k === i ? 'on' : ''}"></i>`).join('')}</div><div class="md-b"><button type="button" class="btn big" id="md-next">${i < lines.length - 1 ? 'Next' : 'Choose your explorer'}</button><button type="button" class="btn ghost" id="md-skip">Skip</button></div>`, 'story'); inn.querySelector('#md-next').focus(); $('#md-next').onclick = () => { i++; if (i < lines.length) show(); else { this.closeModal(); onDone && onDone(); } }; $('#md-skip').onclick = () => { this.closeModal(); onDone && onDone(); }; };
    show();
  }
  /* ---------- character select + selfie ---------- */
  charSelect() {
    const cards = CHARACTERS.map(c => `<button type="button" class="ch ${S.char === c.id ? 'on' : ''}" data-id="${c.id}" style="--c:${c.color}"><span class="ch-av">${avatarSVG(c)}</span><b>${esc(c.name)}</b><small>${esc(c.blurb)}</small>${c.face ? '<em>Your face!</em>' : ''}</button>`).join('');
    const inn = this.modal(`<p class="md-k">Choose your explorer</p><h2 class="md-t">Who are you today?</h2><div class="chs">${cards}</div>
      <div class="selfie"><div class="sf-prev" id="sf-prev">${S.face ? `<img src="${S.face}" alt="Your face">` : '<span>No face yet</span>'}</div><div><p><b>Put your face on your explorer.</b> Works on Nova, Jax and Sage. Your photo never leaves this device.</p>
      <label class="btn" for="sf-in">Take or upload a selfie</label><input id="sf-in" type="file" accept="image/*" capture="user" hidden>${S.face ? '<button type="button" class="btn ghost" id="sf-clear">Remove face</button>' : ''}</div></div>
      <div class="md-b"><button type="button" class="btn big" data-close>Let\u2019s go</button></div>`, 'chars');
    inn.querySelectorAll('.ch').forEach(b => b.onclick = () => { S.char = b.dataset.id; S.save(); inn.querySelectorAll('.ch').forEach(x => x.classList.toggle('on', x === b)); Sound.ui(); });
    $('#sf-in').onchange = (e) => { const f = e.target.files && e.target.files[0]; if (f) this.makeFace(f); };
    const cl = $('#sf-clear'); if (cl) cl.onclick = () => { S.face = null; S.save(); this.charSelect(); };
  }
  makeFace(file) {
    const img = new Image(), url = URL.createObjectURL(file);
    img.onload = () => {
      const W = 256, H = 320, c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d');
      // center-crop on the upper middle of the photo (where faces usually are)
      const ar = W / H, iw = img.width, ih = img.height; let sw = iw * 0.62, sh = sw / ar; if (sh > ih * 0.8) { sh = ih * 0.8; sw = sh * ar; }
      const sx = (iw - sw) / 2, sy = Math.max(0, ih * 0.38 - sh / 2);
      g.save(); facePath(g, W, H); g.clip(); g.drawImage(img, sx, sy, sw, sh, 0, 0, W, H); g.restore();
      S.face = c.toDataURL('image/png'); S.save(); URL.revokeObjectURL(url);
      if (!CHARACTERS.find(x => x.id === S.char).face) S.char = 'nova';
      S.save(); this.charSelect(); this.toast('Face saved! Pick Nova, Jax or Sage to wear it.');
    };
    img.src = url;
  }
}
function avatarSVG(c) {
  const col = c.color;
  if (c.kind === 'hero') return `<svg viewBox="0 0 80 80" aria-hidden="true"><circle cx="40" cy="36" r="26" fill="#dfe9ff"/><circle cx="40" cy="36" r="19" fill="${col}"/><ellipse cx="40" cy="33" rx="15" ry="11" fill="#0a1a33" opacity=".85"/><ellipse cx="34" cy="30" rx="4" ry="3" fill="#fff" opacity=".7"/><rect x="24" y="60" width="32" height="16" rx="8" fill="#dfe9ff"/></svg>`;
  return `<svg viewBox="0 0 80 80" aria-hidden="true"><circle cx="40" cy="32" r="18" fill="#e0ac7e"/><path d="M22 30a18 18 0 0 1 36 0c0-6-8-14-18-14s-18 8-18 14z" fill="${col}"/><circle cx="34" cy="33" r="2.4" fill="#222"/><circle cx="46" cy="33" r="2.4" fill="#222"/><path d="M34 40q6 5 12 0" stroke="#222" stroke-width="2" fill="none"/><rect x="20" y="54" width="40" height="22" rx="10" fill="${col}"/></svg>`;
}
