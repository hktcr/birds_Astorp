const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const template = fs.readFileSync(path.join(__dirname, '../layouts/_default/list.html'), 'utf8');
const script = template.match(/<script>\s*([\s\S]*?)<\/script>/)[1];

function run(search) {
    const items = ['kungsfiskare', 'blå-kärrhök,röd-glada'].map(species => ({
        style: {}, getAttribute: () => species
    }));
    const filterName = {}, filterBar = {style: {}};
    const timeline = {
        children: [], replaceChildren(...children) {this.children = children;},
        set innerHTML(value) {throw new Error('URL filter must not enter an HTML sink: ' + value);}
    };
    const document = {
        addEventListener: (_, fn) => fn(),
        getElementById: id => id === 'active-filter-name' ? filterName : filterBar,
        querySelectorAll: () => items,
        querySelector: () => timeline,
        createElement: tag => ({tag})
    };
    vm.runInNewContext(script, {document, window: {location: {search}}, URLSearchParams});
    return {items, filterName, filterBar, timeline};
}

for (const search of ['', '?species=']) {
    const r = run(search);
    assert(r.items.every(x => x.style.display === undefined));
    assert.equal(r.timeline.children.length, 0);
}
for (const [value, expected] of [['kungsfiskare', 0], ['BLÅ-KÄRRHÖK', 1]]) {
    const r = run('?species=' + encodeURIComponent(value));
    assert.equal(r.items[expected].style.display, '');
    assert.equal(r.items[1 - expected].style.display, 'none');
    assert.equal(r.timeline.children.length, 0);
}
for (const query of ['<img src=x onerror="window.localProbe=1">', '<svg onload="window.localProbe=1">', '%', '%E0%A4%A', '%3Csvg%3E', 'okänd-art', 'A & B']) {
    const r = run('?species=' + encodeURIComponent(query));
    const expected = query.replace(/-/g, ' ').replace(/^./, x => x.toUpperCase());
    assert.equal(r.filterName.textContent, expected);
    assert.equal(r.timeline.children[0].tag, 'p');
    assert.equal(r.timeline.children[0].textContent, 'Inga inlägg hittades för ' + expected + '.');
    assert(r.items.every(x => x.style.display === 'none'));
}
assert.doesNotThrow(() => run('?species=%E0%A4%A'));
console.log('PASS: literal URL filter output, encoded markup, malformed encoding, Unicode matching, and unfiltered list.');
