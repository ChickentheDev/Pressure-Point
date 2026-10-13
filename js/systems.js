// Pressure Point — systems.js (split from game.js for v0.6.1)

const rarityOrder = ['common','rare','epic','legendary'];
const RARITY_MULTS = {common:1, rare:1.25, epic:1.5, legendary:2.0};
function rarityMult(r){ return RARITY_MULTS[r] || 1; }
// rarity border colors (shared by HUD weapon slots, menu weapon grid; shop uses its own copy in ui.js)
const RARITY_COLORS = {common:'#a7b3c4', rare:'#4cc3ff', epic:'#b67bff', legendary:'#ff5d5d'};
const WAVE_DURATION = 60; // seconds per wave: survive the timer, Brotato-style

// Item categories. Unique: at most one per player, never combines. Exclusive: epic/legendary only, 1.5x shop price.
const CATEGORIES = {
  tech:      {name:'Tech',      color:'#7bdff2'},
  primal:    {name:'Primal',    color:'#9bff7b'},
  arcane:    {name:'Arcane',    color:'#b67bff'},
  unique:    {name:'Unique',    color:'#ffd166'},
  exclusive: {name:'Exclusive', color:'#ff4fd8'},
};
function itemCategory(it){ return (it && it.category) || 'tech'; }
function playerOwnsUnique(player){
  return player.items.some(it=>{ const d = items.find(x=>x.id===it.id); return d && d.category==='unique'; });
}

function createWeaponInstance(base, rarity){
  const mult = rarityMult(rarity);
  return {
    ...base,
    rarity,
    damage: Math.round(base.damage * mult),
    mag: Math.max(1, Math.round(base.mag * mult)),
    fireRate: base.fireRate * (1 - (mult-1)*0.2),
    reload: base.reload * (1 - (mult-1)*0.15),
    spread: base.spread * (1 - (mult-1)*0.2),
    bulletSpeed: base.bulletSpeed * (1 + (mult-1)*0.1),
    overheatMax: base.overheatMax || 0,
    overheatPerShot: base.overheatPerShot || 0,
    overheatCool: base.overheatCool || 0,
    overheatLock: base.overheatLock || 0,
    heat: 0,
    overheated: false,
    overheatTimer: 0,
    // every owned weapon is equipped and fires on its own: each tracks its own ammo/reload
    ammoInMag: Math.max(1, Math.round(base.mag * mult)),
    reloading: 0,
  };
}

function applyItemEffects(player, itemData, rarity, sign=1){
  const m = rarityMult(rarity) * sign;
  const e = itemData.effects || {};
  if(e.armor) player.armor += e.armor * m;
  if(e.speedMult) player.baseSpeed = Math.max(80, Math.floor(player.baseSpeed * (1 + e.speedMult * m)));
  if(e.reloadMult) player.reloadSpeed = Math.max(0.5, player.reloadSpeed * (1 + e.reloadMult * m));
  if(e.accuracyMult) player.accuracy = Math.max(0.5, player.accuracy * (1 + e.accuracyMult * m));
  if(e.maxHpAdd && !isGlassjaw(player)){ player.baseMaxHp = Math.max(1, Math.floor(player.baseMaxHp + e.maxHpAdd * m)); player.hp = Math.min(player.hp, player.baseMaxHp); }
  if(e.lifestealAdd) player.lifesteal = Math.max(0, player.lifesteal + e.lifestealAdd * m);
  if(e.magBonus) player.magBonus += Math.round(e.magBonus * m);
  if(e.damageBonus) player.damageBonus += Math.round(e.damageBonus * m);
  if(e.damageMult) player.damageMult = Math.max(0.5, player.damageMult * (1 + e.damageMult * m));
  if(e.luckAdd) player.luck += Math.round(e.luckAdd * m);
  if(e.pierceAdd) player.pierceBonus = Math.max(0, player.pierceBonus + Math.round(e.pierceAdd * m));
  if(e.rangeBonus) player.rangeBonus = (player.rangeBonus || 0) + Math.round(e.rangeBonus * m);
  if(e.rangeMult) player.rangeMult = Math.max(0.5, (player.rangeMult || 1) * (1 + e.rangeMult * m));
}

function addItemToPlayer(player, itemData, rarity){
  // (no item cap: infinite slots)
  // Unique items: at most one per player, exempt from combining
  if(itemData.category === 'unique'){
    if(playerOwnsUnique(player)) return false;
    player.items.push({id: itemData.id, rarity, cosmetic: itemData.cosmetic});
    applyItemEffects(player, itemData, rarity, 1);
    return true;
  }
  player.items.push({id: itemData.id, rarity, cosmetic: itemData.cosmetic});
  applyItemEffects(player, itemData, rarity, 1);
  // combine if two of same id+rarity
  let combined = true;
  while(combined){
    combined = false;
    for(const r of rarityOrder){
      const same = player.items.filter(it=>it.id===itemData.id && it.rarity===r);
      if(same.length >= 2){
        // remove two, downgrade stats, add next rarity if possible
        const idxs = [];
        for(let i=player.items.length-1;i>=0 && idxs.length<2;i--){
          if(player.items[i].id===itemData.id && player.items[i].rarity===r) idxs.push(i);
        }
        for(const idx of idxs){ player.items.splice(idx,1); applyItemEffects(player, itemData, r, -1); }
        const nextIdx = rarityOrder.indexOf(r)+1;
        if(nextIdx < rarityOrder.length){
          const nextR = rarityOrder[nextIdx];
          if(player.items.length < 6){
            player.items.push({id:itemData.id, rarity: nextR, cosmetic: itemData.cosmetic});
            applyItemEffects(player, itemData, nextR, 1);
          }
        }
        combined = true;
        break;
      }
    }
  }
  return true;
}

function buildUpgradeChoices(){
  const picks = [];
  const stats = [...upgradeStats];
  for(let i=stats.length-1;i>0;i--){ const j=(Math.random()*(i+1))|0; [stats[i],stats[j]]=[stats[j],stats[i]]; }
  const tierBag = [
    ...Array(50).fill('gray'),
    ...Array(35).fill('blue'),
    ...Array(10).fill('purple'),
    ...Array(5).fill('red'),
  ];
  // shuffle bag and draw without replacement to reduce streaky reds
  for(let i=tierBag.length-1;i>0;i--){ const j=(Math.random()*(i+1))|0; [tierBag[i],tierBag[j]]=[tierBag[j],tierBag[i]]; }
  for(let i=0;i<4;i++){
    const tierId = tierBag[i];
    const tier = upgradeTiers.find(x=>x.id===tierId) || upgradeTiers[0];
    picks.push({ stat: stats[i], tier });
  }
  upgradeChoices.items = picks;
  upgradeChoices.selection = 0;
}

function applyUpgradeChoice(choice){
  for(const p of players){
    choice.stat.apply(p, choice.tier.mult);
  }
}

function getWeaponFor(player){
  // All owned weapons are equipped at once; this returns the first for single-weapon
  // contexts (aim lead, held-weapon art). Firing iterates the whole arsenal.
  return player.ownedWeapons[0] || createWeaponInstance(weapons[0], 'common');
}

function refreshAmmoFor(player){ for(const w of player.ownedWeapons){ if(w) w.ammoInMag = Math.max(1, (w.mag||999) + player.magBonus); } }

function applyClassToPlayer(player, classData, weaponId){
  // class level scales with unlocked danger (D1 -> L1, D2 -> L2, etc.)
  const classLevel = Math.max(1, Math.min(5, state.danger));
  player.classId = classData.id;
  player.className = `${classData.name} Lv ${classLevel}`;
  // Start very low HP, scale up per class level; class hpMult actually applies now (was dead data)
  // Glassjaw: always exactly 1 HP
  if(classData.id === 'glassjaw'){
    player.baseMaxHp = 1;
  } else {
    player.baseMaxHp = Math.max(10, Math.floor((15 + (classLevel-1) * 6) * (classData.mods.hpMult || 1)));
  }
  player.hp = player.baseMaxHp;
  player.baseSpeed = Math.floor(classData.mods.speed * (1 + (classLevel-1)*0.02));
  player.armor = (classData.mods.armor || 0) + (classLevel-1);
  player.lifesteal = (classData.mods.lifesteal || 0) + (classLevel-1)*0.01;
  player.reloadSpeed = (classData.mods.reloadSpeed || 1) * (1 - (classLevel-1)*0.01);
  player.accuracy = (classData.mods.accuracy || 1) * (1 + (classLevel-1)*0.02);
  player.magBonus = (classData.mods.magBonus || 0) + (classLevel-1);
  player.damageBonus = (classData.mods.damageBonus || 0) + (classLevel-1);
  player.recoil = (classData.mods.recoil || 1);
  player.luck = (classData.mods.luck || 0);
  player.pierceBonus = 0;
  player.critChance = 0.05;
  player.critMult = 1.5;
  player.elementalBonus = 0;
  player.items = [];
  player.damageMult = 1;
  player.dead = false;
  const baseW = weapons.find(w=>w.id===(weaponId || classData.weapon)) || weapons.find(w=>w.id===classData.weapon) || weapons[0];
  player.ownedWeapons = [createWeaponInstance(baseW, 'common')];
  player.level = 1;
  player.xp = 0;
  player.xpNext = 60;
  player.currency = 0;
  refreshAmmoFor(player);
}

function normalizeShopSelection(){
  if(!shop.items || shop.items.length === 0){ shop.selection = 0; return; }
  if(shop.items[shop.selection] && shop.items[shop.selection].data) return;
  for(let i=0;i<shop.items.length;i++){
    if(shop.items[i] && shop.items[i].data){ shop.selection = i; return; }
  }
  shop.selection = 0;
}

