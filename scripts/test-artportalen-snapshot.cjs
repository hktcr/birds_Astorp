const assert = require('node:assert/strict');
const snapshot = require('../static/js/artportalen-snapshot.js');
const now = '2026-10-25T12:00:00Z';
function fixture() {
    return {schemaVersion:1, source:{dataProviderId:1,municipalityId:'1277',complete:true,sensitiveObservations:false,
        fromDay:'2026-01-01',toDay:'2026-10-25',retrievedAt:'2026-10-25T11:00:00Z',recordCount:2,
        query:{dataProvider:{ids:[1]},geographics:{areas:[{areaType:'Municipality',featureId:'1277'}]},
        taxon:{ids:[4000104],includeUnderlyingTaxa:true},date:{dateFilterType:'OnlyStartDate'}}},records:[
        {dataProviderId:1,municipalityId:'1277',taxon:{id:1,taxonRank:'species',vernacularName:'Test',scientificName:'Testus exemplus'},occurrence:{occurrenceId:'synthetic:1',isPositiveObservation:true,reportedBy:'PRIVATE_SENTINEL'}, event:{plainStartDate:'2026-10-25'}},
        {dataProviderId:1,municipalityId:'1277',taxon:{id:1,taxonRank:'species',vernacularName:'Test',scientificName:'Testus exemplus'},occurrence:{occurrenceId:'synthetic:2',isPositiveObservation:true}, event:{plainStartDate:'2026-10-20'}}]};
}
const data = fixture(), before = JSON.stringify(data);
assert.equal(snapshot.select(data,3,now).length,1);
assert.equal(snapshot.select(data,7,now).length,2);
assert(!JSON.stringify(snapshot.select(data,3,now)).includes('PRIVATE_SENTINEL'));
assert.equal(JSON.stringify(data),before);
for (const mutate of [
    d=>d.source.dataProviderId=2, d=>d.source.complete=false, d=>d.source.recordCount=99,
    d=>d.source.fromDay='2026-10-25',d=>d.source.toDay='2026-10-24',d=>d.source.retrievedAt='2026-10-23T12:00:00Z',
    d=>d.source.retrievedAt='2026-10-26T12:00:00Z',d=>d.records[0].dataProviderId=2,
    d=>delete d.records[0].taxon.id, d=>d.records[0].taxon.vernacularName={reportedBy:'PRIVATE_SENTINEL'}, d=>d.records[0].taxon.scientificName=null, d=>d.records[0].occurrence.occurrenceId='synthetic:2',
    d=>delete d.records[0].event.plainStartDate,d=>d.source.query.dataProvider.ids=[1,2],
    d=>d.source.query.geographics.areas[0].featureId='other'
]) { const bad=fixture();mutate(bad);assert.throws(()=>snapshot.select(bad,3,now)); }
const absent=fixture();absent.records[0].occurrence.isPositiveObservation=false;
assert.equal(snapshot.select(absent,3,now).length,0);
const empty=fixture();empty.records=[];empty.source.recordCount=0;
assert.equal(snapshot.select(empty,3,now).length,0,'Valid empty differs from missing data');
(async()=>{
    const calls=[];
    const result=await snapshot.load(async(url,options)=>{calls.push({url,options});return{ok:true,json:async()=>fixture()};},'/data/artportalen-public-snapshot.json',3,now);
    assert.equal(result.length,1);assert.deepEqual(calls[0].options,{cache:'no-store'});
    await assert.rejects(snapshot.load(async()=>({ok:false,status:404}),'/missing',3,now));
    console.log('PASS: same-origin snapshot loading; provider/scope/IDs/dates/completeness/staleness gates; no person fields; valid zero distinct from unavailable.');
})().catch(e=>{console.error(e);process.exitCode=1;});
