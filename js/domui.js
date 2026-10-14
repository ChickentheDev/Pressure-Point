/* Pressure Point DOM UI — shop + HUD wired to real game state (v0.7.5) */
const USE_DOM_UI = true;
const DOMUI_CAT_ICON = { tech:'🔧', primal:'🌿', arcane:'🔮', unique:'⭐', exclusive:'👑' };

let domShopDirty = true;
function domEl(id){ return document.getElementById(id); }

function rarityColor(r){ return (typeof RARITY_COLORS !== 'undefined' && RARITY_COLORS[r]) || '#a7b3c4'; }

function weaponCardBody(w){
  const parts = [`Damage: <b>${w.damage}</b>`];
  if(w.pellets) parts.push(`Pellets: <b>${w.pellets}</b>`);
  parts.push(`Fire rate: <b>${w.fireRate}s</b>`);
  parts.push(`Mag: <b>${w.mag}</b>`);
  if(w.explosive) parts.push(`<span class="pos">Explosive</span>`);
  if(w.elemental) parts.push(`Element: <b>${w.elemental}</b>`);
  if(w.range) parts.push(`Range: <b>${w.range}</b>`);
  return parts.join('<br>');
}
function itemCardBody(d){
  return d.desc || '';
}

function renderDomShop(){
  const root = domEl('domShop'); if(!root) return;
  const p = (typeof players !== 'undefined' && players[0]) || {};
  const wave = (typeof state !== 'undefined' && state.wave) || 1;
  const maxWave = (typeof state !== 'undefined' && state.maxWave) || 20;
  domEl('ppShopTitle').textContent = `Shop (Wave ${wave})`;
  domEl('ppShopMoney').textContent = p.currency || 0;
  const rc = (typeof shop !== 'undefined' && shop.rerollCost) || 0;
  domEl('ppRerollCost').textContent = rc;
  domEl('ppRerollBtn').disabled = (p.currency || 0) < rc;

  const cards = (typeof shop !== 'undefined' && shop.items || []).map((it, i) => {
    if(!it || !it.data) return `<div class="pp-card sold"></div>`;
    const d = it.data, r = it.rarity || d.rarity || 'common';
    const col = rarityColor(r);
    const isW = it.type === 'weapon';
    const ico = isW ? weaponIconHTML(d) : `<span>${DOMUI_CAT_ICON[d.category] || '📦'}</span>`;
    const sub = isW ? `${d.type || 'Gun'} · ${r}` : `${d.category || 'Item'} · ${r}`;
    const body = isW ? weaponCardBody(d) : itemCardBody(d);
    const afford = (p.currency || 0) >= it.price;
    const locked = !!(typeof shop !== 'undefined' && shop.locked && shop.locked[i]);
    return `<div class="pp-card" style="border-color:${col}">
      <div class="pp-head"><div class="pp-ico">${ico}</div>
        <div><div class="pp-name">${d.name}</div><div class="pp-sub">${sub}</div></div></div>
      <div class="pp-body">${body}</div>
      <button class="pp-buy" data-buy="${i}" ${afford ? '' : 'disabled'}>${it.price} <i class="pp-gem"></i></button>
      <button class="pp-lock" data-lock="${i}" aria-pressed="${locked}">${locked ? 'Locked' : 'Lock'}</button>
    </div>`;
  }).join('');
  domEl('ppCards').innerHTML = cards;

  // items grid (stacked)
  const stacks = [];
  for(const it of (p.items || [])){
    const s = stacks.find(q => q.id === it.id && q.rarity === it.rarity);
    if(s) s.n++; else stacks.push({id: it.id, rarity: it.rarity, n: 1});
  }
  domEl('ppItemsGrid').innerHTML = stacks.map(s => {
    const d = (typeof items !== 'undefined' && items.find(x => x.id === s.id)) || {};
    return `<div class="pp-slot" title="${d.name || s.id}" style="border-color:${rarityColor(s.rarity)}">${DOMUI_CAT_ICON[d.category] || '📦'}${s.n > 1 ? `<span class="cnt">x${s.n}</span>` : ''}</div>`;
  }).join('') || '<div class="pp-slot" style="opacity:.3">—</div>';

  // weapons grid
  const owned = (p.ownedWeapons || []).filter(Boolean);
  domEl('ppWepsCount').textContent = owned.length;
  domEl('ppWepsGrid').innerHTML = owned.map(w =>
    `<div class="pp-slot w" title="${w.name}" style="border-color:${rarityColor(w.rarity)}">${weaponIconHTML(w)}</div>`
  ).join('');

  // v0.8.3 arsenal upgrades: MK II / MK III per weapon
  const upg = domEl('ppUpgrades');
  if(upg){
    const raw = p.ownedWeapons || [];
    const rows = [];
    for(let i=0;i<raw.length;i++){
      const w = raw[i]; if(!w) continue;
      const mk = w.mk || 1;
      const cost = (typeof upgradeCostFor !== 'undefined') ? upgradeCostFor(w) : null;
      const btn = mk >= 3 ? '<span class="pp-maxed">MAX</span>'
        : `<button class="pp-buy" data-upgrade="${i}" ${(p.currency||0) >= cost ? '' : 'disabled'}>→ MK ${mk===1?'II':'III'} · ${cost} <i class="pp-gem"></i></button>`;
      rows.push(`<div class="pp-upg"><span class="pp-ico">${weaponIconHTML(w)}</span><span class="pp-uname">${w.name}</span><span class="pp-mk">MK ${'I II III'.split(' ')[mk-1]}</span>${btn}</div>`);
    }
    upg.innerHTML = rows.join('') || '<div class="pp-slot" style="opacity:.3">—</div>';
  }

  // stats sidebar (reuse pause-menu rows, restyled)
  const rows = (typeof playerStatRows !== 'undefined') ? playerStatRows(p) : '';
  domEl('ppStats').innerHTML = rows
    .replace(/<div class="row">/g, '<div class="pp-st">')
    .replace(/<\/div>$/,'');

  // mirror indicator
  const mir = domEl('ppMirrorNote');
  if(mir) mir.classList.toggle('on', !!p.mirrorActive);

  // elite notice
  let notice = '';
  try{
    if(typeof eliteCountFor !== 'undefined' && eliteCountFor(wave + 1, state.danger) > 0)
      notice = `An elite will appear on wave ${wave + 1}`;
    else if(wave + 1 >= maxWave) notice = `Boss on wave ${maxWave} — prepare!`;
  }catch(e){}
  domEl('ppNotice').textContent = notice;
  domEl('ppNotice').style.display = notice ? 'block' : 'none';
  domEl('ppGoBtn').textContent = `Go (Wave ${wave + 1})`;
  domShopDirty = false;
}

