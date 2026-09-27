// Brotato-lite extended game logic
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

// DOM UI
const menuEl = document.getElementById('menu');
const dangerListEl = document.getElementById('dangerList');
const classListEl = document.getElementById('classList');
const classDescEl = document.getElementById('classDesc');
const startBtn = document.getElementById('startBtn');
const coopToggle = document.getElementById('coopToggle');
const shakeToggle = document.getElementById('shakeToggle');
const autoShootToggle = document.getElementById('autoShootToggle');
const mouseAimToggle = document.getElementById('mouseAimToggle');
const gfxPreset = document.getElementById('gfxPreset');
const gfxSelect = document.getElementById('gfxSelect'); // legacy select (kept for compatibility)
const settingsBtn = document.getElementById('settingsBtn');
const settingsPanel = document.getElementById('settingsPanel');
const settingsCloseBtn = document.getElementById('settingsCloseBtn');
const settingsCloseIcon = document.getElementById('settingsCloseIcon');
const bgEffectsToggle = document.getElementById('bgEffectsToggle');
const particleEffectsToggle = document.getElementById('particleEffectsToggle');
const customGfxRow = document.getElementById('customGfxRow');
const msgEl = document.getElementById('msg');
const pauseBtn = document.getElementById('pauseBtn');
const restartBtn = document.getElementById('restartBtn');

let W = 800, H = 600;
function resize(){
  const ratio = window.devicePixelRatio || 1;
  W = canvas.clientWidth || innerWidth;
  H = canvas.clientHeight || innerHeight;
  canvas.width = Math.floor(W * ratio);
  canvas.height = Math.floor(H * ratio);
  ctx.setTransform(ratio,0,0,ratio,0,0);
}
window.addEventListener('resize', resize);
resize();

// Input handling (keyboard + mouse)
const input = {keys:{}, mx: W/2, my: H/2, mouseDown:false, lastMove:0};
window.addEventListener('keydown', e=>{ if(e.key === 'Tab') e.preventDefault(); input.keys[e.key.toLowerCase()] = true; });
window.addEventListener('keyup', e=>{ input.keys[e.key.toLowerCase()] = false; });
canvas.addEventListener('mousemove', e=>{ const r = canvas.getBoundingClientRect(); input.mx = e.clientX - r.left; input.my = e.clientY - r.top; input.lastMove = performance.now()/1000; });
canvas.addEventListener('mousedown', e=>{ input.mouseDown = true; });
window.addEventListener('mouseup', e=>{ input.mouseDown = false; });
if(restartBtn){ restartBtn.addEventListener('click', resetRun); }

const palette = {
  bg1: '#0c141e',
  bg2: '#05080f',
  bg3: '#0a1220',
  uiDark: '#0f1a2a',
  uiLight: '#1c2c3d',
  uiMid: '#20354a',
  uiAccent: '#48e0c2',
  uiGreen: '#6ef2b1',
  uiBlue: '#5fb0ff',
  outline: '#04070d',
  text: '#e8f1ff',
  textLight: '#c7dcff',
};

const weaponImageFiles = {
  pistol: 'CobaltPistol.png',
  shotgun: 'Shotgun.png',
  blade: 'ArcBlade.png',
  smg: 'ViperSMG.png',
  rifle: 'Pulserifle.png',
  heavy: 'TitanCannon.png',
  rpg: 'RPG.png',
  minigun: 'Minigun.png',
};
const weaponImages = {};
function loadWeaponImages(){
  for(const [id, file] of Object.entries(weaponImageFiles)){
    const img = new Image();
    img.src = file;
    weaponImages[id] = img;
  }
}

const enemyImages = {};
function loadEnemyImages(){
  const img = new Image();
  img.src = 'EnemyLight.png';
  enemyImages.light = img;
}

const playerImages = {};
function loadPlayerImages(){
  const up = new Image();
  up.src = 'PlayerUp.png';
  playerImages.up = up;
  
  const down = new Image();
  down.src = 'PlayerDown.png';
  playerImages.down = down;
  
  const side = new Image();
  side.src = 'PlayerSide.png';
  playerImages.side = side;
}

const treeImage = new Image();
treeImage.src = 'Tree.png';

const mapImage = new Image();
mapImage.src = 'Map.png';

const bgDots = Array.from({length: 90}, () => ({
  x: Math.random(),
  y: Math.random(),
  r: Math.random() * 1.8 + 0.4,
  a: Math.random() * 0.18 + 0.05,
}));

// soft caps to keep performance stable
const MAX_PARTICLES = 500;
const MAX_FLOATING_TEXTS = 80;
const MAX_MONEY_DROPS = 150;
const MAX_BULLETS = 320;

const floatingTexts = [];
const camera = {shake:0, x:0, y:0};

function roundRect(x, y, w, h, r){
  // arcTo() throws IndexSizeError on a negative radius, which would kill the render loop
  w = Math.max(0, w); h = Math.max(0, h);
  const rr = Math.max(0, Math.min(r, w/2, h/2));
  ctx.beginPath();
  ctx.moveTo(x+rr, y);
  ctx.arcTo(x+w, y, x+w, y+h, rr);
  ctx.arcTo(x+w, y+h, x, y+h, rr);
  ctx.arcTo(x, y+h, x, y, rr);
  ctx.arcTo(x, y, x+w, y, rr);
  ctx.closePath();
}

function shade(hex, amt){
  let c = hex.startsWith('#') ? hex.slice(1) : hex;
  if(c.length === 3) c = c.split('').map(ch => ch + ch).join('');
  const num = parseInt(c, 16);
  let r = (num >> 16) + amt;
  let g = ((num >> 8) & 0xff) + amt;
  let b = (num & 0xff) + amt;
  r = Math.max(0, Math.min(255, r));
  g = Math.max(0, Math.min(255, g));
  b = Math.max(0, Math.min(255, b));
  return `rgb(${r},${g},${b})`;
}

function panel(x, y, w, h, fill=palette.uiLight, stroke=palette.outline, r=10, opts={}){
  const {shadow=true, alpha=1, highlight=true} = opts;
  ctx.save();
  if(shadow){
    ctx.shadowColor = 'rgba(0,0,0,0.35)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetY = 4;
  }
  ctx.globalAlpha = alpha;
  const grad = ctx.createLinearGradient(x, y, x, y+h);
  grad.addColorStop(0, shade(fill, 18));
  grad.addColorStop(1, shade(fill, -14));
  ctx.fillStyle = grad;
  roundRect(x, y, w, h, r);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.globalAlpha = 1;
  ctx.lineWidth = 3;
  ctx.strokeStyle = stroke;
  ctx.stroke();
  if(highlight){
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(255,255,255,0.28)';
    roundRect(x+3, y+3, w-6, h-6, Math.max(2, r-2));
    ctx.stroke();
  }
  ctx.restore();
}

function flashMsg(text, dur=1.6){
  msgEl.textContent = text;
  msgEl.style.display = 'block';
  setTimeout(()=>{ msgEl.style.display = 'none'; }, dur*1000);
}

// Simple audio
const audio = {
  ctx: null,
  muted: false,
  init(){ if(!this.ctx){ this.ctx = new (window.AudioContext||window.webkitAudioContext)(); } },
  beep(freq, dur=0.06, type='sine', vol=0.05){
    if(!this.ctx || this.muted) return;
    const o=this.ctx.createOscillator(), g=this.ctx.createGain();
    o.type=type; o.frequency.value=freq;
    g.gain.value=vol;
    o.connect(g); g.connect(this.ctx.destination);
    o.start(); o.stop(this.ctx.currentTime+dur);
  },
  click(){ this.beep(520, 0.03, 'square', 0.03); },
  pickup(){ this.beep(860, 0.04, 'triangle', 0.05); },
  deny(){ this.beep(160, 0.06, 'sawtooth', 0.05); },
  buy(){ this.beep(980, 0.05, 'triangle', 0.06); },
  dash(){ this.beep(360, 0.05, 'triangle', 0.05); },
  setMuted(flag){
    this.muted = flag;
    if(this.bgm && this.bgm.master){ this.bgm.master.gain.value = flag ? 0 : 0.03; }
  },
  startBgm(){
    if(!this.ctx || this.bgm) return;
    const master = this.ctx.createGain();
    master.gain.value = this.muted ? 0 : 0.03;
    master.connect(this.ctx.destination);

    const o1 = this.ctx.createOscillator();
    const o2 = this.ctx.createOscillator();
    const o3 = this.ctx.createOscillator();
    o1.type = 'sine'; o2.type = 'triangle'; o3.type = 'sine';
    o1.frequency.value = 110;
    o2.frequency.value = 165;
    o3.frequency.value = 220;

    const g1 = this.ctx.createGain();
    const g2 = this.ctx.createGain();
    const g3 = this.ctx.createGain();
    g1.gain.value = 0.015;
    g2.gain.value = 0.01;
    g3.gain.value = 0.008;

    // subtle LFO for movement
    const lfo = this.ctx.createOscillator();
    const lfoGain = this.ctx.createGain();
    lfo.type = 'sine';
    lfo.frequency.value = 0.08;
    lfoGain.gain.value = 10;
    lfo.connect(lfoGain);
    lfoGain.connect(o2.frequency);

    o1.connect(g1); o2.connect(g2); o3.connect(g3);
    g1.connect(master); g2.connect(master); g3.connect(master);
    o1.start(); o2.start(); o3.start(); lfo.start();
    this.bgm = {o1,o2,o3,lfo,master};
  },
};
window.addEventListener('mousedown', ()=>{ audio.init(); audio.startBgm(); }, {once:true});
const stubSystems = { ready: Promise.resolve(), isStub:true };
function getSystems(){ return window.SystemsWasm || stubSystems; }

function togglePause(){
  state.paused = !state.paused;
  if(pauseBtn) pauseBtn.textContent = state.paused ? 'Resume' : 'Pause';
  flashMsg(state.paused ? 'Paused — press P to resume' : 'Resumed', 1.2);
}

// Game State
const state = {
  phase: 'menu', // menu | wave | shop | gameover
  wave: 1,
  waveBanner: 0,
  waveSpawned: 0,
  waveTotal: 10,
  maxWave: 20,
  danger: 1,
  coop: false,
  spawnTimer: 0,
  unlockedDanger: 1,
  animTime: 0,
  classId: 'ironheart',
  pendingUpgrade: null,
  shopView: 'shop', // shop | stats
  paused: false,
  treeWave: 0,
  waveCompleteTimer: 0,
};

