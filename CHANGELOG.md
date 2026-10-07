# Changelog

## v0.55 ALPHA — 2026-10-07
- Investigated the "wave never completed" runs (Gravelord waves 11-13, Arc Thrower at danger 3 wave 18). They were not caused by v0.54 and the game never stalled: v0.53 fails the same runs with every enemy stacked on exactly one point, while v0.54 keeps enemies apart and keeps killing, just too slowly for the test's 200-second limit. The test moved the player in a circle faster than any class can run (about 330 px/s), so slow shots trailed a pack following inside the circle. The test harness now moves the player at its real speed and only reports a stall when nothing spawns or dies for 60 seconds.
- Added a safety net: an enemy with a broken (NaN) position is moved back to the arena edge, an enemy with broken health is removed so the wave can still finish, and broken bullets are dropped.
- Smoother movement: the player now accelerates up to full speed in about a quarter of a second and glides briefly to a stop instead of starting and stopping instantly. Leaving a dash keeps your momentum.
- Enemy knockback: hits push enemies back based on damage and enemy size (small runners move most, bosses barely move), and the push fades out with friction. Sustained fire only slows a charging enemy a little (a runner reaches a Flamethrower user in about 1.75s instead of 1.4s), so balance stays close.
- Screen shake is toned down: all shake is scaled to 60%, capped lower and fades faster, bullet hits shake less, and touching an enemy gives one kick instead of maximum shake every frame.
- Pausing now freezes the animation clock, screen shake and the wave banner.
- The dash cooldown resets when you start a new run.
- Shop cards are never narrower than 160px: each shop uses 3, 2 or 1 columns to fit, and the two co-op shops stack vertically in tall, narrow windows. Long names and stats are trimmed with an ellipsis, weapon stats wrap onto an extra line when needed, and the LOCKED badge no longer covers the price.
- Shop cards, level-up cards and buttons no longer lift on hover, so what you see is exactly what you can click.
- The co-op P2 card sits below the Pause button at every HUD scale, the HUD is hidden on the game-over screen, the weapon card is taller so the ammo text clears its border, and on-screen messages (like "Paused") move off the level-up panel and the shop.