function updateDomHud(){
  const p = (typeof players !== 'undefined' && players[0]) || {};
  if(domEl('ppHpFill')) domEl('ppHpFill').style.width = Math.max(0, Math.min(100, (p.hp / Math.max(1, p.baseMaxHp)) * 100)) + '%';
  if(domEl('ppHpText')) domEl('ppHpText').textContent = `${Math.max(0, Math.ceil(p.hp || 0))} / ${p.baseMaxHp || 0}`;
  const xpPct = p.xpNext ? Math.min(100, (p.xp / p.xpNext) * 100) : 0;
  if(domEl('ppXpFill')) domEl('ppXpFill').style.width = xpPct + '%';
  if(domEl('ppLvlText')) domEl('ppLvlText').textContent = 'LV.' + (p.level || 1);
  if(domEl('ppHudMoney')) domEl('ppHudMoney').textContent = p.currency || 0;
  const cb = domEl('ppHudCombo');
  if(cb){
    const n = (typeof state !== 'undefined' && state.combo) || 0;
    if(n >= 5){ cb.style.display = ''; cb.innerHTML = '<b>x' + n + '</b><small>' + (1 + Math.min(n, 40) * 0.025).toFixed(2) + 'x</small>'; }
    else cb.style.display = 'none';
  }
  if(domEl('ppHudItems')) domEl('ppHudItems').textContent = (p.items || []).length;
  // v0.8.3: elemental set badges + turret charges
  const setsEl = domEl('ppHudSets');
  if(setsEl && typeof elementalTierSummary !== 'undefined'){
    const sets = elementalTierSummary(p);
    if(sets.length){
      setsEl.style.display = '';
      setsEl.innerHTML = sets.map(s => `<b style="color:${(typeof ELEM_TIER_COLORS !== 'undefined' && ELEM_TIER_COLORS[s.el]) || '#fff'}">${(typeof ELEM_TIER_NAMES !== 'undefined' && ELEM_TIER_NAMES[s.el]) || s.el} ${s.tier >= 2 ? 'II' : 'I'}</b>`).join(' · ');
    } else setsEl.style.display = 'none';
  }
  const tuEl = domEl('ppHudTurret');
  if(tuEl){
    if((p.turretMax || 0) > 0){ tuEl.style.display = ''; tuEl.innerHTML = `🎯 Turret <b>${p.turretCharges || 0}</b> <small>[T]</small>`; }
    else tuEl.style.display = 'none';
  }
  if(typeof state !== 'undefined'){
    if(domEl('ppHudWave')) domEl('ppHudWave').textContent = 'Wave ' + state.wave;
    let tLeft = '';
    if(typeof WAVE_DURATION !== 'undefined' && state.phase === 'wave')
      tLeft = fmtTime(Math.max(0, WAVE_DURATION - (state.waveTime || 0)));
    if(domEl('ppHudTimer')) domEl('ppHudTimer').textContent = tLeft;
    const dev = domEl('ppDevBadge');
    if(dev) dev.style.display = (typeof devMode !== 'undefined' && devMode) ? 'block' : 'none';
  }
  const owned = (p.ownedWeapons || []).filter(Boolean);
  const hw = domEl('ppHudWeps');
  if(hw){
    const html = owned.slice(0, 8).map((w, i) =>
      `<div class="pp-slot${i === 0 ? ' cur' : ''}" title="${w.name}" style="border-color:${rarityColor(w.rarity)}">${weaponIconHTML(w)}</div>`
    ).join('');
    if(hw._last !== html){ hw.innerHTML = html; hw._last = html; }
  }
}
function fmtTime(s){ s = Math.ceil(s); return `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`; }