// settings
const SETTINGS_KEY = 'brotato_settings_v1';
const settings = { screenShake: true, graphics: 'high', autoShoot: true, mouseAim: true, bgFx: true, particleFx: true };
try{
  const savedSettings = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}');
  if(typeof savedSettings.screenShake === 'boolean') settings.screenShake = savedSettings.screenShake;
  if(['low','medium','high','custom'].includes(savedSettings.graphics)) settings.graphics = savedSettings.graphics;
  if(typeof savedSettings.autoShoot === 'boolean') settings.autoShoot = savedSettings.autoShoot;
  if(typeof savedSettings.mouseAim === 'boolean') settings.mouseAim = savedSettings.mouseAim;
  if(typeof savedSettings.bgFx === 'boolean') settings.bgFx = savedSettings.bgFx;
  if(typeof savedSettings.particleFx === 'boolean') settings.particleFx = savedSettings.particleFx;
}catch(e){}

function saveSettings(){
  try{ localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); }catch(e){}
}

function applyPreset(name){
  settings.graphics = name;
  if(name === 'high'){ settings.bgFx = true; settings.particleFx = true; }
  else if(name === 'medium'){ settings.bgFx = true; settings.particleFx = false; }
  else if(name === 'low'){ settings.bgFx = false; settings.particleFx = false; }
}

if(shakeToggle){
  shakeToggle.checked = settings.screenShake;
  shakeToggle.addEventListener('change', ()=>{ settings.screenShake = !!shakeToggle.checked; saveSettings(); });
}
if(gfxPreset){
  gfxPreset.value = settings.graphics;
  if(customGfxRow) customGfxRow.style.display = gfxPreset.value === 'custom' ? 'flex' : 'none';
  gfxPreset.addEventListener('change', ()=>{
    const val = gfxPreset.value;
    if(val === 'custom'){
      settings.graphics = 'custom';
      if(customGfxRow) customGfxRow.style.display = 'flex';
    } else {
      applyPreset(val);
      if(customGfxRow) customGfxRow.style.display = 'none';
    }
    saveSettings();
  });
}
// fallback: if legacy gfxSelect exists, sync to preset
if(gfxSelect){
  gfxSelect.value = settings.graphics;
  gfxSelect.addEventListener('change', ()=>{ applyPreset(gfxSelect.value === 'low' ? 'low' : 'high'); if(gfxPreset) gfxPreset.value = settings.graphics; saveSettings(); });
}
if(bgEffectsToggle){
  bgEffectsToggle.checked = settings.bgFx;
  bgEffectsToggle.addEventListener('change', ()=>{ settings.bgFx = !!bgEffectsToggle.checked; settings.graphics = 'custom'; if(gfxPreset) gfxPreset.value='custom'; if(customGfxRow) customGfxRow.style.display='flex'; saveSettings(); });
}
if(particleEffectsToggle){
  particleEffectsToggle.checked = settings.particleFx;
  particleEffectsToggle.addEventListener('change', ()=>{ settings.particleFx = !!particleEffectsToggle.checked; settings.graphics = 'custom'; if(gfxPreset) gfxPreset.value='custom'; if(customGfxRow) customGfxRow.style.display='flex'; saveSettings(); });
}

// load/unlock persistence
const UNLOCK_KEY = 'brotato_unlocked_danger_v1';
const saved = localStorage.getItem(UNLOCK_KEY);
if(saved){ try{ state.unlockedDanger = Math.max(1, Math.min(5, parseInt(saved)||1)); }catch(e){} }

// Players (support player 1 and optional player 2)
function createPlayer(x,y){ return {
  x, y, r:14, angle:0, baseSpeed:220, baseMaxHp:120, hp:120,
  level:1, xp:0, xpNext:60, armor:0, lifesteal:0, reloadSpeed:1, accuracy:1, magBonus:0,
  damageBonus:0, damageMult:1, recoil:1, luck:0, critChance:0.05, critMult:1.5, elementalBonus:0,
  ownedWeapons: [], weaponIndex:0, ammoInMag:12, reloading:0, kick:0,
  currency:0, id: Math.random().toString(36).slice(2,8), hitFlash:0,
  items: [], dead: false, pierceBonus:0,
  dashTimer:0, dashCooldown:0, dashDir:0, iFrames:0,
  classId: 'ironheart', className: 'Ironheart',
  lastHitTime:0, hitCooldown:0.5,
}; }
const players = [ createPlayer(W/2, H/2) ];
let player = players[0];

// enemy, weapon, item definitions (kept similar to earlier)
const enemyTypes = [
  {id:'runner', name:'Runner', color:'#e85', r:10, hp:18, speed:120, dmg:10, xp:6, money:2},
  {id:'bruiser', name:'Bruiser', color:'#c43', r:16, hp:50, speed:70, dmg:18, xp:14, money:4},
  {id:'spitter', name:'Spitter', color:'#d94', r:12, hp:30, speed:95, dmg:12, xp:9, money:3},
];

const bossType = {id:'overlord', name:'Overlord', color:'#ff6b6b', r:36, hp:1200, speed:60, dmg:40, xp:120, money:40};

const rarities = [
  {id:'common', color:'#8aa0b8'},
  {id:'rare', color:'#4cc3ff'},
  {id:'epic', color:'#b67bff'},
  {id:'red', color:'#ff6b6b'},
];

const weapons = [
  {id:'pistol', name:'Cobalt Pistol', type:'sidearm', rarity:'common', fireRate:0.22, bulletSpeed:700, spread:0.05, damage:14, mag:12, reload:1.1, recoil:0.8, color:'#8be9ff'},
  {id:'harpoon', name:'Harpoon Gun', type:'rifle', rarity:'rare', fireRate:0.45, bulletSpeed:900, spread:0.0, damage:28, mag:4, reload:1.6, recoil:1.2, color:'#9be7ff', pierce:2},
  {id:'rifle', name:'Pulse Rifle', type:'rifle', rarity:'rare', fireRate:0.12, bulletSpeed:860, spread:0.02, damage:12, mag:30, reload:1.4, recoil:1.1, color:'#9bff7b'},
  {id:'shotgun', name:'Grav Shotgun', type:'shotgun', rarity:'rare', fireRate:0.6, bulletSpeed:520, spread:0.5, damage:10, pellets:7, mag:6, reload:1.8, recoil:1.4, color:'#ffd166'},
  {id:'heavy', name:'Titan Cannon', type:'heavy', rarity:'red', fireRate:0.9, bulletSpeed:520, spread:0.08, damage:34, mag:4, reload:2.3, recoil:1.8, color:'#ff7b7b', explosive:true, elemental:'fire'},
  {id:'blade', name:'Arc Blade', type:'melee', rarity:'rare', fireRate:0.5, bulletSpeed:420, spread:0.0, damage:22, mag:999, reload:0.2, recoil:0.6, color:'#7bdff2', melee:true},
  {id:'smg', name:'Viper SMG', type:'rifle', rarity:'common', fireRate:0.08, bulletSpeed:720, spread:0.06, damage:9, mag:40, reload:1.2, recoil:0.9, color:'#7CFF6B'},
  {id:'dmr', name:'Longshot DMR', type:'rifle', rarity:'rare', fireRate:0.28, bulletSpeed:980, spread:0.01, damage:26, mag:8, reload:1.6, recoil:1.2, color:'#6aaeff'},
  {id:'flame', name:'Flamethrower', type:'special', rarity:'epic', fireRate:0.05, bulletSpeed:420, spread:0.25, damage:6, mag:80, reload:2.0, recoil:0.7, color:'#ff8c42', elemental:'fire'},
  {id:'rpg', name:'RPG-7', type:'heavy', rarity:'epic', fireRate:1.2, bulletSpeed:460, spread:0.08, damage:60, mag:1, reload:2.6, recoil:2.0, color:'#ff5d5d', explosive:true, elemental:'fire'},
  {id:'arc', name:'Arc Thrower', type:'special', rarity:'epic', fireRate:0.2, bulletSpeed:600, spread:0.15, damage:14, mag:18, reload:1.5, recoil:1.0, color:'#b27bff', elemental:'shock'},
  {id:'minigun', name:'Minigun', type:'heavy', rarity:'red', fireRate:0.05, bulletSpeed:760, spread:0.12, damage:9, mag:200, reload:2.8, recoil:1.4, color:'#ffb44c', overheatMax:100, overheatPerShot:6, overheatCool:18, overheatLock:1.4},
  {id:'rail', name:'Railgun', type:'rifle', rarity:'red', fireRate:0.6, bulletSpeed:1200, spread:0.0, damage:90, mag:2, reload:2.2, recoil:1.8, color:'#ff6b6b'},
  {id:'mine', name:'Mine Layer', type:'special', rarity:'rare', fireRate:0.9, bulletSpeed:300, spread:0.2, damage:24, mag:6, reload:1.9, recoil:1.0, color:'#c9a867', explosive:true, elemental:'fire'},
  {id:'sprayer', name:'Frost Sprayer', type:'special', rarity:'rare', fireRate:0.07, bulletSpeed:520, spread:0.2, damage:8, mag:60, reload:1.7, recoil:0.8, color:'#6cd6ff', elemental:'ice'},
];
const weaponPrices = { pistol:60, harpoon:140, rifle:90, shotgun:110, heavy:140, blade:95, smg:70, dmr:120, flame:150, rpg:160, arc:140, minigun:1000, rail:220, mine:110, sprayer:120 };

