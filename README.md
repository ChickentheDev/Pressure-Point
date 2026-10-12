# Pressure Point — v0.6.0 Class expansion

A polished, local Brotato-inspired top-down arena shooter built with HTML5 Canvas and JavaScript.

## Latest Changes (v0.6.0 — Class expansion)
- **Custom class sprites**: every class has its own walk-animated sprite — Ironheart (steel-blue armor), Foxglove (green hunter), Gravelord (bulky brown iron), Scrapjack (orange scavenger), Voltblade (yellow with arc spikes), Circuitry (cyan with glowing traces), Bulwark (heavy gray plate, bulkier frame), Redline (aggressive red), Skylark (white, slimmer frame), Nightreap (dark purple hood). Shown as portraits in class select; P2 shares P1's sprite (co-op ring tells players apart).
- **Cosmetic equipment**: shop items now show on your character — Dense Plating (shoulder armor), Ammo Belt (pouches), and the new epic War Crown (+2 Luck, +6% Damage) which puts a gold crown on your head.
- **100 new items** across 5 categories: **Tech** (engineering gadgets), **Primal** (beast/blood), **Arcane** (elemental/void), **Unique** (gold tag — at most one per player, never combines), **Exclusive** (magenta tag — epic/legendary only, 1.5x price).

## Previous Update (v0.5.8B)
- **Menu revamp**: Brotato-style 3-step flow — Class → Weapon → Danger. Class select is a grid with a detail panel (starting weapon, green/red stat lines vs the Ironheart baseline, tagline). New weapon select: grid of all 15 weapons with a detail panel (damage, fire delay, magazine/reload, spread, traits); your pick becomes the run's starting weapon (class stat mods still apply). Danger select shows numbered 1-5 buttons with a detail panel listing that danger's full modifiers.
- **Difficulty buffs**: each danger now has explicit modifiers (`DANGER_MODS`), displayed and applied for real — D2: +8% enemy speed; D3: +15% horde size; D4: +15% enemy damage; D5: +30% horde size and TWO Overlords on wave 20. Elites unchanged (wave 12 on D2-5, wave 16 on D4-5, wave 20 on D1-5).
- **Run Won screen**: replaces the bare banner — "Run Won / Danger N" with Stats, Weapons, Items, and Progress panels, a gold "DANGER N UNLOCKED!" banner when earned, and Retry / New Run / Main Menu buttons (confetti + fanfare still play).
- **Run Over screen**: same panel layout on death, with Retry / New Run / Main Menu. Also fixed: death from non-contact sources now reliably ends the run.
- **Pause menu**: proper panel showing your class (name, trait, weapon), owned weapons, and full stats, with Resume / Quit to Menu.

## Previous Update (v0.5.7)
- **Hordes**: Waves are bigger — `16 + (wave-1)*8` enemies (wave 1: 16, wave 19: 160; was 10 + (wave-1)*5), and the spawn interval ramps up faster so late waves keep real pressure. Danger and co-op still multiply the total.
- **Enemy HP**: +20% across the board, including the Overlord boss.
- **Weapon rebalance**: Base damage reduced ~30% across the table (fire rates slightly lengthened) now that all owned weapons fire at once — each weapon keeps its role, and a full 6-weapon arsenal clears a wave-19 horde in ~30-40s instead of melting it. Minigun base price fixed (was 1000).
- **Rarity fixed**: The top tier is now `Legendary` everywhere (it was inconsistently called `red` in code while the UI said Legendary). Tiers: Common → Rare → Epic → Legendary, scaling power and price 1x / 1.25x / 1.5x / 2x, with shop roll weights 50 / 35 / 10 / 5 (Luck improves the odds).
- **Elites**: On wave 12 (Danger 2-5), wave 16 (Danger 4-5) and wave 20 (Danger 1-5), 2-3 elites spawn with the wave — 3x HP, 1.4x damage, bigger bodies, pulsing gold rings, triple XP/money, and an "ELITES INBOUND" banner. They count toward wave completion.

## Previous Update (v0.5.6)
- **Victory**: Clearing wave 20 unlocks the next danger level with a celebration banner, then returns to the menu — no more replaying wave 20 forever.
- **Arsenal**: All weapons you own fire at the same time, each on its own cooldown and ammo. No weapon switching.
- **Enemies**: Three new types — the armored Bulwark tank, the exploding Burster, and the Splitter that bursts into runners.
- **Controls**: `R` rerolls the shop; co-op shop locks are shared across P1/P2.
- **Cleanup**: Removed `game-improvements.js` (superseded, never loaded) and 5 superseded pre-v0.56 sprite PNGs.

## Previous Update (v0.56A)
- **Performance**: The web build runs faster with identical visuals. Bullets use cached glow sprites instead of per-bullet `shadowBlur`; HUD panels and bars cache their gradients and shadows; the hot loop no longer allocates arrays or objects per frame; the HUD no longer forces a layout every frame; the ground layer is blitted 1:1 instead of resampled.
- **Controls**: In co-op, Player 1 dashes with `Left Shift` and Player 2 dashes with `Right Shift`, so each player dashes independently (`U` still works for P2).

