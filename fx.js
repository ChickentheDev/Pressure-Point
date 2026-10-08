// Pressure-Point v0.56 graphics + effects (Brad, graphics division).
// Draw-side only: this file reads game state (players, enemies, bullets, state, settings) and never
// changes gameplay values. Everything it needs to know (hits, kills, shots, dashes) it detects by
// comparing what it saw last frame, so game.js only needs a few hook calls, all marked "[brad-fx]".
// Sprite sheets come from tools/gen_sprites.py (assets/sprites/). Art is drawn at 2x, nearest-neighbour.
(function(){
  'use strict';
  const PX = 2;                                    // screen px per art px
  // fw/fh = frame size in art px, ax/ay = body centre in art px (lines the body up with the hitbox)
  const SHEETS = {
    p1_down: {src:'assets/sprites/player_p1_down.png', fw:16, fh:21, n:4, ax:8, ay:10.5},
    p1_up:   {src:'assets/sprites/player_p1_up.png',   fw:16, fh:21, n:4, ax:8, ay:10.5},
    p1_side: {src:'assets/sprites/player_p1_side.png', fw:16, fh:21, n:4, ax:8, ay:10.5},
    p2_down: {src:'assets/sprites/player_p2_down.png', fw:16, fh:21, n:4, ax:8, ay:10.5},
    p2_up:   {src:'assets/sprites/player_p2_up.png',   fw:16, fh:21, n:4, ax:8, ay:10.5},
    p2_side: {src:'assets/sprites/player_p2_side.png', fw:16, fh:21, n:4, ax:8, ay:10.5},
    // v0.56 enemy set: raptor runner, dino-head bruiser, mosquito spitter, sandworm boss (frames 4-5 = emerging)
    runner:   {src:'assets/sprites/enemy_runner.png',   fw:20, fh:20, n:4, ax:9,  ay:10,  fps:12},
    bruiser:  {src:'assets/sprites/enemy_bruiser.png',  fw:26, fh:26, n:4, ax:12, ay:12,  fps:6},
    spitter:  {src:'assets/sprites/enemy_spitter.png',  fw:22, fh:22, n:4, ax:13, ay:12,  fps:10},
    boss:     {src:'assets/sprites/enemy_sandworm.png', fw:52, fh:56, n:6, ax:27, ay:30,  fps:4, loop:4, faceLeft:true},
    tree:     {src:'assets/sprites/tree.png',           fw:26, fh:32, n:1, ax:13, ay:20},
    decals:   {src:'assets/sprites/ground_decals.png',  fw:16, fh:16, n:8, ax:8,  ay:8},
  };
  const imgs = {};
  for(const [k, s] of Object.entries(SHEETS)){ const im = new Image(); im.src = s.src; imgs[k] = im; }
  const ready = k => { const im = imgs[k]; return im && im.complete && im.naturalWidth > 0; };

  // white / tinted copies of a sheet for hit flashes and the dash trail (canvas only, never read back)
  const tintCache = {};
  function tinted(k, color){
    const id = k + color;
    if(tintCache[id]) return tintCache[id];
    const im = imgs[k], c = document.createElement('canvas');
    c.width = im.naturalWidth; c.height = im.naturalHeight;
    const g = c.getContext('2d');
    g.drawImage(im, 0, 0); g.globalCompositeOperation = 'source-in'; g.fillStyle = color; g.fillRect(0, 0, c.width, c.height);
    return (tintCache[id] = c);
  }
  function drawFrame(k, frame, opts){
    const s = SHEETS[k];
    const f = ((frame % s.n) + s.n) % s.n;
    const dw = s.fw * PX, dh = s.fh * PX, ox = -s.ax * PX, oy = -s.ay * PX;
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    if(opts && opts.alpha != null) ctx.globalAlpha *= opts.alpha;
    if(opts && opts.flipX) ctx.scale(-1, 1);
    const src = opts && opts.tint ? tinted(k, opts.tint) : imgs[k];
    ctx.drawImage(src, f * s.fw, 0, s.fw, s.fh, ox, oy, dw, dh);
    if(opts && opts.flash > 0){
      ctx.globalAlpha = Math.min(1, opts.flash);
      ctx.drawImage(tinted(k, '#ffffff'), f * s.fw, 0, s.fw, s.fh, ox, oy, dw, dh);
    }
    ctx.restore();
  }

  // ---- particles (own pool, squares for a pixel look; capped and throttled in big waves) ----------
  const parts = [];
  const glowCache = {};
  function glowSprite(color){
    if(glowCache[color]) return glowCache[color];
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, color); gr.addColorStop(0.35, color + '88'); gr.addColorStop(1, color + '00');
    g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
    return (glowCache[color] = c);
  }
  function maxParts(){ return settings.graphics === 'high' || settings.graphics === 'custom' ? 700 : 260; }
  // fewer particles per event as the crowd grows, so big waves stay smooth
  function density(){ const n = enemies.length; return n > 140 ? 0.25 : n > 80 ? 0.45 : n > 40 ? 0.7 : 1; }
  let budget = 0;                                  // particle spawns left this frame
  function emit(p){
    if(budget <= 0 || parts.length >= maxParts()) return;
    budget--; p.max = p.life; parts.push(p);
  }
  function burst(x, y, count, o){
    if(!settings.particleFx) return;
    const n = Math.max(1, Math.round(count * density()));
    for(let i = 0; i < n; i++){
      const a = (o.dir != null ? o.dir + (Math.random() - 0.5) * (o.spread || 1) : Math.random() * Math.PI * 2);
      const sp = (o.speed || 120) * (0.4 + Math.random() * 0.8);
      emit({x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - (o.up || 0), life: (o.life || 0.4) * (0.6 + Math.random() * 0.6),
        size: (o.size || 3) * (0.6 + Math.random() * 0.7), color: Array.isArray(o.color) ? o.color[(Math.random() * o.color.length) | 0] : o.color,
        drag: o.drag || 4, grav: o.grav || 0, add: !!o.add, kind: o.kind || 'sq'});
    }
  }
  const rings = [];                                // death shockwaves
  const flashes = [];                              // muzzle flashes
  const ghosts = [];                               // dash after-images
  const arcs = [];                                 // shock lightning between enemies

  // ---- event detection (compare with last frame) ------------------------------------------------
  const seenEnemies = new Map();                   // enemy -> {x,y,flash,color,id,r}
  const seenPlayers = new WeakMap();               // player -> {ammo,kick,dash}
  const shockT = new WeakMap();                    // enemy -> seconds of shock glow left
  const seeds = new WeakMap();
  const bornAt = new WeakMap();                    // boss -> animTime it was first drawn (emerge frames)
  const views = new WeakMap();                     // player -> last drawn sheet/frame (for the dash trail)
  const seed = o => { let s = seeds.get(o); if(s == null){ s = Math.random() * 8; seeds.set(o, s); } return s; };
  let lastNow = performance.now();
  let fdt = 0;
  const ENEMY_COLORS = { runner:['#8a6670', '#b08f96', '#5e4048'], bruiser:['#6f5442', '#d9b54a', '#8f725c'], spitter:['#2e8a72', '#7f6048', '#9cff6b'], overlord:['#86604a', '#e8e0cc', '#5fd068'] };

  function ownerWeapon(id){ const p = players.find(q => q.id === id); return p ? getWeaponFor(p) : null; }
  function gunTip(p){
    const w = getWeaponFor(p), len = weaponHandLength[w.id] || 26;
    const d = 12 + len * 0.85 - p.kick * 30;
    return {x: p.x + Math.cos(p.angle) * d, y: p.y + 4 + Math.sin(p.angle) * d, w};
  }

  function frame(){
    const now = performance.now();
    fdt = Math.min(0.05, Math.max(0, (now - lastNow) / 1000));
    lastNow = now;
    if(state.paused || state.phase === 'menu') fdt = 0;
    budget = Math.round(140 * density());
    if(state.phase === 'menu'){ parts.length = rings.length = flashes.length = ghosts.length = arcs.length = 0; seenEnemies.clear(); return; }
    // enemies: hits (hitFlash rising), kills (gone from the list)
    const alive = new Set();
    for(const e of enemies){
      alive.add(e);
      const prev = seenEnemies.get(e);
      const fl = e.hitFlash || 0;
      if(prev && fl > prev.flash + 0.02){
        const w = ownerWeapon(e.lastHitBy);
        const el = w && w.elemental;
        burst(e.x, e.y, 5, {color: el === 'fire' ? ['#ffd166', '#ff8c42'] : el === 'ice' ? ['#e8fbff', '#6cd6ff'] : el === 'shock' ? ['#e6d2ff', '#b27bff'] : ['#ffffff', '#ffd166'], speed: 160, life: 0.22, size: 2.6, add: true});
        if(el === 'shock'){
          shockT.set(e, 0.45);
          const near = enemies.find(o => o !== e && Math.hypot(o.x - e.x, o.y - e.y) < 80);
          if(near){ shockT.set(near, 0.45); arcs.push({a: e, b: near, life: 0.18}); }
        }
      }
      if(prev){ prev.x = e.x; prev.y = e.y; prev.flash = fl; }
      else seenEnemies.set(e, {x: e.x, y: e.y, flash: fl, id: e.id, r: e.r, boss: !!e.isBoss});
    }
    let gone = 0; for(const e of seenEnemies.keys()) if(!alive.has(e)) gone++;
    for(const [e, s] of seenEnemies){
      if(alive.has(e)) continue;
      seenEnemies.delete(e);
      if(gone > 40 || state.phase !== 'wave') continue;        // a mass clear (reset), not kills
      const cols = ENEMY_COLORS[s.id] || ['#ff8a5c', '#ffd166'];
      const big = s.boss ? 4 : s.r / 12;
      burst(s.x, s.y, 10 * big, {color: cols, speed: 150 * Math.sqrt(big), life: 0.55, size: 3.4 * Math.sqrt(big), drag: 3.5, grav: 240, up: 60});
      burst(s.x, s.y, 4 * big, {color: ['#2a2f3a', '#3a4150'], speed: 40, life: 0.7, size: 6 * Math.sqrt(big), drag: 2, grav: -30, kind: 'smoke'});
      burst(s.x, s.y, 6, {color: ['#ffffff', '#fff3c4'], speed: 220, life: 0.18, size: 2.2, add: true});
      if(rings.length < 24) rings.push({x: s.x, y: s.y, r: s.r * 0.6, max: s.r * (s.boss ? 4 : 2.4), life: 0.32, t: 0, color: cols[0]});
    }
    // players: shots (ammo dropped / kick rose) and dashes
    for(const p of players){
      if(p.dead) continue;
      const prev = seenPlayers.get(p);
      if(prev && state.phase === 'wave'){
        const shot = p.ammoInMag < prev.ammo || p.kick > prev.kick + 0.005;
        if(shot && getWeaponFor(p) === prev.weapon){
          const tip = gunTip(p);
          if(!tip.w.melee){
            if(flashes.length < 24) flashes.push({x: tip.x, y: tip.y, a: p.angle, life: 0.07, max: 0.07, color: tip.w.color || '#ffd166', big: tip.w.type === 'heavy' || tip.w.type === 'shotgun' || tip.w.id === 'rail'});
            if(Math.random() < 0.6) burst(tip.x, tip.y, 2, {dir: p.angle, spread: 0.9, color: [tip.w.color || '#ffd166', '#ffffff'], speed: 200, life: 0.12, size: 2, add: true});
          }
        }
      }
      if(p.dashTimer > 0 && state.phase === 'wave' && fdt > 0){
        const v = views.get(p) || {k: 'p1_side', f: 0, flip: false};
        if(ghosts.length < 30) ghosts.push({x: p.x, y: p.y, k: v.k, f: v.f, flip: v.flip, life: 0.28, max: 0.28});
        burst(p.x, p.y + 14, 2, {color: ['#5fb0ff', '#9ffcff'], speed: 40, life: 0.3, size: 2.5, add: true});
      }
      seenPlayers.set(p, {ammo: p.ammoInMag, kick: p.kick, weapon: getWeaponFor(p)});
    }
    // ambient status particles (throttled per enemy)
    if(settings.particleFx && fdt > 0){
      const rate = density();
      for(const e of enemies){
        const st = e.status; if(!st) continue;
        if(st.burn > 0 && Math.random() < 14 * fdt * rate) burst(e.x + (Math.random() - 0.5) * e.r, e.y - e.r * 0.3, 1, {dir: -Math.PI / 2, spread: 0.6, color: ['#ffd166', '#ff8c42', '#ff5d2a'], speed: 50, life: 0.5, size: 2.6, drag: 1, grav: -40, add: true});
        if(st.slow > 0 && Math.random() < 6 * fdt * rate) burst(e.x + (Math.random() - 0.5) * e.r * 1.6, e.y + (Math.random() - 0.5) * e.r, 1, {color: ['#e8fbff', '#bff0ff'], speed: 10, life: 0.6, size: 2, drag: 1, grav: 30});
      }
    }
    // step
    for(let i = parts.length - 1; i >= 0; i--){
      const q = parts[i]; q.life -= fdt;
      if(q.life <= 0){ parts[i] = parts[parts.length - 1]; parts.pop(); continue; }
      const k = Math.max(0, 1 - q.drag * fdt);
      q.vx *= k; q.vy = q.vy * k + q.grav * fdt; q.x += q.vx * fdt; q.y += q.vy * fdt;
    }
    for(const list of [rings, flashes, ghosts, arcs]){
      for(let i = list.length - 1; i >= 0; i--){ list[i].life -= fdt; if(list[i].t != null) list[i].t += fdt; if(list[i].life <= 0) list.splice(i, 1); }
    }
  }

  // ---- drawing hooks -------------------------------------------------------------------------------
  const VIEW = { playerDown:'down', playerUp:'up', playerSide:'side' };
  // returns true when it drew the player (otherwise game.js falls back to the original PNGs)
  function drawPlayer(p, i, key, flipX, flash, moving){
    const k = (i === 0 ? 'p1_' : 'p2_') + VIEW[key];
    if(!ready(k)) return false;
    const f = moving ? Math.floor(state.animTime * 10 + i * 2) : 1;
    views.set(p, {k, f, flip: flipX});
    drawFrame(k, f, {flipX, flash});
    return true;
  }
  // returns the sprite's top (px above the centre) for the HP bar, or 0 when not drawn
  function drawEnemy(e, flash){
    const k = e.isBoss ? 'boss' : e.id;
    const s = SHEETS[k];
    if(!s || !ready(k)) return 0;
    const slow = e.status && e.status.slow > 0 ? 0.5 : 1;
    let f = Math.floor((state.animTime * s.fps * slow) + seed(e)) % (s.loop || s.n);
    if(e.isBoss){                                   // the sandworm bursts out of its mound when it spawns
      let born = bornAt.get(e); if(born == null){ born = state.animTime; bornAt.set(e, born); }
      const age = state.animTime - born;
      if(age < 0.45) f = 5; else if(age < 0.9) f = 4;
      if(age < 0.9 && fdt > 0) burst(e.x + (Math.random() - 0.5) * 50, e.y + 36, 2, {color: ['#5a4636', '#76604c', '#3e2e22'], speed: 90, life: 0.5, size: 3.5, grav: 260, up: 90});
    }
    // status tint under the sprite
    const st = e.status || {};
    const glow = st.burn > 0 ? '#ff8c42' : st.slow > 0 ? '#6cd6ff' : (shockT.get(e) > 0 ? '#b27bff' : null);
    if(glow && settings.graphics !== 'low'){
      const r = e.r * 2.6 * (1 + Math.sin(state.animTime * 14 + seed(e)) * 0.08);
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.55;
      ctx.drawImage(glowSprite(glow), -r, -r, r * 2, r * 2); ctx.restore();
    }
    const flipX = (e.face < 0) !== !!s.faceLeft;    // art faces right, except the sandworm (drawn facing left)
    drawFrame(k, f, {flipX, flash});
    if(st.slow > 0 && !(flash > 0)){                // frosted over: light icy wash on the sprite
      ctx.save(); ctx.globalAlpha = 0.28; drawFrame(k, f, {flipX, tint: '#bff0ff'}); ctx.restore();
    }
    return s.ay * PX;
  }
  // under players, over enemies: dash after-images
  function drawUnder(){
    for(const g of ghosts){
      if(!ready(g.k)) continue;
      ctx.save(); ctx.translate(g.x, g.y);
      ctx.globalCompositeOperation = 'lighter';
      drawFrame(g.k, g.f, {flipX: g.flip, tint: '#5fb0ff', alpha: 0.5 * g.life / g.max});
      ctx.restore();
    }
  }
  // on top of everything in the world: tracers, glows, particles, rings, muzzle flashes, lightning
  function drawOver(){
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    if(settings.graphics !== 'low'){
      ctx.lineCap = 'round';
      for(const b of bullets){
        const sp = Math.hypot(b.vx || 0, b.vy || 0); if(!sp) continue;
        const col = /^#[0-9a-fA-F]{6}$/.test(b.color || '') ? b.color : '#ffffff';
        if(b.elemental){
          const r = b.elemental === 'fire' ? 13 : 10;
          ctx.globalAlpha = 0.7; ctx.drawImage(glowSprite(b.elemental === 'fire' ? '#ff8c42' : b.elemental === 'ice' ? '#6cd6ff' : '#b27bff'), b.x - r, b.y - r, r * 2, r * 2); ctx.globalAlpha = 1;
          if(b.elemental === 'fire') continue;            // flames are puffs, not tracers
        }
        const L = Math.max(6, Math.min(22, sp * 0.02));  // short streak behind the bullet
        ctx.strokeStyle = col + '77'; ctx.lineWidth = b.crit ? 4 : 2.5;
        ctx.beginPath(); ctx.moveTo(b.x - b.vx / sp * L, b.y - b.vy / sp * L); ctx.lineTo(b.x, b.y); ctx.stroke();
      }
    }
    for(const r of rings){
      const k = r.t / (r.t + r.life);
      ctx.globalAlpha = (1 - k) * 0.8; ctx.strokeStyle = r.color; ctx.lineWidth = 3 * (1 - k) + 1;
      ctx.beginPath(); ctx.arc(r.x, r.y, r.r + (r.max - r.r) * k, 0, Math.PI * 2); ctx.stroke();
    }
    for(const a of arcs){                            // jagged shock bolt
      ctx.globalAlpha = Math.min(1, a.life * 8); ctx.strokeStyle = '#d8b8ff'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(a.a.x, a.a.y);
      for(let s = 1; s < 6; s++){ const t = s / 6; ctx.lineTo(a.a.x + (a.b.x - a.a.x) * t + (Math.random() - 0.5) * 14, a.a.y + (a.b.y - a.a.y) * t + (Math.random() - 0.5) * 14); }
      ctx.lineTo(a.b.x, a.b.y); ctx.stroke();
    }
    ctx.globalAlpha = 1;
    // particles: additive ones here, normal ones after
    for(const q of parts){
      if(!q.add) continue;
      ctx.globalAlpha = Math.min(1, q.life / q.max * 1.4);
      ctx.fillStyle = q.color; const s = q.size; ctx.fillRect(q.x - s / 2, q.y - s / 2, s, s);
    }
    for(const f of flashes){
      const k = f.life / f.max, r = (f.big ? 26 : 16) * (0.7 + 0.3 * k);
      ctx.globalAlpha = k; ctx.drawImage(glowSprite(f.color.length === 7 ? f.color : '#ffd166'), f.x - r, f.y - r, r * 2, r * 2);
      ctx.save(); ctx.translate(f.x, f.y); ctx.rotate(f.a); ctx.fillStyle = '#fff6d8';
      const L = (f.big ? 16 : 10) * k;
      ctx.beginPath(); ctx.moveTo(-2, -3 * k); ctx.lineTo(L, 0); ctx.lineTo(-2, 3 * k); ctx.closePath(); ctx.fill();
      ctx.fillRect(-2, -2, 4, 4);
      ctx.restore();
    }
    ctx.restore();
    ctx.save();
    for(const q of parts){
      if(q.add) continue;
      const k = q.life / q.max;
      ctx.globalAlpha = q.kind === 'smoke' ? k * 0.45 : Math.min(1, k * 1.5);
      ctx.fillStyle = q.color; const s = q.kind === 'smoke' ? q.size * (1.6 - k * 0.6) : q.size;
      ctx.fillRect(Math.round(q.x - s / 2), Math.round(q.y - s / 2), Math.ceil(s), Math.ceil(s));
    }
    ctx.restore();
  }
  // soft additive glow used for the game's own particles; false = caller draws its fallback
  function glow(color, x, y, r, a){
    if(typeof color !== 'string' || !/^#[0-9a-fA-F]{6}$/.test(color)) return false;
    ctx.globalAlpha = a; ctx.drawImage(glowSprite(color), x - r, y - r, r * 2, r * 2); ctx.globalAlpha = 1;
    return true;
  }
  // ---- ground: flat warm grey-brown with sparse doodle decals, pre-rendered once per window size ----
  const GROUND = '#6f635a';
  let groundCv = null, groundKey = '';
  function buildGround(){
    const dpr = window.devicePixelRatio || 1;
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(W * dpr)); c.height = Math.max(1, Math.round(H * dpr));
    const g = c.getContext('2d');
    g.scale(dpr, dpr);
    g.fillStyle = GROUND; g.fillRect(0, 0, W, H);
    let seed = 1337;                                 // fixed seed: decals stay put between frames and runs
    const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    // very soft large patches so the floor isn't perfectly flat
    for(let i = 0; i < 14; i++){
      const x = rnd() * W, y = rnd() * H, r = 120 + rnd() * 220;
      const gr = g.createRadialGradient(x, y, 0, x, y, r);
      const light = rnd() < 0.5;
      gr.addColorStop(0, light ? 'rgba(255,240,220,0.035)' : 'rgba(30,20,10,0.05)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2);
    }
    // sparse decals on a jittered grid (about one per 110x110 px cell, some cells left empty)
    const im = imgs.decals, cell = 110;
    if(im && im.complete && im.naturalWidth){
      g.imageSmoothingEnabled = false;
      for(let gy = 0; gy < H + cell; gy += cell){
        for(let gx = 0; gx < W + cell; gx += cell){
          const n = rnd() < 0.25 ? 0 : rnd() < 0.7 ? 1 : 2;
          for(let k = 0; k < n; k++){
            const f = Math.floor(rnd() * 8), x = gx + rnd() * cell, y = gy + rnd() * cell;
            const sc = rnd() < 0.75 ? 2 : 1, flip = rnd() < 0.5;
            g.save(); g.globalAlpha = 0.55 + rnd() * 0.3; g.translate(Math.round(x), Math.round(y)); if(flip) g.scale(-1, 1);
            g.drawImage(im, f * 16, 0, 16, 16, -8 * sc, -8 * sc, 16 * sc, 16 * sc); g.restore();
          }
        }
      }
    }
    // gentle edge darkening keeps the eye in the middle without the old heavy vignette
    const vig = g.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.75);
    vig.addColorStop(0, 'rgba(0,0,0,0)'); vig.addColorStop(1, 'rgba(20,12,6,0.32)');
    g.fillStyle = vig; g.fillRect(0, 0, W, H);
    return c;
  }
  // draws the whole background; false = not ready yet (game.js then draws its old background)
  function drawGround(){
    if(!ready('decals')) return false;
    const key = W + 'x' + H + '@' + (window.devicePixelRatio || 1);
    if(key !== groundKey){ groundCv = buildGround(); groundKey = key; }
    ctx.drawImage(groundCv, 0, 0, W, H);
    return true;
  }
  function drawTree(){                              // called with the tree's transform already applied
    if(!ready('tree')) return false;
    drawFrame('tree', 0);
    return true;
  }

  // ---- materials (money): bright green gems with a dark outline, 3 shapes, bob + pulse + swoop ----
  const MAT_SHAPES = 3, MAT_RES = 3;               // pre-rendered at 3x for smooth rotated edges
  const matCache = [];
  function matPath(g, v){
    g.beginPath();
    if(v === 0){                                     // rounded square
      const r = 0.38; g.moveTo(-0.62 + r, -0.62); g.arcTo(0.62, -0.62, 0.62, 0.62, r); g.arcTo(0.62, 0.62, -0.62, 0.62, r); g.arcTo(-0.62, 0.62, -0.62, -0.62, r); g.arcTo(-0.62, -0.62, 0.62, -0.62, r);
    } else if(v === 1){                              // lumpy blob
      g.moveTo(0, -0.72); g.bezierCurveTo(0.55, -0.8, 0.85, -0.2, 0.62, 0.25); g.bezierCurveTo(0.45, 0.7, -0.1, 0.82, -0.45, 0.58); g.bezierCurveTo(-0.85, 0.3, -0.75, -0.62, 0, -0.72);
    } else {                                         // leaf
      g.moveTo(-0.8, 0.35); g.quadraticCurveTo(-0.45, -0.75, 0.8, -0.4); g.quadraticCurveTo(0.45, 0.75, -0.8, 0.35);
    }
    g.closePath();
  }
  function matSprite(v){
    if(matCache[v]) return matCache[v];
    const S = 16, px = S * MAT_RES, c = document.createElement('canvas'); c.width = c.height = px;
    const g = c.getContext('2d');
    g.translate(px / 2, px / 2); g.scale(px / 2 * 0.8, px / 2 * 0.8);
    matPath(g, v);
    const gr = g.createLinearGradient(-0.6, -0.7, 0.6, 0.7);
    gr.addColorStop(0, '#b6ff9e'); gr.addColorStop(0.45, '#5fe35a'); gr.addColorStop(1, '#2e9a3c');
    g.fillStyle = gr; g.fill();
    g.lineWidth = 0.2; g.strokeStyle = '#0e1f0e'; g.lineJoin = 'round'; g.stroke();
    g.fillStyle = 'rgba(255,255,255,0.75)';            // shine
    g.beginPath(); g.ellipse(-0.25, -0.28, 0.17, 0.11, -0.6, 0, Math.PI * 2); g.fill();
    if(v === 2){ g.strokeStyle = 'rgba(14,31,14,0.55)'; g.lineWidth = 0.09; g.beginPath(); g.moveTo(-0.55, 0.25); g.quadraticCurveTo(0.05, -0.05, 0.6, -0.3); g.stroke(); }
    return (matCache[v] = c);
  }
  const matLook = new WeakMap();                    // drop -> {v, rot, phase}
  function drawMoney(){
    const near = players.filter(p => !p.dead);
    for(const m of moneyDrops){
      let L = matLook.get(m);
      if(!L){ L = {v: Math.floor(Math.random() * MAT_SHAPES), rot: (Math.random() - 0.5) * 1.2, ph: Math.random() * 6.28}; matLook.set(m, L); }
      const t = state.animTime + L.ph;
      const bob = Math.sin(t * 4) * 1.6;
      const pulse = 0.5 + 0.5 * Math.sin(t * 5);
      // swoop: inside the game's 80px pickup range the gem stretches toward the player and leaves a streak
      let pull = 0, ang = 0;
      for(const p of near){ const d = Math.hypot(p.x - m.x, p.y - m.y); if(d < 80){ const k = (80 - d) / 80; if(k > pull){ pull = k; ang = Math.atan2(p.y - m.y, p.x - m.x); } } }
      const size = 13;
      ctx.save();
      ctx.translate(m.x, m.y + bob * (1 - pull));
      ctx.globalCompositeOperation = 'lighter';
      const gr = 13 + pulse * 3 + pull * 6;
      ctx.globalAlpha = 0.22 + pulse * 0.12 + pull * 0.25;
      ctx.drawImage(glowSprite('#7cff6b'), -gr, -gr, gr * 2, gr * 2);
      if(pull > 0.05){
        ctx.globalAlpha = pull * 0.6; ctx.strokeStyle = '#9dff8c'; ctx.lineWidth = 3; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(-Math.cos(ang) * 14 * pull, -Math.sin(ang) * 14 * pull); ctx.lineTo(0, 0); ctx.stroke();
      }
      ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
      if(pull > 0.05){ ctx.rotate(ang); ctx.scale(1 + pull * 0.45, 1 - pull * 0.25); ctx.rotate(-ang); }
      ctx.rotate(L.rot + Math.sin(t * 2) * 0.12);
      const sc = 1 + pulse * 0.06;
      ctx.drawImage(matSprite(L.v), -size / 2 * sc, -size / 2 * sc, size * sc, size * sc);
      ctx.restore();
    }
    return true;
  }
  // currency icon for the HUD and shop (same gem as the pickups); r = the old coin radius
  function drawMaterialIcon(x, y, r){
    const s = r * 2.7;
    ctx.save(); ctx.translate(x, y); ctx.rotate(-0.25);
    ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.25;
    ctx.drawImage(glowSprite('#7cff6b'), -s, -s, s * 2, s * 2);
    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
    ctx.drawImage(matSprite(1), -s / 2, -s / 2, s, s);
    ctx.restore();
    return true;
  }

  function stats(){ return {particles: parts.length, rings: rings.length, flashes: flashes.length, ghosts: ghosts.length, max: maxParts(), density: density()}; }
  window.FX = { glow, drawGround, drawTree, drawMoney, drawMaterialIcon, frame, drawPlayer, drawEnemy, drawUnder, drawOver, ready, stats, SHEETS };
})();