const items = [
  {id:'plating', name:'Dense Plating', rarity:'rare', price:55, desc:'+20 Armor, -12% Move Speed', effects:{armor:20, speedMult:-0.12}},
  {id:'overclock', name:'Overclock Core', rarity:'red', price:115, desc:'+15% Fire Rate, -10 Max HP', effects:{reloadMult:-0.15, maxHpAdd:-10}},
  {id:'precision', name:'Stability Gyro', rarity:'rare', price:60, desc:'+20% Accuracy, -10% Reload Speed', effects:{accuracyMult:0.2, reloadMult:0.1}},
  {id:'vamp', name:'Life Tap', rarity:'epic', price:125, desc:'+8% Life Steal, -10 Max HP', effects:{lifestealAdd:0.08, maxHpAdd:-10}},
  {id:'belt', name:'Ammo Belt', rarity:'common', price:30, desc:'+6 Magazine Size, -5% Accuracy', effects:{magBonus:6, accuracyMult:-0.05}},
  {id:'boots', name:'Kinetic Boots', rarity:'rare', price:55, desc:'+20 Move Speed, -5% Damage', effects:{speedMult:0.1, damageMult:-0.05}},
  {id:'luck', name:'Lucky Charm', rarity:'common', price:35, desc:'+1 Luck (rarer shop rolls)', effects:{luckAdd:1}},
  {id:'pierce', name:'Piercing Bullet', rarity:'rare', price:70, desc:'+1 Pierce for all shots', effects:{pierceAdd:1}},
];

// push weapon/item data to WASM module when ready
getSystems().ready.then(()=>{
  const sys = getSystems();
  if(sys.loadData){
    sys.loadData(JSON.stringify(weapons), JSON.stringify(items));
  }
}).catch(()=>{});

// Class definitions (50 variants)
const classArchetypes = [
  {base:'Ironheart', weapon:'rifle', mods:{hp:120,speed:230,armor:2,accuracy:1.05,damageBonus:1}, tags:'Balanced rifle'},
  {base:'Foxglove', weapon:'pistol', mods:{hp:110,speed:250,accuracy:1.2,damageBonus:0}, tags:'Fast and precise'},
  {base:'Gravelord', weapon:'heavy', mods:{hp:150,speed:200,armor:8,damageBonus:4,recoil:1.2}, tags:'Slow heavy hitter'},
  {base:'Scrapjack', weapon:'shotgun', mods:{hp:115,speed:235,magBonus:2,damageBonus:1}, tags:'Close range'},
  {base:'Voltblade', weapon:'blade', mods:{hp:130,speed:260,armor:4,lifesteal:0.04}, tags:'Melee sustain'},
  {base:'Circuitry', weapon:'rifle', mods:{hp:105,speed:225,reloadSpeed:0.9,accuracy:1.1}, tags:'Fast reload'},
  {base:'Bulwark', weapon:'pistol', mods:{hp:160,speed:210,armor:10,accuracy:0.95}, tags:'Tank'},
  {base:'Redline', weapon:'rifle', mods:{hp:120,speed:240,damageBonus:2,recoil:1.1}, tags:'High damage'},
  {base:'Skylark', weapon:'pistol', mods:{hp:100,speed:280,accuracy:1.1}, tags:'Very fast'},
  {base:'Nightreap', weapon:'shotgun', mods:{hp:125,speed:225,lifesteal:0.06,damageBonus:1}, tags:'Life steal'},
];

const classes = classArchetypes.map(a=>({
  id: a.base.toLowerCase(),
  name: a.base,
  weapon: a.weapon,
  desc: a.tags,
  mods: { ...a.mods },
}));

// End-of-wave stat upgrades
const upgradeStats = [
  {id:'atkspd', name:'Attack Speed', apply:(p, mult)=>{ p.reloadSpeed *= mult; }},
  {id:'baseDmg', name:'Base Damage', apply:(p, mult)=>{ p.damageBonus += Math.floor((mult-1)*10); }},
  {id:'hp', name:'Max HP', apply:(p, mult)=>{ p.baseMaxHp += Math.max(4, Math.round((mult-1)*40)); p.hp = p.baseMaxHp; }},
  {id:'lifesteal', name:'Life Steal', apply:(p, mult)=>{ p.lifesteal = Math.min(0.5, p.lifesteal + (mult-1)*0.05); }},
  {id:'armor', name:'Armor', apply:(p, mult)=>{ p.armor += Math.floor((mult-1)*6); }},
  {id:'engineering', name:'Engineering', apply:(p, mult)=>{ p.damageBonus += Math.floor((mult-1)*4); }},
  {id:'elemental', name:'Elemental Dmg', apply:(p, mult)=>{ p.elementalBonus += (mult-1)*0.12; }},
  {id:'crit', name:'Crit Chance', apply:(p, mult)=>{ p.critChance = Math.min(0.6, p.critChance + (mult-1)*0.08); }},
  {id:'movespeed', name:'Movement Speed', apply:(p, mult)=>{ p.baseSpeed = Math.floor(p.baseSpeed * (1 + (mult-1)*0.5)); }},
];

const upgradeTiers = [
  {id:'gray', name:'Gray', mult:1.05, color:'#b8b8b8'},
  {id:'blue', name:'Blue', mult:1.15, color:'#6aaeff'},
  {id:'purple', name:'Purple', mult:1.28, color:'#b27bff'},
  {id:'red', name:'Red', mult:1.5, color:'#ff6b6b'},
];

// runtime containers
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

const rarityOrder = ['common','rare','epic','red'];
function rarityMult(r){ return r==='common'?1:r==='rare'?1.25:r==='epic'?1.5:2.0; }

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
  };
}

function applyItemEffects(player, itemData, rarity, sign=1){
  const m = rarityMult(rarity) * sign;
  const e = itemData.effects || {};
  if(e.armor) player.armor += e.armor * m;
  if(e.speedMult) player.baseSpeed = Math.max(80, Math.floor(player.baseSpeed * (1 + e.speedMult * m)));
  if(e.reloadMult) player.reloadSpeed = Math.max(0.5, player.reloadSpeed * (1 + e.reloadMult * m));
  if(e.accuracyMult) player.accuracy = Math.max(0.5, player.accuracy * (1 + e.accuracyMult * m));
  if(e.maxHpAdd){ player.baseMaxHp = Math.max(1, Math.floor(player.baseMaxHp + e.maxHpAdd * m)); player.hp = Math.min(player.hp, player.baseMaxHp); }
  if(e.lifestealAdd) player.lifesteal = Math.max(0, player.lifesteal + e.lifestealAdd * m);
  if(e.magBonus) player.magBonus += Math.round(e.magBonus * m);
  if(e.damageBonus) player.damageBonus += Math.round(e.damageBonus * m);
  if(e.damageMult) player.damageMult = Math.max(0.5, player.damageMult * (1 + e.damageMult * m));
  if(e.luckAdd) player.luck += Math.round(e.luckAdd * m);
  if(e.pierceAdd) player.pierceBonus = Math.max(0, player.pierceBonus + Math.round(e.pierceAdd * m));
}

