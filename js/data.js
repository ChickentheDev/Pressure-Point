// Pressure Point — data.js (split from game.js for v0.6.1)
const stubSystems = { ready: Promise.resolve(), isStub:true };
// C# WASM systems (shop roller). Index.html only injects wasm/systems.loader.js over http(s); it loads
// asynchronously, after this script. Until it has loaded AND accepted our weapon/item data, everything
// uses the JS implementation, so Start never waits on (or hangs in) the WASM module.
// status: off (file://, Electron, DISABLE_WASM) | loading | ready | failed
const wasmSystems = { status: window.__systemsWasmWanted ? 'loading' : 'off', api: null, reason: '' };
function getSystems(){ return wasmSystems.status === 'ready' ? wasmSystems.api : stubSystems; }

function togglePause(){
  state.paused = !state.paused;
  if(pauseBtn) pauseBtn.textContent = state.paused ? 'Resume' : 'Pause';
  if(state.paused){ showPauseMenu(); }
  else { hidePauseMenu(); flashMsg('Resumed', 1.2); }
}

// Game State
const UNLOCK_KEY = 'brotato_unlocked_danger_v1';
const saved = localStorage.getItem(UNLOCK_KEY);
if(saved){ try{ state.unlockedDanger = Math.max(1, Math.min(6, parseInt(saved)||1)); }catch(e){} }

// ---- Difficulty buffs --------------------------------------------------------------------------
// Per-danger modifiers: displayed on the danger-select detail panel AND applied for real.
// The lines describe each danger's TOTAL scaling (base formulas + the new buffs below).
// Base formulas (unchanged): horde count x(1+(d-1)*0.15), enemy HP x(1+(d-1)*0.35),
// enemy damage x(1+(d-1)*0.28). The countMult/speedMult/dmgMult here stack on top.
const DANGER_MODS = {
  1: { color:'#6ef2b1', title:'Standard', doubleBoss:false, countMult:1,    speedMult:1,    dmgMult:1,
       lines:['The standard run.', 'Standard horde sizes.', 'No elites.'] },
  2: { color:'#6cd6ff', title:'Toughened', doubleBoss:false, countMult:1,   speedMult:1.08, dmgMult:1,
       lines:['Enemies +35% HP, +28% damage.', 'Hordes +15% larger.', 'Elites hunt on wave 12.', 'Enemies move 8% faster.'] },
  3: { color:'#b67bff', title:'Relentless', doubleBoss:false, countMult:1.15, speedMult:1.08, dmgMult:1,
       lines:['Enemies +70% HP, +56% damage.', 'Hordes +50% larger.', 'Elites hunt on wave 12.', 'Enemies move 8% faster.'] },
  4: { color:'#ff9f43', title:'Brutal', doubleBoss:false, countMult:1.15, speedMult:1.08, dmgMult:1.15,
       lines:['Enemies +105% HP, +84% damage.', 'Hordes +67% larger.', 'Elites hunt on waves 12 and 16.', 'Enemies deal +15% damage, move 8% faster.'] },
  5: { color:'#ff6b6b', title:'Inferno', doubleBoss:true, countMult:1.3, speedMult:1.08, dmgMult:1.15,
       lines:['Enemies +140% HP, +112% damage.', 'Hordes +108% larger.', 'Elites hunt on waves 12, 16 and 20.', 'TWO Voidreavers on wave 20.'] },
  6: { color:'#c44dff', title:'Nightmare', doubleBoss:true, countMult:1.5, speedMult:1.15, dmgMult:1.3,
       lines:['Enemies +175% HP, +140% damage.', 'Hordes +140% larger.', 'Elites hunt on waves 8, 12, 16 and 20.', 'TWO Nightmare bosses on wave 20.', 'Enemies move 15% faster, deal +30% damage.'] },
};
function dangerMods(d){ return DANGER_MODS[Math.max(1, Math.min(6, d|0))] || DANGER_MODS[1]; }
// enemy, weapon, item definitions (kept similar to earlier)
const enemyTypes = [
  {id:'runner', name:'Runner', color:'#e85', r:10, hp:22, speed:120, dmg:10, xp:6, money:2,
   eliteName:'Swiftclaw', eliteTrait:'+50% speed'},
  {id:'spitter', name:'Spitter', color:'#d94', r:12, hp:36, speed:95, dmg:12, xp:9, money:3, ranged:true,
   eliteName:'Plaguewing', eliteTrait:'venomous touch (slow)'},
  {id:'bruiser', name:'Bruiser', color:'#c43', r:16, hp:60, speed:70, dmg:18, xp:14, money:4,
   eliteName:'Skullcrusher', eliteTrait:'shockwave slam'},
  {id:'burster', name:'Burster', color:'#e07a8a', r:9, hp:19, speed:155, dmg:10, xp:8, money:3, explodes:true,
   eliteName:'Detonator', eliteTrait:'massive explosion'},
  {id:'splitter', name:'Splitter', color:'#8fd4e8', r:13, hp:50, speed:85, dmg:12, xp:12, money:4, splits:true,
   eliteName:'Fracture', eliteTrait:'splits into 4'},
  {id:'bulwark', name:'Bulwark', color:'#8f7654', r:20, hp:180, speed:42, dmg:26, xp:22, money:6,
   eliteName:'Ironwall', eliteTrait:'reflects damage'},
  {id:'dasher', name:'Dasher', color:'#ff9f43', r:11, hp:45, speed:140, dmg:14, xp:12, money:4, dashes:true,
   eliteName:'Ravager', eliteTrait:'relentless dashes'},
  {id:'aegis', name:'Aegis', color:'#6c8ebf', r:18, hp:220, speed:50, dmg:20, xp:26, money:7, shields:true,
   eliteName:'Warden', eliteTrait:'wider shield aura'},
  {id:'nester', name:'Nester', color:'#9b59b6', r:22, hp:300, speed:30, dmg:15, xp:30, money:8, spawns:true,
   eliteName:'Broodmother', eliteTrait:'rapid spawning'},
];

const bossType = {id:'overlord', name:'Overlord', color:'#ff6b6b', r:36, hp:1440, speed:60, dmg:40, xp:120, money:40};

