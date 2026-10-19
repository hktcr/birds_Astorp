const assert=require('node:assert/strict');
const fs=require('node:fs');
const {fit,pack,shuffled}=require('../static/js/gallery-lighttable-core.js');
const records=Object.values(JSON.parse(fs.readFileSync('data/gallery_photos.json')));
const groups=[...Map.groupBy(records,r=>r.post)].map(([id,images])=>({id,images:images.map(p=>({...p,ratio:p.width/p.height}))}));
assert.equal(records.length,60);assert.equal(groups.length,44);assert.equal(new Set(records.map(r=>r.id)).size,60);
for(const r of records){assert.ok(r.caption&&r.date_source&&r.date_label&&r.display_title);}
const sizes=[[320,520],[390,520],[768,500],[1310,484],[1920,740]];
function checkGeometry(ratios,w,h){
 const tiles=fit(ratios,w,h,w<600?120:110,w<600?12:18);
 for(const [i,t] of tiles.entries()){
  assert.ok(t.x>=-0.001&&t.y>=-0.001&&t.x+t.width<=w+.001&&t.y+t.height+t.caption<=h+.001);
  assert.ok(Math.abs(t.width/t.height-ratios[i])<.00001);
  for(const u of tiles.slice(i+1))assert.ok(t.x+t.width<=u.x+.001||u.x+u.width<=t.x+.001||t.y+t.height+t.caption<=u.y+.001||u.y+u.height+u.caption<=t.y+.001);
 }
}
for(const [w,h] of sizes){
 const pages=pack(groups,w,h);assert.deepEqual(pages.flat().map(g=>g.id),groups.map(g=>g.id));
 assert.equal(new Set(pages.flat().map(g=>g.id)).size,groups.length);
 for(const page of pages)checkGeometry(page.flatMap(g=>g.images).map(p=>p.ratio),w,h);
 for(const count of [2,3,4,5])checkGeometry([.67,1.5,2.4,.75,1.33].slice(0,count),w,h);
}
let seed=17;const pick=n=>{seed=(seed*1664525+1013904223)>>>0;return seed%n;};
const counts=new Map(groups.map(g=>[g.id,0]));
for(let cycle=0;cycle<1000;cycle++)for(const page of pack(shuffled(groups,pick),390,520))for(const g of page)counts.set(g.id,counts.get(g.id)+1);
assert.ok([...counts.values()].every(n=>n===1000));
const archive=records.find(r=>r.id==='img-2a6f344e5d06');assert.equal(archive.sort_date,'2010-08-07');
assert.ok(records.filter(r=>['img-caa59dd4ff51','img-9c4002f91706','img-4dd7877848e4'].includes(r.id)).every(r=>r.sort_date==='2026-05'));
console.log('PASS: 60 records, 44 intact groups; 2/3/4/5-image geometry at 5 sizes; 1000 complete randomized cycles without size bias; date provenance and public display metadata.');
