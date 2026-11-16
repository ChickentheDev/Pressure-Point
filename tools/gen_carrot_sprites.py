#!/usr/bin/env python3
"""Generate class-specific, smooth outlined carrot-soldier sprite sheets.

Each class keeps the same readable carrot silhouette and 4-frame walk cycle, but
gets its own uniform, armor silhouette, headgear, and signature prop.
"""
from pathlib import Path
from xml.sax.saxutils import escape

OUT = Path("assets/sprites/players")
OUT.mkdir(parents=True, exist_ok=True)

# Colors and signature kit are based on the class archetypes in js/data.js.
CLASSES = {
    "ironheart": dict(armor="#657b59", trim="#d8c58a", dark="#354638", leaf="#82b94d", gear="helmet", prop="rifle", badge="#e5c46a"),
    "foxglove": dict(armor="#596d88", trim="#d9b7e8", dark="#303d55", leaf="#8ebd55", gear="hood", prop="pistol", badge="#dba6f4"),
    "gravelord": dict(armor="#74634f", trim="#c6a36c", dark="#40382f", leaf="#718c48", gear="heavy", prop="cannon", badge="#d4a65e"),
    "scrapjack": dict(armor="#8a6243", trim="#e0b66a", dark="#4a3528", leaf="#91a64a", gear="bandana", prop="shotgun", badge="#e5a24f"),
    "voltblade": dict(armor="#3f6870", trim="#7de5dc", dark="#243d48", leaf="#77b65a", gear="crest", prop="blade", badge="#75e8ef"),
    "circuitry": dict(armor="#465b70", trim="#63d7db", dark="#273c50", leaf="#83ae50", gear="visor", prop="antenna", badge="#6ee8e3"),
    "bulwark": dict(armor="#777b70", trim="#e2d6ad", dark="#42483f", leaf="#8ba94e", gear="fullhelm", prop="shield", badge="#e2d6ad"),
    "redline": dict(armor="#8a4943", trim="#f0bd75", dark="#512d31", leaf="#7c9d48", gear="visor", prop="scarf", badge="#f07858"),
    "skylark": dict(armor="#587b91", trim="#d6e9d5", dark="#344c5b", leaf="#9acb62", gear="feather", prop="wing", badge="#c4e9ef"),
    "nightreap": dict(armor="#514b68", trim="#b49bd5", dark="#302b42", leaf="#71984c", gear="hood", prop="sickle", badge="#bd9ae9"),
    "glassjaw": dict(armor="#668b98", trim="#b9f4f2", dark="#34535d", leaf="#9acb62", gear="crystal", prop="crystal", badge="#b6f5f1"),
    "engineer": dict(armor="#6e7650", trim="#e3c56c", dark="#41472f", leaf="#9aba54", gear="goggles", prop="wrench", badge="#f1d16d"),
}

INK = "#17251d"
ORANGE = "#f28a32"
SHADE = "#c95c25"

def path(d, fill, sw=1.25, extra=""):
    return f'<path d="{d}" fill="{fill}" stroke="{INK}" stroke-width="{sw}" stroke-linejoin="round" stroke-linecap="round" {extra}/>'

