const {chromium}=require('playwright');const assert=require('node:assert/strict');const fs=require('node:fs');
(async()=>{const browser=await chromium.launch({headless:true,...(process.env.CPRED_CHROME?{executablePath:process.env.CPRED_CHROME}:{}),args:['--no-sandbox']});try{
 const page=await browser.newPage({viewport:{width:412,height:915}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{window.__sentPrompt=null;window.AndroidScene={openGemini:prompt=>{window.__sentPrompt=prompt;return JSON.stringify({ok:true})}};});
 await page.goto(process.env.CPRED_TEST_URL);await page.waitForFunction(()=>window.__cpredUiReady);
 await page.locator('.bottom-nav [data-tab="table"]').click();
 assert(await page.locator('#sceneGeminiBtn').isVisible());assert(await page.locator('#sceneImportBtn').isVisible());
 assert(await page.locator('#sessionRecommended button').count()>=3);await page.locator('#sessionRecommended button').first().click();assert((await page.locator('#sessionActionInput').inputValue()).length>10);
 await page.locator('#sceneGeminiBtn').click();await page.waitForFunction(()=>window.__sentPrompt?.includes('Cyberpunk RED'));
 // Real file input, FileReader, Canvas, actual save and restore through the local host.
 const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jQ1sAAAAASUVORK5CYII=','base64');
 await page.locator('#sceneImageFile').setInputFiles({name:'scene.png',mimeType:'image/png',buffer:png});await page.waitForFunction(()=>document.querySelector('#sceneIllustration').naturalWidth>0);
 const image=page.locator('#sceneIllustration'),narrative=page.locator('#tableNarrative');assert((await image.boundingBox()).y<(await narrative.boundingBox()).y);
 await page.waitForFunction(()=>document.querySelector('#toast').textContent.includes('persistida'));
 await page.reload();await page.waitForFunction(()=>window.__cpredUiReady&&document.querySelector('#sceneIllustration').naturalWidth>0);
 assert(await image.isVisible());assert.deepEqual(errors,[]);console.log('PASS: visible image controls above narration, one-click Gemini prompt payload, visible ready choices, real image decode/display/save/reload');
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exit(1)});
