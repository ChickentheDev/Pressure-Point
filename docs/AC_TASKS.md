# AC Tasks (Advanced / Complex)

Use these when you want bigger changes than quick tweaks.

- **Boss patterns**: Add phased attacks (dash/laser/summon) to `bossType` and switch behaviors based on HP thresholds in `update`.
- **Enemy roster**: Create new enemy archetypes in `enemyTypes` (fast glass cannons, tanks, bursters) with unique colors, status resistances, and spawn weighting per wave.
- **Weapon mods**: Add alt-fire or charged shots; extend `fireWeaponFor` to branch on a `mode` flag and consume more ammo for stronger shots.
- **Status system**: Generalize to a dictionary of stacks/durations so fire/ice/shock scale with stacks; show stack pips above enemies.
- **Persistence**: Save/load runs (class, wave, items) via `localStorage`; provide a continue button on the menu.
- **Controller support**: Map movement/shoot/confirm to gamepads with `navigator.getGamepads()` polling; add a radial cursor for aim.
- **Performance pass**: Add object pooling for bullets/particles, and throttle particles in large waves for low-spec devices.

Tip: Prototype one change at a time and profile by watching `performance.now()` deltas in the main loop before/after.
