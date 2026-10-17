const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('C:/Users/scart/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.join(__dirname,'github-upload');
const code=fs.readFileSync(path.join(root,'morjia-pet.js'),'utf8')
  .replace('this.canvas = canvas;','this.canvas = canvas; window.__petTest=this;')
  .replace('const RANDOM_ACTIONS = [','window.__actions=Object.keys(ACTIONS);const RANDOM_ACTIONS = [');
async function setup(browser,options={}){
  const context=await browser.newContext({viewport:{width:1200,height:900},...options}),page=await context.newPage();
  const errors=[],requests=[];page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>requests.push(r.url()));
  await page.route('**/cloud.js*',r=>r.fulfill({contentType:'application/javascript',body:'window.MorjiaCloud={configured:true,logout(){}};window.SITE_READY=Promise.resolve();'}));
  await page.route('**/morjia-pet.js*',r=>r.fulfill({contentType:'application/javascript',body:code}));
  return {context,page,errors,requests};
}
(async()=>{
  const browser=await chromium.launch({channel:'msedge',headless:true});
  try{
    const test=await setup(browser),{page}=test;
    await page.goto('http://127.0.0.1:8786/');await page.waitForFunction(()=>window.__petTest?.motionReady);
    const result=await page.evaluate(()=>{
      const p=window.__petTest,allowed=window.__actions;p.x=8;p.y=220;p.position();
      const seen=new Set();
      for(let i=0;i<500;i++){
        p.chooseNext();seen.add(p.action);if(p.x!==8||p.y!==220)throw Error('Unexpected automatic movement');
        p.draw(p.lastFrameAt+600);
        const rgba=p.ctx.getImageData(0,0,192,208).data;let pixels=0;
        for(let n=3;n<rgba.length;n+=4)if(rgba[n]>90)pixels++;
        if(pixels<100)throw Error('Empty pose '+p.action);
      }
      for(const removed of ['right','left','sleep','wander']){p.setAction(removed);if(p.action!=='idle')throw Error('Removed action still available');}
      p.x=350;p.y=300;p.setAction('idle',60000);p.position();
      return {allowed,seen:[...seen].sort(),stationary:true};
    });
    assert.equal(result.allowed.length,8);assert.ok(!result.allowed.includes('sleep'));
    assert.equal(test.requests.some(u=>/morjia_(walk|sleep)_|morjia-motion\.js/.test(u)),false);
    const cat=page.locator('#morjia-pet');await cat.click();assert.equal(await page.evaluate(()=>window.__petTest.action),'wave');
    const box=await cat.boundingBox();await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();
    await page.mouse.move(box.x+box.width/2+100,box.y+box.height/2+50,{steps:6});await page.mouse.up();
    const afterDrag=await page.evaluate(()=>({x:window.__petTest.x,y:window.__petTest.y}));
    assert.ok(afterDrag.x>440);await page.waitForTimeout(500);
    assert.deepEqual(await page.evaluate(()=>({x:window.__petTest.x,y:window.__petTest.y})),afterDrag);
    for(const route of ['home','works','gallery','about','links','contact']){
      await page.goto('http://127.0.0.1:8786/#'+route);await page.locator('#main h1').waitFor();
    }
    await page.getByRole('button',{name:'管理者ログイン',exact:true}).click();assert.ok(await page.locator('input[type=email]').isVisible());
    await page.getByRole('button',{name:'閉じる',exact:true}).click();
    await page.goto('http://127.0.0.1:8786/#home');await page.waitForFunction(()=>window.__petTest?.motionReady);
    await page.evaluate(()=>{const p=window.__petTest;p.x=850;p.y=450;p.setAction('sit',60000);p.position();});
    await page.screenshot({path:path.join(__dirname,'site-preview.png'),fullPage:true});
    assert.deepEqual(test.errors,[]);await test.context.close();
    const mobile=await setup(browser,{viewport:{width:390,height:844},isMobile:true,hasTouch:true});
    await mobile.page.goto('http://127.0.0.1:8786/');await mobile.page.waitForFunction(()=>window.__petTest?.motionReady);
    await mobile.page.locator('#morjia-pet').tap();assert.equal(await mobile.page.evaluate(()=>window.__petTest.action),'wave');
    const cdp=await mobile.context.newCDPSession(mobile.page),mb=await mobile.page.locator('#morjia-pet').boundingBox();
    const x=mb.x+mb.width/2,y=mb.y+mb.height/2;
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});
    await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x-60,y:y-60}]});
    await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
    assert.ok(await mobile.page.evaluate(()=>window.__petTest.x)<mb.x-45);
    assert.equal(await mobile.page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    assert.deepEqual(mobile.errors,[]);await mobile.context.close();
    const fallback=await setup(browser);await fallback.page.route('**/assets/morjia_unified_v3.png',r=>r.abort());
    await fallback.page.goto('http://127.0.0.1:8786/');await fallback.page.waitForFunction(()=>window.__petTest?.motionReady);
    assert.equal(await fallback.page.evaluate(()=>window.__petTest.unifiedReady),false);
    const fallbackStationary=await fallback.page.evaluate(()=>{
      const p=window.__petTest,x=p.x,y=p.y;
      for(let i=0;i<200;i++){p.chooseNext();if(['sleep','right','left'].includes(p.action)||p.x!==x||p.y!==y)return false;}return true;
    });
    assert.equal(fallbackStationary,true);assert.deepEqual(fallback.errors,[]);await fallback.context.close();
    console.log(JSON.stringify({...result,removedAssetsNotRequested:true,desktopClick:true,desktopDrag:true,mobileTap:true,mobileDrag:true,pages:6,adminDialog:true,fallbackStationary,errors:[]}));
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
