import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
const src=new URL('../runtime/',import.meta.url);
test('patched controller exposes player-only The Jacket port and strips sealed narrator data (isolated stub host)',async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'cpred-r572-controller-'));
 try{
  fs.writeFileSync(path.join(dir,'package.json'),'{"type":"module"}');
  for(const name of ['cyberpunk_adventure_controller_v2.js','cemk_the_jacket_campaign_port.js',
    'cemk_the_jacket_mechanics.js','cemk_the_jacket_registry.js','cemk_the_jacket_wallet_port.js'])
   fs.copyFileSync(new URL(name,src),path.join(dir,name));
  fs.writeFileSync(path.join(dir,'cyberpunk_adventure_controller.js'),
   `export class CyberpunkAdventureController {
      constructor(options){this._char=options.character;this.rulesAdapter=options.rulesAdapter;
       this.saveCharacter=options.saveCharacter;}
      character(){return this._char;}
      buildContextObject(){return {gmKnowledge:{secret:'sealed'},publicNarration:'street'};}
   }`);
  fs.writeFileSync(path.join(dir,'adventure_engine_v2.js'),
   `export class AdventureEngine{};export class AdventureRuntime{};
    export class AdventureRegistry{constructor({validator}){this.validator=validator;}}
    export class AdventureValidator{};export class AdventurePersistence{};export const StartMode={};export const migrateAdventureState=x=>x;`);
  fs.writeFileSync(path.join(dir,'cyberpunk_host_adapters.js'),`export const CYBERPUNK_RULE_ACTIONS=['SKILL_CHECK'];`);
  const {CyberpunkAdventureController}=await import(pathToFileURL(path.join(dir,'cyberpunk_adventure_controller_v2.js')).href);
  const c={characterId:'pc',campaignState:{session:{campaignId:'camp'}}};
  const controller=new CyberpunkAdventureController({character:c,saveCharacter:async()=>({ok:true})});
  assert.equal(controller.buildContextObject().gmKnowledge,undefined);
  const out=await controller.theJacketTransition('first_fight');
  assert.equal(out.result.ok,true);
  assert.equal(controller.theJacketSnapshot().story.current,'first_fight');
  const ctx=controller.buildContextObject();
  assert.equal(ctx.theJacket.story.currentBeat,'first_fight');
  assert.equal(ctx.theJacket.authority.mutateState,false);
  const denied=await controller.theJacketTransition('meeting_falco',{actor:'ai'});
  assert.equal(denied.result.blocked,true);
  assert.equal(controller.theJacketSnapshot().story.current,'first_fight');
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
