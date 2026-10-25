/**
 * Contrato fino entre App/VTT e Motor Bárbara.
 * O app nunca grava estado universal diretamente quando o host real está disponível.
 * Para a demo HTML há um backend local explícito, apenas para testes de navegador.
 */
export class BarbaraHostBridge {
  constructor(host = globalThis.MotorBarbaraCore ?? null){
    this.host = host;
    this.mode = host ? 'barbara-core' : 'demo-local-fallback';
    this.wallet = {
      getTransaction: (req) => this.walletGetTransaction(req),
      creditMissionReward: (req) => this.walletCreditMissionReward(req)
    };
  }
  get isRealCore(){ return this.mode === 'barbara-core'; }
  async saveCharacter(character, opts = {}){
    if(this.host?.characters?.upsert) return this.host.characters.upsert(character.characterId, character, opts);
    const nextVersion = Number(character.stateVersion || 0) + 1;
    character.stateVersion = nextVersion;
    localStorage.setItem(`barbara.demo.character.${character.characterId}`, JSON.stringify(character));
    localStorage.setItem('barbara.demo.character.active', character.characterId);
    return {ok:true,resolved:true,mode:this.mode,characterId:character.characterId,stateVersion:nextVersion};
  }
  async loadCharacter(characterId=null){
    if(this.host?.characters?.get) return this.host.characters.get(characterId ?? await this.host.characters.getActiveId());
    const id=characterId ?? localStorage.getItem('barbara.demo.character.active');
    if(!id) return null;
    const raw=localStorage.getItem(`barbara.demo.character.${id}`); return raw?JSON.parse(raw):null;
  }
  async listCharacters(){
    if(this.host?.characters?.list)return this.host.characters.list();
    return Object.keys(localStorage).filter(k=>k.startsWith('barbara.demo.character.')&&!k.endsWith('.active')).map(k=>JSON.parse(localStorage.getItem(k))).filter(c=>c?.characterId);
  }
  async deleteCharacter(id){
    if(this.host?.characters?.remove)return this.host.characters.remove(id);
    localStorage.removeItem(`barbara.demo.character.${id}`);localStorage.removeItem(`barbara.demo.token.${id}`);
    if(localStorage.getItem('barbara.demo.character.active')===id)localStorage.removeItem('barbara.demo.character.active');
    return {ok:true};
  }
  async bindToken(character){
    const payload={entityId:character.characterId,tokenDataUrl:character.assets?.tokenDataUrl,portraitDataUrl:character.assets?.portraitDataUrl};
    if(this.host?.vtt?.bindEntityToken) return this.host.vtt.bindEntityToken(payload);
    localStorage.setItem(`barbara.demo.token.${character.characterId}`, JSON.stringify(payload));
    return {ok:true,resolved:true,mode:this.mode,...payload};
  }
  async moveCharacter(characterId,worldPosition){
    if(this.host?.world?.setPosition) return this.host.world.setPosition(characterId,worldPosition);
    const c=await this.loadCharacter(characterId); if(!c) throw new Error('Personagem não encontrado');
    c.worldPosition={...worldPosition,atlasId:worldPosition?.atlasId||'night-city-2045'};
    await this.saveCharacter(c);
    return {ok:true,resolved:true,characterId,mode:this.mode,worldPosition:c.worldPosition};
  }
  async enterScene(characterId,payload){
    if(this.host?.world?.enterScene) return this.host.world.enterScene(characterId,payload);
    const c=await this.loadCharacter(characterId); if(!c) throw new Error('Personagem não encontrado');
    const returnStreet={...(c.worldPosition||{}),mode:'street'};
    c.worldPosition={...returnStreet,mode:'interior',sceneId:payload.sceneId,poiCode:payload.poiCode||null,returnStreet,local:{x:.5,y:.9}};
    await this.saveCharacter(c); return {ok:true,resolved:true,mode:this.mode,worldPosition:c.worldPosition};
  }
  async moveSceneCharacter(characterId,payload){
    if(this.host?.world?.setScenePosition) return this.host.world.setScenePosition(characterId,payload);
    const c=await this.loadCharacter(characterId); if(!c) throw new Error('Personagem não encontrado');
    c.worldPosition={...(c.worldPosition||{}),mode:'interior',sceneId:payload.sceneId,local:{x:payload.x,y:payload.y}};
    await this.saveCharacter(c); return {ok:true,resolved:true,mode:this.mode,worldPosition:c.worldPosition};
  }
  async exitScene(characterId){
    if(this.host?.world?.exitScene) return this.host.world.exitScene(characterId);
    const c=await this.loadCharacter(characterId); if(!c) throw new Error('Personagem não encontrado');
    c.worldPosition={...(c.worldPosition?.returnStreet||c.worldPosition||{}),mode:'street'};
    delete c.worldPosition.sceneId; delete c.worldPosition.returnStreet; delete c.worldPosition.local;
    await this.saveCharacter(c); return {ok:true,resolved:true,mode:this.mode,worldPosition:c.worldPosition};
  }
  async ensureSceneNpcs(characterId,payload){
    if(this.host?.vtt?.ensureSceneNpcs) return this.host.vtt.ensureSceneNpcs(characterId,payload);
    const key=`barbara.demo.npcs.${payload.poiCode||payload.sceneId}`;let npcs=JSON.parse(localStorage.getItem(key)||'null');
    if(!npcs){const names=['Mara Kane','Jax Voss','Rin Ortiz','Kiro Cho','Nix Mendez','Vale Rhyne'],mooks=[
      {mookType:'boosterganger',ref:6,dex:5,tech:2,will:2,body:2,move:4,maxHp:20,sp:4,evasion:2,concentration:2,resistTortureDrugsBase:4,cybertechBase:2,weaponId:'veryHeavyPistol',weaponSkill:6},
      {mookType:'roadganger',ref:6,dex:4,tech:4,will:3,body:3,move:3,maxHp:25,sp:7,evasion:2,concentration:2,resistTortureDrugsBase:3,cybertechBase:4,weaponId:'bow',weaponSkill:4},
      {mookType:'bodyguard',ref:6,dex:5,tech:2,will:4,body:6,move:4,maxHp:35,sp:7,evasion:2,concentration:2,resistTortureDrugsBase:8,cybertechBase:2,weaponId:'shotgun',weaponSkill:4},
      {mookType:'securityoperative',ref:7,dex:4,tech:2,will:3,body:5,move:3,maxHp:30,sp:7,evasion:2,concentration:4,resistTortureDrugsBase:5,cybertechBase:2,weaponId:'assaultRifle',weaponSkill:3}
    ];npcs=(payload.spawnPoints||[]).slice(0,payload.count||3).map((p,i)=>{const m={...mooks[i%mooks.length]};return{tokenId:`npc-${payload.poiCode||payload.sceneId}-${i+1}`,name:names[i%names.length],x:p.x,y:p.y,...m,hp:m.maxHp,disposition:(payload.danger||1)>=2?'hostile':'neutral'}});localStorage.setItem(key,JSON.stringify(npcs));}
    return {ok:true,mode:this.mode,npcs};
  }
  async moveSceneNpc(payload){
    if(this.host?.vtt?.moveSceneNpc) return this.host.vtt.moveSceneNpc(payload);
    const key=`barbara.demo.npcs.${payload.poiCode||payload.sceneId}`;const npcs=JSON.parse(localStorage.getItem(key)||'[]'),n=npcs.find(x=>x.tokenId===payload.tokenId);if(n){n.x=payload.x;n.y=payload.y;localStorage.setItem(key,JSON.stringify(npcs));}return {ok:!!n,...payload};
  }
  async playerAction(payload){
    if(this.host?.world?.playerAction) return this.host.world.playerAction(payload);
    return {ok:true,mode:this.mode,result:{phase:'COMPLETED',narration:`[DEMO] Ação recebida: ${payload?.text||''}`,world_advanced:false}};
  }
  async gmHelp(payload){
    if(this.host?.world?.gmHelp) return this.host.world.gmHelp(payload);
    return {ok:true,mode:this.mode,result:{phase:'COMPLETED',narration:'[DEMO] O manual completo só é consultado no host Android com RAG.'}};
  }
  async commitMechanic(action,character,evidence={},mechanic='combat'){
    if(this.host?.world?.commitMechanic)return this.host.world.commitMechanic({characterId:character.characterId,mechanic,action,evidence,character});
    return this.saveCharacter(character);
  }
  async walletGetTransaction(payload){
    if(this.host?.wallet?.getTransaction) return this.host.wallet.getTransaction(payload);
    return {ok:false,found:false,reason:'WALLET_HOST_UNAVAILABLE'};
  }
  async walletCreditMissionReward(payload){
    if(this.host?.wallet?.creditMissionReward) return this.host.wallet.creditMissionReward(payload);
    return {ok:false,resolved:false,blocked:true,reason:'WALLET_HOST_UNAVAILABLE'};
  }
  async verifyRewardEligibility(payload){
    if(this.host?.wallet?.verifyRewardEligibility) return this.host.wallet.verifyRewardEligibility(payload);
    return {ok:false,resolved:false,eligible:false,reason:'REWARD_HOST_UNAVAILABLE'};
  }
  async verifyWorldTimeAdvance(payload){
    if(this.host?.world?.verifyTimeAdvance) return this.host.world.verifyTimeAdvance(payload);
    return {ok:false,resolved:false,verified:false,reason:'WORLD_TIME_HOST_UNAVAILABLE'};
  }
  async resolveAdventureRuleAction(payload){
    if(this.host?.rules?.resolveAdventureAction) return this.host.rules.resolveAdventureAction(payload);
    return {ok:false,resolved:false,blocked:true,reason:'RULE_HOST_UNAVAILABLE'};
  }
  async updaterStatus(){
    if(this.host?.updater?.status) return this.host.updater.status();
    return {ok:true,systemId:'cyberpunk-red',baseVersionCode:4172,baseVersionName:'4.1.72',activeUpdate:null,rollbackAvailable:false};
  }
  async checkGitHubUpdate(manifestUrl=''){
    if(this.host?.updater?.checkGitHub) return this.host.updater.checkGitHub(manifestUrl);
    return {ok:false,error:'UPDATER_HOST_UNAVAILABLE'};
  }
  async downloadAndApplyGitHubUpdate(manifestUrl=''){
    if(this.host?.updater?.downloadAndApplyGitHub) return this.host.updater.downloadAndApplyGitHub(manifestUrl);
    return {ok:false,error:'UPDATER_HOST_UNAVAILABLE'};
  }
  async applyUpdatePackage(payload){
    if(this.host?.updater?.applyPackage) return this.host.updater.applyPackage(payload);
    return {ok:false,error:'UPDATER_HOST_UNAVAILABLE'};
  }
  async rollbackUpdatePackage(){
    if(this.host?.updater?.rollback) return this.host.updater.rollback();
    return {ok:false,error:'UPDATER_HOST_UNAVAILABLE'};
  }
  async saveSlot(name,character){
    const safe=(name||'save').trim()||'save';
    if(this.host?.persistence?.createWorldBackup){
      const committed=await this.saveCharacter(character);if(committed?.ok===false)return committed;
      return this.host.persistence.createWorldBackup(safe);
    }
    localStorage.setItem(`barbara.save.${safe}`,JSON.stringify({name:safe,label:safe,savedAt:new Date().toISOString(),character}));return {ok:true,name:safe,label:safe};
  }
  async listSlots(){
    if(this.host?.persistence?.listWorldBackups){const out=await this.host.persistence.listWorldBackups();return (out?.backups||[]).map(row=>({...row,savedAt:row.modifiedAtEpochMs?new Date(row.modifiedAtEpochMs).toISOString():''}))}
    return Object.keys(localStorage).filter(k=>k.startsWith('barbara.save.')).map(k=>JSON.parse(localStorage.getItem(k))).sort((a,b)=>String(b.savedAt).localeCompare(String(a.savedAt)));
  }
  async loadSlot(name){
    if(this.host?.persistence?.restoreWorldBackup)return this.host.persistence.restoreWorldBackup(name);
    const raw=localStorage.getItem(`barbara.save.${name}`);return raw?JSON.parse(raw):null;
  }
  async deleteSlot(name){if(this.host?.persistence?.deleteWorldBackup)return this.host.persistence.deleteWorldBackup(name);localStorage.removeItem(`barbara.save.${name}`);return {ok:true}}
  async snapshot(label='character-studio'){
    if(this.host?.persistence?.snapshot) return this.host.persistence.snapshot(label);
    return {ok:true,mode:this.mode,label,createdAt:new Date().toISOString()};
  }
}
