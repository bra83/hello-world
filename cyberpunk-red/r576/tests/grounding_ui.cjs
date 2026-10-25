const {chromium}=require('playwright');
const assert=require('node:assert/strict');const fs=require('node:fs');
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.CPRED_CHROME?{executablePath:process.env.CPRED_CHROME}:{}),args:['--no-sandbox']});
 try{
 const page=await browser.newPage({viewport:{width:412,height:823}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(process.env.CPRED_TEST_URL);await page.waitForFunction(()=>window.__cpredUiReady);
 await page.locator('.bottom-nav [data-tab="sheet"]').click();await page.locator('#saveCharacterBtn').click();
 await page.waitForFunction(()=>document.querySelector('#characterManagerStatus').textContent.includes('1 personagem'));
 const downloaded=page.waitForEvent('download');await page.locator('#characterExportBtn').click();const dl=await downloaded;
 const exported=JSON.parse(fs.readFileSync(await dl.path(),'utf8'));
 exported.character.campaignState.session={status:'active',history:[],sceneImages:{},recommendedActions:[],narrationSource:'error',narrativeError:'ValueError: fato_claim_sem_evidencia',currentNarration:'Cena rejeitada por evidência.'};
 await page.locator('#characterImportFile').setInputFiles({name:'failed-scene.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(exported))});
 await page.waitForFunction(()=>document.querySelector('#coreBadge').textContent==='GEMINI • FALHOU');
 await page.locator('#saveCharacterBtn').click();
 await page.waitForFunction(()=>document.querySelector('#characterManagerStatus').textContent.includes('2 personagem'));
 assert.equal(await page.locator('#coreBadge').textContent(),'GEMINI • FALHOU');
 await page.reload();await page.waitForFunction(()=>window.__cpredUiReady&&document.querySelector('#coreBadge').textContent==='GEMINI • FALHOU');
 await page.locator('.bottom-nav [data-tab="table"]').click();assert.match(await page.locator('#tableNarrative').textContent(),/Cena rejeitada/);
 await page.locator('.bottom-nav [data-tab="sheet"]').click();
 exported.character.campaignState.session={...exported.character.campaignState.session,narrationSource:'provider',narrativeError:null,currentNarration:'O Mestre apresenta a cena. O que você faz?'};
 await page.locator('#characterImportFile').setInputFiles({name:'ready-scene.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(exported))});
 await page.waitForFunction(()=>document.querySelector('#coreBadge').textContent==='GEMINI • ATIVO');
 await page.locator('#saveCharacterBtn').click();assert.equal(await page.locator('#coreBadge').textContent(),'GEMINI • ATIVO');
 assert.deepEqual(errors,[]);console.log('PASS: real UI import/save/reopen retains failed Gemini status; successful saved scene remains ATIVO after render');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
