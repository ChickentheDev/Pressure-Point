// Pressure Point — main.js (split from game.js for v0.6.1)
let last = performance.now()/1000;
function loop(now){ const t = now/1000; let dt = t - last; if(dt>0.05) dt=0.05; last = t; if(state.phase !== 'menu') update(dt,t); draw(); if(typeof syncDomUi === 'function') syncDomUi(); requestAnimationFrame(loop); }

// init: render menu, prepare shop
function showMenu(){ menuEl.style.display = 'block'; if(pauseBtn) pauseBtn.style.display = 'none'; if(settingsPanel) settingsPanel.style.display='none'; hideSummaryOverlays(); setMenuStep('landing'); }
showMenu();
requestAnimationFrame(loop);
