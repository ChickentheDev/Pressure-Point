#!/usr/bin/env python3
"""Generates the v0.56 pixel-art sprite sheets in assets/sprites/ (Brad, graphics division).

Every sheet is drawn on a small pixel grid with flat colour "materials", then an automatic pass adds
a 1px dark outline and a light/dark rim per material (light on the top-left edge, dark on the
bottom-right edge), which is the look of the original PlayerDown/EnemyLight art.
Frames are laid out left to right. The game draws them at 2x with nearest-neighbour scaling, so one
art pixel = 2 screen pixels, and the body width in art pixels equals the hitbox radius in game px
(player r=14 -> 14 art px wide body = 28 px = hitbox diameter).

Run:  python3 tools/gen_sprites.py   (needs Pillow)
"""
import os, math, json
from PIL import Image

OUT = os.path.join(os.path.dirname(__file__), '..', 'assets', 'sprites')
OUTLINE = (8, 10, 16, 255)

def hx(h, a=255):
    h = h.lstrip('#'); return (int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16), a)

class Grid:
    """A frame: mat[y][x] = material name or None; det = detail pixels drawn after shading."""
    def __init__(s, w, h):
        s.w, s.h = w, h
        s.mat = [[None]*w for _ in range(h)]
        s.det = {}
    def put(s, x, y, m):
        x, y = int(x), int(y)
        if 0 <= x < s.w and 0 <= y < s.h: s.mat[y][x] = m
    def rect(s, x0, y0, x1, y1, m):            # inclusive
        for y in range(int(y0), int(y1)+1):
            for x in range(int(x0), int(x1)+1): s.put(x, y, m)
    def ell(s, cx, cy, rx, ry, m):
        for y in range(s.h):
            for x in range(s.w):
                if ((x+0.5-cx)/rx)**2 + ((y+0.5-cy)/ry)**2 <= 1.0: s.put(x, y, m)
    def rell(s, cx, cy, rx, ry, ang, m):        # rotated ellipse
        ca, sa = math.cos(ang), math.sin(ang)
        for y in range(s.h):
            for x in range(s.w):
                dx, dy = x + 0.5 - cx, y + 0.5 - cy
                u, v = dx * ca + dy * sa, -dx * sa + dy * ca
                if (u / rx) ** 2 + (v / ry) ** 2 <= 1.0: s.put(x, y, m)
    def d(s, x, y, col):                        # detail pixel (no shading, no outline change)
        x, y = int(x), int(y)
        if 0 <= x < s.w and 0 <= y < s.h: s.det[(x, y)] = col
    def drect(s, x0, y0, x1, y1, col):
        for y in range(int(y0), int(y1)+1):
            for x in range(int(x0), int(x1)+1): s.d(x, y, col)
    def line(s, x0, y0, x1, y1, m):            # 1px line of a material
        n = int(max(abs(x1 - x0), abs(y1 - y0))) or 1
        for k in range(n + 1): s.put(round(x0 + (x1 - x0) * k / n), round(y0 + (y1 - y0) * k / n), m)
    def dline(s, x0, y0, x1, y1, col):         # 1px detail line
        n = int(max(abs(x1 - x0), abs(y1 - y0))) or 1
        for k in range(n + 1): s.d(round(x0 + (x1 - x0) * k / n), round(y0 + (y1 - y0) * k / n), col)
    def render(s, ramps, outline=True, outline_col=None):
        img = Image.new('RGBA', (s.w, s.h), (0, 0, 0, 0)); px = img.load()
        filled = lambda x, y: 0 <= x < s.w and 0 <= y < s.h and s.mat[y][x] is not None
        same = lambda x, y, m: 0 <= x < s.w and 0 <= y < s.h and s.mat[y][x] == m
        for y in range(s.h):
            for x in range(s.w):
                m = s.mat[y][x]
                if m is None: continue
                lo, mid, hi = ramps[m]
                if not same(x, y-1, m) or not same(x-1, y, m): c = hi
                elif not same(x, y+1, m) or not same(x+1, y, m): c = lo
                else: c = mid
                if not filled(x, y+1): c = lo
                px[x, y] = hx(c)
        if outline:
            for y in range(s.h):
                for x in range(s.w):
                    if s.mat[y][x] is None and any(filled(x+dx, y+dy) for dx, dy in ((1,0),(-1,0),(0,1),(0,-1))):
                        px[x, y] = outline_col or OUTLINE
        for (x, y), col in s.det.items(): px[x, y] = hx(col) if isinstance(col, str) else col
        return img

def sheet(frames, ramps, name, outline=True, outline_col=None):
    imgs = [f.render(ramps, outline, outline_col) for f in frames]
    w, h = imgs[0].size
    out = Image.new('RGBA', (w*len(imgs), h), (0, 0, 0, 0))
    for i, im in enumerate(imgs): out.paste(im, (i*w, 0))
    out.save(os.path.join(OUT, name))
    return {'src': 'assets/sprites/' + name, 'fw': w, 'fh': h, 'frames': len(imgs)}

