// Auto-generated WASM loader for BrotatoSystems
// Loads dotnet WASM, then exposes JS-friendly APIs on window.SystemsWasm.
// Index.html injects this only over http(s). When it finishes (or fails) it fires a 'systemswasm' event
// on window (detail = the API, or null); game.js then calls loadData and decides whether to use it.

;(async () => {
  const stub = window.SystemsWasm || {};
  const announce = (api) => { try { window.dispatchEvent(new CustomEvent('systemswasm', { detail: api })); } catch(_){} };
  // If opened via file:// or explicit opt-out, stay on stub to avoid CORS issues.
  if (location.protocol === 'file:' || window.DISABLE_WASM === true) {
    window.SystemsWasm = { ...stub, isStub: true, ready: Promise.resolve() };
    announce(null);
    return;
  }

  const base = new URL('./dist/_framework/', import.meta.url);
  const bootUrl = new URL('blazor.boot.json', base);
  try {
    const { default: createDotnetRuntime } = await import(base + 'dotnet.js');
    const runtime = await createDotnetRuntime({
      configSrc: bootUrl.href,
      disableDotnet6Compatibility: true,
    });
    const exports = await runtime.getAssemblyExports('BrotatoSystems.dll');
    const mod = exports.Program;

    // ShopRoller.Roll (C#) spins forever if its weapon/item pools are empty, and that freezes the page.
    // Only call RollShop after a LoadData that succeeded with non-empty lists.
    let dataLoaded = false;
    const nonEmptyList = (json) => { try { const v = JSON.parse(json); return Array.isArray(v) && v.length > 0; } catch(_) { return false; } };
    window.SystemsWasm = {
      ready: Promise.resolve(),
      isStub: false,
      rollShop: (count, luck, fallback) => {
        if(!dataLoaded || !(count > 0)) return typeof fallback==='function' ? fallback() : (count > 0 ? null : []);
        try{
          const res = mod.RollShop(count|0, luck|0);
          return JSON.parse(res);
        } catch(err){ console.warn('rollShop fallback', err); return typeof fallback==='function'?fallback():null; }
      },
      // returns true when the C# side accepted both lists
      loadData: (weaponsJson, itemsJson) => {
        if(!nonEmptyList(weaponsJson) || !nonEmptyList(itemsJson)) return false;
        try{ mod.LoadData(weaponsJson, itemsJson); dataLoaded = true; return true; }
        catch(e){ console.warn('loadData failed', e); dataLoaded = false; return false; }
      },
      serializeRun: (json) => { try{ return mod.SerializeRun(json); }catch(e){ return null; } },
      statusTick: (dt, effectsJson) => { try{ return JSON.parse(mod.StatusTick(dt, effectsJson)); }catch(e){ return null; } },
    };
    announce(window.SystemsWasm);
  } catch(err){
    console.warn('WASM loader failed, using stub', err);
    window.SystemsWasm = { ...stub, isStub:true, ready: Promise.resolve() };
    announce(null);
  }
})();
