'use strict';
const assert=require('node:assert/strict');
const comparison=require('../static/js/municipal-comparison.js');
const preview=require('../static/js/municipal-preview-data.js');
const live=require('../static/js/municipal-home-live.js');
const taxonomy=require('../static/data/municipal-taxonomy.json');
const fixture=require('../static/data/municipal-preview.json');
const clone=x=>JSON.parse(JSON.stringify(x));
const policy=fixture.source.taxonomyPolicy;
const row=(year,name,day,id=1,taxonId=id)=>({id:'urn:lsid:artportalen.se:sighting:'+id,taxonId,name,scientificName:name,rank:'species',day:year+'-'+day});
function historical(year,records){
 const range=comparison.bounds(year),n=records.length;
 return {schemaVersion:1,year,source:{complete:true,municipality:'Åstorp',taxonomyPolicy:policy,fromDay:year+'-01-01',toDay:year+'-12-31',retrievedAt:'2026-11-20T08:00:00Z',partition:{fromDay:year+'-01-01',toDay:year+'-12-31',countBefore:n,countAfter:n,fetchedCount:n,subpartitions:[{fromUtc:new Date(range.from).toISOString(),toUtc:new Date(range.to).toISOString(),countBefore:n,countAfter:n,fetchedCount:n}]}},records,manifest:{records:n,species:new Set(records.map(r=>r.scientificName)).size}};
}
const current=(day,records)=>({source:{complete:true,taxonomyPolicy:policy,toDay:day},records});
const checked=preview.verify(fixture);
const summary=comparison.compare(checked,comparison.embedded(checked,2025),2025);
const expected=preview.summarize(checked,checked.source.toDay);
assert.equal(summary.current.length,expected.current);
assert.equal(summary.previous.length,expected.previous);
assert.equal(summary.shared.length+summary.onlyCurrent.length,summary.current.length);
assert.equal(summary.shared.length+summary.onlyPrevious.length,summary.previous.length);
for(const [year,from,to] of [[1941,'1940-12-31T22:00:00.000Z','1941-12-31T22:00:00.000Z'],[1942,'1941-12-31T22:00:00.000Z','1942-12-31T23:00:00.000Z']]){
 const range=comparison.bounds(year);
 assert.equal(new Date(range.from).toISOString(),from);assert.equal(new Date(range.to).toISOString(),to);
 assert.equal(live.stockholmDay(range.from-1),(year-1)+'-12-31');assert.equal(live.stockholmDay(range.from),year+'-01-01');
 assert.equal(live.stockholmDay(range.to-1),year+'-12-31');assert.equal(live.stockholmDay(range.to),(year+1)+'-01-01');
 const valid=historical(year,[row(year,'A','01-01')]);comparison.verifyYear(valid,year);
 for(const delta of [-3600000,3600000]){
  const broken=clone(valid);broken.source.partition.subpartitions[0].fromUtc=new Date(range.from+delta).toISOString();
  assert.throws(()=>comparison.verifyYear(broken,year));
 }
}
let m=comparison.compare(current('2024-02-29',[]),historical(2023,[row(2023,'A','02-28'),row(2023,'B','03-01',2)]),2023);
assert.equal(m.priorDay,'2023-02-28');assert.deepEqual(m.previous.map(r=>r.name),['A']);
const leap=historical(2024,[row(2024,'A','02-28'),row(2024,'B','02-29',2),row(2024,'C','03-01',3)]);
assert.equal(comparison.compare(current('2026-02-28',[]),leap,2024).previous.length,1);
assert.equal(comparison.compare(current('2026-03-01',[]),leap,2024).previous.length,3);
m=comparison.compare(current('2026-11-20',[row(2026,'Same species','01-02',10,111)]),historical(2024,[row(2024,'Same species','01-03',20,222)]),2024);
assert.equal(m.shared.length,1);assert.equal(m.onlyCurrent.length,0);assert.equal(m.onlyPrevious.length,0);
m=comparison.compare(current('2026-11-20',[]),historical(2024,[]),2024);assert.equal(m.previous.length,0);assert.equal(m.difference,0);
const valid=historical(2024,[row(2024,'A','01-01')]);
for(const change of [
 x=>{x.source.complete=false;},
 x=>{x.source.taxonomyPolicy='different';},
 x=>{x.source.partition.countBefore=2;},
 x=>{x.source.partition.subpartitions[0].countAfter=2;},
 x=>{x.source.partition.subpartitions[0].fetchedCount=-1;},
 x=>{x.source.partition.subpartitions[0].fetchedCount=1.5;},
 x=>{x.source.partition.subpartitions[0].toUtc='2024-12-30T23:00:00.000Z';},
 x=>{x.manifest.species=2;},
 x=>{x.records.push({...x.records[0]});x.manifest.records=2;},
 x=>{x.records[0].day='2025-01-01';}
]){
 const broken=clone(valid);change(broken);assert.throws(()=>comparison.verifyYear(broken,2024));
}
const gap=clone(valid),range=comparison.bounds(2024),mid=Math.floor((range.from+range.to)/2);
gap.source.partition.subpartitions=[{fromUtc:new Date(range.from).toISOString(),toUtc:new Date(mid).toISOString(),countBefore:1,countAfter:1,fetchedCount:1},{fromUtc:new Date(mid+1).toISOString(),toUtc:new Date(range.to).toISOString(),countBefore:0,countAfter:0,fetchedCount:0}];
assert.throws(()=>comparison.verifyYear(gap,2024));
gap.source.partition.subpartitions[1].fromUtc=new Date(mid-1).toISOString();assert.throws(()=>comparison.verifyYear(gap,2024));
assert.throws(()=>comparison.compare(current('2026-11-20',[]),historical(2026,[]),2026));
assert.equal(comparison.curve([row(2024,'A','03-01')],'2026-03-01',20),'M0 180 H600.00 V171.00 H600');
(async()=>{
 const feature={type:'Feature',properties:{occurrenceId:'urn:lsid:artportalen.se:sighting:100',dataProviderId:1,municipality:'Åstorp',organismGroup:'Fåglar',isPresentObservation:true,isUncertainIdentification:false,isNaturalOccurrence:true,startDate:'1940-12-31T22:30:00Z',dyntaxaTaxonId:100100,taxonCategory:'Art',scientificName:'Turdus merula',vernacularName:'koltrast'}};
 let calls=0;
 const fetcher=async url=>{
  calls++;assert(new URL(url).searchParams.get('CQL_FILTER').includes("startDate >= '1940-12-31T22:00:00.000Z'"));
  return {ok:true,json:async()=>({type:'FeatureCollection',numberMatched:1,numberReturned:1,features:[feature]})};
 };
 const loaded=await comparison.loadYear(fetcher,1941,{taxonomy,now:new Date('2026-11-20T10:00:00Z')});
 assert.equal(calls,3);assert.equal(loaded.records[0].day,'1941-01-01');
 const empty=await comparison.loadYear(async()=>({ok:true,json:async()=>({type:'FeatureCollection',numberMatched:0,numberReturned:0,features:[]})}),2024,{taxonomy});
 assert.equal(empty.records.length,0);comparison.verifyYear(empty,2024);
 await assert.rejects(()=>comparison.loadYear(async()=>({ok:false,status:503}),2024,{taxonomy}),/HTTP 503/);
 await assert.rejects(()=>comparison.loadYear(async()=>({ok:true,json:async()=>({type:'FeatureCollection',numberMatched:2,numberReturned:1,features:[feature]})}),1941,{taxonomy}));
 await assert.rejects(()=>comparison.loadYear(fetcher,2026,{taxonomy,now:new Date('2026-11-20T10:00:00Z')}));
 console.log('PASS municipal comparison: same-date counts, scientific identity, leap days, historical Stockholm boundaries, complete receipts, empty years and failed requests.');
})().catch(error=>{console.error(error);process.exitCode=1;});