# ------------------------------------------------------------------ player ----
PLAYER_PAL = {
    'p1': {'suit': ('#2350b8', '#3f8cff', '#8fd0ff'), 'eye': '#9ffcff', 'acc': '#ffb44c'},
    'p2': {'suit': ('#a12a3a', '#ff5d5d', '#ffb0a0'), 'eye': '#fff1a8', 'acc': '#6ef2b1'},
}
COMMON = {'boot': ('#141a26', '#2a3346', '#46536b'), 'pack': ('#3b4656', '#5c6b80', '#8796ab'),
          'visor': ('#0b1420', '#0f1a2a', '#1d3047'), 'belt': ('#141a26', '#20293a', '#34405a')}

def player_frame(view, f, pal):
    g = Grid(16, 21)
    up = 1 if f in (1, 3) else 0                       # passing frames: body rises 1px
    lift_l = f == 2; lift_r = f == 0                   # which leg is lifted (shorter)
    swing = 0 if f in (1, 3) else (1 if f == 0 else -1)
    oy = -up
    if view in ('down', 'up'):
        # legs
        g.rect(4, 15+oy, 6, (17 if lift_l else 18), 'suit'); g.rect(4, (18 if lift_l else 19), 6, (18 if lift_l else 19), 'boot')
        g.rect(9, 15+oy, 11, (17 if lift_r else 18), 'suit'); g.rect(9, (18 if lift_r else 19), 11, (18 if lift_r else 19), 'boot')
        # arms (swing opposite to legs)
        g.rect(1, 11+oy+swing, 2, 14+oy+swing, 'suit'); g.rect(13, 11+oy-swing, 14, 14+oy-swing, 'suit')
        # torso
        g.rect(3, 10+oy, 12, 15+oy, 'suit')
        g.rect(3, 14+oy, 12, 14+oy, 'belt')
        if view == 'up':
            g.rect(4, 9+oy, 11, 14+oy, 'pack')
        # helmet
        g.ell(8, 6+oy, 7, 5.6, 'suit')
        if view == 'down':
            g.rect(3, 5+oy, 12, 7+oy, 'visor')
            g.drect(4, 6+oy, 5, 6+oy, pal['eye']); g.drect(10, 6+oy, 11, 6+oy, pal['eye'])
            g.d(4, 5+oy, '#ffffff'); g.d(10, 5+oy, '#ffffff')
            g.d(7, 14+oy, pal['acc']); g.d(8, 14+oy, pal['acc'])          # buckle
            g.d(7, 11+oy, pal['acc'])                                        # chest light
        else:
            g.d(7, 11+oy, pal['acc']); g.d(8, 11+oy, pal['acc'])            # pack lights
            g.d(10, 12+oy, '#ff5d5d')
            g.drect(6, 2+oy, 9, 2+oy, '#ffffff40')
    else:  # side, facing right
        if f in (1, 3):
            g.rect(6, 15+oy, 8, 18, 'suit'); g.rect(6, 19, 9, 19, 'boot')
        else:
            g.rect(8, 15+oy, 10, 18, 'suit'); g.rect(9, 19, 11, 19, 'boot')     # front leg forward
            g.rect(4, 15+oy, 6, 17, 'suit'); g.rect(3, 18, 5, 18, 'boot')       # back leg behind
        g.rect(2, 10+oy, 5, 14+oy, 'pack')                                      # backpack
        g.rect(5, 10+oy, 11, 15+oy, 'suit')
        g.rect(5, 14+oy, 11, 14+oy, 'belt')
        g.ell(8, 6+oy, 6.2, 5.6, 'suit')
        g.rect(9, 5+oy, 13, 7+oy, 'visor')
        g.drect(11, 6+oy, 12, 6+oy, pal['eye']); g.d(11, 5+oy, '#ffffff')
        ax = 8 + swing
        g.rect(ax, 11+oy, ax+1, 14+oy, 'suit')                                  # near arm
        g.d(3, 11+oy, pal['acc'])
    return g

def gen_player():
    meta = {}
    for pid, pal in PLAYER_PAL.items():
        ramps = dict(COMMON); ramps['suit'] = pal['suit']
        for view in ('down', 'up', 'side'):
            meta[f'{pid}_{view}'] = sheet([player_frame(view, f, pal) for f in range(4)], ramps, f'player_{pid}_{view}.png')
    return meta

