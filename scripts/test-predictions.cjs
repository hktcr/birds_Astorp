const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.join(__dirname, '..');
const read = name => JSON.parse(fs.readFileSync(path.join(root, name), 'utf8'));
const prediction = require('../static/js/predictions.js');
const checklist = read('data/checklist-2026.json');
const guide = read('static/data/species-guide.json');
const daily = read('static/data/species_days_historic.json');
const names = result => result.candidates.map(x => x.name);
const date = day => day + 'T12:00:00+01:00';
const empty = year => ({ year, observations: [] });
const catalog = (...names) => ({ species: names.map(name => ({ name })) });
assert.deepEqual(names(prediction.rank(checklist, guide, daily, date('2026-10-29'))), ['Sidensvans', 'Duvhök', 'Kungsfiskare']);
assert(!names(prediction.rank(checklist, guide, daily, date('2026-10-29'))).includes('Fiskgjuse'));
assert.deepEqual(names(prediction.rank(empty(2026), catalog('Förbi', 'Nu', 'Sista', 'Senare'), {
    Förbi: { '10-01': 1000, '10-28': 1000 }, Nu: { '10-29': 1 }, Sista: { '11-27': 1 }, Senare: { '11-28': 1000 }
}, date('2026-10-29'))), ['Nu', 'Sista']);
assert.deepEqual(names(prediction.rank(empty(2026), catalog('Örn', 'And', 'Ärla'), { Örn: { '10-29': 1 }, And: { '10-29': 1 }, Ärla: { '10-29': 1 } }, date('2026-10-29'))), ['And', 'Ärla', 'Örn']);
assert.deepEqual(names(prediction.rank({ year: 2026, observations: [{ species: 'And', date: '2026-10-29' }] }, catalog('And'), { And: { '10-29': 10 } }, date('2026-10-29'))), []);
assert.deepEqual(names(prediction.rank({ year: 2026, observations: [{ species: 'And', date: '2025-10-29' }, { species: 'And', date: '2026-11-01' }] }, catalog('And'), { And: { '10-29': 10 } }, date('2026-10-29'))), ['And']);
const ending = prediction.rank(empty(2026), catalog('December', 'Januari'), { December: { '12-31': 1 }, Januari: { '01-01': 1000 } }, date('2026-12-31'));
assert.deepEqual(names(ending), ['December']); assert.equal(ending.endDay, '2026-12-31');
assert.equal(prediction.rank(empty(2026), guide, daily, date('2027-01-01')).status, 'wrong-year');
assert.deepEqual(names(prediction.rank(empty(2028), catalog('Skottdag'), { Skottdag: { '02-29': 1 } }, date('2028-02-28'))), ['Skottdag']);
assert.deepEqual(names(prediction.rank(empty(2027), catalog('Skottdag'), { Skottdag: { '02-29': 1 } }, date('2027-02-28'))), []);
assert.equal(prediction.rank(checklist, guide, daily, '2026-10-28T23:30:00Z').today, '2026-10-29');
assert.throws(() => prediction.rank(empty(2026), catalog('And'), { And: { '02-30': 1 } }, date('2026-10-29')));
assert.throws(() => prediction.rank(empty(2026), catalog('And'), { And: { '10-29': -1 } }, date('2026-10-29')));
assert.deepEqual(names(prediction.rank(empty(2026), catalog('And'), {}, date('2026-10-29'))), []);

