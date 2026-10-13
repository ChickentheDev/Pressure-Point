// Pressure Point — core.js (split from game.js for v0.6.1)
// Brotato-lite extended game logic
const canvas = document.getElementById('game');
let ctx = canvas.getContext('2d');   // `let`: WebGLFX.beginWorld/endWorld swaps this to the offscreen world ctx during the world pass

// DOM UI
const menuEl = document.getElementById('menu');
const dangerListEl = document.getElementById('dangerList');
const classListEl = document.getElementById('classList');
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
const webglToggle = document.getElementById('webglToggle');
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
  if(window.WebGLFX) WebGLFX.onResize(W, H, canvas.width, canvas.height, ratio);
}
window.addEventListener('resize', resize);
resize();

// Input handling (keyboard + mouse)
const input = {keys:{}, mx: W/2, my: H/2, mouseDown:false, lastMove:0};
// Space is the fire key in game: stop it from scrolling or activating a focused button (e.g. Pause)
const inGame = () => typeof state !== 'undefined' && state.phase !== 'menu' && (!menuEl || menuEl.style.display === 'none');
window.addEventListener('keydown', e=>{ if(e.key === 'Tab' || (e.key === ' ' && inGame())) e.preventDefault(); input.keys[e.key.toLowerCase()] = true; if(e.code==='ShiftLeft') input.shiftL = true; if(e.code==='ShiftRight') input.shiftR = true; });
window.addEventListener('keyup', e=>{ if(e.key === ' ' && inGame()) e.preventDefault(); input.keys[e.key.toLowerCase()] = false; if(e.code==='ShiftLeft') input.shiftL = false; if(e.code==='ShiftRight') input.shiftR = false; });
canvas.addEventListener('mousemove', e=>{ const r = canvas.getBoundingClientRect(); input.mx = e.clientX - r.left; input.my = e.clientY - r.top; input.lastMove = performance.now()/1000; });
canvas.addEventListener('mousedown', e=>{ input.mouseDown = true; });
window.addEventListener('mouseup', e=>{ input.mouseDown = false; });
// (restartBtn wired in menu.js — resetRun lives in state.js)

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

// Perf: draw() runs every frame and used to write canvas.style.cursor and button style.display
// unconditionally, plus hudP2CardY() forced layout (getBoundingClientRect) per frame. Cursor and
// display only ever change on discrete state transitions, so skip redundant DOM writes (the guards
// read live DOM state, so the game.js and ui.js call sites can't desync each other).
function setCursor(c){ if(canvas.style.cursor !== c) canvas.style.cursor = c; }
function setDisplay(el, v){ if(el && el.style.display !== v) el.style.display = v; }

function roundRect(x, y, w, h, r, g){
  // optional 6th arg lets offscreen pre-renders (panel cache) reuse this on their own context
  g = g || ctx;
  // arcTo() throws IndexSizeError on a negative radius, which would kill the render loop
  w = Math.max(0, w); h = Math.max(0, h);
  const rr = Math.max(0, Math.min(r, w/2, h/2));
  g.beginPath();
  g.moveTo(x+rr, y);
  g.arcTo(x+w, y, x+w, y+h, rr);
  g.arcTo(x+w, y+h, x, y+h, rr);
  g.arcTo(x, y+h, x, y, rr);
  g.arcTo(x, y, x+w, y, rr);
  g.closePath();
}

// Perf: shade() runs per panel()/drawBar call; the result only depends on (hex, amt), so memoize it.
const shadeCache = new Map();
function shade(hex, amt){
  const key = hex + '|' + amt;
  const hit = shadeCache.get(key);
  if(hit !== undefined) return hit;
  let c = hex.startsWith('#') ? hex.slice(1) : hex;
  if(c.length === 3) c = c.split('').map(ch => ch + ch).join('');
  const num = parseInt(c, 16);
  let r = (num >> 16) + amt;
  let g = ((num >> 8) & 0xff) + amt;
  let b = (num & 0xff) + amt;
  r = Math.max(0, Math.min(255, r));
  g = Math.max(0, Math.min(255, g));
  b = Math.max(0, Math.min(255, b));
  const out = `rgb(${r},${g},${b})`;
  shadeCache.set(key, out);
  return out;
}