// One boss per danger level, each with unique abilities
const bossTypes = [
  {id:'overlord', name:'Overlord', color:'#ff6b6b', r:36, hp:1440, speed:60, dmg:40, xp:120, money:40,
   ability:'burrow', desc:'Bursts from the ground'},
  {id:'hive', name:'Hive Tyrant', color:'#9b59b6', r:34, hp:1800, speed:55, dmg:44, xp:150, money:50,
   ability:'spawn', desc:'Spawns minions'},
  {id:'storm', name:'Stormcaller', color:'#4cc3ff', r:32, hp:2200, speed:85, dmg:48, xp:180, money:60,
   ability:'shockwave', desc:'Shockwave slams + dashes'},
  {id:'ironclad', name:'Ironclad', color:'#8a8a8a', r:40, hp:3200, speed:40, dmg:55, xp:220, money:75,
   ability:'fortress', desc:'Armored + reflects damage'},
  {id:'void', name:'Voidreaver', color:'#1a1a2e', r:36, hp:4200, speed:100, dmg:65, xp:300, money:100,
   ability:'annihilator', desc:'Dashes, spawns, shockwaves'},
  {id:'nightmare', name:'Nightmare', color:'#c44dff', r:42, hp:6000, speed:110, dmg:80, xp:400, money:150,
   ability:'nightmare', desc:'All abilities, enraged'},
];

const rarities = [
  {id:'common', name:'Common', color:'#8aa0b8'},
  {id:'rare', name:'Rare', color:'#4cc3ff'},
  {id:'epic', name:'Epic', color:'#b67bff'},
  {id:'legendary', name:'Legendary', color:'#ff6b6b'},
];

const weapons = [
  {id:'pistol', name:'Cobalt Pistol', type:'sidearm', rarity:'common', fireRate:0.22, bulletSpeed:700, spread:0.05, damage:10, mag:12, reload:1.1, recoil:0.8, color:'#8be9ff', range:760},
  {id:'harpoon', name:'Harpoon Gun', type:'rifle', rarity:'rare', fireRate:0.5, bulletSpeed:900, spread:0.0, damage:30, mag:6, reload:1.6, recoil:1.2, color:'#9be7ff', pierce:2, rehit:true, range:1050},   // rehit: a harpoon can hit the same enemy again with its pierce (pre-v0.54 behaviour)
  {id:'rifle', name:'Pulse Rifle', type:'rifle', rarity:'rare', fireRate:0.13, bulletSpeed:860, spread:0.02, damage:8, mag:30, reload:1.4, recoil:1.1, color:'#9bff7b', range:880},
  {id:'shotgun', name:'Grav Shotgun', type:'shotgun', rarity:'rare', fireRate:0.65, bulletSpeed:520, spread:0.5, damage:7, pellets:7, mag:6, reload:1.8, recoil:1.4, color:'#ffd166', range:430},
  {id:'heavy', name:'Titan Cannon', type:'heavy', rarity:'legendary', fireRate:0.6, bulletSpeed:520, spread:0.08, damage:55, mag:7, reload:1.8, recoil:1.8, color:'#ff7b7b', explosive:true, elemental:'fire'},
  {id:'blade', name:'Arc Blade', type:'melee', rarity:'rare', fireRate:0.5, bulletSpeed:420, spread:0.0, damage:20, mag:999, reload:0.2, recoil:0.6, color:'#7bdff2', melee:true},
  {id:'smg', name:'Viper SMG', type:'rifle', rarity:'common', fireRate:0.09, bulletSpeed:720, spread:0.06, damage:5, mag:30, reload:1.2, recoil:0.9, color:'#7CFF6B', range:700},
  {id:'dmr', name:'Longshot DMR', type:'rifle', rarity:'rare', fireRate:0.3, bulletSpeed:980, spread:0.01, damage:20, mag:8, reload:1.6, recoil:1.2, color:'#6aaeff', range:1150},
  {id:'flame', name:'Flamethrower', type:'special', rarity:'epic', fireRate:0.055, bulletSpeed:420, spread:0.25, damage:5, mag:80, reload:2.0, recoil:0.7, color:'#ff8c42', elemental:'fire', range:480},
  {id:'rpg', name:'RPG-7', type:'heavy', rarity:'epic', fireRate:0.8, bulletSpeed:460, spread:0.08, damage:65, mag:4, reload:1.8, recoil:2.0, color:'#ff5d5d', explosive:true, elemental:'fire'},
  {id:'arc', name:'Arc Thrower', type:'special', rarity:'epic', fireRate:0.22, bulletSpeed:600, spread:0.15, damage:15, mag:24, reload:1.5, recoil:1.0, color:'#b27bff', elemental:'shock'},
  {id:'minigun', name:'Minigun', type:'heavy', rarity:'legendary', fireRate:0.055, bulletSpeed:760, spread:0.12, damage:6, mag:200, reload:2.8, recoil:1.4, color:'#ffb44c', overheatMax:100, overheatPerShot:2, overheatCool:22, overheatLock:1.4},
  {id:'rail', name:'Railgun', type:'rifle', rarity:'legendary', fireRate:0.7, bulletSpeed:1200, spread:0.0, damage:65, mag:6, reload:1.5, recoil:1.8, color:'#ff6b6b', range:1350},
  {id:'mine', name:'Mine Layer', type:'special', rarity:'rare', fireRate:0.6, bulletSpeed:300, spread:0.2, damage:30, mag:8, reload:1.5, recoil:1.0, color:'#c9a867', explosive:true, elemental:'fire'},
  {id:'sprayer', name:'Frost Sprayer', type:'special', rarity:'rare', fireRate:0.08, bulletSpeed:520, spread:0.2, damage:5, mag:60, reload:1.7, recoil:0.8, color:'#6cd6ff', elemental:'ice', range:620},
  {id:'scatter', name:'Scattergun', type:'shotgun', rarity:'common', fireRate:0.7, bulletSpeed:480, spread:0.55, damage:5, pellets:6, mag:8, reload:1.6, recoil:1.3, color:'#c9a867', range:390},
  {id:'crossbow', name:'Crossbow', type:'rifle', rarity:'common', fireRate:0.8, bulletSpeed:750, spread:0.02, damage:32, mag:6, reload:1.5, recoil:1.0, color:'#8b6f47', pierce:1, range:950},
  {id:'sniper', name:'Longshot Sniper', type:'rifle', rarity:'rare', fireRate:1.0, bulletSpeed:1100, spread:0.0, damage:55, mag:5, reload:1.8, recoil:1.6, color:'#6aaeff', pierce:3, range:1450},
  {id:'katana', name:'Katana', type:'melee', rarity:'epic', fireRate:0.35, bulletSpeed:420, spread:0.0, damage:22, mag:999, reload:0.2, recoil:0.5, color:'#e8e8ff', melee:true},
  {id:'plasma', name:'Plasma Cutter', type:'special', rarity:'rare', fireRate:0.18, bulletSpeed:650, spread:0.08, damage:12, mag:24, reload:1.4, recoil:0.9, color:'#00ffcc'},
  {id:'grenade', name:'Grenade Launcher', type:'heavy', rarity:'epic', fireRate:0.7, bulletSpeed:420, spread:0.1, damage:55, mag:6, reload:2.0, recoil:1.7, color:'#ffaa00', explosive:true, elemental:'fire'},
  {id:'flak', name:'Flak Cannon', type:'shotgun', rarity:'epic', fireRate:0.8, bulletSpeed:500, spread:0.4, damage:8, pellets:8, mag:8, reload:2.0, recoil:1.6, color:'#ff8844', explosive:true, range:460},
  {id:'tesla', name:'Tesla Coil', type:'special', rarity:'legendary', fireRate:0.3, bulletSpeed:700, spread:0.1, damage:25, mag:20, reload:1.6, recoil:1.1, color:'#b27bff', elemental:'shock'},
  {id:'esword', name:'Energy Sword', type:'melee', rarity:'legendary', fireRate:0.6, bulletSpeed:450, spread:0.0, damage:45, mag:999, reload:0.2, recoil:0.7, color:'#00ffff', melee:true},
  {id:'mortar', name:'Mortar', type:'heavy', rarity:'rare', fireRate:0.9, bulletSpeed:380, spread:0.15, damage:55, mag:4, reload:2.2, recoil:1.9, color:'#888866', explosive:true, elemental:'fire'},
];
const weaponPrices = { pistol:60, harpoon:135, rifle:95, shotgun:115, heavy:230, blade:100, smg:70, dmr:125, flame:155, rpg:170, arc:150, minigun:240, rail:260, mine:115, sprayer:120, scatter:55, crossbow:65, sniper:130, katana:165, plasma:110, grenade:175, flak:180, tesla:250, esword:245, mortar:120 };

