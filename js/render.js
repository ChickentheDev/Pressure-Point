// Pressure Point — render.js (split from game.js for v0.6.1)
// Drawing helpers reuse earlier drawing but adapt to multi-player
function drawBackground(){
  if(window.FX && FX.drawGround()) return;   // [brad-fx] v0.56 warm ground with doodle decals (Map.png kept as fallback)
  const grad = ctx.createLinearGradient(0,0,W,H);
  grad.addColorStop(0, palette.bg1);
  grad.addColorStop(0.55, palette.bg3);
  grad.addColorStop(1, palette.bg2);
  ctx.fillStyle = grad;
  ctx.fillRect(0,0,W,H);

  // Draw map sprite if available
  const mapSprite = spriteReady('map');
  if(mapSprite){
    // cover the arena, crisp pixels
    ctx.save();
    ctx.globalAlpha = 0.18;
    ctx.imageSmoothingEnabled = false;
    const iw = mapSprite.img.naturalWidth, ih = mapSprite.img.naturalHeight;
    const scale = Math.max(W / iw, H / ih);
    ctx.drawImage(mapSprite.img, (W - iw*scale)/2, (H - ih*scale)/2, iw*scale, ih*scale);
    ctx.restore();
  }

  if(settings.graphics === 'low'){
    const vig = ctx.createRadialGradient(W/2,H/2,Math.min(W,H)*0.2,W/2,H/2,Math.max(W,H)*0.7);
    vig.addColorStop(0,'rgba(0,0,0,0)');
    vig.addColorStop(1,'rgba(0,0,0,0.7)');
    ctx.fillStyle = vig;
    ctx.fillRect(0,0,W,H);
    return;
  }

  // ambient grid + parallax blobs
  ctx.strokeStyle = 'rgba(255,255,255,0.028)';
  ctx.lineWidth = 1;
  const grid = 48;
  const ox = (state.animTime * 8) % grid;
  const oy = (state.animTime * 5) % grid;
  for(let x=-grid; x<W+grid; x+=grid){
    ctx.beginPath(); ctx.moveTo(x+ox + Math.sin(state.animTime*0.5)*2, 0); ctx.lineTo(x+ox + Math.sin(state.animTime*0.5)*2, H); ctx.stroke();
  }
  for(let y=-grid; y<H+grid; y+=grid){
    ctx.beginPath(); ctx.moveTo(0, y+oy + Math.cos(state.animTime*0.35)*2); ctx.lineTo(W, y+oy + Math.cos(state.animTime*0.35)*2); ctx.stroke();
  }

  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  ctx.fillStyle = 'rgba(72,224,194,0.06)';
  for(let i=0;i<10;i++){
    const x = (i*173 + state.animTime*12) % W;
    const y = (i*257 + state.animTime*9) % H;
    ctx.beginPath();
    ctx.ellipse(x, y, 90 + Math.sin(state.animTime*0.6+i)*6, 70 + Math.cos(state.animTime*0.7+i)*5, 0, 0, Math.PI*2);
    ctx.fill();
  }
  ctx.restore();

  // dust specks
  for(const d of bgDots){
    ctx.fillStyle = `rgba(255,255,255,${d.a})`;
    ctx.beginPath();
    ctx.arc(d.x * W, d.y * H + Math.sin(state.animTime * 0.6 + d.x*12) * 6, d.r, 0, Math.PI*2);
    ctx.fill();
  }

  // vignette
  const vig = ctx.createRadialGradient(W/2,H/2,Math.min(W,H)*0.2,W/2,H/2,Math.max(W,H)*0.7);
  vig.addColorStop(0,'rgba(0,0,0,0)');
  vig.addColorStop(1,'rgba(0,0,0,0.7)');
  ctx.fillStyle = vig;
  ctx.fillRect(0,0,W,H);
}

// generic gun silhouette used when a weapon has no sprite (flamethrower, railgun, ...)
function drawWeaponFallback(w, len){
  const h = Math.max(6, len * 0.28);
  ctx.save();
  ctx.lineWidth = 2;
  ctx.strokeStyle = palette.outline;
  ctx.fillStyle = w.color || palette.uiAccent;
  roundRect(-len*0.5, -h*0.5, len, h, h*0.35); ctx.fill(); ctx.stroke();         // body
  ctx.fillStyle = shade(w.color || '#48e0c2', -40);
  roundRect(len*0.2, -h*0.3, len*0.45, h*0.6, 2); ctx.fill();                   // barrel shroud
  ctx.fillStyle = shade(w.color || '#48e0c2', -60);
  roundRect(-len*0.3, h*0.3, len*0.18, h*0.9, 2); ctx.fill(); ctx.stroke();     // grip
  ctx.restore();
}

// shop / HUD icon: weapon fitted into a box of size bw x bh with its top-left at (x, y)
function drawWeaponIcon(w, x, y, bw=44, bh=22){
  ctx.save();
  const s = spriteReady('w_' + w.id);
  if(s){
    const [, , cw, ch] = s.crop;
    const k = Math.min(bw / cw, bh / ch);
    ctx.translate(x + bw/2, y + bh/2);
    drawSprite('w_' + w.id, cw*k, ch*k);
  } else {
    ctx.translate(x + bw/2, y + bh/2);
    drawWeaponFallback(w, Math.min(bw, bh*2.2));
  }
  ctx.restore();
}