# ------------------------------------------------------------------ enemies ---
# v0.56 enemy set (original art; silhouettes inspired by Sam's reference sheet, nothing traced):
# raptor runner, chomping dino-head bruiser, mosquito spitter, spiked sandworm boss. All face right.
INK = hx('#1e1612')
def raptor(f):                       # runner, r=10: ~10px torso, 4-frame run cycle
    g = Grid(20, 20); b = 1 if f in (1, 3) else 0
    # legs (behind the body): stride positions per frame
    strides = [((6, 17), (11, 15)), ((8, 16), (9, 16)), ((11, 17), (6, 15)), ((9, 16), (8, 16))][f]
    for k, (fx_, fy_) in enumerate(strides):
        hip = (7, 13) if k == 0 else (10, 13)
        g.line(hip[0], hip[1] - b, fx_, fy_, 'dark'); g.line(hip[0] + 1, hip[1] - b, fx_ + 1, fy_, 'dark'); g.put(fx_ + 2, fy_, 'dark')
    tail = [(1, 15), (1, 13), (1, 14), (0, 12)][f]
    g.line(6, 12 - b, tail[0] + 1, tail[1] - b, 'body'); g.line(6, 13 - b, tail[0] + 2, tail[1] - b + 1, 'body'); g.put(tail[0], tail[1] - b, 'body')
    g.ell(9, 10 - b, 4.2, 4.4, 'body')                                         # torso
    g.rect(10, 5 - b, 12, 8 - b, 'body')                                        # neck
    g.ell(14, 5 - b, 4, 2.4, 'body'); g.rect(14, 4 - b, 18, 6 - b, 'body')     # head + snout
    g.rect(12, 10 - b, 13, 10 - b, 'dark')                                       # little arm
    for x, y in ((6, 5), (5, 7), (5, 9), (8, 4), (10, 2), (12, 2)): g.put(x, y - b, 'spike')
    g.drect(13, 6 - b, 18, 6 - b, '#2a1416'); g.d(14, 6 - b, '#f4ead2'); g.d(16, 6 - b, '#f4ead2'); g.d(18, 6 - b, '#f4ead2')
    g.d(14, 4 - b, '#ffe9a0'); g.d(15, 4 - b, '#120c08')
    g.d(8, 9 - b, '#c7a7ad'); g.d(9, 11 - b, '#c7a7ad')
    return g
def dinohead(f):                     # bruiser, r=16: big chomping head on stubby feet, hop + chomp
    g = Grid(26, 26)
    up = [0, 2, 1, 0][f]; squash = f == 3
    open_ = [3, 2, 0, 3][f]                                                      # mouth gap in px
    g.rect(8, 21, 10, 23 - (1 if up else 0), 'dark'); g.rect(14, 21, 16, 23 - (1 if up else 0), 'dark')
    cy = 12 - up
    g.ell(11.5, cy, 8.8 + (0.6 if squash else 0), 8 - (0.6 if squash else 0), 'body')
    g.ell(18, cy - 2, 5.5, 3.4, 'body')                                         # upper jaw / snout
    g.ell(17, cy + 3 + open_, 5, 2.3, 'body')                                   # lower jaw
    for x, y in ((5, -5), (9, -7), (13, -7), (4, -1), (16, -5)): g.ell(x + 0.5, cy + y + 0.5, 1.4, 1.2, 'bump')
    g.ell(3.5, cy + 3.5, 1.2, 1.1, 'bump')
    if open_:
        g.drect(13, cy + 1, 22, cy + open_ + 1, '#4a1614'); g.drect(14, cy + open_, 19, cy + open_ + 1, '#c0504a')
        for x in (14, 16, 18, 20, 22): g.d(x, cy + 1, '#f4ead2')
        for x in (15, 17, 19, 21): g.d(x, cy + open_ + 1, '#f4ead2')
    else:
        g.dline(13, cy + 1, 22, cy + 1, '#2a1612')
        for x in (15, 18, 21): g.d(x, cy + 2, '#f4ead2')
    g.ell(15.5, cy - 4.5, 1.8, 1.8, 'eye'); g.d(16, cy - 4, '#120c08'); g.d(15, cy - 5, '#ffffff')
    g.d(8, cy - 1, '#a88a70'); g.d(10, cy + 3, '#a88a70'); g.d(6, cy + 2, '#a88a70')
    return g