const items = [
  {id:'plating', name:'Dense Plating', rarity:'rare', category:'tech', price:55, desc:'+20 Armor, -12% Move Speed', effects:{armor:20, speedMult:-0.12}, cosmetic:'armor'},
  {id:'overclock', name:'Overclock Core', rarity:'legendary', category:'tech', price:115, desc:'+15% Fire Rate, -10 Max HP', effects:{reloadMult:-0.15, maxHpAdd:-10}},
  {id:'precision', name:'Stability Gyro', rarity:'rare', category:'tech', price:60, desc:'+20% Accuracy, -10% Reload Speed', effects:{accuracyMult:0.2, reloadMult:0.1}},
  {id:'vamp', name:'Life Tap', rarity:'epic', category:'primal', price:125, desc:'+8% Life Steal, -10 Max HP', effects:{lifestealAdd:0.08, maxHpAdd:-10}},
  {id:'belt', name:'Ammo Belt', rarity:'common', category:'tech', price:30, desc:'+6 Magazine Size, -5% Accuracy', effects:{magBonus:6, accuracyMult:-0.05}, cosmetic:'belt'},
  {id:'boots', name:'Kinetic Boots', rarity:'rare', category:'tech', price:55, desc:'+20 Move Speed, -5% Damage', effects:{speedMult:0.1, damageMult:-0.05}},
  {id:'luck', name:'Lucky Charm', rarity:'common', category:'arcane', price:35, desc:'+1 Luck (rarer shop rolls)', effects:{luckAdd:1}},
  {id:'pierce', name:'Piercing Bullet', rarity:'rare', category:'tech', price:70, desc:'+1 Pierce for all shots', effects:{pierceAdd:1}},
  {id:"gyro_stab", name:"Gyroscopic Stabilizer", rarity:"common", category:"tech", price:28, desc:"+10% Accuracy, -5% Move Speed", effects:{accuracyMult:0.1, speedMult:-0.05}},
  {id:"spring_loader", name:"Spring Loader", rarity:"common", category:"tech", price:30, desc:"+8% Fire Rate", effects:{reloadMult:-0.08}},
  {id:"titanium_weave", name:"Titanium Weave", rarity:"common", category:"tech", price:32, desc:"+8 Armor", effects:{armor:8}},
  {id:"coolant_flush", name:"Coolant Flush", rarity:"common", category:"tech", price:26, desc:"+6% Fire Rate, -6 Max HP", effects:{reloadMult:-0.06, maxHpAdd:-6}},
  {id:"rangefinder", name:"Laser Rangefinder", rarity:"common", category:"tech", price:30, desc:"-4% Damage, +12% Accuracy", effects:{accuracyMult:0.12, damageMult:-0.04}},
  {id:"shock_absorber", name:"Shock Absorber", rarity:"common", category:"tech", price:28, desc:"-5% Reload Speed, +8 Armor", effects:{armor:8, reloadMult:0.05}},
  {id:"extended_mag", name:"Extended Magazine", rarity:"common", category:"tech", price:34, desc:"+8 Magazine Size", effects:{magBonus:8}},
  {id:"hair_trigger", name:"Hair Trigger", rarity:"common", category:"tech", price:30, desc:"+10% Fire Rate, -8% Accuracy", effects:{reloadMult:-0.1, accuracyMult:-0.08}},
  {id:"servo_greaves", name:"Servo Greaves", rarity:"common", category:"tech", price:32, desc:"+8% Move Speed", effects:{speedMult:0.08}},
  {id:"patch_kit", name:"Field Patch Kit", rarity:"common", category:"tech", price:28, desc:"+10 Max HP", effects:{maxHpAdd:10}},
  {id:"recoil_comp", name:"Recoil Compensator", rarity:"common", category:"tech", price:24, desc:"+10% Accuracy", effects:{accuracyMult:0.1}},
  {id:"power_cell", name:"Spare Power Cell", rarity:"common", category:"tech", price:32, desc:"+6% Damage", effects:{damageMult:0.06}},
  {id:"med_injector", name:"Med Injector", rarity:"common", category:"tech", price:34, desc:"+4 Armor, +8 Max HP", effects:{maxHpAdd:8, armor:4}},
  {id:"light_frame", name:"Lightweight Frame", rarity:"common", category:"tech", price:30, desc:"+10% Move Speed, -6 Armor", effects:{speedMult:0.1, armor:-6}},
  {id:"auto_target", name:"Auto-Targeting Module", rarity:"rare", category:"tech", price:55, desc:"-5% Damage, +15% Accuracy", effects:{accuracyMult:0.15, damageMult:-0.05}},
  {id:"overdrive_gear", name:"Overdrive Gears", rarity:"rare", category:"tech", price:60, desc:"+12% Fire Rate, -8 Max HP", effects:{reloadMult:-0.12, maxHpAdd:-8}},
  {id:"composite_plate", name:"Composite Plating", rarity:"rare", category:"tech", price:58, desc:"-8% Move Speed, +14 Armor", effects:{armor:14, speedMult:-0.08}},
  {id:"drum_mag", name:"Drum Magazine", rarity:"rare", category:"tech", price:62, desc:"-8% Reload Speed, +10 Magazine Size", effects:{magBonus:10, reloadMult:0.08}},
  {id:"lucky_circuit", name:"Lucky Circuit", rarity:"rare", category:"tech", price:70, desc:"+2 Luck", effects:{luckAdd:2}},
  {id:"ap_rounds", name:"AP Rounds", rarity:"rare", category:"tech", price:68, desc:"-5% Reload Speed, +1 Pierce", effects:{pierceAdd:1, reloadMult:0.05}},
  {id:"adrenaline_pump", name:"Adrenaline Pump", rarity:"rare", category:"tech", price:60, desc:"+12% Move Speed, -8 Max HP", effects:{speedMult:0.12, maxHpAdd:-8}},
  {id:"nano_repair", name:"Nano Repair Bots", rarity:"rare", category:"tech", price:75, desc:"+3% Life Steal", effects:{lifestealAdd:0.03}},
  {id:"heavy_barrel", name:"Heavy Barrel", rarity:"rare", category:"tech", price:65, desc:"+8% Damage, -8% Reload Speed", effects:{damageMult:0.08, reloadMult:0.08}},
  {id:"reflex_sight", name:"Reflex Sight", rarity:"rare", category:"tech", price:72, desc:"+6% Fire Rate, +12% Accuracy", effects:{accuracyMult:0.12, reloadMult:-0.06}},
  {id:"capacitor_bank", name:"Capacitor Bank", rarity:"epic", category:"tech", price:120, desc:"+10% Damage, +15% Fire Rate, -12 Max HP", effects:{reloadMult:-0.15, damageMult:0.1, maxHpAdd:-12}},
  {id:"aegis_protocol", name:"Aegis Protocol", rarity:"epic", category:"tech", price:130, desc:"-10% Move Speed, +20 Armor, +10 Max HP", effects:{armor:20, maxHpAdd:10, speedMult:-0.1}},
  {id:"smart_ammo", name:"Smart Ammunition", rarity:"epic", category:"tech", price:140, desc:"+10% Accuracy, +2 Pierce", effects:{pierceAdd:2, accuracyMult:0.1}},
  {id:"exoskeleton", name:"Exoskeleton Rig", rarity:"epic", category:"tech", price:145, desc:"+15% Move Speed, +12 Armor", effects:{speedMult:0.15, armor:12}},
  {id:"fusion_cell", name:"Fusion Cell", rarity:"epic", category:"tech", price:150, desc:"+12% Damage, +8% Fire Rate", effects:{damageMult:0.12, reloadMult:-0.08}},
  {id:"singularity_core", name:"Singularity Core", rarity:"legendary", category:"tech", price:260, desc:"+18% Damage, +15% Fire Rate, +2 Pierce", effects:{damageMult:0.18, reloadMult:-0.15, pierceAdd:2}},
  {id:"wolf_pelt", name:"Wolf Pelt", rarity:"common", category:"primal", price:28, desc:"+8% Move Speed, -4 Armor", effects:{speedMult:0.08, armor:-4}},
  {id:"bone_charm", name:"Bone Charm", rarity:"common", category:"primal", price:30, desc:"+1 Luck", effects:{luckAdd:1}},
  {id:"fang_necklace", name:"Fang Necklace", rarity:"common", category:"primal", price:30, desc:"+4% Damage", effects:{damageMult:0.04}},
  {id:"thick_hide", name:"Thick Hide", rarity:"common", category:"primal", price:30, desc:"-6% Move Speed, +10 Armor", effects:{armor:10, speedMult:-0.06}},
  {id:"blood_vial", name:"Blood Vial", rarity:"common", category:"primal", price:32, desc:"-6 Max HP, +2% Life Steal", effects:{lifestealAdd:0.02, maxHpAdd:-6}},
  {id:"predator_eye", name:"Predator Eye", rarity:"common", category:"primal", price:26, desc:"+10% Accuracy", effects:{accuracyMult:0.1}},
  {id:"sinew_wrap", name:"Sinew Wrap", rarity:"common", category:"primal", price:28, desc:"+8% Fire Rate, -6% Accuracy", effects:{reloadMult:-0.08, accuracyMult:-0.06}},
  {id:"claw_gauntlet", name:"Claw Gauntlet", rarity:"common", category:"primal", price:30, desc:"+6% Damage, -6 Max HP", effects:{damageMult:0.06, maxHpAdd:-6}},
  {id:"herb_pouch", name:"Herb Pouch", rarity:"common", category:"primal", price:26, desc:"+10 Max HP", effects:{maxHpAdd:10}},
  {id:"feather_charm", name:"Feather Charm", rarity:"common", category:"primal", price:34, desc:"+6% Accuracy, +6% Move Speed", effects:{speedMult:0.06, accuracyMult:0.06}},
  {id:"iron_gut", name:"Iron Gut", rarity:"common", category:"primal", price:30, desc:"-6% Move Speed, +12 Max HP", effects:{maxHpAdd:12, speedMult:-0.06}},
  {id:"war_paint", name:"War Paint", rarity:"common", category:"primal", price:34, desc:"+5% Damage, +5% Move Speed", effects:{damageMult:0.05, speedMult:0.05}},
  {id:"beast_heart", name:"Beast Heart", rarity:"common", category:"primal", price:36, desc:"+8 Max HP, +2% Life Steal", effects:{maxHpAdd:8, lifestealAdd:0.02}},
  {id:"alpha_pelt", name:"Alpha Pelt", rarity:"rare", category:"primal", price:60, desc:"+12% Move Speed, +6 Armor", effects:{speedMult:0.12, armor:6}},
  {id:"blood_pact", name:"Blood Pact", rarity:"rare", category:"primal", price:70, desc:"-10 Max HP, +5% Life Steal", effects:{lifestealAdd:0.05, maxHpAdd:-10}},
  {id:"titan_bone", name:"Titan Bone Plate", rarity:"rare", category:"primal", price:62, desc:"-10% Move Speed, +16 Armor", effects:{armor:16, speedMult:-0.1}},
  {id:"venom_sac", name:"Venom Sac", rarity:"rare", category:"primal", price:72, desc:"+8% Damage, +2% Life Steal", effects:{damageMult:0.08, lifestealAdd:0.02}},
  {id:"eagle_eye", name:"Eagle Eye", rarity:"rare", category:"primal", price:68, desc:"+6% Damage, +15% Accuracy", effects:{accuracyMult:0.15, damageMult:0.06}},
  {id:"frenzy_gland", name:"Frenzy Gland", rarity:"rare", category:"primal", price:75, desc:"+12% Fire Rate, +8% Move Speed, -8 Max HP", effects:{reloadMult:-0.12, speedMult:0.08, maxHpAdd:-8}},
  {id:"mammoth_tusk", name:"Mammoth Tusk", rarity:"rare", category:"primal", price:70, desc:"+6% Damage, +1 Pierce", effects:{pierceAdd:1, damageMult:0.06}},
  {id:"troll_gland", name:"Troll Gland", rarity:"rare", category:"primal", price:72, desc:"+4% Life Steal", effects:{lifestealAdd:0.04}},
  {id:"primal_roar", name:"Primal Roar", rarity:"rare", category:"primal", price:78, desc:"+10% Damage, +10% Move Speed, -10 Armor", effects:{damageMult:0.1, speedMult:0.1, armor:-10}},
  {id:"thick_fur", name:"Thick Fur", rarity:"rare", category:"primal", price:65, desc:"+12 Armor, +8 Max HP", effects:{armor:12, maxHpAdd:8}},
  {id:"dragon_scale", name:"Dragon Scale", rarity:"epic", category:"primal", price:130, desc:"+22 Armor, +12 Max HP", effects:{armor:22, maxHpAdd:12}},
  {id:"heart_of_beast", name:"Heart of the Beast", rarity:"epic", category:"primal", price:145, desc:"+10% Damage, +8% Life Steal", effects:{lifestealAdd:0.08, damageMult:0.1}},
  {id:"apex_predator", name:"Apex Predator", rarity:"epic", category:"primal", price:150, desc:"+8% Damage, +12% Accuracy, +15% Move Speed", effects:{speedMult:0.15, accuracyMult:0.12, damageMult:0.08}},
  {id:"blood_frenzy", name:"Blood Frenzy", rarity:"epic", category:"primal", price:140, desc:"+15% Fire Rate, -12 Max HP, +6% Life Steal", effects:{reloadMult:-0.15, lifestealAdd:0.06, maxHpAdd:-12}},
  {id:"ancient_antler", name:"Ancient Antler", rarity:"epic", category:"primal", price:148, desc:"+10% Damage, +1 Luck, +2 Pierce", effects:{pierceAdd:2, damageMult:0.1, luckAdd:1}},
  {id:"ember_charm", name:"Ember Charm", rarity:"common", category:"arcane", price:30, desc:"+6% Damage", effects:{damageMult:0.06}},
  {id:"frost_shard", name:"Frost Shard", rarity:"common", category:"arcane", price:28, desc:"+8% Accuracy, -5% Move Speed", effects:{accuracyMult:0.08, speedMult:-0.05}},
  {id:"spark_stone", name:"Spark Stone", rarity:"common", category:"arcane", price:30, desc:"+8% Fire Rate", effects:{reloadMult:-0.08}},
  {id:"void_dust", name:"Void Dust", rarity:"common", category:"arcane", price:32, desc:"+1 Luck", effects:{luckAdd:1}},
  {id:"mana_crystal", name:"Mana Crystal", rarity:"common", category:"arcane", price:34, desc:"+4% Damage, +8 Max HP", effects:{maxHpAdd:8, damageMult:0.04}},
  {id:"wind_rune", name:"Wind Rune", rarity:"common", category:"arcane", price:30, desc:"+8% Move Speed", effects:{speedMult:0.08}},
  {id:"stone_rune", name:"Stone Rune", rarity:"common", category:"arcane", price:30, desc:"+8 Armor", effects:{armor:8}},
  {id:"hex_bag", name:"Hex Bag", rarity:"common", category:"arcane", price:28, desc:"+6% Damage, -6% Accuracy", effects:{damageMult:0.06, accuracyMult:-0.06}},
  {id:"spirit_wisp", name:"Spirit Wisp", rarity:"common", category:"arcane", price:32, desc:"+2% Life Steal", effects:{lifestealAdd:0.02}},
  {id:"arc_conduit", name:"Arc Conduit", rarity:"common", category:"arcane", price:30, desc:"+10% Fire Rate, -6 Max HP", effects:{reloadMult:-0.1, maxHpAdd:-6}},
  {id:"shadow_cloak", name:"Shadow Cloak", rarity:"common", category:"arcane", price:34, desc:"+6% Accuracy, +6% Move Speed", effects:{speedMult:0.06, accuracyMult:0.06}},
  {id:"crystal_heart", name:"Crystal Heart", rarity:"common", category:"arcane", price:28, desc:"+10 Max HP", effects:{maxHpAdd:10}},
  {id:"storm_eye", name:"Storm Eye", rarity:"common", category:"arcane", price:34, desc:"+6% Fire Rate, +10% Accuracy", effects:{accuracyMult:0.1, reloadMult:-0.06}},
  {id:"inferno_core", name:"Inferno Core", rarity:"rare", category:"arcane", price:70, desc:"+10% Damage, +8% Fire Rate", effects:{damageMult:0.1, reloadMult:-0.08}},
  {id:"glacier_heart", name:"Glacier Heart", rarity:"rare", category:"arcane", price:68, desc:"+14 Armor, +10 Max HP", effects:{armor:14, maxHpAdd:10}},
  {id:"tempest_rune", name:"Tempest Rune", rarity:"rare", category:"arcane", price:72, desc:"+10% Fire Rate, +12% Move Speed", effects:{speedMult:0.12, reloadMult:-0.1}},
  {id:"soul_lantern", name:"Soul Lantern", rarity:"rare", category:"arcane", price:75, desc:"+5% Life Steal", effects:{lifestealAdd:0.05}},
  {id:"phase_crystal", name:"Phase Crystal", rarity:"rare", category:"arcane", price:70, desc:"+10% Accuracy, +1 Pierce", effects:{pierceAdd:1, accuracyMult:0.1}},
  {id:"arcane_battery", name:"Arcane Battery", rarity:"rare", category:"arcane", price:78, desc:"+8% Damage, +8% Fire Rate, +6% Move Speed", effects:{damageMult:0.08, reloadMult:-0.08, speedMult:0.06}},
  {id:"void_mirror", name:"Void Mirror", rarity:"rare", category:"arcane", price:75, desc:"+8% Accuracy, +2 Luck", effects:{luckAdd:2, accuracyMult:0.08}},
  {id:"runic_plate", name:"Runic Plate", rarity:"rare", category:"arcane", price:65, desc:"-8% Reload Speed, +16 Armor", effects:{armor:16, reloadMult:0.08}},
  {id:"blood_moon", name:"Blood Moon Charm", rarity:"rare", category:"arcane", price:80, desc:"+8% Damage, -10 Max HP, +6% Life Steal", effects:{lifestealAdd:0.06, damageMult:0.08, maxHpAdd:-10}},
  {id:"ley_line", name:"Ley Line Tap", rarity:"rare", category:"arcane", price:72, desc:"+12% Damage, -10% Move Speed", effects:{damageMult:0.12, speedMult:-0.1}},
  {id:"phoenix_ash", name:"Phoenix Ash", rarity:"epic", category:"arcane", price:140, desc:"+12 Max HP, +8% Life Steal", effects:{lifestealAdd:0.08, maxHpAdd:12}},
  {id:"storm_crown", name:"Storm Crown", rarity:"epic", category:"arcane", price:150, desc:"+10% Damage, +15% Fire Rate, +8% Move Speed", effects:{reloadMult:-0.15, damageMult:0.1, speedMult:0.08}},
  {id:"void_heart", name:"Void Heart", rarity:"epic", category:"arcane", price:148, desc:"+12% Damage, +1 Luck, +2 Pierce", effects:{damageMult:0.12, pierceAdd:2, luckAdd:1}},
  {id:"titan_rune", name:"Titan Rune", rarity:"epic", category:"arcane", price:145, desc:"-8% Move Speed, +22 Armor, +14 Max HP", effects:{armor:22, maxHpAdd:14, speedMult:-0.08}},
  {id:"ouroboros", name:"Ouroboros Coil", rarity:"epic", category:"unique", price:150, desc:"+10% Fire Rate, +10% Move Speed, -15 Max HP, +6% Life Steal", effects:{lifestealAdd:0.06, reloadMult:-0.1, speedMult:0.1, maxHpAdd:-15}},
  {id:"schrodingers_mag", name:"Schrodinger's Magazine", rarity:"epic", category:"unique", price:145, desc:"+12% Fire Rate, -12% Accuracy, +14 Magazine Size", effects:{magBonus:14, reloadMult:-0.12, accuracyMult:-0.12}},
  {id:"golden_fleece", name:"Golden Fleece", rarity:"epic", category:"unique", price:150, desc:"+10% Damage, +10 Max HP, +3 Luck", effects:{luckAdd:3, damageMult:0.1, maxHpAdd:10}},
  {id:"crown_of_kings", name:"Crown of Kings", rarity:"legendary", category:"unique", price:250, desc:"+15% Damage, +10% Fire Rate, +2 Luck", effects:{damageMult:0.15, reloadMult:-0.1, luckAdd:2}},
  {id:"aegis_immortal", name:"Aegis of the Immortal", rarity:"legendary", category:"unique", price:260, desc:"-10% Move Speed, +30 Armor, +20 Max HP", effects:{armor:30, maxHpAdd:20, speedMult:-0.1}},
  {id:"reapers_contract", name:"Reaper's Contract", rarity:"legendary", category:"unique", price:270, desc:"+12% Damage, -20 Max HP, +12% Life Steal", effects:{lifestealAdd:0.12, damageMult:0.12, maxHpAdd:-20}},
  {id:"stormforged_core", name:"Stormforged Core", rarity:"legendary", category:"unique", price:260, desc:"+15% Fire Rate, +10% Accuracy, +15% Move Speed, +2 Pierce", effects:{reloadMult:-0.15, speedMult:0.15, pierceAdd:2, accuracyMult:0.1}},
  {id:"worldseed", name:"Worldseed", rarity:"legendary", category:"unique", price:280, desc:"+24 Max HP, +8% Life Steal, +3 Luck", effects:{maxHpAdd:24, luckAdd:3, lifestealAdd:0.08}},
  {id:"platinum_weave", name:"Platinum Weave", rarity:"epic", category:"exclusive", price:130, desc:"+18 Armor, +12 Max HP", effects:{armor:18, maxHpAdd:12}},
  {id:"diamond_lens", name:"Diamond Lens", rarity:"epic", category:"exclusive", price:135, desc:"+10% Damage, +18% Accuracy", effects:{accuracyMult:0.18, damageMult:0.1}},
  {id:"emperors_seal", name:"Emperor's Seal", rarity:"epic", category:"exclusive", price:140, desc:"+12% Damage, +8% Fire Rate, +2 Luck", effects:{luckAdd:2, damageMult:0.12, reloadMult:-0.08}},
  {id:"throne_of_ash", name:"Throne of Ash", rarity:"legendary", category:"exclusive", price:220, desc:"+20% Damage, +12% Fire Rate", effects:{damageMult:0.2, reloadMult:-0.12}},
  {id:"heart_of_mountain", name:"Heart of the Mountain", rarity:"legendary", category:"exclusive", price:230, desc:"+30 Armor, +24 Max HP", effects:{armor:30, maxHpAdd:24}},
  {id:"eye_of_storm", name:"Eye of the Storm", rarity:"legendary", category:"exclusive", price:240, desc:"+15% Fire Rate, +15% Accuracy, +15% Move Speed", effects:{reloadMult:-0.15, speedMult:0.15, accuracyMult:0.15}},
  {id:"soul_of_titan", name:"Soul of the Titan", rarity:"legendary", category:"exclusive", price:250, desc:"+15% Damage, +12% Life Steal, +2 Pierce", effects:{lifestealAdd:0.12, damageMult:0.15, pierceAdd:2}},
  {id:"war_crown", name:"War Crown", rarity:"epic", category:"exclusive", price:145, desc:"+2 Luck, +6% Damage — worn with pride", effects:{luckAdd:2, damageMult:0.06}, cosmetic:"crown"},
  {id:'longbarrel', name:'Long Barrel', rarity:'common', category:'tech', price:32, desc:'+150 Bullet Range', effects:{rangeBonus:150}},
  {id:'scope', name:'Marksman Scope', rarity:'rare', category:'tech', price:58, desc:'+300 Bullet Range, +10% Accuracy', effects:{rangeBonus:300, accuracyMult:0.1}},
  {id:'railgun', name:'Rail Amplifier', rarity:'epic', category:'tech', price:110, desc:'+35% Bullet Range, +8% Damage', effects:{rangeMult:0.35, damageMult:0.08}}
];

