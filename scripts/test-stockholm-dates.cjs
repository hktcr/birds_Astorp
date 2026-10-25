const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const vm = require('node:vm');
const dates = require('../static/js/stockholm-dates.js');
const html = fs.readFileSync(require('node:path').join(__dirname, '../layouts/_default/faltpulsen.html'), 'utf8');
function source(name) {
    const begin = html.indexOf('    function ' + name + '(');
    const end = html.indexOf('\n    }\n', begin) + 7;
    return html.slice(begin, end);
}

function renderFixture() {
    const nodes = {};
    const scope = vm.createContext({ StockholmDates: dates, currentSort: 'date', currentDays: 7,
        currentLocationFilter: null, DAYS_LABEL: { 7: 'veckan' }, CATEGORY_COLORS: {}, window: {}, getCat: () => 'regular',
        document: { getElementById: id => nodes[id] || (nodes[id] = { style: {}, classList: { add() {}, remove() {} }, querySelectorAll: () => [] }) } });
    for (const name of ['escapeHtml', 'fmtDate', 'sortRecords', 'renderList']) vm.runInContext(source(name), scope);
    const records = [
        ...Array.from({ length: 13 }, () => ({ event: { plainStartDate: '2026-10-01', startDate: '2026-10-01T00:00:00' } })),
        ...Array.from({ length: 6 }, () => ({ event: { plainStartDate: '2026-10-07', startDate: '2026-10-07T00:00:00' } }))
    ];
    const original = JSON.stringify(records);
    scope.renderList(records);
    assert.equal(JSON.stringify(records), original, 'Source observations must remain unchanged');
    const markup = nodes['fp-list'].innerHTML;
    assert.deepEqual([...markup.matchAll(/class="fp-date-sep"[^>]*>([^<]+)/g)].map(m => m[1]), ['onsdag 7 okt', 'torsdag 1 okt']);
    assert.equal((markup.match(/Datum<\/span>2026-10-07/g) || []).length, 6);
    assert.equal((markup.match(/Datum<\/span>2026-10-01/g) || []).length, 13);
    return markup;
}

function cases() {
    renderFixture();
    const october7 = { plainStartDate: '2026-10-07', startDate: '2026-10-07T00:00:00' };
    assert.equal(dates.formatDay(dates.observationDay(october7), true), 'onsdag 7 okt');
    assert.equal(dates.formatDay('2026-10-01', true), 'torsdag 1 okt');
    assert.equal(dates.observationDay({ plainStartDate: '2026-10-07', startDate: '2026-10-06T20:00:00Z' }), '2026-10-07', 'Preserve explicit source date');
    assert.equal(dates.observationDay({ startDate: '2026-10-06T22:30:00Z' }), '2026-10-07');
    assert.equal(dates.observationDay({ startDate: '2026-10-07T00:30:00' }), '2026-10-07');
    assert.equal(dates.formatDay('2026-02-30'), 'Datum saknas');
    assert.equal(dates.difference('2026-03-28', '2026-03-31'), 3);
    assert.equal(dates.difference('2026-10-24', '2026-10-27'), 3);
    assert.equal(dates.stockholmDay('2026-10-08T22:30:00Z'), '2026-10-09');
    assert.equal(dates.stockholmDay('2026-01-08T23:30:00Z'), '2026-01-09');
    const spring = dates.dateWindow(1, '2026-03-29T12:00:00Z');
    const autumn = dates.dateWindow(1, '2026-10-25T12:00:00Z');
    assert.equal(spring.startDate, '2026-03-28T23:00:00.000Z');
    assert.equal(spring.endDate, '2026-03-29T21:59:59.999Z');
    assert.equal(Date.parse(spring.endDate) + 1 - Date.parse(spring.startDate), 23 * 3600000);
    assert.equal(autumn.startDate, '2026-10-24T22:00:00.000Z');
    assert.equal(autumn.endDate, '2026-10-25T22:59:59.999Z');
    assert.equal(Date.parse(autumn.endDate) + 1 - Date.parse(autumn.startDate), 25 * 3600000);
    const week = dates.dateWindow(7, '2026-10-08T22:30:00Z');
    assert.equal(week.fromDay, '2026-10-03');
    assert.equal(week.toDay, '2026-10-09');
    assert.equal(dates.dateWindow(3, '2027-01-01T00:30:00Z').fromDay, '2026-12-30');
    assert.equal(dates.dateWindow(3, '2026-03-01T00:30:00Z').fromDay, '2026-02-27');
    return JSON.stringify({ spring, autumn, week, labels: [dates.formatDay('2026-10-07', true), dates.formatDay('2026-10-01', true)] });
}

if (process.argv.includes('--timezone-case')) {
    process.stdout.write(cases());
} else {
    const expected = cases();
    for (const timezone of ['UTC', 'Europe/Stockholm', 'America/Los_Angeles', 'Pacific/Honolulu', 'Asia/Tokyo']) {
        const actual = execFileSync(process.execPath, [__filename, '--timezone-case'], { env: { ...process.env, TZ: timezone }, encoding: 'utf8' });
        assert.equal(actual, expected, 'Timezone-dependent result in ' + timezone);
    }
    const requests = [];
    const scope = vm.createContext({ window: {siteBaseURL: '/'}, fetch() {},
        ArtportalenSnapshot: {load: async (fetcher, url, days) => {requests.push({url, days}); return [];}}
    });
    vm.runInContext(source('fetchObservations'), scope);
    scope.fetchObservations(7).then(() => {
        assert.deepEqual(requests, [{url:'/data/artportalen-public-snapshot.json', days:7}]);
        console.log('PASS: source dates and group labels, Stockholm windows, midnight/year/month boundaries, 23/25-hour DST days in five timezones, and actual snapshot delegation.');
    }).catch(error => { console.error(error); process.exitCode = 1; });
}