const _itemCatCache = {};
function itemCategoryOf(id){
  if(!(id in _itemCatCache)) _itemCatCache[id] = ((items.find(i=>i.id===id)||{}).category) || null;
  return _itemCatCache[id];
}
function drawItemIcon(id, x, y){
  ctx.save();
  ctx.translate(x, y);
  ctx.lineWidth = 3;
  ctx.strokeStyle = palette.outline;
  ctx.fillStyle = palette.uiAccent;
  if(id === 'plating'){
    roundRect(0,0,16,16,3); ctx.fill(); ctx.stroke();
  } else if(id === 'overclock'){
    ctx.beginPath(); ctx.moveTo(2,14); ctx.lineTo(8,2); ctx.lineTo(14,14); ctx.closePath(); ctx.fill(); ctx.stroke();
  } else if(id === 'precision'){
    ctx.beginPath(); ctx.arc(8,8,6,0,Math.PI*2); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = palette.uiLight; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(8,2); ctx.lineTo(8,14); ctx.stroke();
  } else if(id === 'vamp'){
    ctx.beginPath(); ctx.arc(6,6,5,0,Math.PI*2); ctx.fill(); ctx.stroke();
  } else if(id === 'belt'){
    roundRect(0,6,16,6,3); ctx.fill(); ctx.stroke();
  } else if(id === 'boots'){
    roundRect(0,8,16,6,2); ctx.fill(); ctx.stroke();
  } else if(id === 'war_crown' || id === 'warcrown'){
    ctx.fillStyle = '#e8b83a';
    ctx.beginPath(); ctx.moveTo(1,13); ctx.lineTo(1,7); ctx.lineTo(4,10); ctx.lineTo(8,3); ctx.lineTo(12,10); ctx.lineTo(15,7); ctx.lineTo(15,13); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#ff5d5d'; ctx.fillRect(7,8,2,2);
  } else {
    // category glyph for expansion items (no dedicated art): distinct silhouette per category
    const cat = itemCategoryOf(id);
    ctx.fillStyle = (cat && CATEGORIES[cat] ? CATEGORIES[cat].color : palette.uiAccent);
    if(cat === 'tech'){
      roundRect(0,0,16,16,3); ctx.fill(); ctx.stroke();
      ctx.fillStyle = 'rgba(0,0,0,0.45)'; roundRect(4,4,8,8,2); ctx.fill();
    } else if(cat === 'primal'){
      ctx.beginPath(); ctx.moveTo(8,1); ctx.lineTo(15,15); ctx.lineTo(1,15); ctx.closePath(); ctx.fill(); ctx.stroke();
    } else if(cat === 'arcane'){
      ctx.beginPath(); ctx.moveTo(8,0); ctx.lineTo(14,8); ctx.lineTo(8,16); ctx.lineTo(2,8); ctx.closePath(); ctx.fill(); ctx.stroke();
    } else if(cat === 'unique'){
      ctx.beginPath();
      for(let s=0;s<10;s++){ const a=-Math.PI/2 + s*Math.PI/5, r=s%2?3.5:7.5; ctx.lineTo(8+r*Math.cos(a), 8+r*Math.sin(a)); }
      ctx.closePath(); ctx.fill(); ctx.stroke();
    } else if(cat === 'exclusive'){
      ctx.beginPath(); ctx.moveTo(8,0); ctx.lineTo(13,8); ctx.lineTo(8,16); ctx.lineTo(3,8); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(8,5); ctx.lineTo(10.5,8); ctx.lineTo(8,11); ctx.lineTo(5.5,8); ctx.closePath(); ctx.stroke();
    } else {
      roundRect(0,0,14,14,3); ctx.fill(); ctx.stroke();
    }
  }
  ctx.restore();
}

function wrapText(text, x, y, maxWidth, lineHeight, maxLines){
  const words = String(text || '').split(' ');
  let line = '';
  let lines = 0;
  for(let i=0;i<words.length;i++){
    const test = line + words[i] + ' ';
    if(ctx.measureText(test).width > maxWidth && line){
      ctx.fillText(line.trim(), x, y + lines * lineHeight);
      lines++;
      line = words[i] + ' ';
      if(maxLines && lines >= maxLines) return;
    } else {
      line = test;
    }
  }
  if(!maxLines || lines < maxLines){
    ctx.fillText(line.trim(), x, y + lines * lineHeight);
  }
}

function drawPlayerWeapon(p){
  // All owned weapons are equipped at once: each barrel points at its own target.
  const ws = p.ownedWeapons.filter(Boolean);
  const n = ws.length;
  ws.forEach((w, i) => {
    const len = weaponHandLength[w.id] || 26;
    const ang = (typeof w.aimAngle === 'number') ? w.aimAngle : p.angle;
    const facingLeft = Math.cos(ang) < 0;
    const stack = n > 1 ? (i - (n - 1) / 2) * 4 : 0;   // slight vertical offset so guns don't fully overlap
    ctx.save();
    ctx.translate(0, 4);
    ctx.rotate(ang);
    ctx.translate(12 + len*0.35 - (i === 0 ? p.kick*30 : 0), stack * 0.35);
    if(facingLeft) ctx.scale(1, -1);        // keep the gun upright when aiming left
    if(!drawSprite('w_' + w.id, len, null)) drawWeaponFallback(w, len);
    ctx.restore();
  });
}

