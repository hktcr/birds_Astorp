'use strict';
const fs=require('node:fs'), vm=require('node:vm'), assert=require('node:assert/strict'), path=require('node:path');
const repository=path.resolve(__dirname,'..');
const root=path.join(repository,'docs');
function scripts(html){return [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(m=>m[1]);}
function node(){return {textContent:'',innerHTML:'',style:{},children:[],validity:{valid:true},addEventListener(type,fn){this.listeners??={};this.listeners[type]=fn},replaceChildren(){this.children=[]},appendChild(x){this.children.push(x)},setAttribute(){}};}
const home=fs.readFileSync(path.join(root,'index.html'),'utf8');
const personal=fs.readFileSync(path.join(root,'mitt-fagelar-2026/index.html'),'utf8');
const homeScript=scripts(home).find(s=>s.includes('portal-cutoff'));
const personalScript=scripts(personal).find(s=>s.includes('YEAR_GOAL'));
assert(homeScript&&personalScript);
const atlas=fs.readFileSync(path.join(root,'species/mindre-korsnäbb/index.html'),'utf8');
const artguide=fs.readFileSync(path.join(root,'artguide/index.html'),'utf8');
for (const html of [atlas,artguide]) {
 assert(html.includes('Historiska fyndplatser är inte anslutna'));
 assert(!/id=(?:"|')?(?:arshjul-modal-map-btn|show-map-btn)(?:[\s>"'])/.test(html));
 assert(!html.includes('src=/js/obs-explorer.js'));
}

const ranking=fs.readFileSync(path.join(root,'kommun/index.html'),'utf8');
for (const html of [home,personal,ranking]) {
 assert(/name=robots content="noindex, nofollow"/.test(html), 'Preview must not invite indexing');
 assert(html.includes("connect-src 'self'"), 'Preview must block external live API calls');
 assert(!html.includes('gc.zgo.at/count.js'), 'No analytics in development preview');
 assert(!html.includes('src=/js/obs-explorer.js'), 'Uncertified historic map explorer must stay quarantined');
 assert(html.includes('Separat utvecklingsversion'));
}
assert(ranking.includes('Inga personlistor, placeringar eller antal publiceras'));
assert(!scripts(ranking).some(script=>/fetch\(/.test(script)), 'Rankings remain a placeholder');
assert(home.includes('inte kommunstatistik'));
assert(home.includes('mot milstolpen 150'));
assert(!home.includes('speciesLinks='), 'Personal dashboard must live on its own route');
assert(personal.includes('personliga'));

const comparisonNodes={'portal-cutoff':node(),'portal-comparison-note':node()};comparisonNodes['portal-cutoff'].value='2026-10-25';
const periods=[node(),node(),node()];
const hctx={document:{getElementById:id=>comparisonNodes[id],querySelectorAll:()=>periods},console};
vm.runInNewContext(homeScript,hctx);
assert(periods.every(p=>p.textContent==='1 januari till 25 oktober'));
comparisonNodes['portal-cutoff'].value='2026-06-15';comparisonNodes['portal-cutoff'].listeners.change();
assert(periods.every(p=>p.textContent==='1 januari till 15 juni'));
comparisonNodes['portal-cutoff'].value='2027-06-15';comparisonNodes['portal-cutoff'].listeners.change();
assert(periods.every(p=>p.textContent==='Brytpunkt behöver väljas'));
comparisonNodes['portal-cutoff'].value='2026-02-31';comparisonNodes['portal-cutoff'].validity.valid=false;comparisonNodes['portal-cutoff'].listeners.change();
assert(comparisonNodes['portal-comparison-note'].textContent.includes('giltig'));
assert.equal((home.match(/class=portal-comparison-missing/g)||[]).length,3);
assert(home.includes('Underlag saknas'));
assert(!homeScript.includes('fetch('));
const ids=['species-count','personal-goal-note','progress-fill','latest-species','trail-timeline','prediction-data-status','prediction-cards','prediction-score'];
const nodes=Object.fromEntries(ids.map(id=>[id,node()]));
const guide=JSON.parse(fs.readFileSync(path.join(root,'data/species-guide.json'),'utf8'));
const calls=[];const ctx={document:{getElementById:id=>nodes[id],createElement:node},console:{error(){},warn(){}},fetch:url=>{calls.push(url);return Promise.resolve({json:()=>Promise.resolve(guide)})},localStorage:{getItem(){return null},setItem(){}}};
vm.createContext(ctx);vm.runInContext(personalScript,ctx);
setImmediate(()=>{
 try {
 const checklist=JSON.parse(fs.readFileSync(path.join(repository,'data/checklist-2026.json'),'utf8'));
 const expected=new Set(checklist.observations.map(o=>o.species)).size;
 assert.equal(Number(nodes['species-count'].textContent),expected);
 assert(ctx.data.observations.every(o=>Object.keys(o).sort().join(',')==='date,location,species'));
 assert(nodes['prediction-data-status'].textContent.includes('källkontrollerats'));
 assert.equal(nodes['prediction-cards'].children.length,0);
 assert.deepEqual(calls,['/data/species-guide.json']);
 assert.equal(ctx.escapePersonalHTML('<b>sentinel</b> "\''),'&lt;b&gt;sentinel&lt;/b&gt; &quot;&#39;');
 assert.equal(ctx.personalCalendarDate('2026-10-25').day,25);
 assert.equal(ctx.personalCalendarDate('2026-10-25').month,'oktober');
 assert.equal(ctx.personalCalendarDate('2026-02-29'),null);
 assert.equal(ctx.personalCalendarDate('2024-02-29').day,29);
 const original=ctx.data;ctx.data={observations:[{species:'<b>sentinel</b> "',date:'2026-10-25',location:'<b>sentinel</b> "'}]};ctx.initDashboard();
 assert(!nodes['latest-species'].innerHTML.includes('<b>sentinel</b>'));
 assert(nodes['latest-species'].innerHTML.includes('&lt;b&gt;sentinel&lt;/b&gt; &quot;'));
 assert(!nodes['trail-timeline'].innerHTML.includes('<b>sentinel</b>'));
 ctx.data=original;
 const missing=[];
 for(const html of [home,personal]) for(const m of html.matchAll(/(?:href|src)=(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g)){
 let url=m[1]??m[2]??m[3];if(!url.startsWith('/')||url.startsWith('//'))continue;
 url=url.split(/[?#]/)[0];if(!url)continue;
 let resolved=path.join(root,decodeURIComponent(url));if(fs.existsSync(resolved)&&fs.statSync(resolved).isDirectory())resolved=path.join(resolved,'index.html');
 if(!fs.existsSync(resolved))missing.push(url);
 }
 assert.deepEqual([...new Set(missing)],[],'Broken local built-page links/assets');
 const result={result:'PASS',scope:'Offline generated HTML, VM DOM stubs, no browser layout validation',personalCount:expected,tests:['comparison valid date','comparison alternate date','comparison invalid year','comparison invalid date','municipal statistics unknown','no homepage fetch','real personal count','personal coordinate allowlist','unverified source rejects suggestions','local-only fetch path','HTML label escaping','plain date validation','leap-date validation','renderer escaping','all local homepage/personal page links and assets exist']};
 console.log(JSON.stringify(result,null,2));
 }catch(e){console.error(e);process.exitCode=1;}
});
