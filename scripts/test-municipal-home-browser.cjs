'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const http=require('node:http');
const {chromium}=require('playwright');
const home=require('../static/js/municipal-home.js');
const live=require('../static/js/municipal-home-live.js');
const root=path.resolve(__dirname,'../docs');
const data=JSON.parse(fs.readFileSync(path.join(root,'data/municipal-preview.json'),'utf8'));
const year=Number(data.source.toDay.slice(0,4)),expected=home.model(data,year);
const personal=JSON.parse(fs.readFileSync(path.resolve(__dirname,'../data/checklist-2026.json'),'utf8'));
const personalCount=new Set(personal.observations.map(r=>r.species)).size;
const output=path.resolve(__dirname,'../test-results/municipal-home');
fs.mkdirSync(output,{recursive:true});
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.svg':'image/svg+xml','.ico':'image/x-icon','.webp':'image/webp'};
const server=http.createServer((req,res)=>{
 try{
  let file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));
  if(file!==root&&!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
  if(fs.existsSync(file)&&fs.statSync(file).isDirectory())file=path.join(file,'index.html');
  if(!fs.existsSync(file)){res.writeHead(404).end();return;}
  res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');
  fs.createReadStream(file).pipe(res);
 }catch(_){res.writeHead(400).end();}
});
(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const origin='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({headless:true});
 const errors=[];
 try{
  for(const viewport of [{width:1440,height:1000},{width:390,height:844}]){
   const context=await browser.newContext({viewport});
   const page=await context.newPage();
   page.on('pageerror',e=>errors.push(e.message));
   await page.route('**/*goatcounter*',r=>r.abort());
   await page.route('https://sosgeo.artdata.slu.se/**',r=>r.abort());
   await page.goto(origin+'/',{waitUntil:'domcontentloaded'});
   await page.waitForFunction(()=>document.querySelector('#data-status')?.dataset.state==='stale');
   assert.equal(await page.locator('#species-count').innerText(),String(expected.count));
   assert.equal(await page.locator('#trail-timeline .trail-species').count(),expected.count);
   assert.equal(await page.locator('#more-days').count(),0);
   const numbers=await page.locator('#trail-timeline .trail-species-number').allTextContents();
   assert.deepEqual(numbers.map(n=>Number(n.replace(/[^0-9]/g,''))),Array.from({length:expected.count},(_,i)=>expected.count-i));
   const dates=await page.locator('#trail-timeline time').evaluateAll(nodes=>nodes.map(n=>n.dateTime));
   assert(dates.every((d,i)=>!i||d<=dates[i-1]));
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true);
   await page.screenshot({path:path.join(output,'home-'+viewport.width+'.png'),fullPage:false});
   if(viewport.width<768)await page.locator('#mobile-menu-btn').click();
   await page.locator('.home-year-menu summary').click();
   await page.getByRole('link',{name:'Mitt fågelår 2026',exact:true}).click();
   await page.waitForFunction(n=>document.querySelector('#species-count')?.textContent===String(n),personalCount);
   assert.equal(await page.locator('.municipal-home-page').count(),0);
   await page.screenshot({path:path.join(output,'personal-'+viewport.width+'.png'),fullPage:false});
   await context.close();
  }
  assert.deepEqual(errors,[],'JavaScript page errors');
  const context=await browser.newContext();
  const page=await context.newPage();
  await page.route('**/*goatcounter*',r=>r.abort());
  // A real in-browser cross-origin request verifies WFS reachability and CORS.
  await page.goto(origin+'/',{waitUntil:'domcontentloaded'});
  const query=live.query(Date.parse(year+'-01-01T00:00:00+01:00'),Date.now(),1);
  const response=await page.evaluate(async url=>{
   const r=await fetch(url,{cache:'no-store',signal:AbortSignal.timeout(90000)});
   if(!r.ok)throw Error('WFS HTTP '+r.status);
   const d=await r.json();
   return {type:d.type,numberMatched:d.numberMatched,numberReturned:d.numberReturned};
  },query);
  assert.equal(response.type,'FeatureCollection');
  assert(Number.isSafeInteger(response.numberMatched));
  assert(response.numberMatched>0);
  await page.waitForFunction(()=>document.querySelector('#data-status')?.dataset.state==='live',{},{timeout:120000});
  await context.close();
  fs.writeFileSync(path.join(output,'result.json'),JSON.stringify({passed:true,year,species:expected.count,personalSpecies:personalCount,viewports:[1440,390],allSpeciesVisible:true,newestFirst:true,liveCors:response,retrievedAt:data.source.retrievedAt},null,2));
  console.log('PASS municipal home: Hugo HTML, full newest-first list, mobile menu, personal archive, live WFS and CORS.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>server.close());