// v0.6.0 paper-doll anchors: [dx, dy] in screen px relative to player centre
const COSMETIC_ANCHOR = { crown:[0,-23], armor:[0,-2], belt:[0,7] };
function drawPlayers(){
  for(let i=0;i<players.length;i++){
    const p = players[i];
    if(p.dead){
      // downed marker with revive progress ring (co-op)
      if(state.coop && state.phase === 'wave'){
        ctx.save();
        ctx.globalAlpha = 0.7;
        ctx.fillStyle = '#ff6b6b';
        ctx.beginPath(); ctx.arc(p.x, p.y, 12, 0, Math.PI*2); ctx.fill();
        ctx.globalAlpha = 1;
        const prog = Math.min(1, (p.reviveProgress || 0) / 3);
        ctx.strokeStyle = '#6ef2b1'; ctx.lineWidth = 4;
        ctx.beginPath(); ctx.arc(p.x, p.y, 18, -Math.PI/2, -Math.PI/2 + prog * Math.PI*2); ctx.stroke();
        ctx.fillStyle = '#fff'; ctx.font = '11px sans-serif'; ctx.textAlign = 'center';
        ctx.fillText('DOWN', p.x, p.y - 26);
        if(prog > 0 && prog < 1) ctx.fillText('REVIVING', p.x, p.y + 32);
        ctx.restore();
      }
      continue;
    }
    // v0.8.3 second wind: downed players get a pulsing red ring with the countdown
    if(p.downed && !p.dead){
      const pulse = 0.5 + Math.sin(state.animTime * 10) * 0.3;
      ctx.save();
      ctx.globalAlpha = pulse;
      ctx.strokeStyle = '#ff6b6b'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.arc(p.x, p.y, 22, 0, Math.PI*2); ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.strokeStyle = '#ffd166'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.arc(p.x, p.y, 22, -Math.PI/2, -Math.PI/2 + Math.max(0, p.downT/6) * Math.PI*2); ctx.stroke();
      ctx.restore();
    }
    const body = i===0 ? '#4a9eff' : '#ff6b6b';
    const moving = p.dashTimer > 0 || (state.phase === 'wave' && (p._lastX !== undefined) && (Math.abs(p.x - p._lastX) + Math.abs(p.y - p._lastY) > 0.2));
    p._lastX = p.x; p._lastY = p.y;
    const bob = moving ? Math.abs(Math.sin(state.animTime * 12 + i)) * -2.5 : Math.sin(state.animTime * 3 + i) * 0.8;

    drawGroundShadow(p.x, p.y + 20, 14, 5);
    // parachute drop-in: canopy + lines while descending
    if(p.dropT > 0){
      const sway = Math.sin(state.animTime * 5) * 6;
      ctx.save();
      ctx.translate(p.x + sway * 0.3, p.y - 46 + bob * 0.3);
      ctx.fillStyle = '#e8e2d0';
      ctx.beginPath(); ctx.arc(0, 0, 26, Math.PI, 0); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#c94f4f';
      ctx.beginPath(); ctx.arc(0, 0, 26, Math.PI * 1.25, Math.PI * 1.75); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.arc(0, 0, 26, Math.PI * 1.08, Math.PI * 1.42); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.arc(0, 0, 26, Math.PI * 1.58, Math.PI * 1.92); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#8a8578'; ctx.lineWidth = 2;
      for(const lx of [-20, -7, 7, 20]){
        ctx.beginPath(); ctx.moveTo(lx * 1.1, -8); ctx.lineTo(lx * 0.3 + sway * 0.2, 34); ctx.stroke();
      }
      ctx.restore();
    }
    ctx.save();
    ctx.translate(p.x, p.y + bob);

    // direction -> sprite (down / side / up), side is mirrored for left
    let deg = p.angle * 180 / Math.PI;
    deg = ((deg % 360) + 360) % 360;
    let key = 'playerSide', flipX = false;
    if(deg >= 45 && deg < 135) key = 'playerDown';
    else if(deg >= 225 && deg < 315) key = 'playerUp';
    else if(deg >= 135 && deg < 225) flipX = true;

    // weapon goes behind the body when facing up
    if(key === 'playerUp') drawPlayerWeapon(p);

    // co-op: coloured ring so players can tell each other apart
    if(players.length > 1){
      ctx.save();
      ctx.strokeStyle = body; ctx.lineWidth = 2; ctx.globalAlpha = 0.85;
      ctx.beginPath(); ctx.ellipse(0, 20 - bob, 15, 6, 0, 0, Math.PI*2); ctx.stroke();
      ctx.restore();
    }

    const flash = p.hitFlash > 0 ? p.hitFlash / 0.12 : 0;
    const blink = p.iFrames > 0 && p.dashTimer <= 0 && Math.floor(state.animTime * 20) % 2 === 0;
    ctx.save();
    if(blink) ctx.globalAlpha = 0.55;
    // [brad-fx] animated v0.56 sprite sheets (fx.js); falls back to the original PNGs
    const drawn = (window.FX && FX.drawPlayer(p, i, key, flipX, flash, moving)) || drawSprite(key, null, 46, {flipX, flash});
    // v0.6.0 paper-doll: owned cosmetic items render on the character (same for P1/P2)
    if(drawn && window.FX && p.items){
      for(const it of p.items){
        if(!it.cosmetic) continue;
        const a = COSMETIC_ANCHOR[it.cosmetic];
        if(a) FX.drawCosmetic(it.cosmetic, a[0], a[1]);
      }
    }
    ctx.restore();
    if(!drawn){
      // fallback body
      ctx.save();
      ctx.rotate(p.angle);
      ctx.fillStyle = palette.outline;
      ctx.beginPath(); ctx.ellipse(0,0,18,14,0,0,Math.PI*2); ctx.fill();
      ctx.fillStyle = flash > 0 ? '#ffffff' : body;
      ctx.beginPath(); ctx.ellipse(0,0,16,12,0,0,Math.PI*2); ctx.fill();
      ctx.fillStyle = '#2b1e10';
      ctx.beginPath(); ctx.arc(4,-3,2,0,Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(9,-3,2,0,Math.PI*2); ctx.fill();
      ctx.restore();
    }

    if(key !== 'playerUp') drawPlayerWeapon(p);

    if(players.length > 1){
      ctx.fillStyle = body;
      ctx.font = uiFont(11, 'bold');
      ctx.textAlign = 'center';
      ctx.fillText(`P${i+1}`, 0, -30);
      ctx.textAlign = 'start';
    }
    ctx.restore();
  }
}

// HUD scales with the window (it is never clicked, so a plain transform is safe)
function hudScale(){ return Math.max(0.8, Math.min(1.25, Math.min(W/1280, H/720) * 1.05)); }

// Perf: drawBar() runs ~7x per frame in the HUD and built a fresh gradient each time. The gradient
// only depends on (x,w,c1,c2) and positions are stable frame-to-frame, so cache it.
const barGradCache = new Map();
function barGradient(x, w, c1, c2){
  const key = x + '|' + w + '|' + c1 + '|' + c2;
  let g = barGradCache.get(key);
  if(!g){
    g = ctx.createLinearGradient(x, 0, x + w, 0);
    g.addColorStop(0, c1); g.addColorStop(1, c2);
    if(barGradCache.size > 160) barGradCache.clear();
    barGradCache.set(key, g);
  }
  return g;
}

function drawBar(x, y, w, h, frac, c1, c2, label){
  ctx.fillStyle = 'rgba(4,7,13,0.85)';
  roundRect(x-2, y-2, w+4, h+4, (h+4)/2); ctx.fill();
  ctx.fillStyle = palette.uiMid;
  roundRect(x, y, w, h, h/2); ctx.fill();
  const f = Math.max(0, Math.min(1, frac || 0));
  if(f > 0){
    ctx.fillStyle = barGradient(x, w, c1, c2);
    roundRect(x, y, w * f, h, h/2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    roundRect(x + 2, y + 1, Math.max(0, w * f - 4), Math.max(1, h * 0.35), h/4); ctx.fill();
  }
  if(label){
    ctx.font = uiFont(Math.max(10, Math.round(h * 0.78)), 'bold');
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillText(label, x + w/2 + 1, y + h*0.8 + 1);
    ctx.fillStyle = palette.text;
    ctx.fillText(label, x + w/2, y + h*0.8);
    ctx.textAlign = 'start';
  }
}

function drawCoin(x, y, r){
  if(window.FX && FX.drawMaterialIcon(x, y, r)) return;   // [brad-fx] same green gem as the pickups
  ctx.fillStyle = palette.outline;
  ctx.beginPath(); ctx.arc(x, y, r+1.5, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = palette.uiGreen;
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  ctx.beginPath(); ctx.arc(x - r*0.3, y - r*0.3, r*0.35, 0, Math.PI*2); ctx.fill();
}

function drawPlayerCard(p, x, y, w, title, accent){
  panel(x, y, w, 96, palette.uiLight, palette.outline, 12);
  ctx.fillStyle = accent;
  roundRect(x + 10, y + 10, 4, 76, 2); ctx.fill();
  ctx.font = uiFont(13, 'bold');
  ctx.fillStyle = palette.textLight;
  ctx.fillText(title, x + 22, y + 24);
  ctx.textAlign = 'right';
  ctx.fillText(`Lv ${p.level}`, x + w - 14, y + 24);
  ctx.textAlign = 'start';
  const bw = w - 36;
  const hpLabel = p.dead ? 'DOWN' : `${Math.max(0, Math.round(p.hp))} / ${p.baseMaxHp}`;
  drawBar(x + 22, y + 32, bw, 16, p.dead ? 0 : p.hp / p.baseMaxHp, '#ff5d5d', '#ff9b6b', hpLabel);
  drawBar(x + 22, y + 56, bw, 8, p.xp / p.xpNext, '#7cff6b', '#6cd6ff');
  drawCoin(x + 29, y + 80, 5.5);
  ctx.font = uiFont(13, 'bold');
  ctx.fillStyle = palette.text;
  ctx.fillText(`${p.currency}`, x + 40, y + 85);
}

// y (in HUD units) for the P2 card: 8px below the DOM Pause button, measured in canvas pixels.
// Perf: the Pause button only moves on resize or when its visibility toggles, so cache the rect
// math keyed on (W,H,display) instead of forcing layout with getBoundingClientRect every frame.
let _p2CardCache = {key: null, y: 62};
function hudP2CardY(S){
  const disp = pauseBtn ? pauseBtn.style.display : 'none';
  const key = W + 'x' + H + '|' + disp;
  if(key !== _p2CardCache.key){
    let bottomPx = 62 * S;
    if(pauseBtn && disp !== 'none'){
      const br = pauseBtn.getBoundingClientRect(), cr = canvas.getBoundingClientRect();
      if(br.height > 0) bottomPx = br.bottom - cr.top + 8;
    }
    _p2CardCache = {key, y: Math.max(62, bottomPx / S)};
  }
  return _p2CardCache.y;
}

function drawHUD(){
  const p = players[0];
  const S = hudScale();
  const VW = W / S, VH = H / S;       // virtual size in HUD units
  ctx.save();
  ctx.scale(S, S);

  // --- top-left: player 1 card
  drawPlayerCard(p, 12, 12, 250, players.length > 1 ? 'PLAYER 1' : 'PLAYER', '#4a9eff');

  // --- top-centre: wave + enemies remaining
  const ww = 220, wx = VW/2 - ww/2;
  panel(wx, 12, ww, 52, palette.uiLight, palette.outline, 12);
  ctx.font = uiFont(16, 'bold');
  ctx.textAlign = 'center';
  ctx.fillStyle = palette.uiAccent;
  const isBoss = state.wave >= state.maxWave;
  ctx.fillText(isBoss ? `WAVE ${state.wave} — BOSS` : `WAVE ${state.wave} / ${state.maxWave}`, VW/2, 33);
  if(typeof devMode !== 'undefined' && devMode){ ctx.fillStyle = '#7dff9a'; ctx.font = uiFont(11, 'bold'); ctx.fillText('DEV MODE', VW/2, 48); ctx.fillStyle = palette.uiAccent; }
  ctx.textAlign = 'start';
  // elite mini-boss / boss HP bar: show the toughest living elite or boss
  const boss = enemies.find(e=>e.isBoss);
  const elite = enemies.filter(e=>e.elite).sort((a,b)=>(b.maxHp - b.hp) - (a.maxHp - a.hp))[0];
  const threat = boss || elite;
  if(threat && state.phase === 'wave'){
    const ew = 200, ex = VW/2 - ew/2, ey = 70;
    ctx.font = uiFont(12, 'bold');
    ctx.textAlign = 'center';
    ctx.fillStyle = boss ? '#ff6b6b' : '#ffd166';
    ctx.fillText(threat.bossName || threat.eliteName || 'Elite', VW/2, ey + 10);
    drawBar(ex, ey + 16, ew, 8, Math.max(0, threat.hp / threat.maxHp), boss ? '#ff6b6b' : '#ffd166', '#8a6a1c');
    ctx.textAlign = 'start';
  }
  if(state.phase === 'wave'){
    const tLeft = Math.max(0, WAVE_DURATION - (state.waveTime || 0));
    const tStr = Math.floor(tLeft / 60) + ':' + String(Math.floor(tLeft % 60)).padStart(2, '0');
    drawBar(wx + 14, 42, ww - 28, 10, 1 - tLeft / WAVE_DURATION, '#48e0c2', '#5fb0ff');
    ctx.font = uiFont(10);
    ctx.fillStyle = palette.textLight;
    ctx.textAlign = 'center';
    ctx.fillText(tStr, VW/2, 76);
    ctx.textAlign = 'start';
  } else {
    ctx.font = uiFont(11);
    ctx.fillStyle = palette.textLight;
    ctx.textAlign = 'center';
    ctx.fillText(state.phase === 'shop' ? 'Shop — prepare for the next wave' : 'Wave cleared!', VW/2, 52);
    ctx.textAlign = 'start';
  }

  // --- top-right: player 2 card (below the DOM pause button)
  // [brad-ui] (b) P2 card below the DOM Pause button at every HUD scale (Greg's hudP2CardY)
  if(players[1]) drawPlayerCard(players[1], VW - 262, hudP2CardY(S), 250, 'PLAYER 2', '#ff6b6b');

  // --- bottom-left: weapon arsenal + ammo, dash (all owned weapons fire at once)
  // [brad-ui] (d) card is 66 tall so the ammo line has room above the bottom border
  const by = VH - 78;
  panel(12, by, 250, 66, palette.uiLight, palette.outline, 12);
  ctx.font = uiFont(11, 'bold'); ctx.fillStyle = palette.textLight;
  ctx.fillText(`WEAPONS (${p.ownedWeapons.length}/6)`, 20, by + 16);
  const arsenal = p.ownedWeapons.slice(0, 6);
  arsenal.forEach((w, i) => {
    const ix = 20 + i * 38;
    const rc = (typeof RARITY_COLORS !== 'undefined' && RARITY_COLORS[w.rarity]) || '#a7b3c4';
    ctx.fillStyle = 'rgba(190,215,255,0.10)';
    roundRect(ix, by + 22, 34, 34, 6); ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = rc;
    roundRect(ix + 1, by + 23, 32, 32, 5); ctx.stroke();
    drawWeaponIcon(w, ix + 2, by + 24, 30, 18);
    if(!w.melee){
      // per-weapon ammo: yellow fill while reloading, teal/green otherwise
      const magMax = Math.max(1, (w.mag || 0) + p.magBonus);
      const frac = w.reloading > 0
        ? 1 - w.reloading / Math.max(0.01, w.reload * (p.reloadSpeed || 1))
        : w.ammoInMag / magMax;
      drawBar(ix + 2, by + 48, 30, 5, Math.max(0, Math.min(1, frac)),
        w.reloading > 0 ? '#ffd166' : palette.uiAccent, w.reloading > 0 ? '#ffb44c' : palette.uiGreen, '');
    }
    if(w.overheatMax && w.heat > 0){
      drawBar(ix + 2, by + 48, 30, 5, Math.min(1, w.heat / w.overheatMax), '#ffd166', '#ff5d5d', '');
    }
  });
  const dy = by - 42;
  panel(12, dy, 170, 32, palette.uiLight, palette.outline, 10, {shadow:false});
  ctx.font = uiFont(12, 'bold');
  ctx.fillStyle = palette.text;
  ctx.fillText('DASH', 22, dy + 21);
  const dashReady = 1 - Math.min(1, Math.max(0, p.dashCooldown) / 2.1);
  drawBar(66, dy + 10, 106, 12, dashReady, palette.uiBlue, palette.uiGreen, dashReady >= 0.999 ? 'READY' : '');

  // --- bottom-right: mute indicator
  if(audio.muted){
    panel(VW-130, VH-44, 118, 32, palette.uiLight, palette.outline, 10, {shadow:false});
    ctx.font = uiFont(12, 'bold');
    ctx.fillStyle = palette.text;
    ctx.fillText('MUTED (M)', VW-110, VH-23);
  }
  ctx.restore();
}

// ---- shared layouts: used by both drawing and click hit-testing ----------
function getUpgradeLayout(){
  const n = Math.max(1, upgradeChoices.items.length);
  const panelW = Math.min(720, W * 0.92);
  const cardGap = 12;
  const cardW = (panelW - 32 - cardGap * (n - 1)) / n;
  const cardH = 150;
  const panelH = cardH + 110;
  const px = (W - panelW) / 2, py = (H - panelH) / 2;
  const cards = [];
  for(let i=0;i<n;i++) cards.push({x: px + 16 + i * (cardW + cardGap), y: py + 70, w: cardW, h: cardH});
  return {px, py, panelW, panelH, cards};
}

// [brad-ui] v0.56: the shop layout lives in ui.js (ShopUI). These delegates keep game.js click
// handling and the shop drawing on the same rects.
function getShopCardRect(def, i){ return ShopUI.cardRect(def, i); }
function getShopButtons(){ return ShopUI.buttons(); }
function inRect(mx, my, r){ return mx >= r.x && mx <= r.x + r.w && my >= r.y && my <= r.y + r.h; }

function drawButton(r, label, {primary=false, disabled=false}={}){
  const hover = !disabled && inRect(input.mx, input.my, r);
  const lift = 0;   // no hover lift: drawn button == click rect
  ctx.save();
  ctx.fillStyle = palette.outline;
  roundRect(r.x, r.y + 4, r.w, r.h, 10); ctx.fill();          // drop edge
  const g = ctx.createLinearGradient(0, r.y + lift, 0, r.y + r.h + lift);
  if(primary && !disabled){ g.addColorStop(0, hover ? '#6af0d4' : '#48e0c2'); g.addColorStop(1, '#2dbba0'); }
  else { g.addColorStop(0, hover ? '#2a4259' : '#1f3346'); g.addColorStop(1, '#152436'); }
  ctx.fillStyle = g;
  roundRect(r.x, r.y + lift, r.w, r.h, 10); ctx.fill();
  ctx.lineWidth = 3; ctx.strokeStyle = palette.outline; ctx.stroke();
  ctx.font = uiFont(14, 'bold');
  ctx.textAlign = 'center';
  ctx.fillStyle = primary && !disabled ? '#041018' : (disabled ? '#6f839b' : palette.text);
  ctx.fillText(label, r.x + r.w/2, r.y + r.h/2 + 5 + lift);
  ctx.textAlign = 'start';
  ctx.restore();
  return hover;
}

function drawUpgradeSelector(){
  if(state.phase !== 'upgrade') return;
  ctx.fillStyle = 'rgba(2,6,12,0.55)';
  ctx.fillRect(0, 0, W, H);
  const L = getUpgradeLayout();
  panel(L.px, L.py, L.panelW, L.panelH, palette.uiLight, palette.outline, 16);
  ctx.textAlign = 'center';
  ctx.fillStyle = palette.uiAccent;
  ctx.font = uiFont(22, 'bold');
  ctx.fillText('LEVEL UP', W/2, L.py + 34);
  ctx.font = uiFont(12);
  ctx.fillStyle = palette.textLight;
  ctx.fillText(players.length > 1 ? 'Choose one upgrade (applies to both players)' : 'Choose one upgrade', W/2, L.py + 54);
  ctx.textAlign = 'start';

  let anyHover = false;
  for(let i=0;i<upgradeChoices.items.length;i++){
    const choice = upgradeChoices.items[i];
    const c = L.cards[i];
    const hover = inRect(input.mx, input.my, c);
    anyHover = anyHover || hover;
    // [brad-ui] (f) the card face rises inside its own rect on hover, so the lifted card is exactly the click area
    const lift = hover ? 0 : 4;
    ctx.save();
    ctx.translate(0, lift);
    panel(c.x, c.y, c.w, c.h - 4, hover ? '#2a4259' : palette.uiMid, hover ? choice.tier.color : palette.outline, 12);
    // tier band
    ctx.fillStyle = choice.tier.color;
    roundRect(c.x + 8, c.y + 8, c.w - 16, 6, 3); ctx.fill();
    ctx.textAlign = 'center';
    ctx.font = uiFont(11, 'bold');
    ctx.fillStyle = choice.tier.color;
    ctx.fillText(choice.tier.name.toUpperCase(), c.x + c.w/2, c.y + 34);
    ctx.font = uiFont(c.w < 130 ? 13 : 15, 'bold');
    ctx.fillStyle = palette.text;
    ctx.fillText(choice.stat.name, c.x + c.w/2, c.y + 66);
    ctx.font = uiFont(26, 'bold');
    ctx.fillStyle = choice.tier.color;
    ctx.fillText(`+${Math.round((choice.tier.mult-1)*100)}%`, c.x + c.w/2, c.y + 106);
    ctx.font = uiFont(10);
    ctx.fillStyle = palette.textLight;
    ctx.fillText(hover ? 'Click to pick' : `Tier multiplier x${choice.tier.mult}`, c.x + c.w/2, c.y + c.h - 18);
    ctx.textAlign = 'start';
    ctx.restore();
  }
  setCursor(anyHover ? 'pointer' : 'default');
}

// [brad-ui] v0.56 Brotato-style shop screen, drawn by ui.js; Tab still opens the full stats view
function drawShop(){
  if(typeof USE_DOM_UI !== 'undefined' && USE_DOM_UI) return;
  if(state.phase !== 'shop') return;
  if(state.shopView === 'stats'){
    drawStatsMenu();
    return;
  }
  ShopUI.draw();
}

function getShopPanels(){ return ShopUI.panels(); }   // [brad-ui] one panel: the shopping player's card area

function drawStatsMenu(){
  const p = players[0];
  ctx.fillStyle = 'rgba(2,6,12,0.6)';
  ctx.fillRect(0, 0, W, H);
  const panelW = Math.min(720, W*0.92);
  const panelH = Math.min(440, H*0.88);
  const px = (W-panelW)/2;
  const py = (H-panelH)/2;
  panel(px, py, panelW, panelH, palette.uiLight, palette.outline, 16);
  ctx.fillStyle = palette.uiAccent;
  ctx.font = uiFont(20, 'bold');
  ctx.fillText('STATS', px+20, py+34);
  ctx.font = uiFont(12);
  ctx.fillStyle = palette.textLight;
  ctx.fillText('Tab to return to the shop', px+92, py+33);
  const rows = [
    ['Class', p.className],
    ['HP', `${Math.round(p.hp)} / ${p.baseMaxHp}`],
    ['Speed', `${p.baseSpeed}`],
    ['Armor', `${p.armor}`],
    ['Life Steal', `${(p.lifesteal*100).toFixed(1)}%`],
    ['Reload Speed', p.reloadSpeed.toFixed(2)],
    ['Accuracy', p.accuracy.toFixed(2)],
    ['Mag Bonus', `+${p.magBonus}`],
    ['Damage Bonus', `+${p.damageBonus}`],
    ['Crit Chance', `${(p.critChance*100).toFixed(1)}%`],
    ['Elemental Bonus', `+${Math.round(p.elementalBonus*100)}%`],
    ['Luck', `${p.luck}`],
  ];
  const colW = Math.min(260, panelW * 0.4);
  for(let i=0;i<rows.length;i++){
    const ry = py + 64 + i * 22;
    if(i % 2 === 0){ ctx.fillStyle = 'rgba(255,255,255,0.04)'; ctx.fillRect(px + 16, ry - 15, colW, 22); }
    ctx.font = uiFont(12);
    ctx.fillStyle = palette.textLight;
    ctx.fillText(rows[i][0], px + 24, ry);
    ctx.font = uiFont(12, 'bold');
    ctx.fillStyle = palette.text;
    ctx.textAlign = 'right';
    ctx.fillText(rows[i][1], px + 16 + colW - 8, ry);
    ctx.textAlign = 'start';
  }
  const mx = px + 16 + colW + 24;
  const mw = panelW - (mx - px) - 20;
  ctx.font = uiFont(13, 'bold');
  ctx.fillStyle = palette.uiAccent;
  ctx.fillText('What the stats do', mx, py + 64);
  const mods = [
    'Engineering: increases bonus damage from effects (mapped to Damage Bonus).',
    'Elemental Dmg: adds extra damage and boosts status effects (fire/ice/shock/explosive).',
    'Attack Speed: reduces fire delay (higher = faster shots).',
    'Base Damage: adds flat damage to all weapons.',
    'Accuracy: tighter spread / less bullet deviation.',
    'Reload Speed: lower time between mags (higher = faster reload).',
    'Crit Chance: chance to deal 1.5x damage.',
    'Luck: improves rarity rolls in shop (more rare items).',
  ];
  ctx.font = uiFont(11);
  ctx.fillStyle = palette.textLight;
  let yy = py + 86;
  for(const m of mods){
    const lines = Math.max(1, Math.ceil(ctx.measureText(m).width / Math.max(60, mw)));
    wrapText(m, mx, yy, mw, 14, 3);
    yy += Math.min(3, lines) * 14 + 6;
  }
}

function drawEffects(){
  // money drops ([brad-fx] v0.56 green material gems with bob/pulse/swoop in fx.js; old squares are the fallback)
  if(!(window.FX && FX.drawMoney())) for(const m of moneyDrops){
    const bob = Math.sin(m.t * 10) * 2.4;
    ctx.shadowColor = 'rgba(124,255,107,0.7)';
    ctx.shadowBlur = 12;
    ctx.fillStyle = palette.uiGreen;
    roundRect(m.x-5, m.y-5 + bob, 10, 10, 2); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.lineWidth = 2;
    ctx.strokeStyle = palette.outline;
    roundRect(m.x-5, m.y-5 + bob, 10, 10, 2); ctx.stroke();
  }

  // floating damage text
  ctx.font = 'bold 12px "Trebuchet MS", system-ui, sans-serif';
  ctx.textAlign = 'center';
  for(const ft of floatingTexts){
    ctx.globalAlpha = Math.max(0, Math.min(1, ft.life * 1.5));
    ctx.fillStyle = ft.color;
    ctx.fillText(ft.text, ft.x, ft.y);
  }
  ctx.globalAlpha = 1;
  ctx.textAlign = 'start';

  // trees (draw)
  for(const tr of trees){
    drawGroundShadow(tr.x, tr.y + 22, 18, 6);
    ctx.save();
    ctx.translate(tr.x, tr.y);
    const sway = Math.sin(state.animTime * 1.5 + tr.x * 0.05) * 0.03;
    ctx.rotate(sway);
    // [brad-fx] v0.56 tree in the ground palette (fx.js); falls back to a drawn shape
    if(!(window.FX && FX.drawTree()) && !drawSprite('tree', 46, null, {anchorY: 0.62})){     // 1:1 with the 64px source art
      ctx.fillStyle = '#3b2a1a'; ctx.fillRect(-4, 4, 8, 16);
      ctx.fillStyle = palette.outline;
      ctx.beginPath(); ctx.arc(0,-4,tr.r+2,0,Math.PI*2); ctx.fill();
      ctx.fillStyle = '#5a9f3a';
      ctx.beginPath(); ctx.arc(0,-4,tr.r,0,Math.PI*2); ctx.fill();
    }
    ctx.restore();
    if(tr.hp < tr.maxHp){
      ctx.fillStyle = palette.outline; roundRect(tr.x-16, tr.y-36, 32, 5, 2); ctx.fill();
      ctx.fillStyle = palette.uiGreen; roundRect(tr.x-15, tr.y-35, 30 * Math.max(0, tr.hp/tr.maxHp), 3, 1.5); ctx.fill();
    }
  }

  // fruits (draw)
  for(const f of fruits){
    const bob = Math.sin(f.t * 6) * 2;
    ctx.fillStyle = '#ff6b6b';
    ctx.beginPath(); ctx.arc(f.x, f.y + bob, f.r, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#2b1e10';
    ctx.fillRect(f.x-1, f.y + bob - f.r - 4, 2, 6);
  }

  // bullets: each distinct (disc color, crit) combo is pre-rendered once into a small sprite with
  // its glow baked in. The old code drew every bullet with ctx.save/restore + shadowBlur, one of
  // the most expensive canvas ops; this blits one cached image per bullet instead. Same disc
  // colors/sizes and a matching soft glow, so the look is unchanged.
  for(const b of bullets){
    const s = bulletSprite(b.crit ? '#ffd166' : (b.color || '#fffa'), b.crit);
    ctx.save();
    ctx.translate(b.x, b.y);
    ctx.rotate(Math.atan2(b.vy, b.vx));
    ctx.drawImage(s.c, -s.half, -s.half);
    ctx.restore();
  }

  // enemies
  ctx.globalAlpha = 1;
  for(const e of enemies){
    ctx.globalAlpha = e.phased ? 0.35 : 1;
    const wob = 1 + Math.sin(state.animTime * 5 + e.x * 0.02 + e.y * 0.01) * 0.03;
    const flash = e.hitFlash > 0 ? e.hitFlash / 0.1 : 0;
    drawGroundShadow(e.x, e.y + e.r * 0.9 + 2, e.r * 0.95, e.r * 0.35);
    ctx.save();
    ctx.translate(e.x, e.y);
    ctx.scale(wob, wob);
    // spitter: animated v0.56 enemy sheet (fx.js); falls back to a drawn shape
    // [brad-fx] animated v0.56 enemy sheets (fx.js) return the sprite's half-height; else the old art
    const fxTop = window.FX ? FX.drawEnemy(e, flash) : 0;
    const useSprite = fxTop > 0 || (e.id === 'spitter' && drawSprite('enemyLight', null, 36, {flipX: e.face < 0, flash}));
    if(!useSprite){
      ctx.fillStyle = palette.outline;
      ctx.beginPath(); ctx.arc(0,0,e.r+2,0,Math.PI*2); ctx.fill();
      ctx.fillStyle = flash > 0 ? '#ffffff' : e.color;
      ctx.beginPath(); ctx.arc(0,0,e.r,0,Math.PI*2); ctx.fill();
      // soft highlight
      ctx.fillStyle = 'rgba(255,255,255,0.18)';
      ctx.beginPath(); ctx.arc(-e.r*0.3,-e.r*0.35,e.r*0.45,0,Math.PI*2); ctx.fill();
      // eyes look toward travel direction
      const look = (e.face || 1) * Math.min(3, e.r*0.2);
      ctx.fillStyle = '#2b1e10';
      ctx.beginPath(); ctx.arc(-e.r*0.3 + look,-e.r*0.15,Math.max(1.6, e.r*0.16),0,Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(e.r*0.3 + look,-e.r*0.15,Math.max(1.6, e.r*0.16),0,Math.PI*2); ctx.fill();
    }

    // elite: pulsing gold ring
    if(e.elite){
      const pulse = 1 + Math.sin(state.animTime * 8 + e.x * 0.05) * 0.07;
      ctx.save(); ctx.globalAlpha = 0.9;
      ctx.strokeStyle = '#ffd166'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(0, 0, (e.r + 7) * pulse, 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
    }

    // hp bar (only once damaged, keeps crowds readable) — elites get a thicker gold bar
    const barTop = fxTop > 0 ? -fxTop - 6 : useSprite ? -22 : -e.r-10;
    if(e.hp < e.maxHp || e.isBoss || e.elite){
      const barH = e.elite ? 8 : 6, fillH = e.elite ? 6 : 4;
      ctx.fillStyle = palette.outline;
      roundRect(-e.r-2, barTop, e.r*2+4, barH, 3); ctx.fill();
      ctx.fillStyle = e.isBoss ? '#ff6b6b' : e.elite ? '#ffd166' : '#ff8a5c';
      roundRect(-e.r, barTop+1, (e.r*2) * Math.max(0, e.hp/e.maxHp), fillH, 2); ctx.fill();
    }
    if(e.isBoss){
      ctx.fillStyle = '#ffb44c';
      ctx.beginPath(); ctx.moveTo(-6,barTop-8); ctx.lineTo(0,barTop-18); ctx.lineTo(6,barTop-8); ctx.closePath(); ctx.fill();
    }
    if(e.elite){
      // gold crown above the bar — unmissable in a horde
      const cy = barTop - 10;
      ctx.fillStyle = '#ffd166';
      ctx.beginPath();
      ctx.moveTo(-9, cy); ctx.lineTo(-9, cy-7); ctx.lineTo(-4.5, cy-2.5); ctx.lineTo(0, cy-8);
      ctx.lineTo(4.5, cy-2.5); ctx.lineTo(9, cy-7); ctx.lineTo(9, cy);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#8a6d1f';
      ctx.fillRect(-9, cy-1.5, 18, 3);
    }
    ctx.restore();
  }
  ctx.globalAlpha = 1;

  // vortex wells: swirling gravity rings
  for(const v of vortices){
    const va = Math.min(1, v.t);
    ctx.save();
    ctx.globalAlpha = 0.7 * va;
    ctx.strokeStyle = '#c77bff'; ctx.lineWidth = 3;
    for(let ring=0; ring<3; ring++){
      const rr = (state.animTime * 60 + ring * 40) % v.r;
      ctx.beginPath(); ctx.arc(v.x, v.y, Math.max(4, v.r - rr), 0, Math.PI*2); ctx.stroke();
    }
    ctx.restore();
  }

  // particles ([brad-fx] v0.56: soft additive glows instead of flat discs; fx.js adds the sparks)
  ctx.save();
  if(window.FX) ctx.globalCompositeOperation = 'lighter';
  for(const p of particles){
    const a = Math.max(0, Math.min(1, p.life*5));
    if(window.FX && FX.glow(p.color, p.x, p.y, p.r * 1.6, a * 0.7)) continue;
    ctx.fillStyle = p.color;
    ctx.globalAlpha = a;
    ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,Math.PI*2); ctx.fill();
    ctx.globalAlpha = 1;
  }
  ctx.restore();
  // adrenaline vignette: pulsing red edges when a player is under 30% HP
  const adrenP = (typeof players !== 'undefined') && players.some(p => p.adrenaline && !p.dead);
  if(adrenP){
    const pulse = 0.25 + Math.sin(state.animTime * 6) * 0.1;
    const vg = ctx.createRadialGradient(W/2, H/2, Math.min(W,H)*0.35, W/2, H/2, Math.max(W,H)*0.7);
    vg.addColorStop(0, 'rgba(255,30,30,0)');
    vg.addColorStop(1, `rgba(255,30,30,${pulse})`);
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, W, H);
  }
}

function drawWaveBanner(){
  if(state.eliteBanner > 0){
    const t = state.eliteBanner, alpha = Math.min(1, t);
    const y = H*0.2 + 74;
    ctx.save(); ctx.globalAlpha = alpha;
    panel(W/2 - 190, y, 380, 46, palette.uiLight, palette.outline, 12, {alpha});
    ctx.fillStyle = '#ffd166'; ctx.font = uiFont(22, 'bold'); ctx.textAlign = 'center';
    ctx.fillText('⚠ ELITES INBOUND ⚠', W/2, y + 32);
    ctx.textAlign = 'start'; ctx.restore();
  }
  if(state.waveBanner <= 0) return;
  const t = state.waveBanner;
  const alpha = Math.min(1, t);
  const slide = Math.max(0, (t - 1.9)) * 60;   // small drop-in
  const y = H*0.2 - slide;
  panel(W/2 - 150, y, 300, 60, palette.uiLight, palette.outline, 14, {alpha});
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = state.wave >= state.maxWave ? '#ff6b6b' : palette.uiAccent;
  ctx.font = uiFont(26, 'bold');
  ctx.textAlign = 'center';
  ctx.fillText(state.wave >= state.maxWave ? 'BOSS WAVE' : `WAVE ${state.wave}`, W/2, y + 40);
  ctx.textAlign = 'start';
  ctx.restore();
}

// Celebration banner after clearing the final wave: names the unlocked danger (if any),
// then update() returns to the menu after a few seconds. Not a victory screen.
// v0.8.3: deployed sentry turrets (tripod base, rotating barrel, uptime ring)
function drawTurrets(){
  for(const tu of turrets){
    const a = Math.min(1, tu.t / 3); // fade as uptime expires
    ctx.save();
    ctx.globalAlpha = Math.max(0.15, a);
    ctx.strokeStyle = '#3a4a5f'; ctx.lineWidth = 3;
    for(let k=0;k<3;k++){
      const la = k * Math.PI*2/3 + 0.5;
      ctx.beginPath(); ctx.moveTo(tu.x, tu.y);
      ctx.lineTo(tu.x + Math.cos(la)*18, tu.y + Math.sin(la)*18); ctx.stroke();
    }
    ctx.fillStyle = '#2a3a4f';
    ctx.beginPath(); ctx.arc(tu.x, tu.y, 12, 0, Math.PI*2); ctx.fill();
    ctx.strokeStyle = '#6ef2b1'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(tu.x, tu.y, 12, 0, Math.PI*2); ctx.stroke();
    ctx.save();
    ctx.translate(tu.x, tu.y); ctx.rotate(tu.angle || 0);
    ctx.fillStyle = '#6ef2b1';
    ctx.fillRect(0, -3, 20, 6);
    ctx.restore();
    ctx.fillStyle = '#6ef2b1';
    ctx.beginPath(); ctx.arc(tu.x, tu.y, 6, 0, Math.PI*2); ctx.fill();
    ctx.strokeStyle = 'rgba(110,242,177,0.6)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(tu.x, tu.y, 17, -Math.PI/2, -Math.PI/2 + Math.PI*2*Math.max(0, Math.min(1, tu.t/(tu.tmax || 25)))); ctx.stroke();
    ctx.restore();
  }
}

// v0.8.3: second-wind overlay — red pulse + countdown, screen space
function drawSecondWind(){
  const p = (typeof players !== 'undefined') && players.find(q => q.downed && !q.dead);
  if(!p) return;
  const pulse = 0.3 + Math.sin(state.animTime * 8) * 0.12;
  const vg = ctx.createRadialGradient(W/2, H/2, Math.min(W,H)*0.3, W/2, H/2, Math.max(W,H)*0.7);
  vg.addColorStop(0, 'rgba(255,30,30,0)');
  vg.addColorStop(1, `rgba(255,30,30,${pulse})`);
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, W, H);
  ctx.save();
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ff6b6b';
  ctx.font = uiFont(30, 'bold');
  ctx.fillText('SECOND WIND', W/2, H*0.28);
  ctx.fillStyle = '#ffd166';
  ctx.font = uiFont(20, 'bold');
  ctx.fillText(`GET A KILL — ${Math.max(0, Math.ceil(p.downT))}s`, W/2, H*0.28 + 36);
  ctx.textAlign = 'start';
  ctx.restore();
}

function drawVictory(){
  const t = Math.min(1, state.victoryTimer * 2);
  const y = H * 0.26;
  ctx.save();
  ctx.globalAlpha = t;
  panel(W/2 - 230, y, 460, 122, palette.uiLight, palette.uiAccent, 16);
  ctx.fillStyle = '#ffd166';
  ctx.font = uiFont(30, 'bold'); ctx.textAlign = 'center';
  ctx.fillText(state.victoryUnlocked > 0 ? `DANGER ${state.victoryUnlocked} UNLOCKED!` : `DANGER ${state.danger} CLEARED!`, W/2, y + 54);
  ctx.fillStyle = palette.text; ctx.font = uiFont(14);
  ctx.fillText(state.victoryUnlocked > 0 ? 'The next danger level awaits in the menu.' : 'You beat the highest danger. Legendary!', W/2, y + 86);
  ctx.textAlign = 'start';
  ctx.restore();
}


function draw(){
  if(window.FX) FX.frame();   // [brad-fx] effects bookkeeping (draw-side only)
  // v0.6.9 WebGL: the world renders to an offscreen canvas and is composited
  // through the lighting shader; HUD/menus draw directly to the screen after.
  const glOn = window.WebGLFX && WebGLFX.active();
  if(glOn) WebGLFX.beginWorld(); else ctx.clearRect(0,0,W,H);
  drawBackground();
  if(state.phase === 'menu'){
    // menu is DOM; don't paint the in-game HUD behind it
    if(glOn) WebGLFX.endWorld();
    setDisplay(restartBtn, 'none');
    setDisplay(pauseBtn, 'none');
    setCursor('default');
    return;
  }
  if(state.phase === 'wave' || state.phase === 'gameover') setCursor('crosshair');
  ctx.save();
  ctx.translate(camera.x, camera.y);
  drawEffects();
  if(window.FX) FX.drawUnder();   // [brad-fx] dash trail
  drawPlayers();
  drawTurrets(); // v0.8.3 sentry turrets
  if(window.FX) FX.drawOver();    // [brad-fx] particles, glows, muzzle flash, tracers
  ctx.restore();
  if(glOn) WebGLFX.endWorld();   // world composited with lighting; ctx is the screen again
  // [brad-ui] the HUD is hidden behind the shop (it shows wallet/stats itself) and the game-over screen
  if(state.phase !== 'shop' && state.phase !== 'gameover'){ if(typeof USE_DOM_UI === 'undefined' || !USE_DOM_UI) drawHUD(); drawWaveBanner(); drawSecondWind(); }
  if(state.phase === 'victory') drawVictory();
  drawUpgradeSelector();
  drawShop();
  const anchor = players[0];
  if(anchor && anchor.hp > 0 && anchor.hp / anchor.baseMaxHp < 0.35 && state.phase === 'wave'){
    const hpRatio = anchor.hp / anchor.baseMaxHp;
    const pulse = 0.25 + Math.sin(state.animTime * 6) * 0.08;
    ctx.fillStyle = `rgba(255,70,70,${pulse * (1 - hpRatio)})`;
    ctx.fillRect(0,0,W,H);
  }
  if(players.some(p=>p.hitFlash>0)){
    // Perf: max without the players.map() allocation the old code did here.
    let m = 0; for(const p of players) if(p.hitFlash > m) m = p.hitFlash;
    ctx.fillStyle = `rgba(255,70,70,${m})`;
    ctx.fillRect(0,0,W,H);
  }
  if(state.phase==='gameover' || state.phase==='runwon'){
    setDisplay(restartBtn, 'none');
    setDisplay(pauseBtn, 'none');
  } else {
    setDisplay(restartBtn, 'none');
    // [brad-ui] no Pause button over the shop (nothing runs there and it covered the Stats panel)
    if(pauseBtn && state.phase !== 'menu') setDisplay(pauseBtn, state.phase === 'shop' ? 'none' : 'block');
  }
}

