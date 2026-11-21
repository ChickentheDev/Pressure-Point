// Pressure Point — splash.js
// Critical Hit Studios splash: fade in, hold, fade out to the main menu.
// Click / tap / any key skips straight to the menu. Runs once per page load —
// returning to the menu from a run never replays it.
(function(){
  var splash = document.getElementById('splash');
  if(!splash) return;
  var done = false;
  var timers = [];
  function finish(){
    if(done) return;
    done = true;
    timers.forEach(clearTimeout);
    timers = [];
    splash.classList.remove('splash-visible');
    splash.classList.add('splash-done');
    splash.removeEventListener('click', finish);
    window.removeEventListener('keydown', finish, true);
  }
  function later(fn, ms){ timers.push(setTimeout(fn, ms)); }
  // Fade in on the next frame so the CSS transition runs from opacity 0.
  requestAnimationFrame(function(){ requestAnimationFrame(function(){
    if(done) return;
    splash.classList.add('splash-visible');
  }); });
  if(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches){
    later(finish, 600);
  } else {
    later(function(){ splash.classList.remove('splash-visible'); }, 2000); // hold ~1.2s after the 0.8s fade-in, then fade out
    later(finish, 2800);
  }
  splash.addEventListener('click', finish);
  window.addEventListener('keydown', finish, true);
})();
