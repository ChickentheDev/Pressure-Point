// Pressure Point — menu.js (split from game.js for v0.6.1)
// (moved from core.js: restartBtn wiring needs resetRun from state.js)
if(typeof restartBtn !== 'undefined' && restartBtn){ restartBtn.addEventListener('click', resetRun); }
const menuStepLandingEl = document.getElementById('menuStepLanding');
const menuStepMapEl = document.getElementById('menuStepMap');
const menuStepClassEl = document.getElementById('menuStepClass');
const menuStepWeaponEl = document.getElementById('menuStepWeapon');
const menuStepDangerEl = document.getElementById('menuStepDanger');
const classDetailEl = document.getElementById('classDetail');
const weaponListEl = document.getElementById('weaponList');
const weaponDetailEl = document.getElementById('weaponDetail');
const dangerDetailEl = document.getElementById('dangerDetail');
const runWonEl = document.getElementById('runWon');
const runOverEl = document.getElementById('runOver');
const pauseMenuEl = document.getElementById('pauseMenu');

function setMenuStep(step){
  state.menuStep = step;
  if(menuStepLandingEl) menuStepLandingEl.style.display = step === 'landing' ? 'block' : 'none';
  if(menuEl) menuEl.classList.toggle('landing-mode', step === 'landing');
  if(menuStepMapEl) menuStepMapEl.style.display = step === 'map' ? 'block' : 'none';
  if(menuStepClassEl) menuStepClassEl.style.display = step === 'class' ? 'block' : 'none';
  if(menuStepWeaponEl) menuStepWeaponEl.style.display = step === 'weapon' ? 'block' : 'none';
  if(menuStepDangerEl) menuStepDangerEl.style.display = step === 'danger' ? 'block' : 'none';
  if(step === 'map') renderMapButtons();
  if(step === 'class') renderClassButtons();
  if(step === 'weapon') renderWeaponButtons();
  if(step === 'danger') renderDangerButtons();
  const me = document.getElementById('menuEssence');
  if(me) me.textContent = essence;
  const le = document.getElementById('landingEssence');
  if(le) le.textContent = essence;
}

// Weapon icon art (PNGs that exist); others fall back to a colored tile.
const WEAPON_ICONS = {
  pistol:'assets/weapons/CobaltPistol.png', harpoon:'assets/weapons/Harpoongun.png', rifle:'assets/weapons/Pulserifle.png',
  shotgun:'assets/weapons/GravShotgun.png', heavy:'assets/weapons/TitanCannon.png', blade:'assets/weapons/ArcBlade.png',
  smg:'assets/weapons/ViperSMG.png', dmr:'assets/weapons/LongshotDMR.png', rpg:'assets/weapons/RPG.png', minigun:'assets/weapons/Minigun.png',
  scatter:'assets/weapons/weapon_scatter.png', crossbow:'assets/weapons/weapon_crossbow.png', sniper:'assets/weapons/weapon_sniper.png',
  katana:'assets/weapons/weapon_katana.png', plasma:'assets/weapons/weapon_plasma.png', grenade:'assets/weapons/weapon_grenade.png',
  flak:'assets/weapons/weapon_flak.png', tesla:'assets/weapons/weapon_tesla.png', esword:'assets/weapons/weapon_esword.png',
  mortar:'assets/weapons/weapon_mortar.png',
};
function weaponIconHTML(w){
  const src = WEAPON_ICONS[w.id];
  if(src) return `<img src="${src}" alt="${w.name}" draggable="false">`;
  return `<span class="fallback" style="color:${w.color || '#fff'}">${(w.name||'?')[0]}</span>`;
}

// UI: build dangers (numbered buttons + detail panel with DANGER_MODS)
function renderDangerButtons(){
  if(!dangerListEl) return;
  dangerListEl.innerHTML = '';
  for(let i=1;i<=6;i++){
    const b = document.createElement('div');
    b.className = 'danger-btn' + (i === 6 ? ' nightmare' : '');
    b.textContent = i;
    if(i>state.unlockedDanger) b.classList.add('locked');
    if(i===state.danger) b.classList.add('active');
    b.addEventListener('click', ()=>{
      if(i<=state.unlockedDanger){
        state.danger = i;
        audio.click();
        renderDangerButtons();
      } else {
        audio.deny();
      }
    });
    dangerListEl.appendChild(b);
  }
  renderDangerDetail();
}

