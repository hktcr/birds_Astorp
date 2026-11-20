/* Municipal homepage. Uses only the separately verified public Artportalen aggregate. */
(function(root,factory){
  if(typeof module==='object'&&module.exports)module.exports=factory();
  else {root.MunicipalHome=factory();root.MunicipalHome.mount(root);}
})(typeof window==='undefined'?this:window,function(){
'use strict';
function dateLabel(day){return new Intl.DateTimeFormat('sv-SE',{day:'numeric',month:'long',timeZone:'UTC'}).format(new Date(day+'T12:00:00Z'));}
function model(data,year){
  const rows=new Map();
  data.records.filter(r=>r.day.startsWith(year+'-')).forEach(r=>{
    const prior=rows.get(r.taxonId);
    if(!prior||r.day<prior.day)rows.set(r.taxonId,{...r,ids:[r.id]});
    else if(r.day===prior.day&&!prior.ids.includes(r.id))prior.ids.push(r.id);
  });
  const chronological=[...rows.values()].sort((a,b)=>a.day.localeCompare(b.day)||a.name.localeCompare(b.name,'sv'));
  chronological.forEach((r,i)=>{r.number=i+1;});
  const days=new Map();
  chronological.forEach(r=>{if(!days.has(r.day))days.set(r.day,[]);days.get(r.day).push(r);});
  return {count:rows.size,latest:chronological.length?chronological.at(-1).day:null,
    recent:[...chronological].sort((a,b)=>b.day.localeCompare(a.day)||a.name.localeCompare(b.name,'sv')).slice(0,3),
    days:[...days].sort((a,b)=>b[0].localeCompare(a[0])).map(([day,rows])=>[day,[...rows].reverse()])};
}
function current(data,now,live){
  const age=+now-Date.parse(data.source.retrievedAt);
  return data.source.mode==='live'&&age>=0&&age<900000&&data.source.toDay===live.stockholmDay(now);
}
function mount(env){
 const doc=env.document,el=id=>doc.getElementById(id),host=el('municipal-home');
 if(!host)return;
 const year=Number(host.dataset.year),base=host.dataset.base,cacheKey='astorp-home-'+year+'-v1';
 let data=null,busy=false,failure='',hintSources=null,hintFailure='';
 const create=(tag,className,value)=>{const n=doc.createElement(tag);if(className)n.className=className;if(value!=null)n.textContent=value;return n;};
 function checked(value){
   const result=env.MunicipalPreview.verify(value),s=result.source;
   const now=new env.Date();
   if(s.fromDay!==(year-1)+'-01-01'||!s.toDay.startsWith(year+'-')||s.toDay>env.MunicipalLive.stockholmDay(now)||Date.parse(s.retrievedAt)>+now)throw Error('Underlagets år eller hämtningstid stämmer inte.');
   return result;
 }
 function sourceLink(id){
   const a=create('a','trail-source','Artportalen');
   a.href='https://www.artportalen.se/Sighting/'+id.split(':').at(-1);
   return a;
 }
 function status(){
   const node=el('data-status');
   if(!data){node.dataset.state='error';node.textContent=busy?'Hämtar årets offentliga fynd …':'Årslistan kunde inte hämtas. '+failure;return;}
   const s=data.source,ok=!failure&&current(data,new env.Date(),env.MunicipalLive);
   node.dataset.state=ok?'live':'stale';
   const stamp=new Intl.DateTimeFormat('sv-SE',{dateStyle:'short',timeStyle:'short',timeZone:'Europe/Stockholm'}).format(new Date(s.retrievedAt));
   node.textContent=(busy?'Uppdaterar. ':'')+(ok?'Hämtat ':'Senast kontrollerade underlag: ')+stamp+' svensk tid. Fynd till och med '+dateLabel(s.toDay)+' '+year+'.'+(failure?' Nya fynd kunde inte hämtas. '+failure:'');
   el('source-detail').textContent='Urval: 1 januari till '+dateLabel(s.toDay)+' '+year+'. Hämtat '+stamp+' svensk tid. Underlaget kan ändras när fynd läggs till eller rättas. Artantalet bygger på hela det kontrollerade urvalet.';
 }
 function renderHints(){
   const cards=el('prediction-cards'),label=el('prediction-score');
   if(!cards||!label)return;
   cards.replaceChildren();
   if(!data){label.textContent='Tips visas när kommunens årslista har hämtats.';return;}
   if(!hintSources){label.textContent=hintFailure||'Beräknar aktuella tips …';return;}
   try{
     const result=env.MunicipalHints.rank(data,year,hintSources.guide,hintSources.daily,hintSources.taxonomy,new env.Date());
     result.candidates.forEach(candidate=>{
       const card=create('div','prediction-card');
       card.append(create('span','prediction-species',candidate.name));
       cards.append(card);
     });
     label.textContent=(result.candidates.length?'Period: ':'Inga återstående arter har fynd i underlaget för perioden ')+env.StockholmDates.formatDay(result.today)+' till '+env.StockholmDates.formatDay(result.endDay)+' '+year+'.';
     el('prediction-source').textContent='Tipsens historiska dagsunderlag är märkt '+(result.sourceDate||'okänt datum')+' och bygger på Artportalen och fältdagboken. Artguidens export är från '+(hintSources.guide.exportDate||'okänt datum')+'. Urvalet utesluter arter i kommunens aktuella årslista. Tipsen är en säsongsbedömning, inte nya observationer eller beräknade sannolikheter.';
   }catch(e){label.textContent=e.message;}
 }
 async function loadHintSources(){
   const controller=new env.AbortController(),timer=env.setTimeout(()=>controller.abort(),15000);
   try{
     const sources=await Promise.all(['species-guide.json','species_days_historic.json','municipal-taxonomy.json'].map(name=>read(base+'data/'+name,controller.signal)));
     hintSources={guide:sources[0],daily:sources[1],taxonomy:sources[2]};hintFailure='';
   }catch(_){hintFailure='Det historiska underlaget kunde inte hämtas. Ladda om sidan för att försöka igen.';}
   finally{env.clearTimeout(timer);renderHints();}
 }
 function render(){
   status();renderHints();if(!data)return;
   const m=model(data,year);el('species-count').textContent=m.count;
   el('latest-species').textContent=m.latest?'Senaste tillskott i årslistan: '+dateLabel(m.latest)+'.':'Inga arter i det kontrollerade urvalet.';
   const recent=el('recent-species');recent.replaceChildren();
   m.recent.forEach(r=>{const card=create('div','prediction-card');card.append(create('span','prediction-species',r.name),create('span','prediction-meta',dateLabel(r.day)));recent.append(card);});
   const trail=el('trail-timeline');trail.replaceChildren();
   m.days.forEach(([day,rows],i)=>{
     const item=create('div','trail-item'+(i===0?' trail-item-latest':''));
     const line=create('div','trail-line'+(i===m.days.length-1?' trail-line-end':'')),dot=create('div','trail-dot');
     line.setAttribute('aria-hidden','true');dot.setAttribute('aria-hidden','true');
     const content=create('div','trail-content');const date=create('time','trail-date',dateLabel(day));date.dateTime=day;content.append(date);
     rows.forEach(r=>{
       const row=create('div','trail-species');
       row.append(create('span','trail-species-number','#'+r.number+' '),doc.createTextNode(r.name));
       if(r.ids.length===1)row.append(sourceLink(r.ids[0]));
       else {const details=create('details');details.append(create('summary','home-scope',r.ids.length+' källfynd samma dag'));r.ids.forEach(id=>details.append(sourceLink(id)));row.append(details);}
       content.append(row);
     });
     item.append(line,dot,content);trail.append(item);
   });
   if(!m.count)trail.append(create('p','home-empty','Inga arter i det kontrollerade underlaget för '+year+'.'));
 }
 async function read(url,signal){const r=await env.fetch(url,{cache:'no-store',signal});if(!r.ok)throw Error('HTTP '+r.status+'.');return r.json();}
 async function refresh(){
   if(busy)return;busy=true;failure='';el('refresh-data').disabled=true;status();
   const controller=new env.AbortController(),timer=env.setTimeout(()=>controller.abort(),90000);
   try{
     const taxonomy=await read(base+'data/municipal-taxonomy.json',controller.signal);
     const seed=data||{source:{municipality:'Åstorp',taxonomyPolicy:'AviList-v2026-2026-10-20-with-existing-feral-pigeon-inclusion'}};
     const next=checked(await env.MunicipalLive.load(env.fetch.bind(env),seed,{signal:controller.signal,taxonomy}));
     data=next;
     try{env.sessionStorage.setItem(cacheKey,JSON.stringify({schemaVersion:1,...next}));}catch(_){}
   }catch(e){failure=e.name==='AbortError'?'Hämtningen tog för lång tid.':e.message;}
   finally{env.clearTimeout(timer);busy=false;el('refresh-data').disabled=false;render();if(!data){el('latest-species').textContent='Underlag saknas.';el('trail-timeline').replaceChildren(create('p','home-empty','Använd Uppdatera fynd för att försöka igen.'));}}
 }
 async function start(){
   const hintReady=loadHintSources();
   el('refresh-data').addEventListener('click',refresh);
   try{const saved=env.sessionStorage.getItem(cacheKey);if(saved)data=checked(JSON.parse(saved));}catch(_){}
   if(data){render();if(current(data,new env.Date(),env.MunicipalLive)){await hintReady;return;}}
   else {
     const controller=new env.AbortController(),timer=env.setTimeout(()=>controller.abort(),10000);
     try{data=checked(await read(base+'data/municipal-preview.json',controller.signal));render();}catch(_){}finally{env.clearTimeout(timer);}
   }
   await refresh();
   await hintReady;
 }
 const ready=start();
 const interval=env.setInterval(()=>{if(!doc.hidden&&(!data||!current(data,new env.Date(),env.MunicipalLive)))refresh();},900000);
 function visible(){if(!doc.hidden&&(!data||!current(data,new env.Date(),env.MunicipalLive)))refresh();}
 doc.addEventListener('visibilitychange',visible);
 return {ready,refresh,destroy(){env.clearInterval(interval);doc.removeEventListener('visibilitychange',visible);}};
}
return {model,current,dateLabel,mount};
});