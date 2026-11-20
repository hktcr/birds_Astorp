'use strict';
const assert=require('node:assert/strict');
const annual=require('../static/js/municipal-annual.js');
const live=require('../static/js/municipal-home-live.js');
const taxonomy={version:'AviList v2026',species:{'Erithacus rubecula':{},'Fringilla coelebs':{}},canonicalSourceIds:{'Erithacus rubecula':1001,'Fringilla coelebs':1002},verifiedAliases:{'Testalias rubecula':'Erithacus rubecula'},verifiedSourceParents:{}};
const id=n=>'urn:lsid:artportalen.se:sighting:'+n;
const feature=(n,props={})=>({type:'Feature',properties:{occurrenceId:id(n),dataProviderId:1,municipality:'Åstorp',organismGroup:'Fåglar',isPresentObservation:true,isUncertainIdentification:false,isNaturalOccurrence:true,startDate:'2026-01-02T00:00:00+01:00',scientificName:'Erithacus rubecula',dyntaxaTaxonId:1001,taxonCategory:'Art',vernacularName:'Rödhake',recordedBy:'Testobservatör A',reportedBy:'Annan testrapportör',...props}});
const fixtures=[feature(1),feature(2,{startDate:'2026-01-02T18:00:00+01:00',recordedBy:'Via Testrapportör B'}),feature(3,{startDate:'2026-01-03T12:00:00+01:00',scientificName:'Fringilla coelebs',dyntaxaTaxonId:1002,vernacularName:'Bofink',recordedBy:null})];
const records=live.aggregate(fixtures,taxonomy).records;
const payload=features=>({type:'FeatureCollection',numberMatched:features.length,numberReturned:features.length,features});
const response=data=>async()=>({ok:true,json:async()=>data});
(async()=>{
 const signal=new AbortController().signal;
 const result=await annual.fetchObserverBatch(async(url,options)=>{
  const query=new URL(url).searchParams;
  assert(query.get('propertyName').split(',').includes('recordedBy'));
  assert(!query.get('propertyName').split(',').includes('reportedBy'));
  assert.equal(options.signal,signal);
  assert.equal(query.get('maxFeatures'),'4');
  return {ok:true,json:async()=>payload([...fixtures].reverse())};
 },records,taxonomy,{signal});
 const byId=new Map(result.map(r=>[r.id,r]));
 assert.equal(byId.get(id(2)).recordedBy,'Via Testrapportör B');
 assert.equal(byId.get(id(3)).recordedBy,null);
 const timezone=structuredClone(fixtures);timezone[0].properties.startDate='2026-01-01T23:30:00Z';
 await annual.fetchObserverBatch(response(payload(timezone)),records,taxonomy);
 const alias=structuredClone(fixtures);alias[0].properties.scientificName='Testalias rubecula';
 await annual.fetchObserverBatch(response(payload(alias)),records,taxonomy);
 for(const change of [
  {startDate:'2026-01-04T00:00:00+01:00'},
  {scientificName:'Fringilla coelebs',dyntaxaTaxonId:1002},
  {taxonCategory:'Släkte'},{dataProviderId:2},{municipality:'Bjuv'},{organismGroup:'Däggdjur'},
  {isPresentObservation:false},{isUncertainIdentification:true},{isNaturalOccurrence:false},
  {isPresentObservation:'true'},{startDate:'2026-01-02T00:00:00'},
  {recordedBy:{}},{recordedBy:'x'.repeat(2001)}
 ]){
  const altered=structuredClone(fixtures);Object.assign(altered[0].properties,change);
  await assert.rejects(()=>annual.fetchObserverBatch(response(payload(altered)),records,taxonomy),JSON.stringify(change).slice(0,80));
 }
 for(const invalid of [payload(fixtures.slice(1)),{...payload(fixtures),numberReturned:2},payload([fixtures[0],fixtures[0],fixtures[2]]),payload([feature(9),fixtures[1],fixtures[2]])]){
  await assert.rejects(()=>annual.fetchObserverBatch(response(invalid),records,taxonomy));
 }
 await assert.rejects(()=>annual.fetchObserverBatch(async()=>({ok:false,status:503}),records,taxonomy));
 await assert.rejects(()=>annual.fetchObserverBatch(async()=>{throw Error('Network');},records,taxonomy));
 const noFetch=async()=>{assert.fail('Invalid input must not fetch');};
 await assert.rejects(()=>annual.fetchObserverBatch(noFetch,[records[0],records[0]],taxonomy));
 await assert.rejects(()=>annual.fetchObserverBatch(noFetch,Array(51).fill(records[0]),taxonomy));
 const groups=annual.observerGroups({ids:[id(1),id(2),id(3),id(4),id(5)]},byId,new Set([id(4)]));
 assert.deepEqual(new Set(groups.flatMap(g=>g.ids)),new Set([1,2,3,4,5].map(id)));
 assert(groups.some(g=>g.label==='Via Testrapportör B'));
 assert(groups.some(g=>g.state==='missing'&&g.label==='Observatör inte angiven'));
 assert(groups.some(g=>g.state==='error'&&g.label.includes('kunde inte hämtas')));
 assert(groups.some(g=>g.state==='loading'));
 byId.set(id(2),{recordedBy:'Testobservatör A'});
 assert.equal(annual.observerGroups({ids:[id(1),id(2)]},byId,new Set())[0].ids.length,2);
 console.log('PASS municipal annual: first-day observers, all source IDs, verified source identity, Via, missing vs failed, aliases and Stockholm dates.');
})().catch(e=>{console.error(e);process.exitCode=1;});
