const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const base=process.env.CPRED_TEST_URL||'http://127.0.0.1:8091/cyberpunk-current/android/app/src/main/assets/web/app/';
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.CPRED_CHROME?{executablePath:process.env.CPRED_CHROME}:{}),args:['--no-sandbox']});
 try{
 const page=await browser.newPage({viewport:{width:412,height:823}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base);await page.waitForFunction(()=>window.__cpredUiReady);
 const sheet=()=>page.locator('.bottom-nav [data-tab="sheet"]').click();
 await sheet();await page.locator('#saveCharacterBtn').click();await page.waitForFunction(()=>document.querySelector('#characterManagerStatus').textContent.includes('1 personagem'));
 const original=await page.locator('#characterSelect').inputValue();
 await page.locator('#newCharacterBtn').click();await page.waitForFunction(()=>document.body.dataset.activeTab==='create');
 assert.equal(await page.locator('#nameInput').isVisible(),true);
 await page.locator('#nameInput').fill('Vesper');await sheet();await page.locator('#saveCharacterBtn').click();
 await page.waitForFunction(()=>document.querySelector('#characterSelect').selectedOptions[0].text==='Vesper');
 const second=await page.locator('#characterSelect').inputValue();assert.notEqual(second,original);
 const downloaded=page.waitForEvent('download');await page.locator('#characterExportBtn').click();const dl=await downloaded;
 const content=fs.readFileSync(await dl.path(),'utf8');const exported=JSON.parse(content);assert.equal(exported.character.name,'Vesper');assert.equal(exported.character.characterId,second);
 // Import creates another durable character, including portraits/campaign payload, without overwriting a matching ID.
 await page.locator('#characterImportFile').setInputFiles({name:'Vesper.json',mimeType:'application/json',buffer:Buffer.from(content)});
 await page.waitForFunction(()=>document.querySelector('#characterManagerStatus').textContent.includes('3 personagem'));
 const imported=await page.locator('#characterSelect').inputValue();assert.notEqual(imported,second);
 await page.locator('#deleteCharacterBtn').click();await page.locator('#cancelDeleteCharacterBtn').click();assert.equal(await page.locator('#characterSelect option').count(),3);
 await page.locator('#deleteCharacterBtn').click();await page.locator('#confirmDeleteCharacterBtn').click();await page.waitForFunction(()=>document.querySelector('#characterManagerStatus').textContent.includes('2 personagem'));
 assert.equal(await page.locator(`#characterSelect option[value="${imported}"]`).count(),0);
 await page.locator('#characterSelect').selectOption(original);await page.waitForFunction(id=>localStorage.getItem('barbara.demo.character.active')===id,original);
 await page.reload();await page.waitForFunction(()=>window.__cpredUiReady);await sheet();await page.waitForFunction(id=>document.querySelector('#characterSelect').value===id,original);
 await page.locator('#characterImportFile').setInputFiles({name:'bad.json',mimeType:'application/json',buffer:Buffer.from('{"bad":true}')});
 await page.waitForTimeout(100);assert.equal(await page.locator('#characterSelect option').count(),2);
 await page.locator('#equipmentShortcutBtn').click();await page.locator('#inventoryCategory').selectOption('weapon');
 await page.waitForFunction(()=>[...document.querySelectorAll('#inventoryCatalog img.equipment-art')].filter(x=>x.complete&&x.naturalWidth>0).length>=3);
 const images=await page.locator('#inventoryCatalog img.equipment-art').evaluateAll(xs=>xs.slice(0,8).map(x=>({w:x.naturalWidth,box:x.getBoundingClientRect().width,src:x.getAttribute('src')})));
 assert.ok(images.every(x=>x.w>0&&x.box>=70),JSON.stringify(images));
 for(const width of [360,412,768]){
 await page.setViewportSize({width,height:823});
 const nav=await page.locator('#mobileBottomNav').boundingBox();assert.equal(nav.height,58);
 await page.locator('.bottom-nav [data-tab="table"]').click();await page.locator('.mobile-campaign').evaluate(x=>x.open=true);
 for(const id of ['adventureModuleSelect','adventureStartMode']){
 const size=await page.locator('#'+id).evaluate(x=>({h:x.clientHeight,font:parseFloat(getComputedStyle(x).fontSize),pad:parseFloat(getComputedStyle(x).paddingTop)+parseFloat(getComputedStyle(x).paddingBottom)}));
 assert.ok(size.h>=size.font*1.4+size.pad-2,`${id} clips text: ${JSON.stringify(size)}`);
 }
 await page.locator('.bottom-nav [data-tab="atlas"]').click();
 const box=await page.locator('#atlasCenter').boundingBox();assert.ok(box.width>=44);assert.ok(await page.locator('#atlasCenter').evaluate(x=>getComputedStyle(x).whiteSpace==='nowrap'));
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 }
 assert.deepEqual(errors,[]);console.log('PASS: roster create/save/switch/delete/cancel/reopen; JSON export/import/collision/invalid; equipment images; control text and 58px nav');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
