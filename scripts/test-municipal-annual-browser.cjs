'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const http=require('node:http');
const {chromium}=require('playwright');
const annual=require('../static/js/municipal-annual.js');
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

const records=annual.firstRows(data,year).flatMap(row=>row.ids).map(id=>data.records.find(r=>r.id===id));
const mockFeature=(r,recordedBy)=>({type:'Feature',properties:{occurrenceId:r.id,dataProviderId:1,municipality:'Åstorp',organismGroup:'Fåglar',isPresentObservation:true,isUncertainIdentification:false,isNaturalOccurrence:true,startDate:r.day+'T12:00:00+01:00',scientificName:r.scientificName,dyntaxaTaxonId:r.taxonId,taxonCategory:'Art',vernacularName:r.name,recordedBy}});
const payload=features=>({type:'FeatureCollection',numberMatched:features.length,numberReturned:features.length,features});
(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const origin='http://127.0.0.1:'+server.address().port,browser=await chromium.launch({headless:true,channel:'chrome'}),errors=[];
 try{
  for(const width of [1440,390]){
   const context=await browser.newContext({viewport:{width,height:900}}),page=await context.newPage();
   page.on('pageerror',e=>errors.push(e.message));
   await page.route('**/*goatcounter*',r=>r.abort());
   let failBatch=true;
   await page.route('https://sosgeo.artdata.slu.se/**',route=>{
    const query=new URL(route.request().url()).searchParams;
    if(!query.get('propertyName')?.split(',').includes('recordedBy'))return route.abort();
    assert(!query.get('propertyName').split(',').includes('reportedBy'));
    const ids=query.get('CQL_FILTER').match(/urn:lsid:artportalen\.se:sighting:\d+/g);
    if(failBatch){failBatch=false;return route.fulfill({status:503,body:'Unavailable'});}
    const features=ids.map(id=>{const i=records.findIndex(r=>r.id===id);return mockFeature(records[i],i%7===0?null:i%3===0?'Via Testförmedlare':'Testobservatör A, Testobservatör B');});
    return route.fulfill({json:payload(features.reverse())});
   });
   await page.goto(origin+'/arslista/',{waitUntil:'domcontentloaded'});
   await page.waitForFunction(()=>document.querySelector('#annual-name-status')?.textContent.includes('kunde inte hämtas'));
   assert.equal(await page.locator('#annual-total').innerText(),String(expected.count));
   assert.equal(await page.locator('.annual-row').count(),expected.count);
   assert.equal(await page.locator('.annual-source-link').count(),records.length);
   assert(await page.locator('[data-state="error"]').count()>0);
   await page.locator('#annual-observer-retry').click();
   await page.waitForFunction(()=>document.querySelector('#annual-name-status')?.textContent===''&&document.querySelectorAll('[data-state="known"]').length>0);
   assert.equal(await page.locator('[data-state="error"],[data-state="loading"]').count(),0);
   assert(await page.locator('[data-state="missing"]').count()>0);
   assert((await page.locator('.annual-observer-name').allTextContents()).includes('Via Testförmedlare'));
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true);
   await page.screenshot({path:path.join(output,'annual-'+width+'.png'),fullPage:false});
   await page.locator('#annual-sort').selectOption('latest');
   const dates=await page.locator('.annual-first time').evaluateAll(nodes=>nodes.map(n=>n.dateTime));
   assert(dates.every((d,i)=>!i||d<=dates[i-1]));
   await page.locator('#annual-sort').selectOption('first');
   const firstDates=await page.locator('.annual-first time').evaluateAll(nodes=>nodes.map(n=>n.dateTime));
   assert(firstDates.every((d,i)=>!i||d>=firstDates[i-1]));
   const species=annual.firstRows(data,year)[0];
   await page.locator('#annual-search').fill(species.scientificName);
   assert.equal(await page.locator('.annual-row').count(),1);
   assert.equal(await page.locator('.annual-species-name').innerText(),species.name);
   await page.locator('#annual-search').fill('xyz-no-species-xyz');
   assert.equal(await page.locator('.annual-row').count(),0);
   assert.equal(await page.locator('#annual-total').innerText(),String(expected.count));
   await page.locator('#annual-search').fill('');
   if(width<768)await page.locator('#mobile-menu-btn').click();
   await page.locator('.home-year-menu summary').click();
   const menu=await page.locator('.home-year-menu a').allTextContents();
   assert(menu.includes('Kommunens årslista'));assert(menu.includes('Håkans årslista'));assert(menu.includes('Håkans krysskarta'));
   assert(!menu.some(t=>/^Min |^Mitt /.test(t)));
   await page.getByRole('link',{name:'Håkans årslista',exact:true}).click();
   await page.waitForFunction(n=>document.querySelector('#total-species')?.textContent.startsWith(n+'/'),personalCount);
   assert.equal(await page.locator('h1').innerText(),'Håkans årslista 2026');
   assert.equal(await page.locator('#municipal-annual').count(),0);
   await page.goto(origin+'/karta/',{waitUntil:'domcontentloaded'});
   assert.equal(await page.locator('h1').innerText(),'Håkans krysskarta');
   await context.close();
  }
  // A late observer response must not overwrite a newer refresh, even if abort is ignored.
  const race=await browser.newContext();
  await race.addInitScript(({features,snapshot})=>{
   const original=window.fetch.bind(window),calls=new Map();
   window.annualObserverPending=0;
   window.annualSnapshot=snapshot;
   window.fetch=(input,options)=>{
    const url=new URL(String(input),location.href);
    if(url.hostname==='sosgeo.artdata.slu.se'&&url.searchParams.get('propertyName')?.split(',').includes('recordedBy')){
     const ids=url.searchParams.get('CQL_FILTER').match(/urn:lsid:artportalen\.se:sighting:\d+/g),key=ids.join(','),n=(calls.get(key)||0)+1;calls.set(key,n);window.annualObserverPending++;
     const rows=ids.map(id=>{const f=structuredClone(features.find(f=>f.properties.occurrenceId===id));f.properties.recordedBy=n===1?'Äldre testuppgift':'Aktuell testuppgift';return f;});
     return new Promise(resolve=>setTimeout(()=>resolve(new Response(JSON.stringify({type:'FeatureCollection',numberMatched:rows.length,numberReturned:rows.length,features:rows}),{status:200,headers:{'Content-Type':'application/json'}})),n===1?1500:10));
    }
    return original(input,options);
   };
  },{features:records.map(r=>mockFeature(r,'Test')),snapshot:data});
  const rp=await race.newPage();rp.on('pageerror',e=>errors.push(e.message));
  await rp.route('**/*goatcounter*',r=>r.abort());await rp.route('https://sosgeo.artdata.slu.se/**',r=>r.abort());
  await rp.goto(origin+'/arslista/',{waitUntil:'domcontentloaded'});
  await rp.waitForFunction(n=>window.annualObserverPending>=n&&!document.querySelector('#annual-refresh').disabled,Math.ceil(records.length/50));
  await rp.evaluate(()=>{window.MunicipalLive.load=async()=>window.annualSnapshot;});
  await rp.locator('#annual-refresh').click();
  await rp.waitForFunction(()=>[...document.querySelectorAll('.annual-observer-name')].every(n=>n.textContent==='Aktuell testuppgift'));
  await rp.waitForTimeout(1800);
  assert((await rp.locator('.annual-observer-name').allTextContents()).every(t=>t==='Aktuell testuppgift'));
  await race.close();

  // A slow initial snapshot must never replace a successful manual live refresh.
  const startup=await browser.newContext();
  await startup.addInitScript(({snapshot,features})=>{
   window.annualSnapshot=snapshot;window.annualLoadCalls=0;
   const original=window.fetch.bind(window);
   window.fetch=(input,options)=>{
    const url=new URL(String(input),location.href);
    if(url.pathname.endsWith('/data/municipal-preview.json')){
     window.annualSnapshotPending=true;
     return new Promise(resolve=>setTimeout(()=>resolve(new Response(JSON.stringify(snapshot),{status:200})),1500));
    }
    if(url.hostname==='sosgeo.artdata.slu.se'&&url.searchParams.get('propertyName')?.split(',').includes('recordedBy')){
     const ids=url.searchParams.get('CQL_FILTER').match(/urn:lsid:artportalen\.se:sighting:\d+/g),rows=features.filter(f=>ids.includes(f.properties.occurrenceId));
     return Promise.resolve(new Response(JSON.stringify({type:'FeatureCollection',numberMatched:rows.length,numberReturned:rows.length,features:rows}),{status:200}));
    }
    return original(input,options);
   };
  },{snapshot:data,features:records.map(r=>mockFeature(r,'Testobservatör'))});
  const sp=await startup.newPage();sp.on('pageerror',e=>errors.push(e.message));
  await sp.route('**/*goatcounter*',r=>r.abort());await sp.route('https://sosgeo.artdata.slu.se/**',r=>r.abort());
  await sp.goto(origin+'/arslista/',{waitUntil:'domcontentloaded'});
  await sp.waitForFunction(()=>window.annualSnapshotPending&&window.MunicipalLive);
  const freshStamp=await sp.evaluate(()=>{
   const fresh=structuredClone(window.annualSnapshot);fresh.source.retrievedAt=new Date().toISOString();fresh.source.mode='live';
   window.MunicipalLive.load=async()=>{if(++window.annualLoadCalls>1)throw Error('Later refresh failed');return fresh;};
   return new Intl.DateTimeFormat('sv-SE',{dateStyle:'short',timeStyle:'short',timeZone:'Europe/Stockholm'}).format(new Date(fresh.source.retrievedAt));
  });
  await sp.locator('#annual-refresh').click();
  await sp.waitForFunction(()=>sessionStorage.getItem('astorp-home-2026-v1')&&!document.querySelector('#annual-refresh').disabled);
  await sp.waitForTimeout(1800);
  assert((await sp.locator('#annual-data-status').textContent()).includes(freshStamp),'Fresh source must survive the delayed initial snapshot: '+JSON.stringify({expected:freshStamp,actual:await sp.locator('#annual-data-status').textContent(),calls:await sp.evaluate(()=>window.annualLoadCalls)}));
  assert.equal(await sp.evaluate(()=>window.annualLoadCalls),1,'Do not re-fetch after a fresh manual result');
  await sp.locator('#annual-refresh').click();
  await sp.waitForFunction(()=>!document.querySelector('#annual-refresh').disabled&&document.querySelector('#annual-data-status').textContent.includes('Later refresh failed'));
  assert((await sp.locator('#annual-data-status').textContent()).includes(freshStamp),'A later failure must retain the successful refresh');
  assert.equal(await sp.locator('#annual-total').innerText(),String(expected.count));
  await startup.close();

  const context=await browser.newContext(),page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*goatcounter*',r=>r.abort());
  await page.goto(origin+'/arslista/',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>sessionStorage.getItem('astorp-home-2026-v1')&&!document.querySelector('#annual-refresh').disabled&&document.querySelector('#annual-name-status').textContent===''&&document.querySelectorAll('[data-state="known"]').length>0,null,{timeout:150000});
  assert.equal(await page.locator('[data-state="error"],[data-state="loading"]').count(),0);
  const actualCount=Number(await page.locator('#annual-total').innerText()),namedGroups=await page.locator('[data-state="known"]').count();
  assert(actualCount>=expected.count);
  assert(namedGroups>0);
  await context.close();
  assert.deepEqual(errors,[]);
  fs.writeFileSync(path.join(output,'annual-result.json'),JSON.stringify({passed:true,species:actualCount,personalSpecies:personalCount,firstDaySources:records.length,namedGroups,viewports:[1440,390],verifiedLiveObservers:true,searchAndSort:true,partialFailureAndRetry:true,staleResponsesIgnored:true,startupSnapshotRace:true},null,2));
  console.log('PASS municipal annual: desktop/mobile, complete list, live verified observers, source links, search, sorting, partial failure/retry, race and personal pages.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>server.close());
