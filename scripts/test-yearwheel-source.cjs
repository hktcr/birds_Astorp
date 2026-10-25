const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const code=fs.readFileSync(path.join(__dirname,'../static/js/arshjul.js'),'utf8');
function source(name){const start=code.indexOf('    function '+name+'(');return code.slice(start,code.indexOf('\n    }\n',start)+7);}
function element(tag){return{tag,style:{},attributes:{},children:[],events:{},setAttribute(k,v){this.attributes[k]=v;},appendChild(c){this.children.push(c);},addEventListener(k,f){this.events[k]=f;}};}
const tooltipDate={},tooltipCount={},tooltip={style:{}};
const scope=vm.createContext({document:{createElementNS:(ns,tag)=>element(tag)},
    GLOBAL_MAX_YEARS:5,modalTooltipDate:tooltipDate,modalTooltipCount:tooltipCount,modalTooltip:tooltip,
    modalSvgContainer:{getBoundingClientRect:()=>({left:0,top:0})}});
vm.runInContext(code.slice(code.indexOf('    const currentYear ='),code.indexOf('    // Geometry & Math helpers')),scope);
for(const name of ['stockholmDay','wheelDayIndex','publicStatsReady','polarToCartesian','describeAnnularSegment','getColor','createSVG'])vm.runInContext(source(name),scope);
const flat=node=>[node,...node.children.flatMap(flat)];
const missing=flat(scope.createSVG(undefined));
assert(missing.some(n=>n.textContent==='Underlag saknas'));
assert(!missing.some(n=>n.textContent===0));
const leap=flat(scope.createSVG({'02-29':2},true));
assert(leap.some(n=>n.textContent===1),'29 Feb must count as one active day');
const segment=leap.find(n=>n.tag==='path');assert(segment,'29 Feb segment must be drawn even in non-leap current year');
segment.events.mouseenter({clientX:50,clientY:70});
assert.equal(tooltipDate.textContent,'29 Feb');assert.match(tooltipCount.textContent,/2 olika år/);
segment.events.mouseleave();assert.equal(tooltip.style.opacity,0);
assert(code.includes('const modalTooltipDate = document.getElementById("arshjul-modal-tooltip-date")'));
const meta={dataProviderId:1,municipalityId:'1277',complete:true,sensitiveObservations:false,taxonomyPolicy:'species-rank-only-v1',recordsSha256:'a'.repeat(64),recordCount:1,fromDay:'2024-01-01',toDay:'2026-10-25',retrievedAt:'2026-10-25T12:00:00Z'};
assert.equal(scope.publicStatsReady(meta),true);
for(const bad of [{municipalityId:'other'},{taxonomyPolicy:'guessed'},{recordsSha256:undefined}])assert.equal(scope.publicStatsReady({...meta,...bad}),false);
const partial=fs.readFileSync(path.join(__dirname,'../layouts/partials/radial_calendar.html'),'utf8');
assert(partial.includes("if (!speciesData || !Object.keys(speciesData).length) throw new Error"));
assert(partial.includes('Underlag saknas'));
console.log('PASS: actual yearwheel SVG missing-data state, 29 February segment/hover and provider/municipality/taxonomy/hash gates; matching partial unknown guard.');

assert.equal(scope.wheelDayIndex('2026-10-25'),298);
assert.equal(scope.wheelDayIndex('2024-02-29'),59);
assert.equal(scope.wheelDayIndex('2026-02-29'),-1);
assert.equal(scope.stockholmDay('2026-10-24T22:30:00Z'),'2026-10-25');
const marked=flat(scope.createSVG({'02-29':2},false,'2026-10-25'));
const checkMarker=marked.find(n=>n.attributes.stroke==='#22c55e');
const expected=scope.polarToCartesian(0,0,103,(298/366)*360+180);
assert.equal(checkMarker.attributes.x1,expected.x);assert.equal(checkMarker.attributes.y1,expected.y);
assert(!code.includes('startOfYear'),'No actual-year arithmetic may index the fixed historical wheel');
if(!process.argv.includes('--timezone-case')) {
    const {execFileSync}=require('node:child_process');
    for(const TZ of ['UTC','Europe/Stockholm','America/Los_Angeles','Pacific/Honolulu','Asia/Tokyo']) {
        execFileSync(process.execPath,[__filename,'--timezone-case'],{env:{...process.env,TZ},stdio:'pipe'});
    }
    console.log('PASS: Oct25 fixed-wheel marker and Stockholm midnight/check-date indices in five process timezones.');
}
