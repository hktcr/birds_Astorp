'use strict';
const fs=require('node:fs');
const live=require('../static/js/municipal-home-live.js');
const validation=require('../static/js/municipal-preview-data.js');
const home=require('../static/js/municipal-home.js');
(async()=>{
 const file='static/data/municipal-preview.json';
 const base=JSON.parse(fs.readFileSync(file,'utf8'));
 const taxonomy=JSON.parse(fs.readFileSync('static/data/municipal-taxonomy.json','utf8'));
 const next=await live.load(fetch,base,{taxonomy,signal:AbortSignal.timeout(180000)});
 const checked=validation.verify(next);
 const year=Number(checked.source.toDay.slice(0,4));
 const summary=home.model(checked,year);
 if(!summary.count)throw Error('Unexpected empty municipal year; release requires review.');
 fs.writeFileSync(file,JSON.stringify({schemaVersion:1,...checked},null,2)+'\n');
 console.log(JSON.stringify({complete:checked.source.complete,year,species:summary.count,through:checked.source.toDay,retrievedAt:checked.source.retrievedAt,partitions:checked.source.partitions.map(p=>({from:p.fromDay,to:p.toDay,count:p.fetchedCount}))}));
})().catch(e=>{console.error(e.message);process.exitCode=1;});
