// Pressure Point — state.js (split from game.js for v0.6.1)

// Players (support player 1 and optional player 2)
function createPlayer(x,y){ return {
  x, y, r:14, angle:0, baseSpeed:220, baseMaxHp:120, hp:120,
  level:1, xp:0, xpNext:60, armor:0, lifesteal:0, reloadSpeed:1, accuracy:1, magBonus:0,
  damageBonus:0, damageMult:1, recoil:1, luck:0, critChance:0.05, critMult:1.5, elementalBonus:0,
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
