## v0.6.8.1 — Map fix + Glassjaw 1-HP lock
- **Map off-center fix**: ground blit now runs under identity transform (hidpi regression from perf pass).
- **Glassjaw 1-HP invariant enforced**: Vitality, in-wave Max HP upgrades, shop +Max HP items, and level-up HP no longer raise Glassjaw above 1 HP (in-wave Max HP choice heals to full instead). Co-op revive can no longer revive at 0 HP.
- **Vitality substitute for Glassjaw**: grants +4% move speed per level instead (shown in Upgrades screen when Glassjaw is selected).

## v0.6.8 — Class unlocks + Glassjaw
- **New class: Glassjaw** — unlocks by beating Nightmare (D6). Has exactly 1 HP but massive damage (+15), speed (300), and accuracy. Crystal sprite.
- **Classes now unlock via achievements**: 9 of 11 classes locked behind achievements (First Blood, Exterminator, Survivor, Veteran, Shopaholic, Untouchable, Genocide, Medic, One of a Kind). Ironheart stays as starter. Locked classes show as ??? with unlock requirement.
- Fixed class portrait path (was missing 's' in players/).

## v0.6.7 — Nightmare danger + UI polish
- **Danger 6: Nightmare** (D5 renamed to Inferno): +175% HP, +140% damage, +140% hordes, elites on waves 8/12/16/20, faster/stronger enemies. New **Nightmare boss** — all abilities combined, enrages below 50% HP. Danger Zone achievement now requires D6.
- **UI**: essence count on the Upgrades menu button; Nightmare danger button has purple glow styling.

## v0.6.6 — 5 danger bosses
- **One boss per danger level**: D1 Overlord (burrow), D2 Hive Tyrant (spawns minions), D3 Stormcaller (shockwave slams + dashes), D4 Ironclad (40% damage reduction + reflects 30%), D5 Voidreaver (dashes + spawns + shockwaves). D5 still spawns two at once.
- Each boss has unique pixel-art sprite, name on the HP bar, and scaled stats.

## v0.6.5 — Elite mini-bosses
- **Elites are now mini-bosses**: each of the 9 enemy types has a unique elite name (Swiftclaw, Plaguewing, Skullcrusher, Detonator, Fracture, Ironwall, Ravager, Warden, Broodmother) with its own enhanced trait — massive explosions, 4-way splits, damage reflect, wider shield auras, rapid spawning, relentless dashes, venomous slow, shockwave slams.
- **Elite HP bar**: the toughest living elite's name + HP bar shows under the wave counter.
- **Elite drops**: killing an elite showers bonus money and shows a "slain!" banner.

## v0.6.4 — New enemies + Meta progression
- **3 new enemies**: Dasher (periodic burst dashes toward you), Aegis (projects a shield aura — nearby enemies take 30% less damage), Nester (spawns runners every 5s). Unlock at waves 19/22/25; late-game spawn weights widened so they actually appear.
- **Meta progression**: earn Essence from runs (wave reached + kills), spend it on 6 permanent upgrades — Vitality (+HP), Power (+damage), Swiftness (+speed), Fortune (+luck), Wealth (+starting currency), Haste (+fire rate). Upgrades screen on the main menu; essence and levels persist in localStorage. Run summaries show essence earned.

## v0.6.3 — Achievements
- **15 achievements** with unlock toasts: First Blood, Exterminator (500 kills), Genocide (2,000 kills), Survivor (wave 10), Veteran (clear wave 20), Unstoppable (wave 30 endless), Danger Zone (D5 wave 20), Gun Collector (6 weapons), Legendary Arsenal (3 legendaries), Shopaholic (spend 500), One of a Kind (Unique item), Big Spender (Exclusive item), Medic (revive), Lifesaver (3 revives), Untouchable (clear a wave damage-free).
- Achievements screen on the main menu; unlocks persist in localStorage.

