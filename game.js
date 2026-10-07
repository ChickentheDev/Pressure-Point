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

// ---- Sprites -------------------------------------------------------------
// crop = opaque bounding box inside the PNG (measured offline) so every sprite is
// scaled by what is actually drawn, not by its transparent padding.
// pixel = true -> nearest-neighbour scaling (pixel art); false -> smooth downscale (hi-res art).
const SPRITE_DEFS = {
  playerUp:    {src:'PlayerUp.png',     crop:[14,10,34,46], pixel:true},
  playerDown:  {src:'PlayerDown.png',   crop:[14,10,34,46], pixel:true},
  playerSide:  {src:'PlayerSide.png',   crop:[20,10,22,42], pixel:true},
  enemyLight:  {src:'EnemyLight.png',   crop:[3,1,31,37],   pixel:true},
  tree:        {src:'Tree.png',         crop:[2,12,46,52],  pixel:true},
  map:         {src:'Map.png',          crop:[0,0,512,512], pixel:true},
  w_pistol:    {src:'CobaltPistol.png', crop:[69,279,893,480], pixel:false},
  w_shotgun:   {src:'GravShotgun.png',  crop:[80,88,345,310],  pixel:false, fallback:'w_shotgunAlt'},
  w_shotgunAlt:{src:'Shotgun.png',      crop:[46,25,147,169],  pixel:false},
  w_blade:     {src:'ArcBlade.png',     crop:[103,52,283,382], pixel:false},
  w_smg:       {src:'ViperSMG.png',     crop:[32,95,441,248],  pixel:false},
  w_rifle:     {src:'Pulserifle.png',   crop:[0,8,127,137],    pixel:false},
  w_heavy:     {src:'TitanCannon.png',  crop:[23,26,21,6],     pixel:true},
  w_rpg:       {src:'RPG.png',          crop:[17,20,33,10],    pixel:true},
  w_minigun:   {src:'Minigun.png',      crop:[2,5,117,108],    pixel:false},
  w_harpoon:   {src:'Harpoongun.png',   crop:[8,24,48,18],     pixel:true},
  w_dmr:       {src:'LongshotDMR.png',  crop:[2,24,58,16],     pixel:true},
};
const sprites = {};
for(const [key, def] of Object.entries(SPRITE_DEFS)){
  const img = new Image();
  img.src = def.src;
  sprites[key] = {...def, img};
}
function spriteReady(key){
  const s = sprites[key];
  if(s && s.img.complete && s.img.naturalWidth) return s;
  if(s && s.fallback) return spriteReady(s.fallback);
  return null;
}
// white silhouettes for hit flashes (drawing a file:// image into a canvas is fine; we never read pixels back)
const silhouetteCache = {};
function spriteSilhouette(s){
  if(silhouetteCache[s.src]) return silhouetteCache[s.src];
  const c = document.createElement('canvas');
  c.width = s.img.naturalWidth; c.height = s.img.naturalHeight;
  const g = c.getContext('2d');
  g.drawImage(s.img, 0, 0);
  g.globalCompositeOperation = 'source-in';
  g.fillStyle = '#ffffff';
  g.fillRect(0, 0, c.width, c.height);
  silhouetteCache[s.src] = c;
  return c;
}
// Draw sprite `key` centred at (0,0) of the current transform, scaled so its cropped width is `w`
// (or height `h` if w is null). Returns false when the sprite isn't available so callers can fall back.
function drawSprite(key, w, h, opts={}){
  const s = spriteReady(key);
  if(!s) return false;
  const [cx, cy, cw, ch] = s.crop;
  const dw = w != null ? w : h * cw / ch;
  const dh = h != null ? h : w * ch / cw;
  const ox = opts.anchorX != null ? opts.anchorX : 0.5;
  const oy = opts.anchorY != null ? opts.anchorY : 0.5;
  ctx.save();
  ctx.imageSmoothingEnabled = !s.pixel;
  if(!s.pixel) ctx.imageSmoothingQuality = 'high';
  if(opts.flipX) ctx.scale(-1, 1);
  if(opts.flipY) ctx.scale(1, -1);
  ctx.drawImage(s.img, cx, cy, cw, ch, -dw*ox, -dh*oy, dw, dh);
  if(opts.flash > 0){
    ctx.globalAlpha = Math.min(1, opts.flash);
    ctx.drawImage(spriteSilhouette(s), cx, cy, cw, ch, -dw*ox, -dh*oy, dw, dh);
  }
  ctx.restore();
  return true;
}
function drawGroundShadow(x, y, rx, ry){
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.32)';
  ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI*2); ctx.fill();
  ctx.restore();
}
// in-hand length (px) for each weapon sprite, keeps weapons visually consistent regardless of PNG size
const weaponHandLength = { pistol:20, blade:24, smg:26, rifle:28, shotgun:28, harpoon:30, dmr:32, heavy:30, rpg:32, minigun:30 };

