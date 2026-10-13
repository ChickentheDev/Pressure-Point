// Pressure Point — webgl.js
// WebGL post-processing compositor (v0.7).
//
// The game keeps drawing with Canvas2D exactly as before, but the WORLD
// (background, entities, effects) renders to an offscreen canvas. That canvas
// is then composited through fullscreen WebGL shaders:
//   1. dynamic 2D lighting (players glow, elites/bosses pulse, flashes pop)
//   2. bloom (bright areas bleed light; quarter-res separable blur)
//   3. animated fog, vignette, film grain, color grade
// HUD, shop, banners and menus draw directly to the visible canvas afterwards,
// so UI stays crisp and unaffected.
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

// programs
let pMain = null, pBright = null, pBlur = null;
let tex = null;                  // full-res world texture
let fboA = null, fboB = null;    // quarter-res ping-pong FBOs for bloom
let buf = null;
let ready = false;
let enabled = true;
let cssW = 0, cssH = 0, ratio = 1;
let qw = 0, qh = 0;              // quarter-res dims

const posArr = new Float32Array(MAX_LIGHTS * 4);
const colArr = new Float32Array(MAX_LIGHTS * 3);

const VERT = [
  'attribute vec2 a_pos;',
  'varying vec2 v_uv;',
  'void main(){ v_uv = a_pos * 0.5 + 0.5; gl_Position = vec4(a_pos, 0.0, 1.0); }',
].join('\n');

// --- main composite: lighting + bloom + fog + vignette + grain + grade ---
const FRAG_MAIN = [
  'precision mediump float;',
  'varying vec2 v_uv;',
  'uniform sampler2D u_tex;',
  'uniform sampler2D u_bloom;',
  'uniform vec2 u_res;',
  'uniform vec4 u_lights[' + MAX_LIGHTS + '];',
  'uniform vec3 u_lightCol[' + MAX_LIGHTS + '];',
  'uniform int u_count;',
  'uniform float u_ambient;',
  'uniform float u_time;',
  'uniform float u_bloomStrength;',
  'float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }',
  'float vnoise(vec2 p){',
  '  vec2 i = floor(p); vec2 f = fract(p);',
  '  vec2 u = f * f * (3.0 - 2.0 * f);',
  '  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),',
  '             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);',
  '}',
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
  '  vec3 bloom = texture2D(u_bloom, v_uv).rgb;',
  '  col += bloom * u_bloomStrength;',
  '  float fog = vnoise(px * 0.004 + vec2(u_time * 0.016, u_time * 0.009)) * 0.6',
  '            + vnoise(px * 0.010 - vec2(u_time * 0.011, u_time * 0.005)) * 0.4;',
  '  fog = smoothstep(0.48, 0.9, fog);',
  '  col = mix(col, vec3(0.42, 0.50, 0.62) * (0.35 + li * 0.65), fog * 0.14);',
  '  vec2 q = v_uv - 0.5;',
  '  col *= clamp(1.0 - dot(q, q) * 0.55, 0.0, 1.0);',
  '  float lum = dot(col, vec3(0.3333));',
  '  col = mix(col * vec3(0.94, 0.98, 1.08), col * vec3(1.06, 1.00, 0.94), clamp(lum * 1.4, 0.0, 1.0));',
  '  col += (hash(v_uv * u_res + fract(u_time) * 61.7) - 0.5) * 0.032;',
  '  gl_FragColor = vec4(col, 1.0);',
  '}',
].join('\n');

// --- bright extract (quarter res) ---
const FRAG_BRIGHT = [
  'precision mediump float;',
  'varying vec2 v_uv;',
  'uniform sampler2D u_tex;',
  'uniform float u_threshold;',
  'void main(){',
  '  vec3 col = texture2D(u_tex, v_uv).rgb;',
  '  float lum = dot(col, vec3(0.3333));',
  '  float k = smoothstep(u_threshold, u_threshold + 0.28, lum);',
  '  gl_FragColor = vec4(col * k, 1.0);',
  '}',
].join('\n');

// --- separable gaussian blur ---
const FRAG_BLUR = [
  'precision mediump float;',
  'varying vec2 v_uv;',
  'uniform sampler2D u_tex;',
  'uniform vec2 u_dir;',
  'void main(){',
  '  vec3 col = texture2D(u_tex, v_uv).rgb * 0.2270270270;',
  '  vec2 o1 = u_dir * 1.3846153846;',
  '  vec2 o2 = u_dir * 3.2307692308;',
  '  col += texture2D(u_tex, v_uv + o1).rgb * 0.3162162162;',
  '  col += texture2D(u_tex, v_uv - o1).rgb * 0.3162162162;',
  '  col += texture2D(u_tex, v_uv + o2).rgb * 0.0702702703;',
  '  col += texture2D(u_tex, v_uv - o2).rgb * 0.0702702703;',
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

function makeProg(fsSrc, uniforms){
  const vs = compile(gl.VERTEX_SHADER, VERT);
  const fs = compile(gl.FRAGMENT_SHADER, fsSrc);
  if(!vs || !fs) return null;
  const p = gl.createProgram();
  gl.attachShader(p, vs);
  gl.attachShader(p, fs);
  gl.linkProgram(p);
  if(!gl.getProgramParameter(p, gl.LINK_STATUS)) return null;
  const U = {};
  for(const n of uniforms) U[n] = gl.getUniformLocation(p, n);
  U._prog = p;
  U._loc = gl.getAttribLocation(p, 'a_pos');
  return U;
}

function useProg(U){
  gl.useProgram(U._prog);
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.enableVertexAttribArray(U._loc);
  gl.vertexAttribPointer(U._loc, 2, gl.FLOAT, false, 0, 0);
}

function makeTex(){
  const t = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, t);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  return t;
}