function buildShop(){
  const locked = shop.locked || [];
  const poolWeapons = [...weapons];
  // Unique: don't offer more once the player owns one; Exclusive enforced to epic/legendary below
  const ownsUnique = players[0] && playerOwnsUnique(players[0]);
  const poolItems = items.filter(it => !(ownsUnique && it.category === 'unique'));

  function rollRarity(luck){
    const L = Math.max(0, luck || 0);
    const wCommon = 55;
    const wRare = 35 + L * 3;
    const wEpic = 8 + L * 3.5;
    const wLegendary = 2 + L * 4;
    const total = wCommon + wRare + wEpic + wLegendary;
    let r = Math.random() * total;
    if((r -= wCommon) <= 0) return 'common';
    if((r -= wRare) <= 0) return 'rare';
    if((r -= wEpic) <= 0) return 'epic';
    return 'legendary';
  }

  const luck = players[0]?.luck || 0;
  const picks = Array(6).fill(null);
  for(let i=0;i<6;i++){
    if(locked[i]) picks[i] = locked[i];
  }

  const isDuplicate = (candidate)=>{
    return picks.some(it => it && it.type === candidate.type && it.data.id === candidate.data.id);
  };

  // allow WASM/system override (only once the module is loaded and has our data; see attachWasmSystems)
  const emptyCount = picks.filter(x=>!x).length;
  const wasmPicks = rollShopWasm(emptyCount, luck);
  if(Array.isArray(wasmPicks) && wasmPicks.length){
    for(const pick of wasmPicks){
      if(!pick || isDuplicate(pick)) continue;
      for(let i=0;i<6;i++){ if(!picks[i]){ picks[i] = pick; break; } }
    }
  }

  let guard = 0;
  while(picks.some(p=>!p) && guard < 200){
    guard++;
    const rarity = rollRarity(luck);
    const weaponsOfR = poolWeapons.filter(w=>w.rarity === rarity);
    const itemsOfR = poolItems.filter(it=>it.rarity === rarity && !(it.category==='exclusive' && rarity!=='epic' && rarity!=='legendary'));
    const exclusiveMult = (it)=> it.category==='exclusive' ? 1.5 : 1;
    const combined = [
      ...weaponsOfR.map(w=>({type:'weapon', data:w, rarity, price:Math.round(weaponPrices[w.id] * rarityMult(rarity))})),
      ...itemsOfR.map(it=>({type:'item', data:it, rarity, price:Math.round(it.price * rarityMult(rarity) * exclusiveMult(it))})),
    ];
    if(combined.length === 0) continue;
    const pick = combined[(Math.random()*combined.length)|0];
    if(isDuplicate(pick)) continue;
    for(let i=0;i<6;i++){ if(!picks[i]){ picks[i] = pick; break; } }
  }

  // fill any remaining gaps with items
  while(picks.some(p=>!p)){
    const fallback = poolItems[(Math.random()*poolItems.length)|0];
    if(!fallback) break;
    const exMult = fallback.category==='exclusive' ? 1.5 : 1;
    const pick = {type:'item', data:fallback, rarity:fallback.rarity, price:Math.round(fallback.price * rarityMult(fallback.rarity) * exMult)};
    if(isDuplicate(pick)) continue;
    for(let i=0;i<6;i++){ if(!picks[i]){ picks[i] = pick; break; } }
  }

  shop.items = picks;
  shop.selection = 0;
  shop.locked = shop.items.map((it, i)=>locked[i] ? it : null);

  // wave-1 starter deal: the first shop is a dead visit otherwise (~13-17 currency,
  // cheapest offer ~30). Guarantee one affordable common item at a deal price.
  // Only wave 1 — no effect on the late-game economy.
  if(state.wave === 1 && !shop.locked[0]){
    const dealPool = poolItems.filter(it=>it.rarity === 'common');
    const dealItem = dealPool[(Math.random()*dealPool.length)|0] || poolItems[0];
    if(dealItem) shop.items[0] = {type:'item', data:dealItem, rarity:'common', price:10, deal:true};
  }
  normalizeShopSelection();
}

function rerollShop(){
  const cost = shop.rerollCost;
  const payer = players[0];
  if(typeof devMode !== 'undefined' && devMode){ /* free */ }
  else { if(payer.currency < cost){ audio.deny(); return; } payer.currency -= cost; }
  shop.rerollCost = Math.min(99, Math.floor(shop.rerollCost * 1.35 + 2));
  buildShop();
  audio.click();
}

// Wave calculation: horde scaling — Wave 1 = 16 enemies, each wave +8.
// Danger and co-op multipliers stack on top in startWave.
function computeWaveTotal(wave){ return 40 + (Math.max(1, wave) - 1) * 18; }

// Elites: tougher enemy variants on danger-gated waves.
// Wave 12 → danger 2-5, wave 16 → danger 4-5, wave 20 (boss) → danger 1-5.
// Endless: elites every 4th wave past 20, boss every 5th wave past 20.
function eliteCountFor(wave, danger){
  if(wave !== 8 && wave !== 12 && wave !== 16 && wave !== 20){
    if(wave <= 20 || wave % 4 !== 0) return 0;
    return 2 + Math.floor((wave - 20) / 8);
  }
  if(wave === 8 && danger < 6) return 0;
  if(wave === 12 && danger < 2) return 0;
  if(wave === 16 && danger < 4) return 0;
  return 2 + (danger >= 4 ? 1 : 0) + (danger >= 6 ? 1 : 0);
}
function isBossWave(wave){
  if(wave === 20) return true;
  return wave > 20 && wave % 5 === 0;
}

function startWave(){
  state.phase = 'wave';
  state.waveSpawned = 0;
  state.waveTime = 0;
  enemyBullets.length = 0;
  state.waveCompleteTimer = 0;
  runStats.tookDamage = false;
  state.waveTotal = Math.floor(computeWaveTotal(state.wave) * (state.coop ? 1.5 : 1) * (1 + (state.danger-1)*0.15) * dangerMods(state.danger).countMult);
  if(isBossWave(state.wave)){
    state.waveTotal = dangerMods(state.danger).doubleBoss ? 2 : 1;
    state.bossSpawned = false;
  }
  // elites spawn with the wave and count toward its completion total
  // (added after the boss-wave override so wave 20 keeps its elites in the total)
  state.eliteTotal = eliteCountFor(state.wave, state.danger);
  state.waveTotal += state.eliteTotal;
  if(state.eliteTotal > 0){
    for(let i=0;i<state.eliteTotal;i++){ spawnEnemy({elite:true}); state.waveSpawned++; }
    state.eliteBanner = 2.6;
    audio.beep(220, 0.18, 'sawtooth', 0.07);
    audio.beep(174, 0.22, 'sawtooth', 0.07);
  }
  state.waveBanner = 2.2;
  buildShop();
  audio.beep(520,0.06,'triangle',0.04);
  // spawn at least one tree each wave
  trees.length = 0;
  const treeCount = Math.max(1, Math.floor(1 + state.wave*0.2));
  for(let i=0;i<treeCount;i++){ spawnTree(); }
  state.treeWave = state.wave;
  // respawn dead players at wave start
  for(let i=0;i<players.length;i++){
    const p = players[i];
    if(p.dead){
      p.dead = false;
      p.hp = p.baseMaxHp;
      p.x = W/2 + (i*40);
      p.y = H/2 + (i*20);
    }
  }
}

function openShop(){ moneyDrops.length = 0; state.phase='shop'; state.shopAnim=0; buildShop(); audio.beep(660,0.08,'triangle',0.05); }

function levelUp(player){ player.level += 1; player.xp -= player.xpNext; player.xpNext = Math.floor(player.xpNext * 1.2 + 15); if(!isGlassjaw(player)){ player.baseMaxHp += 6; player.hp = player.baseMaxHp; } }

function spawnTree(){
  const margin = 40;
  const x = Math.random()*(W-2*margin) + margin;
  const y = Math.random()*(H-2*margin) + margin;
  trees.push({x, y, r:18, hp:60, maxHp:60});
}

function spawnFruit(x, y){
  fruits.push({x, y, r:8, t:0});
}

function spawnEnemy(opts){
  opts = opts || {};
  const elite = !!opts.elite;
  const edge = Math.floor(Math.random()*4);
  let x,y; if(edge===0){ x=-20; y=Math.random()*H } else if(edge===1){ x=W+20; y=Math.random()*H } else if(edge===2){ x=Math.random()*W; y=-20 } else { x=Math.random()*W; y=H+20 }
  const tier = Math.min(enemyTypes.length-1, Math.floor((state.wave-1)/3));
  // weighted pick: swarms of weak types early, tougher types as the tier unlocks
  // late game: widen the top bracket so new enemies actually appear
  const roll = Math.random();
  let idx;
  if(state.wave >= 19 && tier >= 6){
    idx = roll < 0.45 ? 0 : roll < 0.65 ? Math.min(tier, 1) : roll < 0.8 ? Math.min(tier, 2) : roll < 0.9 ? Math.min(tier, 5) : tier;
  } else {
    idx = roll < 0.55 ? 0 : roll < 0.8 ? Math.min(tier, 1) : roll < 0.93 ? Math.min(tier, 2) : tier;
  }
  const t = enemyTypes[Math.max(0, idx)];
  // danger scaling
  const dangerHP = 1 + (state.danger-1) * 0.35;
  const dangerDmg = (1 + (state.danger-1) * 0.28) * dangerMods(state.danger).dmgMult;
  const dangerSpeed = dangerMods(state.danger).speedMult;
  const waveScale = 1 + Math.max(0, state.wave-1) * 0.12;
  const lateDmg = 1 + Math.max(0, state.wave-1) * 0.18;
  // elites: scaled-up variants — 3x HP, 1.4x damage, bigger body, triple rewards
  const eliteHP = elite ? 3 : 1, eliteDmg = elite ? 1.4 : 1;
  const xp = Math.floor((t.xp + Math.floor(state.wave*0.6)*(state.danger)) * (elite ? 3 : 1));
  const money = Math.max(1, Math.floor((Math.floor(t.money * 0.7) + Math.floor(state.wave*0.2) * state.danger) * (elite ? 3 : 1)));
  enemies.push({ id: t.id, x,y, r: Math.floor(t.r * (elite ? 1.35 : 1)), hp: Math.floor(t.hp * waveScale * dangerHP * eliteHP), maxHp: Math.floor(t.hp * waveScale * dangerHP * eliteHP), speed: Math.floor((t.speed + state.wave*2) * dangerSpeed * (elite && t.id === 'runner' ? 1.5 : 1)), dmg: Math.floor(t.dmg * dangerDmg * lateDmg * eliteDmg + state.wave*1.2), color: t.color, xp, money, explodes: !!t.explodes, splits: !!t.splits, dashes: !!t.dashes, shields: !!t.shields, spawns: !!t.spawns, ranged: !!t.ranged, elite, eliteName: elite ? t.eliteName : null, dashTimer: 2 + Math.random()*2, dashTime: 0, spawnTimer: 3 });
  if(enemies.length > 120){ enemies.shift(); }
  addParticle({x, y, life:0.35, r:18, color: elite ? '#ffd166' : palette.uiAccent});
}