def prop_art(kind, armor, trim, dark):
    if kind == "rifle":
        return path("M10.7 9.4 L15.2 8.6 L15.7 9.5 L12.2 10.5 L11.2 12.2 L10.2 11.8Z", dark, 1.0) + path("M13.8 8.8 L15.2 8.6", trim, .65)
    if kind == "pistol":
        return path("M10.3 9.2 L14.4 8.7 L14.7 9.7 L12.1 10.1 L11.7 11.4 L10.8 11.2Z", dark, 1.0)
    if kind == "cannon":
        return path("M10.4 8.2 Q13.2 6.9 15.2 8.2 L15.5 10.8 L12.2 11.2 L10.5 10Z", dark, 1.3) + path("M12 8 L14.8 8", trim, .8)
    if kind == "shotgun":
        return path("M10.6 8.8 L15.5 8.4 L15.8 9.7 L12 10.4 L11.1 12Z", dark, 1.1) + path("M14.5 8.7 L15.4 8.7", trim, .7)
    if kind == "blade":
        return path("M11.3 10.1 L15.7 5.4 L14.2 11.1 L12.1 12.2Z", "#d9edf0", 1.0) + path("M10.8 10.1 L12.2 11.2", trim, 1.2)
    if kind == "antenna":
        return path("M11.4 7.4 L12.4 3.2 L13.2 7.2", "none", 1.0) + '<circle cx="12.8" cy="3.1" r="1" fill="' + trim + '" stroke="' + INK + '" stroke-width=".7"/>'
    if kind == "shield":
        return path("M3.1 8.4 L5.3 7.5 L5.5 12.8 L3.7 14.2 L2.8 12.7Z", armor, 1.2) + path("M3.2 9.3 L4.7 8.8 L4.8 12.4 L3.8 13.1Z", trim, .65)
    if kind == "scarf":
        return path("M5.1 6.1 Q8 7.3 10.8 6.2 L11.5 7.4 Q8.3 9.1 5.3 7.3 L3.8 10.4 L2.9 9.7 L4.1 6.8Z", trim, .8)
    if kind == "wing":
        return path("M4.4 8.3 Q1.2 5.4 2.1 3.1 Q5.7 4.2 6.7 7.5 L5.8 11Z", "#dcebd8", .9) + path("M3 4.5 L5.7 8.5", trim, .55)
    if kind == "sickle":
        return path("M11.3 10.2 Q16.2 7.4 15.7 3.9 Q14.8 8.3 11.1 8.9Z", "#d6c5ed", 1.0) + path("M11.4 9 L10.3 13", trim, 1.3)
    if kind == "crystal":
        return path("M12 7 L14.2 3.7 L16 7.5 L13.5 11.4Z", "#a9e8e6", .9) + path("M14.2 3.7 L13.5 11.4", "#e8ffff", .55)
    return path("M11.2 8.7 L14.8 8.1 L15.2 9.1 L12.4 10.1 L12 12.3 L10.9 12.1Z", dark, 1.0) + path("M13.5 8.7 L15.4 7.2", trim, 1.1)

def headgear(kind, armor, trim, leaf):
    if kind in ("helmet", "fullhelm"):
        return path("M4.8 5.5 Q4.2 1.4 8 1.1 Q11.8 1.2 11.1 5.5 L10.4 6.6 L5.4 6.6Z", armor, 1.3) + path("M4.1 5.4 Q8 4.1 11.8 5.4 L11.4 6.7 L4.5 6.7Z", trim, .8)
    if kind == "hood":
        return path("M4.4 6.1 Q3.3 1.1 8 0.8 Q12.3 1.5 11.4 6.5 L10.4 8 L5 7.6Z", armor, 1.3) + path("M5.4 5.5 Q8 4.6 10.5 5.6", trim, .8, 'fill="none"')
    if kind == "bandana":
        return path("M4.6 4.3 Q8 2.9 11.4 4.3 L11.1 6.1 L4.8 6.1Z", trim, 1.0) + path("M10.5 4.3 L12.5 5.3 L11.3 7.7", armor, .8)
    if kind == "crest":
        return path("M5 5.2 Q4.3 2.4 6.1 1.2 L7.9 4.4 L9.8 .8 Q11.8 3.2 10.7 5.5Z", armor, 1.0) + path("M5.2 5.1 L10.9 5.1", trim, .7)
    if kind == "visor":
        return path("M4.6 4.4 Q8 3.2 11.4 4.4 L11.1 6.6 L4.9 6.6Z", armor, 1.0) + path("M5.1 5.1 L10.8 5.1", trim, 1.2)
    if kind == "feather":
        return path("M5.1 5.4 Q4.4 2.5 6.3 1.2 Q7.2 3.2 8.1 4.5 Q9.1 1.3 11.1 1.3 Q11.3 4 9.9 5.7Z", armor, 1.0) + path("M6.4 2.2 L8.1 5", trim, .6)
    if kind == "crystal":
        return path("M5 5.4 L6.3 1.1 L8 3.6 L9.7 .7 L11.2 5.5Z", "#a9e8e6", 1.0) + path("M6.3 1.1 L8 5.5", "#efffff", .6)
    return path("M4.7 4.3 Q8 2.9 11.3 4.3 L11 6.4 L5 6.4Z", armor, 1.0) + '<circle cx="6.2" cy="5.1" r=".8" fill="' + trim + '"/><circle cx="9.8" cy="5.1" r=".8" fill="' + trim + '"/>'