function renderDangerDetail(){
  if(!dangerDetailEl) return;
  const d = state.danger;
  const m = dangerMods(d);
  dangerDetailEl.innerHTML =
    `<div class="danger-num" style="color:${m.color}">${d}</div>` +
    `<h3 style="color:${m.color}">${m.title}</h3>` +
    `<div class="sub">Danger ${d} of 5</div>` +
    m.lines.map(l=>`<div class="stat-line neutral">&bull; ${l}</div>`).join('');
}

// Class stat lines vs the Ironheart baseline (green = better, red = worse)
function classStatLines(c){
  const base = classArchetypes[0].mods;
  const m = c.mods;
  const lines = [];
  const cmp = (label, val, baseVal, kind, invert)=>{
    const v = (val === undefined ? (kind === 'mult' ? 1 : 0) : val);
    const b = (baseVal === undefined ? (kind === 'mult' ? 1 : 0) : baseVal);
    let diff, txt, good;
    if(kind === 'mult'){ diff = Math.round((v-b)*100); txt = `${diff>=0?'+':''}${diff}% ${label}`; }
    else { diff = Math.round((v-b)*100)/100; txt = `${diff>=0?'+':''}${diff} ${label}`; }
    if(diff === 0) return;
    good = invert ? diff < 0 : diff > 0;
    lines.push(`<div class="stat-line ${good ? 'positive' : 'negative'}">${txt}</div>`);
  };
  cmp('Max HP', m.hpMult, base.hpMult, 'mult');
  cmp('Speed', m.speed, base.speed, 'num');
  cmp('Armor', m.armor, base.armor, 'num');
  cmp('Damage', m.damageBonus, base.damageBonus, 'num');
  cmp('Accuracy', m.accuracy, base.accuracy, 'mult');
  cmp('Reload time', m.reloadSpeed, base.reloadSpeed, 'mult', true);
  cmp('Mag size', m.magBonus, base.magBonus, 'num');
  cmp('Life steal', (m.lifesteal||0)*100, (base.lifesteal||0)*100, 'num');
  cmp('Luck', m.luck, base.luck, 'num');
  if((m.recoil || 1) !== (base.recoil || 1)){
    const w = (m.recoil||1) > (base.recoil||1);
    lines.push(`<div class="stat-line ${w ? 'negative' : 'positive'}">${w?'+':'-'}${Math.abs(Math.round(((m.recoil||1)-1)*100))}% Recoil</div>`);
  }
  return lines.join('') || '<div class="stat-line neutral">Balanced stats.</div>';
}

function renderMapButtons(){
  const listEl = document.getElementById('mapList');
  const detailEl = document.getElementById('mapDetail');
  if(!listEl) return;
  listEl.innerHTML = '';
  for(const m of MAPS){
    const unlocked = isMapUnlocked(m.id);
    const btn = document.createElement('div');
    btn.className = 'map-btn' + (unlocked ? '' : ' locked');
    if(m.id === state.mapId) btn.classList.add('active');
    const lockTxt = unlocked ? '' : ' 🔒';
    btn.innerHTML = `<span>${unlocked ? m.name : '???'}${lockTxt}</span><span class="tag">${unlocked ? (m.diffMult > 1 ? '+' + Math.round((m.diffMult-1)*100) + '%' : 'Standard') : 'Clear Danger 5'}</span>`;
    btn.addEventListener('click', ()=>{
      if(!unlocked){ audio.deny(); return; }
      state.mapId = m.id;
      audio.click();
      renderMapButtons();
    });
    listEl.appendChild(btn);
  }
  if(!isMapUnlocked(state.mapId)) state.mapId = 'rustlands';
  const m = mapDef(state.mapId);
  if(detailEl) detailEl.innerHTML =
    `<div class="detail-title">${m.name}</div>` +
    `<div class="sub">${m.tag}</div>` +
    `<div class="sub">Enemies: ${m.set === 'standard' ? 'Standard horde' : m.set === 'frost' ? 'Frost horde (new)' : 'Void horde (new)'}</div>`;
}
function renderClassButtons(){
  if(!classListEl) return;
  classListEl.innerHTML = '';
  for(const c of classes){
    const btn = document.createElement('div');
    const unlocked = isClassUnlocked(c.id);
    btn.className = 'class-btn' + (unlocked ? '' : ' locked');
    if(c.id === state.classId) btn.classList.add('active');
    btn.innerHTML = `<span>${unlocked ? c.name : '???'}</span><span class="tag">${c.weapon}</span>`;
    btn.addEventListener('click', ()=>{
      if(!unlocked){ audio.deny(); return; }
      state.classId = c.id;
      audio.click();
      renderClassButtons();
    });
    classListEl.appendChild(btn);
  }
  if(!isClassUnlocked(state.classId)) state.classId = 'ironheart';
  renderClassDetail();
}

