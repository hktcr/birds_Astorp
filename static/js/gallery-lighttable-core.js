/* Group-safe light-table geometry. Based on hakankarlsson.se gridRowMetrics,
 * inspected 2026-10-19. Rows keep natural ratios and equal outer widths. */
(function (root) {
  'use strict';
  function randomInt(n) {
    if (n <= 1) return 0;
    const a = new Uint32Array(1), limit = 4294967296 - 4294967296 % n;
    do { crypto.getRandomValues(a); } while (a[0] >= limit);
    return a[0] % n;
  }
  function shuffled(values, pick = randomInt) {
    const a = values.slice();
    for (let i = a.length - 1; i > 0; i--) { const j = pick(i + 1); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  }
  function fit(ratios, width, height, caption = 88, gap = 18) {
    if (!ratios.length) return [];
    const safe = ratios.map(r => Number.isFinite(r) && r > 0 ? r : 1);
    let best = null;
    function consider(rows) {
      const sums = rows.map(row => row.reduce((n,i) => n + safe[i], 0));
      const available = Math.max(30, height - rows.length * caption - (rows.length - 1) * gap);
      const rowWidth = Math.max(20, Math.min(width, (available + rows.reduce((n,row,j) => n + gap*(row.length-1)/sums[j],0)) / sums.reduce((n,s) => n+1/s,0)));
      const heights = rows.map((row,j) => Math.max(1,(rowWidth-gap*(row.length-1))/sums[j]));
      const tiles = []; let y = (height - heights.reduce((a,b)=>a+b,0) - rows.length*caption - (rows.length-1)*gap)/2;
      rows.forEach((row,j) => { let x=(width-rowWidth)/2; row.forEach(i=>{tiles[i]={x,y,width:safe[i]*heights[j],height:heights[j],caption}; x+=safe[i]*heights[j]+gap;});y+=heights[j]+caption+gap; });
      const area=tiles.reduce((n,t)=>n+t.width*t.height,0);
      const narrow=tiles.reduce((n,t)=>n+Math.max(0,Math.min(140,width*.35)-t.width)**2,0);
      const score=area-narrow*40;
      if (!best || score>best.score) best={score,tiles};
    }
    function split(offset,rows) {
      if(offset===safe.length){consider(rows);return;}
      for(let count=1;count<=Math.min(6,safe.length-offset);count++) split(offset+count,[...rows,Array.from({length:count},(_,i)=>offset+i)]);
    }
    split(0,[]); return best.tiles;
  }
  function pack(groups,width,height) {
    const pages=[]; let page=[];
    const max=width<600?3:width<900?4:6;
    for(const group of groups) {
      const combined=[...page,group]; const images=combined.flatMap(g=>g.images);
      const tiles=fit(images.map(p=>p.ratio),width,height,width<600?120:110,width<600?12:18);
      const fits=images.length<=max && tiles.every(t=>t.width>=(width<600?115:105)&&t.height>=(width<600?65:105));
      // The first group ALWAYS fits a page, however large. Never reject or skip it.
      if(page.length&&!fits){pages.push(page);page=[group];} else page=combined;
    }
    if(page.length)pages.push(page);return pages;
  }
  const api={randomInt,shuffled,fit,pack};
  if(typeof module==='object'&&module.exports)module.exports=api;else root.AstorpLighttable=api;
})(typeof globalThis==='object'?globalThis:this);