def mosquito(f):                     # spitter, r=12: teal head, pale wings, long curled brown body; wing flap
    g = Grid(22, 22); b = [0, 1, 0, 1][f]
    # wings first (behind the body): up / mid / down / mid flap
    ang = [-2.15, -2.55, -2.95, -2.55][f]
    for k, da in enumerate((0.0, 0.45)):
        a_ = ang + da
        g.rell(12 + math.cos(a_) * 4.6, 7 - b + math.sin(a_) * 4.6, 4.8, 1.9, a_, 'wing')
    # curled abdomen: segments from the thorax down and round into a J
    pts = [(11, 10), (10, 12), (9, 14), (9, 16), (10, 18), (12, 18.6), (14, 18)]
    for k, (x, y) in enumerate(pts):
        rr_ = 2.6 - k * 0.22
        g.ell(x + 0.5, y - b + 0.5, rr_, rr_, 'abdo')
    g.ell(13, 8 - b, 2.6, 2.4, 'abdo')                                          # thorax
    g.ell(16, 6 - b, 3.6, 3.3, 'head')                                          # head
    g.line(17, 9 - b, 19, 13 - b, 'dark'); g.line(18, 9 - b, 20, 13 - b, 'dark')  # proboscis
    g.drect(16, 5 - b, 18, 6 - b, '#d8f2e0'); g.d(17, 6 - b, '#120c08'); g.d(18, 5 - b, '#120c08')
    for k, (x, y) in enumerate(pts[1:6]): g.d(x - 1, y - b, '#5a4232')       # segment marks
    g.line(12, 10 - b, 11, 13 - b, 'dark') if False else None
    for lx in (12, 14): g.line(lx, 10 - b, lx - 1, 13 - b, 'dark')            # dangly legs
    if f == 3: g.d(20, 14 - b, '#9cff6b'); g.d(20, 15 - b, '#9cff6b'); g.d(21, 15 - b, '#d4ffb8')
    return g
def sandworm(f):                     # boss, r=36: worm rearing out of a dirt mound, bone spikes, green eyes, round maw
    W_, H_ = 52, 56
    g = Grid(W_, H_)
    import math as _m
    emerge = {4: 0.55, 5: 0.15}.get(f, 1.0)                                     # 4/5 = half / barely out (emerge)
    sway = [0, 1.6, 0, -1.6, 0, 0][f]; nod = [0, 0.8, 1.4, 0.8, 0, 0][f]
    ground = 48
    # body curve: from the mound up and over to the head (left), sampled as fat circles
    path = []
    N = 26
    for k in range(N + 1):
        t = k / N
        x = 34 - 10 * t + 4 * _m.sin(t * _m.pi) + sway * t * t - 9 * t * t
        y = ground - 2 - 36 * _m.sin(t * _m.pi * 0.62) + nod * t
        r = 8.2 - 1.6 * t
        path.append((x, y, r))
    vis = int((N + 1) * emerge)
    path = path[:max(1, vis)]
    if emerge < 1:                                                               # shift the visible part down into the mound
        dy = (1 - emerge) * 30
        path = [(x, min(ground, y + dy), r) for x, y, r in path]
    g.ell(26, ground + 2, 21, 5.5, 'dirt')                                      # mound (in front of the tail end)
    for (x, y, r) in path: g.ell(x, y, r, r, 'body')
    # spikes along the outer (right/top) edge
    for k in range(3, len(path) - 2, 3):
        x, y, r = path[k]
        x0, y0, _ = path[k - 1]; x1, y1, _ = path[min(len(path) - 1, k + 1)]
        nx, ny = (y1 - y0), -(x1 - x0); n = _m.hypot(nx, ny) or 1; nx, ny = nx / n, ny / n
        if nx < 0: nx, ny = -nx, -ny
        bx, by = x + nx * (r - 1), y + ny * (r - 1)
        L = 5 + (k % 2)
        for t in range(L):
            w = max(0, (L - t) / L * 1.6)
            g.ell(bx + nx * t + 0.5, by + ny * t + 0.5, w + 0.3, w + 0.3, 'spike')
    if emerge >= 0.5:
        hx_, hy_, hr = path[-1]
        g.ell(hx_ - 2, hy_ + 1, 8.5, 8, 'body')                                 # head
        g.ell(hx_ - 4, hy_ + 4, 5, 5, 'maw')                                    # round maw
        for k in range(10):
            a = k / 10 * _m.pi * 2
            g.d(round(hx_ - 4 + _m.cos(a) * 4), round(hy_ + 4 + _m.sin(a) * 4), '#f4ead2')
        g.ell(hx_ - 4, hy_ + 4, 2.4, 2.4, None) if False else None
        g.drect(round(hx_ - 5), round(hy_ + 3), round(hx_ - 3), round(hy_ + 5), '#1a0606')
        for ex, ey in ((-6, -4), (-1, -5), (3, -2)):
            g.ell(hx_ + ex + 0.5, hy_ + ey + 0.5, 1.5, 1.5, 'eye'); g.d(hx_ + ex, hy_ + ey, '#eaffd0')
    # segment rings
    for k in range(2, len(path) - 1, 2):
        x, y, r = path[k]
        for a in range(-60, 61, 12):
            aa = _m.radians(a + 200)
            g.d(round(x + _m.cos(aa) * (r - 2)), round(y + _m.sin(aa) * (r - 2)), '#5a3e2c')
    for x in (12, 18, 31, 38): g.d(x, ground + 1, '#3e2e22'); g.d(x + 1, ground, '#8a7056')
    return g