function syncDomUi(){
  if(typeof USE_DOM_UI === 'undefined' || !USE_DOM_UI) return;
  const inShop = typeof state !== 'undefined' && state.phase === 'shop';
  const inWave = typeof state !== 'undefined' && state.phase === 'wave';
  const ds = domEl('domShop'), dh = domEl('domHud');
  if(ds) ds.style.display = inShop ? 'block' : 'none';
  if(dh) dh.style.display = inWave ? 'block' : 'none';
  // the legacy canvas pause button overlaps the DOM one: keep it hidden while DOM HUD is up
  const pb = document.getElementById('pauseBtn');
  if(pb && inWave) pb.style.display = 'none';
  if(inShop && domShopDirty) renderDomShop();
  if(inWave && dh) updateDomHud();
}
function markShopDirty(){ domShopDirty = true; }

// ---- events (delegated) ----
document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-buy]'); if(b){
    if(typeof shop !== 'undefined'){ shop.selection = +b.dataset.buy; }
    if(typeof buyShopItemFor !== 'undefined' && players[0]) buyShopItemFor(players[0]);
    markShopDirty(); if(typeof audio !== 'undefined') audio.click(); return;
  }
  const l = e.target.closest('[data-lock]'); if(l){
    const i = +l.dataset.lock;
    if(typeof shop !== 'undefined' && shop.items[i]){ shop.locked[i] = shop.locked[i] ? null : shop.items[i]; }
    markShopDirty(); if(typeof audio !== 'undefined') audio.click(); return;
  }
  if(e.target.closest('#ppRerollBtn')){ if(typeof rerollShop !== 'undefined') rerollShop(); markShopDirty(); return; }
  const up = e.target.closest('[data-upgrade]'); if(up){
    if(typeof upgradeWeaponFor !== 'undefined' && players[0]) upgradeWeaponFor(players[0], +up.dataset.upgrade);
    markShopDirty(); return;
  }
  if(e.target.closest('#ppGoBtn')){ if(typeof startNextWave !== 'undefined') startNextWave(); return; }
  if(e.target.closest('#ppHudPause')){ if(typeof togglePause !== 'undefined') togglePause(); return; }
});
// shop rebuilds (wave start, reroll, buy) mark dirty via wrapped calls
if(typeof window !== 'undefined'){
  window.addEventListener('ppshopdirty', markShopDirty);
}
