import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
const root=process.argv[2];
const {CharacterWorkbenchUI}=await import(pathToFileURL(root+'/app/src/main/assets/web/app/sheets.js'));
const {createCharacter}=await import(pathToFileURL(root+'/app/src/main/assets/web/adapter/character_rules.js'));
globalThis.window={confirm:()=>true};
for(const phase of ['start','save','readback_pending','runtime_status']){
 const c=createCharacter({method:'complete',role:'solo',name:'Preservado'});
 c.campaignState.session={status:'ready',narrationSource:'provider',currentNarration:'A cena anterior continua aqui.',history:[{narration:'Memória preservada'}]};
 const before=structuredClone(c);let api=0,renders=0;
 const durable=structuredClone(before);
 if(phase==='readback_pending'){durable.campaignState.session.narrationSource='pending';durable.campaignState.session.currentNarration='GERANDO CENA COM GEMINI...'}
 const host={character:()=>c,sessionState:x=>x.campaignState.session,randomInt:()=>7,
   geminiRuntimeStatus:async()=>{if(phase==='runtime_status')throw new Error('state_too_large');return {configured:true}},
   adventureStartSelection:()=>({moduleId:'cyberpunk_sandbox',mode:'SANDBOX'}),
   adventureController:{getModule:()=>({id:'cyberpunk_sandbox'}),start:async()=>{if(phase==='start')throw new Error('START_SAVE_CHARACTER_FAILED: ValueError: state_too_large');return {currentLocationId:'Watson'}}},
   bridge:{loadCharacter:async()=>structuredClone(durable),playerAction:async()=>{api++;throw new Error('Must not reach Gemini before durable save')}},
   openingNarration:()=> 'GERANDO CENA COM GEMINI...',localRecommendedActions:()=>[],
   renderSession:()=>{},saveSession:async()=>{throw new Error('ValueError: state_too_large')},
   setNarrationBadge:()=>{},renderCharacter:()=>{renders++},render:()=>{renders++},toast:()=>{}};
 const out=await CharacterWorkbenchUI.prototype.newAdventureUniversal.call(host);
 assert.equal(out.ok,false);assert.match(out.error,/state_too_large/);assert.equal(api,0);assert.ok(renders>=2);
 if(phase!=='readback_pending')assert.deepEqual(c,before,'Prior character/session changed after failed start');
 else{assert.equal(c.campaignState.session.narrationSource,'error');assert.doesNotMatch(c.campaignState.session.currentNarration,/GERANDO CENA/);assert.equal(c.name,'Preservado')}
}
console.log('PASS: failed start/save/settings restore durable character; no premature Gemini call; stale pending message cleared');

{
 let c=createCharacter({method:'complete',role:'solo',name:'Retomado'});
 const saved=structuredClone(c);saved.campaignState.session={status:'active',narrationSource:'pending',currentNarration:'GERANDO CENA COM GEMINI...',history:[{narration:'História preservada'}]};
 const host={character:()=>c,bridge:{loadCharacter:async()=>saved},setCharacter:x=>{c=x},sessionState:x=>x.campaignState.session,renderCharacter:()=>{},render:()=>{},toast:()=>{}};
 await CharacterWorkbenchUI.prototype.continueAdventure.call(host);
 assert.equal(c.campaignState.session.status,'active');assert.equal(c.campaignState.session.narrationSource,'interrupted');assert.doesNotMatch(c.campaignState.session.currentNarration,/GERANDO CENA/);assert.equal(c.campaignState.session.history[0].narration,'História preservada');
 console.log('PASS: Continue recovers a durable pending session without phantom generation or lost history');
}
