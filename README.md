# Pressure Point — v1.0

**[Play online](https://chickenthedev.github.io/Pressure-Point/)** — no download, full lighting and effects.

A polished, local Brotato-inspired top-down arena shooter built with HTML5 Canvas and JavaScript.

## Latest Changes (v1.0 — Full release)
- **Map is 3x bigger**: the arena is 3x the viewport in each dimension, with a camera that follows you, enemies spawning just off-screen, and a live minimap (players, enemies, elites, bosses, loot, turrets).
- **Touch controls**: phones and tablets are auto-detected — twin virtual sticks (left moves, right aims and fires, auto-fire when idle) plus a dash button.
- **Dust everywhere**: expanding dust puffs on dashes, landings, explosions, kills, slams, and revives.
- **Ambient birds**: little birds hop around the arena and scatter when danger gets close.
- **Bug fixes**: kills no longer award double XP/currency; shock-chain kills can't delete the wrong enemy.
- **Boss loot + mid-wave elites**: bosses drop a free item and a money shower; waves 3+ get an elite pack event.
- **Graphics juice**: white-hot muzzle flashes, melee swing arcs, crit damage numbers, shockwave rings on every explosion.
- **Fresh weapon art**: 23 weapons now use Sam's cartoon-style sprites with smooth (non-pixelated) icons.
- **Fresh menu art**: elemental convergence — fire, ice, storm, and void spiraling into one core.

## Previous (v0.9 — Elemental reactions, Engineer class)
- **Elemental reactions**: Detonate, Melt, Shatter, Hex Spread cross-element combos.
- **Engineer class** (unlock: Turret Master): free Sentry Turret, +50% turret damage/uptime.

## Previous (v0.8.3 — Turrets, second wind, elemental sets, upgrades)
- **Elemental set bonuses** (Inferno/Glacier/Storm/Hex), **weapon MK II/III upgrades**, **Second Wind** revives, **Sentry Turret** item.




## What's Included
- **12 classes**: 10 unlock via achievements, Glassjaw (1 HP) unlocks by beating Nightmare.
- **Achievements**: 20 unlockable, persisted across runs.
- **Elite mini-bosses**: 9 named elites with unique traits, HP bars, and bonus loot.
- **Meta progression**: earn Essence from runs; spend on 6 permanent upgrades.
- **9 enemy types**: Runner, Spitter, Bruiser, Burster, Splitter, Bulwark, Dasher, Aegis, Nester.
- **Wave system**: Wave 1 → 20 with horde-scaled counts, then **endless mode** past 20.
- **25 weapons** across rarities, all firing simultaneously.
- **112 items** across 5 categories (Tech/Primal/Arcane/Unique/Exclusive).
- **Bosses**: one unique boss per danger level at wave 20 (Overlord, Hive Tyrant, Stormcaller, Ironclad, Voidreaver, Nightmare); bosses every 5 waves in endless.
- **Danger levels (1–6)** — D5 Inferno, D6 Nightmare; unlocks stored in `localStorage`.
- **Co-op**: two local players, in-wave revive, proximity damage synergy.
- **Shop + Reroll + Lock**: reroll for increasing cost, lock cards, wave-1 starter deal.
- **Items + Rarity + Combining**: 6 slots, combine two of same item + rarity into next tier.
- **Cosmetic equipment**: armor, belt, and crown render on your character.
- **Elemental effects**: Fire burn, Ice slow, Shock chain.
- **Background music**: light ambient loop (WebAudio).

## How To Run
1. Open `Index.html` in your browser.
2. Choose **Class** → **Weapon** → **Danger**, then click **Start Game**.

Recommended: modern Chromium-based browser for best audio/visual support.

## Controls

### Player 1
- Move: `WASD`
- Dash: `Left Shift`
- Aim and fire: see **Auto Shoot / Mouse Aim** below
- Fire (when Auto Shoot is off): hold the left mouse button or `Space`
- All weapons you own fire at the same time — there is no weapon switching

### Player 2 (co-op)
- Move: Arrow keys
- Dash: `Right Shift` (`U` also works)
- Always auto-aims at the nearest enemy and auto-fires

### Auto Shoot / Mouse Aim (Settings)
- **Auto Shoot on**: you fire whenever there is a target.
- **Auto Shoot off**: you fire only while holding the left mouse button or `Space`.
- **Mouse Aim on**: you aim at the cursor while the mouse is moving or the button is held; otherwise you auto-aim at the nearest enemy.
- **Mouse Aim off**: you always auto-aim at the nearest enemy.

### Shop
- Click a card to buy (or `←`/`→` to select and `Space` to buy)
- Right-click a card or click its **Lock** button to keep it for the next wave
- Click **Reroll** (or press `R`) to refresh the shop
- Co-op: click the **P1 / P2** tabs next to the title to choose who is shopping
- `Enter` or **Go (Wave N+1)** starts the next wave

### General Controls
- `M` — Mute/Unmute audio
- `P` — Pause/Resume

## Wave System
- Wave 1 starts at **16 enemies**; each wave adds **+8** (`16 + (wave-1)*8`).
- The spawn interval gets shorter every wave (capped for performance).
- Enemy HP and damage scale per wave and per Danger level.
- **Elites**: tougher variants on wave **12** (Danger 2–5), wave **16** (Danger 4–5), wave **20** (all dangers), then every 4th wave in endless. 3x HP, 1.4x damage, triple XP/money.
- **Wave 20 = Boss Wave** (Overlord); bosses every 5 waves in endless mode.

## Danger Levels
- 1 → 5 (only 1 unlocked initially)
- Completing Wave 20 unlocks next Danger
- Higher Danger boosts spawn count, HP, damage, XP, money

## Items, Rarity & Combining
- Rarity: **Common → Rare → Epic → Legendary**
- Categories: **Tech** (cyan), **Primal** (green), **Arcane** (purple), **Unique** (gold — max 1 per player, never combines), **Exclusive** (magenta — epic/legendary only, 1.5x price)
- Shop rarity roll weights: **50 / 35 / 10 / 5** (Luck improves the odds)
- **2 identical items of the same rarity combine** into the next tier
- **Max 6 items** per player

## Files
- `Index.html` — entry page and UI
- `js/` — gameplay modules (`core`, `sprites`, `data`, `state`, `systems`, `menu`, `render`, `main`)
- `fx.js` — animated sprites and effects
- `ui.js` — shop screen layout and drawing
- `assets/` — organized sprites (`weapons/`, `sprites/players/`, `sprites/enemies/`, `sprites/cosmetics/`, `sprites/fx/`, `sprites/ui/`)
- `docs/` — design notes and guides
- `tools/gen_sprites.py` — regenerates character sprites (needs Pillow)
- `style.css` — UI styling

## Performance
- **Target**: 55-60 FPS on modern browsers
- **Optimizations**: cached glow sprites, offscreen HUD panels, no per-frame allocations in the hot loop, no forced layout from the HUD

## Changelog
- **v0.6.2** (2026-10-12): Balance patch (rarity/DPS rebalance), endless mode past wave 20, co-op revive + synergy, 10 new weapons (25 total)
- **v0.6.1** (2026-10-12): File system cleanup — removed legacy cruft, docs to `docs/`, assets reorganized, `game.js` split into 8 modules
- **v0.6.0** (2026-10-12): Class expansion — 10 class sprites, cosmetic equipment, 100 new items in 5 categories, UI polish
- **v0.5.8B** (2026-10-12): Menu revamp (Class → Weapon → Danger), difficulty buffs, Run Won/Over screens, pause menu
- **v0.5.7** (2026-10-12): Hordes, enemy HP +20%, weapon rebalance, rarity fixed, elites
- **v0.5.6** (2026-10-12): Wave-20 danger unlock, all weapons fire at once, 3 new enemies, R rerolls shop
- **v0.56A** (2026-10-12): Web performance pass, co-op dash split
- **v0.56** (2026-10-07): Animated sprites, new enemy art, new ground, hit/death/muzzle effects, Brotato-style shop