function spawnBoss(){
  const edge = Math.floor(Math.random()*4);
  let x,y; if(edge===0){ x=-40; y=Math.random()*H } else if(edge===1){ x=W+40; y=Math.random()*H } else if(edge===2){ x=Math.random()*W; y=-40 } else { x=Math.random()*W; y=H+40 }
  const dangerHP = 1 + (state.danger-1) * 0.5;
  const dangerDmg = 1 + (state.danger-1) * 0.35;
  const waveHP = 1 + Math.max(0, state.wave - 20) * 0.08;   // endless bosses keep scaling
  const bt = bossTypes[Math.min(state.danger, 6) - 1] || bossTypes[0];
  enemies.push({
    id: bt.id, x,y, r: bt.r, hp: Math.floor(bt.hp * dangerHP * waveHP), maxHp: Math.floor(bt.hp * dangerHP * waveHP),
    speed: bt.speed, dmg: Math.floor(bt.dmg * dangerDmg * (1 + (state.wave-1)*0.12)),
    color: bt.color, xp: bt.xp * state.danger, money: bt.money * state.danger,
    isBoss: true, bossAbility: bt.ability, bossName: bt.name,
    abilityTimer: 4, dashTimer: 2, dashTime: 0, spawnTimer: 5, burrowTimer: 6, burrowTime: 0,
  });
  addParticle({x, y, life:0.6, r:28, color: '#ff6b6b'});
}

// Swept bullet test: does the segment (px,py)->(x,y) pass within r of (cx,cy)? Stops fast bullets
// tunnelling through small enemies and catches point-blank hits.
const BULLET_HIT_R = 3;
function segmentHitsCircle(px, py, x, y, cx, cy, r){
  const sx = x - px, sy = y - py;
  const len2 = sx*sx + sy*sy;
  let u = len2 > 0 ? ((cx - px)*sx + (cy - py)*sy) / len2 : 0;
  u = u < 0 ? 0 : u > 1 ? 1 : u;
  const dx = px + sx*u - cx, dy = py + sy*u - cy;
  return dx*dx + dy*dy <= r*r;
}
// Modest aim lead for auto-aim: aim part of the way toward where a moving enemy will be when the shot
// arrives. Targets without a velocity (trees, the mouse cursor) are returned unchanged.
const AIM_LEAD = 0.6, AIM_LEAD_MAX_T = 0.5;
function aimPointFor(player, target){
  if(!target || !(target.vx || target.vy)) return target;
  const w = getWeaponFor(player);
  const speed = (w && w.bulletSpeed) || 600;
  const tHit = Math.min(AIM_LEAD_MAX_T, Math.hypot(target.x - player.x, target.y - player.y) / speed) * AIM_LEAD;
  return { x: target.x + target.vx * tHit, y: target.y + target.vy * tHit };
}
// Light enemy separation: a soft push between overlapping enemies, using a uniform grid so each enemy
// only checks nearby cells (and at most SEP_MAX_PER_CELL enemies per cell). Bosses barely move.
const SEP_CELL = 56;            // >= largest pair of radii that can overlap (boss 36 + bruiser 16)
const SEP_MAX_PER_CELL = 8;   // neighbour cap per grid cell (9 cells -> at most 72 checks per enemy)
const SEP_OFFSETS = [0,0, -1,-1, 0,-1, 1,-1, -1,0, 1,0, -1,1, 0,1, 1,1];
const SEP_SPACING = 0.9;        // allow a little overlap so packs still look tight
const sepGrid = new Map();
let sepFrame = 0;
// After a push (separation/knockback): don't let an enemy end up outside [r, W-r] x [r, H-r]. An enemy
// that was already outside (just spawned off-screen) may stay where it was but isn't pushed further out.
function keepInArena(e, oldX, oldY){
  const r = e.r || 0;
  if(e.x < r) e.x = Math.max(e.x, Math.min(oldX, r)); else if(e.x > W - r) e.x = Math.min(e.x, Math.max(oldX, W - r));
  if(e.y < r) e.y = Math.max(e.y, Math.min(oldY, r)); else if(e.y > H - r) e.y = Math.min(e.y, Math.max(oldY, H - r));
}
function separateEnemies(dt){
  const n = enemies.length;
  if(n < 2) return;
  sepGrid.clear();
  for(let i=0;i<n;i++){
    const e = enemies[i];
    const key = (Math.floor(e.x / SEP_CELL) + 512) * 4096 + (Math.floor(e.y / SEP_CELL) + 512);
    let cell = sepGrid.get(key); if(!cell){ cell = []; sepGrid.set(key, cell); } cell.push(e);
  }
  const k = Math.min(0.5, dt * 8);  // fraction of the overlap resolved per frame (soft)
  sepFrame = (sepFrame + 1) % 1048576;
  for(let i=0;i<n;i++){
    const a = enemies[i];
    const cx = Math.floor(a.x / SEP_CELL), cy = Math.floor(a.y / SEP_CELL);
    // inside a crowded cell start at an offset that varies per enemy and per frame, so with the cap
    // every pair still gets checked within a few frames
    for(let c=0; c<9; c++){
      const gx = cx + SEP_OFFSETS[c*2], gy = cy + SEP_OFFSETS[c*2+1];
      const cell = sepGrid.get((gx + 512) * 4096 + (gy + 512));
      if(!cell) continue;
      const len = cell.length, off = (i + sepFrame * SEP_MAX_PER_CELL) % len;
      let checks = 0;
      for(let m=0; m<len && checks < SEP_MAX_PER_CELL; m++){
        const b = cell[(off + m) % len];
        if(b === a) continue;
        checks++;
        let dx = b.x - a.x, dy = b.y - a.y;
        const min = (a.r + b.r) * SEP_SPACING;
        const d2 = dx*dx + dy*dy;
        if(d2 >= min*min) continue;
        let d = Math.sqrt(d2);
        if(d < 0.001){ const ang = Math.random() * Math.PI * 2; dx = Math.cos(ang); dy = Math.sin(ang); d = 0; }
        else { dx /= d; dy /= d; }
        const push = (min - d) * k * 0.5;
        const ma = a.isBoss ? 0.1 : 1, mb = b.isBoss ? 0.1 : 1;
        const wa = ma / (ma + mb) * 2, wb = mb / (ma + mb) * 2;   // the lighter one moves more
        const ax = a.x, ay = a.y, bx0 = b.x, by0 = b.y;
        a.x -= dx * push * wb; a.y -= dy * push * wb;
        b.x += dx * push * wa; b.y += dy * push * wa;
        keepInArena(a, ax, ay); keepInArena(b, bx0, by0);
      }
    }
  }
}

// Safety net: an entity with a NaN/Infinity position can't be hit or collide and would stall a wave.
// Enemies with a bad position are moved back to an arena edge; enemies with bad hp/speed are removed
// (they still count as spawned, so the wave can finish). Bad bullets are dropped, bad players recentred.
const nonFiniteStats = { enemiesRepaired: 0, enemiesRemoved: 0, bullets: 0, players: 0 };
function repairNonFinite(){
  const fin = Number.isFinite;
  for(let i=enemies.length-1;i>=0;i--){
    const e = enemies[i];
    if(!fin(e.hp) || !fin(e.speed) || !fin(e.r)){ enemies.splice(i,1); nonFiniteStats.enemiesRemoved++; continue; }
    if(!fin(e.x) || !fin(e.y)){
      const edge = (Math.random()*4)|0;
      e.x = edge===0 ? -20 : edge===1 ? W+20 : Math.random()*W;
      e.y = edge===2 ? -20 : edge===3 ? H+20 : Math.random()*H;
      e.vx = 0; e.vy = 0;
      nonFiniteStats.enemiesRepaired++;
    }
    if(!fin(e.vx) || !fin(e.vy)){ e.vx = 0; e.vy = 0; }
  }
  for(let i=bullets.length-1;i>=0;i--){ const b = bullets[i]; if(!fin(b.x) || !fin(b.y) || !fin(b.vx) || !fin(b.vy)){ bullets.splice(i,1); nonFiniteStats.bullets++; } }
  for(const p of players){ if(!fin(p.x) || !fin(p.y)){ p.x = W/2; p.y = H/2; nonFiniteStats.players++; } }
}