// ---- WASM shop bridge ----------------------------------------------------------------------------
// The C# records (wasm/BrotatoSystems/Extra.cs) use PascalCase properties and int enums, so the JS data
// has to be converted before LoadData, and RollShop results ({Type, Data:{Id..}, Rarity, Price}) have to
// be mapped back to the JS objects buildShop expects ({type, data, rarity, price}).
const WASM_RARITY = { common:0, rare:1, epic:2, legendary:3 };        // C# Rarity: Common, Rare, Epic, Legendary
const WASM_TIMEOUT_MS = 10000;
function wasmDamageType(w){ return w.elemental==='fire' ? 1 : w.elemental==='ice' ? 2 : w.elemental==='shock' ? 3 : w.explosive ? 4 : 0; }
function wasmWeaponData(){
  return weapons.map(w=>({ Id:w.id, Name:w.name, Type:wasmDamageType(w), Damage:w.damage, FireDelay:w.fireRate, Spread:w.spread||0,
    Magazine:Math.round(w.mag||1), Reload:w.reload||1, Explosive:!!w.explosive, Melee:!!w.melee, AltMode:null,
    Rarity:WASM_RARITY[w.rarity] ?? 0, BasePrice:weaponPrices[w.id] || 100 }));
}
function wasmItemData(){
  return items.map(it=>{
    const mods = {};
    for(const [k,v] of Object.entries(it.effects||{})){ if(typeof v === 'number' && isFinite(v)) mods[k] = v; }
    return { Id:it.id, Name:it.name, Rarity:WASM_RARITY[it.rarity] ?? 0, Description:it.desc||'', StatMods:mods };
  });
}
// Map one RollShop entry back to a JS shop entry. Unknown ids are dropped. Price uses the JS formula so
// the shop costs the same whichever roller produced it.
function normalizeWasmPick(p){
  if(!p || typeof p !== 'object') return null;
  const type = p.Type ?? p.type;
  const data = p.Data ?? p.data;
  const id = data && (data.Id ?? data.id);
  if(!id) return null;
  if(type === 'weapon'){
    const w = weapons.find(x=>x.id === id); if(!w) return null;
    return { type:'weapon', data:w, rarity:w.rarity, price:Math.round((weaponPrices[w.id]||100) * rarityMult(w.rarity)) };
  }
  if(type === 'item'){
    const it = items.find(x=>x.id === id); if(!it) return null;
    const exMult = it.category==='exclusive' ? 1.5 : 1;
    return { type:'item', data:it, rarity:it.rarity, price:Math.round(it.price * rarityMult(it.rarity) * exMult) };
  }
  return null;
}
function wasmFail(reason){
  if(wasmSystems.status === 'ready') return;
  wasmSystems.status = 'failed'; wasmSystems.api = null; wasmSystems.reason = reason;
  console.info('[systems] using JS shop:', reason);
}
function attachWasmSystems(api){
  if(wasmSystems.status !== 'loading') return;           // off, already attached, or gave up (timeout)
  if(!api || api.isStub || typeof api.loadData !== 'function' || typeof api.rollShop !== 'function'){ wasmFail('WASM module unavailable'); return; }
  const w = wasmWeaponData(), it = wasmItemData();
  // ShopRoller.Roll loops forever when its pools are empty, so never let it run without data.
  if(!w.length || !it.length){ wasmFail('no shop data'); return; }
  let loaded = false;
  try { loaded = api.loadData(JSON.stringify(w), JSON.stringify(it)) !== false; } catch(err){ loaded = false; }
  if(!loaded){ wasmFail('LoadData failed'); return; }
  // probe once: the pools are non-empty now, so this terminates; reject the module if results are unusable
  let probe = null;
  try { probe = api.rollShop(1, 0, null); } catch(err){ probe = null; }
  if(!Array.isArray(probe) || probe.length !== 1 || !normalizeWasmPick(probe[0])){ wasmFail('RollShop returned unusable data'); return; }
  wasmSystems.api = api; wasmSystems.status = 'ready';
  console.info('[systems] WASM shop ready');
}
// returns normalized picks from the WASM roller, or null (caller falls back to the JS roller)
function rollShopWasm(count, luck){
  if(wasmSystems.status !== 'ready' || count <= 0) return null;
  try {
    const raw = wasmSystems.api.rollShop(count|0, Math.max(0, Math.floor(luck||0)), null);
    if(!Array.isArray(raw)) return null;
    return raw.map(normalizeWasmPick).filter(Boolean);
  } catch(err){ console.warn('rollShop failed, using JS shop', err); return null; }
}
if(wasmSystems.status === 'loading'){
  window.addEventListener('systemswasm', (ev)=>attachWasmSystems(ev.detail || window.SystemsWasm));
  if(window.SystemsWasm && !window.SystemsWasm.isStub) attachWasmSystems(window.SystemsWasm);  // loaded before us
  setTimeout(()=>{ if(wasmSystems.status === 'loading') wasmFail('timed out after ' + WASM_TIMEOUT_MS + 'ms'); }, WASM_TIMEOUT_MS);
}

