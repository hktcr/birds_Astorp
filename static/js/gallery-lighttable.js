/* Group-aware gallery. The existing overview, slideshow and photo map remain intact.
 * Transition timings, emphasis and zoom easing reused from hakankarlsson.se. */
(function () {
  'use strict';
  document.addEventListener('DOMContentLoaded', () => {
    const root=document.getElementById('lighttable'); if(!root)return;
    const core=window.AstorpLighttable, stage=document.getElementById('lt-stage');
    const status=document.getElementById('lt-status'), dialog=document.getElementById('lt-dialog');
    const detail=document.getElementById('lt-detail'), source=document.getElementById('lt-source');
    const random=document.getElementById('lt-random'), chronological=document.getElementById('lt-chronological');
    const pause=document.getElementById('lt-pause'), prev=document.getElementById('lt-prev'), next=document.getElementById('lt-next');
    const species=document.getElementById('species-filter'), month=document.getElementById('month-filter');
    const reduced=matchMedia('(prefers-reduced-motion: reduce)');
    const PHOTO_MS=9000, FADE_MS=450, CHOSEN_MS=1100, ZOOM_MS=1100;
    const groups=new Map();
    for(const item of document.querySelectorAll('#gallery-grid > .gallery-item')) {
      let record;try{record=JSON.parse(item.dataset.review);}catch{continue;}
      if(!record?.id)continue;
      const key=item.getAttribute('href');
      const chronologyDate=record.sort_date.length===10?record.sort_date:record.date;
      if(!groups.has(key))groups.set(key,{id:key,title:record.display_title||record.title,images:[],date:chronologyDate});
      const group=groups.get(key);group.date=group.date<record.sort_date?group.date:chronologyDate;
      group.images.push({...record,ratio:record.width/record.height,species:item.dataset.species.split(','),month:item.dataset.month,group:key});
    }
    let mode='random',paused=reduced.matches,pages=[],cursor=0,run=0,timer,selected=[],ordered=[],trigger=null,detailGroup=null;
    const loads=new Map(),animations=new Set(),waits=new Set();
    function cancel() {
      clearTimeout(timer);run++;
      for(const w of waits){clearTimeout(w.id);w.resolve(false);}waits.clear();
      for(const a of animations)a.cancel();animations.clear();
      stage.style.opacity='';root.dataset.phase='idle';
      stage.querySelectorAll('.lt-glance,.lt-chosen').forEach(e=>e.classList.remove('lt-glance','lt-chosen'));
    }
    function wait(ms,token){return new Promise(resolve=>{const w={resolve,id:setTimeout(()=>{waits.delete(w);resolve(token===run);},ms)};waits.add(w);});}
    async function animate(el,frames,options,token){
      if(reduced.matches)return token===run;
      const a=el.animate(frames,{...options,fill:'forwards'});animations.add(a);
      const ok=await wait(options.duration,token);a.cancel();animations.delete(a);return ok;
    }
    function ready(src){
      if(loads.has(src))return loads.get(src);
      const result=new Promise(resolve=>{const im=new Image();let done=false;const timeout=setTimeout(()=>finish(false),12000);function finish(ok){if(done)return;done=true;clearTimeout(timeout);resolve(ok);}im.onload=()=>finish(true);im.onerror=()=>finish(false);im.src=src;if(im.complete&&im.naturalWidth)finish(true);});
      loads.set(src,result);result.then(ok=>{if(!ok)loads.delete(src);});return result;
    }
    function eligible(){return [...groups.values()].filter(g=>g.images.some(p=>(!species.value||p.species.includes(species.value.toLowerCase()))&&(!month.value||p.month===month.value)));}
    function bounds(target){return {width:Math.max(100,target.clientWidth),height:target.clientHeight};}
    function plan(order){const b=bounds(stage);return core.pack(order,b.width,b.width<600?520:b.height);}
    function controls(){
      random.setAttribute('aria-pressed',String(mode==='random'));chronological.setAttribute('aria-pressed',String(mode==='chronological'));
      document.getElementById('lt-board').hidden=mode!=='random';pause.hidden=mode!=='random';pause.textContent=paused?'Spela':'Pausa';pause.setAttribute('aria-pressed',String(paused));
      prev.disabled=cursor<=0;next.disabled=!pages.length||(mode==='chronological'&&cursor>=pages.length-1);
      root.dataset.mode=mode;root.dataset.page=String(cursor);root.dataset.pages=String(pages.length);
    }
    function schedule(){clearTimeout(timer);if(mode==='random'&&!paused&&!document.hidden&&!dialog.open&&!document.getElementById('gallery-view').classList.contains('hidden')&&pages.length>1)timer=setTimeout(()=>navigate(1,true),PHOTO_MS);}
    function cards(target,scene,full=false){
      const fragment=document.createDocumentFragment();
      for(const group of scene) for(const p of group.images){
        const figure=document.createElement('figure');figure.className='lt-tile';figure.dataset.imageId=p.id;figure.dataset.groupId=group.id;figure.dataset.ratio=p.ratio;
        const button=document.createElement(full?'div':'button');if(!full){button.type='button';button.setAttribute('aria-label','Visa notisens '+group.images.length+' '+(group.images.length===1?'bild':'bilder')+': '+p.caption);}button.className='lt-picture';
        const img=document.createElement('img');img.src=full?p.url:(p.thumb||p.url);img.alt=p.caption;img.width=p.width;img.height=p.height;img.decoding='async';button.append(img);
        const caption=document.createElement('figcaption');caption.className='lt-caption';
        const date=document.createElement('time');date.dateTime=p.sort_date;date.textContent=p.date_label;date.title=p.date_source;
        const link=document.createElement('a');link.href=group.id;link.title='Läs notisen: '+group.title;
        const em=document.createElement('em');em.textContent=p.caption;link.append(em);caption.append(date,link);figure.append(button,caption);fragment.append(figure);
        if(!full)button.addEventListener('click',()=>openGroup(group,button));
      }
      target.replaceChildren(fragment);refit(target);
    }
    function refit(target){
      const figures=[...target.children];
      // On a narrow phone a large, complete group needs a taller single hanging.
      // Preserve readable captions and image area instead of shrinking or dropping members.
      target.style.minHeight=target.clientWidth<600&&figures.length>=3?(figures.length*200)+'px':'';
      const b=bounds(target),small=b.width<600;
      const layout=core.fit(figures.map(f=>Number(f.dataset.ratio)),b.width,b.height,small?120:110,small?12:18);
      figures.forEach((f,i)=>{const t=layout[i];f.style.left=t.x+'px';f.style.top=t.y+'px';f.style.width=t.width+'px';f.querySelector('.lt-picture').style.height=t.height+'px';});
      if(target===stage)lastSize=b.width+'x'+b.height;
    }
    async function render(withMotion=false){
      cancel();const token=run,scene=pages[cursor]||[];controls();
      if(!scene.length){selected=[];stage.replaceChildren();status.textContent='Inga bilder i urvalet.';return;}
      status.textContent='Laddar hängningen…';root.dataset.phase='loading';
      const ok=await Promise.all(scene.flatMap(g=>g.images).map(p=>ready(p.thumb||p.url)));
      if(token!==run)return;
      if(ok.some(v=>!v)){root.dataset.phase='error';status.textContent='En bild kunde inte laddas. Föregående hela hängning ligger kvar. Välj läge igen för att försöka på nytt.';return;}
      if(withMotion&&selected.length&&!await animate(stage,[{opacity:1},{opacity:0}],{duration:FADE_MS,easing:'ease'},token))return;
      stage.style.opacity=withMotion&&!reduced.matches?'0':'';
      cards(stage,scene);selected=scene;root.dataset.groups=scene.map(g=>g.id).join('|');
      if(withMotion&&!reduced.matches){
        if(!await wait(FADE_MS,token))return;
        if(!await animate(stage,[{opacity:0},{opacity:1}],{duration:FADE_MS,easing:'ease'},token))return;
      }
      stage.style.opacity='';root.dataset.phase='idle';
      const count=scene.reduce((n,g)=>n+g.images.length,0);
      status.textContent=count+' '+(count===1?'bild':'bilder')+' · '+scene.length+' '+(scene.length===1?'notis':'notiser')+(mode==='chronological'?' · '+(cursor+1)+' / '+pages.length:'');
      if(withMotion&&!reduced.matches&&mode==='random')await focusCycle(scene,token);
      schedule();
    }
    async function focusCycle(scene,token){
      const chosen=scene[core.randomInt(scene.length)];
      root.dataset.phase='glance';
      const figures=[...stage.children];
      const mark=(group,name)=>{figures.forEach(f=>{f.classList.remove('lt-glance','lt-chosen');if(f.dataset.groupId===group.id)f.classList.add(name);});};
      for(const group of core.shuffled(scene.filter(g=>g!==chosen)).slice(0,3)){mark(group,'lt-glance');if(!await wait(500+core.randomInt(201),token))return;}
      mark(chosen,'lt-chosen');if(!await wait(CHOSEN_MS,token))return;
      // The original zoom promotes one photograph; here its entire source group flies together.
      const members=figures.filter(f=>f.dataset.groupId===chosen.id);
      const rects=members.map(f=>f.getBoundingClientRect()),base=stage.getBoundingClientRect();
      const x=Math.min(...rects.map(r=>r.left))-base.left,y=Math.min(...rects.map(r=>r.top))-base.top;
      const width=Math.max(...rects.map(r=>r.right))-base.left-x;
      const overlay=document.createElement('div');overlay.className='lt-focus';stage.append(overlay);
      cards(overlay,[chosen]);root.dataset.phase='zoom';
      const scale=width/base.width;
      const ok=await animate(overlay,[{transformOrigin:'0 0',transform:'translate('+x+'px,'+y+'px) scale('+scale+')',opacity:0},{transformOrigin:'0 0',transform:'translate(0,0) scale(1)',opacity:1}],{duration:ZOOM_MS,easing:'cubic-bezier(.22,.61,.36,1)'},token);
      if(!ok){overlay.remove();return;}
      figures.forEach(f=>f.remove());root.dataset.phase='photo';
      status.textContent=chosen.images.length+' '+(chosen.images.length===1?'bild':'bilder')+' · '+chosen.title;
    }
    function resetMode(value){
      mode=value;ordered=eligible();if(mode==='random')ordered=core.shuffled(ordered);else ordered.sort((a,b)=>a.date.localeCompare(b.date)||a.id.localeCompare(b.id));
      pages=plan(ordered);cursor=0;paused=mode==='chronological'||reduced.matches;render(false);
    }
    function navigate(delta,automatic=false){
      if(!automatic)paused=true;
      if(delta>0&&cursor===pages.length-1&&mode==='random'){
        const last=new Set((pages[cursor]||[]).map(g=>g.id));ordered=core.shuffled(eligible());
        // Avoid immediately repeating the final group at the deck boundary when possible.
        const first=ordered.findIndex(g=>!last.has(g.id));if(first>0)[ordered[0],ordered[first]]=[ordered[first],ordered[0]];
        pages=plan(ordered);cursor=0;
      }else cursor=Math.max(0,Math.min(pages.length-1,cursor+delta));
      render(automatic);
    }
    async function openGroup(group,button){
      cancel();const token=run;trigger=button;detailGroup=group;
      const loaded=await Promise.all(group.images.map(p=>ready(p.url)));
      if(token!==run)return;
      if(loaded.some(ok=>!ok)){status.textContent='Originalbilden kunde inte laddas. Hela hängningen ligger kvar.';return;}
      const figures=[...stage.querySelectorAll('.lt-tile')].filter(f=>f.dataset.groupId===group.id);
      if(!reduced.matches){
        root.dataset.phase='glance';figures.forEach(f=>f.classList.add('lt-glance'));
        if(!await wait(550,token))return;
        figures.forEach(f=>{f.classList.remove('lt-glance');f.classList.add('lt-chosen');});
        if(!await wait(CHOSEN_MS,token))return;
      }
      const rect=button.getBoundingClientRect();
      cards(detail,[group],true);source.href=group.id;source.textContent=group.title;
      dialog.showModal();refit(detail);document.getElementById('lt-close').focus();
      const dest=detail.getBoundingClientRect(),scale=Math.min(rect.width/dest.width,rect.height/dest.height);
      await animate(detail,[{transformOrigin:'0 0',transform:'translate('+(rect.left-dest.left)+'px,'+(rect.top-dest.top)+'px) scale('+scale+')',opacity:.7},{transformOrigin:'0 0',transform:'translate(0,0) scale(1)',opacity:1}],{duration:ZOOM_MS,easing:'cubic-bezier(.22,.61,.36,1)'},token);
      root.dataset.phase='idle';figures.forEach(f=>f.classList.remove('lt-chosen','lt-glance'));
    }
    random.addEventListener('click',()=>resetMode('random'));chronological.addEventListener('click',()=>resetMode('chronological'));
    document.getElementById('lt-board').addEventListener('click',()=>{paused=true;render(false);});
    pause.addEventListener('click',()=>{paused=!paused;render(false);});
    prev.addEventListener('click',()=>navigate(-1));next.addEventListener('click',()=>navigate(1));
    document.getElementById('lt-close').addEventListener('click',()=>dialog.close());
    dialog.addEventListener('close',()=>{cancel();detailGroup=null;trigger?.focus();schedule();});
    root.addEventListener('keydown',e=>{if(e.key==='ArrowRight'||e.key==='ArrowLeft'){e.preventDefault();navigate(e.key==='ArrowRight'?1:-1);}});
    species.addEventListener('change',()=>resetMode(mode));month.addEventListener('change',()=>resetMode(mode));
    const oldReset=window.resetFilters;window.resetFilters=()=>{oldReset?.();resetMode(mode);};
    document.querySelector('.lt-legacy')?.addEventListener('toggle',()=>window.dispatchEvent(new Event('resize')));
    new MutationObserver(()=>{if(document.getElementById('gallery-view').classList.contains('hidden'))cancel();else render(false);}).observe(document.getElementById('gallery-view'),{attributes:true,attributeFilter:['class']});
    document.addEventListener('visibilitychange',()=>{if(document.hidden)cancel();else render(false);});
    reduced.addEventListener('change',()=>{if(reduced.matches)paused=true;render(false);});
    let resizeFrame,lastSize='';
    const observer=new ResizeObserver(()=>{
      const b=bounds(stage),size=b.width+'x'+b.height;if(size===lastSize||b.width<=100)return;lastSize=size;
      cancelAnimationFrame(resizeFrame);resizeFrame=requestAnimationFrame(()=>{
        const anchor=selected[0]?.id;pages=plan(ordered);const found=pages.findIndex(page=>page.some(g=>g.id===anchor));cursor=Math.max(0,found);render(false);
        if(dialog.open&&detailGroup)refit(detail);
      });
    });observer.observe(stage);
    resetMode('random');
  });
})();