// Perf: panel() is called every frame (HUD, wave banner, upgrade/shop screens) and used to pay for
// shadowBlur + a fresh linear gradient + shade() string work on every call. The painted result only
// depends on (w,h,fill,stroke,r,shadow,alpha,highlight) — never on x/y — so it is rendered once into
// an offscreen bitmap and blitted per frame. Visually identical (same shadow, gradient, highlight).
const panelCache = new Map();
function panelBitmap(w, h, fill, stroke, r, shadow, alpha, highlight){
  const key = w + '|' + h + '|' + fill + '|' + stroke + '|' + r + '|' + (shadow ? 1 : 0) + '|' + alpha + '|' + (highlight ? 1 : 0);
  let bmp = panelCache.get(key);
  if(!bmp){
    const pad = shadow ? 20 : 2;   // shadowBlur 10 + shadowOffsetY 4 stay inside the padding
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.ceil(w + pad * 2));
    c.height = Math.max(1, Math.ceil(h + pad * 2));
    const g = c.getContext('2d');
    g.save();
    if(shadow){
      g.shadowColor = 'rgba(0,0,0,0.35)';
      g.shadowBlur = 10;
      g.shadowOffsetY = 4;
    }
    g.globalAlpha = alpha;
    const grad = g.createLinearGradient(0, pad, 0, pad + h);
    grad.addColorStop(0, shade(fill, 18));
    grad.addColorStop(1, shade(fill, -14));
    g.fillStyle = grad;
    roundRect(pad, pad, w, h, r, g);
    g.fill();
    g.shadowBlur = 0;
    g.globalAlpha = 1;
    g.lineWidth = 3;
    g.strokeStyle = stroke;
    g.stroke();
    if(highlight){
      g.lineWidth = 2;
      g.strokeStyle = 'rgba(255,255,255,0.28)';
      roundRect(pad + 3, pad + 3, w - 6, h - 6, Math.max(2, r - 2), g);
      g.stroke();
    }
    g.restore();
    bmp = {c, pad};
    if(panelCache.size > 160) panelCache.clear();   // pathological-resize safety; normal play keeps a handful
    panelCache.set(key, bmp);
  }
  return bmp;
}

function panel(x, y, w, h, fill=palette.uiLight, stroke=palette.outline, r=10, opts={}){
  const {shadow=true, alpha=1, highlight=true} = opts;
  const bmp = panelBitmap(w, h, fill, stroke, r, shadow, alpha, highlight);
  ctx.drawImage(bmp.c, x - bmp.pad, y - bmp.pad);
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
    // [brad-ui] v0.56 shop: just under the title/wallet row so the toast never hides the wallet or REROLL
    let top = 8;
    if(window.ShopUI && ShopUI.layout){ const L = ShopUI.layout(); if(L && L.header) top = Math.round(L.header.y + L.header.h + 2); }
    msgEl.style.top = top + 'px'; msgEl.style.bottom = 'auto';
  }
  msgEl.style.display = 'block';
  setTimeout(()=>{ msgEl.style.display = 'none'; }, dur*1000);
}

