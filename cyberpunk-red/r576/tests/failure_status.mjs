import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
const root=process.argv[2];
const {CharacterWorkbenchUI}=await import(pathToFileURL(root+'/app/src/main/assets/web/app/sheets.js'));
for(const reason of ['fato_claim_sem_evidencia','ValueError: fato_claim_sem_evidencia','RuntimeError: ValueError: fato_claim_sem_evidencia']){
 const text=CharacterWorkbenchUI.prototype.narrationFailureMessage(reason);
 assert.match(text,/Gemini respondeu/);assert.match(text,/não indica erro na sua chave/);
 assert.doesNotMatch(text,/Verifique a chave/);
}
const classes=new Set();const badge={textContent:'GEMINI • VERIFICANDO',classList:{add:(...x)=>x.forEach(v=>classes.add(v)),remove:(...x)=>x.forEach(v=>classes.delete(v))}};
globalThis.document={querySelector:id=>id==='#coreBadge'?badge:null};
const fn=CharacterWorkbenchUI.prototype.setNarrationBadge;
fn('deterministic_fallback','fato_claim_sem_evidencia');assert.equal(badge.textContent,'GEMINI • FALHOU');assert(classes.has('provider-failed'));
fn('provider');assert.equal(badge.textContent,'GEMINI • ATIVO');assert(!classes.has('provider-failed'));
fn('pending');assert.equal(badge.textContent,'GEMINI • VERIFICANDO');
console.log('PASS: wrapped factual rejection has correct non-credential diagnosis; failure, success and pending badges distinguish outcomes');