## v0.54 ALPHA — 2026-10-07
- Fixed enemies standing on top of the player being impossible to hit. Bullets now use a swept hit test from the player's centre, so point-blank shots land and fast bullets can no longer skip past small enemies.
- Shock-chain kills now reward the player whose shot started the chain (co-op).
- An enemy killed by a bullet no longer deals contact damage in the same frame.
- Enemies now gently push apart instead of stacking on one spot, and auto-aim leads moving targets a little.
- Fixed the page freezing on Start when the game is served over http with the C# WASM module. The game no longer calls the WASM shop before it has loaded and accepted the weapon/item data, converts the data and results between the JS and C# formats, and falls back to the JS shop if the module fails or takes longer than 10 seconds.
- Opening `Index.html` directly (file://) or in the desktop app no longer loads the WASM loader, which removes the CORS console error.
- Fixed Auto Shoot off: you now fire only while holding the mouse button (or Space), instead of firing when the mouse moves and not when you click.
- Fixed Mouse Aim off being ignored: auto-aim now always targets the nearest enemy, whatever the mouse does.
- Piercing bullets hit each enemy once and carry on to the next one instead of spending their pierce on the same enemy.

## v0.53 ALPHA — 2026-10-07
- All weapon art is now used, including the Harpoon, DMR and Grav Shotgun sprites, and the yellow Spitter enemy has its own sprite.
- Pixel art is drawn crisp instead of blurry. Characters and trees get drop shadows, hit flashes, facing, a walk bob and a dash blink; co-op players get P1/P2 rings and labels.
- Rebuilt the HUD (player card with HP/XP/level/coins, wave counter with enemies-left bar, weapon card with ammo/reload/heat, dash meter), the shop (wallet, rarity labels, lock badges, Reroll and Next-wave buttons) and the level-up cards.
- Fixed shop and level-up cards only being clickable on part of the drawn card.
- The Auto Shoot and Mouse Aim settings are now wired to the game, menus and settings resize with the window, and the restart button no longer overlaps the game-over panels.

## v0.52 ALPHA — 2026-10-07
- Fixed the game freezing mid-wave (often around wave 7) when an enemy was killed by burn or shock damage instead of a bullet. Those enemies were never removed, and drawing their negative-width health bar crashed the game loop.
- Enemies killed by burn or shock now die normally and reward the player who last hit them.
- Rounded UI boxes can no longer crash the renderer when given a negative size.

## v0.50 ALPHA — 2026-02-14
- Swapped to a teal/blue neon menu color scheme.
- Integrated new weapon sprite models for `Minigun`, `Pulse Rifle`, `RPG`, `Shotgun`, and `Titan Cannon`.
- Fixed auto-targeting so players target trees when no enemies are available.
- Improved update-loop performance by reusing alive-player lists and caching shop weapon preview stats.

## v0.48 ALPHA — 2026-02-07
- Updated changelog and versioning consistency.

## v0.45 ALPHA — 2026-02-07
- Added Auto Shoot and Mouse Aim toggles in settings.
- Polished menu settings layout.

## v0.44 ALPHA — 2026-02-07
- Added INSTALL.md with install/run steps.

## v0.43 ALPHA — 2026-02-07
- Reduced screen shake intensity.

## v0.42 ALPHA — 2026-02-07
- Reduced money earned from enemies.

## v0.41 ALPHA — 2026-02-07
- Max HP upgrades now add flat HP instead of percent scaling.
- Enemy damage scaling increased for later waves.
- Money drops clear when upgrade/shop opens.

## v0.40 ALPHA — 2026-02-07
- Fixed menu script error blocking class list and Start button.

## v0.39 ALPHA — 2026-02-07
- Fixed Electron app version to valid semver (0.1.0).

## v0.38 ALPHA — 2026-02-07
- Added Electron desktop scaffolding with auto-updates via GitHub releases.

## v0.37 ALPHA — 2026-02-07
- Minigun now overheats, has 200 ammo, and costs 1000 (red-tier only).

## v0.36 ALPHA — 2026-02-07
- Added on-screen Pause button (top-right) alongside the P key.

## v0.35 ALPHA — 2026-02-07
- Added wave-complete watchdog to avoid freezes when a wave finishes.

## v0.34 ALPHA — 2026-02-07
- Ensured trees spawn each wave with a safety check.
- Disabled player movement during Shop and Level-Up screens.

## v0.33 ALPHA — 2026-02-07
- Added destructible Trees that spawn each wave and drop healing Fruit.
- Added fruit pickups that heal on contact.

## v0.32 ALPHA — 2026-02-07
- Fixed shop lock/reroll glitches and reduced shop card text overlap.
- Added Harpoon weapon with pierce and a Piercing Bullet item.
- Added main menu settings for screen shake toggle and low-graphics mode.

# Changelog

# Changelog

## v0.31 ALPHA — 2026-02-07
- Compiled `Extra.cs` to WebAssembly with .NET 8; outputs placed in `wasm/dist/_framework`.
- Added `wasm/systems.loader.js` (module) and updated `Index.html` to load it; `game.js` now fetches `window.SystemsWasm` dynamically.
- Keeps JS fallback via stub if WASM fails to load.

## v0.32 ALPHA — 2026-02-07
- `wasm/systems.loader.js` skips WASM when running from `file://` or when `window.DISABLE_WASM` is set, so double-clicking `Index.html` works without localhost.
- Added inline SVG favicon to stop 404s for `/favicon.ico`.

## v0.30 ALPHA — 2026-02-07
- Added WASM bridge scaffolding: `wasm/systems.stub.js` loaded by `Index.html`, plus build instructions in `wasm/README.md` for compiling `Extra.cs` to WebAssembly.
- `game.js` now honors an injected `systems.rollShop` from WASM, while stubbing safely when missing.

## v0.29 ALPHA — 2026-02-07
- Added `Extra.cs` C# blueprint for advanced systems (wave patterns, status engine, shop roller, save schema) to aid future engine ports.
- Kept pause (P) and mute (M) UX; mute indicator stays on HUD.
- Retained impact polish (damage numbers, shake, dash trail/I-frames, low-HP pulse).

## v0.28 ALPHA — 2026-02-07
- Added pause toggle (P) with on-screen overlay; gameplay and spawns halt while paused.
- Added global audio mute toggle (M) with HUD indicator and persisted bgm gain handling.
- Added damage numbers, camera shake, dash trail/I-frames, low-HP pulse, and HUD dash meter.
- Visual polish for panels, shop fog, gradients, and impact feedback.

## v0.27 ALPHA — 2026-02-07
- Introduced dash ability, camera shake, floating damage numbers, and low-HP screen pulse.
- Enhanced shop/wave visuals and HUD gradients.

## v0.26 ALPHA — 2026-02-06
- Initial polished release: danger levels, co-op, shop with reroll/lock, items + combining, level-up selector, elemental effects, boss wave, and ambient BGM.