def gen_enemies():
    meta = {}
    meta['runner'] = sheet([raptor(f) for f in range(4)], {'body': ('#5e4048', '#8a6670', '#b08f96'), 'dark': ('#3e2a30', '#5e4048', '#7a5a62'), 'spike': ('#3e2a30', '#4e343c', '#6a4a52')}, 'enemy_runner.png', outline_col=INK)
    meta['bruiser'] = sheet([dinohead(f) for f in range(4)], {'body': ('#4e3a2c', '#6f5442', '#8f725c'), 'dark': ('#33251c', '#4e3a2c', '#6f5442'), 'bump': ('#a8862e', '#d9b54a', '#f2d77a'), 'eye': ('#c46a1c', '#f0962e', '#ffc06a')}, 'enemy_bruiser.png', outline_col=INK)
    meta['spitter'] = sheet([mosquito(f) for f in range(4)], {'head': ('#1f5a4c', '#2e8a72', '#5fc0a2'), 'abdo': ('#5a4232', '#7f6048', '#a08066'), 'wing': ('#a8b4b6', '#d4dcdd', '#f2f6f6'), 'dark': ('#33251c', '#4e3a2c', '#6f5442')}, 'enemy_spitter.png', outline_col=INK)
    meta['boss'] = sheet([sandworm(f) for f in range(6)], {'body': ('#5e4130', '#86604a', '#a8806a'), 'dirt': ('#3e2e22', '#5a4636', '#76604c'), 'spike': ('#b8ad96', '#e8e0cc', '#ffffff'), 'maw': ('#2a0c0c', '#4a1614', '#6a2420'), 'eye': ('#2c7a32', '#5fd068', '#b8ffb0')}, 'enemy_sandworm.png', outline_col=INK)
    return meta

# ------------------------------------------------------------------ weapons ---
GUN = {'metal': ('#1e2430', '#3a4456', '#66748c'), 'grip': ('#24180e', '#4a3420', '#6e5034')}
def wpn_flame():
    g = Grid(32, 14)
    g.rect(3, 4, 20, 7, 'metal'); g.rect(20, 5, 28, 6, 'metal'); g.rect(27, 4, 29, 7, 'metal')
    g.ell(10, 10, 6.5, 2.6, 'tank'); g.rect(6, 7, 7, 8, 'metal')
    g.rect(5, 8, 7, 12, 'grip') if False else g.rect(15, 8, 17, 12, 'grip')
    g.d(30, 5, '#ffd166'); g.d(30, 6, '#ff8c42'); g.d(31, 5, '#ff5d2a')
    g.drect(6, 10, 13, 10, '#ffd9a0')
    return sheet([g], dict(GUN, tank=('#a8401c', '#ff8c42', '#ffc48a')), 'weapon_flame.png')
def wpn_arc():
    g = Grid(30, 14)
    g.rect(2, 5, 18, 9, 'body'); g.rect(10, 9, 12, 12, 'grip')
    g.rect(18, 3, 26, 4, 'metal'); g.rect(18, 10, 26, 11, 'metal')                            # prongs
    for x in (7, 11, 15): g.rect(x, 4, x, 10, 'coil')
    for y in range(5, 10): g.d(27 - (y % 2), y, '#e6d2ff')
    g.d(26, 7, '#ffffff')
    return sheet([g], dict(GUN, body=('#4a2a7a', '#7a4ccc', '#b27bff'), coil=('#c08a2a', '#ffd166', '#fff0b8')), 'weapon_arc.png')
def wpn_rail():
    g = Grid(38, 12)
    g.rect(2, 4, 16, 8, 'metal'); g.rect(6, 8, 8, 11, 'grip')
    g.rect(14, 2, 35, 3, 'rail'); g.rect(14, 8, 35, 9, 'rail')
    g.rect(15, 4, 33, 7, 'metal')
    for x in range(17, 34, 4): g.drect(x, 5, x + 1, 6, '#ff6b6b')
    g.drect(3, 5, 6, 5, '#ffb0a0'); g.d(36, 3, '#ffd0d0'); g.d(36, 8, '#ffd0d0')
    return sheet([g], dict(GUN, rail=('#6e1a22', '#c43a3a', '#ff8a8a')), 'weapon_rail.png')
def wpn_mine():
    g = Grid(28, 16)
    g.rect(2, 5, 22, 10, 'body'); g.rect(22, 4, 25, 11, 'metal'); g.rect(8, 10, 10, 14, 'grip')
    g.ell(13, 4.5, 4.5, 3.5, 'metal')                                                          # drum
    g.drect(12, 2, 14, 2, '#ff5d5d'); g.d(13, 1, '#ffd166')
    g.drect(3, 7, 20, 7, '#e8d6a8')
    return sheet([g], dict(GUN, body=('#7a6234', '#c9a867', '#ecd9a6')), 'weapon_mine.png')
