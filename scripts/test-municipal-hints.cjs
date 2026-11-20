'use strict';
const assert=require('node:assert/strict');
const hints=require('../static/js/municipal-hints.js');
const taxonomy=require('../static/data/municipal-taxonomy.json');
const guide={species:[
 {name:'Gråkråka',latin:'Corvus corone cornix'},
 {name:'Klippduva (tamduva)',latin:'Columba livia, domesticated populations'},
 {name:'Jorduggla',latin:'Asio flammeus'},
 {name:'Kungsfiskare',latin:'Alcedo atthis'}
]};
const daily={'_meta':{generated:'2026-06-07'},'Gråkråka':{'11-20':100},'Klippduva (tamduva)':{'11-20':90},'Jorduggla':{'11-20':2},'Kungsfiskare':{'11-20':1}};
const now=new Date('2026-11-20T10:00:00Z');
const data={source:{complete:true,toDay:'2026-11-20'},records:[
 {day:'2026-01-01',scientificName:'Corvus corone'},
 {day:'2026-01-02',scientificName:'Columba livia'}
]};
const clone=value=>JSON.parse(JSON.stringify(value));
const names=value=>hints.rank(value,2026,guide,daily,taxonomy,now).candidates.map(x=>x.name);
// Verified parent mappings exclude observed species despite guide aliases.
assert.deepEqual(names(data),['Jorduggla','Kungsfiskare']);
const added=clone(data);
added.records.push({day:'2026-11-20',scientificName:'Asio flammeus'});
assert.deepEqual(names(added),['Kungsfiskare']);
// Previous-year and future records do not remove this year's candidates.
const otherDates=clone(data);
otherDates.records.push({day:'2025-11-20',scientificName:'Asio flammeus'},{day:'2026-11-21',scientificName:'Alcedo atthis'});
assert.deepEqual(names(otherDates),names(data));
assert.throws(()=>names({...data,source:{...data.source,toDay:'2026-11-19'}}),/uppdaterad för idag/);
assert.throws(()=>names({...data,source:{complete:false,toDay:'2026-11-20'}}),/Komplett kommununderlag/);
assert.throws(()=>names({...data,records:[{day:'2026-01-01',scientificName:'Unknown species'}]}),/Artmappning saknas/);
assert.throws(()=>hints.rank(data,2026,guide,daily,{...taxonomy,verifiedSourceParents:{}},now),/Artmappning saknas/);
assert.throws(()=>hints.rank(data,2026,{species:[...guide.species,{name:'Kråka',latin:'Corvus corone'}]},daily,taxonomy,now),/överlappande/);
// Stockholm midnight and the year boundary must not reuse yesterday's suggestions.
assert.throws(()=>hints.rank(data,2026,guide,daily,taxonomy,new Date('2026-11-20T23:00:00Z')),/uppdaterad för idag/);
assert.throws(()=>hints.rank(data,2026,guide,daily,taxonomy,new Date('2026-12-31T23:00:00Z')),/uppdaterad för idag/);
assert.deepEqual(data.records,[{day:'2026-01-01',scientificName:'Corvus corone'},{day:'2026-01-02',scientificName:'Columba livia'}]);
console.log('PASS municipal hints: verified identities, exclusion, dates, mapping errors, no data mutation.');
