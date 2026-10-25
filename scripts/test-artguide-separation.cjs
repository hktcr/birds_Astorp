const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const js = fs.readFileSync(path.join(__dirname, '../assets/js/artguide.js'), 'utf8');
const nodes = {};
const node = id => nodes[id] || (nodes[id] = {style:{}, querySelectorAll:()=>[], querySelector:selector=>node(selector)});
const scope = vm.createContext({document: {readyState: 'loading', addEventListener() {}, getElementById:node, querySelector:node, querySelectorAll:()=>[]}, console});
const exposed = js.replace('    // --- Start ---', `    globalThis.testAPI = {
    set: (species, checklist) => { speciesData = species; checklistData = checklist; },
    matchChecklist, publicStatsReady, renderMonthView, renderYearView, setReady: value => { statisticsReady = value; }, get: () => speciesData, renderCard, renderDetails, labels: CATEGORY_LABELS
};\n    // --- Start ---`);
vm.runInContext(exposed, scope);
const api = scope.testAPI;
const publicData = [{name: 'Testfågel', latin: 'Testus exemplus', taxonId: 100, months:[2,0,0,0,0,0,0,0,0,0,0,0], total:2, category:'rare'}];
const personal = [{species:'Testfågel',date:'2026-03-01'}, {species:'Testfågel',date:'2026-04-01'}, {species:'Privat test',date:'2026-05-01',latin:'Privatus exemplus'}];
api.set(publicData, personal);api.matchChecklist();
assert.equal(api.get()[0].total, 2);
assert.deepEqual(api.get()[0].months, [2,0,0,0,0,0,0,0,0,0,0,0]);
assert.equal(api.get()[0].checked,true);
assert.equal(api.get()[1].personalOnly,true);
assert.match(api.renderCard(api.get()[1]), /Saknas i statistikunderlaget/);
assert.doesNotMatch(api.renderDetails(api.get()[1]), /0 rapporter/);
assert.equal(api.labels.new,'Endast i min lista');
api.matchChecklist();
assert.equal(api.get().length,2);
assert.equal(api.get()[0].total,2,'Repeated matching must be idempotent');
api.set(api.get(),[]);api.matchChecklist();
assert.equal(api.get()[0].checked,false);
assert.equal(api.get()[0].checkDate,undefined);
assert(!js.includes('sp.total += 1'));
console.log('PASS: personal dates never change public months/totals; checkmarks retained; personal-only unknown labels; idempotent repeated match.');

const hostile = {name:'<b>sentinel</b> "test"',latin:'<i>Latin</i>',checkLocation:'<em>place</em>',checked:true,checkDate:'2026-10-01',months:Array(12).fill(0),total:0,category:'new',personalOnly:true};
const markup = api.renderCard(hostile);
assert(!markup.includes('<b>sentinel</b>'));
assert(markup.includes('&lt;b&gt;sentinel&lt;/b&gt; &quot;test&quot;'));
assert(!markup.includes('<em>place</em>'));
const provenance = {dataProviderId:1,municipalityId:'1277',complete:true,sensitiveObservations:false,taxonomyPolicy:'species-rank-only-v1',recordsSha256:'a'.repeat(64),recordCount:0,fromDay:'2026-01-01',toDay:'2026-10-25',retrievedAt:'2026-10-25T12:00:00Z'};
assert.equal(api.publicStatsReady(provenance),true);
for(const change of [{municipalityId:'other'},{taxonomyPolicy:'guessed'},{recordsSha256:undefined}]) assert.equal(api.publicStatsReady({...provenance,...change}),false);

api.set([], []);api.setReady(false);api.renderMonthView(9);
assert.match(nodes['artguide-description'].textContent,/statistik saknas|statistik.*saknas/);
assert(!nodes['artguide-description'].textContent.includes('0 arter rapporterade'));
api.renderYearView();assert.match(nodes['.artguide-month-heading__subtitle'].textContent,/Kommunstatistik saknas/);
api.setReady(true);api.renderMonthView(9);assert(nodes['artguide-description'].textContent.includes('0 arter rapporterade'),'Valid complete empty source differs from unknown');