def wpn_sprayer():
    g = Grid(30, 14)
    g.rect(2, 6, 20, 9, 'metal'); g.rect(20, 7, 26, 8, 'metal'); g.rect(25, 6, 27, 9, 'ice')
    g.ell(10, 3.5, 6.5, 2.6, 'tank'); g.rect(13, 9, 15, 13, 'grip')
    g.drect(6, 3, 12, 3, '#e8fbff'); g.d(28, 6, '#e8fbff'); g.d(29, 8, '#bff0ff'); g.d(28, 9, '#ffffff')
    return sheet([g], dict(GUN, tank=('#1c6e9a', '#6cd6ff', '#c8f2ff'), ice=('#5fb0ff', '#bff0ff', '#ffffff')), 'weapon_sprayer.png')

# ------------------------------------------------------------------ UI icons --
def icon_items():
    ids = ['plating', 'overclock', 'precision', 'vamp', 'belt', 'boots', 'luck', 'pierce']
    R = {'steel': ('#3a4456', '#7f8ea8', '#c7d4e8'), 'red': ('#8a1f2a', '#e04a5a', '#ff9aa6'), 'chip': ('#1c5a4c', '#2dbba0', '#8af5dc'),
         'gold': ('#a8741c', '#ffb44c', '#ffe9a0'), 'leaf': ('#2c7a32', '#5fd068', '#b8ffb0'), 'blue': ('#1c4f9a', '#5fb0ff', '#c8e4ff'), 'brown': ('#4a3420', '#8a6440', '#c49a6c')}
    frames = []
    for i in ids:
        g = Grid(16, 16)
        if i == 'plating': g.rect(3, 2, 12, 9, 'steel'); g.ell(8, 9, 5, 5, 'steel'); g.drect(5, 4, 10, 4, '#ffffff'); g.d(7, 8, '#3a4456'); g.d(8, 8, '#3a4456')
        if i == 'overclock':
            g.rect(3, 3, 12, 12, 'chip')
            for k in (4, 7, 10): g.put(k, 1, 'gold'); g.put(k, 2, 'gold'); g.put(k, 13, 'gold'); g.put(k, 14, 'gold'); g.put(1, k, 'gold'); g.put(2, k, 'gold'); g.put(13, k, 'gold'); g.put(14, k, 'gold')
            g.drect(6, 5, 9, 5, '#ffd166'); g.drect(8, 6, 9, 7, '#ffd166'); g.drect(6, 8, 8, 8, '#ffd166'); g.drect(6, 9, 7, 10, '#ffd166')
        if i == 'precision':
            g.ell(8, 8, 6.5, 6.5, 'blue'); g.ell(8, 8, 4, 4, 'steel')
            g.drect(8, 1, 8, 15, '#ffffff'); g.drect(1, 8, 15, 8, '#ffffff'); g.d(8, 8, '#ff5d5d')
        if i == 'vamp':
            g.ell(8, 10, 5, 4.6, 'red'); g.rect(7, 3, 8, 6, 'red'); g.rect(6, 5, 9, 7, 'red'); g.put(8, 2, 'red'); g.d(6, 9, '#ffd0d6')
        if i == 'belt':
            g.rect(1, 9, 14, 11, 'brown')
            for k in (2, 5, 8, 11): g.rect(k, 3, k + 1, 8, 'gold'); g.d(k, 3, '#fff0c0')
        if i == 'boots':
            g.rect(4, 2, 9, 10, 'blue'); g.rect(4, 10, 13, 13, 'blue'); g.drect(4, 12, 13, 12, '#141a26'); g.drect(10, 6, 11, 6, '#9ffcff'); g.d(12, 5, '#9ffcff')
        if i == 'luck':
            for cx, cy in ((5.5, 5.5), (10.5, 5.5), (5.5, 9.5), (10.5, 9.5)): g.ell(cx, cy, 3.2, 3.2, 'leaf')
            g.rect(8, 11, 8, 14, 'leaf'); g.d(8, 7, '#ffffff')
        if i == 'pierce':
            g.rect(2, 7, 9, 9, 'gold'); g.ell(10, 8, 3.5, 2.2, 'gold'); g.rect(12, 7, 13, 9, 'steel'); g.put(14, 8, 'steel')
            g.drect(3, 7, 9, 7, '#fff0c0'); g.drect(1, 4, 4, 4, '#c7d4e8'); g.drect(0, 12, 3, 12, '#c7d4e8')
        frames.append(g)
    m = sheet(frames, R, 'ui_items.png'); m['ids'] = ids; return m

