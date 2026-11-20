/* Year comparisons reuse the municipal filter, taxonomy and checked WFS intervals. */
(function(root,factory){
 if(typeof module==='object'&&module.exports)module.exports=factory(require('./municipal-home-live.js'),require('./municipal-preview-data.js'));
 else root.MunicipalComparison=factory(root.MunicipalLive,root.MunicipalPreview);
})(typeof window==='undefined'?this:window,function(live,preview){
'use strict';
const POLICY='AviList-v2026-2026-10-20-with-existing-feral-pigeon-inclusion';
const MIN_YEAR=1900;
function midnight(day){
 if(!preview.day(day))throw Error('Ogiltigt datum.');
 const center=Date.parse(day+'T00:00:00Z');
 let low=center-36*3600000,high=center+36*3600000;
 while(low<high){const middle=Math.floor((low+high)/2);if(live.stockholmDay(middle)<day)low=middle+1;else high=middle;}
 if(live.stockholmDay(low)!==day)throw Error('Datumets tidszon kunde inte verifieras.');
 return low;
}
function bounds(year){
 if(!Number.isInteger(year)||year<MIN_YEAR||year>9998)throw Error('Ogiltigt jämförelseår.');
 return {from:midnight(year+'-01-01'),to:midnight((year+1)+'-01-01')};
}
function unique(records,year,until){
 const map=new Map();
 for(const r of records){
  if(!r.day.startsWith(year+'-')||r.day>until)continue;
  const previous=map.get(r.scientificName);
  if(!previous||r.day<previous.day)map.set(r.scientificName,r);
 }
 return [...map.values()].sort((a,b)=>a.name.localeCompare(b.name,'sv'));
}
function verifyYear(value,expectedYear){
 if(!value||value.schemaVersion!==1||value.year!==expectedYear||!value.source||!Array.isArray(value.records))throw Error('Jämförelseårets underlag kan inte verifieras.');
 const s=value.source,range=bounds(expectedYear),p=s.partition;
 if(s.complete!==true||s.municipality!=='Åstorp'||s.taxonomyPolicy!==POLICY||s.fromDay!==expectedYear+'-01-01'||s.toDay!==expectedYear+'-12-31'||!Number.isFinite(Date.parse(s.retrievedAt))||!p||p.fromDay!==s.fromDay||p.toDay!==s.toDay||!Number.isSafeInteger(p.fetchedCount)||p.fetchedCount<0||p.countBefore!==p.fetchedCount||p.countAfter!==p.fetchedCount||!Array.isArray(p.subpartitions)||!p.subpartitions.length)throw Error('Hela jämförelseåret kunde inte verifieras.');
 let end=range.from,total=0;
 for(const q of p.subpartitions){
  const from=Date.parse(q.fromUtc),to=Date.parse(q.toUtc);
  if(from!==end||!Number.isFinite(to)||to<=from||to>range.to||!Number.isSafeInteger(q.fetchedCount)||q.fetchedCount<0||q.fetchedCount>=5000||q.countBefore!==q.fetchedCount||q.countAfter!==q.fetchedCount)throw Error('Jämförelseårets delintervall är ofullständiga.');
  end=to;total+=q.fetchedCount;
 }
 if(end!==range.to||total!==p.fetchedCount)throw Error('Jämförelseårets intervalltäckning är ofullständig.');
 const seen=new Map();
 for(const r of value.records){
  if(!r||!/^urn:lsid:artportalen\.se:sighting:\d+$/.test(r.id)||!Number.isSafeInteger(r.taxonId)||r.rank!=='species'||typeof r.name!=='string'||!r.name||typeof r.scientificName!=='string'||!r.scientificName||!preview.day(r.day)||r.day<s.fromDay||r.day>s.toDay)throw Error('Ogiltig art i jämförelseåret.');
  if(seen.has(r.id))throw Error('Dubblett i jämförelseårets underlag.');
  seen.set(r.id,r);
 }
 if(!value.records.length&&p.fetchedCount>0&&s.exclusions?.unspecified!==p.fetchedCount)throw Error('Jämförelseårets tomma artlista kan inte verifieras.');
 if(!value.manifest||value.manifest.records!==seen.size||value.manifest.species!==new Set(value.records.map(r=>r.scientificName)).size||value.records.length>p.fetchedCount)throw Error('Jämförelseårets artantal kan inte verifieras.');
 return value;
}
function embedded(data,year){
 if(data.source.taxonomyPolicy!==POLICY)throw Error('Årens artindelning stämmer inte överens.');
 const partition=data.source.partitions.find(p=>p.fromDay===year+'-01-01');
 if(!partition||partition.toDay!==year+'-12-31')throw Error('Jämförelseåret saknas.');
 const records=data.records.filter(r=>r.day.startsWith(year+'-'));
 return verifyYear({schemaVersion:1,year,source:{complete:true,municipality:'Åstorp',taxonomyPolicy:POLICY,fromDay:year+'-01-01',toDay:year+'-12-31',retrievedAt:data.source.retrievedAt,partition},records,manifest:{records:records.length,species:new Set(records.map(r=>r.scientificName)).size}},year);
}
async function loadYear(fetcher,year,options={}){
 const today=live.stockholmDay(options.now||new Date());
 if(!Number.isInteger(year)||year<MIN_YEAR||year>=Number(today.slice(0,4)))throw Error('Välj ett avslutat år från '+MIN_YEAR+'.');
 const range=bounds(year),receipts=[];
 let taxonomy=options.taxonomy;
 if(!taxonomy){const r=await fetcher(options.taxonomyURL||'/data/municipal-taxonomy.json',{signal:options.signal,cache:'no-store'});if(!r.ok)throw Error('Artindelningen kunde inte hämtas.');taxonomy=await r.json();}
 const features=await live.interval(fetcher,range.from,range.to,options.signal,receipts,{n:0});
 const normalized=live.aggregate(features,taxonomy),records=normalized.records;
 const n=receipts.reduce((sum,r)=>sum+r.fetchedCount,0);
 return verifyYear({schemaVersion:1,year,source:{complete:true,municipality:'Åstorp',taxonomyPolicy:POLICY,fromDay:year+'-01-01',toDay:year+'-12-31',retrievedAt:new Date().toISOString(),exclusions:normalized.excluded,partition:{fromDay:year+'-01-01',toDay:year+'-12-31',countBefore:n,countAfter:n,fetchedCount:n,subpartitions:receipts}},records,manifest:{records:records.length,species:new Set(records.map(r=>r.scientificName)).size}},year);
}
function compare(data,history,year){
 if(!data||!data.source||data.source.complete!==true||data.source.taxonomyPolicy!==POLICY||!preview.day(data.source.toDay)||!Array.isArray(data.records))throw Error('Kommunens aktuella årslista saknas.');
 verifyYear(history,year);
 const currentYear=Number(data.source.toDay.slice(0,4));
 if(year>=currentYear)throw Error('Välj ett tidigare jämförelseår.');
 const day=data.source.toDay,priorDay=preview.cutoff(year,day.slice(5));
 const current=unique(data.records,currentYear,day),previous=unique(history.records,year,priorDay);
 const nowMap=new Map(current.map(r=>[r.scientificName,r])),priorMap=new Map(previous.map(r=>[r.scientificName,r]));
 return {year:currentYear,comparisonYear:year,day,priorDay,current,previous,difference:current.length-previous.length,
  onlyCurrent:current.filter(r=>!priorMap.has(r.scientificName)),
  onlyPrevious:previous.filter(r=>!nowMap.has(r.scientificName)),
  shared:current.filter(r=>priorMap.has(r.scientificName)).map(r=>({current:r,previous:priorMap.get(r.scientificName)}))};
}
function curve(rows,until,maximum){
 const origin=Date.parse('2000-01-01T00:00:00Z'),last=Date.parse('2000-'+until.slice(5)+'T00:00:00Z');
 const groups=new Map();for(const r of rows){const md=r.day.slice(5);groups.set(md,(groups.get(md)||0)+1);}
 let count=0,path='M0 180';
 for(const [md,n] of [...groups].sort((a,b)=>a[0].localeCompare(b[0]))){
  const x=last===origin?0:600*(Date.parse('2000-'+md+'T00:00:00Z')-origin)/(last-origin);
  path+=' H'+x.toFixed(2);count+=n;path+=' V'+(180-180*count/maximum).toFixed(2);
 }
 return path+' H600';
}
function dateLabel(day){return new Intl.DateTimeFormat('sv-SE',{day:'numeric',month:'long',timeZone:'UTC'}).format(new Date(day+'T12:00:00Z'));}
function mount(env,options){
 const doc=env.document,el=id=>doc.getElementById(id),open=el('year-comparison-open'),dialog=el('year-comparison-dialog');
 if(!open||!dialog)return null;
 const select=el('comparison-year'),status=el('comparison-status'),result=el('comparison-result'),retry=el('comparison-retry'),cache=new Map();
 let current=null,version='',revision=0,request=null;
 const year=options.year,base=options.base;
 function node(tag,cls,text){const n=doc.createElement(tag);if(cls)n.className=cls;if(text!=null)n.textContent=text;return n;}
 for(let y=year-1;y>=MIN_YEAR;y--){const option=node('option','',String(y));option.value=String(y);select.append(option);}
 select.value=String(year-1);
 function cancel(){revision++;if(request){request.controller.abort();env.clearTimeout(request.timer);request=null;}}
 function stamp(value){return new Intl.DateTimeFormat('sv-SE',{dateStyle:'short',timeStyle:'short',timeZone:'Europe/Stockholm'}).format(new Date(value));}
 function list(id,rows,shared){
  const host=el(id);host.replaceChildren();
  if(!rows.length){host.append(node('li','comparison-empty','Inga arter i denna grupp.'));return;}
  rows.forEach(item=>{
   const r=shared?item.current:item,li=node('li','comparison-species'),info=node('div','comparison-species-info');
   info.append(node('span','comparison-species-name',r.name));
   if(shared)info.append(node('span','comparison-species-date',year+': '+dateLabel(r.day)+' · '+select.value+': '+dateLabel(item.previous.day)));
   else {const time=node('time','comparison-species-date',dateLabel(r.day));time.dateTime=r.day;info.append(time);}
   const a=node('a','comparison-source-link','Artportalen');a.href='https://www.artportalen.se/Sighting/'+r.id.split(':').at(-1);a.setAttribute('aria-label','Visa '+r.name+' i Artportalen');
   li.append(info,a);host.append(li);
  });
 }
 function render(model,history){
  el('comparison-period').textContent='1 januari–'+dateLabel(model.day)+' '+year+' jämfört med 1 januari–'+dateLabel(model.priorDay)+' '+model.comparisonYear+'.';
  el('comparison-current-year').textContent=String(year);el('comparison-prior-year').textContent=String(model.comparisonYear);
  el('comparison-current-count').textContent=String(model.current.length);el('comparison-prior-count').textContent=String(model.previous.length);
  const difference=model.difference;
  el('comparison-difference').textContent=(difference===0?'Lika många arter.':Math.abs(difference)+(difference>0?' fler':' färre')+' arter under '+year+'.')+' '+model.shared.length+' arter är gemensamma.';
  el('comparison-current-summary').textContent='Endast '+year+' · '+model.onlyCurrent.length+' arter';
  el('comparison-prior-summary').textContent='Endast '+model.comparisonYear+' · '+model.onlyPrevious.length+' arter';
  el('comparison-shared-summary').textContent='Gemensamma arter · '+model.shared.length;
  list('comparison-current-list',model.onlyCurrent,false);list('comparison-prior-list',model.onlyPrevious,false);list('comparison-shared-list',model.shared,true);
  const maximum=Math.max(20,Math.ceil(Math.max(model.current.length,model.previous.length)/20)*20);
  el('comparison-chart-max').textContent=String(maximum);el('comparison-chart-mid').textContent=String(maximum/2);
  el('comparison-chart-current').setAttribute('d',curve(model.current,model.day,maximum));
  el('comparison-chart-prior').setAttribute('d',curve(model.previous,model.day,maximum));
  el('comparison-legend-current').textContent=String(year);el('comparison-legend-prior').textContent=String(model.comparisonYear);
  el('comparison-chart-end').textContent=dateLabel(model.day);
  el('comparison-chart').setAttribute('aria-label','Ackumulerat antal arter fram till '+dateLabel(model.day)+': '+model.current.length+' under '+year+' och '+model.previous.length+' under '+model.comparisonYear+'.');
  el('comparison-sources').textContent='Underlaget för '+year+' hämtades '+stamp(current.source.retrievedAt)+' och för '+model.comparisonYear+' '+stamp(history.source.retrievedAt)+' svensk tid.';
  status.textContent=model.previous.length?'':'Inga offentliga arter finns i urvalet för '+model.comparisonYear+' fram till '+dateLabel(model.priorDay)+'.';
  result.hidden=false;result.dataset.year=String(model.comparisonYear);
 }
 async function show(){
  cancel();const token=revision,selected=Number(select.value);
  result.hidden=true;retry.hidden=true;el('comparison-period').textContent='Jämför till samma månad och dag i båda åren.';status.textContent='Hämtar jämförelsen för '+selected+' …';
  if(!current){status.textContent='Kommunens årslista behöver hämtas först.';return;}
  const controller=new env.AbortController(),timer=env.setTimeout(()=>controller.abort(),90000);request={controller,timer};
  try{
   let history;
   if(selected===year-1)history=embedded(current,selected);
   else{
    const saved=cache.get(selected),age=saved?+new env.Date()-Date.parse(saved.source.retrievedAt):Infinity;
    if(saved&&age>=0&&age<900000)history=verifyYear(saved,selected);
    else history=await loadYear(env.fetch.bind(env),selected,{signal:controller.signal,taxonomyURL:base+'data/municipal-taxonomy.json',now:new env.Date()});
   }
   if(token!==revision||!dialog.open)return;
   cache.set(selected,history);render(compare(current,history,selected),history);
  }catch(error){
   if(token!==revision||!dialog.open)return;
   status.textContent=error.name==='AbortError'?'Hämtningen tog för lång tid. Försök igen.':'Jämförelsen för '+selected+' kunde inte hämtas. '+error.message;
   retry.hidden=false;
  }finally{env.clearTimeout(timer);if(token===revision)request=null;}
 }
 function update(data){
  try{
   const checked=preview.verify({schemaVersion:1,...data});
   if(Number(checked.source.toDay.slice(0,4))!==year)throw Error('Fel årslista.');
   const previous=embedded(checked,year-1),summary=compare(checked,previous,year-1),next=checked.source.retrievedAt+'|'+checked.source.toDay;
   current=checked;
   el('comparison-summary').textContent=checked.source.toDay===live.stockholmDay(new env.Date())?'Vid samma tid förra året: '+summary.previous.length+' arter':'Vid samma datum '+(year-1)+': '+summary.previous.length+' arter ('+dateLabel(checked.source.toDay)+')';
   open.disabled=false;
   if(version!==next){version=next;if(dialog.open)show();}
  }catch(_){open.disabled=true;el('comparison-summary').textContent='Jämförelsen kräver ett komplett årsunderlag.';cancel();if(dialog.open){result.hidden=true;status.textContent='Jämförelsen kunde inte verifieras.';}}
 }
 open.addEventListener('click',()=>{if(!current)return;select.value=String(year-1);dialog.showModal();doc.body.classList.add('municipal-comparison-open');show();});
 select.addEventListener('change',show);retry.addEventListener('click',show);
 el('comparison-close').addEventListener('click',()=>dialog.close());
 dialog.addEventListener('close',()=>{cancel();doc.body.classList.remove('municipal-comparison-open');open.focus();});
 dialog.addEventListener('click',event=>{if(event.target!==dialog)return;const box=dialog.getBoundingClientRect();if(event.clientX<box.left||event.clientX>box.right||event.clientY<box.top||event.clientY>box.bottom)dialog.close();});
 return {update,destroy(){cancel();if(dialog.open)dialog.close();}};
}
return {MIN_YEAR,bounds,midnight,verifyYear,embedded,loadYear,compare,curve,mount};
});