// ---- Physics (v0.55). Kept separate from drawing so visual work can merge independently. ----------
// Player: velocity eases toward the input direction (acceleration) and back to zero (deceleration).
const PLAYER_ACCEL = 12, PLAYER_DECEL = 16;    // 1/s: higher = snappier (95% of target in ~0.25s / ~0.19s)
function updatePlayerVelocity(p, dx, dy, dt){
  const slowed = (p.slowUntil || 0) > state.animTime ? 0.6 : 1;
  const tx = dx * p.baseSpeed * slowed, ty = dy * p.baseSpeed * slowed;
  const k = 1 - Math.exp(-((dx || dy) ? PLAYER_ACCEL : PLAYER_DECEL) * dt);
  p.vx = (p.vx || 0) + (tx - (p.vx || 0)) * k;
  p.vy = (p.vy || 0) + (ty - (p.vy || 0)) * k;
  if(Math.abs(p.vx) < 0.5 && !dx) p.vx = 0;
  if(Math.abs(p.vy) < 0.5 && !dy) p.vy = 0;
}
// Enemies: bullets add a knockback velocity proportional to damage / mass; friction bleeds it off.
// Tuned so sustained fire pushes back at well under a quarter of enemy run speed (balance stays close).
const KNOCKBACK_PER_DMG = 1.6, KNOCKBACK_MAX = 220, KNOCKBACK_FRICTION = 8;
function enemyMass(e){ const m = (e.r / 12) ** 2; return e.isBoss ? m * 6 : m; }
function applyKnockback(e, dirX, dirY, damage){
  const len = Math.hypot(dirX, dirY);
  if(!(len > 0) || !(damage > 0)) return;
  const imp = damage * KNOCKBACK_PER_DMG / enemyMass(e);
  e.kx = (e.kx || 0) + dirX / len * imp;
  e.ky = (e.ky || 0) + dirY / len * imp;
  const sp = Math.hypot(e.kx, e.ky);
  if(sp > KNOCKBACK_MAX){ e.kx *= KNOCKBACK_MAX / sp; e.ky *= KNOCKBACK_MAX / sp; }
}
function integrateEnemyKnockback(e, dt){
  if(!e.kx && !e.ky) return;
  const ox = e.x, oy = e.y;
  e.x += e.kx * dt; e.y += e.ky * dt;
  keepInArena(e, ox, oy);
  const f = Math.exp(-KNOCKBACK_FRICTION * dt);
  e.kx *= f; e.ky *= f;
  if(Math.abs(e.kx) < 1 && Math.abs(e.ky) < 1){ e.kx = 0; e.ky = 0; }
}

function getNearestEnemyTo(x,y){ let best=null, bd=Infinity; for(const e of enemies){ const d=(e.x-x)**2 + (e.y-y)**2; if(d<bd){ bd=d; best=e; } } return best; }
function getNearestTreeTo(x,y){ let best=null, bd=Infinity; for(const tr of trees){ const d=(tr.x-x)**2 + (tr.y-y)**2; if(d<bd){ bd=d; best=tr; } } return best; }

// Per-weapon targeting: weapon wi aims at the wi-th nearest enemy, so the arsenal
// spreads across targets instead of every gun focusing the same enemy.
function pickAutoTarget(p, skipCount){
  if(skipCount <= 0){
    const n = getNearestEnemyTo(p.x, p.y) || getNearestTreeTo(p.x, p.y);
    return n ? aimPointFor(p, n) : null;
  }
  const best = [];
  for(const e of enemies){
    const dx = e.x - p.x, dy = e.y - p.y, d2 = dx*dx + dy*dy;
    if(best.length < skipCount + 1 || d2 < best[best.length-1].d2){
      best.push({d2, e});
      best.sort((a,b) => a.d2 - b.d2);
      if(best.length > skipCount + 1) best.pop();
    }
  }
  if(best.length > skipCount) return aimPointFor(p, best[skipCount].e);
  const t = getNearestTreeTo(p.x, p.y);
  return t ? aimPointFor(p, t) : null;
}

function fireWeaponFor(player, time, target, autoSpread){
  if(!target) return;
  // All owned weapons are equipped at once: each fires on its own cooldown, ammo and overheat.
  // With auto-spread, each weapon independently targets the Nth-nearest enemy.
  const owned = player.ownedWeapons;
  for(let wi = 0; wi < owned.length; wi++){
    const w = owned[wi];
    if(!w || w.reloading > 0 || w.overheated) continue;
    const fireRate = w.fireRate * player.reloadSpeed;
    if(time - (w.last||0) < fireRate) continue;
    if(w.ammoInMag <= 0){ w.reloading = w.reload * player.reloadSpeed; audio.beep(240,0.08,'sawtooth',0.04); continue; }
    w.last = time; w.ammoInMag -= 1; player.kick = Math.max(player.kick, 0.08 * w.recoil);
    if(w.overheatMax){
      w.heat += w.overheatPerShot;
      if(w.heat >= w.overheatMax){
        w.overheated = true;
        w.overheatTimer = w.overheatLock || 1.2;
        audio.deny();
      }
    }
    const wTarget = autoSpread ? (pickAutoTarget(player, wi) || target) : target;
    if(!wTarget) continue;
    const angle = Math.atan2(wTarget.y - player.y, wTarget.x - player.x);
    const count = w.pellets || 1;
    for(let i=0;i<count;i++){
      const spread = (w.spread || 0) / player.accuracy;
      const a = angle + ((Math.random()-0.5) * spread);
      const speed = w.bulletSpeed * (0.9 + Math.random()*0.2);
      let dmg = (w.damage + (player.damageBonus||0)) * (player.damageMult || 1) * (player.synergy ? 1.15 : 1);
      const isCrit = Math.random() < (player.critChance || 0);
      if(isCrit) dmg *= (player.critMult || 1.5);
      const elementalBonus = (w.elemental || w.explosive) ? (player.elementalBonus || 0) : 0;
      dmg *= (1 + elementalBonus);
      const elemental = w.elemental || (w.explosive ? 'fire' : null);
      // px/py = previous position for the swept hit test. A new bullet starts its sweep at the player's
      // centre, so an enemy overlapping the player (inside the muzzle offset) still gets hit.
      bullets.push({ x: player.x + Math.cos(a)*player.r, y: player.y + Math.sin(a)*player.r, px: player.x, py: player.y, fresh: true, vx: Math.cos(a)*speed, vy: Math.sin(a)*speed, life: 1.6, color: w.color, damage: dmg, ownerId: player.id, crit: isCrit, elemental, pierce: (w.pierce||0) + (player.pierceBonus||0), rehit: !!w.rehit, dist: 0, maxDist: ((w.range || 900) + (player.rangeBonus || 0)) * (player.rangeMult || 1), explosive: !!w.explosive, splashR: w.splashR || 110 });
    }
    addParticle({x:player.x + Math.cos(angle)*16, y:player.y + Math.sin(angle)*16, life:0.15, r: w.type==='heavy'?18:w.type==='shotgun'?14:10, color:w.color});
    if(audio.ctx && time - (w.lastSound||0) > 0.06){ w.lastSound = time; const freq = w.type==='heavy'?120:w.type==='shotgun'?180:w.type==='rifle'?240:320; audio.beep(freq,0.04,'square',0.03); }
  }
}

function killEnemy(index, ownerId){
  const e = enemies[index];
  if(!e) return;
  state.runKills++;
  runStats.kills++;
  if(runStats.kills === 1 || runStats.kills === 500 || runStats.kills === 2000) checkAchievements();
  awardToPlayerById(ownerId, e.xp, e.money);
  // elites drop bonus loot: extra money shower + floating text
  if(e.elite){
    for(let k=0;k<8;k++){ moneyDrops.push({x:e.x+rand(-16,16), y:e.y+rand(-16,16), r:5, life:6, t:0}); }
    floatingTexts.push({x:e.x, y:e.y-20, vx:0, vy:-50, life:1.5, text: `${e.eliteName} slain!`, color:'#ffd166'});
    addShake(6);
  }
  awardToPlayerById(ownerId, e.xp, e.money);
  addParticle({x:e.x,y:e.y,life:0.35,r:16,color:'#ff5d5d'});
  addShake(e.isBoss ? 12 : 3);
  audio.beep(140,0.06,'triangle',0.04);
  // splitter: bursts into runners on death (elite: 4 instead of 2)
  if(e.splits){
    const rt = enemyTypes[0];
    const count = e.elite ? 4 : 2;
    for(let k=0;k<count;k++){
      const a = Math.random()*Math.PI*2;
      enemies.push({ id: rt.id, x: e.x + Math.cos(a)*14, y: e.y + Math.sin(a)*14, r: rt.r,
        hp: Math.floor(rt.hp * (1 + Math.max(0, state.wave-1) * 0.12)), maxHp: Math.floor(rt.hp * (1 + Math.max(0, state.wave-1) * 0.12)),
        speed: rt.speed + state.wave*2, dmg: e.dmg, color: rt.color, xp: Math.max(1, Math.floor(rt.xp/2)), money: 1 });
    }
  }
  // drop money pickups
  for(let k=0;k<e.money;k++){ moneyDrops.push({x:e.x+rand(-10,10), y:e.y+rand(-10,10), r:5, life:6, t:0}); }
  enemies.splice(index,1);
}

// damage helper: armor applies, and no single hit can exceed 50% of max HP (no 1-shots)
function hurtPlayer(p, raw){
  if(!p || p.dead) return;
  if(typeof devMode !== 'undefined' && devMode) return;   // creative mode: invincible
  const cap = Math.max(1, (p.baseMaxHp || 100) * 0.5);
  p.hp -= Math.min(Math.max(1, raw - (p.armor || 0)), cap);
  p.hitFlash = 0.12;
  runStats.tookDamage = true;
  if(p.hp <= 0){ p.hp = 0; p.dead = true; if(players.every(pl=>pl.dead)){ state.phase='gameover'; showRunOver(); } }
}
// burster: proximity-fused explosion. One AoE hit, then the enemy is gone (no contact DPS).
function explodeEnemy(e, index){
  const R = e.elite ? 140 : 85, base = e.dmg * (e.elite ? 4 : 3);
  for(const p of players){
    if(p.dead) continue;
    const d = Math.hypot(p.x - e.x, p.y - e.y);
    if(d < R + p.r){
      hurtPlayer(p, base * (1 - d / (R + p.r)));
      addShake(6);
      if(p.hp <= 0){
        p.hp = 0; p.dead = true; p.reviveProgress = 0; addShake(10);
        if(players.every(pl=>pl.dead)){ state.phase = 'gameover'; showRunOver(); }
      }
    }
  }
  addParticle({x:e.x, y:e.y, life:0.4, r:26, color:'#ff8c42'});
  addParticle({x:e.x, y:e.y, life:0.3, r:16, color:'#ff5d2a'});
  audio.deny();
  enemies.splice(index, 1);
}