function renderClassDetail(){
  if(!classDetailEl) return;
  const c = classes.find(x=>x.id === state.classId) || classes[0];
  const w = weapons.find(x=>x.id === c.weapon);
  const unlockText = classUnlockText(c);
  classDetailEl.innerHTML =
    `<div class="class-portrait"><img src="assets/sprites/players/player_${c.id}_down.png" alt="${c.name}" draggable="false"></div>` +
    `<h3>${c.name}</h3>` +
    (unlockText && !isClassUnlocked(c.id) ? `<div class="sub" style="color:#c44dff">${unlockText}</div>` : '') +
    `<div class="sub">Starts with: ${w ? w.name : c.weapon} &bull; Class Lv ${state.danger}</div>` +
    classStatLines(c) +
    `<div class="tagline">${c.desc}</div>`;
}

// Weapon select grid + detail panel
function selectedWeaponId(){
  return state.weaponId || (classes.find(x=>x.id === state.classId) || classes[0]).weapon;
}
function renderWeaponButtons(){
  if(!weaponListEl) return;
  weaponListEl.innerHTML = '';
  const cls = classes.find(x=>x.id === state.classId) || classes[0];
  const pool = (cls.pool && cls.pool.length) ? cls.pool : weapons.map(w=>w.id);
  let cur = selectedWeaponId();
  if(!pool.includes(cur)){ state.weaponId = cls.weapon; cur = cls.weapon; }
  for(const w of weapons){
    if(!pool.includes(w.id)) continue;
    const b = document.createElement('div');
    b.className = 'weapon-btn' + (w.id === cur ? ' active' : '');
    const rc = (typeof RARITY_COLORS !== 'undefined' && RARITY_COLORS[w.rarity]) || '#a7b3c4';
    b.style.borderColor = rc;
    b.style.boxShadow = `0 3px 0 var(--edge), inset 0 2px 0 rgba(255,255,255,0.08), 0 0 10px ${rc}55`;
    b.title = w.name;
    b.innerHTML = weaponIconHTML(w);
    b.addEventListener('click', ()=>{
      state.weaponId = w.id;
      audio.click();
      renderWeaponButtons();
    });
    weaponListEl.appendChild(b);
  }
  renderWeaponDetail();
}

function renderWeaponDetail(){
  if(!weaponDetailEl) return;
  const w = weapons.find(x=>x.id === selectedWeaponId()) || weapons[0];
  const r = rarities.find(x=>x.id === w.rarity);
  const traits = [];
  if(w.pellets > 1) traits.push(`Fires ${w.pellets} pellets`);
  if(w.pierce) traits.push(`Pierces ${w.pierce}`);
  if(w.explosive) traits.push('Explosive');
  if(w.melee) traits.push('Melee');
  if(w.elemental) traits.push(w.elemental[0].toUpperCase() + w.elemental.slice(1));
  if(w.overheatMax) traits.push('Overheats');
  if(w.rehit) traits.push('Re-hits');
  weaponDetailEl.innerHTML =
    `<h3 style="color:${(r && r.color) || '#fff'}">${w.name}</h3>` +
    `<div class="sub">${(r && r.name) || w.rarity} ${w.type}</div>` +
    `<div class="stat-line neutral">Damage: <b>${w.damage}</b>${w.pellets > 1 ? ` &times; ${w.pellets}` : ''}</div>` +
    `<div class="stat-line neutral">Fire delay: <b>${w.fireRate}s</b></div>` +
    `<div class="stat-line neutral">Magazine: <b>${w.mag}</b> / Reload: <b>${w.reload}s</b></div>` +
    `<div class="stat-line neutral">Spread: <b>&plusmn;${Math.round((w.spread || 0) * 57.3)}&deg;</b></div>` +
    (traits.length ? `<div class="stat-line positive">${traits.join(' &bull; ')}</div>` : '');
}

// ---- Run summary screens (Won / Over) + pause menu ----
function hideSummaryOverlays(){
  for(const el of [runWonEl, runOverEl, pauseMenuEl]) if(el) el.style.display = 'none';
  state.summaryShown = false;
}

