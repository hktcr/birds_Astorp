const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const html = fs.readFileSync(require('node:path').join(__dirname,'../layouts/_default/faltpulsen.html'),'utf8');
const start=html.indexOf('    function loadData(days) {'), end=html.indexOf('    // ── Events',start);
const nodes={},pending=[],rendered=[],markers=[];
const scope=vm.createContext({console:{error(){}},loadSequence:0,allRecords:[{old:true}],currentLocationFilter:'old',currentDays:3,
    document:{getElementById:id=>nodes[id]||(nodes[id]={style:{},textContent:'old counts'})},
    fetchObservations:days=>new Promise((resolve,reject)=>pending.push({days,resolve,reject})),
    renderList:records=>{rendered.push(records);nodes['fp-dynamic-intro'].textContent='2 taxa';},
    updateMapMarkers:records=>markers.push(records)
});
vm.runInContext(html.slice(start,end),scope);
const tick=()=>new Promise(resolve=>setImmediate(resolve));
(async()=>{
    scope.loadData(3);
    assert.equal(scope.allRecords.length,0);
    assert.equal(scope.currentLocationFilter,null);
    assert.equal(markers.at(-1).length,0);
    assert(!nodes['fp-dynamic-intro'].textContent.includes('old counts'));
    pending[0].resolve([{id:'first'}]);await tick();
    assert.equal(nodes['fp-dynamic-intro'].textContent,'2 taxa');
    scope.loadData(7);
    assert(!nodes['fp-dynamic-intro'].textContent.includes('2 taxa'));
    pending[1].reject(new Error('fixture failure'));await tick();
    assert.equal(nodes['fp-stats-row'].style.display,'none');
    assert.equal(nodes['fp-list'].style.display,'none');
    assert.equal(nodes['fp-source'].style.display,'none');
    assert.equal(nodes['fp-dynamic-intro'].textContent,'Aktuellt underlag saknas för vald period.');
    scope.loadData(3);scope.loadData(30);
    pending[3].resolve([{id:'latest'}]);await tick();
    pending[2].resolve([{id:'outdated'}]);await tick();
    assert.equal(scope.allRecords[0].id,'latest','Old response must not overwrite new selection');
    assert.equal(rendered.length,2);
    assert(!html.includes("+ ' arter</em>'"));
    assert(html.includes('CATEGORY_COLORS[cat] || CATEGORY_COLORS.unknown'));
    console.log('PASS: actual loadData clears old counts/markers, truthful failure state, no stale-period race and neutral unknown color.');
})().catch(e=>{console.error(e);process.exitCode=1;});
