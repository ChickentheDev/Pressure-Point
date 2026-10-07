# Brotato-lite (Expanded) — v0.54 ALPHA

A polished, local Brotato-inspired top-down arena shooter built with HTML5 Canvas and JavaScript.

## Latest Update (v0.54)
- **Combat fixes**: Enemies on top of you can be hit again, fast bullets no longer pass through small enemies, shock-chain kills credit the right co-op player, and a killed enemy can't hurt you on the same frame.
- **Game feel**: Enemies spread out instead of stacking on one spot, and auto-aim leads moving targets a little.
- **WASM shop**: Start no longer freezes when the game is served over http. The C# shop is only used once it has loaded the game data; otherwise the JS shop takes over. Opening the game from a file no longer logs a CORS error.

## Previous Update (v0.53)
- **Sprites**: Every weapon and enemy uses its art, drawn crisp, with shadows, hit flashes, facing and walk animation.
- **UI**: Rebuilt HUD, shop and level-up screens; clicks now match the drawn cards; Auto Shoot and Mouse Aim settings work.

## What’s Included
- **Wave system**: Wave 1 → Wave 20 with scaling enemy counts and difficulty.
- **Boss at Wave 20**: A large Overlord boss spawns on the final wave.
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
- Switch weapons: `Q` / `E` or `1–5`
- Dash: `Space`

### Player 2 (co-op)
- Move: Arrow keys
- Dash: `Space`

### Shop
- Click card to buy
- Right-click card to **lock**
- Press `Tab` to toggle **Stats**
- Press `R` or click **Reroll** to refresh shop

### General Controls
- `F` — Toggle FPS counter
- `H` — Toggle keyboard shortcuts help
- `M` — Mute/Unmute audio
- `P` — Pause/Resume
- `Enter` — Start wave / Confirm

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
- `game-improvements.js` — performance, balance, and UX improvements (v0.51)
- `style.css` — UI styling
- `IMPROVEMENTS.md` — detailed documentation of v0.51 improvements
- `INTEGRATION_EXAMPLE.js` — integration guide for improvements

## Performance
- **Target**: 55-60 FPS on modern browsers
- **Optimizations**: Object pooling, efficient collision detection, reduced garbage collection
- **Monitoring**: Built-in FPS counter (press `F` to toggle)

## Development
To integrate the v0.51 improvements into the main game:
1. Include `game-improvements.js` before `game.js` in `Index.html`
2. Follow the integration steps in `INTEGRATION_EXAMPLE.js`
3. See `IMPROVEMENTS.md` for complete documentation

## Changelog
- **v0.54** (2026-10-07): Point-blank and swept bullet hits, co-op chain-kill credit, enemy separation, auto-aim lead, WASM Start freeze fix
- **v0.53** (2026-10-07): Sprite and UI polish (all sprite art, crisp rendering, rebuilt HUD/shop/level-up, working Auto Shoot/Mouse Aim settings)
- **v0.52** (2026-10-07): Fixed mid-wave freeze when burn/shock damage kills an enemy
- **v0.51** (2026-03-02): Major improvements to balance, bugs, UI/UX, and performance
- **v0.50**: UI refresh, new weapon sprites, auto-target improvements, runtime optimizations

---
**Want more features?** Open an issue or submit a PR! 🚀