// Player explosives (RPG, grenades, mortar...): AoE splash around the impact point.
// skipEnemy already took the direct hit; victimIdx lets the caller fix its enemy-loop
// index when splash kills shift enemies below it. Returns the index shift.
function detonate(b, x, y, skipEnemy, victimIdx, ownerId){
  const R = b.splashR || 110;
  let shift = 0;
  for(let k=enemies.length-1;k>=0;k--){
    const en = enemies[k];
    if(en === skipEnemy) continue;
    const dx = en.x - x, dy = en.y - y;
    if(dx*dx + dy*dy > (R + en.r)*(R + en.r)) continue;
    const d = Math.sqrt(dx*dx + dy*dy);
    const dmg = b.damage * (1 - 0.5 * Math.min(1, d / R));
    en.hp -= dmg;
    if(!en.status) en.status = {burn:0,burnDps:0,slow:0,shock:0};
    en.status.burn = Math.max(en.status.burn, 3);
    en.status.burnDps = Math.max(en.status.burnDps, dmg * 0.5);
    en.hitFlash = 0.1;
    applyKnockback(en, dx, dy, dmg);
    floatingTexts.push({x:en.x, y:en.y-6, vx:rand(-12,12), vy:-40, life:0.7, text:Math.max(1, Math.round(dmg)), color:'#ffb066'});
    if(en.hp <= 0){ killEnemy(k, ownerId); if(k < victimIdx) shift++; }
  }
  addParticle({x, y, life:0.35, r:R*0.55, color:'#ff8c42'});
  addParticle({x, y, life:0.25, r:R*0.35, color:'#ffd166'});
  addParticle({x, y, life:0.5, r:R*0.7, color:'#555555'});
  addShake(5);
  if(audio.ctx) audio.beep(70, 0.25, 'sawtooth', 0.12);
  return shift;
}

function awardToPlayerById(id, xp, money){ const p = players.find(x=>x.id===id) || players[0]; p.xp += xp; p.currency += money; while(p.xp >= p.xpNext){ levelUp(p); } }

function buyShopItemFor(player){
  const item = shop.items[shop.selection];
  if(!item || !item.data) return;
  if(player.currency < item.price){ audio.deny(); return; }
  if(item.type === 'item' && item.data.category === 'unique' && playerOwnsUnique(player)){ audio.deny(); return; }
  if(typeof devMode === 'undefined' || !devMode){
    player.currency -= item.price;
    runStats.spent += item.price;
    if(runStats.spent >= 500) checkAchievements();
  }
  if(item.type === 'weapon'){
    player.ownedWeapons.push(createWeaponInstance(item.data, item.rarity || item.data.rarity));
    refreshAmmoFor(player);
    checkAchievements();
  } else {
    if(!addItemToPlayer(player, item.data, item.rarity || item.data.rarity)){ player.currency += item.price; audio.deny(); return; }
    checkAchievements();
  }
  // Mirror: the next non-Mirror item bought comes in duplicate (a Mirror never duplicates itself).
  if(item.type === 'item'){
    if(item.data.id === 'mirror'){
      if(!player.mirrorActive){ player.mirrorActive = true; floatingTexts.push({x:player.x, y:player.y-30, vx:0, vy:-40, life:1.2, text:'Mirror armed: next item x2', color:'#b67bff'}); }
    } else if(player.mirrorActive){
      player.mirrorActive = false;
      addItemToPlayer(player, item.data, item.rarity || item.data.rarity);
      floatingTexts.push({x:player.x, y:player.y-30, vx:0, vy:-40, life:1.2, text:'Mirrored!', color:'#b67bff'});
    }
  }
  // Sold out: remove the bought offer from this shop's stock (restocks next wave).
  shop.items[shop.selection] = null;
  if(shop.locked) shop.locked[shop.selection] = null;
  normalizeShopSelection();
  audio.buy();
}

// UI: build dangers
// ---- Menu: element refs ----
// mouse/shop interaction: compute if click on a shop card
function startNextWave(){
  state.wave = state.endless ? state.wave + 1 : Math.min(state.maxWave, state.wave + 1);
  // track best endless wave
  if(state.endless && state.wave > state.bestEndless){
    state.bestEndless = state.wave;
    try{ localStorage.setItem('pp_bestEndless', String(state.bestEndless)); }catch(e){}
  }
  startWave(); canvas.style.cursor = 'default';
}

// Continue past wave 20 into endless mode (from victory screen)
function startEndless(){
  state.endless = true;
  state.phase = 'upgrade';
  buildUpgradeChoices();
  if(pauseBtn) pauseBtn.style.display = 'block';
}

canvas.addEventListener('contextmenu', (e)=>{
  if(state.phase !== 'shop') return;
  e.preventDefault();
  const r = canvas.getBoundingClientRect(); const mx = e.clientX - r.left, my = e.clientY - r.top;
  for(const def of getShopPanels()){
    for(let i=0;i<shop.items.length;i++){
      if(inRect(mx, my, getShopCardRect(def, i))){
        if(shop.items[i]){ shop.locked[i] = shop.locked[i] ? null : shop.items[i]; }
        audio.click();
        return;
      }
    }
  }
});

canvas.addEventListener('click', (e)=>{
  const r = canvas.getBoundingClientRect(); const mx = e.clientX - r.left, my = e.clientY - r.top;
  if(state.phase === 'upgrade'){
    const L = getUpgradeLayout();
    for(let i=0;i<upgradeChoices.items.length;i++){
      if(inRect(mx, my, L.cards[i])){
        upgradeChoices.selection = i;
        audio.click();
        applyUpgradeChoice(upgradeChoices.items[i]);
        // open shop after upgrade
        moneyDrops.length = 0;
        state.phase = 'shop';
        state.shopAnim = 0;
        buildShop();
        return;
      }
    }
    return;
  }
  if(state.phase !== 'shop' || state.shopView === 'stats') return;
  const B = getShopButtons();
  if(inRect(mx, my, B.reroll)){ rerollShop(); return; }
  if(inRect(mx, my, B.next)){ audio.click(); startNextWave(); return; }
  for(const def of getShopPanels()){
    for(let i=0;i<shop.items.length;i++){
      if(inRect(mx, my, getShopCardRect(def, i))){
        shop.selection = i;
        normalizeShopSelection();
        audio.click();
        buyShopItemFor(def.player);
        return;
      }
    }
  }
});

