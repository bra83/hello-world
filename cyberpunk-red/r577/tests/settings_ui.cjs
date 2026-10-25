const {chromium}=require('playwright');const assert=require('node:assert/strict');const fs=require('node:fs');
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.CPRED_CHROME?{executablePath:process.env.CPRED_CHROME}:{}),args:['--no-sandbox']});
 try{
 const page=await browser.newPage({viewport:{width:412,height:915}});page.setDefaultTimeout(10000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
 if(process.env.CPRED_SETTINGS_BASELINE)await page.route('**/app.js?*',r=>r.fulfill({contentType:'application/javascript',body:fs.readFileSync(process.env.CPRED_SETTINGS_BASELINE,'utf8')}));
 await page.addInitScript(()=>{
  const timer=setInterval(()=>{if(!window.__cpredUiReady)return;clearInterval(timer);
   const defaults={ok:true,configured:false,textModel:'gemini-3.8-flash',ttsModel:'gemini-3.8-flash-tts',voice:'Charon',language:'pt-BR',ttsEngine:'android',voiceStyle:'narration',voiceProfile:'Narrador',ttsSpeed:1,vocalMode:'distinct-voices',stripVocalTags:true};
   const saved=()=>({...defaults,...JSON.parse(localStorage.getItem('test.settings')||'{}')});
   const ctl=window.__settingsTest={ignoreSave:false,failSave:false,blockNextRead:false,saves:0};
   globalThis.MotorBarbaraCore={...(globalThis.MotorBarbaraCore||{}),voice:{
    settings:async()=>{const snapshot=saved();if(ctl.blockNextRead){ctl.blockNextRead=false;return new Promise(resolve=>ctl.releaseRead=()=>resolve(snapshot))}return snapshot;},
    saveSettings:async payload=>{ctl.saves++;if(ctl.failSave)return{ok:false,error:'Falha de gravação simulada'};if(!ctl.ignoreSave)localStorage.setItem('test.settings',JSON.stringify({...saved(),...payload,textModel:payload.textModel.replace(/^models\//,''),ttsModel:payload.ttsModel.replace(/^models\//,'')}));if(ctl.delaySave)await new Promise(resolve=>ctl.releaseSave=resolve);return saved();}
   }};
  },10);
 });
 await page.goto(process.env.CPRED_TEST_URL);await page.waitForFunction(()=>window.__settingsTest);
 const audio=async()=>{await page.locator('#moreNavBtn').click();await page.locator('#moreSheet [data-open-tab="audio"]').first().click();};
 await audio();await page.waitForFunction(()=>document.querySelector('#geminiStatus').textContent.includes('modo local'));
 const input=page.locator('#geminiTextModel'),save=page.locator('#geminiSaveBtn');
 // Simulate a host that says OK but silently keeps its previous model (4.1.76's
 // native invalid-ID fallback). A successful toast must not hide the discrepancy.
 await page.evaluate(()=>window.__settingsTest.ignoreSave=true);await input.fill('models/gemini-2.5-flash');await save.click();
 if(process.env.CPRED_SETTINGS_BASELINE){
  await page.waitForFunction(()=>document.querySelector('#geminiTextModel').value==='gemini-3.8-flash');
  assert.match(await page.locator('#toast').textContent(),/salvos/);
  console.log('REPRODUCED 4.1.76: host retained previous model; UI reverted the edit and falsely reported settings saved');return;
 }
 await page.waitForFunction(()=>document.querySelector('#geminiStatus').textContent.includes('não confirmou'));
 assert.equal(await input.inputValue(),'models/gemini-2.5-flash');
 // A stale read issued before an edit/save cannot restore its old result later.
 await page.evaluate(()=>{window.__settingsTest.ignoreSave=false;window.__settingsTest.blockNextRead=true;window.dispatchEvent(new CustomEvent('barbara:gemini-key-updated',{detail:{configured:false}}));});
 await page.waitForFunction(()=>!!window.__settingsTest.releaseRead);
 await save.click();await page.waitForFunction(()=>document.querySelector('#geminiStatus').textContent.includes('salvas e conferidas'));
 assert.equal(await input.inputValue(),'gemini-2.5-flash');await page.evaluate(()=>window.__settingsTest.releaseRead());
 await page.waitForTimeout(50);assert.equal(await input.inputValue(),'gemini-2.5-flash');
 await page.reload();await page.waitForFunction(()=>window.__settingsTest);await audio();await page.waitForFunction(()=>document.querySelector('#geminiTextModel').value==='gemini-2.5-flash');
 // Uncommitted edits survive a key refresh/poll, and an explicit failure stays visible.
 await input.fill('gemini-2.5-flash-lite');
 await page.evaluate(()=>window.dispatchEvent(new CustomEvent('barbara:gemini-key-updated',{detail:{configured:false}})));await page.waitForTimeout(50);
 assert.equal(await input.inputValue(),'gemini-2.5-flash-lite');
 await page.evaluate(()=>window.__settingsTest.failSave=true);await save.click();await page.waitForFunction(()=>document.querySelector('#geminiStatus').textContent.includes('Falha de gravação simulada'));
 assert.equal(await input.inputValue(),'gemini-2.5-flash-lite');
 await page.evaluate(()=>{window.__settingsTest.failSave=false;window.__settingsTest.delaySave=true});await save.click();await page.waitForFunction(()=>!!window.__settingsTest.releaseSave);
 await input.fill('gemini-2.5-pro');await page.evaluate(()=>window.__settingsTest.releaseSave());
 await page.waitForFunction(()=>document.querySelector('#geminiStatus').textContent.includes('novas alterações'));
 assert.equal(await input.inputValue(),'gemini-2.5-pro');
 // Invalid/blank IDs never call native save or erase the edited text.
 const before=await page.evaluate(()=>window.__settingsTest.saves);await input.fill('modelo com espaços');await save.click();
 await page.waitForFunction(()=>document.querySelector('#geminiStatus').textContent.includes('Modelo inválido'));assert.equal(await page.evaluate(()=>window.__settingsTest.saves),before);
 assert.deepEqual(errors,[]);console.log('PASS: real settings UI save/readback/reload; models/ normalization; stale read and unsaved edits protected; native failure/mismatch visible; edits during save preserved; invalid input not sent');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
