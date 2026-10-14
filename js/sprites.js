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
  w_pistol:    {src:'assets/weapons/w_pistol.png', crop:[0,0,363,189], pixel:false},
  w_shotgun:   {src:'assets/weapons/w_shotgun.png', crop:[0,0,471,172], pixel:false, fallback:'w_shotgunAlt'},
  w_shotgunAlt:{src:'assets/weapons/w_shotgunAlt.png', crop:[0,0,467,135], pixel:false},
  w_blade:     {src:'assets/weapons/ArcBlade.png',     crop:[4,4,283,382], pixel:false},
  w_smg:       {src:'assets/weapons/w_smg.png', crop:[0,0,448,161], pixel:false},
  w_rifle:     {src:'assets/weapons/w_rifle.png', crop:[0,0,464,172], pixel:false},
  w_heavy:     {src:'assets/weapons/w_heavy.png', crop:[0,0,457,181], pixel:false},
  w_rpg:       {src:'assets/weapons/w_rpg.png', crop:[0,0,476,153], pixel:false},
  w_minigun:   {src:'assets/weapons/w_minigun.png', crop:[0,0,439,204], pixel:false},
  w_harpoon:   {src:'assets/weapons/w_harpoon.png', crop:[0,0,448,158], pixel:false},
  w_dmr:       {src:'assets/weapons/w_dmr.png', crop:[0,0,477,198], pixel:false},
  // [brad-fx] v0.56 pixel art for the five weapons that had none (tools/gen_sprites.py)
  w_flame:     {src:'assets/weapons/w_flame.png',   crop:[0,0,463,170], pixel:false},
  w_arc:       {src:'assets/weapons/weapon_arc.png',     crop:[0,0,30,14], pixel:true},
  w_rail:      {src:'assets/weapons/w_rail.png',    crop:[0,0,439,170], pixel:false},
  w_mine:      {src:'assets/weapons/w_mine.png',    crop:[0,0,347,146], pixel:false},
  w_sprayer:   {src:'assets/weapons/w_sprayer.png', crop:[0,0,429,171], pixel:false},
  w_scatter:   {src:'assets/weapons/w_scatter.png', crop:[0,0,429,165], pixel:false},
  w_crossbow:  {src:'assets/weapons/weapon_crossbow.png',crop:[0,0,32,14], pixel:true},
  w_sniper:    {src:'assets/weapons/w_sniper.png',  crop:[0,0,484,201], pixel:false},
  w_katana:    {src:'assets/weapons/w_katana.png',  crop:[0,0,487,118], pixel:false},
  w_plasma:    {src:'assets/weapons/w_plasma.png',  crop:[0,0,411,167], pixel:false},
  w_grenade:   {src:'assets/weapons/w_grenade.png', crop:[0,0,216,235], pixel:false},
  w_flak:      {src:'assets/weapons/w_flak.png',    crop:[0,0,473,183], pixel:false},
  w_tesla:     {src:'assets/weapons/w_tesla.png',  crop:[0,0,441,224], pixel:false},
  w_esword:    {src:'assets/weapons/w_esword.png',  crop:[0,0,484,134], pixel:false},
  w_mortar:    {src:'assets/weapons/w_mortar.png',  crop:[0,0,323,242], pixel:false},
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
    // directional tracer pointing +x: soft glow, colored body, white-hot core
    const half = 24, len = crit ? 15 : 11, wid = crit ? 5 : 3.5;
    const c = document.createElement('canvas');
    c.width = c.height = half * 2;
    const g = c.getContext('2d');
    g.translate(half, half);
    const gr = g.createRadialGradient(0, 0, 0, 0, 0, half - 6);
    const gc = crit ? '255,209,102' : '255,240,200';
    gr.addColorStop(0, `rgba(${gc},0.5)`);
    gr.addColorStop(1, `rgba(${gc},0)`);
    g.fillStyle = gr;
    g.beginPath(); g.arc(0, 0, half - 6, 0, Math.PI*2); g.fill();
    // tail fading behind (-x)
    const tail = g.createLinearGradient(len, 0, -len, 0);
    tail.addColorStop(0, color);
    tail.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = tail;
    g.beginPath();
    g.ellipse(0, 0, len, wid, 0, 0, Math.PI*2);
    g.fill();
    // white-hot core
    g.fillStyle = 'rgba(255,255,255,0.95)';
    g.beginPath();
    g.ellipse(len*0.25, 0, len*0.55, wid*0.45, 0, 0, Math.PI*2);
    g.fill();
    // bright head
    g.fillStyle = '#fff';
    g.beginPath(); g.arc(len*0.7, 0, wid*0.55, 0, Math.PI*2); g.fill();
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