## Previous Update (v0.56) — graphics division
- **Map and money**: Flat warm grey-brown ground with sparse doodles (pebbles, cracks, bones, grass) and matching trees. Money drops are glowing green gems that bob, pulse and swoop toward you, and the HUD/shop currency icon matches.
- **Sprites**: An animated blue (P1) or red (P2) armored player with 4-frame walk cycles in every direction, sized to the hitbox. New original enemies: a raptor Runner, a spiky dino-head Bruiser, a mosquito Spitter and a spiked sandworm as the Overlord boss, all animated and sized to their hitboxes, and the Flamethrower, Arc Thrower, Railgun, Mine Layer and Frost Sprayer have weapon art.
- **Effects**: Hit sparks, death bursts with a shockwave ring, muzzle flashes, tracers, fire/ice/shock glows on enemies and bullets, and a dash after-image trail. Particles scale back automatically in big waves.
- **Shop**: Redesigned in the style of Brotato, with item cards (green/red stats, rarity border and glow, price pill, Lock button), a Stats panel with Primary/Secondary tabs, Items and Weapons grids, and a Go (Wave N+1) button. In co-op, P1/P2 tabs choose who is shopping. It fits 800x600, 1280x720 and 600x1000.
- **UI fixes**: The P2 card no longer sits under the Pause button, the HUD is hidden on the game-over screen, the ammo text has room in the weapon card, the pause box and toast stay clear of the level-up panel, hovering a card no longer moves it outside its click area, and the reload bar fills against your real reload time.

## Previous Update (v0.55)
- **Stability**: Enemies with corrupted positions or health are repaired or removed so a wave can always finish.
- **Physics feel**: Smooth player acceleration and deceleration, mass-based enemy knockback with friction, and calmer screen shake.
- **Balance fixes**: Attack Speed upgrades now make you fire faster, reloads use your reload stat, and the Harpoon's single-target damage is restored.
- **Fixes**: Pausing freezes animations and the wave banner; the dash cooldown resets on a new run.
- **UI**: Shop cards keep a readable width in small windows (co-op shops stack in narrow windows), badges no longer overlap, hover no longer shifts cards away from their click area, and the HUD no longer collides with the Pause button or the game-over screen.

## Previous Update (v0.54)
- **Combat fixes**: Enemies on top of you can be hit again, fast bullets no longer pass through small enemies, shock-chain kills credit the right co-op player, and a killed enemy can't hurt you on the same frame.
- **Controls**: Auto Shoot off fires only while you hold the mouse button or Space; Mouse Aim off always auto-targets the nearest enemy.
- **Game feel**: Enemies spread out instead of stacking on one spot, and auto-aim leads moving targets a little.
- **WASM shop**: Start no longer freezes when the game is served over http. The C# shop is only used once it has loaded the game data; otherwise the JS shop takes over. Opening the game from a file no longer logs a CORS error.

## What’s Included
- **Wave system**: Wave 1 → Wave 20 with horde-scaled enemy counts and difficulty; elites on danger-gated waves.
- **Boss at Wave 20**: A large Overlord boss (a spiked sandworm) bursts out of the ground on the final wave, alongside elites.
- **Danger levels (1–5)** with unlocks stored in `localStorage`.
- **Co-op**: Two local players with independent weapons, XP, money, and HUD.
- **Shop + Reroll + Lock**: Reroll for increasing cost, lock cards to keep them for the next wave.
- **Items + Rarity + Combining**: 6 item slots, combine two of same item + rarity into next tier.
- **Level-up selector**: Pick one stat upgrade at the end of each wave.
- **Elemental status effects**: Fire burn, Ice slow, Shock chain.
- **Polished UI**: stats panel, split-shop in co-op, end-of-run summary.
- **Background music**: light ambient loop (WebAudio).

## How To Run
1. Open `Index.html` in your browser.
2. Choose **Danger** and **Class**, then click **Start Game**.

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
- **Mouse Aim on**: you aim at the cursor while the mouse is moving or the button is held; otherwise you auto-aim at the nearest enemy. With Auto Shoot on, moving the mouse makes you fire at the cursor.
- **Mouse Aim off**: you always auto-aim at the nearest enemy (or a tree), whatever the mouse does.

### Shop
- Click a card to buy (or `←`/`→` to select and `Space` to buy)
- Right-click a card or click its **Lock** button to keep it for the next wave
- Click **Reroll** (or press `R`) to refresh the shop
- Co-op: click the **P1 / P2** tabs next to the title to choose who is shopping
- **Primary / Secondary** tabs switch the Stats panel
- `Tab` toggles the full **Stats** view
- `Enter` or **Go (Wave N+1)** starts the next wave

### General Controls
- `M` — Mute/Unmute audio
- `P` — Pause/Resume

