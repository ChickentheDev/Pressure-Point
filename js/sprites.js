// Pressure Point — sprites.js (split from game.js for v0.6.1)
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
  map:         {src:'assets/Map.png',          crop:[0,0,512,512], pixel:true},
  w_pistol:    {src:'assets/weapons/CobaltPistol.png', crop:[69,279,893,480], pixel:false},
  w_shotgun:   {src:'assets/weapons/GravShotgun.png',  crop:[80,88,345,310],  pixel:false, fallback:'w_shotgunAlt'},
  w_shotgunAlt:{src:'assets/weapons/Shotgun.png',      crop:[46,25,147,169],  pixel:false},
  w_blade:     {src:'assets/weapons/ArcBlade.png',     crop:[103,52,283,382], pixel:false},
  w_smg:       {src:'assets/weapons/ViperSMG.png',     crop:[32,95,441,248],  pixel:false},
  w_rifle:     {src:'assets/weapons/Pulserifle.png',   crop:[0,8,127,137],    pixel:false},
  w_heavy:     {src:'assets/weapons/TitanCannon.png',  crop:[23,26,21,6],     pixel:true},
  w_rpg:       {src:'assets/weapons/RPG.png',          crop:[17,20,33,10],    pixel:true},
  w_minigun:   {src:'assets/weapons/Minigun.png',      crop:[2,5,117,108],    pixel:false},
  w_harpoon:   {src:'assets/weapons/Harpoongun.png',   crop:[8,24,48,18],     pixel:true},
  w_dmr:       {src:'assets/weapons/LongshotDMR.png',  crop:[2,24,58,16],     pixel:true},
  // [brad-fx] v0.56 pixel art for the five weapons that had none (tools/gen_sprites.py)
  w_flame:     {src:'assets/weapons/weapon_flame.png',   crop:[0,0,32,14], pixel:true},
  w_arc:       {src:'assets/weapons/weapon_arc.png',     crop:[0,0,30,14], pixel:true},
  w_rail:      {src:'assets/weapons/weapon_rail.png',    crop:[0,0,38,12], pixel:true},
  w_mine:      {src:'assets/weapons/weapon_mine.png',    crop:[0,0,28,16], pixel:true},
  w_sprayer:   {src:'assets/weapons/weapon_sprayer.png', crop:[0,0,30,14], pixel:true},
  w_scatter:   {src:'assets/weapons/weapon_scatter.png', crop:[0,0,32,14], pixel:true},
  w_crossbow:  {src:'assets/weapons/weapon_crossbow.png',crop:[0,0,32,14], pixel:true},
  w_sniper:    {src:'assets/weapons/weapon_sniper.png',  crop:[0,0,32,14], pixel:true},
  w_katana:    {src:'assets/weapons/weapon_katana.png',  crop:[0,0,32,14], pixel:true},
  w_plasma:    {src:'assets/weapons/weapon_plasma.png',  crop:[0,0,32,14], pixel:true},
  w_grenade:   {src:'assets/weapons/weapon_grenade.png', crop:[0,0,32,14], pixel:true},
  w_flak:      {src:'assets/weapons/weapon_flak.png',    crop:[0,0,32,14], pixel:true},
  w_tesla:     {src:'assets/weapons/weapon_tesla.png',   crop:[0,0,32,14], pixel:true},
  w_esword:    {src:'assets/weapons/weapon_esword.png',  crop:[0,0,32,14], pixel:true},
  w_mortar:    {src:'assets/weapons/weapon_mortar.png',  crop:[0,0,32,14], pixel:true},
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
// Perf: bullet look-up table for drawEffects. The disc color set is small (one per weapon color),
// so each variant is rendered once and reused; see the bullets loop in drawEffects().
const bulletSpriteCache = new Map();
function bulletSprite(color, crit){
  const key = color + '|' + (crit ? 1 : 0);
  let s = bulletSpriteCache.get(key);
  if(!s){
    const half = crit ? 22 : 18;
    const c = document.createElement('canvas');
    c.width = c.height = half * 2;
    const g = c.getContext('2d');
    const glowR = crit ? 13 : 10;
    const gr = g.createRadialGradient(half, half, 0, half, half, glowR);
    // same glow hues/alphas the old shadowBlur pass used
    const gc = crit ? '255,209,102' : '255,255,255';
    const ga = crit ? 0.7 : 0.35;
    gr.addColorStop(0, `rgba(${gc},${ga})`);
    gr.addColorStop(1, `rgba(${gc},0)`);
    g.fillStyle = gr;
    g.beginPath(); g.arc(half, half, glowR, 0, Math.PI*2); g.fill();
    g.fillStyle = color;
    g.beginPath(); g.arc(half, half, crit ? 4 : 3, 0, Math.PI*2); g.fill();
    s = {c, half};
    if(bulletSpriteCache.size > 64) bulletSpriteCache.clear();
    bulletSpriteCache.set(key, s);
  }
  return s;
}
// in-hand length (px) for each weapon sprite, keeps weapons visually consistent regardless of PNG size
const weaponHandLength = { pistol:20, blade:24, smg:26, rifle:28, shotgun:28, harpoon:30, dmr:32, heavy:30, rpg:32, minigun:30,
  flame:30, arc:28, rail:36, mine:26, sprayer:28 };   // [brad-fx] last row: v0.56 weapon art

// UI font helper so every canvas screen uses the same family
