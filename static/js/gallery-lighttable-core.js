/* Layout and transition support for the group-aware port of hakankarlsson.se's
 * actual homepage (Squarespace .hk-show v7, read 2026-10-19).
 * gridRowMetrics and its equal-row-width equation come from that live source.
 * A note is an indivisible unit in the board, replacements and large-view deck. */
(function(root){
'use strict';
function randomInt(n){if(n<=1)return 0;const a=new Uint32Array(1),limit=4294967296-4294967296%n;do{crypto.getRandomValues(a);}while(a[0]>=limit);return a[0]%n;}
function shuffled(values,pick=randomInt){const a=values.slice();for(let i=a.length-1;i>0;i--){const j=pick(i+1);[a[i],a[j]]=[a[j],a[i]];}return a;}
function rowMetrics(rows,width,height,gap,pad){
 if(!rows.length)return [];
 const sums=rows.map(r=>r.reduce((a,b)=>a+b,0));
 const availableW=Math.max(1,width-pad),availableH=Math.max(1,height-pad-gap*(rows.length-1));
 const reciprocal=sums.reduce((n,s)=>n+1/s,0),gapWeight=rows.reduce((n,r,j)=>n+gap*(r.length-1)/sums[j],0);
 const rowWidth=Math.min(availableW,(availableH+gapWeight)/reciprocal);
 return rows.map((r,j)=>{const h=Math.max(1,(rowWidth-gap*(r.length-1))/sums[j]);return {width:rowWidth,height:h,widths:r.map(ratio=>ratio*h)};});
}
function gridRowMetrics(ratios,cols,width,height,gap,pad){
 const rows=[];for(let offset=0;offset<ratios.length;offset+=cols)rows.push(ratios.slice(offset,offset+cols).map(r=>Number.isFinite(r)&&r>0?r:1.5));
 return rowMetrics(rows,width,height,gap,pad);
}
function layout(groups,width,height){
 const pictures=groups.flatMap(g=>g.images),n=pictures.length;
 const cols=Math.max(2,Math.min(8,Math.floor(width/(width<540?95:180))));
 const gap=width<768?8:10,pad=width<768?8:12;
 const mean=pictures.reduce((a,p)=>a+p.ratio,0)/Math.max(1,n)||1.5;
 const estimated=Math.max(24,(width-pad-gap*(cols-1))/(cols*mean));
 const rows=Math.max(1,Math.min(Math.ceil(n/cols),Math.round((height-pad+gap)/(estimated+gap))));
 return {count:Math.min(n,Math.max(1,n-4),Math.max(5,cols*rows)),cols,gap,pad};
}
function boardGeometry(groups,cols,width,height,gap=10,pad=12){
 const rows=[],order=new Map(groups.map((g,i)=>[g.id,i]));
 // Pack complete groups before positioning; a greedy source-order wrap wastes
 // a full desktop row whenever a multi-image note reaches a row boundary.
 for(const g of groups.slice().sort((a,b)=>b.images.length-a.images.length)){
  const row=rows.find(r=>r.reduce((n,x)=>n+x.images.length,0)+g.images.length<=cols);
  if(row)row.push(g);else rows.push([g]);
 }
 rows.forEach(r=>r.sort((a,b)=>order.get(a.id)-order.get(b.id)));
 rows.sort((a,b)=>Math.min(...a.map(g=>order.get(g.id)))-Math.min(...b.map(g=>order.get(g.id))));
 // Avoid an oversized final row while keeping every note indivisible.
 const last=rows[rows.length-1],minimum=Math.ceil(cols/2),size=r=>r.reduce((n,g)=>n+g.images.length,0);
 if(last)for(let j=rows.length-2;j>=0&&size(last)<minimum;j--){
  for(let k=rows[j].length-1;k>=0&&size(last)<minimum;k--){const g=rows[j][k];if(size(rows[j])-g.images.length>=minimum&&size(last)+g.images.length<=cols){rows[j].splice(k,1);last.unshift(g);}}
 }
 const metrics=rowMetrics(rows.map(r=>r.flatMap(g=>g.images.map(p=>p.ratio))),width,height,gap,pad);
 const total=metrics.reduce((s,r)=>s+r.height,0)+gap*Math.max(0,rows.length-1);
 const result=[];let y=(height-total)/2;
 rows.forEach((r,j)=>{const m=metrics[j];let x=(width-m.width)/2,k=0;r.forEach(g=>{
  const members=g.images.map(p=>({id:p.id,width:m.widths[k++],height:m.height}));
  const w=members.reduce((s,p)=>s+p.width,0)+gap*(members.length-1);
  result.push({id:g.id,x,y,width:w,height:m.height,members});x+=w+gap;
 });y+=m.height+gap;});return result;
}
function fit(ratios,width,height,caption=66,gap=18){
 if(!ratios.length)return [];
 const safe=ratios.map(r=>Number.isFinite(r)&&r>0?r:1),minWidth=Math.min(130,width);let best=null;
 function consider(rows){
  if(rows.some(r=>r.length*minWidth+(r.length-1)*gap>width))return;
  const available=height-rows.length*caption-(rows.length-1)*gap;if(available<=0)return;
  const maxima=rows.map(r=>{let lo=0,hi=height;for(let k=0;k<35;k++){const mid=(lo+hi)/2,w=r.reduce((n,i)=>n+Math.max(minWidth,safe[i]*mid),0)+gap*(r.length-1);if(w<=width)lo=mid;else hi=mid;}return lo;});
  // Equal-height rows keep one portrait from taking all the vertical space.
  let lo=0,hi=height;for(let k=0;k<35;k++){const mid=(lo+hi)/2;if(maxima.reduce((n,h)=>n+Math.min(h,mid),0)<=available)lo=mid;else hi=mid;}
  const hs=maxima.map(h=>Math.min(h,lo));
  const tiles=[];let y=(height-hs.reduce((a,b)=>a+b,0)-rows.length*caption-(rows.length-1)*gap)/2;
  rows.forEach((r,j)=>{const widths=r.map(i=>Math.max(minWidth,safe[i]*hs[j])),rw=widths.reduce((a,b)=>a+b,0)+gap*(r.length-1);let x=(width-rw)/2;
   r.forEach((i,k)=>{tiles[i]={x,y,width:widths[k],height:hs[j],imageWidth:safe[i]*hs[j],caption};x+=widths[k]+gap;});y+=hs[j]+caption+gap;
  });
  const score=tiles.reduce((n,t)=>n+t.imageWidth*t.height,0);if(!best||score>best.score)best={score,tiles};
 }
 function split(offset,rows){if(offset===safe.length){consider(rows);return;}for(let n=1;n<=Math.min(6,safe.length-offset);n++)split(offset+n,[...rows,Array.from({length:n},(_,i)=>offset+i)]);}
 if(safe.length<=8)split(0,[]);else for(let cols=1;cols<=6;cols++){const rows=[];for(let i=0;i<safe.length;i+=cols)rows.push(safe.slice(i,i+cols).map((_,k)=>i+k));consider(rows);}
 return best?best.tiles:[];
}
function initialBoard(groups,count,target,pick=randomInt){
 const result=shuffled(groups,pick),at=result.findIndex(g=>g.id===target);
 if(at>0)[result[0],result[at]]=[result[at],result[0]];
 let n=0;return result.filter(g=>{if(n>=count)return false;n+=g.images.length;return true;});
}
function replacementPlan(board,groups,target,seen=new Set(),pick=randomInt,desired=board.reduce((n,g)=>n+g.images.length,0)){
 const next=board.slice(),changes=[],used=new Set();
 const targetGroup=groups.find(g=>g.id===target);
 const targetSlot=next.findIndex(g=>g.id===target);if(targetSlot>=0)used.add(targetSlot);
 function insert(g){
  const slots=shuffled(next.map((_,i)=>i).filter(i=>!used.has(i)),pick).sort((a,b)=>Math.abs(next[a].images.length-g.images.length)-Math.abs(next[b].images.length-g.images.length));
  if(!slots.length)return;const slot=slots[0];used.add(slot);changes.push({slot,from:next[slot],to:g});next[slot]=g;
 }
 if(targetGroup&&!next.some(g=>g.id===target))insert(targetGroup);
 const limit=3+pick(2);
 while(changes.length<limit&&used.size<next.length){
  const candidates=shuffled(groups.filter(g=>!next.some(b=>b.id===g.id)&&!changes.some(c=>c.from.id===g.id)),pick);
  const slots=shuffled(next.map((_,i)=>i).filter(i=>!used.has(i)),pick);
  const total=next.reduce((n,g)=>n+g.images.length,0);let best=null;
  // Keep thumbnail density stable across differently sized note groups.
  // Large-view fairness is independently guaranteed by createDeck.
  for(const g of candidates)for(const slot of slots){
   const score=Math.abs(total-next[slot].images.length+g.images.length-desired)*100+Number(seen.has(g.id));
   if(!best||score<best.score)best={g,slot,score};
  }
  if(!best)break;
  used.add(best.slot);changes.push({slot:best.slot,from:next[best.slot],to:best.g});next[best.slot]=best.g;
 }
 return changes;
}
function createDeck(ids,pick=randomInt){
 const unique=[...new Set(ids)];let remaining=[],last=null;
 return {next(){if(!remaining.length){remaining=shuffled(unique,pick);if(remaining.length>1&&remaining[0]===last)[remaining[0],remaining[1]]=[remaining[1],remaining[0]];}return remaining[0]??null;},
 complete(id){remaining=remaining.filter(x=>x!==id);last=id;},
 remaining(){return remaining.slice();}};
}
const api={randomInt,shuffled,gridRowMetrics,layout,boardGeometry,fit,initialBoard,replacementPlan,createDeck};
if(typeof module==='object'&&module.exports)module.exports=api;else root.AstorpLighttable=api;
})(typeof globalThis==='object'?globalThis:this);
