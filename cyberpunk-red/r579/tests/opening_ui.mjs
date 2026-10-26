import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
const root=process.argv[2];
const {CharacterWorkbenchUI:UI}=await import(pathToFileURL(root+'/app/src/main/assets/web/app/sheets.js'));
const {createCharacter}=await import(pathToFileURL(root+'/app/src/main/assets/web/adapter/character_rules.js'));
globalThis.window={confirm:()=>true};globalThis.document={dispatchEvent:()=>{}};globalThis.CustomEvent=class{};
const scene=readFileSync(new URL('../../r578/tests/opening_scene.txt',import.meta.url),'utf8').trim();
for(const mode of ['valid','short','pending']){
 const c=createCharacter({method:'complete',role:'solo',name:'Preservado'});let calls=0,processed=0,saves=0;
 const host={character:()=>c,sessionState:x=>x.campaignState.session||{},randomInt:()=>7,
  geminiRuntimeStatus:async()=>({configured:true}),adventureStartSelection:()=>({moduleId:'cyberpunk_sandbox',mode:'SANDBOX'}),
  adventureController:{getModule:()=>({id:'cyberpunk_sandbox',premise:'Banca de manutenção em Watson.'}),start:async()=>({currentLocationId:'Watson'}),processHostResult:async()=>{processed++}},
  bridge:{playerAction:async payload=>{calls++;assert.match(payload.text,/5.000 a 6.000/);assert.match(payload.text,/Mestre Humano Dinâmico/);return {ok:true,result:mode==='pending'?{narration_source:'unavailable',narrative_error:'historia_de_abertura_resumida_demais'}:{narration_source:'provider',narration:mode==='valid'?scene:'Uma cena curta ainda não é uma abertura completa. '.repeat(20)+'O que você faz?'}}}},
  openingNarration:()=>UI.prototype.openingNarration(),narrationFailureMessage:UI.prototype.narrationFailureMessage,
  sanitizeNarration:UI.prototype.sanitizeNarration,sessionWorldContext:()=>({}),localRecommendedActions:()=>[],extractRecommendedActions:()=>[],
  setNarrationBadge:()=>{},renderSession:()=>{},saveSession:async()=>{saves++},toast:()=>{},renderCharacter:()=>{},render:()=>{}};
 await UI.prototype.newAdventureUniversal.call(host);
 const session=c.campaignState.session;assert.equal(calls,1);assert.equal(saves,2);assert.equal(session.status,'active');assert.equal(c.name,'Preservado');
 if(mode!=='pending'){assert.equal(session.currentNarration,mode==='valid'?scene:'Uma cena curta ainda não é uma abertura completa. '.repeat(20)+'O que você faz?');assert.equal(session.narrationSource,'provider');assert.equal(processed,1)}
 else{assert.equal(processed,0);assert.notEqual(session.narrationSource,'provider');assert.match(session.currentNarration,/extensão do texto não bloqueia/);assert.notEqual(session.currentNarration,scene)}
}
console.log('PASS: production opening UI preserves first full OR short valid scene, never rejects by length, preserves active campaign on provider failure; no duplicate UI action or premature adventure processing');
