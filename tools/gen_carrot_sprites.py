#!/usr/bin/env python3
"""Generate smooth, outlined carrot-soldier player sprite sheets as vector SVG."""
from pathlib import Path
OUT = Path("assets/sprites/players")
OUT.mkdir(parents=True, exist_ok=True)
INK = "#17251d"
GREEN = "#557b3e"
LIGHT = "#8fbd58"
ORANGE = "#f28a32"
SHADE = "#c95c25"
VEST = "#586b43"
DARK = "#35452f"
SKIN = "#ffd07a"

def frame(view, step):
    bob = [0, -0.35, 0, 0.2][step]
    leg = [-0.6, 0.7, 0.6, -0.7][step]
    if view == "down":
        return f"""
 <g transform="translate(0 {bob})" stroke="{INK}" stroke-width="1.25" stroke-linejoin="round" stroke-linecap="round">
  <path d="M7.8 4.1 C5.2 5.3 4.8 9.3 5.5 12.1 L8 19.3 Q8.3 20.2 9 19.3 L11.4 12 C12.1 8.5 10.4 5.1 7.8 4.1Z" fill="{ORANGE}"/>
  <path d="M6.4 6.4 Q5.9 10 7.1 13.1 M9.5 7.2 Q10.5 10 9.3 12.6" fill="none" stroke="{SHADE}" stroke-width=".7"/>
  <path d="M7.8 4.8 Q4.9 3.2 5.1 1.1 Q7.1 1.6 7.9 3.4 Q8.2 .7 10.2 .7 Q10.4 3 8.7 4.8" fill="{LIGHT}"/>
  <path d="M5.1 3.6 Q7.8 2.5 10.6 3.6 L10.1 5.1 L5.5 5.1Z" fill="{GREEN}"/>
  <path d="M5.1 8.1 Q7.8 7.1 10.6 8.1 L10.4 11.5 Q7.8 12.5 5.4 11.5Z" fill="{VEST}"/>
  <path d="M6.1 8.7 L9.6 8.7 M6.3 10.1 L9.4 10.1" fill="none" stroke="{LIGHT}" stroke-width=".65"/>
  <path d="M5.1 8.5 L3.9 11.4 M10.5 8.5 L11.7 11.4" fill="none" stroke="{DARK}" stroke-width="1.7"/>
  <path d="M6.2 13.2 L6.1 16.6 L{5.5+leg:.2f} 18.5 M9.6 13.2 L9.7 16.6 L{10.3-leg:.2f} 18.5" fill="none" stroke="{DARK}" stroke-width="1.9"/>
  <path d="M4.6 18.2 Q5.7 17.7 6.8 18.4 L6.9 19.5 L4.4 19.5Z M8.9 18.4 Q10 17.7 11.1 18.2 L11.3 19.5 L8.8 19.5Z" fill="#28342d"/>
  <path d="M7.1 9.1 L8.5 9.1 L8.5 10.4 L7.1 10.4Z" fill="#e8c45b"/>
  <path d="M4.5 5.1 Q7.8 3.8 11.1 5.1 L10.8 6.5 L4.8 6.5Z" fill="{GREEN}"/>
  <path d="M4.8 5.7 Q7.8 4.7 10.8 5.7" fill="none" stroke="{LIGHT}" stroke-width=".6"/>
  <path d="M6.1 6.5 L9.6 6.5" fill="none" stroke="{INK}" stroke-width="1.4"/>
  <circle cx="6.5" cy="6.1" r=".35" fill="#f4e8bf" stroke="none"/><circle cx="9.1" cy="6.1" r=".35" fill="#f4e8bf" stroke="none"/>
 </g>"""
    if view == "side":
        return f"""
 <g transform="translate(0 {bob})" stroke="{INK}" stroke-width="1.25" stroke-linejoin="round" stroke-linecap="round">
  <path d="M6.2 4.8 Q11.5 4.3 11.2 9.4 Q10.7 14.1 7.2 19.5 Q6.3 20.2 6.1 19.1 L5.2 11.1 Q4.5 7.1 6.2 4.8Z" fill="{ORANGE}"/>
  <path d="M7.8 7.2 Q9.6 10 7.4 13.4" fill="none" stroke="{SHADE}" stroke-width=".7"/>
  <path d="M7.3 4.8 Q5.3 2.8 6 1 Q8 1.8 8.4 3.4 Q9.3 .7 11 .9 Q11.1 3.3 8.8 5" fill="{LIGHT}"/>
  <path d="M5 4.2 Q8.2 2.9 11.5 4.3 L11.2 5.7 L5.3 5.8Z" fill="{GREEN}"/>
  <path d="M5.2 8.1 Q8.7 7.1 10.8 8.3 L10.2 12 L5.7 12.1Z" fill="{VEST}"/>
  <path d="M6 9.1 L9.9 9.1 M6.2 10.5 L9.5 10.5" stroke="{LIGHT}" fill="none" stroke-width=".65"/>
  <path d="M5.5 8.5 L3.7 11.2" stroke="{DARK}" stroke-width="1.8" fill="none"/>
  <path d="M6.3 13 L6.1 16.8 L{5.3+leg:.2f} 18.8 M9.4 13 L9.8 16.4 L{10.6-leg:.2f} 18.7" stroke="{DARK}" stroke-width="1.9" fill="none"/>
  <path d="M4.5 18.5 L6.9 18.5 L7 19.6 L4.2 19.6Z M9.2 18.4 L11.2 18.6 L11.6 19.6 L8.9 19.6Z" fill="#28342d"/>
  <path d="M8.4 6.5 Q10.6 5.9 11.2 7.1 L10.6 8.1 L8.3 8Z" fill="#d8d5ad"/>
  <path d="M4.5 6.4 Q7.7 5.2 10.9 6.3" stroke="{INK}" fill="none" stroke-width="1.2"/>
 </g>"""
    return f"""
 <g transform="translate(0 {bob})" stroke="{INK}" stroke-width="1.25" stroke-linejoin="round" stroke-linecap="round">
  <path d="M7.8 4.1 C5.2 5.3 4.8 9.3 5.5 12.1 L8 19.3 Q8.3 20.2 9 19.3 L11.4 12 C12.1 8.5 10.4 5.1 7.8 4.1Z" fill="{ORANGE}"/>
  <path d="M6.4 6.4 Q5.9 10 7.1 13.1 M9.5 7.2 Q10.5 10 9.3 12.6" fill="none" stroke="{SHADE}" stroke-width=".7"/>
  <path d="M7.8 4.8 Q4.9 3.2 5.1 1.1 Q7.1 1.6 7.9 3.4 Q8.2 .7 10.2 .7 Q10.4 3 8.7 4.8" fill="{LIGHT}"/>
  <path d="M5.1 3.6 Q7.8 2.5 10.6 3.6 L10.1 5.1 L5.5 5.1Z" fill="{GREEN}"/>
  <path d="M5.1 8.1 Q7.8 7.1 10.6 8.1 L10.4 11.5 Q7.8 12.5 5.4 11.5Z" fill="{VEST}"/>
  <path d="M6.1 8.7 L9.6 8.7 M6.3 10.1 L9.4 10.1" fill="none" stroke="{LIGHT}" stroke-width=".65"/>
  <path d="M5.1 8.5 L3.9 11.4 M10.5 8.5 L11.7 11.4" fill="none" stroke="{DARK}" stroke-width="1.7"/>
  <path d="M6.2 13.2 L6.1 16.6 L{5.5+leg:.2f} 18.5 M9.6 13.2 L9.7 16.6 L{10.3-leg:.2f} 18.5" fill="none" stroke="{DARK}" stroke-width="1.9"/>
  <path d="M4.6 18.2 Q5.7 17.7 6.8 18.4 L6.9 19.5 L4.4 19.5Z M8.9 18.4 Q10 17.7 11.1 18.2 L11.3 19.5 L8.8 19.5Z" fill="#28342d"/>
  <path d="M7.1 9.1 L8.5 9.1 L8.5 10.4 L7.1 10.4Z" fill="#e8c45b"/>
  <path d="M4.5 5.1 Q7.8 3.8 11.1 5.1 L10.8 6.5 L4.8 6.5Z" fill="{GREEN}"/>
  <path d="M4.8 5.7 Q7.8 4.7 10.8 5.7" fill="none" stroke="{LIGHT}" stroke-width=".6"/>
  <path d="M6.1 6.5 L9.6 6.5" fill="none" stroke="{INK}" stroke-width="1.4"/>
  <path d="M6 7.1 Q7.8 6.6 9.6 7.1" stroke="{INK}" fill="none" stroke-width=".7"/>
  <path d="M6.3 8.1 L9.4 8.1" stroke="#d5b96c" fill="none" stroke-width=".6"/>
 </g>"""

for view in ("down", "up", "side"):
    frames = "".join(f'<g transform="translate({i*16} 0)">{frame(view,i)}</g>' for i in range(4))
    svg = f'<svg xmlns="http://www.w3.org/2000/svg" width="256" height="84" viewBox="0 0 64 21"><g>{frames}</g></svg>'
    (OUT / f"carrot_soldier_{view}.svg").write_text(svg)

# Reuse the same clean silhouette for the legacy player slots and all class slots.
for view in ("down", "up", "side"):
    source = (OUT / f"carrot_soldier_{view}.svg").read_text()
    for name in (f"player_p1_{view}.svg", f"player_p2_{view}.svg"):
        (OUT / name).write_text(source)
    for cid in ("ironheart","foxglove","gravelord","scrapjack","voltlade","circuitry","bulwark","redline","skylark","nightreap","glassjaw","engineer"):
        (OUT / f"player_{cid}_{view}.svg").write_text(source)
print("Generated carrot soldier SVG sprite sheets.")