function statRowsHTML(rows){
  return rows.map(r=>`<div class="row"><span>${r[0]}</span><b>${r[1]}</b></div>`).join('');
}
function playerStatRows(p){
  return statRowsHTML([
    ['Class', p.className || '-'],
    ['Level', p.level || 1],
    ['Max HP', p.baseMaxHp],
    ['Armor', p.armor],
    ['Life Steal', `${((p.lifesteal||0)*100).toFixed(1)}%`],
    ['Damage', `+${p.damageBonus || 0}`],
    ['Attack Speed', `${(p.reloadSpeed || 1).toFixed(2)}x`],
    ['Crit Chance', `${((p.critChance||0)*100).toFixed(1)}%`],
    ['Speed', p.baseSpeed],
    ['Luck', p.luck || 0],
  ]);
}
function weaponCellsHTML(p){
  const cells = (p.ownedWeapons || []).filter(Boolean).map(w=>{
    const r = rarities.find(x=>x.id===w.rarity);
    return `<div class="icon-cell" title="${w.name}" style="border-color:${(r&&r.color)||'#3a4a5f'}">${weaponIconHTML(w)}</div>`;
  }).join('');
  return cells || '<div class="icon-cell empty">—</div>';
}
function itemCellsHTML(p){
  const cells = (p.items || []).map(it=>{
    const d = items.find(x=>x.id===it.id);
    const r = rarities.find(x=>x.id===it.rarity);
    const nm = d ? d.name : it.id;
    return `<div class="icon-cell" title="${nm}" style="border-color:${(r&&r.color)||'#3a4a5f'}">${nm.split(' ').map(s=>s[0]).join('').slice(0,3)}</div>`;
  }).join('');
  return cells || '<div class="icon-cell empty">—</div>';
}
function progressRowsHTML(essenceGained){
  const mm = Math.floor(state.runTime / 60), ss = Math.floor(state.runTime % 60);
  const waveLabel = state.endless ? `${state.wave} (Endless)` : `${Math.min(state.wave, state.maxWave)} / ${state.maxWave}`;
  const rows = [
    ['Wave', waveLabel],
    ['Kills', state.runKills],
    ['Time', `${mm}:${String(ss).padStart(2,'0')}`],
    ['Danger', state.danger],
  ];
  if(essenceGained > 0) rows.push(['Essence', `+${essenceGained}`]);
  return statRowsHTML(rows);
}
function fillSummary(prefix, essenceGained){
  const p = players[0] || {};
  const set = (id, html)=>{ const el = document.getElementById(prefix+id); if(el) el.innerHTML = html; };
  set('Stats', playerStatRows(p));
  set('Weapons', weaponCellsHTML(p));
  set('Items', itemCellsHTML(p));
  set('Progress', progressRowsHTML(essenceGained));
  const dEl = document.getElementById(prefix+'Danger');
  if(dEl){ const m = dangerMods(state.danger); dEl.innerHTML = `Danger <b style="color:${m.color}">${state.danger} — ${m.title}</b>`; }
}

function showRunWon(){
  state.phase = 'runwon';
  state.summaryShown = true;
  const gained = awardEssence();
  fillSummary('won', gained);
  const u = document.getElementById('wonUnlock');
  if(u){
    if(state.victoryUnlocked > 0){
      u.style.display = 'inline-block';
      u.textContent = `DANGER ${state.victoryUnlocked} UNLOCKED!`;
    } else {
      u.style.display = 'none';
    }
  }
  if(runWonEl) runWonEl.style.display = 'block';
  if(pauseBtn) pauseBtn.style.display = 'none';
  audio.pickup(); setTimeout(()=>audio.buy(), 140); setTimeout(()=>audio.pickup(), 280);
}

function showRunOver(){
  if(state.summaryShown) return;
  state.summaryShown = true;
  const gained = awardEssence();
  fillSummary('over', gained);
  if(runOverEl) runOverEl.style.display = 'block';
  if(pauseBtn) pauseBtn.style.display = 'none';
}

