#!/usr/bin/env python3
"""Landing background, Brotato-style: dark mauve wall covered in faint doodles
of the game's OWN enemy sprites, plus cropped hero/logo-face assets.

Doodles are the real pixel art, desaturated and dimmed to read as pencil
sketches -- no generated gradients pretending to be art. Spotlight pool is
done in CSS so it always sits exactly under the hero.
"""
import random, os
from PIL import Image, ImageDraw, ImageFilter, ImageEnhance

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
W, H = 2048, 1152
random.seed(13700)  # fixed seed: same wall every run

def frame0(path):
    im = Image.open(path).convert('RGBA')
    fw = im.width // 4
    return im.crop((0, 0, fw, im.height))

def to_doodle(im):
    """Faint, mostly-desaturated version of a sprite frame -- the face and
    colours stay readable, it just recedes into the wall."""
    d = ImageEnhance.Color(im.convert('RGBA')).enhance(0.45)
    d = ImageEnhance.Brightness(d).enhance(0.95)
    return d

# --- base: dark mauve-grey vertical gradient (Brotato wall) ---
top = (62, 54, 68)
bot = (34, 29, 38)
base = Image.new('RGB', (W, H))
px = base.load()
for y in range(H):
    t = y / H
    c = tuple(int(top[i] + (bot[i] - top[i]) * t) for i in range(3))
    for x in range(W):
        px[x, y] = c
base = base.convert('RGBA')

# --- grain ---
import numpy as np
noise = np.random.default_rng(7).integers(0, 14, (H, W), dtype=np.uint8)
grain = Image.fromarray(noise, 'L')
base = Image.composite(
    Image.blend(base.convert('RGB'), Image.new('RGB', (W, H), (255, 255, 255)), 0.03),
    base.convert('RGB'), grain.point(lambda v: 255 if v > 6 else 0))
base = base.convert('RGBA')

# --- doodle wall ---
enemy_dir = os.path.join(ROOT, 'assets/sprites/enemies')
files = sorted(f for f in os.listdir(enemy_dir)
               if f.startswith('enemy_') and f.endswith('.png'))
sprites = [to_doodle(frame0(os.path.join(enemy_dir, f))) for f in files]
# a couple of player classes join the wall too
for p in ['player_foxglove_down.png', 'player_glassjaw_down.png']:
    sprites.append(to_doodle(frame0(os.path.join(ROOT, 'assets/sprites/players', p))))

def clear_zone(x, y):
    # keep the logo (top centre) and hero (centre) readable
    if 0.28 < x / W < 0.72 and y / H < 0.34:
        return False
    if 0.34 < x / W < 0.66 and 0.48 < y / H < 0.80:
        return False
    return True

placed = 0
tries = 0
while placed < 26 and tries < 300:
    tries += 1
    s = random.choice(sprites)
    # normalise by height so big and small enemies read the same size
    target_h = random.uniform(95, 210)
    scale = target_h / s.height
    w, h = int(s.width * scale), int(s.height * scale)
    x = random.randint(-40, W - w + 40)
    y = random.randint(-40, H - h + 40)
    if not clear_zone(x + w // 2, y + h // 2):
        continue
    d = s.resize((w, h), Image.NEAREST)
    d = d.rotate(random.uniform(-20, 20), resample=Image.BICUBIC, expand=True)
    if random.random() < 0.5:
        d = d.transpose(Image.FLIP_LEFT_RIGHT)
    alpha = random.uniform(0.14, 0.28)
    # scale the doodle's alpha channel
    r, g, b, a = d.split()
    a = a.point(lambda v: int(v * alpha))
    d = Image.merge('RGBA', (r, g, b, a))
    base.alpha_composite(d, (x, y))
    placed += 1

# --- vignette: darken edges ---
vig = Image.new('L', (W, H), 0)
vd = ImageDraw.Draw(vig)
vd.ellipse((-W * 0.25, -H * 0.35, W * 1.25, H * 1.35), fill=255)
vig = vig.filter(ImageFilter.GaussianBlur(180))
dark = Image.new('RGBA', (W, H), (8, 6, 10, 255))
base = Image.composite(base, dark, vig)

base.convert('RGB').save(os.path.join(ROOT, 'assets/ui/menu_bg.png'), quality=92)
print('menu_bg.png written,', placed, 'doodles')

# --- cropped assets: hero frame + logo face ---
hero = frame0(os.path.join(ROOT, 'assets/sprites/players/player_ironheart_down.png'))
hero.save(os.path.join(ROOT, 'assets/ui/hero_ironheart.png'))
# head crop: top 10px of the 16x21 frame = helmet + visor only
hero.crop((0, 0, 16, 10)).save(os.path.join(ROOT, 'assets/ui/logo_face.png'))
print('hero_ironheart.png + logo_face.png written')