function element(tag) {
    return { tag, children: [], attrs: {}, textContent: '', appendChild(x) { this.children.push(x); }, replaceChildren() { this.children = []; }, setAttribute(k, v) { this.attrs[k] = v; } };
}
async function browserTest(builtModule) {
    let now = date('2026-10-29'), fail = false, tick, visible;
    let currentChecklist = structuredClone(checklist);
    const legacy = JSON.stringify({ species: ['Fiskgjuse', 'Havsörn', 'Skata'], date: '2026-04-01', history: [{ hits: 3 }] });
    const elements = Object.fromEntries(['prediction-cards', 'prediction-score', 'prediction-source'].map(id => [id, element('div')]));
    const RealDate = Date;
    class Clock extends RealDate { constructor(...args) { super(...(args.length ? args : [now])); } }
    const env = { Date: Clock, document: { hidden: false, createElement: element, getElementById: id => elements[id], addEventListener: (event, fn) => { visible = fn; }, removeEventListener() {} },
        setInterval: fn => { tick = fn; return 1; }, clearInterval() {},
        localStorage: { getItem() { throw new Error('Legacy state must not influence current suggestions'); }, setItem() { throw new Error('Legacy history must be preserved'); } },
        fetch: async url => ({ ok: !fail, status: fail ? 503 : 200, json: async () => structuredClone(url.includes('checklist') ? currentChecklist : url.includes('guide') ? guide : daily) }) };
    const built = fs.readFileSync(path.join(root, 'docs/index.html'), 'utf8');
    const speciesLinks = vm.runInNewContext('(' + built.match(/speciesLinks=(\{[^}]+\})/)[1] + ')');
    const scope = vm.createContext({ window: env, Intl, Date, Set, Object, Number, String, Promise });
    vm.runInContext(fs.readFileSync(path.join(root, 'static/js/stockholm-dates.js'), 'utf8'), scope);
    vm.runInContext(fs.readFileSync(path.join(root, builtModule), 'utf8'), scope);
    const app = env.AstorpPredictions.mount({ environment: env, speciesLinks, checklistURL: '/data/checklist-2026.json', guideURL: '/data/species-guide.json', dailyURL: '/data/species_days_historic.json' });
    await app.ready;
    const displayed = () => elements['prediction-cards'].children.map(x => x.children[0].textContent);
    assert.deepEqual(displayed(), ['Sidensvans', 'Duvhök', 'Kungsfiskare']);
    assert.match(elements['prediction-score'].textContent, /29 okt till 27 nov 2026/);
    elements['prediction-cards'].children.forEach(card => { assert.equal(card.tag, 'a'); assert(card.href.startsWith('/species/')); assert.equal(card.attrs['aria-describedby'], 'prediction-link-hint'); });
    currentChecklist.observations.push({ species: 'Sidensvans', date: '2026-10-29' });
    await app.refresh(); assert(!displayed().includes('Sidensvans'));
    now = date('2026-10-30'); tick(); await new Promise(setImmediate);
    assert.match(elements['prediction-score'].textContent, /30 okt till 28 nov/);
    fail = true; await app.refresh(); assert.deepEqual(displayed(), []); assert.match(elements['prediction-score'].textContent, /kunde inte beräknas/);
    fail = false; visible(); await new Promise(setImmediate); assert(displayed().length > 0);
    now = date('2027-01-01'); await app.refresh(); assert.deepEqual(displayed(), []); assert.match(elements['prediction-score'].textContent, /årslista för 2027/);
    assert.equal(legacy, JSON.stringify({ species: ['Fiskgjuse', 'Havsörn', 'Skata'], date: '2026-04-01', history: [{ hits: 3 }] }));
    app.destroy();
}
(async () => {
    await browserTest('static/js/predictions.js');
    await browserTest('docs/js/predictions.js');
    assert.equal(fs.readFileSync(path.join(root, 'static/js/predictions.js'), 'utf8'), fs.readFileSync(path.join(root, 'docs/js/predictions.js'), 'utf8'));
    const built = fs.readFileSync(path.join(root, 'docs/index.html'), 'utf8');
    assert.match(built, /predictions\.js\?v=[a-f0-9]{64}/);
    assert.match(built, /AstorpPredictions\.mount/);
    assert(!built.includes('astorp-predictions-2026'));
    assert(!built.includes('Träffsäkerhet:'));
    console.log('PASS: daily 30-day ranking, stale storage isolation, new observations, Stockholm midnight, leap days, year end, errors, recovery and built integration.');
})().catch(error => { console.error(error); process.exitCode = 1; });