def frame(cid, view, step):
    c = CLASSES[cid]
    armor, trim, dark, leaf = c["armor"], c["trim"], c["dark"], c["leaf"]
    bob = (0, -.35, 0, .25)[step]
    leg = (-.55, .55, .55, -.55)[step]
    # Rear view gets the same silhouette but shows the class backpack/kit rather than a face.
    face = view != "up"
    if view == "side":
        body = path("M6.1 5.5 Q11.6 4.2 11.3 9.4 Q10.7 14.3 7.2 19.5 Q6.2 20.2 6 19 L5.2 11 Q4.5 7.5 6.1 5.5Z", ORANGE, 1.3)
        leaves = path("M7.2 5 Q5 2.7 6.1 .9 Q8.1 1.7 8.6 3.6 Q9.4 .6 11.1 .8 Q11.2 3.3 8.8 5.2Z", leaf, 1.0)
        vest = path("M5.1 8 Q8.6 7.1 10.9 8.3 L10.1 12 L5.7 12.1Z", armor, 1.0)
        eyes = '<circle cx="9.8" cy="6.7" r=".55" fill="#fff2d5" stroke="' + INK + '" stroke-width=".4"/>' if face else ""
    else:
        body = path("M7.8 5.1 C4.9 5.8 4.8 9.5 5.5 12.1 L8 19.3 Q8.3 20.2 9 19.3 L11.4 12 C12.1 8.5 10.4 5.8 7.8 5.1Z", ORANGE, 1.3)
        leaves = path("M7.8 5 Q4.8 3.2 5.1 1.1 Q7.1 1.6 7.9 3.4 Q8.2 .7 10.2 .7 Q10.4 3 8.7 5Z", leaf, 1.0)
        vest = path("M5.1 8.1 Q7.8 7.1 10.6 8.1 L10.4 11.5 Q7.8 12.5 5.4 11.5Z", armor, 1.0)
        eyes = ('<circle cx="6.5" cy="6.9" r=".38" fill="#fff2d5"/><circle cx="9.1" cy="6.9" r=".38" fill="#fff2d5"/>') if face else path("M5.8 6.3 L10 6.3", trim, .8, 'fill="none"')
    legs = path(f"M6.2 13 L6.1 16.6 L{5.5+leg:.2f} 18.5 M9.6 13 L9.7 16.6 L{10.3-leg:.2f} 18.5", dark, 1.9, 'fill="none"')
    boots = path("M4.5 18.2 Q5.7 17.7 6.8 18.4 L6.9 19.5 L4.4 19.5Z M8.9 18.4 Q10 17.7 11.1 18.2 L11.3 19.5 L8.8 19.5Z", "#28342d", .8)
    gear = headgear(c["gear"], armor, trim, leaf)
    # Class-specific chest/shoulder shapes make the silhouette visibly distinct at game scale.
    extras = ""
    if cid == "gravelord":
        extras += path("M4.7 7.8 L3.1 8.3 L3.7 11.6 L5.4 11.2Z M10.2 7.8 L12 8.2 L11.5 11.7 L10.1 11.4Z", trim, 1.1)
    elif cid == "bulwark":
        extras += path("M4.6 7.5 Q2.5 7.1 2.8 10.8 L4.8 12.2Z M10.7 7.5 Q12.7 7.1 12.9 10.8 L10.7 12.2Z", armor, 1.2)
    elif cid == "engineer":
        extras += path("M10.3 7.1 L13.1 7.6 L13.2 12.8 L10.4 12.1Z", dark, 1.0) + path("M11.1 8.2 L12.5 8.2 L12.5 11.4 L11.1 11.4Z", trim, .7)
    elif cid == "nightreap":
        extras += path("M4.7 6.1 Q2.2 9.1 4.2 13.5 L5.6 14Z M11 6.1 Q13.3 9.1 11.5 13.5 L10.2 14Z", dark, 1.0)
    elif cid == "glassjaw":
        extras += path("M5.2 8 L6.5 7.5 L7.1 12 L5.8 12.2Z M9.2 7.5 L10.5 8 L10 12.2 L8.8 12Z", "#a9e8e6", .7)
    elif cid == "scrapjack":
        extras += path("M5.2 8.3 L10.4 11.2 M5.4 9.6 L10.2 12.3", trim, .8, 'fill="none"')
    elif cid == "circuitry":
        extras += path("M5.2 8.7 L6.4 8.7 L6.4 10.3 L9.5 10.3 L9.5 11.2", trim, .7, 'fill="none"')
    elif cid == "redline":
        extras += path("M5.1 12.1 L10.5 12.1", trim, 1.0, 'fill="none"')
    elif cid == "foxglove":
        extras += path("M5.2 8.3 L4.1 10.2 M10.4 8.3 L11.5 10.2", trim, .8, 'fill="none"')
    elif cid == "skylark":
        extras += path("M4.8 8 Q2.7 6.2 2.1 7.3 L4.2 11.9Z", "#dcebd8", .8)
    elif cid == "voltblade":
        extras += path("M5.2 8.1 L6.3 8.8 L5.7 10.2 L7 11 L6.4 12", trim, .8, 'fill="none"')
    else:
        extras += path("M5.9 8.8 L9.7 8.8 M6.1 10.2 L9.5 10.2", trim, .65, 'fill="none"')
    prop = prop_art(c["prop"], armor, trim, dark) if view != "up" else ""
    if cid == "engineer":
        prop += '<circle cx="12.1" cy="6.8" r="1.2" fill="none" stroke="' + trim + '" stroke-width=".8"/>'
    if cid == "voltblade":
        prop += '<path d="M13.5 6.2 L14.4 4.6 L14 6.4 L15.2 5.7" fill="none" stroke="' + trim + '" stroke-width=".7"/>'
    # A class badge on the chest keeps the identities readable in the tiny top-down view.
    badge = f'<circle cx="8" cy="9.4" r="1.05" fill="{c["badge"]}" stroke="{INK}" stroke-width=".65"/>'
    return f'<g transform="translate(0 {bob})">{leaves}{body}{legs}{boots}{vest}{extras}{gear}{eyes}{badge}{prop}</g>'

def make_sheet(cid, view):
    frames = "".join(f'<g transform="translate({i*16} 0)">{frame(cid, view, i)}</g>' for i in range(4))
    return f'<svg xmlns="http://www.w3.org/2000/svg" width="256" height="84" viewBox="0 0 64 21"><g>{frames}</g></svg>'

for cid in CLASSES:
    for view in ("down", "up", "side"):
        (OUT / f"player_{cid}_{view}.svg").write_text(make_sheet(cid, view), encoding="utf-8")

# P1/P2 fallback uses the balanced Ironheart model; selected classes use their own sheet.
for view in ("down", "up", "side"):
    source = make_sheet("ironheart", view)
    for player in ("p1", "p2"):
        (OUT / f"player_{player}_{view}.svg").write_text(source, encoding="utf-8")

print(f"Generated {len(CLASSES)} class-specific carrot soldier models (3 views x 4 frames each).")