// Core update loop
function update(dt, t){ if(state.phase === 'menu' || state.phase === 'gameover' || state.phase === 'runwon') return;
  if(menuEl && menuEl.style.display !== 'none') return;
  if(input.keys['p']){
    input.keys['p'] = false;
    togglePause();
  }
  if(input.keys['m']){
    input.keys['m'] = false;
    audio.setMuted(!audio.muted);
    flashMsg(audio.muted ? 'Audio muted (M)' : 'Audio unmuted', 1.1);
  }
  if(state.paused) return;
  if(state.phase === 'wave' || state.phase === 'shop' || state.phase === 'upgrade' || state.phase === 'victory') state.runTime += dt;
  // animation clock, camera shake and the wave banner stop while paused
  state.animTime += dt;
  updateCamera(dt);
  if(state.waveBanner > 0) state.waveBanner = Math.max(0, state.waveBanner - dt);
  if(state.eliteBanner > 0) state.eliteBanner = Math.max(0, state.eliteBanner - dt);
  // co-op revive: stand near a downed partner for 3s to bring them back at 50% HP
  // plus proximity synergy: +15% damage when within 150px of your partner
  if(state.coop){
    const alive = players.filter(p=>!p.dead);
    for(const p of alive){
      p.synergy = false;
      for(const q of alive){
        if(p === q) continue;
        if(Math.hypot(p.x - q.x, p.y - q.y) < 150){ p.synergy = true; break; }
      }
    }
    for(const downed of players){
      if(!downed.dead) continue;
      downed.reviveProgress = downed.reviveProgress || 0;
      let reviverNear = false;
      for(const p of players){
        if(p === downed || p.dead) continue;
        if(Math.hypot(p.x - downed.x, p.y - downed.y) < 70){ reviverNear = true; break; }
      }
      if(reviverNear){
        downed.reviveProgress += dt;
        if(downed.reviveProgress >= 3){
          downed.dead = false;
          downed.hp = Math.max(1, Math.floor(downed.baseMaxHp * 0.5));
          downed.reviveProgress = 0;
          runStats.revives++;
          checkAchievements();
          addParticle({x: downed.x, y: downed.y, life: 0.8, r: 24, color: '#6ef2b1'});
          flashMsg('REVIVED!', '#6ef2b1');
          audio.pickup();
        }
      } else {
        downed.reviveProgress = Math.max(0, downed.reviveProgress - dt * 2);
      }
    }
  }
  // players movement
  for(let idx=0; idx<players.length; idx++){
    const p = players[idx]; if(p.dead) continue; let dx=0, dy=0;
    if(idx===0){ 
      if(input.keys['w']) dy-=1; 
      if(input.keys['s']) dy+=1; 
      if(input.keys['a']) dx-=1; 
      if(input.keys['d']) dx+=1; 
    }
    if(idx===1){ 
      if(input.keys['arrowup']) dy-=1; 
      if(input.keys['arrowdown']) dy+=1; 
      if(input.keys['arrowleft']) dx-=1; 
      if(input.keys['arrowright']) dx+=1; 
    }
    if(idx===0 && settings.mouseAim){ p.angle = Math.atan2(input.my - p.y, input.mx - p.x); }
    if(state.phase === 'shop' || state.phase === 'upgrade'){ dx = 0; dy = 0; }
    if(dx||dy){ const len = Math.hypot(dx,dy); dx/=len; dy/=len; }
    if(p.dashCooldown > 0) p.dashCooldown -= dt;
    if(p.iFrames > 0) p.iFrames -= dt;
    // Co-op dash: P1 uses Left Shift, P2 uses Right Shift (U kept as a P2 alternate).
    const dashInput = (idx===0 && input.shiftL) || (idx===1 && (input.shiftR || input.keys['u']));
    if(dashInput && p.dashCooldown <= 0){
      const dir = (dx||dy) ? Math.atan2(dy, dx) : p.angle;
      p.dashDir = dir;
      p.dashTimer = 0.22;
      p.dashCooldown = 2.1;
      p.iFrames = 0.28;
      addShake(4);
      audio.dash();
      if(idx===0){ input.shiftL = false; } else { input.shiftR = false; input.keys['u'] = false; }
      for(let k=0;k<6;k++){
      addParticle({x:p.x + rand(-6,6), y:p.y + rand(-6,6), life:0.25, r:8 - k*0.6, color: palette.uiBlue});
      }
    }
    if(p.dashTimer > 0){
      p.dashTimer -= dt;
      const speed = p.baseSpeed * 3.2;
      p.x += Math.cos(p.dashDir) * speed * dt;
      p.y += Math.sin(p.dashDir) * speed * dt;
      // leave the dash carrying normal run speed in the dash direction
      p.vx = Math.cos(p.dashDir) * p.baseSpeed; p.vy = Math.sin(p.dashDir) * p.baseSpeed;
    } else {
      updatePlayerVelocity(p, dx, dy, dt);
      p.x += p.vx * dt; p.y += p.vy * dt;
    }
    if(p.x < 0 || p.x > W){ p.x = Math.max(0, Math.min(W, p.x)); p.vx = 0; }
    if(p.y < 0 || p.y > H){ p.y = Math.max(0, Math.min(H, p.y)); p.vy = 0; }
    // each equipped weapon reloads on its own timer
    for(const w of p.ownedWeapons){
      if(w.reloading > 0){ w.reloading -= dt; if(w.reloading <= 0){ w.ammoInMag = Math.max(1, (w.mag||999) + p.magBonus); audio.beep(320,0.05,'triangle',0.04); } }
    }
    if(p.kick > 0) p.kick -= dt * 2.5; if(p.hitFlash > 0) p.hitFlash -= dt;
  }

  // weapons heat/cool
  for(const p of players){
    for(const w of p.ownedWeapons){
      if(!w) continue;
      if(w.overheated){
        w.overheatTimer -= dt;
        if(w.overheatTimer <= 0){ w.overheated = false; }
      }
      if(w.overheatMax){
        w.heat = Math.max(0, w.heat - (w.overheatCool||0) * dt);
      }
    }
  }

  // phase handling
  if(state.phase === 'wave'){
    // safety net: death from any source (not just contact damage) ends the run
    if(players.length > 0 && players.every(pl => pl.dead || pl.hp <= 0)){
      for(const pl of players){ if(pl.hp <= 0){ pl.hp = 0; pl.dead = true; } }
      state.phase = 'gameover'; showRunOver();
      return;
    }
    if(state.treeWave !== state.wave){
      trees.length = 0;
      const treeCount = Math.max(1, Math.floor(1 + state.wave*0.2));
      for(let i=0;i<treeCount;i++){ spawnTree(); }
      state.treeWave = state.wave;
    }
    // wave timer: survive the clock instead of clearing every enemy
    state.waveTime = (state.waveTime || 0) + dt;
    const timeUp = state.waveTime >= WAVE_DURATION;
    // spawn logic: pace the spawn budget across the timer so the action lasts the full wave
    const baseSpawnRate = Math.max(0.35, 1.0 - state.wave*0.035);
    const dangerSpawnMult = 1 + (state.danger-1)*0.2;
    state.spawnTimer -= dt;
    const pacedInterval = Math.max(0.12, (WAVE_DURATION - 2) / Math.max(1, state.waveTotal));
    const spawnInterval = isBossWave(state.wave) ? Math.max(0.12, baseSpawnRate / dangerSpawnMult / (state.coop?1.4:1)) : pacedInterval;
    if(state.spawnTimer <= 0){ state.spawnTimer = spawnInterval; }
    if(isBossWave(state.wave)){
      if(!state.bossSpawned){
        spawnBoss();
        if(dangerMods(state.danger).doubleBoss){ spawnBoss(); state.waveSpawned++; }  // D5: two Voidreavers at once
        state.bossSpawned = true;
        state.waveSpawned++;   // elites (if any) already counted in startWave
      }
    } else if(state.waveSpawned < state.waveTotal && Math.random() < dt / spawnInterval){
      spawnEnemy();
      state.waveSpawned++;
    }
    // enemy bullets: move, hit players (capped by hurtPlayer), expire off-screen
    for(let i = enemyBullets.length - 1; i >= 0; i--){
      const b = enemyBullets[i];
      const esx = b.vx * dt, esy = b.vy * dt;
      b.x += esx; b.y += esy; b.life -= dt; b.dist = (b.dist || 0) + Math.sqrt(esx*esx + esy*esy);
      let consumed = b.life <= 0 || (b.maxDist && b.dist >= b.maxDist) || b.x < -40 || b.x > W + 40 || b.y < -40 || b.y > H + 40;
      if(!consumed){
        for(const p of players){
          if(p.dead || p.iFrames > 0) continue;
          if(Math.hypot(p.x - b.x, p.y - b.y) < p.r + b.r){
            hurtPlayer(p, b.dmg);
            addParticle({x:b.x, y:b.y, life:0.25, r:8, color:'#aaff66'});
            consumed = true; break;
          }
        }
      }
      if(consumed) enemyBullets.splice(i, 1);
    }
    const bossCleared = isBossWave(state.wave) && state.bossSpawned && enemies.length === 0;
    if(timeUp || bossCleared){ // wave complete
      if(timeUp && enemies.length){ for(const e of enemies){ addParticle({x:e.x, y:e.y, life:0.4, r:e.r || 12, color:'#aab0c4'}); } enemies.length = 0; }
      state.waveCompleteTimer += dt;
      moneyDrops.length = 0;
      if(!runStats.tookDamage && state.wave > 1) unlockAchievement('untouchable');
      checkAchievements();
      if(state.wave >= state.maxWave && !state.endless){
        // Final wave cleared: unlock the next danger level (if this run earned it), celebrate
        // briefly, then return to the menu where the new danger is selectable. No victory screen.
        let newlyUnlocked = 0;
        if(state.danger < 5 && state.danger <= state.unlockedDanger){
          newlyUnlocked = state.danger + 1;
          state.unlockedDanger = Math.min(5, newlyUnlocked);
          localStorage.setItem(UNLOCK_KEY, state.unlockedDanger);
        }
        state.victoryUnlocked = newlyUnlocked;
        state.phase = 'victory';
        state.victoryTimer = 0;
        audio.pickup(); setTimeout(()=>audio.buy(), 140); setTimeout(()=>audio.pickup(), 280);
      } else {
        // open stat selector before shop
        state.phase = 'upgrade';
        buildUpgradeChoices();
      }
    }
  } else if(state.phase === 'victory'){
    // Celebration beat after clearing the final wave: confetti, then back to the menu
    // where the newly unlocked danger is selectable.
    state.victoryTimer += dt;
    if(Math.random() < dt * 24){
      addParticle({x: Math.random()*W, y: Math.random()*H*0.55, life: 0.9, r: 5,
        color: ['#ffd166','#6ef2b1','#6cd6ff','#ff6b6b'][(Math.random()*4)|0]});
    }
    if(state.victoryTimer > 2.8 && !state.summaryShown) showRunWon();
  } else if(state.phase === 'upgrade'){
    // wait for click selection in UI
  } else if(state.phase === 'shop'){
    state.shopAnim = Math.min(1, (state.shopAnim||0) + dt*2);
    if(!shop.items || shop.items.length === 0) buildShop();
    normalizeShopSelection();
    if(input.keys['tab']){ input.keys['tab'] = false; state.shopView = state.shopView === 'shop' ? 'stats' : 'shop'; audio.click(); }
    // keyboard shop navigation
    if(shop.items.length > 0){
      if(input.keys['arrowright']){ input.keys['arrowright'] = false; shop.selection = (shop.selection+1)%shop.items.length; audio.click(); }
      if(input.keys['arrowleft']){ input.keys['arrowleft'] = false; shop.selection = (shop.selection-1+shop.items.length)%shop.items.length; audio.click(); }
      if(input.keys[' ']){ input.keys[' '] = false; buyShopItemFor(players[0]); }
    }
    if(input.keys['enter']){ input.keys['enter'] = false; startNextWave(); }
    if(input.keys['r']){ input.keys['r'] = false; rerollShop(); }
  }

  // bullets update
  for(let i=bullets.length-1;i>=0;i--){ const b=bullets[i]; if(b.fresh){ b.fresh = false; } else { b.px = b.x; b.py = b.y; } const stepx = b.vx*dt, stepy = b.vy*dt; b.x += stepx; b.y += stepy; b.life -= dt; b.dist = (b.dist || 0) + Math.sqrt(stepx*stepx + stepy*stepy); if(b.life<=0 || (b.maxDist && b.dist >= b.maxDist) || b.x<-50 || b.x>W+50 || b.y<-50 || b.y>H+50 || bullets.length>MAX_BULLETS){ if(b.explosive && b.dist > 60) detonate(b, b.x, b.y, null, -1, b.ownerId); bullets.splice(i,1); } }

  // bullets vs trees (destructibles)
  for(let i=bullets.length-1;i>=0;i--){
    const b = bullets[i];
    for(let j=trees.length-1;j>=0;j--){
      const tr = trees[j];
      if(segmentHitsCircle(b.px ?? b.x, b.py ?? b.y, b.x, b.y, tr.x, tr.y, tr.r + 4)){
        tr.hp -= b.damage;
        if(tr.hp <= 0){
          spawnFruit(tr.x, tr.y);
          addParticle({x:tr.x, y:tr.y, life:0.25, r:12, color:palette.uiGreen});
          trees.splice(j,1);
        }
        if(b.pierce > 0){ b.pierce--; } else { bullets.splice(i,1); }
        break;
      }
    }
  }

  // enemies
  repairNonFinite();
  // Perf: was players.filter() per enemy (an array allocation for every enemy, every frame).
  // The array holds references; later code re-snapshots after deaths, so behaviour is unchanged.
  const waveAlive = players.filter(p=>!p.dead);
  for(let i=enemies.length-1;i>=0;i--){ const e=enemies[i]; // choose nearest alive player to chase
    if(waveAlive.length === 0) continue;
    let target = waveAlive[0]; let bd = (e.x-waveAlive[0].x)**2 + (e.y-waveAlive[0].y)**2; for(const p of waveAlive){ const d=(e.x-p.x)**2 + (e.y-p.y)**2; if(d<bd){ bd=d; target=p; } }
    // apply status effects
    if(!e.status) e.status = {burn:0,burnDps:0,slow:0,shock:0};
    if(e.status.burn > 0){
      e.status.burn -= dt;
      e.hp -= e.status.burnDps * dt;
      addParticle({x:e.x, y:e.y, life:0.08, r:4, color:'#ff8c42'});
    }
    if(e.status.slow > 0){ e.status.slow -= dt; }
    // burn ticks and shock chains can drop hp to <= 0 without a bullet hit; kill the enemy here
    if(e.hp <= 0){ killEnemy(i, e.lastHitBy); continue; }

    const slowMult = e.status.slow > 0 ? 0.6 : 1;
    const ang = Math.atan2(target.y - e.y, target.x - e.x);
    // dasher: periodic burst toward the player (elite: relentless)
    let dashMult = 1;
    if(e.dashes){
      e.dashTimer -= dt;
      if(e.dashTime > 0){ e.dashTime -= dt; dashMult = 3; }
      else if(e.dashTimer <= 0){ e.dashTime = e.elite ? 0.7 : 0.5; e.dashTimer = e.elite ? 1.2 + Math.random() : 2.5 + Math.random()*1.5; addParticle({x:e.x,y:e.y,life:0.25,r:12,color:'#ff9f43'}); }
    }
    // nester: spawns a runner periodically (elite: rapid)
    if(e.spawns){
      e.spawnTimer -= dt;
      if(e.spawnTimer <= 0 && enemies.length < 110){
        e.spawnTimer = e.elite ? 3 : 5;
        const rt = enemyTypes[0];
        enemies.push({ id:'runner', x:e.x+rand(-20,20), y:e.y+rand(-20,20), r:rt.r, hp:Math.floor(rt.hp*(1+state.wave*0.12)), maxHp:Math.floor(rt.hp*(1+state.wave*0.12)), speed:rt.speed, dmg:Math.floor(rt.dmg+state.wave*1.2), color:rt.color, xp:rt.xp, money:rt.money });
        addParticle({x:e.x,y:e.y,life:0.3,r:16,color:'#9b59b6'});
      }
    }
    // spitter: keeps its distance and spits projectiles
    if(e.ranged && !e.dead){
      e.shootTimer = (e.shootTimer == null ? 1.2 + Math.random() : e.shootTimer) - dt;
      const sDist = Math.hypot(target.x - e.x, target.y - e.y);
      if(e.shootTimer <= 0 && sDist < 560){
        e.shootTimer = 2.1 + Math.random() * 0.9;
        const sa = Math.atan2(target.y - e.y, target.x - e.x), spd = 330;
        enemyBullets.push({x:e.x, y:e.y, vx:Math.cos(sa)*spd, vy:Math.sin(sa)*spd, r:6,
          dmg:Math.max(4, Math.floor(e.dmg * 0.7)), color:'#aaff66', life:3.2, dist:0, maxDist:700});
        addParticle({x:e.x, y:e.y, life:0.2, r:10, color:'#aaff66'});
        audio.beep(300, 0.07, 'square', 0.03);
      }
    }
    // boss abilities
    if(e.isBoss && e.bossAbility){
      const ab = e.bossAbility;
      const isNightmare = ab === 'nightmare';
      const effAb = isNightmare ? 'annihilator' : ab;
      // Nightmare: enraged below 65% HP — 45% faster
      const enrage = isNightmare && e.hp < e.maxHp * 0.65 ? 1.45 : 1;
      // Hive Tyrant / Voidreaver / Nightmare: spawn minions
      if((effAb === 'spawn' || effAb === 'annihilator')){
        e.spawnTimer -= dt;
        if(e.spawnTimer <= 0 && enemies.length < 110){
          e.spawnTimer = (effAb === 'annihilator' ? 3.5 : 5) / enrage;
          const pool = [enemyTypes[0], enemyTypes[1], enemyTypes[2]];
          const rt = pool[Math.floor(Math.random()*pool.length)];
          for(let k=0;k<3;k++){
            enemies.push({ id:rt.id, x:e.x+rand(-30,30), y:e.y+rand(-30,30), r:rt.r,
              hp:Math.floor(rt.hp*(1+state.wave*0.12)), maxHp:Math.floor(rt.hp*(1+state.wave*0.12)),
              speed:rt.speed, dmg:Math.floor(rt.dmg+state.wave*1.2), color:rt.color, xp:rt.xp, money:rt.money });
          }
          addParticle({x:e.x,y:e.y,life:0.4,r:24,color:'#9b59b6'});
        }
      }
      // Overlord / Nightmare: burrow — dives underground, races at the player, erupts with an AoE slam
      if(ab === 'burrow' || isNightmare){
        if(e.burrowTime > 0){
          e.burrowTime -= dt;
          dashMult = 3 * enrage;
          if(Math.random() < dt * 20) addParticle({x:e.x + rand(-20,20), y:e.y + rand(-10,10), life:0.4, r:10, color:'#8a6f4d'});
          if(e.burrowTime <= 0){
            const R = 150;
            addParticle({x:e.x, y:e.y, life:0.5, r:R*0.7, color:'#ff8c42'});
            addParticle({x:e.x, y:e.y, life:0.3, r:R*0.4, color:'#ffd166'});
            addShake(10);
            audio.beep(60, 0.35, 'sawtooth', 0.12);
            for(const p of players){
              if(p.dead) continue;
              const d = Math.hypot(p.x - e.x, p.y - e.y);
              if(d < R + p.r){
                hurtPlayer(p, e.dmg * 2);
                const ka = Math.atan2(p.y - e.y, p.x - e.x);
                p.vx += Math.cos(ka) * 600; p.vy += Math.sin(ka) * 600;
                if(p.hp <= 0){ p.hp = 0; p.dead = true; if(players.every(pl=>pl.dead)){ state.phase='gameover'; showRunOver(); } }
              }
            }
          }
        } else {
          e.burrowTimer -= dt;
          if(e.burrowTimer <= 0){
            e.burrowTimer = (isNightmare ? 7 : 9) / enrage;
            e.burrowTime = 1.1;
            addShake(4);
            audio.beep(90, 0.2, 'sawtooth', 0.06);
          }
        }
      }
      // Stormcaller / Voidreaver / Nightmare: shockwave slam
      if((effAb === 'shockwave' || effAb === 'annihilator')){
        e.abilityTimer -= dt;
        if(e.abilityTimer <= 0){
          e.abilityTimer = (effAb === 'annihilator' ? 4 : 5.5) / enrage;
          const R = 150;
          addParticle({x:e.x,y:e.y,life:0.5,r:R,color:'#4cc3ff'});
          addShake(10);
          audio.beep(80,0.3,'sawtooth',0.08);
          for(const p of players){
            if(p.dead) continue;
            const d = Math.hypot(p.x-e.x, p.y-e.y);
            if(d < R + p.r){
              hurtPlayer(p, e.dmg * 1.75);
              const ka = Math.atan2(p.y-e.y, p.x-e.x);
              p.vx += Math.cos(ka)*500; p.vy += Math.sin(ka)*500;
              if(p.hp <= 0){ p.hp = 0; p.dead = true; if(players.every(pl=>pl.dead)){ state.phase='gameover'; showRunOver(); } }
            }
          }
        }
      }
      // Stormcaller / Voidreaver / Nightmare: dashes
      if((effAb === 'shockwave' || effAb === 'annihilator')){
        e.dashTimer -= dt;
        if(e.dashTime > 0){ e.dashTime -= dt; dashMult = 2.5 * enrage; }
        else if(e.dashTimer <= 0){ e.dashTime = 0.6; e.dashTimer = (3 + Math.random()*2) / enrage; }
      }
    }
    // visual only: facing + hit flash timer
    e.face = Math.cos(ang) < 0 ? -1 : 1;
    if(e.hitFlash > 0) e.hitFlash -= dt;
    let mvAng = ang;
    if(e.ranged){
      const rDist = Math.hypot(target.x - e.x, target.y - e.y);
      if(rDist < 220) mvAng = ang + Math.PI;              // too close: back away
      else if(rDist < 340){                                // sweet spot: strafe
        if(e.strafeDir == null || Math.random() < dt * 0.4) e.strafeDir = Math.random() < 0.5 ? 1 : -1;
        mvAng = ang + e.strafeDir * Math.PI / 2;
      }
    }
    e.vx = Math.cos(mvAng) * e.speed * slowMult * dashMult;   // kept for auto-aim lead
    e.vy = Math.sin(mvAng) * e.speed * slowMult * dashMult;
    e.x += e.vx * dt;
    e.y += e.vy * dt;
    integrateEnemyKnockback(e, dt);

    // burster proximity fuse: pops when close to a player, dealing AoE damage once
    if(e.explodes && waveAlive.length > 0){
      let nearestD2 = Infinity;
      for(const p of waveAlive){ const d2 = (p.x-e.x)*(p.x-e.x) + (p.y-e.y)*(p.y-e.y); if(d2 < nearestD2) nearestD2 = d2; }
      if(nearestD2 < 48*48){ explodeEnemy(e, i); continue; }
    }

    // bullets collision (swept: previous -> current bullet position vs enemy radius + bullet radius)
    let killed = false;
    for(let j=bullets.length-1;j>=0;j--){ const b = bullets[j];
          if(b.hits && b.hits.includes(e)) continue;   // a piercing bullet hits each enemy once
          // rehit weapons (Harpoon): hitting the same enemy again needs the bullet to still be inside it
          // (the pre-v0.54 point test), so its single-target damage matches the old behaviour.
          // Perf: squared distance instead of Math.hypot here — this runs per bullet/enemy pair.
          if(b.rehit && b.lastHit === e){ const rdx = b.x - e.x, rdy = b.y - e.y, rr2 = e.r + BULLET_HIT_R; if(rdx*rdx + rdy*rdy >= rr2*rr2) continue; }
          if(segmentHitsCircle(b.px ?? b.x, b.py ?? b.y, b.x, b.y, e.x, e.y, e.r + BULLET_HIT_R)){
            // aegis shield aura: nearby enemies take 30% less damage (elite: wider aura)
            let dmgMult = 1;
            for(const o of enemies){ if(o.shields && o !== e){ const auraR = o.elite ? 220 : 150; const dx=o.x-e.x, dy=o.y-e.y; if(dx*dx+dy*dy < auraR*auraR){ dmgMult = 0.7; break; } } }
            const finalDmg = b.damage * dmgMult;
            // Ironclad boss: 40% damage reduction
            const bossDR = (e.isBoss && e.bossAbility === 'fortress') ? 0.5 : 1;
            e.hp -= finalDmg * bossDR;
            // elite bulwark (Ironwall) / Ironclad boss: reflects damage back to the shooter
            const reflect = (e.elite && e.id === 'bulwark') ? 0.2 : (e.isBoss && e.bossAbility === 'fortress') ? 0.3 : 0;
            if(reflect > 0 && b.ownerId){
              const shooter = players.find(p=>p.id === b.ownerId);
              if(shooter && !shooter.dead){ shooter.hp -= Math.max(1, finalDmg * bossDR * reflect); runStats.tookDamage = true; shooter.hitFlash = 0.12; }
            }
            e.lastHitBy = b.ownerId;
            applyKnockback(e, b.vx, b.vy, b.damage);
            e.hitFlash = 0.1; // visual only
            const dealt = Math.max(1, Math.round(Math.min(b.damage, b.damage + e.hp)));
            floatingTexts.push({x:e.x, y:e.y-6, vx:rand(-12,12), vy:-40, life:0.8, text: dealt, color: b.crit ? '#ffd166' : palette.textLight});
            addShake(b.crit ? 2 : 0.5);
            // elemental status
            if(b.elemental === 'fire'){
              e.status.burn = Math.max(e.status.burn, 4);
              e.status.burnDps = Math.max(e.status.burnDps, b.damage * 0.6);
            } else if(b.elemental === 'ice'){
              e.status.slow = Math.max(e.status.slow, 2.0);
            } else if(b.elemental === 'shock'){
              // chain shock to nearby enemy
              const chain = enemies.find(en => en !== e && Math.hypot(en.x - e.x, en.y - e.y) < 80);
              if(chain){
                chain.hp -= b.damage * 0.6;
                chain.lastHitBy = b.ownerId;   // so a chain kill credits the shooter (co-op)
                chain.hitFlash = 0.1;
                addParticle({x:chain.x,y:chain.y,life:0.2, r:8, color:'#b27bff'});
              }
            }
            addParticle({x:e.x,y:e.y,life:0.2, r:8, color:'#ffd166'}); const ownerId = b.ownerId;
            if(b.explosive){ i -= detonate(b, b.x, b.y, e, i, ownerId); bullets.splice(j,1); }
            else if(b.pierce > 0){ b.pierce--; if(b.rehit) b.lastHit = e; else (b.hits || (b.hits = [])).push(e); } else { bullets.splice(j,1); } if(e.hp <= 0){ // die
            // reward to owner if available, else nearest player
            killEnemy(i, ownerId); killed = true; break; } }
    }
    if(killed) continue;   // enemy was removed: no contact damage from it this frame

    // collision with player
    for(const p of players){
      if(p.dead) continue;
      if(p.iFrames > 0) continue;
      const d = Math.hypot(p.x - e.x, p.y - e.y);
      if(d < p.r + e.r){
        p.hp -= Math.max(1, (e.dmg - p.armor) * dt);
        runStats.tookDamage = true;
        // elite spitter (Plaguewing): venomous touch slows the player
        if(e.elite && e.id === 'spitter') p.slowUntil = Math.max(p.slowUntil || 0, state.animTime + 2);
        // elite bruiser (Skullcrusher): shockwave slam knocks the player back
        if(e.elite && e.id === 'bruiser' && p.hitFlash <= 0){
          const ka = Math.atan2(p.y - e.y, p.x - e.x);
          p.vx += Math.cos(ka) * 400; p.vy += Math.sin(ka) * 400;
          addShake(8); addParticle({x:e.x,y:e.y,life:0.3,r:24,color:'#c43'});
        }
        addShake(p.hitFlash > 0 ? 0.3 : 5);   // a kick on first contact, not a constant max shake
        p.hitFlash = 0.12;
        if(p.hp <= 0){
          p.hp = 0;
          p.dead = true;
          addShake(10);
          // game over only if all players are dead
          if(players.every(pl=>pl.dead)){
            state.phase = 'gameover'; showRunOver();
          }
        }
      }
    }
  }

  separateEnemies(dt);

  const alivePlayers = players.filter(p=>!p.dead);

  // fruits
  for(let i=fruits.length-1;i>=0;i--){
    const f = fruits[i];
    f.t += dt;
    if(alivePlayers.length === 0) continue;
    let nearest = alivePlayers[0]; let bd = (alivePlayers[0].x-f.x)**2 + (alivePlayers[0].y-f.y)**2;
    for(const p of alivePlayers){ const d=(p.x-f.x)**2 + (p.y-f.y)**2; if(d<bd){ bd=d; nearest=p; } }
    const dist = Math.hypot(nearest.x-f.x, nearest.y-f.y);
    if(dist < 70){
      const pull = Math.min(1, (70 - dist) / 70);
      f.x += (nearest.x - f.x) * pull * dt * 10;
      f.y += (nearest.y - f.y) * pull * dt * 10;
    }
    if(dist < nearest.r + f.r){
      const heal = Math.max(4, Math.floor(nearest.baseMaxHp * 0.08));
      nearest.hp = Math.min(nearest.baseMaxHp, nearest.hp + heal);
      addParticle({x:f.x, y:f.y, life:0.3, r:12, color:palette.uiGreen});
      audio.pickup();
      fruits.splice(i,1);
    }
  }

  // money pickups
  const pickupRange = 80;
  for(let i=moneyDrops.length-1;i>=0;i--){
    const m = moneyDrops[i];
    // no despawn: keep money drops on ground
    m.t += dt;
    // nearest player collects
    if(alivePlayers.length === 0) continue;
    let nearest = alivePlayers[0]; let bd = (alivePlayers[0].x-m.x)**2 + (alivePlayers[0].y-m.y)**2;
    for(const p of alivePlayers){ const d=(p.x-m.x)**2 + (p.y-m.y)**2; if(d<bd){ bd=d; nearest=p; } }
    const dist = Math.hypot(nearest.x-m.x, nearest.y-m.y);
    if(dist < pickupRange){
      const pull = Math.min(1, (pickupRange - dist) / pickupRange);
      m.x += (nearest.x - m.x) * pull * dt * 14;
      m.y += (nearest.y - m.y) * pull * dt * 14;
    }
    if(dist < nearest.r + m.r){
      nearest.currency += 1;
      addParticle({x:m.x, y:m.y, life:0.25, r:10, color:palette.uiGreen});
      audio.pickup();
      moneyDrops.splice(i,1);
    }
    if(moneyDrops.length > MAX_MONEY_DROPS){ moneyDrops.splice(0, moneyDrops.length - MAX_MONEY_DROPS); break; }
  }

  // particles
  for(let i=particles.length-1;i>=0;i--){ particles[i].life -= dt; if(particles[i].life <= 0) particles.splice(i,1); }
  if(particles.length > MAX_PARTICLES){ particles.splice(0, particles.length - MAX_PARTICLES); }
  for(let i=floatingTexts.length-1;i>=0;i--){
    const ft = floatingTexts[i];
    ft.life -= dt;
    ft.x += ft.vx * dt;
    ft.y += ft.vy * dt;
    ft.vy -= dt * 10;
    if(ft.life <= 0) floatingTexts.splice(i,1);
  }
  if(floatingTexts.length > MAX_FLOATING_TEXTS){ floatingTexts.splice(0, floatingTexts.length - MAX_FLOATING_TEXTS); }

  // Player firing.
  //  Auto Shoot on: fire whenever there is a target. Auto Shoot off (P1): fire only while the mouse button
  //  or Space is held. Mouse Aim on (P1): aim at the cursor while the mouse is in use (moved in the last
  //  0.35s or button held), otherwise auto-target. Mouse Aim off: always auto-target the nearest enemy
  //  (or tree), whatever the mouse does. P2 always auto-targets and auto-fires.
  const mouseRecent = (performance.now()/1000 - input.lastMove) < 0.35;
  if(state.phase === 'wave'){
    for(let i=0;i<players.length;i++){
      const p = players[i]; if(p.dead) continue;
      let target = null;
      const mouseAiming = i===0 && settings.mouseAim && (mouseRecent || input.mouseDown);
      if(mouseAiming){ target = {x: input.mx, y: input.my}; }
      else { const nearest = getNearestEnemyTo(p.x,p.y) || getNearestTreeTo(p.x,p.y); if(nearest) target = aimPointFor(p, nearest); }
      if(!target) continue;
      p.angle = Math.atan2(target.y - p.y, target.x - p.x);
      const wantsFire = i !== 0 || settings.autoShoot || input.mouseDown || !!input.keys[' '];
      if(wantsFire) fireWeaponFor(p, t, target, !mouseAiming);
    }
  }
}

