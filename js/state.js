// Pressure Point — state.js (split from game.js for v0.6.1)

// Achievements: persistent unlocks + per-run tracking
const ACH_KEY = 'pp_achievements';
let unlockedAchievements = {};
try{ unlockedAchievements = JSON.parse(localStorage.getItem(ACH_KEY) || '{}'); }catch(e){ unlockedAchievements = {}; }

// Meta progression: essence earned from runs, spent on permanent upgrades
const ESSENCE_KEY = 'pp_essence';
const META_KEY = 'pp_meta';
let essence = 0;
let metaLevels = {};
try{ essence = parseInt(localStorage.getItem(ESSENCE_KEY) || '0', 10) || 0; }catch(e){}
try{ metaLevels = JSON.parse(localStorage.getItem(META_KEY) || '{}'); }catch(e){ metaLevels = {}; }

const META_UPGRADES = [
  {id:'vitality', name:'Vitality', desc:'+2 Max HP per level', glassjawDesc:'+4% Move Speed per level (Glassjaw: no HP to gain)', max:5, costs:[20,40,80,160,320],
   apply:(p,l)=>{ if(isGlassjaw(p)){ p.baseSpeed = Math.floor(p.baseSpeed * (1 + 0.04*l)); return; } p.baseMaxHp += 2*l; p.hp = p.baseMaxHp; }},
  {id:'power', name:'Power', desc:'+4% Damage per level', max:5, costs:[30,60,120,240,480],
   apply:(p,l)=>{ p.damageMult *= (1 + 0.04*l); }},
  {id:'swiftness', name:'Swiftness', desc:'+3% Move Speed per level', max:5, costs:[20,40,80,160,320],
   apply:(p,l)=>{ p.baseSpeed = Math.floor(p.baseSpeed * (1 + 0.03*l)); }},
  {id:'fortune', name:'Fortune', desc:'+1 Luck per level', max:3, costs:[50,100,200],
   apply:(p,l)=>{ p.luck += l; }},
  {id:'wealth', name:'Wealth', desc:'+25 starting currency per level', max:5, costs:[20,40,80,160,320],
   apply:(p,l)=>{ p.currency += 25*l; }},
  {id:'haste', name:'Haste', desc:'+3% Fire Rate per level', max:5, costs:[30,60,120,240,480],
   apply:(p,l)=>{ p.reloadSpeed *= (1 - 0.03*l); }},
];
function getMetaLevel(id){ return metaLevels[id] || 0; }
function buyMetaUpgrade(id){
  const u = META_UPGRADES.find(x=>x.id === id);
  if(!u) return false;
  const lvl = getMetaLevel(id);
  if(lvl >= u.max) return false;
  const cost = u.costs[lvl];
  if(essence < cost) return false;
  essence -= cost;
  metaLevels[id] = lvl + 1;
  try{
    localStorage.setItem(ESSENCE_KEY, String(essence));
    localStorage.setItem(META_KEY, JSON.stringify(metaLevels));
  }catch(e){}
  return true;
}
function applyMetaUpgrades(p){
  for(const u of META_UPGRADES){
    const lvl = getMetaLevel(u.id);
    if(lvl > 0) u.apply(p, lvl);
  }
}
// Glassjaw's defining trait: exactly 1 HP, always. Every max-HP increase path
// (Vitality, in-wave HP upgrade, shop maxHpAdd items, level-up +6) must skip it;
// the co-op revive's floor(baseMaxHp*0.5) would otherwise revive it at 0 HP.
function isGlassjaw(p){ return !!p && p.classId === 'glassjaw'; }
function awardEssence(){
  const gained = Math.floor(state.wave * 2 + state.runKills * 0.1);
  if(gained > 0){
    essence += gained;
    try{ localStorage.setItem(ESSENCE_KEY, String(essence)); }catch(e){}
  }
  return gained;
}
const runStats = { kills: 0, spent: 0, revives: 0, tookDamage: false };
function unlockAchievement(id){
  if(unlockedAchievements[id]) return false;
  const a = ACHIEVEMENTS.find(x=>x.id === id);
  if(!a) return false;
  unlockedAchievements[id] = Date.now();
  try{ localStorage.setItem(ACH_KEY, JSON.stringify(unlockedAchievements)); }catch(e){}
  achievementToast(a);
  return true;
}
function checkAchievements(){
  const p = players[0] || {};
  if(runStats.kills >= 1) unlockAchievement('first_blood');
  if(runStats.kills >= 500) unlockAchievement('exterminator');
  if(runStats.kills >= 2000) unlockAchievement('genocide');
  if(state.wave >= 10) unlockAchievement('survivor');
  if(state.wave > 20 || (state.wave === 20 && state.phase === 'runwon')) unlockAchievement('veteran');
  if(state.endless && state.wave >= 30) unlockAchievement('unstoppable');
  if(state.wave === 20 && state.danger === 6 && state.phase === 'runwon'){
    unlockAchievement('danger_zone');
    unlockAchievement('nightmare_slain');
  }
  const owned = p.ownedWeapons || [];
  if(owned.length >= 6) unlockAchievement('arsenal');
  if(owned.filter(w=>w.rarity === 'legendary').length >= 3) unlockAchievement('legendary_arsenal');
  if(runStats.spent >= 500) unlockAchievement('shopaholic');
  const items = p.items || [];
  if(items.some(it=>it.category === 'unique' || (it.data && it.data.category === 'unique'))) unlockAchievement('unique_find');
  if(items.some(it=>it.category === 'exclusive' || (it.data && it.data.category === 'exclusive'))) unlockAchievement('big_spender');
  if(runStats.revives >= 1) unlockAchievement('medic');
  if(runStats.revives >= 3) unlockAchievement('lifesaver');
}
function resetRunStats(){
  runStats.kills = 0; runStats.spent = 0; runStats.revives = 0; runStats.tookDamage = false;
}