function showPauseMenu(){
  const p = players[0] || {};
  const c = classes.find(x=>x.id === state.classId);
  const nm = document.getElementById('pauseClassName');
  if(nm) nm.textContent = c ? c.name : 'Class';
  const pc = document.getElementById('pauseClass');
  if(pc) pc.innerHTML = statRowsHTML([
    ['Class', (c ? c.name : '-') + ` Lv ${state.danger}`],
    ['Trait', c ? c.desc : '-'],
    ['Weapon', (weapons.find(w=>w.id===(p.ownedWeapons && p.ownedWeapons[0] && p.ownedWeapons[0].id)) || {}).name || '-'],
  ]);
  const pw = document.getElementById('pauseWeapons');
  if(pw) pw.innerHTML = weaponCellsHTML(p);
  const ps = document.getElementById('pauseStats');
  if(ps) ps.innerHTML = playerStatRows(p);
  if(pauseMenuEl) pauseMenuEl.style.display = 'block';
}
function hidePauseMenu(){ if(pauseMenuEl) pauseMenuEl.style.display = 'none'; }

function wireSummaryButtons(){
  const on = (id, fn)=>{ const el = document.getElementById(id); if(el) el.addEventListener('click', ()=>{ audio.click(); fn(); }); };
  const retry = ()=>{ startRun(); };
  const newRun = ()=>{ hideSummaryOverlays(); resetRun(); setMenuStep('landing'); };
  const toMenu = ()=>{ hideSummaryOverlays(); resetRun(); };
  const endless = ()=>{ hideSummaryOverlays(); startEndless(); };
  on('wonEndlessBtn', endless);
  on('wonRetryBtn', retry); on('wonNewRunBtn', newRun); on('wonMenuBtn', toMenu);
  on('overRetryBtn', retry); on('overNewRunBtn', newRun); on('overMenuBtn', toMenu);
  on('pauseResumeBtn', ()=>togglePause());
  on('pauseSettingsBtn', ()=>{ if(pauseMenuEl) pauseMenuEl.style.display = 'none'; settingsReturnToPause = true; if(settingsPanel) settingsPanel.style.display = 'block'; });
  on('pauseQuitBtn', ()=>{ if(state.paused) togglePause(); hideSummaryOverlays(); resetRun(); });
}

renderDangerButtons();
renderClassButtons();
if(pauseBtn){
  pauseBtn.addEventListener('click', ()=>{
    pauseBtn.blur();   // so Space/Enter don't re-trigger it later
    if(state.phase === 'menu' || state.phase === 'gameover' || state.phase === 'runwon') return;
    togglePause();
  });
}

// Menu step navigation
function wireMenuNav(){
  const on = (id, fn)=>{ const el = document.getElementById(id); if(el) el.addEventListener('click', ()=>{ audio.click(); fn(); }); };
  on('landingStartBtn', ()=>setMenuStep('map'));
  on('toClassBtn', ()=>setMenuStep('class'));
  on('landingAchBtn', ()=>{ const b = document.getElementById('achievementsBtn'); if(b) b.click(); });
  on('landingUpgBtn', ()=>{ const b = document.getElementById('metaBtn'); if(b) b.click(); });
  on('landingSetBtn', ()=>{ if(settingsPanel){ settingsPanel.style.display = 'block'; } });
  on('toWeaponBtn', ()=>setMenuStep('weapon'));
  on('backToClassBtn', ()=>setMenuStep('class'));
  on('toDangerBtn', ()=>setMenuStep('danger'));
  on('backToWeaponBtn', ()=>setMenuStep('weapon'));
}

// Start (or retry) a run with the currently selected class / weapon / danger / co-op
function startRun(){
  hideSummaryOverlays();
  resetRunStats();
  // retry wipes the field and drops everyone at map center
  enemies.length = 0; bullets.length = 0; moneyDrops.length = 0;
  if(typeof particles !== 'undefined') particles.length = 0;
  if(typeof floatingTexts !== 'undefined') floatingTexts.length = 0;
  for(const p of players){ p.x = W/2; p.y = H/2; p.vx = 0; p.vy = 0; p.dead = false; }
  state.coop = coopToggle.checked;
  // create or remove second player
  if(state.coop && players.length < 2){ players[1] = createPlayer(W/2+40, H/2+20); players[1].currency = 0; players[1].xp = 0; }
  if(!state.coop && players.length>1){ players.splice(1,1); }
  player = players[0];
  const chosenClass = classes.find(x=>x.id === state.classId) || classes[0];
  const chosenWeapon = state.weaponId || chosenClass.weapon;
  applyClassToPlayer(players[0], chosenClass, chosenWeapon);
  if(players[1]) applyClassToPlayer(players[1], chosenClass, chosenWeapon);
  applyMetaUpgrades(players[0]);
  for(const p of players){ p.dashCooldown = 0; p.dashTimer = 0; p.iFrames = 0; p.vx = 0; p.vy = 0; }   // fresh dash + no leftover momentum each run
  state.wave = 1;
  state.runKills = 0;
  state.runTime = 0;
  state.victoryUnlocked = 0;
  state.paused = false;
  menuEl.style.display = 'none';
  if(pauseBtn){ pauseBtn.style.display = 'block'; pauseBtn.textContent = 'Pause'; }
  state.phase = 'wave';
  startWave();
}

