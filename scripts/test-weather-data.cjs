const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const weather = require('../static/js/weather-data.js');
const root = path.join(__dirname, '..');
const values = (ref, value, quality = 'G') => ({ ref, value, quality });
const days = (from, count, y = 1) => Array.from({ length: count }, (_, i) => ({ x: weather.dayOffset(from, i), y }));

const merged = weather.mergeValues(
    [values('2026-01-01', 0), values('2026-06-01', 3)],
    [values('2026-06-01', 5), values('2026-10-08', 2), values('2025-12-31', 9),
     values('2027-01-01', 9), values('2026-06-02', ''), values('2026-06-03', 'bad'), values('2026-06-04', 3, 'R')]
);
assert.deepEqual(merged.map(p => [p.ref, p.value]), [['2026-01-01', 0], ['2026-06-01', 3], ['2026-10-08', 2]]);
const currentFlow = days('2026-09-25', 14, 4);
assert.equal(weather.meadowWindow(currentFlow, days('2026-08-27', 14), '2026-10-09').available, false, 'September rain cannot describe October');
assert.equal(weather.meadowWindow(currentFlow, [], '2026-10-09').available, false);
const rain = days('2026-09-25', 14, 0);
assert.equal(weather.meadowWindow(currentFlow, rain, '2026-10-09').available, true, 'Actual zero rainfall is valid');
assert.equal(weather.meadowWindow(currentFlow, rain, '2026-10-12').available, false, 'Age must be checked again against the clock');
const gap = rain.filter((_, i) => i !== 5).concat(rain[0]);
assert.equal(weather.meadowWindow(currentFlow, gap, '2026-10-09').available, false, 'Duplicates must not conceal a missing calendar day');
const differentEnd = weather.meadowWindow(days('2026-09-24', 15), days('2026-09-24', 14), '2026-10-09');
assert.equal(differentEnd.available, true);
assert.equal(differentEnd.from, '2026-09-24');
assert.equal(differentEnd.to, '2026-10-07');
assert.equal(differentEnd.flow.length, 14);
assert.equal(weather.coverage(days('2026-01-01', 281), '2026-01-01', '2026-12-31', '2026-10-09').incomplete, false);
assert.match(weather.coverage([], '2026-09-26', '2026-10-09', '2026-10-09').text, /0 av 13/);
assert.equal(weather.coverage(days('2026-01-01', 252), '2026-01-01', '2026-12-31', '2026-10-09').incomplete, true);
assert.deepEqual(weather.withGaps([{ x: '2026-01-01', y: 1 }, { x: '2026-01-03', y: 3 }]), [{ x: '2026-01-01', y: 1 }, { x: '2026-01-02', y: null }, { x: '2026-01-03', y: 3 }]);

// Run the actual meadow renderer, including the stale/error state.
const html = fs.readFileSync(path.join(root, 'layouts/_default/vader.html'), 'utf8');
const start = html.indexOf('    function buildMeadowIndicator(');
const end = html.indexOf('\n    function ', start + 1);
const elements = Object.fromEntries(['meadow-indicator', 'meadow-level-box', 'meadow-level-label', 'meadow-level-detail', 'meadow-trend-arrow'].map(id => [id, { style: {}, textContent: '' }]));
const context = vm.createContext({ document: { getElementById: id => elements[id] }, console: { log() {} },
    WeatherData: { meadowWindow: (flow, rain) => weather.meadowWindow(flow, rain, '2026-10-09') } });
vm.runInContext(html.slice(start, end), context);
context.buildMeadowIndicator(currentFlow, days('2026-08-27', 14));
assert.equal(elements['meadow-level-label'].textContent, 'Ingen aktuell bedömning');
assert.match(elements['meadow-level-detail'].textContent, /2026-09-09/);
assert.equal(elements['meadow-trend-arrow'].textContent, '');
context.buildMeadowIndicator(currentFlow, rain);
assert.notEqual(elements['meadow-level-label'].textContent, 'Ingen aktuell bedömning');
assert.match(elements['meadow-level-detail'].textContent, /2026-09-25 till 2026-10-08/);

async function fetchScenario(archive, live) {
    const calls = [];
    const scope = vm.createContext({ window: {}, Intl, Date, Map, fetch: async url => {
        calls.push(url);
        const result = url.startsWith('/data/') ? archive : live;
        if (result instanceof Error) throw result;
        return result;
    } });
    vm.runInContext(fs.readFileSync(path.join(root, 'static/js/weather-data.js'), 'utf8'), scope);
    return { result: await scope.window.WeatherData.loadMetobs(5, 62060), calls };
}
(async () => {
    const archive = { ok: true, json: async () => ({ series: { '5/62060': { value: [values('2026-01-01', 0)] } } }) };
    const good = await fetchScenario(archive, { ok: true, json: async () => ({ value: [values('2026-10-08', 1)] }) });
    assert.equal(good.result.value.length, 2);
    assert.equal(good.result.warnings.length, 0);
    const failed = await fetchScenario(archive, { ok: false, status: 503 });
    assert.equal(failed.result.value.length, 1);
    assert.equal(failed.result.warnings.length, 1);
    const empty = await fetchScenario(new Error('offline'), new Error('offline'));
    assert.equal(empty.result.value.length, 0);
    assert.equal(empty.result.warnings.length, 2);
    const malformed = await fetchScenario({ ok: true, json: async () => ({ series: {} }) }, { ok: true, json: async () => ({}) });
    assert.equal(malformed.result.value.length, 0);
    assert.equal(malformed.result.warnings.length, 2);
    console.log('PASS: archive/live merge, full-year coverage, zero vs missing, stale rain, aligned 14-day window, gaps, rendering and HTTP/network failures.');
})().catch(error => { console.error(error); process.exitCode = 1; });