def icon_stats():
    ids = ['level', 'hp', 'armor', 'lifesteal', 'damage', 'dmgpct', 'atkspd', 'crit', 'elemental', 'speed', 'accuracy', 'mag', 'pierce', 'recoil', 'critdmg', 'luck', 'danger', 'enemies', 'coin']
    R = {'w': ('#8796ab', '#e8f1ff', '#ffffff'), 'r': ('#a12a3a', '#ff5d5d', '#ffb0a0'), 'b': ('#1c4f9a', '#5fb0ff', '#c8e4ff'), 'g': ('#2c7a32', '#6ef2b1', '#c8ffe4'),
         'o': ('#a84c1c', '#ff8c42', '#ffc48a'), 'y': ('#a8741c', '#ffd166', '#fff0b8'), 'p': ('#4a2a7a', '#b27bff', '#e6d2ff'), 'c': ('#1c6e9a', '#6cd6ff', '#c8f2ff')}
    frames = []
    for i in ids:
        g = Grid(12, 12)
        if i == 'level': g.rect(5, 2, 6, 9, 'g'); g.rect(3, 4, 8, 5, 'g'); g.put(4, 3, 'g'); g.put(7, 3, 'g')
        if i == 'hp': g.ell(4, 4.5, 2.6, 2.6, 'r'); g.ell(7.5, 4.5, 2.6, 2.6, 'r'); g.ell(6, 6.5, 3.6, 3.6, 'r'); g.rect(5, 9, 6, 10, 'r')
        if i == 'armor': g.rect(2, 1, 9, 6, 'b'); g.ell(6, 6.5, 4, 4.2, 'b')
        if i == 'lifesteal': g.ell(6, 7.5, 3.6, 3.2, 'r'); g.rect(5, 2, 6, 5, 'r'); g.rect(4, 4, 7, 5, 'r')
        if i == 'damage':
            for k in range(2, 9): g.put(k, 10 - k, 'w'); g.put(k + 1, 10 - k, 'w')
            g.rect(1, 8, 4, 9, 'o'); g.put(3, 7, 'o'); g.put(2, 10, 'o')
        if i == 'dmgpct': g.ell(4, 3.5, 1.8, 1.8, 'o'); g.ell(8, 8.5, 1.8, 1.8, 'o'); [g.put(9 - k, k + 1, 'o') for k in range(0, 10)]
        if i == 'atkspd': g.ell(6, 6, 4.6, 4.6, 'y'); g.d(6, 3, '#2b1e10'); g.d(6, 4, '#2b1e10'); g.d(6, 5, '#2b1e10'); g.d(7, 6, '#2b1e10'); g.d(8, 7, '#2b1e10')
        if i == 'crit': [g.put(x, y, 'y') for x, y in ((5, 1), (6, 1), (5, 2), (6, 2), (1, 5), (2, 5), (9, 5), (10, 5), (3, 4), (8, 4), (4, 3), (7, 3))]; g.rect(4, 4, 7, 7, 'y'); g.rect(3, 8, 4, 9, 'y'); g.rect(7, 8, 8, 9, 'y')
        if i == 'elemental': g.ell(6, 7.5, 3.6, 3.4, 'o'); g.rect(5, 2, 6, 5, 'o'); g.put(7, 3, 'o'); g.put(4, 4, 'o'); g.d(6, 8, '#ffe9a0'); g.d(5, 7, '#ffe9a0')
        if i == 'speed': g.rect(4, 1, 6, 7, 'c'); g.rect(4, 7, 10, 9, 'c'); g.d(1, 3, '#6cd6ff'); g.d(1, 6, '#6cd6ff'); g.d(0, 4, '#6cd6ff')
        if i == 'accuracy': g.ell(6, 6, 4.6, 4.6, 'r'); g.ell(6, 6, 2.6, 2.6, 'w'); g.d(5, 5, '#ff5d5d'); g.d(6, 6, '#ff5d5d'); g.d(5, 6, '#ff5d5d'); g.d(6, 5, '#ff5d5d')
        if i == 'mag': [g.rect(k, 3, k + 1, 9, 'y') for k in (2, 5, 8)]
        if i == 'pierce': g.rect(1, 5, 7, 6, 'w'); g.ell(8, 5.5, 2.6, 2.6, 'w'); g.put(10, 5, 'w')
        if i == 'recoil': g.rect(2, 4, 9, 6, 'w'); g.rect(3, 6, 4, 9, 'w'); g.d(10, 3, '#ff8c42'); g.d(10, 7, '#ff8c42')
        if i == 'critdmg': g.ell(6, 6, 4.6, 4.6, 'o'); g.drect(3, 5, 8, 6, '#2b1e10'); g.drect(5, 3, 6, 8, '#2b1e10')
        if i == 'luck':
            for cx, cy in ((4, 4), (8, 4), (4, 8), (8, 8)): g.ell(cx, cy, 2.2, 2.2, 'g')
        if i == 'danger': g.ell(6, 5, 4.4, 4, 'w'); g.rect(4, 8, 7, 10, 'w'); g.d(4, 5, '#120810'); g.d(7, 5, '#120810'); g.d(4, 4, '#120810'); g.d(7, 4, '#120810'); g.d(5, 9, '#120810')
        if i == 'enemies': g.ell(6, 6.5, 4.6, 4, 'p'); g.put(3, 2, 'p'); g.put(8, 2, 'p'); g.d(4, 6, '#ffd166'); g.d(7, 6, '#ffd166')
        if i == 'coin': g.ell(6, 6, 4.6, 4.6, 'g'); g.d(4, 4, '#ffffff')
        frames.append(g)
    m = sheet(frames, R, 'ui_stats.png'); m['ids'] = ids; return m