// Class definitions (50 variants)
const classArchetypes = [
  {base:'Ironheart', weapon:'rifle', mods:{hpMult:1.1, speed:230, armor:2, accuracy:1.05, damageBonus:1}, tags:'Balanced rifle', pool:["rifle", "smg", "pistol", "shotgun", "dmr"]},
  {base:'Foxglove', weapon:'pistol', mods:{hpMult:0.95, speed:255, accuracy:1.25, luck:2}, tags:'Fast and precise', pool:["pistol", "smg", "crossbow", "dmr", "rifle"], unlock:{achievement:'first_blood'}},
  {base:'Gravelord', weapon:'heavy', mods:{hpMult:1.3, speed:200, armor:8, damageBonus:4, recoil:1.2}, tags:'Slow heavy hitter', pool:["heavy", "rpg", "grenade", "mortar", "minigun"], unlock:{achievement:'exterminator'}},
  {base:'Scrapjack', weapon:'shotgun', mods:{hpMult:1.0, speed:235, magBonus:2, damageBonus:2, reloadSpeed:0.95}, tags:'Close range', pool:["shotgun", "scatter", "flak", "flame", "sprayer"], unlock:{achievement:'survivor'}},
  {base:'Voltblade', weapon:'blade', mods:{hpMult:1.1, speed:260, armor:4, lifesteal:0.05}, tags:'Melee sustain', pool:["blade", "katana", "esword", "tesla", "arc"], unlock:{achievement:'veteran'}},
  {base:'Circuitry', weapon:'rifle', mods:{hpMult:0.95, speed:235, reloadSpeed:0.85, accuracy:1.1, magBonus:1}, tags:'Fast reload', pool:["smg", "rifle", "plasma", "sprayer", "pistol"], unlock:{achievement:'shopaholic'}},
  {base:'Bulwark', weapon:'pistol', mods:{hpMult:1.4, speed:210, armor:10, accuracy:0.95}, tags:'Tank', pool:["pistol", "heavy", "shotgun", "minigun", "flak", "scatter"], unlock:{achievement:'untouchable'}},
  {base:'Redline', weapon:'rifle', mods:{hpMult:0.95, speed:240, damageBonus:3, recoil:1.1}, tags:'High damage', pool:["rail", "rifle", "sniper", "dmr", "rpg"], unlock:{achievement:'genocide'}},
  {base:'Skylark', weapon:'pistol', mods:{hpMult:0.9, speed:285, accuracy:1.1, reloadSpeed:0.95}, tags:'Very fast', pool:["smg", "pistol", "sprayer", "plasma", "crossbow"], unlock:{achievement:'medic'}},
  {base:'Nightreap', weapon:'shotgun', mods:{hpMult:1.05, speed:225, lifesteal:0.07, damageBonus:1}, tags:'Life steal', pool:["shotgun", "blade", "katana", "flame", "mine"], unlock:{achievement:'unique_find'}},
  {base:'Glassjaw', weapon:'rifle', mods:{hpMult:0.01, speed:300, accuracy:1.3, reloadSpeed:0.8, damageBonus:15, luck:3}, tags:'1 HP. Glass cannon.', pool:["rail", "sniper", "rifle", "dmr", "heavy", "rpg"], unlock:{nightmare:true}},
];

