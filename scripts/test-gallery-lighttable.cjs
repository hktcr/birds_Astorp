const assert=require('node:assert/strict'),fs=require('node:fs');
const core=require('../static/js/gallery-lighttable-core.js');
const records=Object.values(JSON.parse(fs.readFileSync('data/gallery_photos.json')));
const groups=[...Map.groupBy(records,r=>r.post)].map(([id,images])=>({id,images:images.map(p=>({...p,ratio:p.width/p.height}))}));
assert.equal(records.length,61);assert.equal(groups.length,45);assert.equal(new Set(records.map(r=>r.id)).size,61);
for(const r of records)assert.ok(r.caption&&r.date_source&&r.date_label&&r.display_title);
let seed=17;const pick=n=>{seed=(seed*1664525+1013904223)>>>0;return seed%n;};
const sizes=[[284,558],[354,620],[532,368],[808,220],[620,398],[909,600],[1324,566],[1792,780]];
function disjoint(a,b){return a.x+a.width<=b.x+.01||b.x+b.width<=a.x+.01||a.y+a.height<=b.y+.01||b.y+b.height<=a.y+.01;}
for(const [w,h] of sizes){
 const plan=core.layout(groups,w,h),target=groups.find(g=>g.images.length===5);
 const board=core.initialBoard(groups,plan.count,target.id,pick);
 assert.ok(board.some(g=>g.id===target.id),'Largest complete group must enter the board');
 assert.ok(board.flatMap(g=>g.images).length>=plan.count);
 const tiles=core.boardGeometry(board,plan.cols,w,h,plan.gap,plan.pad);
 assert.equal(tiles.length,board.length);if(h>400)assert.ok(board.flatMap(g=>g.images).length>6,'Dense table must not revert to the old 3/6-image cap');
 for(const [i,t] of tiles.entries()){
  assert.ok(t.x>=-.01&&t.y>=-.01&&t.x+t.width<=w+.01&&t.y+t.height<=h+.01);
  const group=board.find(g=>g.id===t.id);assert.equal(t.members.length,group.images.length);
  t.members.forEach((m,j)=>assert.ok(Math.abs(m.width/m.height-group.images[j].ratio)<.00001));
  for(const u of tiles.slice(i+1))assert.ok(disjoint(t,u),'Board units must not overlap');
 }
 for(const count of [1,2,3,4,5]){
  const ratios=[.67,1.5,2.4,.75,1.33].slice(0,count),caption=w<600?88:100;
  const fit=core.fit(ratios,w,h,caption,w<600?12:18);
  assert.equal(fit.length,count);
  assert.ok(fit.every(t=>t.height>=40),"Photos must remain meaningful at short landscape breakpoints");
  for(const [i,t] of fit.entries()){
   assert.ok(t.x>=-.01&&t.y>=-.01&&t.x+t.width<=w+.01&&t.y+t.height+t.caption<=h+.01);
   assert.ok(Math.abs(t.imageWidth/t.height-ratios[i])<.00001);
   for(const u of fit.slice(i+1))assert.ok(disjoint({...t,height:t.height+t.caption},{...u,height:u.height+u.caption}));
  }
 }
}
const deck=core.createDeck(groups.map(g=>g.id),pick),counts=new Map(groups.map(g=>[g.id,0]));
let previous=null,board=core.initialBoard(groups,25,groups[0].id,pick);
for(let cycle=0;cycle<1000;cycle++){
 const cycleIds=new Set();
 for(let i=0;i<groups.length;i++){
  const id=deck.next();assert.notEqual(id,previous);assert.ok(!cycleIds.has(id));cycleIds.add(id);
  const changes=core.replacementPlan(board,groups,id,new Set(),pick,25);
  const slots=new Set();
  for(const change of changes){assert.ok(!slots.has(change.slot));slots.add(change.slot);board[change.slot]=change.to;assert.equal(new Set(board.map(g=>g.id)).size,board.length,'Every intermediate swap keeps unique whole groups');}
  assert.ok(Math.abs(board.reduce((n,g)=>n+g.images.length,0)-25)<=4,'Thumbnail density must not drift over repeated cycles');
  assert.ok(board.some(g=>g.id===id),'The next large group must remain present after all replacements');
  for(const g of board)assert.deepEqual(g.images.map(p=>p.id),groups.find(x=>x.id===g.id).images.map(p=>p.id));
  counts.set(id,counts.get(id)+1);deck.complete(id);previous=id;
 }
 assert.equal(cycleIds.size,groups.length);
}
assert.ok([...counts.values()].every(n=>n===1000),'Every group, including 5 images, gets one large view per cycle');
const archive=records.find(r=>r.id==='img-2a6f344e5d06');assert.equal(archive.sort_date,'2010-08-07');assert.equal(archive.map_position_unknown,true);
assert.ok(records.filter(r=>['img-caa59dd4ff51','img-9c4002f91706','img-4dd7877848e4'].includes(r.id)).every(r=>r.sort_date==='2026-05'));
console.log('PASS: 61 verified records / 45 whole groups; dense board and 1–5-image large views at eight sizes; 1000 complete large-view cycles; every sequential swap preserves complete unique groups and its zoom target; provenance unchanged.');
