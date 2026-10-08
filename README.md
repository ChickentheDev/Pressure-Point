# Brotato-lite (Expanded) — v0.56 ALPHA

A polished, local Brotato-inspired top-down arena shooter built with HTML5 Canvas and JavaScript.

## Latest Update (v0.56) — graphics division
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
- **Wave system**: Wave 1 → Wave 20 with scaling enemy counts and difficulty.
- **Boss at Wave 20**: A large Overlord boss (a spiked sandworm) bursts out of the ground on the final wave.
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
- Dash: `Shift`
- Aim and fire: see **Auto Shoot / Mouse Aim** below
- Fire (when Auto Shoot is off): hold the left mouse button or `Space`
- The last weapon you bought is the one you use

### Player 2 (co-op)
- Move: Arrow keys
- Dash: `U`
- Always auto-aims at the nearest enemy and auto-fires

### Auto Shoot / Mouse Aim (Settings)
- **Auto Shoot on**: you fire whenever there is a target.
- **Auto Shoot off**: you fire only while holding the left mouse button or `Space`.
- **Mouse Aim on**: you aim at the cursor while the mouse is moving or the button is held; otherwise you auto-aim at the nearest enemy. With Auto Shoot on, moving the mouse makes you fire at the cursor.
- **Mouse Aim off**: you always auto-aim at the nearest enemy (or a tree), whatever the mouse does.

### Shop
- Click a card to buy (or `←`/`→` to select and `Space` to buy)
- Right-click a card or click its **Lock** button to keep it for the next wave
- Click **Reroll** to refresh the shop
- Co-op: click the **P1 / P2** tabs next to the title to choose who is shopping
- **Primary / Secondary** tabs switch the Stats panel
- `Tab` toggles the full **Stats** view
- `Enter` or **Go (Wave N+1)** starts the next wave

### General Controls
- `M` — Mute/Unmute audio
- `P` — Pause/Resume

### Planned (not in the game yet)
- Weapon switching with `Q` / `E` or `1–5`
- `R` to reroll the shop
- `F` FPS counter and `H` keyboard-shortcuts help (these live in `game-improvements.js`, which `Index.html` does not load yet)

## Wave System
- Wave 1 starts at **10 enemies**.
- Each wave adds **+5 enemies**.
- Difficulty scales per wave and per Danger level.
- **Wave 20 = Boss Wave** (Overlord).

## Danger Levels
- 1 → 5 (only 1 unlocked initially)
- Completing Wave 20 unlocks next Danger
- Higher Danger boosts spawn count, HP, damage, XP, money

## Items, Rarity & Combining
- Rarity: **Common → Rare → Epic → Legendary**
- Items scale in power by rarity
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
- `assets/sprites/` — v0.56 pixel-art sprite sheets (player, enemies, weapons, UI icons); the original PNGs in the root are unchanged
- `tools/gen_sprites.py` — regenerates everything in `assets/sprites/` (`python3 tools/gen_sprites.py`, needs Pillow)
- `game-improvements.js` — performance, balance, and UX improvements (v0.51)
- `style.css` — UI styling
- `IMPROVEMENTS.md` — detailed documentation of v0.51 improvements
- `INTEGRATION_EXAMPLE.js` — integration guide for improvements

## Performance
- **Target**: 55-60 FPS on modern browsers
- **Optimizations**: Object pooling, efficient collision detection, reduced garbage collection
- **Monitoring**: FPS counter (`F`) is planned; it lives in `game-improvements.js`, which is not loaded yet

## Development
To integrate the v0.51 improvements into the main game:
1. Include `game-improvements.js` before `game.js` in `Index.html`
2. Follow the integration steps in `INTEGRATION_EXAMPLE.js`
3. See `IMPROVEMENTS.md` for complete documentation

## Changelog
- **v0.56** (2026-10-07): Animated player/enemy sprites, art for 5 weapons, new enemy art (raptor, dino head, mosquito, sandworm boss), new ground and gem money, hit/death/muzzle/elemental/dash effects, Brotato-style shop, UI overlap fixes
- **v0.55** (2026-10-07): Attack Speed fix, Harpoon damage restored, enemies kept in the arena, player acceleration, enemy knockback, calmer screen shake, NaN safety net, pause freezes animations, dash cooldown reset on new run, shop/HUD layout fixes for small windows
- **v0.54** (2026-10-07): Point-blank and swept bullet hits, co-op chain-kill credit, enemy separation, auto-aim lead, WASM Start freeze fix
- **v0.53** (2026-10-07): Sprite and UI polish (all sprite art, crisp rendering, rebuilt HUD/shop/level-up, working Auto Shoot/Mouse Aim settings)
- **v0.52** (2026-10-07): Fixed mid-wave freeze when burn/shock damage kills an enemy
- **v0.51** (2026-03-02): Major improvements to balance, bugs, UI/UX, and performance
- **v0.50**: UI refresh, new weapon sprites, auto-target improvements, runtime optimizations

---
**Want more features?** Open an issue or submit a PR! 🚀