const classes = classArchetypes.map(a=>({
  id: a.base.toLowerCase(),
  name: a.base,
  weapon: a.weapon,
  pool: a.pool || null,
  desc: a.tags,
  mods: { ...a.mods },
  unlock: a.unlock || null,
}));

function isClassUnlocked(classId){
  const c = classes.find(x=>x.id === classId);
  if(!c || !c.unlock) return true;
  if(c.unlock.nightmare) return !!unlockedAchievements['nightmare_slain'];
  if(c.unlock.achievement) return !!unlockedAchievements[c.unlock.achievement];
  return true;
}
function classUnlockText(c){
  if(!c.unlock) return null;
  if(c.unlock.nightmare) return 'Beat Nightmare (D6)';
  const a = ACHIEVEMENTS.find(x=>x.id === c.unlock.achievement);
  return a ? `Achievement: ${a.name}` : 'Locked';
}

// End-of-wave stat upgrades
const upgradeStats = [
  {id:'atkspd', name:'Attack Speed', apply:(p, mult)=>{ p.reloadSpeed /= mult; }},   // reloadSpeed scales shot delay and reload time: lower = faster
  {id:'baseDmg', name:'Base Damage', apply:(p, mult)=>{ p.damageBonus += Math.floor((mult-1)*10); }},
  {id:'range', name:'Range', apply:(p, mult)=>{ p.rangeBonus = (p.rangeBonus || 0) + Math.round(120 * mult); }},
  {id:'hp', name:'Max HP', apply:(p, mult)=>{ if(isGlassjaw(p)){ p.hp = p.baseMaxHp; return; } p.baseMaxHp += Math.max(4, Math.round((mult-1)*40)); p.hp = p.baseMaxHp; }},
  {id:'lifesteal', name:'Life Steal', apply:(p, mult)=>{ p.lifesteal = Math.min(0.5, p.lifesteal + (mult-1)*0.05); }},
  {id:'armor', name:'Armor', apply:(p, mult)=>{ p.armor += Math.floor((mult-1)*6); }},
  {id:'engineering', name:'Engineering', apply:(p, mult)=>{ p.damageBonus += Math.floor((mult-1)*4); }},
  {id:'elemental', name:'Elemental Dmg', apply:(p, mult)=>{ p.elementalBonus += (mult-1)*0.12; }},
  {id:'crit', name:'Crit Chance', apply:(p, mult)=>{ p.critChance = Math.min(0.6, p.critChance + (mult-1)*0.08); }},
  {id:'movespeed', name:'Movement Speed', apply:(p, mult)=>{ p.baseSpeed = Math.floor(p.baseSpeed * (1 + (mult-1)*0.5)); }},
];

