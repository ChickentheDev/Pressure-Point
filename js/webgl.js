// Pressure Point — webgl.js
// WebGL post-processing compositor (v0.6.9).
//
// The game keeps drawing with Canvas2D exactly as before, but the WORLD
// (background, entities, effects) renders to an offscreen canvas. That canvas
// is then composited through a fullscreen WebGL shader — dynamic 2D lighting,
// vignette, color grade — onto a second offscreen canvas, which is blitted to
// the visible canvas. HUD, shop, banners and menus draw directly to the visible
// canvas afterwards, so UI stays crisp and unaffected by the lighting.
//
// Falls back to plain Canvas2D when WebGL is unavailable or disabled in
// settings (Lighting toggle). Toggle applies immediately, no reload needed.
(function(){
'use strict';

const MAX_LIGHTS = 24;

let screen = null;        // visible canvas
let sctx = null;          // visible canvas 2d context
let world = null, wctx = null;   // offscreen world canvas + ctx (game draws here)
let glc = null, gl = null;       // offscreen WebGL canvas + context
let prog = null, tex = null, buf = null;
let U = {};
let ready = false;        // GL pipeline fully built
let enabled = true;       // user setting (settings.webgl)
let cssW = 0, cssH = 0, ratio = 1;

const posArr = new Float32Array(MAX_LIGHTS * 4);
const colArr = new Float32Array(MAX_LIGHTS * 3);

const VERT = [
  'attribute vec2 a_pos;',
  'varying vec2 v_uv;',
  'void main(){ v_uv = a_pos * 0.5 + 0.5; gl_Position = vec4(a_pos, 0.0, 1.0); }',
].join('\n');

// u_lights[i]: xy = position (css px), z = radius (css px), w = intensity
const FRAG = [
  'precision mediump float;',
  'varying vec2 v_uv;',
  'uniform sampler2D u_tex;',
  'uniform vec2 u_res;',
  'uniform vec4 u_lights[' + MAX_LIGHTS + '];',
  'uniform vec3 u_lightCol[' + MAX_LIGHTS + '];',
  'uniform int u_count;',
  'uniform float u_ambient;',
  'uniform float u_time;',
  'void main(){',
  '  vec3 col = texture2D(u_tex, v_uv).rgb;',
  '  vec2 px = vec2(v_uv.x * u_res.x, (1.0 - v_uv.y) * u_res.y);',
  '  float aspect = u_res.x / u_res.y;',
  '  float li = u_ambient;',
  '  vec3 tint = vec3(0.0);',
  '  for(int i = 0; i < ' + MAX_LIGHTS + '; i++){',
  '    if(i >= u_count) break;',
  '    vec4 L = u_lights[i];',
  '    vec2 d = px - L.xy;',
  '    d.x *= aspect;',
  '    float dist = length(d);',
  '    float f = clamp(1.0 - dist / L.z, 0.0, 1.0);',
  '    f = f * f * (3.0 - 2.0 * f);',
  '    li += f * L.w;',
  '    tint += u_lightCol[i] * (f * L.w);',
  '  }',
  '  li = clamp(li, 0.0, 1.7);',
  '  col *= li;',
  '  col += tint * 0.30;',
  // gentle vignette (kept subtle; the HUD is drawn after the pass anyway)
  '  vec2 q = v_uv - 0.5;',
  '  col *= clamp(1.0 - dot(q, q) * 0.55, 0.0, 1.0);',
  // subtle grade: cool shadows, warm highlights
  '  float lum = dot(col, vec3(0.3333));',
  '  col = mix(col * vec3(0.94, 0.98, 1.08), col * vec3(1.06, 1.00, 0.94), clamp(lum * 1.4, 0.0, 1.0));',
  '  gl_FragColor = vec4(col, 1.0);',
  '}',
].join('\n');

function compile(type, src){
  const s = gl.createShader(type);
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if(!gl.getShaderParameter(s, gl.COMPILE_STATUS)){ gl.deleteShader(s); return null; }
  return s;
}

function buildPipeline(){
  const vs = compile(gl.VERTEX_SHADER, VERT);
  const fs = compile(gl.FRAGMENT_SHADER, FRAG);
  if(!vs || !fs) return false;
  prog = gl.createProgram();
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  if(!gl.getProgramParameter(prog, gl.LINK_STATUS)) return false;
  gl.useProgram(prog);
  buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 3,-1, -1,3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, 'a_pos');
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const names = ['u_tex','u_res','u_lights','u_lightCol','u_count','u_ambient','u_time'];
  for(const n of names) U[n] = gl.getUniformLocation(prog, n);
  tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
  return true;
}

// --- light collection -------------------------------------------------------
function hexRgb(hex){
  const m = /^#?([0-9a-f]{6})$/i.exec(hex || '');
  if(!m) return [1, 0.85, 0.4];
  const v = parseInt(m[1], 16);
  return [((v >> 16) & 255) / 255, ((v >> 8) & 255) / 255, (v & 255) / 255];
}

const lights = [];
function pushLight(x, y, r, i, c){
  if(lights.length >= MAX_LIGHTS) return;
  lights.push({x, y, r, i, c});
}

function collectLights(){
  lights.length = 0;
  const t = performance.now() / 1000;
  try{
    // players: soft warm light so you can always see your surroundings
    if(typeof players !== 'undefined'){
      for(const p of players){
        if(!p || p.dead || p.hp <= 0) continue;
        pushLight(p.x, p.y, 300, 0.95, [1.0, 0.93, 0.78]);
      }
    }
    // elites and bosses glow menacingly
    if(typeof enemies !== 'undefined'){
      for(const e of enemies){
        if(e.isBoss) pushLight(e.x, e.y, 360, 0.95 + 0.25 * Math.sin(t * 5), [1.0, 0.25, 0.45]);
        else if(e.elite) pushLight(e.x, e.y, 210, 0.60 + 0.20 * Math.sin(t * 5 + e.x * 0.05), [1.0, 0.45, 0.15]);
        if(lights.length >= MAX_LIGHTS - 6) break;
      }
    }
    // muzzle flashes + explosion rings from FX
    if(window.FX && FX.getLights){
      const fl = FX.getLights();
      for(const f of fl){
        const k = Math.max(0, f.life / f.max);
        if(f.kind === 'ring') pushLight(f.x, f.y, 260, 1.2 * k, hexRgb(f.color));
        else pushLight(f.x, f.y, f.big ? 230 : 140, 1.0 * k, hexRgb(f.color));
        if(lights.length >= MAX_LIGHTS) break;
      }
    }
  }catch(e){}
  return lights;
}

// --- public API ---------------------------------------------------------------
function init(canvas, ctx2d){
  screen = canvas;
  sctx = ctx2d;
  try{
    if(typeof settings !== 'undefined' && typeof settings.webgl === 'boolean') enabled = settings.webgl;
  }catch(e){}
  if(!enabled) return false;
  try{
    glc = document.createElement('canvas');
    gl = glc.getContext('webgl', {antialias:false, alpha:false, depth:false, stencil:false, powerPreference:'high-performance'})
      || glc.getContext('experimental-webgl');
    if(!gl) return false;
    if(!buildPipeline()){ gl = null; return false; }
    world = document.createElement('canvas');
    wctx = world.getContext('2d');
    glc.addEventListener('webglcontextlost', e => { e.preventDefault(); ready = false; }, false);
    glc.addEventListener('webglcontextrestored', () => { if(buildPipeline()) ready = true; }, false);
    ready = true;
    return true;
  }catch(e){ gl = null; ready = false; return false; }
}

function onResize(w, h, bw, bh, r){
  cssW = w; cssH = h; ratio = r;
  if(!ready) return;
  world.width = Math.max(1, bw); world.height = Math.max(1, bh);
  wctx.setTransform(r, 0, 0, r, 0, 0);
  glc.width = Math.max(1, bw); glc.height = Math.max(1, bh);
  gl.viewport(0, 0, glc.width, glc.height);
}

// draw() calls this before painting the world; returns the ctx to draw with
function beginWorld(){
  ctx = wctx;   // global ctx swap (core.js declares `let ctx`)
  wctx.clearRect(0, 0, cssW, cssH);
}

function endWorld(){
  ctx = sctx;   // restore global ctx for HUD / menus
  if(!ready || !gl) return;
  collectLights();
  const n = Math.min(lights.length, MAX_LIGHTS);
  for(let i = 0; i < n; i++){
    const L = lights[i];
    posArr[i*4] = L.x; posArr[i*4+1] = L.y; posArr[i*4+2] = L.r; posArr[i*4+3] = L.i;
    colArr[i*3] = L.c[0]; colArr[i*3+1] = L.c[1]; colArr[i*3+2] = L.c[2];
  }
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, world);
  gl.useProgram(prog);
  gl.uniform2f(U.u_res, cssW, cssH);
  gl.uniform4fv(U.u_lights, posArr);
  gl.uniform3fv(U.u_lightCol, colArr);
  gl.uniform1i(U.u_count, n);
  gl.uniform1f(U.u_ambient, 0.52);
  gl.uniform1f(U.u_time, performance.now() / 1000);
  gl.uniform1i(U.u_tex, 0);
  gl.drawArrays(gl.TRIANGLES, 0, 3);
  // blit the shaded frame to the visible canvas (1:1, no resample)
  sctx.save();
  sctx.setTransform(1, 0, 0, 1, 0, 0);
  sctx.drawImage(glc, 0, 0);
  sctx.restore();
}

function active(){ return ready && enabled; }
function setEnabled(v){
  enabled = !!v;
  if(enabled && !ready && screen){
    if(init(screen, sctx)){
      const r = window.devicePixelRatio || 1;
      onResize(cssW || 800, cssH || 600, screen.width, screen.height, r);
    }
  }
  try{ if(typeof settings !== 'undefined'){ settings.webgl = enabled; } }catch(e){}
}

// auto-init on script load (webgl.js loads after core.js, so canvas/ctx/settings exist)
try{
  if(typeof canvas !== 'undefined' && typeof ctx !== 'undefined' && init(canvas, ctx)){
    const r = window.devicePixelRatio || 1;
    onResize(typeof W !== 'undefined' ? W : 800, typeof H !== 'undefined' ? H : 600,
             canvas.width, canvas.height, r);
  }
}catch(e){}

window.WebGLFX = { init, onResize, beginWorld, endWorld, active, setEnabled };
})();