// UI font helper so every canvas screen uses the same family
const UI_FONT = '"Trebuchet MS", "Segoe UI", system-ui, sans-serif';
function uiFont(size, weight=''){ return `${weight ? weight + ' ' : ''}${size}px ${UI_FONT}`; }

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
  // keep the toast off the level-up panel and the shop (default CSS spot is 24% from the bottom)
  msgEl.style.top = ''; msgEl.style.bottom = '';
  if(state.phase === 'upgrade'){
    const L = getUpgradeLayout();
    const below = L.py + L.panelH + 12;
    if(below + 44 <= H){ msgEl.style.top = below + 'px'; msgEl.style.bottom = 'auto'; }
    else { msgEl.style.top = '8px'; msgEl.style.bottom = 'auto'; }
  } else if(state.phase === 'shop'){
    msgEl.style.top = '8px'; msgEl.style.bottom = 'auto';
  }
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
// C# WASM systems (shop roller). Index.html only injects wasm/systems.loader.js over http(s); it loads
// asynchronously, after this script. Until it has loaded AND accepted our weapon/item data, everything
// uses the JS implementation, so Start never waits on (or hangs in) the WASM module.
// status: off (file://, Electron, DISABLE_WASM) | loading | ready | failed
const wasmSystems = { status: window.__systemsWasmWanted ? 'loading' : 'off', api: null, reason: '' };
function getSystems(){ return wasmSystems.status === 'ready' ? wasmSystems.api : stubSystems; }

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
if(autoShootToggle){
  autoShootToggle.checked = settings.autoShoot;
  autoShootToggle.addEventListener('change', ()=>{ settings.autoShoot = !!autoShootToggle.checked; saveSettings(); });
}
if(mouseAimToggle){
  mouseAimToggle.checked = settings.mouseAim;
  mouseAimToggle.addEventListener('change', ()=>{ settings.mouseAim = !!mouseAimToggle.checked; saveSettings(); });
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

// ---- WASM shop bridge ----------------------------------------------------------------------------
// The C# records (wasm/BrotatoSystems/Extra.cs) use PascalCase properties and int enums, so the JS data
// has to be converted before LoadData, and RollShop results ({Type, Data:{Id..}, Rarity, Price}) have to
// be mapped back to the JS objects buildShop expects ({type, data, rarity, price}).
const WASM_RARITY = { common:0, rare:1, epic:2, red:3 };        // C# Rarity: Common, Rare, Epic, Legendary
const WASM_TIMEOUT_MS = 10000;
function wasmDamageType(w){ return w.elemental==='fire' ? 1 : w.elemental==='ice' ? 2 : w.elemental==='shock' ? 3 : w.explosive ? 4 : 0; }
function wasmWeaponData(){
  return weapons.map(w=>({ Id:w.id, Name:w.name, Type:wasmDamageType(w), Damage:w.damage, FireDelay:w.fireRate, Spread:w.spread||0,
    Magazine:Math.round(w.mag||1), Reload:w.reload||1, Explosive:!!w.explosive, Melee:!!w.melee, AltMode:null,
    Rarity:WASM_RARITY[w.rarity] ?? 0, BasePrice:weaponPrices[w.id] || 100 }));
}
function wasmItemData(){
  return items.map(it=>{
    const mods = {};
    for(const [k,v] of Object.entries(it.effects||{})){ if(typeof v === 'number' && isFinite(v)) mods[k] = v; }
    return { Id:it.id, Name:it.name, Rarity:WASM_RARITY[it.rarity] ?? 0, Description:it.desc||'', StatMods:mods };
  });
}
// Map one RollShop entry back to a JS shop entry. Unknown ids are dropped. Price uses the JS formula so
// the shop costs the same whichever roller produced it.
function normalizeWasmPick(p){
  if(!p || typeof p !== 'object') return null;
  const type = p.Type ?? p.type;
  const data = p.Data ?? p.data;
  const id = data && (data.Id ?? data.id);
  if(!id) return null;
  if(type === 'weapon'){
    const w = weapons.find(x=>x.id === id); if(!w) return null;
    return { type:'weapon', data:w, rarity:w.rarity, price:Math.round((weaponPrices[w.id]||100) * rarityMult(w.rarity)) };
  }
  if(type === 'item'){
    const it = items.find(x=>x.id === id); if(!it) return null;
    return { type:'item', data:it, rarity:it.rarity, price:Math.round(it.price * rarityMult(it.rarity)) };
  }
  return null;
}
function wasmFail(reason){
  if(wasmSystems.status === 'ready') return;
  wasmSystems.status = 'failed'; wasmSystems.api = null; wasmSystems.reason = reason;
  console.info('[systems] using JS shop:', reason);
}
function attachWasmSystems(api){
  if(wasmSystems.status !== 'loading') return;           // off, already attached, or gave up (timeout)
  if(!api || api.isStub || typeof api.loadData !== 'function' || typeof api.rollShop !== 'function'){ wasmFail('WASM module unavailable'); return; }
  const w = wasmWeaponData(), it = wasmItemData();
  // ShopRoller.Roll loops forever when its pools are empty, so never let it run without data.
  if(!w.length || !it.length){ wasmFail('no shop data'); return; }
  let loaded = false;
  try { loaded = api.loadData(JSON.stringify(w), JSON.stringify(it)) !== false; } catch(err){ loaded = false; }
  if(!loaded){ wasmFail('LoadData failed'); return; }
  // probe once: the pools are non-empty now, so this terminates; reject the module if results are unusable
  let probe = null;
  try { probe = api.rollShop(1, 0, null); } catch(err){ probe = null; }
  if(!Array.isArray(probe) || probe.length !== 1 || !normalizeWasmPick(probe[0])){ wasmFail('RollShop returned unusable data'); return; }
  wasmSystems.api = api; wasmSystems.status = 'ready';
  console.info('[systems] WASM shop ready');
}
// returns normalized picks from the WASM roller, or null (caller falls back to the JS roller)
function rollShopWasm(count, luck){
  if(wasmSystems.status !== 'ready' || count <= 0) return null;
  try {
    const raw = wasmSystems.api.rollShop(count|0, Math.max(0, Math.floor(luck||0)), null);
    if(!Array.isArray(raw)) return null;
    return raw.map(normalizeWasmPick).filter(Boolean);
  } catch(err){ console.warn('rollShop failed, using JS shop', err); return null; }
}
if(wasmSystems.status === 'loading'){
  window.addEventListener('systemswasm', (ev)=>attachWasmSystems(ev.detail || window.SystemsWasm));
  if(window.SystemsWasm && !window.SystemsWasm.isStub) attachWasmSystems(window.SystemsWasm);  // loaded before us
  setTimeout(()=>{ if(wasmSystems.status === 'loading') wasmFail('timed out after ' + WASM_TIMEOUT_MS + 'ms'); }, WASM_TIMEOUT_MS);
}

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
  enemies.push({ id: t.id, x,y, r: t.r, hp: Math.floor(t.hp * waveScale * dangerHP), maxHp: Math.floor(t.hp * waveScale * dangerHP), speed: t.speed + state.wave*2, dmg: Math.floor(t.dmg * dangerDmg * lateDmg + state.wave*1.2), color: t.color, xp: t.xp + Math.floor(state.wave*0.6)*(state.danger), money: Math.max(1, Math.floor(t.money * 0.7) + Math.floor(state.wave*0.2) * state.danger) });
  if(enemies.length > 120){ enemies.shift(); }
  addParticle({x, y, life:0.35, r:18, color: palette.uiAccent});
}

