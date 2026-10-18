const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const dates = require('../static/js/stockholm-dates.js');
const html = fs.readFileSync(path.join(__dirname, '../layouts/_default/faltpulsen.html'), 'utf8');
function source(name) {
    const begin = html.indexOf('    function ' + name + '(');
    assert(begin >= 0, 'Missing function: ' + name);
    const end = html.indexOf('\n    function ', begin + 1);
    return html.slice(begin, end);
}
function element(tag) {
    return {
        tag, style: {}, children: [],
        appendChild(child) { this.children.push(child); },
        set innerHTML(value) { throw new Error('Comment must not enter an HTML sink'); }
    };
}
const scope = vm.createContext({ document: { createElement: element } });
vm.runInContext(source('appendObservationComment'), scope);
for (const value of [undefined, null, '', ' \n\t ', 123, { privateComment: 'hidden' }]) {
    const grid = element('div');
    scope.appendObservationComment({ querySelector: () => grid }, { occurrenceRemarks: value, privateComment: 'hidden' });
    assert.equal(grid.children.length, 0, 'Empty or non-text remarks must not create a comment');
}
assert.doesNotThrow(() => scope.appendObservationComment({}, undefined));
for (const comment of ['Offentlig kommentar', 'Första raden\nAndra raden\r\nTredje raden', '<img src=x onerror="alert(1)"> & <script>alert(1)</script>', 'Å, ä, ö, "citat" och \'apostrof\' & text', '  Bevara mellanrum  ']) {
    const grid = element('div');
    scope.appendObservationComment({ querySelector: () => grid }, { occurrenceRemarks: comment, privateComment: 'hidden' });
    assert.equal(grid.children.length, 1);
    const item = grid.children[0];
    assert.equal(item.className, 'fp-detail-item fp-detail-comment');
    assert.equal(item.style.gridColumn, '1 / -1');
    assert.equal(item.children[0].textContent, 'Kommentar');
    assert.equal(item.children[1].textContent, comment);
    assert.equal(item.children[1].style.whiteSpace, 'pre-wrap');
    assert.equal(item.children[1].style.overflowWrap, 'anywhere');
    assert.equal(item.children[1].children.length, 0);
}

// Exercise the actual list renderer, including sorting, filtering, and rerendering.
const nodes = {};
let cards = [];
const list = {
    classList: { add() {}, remove() {} },
    set innerHTML(value) {
        this.markup = value;
        cards = [...value.matchAll(/class="fp-obs-card[^\"]*" data-idx="(\d+)"/g)].map(match => ({
            grid: element('div'), getAttribute: name => name === 'data-idx' ? match[1] : '',
            querySelector() { return this.grid; }, addEventListener() {}
        }));
    },
    querySelectorAll: () => cards
};
const rendering = vm.createContext({ StockholmDates: dates, currentSort: 'date', currentDays: 7,
    currentLocationFilter: null, DAYS_LABEL: {7: 'veckan'}, CATEGORY_COLORS: {}, window: {}, getCat: () => 'regular',
    document: { createElement: element, getElementById: id => id === 'fp-list' ? list : (nodes[id] || (nodes[id] = { style: {} })) }
});
for (const name of ['fmtDate', 'sortRecords', 'appendObservationComment', 'renderList']) vm.runInContext(source(name), rendering);
const records = [
    { event: { plainStartDate: '2026-10-17' }, location: { locality: 'A' }, occurrence: { occurrenceRemarks: 'Äldre\nrapport', privateComment: 'PRIVATE_SENTINEL' } },
    { event: { plainStartDate: '2026-10-18' }, location: { locality: 'B' }, occurrence: { occurrenceRemarks: '<img src=x onerror="alert(1)"> & ny', privateComment: 'PRIVATE_SENTINEL' } },
    { event: { plainStartDate: '2026-10-16' }, location: { locality: 'A' }, occurrence: { privateComment: 'PRIVATE_SENTINEL' } }
];
const original = JSON.stringify(records);
const comments = () => cards.map(card => card.grid.children[0]?.children[1].textContent);
rendering.renderList(records);
assert.deepEqual(comments(), [records[1].occurrence.occurrenceRemarks, records[0].occurrence.occurrenceRemarks, undefined]);
assert(!list.markup.includes('<img'));
assert(!list.markup.includes('PRIVATE_SENTINEL'));
rendering.renderList(records);
assert.equal(cards[0].grid.children.length, 1, 'Rerender must not duplicate comments');
rendering.currentLocationFilter = 'A';
rendering.renderList(records);
assert.deepEqual(comments(), [records[0].occurrence.occurrenceRemarks, undefined]);
rendering.renderList([]);
assert.equal(cards.length, 0);
assert.equal(JSON.stringify(records), original, 'Source observations must remain unchanged');

(async () => {
    const requests = [];
    const fetching = vm.createContext({ StockholmDates: dates, API_BASE: 'https://example.invalid', API_KEY: 'test-only', TAXON_BIRDS: 1, MUNICIPALITY_ID: 'test',
        fetch: async (url, options) => { requests.push({url, options, body: JSON.parse(options.body)}); return {ok: true, json: async () => ({records})}; }
    });
    vm.runInContext(source('fetchObservations'), fetching);
    const result = await fetching.fetchObservations(3);
    const body = requests[0].body;
    assert.equal(body.output.fieldSet, 'Minimum');
    assert.deepEqual(body.output.fields, ['occurrence.reportedBy', 'occurrence.recordedBy', 'occurrence.occurrenceRemarks', 'location.locality', 'location.decimalLatitude', 'location.decimalLongitude']);
    assert.deepEqual(body.taxon, {ids: [1], includeUnderlyingTaxa: true});
    assert.deepEqual(body.geographics, {areas: [{areaType: 'Municipality', featureId: 'test'}]});
    assert(!('protectionFilter' in body), 'Do not expand the existing public search');
    assert(!('Authorization' in requests[0].options.headers), 'Do not add protected-observation access');
    assert.equal(result[0], records[0]);
    console.log('PASS: public field requested; empty, non-text, HTML-like, Unicode and multiline remarks; literal text-only rendering; sorting, filtering, repeated rendering; unchanged source records and public search scope.');
})().catch(error => { console.error(error); process.exitCode = 1; });
