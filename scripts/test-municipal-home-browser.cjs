'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const http=require('node:http');
const {chromium}=require('playwright');
const home=require('../static/js/municipal-home.js');
const live=require('../static/js/municipal-home-live.js');
const hints=require('../static/js/municipal-hints.js');
const guide=require('../static/data/species-guide.json');
const daily=require('../static/data/species_days_historic.json');
const taxonomy=require('../static/data/municipal-taxonomy.json');
const root=path.resolve(__dirname,'../docs');
const data=JSON.parse(fs.readFileSync(path.join(root,'data/municipal-preview.json'),'utf8'));
const year=Number(data.source.toDay.slice(0,4)),expected=home.model(data,year);
const expectedHints=hints.rank(data,year,guide,daily,taxonomy,new Date()).candidates.map(c=>c.name);
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
 const browser=await chromium.launch({headless:true,channel:'chrome'});
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
   await page.waitForFunction(n=>document.querySelectorAll('#prediction-cards .prediction-species').length===n,expectedHints.length);
   assert.deepEqual(await page.locator('#prediction-cards .prediction-species').allTextContents(),expectedHints);
   assert.equal(await page.locator('#prediction-cards a, #prediction-cards button').count(),0);
   assert.equal(await page.evaluate(()=>document.querySelector('#recent-species').closest('section').nextElementSibling.id), 'prediction-section');
   const numbers=await page.locator('#trail-timeline .trail-species-number').allTextContents();
   assert.deepEqual(numbers.map(n=>Number(n.replace(/[^0-9]/g,''))),Array.from({length:expected.count},(_,i)=>expected.count-i));
   const dates=await page.locator('#trail-timeline time').evaluateAll(nodes=>nodes.map(n=>n.dateTime));
   assert(dates.every((d,i)=>!i||d<=dates[i-1]));
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true);
   await page.screenshot({path:path.join(output,'home-'+viewport.width+'.png'),fullPage:false});
   const compareButton=page.locator('#year-comparison-open');
   await page.waitForFunction(()=>!document.querySelector('#year-comparison-open').disabled);
   const previous=require('../static/js/municipal-preview-data.js').summarize(data,data.source.toDay).previous;
   assert((await compareButton.innerText()).includes(previous+' arter'));
   await compareButton.focus();await page.keyboard.press('Enter');
   await page.waitForFunction(()=>document.querySelector('#year-comparison-dialog').open&&!document.querySelector('#comparison-result').hidden);
   assert.equal(await page.locator('#comparison-current-count').innerText(),String(expected.count));
   assert.equal(await page.locator('#comparison-prior-count').innerText(),String(previous));
   assert.equal(await page.locator('#comparison-year').inputValue(),String(year-1));
   assert.equal(await page.evaluate(()=>{const d=document.querySelector('#year-comparison-dialog');return d.scrollWidth<=d.clientWidth+1&&d.contains(document.activeElement);}),true);
   assert.equal(await page.locator('#comparison-current-list .comparison-species').count(),require('../static/js/municipal-preview-data.js').summarize(data,data.source.toDay).newCutoff.length);
   await page.screenshot({path:path.join(output,'comparison-'+viewport.width+'.png'),fullPage:false});
   await page.locator('#comparison-year').selectOption('2024');
   await page.waitForFunction(()=>!document.querySelector('#comparison-retry').hidden);
   assert.equal(await page.locator('#comparison-result').isVisible(),false);
   assert.equal(await page.locator('#species-count').innerText(),String(expected.count));
   await page.locator('#comparison-year').selectOption(String(year-1));
   await page.waitForFunction(()=>!document.querySelector('#comparison-result').hidden);
   await page.keyboard.press('Escape');
   assert.equal(await page.locator('#year-comparison-dialog').isVisible(),false);
   assert.equal(await page.evaluate(()=>document.activeElement.id),'year-comparison-open');

   if(viewport.width<768)await page.locator('#mobile-menu-btn').click();
   await page.locator('.home-year-menu summary').click();
   await page.getByRole('link',{name:'Mitt fågelår 2026',exact:true}).click();
   await page.waitForFunction(n=>document.querySelector('#species-count')?.textContent===String(n),personalCount);
   assert.equal(await page.locator('.municipal-home-page').count(),0);
   await page.screenshot({path:path.join(output,'personal-'+viewport.width+'.png'),fullPage:false});
   await context.close();
  }


  // Deliberately ignore aborts in a delayed response to verify the request-id guard.
  const raceContext=await browser.newContext();
  await raceContext.addInitScript(()=>{
   const original=window.fetch.bind(window);
   window.fetch=(input,options)=>{
    const url=new URL(String(input),location.href),filter=url.searchParams.get('CQL_FILTER')||'';
    const slow=filter.includes("startDate >= '2023-12-31T23:00:00.000Z'");
    const fast=filter.includes("startDate >= '2022-12-31T23:00:00.000Z'");
    if(url.hostname==='sosgeo.artdata.slu.se'&&(slow||fast)){
     if(slow)window.comparisonSlowStarted=true;
     return new Promise(resolve=>setTimeout(()=>resolve(new Response(JSON.stringify({type:'FeatureCollection',numberMatched:0,numberReturned:0,features:[]}),{status:200,headers:{'Content-Type':'application/json'}})),slow?300:10));
    }
    return original(input,options);
   };
  });
  const racePage=await raceContext.newPage();
  await racePage.route('**/*goatcounter*',r=>r.abort());
  await racePage.route('https://sosgeo.artdata.slu.se/**',r=>r.abort());
  await racePage.goto(origin+'/',{waitUntil:'domcontentloaded'});
  await racePage.waitForFunction(()=>!document.querySelector('#year-comparison-open').disabled);
  await racePage.locator('#year-comparison-open').click();
  await racePage.locator('#comparison-year').selectOption('2024');
  await racePage.waitForFunction(()=>window.comparisonSlowStarted===true);
  await racePage.locator('#comparison-year').selectOption('2023');
  await racePage.waitForFunction(()=>document.querySelector('#comparison-result').dataset.year==='2023'&&!document.querySelector('#comparison-result').hidden);
  await racePage.waitForTimeout(1200);
  assert.equal(await racePage.locator('#comparison-result').getAttribute('data-year'),'2023');
  assert.equal(await racePage.locator('#comparison-year').inputValue(),'2023');
  assert.equal(await racePage.locator('#comparison-prior-count').innerText(),'0');
  assert.equal(await racePage.locator('#comparison-retry').isVisible(),false);
  await raceContext.close();
  const failureContext=await browser.newContext();
  const failurePage=await failureContext.newPage();
  failurePage.on('pageerror',e=>errors.push(e.message));
  await failurePage.route('**/*goatcounter*',r=>r.abort());
  await failurePage.route('https://sosgeo.artdata.slu.se/**',r=>r.abort());
  await failurePage.route('**/data/species-guide.json',r=>r.fulfill({status:503,body:'Unavailable'}));
  await failurePage.goto(origin+'/',{waitUntil:'domcontentloaded'});
  await failurePage.waitForFunction(()=>document.querySelector('#prediction-score')?.textContent.includes('kunde inte hämtas'));
  await failurePage.waitForFunction(()=>document.querySelector('#data-status')?.dataset.state==='stale');
  assert.equal(await failurePage.locator('#species-count').innerText(),String(expected.count));
  assert.equal(await failurePage.locator('#trail-timeline .trail-species').count(),expected.count);
  assert.equal(await failurePage.locator('#prediction-cards .prediction-species').count(),0);
  await failureContext.close();
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
  await page.waitForFunction(year=>{
   const cached=sessionStorage.getItem('astorp-home-'+year+'-v1');
   return document.querySelector('#data-status')?.dataset.state==='live'
    && !document.querySelector('#refresh-data').disabled
    && cached && JSON.parse(cached).source.mode==='live';
  },year,{timeout:120000});
  const browserSnapshot=await page.evaluate(year=>JSON.parse(sessionStorage.getItem('astorp-home-'+year+'-v1')),year);
  require('../static/js/municipal-preview-data.js').verify(browserSnapshot);
  assert(Date.parse(browserSnapshot.source.retrievedAt)>=Date.parse(data.source.retrievedAt));
  await page.locator('#year-comparison-open').click();
  await page.locator('#comparison-year').selectOption('2024');
  await page.waitForFunction(()=>!document.querySelector('#comparison-result').hidden&&document.querySelector('#comparison-result').dataset.year==='2024',null,{timeout:120000});
  const historicalCount=Number(await page.locator('#comparison-prior-count').innerText());
  assert(historicalCount>0,'Real 2024 comparison must load a verified nonempty year');

  await context.close();
  fs.writeFileSync(path.join(output,'result.json'),JSON.stringify({passed:true,year,species:expected.count,personalSpecies:personalCount,viewports:[1440,390],allSpeciesVisible:true,newestFirst:true,seasonalHints:expectedHints,hintsFailureIsolated:true,comparison:{previousYear:true,alternateYear:2024,historicalCount,staleResponsesIgnored:true,keyboardAndMobile:true},liveCors:response,browserRetrievedAt:browserSnapshot.source.retrievedAt,retrievedAt:data.source.retrievedAt},null,2));
  console.log('PASS municipal home: Hugo HTML, full newest-first list, mobile menu, personal archive, live WFS and CORS.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>server.close());