## Wave System
- Wave 1 starts at **16 enemies**; each wave adds **+8** (`16 + (wave-1)*8`, so wave 19 = 160).
- The spawn interval gets shorter every wave, so late waves keep real pressure (capped for performance).
- Enemy HP (+20% base) and damage scale per wave and per Danger level.
- **Elites**: tougher variants spawn on wave **12** (Danger 2–5), wave **16** (Danger 4–5) and wave **20** (Danger 1–5). Elites have 3x HP, 1.4x damage, bigger bodies, a pulsing gold ring, and drop triple XP/money. They count toward wave completion.
- **Wave 20 = Boss Wave** (Overlord) — plus elites on every danger level.

## Danger Levels
- 1 → 5 (only 1 unlocked initially)
- Completing Wave 20 unlocks next Danger
- Higher Danger boosts spawn count, HP, damage, XP, money

## Items, Rarity & Combining
- Rarity: **Common → Rare → Epic → Legendary**
- Higher rarity means better stats: weapon and item power scale **1x / 1.25x / 1.5x / 2x**, and shop prices scale the same way
- Shop rarity roll weights: **50 / 35 / 10 / 5** (Luck improves the odds of higher tiers); shop cards show a rarity-coloured border and glow
- **2 identical items of the same rarity combine** into the next tier
- **Max 6 items** per player

## Elemental Effects
- **Fire**: burn damage over time
- **Ice**: slows enemies
- **Shock**: chains to a nearby enemy
- **Explosive** weapons count as Fire

## End-of-Run Screen
Shows:
- Class and stats
- Weapons owned
- Items owned (with rarity)

## Files
- `Index.html` — entry page and UI
- `game.js` — all gameplay logic
- `fx.js` — v0.56 animated sprites and effects (draw-side only; game.js calls it from a few lines marked `[brad-fx]`)
- `ui.js` — v0.56 shop screen layout and drawing (game.js delegates to it from lines marked `[brad-ui]`)
- `assets/sprites/` — pixel-art sprite sheets (player, enemies, weapons, UI icons)
- `tools/gen_sprites.py` — regenerates everything in `assets/sprites/` (`python3 tools/gen_sprites.py`, needs Pillow)
- `style.css` — UI styling
- `IMPROVEMENTS.md` — detailed documentation of v0.51 improvements
- `INTEGRATION_EXAMPLE.js` — integration guide for improvements

## Performance
- **Target**: 55-60 FPS on modern browsers
- **Optimizations**: cached glow sprites, offscreen HUD panels, no per-frame allocations in the hot loop, no forced layout from the HUD

## Development
- `tools/gen_sprites.py` regenerates everything in `assets/sprites/` (`python3 tools/gen_sprites.py`, needs Pillow)
- See `IMPROVEMENTS.md` for the v0.51 improvement notes (historical; `game-improvements.js` was removed in v0.56A — its balance tweaks conflicted with tuned values, its pooling was superseded by the perf pass, and its bug fixes were already applied)

## Changelog
- **v0.5.8B** (2026-10-12): Menu/UI revamp — Brotato-style class select, weapon select step, danger selection with per-danger modifiers, Run Won / Run Over summary screens
- **v0.5.7** (2026-10-12): Hordes (16 + (wave-1)*8 enemies), enemy HP +20%, weapon rebalance for all-weapons-fire, rarity tiers fixed (common/rare/epic/legendary), elites on waves 12/16/20 by danger
- **v0.5.6** (2026-10-12): Wave-20 danger unlock (no victory screen), all owned weapons fire at once, 3 new enemies (Bulwark/Burster/Splitter), R rerolls shop, shared co-op locks, removed game-improvements.js and 5 old PNGs
- **v0.56A** (2026-10-12): Web performance pass (identical visuals), co-op dash split to Left Shift (P1) / Right Shift (P2)
- **v0.56** (2026-10-07): Animated player/enemy sprites, art for 5 weapons, new enemy art (raptor, dino head, mosquito, sandworm boss), new ground and gem money, hit/death/muzzle/elemental/dash effects, Brotato-style shop, UI overlap fixes
- **v0.55** (2026-10-07): Attack Speed fix, Harpoon damage restored, enemies kept in the arena, player acceleration, enemy knockback, calmer screen shake, NaN safety net, pause freezes animations, dash cooldown reset on new run, shop/HUD layout fixes for small windows
- **v0.54** (2026-10-07): Point-blank and swept bullet hits, co-op chain-kill credit, enemy separation, auto-aim lead, WASM Start freeze fix
- **v0.53** (2026-10-07): Sprite and UI polish (all sprite art, crisp rendering, rebuilt HUD/shop/level-up, working Auto Shoot/Mouse Aim settings)
- **v0.52** (2026-10-07): Fixed mid-wave freeze when burn/shock damage kills an enemy
- **v0.51** (2026-03-02): Major improvements to balance, bugs, UI/UX, and performance
- **v0.50**: UI refresh, new weapon sprites, auto-target improvements, runtime optimizations

---
**Want more features?** Open an issue or submit a PR! 🚀