// Achievement unlock toast — gold banner, more prominent than flashMsg
function achievementToast(a){
  flashMsg(`ACHIEVEMENT: ${a.name} — ${a.desc}`, 3);
  audio.pickup(); setTimeout(()=>audio.buy(), 120);
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
    g.gain.value=vol * (this.volume == null ? 1 : this.volume / 100);
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
    this.applyVolume();
  },
  setVolume(v){
    this.volume = Math.max(0, Math.min(100, v));
    this.applyVolume();
  },
  applyVolume(){
    if(this.bgm && this.bgm.master){ this.bgm.master.gain.value = this.muted ? 0 : 0.03 * (this.volume == null ? 1 : this.volume / 100); }
  },
  startBgm(){
    if(!this.ctx || this.bgm) return;
    const master = this.ctx.createGain();
    master.gain.value = this.muted ? 0 : 0.03 * (this.volume == null ? 1 : this.volume / 100);
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
const state = {
  phase: 'menu', // menu | wave | shop | upgrade | gameover | victory | runwon
  wave: 1,
  waveBanner: 0,
  eliteBanner: 0,
  waveSpawned: 0,
  waveTotal: 10,
  maxWave: 20,
  endless: false,     // true after continuing past wave 20
  bestEndless: parseInt(localStorage.getItem('pp_bestEndless') || '0', 10) || 0,
  danger: 1,
  coop: false,
  spawnTimer: 0,
  unlockedDanger: 1,
  animTime: 0,
  victoryTimer: 0,     // celebration beat after clearing the final wave
  victoryUnlocked: 0,  // danger level unlocked by the victory (0 = already at max)
  classId: 'ironheart',
  weaponId: null,      // starting weapon chosen on the weapon-select step (null = class default)
  menuStep: 'class',   // menu flow: class -> weapon -> danger
  pendingUpgrade: null,
  runKills: 0,         // kills this run (for Run Won / Run Over progress panels)
  runTime: 0,          // seconds this run (for Run Won / Run Over progress panels)
  shopView: 'shop', // shop | stats
  paused: false,
  treeWave: 0,
  waveCompleteTimer: 0,
};

// settings
const SETTINGS_KEY = 'brotato_settings_v1';
// Dev code: PRESSURE unlocks everything + creative mode (god mode, free shop).
let devMode = false;
try{ devMode = localStorage.getItem('pp_devmode') === '1'; }catch(e){}
const DEV_CODE = 'PRESSURE';
function setDevMode(on){
  devMode = on;
  try{ localStorage.setItem('pp_devmode', on ? '1' : '0'); }catch(e){}
  updateDevLabel();
}
function updateDevLabel(){
  const label = document.getElementById('devModeLabel'), btn = document.getElementById('devCodeBtn');
  if(label) label.textContent = devMode ? 'DEV MODE ACTIVE' : '';
  if(btn) btn.textContent = devMode ? 'Disable' : 'Redeem';
}
function redeemDevCode(){
  const input = document.getElementById('devCodeInput');
  if(devMode){ setDevMode(false); if(typeof audio !== 'undefined') audio.click(); return; }
  const v = ((input && input.value) || '').trim().toUpperCase();
  if(v !== DEV_CODE){ if(typeof audio !== 'undefined') audio.deny(); return; }
  // unlock everything: all achievements (unlocks all classes), max meta upgrades
  let changed = false;
  if(typeof ACHIEVEMENTS !== 'undefined' && typeof unlockedAchievements !== 'undefined'){
    for(const a of ACHIEVEMENTS){ if(!unlockedAchievements[a.id]){ unlockedAchievements[a.id] = Date.now(); changed = true; } }
    if(changed){ try{ localStorage.setItem(ACH_KEY, JSON.stringify(unlockedAchievements)); }catch(e){} }
  }
  if(typeof META_UPGRADES !== 'undefined' && typeof metaLevels !== 'undefined'){
    for(const m of META_UPGRADES) metaLevels[m.id] = m.max;
    try{ localStorage.setItem(META_KEY, JSON.stringify(metaLevels)); }catch(e){}
    if(typeof applyMetaUpgrades !== 'undefined' && players[0]) applyMetaUpgrades(players[0]);
  }
  if(input) input.value = '';
  setDevMode(true);
  if(typeof audio !== 'undefined') audio.buy();
}
const settings = { screenShake: true, graphics: 'high', autoShoot: true, mouseAim: true, bgFx: true, particleFx: true, webgl: true, muted: false, volume: 100 };
try{
  const savedSettings = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}');
  if(typeof savedSettings.screenShake === 'boolean') settings.screenShake = savedSettings.screenShake;
  if(['low','medium','high','custom'].includes(savedSettings.graphics)) settings.graphics = savedSettings.graphics;
  if(typeof savedSettings.autoShoot === 'boolean') settings.autoShoot = savedSettings.autoShoot;
  if(typeof savedSettings.mouseAim === 'boolean') settings.mouseAim = savedSettings.mouseAim;
  if(typeof savedSettings.bgFx === 'boolean') settings.bgFx = savedSettings.bgFx;
  if(typeof savedSettings.particleFx === 'boolean') settings.particleFx = savedSettings.particleFx;
  if(typeof savedSettings.webgl === 'boolean') settings.webgl = savedSettings.webgl;
  if(typeof savedSettings.muted === 'boolean') settings.muted = savedSettings.muted;
  if(typeof savedSettings.volume === 'number') settings.volume = Math.max(0, Math.min(100, savedSettings.volume));
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
const muteToggle = document.getElementById('muteToggle');
const volumeSlider = document.getElementById('volumeSlider');
if(typeof audio !== 'undefined'){ audio.setMuted(!!settings.muted); audio.setVolume(settings.volume == null ? 100 : settings.volume); }
if(muteToggle){
  muteToggle.checked = !!settings.muted;
  muteToggle.addEventListener('change', ()=>{ settings.muted = !!muteToggle.checked; if(typeof audio !== 'undefined') audio.setMuted(settings.muted); saveSettings(); });
}
const devCodeBtn = document.getElementById('devCodeBtn');
if(devCodeBtn){ devCodeBtn.addEventListener('click', redeemDevCode); updateDevLabel(); }
if(volumeSlider){
  volumeSlider.value = settings.volume == null ? 100 : settings.volume;
  volumeSlider.addEventListener('input', ()=>{ settings.volume = +volumeSlider.value; if(typeof audio !== 'undefined') audio.setVolume(settings.volume); saveSettings(); });
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
if(webglToggle){
  webglToggle.checked = settings.webgl;
  webglToggle.addEventListener('change', ()=>{
    settings.webgl = !!webglToggle.checked;
    if(window.WebGLFX) WebGLFX.setEnabled(settings.webgl);
    saveSettings();
  });
}

// load/unlock persistence
function rand(min,max){return Math.random()*(max-min)+min}

// Screen shake (toned down in v0.55): every request is scaled, the total is capped and decays faster.
const SHAKE_SCALE = 0.6, SHAKE_MAX = 8, SHAKE_DECAY = 20, SHAKE_PX_PER_UNIT = 0.35;
function addShake(amount){
  if(!settings.screenShake) return;
  camera.shake = Math.min(SHAKE_MAX, camera.shake + amount * SHAKE_SCALE);
}

function updateCamera(dt){
  if(!settings.screenShake){
    camera.shake = 0; camera.x = 0; camera.y = 0;
    return;
  }
  camera.shake = Math.max(0, camera.shake - dt * SHAKE_DECAY);
  const a = Math.random() * Math.PI * 2;
  const m = camera.shake * SHAKE_PX_PER_UNIT;
  camera.x = Math.cos(a) * m;
  camera.y = Math.sin(a) * m;
}