startBtn.addEventListener('click', ()=>{ audio.click(); startRun(); });
wireMenuNav();
wireSummaryButtons();

// Achievements screen
const achievementsBtn = document.getElementById('achievementsBtn');
const achievementsScreen = document.getElementById('achievementsScreen');
const achievementsList = document.getElementById('achievementsList');
const achievementsCloseBtn = document.getElementById('achievementsCloseBtn');
function renderAchievements(){
  achievementsList.innerHTML = ACHIEVEMENTS.map(a=>{
    const unlocked = !!unlockedAchievements[a.id];
    return `<div class="achievement-card ${unlocked ? 'unlocked' : 'locked'}">
      <div class="ach-name">${unlocked ? a.name : '???'}</div>
      <div class="ach-desc">${unlocked ? a.desc : 'Locked'}</div>
    </div>`;
  }).join('');
}
if(achievementsBtn && achievementsScreen){
  achievementsBtn.addEventListener('click', ()=>{
    audio.click(); renderAchievements();
    achievementsScreen.style.display = 'flex';
  });
  achievementsCloseBtn.addEventListener('click', ()=>{
    audio.click(); achievementsScreen.style.display = 'none';
  });
}

// Meta upgrades screen
const metaBtn = document.getElementById('metaBtn');
const metaScreen = document.getElementById('metaScreen');
const metaList = document.getElementById('metaList');
const metaEssence = document.getElementById('metaEssence');
const metaCloseBtn = document.getElementById('metaCloseBtn');
function renderMeta(){
  metaEssence.textContent = essence;
  metaList.innerHTML = META_UPGRADES.map(u=>{
    const lvl = getMetaLevel(u.id);
    const maxed = lvl >= u.max;
    const cost = maxed ? null : u.costs[lvl];
    const afford = !maxed && essence >= cost;
    const desc = (state.classId === 'glassjaw' && u.glassjawDesc) ? u.glassjawDesc : u.desc;
    return `<div class="achievement-card ${lvl > 0 ? 'unlocked' : 'locked'}">
      <div class="ach-name">${u.name} <span style="color:#888">Lv ${lvl}/${u.max}</span></div>
      <div class="ach-desc">${desc}</div>
      <div style="margin-top:8px">
        ${maxed ? '<span style="color:#f5c542">MAX</span>' :
          `<button class="btn btn-secondary" data-meta="${u.id}" ${afford ? '' : 'disabled'} style="${afford ? '' : 'opacity:0.4'}">Buy (${cost} essence)</button>`}
      </div>
    </div>`;
  }).join('');
  metaList.querySelectorAll('[data-meta]').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      if(buyMetaUpgrade(btn.dataset.meta)){ audio.buy(); renderMeta(); }
      else audio.deny();
    });
  });
}
if(metaBtn && metaScreen){
  metaBtn.addEventListener('click', ()=>{
    audio.click(); renderMeta();
    metaScreen.style.display = 'flex';
  });
  metaCloseBtn.addEventListener('click', ()=>{
    audio.click(); metaScreen.style.display = 'none';
  });
}

if(settingsBtn && settingsPanel){
  settingsBtn.addEventListener('click', ()=>{
    settingsPanel.style.display = 'block';
    menuEl.style.display = 'none';
  });
}
let settingsReturnToPause = false;
function closeSettings(){
  if(settingsPanel) settingsPanel.style.display = 'none';
  if(settingsReturnToPause){ settingsReturnToPause = false; if(pauseMenuEl) pauseMenuEl.style.display = 'block'; }
  else if(menuEl) menuEl.style.display = 'block';
}
if(settingsCloseBtn && settingsPanel){ settingsCloseBtn.addEventListener('click', closeSettings); }
if(settingsCloseIcon && settingsPanel){ settingsCloseIcon.addEventListener('click', closeSettings); }