function addItemToPlayer(player, itemData, rarity){
  if(player.items.length >= 6) return false;
  player.items.push({id: itemData.id, rarity});
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
            player.items.push({id:itemData.id, rarity: nextR});
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

function rand(min,max){return Math.random()*(max-min)+min}

function addShake(amount){
  if(!settings.screenShake) return;
  camera.shake = Math.min(10, camera.shake + amount);
}

function updateCamera(dt){
  if(!settings.screenShake){
    camera.shake = 0; camera.x = 0; camera.y = 0;
    return;
  }
  camera.shake = Math.max(0, camera.shake - dt * 16);
  const a = Math.random() * Math.PI * 2;
  const m = camera.shake * 0.4;
  camera.x = Math.cos(a) * m;
  camera.y = Math.sin(a) * m;
}

function getWeaponFor(player){
  return player.ownedWeapons[player.weaponIndex] || createWeaponInstance(weapons[0], 'common');
}

function refreshAmmoFor(player){ const w = getWeaponFor(player); player.ammoInMag = Math.max(1, (w.mag||999) + player.magBonus); }

function applyClassToPlayer(player, classData){
  // class level scales with unlocked danger (D1 -> L1, D2 -> L2, etc.)
  const classLevel = Math.max(1, Math.min(5, state.danger));
  player.classId = classData.id;
  player.className = `${classData.name} Lv ${classLevel}`;
  // Start very low HP, scale up per class level
  player.baseMaxHp = Math.max(15, Math.floor(15 + (classLevel-1) * 6));
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
  const baseW = weapons.find(w=>w.id===classData.weapon) || weapons[0];
  player.ownedWeapons = [createWeaponInstance(baseW, 'common')];
  player.weaponIndex = 0;
  player.level = 1;
  player.xp = 0;
  player.xpNext = 60;
  player.currency = 0;
  player.reloading = 0;
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
  const poolItems = [...items];

  function rollRarity(luck){
    const base = { common:50, rare:35, epic:10, red:5 };
    const wCommon = base.common + luck * 5;
    const wRare = base.rare + luck * 10;
    const wEpic = base.epic + luck * 15;
    const wRed = base.red + luck * 20;
    const total = wCommon + wRare + wEpic + wRed;
    let r = Math.random() * total;
    if((r -= wCommon) <= 0) return 'common';
    if((r -= wRare) <= 0) return 'rare';
    if((r -= wEpic) <= 0) return 'epic';
    return 'red';
  }

  const luck = players[0]?.luck || 0;
  const picks = Array(6).fill(null);
  for(let i=0;i<6;i++){
    if(locked[i]) picks[i] = locked[i];
  }

  const isDuplicate = (candidate)=>{
    return picks.some(it => it && it.type === candidate.type && it.data.id === candidate.data.id);
  };

  // allow WASM/system override
  const sys = getSystems();
  const emptyCount = picks.filter(x=>!x).length;
  const wasmPicks = sys && sys.rollShop ? sys.rollShop(emptyCount, luck, null) : null;
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
    const itemsOfR = poolItems.filter(it=>it.rarity === rarity);
    const combined = [
      ...weaponsOfR.map(w=>({type:'weapon', data:w, rarity, price:Math.round(weaponPrices[w.id] * rarityMult(rarity))})),
      ...itemsOfR.map(it=>({type:'item', data:it, rarity, price:Math.round(it.price * rarityMult(rarity))})),
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
    const pick = {type:'item', data:fallback, rarity:fallback.rarity, price:fallback.price};
    if(isDuplicate(pick)) continue;
    for(let i=0;i<6;i++){ if(!picks[i]){ picks[i] = pick; break; } }
  }

  shop.items = picks;
  shop.selection = 0;
  shop.locked = shop.items.map((it, i)=>locked[i] ? it : null);
  normalizeShopSelection();
}

function rerollShop(){
  const cost = shop.rerollCost;
  const payer = players[0];
  if(payer.currency < cost){ audio.deny(); return; }
  payer.currency -= cost;
  shop.rerollCost = Math.min(99, Math.floor(shop.rerollCost * 1.35 + 2));
  buildShop();
  audio.click();
}

// Wave calculation: Wave 1 = 10 enemies, each wave +5, cap at state.maxWave
function computeWaveTotal(wave){ return 10 + (Math.max(1, wave) - 1) * 5; }

function startWave(){
  state.phase = 'wave';
  state.waveSpawned = 0;
  state.waveCompleteTimer = 0;
  state.waveTotal = Math.floor(computeWaveTotal(state.wave) * (state.coop ? 1.5 : 1) * (1 + (state.danger-1)*0.15));
  if(state.wave >= state.maxWave){
    state.waveTotal = 1;
    state.bossSpawned = false;
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

function levelUp(player){ player.level += 1; player.xp -= player.xpNext; player.xpNext = Math.floor(player.xpNext * 1.2 + 15); player.baseMaxHp += 6; player.hp = player.baseMaxHp; }

function spawnTree(){
  const margin = 40;
  const x = Math.random()*(W-2*margin) + margin;
  const y = Math.random()*(H-2*margin) + margin;
  trees.push({x, y, r:18, hp:60, maxHp:60});
}

function spawnFruit(x, y){
  fruits.push({x, y, r:8, t:0});
}

function spawnEnemy(){
  const edge = Math.floor(Math.random()*4);
  let x,y; if(edge===0){ x=-20; y=Math.random()*H } else if(edge===1){ x=W+20; y=Math.random()*H } else if(edge===2){ x=Math.random()*W; y=-20 } else { x=Math.random()*W; y=H+20 }
  const tier = Math.min(enemyTypes.length-1, Math.floor((state.wave-1)/3));
  const base = enemyTypes[Math.random() < 0.6 ? 0 : (Math.random()<0.7 ? 1 : 2)];
  const t = enemyTypes[Math.min(enemyTypes.length-1, Math.max(0, tier + (base===enemyTypes[0]?0:1)))];
  // danger scaling
  const dangerHP = 1 + (state.danger-1) * 0.35;
  const dangerDmg = 1 + (state.danger-1) * 0.28;
  const waveScale = 1 + Math.max(0, state.wave-1) * 0.12;
  const lateDmg = 1 + Math.max(0, state.wave-1) * 0.18;
  enemies.push({ x,y, r: t.r, hp: Math.floor(t.hp * waveScale * dangerHP), maxHp: Math.floor(t.hp * waveScale * dangerHP), speed: t.speed + state.wave*2, dmg: Math.floor(t.dmg * dangerDmg * lateDmg + state.wave*1.2), color: t.color, xp: t.xp + Math.floor(state.wave*0.6)*(state.danger), money: Math.max(1, Math.floor(t.money * 0.7) + Math.floor(state.wave*0.2) * state.danger) });
  if(enemies.length > 120){ enemies.shift(); }
  addParticle({x, y, life:0.35, r:18, color: palette.uiAccent});
}

function spawnBoss(){
  const edge = Math.floor(Math.random()*4);
  let x,y; if(edge===0){ x=-40; y=Math.random()*H } else if(edge===1){ x=W+40; y=Math.random()*H } else if(edge===2){ x=Math.random()*W; y=-40 } else { x=Math.random()*W; y=H+40 }
  const dangerHP = 1 + (state.danger-1) * 0.5;
  const dangerDmg = 1 + (state.danger-1) * 0.35;
  enemies.push({
    x,y, r: bossType.r, hp: Math.floor(bossType.hp * dangerHP), maxHp: Math.floor(bossType.hp * dangerHP),
    speed: bossType.speed, dmg: Math.floor(bossType.dmg * dangerDmg * (1 + (state.wave-1)*0.12)),
    color: bossType.color, xp: bossType.xp * state.danger, money: bossType.money * state.danger,
    isBoss: true,
  });
  addParticle({x, y, life:0.6, r:28, color: '#ff6b6b'});
}

function getNearestEnemyTo(x,y){ let best=null, bd=Infinity; for(const e of enemies){ const d=(e.x-x)**2 + (e.y-y)**2; if(d<bd){ bd=d; best=e; } } return best; }
function getNearestTreeTo(x,y){ let best=null, bd=Infinity; for(const tr of trees){ const d=(tr.x-x)**2 + (tr.y-y)**2; if(d<bd){ bd=d; best=tr; } } return best; }

function fireWeaponFor(player, time, target){ if(!target) return; if(player.reloading>0) return; const w = getWeaponFor(player); if(w.overheated) return; const fireRate = w.fireRate * player.reloadSpeed; if(time - (w.last||0) < fireRate) return; if(player.ammoInMag <= 0){ player.reloading = w.reload; audio.beep(240,0.08,'sawtooth',0.04); return; }
  w.last = time; player.ammoInMag -= 1; player.kick = Math.max(player.kick, 0.08 * w.recoil);
  if(w.overheatMax){
    w.heat += w.overheatPerShot;
    if(w.heat >= w.overheatMax){
      w.overheated = true;
      w.overheatTimer = w.overheatLock || 1.2;
      audio.deny();
    }
  }
  const angle = Math.atan2(target.y - player.y, target.x - player.x);
  const count = w.pellets || 1;
  for(let i=0;i<count;i++){
    const spread = (w.spread || 0) / player.accuracy;
    const a = angle + ((Math.random()-0.5) * spread);
    const speed = w.bulletSpeed * (0.9 + Math.random()*0.2);
    let dmg = (w.damage + (player.damageBonus||0)) * (player.damageMult || 1);
    const isCrit = Math.random() < (player.critChance || 0);
    if(isCrit) dmg *= (player.critMult || 1.5);
    const elementalBonus = (w.elemental || w.explosive) ? (player.elementalBonus || 0) : 0;
    dmg *= (1 + elementalBonus);
    const elemental = w.elemental || (w.explosive ? 'fire' : null);
    bullets.push({ x: player.x + Math.cos(a)*player.r, y: player.y + Math.sin(a)*player.r, vx: Math.cos(a)*speed, vy: Math.sin(a)*speed, life: 1.6, color: w.color, damage: dmg, ownerId: player.id, crit: isCrit, elemental, pierce: (w.pierce||0) + (player.pierceBonus||0) });
  }
  addParticle({x:player.x + Math.cos(angle)*16, y:player.y + Math.sin(angle)*16, life:0.15, r: w.type==='heavy'?18:w.type==='shotgun'?14:10, color:w.color});
  if(audio.ctx && time - (w.lastSound||0) > 0.06){ w.lastSound = time; const freq = w.type==='heavy'?120:w.type==='shotgun'?180:w.type==='rifle'?240:320; audio.beep(freq,0.04,'square',0.03); }
}

function killEnemy(index, ownerId){
  const e = enemies[index];
  if(!e) return;
  awardToPlayerById(ownerId, e.xp, e.money);
  addParticle({x:e.x,y:e.y,life:0.35,r:16,color:'#ff5d5d'});
  addShake(e.isBoss ? 12 : 3);
  audio.beep(140,0.06,'triangle',0.04);
  // drop money pickups
  for(let k=0;k<e.money;k++){ moneyDrops.push({x:e.x+rand(-10,10), y:e.y+rand(-10,10), r:5, life:6, t:0}); }
  enemies.splice(index,1);
}

function awardToPlayerById(id, xp, money){ const p = players.find(x=>x.id===id) || players[0]; p.xp += xp; p.currency += money; while(p.xp >= p.xpNext){ levelUp(p); } }

function switchWeaponFor(player, dir){
  if(player.ownedWeapons.length === 0) return;
  player.weaponIndex = (player.weaponIndex + dir + player.ownedWeapons.length) % player.ownedWeapons.length;
  refreshAmmoFor(player);
}

function buyShopItemFor(player){
  const item = shop.items[shop.selection];
  if(!item || !item.data) return;
  if(player.currency < item.price){ audio.deny(); return; }
  if(item.type === 'item' && player.items.length >= 6){ audio.deny(); return; }
  player.currency -= item.price;
  if(item.type === 'weapon'){
    player.ownedWeapons.push(createWeaponInstance(item.data, item.rarity || item.data.rarity));
    player.weaponIndex = player.ownedWeapons.length - 1;
    refreshAmmoFor(player);
  } else {
    addItemToPlayer(player, item.data, item.rarity || item.data.rarity);
  }
  audio.buy();
}

// UI: build dangers
function renderDangerButtons(){
  if(!dangerListEl) return;
  dangerListEl.innerHTML = '';
  for(let i=1;i<=5;i++){
    const b = document.createElement('div');
    b.className = 'danger-btn';
    b.textContent = i;
    if(i>state.unlockedDanger) b.classList.add('locked');
    if(i===state.danger) b.classList.add('active');
    b.addEventListener('click', ()=>{
      if(i<=state.unlockedDanger){
        state.danger = i;
        audio.click();
        renderDangerButtons();
        renderClassButtons();
      } else {
        audio.deny();
      }
    });
    dangerListEl.appendChild(b);
  }
}

function renderClassButtons(){
  if(!classListEl) return;
  classListEl.innerHTML = '';
  for(const c of classes){
    const btn = document.createElement('div');
    btn.className = 'class-btn';
    if(c.id === state.classId) btn.classList.add('active');
    btn.innerHTML = `<span>${c.name}</span><span class="tag">${c.weapon}</span>`;
    btn.addEventListener('click', ()=>{
      state.classId = c.id;
      audio.click();
      classDescEl.textContent = `${c.name} — ${c.desc} | Class Lv ${state.danger} • Weapon ${c.weapon}`;
      renderClassButtons();
    });
    classListEl.appendChild(btn);
  }
  const selected = classes.find(x=>x.id === state.classId) || classes[0];
  if(selected){
    classDescEl.textContent = `${selected.name} — ${selected.desc} | Class Lv ${state.danger} • Weapon ${selected.weapon}`;
  }
}
renderDangerButtons();
renderClassButtons();
if(pauseBtn){
  pauseBtn.addEventListener('click', ()=>{
    if(state.phase === 'menu' || state.phase === 'gameover') return;
    togglePause();
  });
}

startBtn.addEventListener('click', ()=>{
  state.coop = coopToggle.checked;
  // create or remove second player
  if(state.coop && players.length < 2){ players[1] = createPlayer(W/2+40, H/2+20); players[1].currency = 0; players[1].xp = 0; renderDangerButtons(); }
  if(!state.coop && players.length>1){ players.splice(1,1); }
  player = players[0];
  const chosenClass = classes.find(x=>x.id === state.classId) || classes[0];
  applyClassToPlayer(players[0], chosenClass);
  if(players[1]) applyClassToPlayer(players[1], chosenClass);
  menuEl.style.display = 'none';
  if(pauseBtn){ pauseBtn.style.display = 'block'; pauseBtn.textContent = 'Pause'; }
  state.phase = 'wave';
  startWave();
});

if(settingsBtn && settingsPanel){
  settingsBtn.addEventListener('click', ()=>{
    settingsPanel.style.display = 'block';
    menuEl.style.display = 'none';
  });
}
function closeSettings(){ if(settingsPanel) settingsPanel.style.display = 'none'; if(menuEl) menuEl.style.display = 'block'; }
if(settingsCloseBtn && settingsPanel){ settingsCloseBtn.addEventListener('click', closeSettings); }
if(settingsCloseIcon && settingsPanel){ settingsCloseIcon.addEventListener('click', closeSettings); }

// mouse/shop interaction: compute if click on a shop card
canvas.addEventListener('contextmenu', (e)=>{
  if(state.phase !== 'shop') return;
  e.preventDefault();
  const r = canvas.getBoundingClientRect(); const mx = e.clientX - r.left, my = e.clientY - r.top;
  const panels = getShopPanels();
  for(const def of panels){
    const cols = 3; const cardW = (def.w - 44) / cols; const cardH = 120;
    for(let i=0;i<shop.items.length;i++){
      const col = i % cols, row = Math.floor(i/cols);
      const x = def.x + 16 + col * cardW; const y = def.y + 64 + row * (cardH + 12);
      if(mx >= x && mx <= x + cardW-12 && my >= y && my <= y + cardH){
        if(shop.items[i]){ shop.locked[i] = shop.locked[i] ? null : shop.items[i]; }
        audio.click();
        return;
      }
    }
  }
});

canvas.addEventListener('click', (e)=>{
  if(state.phase === 'upgrade'){
    const r = canvas.getBoundingClientRect(); const mx = e.clientX - r.left, my = e.clientY - r.top;
    const panelW = Math.min(620, W*0.85); const panelH = 220; const px = (W - panelW)/2; const py = (H - panelH)/2;
    const cardW = (panelW - 40) / 4; const cardH = 120;
    for(let i=0;i<upgradeChoices.items.length;i++){
      const x = px + 16 + i * cardW; const y = py + 60;
      if(mx >= x && mx <= x + cardW-8 && my >= y && my <= y + cardH){
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
  if(state.phase !== 'shop') return;
  const r = canvas.getBoundingClientRect(); const mx = e.clientX - r.left, my = e.clientY - r.top;
  // reroll button
  if(mx >= W/2-70 && mx <= W/2+70 && my >= (H*0.82) && my <= (H*0.82)+36){
    rerollShop();
    return;
  }
  const panels = getShopPanels();
  for(const def of panels){
    const cols = 3; const cardW = (def.w - 44) / cols; const cardH = 120;
    for(let i=0;i<shop.items.length;i++){
      const col = i % cols, row = Math.floor(i/cols);
      const x = def.x + 16 + col * cardW; const y = def.y + 64 + row * (cardH + 12);
      if(mx >= x && mx <= x + cardW-12 && my >= y && my <= y + cardH){
        // right click locks, left click buys
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
function update(dt, t){ if(state.phase === 'menu' || state.phase === 'gameover') return;
  if(menuEl && menuEl.style.display !== 'none') return;
  state.animTime += dt;
  updateCamera(dt);
  if(state.waveBanner > 0) state.waveBanner = Math.max(0, state.waveBanner - dt);
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
    const dashInput = (idx===0 && input.keys['shift']) || (idx===1 && input.keys['u']);
    if(dashInput && p.dashCooldown <= 0){
      const dir = (dx||dy) ? Math.atan2(dy, dx) : p.angle;
      p.dashDir = dir;
      p.dashTimer = 0.22;
      p.dashCooldown = 2.1;
      p.iFrames = 0.28;
      addShake(4);
      audio.dash();
      input.keys[idx===0 ? 'shift' : 'u'] = false;
      for(let k=0;k<6;k++){
      addParticle({x:p.x + rand(-6,6), y:p.y + rand(-6,6), life:0.25, r:8 - k*0.6, color: palette.uiBlue});
      }
    }
    if(p.dashTimer > 0){
      p.dashTimer -= dt;
      const speed = p.baseSpeed * 3.2;
      p.x += Math.cos(p.dashDir) * speed * dt;
      p.y += Math.sin(p.dashDir) * speed * dt;
    } else {
      p.x += dx * p.baseSpeed * dt; p.y += dy * p.baseSpeed * dt;
    }
    p.x = Math.max(0, Math.min(W, p.x)); p.y = Math.max(0, Math.min(H, p.y));
    if(p.reloading > 0){ p.reloading -= dt; if(p.reloading <= 0){ refreshAmmoFor(p); audio.beep(320,0.05,'triangle',0.04); } }
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
    if(state.treeWave !== state.wave){
      trees.length = 0;
      const treeCount = Math.max(1, Math.floor(1 + state.wave*0.2));
      for(let i=0;i<treeCount;i++){ spawnTree(); }
      state.treeWave = state.wave;
    }
    // spawn logic
    const baseSpawnRate = Math.max(0.45, 1.2 - state.wave*0.04);
    const dangerSpawnMult = 1 + (state.danger-1)*0.2;
    state.spawnTimer -= dt;
    const spawnInterval = Math.max(0.12, baseSpawnRate / dangerSpawnMult / (state.coop?1.4:1));
    if(state.spawnTimer <= 0){ state.spawnTimer = spawnInterval; }
    if(state.wave >= state.maxWave){
      if(!state.bossSpawned){
        spawnBoss();
        state.bossSpawned = true;
        state.waveSpawned = 1;
      }
    } else if(state.waveSpawned < state.waveTotal && Math.random() < dt / spawnInterval){
      spawnEnemy();
      state.waveSpawned++;
    }
    if(state.waveSpawned >= state.waveTotal && enemies.length === 0){ // wave complete
      state.waveCompleteTimer += dt;
      // if reached max wave, and completed on this danger, unlock next danger
      if(state.wave >= state.maxWave){ if(state.danger < 5 && state.danger <= state.unlockedDanger){ state.unlockedDanger = Math.min(5, state.danger+1); localStorage.setItem(UNLOCK_KEY, state.unlockedDanger); msgEl.style.display='block'; msgEl.textContent = `Unlocked Danger ${state.unlockedDanger}!`; setTimeout(()=>msgEl.style.display='none',3000); } }
      // open stat selector before shop
      moneyDrops.length = 0;
      state.phase = 'upgrade';
      buildUpgradeChoices();
    }
    if(state.waveCompleteTimer > 6 && enemies.length === 0){
      state.phase = 'upgrade';
      buildUpgradeChoices();
    }
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
    if(input.keys['enter']){ input.keys['enter'] = false; state.wave = Math.min(state.maxWave, state.wave + 1); startWave(); }
  }

  // bullets update
  for(let i=bullets.length-1;i>=0;i--){ const b=bullets[i]; b.x += b.vx*dt; b.y += b.vy*dt; b.life -= dt; if(b.life<=0 || b.x<-50 || b.x>W+50 || b.y<-50 || b.y>H+50 || bullets.length>MAX_BULLETS) bullets.splice(i,1); }

  // bullets vs trees (destructibles)
  for(let i=bullets.length-1;i>=0;i--){
    const b = bullets[i];
    for(let j=trees.length-1;j>=0;j--){
      const tr = trees[j];
      const dist = Math.hypot(b.x - tr.x, b.y - tr.y);
      if(dist < tr.r + 4){
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
  for(let i=enemies.length-1;i>=0;i--){ const e=enemies[i]; // choose nearest alive player to chase
    const alivePlayers = players.filter(p=>!p.dead);
    if(alivePlayers.length === 0) continue;
    let target = alivePlayers[0]; let bd = (e.x-alivePlayers[0].x)**2 + (e.y-alivePlayers[0].y)**2; for(const p of alivePlayers){ const d=(e.x-p.x)**2 + (e.y-p.y)**2; if(d<bd){ bd=d; target=p; } }
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
    e.x += Math.cos(ang) * e.speed * slowMult * dt;
    e.y += Math.sin(ang) * e.speed * slowMult * dt;

    // bullets collision
    for(let j=bullets.length-1;j>=0;j--){ const b = bullets[j]; const dist = Math.hypot(b.x - e.x, b.y - e.y); if(dist < e.r + 3){
            e.hp -= b.damage;
            e.lastHitBy = b.ownerId;
            const dealt = Math.max(1, Math.round(Math.min(b.damage, b.damage + e.hp)));
            floatingTexts.push({x:e.x, y:e.y-6, vx:rand(-12,12), vy:-40, life:0.8, text: dealt, color: b.crit ? '#ffd166' : palette.textLight});
            addShake(b.crit ? 4 : 1.5);
            // elemental status
            if(b.elemental === 'fire'){
              e.status.burn = Math.max(e.status.burn, 2.5);
              e.status.burnDps = Math.max(e.status.burnDps, b.damage * 0.25);
            } else if(b.elemental === 'ice'){
              e.status.slow = Math.max(e.status.slow, 2.0);
            } else if(b.elemental === 'shock'){
              // chain shock to nearby enemy
              const chain = enemies.find(en => en !== e && Math.hypot(en.x - e.x, en.y - e.y) < 80);
              if(chain){
                chain.hp -= b.damage * 0.6;
                addParticle({x:chain.x,y:chain.y,life:0.2, r:8, color:'#b27bff'});
              }
            }
            addParticle({x:e.x,y:e.y,life:0.2, r:8, color:'#ffd166'}); const ownerId = b.ownerId;
            if(b.pierce > 0){ b.pierce--; } else { bullets.splice(j,1); } if(e.hp <= 0){ // die
            // reward to owner if available, else nearest player
            killEnemy(i, ownerId); break; } }
    }

    // collision with player
    for(const p of players){
      if(p.dead) continue;
      if(p.iFrames > 0) continue;
      const d = Math.hypot(p.x - e.x, p.y - e.y);
      if(d < p.r + e.r){
        p.hp -= Math.max(1, (e.dmg - p.armor) * dt);
        p.hitFlash = 0.12;
        addShake(6);
        if(p.hp <= 0){
          p.hp = 0;
          p.dead = true;
          addShake(10);
          // game over only if all players are dead
          if(players.every(pl=>pl.dead)){
            state.phase = 'gameover';
          }
        }
      }
    }
  }

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

  // manual/priority mouse fire: if mouse moved recently, aim at cursor and allow fire regardless of auto-toggle
  const now = t;
  const mouseRecent = (now - input.lastMove) < 0.35;
  if(state.phase === 'wave' && players[0] && !players[0].dead && mouseRecent){
    const p = players[0];
    const target = {x: input.mx, y: input.my};
    p.angle = Math.atan2(target.y - p.y, target.x - p.x);
    if(input.mouseDown || !settings.autoShoot){
      fireWeaponFor(p, t, target);
    }
  }

  // auto-fire for players (player1 only if mouse idle or auto enabled)
  for(let i=0;i<players.length;i++){
    const p = players[i]; if(p.dead) continue;
    if(i===0 && mouseRecent && !settings.autoShoot) continue;
    if(i===0 && !settings.autoShoot && !mouseRecent) continue;
    if(i===0 && mouseRecent) continue;
    const target = getNearestEnemyTo(p.x,p.y) || getNearestTreeTo(p.x,p.y);
    if(target && state.phase === 'wave'){
      if(i!==0 || !settings.mouseAim || !mouseRecent){ p.angle = Math.atan2(target.y - p.y, target.x - p.x); }
      fireWeaponFor(p, t, target);
    }
  }
}

// Drawing helpers reuse earlier drawing but adapt to multi-player
function drawBackground(){
  const grad = ctx.createLinearGradient(0,0,W,H);
  grad.addColorStop(0, palette.bg1);
  grad.addColorStop(0.55, palette.bg3);
  grad.addColorStop(1, palette.bg2);
  ctx.fillStyle = grad;
  ctx.fillRect(0,0,W,H);

  // Draw map sprite if available
  if(mapImage && mapImage.complete && mapImage.naturalWidth){
    ctx.save();
    ctx.globalAlpha = 0.15;
    const scale = Math.max(W / mapImage.naturalWidth, H / mapImage.naturalHeight);
    const mapW = mapImage.naturalWidth * scale;
    const mapH = mapImage.naturalHeight * scale;
    const mapX = (W - mapW) / 2;
    const mapY = (H - mapH) / 2;
    ctx.drawImage(mapImage, mapX, mapY, mapW, mapH);
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

function drawWeaponIcon(w, x, y){
  ctx.save();
  ctx.translate(x, y);
  const img = weaponImages[w.id];
  if(img && img.complete && img.naturalWidth){
    const scale = 28 / img.naturalWidth;
    const h = img.naturalHeight * scale;
    ctx.drawImage(img, 0, 6, 28, h);
  } else {
    ctx.lineWidth = 3;
    ctx.strokeStyle = palette.outline;
    ctx.fillStyle = w.color;
    roundRect(0, 6, 26, 8, 3); ctx.fill(); ctx.stroke();
    roundRect(10, 2, 10, 6, 2); ctx.fill(); ctx.stroke();
    roundRect(18, 10, 8, 4, 2); ctx.fill(); ctx.stroke();
  }
  ctx.restore();
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
  } else {
    roundRect(0,0,14,14,3); ctx.fill(); ctx.stroke();
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

function drawPlayers(){
  for(let i=0;i<players.length;i++){
    const p = players[i];
    if(p.dead) continue;
    const body = i===0 ? '#4a9eff' : '#ff6b6b';
    ctx.save();
    const bob = Math.sin(state.animTime * 6 + i) * 1.6;
    ctx.translate(p.x, p.y + bob);

    // ground shadow
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath();
    ctx.ellipse(0, 16, 16, 6, 0, 0, Math.PI*2);
    ctx.fill();
    ctx.restore();

    // Determine which sprite to use based on angle
    let spriteImg = null;
    let flipX = false;
    const angle = p.angle;
    const angleDeg = angle * 180 / Math.PI;
    
    // Normalize angle to 0-360
    let normalizedAngle = angleDeg;
    while(normalizedAngle < 0) normalizedAngle += 360;
    while(normalizedAngle >= 360) normalizedAngle -= 360;
    
    // Choose sprite based on direction
    if(normalizedAngle >= 45 && normalizedAngle < 135){
      // Facing down
      spriteImg = playerImages.down;
    } else if(normalizedAngle >= 135 && normalizedAngle < 225){
      // Facing left
      spriteImg = playerImages.side;
      flipX = true;
    } else if(normalizedAngle >= 225 && normalizedAngle < 315){
      // Facing up
      spriteImg = playerImages.up;
    } else {
      // Facing right
      spriteImg = playerImages.side;
      flipX = false;
    }

    // Draw player sprite or fallback to ellipse
    if(spriteImg && spriteImg.complete && spriteImg.naturalWidth){
      ctx.save();
      if(flipX){
        ctx.scale(-1, 1);
      }
      const spriteSize = 32;
      ctx.drawImage(spriteImg, flipX ? -spriteSize/2 : -spriteSize/2, -spriteSize/2, spriteSize, spriteSize);
      ctx.restore();
    } else {
      // Fallback to original ellipse rendering
      ctx.save();
      ctx.rotate(angle);
      // outline
      ctx.fillStyle = palette.outline;
      ctx.beginPath(); ctx.ellipse(0,0,18,14,0,0,Math.PI*2); ctx.fill();
      // body
      ctx.fillStyle = body;
      ctx.beginPath(); ctx.ellipse(0,0,16,12,0,0,Math.PI*2); ctx.fill();
      // face
      ctx.fillStyle = '#2b1e10';
      ctx.beginPath(); ctx.arc(4,-3,2,0,Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(9,-3,2,0,Math.PI*2); ctx.fill();
      ctx.strokeStyle = '#2b1e10'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(6,2,4,0,Math.PI); ctx.stroke();
      ctx.restore();
    }

    // weapon
    const w = getWeaponFor(p);
    const img = weaponImages[w.id];
    ctx.save();
    ctx.rotate(angle);
    ctx.translate(10 + p.kick*30, 0);
    if(img && img.complete && img.naturalWidth){
      const scale = 22 / img.naturalWidth;
      const h = img.naturalHeight * scale;
      ctx.drawImage(img, -2, -h/2, 22, h);
    } else {
      ctx.fillStyle = w.color;
      roundRect(2,-3,14,6,2); ctx.fill();
      ctx.strokeStyle = palette.outline; ctx.lineWidth = 2; ctx.stroke();
    }
    ctx.restore();

    ctx.restore();
  }
}

function drawHUD(){
  const p = players[0];
  ctx.font = '14px "Trebuchet MS", system-ui, sans-serif';
  const pulse = 0.6 + 0.4 * Math.sin(state.animTime * 4);

  // main HUD panel
  panel(12, 12, 300, 84, palette.uiLight, palette.outline, 12);
  ctx.fillStyle = palette.text;
  ctx.fillText(`Wave ${state.wave}`, 24, 34);
  ctx.fillText(`HP ${Math.max(0,Math.round(p.hp))}/${p.baseMaxHp}`, 24, 56);
  ctx.fillText(`Coins ${p.currency}`, 24, 78);

  // XP bar
  const barX = 310, barY = 20, barW = 220, barH = 12;
  panel(barX-6, barY-6, barW+12, 26, palette.uiLight, palette.outline, 10);
  ctx.fillStyle = palette.uiMid;
  roundRect(barX, barY, barW, barH, 6); ctx.fill();
  const xpGrad = ctx.createLinearGradient(barX, barY, barX+barW, barY);
  xpGrad.addColorStop(0, `rgba(124,255,107,${0.6 + pulse*0.2})`);
  xpGrad.addColorStop(1, `rgba(108,214,255,${0.9 + pulse*0.2})`);
  ctx.fillStyle = xpGrad;
  roundRect(barX, barY, barW * (p.xp / p.xpNext), barH, 6); ctx.fill();
  ctx.fillStyle = palette.text;
  ctx.fillText(`Lv ${p.level}`, barX, barY + 26);

  // player2 HUD
  if(players[1]){
    const p2 = players[1];
    panel(W-240, 12, 228, 60, palette.uiLight, palette.outline, 12);
    ctx.fillStyle = palette.text;
    const hpText = p2.dead ? 'P2 DOWN' : `P2 HP ${Math.max(0,Math.round(p2.hp))}/${p2.baseMaxHp}`;
    ctx.fillText(hpText, W-228, 34);
    ctx.fillText(`P2 Coins ${p2.currency}`, W-228, 52);
  }

  // weapon + ammo
  const w = getWeaponFor(p);
  panel(12, H-56, 220, 42, palette.uiLight, palette.outline, 12);
  ctx.fillStyle = palette.text;
  ctx.fillText(`${w.name}`, 24, H-32);
  if(w.elemental){ ctx.fillText(`Element: ${w.elemental}`, 120, H-32); }
  if(!w.melee){
    const magMax = Math.max(1, (w.mag||0) + p.magBonus);
    const ammoBarW = 120;
    const ammoX = 24;
    const ammoY = H-20;
    ctx.fillStyle = palette.uiMid;
    roundRect(ammoX, ammoY, ammoBarW, 6, 3); ctx.fill();
    const ammoGrad = ctx.createLinearGradient(ammoX, ammoY, ammoX+ammoBarW, ammoY);
    ammoGrad.addColorStop(0, palette.uiAccent);
    ammoGrad.addColorStop(1, palette.uiGreen);
    ctx.fillStyle = ammoGrad;
    roundRect(ammoX, ammoY, ammoBarW * (p.ammoInMag / magMax), 6, 3); ctx.fill();
  }
  // dash meter
  const dashPanelY = H-104;
  panel(12, dashPanelY, 160, 36, palette.uiLight, palette.outline, 10, {shadow:false});
  ctx.fillStyle = palette.text;
  ctx.fillText('Dash', 22, dashPanelY + 20);
  const dashBarX = 74, dashBarW = 82, dashBarH = 10;
  ctx.fillStyle = palette.uiMid;
  roundRect(dashBarX, dashPanelY + 12, dashBarW, dashBarH, 5); ctx.fill();
  const dashReady = 1 - Math.min(1, Math.max(0, p.dashCooldown) / 2.1);
  const dashGrad = ctx.createLinearGradient(dashBarX, 0, dashBarX + dashBarW, 0);
  dashGrad.addColorStop(0, palette.uiBlue);
  dashGrad.addColorStop(1, palette.uiGreen);
  ctx.fillStyle = dashGrad;
  roundRect(dashBarX, dashPanelY + 12, dashBarW * dashReady, dashBarH, 5); ctx.fill();
  if(dashReady >= 0.999){
    ctx.fillStyle = palette.uiGreen;
    ctx.fillText('READY', dashBarX - 2, dashPanelY + 30);
  }

  // audio mute indicator
  if(audio.muted){
    panel(W-130, H-48, 118, 32, palette.uiLight, palette.outline, 10, {shadow:false});
    ctx.fillStyle = palette.text;
    ctx.fillText('MUTED (M)', W-118, H-28);
  }
}

function drawUpgradeSelector(){
  if(state.phase !== 'upgrade') return;
  const panelW = Math.min(620, W*0.85);
  const panelH = 220;
  const px = (W-panelW)/2;
  const py = (H-panelH)/2;
  panel(px, py, panelW, panelH, palette.uiLight, palette.outline, 14);
  ctx.fillStyle = palette.text;
  ctx.font = '18px "Trebuchet MS", system-ui, sans-serif';
  ctx.fillText('LEVEL UP — CHOOSE ONE', px+18, py+30);

  const cardW = (panelW - 40) / 4;
  const cardH = 132;
  for(let i=0;i<upgradeChoices.items.length;i++){
    const choice = upgradeChoices.items[i];
    const x = px + 16 + i * cardW; const y = py + 60;
    const pulse = 1 + Math.sin(state.animTime * 3 + i) * 0.01;
    ctx.save();
    ctx.translate(x + (cardW-8)/2, y + cardH/2);
    ctx.scale(pulse, pulse);
    ctx.translate(-(x + (cardW-8)/2), -(y + cardH/2));
    panel(x, y, cardW-8, cardH, palette.uiMid, palette.outline, 10);
    ctx.fillStyle = choice.tier.color;
    roundRect(x+8, y+8, 10, 20, 4); ctx.fill();
    ctx.fillStyle = palette.text;
    ctx.font = '12px "Trebuchet MS", system-ui, sans-serif';
    ctx.fillText(choice.stat.name, x+22, y+24);
    ctx.font = '10px "Trebuchet MS", system-ui, sans-serif';
    ctx.fillText(`${choice.tier.name} +${Math.round((choice.tier.mult-1)*100)}%`, x+22, y+42);
    ctx.restore();
  }
}

function drawShop(){
  if(state.phase !== 'shop') return;
  if(state.shopView === 'stats'){
    drawStatsMenu();
    return;
  }
  const a = state.shopAnim || 1;
  const fog = ctx.createRadialGradient(W/2, H/2, 80, W/2, H/2, Math.max(W,H)*0.6);
  fog.addColorStop(0, `rgba(0,0,0,${0.35*a})`);
  fog.addColorStop(1, `rgba(0,0,0,${0.7*a})`);
  ctx.fillStyle = fog;
  ctx.fillRect(0,0,W,H);

  const panels = getShopPanels();
  for(const p of panels){
    drawShopPanel(p);
  }
  // reroll button (single, bottom)
  panel(W/2-70, (H*0.82), 140, 36, palette.uiLight, palette.outline, 12);
  ctx.fillStyle = palette.text;
  ctx.font = '12px "Trebuchet MS", system-ui, sans-serif';
  ctx.fillText(`Reroll $${shop.rerollCost}`, W/2-50, (H*0.82)+22);
}

function getShopPanels(){
  if(state.coop && players[1]){
    const gap = 14;
    const panelW = Math.min(560, (W - gap*3) / 2);
    const panelH = Math.min(380, H*0.72);
    const py = (H - panelH)/2 + (1-(state.shopAnim||1))*50;
    return [
      {x: gap, y: py, w: panelW, h: panelH, player: players[0], title: 'P1 SHOP'},
      {x: W - panelW - gap, y: py, w: panelW, h: panelH, player: players[1], title: 'P2 SHOP'},
    ];
  }
  const panelW = Math.min(780, W*0.92);
  const panelH = Math.min(380, H*0.72);
  return [{x: (W-panelW)/2, y: (H-panelH)/2 + (1-(state.shopAnim||1))*50, w: panelW, h: panelH, player: players[0], title: 'SHOP'}];
}

function drawShopPanel(def){
  const {x: px, y: py, w: panelW, h: panelH, player: p, title} = def;
  panel(px, py, panelW, panelH, palette.uiLight, palette.outline, 14);
  ctx.fillStyle = palette.text;
  ctx.font = '18px "Trebuchet MS", system-ui, sans-serif';
  ctx.fillText(title, px+18, py+30);
  ctx.font = '12px "Trebuchet MS", system-ui, sans-serif';
  ctx.fillText('Click cards to buy. Enter to start next wave.', px+18, py+50);

  const cols = 3;
  const cardW = (panelW - 44) / cols;
  const cardH = 132;

  let hover = -1;
  for(let i=0;i<shop.items.length;i++){
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = px + 16 + col * cardW;
    const y = py + 64 + row * (cardH + 12);
    if(input.mx >= x && input.mx <= x + cardW - 12 && input.my >= y && input.my <= y + cardH) hover = i;

    const isSelected = i === shop.selection;
    const isHover = i === hover;
    const pulse = 1 + (isHover ? 0.03 : 0.0) + Math.sin(state.animTime * 4 + i) * 0.003;
    const cx = x + (cardW-12)/2;
    const cy = y + cardH/2;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(pulse, pulse);
    ctx.translate(-cx, -cy);
    panel(x, y, cardW-12, cardH, isSelected ? palette.uiMid : palette.uiLight, palette.outline, 12);
    ctx.save();
    roundRect(x, y, cardW-12, cardH, 10); ctx.clip();
    if(isHover){
      ctx.strokeStyle = palette.uiAccent; ctx.lineWidth = 3;
      roundRect(x, y, cardW-12, cardH, 10); ctx.stroke();
    }

    const it = shop.items[i];
    if(!it || !it.data){
      ctx.fillStyle = 'rgba(0,0,0,0.2)';
      ctx.font = '10px "Trebuchet MS", system-ui, sans-serif';
      ctx.fillText('EMPTY', x+20, y+24);
      ctx.restore();
      ctx.restore();
      continue;
    }
    const rarity = rarities.find(r=>r.id === (it.rarity || it.data.rarity));
    ctx.fillStyle = (rarity && rarity.color) || palette.uiMid;
    ctx.fillRect(x+10, y+10, 6, 26);

    ctx.fillStyle = palette.text;
    ctx.font = '12px "Trebuchet MS", system-ui, sans-serif';
    ctx.fillText(it.data.name, x+20, y+24);

    if(it.type === 'weapon'){
      drawWeaponIcon(it.data, x+20, y+30);
      ctx.fillStyle = palette.text;
      ctx.font = '9px "Trebuchet MS", system-ui, sans-serif';
      const wInst = it.preview || (it.preview = createWeaponInstance(it.data, it.rarity || it.data.rarity));
      ctx.fillText(`DMG ${wInst.damage}`, x+20, y+56);
      ctx.fillText(`ROF ${wInst.fireRate.toFixed(2)}`, x+78, y+56);
      ctx.fillText(`RLD ${wInst.reload.toFixed(1)}s`, x+20, y+70);
      ctx.fillText(`MAG ${wInst.mag}`, x+20, y+84);
    } else {
      drawItemIcon(it.data.id, x+20, y+52);
      ctx.fillStyle = palette.text;
      ctx.font = '9px "Trebuchet MS", system-ui, sans-serif';
      wrapText(it.data.desc, x+42, y+62, cardW-60, 11, 2);
    }

    ctx.restore();
    // price badge (green if affordable, gray if not)
    const canAfford = p.currency >= it.price;
    panel(x+16, y+100, 70, 22, canAfford ? palette.uiGreen : palette.uiMid, palette.outline, 10, {shadow:false});
    if(canAfford){
      ctx.save();
      ctx.shadowColor = 'rgba(124,255,107,0.6)';
      ctx.shadowBlur = 10;
      ctx.strokeStyle = 'rgba(124,255,107,0.6)';
      roundRect(x+16, y+100, 70, 22, 10); ctx.stroke();
      ctx.restore();
    }
    ctx.fillStyle = palette.text;
    ctx.font = '12px "Trebuchet MS", system-ui, sans-serif';
    ctx.fillText(`$${it.price}`, x+28, y+116);
    if(shop.locked[i]){
      ctx.fillStyle = palette.text;
      ctx.fillText('LOCK', x+70, y+116);
    }
    ctx.restore();
  }
}

function drawStatsMenu(){
  const p = players[0];
  const panelW = Math.min(560, W*0.82);
  const panelH = Math.min(380, H*0.7);
  const px = (W-panelW)/2;
  const py = (H-panelH)/2;
  panel(px, py, panelW, panelH, palette.uiLight, palette.outline, 14);
  ctx.fillStyle = palette.text;
  ctx.font = '18px "Trebuchet MS", system-ui, sans-serif';
  ctx.fillText('STATS (TAB to return)', px+18, py+28);
  ctx.font = '12px "Trebuchet MS", system-ui, sans-serif';
  const rows = [
    `Class: ${p.className}`,
    `HP: ${Math.round(p.hp)} / ${p.baseMaxHp}`,
    `Speed: ${p.baseSpeed}`,
    `Armor: ${p.armor}`,
    `Life Steal: ${(p.lifesteal*100).toFixed(1)}%`,
    `Reload Speed: ${p.reloadSpeed.toFixed(2)}`,
    `Accuracy: ${p.accuracy.toFixed(2)}`,
    `Mag Bonus: +${p.magBonus}`,
    `Damage Bonus: +${p.damageBonus}`,
    `Crit Chance: ${(p.critChance*100).toFixed(1)}%`,
    `Elemental Bonus: +${Math.round(p.elementalBonus*100)}%`,
    `Luck: ${p.luck}`,
  ];
  for(let i=0;i<rows.length;i++){
    ctx.fillText(rows[i], px+24, py+60 + i*20);
  }

  // modifier explanations
  ctx.fillText('Modifiers:', px+24, py+260);
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
  for(let i=0;i<mods.length;i++){
    ctx.fillText(mods[i], px+24, py+280 + i*16);
  }
}

function drawEffects(){
  // money drops
  for(const m of moneyDrops){
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
    ctx.save();
    ctx.translate(tr.x, tr.y);
    if(treeImage.complete && treeImage.naturalWidth){
      const scale = (tr.r*2) / treeImage.naturalWidth;
      const h = treeImage.naturalHeight * scale;
      ctx.drawImage(treeImage, -tr.r, -h/2, tr.r*2, h);
    } else {
      ctx.fillStyle = '#5a7f3a';
      ctx.beginPath(); ctx.arc(0,0,tr.r,0,Math.PI*2); ctx.fill();
    }
    ctx.restore();
  }

  // fruits (draw)
  for(const f of fruits){
    const bob = Math.sin(f.t * 6) * 2;
    ctx.fillStyle = '#ff6b6b';
    ctx.beginPath(); ctx.arc(f.x, f.y + bob, f.r, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#2b1e10';
    ctx.fillRect(f.x-1, f.y + bob - f.r - 4, 2, 6);
  }

  // bullets
  for(const b of bullets){
    ctx.save();
    ctx.shadowColor = b.crit ? 'rgba(255,209,102,0.7)' : 'rgba(255,255,255,0.35)';
    ctx.shadowBlur = b.crit ? 10 : 6;
    ctx.fillStyle = b.crit ? '#ffd166' : (b.color || '#fffa');
    ctx.beginPath(); ctx.arc(b.x,b.y,b.crit?4:3,0,Math.PI*2); ctx.fill();
    ctx.restore();
  }

  // enemies
  for(const e of enemies){
    const wob = 1 + Math.sin(state.animTime * 5 + e.x * 0.02 + e.y * 0.01) * 0.03;
    ctx.save();
    ctx.translate(e.x, e.y);
    ctx.scale(wob, wob);
    const lightImg = enemyImages.light;
    if(e.id === 'runner' && lightImg && lightImg.complete && lightImg.naturalWidth){
      const scale = (e.r*2) / lightImg.naturalWidth;
      const h = lightImg.naturalHeight * scale;
      ctx.drawImage(lightImg, -e.r, -h/2, e.r*2, h);
    } else {
      ctx.fillStyle = palette.outline;
      ctx.beginPath(); ctx.arc(0,0,e.r+2,0,Math.PI*2); ctx.fill();
      ctx.fillStyle = e.color;
      ctx.beginPath(); ctx.arc(0,0,e.r,0,Math.PI*2); ctx.fill();
      ctx.fillStyle = '#2b1e10';
      ctx.beginPath(); ctx.arc(-3,-2,2,0,Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(3,-2,2,0,Math.PI*2); ctx.fill();
    }

    // hp bar
    ctx.fillStyle = palette.outline;
    roundRect(-e.r-2, -e.r-10, e.r*2+4, 6, 3); ctx.fill();
    const hpGrad = ctx.createLinearGradient(-e.r, 0, e.r, 0);
    hpGrad.addColorStop(0, palette.uiAccent);
    hpGrad.addColorStop(1, palette.uiGreen);
    ctx.fillStyle = hpGrad;
    roundRect(-e.r, -e.r-9, (e.r*2) * (e.hp/e.maxHp), 4, 2); ctx.fill();
    if(e.isBoss){
      ctx.fillStyle = '#ffb44c';
      ctx.beginPath(); ctx.moveTo(-6,-e.r-18); ctx.lineTo(0,-e.r-28); ctx.lineTo(6,-e.r-18); ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  }

  // particles
  for(const p of particles){
    ctx.fillStyle = p.color;
    ctx.globalAlpha = Math.max(0, p.life*5);
    ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,Math.PI*2); ctx.fill();
    ctx.globalAlpha = 1;
  }
}

function drawWaveBanner(){
  if(state.waveBanner <= 0) return;
  const t = state.waveBanner;
  const alpha = Math.min(1, t);
  panel(W/2 - 120, H*0.08, 240, 46, palette.uiLight, palette.outline, 12, {alpha});
  ctx.fillStyle = palette.text;
  ctx.font = 'bold 18px "Trebuchet MS", system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`WAVE ${state.wave}`, W/2, H*0.08 + 28);
  ctx.textAlign = 'start';
}

function drawGameOver(){
  ctx.fillStyle='rgba(0,0,0,0.7)';
  ctx.fillRect(0,0,W,H);
  ctx.fillStyle=palette.uiLight;
  panel(W/2-200, 24, 400, 56, palette.uiLight, palette.outline, 14);
  ctx.fillStyle=palette.text;
  ctx.font='bold 22px "Trebuchet MS", system-ui, sans-serif';
  ctx.textAlign='center';
  ctx.fillText('RUN OVER', W/2, 58);
  ctx.textAlign='start';

  const cols = players.length;
  const panelW = Math.min(420, (W - 40) / cols);
  const panelH = Math.min(420, H - 120);
  for(let i=0;i<players.length;i++){
    const p = players[i];
    const px = 20 + i * (panelW + 20);
    const py = 100;
    panel(px, py, panelW, panelH, palette.uiLight, palette.outline, 12);
    ctx.fillStyle = palette.text;
    ctx.font = '14px "Trebuchet MS", system-ui, sans-serif';
    ctx.fillText(`Player ${i+1}`, px+16, py+24);
    ctx.font = '12px "Trebuchet MS", system-ui, sans-serif';
    const stats = [
      `Class: ${p.className}`,
      `Wave: ${state.wave} / ${state.maxWave}`,
      `HP: ${p.baseMaxHp}`,
      `Speed: ${p.baseSpeed}`,
      `Armor: ${p.armor}`,
      `Life Steal: ${(p.lifesteal*100).toFixed(1)}%`,
      `Damage Bonus: ${p.damageBonus}`,
      `Luck: ${p.luck}`,
    ];
    for(let s=0;s<stats.length;s++){
      ctx.fillText(stats[s], px+16, py+46 + s*16);
    }
    ctx.fillText('Weapons:', px+16, py+190);
    let wy = py+208;
    for(const w of p.ownedWeapons){
      if(!w) continue;
      const r = rarities.find(x=>x.id===w.rarity);
      ctx.fillStyle = (r && r.color) || w.color;
      ctx.fillRect(px+16, wy-10, 10, 10);
      ctx.fillStyle = palette.text;
      ctx.fillText(`${w.name} (${w.rarity})`, px+32, wy);
      wy += 16;
    }
    ctx.fillText('Items:', px+16, wy+6);
    let iy = wy+24;
    for(const it of p.items){
      const d = items.find(x=>x.id===it.id);
      const r = rarities.find(x=>x.id===it.rarity);
      ctx.fillStyle = (r && r.color) || palette.uiMid;
      ctx.fillRect(px+16, iy-10, 10, 10);
      ctx.fillStyle = palette.text;
      ctx.fillText(d ? d.name : it.id, px+32, iy);
      iy += 16;
    }
  }
}

function draw(){
  ctx.clearRect(0,0,W,H);
  drawBackground();
  ctx.save();
  ctx.translate(camera.x, camera.y);
  drawEffects();
  drawPlayers();
  ctx.restore();
  drawHUD();
  drawWaveBanner();
  drawUpgradeSelector();
  drawShop();
  if(state.paused){
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.fillRect(0,0,W,H);
    panel(W/2-120, H/2-40, 240, 80, palette.uiLight, palette.outline, 14);
    ctx.fillStyle = palette.text;
    ctx.font = 'bold 18px "Trebuchet MS", system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('PAUSED', W/2, H/2);
    ctx.font = '12px "Trebuchet MS", system-ui, sans-serif';
    ctx.fillText('Press P to resume', W/2, H/2 + 18);
    ctx.textAlign = 'start';
  }
  const anchor = players[0];
  if(anchor && anchor.hp > 0 && anchor.hp / anchor.baseMaxHp < 0.35 && state.phase === 'wave'){
    const hpRatio = anchor.hp / anchor.baseMaxHp;
    const pulse = 0.25 + Math.sin(state.animTime * 6) * 0.08;
    ctx.fillStyle = `rgba(255,70,70,${pulse * (1 - hpRatio)})`;
    ctx.fillRect(0,0,W,H);
  }
  if(players.some(p=>p.hitFlash>0)){
    ctx.fillStyle = `rgba(255,70,70,${Math.max(...players.map(p=>p.hitFlash))})`;
    ctx.fillRect(0,0,W,H);
  }
  if(state.phase==='gameover'){
    restartBtn.style.display = 'block';
    if(pauseBtn) pauseBtn.style.display = 'none';
    drawGameOver();
  } else {
    restartBtn.style.display = 'none';
    if(pauseBtn && state.phase !== 'menu') pauseBtn.style.display = 'block';
  }
}

let last = performance.now()/1000;
function loop(now){ const t = now/1000; let dt = t - last; if(dt>0.05) dt=0.05; last = t; if(state.phase !== 'menu') update(dt,t); draw(); requestAnimationFrame(loop); }

// init: render menu, prepare shop
function showMenu(){ menuEl.style.display = 'block'; if(pauseBtn) pauseBtn.style.display = 'none'; if(settingsPanel) settingsPanel.style.display='none'; renderDangerButtons(); renderClassButtons(); }
showMenu();
loadWeaponImages();
loadEnemyImages();
  loadPlayerImages();
requestAnimationFrame(loop);

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
  renderDangerButtons();
  renderClassButtons();
}