# ------------------------------------------------------------------ ground + tree (v0.56 map restyle) --
def ground_decals():
    """Small low-contrast doodles scattered on the warm grey-brown ground (pebbles, cracks, bones, grass, twigs)."""
    ink = '#4e443c'
    R = {'tan': ('#8f7f6a', '#a8977f', '#bfae94'), 'bone': ('#a89c86', '#cfc3aa', '#e4dac4'), 'grass': ('#6e6b45', '#8a865a', '#a6a274'),
         'wood': ('#5e4a38', '#7a624c', '#957a60'), 'stone': ('#7f7466', '#958a7b', '#ab9f8f')}
    ids = ['pebble', 'pebbles', 'crack', 'bone', 'grass', 'twig', 'rock', 'leaf']
    fr = []
    for i in ids:
        g = Grid(16, 16)
        if i == 'pebble': g.ell(8, 9, 3, 2.2, 'tan')
        if i == 'pebbles': g.ell(5, 9, 2.2, 1.7, 'tan'); g.ell(10.5, 7, 1.7, 1.4, 'stone'); g.ell(11, 11.5, 1.4, 1.1, 'tan')
        if i == 'crack':
            for a, b in (((3, 5), (6, 8)), ((6, 8), (5, 11)), ((5, 11), (9, 13)), ((6, 8), (10, 7)), ((10, 7), (13, 4))): g.dline(a[0], a[1], b[0], b[1], ink)
        if i == 'bone':
            g.rect(5, 8, 10, 8, 'bone'); g.ell(4.5, 7.5, 1.5, 1.4, 'bone'); g.ell(4.5, 9.5, 1.5, 1.4, 'bone'); g.ell(11.5, 7.5, 1.5, 1.4, 'bone'); g.ell(11.5, 9.5, 1.5, 1.4, 'bone')
        if i == 'grass': g.line(5, 8, 7, 12, 'grass'); g.line(8, 5, 8, 12, 'grass'); g.line(11, 7, 9, 12, 'grass'); g.line(3, 10, 6, 12, 'grass')
        if i == 'twig': g.line(3, 12, 12, 4, 'wood'); g.line(8, 8, 11, 10, 'wood'); g.line(5, 10, 4, 7, 'wood')
        if i == 'rock': g.ell(8, 9, 4, 3, 'stone'); g.dline(7, 7, 8, 9, ink); g.d(9, 10, ink)
        if i == 'leaf': g.ell(8, 8, 3.6, 2, 'grass'); g.dline(5, 8, 11, 8, '#6e6b45')
        fr.append(g)
    m = sheet(fr, R, 'ground_decals.png', outline_col=hx(ink, 220)); m['ids'] = ids; return m

def tree():
    g = Grid(26, 32)
    g.rect(11, 18, 14, 29, 'wood'); g.put(10, 29, 'wood'); g.put(15, 29, 'wood'); g.line(14, 22, 17, 19, 'wood')
    for cx, cy, rx, ry in ((13, 10, 9, 7.5), (7, 14, 5.5, 4.6), (19, 14, 5.5, 4.6), (13, 16, 7, 4.5), (9, 6, 4.5, 4), (17, 6, 4.5, 4)):
        g.ell(cx, cy, rx, ry, 'leaf')
    for x, y in ((8, 9), (17, 11), (12, 15), (20, 15), (6, 15), (14, 5)): g.d(x, y, '#e0645a'); g.d(x, y - 1, '#ffb3a8')
    g.dline(9, 4, 12, 3, '#b9cc8c')
    return sheet([g], {'leaf': ('#4a6236', '#6b8749', '#93ad6a'), 'wood': ('#4a3426', '#6e4f38', '#8f6b4c')}, 'tree.png', outline_col=hx('#2a221c'))

if __name__ == '__main__':
    os.makedirs(OUT, exist_ok=True)
    meta = {'player': gen_player(), 'enemies': gen_enemies(),
            'weapons': {'flame': wpn_flame(), 'arc': wpn_arc(), 'rail': wpn_rail(), 'mine': wpn_mine(), 'sprayer': wpn_sprayer()},
            'items': icon_items(), 'stats': icon_stats(), 'decals': ground_decals(), 'tree': tree()}
    with open(os.path.join(OUT, 'sprites.json'), 'w') as fh: json.dump(meta, fh, indent=1)
    print(json.dumps({k: (list(v.keys()) if isinstance(v, dict) else v) for k, v in meta.items()}))
