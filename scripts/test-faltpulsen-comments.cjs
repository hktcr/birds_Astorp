const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const dates = require('../static/js/stockholm-dates.js');
const html = fs.readFileSync(path.join(__dirname, '../layouts/_default/faltpulsen.html'), 'utf8');
function source(name) {
    const begin = html.indexOf('    function ' + name + '(');
    assert(begin >= 0, 'Missing function: ' + name);
    const end = html.indexOf('\n    }\n', begin) + 7;
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
for (const name of ['escapeHtml', 'fmtDate', 'sortRecords', 'appendObservationComment', 'renderList']) vm.runInContext(source(name), rendering);
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
    const fetching = vm.createContext({ window: {siteBaseURL: '/'}, fetch() {},
        ArtportalenSnapshot: {load: async (fetcher, url, days) => {requests.push({url, days}); return records;}}
    });
    vm.runInContext(source('fetchObservations'), fetching);
    const result = await fetching.fetchObservations(3);
    assert.deepEqual(requests, [{url: '/data/artportalen-public-snapshot.json', days: 3}]);
    assert.equal(result[0], records[0]);
    assert(!html.includes('Ocp-Apim-Subscription-Key'));
    assert(!html.includes('var API_KEY'));
    console.log('PASS: unchanged literal comment renderer, sorting/filtering/repeated rendering; fetch delegates only to same-origin safe snapshot; no browser credential.');
})().catch(error => { console.error(error); process.exitCode = 1; });
// Display names are labels, not taxon identity; missing IDs are never a '?' taxon.
rendering.currentLocationFilter = null;
rendering.renderList([
    {taxon:{id:100,vernacularName:'Synonym A'},event:{plainStartDate:'2026-10-18'}},
    {taxon:{id:100,vernacularName:'Synonym B'},event:{plainStartDate:'2026-10-18'}},
    {taxon:{id:101,vernacularName:'Synonym A'},event:{plainStartDate:'2026-10-18'}}
]);
assert.equal(nodes['fp-stat-species'].textContent,2);
assert.equal(nodes['fp-stat-observers'].textContent,'–');
assert.match(nodes['fp-dynamic-intro'].textContent,/2 taxa/);
assert.doesNotMatch(nodes['fp-dynamic-intro'].textContent,/skådare|arter/);

rendering.renderList([{taxon:{id:100,vernacularName:'<b>sentinel</b> "test"',scientificName:'<i>Latin</i>'},event:{plainStartDate:'2026-10-18'}}]);
assert(!list.markup.includes('<b>sentinel</b>'));
assert(list.markup.includes('&lt;b&gt;sentinel&lt;/b&gt; &quot;test&quot;'));
assert(!list.markup.includes('<i>Latin</i>'));
