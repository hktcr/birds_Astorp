const fs=require('fs'),vm=require('vm'),assert=require('assert');
const source=fs.readFileSync('layouts/galleri/list.html','utf8');
const fn=source.slice(source.indexOf('function getRecencyColor('),source.indexOf('            let activeAge'));
const context={Intl,Date};vm.createContext(context);vm.runInContext(fn,context);
const classify=(s,t='2026-10-24T10:00:00Z')=>context.getRecencyColor(s,new Date(t));
for(const [date,key] of [['2026-10-24','week'],['2026-10-18','week'],['2026-10-17','month'],['2026-09-25','month'],['2026-09-24','quarter'],['2026-07-27','quarter'],['2026-07-26','older'],['2026-10-25','unknown'],['2026-02-30','unknown'],['2026-05','unknown'],['','unknown'],['bogus','unknown']]) assert.equal(classify(date).key,key,date);
assert.equal(classify('2026-10-25','2026-10-24T22:01:00Z').key,'week','Stockholm midnight');
assert.equal(classify('2026-10-24','2026-10-24T00:01:00Z').key,'week','today before noon');
function luminance(hex){return hex.slice(1).match(/../g).map(x=>parseInt(x,16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((a,v,i)=>a+v*[.2126,.7152,.0722][i],0)}
for(const d of ['2026-10-24','2026-10-10','2026-09-01','2026-01-01',''])assert((1.05)/(luminance(classify(d).color)+.05)>=4.5);
assert(!source.includes('däribland tornseglarens arkivfoto'));
assert(source.includes('if or $review.map_position_unknown $review.map_private'));
assert(source.includes('Färgen utgår från sidans datum, inte när fotot togs.'));
assert(source.includes('const radius = 22;'));
assert(source.includes('markerElement.setAttribute(\'tabindex\',\'0\')'));
assert(source.includes("event.key === 'Enter' || event.key === ' '"));
assert(!source.includes('opacity: 0.15 !important'));
assert(source.includes("activeAge === 'all' || ageOf(allPhotoData[i]).key === activeAge"));
assert(source.includes('updateAgeLegend(getMonthIndices())'));
const legend=source.slice(source.indexOf('<section class="photomap-legend"'),source.indexOf('<div class="photomap-container"'));
for(const key of ['all','week','month','quarter','older','unknown'])assert(legend.includes(`data-age="${key}"`) && legend.includes(`data-age-count="${key}"`));
assert(source.includes('populateStrip(filtered);'));
assert(source.includes("'Inga kartbilder har ett siddatum från de senaste 7 dagarna med valda månader.'"));
const baseline=require('child_process').execFileSync('git',['show','HEAD:data/gallery_photos.json']);assert(baseline.equals(fs.readFileSync('data/gallery_photos.json')),'No image metadata changes');
console.log('PASS: Stockholm calendar boundaries, invalid/future dates, contrast >=4.5, visible category/count structure, shared filters, exclusions and unchanged photo metadata. Browser layout/interaction still separate.');
// Execute the actual selection and redraw functions with a small DOM/Leaflet model.
function extract(start,end){const a=source.indexOf(start);assert(a>=0,start);const b=source.indexOf(end,a);assert(b>a,end);return source.slice(a,b).trim()}
const records=[],focuses=[];const element=()=>({classList:{add(){},remove(){}},setAttribute(){},addEventListener(){},focus(){focuses.push(this)}});
const els=new Map();const doc={hidden:false,activeElement:{getAttribute:()=>null},getElementById:id=>{if(!els.has(id))els.set(id,element());return els.get(id)},querySelector:()=>element()};
const map={getZoom:()=>12,project:()=>({distanceTo:()=>100}),fitBounds(){},dragging:{enable:()=>records.push('drag')},doubleClickZoom:{enable:()=>records.push('double')},removeLayer:()=>records.push('remove')};
const ctx={Date,Intl,document:doc,markers:[],allClusterMarkers:[],markerGroup:{clearLayers(){},getBounds:()=>({pad:()=>({})})},map,
 allPhotoData:[],getFilteredIndices:()=>[],getMonthIndices:()=>[],getActiveMonths:()=>new Set([10]),activeAge:'week',ageClock:new Date(),updateAgeLegend(){},
 L:{latLng:()=>({}),circleMarker:coords=>{const e=element();return {on(){},addTo(){},getElement:()=>e,getLatLng:()=>({lat:coords[0],lng:coords[1]}),setStyle(){},bringToFront(){}}},divIcon:x=>x,marker:()=>({addTo(){}})},
 selectionRect:{getBounds:()=>({contains:()=>false})},selectedCluster:null,initialBoundsFit:true,
 applySelection:b=>records.push(['rect',b]),populateStrip:x=>records.push(['strip',x]),clearSelection:()=>records.push('clear'),
 ageOf:()=>({key:'week',code:'7d',label:'Senaste 7 dagarna',color:'#166534'})};
vm.createContext(ctx);vm.runInContext(extract('function applySelection(bounds)',"clearBtn.addEventListener('click'"),ctx);vm.runInContext(extract('function rebuildMarkers()','// Attach listeners to month checkboxes'),ctx);
ctx.clearBtn=element();const rectangle=ctx.selectionRect;ctx.rebuildMarkers();assert.equal(ctx.selectionRect,rectangle);assert(records.some(x=>Array.isArray(x)&&x[0]==='strip'&&Array.isArray(x[1])&&x[1].length===0),'actual area function keeps empty area empty');
ctx.selectionRect=null;ctx.allPhotoData=[{lat:1,lng:1,date:'2026-10-24',locationName:'Testplats'}];ctx.getFilteredIndices=()=>[0];doc.activeElement.getAttribute=()=> '0';ctx.rebuildMarkers();assert.equal(focuses.length,1,'focused photo restored');
ctx.getFilteredIndices=()=>[];ctx.rebuildMarkers();assert.equal(focuses.length,2,'fallback focus when filtered out');
ctx.selectBtn=element();ctx.container=element();ctx.clearBtn=element();ctx.isSelecting=true;ctx.selStart={};ctx.selectionRect={};ctx.selectedCluster={};ctx.getFilteredIndices=()=>[5];ctx.markers=[];ctx.allClusterMarkers=[];
vm.runInContext(extract('function clearSelection()','// Keyboard: Escape clears selection'),ctx);ctx.clearSelection();assert.equal(ctx.isSelecting,false);assert.equal(ctx.selStart,null);assert.equal(ctx.selectionRect,null);assert.equal(ctx.selectedCluster,null);assert(records.includes('drag')&&records.includes('double'));assert.equal(ctx.activeAge,'week');assert(records.some(x=>Array.isArray(x)&&x[0]==='strip'&&x[1]?.[0]===5));
let clockNow='2026-10-24T20:00:00Z',redraws=0;class TestDate extends Date{constructor(...a){super(...(a.length?a:[clockNow]))}}
const timer={Intl,Date:TestDate,document:{hidden:false},ageClock:new Date(clockNow),rebuildMarkers:()=>redraws++};vm.createContext(timer);vm.runInContext(extract('function refreshAgeDay()','document.addEventListener(\'visibilitychange\''),timer);timer.refreshAgeDay();assert.equal(redraws,0,'same day no DOM rebuild');clockNow='2026-10-24T22:01:00Z';timer.refreshAgeDay();assert.equal(redraws,1,'Stockholm day change redraws');timer.document.hidden=true;timer.refreshAgeDay();assert.equal(redraws,1,'hidden view deferred');
assert(source.includes("isSelecting || selectionRect || selectedCluster"));
console.log('PASS: exact redraw preserves area/focus, filters survive clear, drawing cancels, only Stockholm day change redraws.');

// Area -> point -> zoom must keep the point, not silently restore the old area.
ctx.console={log(){}};ctx.selectionRect={getBounds:()=>({contains:()=>true})};ctx.isSelecting=true;ctx.selectedCluster=null;ctx.allPhotoData=[{lat:1,lng:1,date:'2026-10-24',locationName:'Testplats'}];ctx.getFilteredIndices=()=>[0];const point={_clusterIndices:[0]};
vm.runInContext(extract('function selectCluster(marker)','// ─── Rectangle Area Selection'),ctx);ctx.selectCluster(point);assert.equal(ctx.selectionRect,null);assert.equal(ctx.isSelecting,false);assert.equal(ctx.selectedCluster,point);ctx.rebuildMarkers();assert.equal(ctx.selectionRect,null);assert(ctx.selectedCluster);assert.equal(ctx.selectedCluster._clusterIndices[0],0);
console.log('PASS: area -> point -> zoom keeps mutually exclusive point selection.');

assert(!source.includes('populateStrip(null); // Show all initially'));

assert(source.includes("className: 'selection-rect',\n                        interactive: false"));

assert(source.includes('#photomap .leaflet-overlay-pane svg { max-width: none; }'));
