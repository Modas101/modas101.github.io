/* Archive opening: one clock, rendered from time T. Skip with Esc. */
(() => {
  'use strict';
  const root = document.documentElement;
  const intro = document.getElementById('archive-intro');
  const stage = document.getElementById('archive-stage');
  const skipBtn = document.getElementById('archive-skip');
  const soundBtn = document.getElementById('archive-sound');
  const replay = document.getElementById('replay-intro');
  const page = document.querySelector('.page-shell');
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const wide = matchMedia('(min-width: 701px)');
  if (!intro || !stage) return;

  const P = { bg: '#d2cdb8', ink: '#47443b', dim: '#7d7868', faint: '#b4ae98' };
  const FONT = 'Space, Arial, sans-serif';
  const CUES = { Boot: 0, Isles: 3, Tivelet: 8.5, Checker: 14.5, Clear: 18.5, Hero: 21 };
  const END = CUES.Hero + 0.6;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, p) => a + (b - a) * p;
  const E = {
    outExpo: (x) => (x === 1 ? 1 : 1 - Math.pow(2, -10 * x)),
    inOutCubic: (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2),
    outBack: (x) => { const c = 1.70158; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); },
  };
  const prog = (T, s, e, f) => f(clamp((T - s) / (e - s), 0, 1));
  const M = {
    enter: (T, s, e) => prog(T, s, e, E.outExpo),
    draw: (T, s, e) => prog(T, s, e, E.inOutCubic),
    pop: (T, s, e) => prog(T, s, e, E.outBack),
  };
  const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const GLYPHS = '/\\_-=+:.<>[]#01234567ABCDEF';
  const hash = (a, b) => { let h = (a * 374761393 + b * 668265263) | 0; h = (h ^ (h >>> 13)) * 1274126177; return (h ^ (h >>> 16)) >>> 0; };

  function decode(text, T, start, dur = 0.6) {
    if (T < start) return '';
    const n = text.length, f = Math.floor(T * 30);
    let out = '';
    for (let i = 0; i < n; i++) {
      const reveal = start + dur * (i / Math.max(1, n - 1));
      const ch = text[i];
      if (T >= reveal || ch === ' ') out += ch;
      else if (T >= reveal - 0.25) out += GLYPHS[hash(i, f) % GLYPHS.length];
      else break;
    }
    return out;
  }
  const D = (text, T, at, dur, style = '') => `<span style="white-space:pre;${style}">${esc(decode(text, T, at, dur))}</span>`;
  const SMALL = `font-family:${FONT};font-weight:600;font-size:18px;letter-spacing:.18em;color:${P.ink};`;
  const corners = (size = 10) => [[0, 0], [1, 0], [0, 1], [1, 1]].map(([x, y]) =>
    `<span style="position:absolute;width:${size}px;height:${size}px;background:${P.ink};${x ? 'right' : 'left'}:${-size / 2}px;${y ? 'bottom' : 'top'}:${-size / 2}px"></span>`).join('');

  function box(T, at, x, y, w, h, title, inner) {
    const hx = M.draw(T, at, at + 0.45), vy = M.draw(T, at + 0.25, at + 0.7);
    if (T < at) return '';
    return `<div style="position:absolute;left:${x}px;top:${y}px;width:${w}px;height:${h}px">
      <div style="position:absolute;left:0;top:0;height:1px;width:${hx * 100}%;background:${P.ink}"></div>
      <div style="position:absolute;right:0;bottom:0;height:1px;width:${hx * 100}%;background:${P.ink}"></div>
      <div style="position:absolute;left:0;bottom:0;width:1px;height:${vy * 100}%;background:${P.ink}"></div>
      <div style="position:absolute;right:0;top:0;width:1px;height:${vy * 100}%;background:${P.ink}"></div>
      <div style="opacity:${vy}">${corners(8)}</div>
      <div style="position:absolute;left:0;right:0;top:0;height:52px;background:${P.ink};transform-origin:0 50%;transform:scaleX(${hx});display:flex;align-items:center;padding:0 24px">${D(title, T, at + 0.3, 0.4, SMALL + `color:${P.bg}`)}</div>
      ${inner}</div>`;
  }

  function meta(T, at, rows) {
    return `<div style="position:absolute;left:140px;top:680px;width:760px;display:flex;flex-direction:column">${rows.map(([k, v], i) => {
      const a = at + i * 0.18;
      return `<div style="display:flex;gap:30px;padding:16px 0;border-top:1px solid ${P.faint};opacity:${T < a ? 0 : 1}">
        ${D(k, T, a, 0.25, SMALL + `font-size:16px;color:${P.dim};width:170px`)}
        ${D(v, T, a + 0.1, 0.45, `font-family:${FONT};font-size:22px;color:${P.ink};letter-spacing:.02em`)}</div>`;
    }).join('')}</div>`;
  }

  function entry(T, start, end, num, title, size, rows, inner) {
    if (T < start - 0.05 || T > end + 0.05) return '';
    const l = T - start, out = M.draw(T, end - 0.45, end - 0.05);
    const glitch = out > 0 && out < 1 ? ((hash(Math.floor(T * 40), 7) % 3) - 1) * 14 : 0;
    const n = M.enter(l, 0.1, 0.8);
    return `<div style="position:absolute;inset:0;opacity:${1 - out};transform:translateX(${glitch}px) scaleY(${1 - out * 0.04})">
      <div style="position:absolute;left:128px;top:150px;font-family:${FONT};font-size:300px;line-height:1;color:transparent;-webkit-text-stroke:1.5px ${P.faint};opacity:${n};transform:translateY(${(1 - n) * 30}px);font-variant-numeric:tabular-nums">${num}</div>
      <div style="position:absolute;left:140px;top:470px;display:flex;flex-direction:column;gap:18px">
        ${D(`ENTRY ${num} / 03`, T, start + 0.25, 0.3, SMALL + `color:${P.dim}`)}
        ${D(title, T, start + 0.35, 0.7, `font-family:${FONT};font-weight:600;font-size:${size}px;line-height:1;letter-spacing:.03em;color:${P.ink}`)}
      </div>
      ${meta(T, start + 0.9, rows)}${inner}</div>`;
  }

  function chrome(T) {
    const b = { x: 360, y: 400, w: 1200, h: 280 }, f = { x: 60, y: 60, w: 1800, h: 960 };
    const lineIn = M.draw(T, 0.1, 0.6), openY = M.draw(T, 0.6, 1.0), grow = M.draw(T, 2.55, 3.05);
    const r = { x: lerp(b.x, f.x, grow), w: lerp(b.w, f.w, grow), y: lerp(b.y + b.h / 2 - (b.h / 2) * openY, f.y, grow), h: lerp(b.h * openY, f.h, grow) };
    const w = r.w * (T < 0.6 ? lineIn : 1);
    const n = T < CUES.Tivelet ? 1 : T < CUES.Checker ? 2 : 3;
    const on = M.enter(T, 3.0, 3.6);
    const foot = on * (1 - M.draw(T, CUES.Clear - 0.2, CUES.Clear + 0.2));
    return `<div style="position:absolute;left:${r.x + (r.w - w) / 2}px;top:${r.y}px;width:${w}px;height:${Math.max(1, r.h)}px;border:1px solid ${P.ink};box-sizing:border-box;border-bottom-width:${r.h > 2 ? 1 : 0}px"><div style="opacity:${openY}">${corners()}</div></div>
      <div style="position:absolute;left:100px;right:100px;top:88px;display:flex;justify-content:space-between;align-items:center;opacity:${on}">
        <div style="display:flex;align-items:center;gap:14px"><span style="width:14px;height:14px;background:${P.ink}"></span><span style="${SMALL}">ARCHIVE — KENNY LIN</span></div>
        <span style="${SMALL}color:${P.dim};font-variant-numeric:tabular-nums">REC T+${Math.max(0, T).toFixed(1).padStart(4, '0')}</span></div>
      <div style="position:absolute;left:100px;right:100px;top:966px;display:flex;justify-content:space-between;align-items:center;opacity:${foot}">
        <span style="${SMALL}font-size:15px;color:${P.dim}">SELECTED WORK · SEPTEMBER 2026</span>
        <div style="display:flex;align-items:center;gap:10px">${[1, 2, 3].map((i) => `<span style="width:56px;height:6px;box-sizing:border-box;border:1px solid ${P.ink};background:${i <= n ? P.ink : 'transparent'}"></span>`).join('')}
        <span style="${SMALL}font-size:15px;margin-left:8px;font-variant-numeric:tabular-nums">0${n} / 03</span></div></div>`;
  }

  function boot(T) {
    if (T > 3.05) return '';
    const fill = M.draw(T, 1.2, 2.4), out = M.draw(T, 2.45, 2.65), granted = T > 2.4;
    const sq = Array.from({ length: 40 }, (_, i) => `<span style="width:20px;height:12px;box-sizing:border-box;border:1px solid ${P.ink};background:${i / 40 < fill ? P.ink : 'transparent'}"></span>`).join('');
    return `<div style="position:absolute;left:360px;top:400px;width:1200px;height:280px;display:flex;flex-direction:column;justify-content:center;gap:22px;padding:0 64px;box-sizing:border-box;opacity:${1 - out}">
      ${D('PERSONNEL FILE // KENNY LIN', T, 1.0, 0.6, SMALL + 'font-size:40px;letter-spacing:.16em')}
      ${D('DEVELOPER & GAME MAKER · VANCOUVER, BC', T, 1.35, 0.55, SMALL + `color:${P.dim}`)}
      <div style="display:flex;align-items:center;gap:6px;opacity:${T > 1.15 ? 1 : 0}">${sq}
        <span style="${SMALL}font-size:16px;margin-left:14px;font-variant-numeric:tabular-nums;opacity:${granted && Math.floor(T * 8) % 2 ? 0.3 : 1}">${granted ? 'ACCESS GRANTED' : String(Math.round(fill * 100)).padStart(3, '0') + '%'}</span></div></div>`;
  }

  function isles(T) {
    const s = CUES.Isles, l = T - s, count = M.enter(l, 1.3, 3.0);
    const ticks = Array.from({ length: 52 }, (_, i) => `<span style="width:3px;height:${i % 13 === 0 ? 70 : 44}px;background:${i / 52 < count ? P.ink : P.faint}"></span>`).join('');
    return entry(T, s, CUES.Tivelet, '01', 'MY FLOATING ISLES', 80, [['PLATFORM', 'Roblox'], ['GENRE', 'Multiplayer island building'], ['WORK', 'Persistent saves · migrations · onboarding']],
      box(T, s + 0.5, 1060, 240, 700, 640, 'MONTHLY ACTIVE USERS',
        `<div style="position:absolute;left:40px;right:40px;top:130px;font-family:${FONT};font-size:150px;line-height:1;letter-spacing:-.02em;color:${P.ink};font-variant-numeric:tabular-nums;opacity:${l > 1.2 ? 1 : 0}">${Math.round(count * 260000).toLocaleString('en-US')}${l > 3 ? '+' : ''}</div>
        <div style="position:absolute;left:40px;right:40px;top:360px;height:70px;display:flex;justify-content:space-between;align-items:flex-end">${ticks}</div>
        ${D('SEPTEMBER 2026 · HISTORICAL FIGURE', T, s + 3.0, 0.5, SMALL + `font-size:15px;color:${P.dim};position:absolute;left:40px;top:500px`)}
        ${D('ISLAND-SAVE SIZE −95% VIA COMPRESSION', T, s + 3.3, 0.5, SMALL + 'font-size:15px;position:absolute;left:40px;top:540px')}`));
  }

  function tivelet(T) {
    const s = CUES.Tivelet, l = T - s, COLS = 10, ROWS = 7, KEEP = 3, C = 50, G = 8;
    const sweep = M.draw(l, 2.0, 3.4), scanX = lerp(COLS, KEEP, sweep);
    const remaining = l < 2 ? 100 : Math.round(lerp(100, 30, sweep)), done = l > 3.55;
    let cells = '';
    for (let i = 0; i < COLS * ROWS; i++) {
      const c = i % COLS, r = Math.floor(i / COLS);
      const pin = M.pop(l, 0.8 + (c + r) * 0.025, 1.05 + (c + r) * 0.025), gone = c >= KEEP && c >= scanX;
      cells += `<span style="position:absolute;left:${c * (C + G)}px;top:${r * (C + G)}px;width:${C}px;height:${C}px;box-sizing:border-box;border:1px solid ${gone ? P.faint : P.ink};background:${gone ? 'transparent' : P.ink};transform:scale(${gone ? 0.6 : pin})"></span>`;
    }
    if (l > 2 && l < 3.45) cells += `<span style="position:absolute;left:${scanX * (C + G) - 4}px;top:-16px;bottom:-16px;width:2px;background:${P.ink}"></span>`;
    return entry(T, s, CUES.Checker, '02', 'TIVELET', 104, [['PLATFORM', 'Roblox'], ['GENRE', 'Souls-like RPG · voxel world'], ['SYSTEMS', 'Culling · greedy meshing · prediction']],
      box(T, s + 0.5, 1060, 240, 700, 640, 'MEMORY FOOTPRINT',
        `<div style="position:absolute;left:40px;top:96px;width:${COLS * (C + G) - G}px;height:${ROWS * (C + G) - G}px">${cells}</div>
        <div style="position:absolute;left:40px;right:40px;top:520px;display:flex;align-items:baseline;justify-content:space-between">
          <span style="font-family:${FONT};font-size:92px;line-height:1;color:${P.ink};font-variant-numeric:tabular-nums">${done ? esc(decode('−70%', T, s + 3.55, 0.3)) : remaining + '%'}</span>
          ${D(done ? 'LESS MEMORY' : 'IN USE', T, done ? s + 3.6 : s + 1.0, 0.35, SMALL + `color:${P.dim}`)}</div>`));
  }

  function checker(T) {
    const s = CUES.Checker, l = T - s, count = M.enter(l, 2.0, 2.9);
    const log = [['> scan outbound trades', 0.6], ['  outdated values flagged', 1.0], ['> refresh only what changed', 1.35], ['  cached · within api limits', 1.7]];
    return entry(T, s, CUES.Clear, '03', 'OUTBOUND TRADE CHECKER', 60, [['LANGUAGE', 'Python'], ['TARGETS', 'Windows + Linux'], ['FOCUS', 'API limits · caching · selective refresh']],
      box(T, s + 0.4, 1060, 240, 700, 640, 'SESSION LOG',
        `<div style="position:absolute;left:40px;top:100px;display:flex;flex-direction:column;gap:14px">${log.map(([line, at]) => D(line, T, s + at, 0.3, `font-family:${FONT};font-size:24px;color:${line[0] === '>' ? P.ink : P.dim}`)).join('')}</div>
        <div style="position:absolute;left:40px;right:40px;top:420px;border-top:1px solid ${P.faint};padding-top:30px;display:flex;align-items:baseline;justify-content:space-between;opacity:${l > 1.95 ? 1 : 0}">
          <span style="font-family:${FONT};font-size:130px;line-height:1;color:${P.ink};font-variant-numeric:tabular-nums">${Math.round(count * 100)}${l > 2.9 ? '+' : ''}</span>
          <span style="${SMALL}color:${P.dim}">USERS</span></div>`));
  }

  function clear(T) {
    const s = CUES.Clear, l = T - s;
    if (l < 0 || T > CUES.Hero + 0.05) return '';
    const out = M.draw(T, CUES.Hero - 0.25, CUES.Hero);
    const rows = [['01', 'MY FLOATING ISLES', '260K+ MAU'], ['02', 'TIVELET', '−70% MEMORY'], ['03', 'OUTBOUND TRADE CHECKER', '100+ USERS']];
    return `<div style="position:absolute;left:360px;top:300px;width:1200px;opacity:${1 - out}">
      ${D('FILE COMPLETE', T, s + 0.1, 0.45, `font-family:${FONT};font-weight:600;font-size:72px;letter-spacing:.06em;color:${P.ink}`)}
      <div style="margin-top:40px;display:flex;flex-direction:column">${rows.map(([n, t, v], i) => {
        const a = s + 0.45 + i * 0.2;
        return `<div style="display:flex;gap:34px;padding:20px 0;border-top:1px solid ${P.ink};opacity:${T < a ? 0 : 1};font-family:${FONT};font-size:26px;color:${P.ink}">
          ${D(n, T, a, 0.1, `color:${P.dim};width:40px`)}${D(t, T, a + 0.05, 0.35, 'flex:1;letter-spacing:.04em')}${D(v, T, a + 0.2, 0.3, 'font-weight:600;letter-spacing:.06em')}</div>`;
      }).join('')}</div>
      <div style="border-top:1px solid ${P.ink};padding-top:24px;${SMALL}color:${P.dim};opacity:${l > 1.3 ? (Math.floor(T * 6) % 2 ? 0.4 : 1) : 0}">OPENING PORTFOLIO …</div></div>`;
  }

  function render(T) {
    stage.innerHTML = chrome(T) + boot(T) + isles(T) + tivelet(T) + checker(T) + clear(T);
    const H = CUES.Hero;
    const sy = lerp(1, 0.003, M.draw(T, H, H + 0.3)), sx = lerp(1, 0, M.draw(T, H + 0.3, H + 0.55));
    intro.style.transform = T > H ? `scale(${sx}, ${sy})` : '';
    intro.style.backgroundColor = T > H + 0.25 && T < H + 0.55 ? '#efeadb' : '';
  }

  function fit() {
    const s = Math.min(innerWidth / 1920, innerHeight / 1080);
    stage.style.transform = `translate(-50%, -50%) scale(${s})`;
  }

  let active = false, raf = 0, t0 = 0, elapsed = 0, heroDone = false, audio = null, soundOn = true, blocked = false;
  const now = () => performance.now() / 1000;
  const T = () => (active ? now() - t0 : elapsed);

  function heroEntrance(lead) {
    if (motion.matches || heroDone) return;
    heroDone = true;
    document.dispatchEvent(new CustomEvent('intro:hero', { detail: { lead: Math.max(0, lead) } }));
    const ease = 'cubic-bezier(.22,1,.36,1)';
    const go = (sel, frames, delay, duration, extra = {}) => {
      const el = document.querySelector(sel);
      if (!el) return;
      try { el.animate(frames, { delay: (lead + delay) * 1000, duration: duration * 1000, easing: ease, fill: 'backwards', ...extra }); } catch (_) {}
    };
    const up = (d) => [{ opacity: 0, transform: `translateY(${d}px)` }, { opacity: 1, transform: 'none' }];
    go('.name-line', [{ opacity: 0 }, { opacity: 1 }], 0, 0.25);
    go('.name-line', [{ transform: 'rotate(-5deg) skewX(-14deg) scale(0)' }, { transform: 'rotate(-5deg) skewX(-14deg) scale(1)' }], 0, 0.75, { pseudoElement: '::before' });
    go('.hello-line', up(25), 0.35, 0.8);
    go('.hero-print', [{ opacity: 0, transform: 'rotate(3deg) scale(.96)' }, { opacity: 1, transform: 'rotate(9deg) scale(1)' }], 0.5, 1.0);
    go('.site-header', up(-12), 0.7, 0.7);
    go('.hero-topline', [{ opacity: 0 }, { opacity: 1 }], 0.8, 0.7);
    go('.hero-bottom', up(18), 1.0, 0.8);
    go('.hero-footnote', [{ opacity: 0 }, { opacity: 1 }], 1.0, 0.8);
  }

  function tick() {
    const t = T();
    if (t >= CUES.Hero) heroEntrance(CUES.Hero + 0.6 - t);
    if (t >= END) { finish(); return; }
    render(t);
    raf = requestAnimationFrame(tick);
  }

  function label() {
    soundBtn.setAttribute('aria-pressed', String(soundOn && !blocked));
    soundBtn.lastChild.textContent = !soundOn ? 'Sound off' : blocked ? 'Click for sound' : 'Sound on';
  }
  function setSound(on) {
    soundOn = on;
    if (on) {
      if (!audio) { audio = new Audio('assets/audio/intro-archive.wav'); audio.preload = 'auto'; }
      try { audio.currentTime = T(); } catch (_) {}
      audio.volume = 0.8;
      audio.play().then(() => { blocked = false; label(); }).catch(() => { blocked = true; label(); });
    } else if (audio) audio.pause();
    label();
  }
  // Browsers block audio until the visitor interacts; start it on the first gesture.
  const unlock = (e) => {
    if (!active || !soundOn || !blocked) return;
    if (e && (e.target === skipBtn || e.target === soundBtn || soundBtn.contains(e.target))) return;
    setSound(true);
  };
  ['pointerdown', 'keydown', 'wheel', 'touchstart'].forEach((ev) => addEventListener(ev, unlock, { passive: true }));

  function open() {
    if (motion.matches || !wide.matches) { finish(); return; }
    clearTimeout(window.introFailSafe);
    root.classList.add('intro-pending');
    intro.setAttribute('aria-hidden', 'false');
    page.inert = true;
    heroDone = false;
    elapsed = 0; t0 = now(); active = true;
    fit();
    try { sessionStorage.setItem('kenny-intro-seen', '1'); } catch (_) {}
    skipBtn.focus({ preventScroll: true });
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(tick);
    if (soundOn) setSound(true); else label();
  }

  function finish() {
    const wasActive = active || root.classList.contains('intro-pending');
    active = false;
    cancelAnimationFrame(raf);
    clearTimeout(window.introFailSafe);
    if (audio) { audio.pause(); }
    root.classList.remove('intro-pending');
    intro.setAttribute('aria-hidden', 'true');
    intro.style.transform = '';
    page.inert = false;
    if (wasActive) heroEntrance(0);
    if (intro.contains(document.activeElement)) document.querySelector('.wordmark').focus({ preventScroll: true });
  }

  skipBtn.addEventListener('click', finish);
  soundBtn.addEventListener('click', () => { if (soundOn && blocked) setSound(true); else setSound(!soundOn); });
  if (replay) {
    replay.hidden = motion.matches || !wide.matches;
    replay.addEventListener('click', () => { if (audio) audio.pause(); open(); if (soundOn) setSound(true); });
  }
  document.addEventListener('keydown', (e) => {
    if (!active) return;
    if (e.key === 'Escape') { e.preventDefault(); finish(); }
    else if (e.key === 'Tab') {
      e.preventDefault();
      (document.activeElement === skipBtn ? soundBtn : skipBtn).focus();
    }
  });
  document.addEventListener('visibilitychange', () => {
    if (!active) return;
    if (document.hidden) { elapsed = T(); cancelAnimationFrame(raf); if (audio) audio.pause(); }
    else { t0 = now() - elapsed; raf = requestAnimationFrame(tick); if (soundOn) setSound(true); }
  });
  addEventListener('resize', fit);
  addEventListener('pagehide', finish);
  if (motion.addEventListener) motion.addEventListener('change', () => { if (motion.matches) finish(); });

  if (root.classList.contains('intro-pending')) open();
})();
