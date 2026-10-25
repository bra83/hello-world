(function(){
  if (typeof globalThis.structuredClone !== 'function') {
    globalThis.structuredClone = (v) => v === undefined ? undefined : JSON.parse(JSON.stringify(v));
  }
  if (!String.prototype.replaceAll) {
    String.prototype.replaceAll = function(s, r) { return typeof s === 'string' ? this.split(s).join(r) : this.replace(s, r); };
  }
  if (!Array.prototype.at) {
    Array.prototype.at = function(n) { n = Math.trunc(n) || 0; if (n < 0) n += this.length; return (n < 0 || n >= this.length) ? undefined : this[n]; };
  }
  if (!String.prototype.at) {
    String.prototype.at = function(n) { n = Math.trunc(n) || 0; if (n < 0) n += this.length; return (n < 0 || n >= this.length) ? undefined : this.charAt(n); };
  }
  if (!Object.hasOwn) {
    Object.hasOwn = (obj, prop) => Object.prototype.hasOwnProperty.call(obj, prop);
  }
  if (globalThis.crypto && !globalThis.crypto.randomUUID) {
    globalThis.crypto.randomUUID = () => 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
    });
  }
  if (!globalThis.AndroidBarbara || globalThis.MotorBarbaraCore) return;
  const parse = (raw) => {
    try { return typeof raw === 'string' ? JSON.parse(raw) : raw; }
    catch { return {ok:false,resolved:false,error:'invalid_native_json',raw}; }
  };
  const pending = new Map();
  let requestId = 0;
  const requestSession = globalThis.crypto?.randomUUID?.() || (Date.now().toString(36) + Math.random().toString(36));
  globalThis.__braseiroNativeReply = (id, raw) => {
    const resolve = pending.get(id);
    if (!resolve) return;
    pending.delete(id);
    resolve(raw);
  };
  const callNative = (method, ...args) => {
    if (typeof AndroidBarbara.request !== 'function') {
      return Promise.resolve(JSON.stringify({ok:false,resolved:false,error:'NATIVE_BRIDGE_UPGRADE_REQUIRED'}));
    }
    const id = requestSession + ":" + String(++requestId);
    return new Promise(resolve => {
      pending.set(id, resolve);
      try { AndroidBarbara.request(id, method, JSON.stringify(args)); }
      catch (error) {
        pending.delete(id);
        resolve(JSON.stringify({ok:false,resolved:false,error:String(error.message || error)}));
      }
    });
  };
  globalThis.MotorBarbaraCore = {
    runtime: {
      status: async () => parse((await callNative('status')))
    },
    characters: {
      upsert: async (id, character, opts = {}) => {
        const payload = { ...character };
        if (opts && Number.isFinite(Number(opts.expectedStateVersion))) {
          payload._expectedStateVersion = Number(opts.expectedStateVersion);
        }
        if (opts && Number.isFinite(Number(opts.expectedJacketRevision))) {
          payload._expectedJacketRevision = Number(opts.expectedJacketRevision);
        }
        return parse((await callNative('saveCharacter', id, JSON.stringify(payload))));
      },
      getActiveId: async () => (await callNative('getActiveId')) || null,
      get: async (id) => {
        const out = parse((await callNative('getCharacter', id || '')));
        return out?.character ?? null;
      }
    },
    vtt: {
      bindEntityToken: async (payload) => parse((await callNative('bindEntityToken', JSON.stringify(payload)))),
      snapshot: async () => parse((await callNative('vttSnapshot'))),
      ensureSceneNpcs: async (id, payload) => parse((await callNative('ensureSceneNpcs', id, JSON.stringify(payload)))),
      moveSceneNpc: async (payload) => parse((await callNative('moveSceneNpc', JSON.stringify(payload))))
    },
    world: {
      setPosition: async (id, position) => parse((await callNative('setPosition', id, JSON.stringify(position)))),
      enterScene: async (id, payload) => parse((await callNative('enterScene', id, JSON.stringify(payload)))),
      setScenePosition: async (id, payload) => parse((await callNative('setScenePosition', id, JSON.stringify(payload)))),
      exitScene: async (id) => parse((await callNative('exitScene', id))),
      playerAction: async (payload) => parse((await callNative('playerAction', JSON.stringify(payload)))),
      gmHelp: async (payload) => parse((await callNative('gmHelp', JSON.stringify(payload)))),
      commitMechanic: async (payload) => parse((await callNative('commitCharacterMechanic', JSON.stringify(payload)))),
      verifyTimeAdvance: async (payload) => parse((await callNative('verifyWorldTimeAdvance', JSON.stringify(payload || {}))))
    },
    wallet: {
      getTransaction: async (payload) => parse((await callNative('walletGetTransaction', JSON.stringify(payload || {})))),
      creditMissionReward: async (payload) => parse((await callNative('walletCreditMissionReward', JSON.stringify(payload || {})))),
      verifyRewardEligibility: async (payload) => parse((await callNative('verifyRewardEligibility', JSON.stringify(payload || {}))))
    },
    rules: {
      resolveAdventureAction: async (payload) => parse((await callNative('resolveAdventureRuleAction', JSON.stringify(payload || {}))))
    },
    updater: {
      status: async () => parse((await callNative('updaterStatus'))),
      checkGitHub: async (manifestUrl) => parse((await callNative('checkGitHubUpdate', manifestUrl || ''))),
      downloadAndApplyGitHub: async (manifestUrl) => parse((await callNative('downloadAndApplyGitHubUpdate', manifestUrl || ''))),
      applyPackage: async (payload) => parse((await callNative('applyUpdatePackage', typeof payload === 'string' ? payload : JSON.stringify(payload || {})))),
      rollback: async () => parse((await callNative('rollbackUpdatePackage')))
    },
    persistence: {
      snapshot: async (label) => parse((await callNative('snapshot', label || 'manual'))),
      createWorldBackup: async (label) => parse((await callNative('createWorldBackup', label || 'manual'))),
      listWorldBackups: async () => parse((await callNative('listWorldBackups'))),
      restoreWorldBackup: async (name) => parse((await callNative('restoreWorldBackup', name))),
      deleteWorldBackup: async (name) => parse((await callNative('deleteWorldBackup', name)))
    },
    voice: {
      settings: async () => parse((await callNative('geminiSettings'))),
      saveSettings: async (payload) => parse((await callNative('saveGeminiSettings', JSON.stringify(payload || {})))),
      speak: async (payload) => parse((await callNative('speakGeminiTts', JSON.stringify(payload || {})))),
      stop: async () => parse((await callNative('stopGeminiTts')))
    }
  };
})();
