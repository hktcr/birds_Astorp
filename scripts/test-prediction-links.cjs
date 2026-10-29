const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const root = path.join(__dirname, '..');
const built = fs.readFileSync(path.join(root, 'docs/index.html'), 'utf8');
const speciesLinks = vm.runInNewContext('(' + built.match(/speciesLinks=(\{[^}]+\})/)[1] + ')');
const guide = JSON.parse(fs.readFileSync(path.join(root, 'static/data/species-guide.json'), 'utf8'));
for (const sp of guide.species) {
    const href = speciesLinks[sp.name.toLocaleLowerCase('sv')];
    assert(href && href.startsWith('/species/'), 'Missing Hugo URL: ' + sp.name);
    const target = path.join(root, 'docs', decodeURIComponent(href), 'index.html');
    assert(fs.existsSync(target), 'Missing target: ' + href);
    const page = fs.readFileSync(target, 'utf8');
    assert(page.includes('<h1 class=species-page-title>' + sp.name + '</h1>'), 'Canonical exported name must survive Hugo title-casing: ' + sp.name);
    if (sp.total > 0) {
        assert(page.includes('radial-svg') && page.includes('show-map-btn'), 'Historical tools missing for ' + sp.name);
        const total = page.match(/Rapporter<\/span>\s*<span class=species-fact-value>(\d+)<\/span>/);
        assert.equal(Number(total && total[1]), sp.total, 'Published total must match the existing browser export: ' + sp.name);
        const months = Array.from(page.matchAll(/data-month=["']?\d+["']? data-count=["']?(\d+)/g), match => Number(match[1]));
        assert.deepEqual(months, sp.months, 'Published months must match the existing browser export: ' + sp.name);
        assert(page.includes('Export ' + guide.exportDate), 'Export date missing for ' + sp.name);
    }
}
const source = fs.readFileSync(path.join(root, 'layouts/index.html'), 'utf8');
assert.match(source, /\.prediction-card:focus-visible/);
assert.match(source, /AstorpPredictions\.mount/);
// Runtime link rendering, cache isolation and date regressions live in test-predictions.cjs.
console.log('PASS: all guide species resolve to built Hugo URLs, calendars and historical maps.');
