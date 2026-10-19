/* Group-aware port of the live hakankarlsson.se homepage .hk-show v7.
 * Same scene, large-view start, sequential replacements, glance and flight.
 * All image/source metadata comes from the existing verified gallery records. */
(function(){
'use strict';
document.addEventListener('DOMContentLoaded',()=>{
 const root=document.getElementById('lighttable');if(!root)return;
 const core=window.AstorpLighttable,stage=document.getElementById('lt-stage');
 const large=document.getElementById('lt-large'),grid=document.getElementById('lt-grid'),status=document.getElementById('lt-status');
 const random=document.getElementById('lt-random'),chronological=document.getElementById('lt-chronological');
 const prev=document.getElementById('lt-prev'),next=document.getElementById('lt-next'),pause=document.getElementById('lt-pause'),boardButton=document.getElementById('lt-board');
 const options=document.getElementById('lt-options'),tools=document.getElementById('lt-tools');
 const species=document.getElementById('species-filter'),month=document.getElementById('month-filter'),view=document.getElementById('gallery-view');
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 const PHOTO_MS=9000,FIRST_PHOTO_MS=2500,GRID_MS=450,CHOSEN_MS=1100,ZOOM_MS=1100;
 const groups=new Map();
 for(const item of document.querySelectorAll('#gallery-grid > .gallery-item')){
  let p;try{p=JSON.parse(item.dataset.review);}catch{continue;}if(!p?.id)continue;
  const id=item.getAttribute('href'),date=p.sort_date.length===10?p.sort_date:p.date;
  if(!groups.has(id))groups.set(id,{id,title:p.display_title||p.title,date,images:[]});
  const g=groups.get(id);if(date<g.date)g.date=date;
  g.images.push({...p,ratio:p.width/p.height,species:item.dataset.species.split(','),month:item.dataset.month});
 }
 let mode='random',paused=reduced.matches,gridMode=false,current=null,requested=null,cursor=0,eligible=[],deck=null;
 let board=[],gridCols=1,history=[],historyPos=-1,firstView=true,token=0,timer,flight=null,lastSize='',resizeFrame;
 const pending=new Set(),animations=new Set(),loads=new Map(),thumbnailSeen=new Set();
 function wait(ms,run){return new Promise(resolve=>{const p={resolve,id:setTimeout(()=>{pending.delete(p);resolve(run===token);},ms)};pending.add(p);});}
 function animate(el,frames,opts){if(reduced.matches)return;const a=el.animate(frames,{...opts,fill:'forwards'});animations.add(a);return a;}
 function cancel(){
  clearTimeout(timer);token++;for(const p of pending){clearTimeout(p.id);p.resolve(false);}pending.clear();
  for(const a of animations)a.cancel();animations.clear();
  if(flight)flight.remove();flight=null;grid.classList.remove('lt-reflow');grid.style.opacity='';
  grid.querySelectorAll('.lt-unit').forEach(b=>{b.style.opacity='';b.classList.remove('lt-glance','lt-chosen');delete b.dataset.swapPhase;});
 }
 function ready(src){
  if(loads.has(src))return loads.get(src);
  const result=new Promise(resolve=>{const im=new Image();let done=false;const timeout=setTimeout(()=>finish(false),15000);function finish(ok){if(done)return;done=true;clearTimeout(timeout);resolve(ok);}im.onload=()=>{if(im.decode)im.decode().then(()=>finish(true),()=>finish(false));else finish(true);};im.onerror=()=>finish(false);im.src=src;if(im.complete&&im.naturalWidth)im.onload();});
  loads.set(src,result);result.then(ok=>{if(!ok)loads.delete(src);});return result;
 }
 async function readyGroup(g,thumb=false){
  return (await Promise.all(g.images.map(async p=>{if(thumb&&p.thumb&&await ready(p.thumb)){p.gridSrc=p.thumb;return true;}const ok=await ready(p.url);if(thumb&&ok)p.gridSrc=p.url;return ok;}))).every(Boolean);
 }
 function error(message){root.dataset.phase='error';status.textContent=message;}
 function measure(){
  // Like the source's header measurement; use this site's actual preceding content.
  const top=stage.getBoundingClientRect().top+scrollY;
  root.style.setProperty('--lt-top',top+'px');
  const small=stage.clientWidth<600,gap=small?12:18,caption=small?88:100;
  const columns=Math.max(1,Math.min(6,Math.floor((stage.clientWidth+gap)/(130+gap))));
  const rows=Math.ceil(Math.max(1,...eligible.map(g=>g.images.length))/columns);
  root.style.setProperty('--lt-min-stage',Math.max(220,rows*(caption+90)+(rows-1)*gap)+'px');
 }
 function bounds(){return {width:Math.max(1,stage.clientWidth),height:Math.max(1,stage.clientHeight)};}
 function controls(){
  random.setAttribute('aria-pressed',String(mode==='random'));chronological.setAttribute('aria-pressed',String(mode==='chronological'));
  prev.hidden=next.hidden=mode!=='chronological';prev.disabled=cursor<=0;next.disabled=!eligible.length||cursor>=eligible.length-1;
  pause.hidden=mode!=='random';pause.textContent=paused?'Spela':'Pausa';pause.setAttribute('aria-pressed',String(paused));
  boardButton.textContent=gridMode?'Stor bild':'Ljusbord';
  root.dataset.mode=mode;root.dataset.page=String(mode==='chronological'?cursor:historyPos);root.dataset.pages=String(eligible.length);
  root.dataset.group=current?.id||'';root.dataset.paused=String(paused);
 }
 function gridState(on){
  gridMode=on;root.classList.toggle('lt-contact',on);grid.inert=!on;large.inert=on;
  grid.setAttribute('aria-hidden',String(!on));large.setAttribute('aria-hidden',String(on));controls();
 }
 function settle(){cancel();requested=null;gridState(false);root.dataset.phase=current?'photo':'loading';}
 function schedule(){
  clearTimeout(timer);if(mode==='random'&&!paused&&!document.hidden&&!view.classList.contains('hidden')&&eligible.length>1&&!gridMode){
   timer=setTimeout(cycle,firstView?FIRST_PHOTO_MS:PHOTO_MS);firstView=false;
  }
 }
 function largeCards(target,g){
  const frag=document.createDocumentFragment();
  for(const p of g.images){
   const figure=document.createElement('figure');figure.className='lt-figure';figure.dataset.imageId=p.id;figure.dataset.groupId=g.id;figure.dataset.ratio=p.ratio;
   const button=document.createElement('button');button.type='button';button.className='lt-picture';button.setAttribute('aria-label','Till ljusbordet: '+p.caption);
   const img=document.createElement('img');img.src=p.url;img.alt=p.caption;img.width=p.width;img.height=p.height;img.decoding='sync';button.append(img);
   const caption=document.createElement('figcaption');caption.className='lt-caption';
   const date=document.createElement('time');date.dateTime=p.sort_date;date.textContent=p.date_label;date.title=p.date_source;
   const link=document.createElement('a');link.href=g.id;link.title='Läs notisen: '+g.title;const em=document.createElement('em');em.textContent=p.caption;link.append(em);caption.append(date,link);
   figure.append(button,caption);frag.append(figure);button.addEventListener('click',()=>showBoard());
  }
  target.replaceChildren(frag);fitLarge(target);
 }
 function fitLarge(target){
  const b=bounds(),figures=[...target.children],small=b.width<600;
  const caption=small?88:100,gap=small?12:18;
  const tiles=core.fit(figures.map(f=>Number(f.dataset.ratio)),b.width,b.height,caption,gap);
  if(tiles.length!==figures.length){root.style.setProperty('--lt-min-stage',Math.max(b.height,figures.length*(caption+90))+'px');return;}
  figures.forEach((f,i)=>{const t=tiles[i];f.style.left=t.x+'px';f.style.top=t.y+'px';f.style.width=t.width+'px';f.querySelector('.lt-picture').style.height=t.height+'px';const im=f.querySelector('img');im.style.width=t.imageWidth+'px';im.style.height=t.height+'px';im.style.margin='0 auto';});
 }
 function gridUnit(g){
  const b=document.createElement('button');b.type='button';b.className='lt-unit';b.dataset.groupId=g.id;
  b.setAttribute('aria-label','Visa '+g.images.length+' '+(g.images.length===1?'bild':'bilder')+' tillsammans: '+g.title);
  b.title=g.images.map(p=>p.date_label+' — '+p.caption).join('\n');b.dataset.ready='false';
  const imageLoads=[];
  for(const p of g.images){const im=document.createElement('img');im.alt=p.caption;im.dataset.imageId=p.id;im.width=p.width;im.height=p.height;im.decoding='sync';b.append(im);imageLoads.push(new Promise(resolve=>{let fallback=false;im.onload=()=>resolve(true);im.onerror=()=>{if(!fallback){fallback=true;p.gridSrc=p.url;im.src=p.url;}else resolve(false);};im.src=p.gridSrc||p.thumb||p.url;if(im.complete&&im.naturalWidth)resolve(true);}));}
  Promise.all(imageLoads).then(loaded=>{if(loaded.every(Boolean))b.dataset.ready='true';});
  b.addEventListener('click',()=>{paused=reduced.matches||mode==='chronological';select(g,true);});
  return b;
 }
 function refitGrid(){
  const b=bounds(),plan=core.layout(eligible,b.width,b.height);gridCols=plan.cols;
  const geometry=core.boardGeometry(board,gridCols,b.width,b.height,plan.gap,plan.pad);
  for(const t of geometry){
   const unit=[...grid.children].find(e=>e.dataset.groupId===t.id);if(!unit)continue;
   Object.assign(unit.style,{left:t.x+'px',top:t.y+'px',width:t.width+'px',height:t.height+'px',gap:plan.gap+'px'});
   [...unit.children].forEach((im,i)=>{im.style.width=t.members[i].width+'px';im.style.height=t.height+'px';});
  }
  root.dataset.boardGroups=board.map(g=>g.id).join('|');root.dataset.boardImages=String(board.reduce((n,g)=>n+g.images.length,0));
 }
 function fillGrid(target=current?.id){
  const b=bounds(),plan=core.layout(eligible,b.width,b.height);
  board=core.initialBoard(eligible,plan.count,target);grid.replaceChildren(...board.map(gridUnit));refitGrid();
 }
 async function refreshGrid(target,run){
  if(!board.length)fillGrid(target);
  const b=bounds(),desired=core.layout(eligible,b.width,b.height).count;
  const changes=core.replacementPlan(board,eligible,target,thumbnailSeen,core.randomInt,desired);
  for(const change of changes){
   if(!await readyGroup(change.to,true)||run!==token)return false;
   const old=grid.children[change.slot];if(!old)continue;
   old.dataset.swapPhase='out';const a=animate(old,[{opacity:1},{opacity:0}],{duration:450,easing:'ease'});
   if(!reduced.matches&&!await wait(450,run))return false;
   const replacement=gridUnit(change.to);replacement.style.opacity='0';replacement.dataset.swapPhase='layout';
   old.replaceWith(replacement);if(a){a.cancel();animations.delete(a);}board[change.slot]=change.to;
   grid.classList.add('lt-reflow');refitGrid();
   if(!reduced.matches&&!await wait(450,run))return false;
   grid.classList.remove('lt-reflow');replacement.dataset.swapPhase='in';
   const incoming=animate(replacement,[{opacity:0},{opacity:1}],{duration:450,easing:'ease'});
   if(!reduced.matches&&!await wait(450,run))return false;
   replacement.style.opacity='';if(incoming){incoming.cancel();animations.delete(incoming);}delete replacement.dataset.swapPhase;
  }
  board.forEach(g=>thumbnailSeen.add(g.id));if(eligible.every(g=>thumbnailSeen.has(g.id))){thumbnailSeen.clear();board.forEach(g=>thumbnailSeen.add(g.id));}
  return board.some(g=>g.id===target);
 }
 function mark(id,chosen=false){for(const b of grid.children){b.classList.toggle('lt-glance',b.dataset.groupId===id&&!chosen);b.classList.toggle('lt-chosen',b.dataset.groupId===id&&chosen);}}
 function finish(g,remember=true){
  current=g;requested=null;cursor=eligible.findIndex(x=>x.id===g.id);if(mode==='random')deck.complete(g.id);
  if(remember&&history[historyPos]?.id!==g.id){history=history.slice(0,historyPos+1);history.push(g);historyPos=history.length-1;}
  largeCards(large,g);gridState(false);root.dataset.phase='photo';
  status.textContent=g.images.length+' '+(g.images.length===1?'bild':'bilder')+' · '+g.title+(mode==='chronological'?' · '+(cursor+1)+' / '+eligible.length:'');
  schedule();
 }
 async function zoom(g,run){
  const tile=[...grid.children].find(b=>b.dataset.groupId===g.id);
  if(!tile||reduced.matches){finish(g);return;}
  flight=document.createElement('div');flight.className='lt-flight';flight.setAttribute('aria-hidden','true');flight.inert=true;stage.append(flight);largeCards(flight,g);
  const small=[...tile.querySelectorAll('img')],big=[...flight.querySelectorAll('.lt-picture img')];
  root.dataset.phase='zoom';
  big.forEach((im,i)=>{const a=small[i].getBoundingClientRect(),b=im.getBoundingClientRect();animate(im,[
   {transformOrigin:'0 0',transform:'translate('+(a.left-b.left)+'px,'+(a.top-b.top)+'px) scale('+(a.width/b.width)+')'},
   {transformOrigin:'0 0',transform:'translate(0,0) scale(1)'}
  ],{duration:ZOOM_MS,easing:'cubic-bezier(.22,.61,.36,1)'});});
  tile.style.opacity='0';grid.style.opacity='0';
  if(!await wait(ZOOM_MS,run))return;
  for(const a of animations)a.cancel();animations.clear();tile.style.opacity='';grid.style.opacity='';
  finish(g);flight?.remove();flight=null;mark(null);
 }
 async function select(g,motion=false,remember=true){
  if(!g)return;const fromGrid=gridMode;cancel();const run=token;requested=g;root.dataset.phase='loading';controls();
  if(!await readyGroup(g)||run!==token){if(run===token){settle();error('Notisens bilder kunde inte laddas. Föregående hela grupp ligger kvar. Välj läge för att försöka igen.');}return;}
  if(motion&&fromGrid&&!reduced.matches){mark(g.id,true);root.dataset.phase='chosen';if(await wait(500,run))await zoom(g,run);}
  else finish(g,remember);
 }
 async function cycle(){
  if(mode!=='random'||paused)return;
  const g=groups.get(deck.next());if(!g)return;
  if(reduced.matches){select(g);return;}
  cancel();const run=token;
  if(!await readyGroup(g)||run!==token){if(run===token){error('Nästa hela notisgrupp kunde inte laddas. Försök igen med Spela.');paused=true;controls();}return;}
  gridState(true);root.dataset.phase='grid';
  if(!await refreshGrid(g.id,run)||run!==token){if(run===token){settle();error('Ljusbordets nästa grupp kunde inte laddas. Föregående hela grupp ligger kvar.');}return;}
  if(!await wait(GRID_MS,run))return;
  for(const item of core.shuffled(board.filter(x=>x.id!==g.id)).slice(0,3)){mark(item.id);root.dataset.phase='glance';if(!await wait(500+core.randomInt(201),run))return;}
  mark(g.id,true);root.dataset.phase='chosen';if(await wait(CHOSEN_MS,run))await zoom(g,run);
 }
 async function showBoard(){
  const wasGrid=gridMode;settle();paused=true;const run=token;
  if(!wasGrid){if(!board.length)fillGrid();if(!(await Promise.all(board.map(g=>readyGroup(g,true)))).every(Boolean)){if(run===token)error('En hel grupp i ljusbordet kunde inte laddas. Storbilden ligger kvar.');return;}if(run!==token)return;gridState(true);root.dataset.phase='manual-grid';status.textContent='Ljusbord · '+board.reduce((n,g)=>n+g.images.length,0)+' bilder. Välj en hel notisgrupp.';}
  controls();
 }
 function navigate(delta){
  paused=true;settle();
  if(mode==='chronological'){cursor=Math.max(0,Math.min(eligible.length-1,cursor+delta));select(eligible[cursor]);}
  else if(delta<0&&historyPos>0){historyPos--;select(history[historyPos],false,false);}
  else if(delta>0)select(groups.get(deck.next()));
 }
 function resetMode(value){
  settle();mode=value;paused=value==='chronological'||reduced.matches;firstView=true;
  eligible=[...groups.values()].filter(g=>g.images.some(p=>(!species.value||p.species.includes(species.value.toLowerCase()))&&(!month.value||p.month===month.value)));
  eligible.sort((a,b)=>a.date.localeCompare(b.date)||a.id.localeCompare(b.id));measure();
  deck=core.createDeck(eligible.map(g=>g.id));history=[];historyPos=-1;cursor=0;board=[];thumbnailSeen.clear();current=null;controls();
  if(!eligible.length){large.replaceChildren();grid.replaceChildren();root.dataset.phase='empty';status.textContent='Inga bilder i urvalet.';return;}
  const g=mode==='random'?groups.get(deck.next()):eligible[0];fillGrid(g.id);select(g);
 }
 random.addEventListener('click',()=>resetMode('random'));chronological.addEventListener('click',()=>resetMode('chronological'));
 prev.addEventListener('click',()=>navigate(-1));next.addEventListener('click',()=>navigate(1));
 boardButton.addEventListener('click',showBoard);
 pause.addEventListener('click',()=>{const on=!paused;settle();paused=on;controls();schedule();});
 options.addEventListener('click',()=>{tools.hidden=!tools.hidden;options.setAttribute('aria-expanded',String(!tools.hidden));});
 root.addEventListener('keydown',e=>{
  if(e.key==='Escape'){e.preventDefault();if(gridMode){settle();paused=true;controls();options.focus();}else{tools.hidden=true;options.setAttribute('aria-expanded','false');options.focus();}}
  if(e.key==='ArrowRight'||e.key==='ArrowLeft'){e.preventDefault();navigate(e.key==='ArrowRight'?1:-1);}
 });
 species.addEventListener('change',()=>resetMode(mode));month.addEventListener('change',()=>resetMode(mode));
 const oldReset=window.resetFilters;window.resetFilters=()=>{oldReset?.();resetMode(mode);};
 document.querySelector('.lt-legacy')?.addEventListener('toggle',()=>window.dispatchEvent(new Event('resize')));
 new MutationObserver(()=>{if(view.classList.contains('hidden'))settle();else{measure();refitGrid();fitLarge(large);schedule();}}).observe(view,{attributes:true,attributeFilter:['class']});
 document.addEventListener('visibilitychange',()=>{const waiting=requested;settle();if(waiting)select(waiting);else if(!document.hidden)schedule();});
 reduced.addEventListener('change',()=>{if(reduced.matches){settle();paused=true;controls();}});
 function resize(){
  measure();cancelAnimationFrame(resizeFrame);
  resizeFrame=requestAnimationFrame(()=>{const b=bounds(),size=b.width+'x'+b.height;if(size===lastSize)return;lastSize=size;
   const wasGrid=gridMode,waiting=requested;settle();if(current)fitLarge(large);if(eligible.length)fillGrid(waiting?.id);
   if(waiting){select(waiting);return;}
   if(wasGrid){gridState(true);root.dataset.phase='manual-grid';}schedule();
  });
 }
 window.addEventListener('resize',resize);new ResizeObserver(resize).observe(stage);
 measure();resetMode('random');
});
})();