## v0.6.2 — Balance patch
- Rarity/DPS rebalance: SMG tamed (common 50→38 DPS); RPG, Titan Cannon, Railgun, Harpoon, Arc Thrower, Mine Layer, Flamethrower buffed to match their rarities; Arc Blade brought in line. Minigun untouched as the legendary benchmark.
- **Endless mode**: after clearing wave 20, a "Continue: Endless" button appears on the victory screen. Waves 21+ scale enemy HP/damage/count, with elites every 4th wave and a boss every 5th. Best endless wave tracked in localStorage and shown on summaries.
- **Co-op**: in-wave revive — stand near a downed partner for 3s to bring them back at 50% HP (progress ring shown); proximity synergy — +15% damage when within 150px of your partner.
- **10 new weapons**: Scattergun, Crossbow (common); Sniper, Plasma Cutter, Mortar (rare); Katana, Grenade Launcher, Flak Cannon (epic); Tesla Coil, Energy Sword (legendary). All with pixel-art sprites.
- No other gameplay changes.

## v0.6.1 — File system cleanup
- Removed legacy cruft: `Brotato-Lite.sln`, `Extra.cs`, `electron/`, `wasm/`, `build/` (old C#/Electron experiments, unreferenced).
- Moved loose docs (`AC_TASKS.md`, `IMPROVEMENTS.md`, `INSTALL.md`, `INTEGRATION_EXAMPLE.js`) into `docs/`.
- Reorganized `assets/`: `assets/weapons/` (16 weapon sprites), `assets/sprites/players/` (36), `assets/sprites/enemies/` (7), `assets/sprites/cosmetics/` (3), `assets/sprites/fx/` (2), `assets/sprites/ui/` (2). All code references updated.
- Split the 152 KB `game.js` monolith into 8 classic-script modules under `js/` (`core`, `sprites`, `data`, `state`, `systems`, `menu`, `render`, `main`) — same zero-build workflow, plain `<script>` tags in load order (ES modules stay blocked on `file://`).
- No gameplay changes.

## Unreleased — asset organization
- Moved all 12 root image assets (11 weapon PNGs + Map.png) into `assets/`; updated all code references. No visual changes.

## Unreleased — v0.6.0 Class expansion
- **Custom class sprites**: all 10 classes now have their own distinct 4-direction walk-animated sprite (same pixel-art pipeline/style as the v0.56 set): steel-blue Ironheart, green Foxglove hunter, bulky brown Gravelord, orange Scrapjack, yellow Voltblade with arc shoulder spikes, cyan Circuitry with glowing traces, heavy gray Bulwark (bulkier frame), aggressive red Redline, white Skylark (slimmer), purple Nightreap with dark hood. Class select shows the sprite as the class portrait. P2 uses the same sprite as P1 (co-op ring still distinguishes players); old p1/p2 sheets kept as fallback.
- **Cosmetic equipment (paper-doll)**: certain shop items now visibly render on your character — Dense Plating adds shoulder/chest armor, Ammo Belt adds ammo pouches, and the NEW epic item **War Crown** (+2 Luck, +6% Damage) puts a gold crown on your head. Works for P1 and P2 independently.
- **100 new items** (shop pool now 110): 40 common / 30 rare / 20 epic / 10 legendary with evocative names and accurate auto-generated descriptions.
- **5 item categories** (colored tag on shop cards): Tech (cyan), Primal (green), Arcane (purple), Unique (gold), Exclusive (magenta).
- **Unique rule**: at most ONE Unique item per player — no duplicates, exempt from combining; shop stops offering Uniques once owned.
- **Exclusive rule**: only rolls at epic/legendary; 1.5x shop price multiplier.
- New items use category-glyph icons until dedicated art exists. Buying can no longer charge when the add is refused.
- **UI polish**: wave progress HUD shows kill progress as `killed/total` (including elites and the wave-20 double boss); elites wear a gold crown with a thicker gold HP bar; the wave-1 shop guarantees one 10-currency starter deal.

## Unreleased — menu revamp
- Menu flow is now Class → Weapon → Danger → Start (Brotato-style): class grid with detail panel (starting weapon, green/red stat lines vs Ironheart baseline, tagline); NEW weapon-select step with all 15 weapons (icon grid + detail panel: damage, fire delay, magazine/reload, spread, traits) — the pick becomes the run's starting weapon; danger select with numbered buttons and a detail panel showing each danger's full modifier list.
- Difficulty buffs (`DANGER_MODS`, displayed and applied): D1 baseline; D2 +8% enemy speed; D3 +15% horde size; D4 +15% enemy damage; D5 +30% horde size and TWO Overlords on wave 20. Elite gating unchanged (12 on D2-5, 16 on D4-5, 20 on D1-5).
- Run Won screen replaces the bare victory banner: Stats / Weapons / Items / Progress panels, gold "DANGER N UNLOCKED!" banner when earned, Retry / New Run / Main Menu buttons. Confetti + fanfare retained; never traps the player.
- Run Over screen on death: same panel layout with Retry / New Run / Main Menu. Fixed: death from non-contact sources now reliably ends the run (safety net in the wave update).
- Pause menu revamped: panel with class (name, trait, starting weapon), owned weapons, and full stats; Resume / Quit to Menu. Replaces the old "PAUSED" box.

## Unreleased — class rebalance
- All 10 classes rebalanced with distinct identities (kept the roster, retuned the stats)
- **Bug fix**: class HP was dead data — every class started with identical HP regardless of its `hp` value. Now a real `hpMult` applies (Bulwark 1.4x/21 HP/10 armor is finally a tank; Skylark 0.9x/13 HP is the fragile speedster)
- Foxglove's `damageBonus: 0` (literally nothing) replaced with +2 Luck and 1.25x accuracy — the precise hunter finds better loot
- Duplicates differentiated: the three rifles are now balanced (Ironheart) / fast-reload (Circuitry) / high-damage (Redline); the three pistols are precision (Foxglove) / tank (Bulwark) / speed (Skylark)

## Unreleased — weapon buffs
- Railgun: mag 2→4, reload 2.2→1.8 (sustained ~36→~57 DPS — properly legendary now)
- RPG-7: damage 45→55, mag 1→2, reload 2.6→2.2 (sustained ~12→~23 DPS before AoE)
- Titan Cannon: damage 24→36, fireRate 1.0→0.9 (sustained ~15→~24 DPS before AoE)
- In-game title renamed from Brotato-lite to Pressure Point (menu header + browser tab)

## Unreleased — hordes & balance
- Hordes: wave sizes raised to `16 + (wave-1)*8` (wave 1: 16 enemies, wave 19: 160; was 10 + (wave-1)*5), and the spawn interval now ramps faster (`max(0.35, 1.0 - wave*0.035)`) so late waves keep real pressure. Danger and co-op multipliers still stack on top; the 120-concurrent-enemy safety cap is unchanged for the perf budget.
- Enemy HP +20% across the board (runner 18→22, spitter 30→36, bruiser 50→60, burster 16→19, splitter 42→50, bulwark 150→180, Overlord boss 1200→1440). Wave/danger scaling stack on top unchanged.
- Weapon rebalance for the all-weapons-fire arsenal: base damage reduced ~30% and fire rates slightly lengthened across the table, keeping each weapon's role (shotgun close burst, DMR long range, flamethrower crowd, railgun single-target, etc.). A full 6-weapon legendary-tier arsenal now clears a wave-19 horde in ~30-40s instead of melting it. Minigun base price fixed (1000→240); legendary prices now sit 230-260 before the tier multiplier.
- Rarity system fixed: the top tier id is now `legendary` everywhere (was the color-name `red`), matching what the UI already displayed. Canonical tiers: Common → Rare → Epic → Legendary, with stat/price multipliers 1x / 1.25x / 1.5x / 2x, shop roll weights 50 / 35 / 10 / 5 (luck improves the odds), and rarity-coloured borders/glows on shop cards. Items still combine two-of-a-kind up the tiers. (The level-up upgrade tiers Gray/Blue/Purple/Red are a separate system and unchanged.)
- Elites: on wave 12 (danger 2-5), wave 16 (danger 4-5) and wave 20 (danger 1-5), 2-3 elites spawn with the wave (3 at danger 4-5). Elites are scaled-up variants of normal enemies: 3x HP, 1.4x damage, 1.35x size, triple XP/money, a pulsing gold ring and a gold HP bar, plus an "ELITES INBOUND" banner and warning sound. They count toward wave completion.

## Unreleased — feature-complete batch
- Final wave: clearing wave 20 no longer loops it forever. It unlocks the next danger level (if earned), shows a "DANGER N UNLOCKED!" celebration banner with confetti, then returns to the menu where the new danger is selectable. No victory screen, per design.
- All weapons equipped at once: every owned weapon (up to 6) fires simultaneously, each on its own cooldown/ammo/reload/overheat. Removed the dead `switchWeaponFor()` and the weapon-switch concept; the HUD weapon card now shows the whole arsenal with per-weapon ammo bars, the in-hand art fans all owned weapons around the aim direction, and shop weapon cards show raw stats instead of comparing against a "current" weapon. Note: total DPS now scales with arsenal size; enemy balance unchanged.
- Co-op shop locks verified shared: `shop.locked` is a single array across both P1/P2 tabs, so locking an item locks it for both players. No change needed.
- Removed `game-improvements.js` (v0.51 patch file, never loaded by Index.html): its balance tweaks conflicted with tuned values, its pooling was superseded by the perf pass, its bug fixes were already applied, and its F/H help content was outdated. README references updated.
- New enemies (sprites generated via `tools/gen_sprites.py`, same chunky pixel-art pipeline): Bulwark (slow armored tank), Burster (fast, explodes near the player for AoE damage — no reward if it detonates), Splitter (bursts into two runners on death). Wired into the wave-tier spawn table (waves 1–3 runners … 16–19 bulwarks, boss at 20); separation, knockback and hit-flash handle them like existing types.
- Docs: fixed the triple `# Changelog` header; README controls updated (all-weapons-fire, no weapon switching).

## Unreleased — web performance pass (no visual changes)
- Bullets now use cached glow sprites instead of per-bullet `shadowBlur`: same glowing-disc look, same per-weapon colours and crit gold, far cheaper to draw.
- HUD panels and bars cache their gradients, shadows and highlights to offscreen bitmaps instead of rebuilding them every frame; `shade()` results are memoized.
- Removed per-frame garbage from the hot loop: no array allocations inside the enemy update loop, no per-frame `Set` in the FX system, no regex tested on every bullet's colour every frame.
- Fixed forced layout every frame: the HUD no longer measures DOM rectangles per frame, and cursor/button-visibility writes are skipped when unchanged.
- The ground layer is now blitted 1:1 instead of being resampled every frame.
- Co-op dash: Player 1 dashes with Left Shift and Player 2 dashes with Right Shift, so each player dashes independently on a shared keyboard (`U` still works for P2).


## v0.56 ALPHA — 2026-10-07 (graphics division)
- New animated pixel-art player: a blue armored suit (red for Player 2) with a 4-frame walk cycle facing up, down and sideways (mirrored for left). The body is 28 px wide, the same as the player hitbox.
- New original enemy art in a chunky, thick-outlined, earthy style, each sprite sized to its hitbox with a drop shadow so it reads on the ground: Runner is a mauve raptor with a spiky back and a 4-frame run, Bruiser is a spiky dino head with yellow bumps that hops and chomps, Spitter is a teal-headed mosquito with flapping wings and a curled body that drips green spit, and the wave 20 Overlord boss is now a spiked sandworm swaying out of a dirt mound, bursting up from the ground when it spawns. Frozen enemies animate at half speed.
- New map look: flat warm grey-brown ground with sparse, low-contrast doodles (pebbles, cracks, bones, grass tufts, twigs), drawn once offscreen so it costs nothing per frame. Trees are recoloured to match. The old Map.png stays in the repo.
- Money drops are now bright green glowing gems with a dark outline in a few shapes and random rotations. They bob, pulse and stretch as they swoop toward you inside the normal pickup range. The HUD and shop currency icon use the same gem. Pickup range and values are unchanged.
- Added weapon art for the Flamethrower, Arc Thrower, Railgun, Mine Layer and Frost Sprayer, so every weapon now has a sprite in your hands, on the HUD and in the shop.
- New effects: hit sparks in the weapon's element colour, death bursts with debris, smoke and a shockwave ring, muzzle flashes, short bullet tracers, glowing fire/ice/shock bullets, fire/ice/shock glows on affected enemies (embers, frost and lightning arcs), and a blue after-image trail when you dash. The old flat particles now render as soft glows.
- Particle effects scale back automatically in big waves (fewer particles per event above 40/80/140 enemies, plus a hard cap), and they follow the Graphics preset and Particle FX settings.
- Redesigned the between-waves shop in the style of Brotato: a "Shop (Wave N)" title, the wallet centred at the top, a REROLL button at the top right, and item cards with an icon tile, a type line, green/red stats, a rarity-coloured border with a glow, a price pill, and a Lock button under each card. (Weapon cards originally compared stats against your current weapon; the feature-complete batch changed them to show raw stats since all owned weapons now fire at once.) There is also a Stats panel with Primary and Secondary tabs, an Items grid with stack counts, a Weapons (n/6) grid, a next-wave info line with badges, and a big Go (Wave N+1) button. The layout adapts to 800x600, 1280x720 and portrait 600x1000 windows.
- Co-op shop: P1/P2 tabs choose who is shopping, so each player gets full-size cards, their own wallet, stats, items and weapons instead of two cramped half-width shops.
- A locked card shows a padlock on its icon and a dashed outline, and its Lock button turns into a yellow "Locked" button. Nothing covers the price anymore.
- Hovering a shop or level-up card lifts it inside its own click area, so the highlighted card is exactly what you can click.
- The co-op Player 2 card always sits below the Pause button, including at the smallest (0.8) HUD scale.
- The HUD and wave banner are no longer drawn over the game-over screen or the shop, and the Pause button is hidden in the shop.
- The weapon card is a little taller, so the ammo count no longer touches its bottom border.
- Pausing during level-up shows the PAUSED box above the level-up panel, and the pause/mute toast now appears near the bottom of the screen instead of over the panel.
- The v0.56 shop replaces the v0.55 shop layout but keeps its small-window rules: cards are never narrower than 160px (6 across in wide windows, otherwise 3 or 2 per row), names and type lines wrap or shrink instead of being cut off, and the Lock button never covers the price.
- The HUD reload bar now fills against your actual reload time, so with faster reloads it starts empty instead of partly filled.

## v0.55 ALPHA — 2026-10-07
- The "wave never completed" test runs were not a game stall and not caused by v0.54: v0.53 fails the same runs. The test harness ran out of damage because it never bought anything and the Attack Speed upgrade it picked actually slowed fire (fixed below). The harness now buys weapons and damage items, picks damage upgrades, moves the player at its real speed, and only reports a stall when enemies are on the field and none loses HP for 10 seconds.
- Added a safety net: an enemy with a broken (NaN) position is moved back to the arena edge, an enemy with broken health is removed so the wave can still finish, and broken bullets are dropped.
- Smoother movement: the player now accelerates up to full speed in about a quarter of a second and glides briefly to a stop instead of starting and stopping instantly. Leaving a dash keeps your momentum.
- Enemy knockback: hits push enemies back based on damage and enemy size (small runners move most, bosses barely move), and the push fades out with friction. Sustained fire only slows a charging enemy a little (a runner reaches a Flamethrower user in about 1.75s instead of 1.4s), so balance stays close.
- Screen shake is toned down: all shake is scaled to 60%, capped lower and fades faster, bullet hits shake less, and touching an enemy gives one kick instead of maximum shake every frame.
- Fixed the Attack Speed upgrade slowing your fire rate instead of speeding it up. Reload time now also uses your fire-rate/reload stat (classes and items that promise faster reloads now deliver).
- Enemies pushed apart by the crowd or knocked back by hits can no longer be shoved outside the arena (before, a crowd in a corner pushed many enemies off-screen).
- Holding Space to fire no longer also presses the Pause button after you have clicked it.
- The Harpoon can hit the same enemy again with its pierce, as it did before v0.54, so its single-target damage is back (v0.54 had cut it to about a third against the boss).
- Docs: README controls corrected (Dash is `Shift` for P1 and `U` for P2, not `Space`); the `F`/`H`/`R` and weapon-switch keys are marked as planned; Auto Shoot / Mouse Aim behaviour documented; added the missing v0.51 changelog entry.
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
- With Mouse Aim on, you aim at the cursor while the mouse is moving or the button is held (otherwise auto-aim picks the nearest enemy). With Auto Shoot on, moving the mouse makes you fire at the cursor.
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

## v0.51 ALPHA — 2026-03-02
- Balance: improved shop economy (better reroll costs), stronger luck scaling, smoother difficulty progression.
- Bug fixes: object pooling for memory management, safer collision detection, dash cooldown sync fix.
- UI/UX: FPS counter (`F`), keyboard shortcuts help (`H`), better visual feedback and critical-hit effects.
- Performance: object pooling to cut garbage collection, steadier frame rate, faster collision checks.
- Note: these changes ship as `game-improvements.js` (see `IMPROVEMENTS.md` and `INTEGRATION_EXAMPLE.js`); `Index.html` does not load that file yet, so the `F` and `H` keys don't work in the game.

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