const upgradeTiers = [
  {id:'gray', name:'Gray', mult:1.05, color:'#b8b8b8'},
  {id:'blue', name:'Blue', mult:1.15, color:'#6aaeff'},
  {id:'purple', name:'Purple', mult:1.28, color:'#b27bff'},
  {id:'red', name:'Red', mult:1.5, color:'#ff6b6b'},
];

// Achievements: id, name, desc. Checked via checkAchievements() at key events.
const ACHIEVEMENTS = [
  {id:'first_blood', name:'First Blood', desc:'Kill your first enemy'},
  {id:'exterminator', name:'Exterminator', desc:'Kill 500 enemies in one run'},
  {id:'genocide', name:'Genocide', desc:'Kill 2,000 enemies in one run'},
  {id:'survivor', name:'Survivor', desc:'Reach wave 10'},
  {id:'veteran', name:'Veteran', desc:'Clear wave 20'},
  {id:'unstoppable', name:'Unstoppable', desc:'Reach wave 30 in endless mode'},
  {id:'danger_zone', name:'Danger Zone', desc:'Clear wave 20 on Danger 6'},
  {id:'arsenal', name:'Gun Collector', desc:'Own 6 weapons at once'},
  {id:'legendary_arsenal', name:'Legendary Arsenal', desc:'Own 3 legendary weapons at once'},
  {id:'shopaholic', name:'Shopaholic', desc:'Spend 500 currency in one run'},
  {id:'unique_find', name:'One of a Kind', desc:'Own a Unique item'},
  {id:'big_spender', name:'Big Spender', desc:'Buy an Exclusive item'},
  {id:'medic', name:'Medic', desc:'Revive a downed partner'},
  {id:'lifesaver', name:'Lifesaver', desc:'Revive partners 3 times in one run'},
  {id:'untouchable', name:'Untouchable', desc:'Clear a wave without taking damage'},
  {id:'nightmare_slain', name:'Nightmare Slain', desc:'Beat the Nightmare boss on Danger 6'},
];

// runtime containers