// Players (support player 1 and optional player 2)
function createPlayer(x,y){ return {
  x, y, r:14, angle:0, baseSpeed:220, baseMaxHp:120, hp:120,
  level:1, xp:0, xpNext:60, armor:0, lifesteal:0, reloadSpeed:1, accuracy:1, magBonus:0,
  damageBonus:0, damageMult:1, recoil:1, luck:0, critChance:0.05, critMult:1.5, elementalBonus:0, rangeBonus:0, rangeMult:1,
  ownedWeapons: [], kick:0,
  currency:0, id: Math.random().toString(36).slice(2,8), hitFlash:0,
  items: [], dead: false, pierceBonus:0,
  dashTimer:0, dashCooldown:0, dashDir:0, iFrames:0, vx:0, vy:0,
  classId: 'ironheart', className: 'Ironheart',
  lastHitTime:0, hitCooldown:0.5,
}; }
const players = [ createPlayer(W/2, H/2) ];
let player = players[0];

const bullets = [];
const enemyBullets = [];
const enemies = [];
const moneyDrops = [];
const particles = [];
const trees = [];
const fruits = [];

function addParticle(p){ if(!settings.particleFx) return; if(particles.length < MAX_PARTICLES) particles.push(p); }

// Shop
const shop = { items: [], selection: 0, rerollCost: 6, locked: [] };

const upgradeChoices = { items: [], selection: 0 };

function resetRun(){
  enemies.length = 0;
  bullets.length = 0;
  moneyDrops.length = 0;
  particles.length = 0;
  trees.length = 0;
  fruits.length = 0;
  floatingTexts.length = 0;
  state.wave = 1;
  state.endless = false;
  state.waveSpawned = 0;
  state.waveCompleteTimer = 0;
  state.bossSpawned = false;
  state.phase = 'menu';
  state.shopView = 'shop';
  shop.locked = [];
  shop.rerollCost = 6;
  menuEl.style.display = 'block';
  restartBtn.style.display = 'none';
  hideSummaryOverlays();
  setMenuStep('class');
}
