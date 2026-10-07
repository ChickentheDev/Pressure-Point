// Pressure-Point v0.56 shop screen (Brad, graphics division). Brotato-style layout:
//   top: "Shop (Wave N)" + co-op shopper tabs, wallet centred, REROLL top-right
//   cards: one row (or a 3x2 / 2x3 grid when narrow) with icon, name, type line, coloured stats,
//          rarity border + glow, price pill, and a Lock button under each card
//   right: Stats panel with Primary / Secondary tabs   bottom: Items grid, Weapons (n/6), info + Go
// Only layout + drawing live here. Buying, rerolling and starting the wave stay in game.js, which
// hit-tests with the same rects (getShopPanels / getShopCardRect / getShopButtons delegate here).
// This file adds one click listener for its own controls: Lock buttons, stat tabs and co-op tabs.
(function(){
  'use strict';
  const UI = { shopper: 0, statTab: 'primary' };
  const M = 16, G = 12, LOCK_H = 24, LOCK_GAP = 6, HEADER_H = 40;

  // ---- pixel icon atlases (tools/gen_sprites.py) ---------------------------------------------------
  const ITEM_IDS = ['plating', 'overclock', 'precision', 'vamp', 'belt', 'boots', 'luck', 'pierce'];
  const STAT_IDS = ['level', 'hp', 'armor', 'lifesteal', 'damage', 'dmgpct', 'atkspd', 'crit', 'elemental', 'speed', 'accuracy', 'mag', 'pierce', 'recoil', 'critdmg', 'luck', 'danger', 'enemies', 'coin'];
  const atlas = src => { const im = new Image(); im.src = src; return im; };
  const itemAtlas = atlas('assets/sprites/ui_items.png'), statAtlas = atlas('assets/sprites/ui_stats.png');
  const ok = im => im.complete && im.naturalWidth > 0;
  function itemIcon(id, x, y, size){
    const k = ITEM_IDS.indexOf(id);
    if(k < 0 || !ok(itemAtlas)){ drawItemIcon(id, x + size / 2 - 8, y + size / 2 - 8); return; }
    ctx.save(); ctx.imageSmoothingEnabled = false; ctx.drawImage(itemAtlas, k * 16, 0, 16, 16, x, y, size, size); ctx.restore();
  }
  function statIcon(id, x, y, size){
    const k = STAT_IDS.indexOf(id);
    if(k < 0 || !ok(statAtlas)) return;
    ctx.save(); ctx.imageSmoothingEnabled = false; ctx.drawImage(statAtlas, k * 12, 0, 12, 12, x, y, size, size); ctx.restore();
  }

  // ---- colours / helpers ------------------------------------------------------------------------------
  const C = { overlay: 'rgba(5,8,14,0.84)', card: '#121a26', cardHi: '#18243a', tile: '#0b111b', edge: '#04070d', text: '#eef4ff', dim: '#93a6c2',
    good: '#6ef27a', bad: '#ff5d5d', gold: '#ffd166', accent: '#48e0c2' };
  const RARITY = { common: '#a7b3c4', rare: '#4cc3ff', epic: '#b67bff', red: '#ff5d5d' };
  const RNAME = { common: 'Common', rare: 'Rare', epic: 'Epic', red: 'Legendary' };
  const TYPE = { sidearm: 'Gun', rifle: 'Gun', shotgun: 'Gun', heavy: 'Heavy Gun', melee: 'Melee', special: 'Special Gun' };
  const font = (s, w) => uiFont(s, w || 'bold');
  const signCol = (v, inv) => { if(Math.abs(v) < 1e-9) return C.text; return (v > 0) !== !!inv ? C.good : C.bad; };
  const fmt = (v, pct) => { const r = pct ? Math.round(v) : Math.round(v * 100) / 100; return (r > 0 ? '+' : '') + r + (pct ? '%' : ''); };
  function rr(x, y, w, h, r){ roundRect(x, y, w, h, r); }
  function clipText(t, maxW){
    if(ctx.measureText(t).width <= maxW) return t;
    while(t.length > 1 && ctx.measureText(t + '…').width > maxW) t = t.slice(0, -1);
    return t + '…';
  }
  // fit text in maxW: largest size from `sizes` on one line, else wrap to two lines at `wrapSize`
  function fitLines(t, maxW, sizes, wrapSize){
    for(const sz of sizes){ ctx.font = font(sz); if(ctx.measureText(t).width <= maxW) return {size: sz, lines: [t]}; }
    ctx.font = font(wrapSize);
    const words = t.split(' '); let a = words[0], k = 1;
    while(k < words.length && ctx.measureText(a + ' ' + words[k]).width <= maxW) a += ' ' + words[k++];
    const b = words.slice(k).join(' ');
    return {size: wrapSize, lines: b ? [a, clipText(b, maxW)] : [clipText(a, maxW)]};
  }
  function hovered(r){ return inRect(input.mx, input.my, r); }
  function coin(x, y, r){ drawCoin(x, y, r); }
  function activePlayer(){ return players[Math.min(UI.shopper, players.length - 1)] || players[0]; }

  // ---- layout (shared by drawing and click hit-testing) -----------------------------------------------
  let cache = null;
  function layout(){
    const n = Math.max(1, shop.items.length);
    const key = [W, H, n, state.coop && players.length > 1].join();
    if(cache && cache.key === key) return cache;
    const narrow = W < 760;
    const RW = narrow ? 0 : Math.max(200, Math.min(270, Math.round(W * 0.19)));
    const leftX = M, leftW = W - 2 * M - (RW ? RW + G : 0);
    const T = Math.max(32, Math.min(56, Math.floor(Math.min(W, H) / 14)));   // item/weapon tile size
    const BH = 30 + 2 * T + 6 + 4;                                           // items + weapons block
    const HINT = narrow ? G : H < 700 ? 16 : 24;                                            // gap under the Lock row (hint line)
    const goH = 52, badgeH = 34;
    const tailH = narrow ? Math.max(260, Math.min(330, H * 0.3)) : 0;        // narrow: stats + Go under the grids
    let cols = 2;
    for(const c of [n, 3, 2]){ if(c <= n && (leftW - G * (c - 1)) / c >= 150){ cols = c; break; } }
    const rows = Math.ceil(n / cols);
    const cardW = Math.min(220, (leftW - G * (cols - 1)) / cols);
    // Everything stacks top-down with tight gaps (like the reference). Cards keep a card-like shape
    // (at most 1.75x as tall as wide), and if that leaves spare height the whole screen is centred
    // vertically instead of leaving a hole between the cards and the Items/Weapons rows.
    const fixedH = HEADER_H + 14 + rows * (LOCK_H + LOCK_GAP) + (rows - 1) * G + HINT + BH + (narrow ? G + tailH : 0);
    const cardH = Math.max(150, Math.min(290, Math.floor(cardW * 1.75), Math.floor((H - 2 * M - fixedH) / rows)));
    const contentH = fixedH + rows * cardH;
    const oy = Math.max(M, Math.floor((H - contentH) / 2));
    const header = {x: leftX, y: oy, w: leftW, h: HEADER_H};
    const rerollW = Math.min(180, Math.max(140, leftW * 0.24));
    const reroll = {x: leftX + leftW - rerollW, y: oy, w: rerollW, h: HEADER_H};
    const top = oy + HEADER_H + 14;
    const rowW = cols * cardW + G * (cols - 1);
    const cx0 = leftX + (leftW - rowW) / 2;
    const cards = [];
    for(let i = 0; i < n; i++){
      const col = i % cols, row = Math.floor(i / cols);
      cards.push({x: cx0 + col * (cardW + G), y: top + row * (cardH + LOCK_H + LOCK_GAP + G), w: cardW, h: cardH});
    }
    const cardsBottom = top + rows * (cardH + LOCK_H + LOCK_GAP) + (rows - 1) * G;
    const area = {x: leftX, y: top, w: leftW, h: cardsBottom - top};
    const by = cardsBottom + HINT;
    const wpW = Math.max(3 * T + 2 * 6 + 24, Math.min(leftW * 0.42, 3 * T + 60));
    const weaponsBox = {x: leftX + leftW - wpW, y: by, w: wpW, h: BH, T};
    const itemsBox = {x: leftX, y: by, w: leftW - wpW - G, h: BH, T};
    const bottom = Math.min(H - M, oy + contentH);
    let statsBox, goBtn, infoY, badgesY;
    if(narrow){
      const ty = by + BH + G;
      const sw = Math.round((W - 2 * M - G) * 0.56);
      statsBox = {x: M, y: ty, w: sw, h: Math.max(200, bottom - ty)};
      const gx = M + sw + G, gw = W - M - gx;
      goBtn = {x: gx, y: statsBox.y + statsBox.h - goH, w: gw, h: goH};
      badgesY = goBtn.y - G - badgeH; infoY = badgesY - 14;
      cache = {key, narrow, header, reroll, cards, area, cols, rows, itemsBox, weaponsBox, statsBox, goBtn, badgesY, infoY, colX: gx, colW: gw};
    } else {
      const rx = W - M - RW;
      goBtn = {x: rx, y: bottom - goH, w: RW, h: goH};
      badgesY = goBtn.y - G - badgeH; infoY = badgesY - 14;
      statsBox = {x: rx, y: oy, w: RW, h: infoY - 22 - oy};
      cache = {key, narrow, header, reroll, cards, area, cols, rows, itemsBox, weaponsBox, statsBox, goBtn, badgesY, infoY, colX: rx, colW: RW};
    }
    cache.tabs = statTabs(cache.statsBox);
    return cache;
  }
  function statTabs(b){
    const w = Math.min(96, (b.w - 36) / 2), y = b.y + 44;
    return { primary: {x: b.x + b.w / 2 - w - 3, y, w, h: 24}, secondary: {x: b.x + b.w / 2 + 3, y, w, h: 24} };
  }
  function shopperTabs(){
    if(!(state.coop && players.length > 1)) return [];
    const L = layout();
    ctx.save(); ctx.font = font(22); const tw = ctx.measureText(titleText()).width; ctx.restore();
    const x0 = L.header.x + tw + 14;
    return players.slice(0, 2).map((p, i) => ({x: x0 + i * 50, y: L.header.y + 7, w: 44, h: 26, i}));
  }
  function titleText(){ return `Shop (Wave ${state.wave})`; }
  function lockRect(c){ return {x: c.x + c.w / 2 - 38, y: c.y + c.h + LOCK_GAP, w: 76, h: LOCK_H}; }
  function priceRect(c){ const w = Math.max(64, Math.min(104, c.w - 48)); return {x: c.x + c.w / 2 - w / 2, y: c.y + c.h - 40, w, h: 28}; }

  // ---- public layout API used by game.js -----------------------------------------------------------------
  function panels(){
    const L = layout();
    return [{x: L.area.x, y: L.area.y, w: L.area.w, h: L.area.h, player: activePlayer(), title: 'SHOP', grid: {cols: L.cols, rows: L.rows}}];
  }
  function cardRect(def, i){ const c = layout().cards[i]; return c ? {...c} : {x: -1e4, y: -1e4, w: 0, h: 0}; }
  function buttons(){ const L = layout(); return { reroll: {...L.reroll}, next: {...L.goBtn} }; }
  function badgeRects(c){ return { price: priceRect(c), lock: lockRect(c) }; }

  // ---- card content ------------------------------------------------------------------------------------
  function weaponLines(it, p){
    const w = it.preview || (it.preview = createWeaponInstance(it.data, it.rarity || it.data.rarity));
    const cur = getWeaponFor(p);
    const cmp = (a, b, lowerBetter) => (a === b || b == null) ? C.text : ((a > b) !== !!lowerBetter ? C.good : C.bad);
    const L = [
      ['Damage', `${w.damage}${w.pellets ? '×' + w.pellets : ''}`, cmp(w.damage * (w.pellets || 1), cur.damage * (cur.pellets || 1))],
      ['Fire delay', `${w.fireRate.toFixed(2)}s`, cmp(w.fireRate, cur.fireRate, true)],
      ['Magazine', `${w.mag >= 999 ? '∞' : w.mag}`, cmp(Math.min(w.mag, 999), Math.min(cur.mag, 999))],
      ['Reload', `${w.reload.toFixed(1)}s`, cmp(w.reload, cur.reload, true)],
    ];
    if(w.elemental) L.push([{fire: 'Burns', ice: 'Slows', shock: 'Chains shock'}[w.elemental] || w.elemental, '', {fire: '#ff8c42', ice: '#6cd6ff', shock: '#b27bff'}[w.elemental]]);
    if(w.explosive) L.push(['Explosive', '', '#ffb44c']);
    if(w.pierce) L.push(['Pierce', `+${w.pierce}`, C.good]);
    if(w.overheatMax) L.push(['Overheats', '', C.bad]);
    return L;
  }
  const EFFECT = {
    armor:        (v) => [fmt(v), 'Armor', v],
    speedMult:    (v) => [fmt(v * 100, true), 'Move Speed', v],
    reloadMult:   (v) => [fmt(-v * 100, true), 'Attack Speed', -v],
    accuracyMult: (v) => [fmt(v * 100, true), 'Accuracy', v],
    maxHpAdd:     (v) => [fmt(v), 'Max HP', v],
    lifestealAdd: (v) => [fmt(v * 100, true), 'Life Steal', v],
    magBonus:     (v) => [fmt(Math.round(v)), 'Magazine', v],
    damageBonus:  (v) => [fmt(Math.round(v)), 'Damage', v],
    damageMult:   (v) => [fmt(v * 100, true), 'Damage', v],
    luckAdd:      (v) => [fmt(Math.round(v)), 'Luck', v],
    pierceAdd:    (v) => [fmt(Math.round(v)), 'Pierce', v],
  };
  function itemLines(it){
    const m = rarityMult(it.rarity || it.data.rarity), out = [];
    for(const [k, v] of Object.entries(it.data.effects || {})){
      const f = EFFECT[k]; if(!f) continue;
      const [num, label, sign] = f(v * m);
      out.push([num, label, signCol(sign)]);
    }
    return out;
  }

  function drawCard(i, c, p, alpha){
    const it = shop.items[i];
    const hover = hovered(c);
    const locked = !!shop.locked[i];
    const selected = i === shop.selection && !hover;
    const rarity = it && it.data ? (it.rarity || it.data.rarity) : 'common';
    const rc = RARITY[rarity] || RARITY.common;
    // the card face moves inside its own rect on hover, so what you see is exactly what you can click
    const lift = hover ? 0 : 3, faceH = c.h - 5, fy = c.y + lift;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = C.edge; rr(c.x, c.y + 5, c.w, c.h - 5, 12); ctx.fill();               // drop edge
    ctx.save();
    ctx.shadowColor = rc; ctx.shadowBlur = hover ? 22 : 10;
    const g = ctx.createLinearGradient(0, fy, 0, fy + faceH);
    g.addColorStop(0, hover ? C.cardHi : '#141e2c'); g.addColorStop(1, '#0c121c');
    ctx.fillStyle = g; rr(c.x, fy, c.w, faceH, 12); ctx.fill();
    ctx.restore();
    ctx.lineWidth = 3; ctx.strokeStyle = rc; rr(c.x + 1.5, fy + 1.5, c.w - 3, faceH - 3, 11); ctx.stroke();
    if(selected){ ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(255,255,255,0.55)'; rr(c.x + 5, fy + 5, c.w - 10, faceH - 10, 8); ctx.stroke(); }
    if(!it || !it.data){
      ctx.fillStyle = C.dim; ctx.font = font(12); ctx.textAlign = 'center'; ctx.fillText('SOLD OUT', c.x + c.w / 2, fy + faceH / 2); ctx.textAlign = 'start';
      ctx.restore(); return hover;
    }
    // icon tile
    const ts = Math.min(52, Math.max(42, c.w * 0.28)), tx = c.x + 10, ty = fy + 10;
    ctx.fillStyle = C.tile; rr(tx, ty, ts, ts, 8); ctx.fill();
    ctx.strokeStyle = rc + '88'; ctx.lineWidth = 2; rr(tx + 1, ty + 1, ts - 2, ts - 2, 7); ctx.stroke();
    if(it.type === 'weapon') drawWeaponIcon(it.data, tx + 4, ty + ts * 0.25, ts - 8, ts * 0.5);
    else itemIcon(it.data.id, tx + (ts - 32) / 2, ty + (ts - 32) / 2, 32);
    // name + type line: shrink to fit, then wrap to two lines; nothing is cut off with "…"
    const nx = tx + ts + 8, nw = c.x + c.w - 10 - nx;
    ctx.fillStyle = C.text;
    let ny = ty + 15;
    const nm = fitLines(it.data.name, nw, [14, 13, 12], 11);
    ctx.font = font(nm.size);
    nm.lines.forEach((ln, k) => ctx.fillText(ln, nx, ny + k * (nm.size + 1)));
    ny += (nm.lines.length - 1) * (nm.size + 1) + 16;
    const type = it.type === 'weapon' ? (TYPE[it.data.type] || 'Gun') : 'Item';
    const rname = RNAME[rarity] || rarity;
    const tcol = it.type === 'weapon' ? '#ffd27a' : '#9fd8ff';
    let tsz = 11;
    ctx.font = font(tsz);
    while(tsz > 10 && ctx.measureText(type + ' ' + rname).width > nw){ tsz--; ctx.font = font(tsz); }
    ctx.fillStyle = tcol; ctx.fillText(type, nx, ny);
    if(ctx.measureText(type + ' ' + rname).width <= nw){
      ctx.fillStyle = rc; ctx.fillText(rname, nx + ctx.measureText(type + ' ').width, ny);
    } else {                                          // rarity drops to its own line
      ny += tsz + 2; ctx.fillStyle = rc; ctx.fillText(rname, nx, ny);
    }
    // stat block
    const pr = priceRect(c); pr.y = fy + faceH - 36;
    let sy = Math.max(ty + ts + 16, ny + 18);
    const lh = c.h > 200 ? 15 : 13;
    ctx.font = font(11, '');
    const lines = it.type === 'weapon' ? weaponLines(it, p) : itemLines(it);
    const maxLines = Math.max(1, Math.floor((pr.y - 6 - sy + lh) / lh));
    for(const ln of lines.slice(0, maxLines)){
      if(it.type === 'weapon'){
        ctx.fillStyle = ln[2] && !ln[1] ? ln[2] : C.dim; ctx.fillText(ln[1] ? ln[0] + ':' : ln[0], c.x + 12, sy);
        if(ln[1]){ ctx.fillStyle = ln[2]; ctx.textAlign = 'right'; ctx.fillText(ln[1], c.x + c.w - 12, sy); ctx.textAlign = 'start'; }
      } else {
        ctx.font = font(11); ctx.fillStyle = ln[2]; ctx.fillText(ln[0], c.x + 12, sy);
        const w0 = ctx.measureText(ln[0] + ' ').width; ctx.font = font(11, ''); ctx.fillStyle = C.text;
        ctx.fillText(clipText(ln[1], c.w - 24 - w0), c.x + 12 + w0, sy);
      }
      sy += lh;
    }
    // price pill
    const afford = p.currency >= it.price;
    ctx.fillStyle = afford ? '#e9eef6' : '#1a2230'; rr(pr.x, pr.y, pr.w, pr.h, 14); ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = C.edge; ctx.stroke();
    ctx.font = font(16); const ptxt = `${it.price}`; const pw = ctx.measureText(ptxt).width;
    const px0 = pr.x + pr.w / 2 - (pw + 18) / 2;
    ctx.fillStyle = afford ? '#0b111b' : C.bad; ctx.fillText(ptxt, px0, pr.y + 20);
    coin(px0 + pw + 11, pr.y + 14, 6);
    // lock state: corner padlock + amber inner line (never over the price)
    if(locked){
      ctx.strokeStyle = 'rgba(255,209,102,0.85)'; ctx.lineWidth = 2; ctx.setLineDash([6, 4]); rr(c.x + 6, fy + 6, c.w - 12, faceH - 12, 8); ctx.stroke(); ctx.setLineDash([]);
      padlock(tx + ts - 9, ty + ts - 10, C.gold);       // on the icon tile's corner, clear of the name
    }
    ctx.restore();
    return hover;
  }
  function padlock(x, y, col){
    ctx.save(); ctx.fillStyle = col; ctx.strokeStyle = col; ctx.lineWidth = 2.2;
    ctx.beginPath(); ctx.arc(x + 6, y + 6, 4, Math.PI, 0); ctx.stroke();
    rr(x + 1, y + 6, 10, 8, 2); ctx.fill();
    ctx.fillStyle = '#2b1e10'; ctx.fillRect(x + 5, y + 9, 2, 3);
    ctx.restore();
  }
  // small pill button whose face stays inside its rect (hover = brighter + 1px up, still inside)
  function pillButton(r, label, {active = false, color = null, disabled = false, size = 12, icon = null} = {}){
    const hover = !disabled && hovered(r);
    ctx.save();
    ctx.fillStyle = C.edge; rr(r.x, r.y + 2, r.w, r.h - 2, r.h / 2); ctx.fill();
    const fy = r.y + (hover ? 0 : 1);
    ctx.fillStyle = active ? (color || '#e9eef6') : (hover ? '#2a3a52' : '#1a2434');
    rr(r.x, fy, r.w, r.h - 2, (r.h - 2) / 2); ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = active ? 'rgba(0,0,0,0.35)' : 'rgba(255,255,255,0.08)'; ctx.stroke();
    ctx.font = font(size); ctx.textAlign = 'center';
    ctx.fillStyle = disabled ? '#5d6b80' : active ? '#0b111b' : C.text;
    const tx = r.x + r.w / 2 + (icon ? 7 : 0);
    ctx.fillText(label, tx, fy + (r.h - 2) / 2 + size * 0.36);
    if(icon){ const w = ctx.measureText(label).width; icon(tx - w / 2 - 14, fy + (r.h - 2) / 2 - 7); }
    ctx.textAlign = 'start';
    ctx.restore();
    return hover;
  }
  function bigButton(r, label, {primary = false, disabled = false, size = 18, after = null} = {}){
    const hover = !disabled && hovered(r);
    ctx.save();
    ctx.fillStyle = C.edge; rr(r.x, r.y + 5, r.w, r.h - 5, 12); ctx.fill();
    const fy = r.y + (hover ? 0 : 3), fh = r.h - 5;
    const g = ctx.createLinearGradient(0, fy, 0, fy + fh);
    if(primary){ g.addColorStop(0, hover ? '#f4f8ff' : '#e3e9f3'); g.addColorStop(1, hover ? '#cfd8e6' : '#b9c4d4'); }
    else { g.addColorStop(0, hover ? '#26344a' : '#1b2536'); g.addColorStop(1, '#101824'); }
    ctx.fillStyle = g; rr(r.x, fy, r.w, fh, 12); ctx.fill();
    ctx.lineWidth = 3; ctx.strokeStyle = C.edge; ctx.stroke();
    ctx.lineWidth = 1.5; ctx.strokeStyle = 'rgba(255,255,255,0.14)'; rr(r.x + 3, fy + 3, r.w - 6, fh - 6, 9); ctx.stroke();
    ctx.font = font(size); ctx.textAlign = 'center';
    ctx.fillStyle = disabled ? '#62708a' : primary ? '#0b111b' : C.text;
    const extra = after ? 22 : 0, tw = ctx.measureText(label).width;
    ctx.fillText(label, r.x + r.w / 2 - extra / 2, fy + fh / 2 + size * 0.36);
    if(after) after(r.x + r.w / 2 - extra / 2 + tw / 2 + 14, fy + fh / 2);
    ctx.textAlign = 'start';
    ctx.restore();
    return hover;
  }

  // ---- stats panel ---------------------------------------------------------------------------------------
  function statRows(p, tab){
    if(tab === 'primary') return [
      ['level', 'Current Level', `${p.level}`, C.text],
      ['hp', 'Max HP', `${p.baseMaxHp}`, C.text],
      ['armor', 'Armor', `${Math.round(p.armor)}`, signCol(p.armor)],
      ['lifesteal', 'Life Steal', `${(p.lifesteal * 100).toFixed(0)}%`, signCol(p.lifesteal)],
      ['damage', 'Damage', fmt(p.damageBonus), signCol(p.damageBonus)],
      ['dmgpct', '% Damage', fmt((p.damageMult - 1) * 100, true), signCol(p.damageMult - 1)],
      ['atkspd', '% Attack Speed', fmt((1 / Math.max(0.01, p.reloadSpeed) - 1) * 100, true), signCol(1 / Math.max(0.01, p.reloadSpeed) - 1)],
      ['crit', '% Crit Chance', `${Math.round(p.critChance * 100)}%`, signCol(p.critChance)],
      ['elemental', '% Elemental', fmt(p.elementalBonus * 100, true), signCol(p.elementalBonus)],
      ['speed', 'Speed', `${p.baseSpeed}`, signCol(p.baseSpeed - 220)],
    ];
    return [
      ['accuracy', '% Accuracy', fmt((p.accuracy - 1) * 100, true), signCol(p.accuracy - 1)],
      ['mag', 'Magazine', fmt(p.magBonus), signCol(p.magBonus)],
      ['pierce', 'Pierce', fmt(p.pierceBonus), signCol(p.pierceBonus)],
      ['recoil', '% Recoil', fmt((p.recoil - 1) * 100, true), signCol(p.recoil - 1, true)],
      ['critdmg', 'Crit Damage', `×${(p.critMult || 1.5).toFixed(2)}`, C.text],
      ['luck', 'Luck', `${p.luck}`, signCol(p.luck)],
      ['coin', 'Materials', `${p.currency}`, C.text],
    ];
  }
  function drawStats(L, p){
    const b = L.statsBox;
    panelBox(b);
    ctx.font = font(20); ctx.fillStyle = C.text; ctx.textAlign = 'center';
    ctx.fillText(players.length > 1 ? `Stats  P${UI.shopper + 1}` : 'Stats', b.x + b.w / 2, b.y + 30); ctx.textAlign = 'start';
    let any = false;
    any = pillButton(L.tabs.primary, 'Primary', {active: UI.statTab === 'primary'}) || any;
    any = pillButton(L.tabs.secondary, 'Secondary', {active: UI.statTab === 'secondary'}) || any;
    const rows = statRows(p, UI.statTab);
    const y0 = b.y + 84, avail = b.y + b.h - 10 - y0;
    const lh = Math.max(16, Math.min(26, Math.floor(avail / rows.length)));
    const fs = lh >= 20 ? 13 : 12;
    rows.forEach((r, k) => {
      const y = y0 + k * lh;
      if(y + lh > b.y + b.h - 4) return;
      if(k % 2 === 0){ ctx.fillStyle = 'rgba(255,255,255,0.035)'; ctx.fillRect(b.x + 8, y, b.w - 16, lh); }
      if(r[0] === 'coin') coin(b.x + 21, y + lh / 2, 5.5); else statIcon(r[0], b.x + 14, y + (lh - 14) / 2, 14);
      let nfs = fs; ctx.font = font(nfs, '');
      while(nfs > 10 && ctx.measureText(r[1]).width > b.w - 96){ nfs--; ctx.font = font(nfs, ''); }   // shrink, don't cut
      ctx.fillStyle = r[3] === C.text ? C.text : r[3];
      ctx.fillText(clipText(r[1], b.w - 96), b.x + 36, y + lh / 2 + fs * 0.36);
      ctx.font = font(fs); ctx.textAlign = 'right'; ctx.fillText(r[2], b.x + b.w - 14, y + lh / 2 + fs * 0.36); ctx.textAlign = 'start';
    });
    return any;
  }
  function panelBox(b){
    ctx.save();
    ctx.fillStyle = 'rgba(14,20,30,0.92)'; rr(b.x, b.y, b.w, b.h, 14); ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(255,255,255,0.08)'; rr(b.x + 1, b.y + 1, b.w - 2, b.h - 2, 13); ctx.stroke();
    ctx.restore();
  }

  // ---- items + weapons --------------------------------------------------------------------------------
  function tile(x, y, T, col, equipped){
    ctx.fillStyle = C.tile; rr(x, y, T, T, 8); ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = col || 'rgba(255,255,255,0.08)'; rr(x + 1, y + 1, T - 2, T - 2, 7); ctx.stroke();
    if(equipped){ ctx.strokeStyle = C.accent; ctx.lineWidth = 2; rr(x - 2, y - 2, T + 4, T + 4, 9); ctx.stroke(); }
  }
  function drawItems(L, p){
    const b = L.itemsBox, T = b.T;
    ctx.font = font(18); ctx.fillStyle = C.text; ctx.fillText(`Items (${p.items.length}/6)`, b.x + 2, b.y + 20);
    const stacks = [];
    for(const it of p.items){ const s = stacks.find(q => q.id === it.id && q.rarity === it.rarity); if(s) s.n++; else stacks.push({id: it.id, rarity: it.rarity, n: 1}); }
    const per = Math.max(1, Math.floor((b.w + 6) / (T + 6)));
    for(let k = 0; k < Math.max(6, stacks.length) && k < per * 2; k++){
      const x = b.x + (k % per) * (T + 6), y = b.y + 30 + Math.floor(k / per) * (T + 6);
      const s = stacks[k];
      tile(x, y, T, s ? RARITY[s.rarity] + 'aa' : null);
      if(!s) continue;
      itemIcon(s.id, x + (T - 32) / 2, y + (T - 32) / 2, 32);
      if(s.n > 1){ ctx.font = font(11); ctx.fillStyle = C.text; ctx.textAlign = 'right'; ctx.fillText(`x${s.n}`, x + T - 3, y + T - 4); ctx.textAlign = 'start'; }
    }
  }
  function drawWeapons(L, p){
    const b = L.weaponsBox, T = b.T;
    ctx.font = font(18); ctx.fillStyle = C.text;
    ctx.fillText(`Weapons (${p.ownedWeapons.length}/6)`, b.x + 2, b.y + 20);
    const gx = b.x + 2;
    for(let k = 0; k < 6; k++){
      const x = gx + (k % 3) * (T + 6), y = b.y + 30 + Math.floor(k / 3) * (T + 6);
      const w = p.ownedWeapons[k];
      tile(x, y, T, w ? RARITY[w.rarity] + 'aa' : null, w && k === p.weaponIndex);
      if(w) drawWeaponIcon(w, x + 4, y + T * 0.22, T - 8, T * 0.56);
    }
    if(p.ownedWeapons.length > 6){ ctx.font = font(11); ctx.fillStyle = C.dim; ctx.fillText(`+${p.ownedWeapons.length - 6} more`, gx + 3 * (T + 6) + 2, b.y + 30 + T); }
  }
  function nextWaveEnemies(){
    const w = Math.min(state.maxWave, state.wave + 1);
    return Math.floor(computeWaveTotal(w) * (state.coop ? 1.5 : 1) * (1 + (state.danger - 1) * 0.15));
  }
  function drawGoColumn(L, p){
    const nextW = Math.min(state.maxWave, state.wave + 1);
    const bossNext = nextW >= state.maxWave;
    ctx.font = font(11, ''); ctx.fillStyle = bossNext ? C.bad : C.dim; ctx.textAlign = 'center';
    ctx.fillText(clipText(bossNext ? 'The Overlord arrives next wave!' : `The Overlord appears on wave ${state.maxWave}`, L.colW), L.colX + L.colW / 2, L.infoY);
    ctx.textAlign = 'start';
    const badges = [['danger', state.danger, '#ff8a8a'], ['enemies', nextWaveEnemies(), '#b67bff'], ['level', p.level, C.good]];
    const bw = 58, bx0 = L.colX + L.colW - badges.length * (bw + 6) + 6;
    badges.forEach(([ic, n, col], k) => {
      const x = bx0 + k * (bw + 6), y = L.badgesY;
      ctx.fillStyle = 'rgba(14,20,30,0.92)'; rr(x, y, bw, 34, 17); ctx.fill();
      ctx.fillStyle = '#1d2738'; ctx.beginPath(); ctx.arc(x + 17, y + 17, 14, 0, Math.PI * 2); ctx.fill();
      ctx.lineWidth = 2; ctx.strokeStyle = col; ctx.stroke();
      statIcon(ic, x + 9, y + 9, 16);
      ctx.font = font(14); ctx.fillStyle = C.text; ctx.fillText(`${n}`, x + 35, y + 22);
    });
    return bigButton(L.goBtn, bossNext ? 'Go (Boss Wave)' : `Go (Wave ${nextW})`, {primary: true, size: L.goBtn.w < 220 ? 17 : 20});
  }

  // ---- main draw -------------------------------------------------------------------------------------
  function draw(){
    const L = layout(), p = activePlayer();
    const a = Math.min(1, (state.shopAnim || 0) * 1.6 + 0.15);
    ctx.save();
    ctx.fillStyle = C.overlay; ctx.fillRect(0, 0, W, H);
    let any = false;
    // header
    ctx.font = font(22); ctx.fillStyle = C.text; ctx.fillText(titleText(), L.header.x, L.header.y + 28);
    for(const t of shopperTabs()){
      const col = t.i === 0 ? '#4a9eff' : '#ff6b6b';
      any = pillButton(t, `P${t.i + 1}`, {active: UI.shopper === t.i, color: col, size: 13}) || any;
    }
    ctx.font = font(22); const money = `${p.currency}`; const mw = ctx.measureText(money).width;
    const tabs = shopperTabs(), tabsEnd = tabs.length ? tabs[tabs.length - 1].x + tabs[tabs.length - 1].w + 14 : 0;
    const wx = Math.max(tabsEnd, L.header.x + L.header.w / 2 - (mw + 26) / 2);
    coin(wx + 9, L.header.y + 20, 9); ctx.fillStyle = C.text; ctx.fillText(money, wx + 24, L.header.y + 28);
    const canReroll = players[0].currency >= shop.rerollCost;
    any = bigButton(L.reroll, `REROLL - ${shop.rerollCost}`, {disabled: !canReroll, size: L.reroll.w < 160 ? 15 : 17, after: (x, y) => coin(x, y, 7)}) || any;
    // cards + lock buttons
    for(let i = 0; i < shop.items.length; i++){
      const c = L.cards[i]; if(!c) continue;
      const ca = Math.max(0, Math.min(1, a * 1.4 - i * 0.08));
      if(drawCard(i, c, p, ca)) any = true;
      if(shop.items[i] && shop.items[i].data){
        const locked = !!shop.locked[i];
        if(pillButton(lockRect(c), locked ? 'Locked' : 'Lock', {active: locked, color: C.gold, icon: (x, y) => padlock(x, y, locked ? '#2b1e10' : C.dim)})) any = true;
      }
    }
    drawItems(L, p);
    drawWeapons(L, p);
    if(drawStats(L, p)) any = true;
    if(drawGoColumn(L, p)) any = true;
    ctx.font = font(10, ''); ctx.fillStyle = 'rgba(147,166,194,0.7)'; ctx.textAlign = 'center';
    const hintY = L.area.y + L.area.h + 16;
    if(!L.narrow) ctx.fillText('Click a card to buy  •  Right-click or Lock to keep it  •  Tab: full stats  •  Enter: next wave', L.area.x + L.area.w / 2, hintY);
    ctx.textAlign = 'start';
    ctx.restore();
    canvas.style.cursor = any ? 'pointer' : 'default';
  }

  // ---- clicks for the controls only this screen has --------------------------------------------------------
  // ui.js loads before game.js, so look the canvas up here instead of using game.js's `canvas`
  const cv = document.getElementById('game');
  cv.addEventListener('click', (e) => {
    if(state.phase !== 'shop' || state.shopView === 'stats') return;
    const r = cv.getBoundingClientRect(), mx = e.clientX - r.left, my = e.clientY - r.top;
    const L = layout();
    for(let i = 0; i < shop.items.length; i++){
      const c = L.cards[i];
      if(c && shop.items[i] && inRect(mx, my, lockRect(c))){ shop.locked[i] = shop.locked[i] ? null : shop.items[i]; audio.click(); return; }
    }
    if(inRect(mx, my, L.tabs.primary)){ UI.statTab = 'primary'; audio.click(); return; }
    if(inRect(mx, my, L.tabs.secondary)){ UI.statTab = 'secondary'; audio.click(); return; }
    for(const t of shopperTabs()) if(inRect(mx, my, t)){ UI.shopper = t.i; audio.click(); return; }
  });

  window.ShopUI = { draw, panels, cardRect, buttons, badgeRects, layout, state: UI };
  window.getShopBadgeRects = badgeRects;
})();