function makeFBO(w, h){
  const t = makeTex();
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
  const f = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, f);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  return {fbo: f, tex: t, w, h};
}

function buildPipeline(){
  pMain = makeProg(FRAG_MAIN, ['u_tex','u_bloom','u_res','u_lights','u_lightCol','u_count','u_ambient','u_time','u_bloomStrength']);
  pBright = makeProg(FRAG_BRIGHT, ['u_tex','u_threshold']);
  pBlur = makeProg(FRAG_BLUR, ['u_tex','u_dir']);
  if(!pMain || !pBright || !pBlur) return false;
  buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 3,-1, -1,3]), gl.STATIC_DRAW);
  tex = makeTex();
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
  fboA = makeFBO(4, 4);
  fboB = makeFBO(4, 4);
  return true;
}

function sizeBloom(){
  qw = Math.max(4, Math.floor(glc.width / 4));
  qh = Math.max(4, Math.floor(glc.height / 4));
  for(const f of [fboA, fboB]){
    gl.bindTexture(gl.TEXTURE_2D, f.tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, qw, qh, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    f.w = qw; f.h = qh;
  }
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
    if(typeof players !== 'undefined'){
      for(const p of players){
        if(!p || p.dead || p.hp <= 0) continue;
        pushLight(p.x, p.y, 300, 0.95, [1.0, 0.93, 0.78]);
      }
    }
    if(typeof enemies !== 'undefined'){
      for(const e of enemies){
        if(e.isBoss) pushLight(e.x, e.y, 360, 0.95 + 0.25 * Math.sin(t * 5), [1.0, 0.25, 0.45]);
        else if(e.elite) pushLight(e.x, e.y, 210, 0.60 + 0.20 * Math.sin(t * 5 + e.x * 0.05), [1.0, 0.45, 0.15]);
        if(lights.length >= MAX_LIGHTS - 6) break;
      }
    }
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
    glc.addEventListener('webglcontextrestored', () => { if(buildPipeline()){ sizeBloom(); ready = true; } }, false);
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
  sizeBloom();
}

function beginWorld(){
  ctx = wctx;
  wctx.clearRect(0, 0, cssW, cssH);
}

function endWorld(){
  ctx = sctx;
  if(!ready || !gl) return;
  try{
  const now = performance.now() / 1000;

  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, world);

  gl.bindFramebuffer(gl.FRAMEBUFFER, fboA.fbo);
  gl.viewport(0, 0, qw, qh);
  useProg(pBright);
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.uniform1i(pBright.u_tex, 0);
  gl.uniform1f(pBright.u_threshold, 0.62);
  gl.drawArrays(gl.TRIANGLES, 0, 3);

  let src = fboA, dst = fboB;
  for(let i = 0; i < 2; i++){
    for(let d = 0; d < 2; d++){
      gl.bindFramebuffer(gl.FRAMEBUFFER, dst.fbo);
      gl.viewport(0, 0, qw, qh);
      useProg(pBlur);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, src.tex);
      gl.uniform1i(pBlur.u_tex, 0);
      if(d === 0) gl.uniform2f(pBlur.u_dir, 1 / qw, 0);
      else gl.uniform2f(pBlur.u_dir, 0, 1 / qh);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      const tmp = src; src = dst; dst = tmp;
    }
  }

  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.viewport(0, 0, glc.width, glc.height);
  useProg(pMain);
  collectLights();
  const n = Math.min(lights.length, MAX_LIGHTS);
  for(let i = 0; i < n; i++){
    const L = lights[i];
    posArr[i*4] = L.x; posArr[i*4+1] = L.y; posArr[i*4+2] = L.r; posArr[i*4+3] = L.i;
    colArr[i*3] = L.c[0]; colArr[i*3+1] = L.c[1]; colArr[i*3+2] = L.c[2];
  }
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.activeTexture(gl.TEXTURE1);
  gl.bindTexture(gl.TEXTURE_2D, src.tex);
  gl.uniform1i(pMain.u_tex, 0);
  gl.uniform1i(pMain.u_bloom, 1);
  gl.uniform2f(pMain.u_res, cssW, cssH);
  gl.uniform4fv(pMain.u_lights, posArr);
  gl.uniform3fv(pMain.u_lightCol, colArr);
  gl.uniform1i(pMain.u_count, n);
  gl.uniform1f(pMain.u_ambient, 0.52);
  gl.uniform1f(pMain.u_time, now);
  gl.uniform1f(pMain.u_bloomStrength, 0.55);
  gl.drawArrays(gl.TRIANGLES, 0, 3);

  sctx.save();
  sctx.setTransform(1, 0, 0, 1, 0, 0);
  sctx.drawImage(glc, 0, 0);
  sctx.restore();
  }catch(err){
    // v0.7.0.2: the world canvas could not be uploaded as a GL texture.
    // On file:// play, local sprite images taint the canvas and WebGL refuses
    // tainted sources (SecurityError). Permanently fall back to plain Canvas2D.
    killGL();
  }
}

// Permanently disable the WebGL compositor; the game keeps running on Canvas2D.
function killGL(){
  ready = false;
  if(gl){
    try{ const ext = gl.getExtension('WEBGL_lose_context'); if(ext) ext.loseContext(); }catch(_){}
    gl = null;
  }
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

try{
  if(typeof canvas !== 'undefined' && typeof ctx !== 'undefined' && init(canvas, ctx)){
    const r = window.devicePixelRatio || 1;
    onResize(typeof W !== 'undefined' ? W : 800, typeof H !== 'undefined' ? H : 600,
             canvas.width, canvas.height, r);
  }
}catch(e){}

window.WebGLFX = { init, onResize, beginWorld, endWorld, active, setEnabled };
})();