function spawnBoss(){
  const edge = Math.floor(Math.random()*4);
  let x,y; if(edge===0){ x=-40; y=Math.random()*H } else if(edge===1){ x=W+40; y=Math.random()*H } else if(edge===2){ x=Math.random()*W; y=-40 } else { x=Math.random()*W; y=H+40 }
  const dangerHP = 1 + (state.danger-1) * 0.5;
  const dangerDmg = 1 + (state.danger-1) * 0.35;
  enemies.push({
    id: bossType.id, x,y, r: bossType.r, hp: Math.floor(bossType.hp * dangerHP), maxHp: Math.floor(bossType.hp * dangerHP),
    speed: bossType.speed, dmg: Math.floor(bossType.dmg * dangerDmg * (1 + (state.wave-1)*0.12)),
    color: bossType.color, xp: bossType.xp * state.danger, money: bossType.money * state.danger,
    isBoss: true,
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
        a.x -= dx * push * wb; a.y -= dy * push * wb;
        b.x += dx * push * wa; b.y += dy * push * wa;
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
    // px/py = previous position for the swept hit test. A new bullet starts its sweep at the player's
    // centre, so an enemy overlapping the player (inside the muzzle offset) still gets hit.
    bullets.push({ x: player.x + Math.cos(a)*player.r, y: player.y + Math.sin(a)*player.r, px: player.x, py: player.y, fresh: true, vx: Math.cos(a)*speed, vy: Math.sin(a)*speed, life: 1.6, color: w.color, damage: dmg, ownerId: player.id, crit: isCrit, elemental, pierce: (w.pierce||0) + (player.pierceBonus||0) });
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
  for(const p of players){ p.dashCooldown = 0; p.dashTimer = 0; p.iFrames = 0; }   // fresh dash each run
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
function startNextWave(){ state.wave = Math.min(state.maxWave, state.wave + 1); startWave(); canvas.style.cursor = 'default'; }

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
function update(dt, t){ if(state.phase === 'menu' || state.phase === 'gameover') return;
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
  // animation clock, camera shake and the wave banner stop while paused
  state.animTime += dt;
  updateCamera(dt);
  if(state.waveBanner > 0) state.waveBanner = Math.max(0, state.waveBanner - dt);
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
    if(input.keys['enter']){ input.keys['enter'] = false; startNextWave(); }
  }

  // bullets update
  for(let i=bullets.length-1;i>=0;i--){ const b=bullets[i]; if(b.fresh){ b.fresh = false; } else { b.px = b.x; b.py = b.y; } b.x += b.vx*dt; b.y += b.vy*dt; b.life -= dt; if(b.life<=0 || b.x<-50 || b.x>W+50 || b.y<-50 || b.y>H+50 || bullets.length>MAX_BULLETS) bullets.splice(i,1); }

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
    // visual only: facing + hit flash timer
    e.face = Math.cos(ang) < 0 ? -1 : 1;
    if(e.hitFlash > 0) e.hitFlash -= dt;
    e.vx = Math.cos(ang) * e.speed * slowMult;   // kept for auto-aim lead
    e.vy = Math.sin(ang) * e.speed * slowMult;
    e.x += e.vx * dt;
    e.y += e.vy * dt;

    // bullets collision (swept: previous -> current bullet position vs enemy radius + bullet radius)
    let killed = false;
    for(let j=bullets.length-1;j>=0;j--){ const b = bullets[j];
          if(b.hits && b.hits.includes(e)) continue;   // a piercing bullet hits each enemy once
          if(segmentHitsCircle(b.px ?? b.x, b.py ?? b.y, b.x, b.y, e.x, e.y, e.r + BULLET_HIT_R)){
            e.hp -= b.damage;
            e.lastHitBy = b.ownerId;
            e.hitFlash = 0.1; // visual only
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
                chain.lastHitBy = b.ownerId;   // so a chain kill credits the shooter (co-op)
                chain.hitFlash = 0.1;
                addParticle({x:chain.x,y:chain.y,life:0.2, r:8, color:'#b27bff'});
              }
            }
            addParticle({x:e.x,y:e.y,life:0.2, r:8, color:'#ffd166'}); const ownerId = b.ownerId;
            if(b.pierce > 0){ b.pierce--; (b.hits || (b.hits = [])).push(e); } else { bullets.splice(j,1); } if(e.hp <= 0){ // die
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
      if(i===0 && settings.mouseAim && (mouseRecent || input.mouseDown)){ target = {x: input.mx, y: input.my}; }
      else { const nearest = getNearestEnemyTo(p.x,p.y) || getNearestTreeTo(p.x,p.y); if(nearest) target = aimPointFor(p, nearest); }
      if(!target) continue;
      p.angle = Math.atan2(target.y - p.y, target.x - p.x);
      const wantsFire = i !== 0 || settings.autoShoot || input.mouseDown || !!input.keys[' '];
      if(wantsFire) fireWeaponFor(p, t, target);
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

function drawPlayerWeapon(p){
  const w = getWeaponFor(p);
  const len = weaponHandLength[w.id] || 26;
  const facingLeft = Math.cos(p.angle) < 0;
  ctx.save();
  ctx.translate(0, 4);
  ctx.rotate(p.angle);
  ctx.translate(12 + len*0.35 - p.kick*30, 0);
  if(facingLeft) ctx.scale(1, -1);        // keep the gun upright when aiming left
  if(!drawSprite('w_' + w.id, len, null)) drawWeaponFallback(w, len);
  ctx.restore();
}

function drawPlayers(){
  for(let i=0;i<players.length;i++){
    const p = players[i];
    if(p.dead) continue;
    const body = i===0 ? '#4a9eff' : '#ff6b6b';
    const moving = p.dashTimer > 0 || (state.phase === 'wave' && (p._lastX !== undefined) && (Math.abs(p.x - p._lastX) + Math.abs(p.y - p._lastY) > 0.2));
    p._lastX = p.x; p._lastY = p.y;
    const bob = moving ? Math.abs(Math.sin(state.animTime * 12 + i)) * -2.5 : Math.sin(state.animTime * 3 + i) * 0.8;

    drawGroundShadow(p.x, p.y + 20, 14, 5);
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
    const drawn = drawSprite(key, null, 46, {flipX, flash});   // 1:1 with the 64px source art
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

function drawBar(x, y, w, h, frac, c1, c2, label){
  ctx.fillStyle = 'rgba(4,7,13,0.85)';
  roundRect(x-2, y-2, w+4, h+4, (h+4)/2); ctx.fill();
  ctx.fillStyle = palette.uiMid;
  roundRect(x, y, w, h, h/2); ctx.fill();
  const f = Math.max(0, Math.min(1, frac || 0));
  if(f > 0){
    const g = ctx.createLinearGradient(x, y, x + w, y);
    g.addColorStop(0, c1); g.addColorStop(1, c2);
    ctx.fillStyle = g;
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

// y (in HUD units) for the P2 card: 8px below the DOM Pause button, measured in canvas pixels
function hudP2CardY(S){
  let bottomPx = 62 * S;
  if(pauseBtn && pauseBtn.style.display !== 'none'){
    const br = pauseBtn.getBoundingClientRect(), cr = canvas.getBoundingClientRect();
    if(br.height > 0) bottomPx = br.bottom - cr.top + 8;
  }
  return Math.max(62, bottomPx / S);
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
  ctx.textAlign = 'start';
  if(state.phase === 'wave'){
    const remaining = Math.max(0, state.waveTotal - state.waveSpawned) + enemies.length;
    drawBar(wx + 14, 42, ww - 28, 10, state.waveTotal ? 1 - remaining / state.waveTotal : 0, '#48e0c2', '#5fb0ff');
    ctx.font = uiFont(10);
    ctx.fillStyle = palette.textLight;
    ctx.textAlign = 'center';
    ctx.fillText(`${remaining} enemies left`, VW/2, 76);
    ctx.textAlign = 'start';
  } else {
    ctx.font = uiFont(11);
    ctx.fillStyle = palette.textLight;
    ctx.textAlign = 'center';
    ctx.fillText(state.phase === 'shop' ? 'Shop — prepare for the next wave' : 'Wave cleared!', VW/2, 52);
    ctx.textAlign = 'start';
  }

  // --- top-right: player 2 card (below the DOM pause button)
  if(players[1]) drawPlayerCard(players[1], VW - 262, hudP2CardY(S), 250, 'PLAYER 2', '#ff6b6b');

  // --- bottom-left: weapon + ammo, dash
  const w = getWeaponFor(p);
  const by = VH - 78;
  panel(12, by, 250, 66, palette.uiLight, palette.outline, 12);
  ctx.fillStyle = 'rgba(190,215,255,0.16)';
  roundRect(20, by + 10, 58, 46, 8); ctx.fill();
  drawWeaponIcon(w, 24, by + 18, 50, 30);
  ctx.font = uiFont(13, 'bold');
  ctx.fillStyle = palette.text;
  ctx.fillText(w.name, 88, by + 23);
  if(w.elemental){
    const ec = w.elemental === 'fire' ? '#ff8c42' : w.elemental === 'ice' ? '#6cd6ff' : '#b27bff';
    ctx.font = uiFont(10, 'bold');
    const tw = ctx.measureText(w.elemental.toUpperCase()).width + 10;
    ctx.fillStyle = ec; roundRect(250 - tw - 4, by + 11, tw, 15, 6); ctx.fill();
    ctx.fillStyle = '#041018'; ctx.fillText(w.elemental.toUpperCase(), 250 - tw + 1, by + 22);
  }
  if(!w.melee){
    const magMax = Math.max(1, (w.mag||0) + p.magBonus);
    if(p.reloading > 0){
      drawBar(88, by + 34, 160, 10, 1 - p.reloading / Math.max(0.01, w.reload), '#ffd166', '#ffb44c', '');
      ctx.font = uiFont(10, 'bold'); ctx.fillStyle = '#ffd166'; ctx.fillText('RELOADING', 88, by + 54);
    } else {
      drawBar(88, by + 34, 160, 10, p.ammoInMag / magMax, palette.uiAccent, palette.uiGreen, '');
      ctx.font = uiFont(10); ctx.fillStyle = palette.textLight; ctx.fillText(`${p.ammoInMag} / ${magMax}`, 88, by + 54);
    }
  } else {
    ctx.font = uiFont(10); ctx.fillStyle = palette.textLight; ctx.fillText('Melee', 88, by + 42);
  }
  if(w.overheatMax){
    drawBar(170, by + 50, 78, 4, w.heat / w.overheatMax, '#ffd166', '#ff5d5d', '');   // ends at by+54, 12px above the border
  }
  const dy = by - 40;
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

// Shop cards: never narrower than SHOP_MIN_CARD_W. Panels pick 3/2/1 columns to fit, and co-op shops
// stack vertically when side by side would squeeze them below 2 columns or not fit the window.
const SHOP_MIN_CARD_W = 160, SHOP_GAP = 12, SHOP_HEAD = 70, SHOP_PAD = 16;
function shopGrid(panelW, cardH){
  const inner = panelW - SHOP_PAD * 2;
  const cols = Math.max(1, Math.min(3, Math.floor((inner + SHOP_GAP) / (SHOP_MIN_CARD_W + SHOP_GAP))));
  const rows = Math.ceil(6 / cols);
  const cardW = (inner - SHOP_GAP * (cols - 1)) / cols;
  return {cols, rows, cardW, cardH, h: SHOP_HEAD + rows * cardH + (rows - 1) * SHOP_GAP + SHOP_PAD};
}
function getShopCardRect(def, i){
  const g = def.grid || shopGrid(def.w, 120);
  const col = i % g.cols, row = Math.floor(i / g.cols);
  return {x: def.x + SHOP_PAD + col * (g.cardW + SHOP_GAP), y: def.y + SHOP_HEAD + row * (g.cardH + SHOP_GAP), w: g.cardW, h: g.cardH};
}

function getShopButtons(){
  const panels = getShopPanels();
  const bottom = Math.max(...panels.map(p => p.y + p.h));
  const y = Math.min(H - 48, bottom + 14);
  return {
    reroll: {x: W/2 - 156, y, w: 148, h: 38},
    next:   {x: W/2 + 8,   y, w: 148, h: 38},
  };
}
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
    ctx.save();   // no hover lift: the drawn card always matches its click rect
    panel(c.x, c.y, c.w, c.h, hover ? '#2a4259' : palette.uiMid, hover ? choice.tier.color : palette.outline, 12);
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
    ctx.fillText(hover ? 'Click to pick' : `Tier multiplier x${choice.tier.mult}`, c.x + c.w/2, c.y + c.h - 14);
    ctx.textAlign = 'start';
    ctx.restore();
  }
  canvas.style.cursor = anyHover ? 'pointer' : 'default';
}

function drawShop(){
  if(state.phase !== 'shop') return;
  if(state.shopView === 'stats'){
    drawStatsMenu();
    return;
  }
  const a = state.shopAnim || 1;
  const fog = ctx.createRadialGradient(W/2, H/2, 80, W/2, H/2, Math.max(W,H)*0.6);
  fog.addColorStop(0, `rgba(0,0,0,${0.45*a})`);
  fog.addColorStop(1, `rgba(0,0,0,${0.78*a})`);
  ctx.fillStyle = fog;
  ctx.fillRect(0,0,W,H);

  let anyHover = false;
  for(const p of getShopPanels()){
    if(drawShopPanel(p)) anyHover = true;
  }
  const B = getShopButtons();
  const canReroll = players[0].currency >= shop.rerollCost;
  if(drawButton(B.reroll, `Reroll  $${shop.rerollCost}`, {disabled: !canReroll})) anyHover = true;
  const nextLabel = state.wave + 1 >= state.maxWave ? 'Boss Wave ▶' : `Wave ${Math.min(state.maxWave, state.wave + 1)} ▶`;
  if(drawButton(B.next, nextLabel, {primary: true})) anyHover = true;
  ctx.font = uiFont(11);
  ctx.fillStyle = palette.textLight;
  ctx.textAlign = 'center';
  ctx.fillText('Click to buy  •  Right-click to lock  •  Tab: stats  •  Enter: next wave', W/2, Math.min(H - 6, B.reroll.y + B.reroll.h + 22));
  ctx.textAlign = 'start';
  canvas.style.cursor = anyHover ? 'pointer' : 'default';
}

function getShopPanels(){
  const slide = (1-(state.shopAnim||1))*50;
  const BUTTONS_H = 84;                              // Reroll/Next buttons + hint line under the panels
  const avail = H - BUTTONS_H - 12;
  const pickCardH = (rows, panels) => {               // taller cards when there is room
    const tall = panels * (SHOP_HEAD + rows * 136 + (rows - 1) * SHOP_GAP + SHOP_PAD) + (panels - 1) * 14;
    return tall <= avail ? 136 : 120;
  };
  if(state.coop && players[1]){
    const gap = 14;
    const sideW = Math.min(580, (W - gap*3) / 2);
    const side = shopGrid(sideW, 120);
    const stackW = Math.min(800, W*0.92);
    const stack = shopGrid(stackW, 120);
    const stackH = stack.h * 2 + gap;
    const useStack = side.cols < 2 || (side.h > avail && stackH <= avail) || (side.cols < 3 && stack.cols === 3 && stackH <= avail);
    if(useStack){
      const g = shopGrid(stackW, pickCardH(stack.rows, 2));
      const y0 = Math.max(6, (avail - (g.h * 2 + gap)) / 2) + slide;
      const x = (W - stackW) / 2;
      return [
        {x, y: y0, w: stackW, h: g.h, grid: g, player: players[0], title: 'P1 SHOP'},
        {x, y: y0 + g.h + gap, w: stackW, h: g.h, grid: g, player: players[1], title: 'P2 SHOP'},
      ];
    }
    const g = shopGrid(sideW, pickCardH(side.rows, 1));
    const py = Math.max(6, (avail - g.h) / 2) + slide;
    return [
      {x: W/2 - gap/2 - sideW, y: py, w: sideW, h: g.h, grid: g, player: players[0], title: 'P1 SHOP'},
      {x: W/2 + gap/2, y: py, w: sideW, h: g.h, grid: g, player: players[1], title: 'P2 SHOP'},
    ];
  }
  const panelW = Math.min(800, W*0.92);
  const g = shopGrid(panelW, pickCardH(shopGrid(panelW, 120).rows, 1));
  const py = Math.max(6, (avail - g.h) / 2) + slide;
  return [{x: (W-panelW)/2, y: py, w: panelW, h: g.h, grid: g, player: players[0], title: 'SHOP'}];
}

// fit text into maxW by trimming with an ellipsis (uses the current ctx.font)
function fitText(text, maxW){
  text = String(text);
  if(maxW <= 0) return '';
  if(ctx.measureText(text).width <= maxW) return text;
  let lo = 0, hi = text.length;
  while(lo < hi){ const mid = (lo + hi + 1) >> 1; if(ctx.measureText(text.slice(0, mid) + '…').width <= maxW) lo = mid; else hi = mid - 1; }
  return lo > 0 ? text.slice(0, lo) + '…' : '';
}

// price + lock badge positions inside a card (shared by drawing and the UI tests)
function getShopBadgeRects(c){
  const y = c.y + c.h - 32;
  const priceW = Math.min(76, Math.max(52, c.w * 0.45));
  const price = {x: c.x + 20, y, w: priceW, h: 22};
  const lockW = Math.max(40, Math.min(48, c.x + c.w - 12 - (price.x + price.w + 6)));
  const lock = {x: c.x + c.w - 12 - lockW, y, w: lockW, h: 22};
  return {price, lock};
}

function drawShopPanel(def){
  const {x: px, y: py, w: panelW, h: panelH, player: p, title} = def;
  panel(px, py, panelW, panelH, palette.uiLight, palette.outline, 16);
  ctx.fillStyle = palette.uiAccent;
  ctx.font = uiFont(20, 'bold');
  ctx.fillText(title, px+18, py+32);
  ctx.font = uiFont(12);
  ctx.fillStyle = palette.textLight;
  ctx.fillText(fitText(`Wave ${state.wave} cleared`, panelW - 130), px+18, py+52);
  // wallet
  ctx.font = uiFont(16, 'bold');
  const coinsTxt = `${p.currency}`;
  const tw = ctx.measureText(coinsTxt).width;
  ctx.fillStyle = 'rgba(4,7,13,0.5)';
  roundRect(px + panelW - tw - 58, py + 16, tw + 42, 28, 14); ctx.fill();
  drawCoin(px + panelW - tw - 40, py + 30, 7);
  ctx.fillStyle = palette.text;
  ctx.fillText(coinsTxt, px + panelW - tw - 28, py + 36);

  let hoverAny = false;
  for(let i=0;i<shop.items.length;i++){
    const c = getShopCardRect(def, i);
    const {x, y, w: cw, h: ch} = c;
    const isHover = inRect(input.mx, input.my, c);
    hoverAny = hoverAny || isHover;
    const it = shop.items[i];
    const locked = !!shop.locked[i];
    ctx.save();   // no hover lift: the drawn card always matches its click rect
    const rarity = it && it.data ? rarities.find(r=>r.id === (it.rarity || it.data.rarity)) : null;
    const rc = (rarity && rarity.color) || palette.uiMid;
    panel(x, y, cw, ch, isHover ? '#243a50' : palette.uiMid, isHover ? rc : (i === shop.selection ? 'rgba(72,224,194,0.55)' : palette.outline), 12);
    if(!it || !it.data){
      ctx.fillStyle = 'rgba(255,255,255,0.25)';
      ctx.font = uiFont(11, 'bold');
      ctx.fillText('EMPTY', x+16, y+26);
      ctx.restore();
      continue;
    }
    // rarity stripe + label
    ctx.fillStyle = rc;
    roundRect(x + 8, y + 8, 5, ch - 16, 2.5); ctx.fill();
    ctx.font = uiFont(cw < 190 ? 12 : 13, 'bold');
    ctx.fillStyle = palette.text;
    ctx.fillText(fitText(it.data.name, cw - 30), x+20, y+24);
    ctx.font = uiFont(9, 'bold');
    ctx.fillStyle = rc;
    const rname = (it.rarity || it.data.rarity) === 'red' ? 'LEGENDARY' : String(it.rarity || it.data.rarity).toUpperCase();
    ctx.fillText(fitText(`${rname} ${it.type === 'weapon' ? 'WEAPON' : 'ITEM'}`, cw - 30), x+20, y+37);

    if(it.type === 'weapon'){
      ctx.fillStyle = 'rgba(190,215,255,0.16)';
      roundRect(x + 20, y + 44, 58, 36, 8); ctx.fill();
      drawWeaponIcon(it.data, x + 24, y + 48, 50, 28);
      const wInst = it.preview || (it.preview = createWeaponInstance(it.data, it.rarity || it.data.rarity));
      ctx.font = uiFont(10);
      ctx.fillStyle = palette.textLight;
      const sx = x + 86, sw = cw - 94;
      const lines = [`DMG ${wInst.damage}${wInst.pellets ? '×' + wInst.pellets : ''}`, `ROF ${wInst.fireRate.toFixed(2)}s`];
      const magTxt = `MAG ${wInst.mag}  RLD ${wInst.reload.toFixed(1)}s`;
      if(ctx.measureText(magTxt).width <= sw) lines.push(magTxt); else lines.push(`MAG ${wInst.mag}`, `RLD ${wInst.reload.toFixed(1)}s`);
      const lh = lines.length > 3 ? 10 : 13;
      lines.forEach((ln, k)=> ctx.fillText(fitText(ln, sw), sx, y + 53 + k * lh));
    } else {
      ctx.fillStyle = 'rgba(190,215,255,0.16)';
      roundRect(x + 20, y + 44, 30, 30, 8); ctx.fill();
      drawItemIcon(it.data.id, x + 27, y + 51);
      ctx.font = uiFont(10);
      ctx.fillStyle = palette.textLight;
      wrapText(it.data.desc, x + 58, y + 56, cw - 68, 13, 3);
    }
    // price badge (green if affordable, gray if not)
    const canAfford = p.currency >= it.price;
    const B = getShopBadgeRects(c);
    panel(B.price.x, B.price.y, B.price.w, B.price.h, canAfford ? '#2dbba0' : '#2a3a4c', palette.outline, 10, {shadow:false, highlight:false});
    ctx.font = uiFont(12, 'bold');
    ctx.fillStyle = canAfford ? '#041018' : '#8aa0b8';
    ctx.textAlign = 'center';
    ctx.fillText(`$${it.price}`, B.price.x + B.price.w/2, B.price.y + 16);
    ctx.textAlign = 'start';
    // lock badge: bottom-right, never over the price badge
    if(locked){
      const L = B.lock;
      panel(L.x, L.y, L.w, L.h, '#ffd166', palette.outline, 10, {shadow:false, highlight:false});
      ctx.font = uiFont(L.w < 48 ? 9 : 10, 'bold'); ctx.fillStyle = '#2b1e10';
      ctx.textAlign = 'center'; ctx.fillText(L.w < 48 ? 'LOCK' : 'LOCKED', L.x + L.w/2, L.y + 15); ctx.textAlign = 'start';
    }
    ctx.restore();
  }
  return hoverAny;
}

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
    drawGroundShadow(tr.x, tr.y + 22, 18, 6);
    ctx.save();
    ctx.translate(tr.x, tr.y);
    const sway = Math.sin(state.animTime * 1.5 + tr.x * 0.05) * 0.03;
    ctx.rotate(sway);
    if(!drawSprite('tree', 46, null, {anchorY: 0.62})){     // 1:1 with the 64px source art
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
    const flash = e.hitFlash > 0 ? e.hitFlash / 0.1 : 0;
    drawGroundShadow(e.x, e.y + e.r * 0.9 + 2, e.r * 0.95, e.r * 0.35);
    ctx.save();
    ctx.translate(e.x, e.y);
    ctx.scale(wob, wob);
    // yellow "light" enemy (spitter) uses EnemyLight.png, drawn 1:1 with its pixel art
    const useSprite = e.id === 'spitter' && drawSprite('enemyLight', null, 36, {flipX: e.face < 0, flash});
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

    // hp bar (only once damaged, keeps crowds readable)
    const barTop = useSprite ? -22 : -e.r-10;
    if(e.hp < e.maxHp || e.isBoss){
      ctx.fillStyle = palette.outline;
      roundRect(-e.r-2, barTop, e.r*2+4, 6, 3); ctx.fill();
      ctx.fillStyle = e.isBoss ? '#ff6b6b' : '#ff8a5c';
      roundRect(-e.r, barTop+1, (e.r*2) * Math.max(0, e.hp/e.maxHp), 4, 2); ctx.fill();
    }
    if(e.isBoss){
      ctx.fillStyle = '#ffb44c';
      ctx.beginPath(); ctx.moveTo(-6,barTop-8); ctx.lineTo(0,barTop-18); ctx.lineTo(6,barTop-8); ctx.closePath(); ctx.fill();
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

function drawGameOver(){
  ctx.fillStyle='rgba(0,0,0,0.7)';
  ctx.fillRect(0,0,W,H);
  ctx.fillStyle=palette.uiLight;
  panel(W/2-200, 24, 400, 56, palette.uiLight, palette.outline, 14);
  ctx.fillStyle=palette.text;
  ctx.font=uiFont(22,'bold');
  ctx.textAlign='center';
  ctx.fillText('RUN OVER', W/2, 58);
  ctx.textAlign='start';

  const cols = players.length;
  const panelW = Math.min(420, (W - 40 - 20*(cols-1)) / cols);
  const panelH = Math.max(200, Math.min(420, H - 100 - 90));   // leave room for the Restart button
  const startX = (W - (cols * panelW + (cols-1) * 20)) / 2;
  for(let i=0;i<players.length;i++){
    const p = players[i];
    const px = startX + i * (panelW + 20);
    const py = 100;
    panel(px, py, panelW, panelH, palette.uiLight, palette.outline, 12);
    ctx.fillStyle = palette.text;
    ctx.font = uiFont(14,'bold');
    ctx.fillText(`Player ${i+1}`, px+16, py+24);
    ctx.font = uiFont(12);
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
  if(state.phase === 'menu'){
    // menu is DOM; don't paint the in-game HUD behind it
    restartBtn.style.display = 'none';
    if(pauseBtn) pauseBtn.style.display = 'none';
    canvas.style.cursor = 'default';
    return;
  }
  if(state.phase === 'wave' || state.phase === 'gameover') canvas.style.cursor = 'crosshair';
  ctx.save();
  ctx.translate(camera.x, camera.y);
  drawEffects();
  drawPlayers();
  ctx.restore();
  if(state.phase !== 'gameover') drawHUD();   // the run-over panels replace the HUD
  drawWaveBanner();
  drawUpgradeSelector();
  drawShop();
  if(state.paused){
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.fillRect(0,0,W,H);
    panel(W/2-120, H/2-40, 240, 80, palette.uiLight, palette.outline, 14);
    ctx.fillStyle = palette.text;
    ctx.font = uiFont(18,'bold');
    ctx.textAlign = 'center';
    ctx.fillText('PAUSED', W/2, H/2);
    ctx.font = uiFont(12);
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
