'use strict';
const assert=require('node:assert/strict');
const annual=require('../static/js/municipal-annual.js');
const order=require('../static/data/municipal-taxonomic-order.json');
const taxonomy=require('../static/data/municipal-taxonomy.json');
const data=require('../static/data/municipal-preview.json');
const sourceCopy=JSON.stringify(data),rows=annual.firstRows(data,2026),copy=JSON.stringify(rows);
assert.equal(order.taxonomyVersion,taxonomy.version);
assert.equal(order.source.sequenceField,'avilist_seq');
assert.equal(order.source.rankFilter,'species');
assert.equal(order.speciesCount,11011);
assert(Object.keys(order.sequenceByScientificName).every(name=>Object.hasOwn(taxonomy.species,name)));
assert.equal(order.omittedScientificNames.length,161);
assert(data.records.every(row=>Object.hasOwn(order.sequenceByScientificName,row.scientificName)));
assert.equal(order.source.commit,'01264126448bd3d5d3bf69102abbfe98d9e3b489');
assert.equal(order.source.gitBlob,'a5f81a9cc324635297b67a88a2e32044879ea65d');
assert.equal(order.source.url,'https://raw.githubusercontent.com/alchaincyf/huashu-bird-sticker/'+order.source.commit+'/data/species.csv');
assert.equal(annual.orderIndex(order).size,11011);
const identity=row=>[row.scientificName,row.day,[...row.ids].sort()];
const normalized=list=>list.map(identity).sort((a,b)=>a[0].localeCompare(b[0]));
for(const mode of ['taxonomic','latest','first']){
 const sorted=annual.sortRows(rows,mode);
 assert.deepEqual(normalized(sorted),normalized(rows),'Preserve every species, date and all first-day source IDs');
 for(let i=1;i<sorted.length;i++){
  const a=sorted[i-1],b=sorted[i],ranks=order.sequenceByScientificName;
  if(mode==='taxonomic'||a.day===b.day)assert(ranks[a.scientificName]<ranks[b.scientificName],'Explicit AviList sequence governs taxonomic order and date ties');
  else assert(mode==='latest'?a.day>b.day:a.day<b.day,'First verified day governs chronology');
 }
 assert.deepEqual(annual.sortRows([...rows].reverse(),mode),sorted,'Input order must not affect taxonomic ties');
}
assert.equal(JSON.stringify(rows),copy);assert.equal(JSON.stringify(data),sourceCopy);
const fixtureOrder={schemaVersion:1,taxonomyVersion:'AviList v2026',source:{sequenceField:'avilist_seq',rankFilter:'species',sha256:'a'.repeat(64)},speciesCount:3,sequenceByScientificName:{'Taxon z':300,'Taxon a':100,'Taxon b':200}};
const fixtures=[
 {name:'Alfa',scientificName:'Taxon z',taxonId:1,day:'2026-02-01',ids:['z1','z2']},
 {name:'Zulu',scientificName:'Taxon a',taxonId:999,day:'2026-01-01',ids:['a1']},
 {name:'Beta',scientificName:'Taxon b',taxonId:4,day:'2026-02-01',ids:['b1','b2']}
];
const names=rows=>rows.map(r=>r.scientificName);
assert.deepEqual(names(annual.sortRows(fixtures,'taxonomic',fixtureOrder)),['Taxon a','Taxon b','Taxon z']);
assert.deepEqual(names(annual.sortRows(fixtures,'latest',fixtureOrder)),['Taxon b','Taxon z','Taxon a']);
assert.deepEqual(names(annual.sortRows(fixtures,'first',fixtureOrder)),['Taxon a','Taxon b','Taxon z']);
assert.throws(()=>annual.sortRows(fixtures,'alphabetical',fixtureOrder));
assert.throws(()=>annual.sortRows([{...fixtures[0],scientificName:'Unknown'}],'taxonomic',fixtureOrder));
assert.throws(()=>annual.sortRows([{...fixtures[0],day:'2026-02-30'}],'latest',fixtureOrder));
for(const changed of [
 {...fixtureOrder,taxonomyVersion:'AviList v2025'},
 {...fixtureOrder,speciesCount:4},
 {...fixtureOrder,sequenceByScientificName:{'Taxon a':1,'Taxon b':1,'Taxon z':2}},
 {...fixtureOrder,sequenceByScientificName:{'Taxon a':0,'Taxon b':1,'Taxon z':2}},
 {...fixtureOrder,sequenceByScientificName:{'Taxon a':1.1,'Taxon b':2,'Taxon z':3}},
 {...fixtureOrder,source:{...fixtureOrder.source,sequenceField:'taxonId'}}
])assert.throws(()=>annual.orderIndex(changed));
console.log('PASS annual sorting: pinned published sequence coverage, all three modes, stable date ties, all source IDs preserved, no input mutation or alphabetic/taxon-ID fallback.');
