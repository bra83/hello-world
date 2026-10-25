const {chromium} = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const baseUrl = process.env.CPRED_TEST_URL || 'http://127.0.0.1:8091/cyberpunk-current/android/app/src/main/assets/web/app/';
const output = process.env.CPRED_TEST_OUTPUT || '/tmp/cpred-mobile-tests';
fs.mkdirSync(output, {recursive:true});

(async () => {
  const browser = await chromium.launch({headless:true,
    ...(process.env.CPRED_CHROME ? {executablePath:process.env.CPRED_CHROME} : {}), args:['--no-sandbox']});
  try {
    const page = await browser.newPage({viewport:{width:412,height:915}, deviceScaleFactor:1});
    page.setDefaultTimeout(7000);
    const errors=[];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(baseUrl+'index.html', {waitUntil:'networkidle', timeout:30000});
    await page.waitForFunction(() => window.__cpredUiReady && document.body.dataset.mobileShell === '573');
    await page.screenshot({path:path.join(output,'initial.png')});
    // Real DOM clicks, never controller calls: every screen must remain responsive.
    for (let pass=0;pass<2;pass++) {
      for (const tab of ['sheet','atlas','combat','table']) {
        console.log('CLICK',pass,tab);
        await page.locator(`.bottom-nav [data-tab="${tab}"]`).click();
        await page.waitForFunction(tab => document.body.dataset.activeTab === tab, tab);
        assert.equal(await page.locator(`#tab-${tab}`).isVisible(), true);
      }
      for (const tab of ['game','inventory','journal','audio','stories','net','vehicle','create','skills','library','portrait','json']) {
        console.log('MENU',pass,tab);
        await page.locator('#moreNavBtn').click();
        const link=page.locator(`#moreSheet [data-open-tab="${tab}"]`).first();
        if (!(await link.isVisible())) await page.locator('#moreSheet .more-advanced > summary').click();
        await link.click();
        assert.equal(await page.locator(`#tab-${tab}`).isVisible(), true);
        assert.equal(await page.locator('#moreSheet').isVisible(), false);
      }
    }
    await page.locator('.bottom-nav [data-tab="table"]').click();
    // Change the observed labels, then require the event loop to reach a timer.
    await page.evaluate(() => {document.querySelector('#tableLocation').textContent='Kabuki';document.querySelector('#tableScene').textContent='Mercado';});
    const heartbeat = await page.evaluate(() => new Promise(resolve => setTimeout(() => resolve(document.querySelector('#homeContinueMeta').textContent), 30)));
    assert.equal(heartbeat, 'Kabuki • Mercado');
    await page.locator('.mobile-campaign > summary').click();
    await page.locator('#adventureImportDetails > summary').click();
    assert.equal(await page.locator('#adventureJsonFileInput').isVisible(),true);
    await page.locator('.mobile-campaign > summary').click();
    await page.locator('#howToPlayBtn').click();
    assert.equal(await page.locator('#howToPlay').isVisible(),true);
    await page.locator('#howToPlayClose').click();
    await page.locator('#tableDiceBtn').click();
    assert.equal(await page.locator('#diceTray').isVisible(),true);
    await page.locator('#diceTrayClose').click();
    // Operational errors must not turn a usable app into a blocking boot overlay.
    await page.evaluate(() => window.__cpredBootFail(new Error('simulated operational failure')));
    assert.equal(await page.locator('#bootGuard').isVisible(),false);
    await page.locator('.bottom-nav [data-tab="sheet"]').click();
    await page.evaluate(()=>document.querySelector('#toast').classList.remove('show'));
    await page.screenshot({path:path.join(output,'sheet-412.png')});
    await page.locator('.bottom-nav [data-tab="table"]').click();
    await page.screenshot({path:path.join(output,'scene-412.png')});
    for (const width of [360,412,768]) {
      await page.setViewportSize({width,height:915});
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),true,`overflow at ${width}`);
      const nav = await page.locator('.bottom-nav').boundingBox();
      assert.ok(nav.height <= 80, `navigation too tall at ${width}`);
      const area = await page.locator('#sessionActionInput').boundingBox();
      assert.ok(area.width > width*.65 || width>600, 'action composer is too narrow');
    }
    assert.deepEqual(errors, [], 'uncaught browser errors');
    console.log('PASS: real navigation, menus, dialogs, observer heartbeat, error recovery, 360/412/768 layout');

    // A deliberately slow native request must not block JS, touch navigation or another response.
    const bridgePage=await browser.newPage();
    await bridgePage.goto(baseUrl+'index.html', {waitUntil:'networkidle'});
    const result=await bridgePage.evaluate(async () => {
      delete globalThis.MotorBarbaraCore;
      const requests=[];
      globalThis.AndroidBarbara={request:(id,method,args)=>requests.push({id,method,args})};
      await new Promise((resolve,reject)=>{const script=document.createElement('script');script.src='android_bridge_bootstrap.js?transport-test';script.onload=resolve;script.onerror=reject;document.head.append(script)});
      const first=MotorBarbaraCore.runtime.status();
      const second=MotorBarbaraCore.voice.settings();
      const timer=await new Promise(resolve=>setTimeout(()=>resolve(true),20));
      const req2=requests.find(r=>r.method==='geminiSettings');
      __braseiroNativeReply(req2.id,JSON.stringify({ok:true,voice:'test'}));
      const response2=await second;
      const req1=requests.find(r=>r.method==='status');
      __braseiroNativeReply(req1.id,JSON.stringify({ok:true,status:'ready'}));
      return {timer,response1:await first,response2};
    });
    assert.equal(result.timer,true);
    assert.equal(result.response1.status,'ready');
    assert.equal(result.response2.voice,'test');
    console.log('PASS: asynchronous native transport with out-of-order responses');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode=1; });
