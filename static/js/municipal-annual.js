/* Municipal annual list. Personal checklist data and observer reporting are kept separate. */
(function(root,factory){
 if(typeof module==='object'&&module.exports)module.exports=factory(require('./municipal-home-live.js'),require('./municipal-preview-data.js'));
 else {root.MunicipalAnnual=factory(root.MunicipalLive,root.MunicipalPreview);root.MunicipalAnnual.mount(root);}
})(typeof window==='undefined'?this:window,function(live,preview){
'use strict';
const ENDPOINT='https://sosgeo.artdata.slu.se/geoserver/SOS/ows';
const OBSERVER_FIELDS='occurrenceId,dataProviderId,municipality,organismGroup,isPresentObservation,isUncertainIdentification,isNaturalOccurrence,startDate,scientificName,dyntaxaTaxonId,taxonCategory,vernacularName,recordedBy';
function firstRows(data,year){return preview.first(data,year);}
function dateLabel(day){return new Intl.DateTimeFormat('sv-SE',{day:'numeric',month:'long',timeZone:'UTC'}).format(new Date(day+'T12:00:00Z'));}
async function fetchObserverBatch(fetcher,records,taxonomy,options={}){
 if(!Array.isArray(records)||!records.length||records.length>50)throw Error('Ogiltigt urval av källfynd.');
 const expected=new Map();
 for(const r of records){
  if(!r||!/^urn:lsid:artportalen\.se:sighting:\d+$/.test(r.id)||expected.has(r.id)||!preview.day(r.day)||typeof r.scientificName!=='string'||!r.scientificName)throw Error('Källfynden kunde inte verifieras.');
  expected.set(r.id,r);
 }
 const ids=[...expected.keys()],url=new URL(ENDPOINT);
 url.search=new URLSearchParams({service:'WFS',version:'1.0.0',request:'GetFeature',typeName:'SOS:SpeciesObservations',outputFormat:'application/json',maxFeatures:String(ids.length+1),propertyName:OBSERVER_FIELDS,
  CQL_FILTER:"dataProviderId=1 AND municipality='Åstorp' AND organismGroup='Fåglar' AND isPresentObservation=true AND isUncertainIdentification=false AND isNaturalOccurrence=true AND occurrenceId IN ("+ids.map(id=>"'"+id+"'").join(',')+")"});
 const response=await fetcher(url.href,{cache:'no-store',signal:options.signal});
 if(!response.ok)throw Error('Observatörsuppgifterna kunde inte hämtas (HTTP '+response.status+').');
 const payload=await response.json();
 if(live.count(payload)!==ids.length||payload.features.length!==ids.length)throw Error('Alla källfynd kunde inte återläsas.');
 const seen=new Set();
 for(const f of payload.features){
  const p=f.properties;
  if(!p||!expected.has(p.occurrenceId)||seen.has(p.occurrenceId)||p.dataProviderId!==1||p.municipality!=='Åstorp'||p.organismGroup!=='Fåglar'||p.isPresentObservation!==true||p.isUncertainIdentification!==false||p.isNaturalOccurrence!==true||(p.recordedBy!=null&&(typeof p.recordedBy!=='string'||p.recordedBy.length>2000)))throw Error('Källans observatörsuppgifter kunde inte verifieras.');
  seen.add(p.occurrenceId);
 }
 const normalized=new Map(live.aggregate(payload.features,taxonomy).records.map(r=>[r.id,r]));
 for(const [id,r] of expected){const actual=normalized.get(id);if(!actual||actual.day!==r.day||actual.scientificName!==r.scientificName)throw Error('Ett källfynd har ändrats. Uppdatera årslistan och försök igen.');}
 return payload.features.map(f=>({id:f.properties.occurrenceId,recordedBy:f.properties.recordedBy==null?null:f.properties.recordedBy.replace(/\s+/g,' ').trim()||null}));
}
function observerGroups(row,observers,failed){
 const groups=new Map();
 for(const id of row.ids){
  const known=observers.has(id),value=known?observers.get(id).recordedBy:null;
  const state=known?(value?'known':'missing'):failed.has(id)?'error':'loading';
  const label=state==='known'?value:state==='missing'?'Observatör inte angiven':state==='error'?'Observatörsuppgiften kunde inte hämtas':'Hämtar observatörsuppgift …';
  const key=state+'|'+label;if(!groups.has(key))groups.set(key,{state,label,ids:[]});groups.get(key).ids.push(id);
 }
 return [...groups.values()].sort((a,b)=>(a.state==='known'?0:1)-(b.state==='known'?0:1)||a.label.localeCompare(b.label,'sv'));
}
function mount(env){
 const doc=env.document,el=id=>doc.getElementById(id),host=el('municipal-annual');
 if(!host)return;
 const year=Number(host.dataset.year),base=host.dataset.base,cacheKey='astorp-home-'+year+'-v1';
 let data=null,rows=[],busy=false,failure='',fingerprint='',observers=new Map(),failed=new Set(),observerBusy=false,observerRevision=0,observerRequest=null,observerReady=Promise.resolve();
 const create=(tag,cls,text)=>{const node=doc.createElement(tag);if(cls)node.className=cls;if(text!=null)node.textContent=text;return node;};
 function checked(value){
  const result=preview.verify(value),now=new env.Date();
  if(result.source.fromDay!==(year-1)+'-01-01'||!result.source.toDay.startsWith(year+'-')||result.source.toDay>live.stockholmDay(now)||Date.parse(result.source.retrievedAt)>+now)throw Error('Underlagets år eller hämtningstid stämmer inte.');
  return result;
 }
 function fresh(value){const age=+new env.Date()-Date.parse(value.source.retrievedAt);return value.source.mode==='live'&&age>=0&&age<900000&&value.source.toDay===live.stockholmDay(new env.Date());}
 async function read(url,signal){const response=await env.fetch(url,{cache:'no-store',signal});if(!response.ok)throw Error('HTTP '+response.status+'.');return response.json();}
 function status(){
  el('annual-refresh').disabled=busy;el('annual-observer-retry').disabled=observerBusy;el('annual-observer-retry').hidden=!failed.size;
  if(!data){el('annual-data-status').textContent=busy?'Hämtar kommunens årslista …':'Årslistan kunde inte hämtas. '+failure;return;}
  const stamp=new Intl.DateTimeFormat('sv-SE',{dateStyle:'short',timeStyle:'short',timeZone:'Europe/Stockholm'}).format(new Date(data.source.retrievedAt));
  el('annual-data-status').textContent=(busy?'Uppdaterar. ':'')+(failure||!fresh(data)?'Senast kontrollerade underlag: ':'Hämtat ')+stamp+' svensk tid. Fynd till och med '+dateLabel(data.source.toDay)+' '+year+'.'+(failure?' Nya fynd kunde inte hämtas. '+failure:'');
  el('annual-name-status').textContent=observerBusy?'Hämtar observatörsuppgifter från källfynden …':failed.size?'Uppgifter för '+failed.size+' källfynd kunde inte hämtas. Artantalet och källänkarna finns kvar.':'';
 }
 function renderRows(){
  if(!data)return;
  const query=el('annual-search').value.trim().normalize('NFC').toLocaleLowerCase('sv'),sort=el('annual-sort').value;
  const visible=rows.filter(r=>!query||(r.name+' '+r.scientificName).normalize('NFC').toLocaleLowerCase('sv').includes(query));
  visible.sort((a,b)=>sort==='first'?a.day.localeCompare(b.day)||a.name.localeCompare(b.name,'sv'):sort==='latest'?b.day.localeCompare(a.day)||a.name.localeCompare(b.name,'sv'):a.name.localeCompare(b.name,'sv'));
  const focus=doc.activeElement?.id,container=el('annual-rows');container.replaceChildren();
  el('annual-total').textContent=String(rows.length);el('annual-visible').textContent=query?'Visar '+visible.length+' av '+rows.length+' arter':'Visar alla '+rows.length+' arter';
  if(!visible.length){container.append(create('p','annual-empty',rows.length?'Inga arter matchar sökningen.':'Inga arter finns i det kontrollerade urvalet.'));return;}
  visible.forEach(row=>{
   const article=create('article','annual-row');article.setAttribute('role','listitem');
   const heading=create('h2','annual-species-name',row.name);heading.id='annual-species-'+row.taxonId;article.setAttribute('aria-labelledby',heading.id);
   const species=create('div','annual-species');species.append(heading,create('span','annual-latin',row.scientificName));
   const first=create('div','annual-first');first.append(create('span','annual-mobile-label','Första fynddatum'));
   const time=create('time','',dateLabel(row.day));time.dateTime=row.day;first.append(time);
   const observer=create('div','annual-observers');observer.append(create('span','annual-mobile-label','Observatörsuppgifter'));
   const list=create('ul','annual-observer-list');
   observerGroups(row,observers,failed).forEach(group=>{
    const item=create('li','annual-observer-group '+(group.state==='known'?'':'annual-observer-muted'));
    item.dataset.state=group.state;item.append(create('span','annual-observer-name',group.label));
    const links=create('span','annual-source-links');
    group.ids.forEach((id,index)=>{const a=create('a','annual-source-link',group.ids.length===1?'Källfynd':'Källfynd '+(index+1));a.href='https://www.artportalen.se/Sighting/'+id.split(':').at(-1);a.id='annual-source-'+id.split(':').at(-1);a.setAttribute('aria-label','Källfynd '+(index+1)+' för '+row.name);links.append(a);});
    item.append(links);list.append(item);
   });
   observer.append(list);article.append(species,first,observer);container.append(article);
  });
  if(focus?.startsWith('annual-source-'))el(focus)?.focus({preventScroll:true});
 }
 function cancelObservers(){observerRevision++;if(observerRequest){observerRequest.controller.abort();env.clearTimeout(observerRequest.timer);observerRequest=null;}observerBusy=false;}
 async function loadObservers(){
  cancelObservers();const token=observerRevision;
  const byId=new Map(data.records.map(r=>[r.id,r])),records=rows.flatMap(r=>r.ids).map(id=>byId.get(id));
  observers=new Map();failed=new Set();observerBusy=!!records.length;status();renderRows();
  if(!records.length)return;
  const controller=new env.AbortController(),timer=env.setTimeout(()=>controller.abort(),45000);observerRequest={controller,timer};
  try{
   const taxonomy=await read(base+'data/municipal-taxonomy.json',controller.signal);
   const batches=[];for(let i=0;i<records.length;i+=50)batches.push(records.slice(i,i+50));
   await Promise.all(batches.map(async batch=>{
    try{const values=await fetchObserverBatch(env.fetch.bind(env),batch,taxonomy,{signal:controller.signal});if(token!==observerRevision)return;values.forEach(v=>observers.set(v.id,v));}
    catch(_){if(token!==observerRevision)return;batch.forEach(r=>failed.add(r.id));}
   }));
  }catch(_){if(token===observerRevision)records.forEach(r=>failed.add(r.id));}
  finally{env.clearTimeout(timer);if(token===observerRevision){observerRequest=null;observerBusy=false;status();renderRows();}}
 }
 function accept(value,forceNames=false){
  data=value;rows=firstRows(data,year);
  const next=JSON.stringify(rows.flatMap(r=>r.ids.map(id=>[id,r.day,r.scientificName])).sort((a,b)=>a[0].localeCompare(b[0])));
  status();
  if(next!==fingerprint||forceNames){fingerprint=next;observerReady=loadObservers();}else renderRows();
 }
 async function refresh(forceNames=false){
  if(busy)return;busy=true;failure='';status();
  const controller=new env.AbortController(),timer=env.setTimeout(()=>controller.abort(),90000);
  try{
   const taxonomy=await read(base+'data/municipal-taxonomy.json',controller.signal);
   const seed=data||{source:{municipality:'Åstorp',taxonomyPolicy:'AviList-v2026-2026-10-20-with-existing-feral-pigeon-inclusion'}};
   const value=checked(await live.load(env.fetch.bind(env),seed,{signal:controller.signal,taxonomy}));
   accept(value,forceNames);try{env.sessionStorage.setItem(cacheKey,JSON.stringify({schemaVersion:1,...value}));}catch(_){}
  }catch(error){failure=error.name==='AbortError'?'Hämtningen tog för lång tid.':error.message;}
  finally{env.clearTimeout(timer);busy=false;status();if(!data)el('annual-rows').replaceChildren(create('p','annual-empty','Underlaget saknas. Använd Uppdatera årslistan för att försöka igen.'));}
 }
 async function start(){
  el('annual-search').addEventListener('input',renderRows);el('annual-sort').addEventListener('change',renderRows);
  el('annual-refresh').addEventListener('click',()=>refresh(true));
  el('annual-observer-retry').addEventListener('click',()=>{observerReady=loadObservers();});
  try{const cached=env.sessionStorage.getItem(cacheKey);if(cached)accept(checked(JSON.parse(cached)));}catch(_){}
  if(data&&fresh(data)){await observerReady;return;}
  if(!data){const controller=new env.AbortController(),timer=env.setTimeout(()=>controller.abort(),10000);try{const snapshot=checked(await read(base+'data/municipal-preview.json',controller.signal));if(!data)accept(snapshot);}catch(_){}finally{env.clearTimeout(timer);}}
  if(!data||!fresh(data))await refresh();await observerReady;
 }
 const ready=start();
 const interval=env.setInterval(()=>{if(!doc.hidden&&(!data||!fresh(data)))refresh(true);},900000);
 function visible(){if(!doc.hidden&&(!data||!fresh(data)))refresh(true);}
 doc.addEventListener('visibilitychange',visible);
 return {ready,refresh,destroy(){cancelObservers();env.clearInterval(interval);doc.removeEventListener('visibilitychange',visible);}};
}
return {firstRows,fetchObserverBatch,observerGroups,mount};
});
