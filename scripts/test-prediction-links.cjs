const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const root = path.join(__dirname, '..');
const built = fs.readFileSync(path.join(root, 'docs/mitt-fagelar-2026/index.html'), 'utf8');
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
        assert(page.includes('radial-svg') && page.includes('Historiska fyndplatser är inte anslutna'), 'Calendar and explicit historical-map gate missing for ' + sp.name);
        assert(page.includes('Kommunstatistik behöver källkontrolleras'), 'Legacy source must stay unknown: ' + sp.name);
        assert(!/Rapporter<\/span>\s*<span class=species-fact-value>\d+/.test(page), 'Unverified total must not be published: ' + sp.name);
        assert.equal([...page.matchAll(/data-month=["']?\d+["']? data-count=/g)].length, 0, 'Unverified month bars must be hidden: ' + sp.name);
    }
}
const source = fs.readFileSync(path.join(root, 'layouts/_default/personligt-fagelar.html'), 'utf8');
const begin = source.indexOf('    function initPredictions()');
const end = source.indexOf('\n    initPredictions();', begin);
function element(tag) {
    return { tag, children: [], attrs: {}, appendChild(child) { this.children.push(child); },
        replaceChildren() { this.children = []; }, setAttribute(key, value) { this.attrs[key] = value; } };
}
const cards = element('div'), status = element('p'), score = element('p');
// Synthetic metadata exercises the accepted-renderer branch only; never written
// to any data file and does not certify the inherited historical observations.
const acceptedFixture = { ...guide, provenance: {
    dataProviderId: 1, municipalityId: '1277', complete: true,
    sensitiveObservations: false, taxonomyPolicy: 'species-rank-only-v1',
    recordsSha256: 'a'.repeat(64)
} };
let response = acceptedFixture;
const savedNames = ['Mindre korsnäbb', 'Fiskgjuse', 'Duvhök'];
const scope = vm.createContext({ speciesLinks, data: { observations: [{ species: 'Mindre korsnäbb' }] },
    document: { createElement: element, getElementById: id => ({
        'prediction-cards': cards, 'prediction-data-status': status, 'prediction-score': score
    })[id] },
    fetch: async () => ({ ok: true, json: async () => response }), console: { warn() {} },
    localStorage: { getItem: () => JSON.stringify({ species: savedNames, history: [] }), setItem() { throw new Error('Existing prediction round should be preserved'); } }
});
vm.runInContext(source.slice(begin, end), scope);
(async () => {
    await scope.initPredictions();
    assert.equal(cards.children.length, 3);
    cards.children.forEach((card, i) => {
        assert.equal(card.tag, 'a');
        assert.equal(card.href, speciesLinks[savedNames[i].toLocaleLowerCase('sv')]);
        assert.equal(card.children[0].textContent, savedNames[i]);
        assert.equal(card.attrs['aria-describedby'], 'prediction-link-hint');
        const page = fs.readFileSync(path.join(root, 'docs', decodeURIComponent(card.href), 'index.html'), 'utf8');
        assert(page.includes('radial-svg') && page.includes('Historiska fyndplatser är inte anslutna'), 'Target needs calendar and explicit historical-map gate');
    });
    assert.match(source, /\.prediction-card:focus-visible/);
    // Repeat loading with the real, uncertified legacy source: no stale advice.
    score.textContent = 'old accuracy';
    response = guide;
    await scope.initPredictions();
    assert.equal(cards.children.length, 0);
    assert.equal(score.textContent, '');
    assert(status.textContent.includes('källkontrollerats'));
    // An older successful request may not overwrite a newer failed request.
    let resolveOld;
    scope.fetch = () => new Promise(resolve => { resolveOld = resolve; });
    const oldRequest = scope.initPredictions();
    scope.fetch = async () => ({ ok: false });
    await scope.initPredictions();
    resolveOld({ok: true, json: async () => acceptedFixture});
    await oldRequest;
    assert.equal(cards.children.length, 0);
    console.log('PASS: canonical Hugo species links, unknown legacy counts, synthetic accepted advice, failed/repeated load clearing and stale-request protection.');
})().catch(err => { console.error(err); process.exitCode = 1; });
