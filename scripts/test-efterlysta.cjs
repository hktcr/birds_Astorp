/* Run with node; no network, credentials or third-party test dependency. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Data = require('../static/js/efterlysta-data.js');
const Dates = require('../static/js/stockholm-dates.js');
const targets = require('../data/efterlysta_species.json');
const period = Dates.dateWindow(7, '2026-10-18T13:00:00Z');
const target = targets.find(t => t.name === 'Smålom');
function feature(id = 1, props = {}) {
    return {type: 'Feature', properties: {occurrenceId: `urn:lsid:artportalen.se:sighting:${id}`,
        dataProviderId: 1, county: 'Skåne', isPresentObservation: true, isUncertainIdentification: false,
        taxonCategory: 'Art', dyntaxaTaxonId: target.id, scientificName: target.latin,
        startDate: '2026-10-12T08:00:00Z', endDate: '2026-10-12T08:30:00Z',
        locality: 'Testlokal', municipality: 'Testkommun', decimalLatitude: 56, decimalLongitude: 13,
        organismQuantity: null, ...props}};
}
function payload(features = [], extra = {}) {return {type: 'FeatureCollection', features, numberMatched: features.length, numberReturned: features.length, ...extra};}
function response(data) {return {ok: true, status: 200, json: async () => data};}
function cache(records = []) {return {version: 1, signature: Data.signature(targets), complete: true, period,
    fetchedAt: '2026-10-18T13:00:00Z', records};}
const norm = (props, id) => Data.normalizeFeature(feature(id, props), targets, period);

assert.equal(targets.length, 53);
assert.equal(targets.filter(t => t.history).length, 3);
assert.equal(new Set(targets.map(t => t.id)).size, 53);
assert.deepEqual(targets.slice(0, 3).map(t => [t.name, t.history.date]), [
    ['Flodsångare', '2026-05-25'], ['Myrspov', '2023-05-21'], ['Sjöorre', '2024-04-09']]);
assert.deepEqual(period, {fromDay: '2026-10-12', toDay: '2026-10-18', startDate: '2026-10-11T22:00:00.000Z', endDate: '2026-10-18T21:59:59.999Z'});
for (const [date, hours] of [['2026-03-29T12:00Z', 167], ['2026-10-25T12:00Z', 169]]) {
    const p = Dates.dateWindow(7, date);
    assert.equal((Date.parse(p.endDate) + 1 - Date.parse(p.startDate)) / 3600000, hours);
}
assert.equal(norm({startDate: period.startDate, endDate: period.startDate}).day, '2026-10-12');
assert.equal(norm({startDate: period.endDate, endDate: period.endDate}).day, '2026-10-18');
assert.equal(norm({startDate: '2026-10-11T21:59:59.999Z'}), null);
assert.equal(norm({endDate: '2026-10-18T22:00:00Z'}), null);
assert.equal(norm({startDate: 'bad'}), null);
assert.equal(norm({endDate: '2026-10-11T22:00Z'}), null);
for (const props of [{county: 'Halland'}, {dataProviderId: 2}, {isPresentObservation: false},
    {isUncertainIdentification: true}, {taxonCategory: 'Artkomplex'}, {occurrenceId: 'javascript:alert(1)'}]) assert.equal(norm(props), null);
assert.equal(norm({dyntaxaTaxonId: -1, scientificName: target.latin + '/arctica', taxonCategory: 'Artkomplex'}), null);
assert.equal(norm({dyntaxaTaxonId: -1, scientificName: target.latin + ' testus', taxonCategory: 'Underart'}).taxonId, target.id);
assert.equal(norm({decimalLatitude: null}).lat, null);
assert.equal(norm({organismQuantity: 0}).count, 0);
assert.equal(norm({organismQuantity: '1'}).count, null);
const a = norm({}, 1), b = norm({locality: ' TESTLOKAL ', municipality: 'Testkommun'}, 2);
const c = norm({municipality: 'Annan kommun'}, 3);
const s = Data.summarize([a, a, b, c], targets)[target.id];
assert.equal(s.records.length, 3);
assert.equal(s.locationCount, 2);
assert.equal(Data.locationKey({...a, locality: ''}), 'point:56.00000,13.00000');
assert.equal(Data.locationKey({...a, locality: '', lat: null, lng: null}), '');
assert.deepEqual([0, 1, 4, 5, 9, 10, 19, 20, 100].map(Data.heatLevel), [null, 0, 0, 1, 1, 2, 2, 3, 3]);
const ranked = Data.orderedTargets(targets, Data.summarize([a], targets));
assert.deepEqual(ranked.slice(0, 3), targets.slice(0, 3));
assert.equal(ranked[3].id, target.id);
assert.deepEqual(ranked.slice(4).map(t => t.name), ranked.slice(4).map(t => t.name).sort((a,b) => a.localeCompare(b, 'sv-SE')));
const now = Date.parse('2026-10-18T13:15:00Z');
assert.equal(Data.cacheState(cache([a]), targets, period, now), 'fresh');
assert.equal(Data.cacheState(cache([a]), targets, period, now + 1), 'stale');
assert.equal(Data.cacheState({...cache([a]), lastAttemptFailed: true}, targets, period, now), 'stale');
assert.equal(Data.cacheState({...cache(), complete: false}, targets, period, now), 'invalid');
assert.equal(Data.cacheState(cache([null]), targets, period, now), 'invalid');
assert.equal(Data.cacheState(cache([{...a, day: '2026-10-01'}]), targets, period, now), 'invalid');
assert.equal(Data.cacheState({...cache(), fetchedAt: '2026-10-19T00:00Z'}, targets, period, now), 'invalid');
assert.equal(Data.cacheState(cache(), targets, Dates.dateWindow(7, '2026-10-19T12:00Z'), now), 'different-window');
const url = new URL(Data.buildURL([target], period));
assert.equal(url.origin, 'https://sosgeo.artdata.slu.se');
assert.equal(url.searchParams.get('version'), '1.0.0');
assert(!url.searchParams.has('startIndex'));
assert.match(url.searchParams.get('CQL_FILTER'), /isPresentObservation = true/);
assert.match(url.searchParams.get('CQL_FILTER'), /isUncertainIdentification = false/);
assert.match(url.searchParams.get('CQL_FILTER'), /Gavia stellata %/);
assert(!/reporter|recordedBy|remarks|subscription|key|token/i.test(url.href));
assert.throws(() => Data.buildURL([{id: 1, latin: "invalid'"}], period));

(async () => {
    let calls = 0;
    const zero = await Data.fetchPublic(targets, period, {fetch: async (_, opts) => {
        calls++; assert.equal(opts.credentials, 'omit'); assert(!opts.headers); return response(payload());
    }});
    assert.equal(calls, 7); assert.equal(zero.records.length, 0); assert(zero.complete);
    const dedup = await Data.fetchPublic([target], period, {fetch: async () => response(payload([feature(1), feature(1), feature(2)]))});
    assert.equal(dedup.records.length, 2);
    await assert.rejects(Data.fetchPublic([target], period, {fetch: async () => response(payload([feature(1, {startDate: 'bad'})]))}));
    await assert.rejects(Data.fetchPublic([target], period, {fetch: async () => response(payload([feature(1), feature(2, {startDate: 'bad'})]))}));
    for (const bad of [payload([], {numberMatched: 2}), payload([], {numberMatched: null}), payload([], {totalFeatures: 12}),
        payload([], {numberReturned: 1}), {}, {type: 'FeatureCollection', features: []}]) {
        await assert.rejects(Data.fetchPublic([target], period, {fetch: async () => response(bad)}));
    }
    await assert.rejects(Data.fetchPublic([target], period, {fetch: async () => ({ok: false, status: 503})}));
    await assert.rejects(Data.fetchPublic([target], period, {fetch: async () => ({ok: true, json: async () => {throw new SyntaxError('XML response');}})}));
    let q = 0, filters = [];
    const split = await Data.fetchPublic([target], period, {fetch: async url => {
        const cql = new URL(url).searchParams.get('CQL_FILTER'); filters.push(cql);
        if (++q === 1) return response(payload(Array.from({length: 5000}, (_, i) => feature(i + 1))));
        // Multi-day report crosses the split but still belongs to its start partition.
        return response(payload(q === 2 ? [feature(6001, {startDate: period.startDate, endDate: period.endDate})] : [feature(6002, {startDate: '2026-10-17T08:00Z', endDate: '2026-10-17T08:00Z'})]));
    }});
    assert.equal(q, 3); assert.equal(split.records.length, 2);
    const splitTime = filters[1].match(/startDate < '([^']+)'/)[1];
    assert(filters[2].includes(`startDate >= '${splitTime}'`));
    assert(filters.every(f => f.includes(`endDate <= '${period.endDate}'`)));
    // Art partitioning precedes time partitioning, and a late failure cannot return partial success.
    q = 0;
    await assert.rejects(Data.fetchPublic(targets.slice(0, 2), period, {fetch: async () => {
        if (++q === 1) return response(payload([], {numberMatched: 5000}));
        if (q === 2) return response(payload());
        throw new Error('Last partition failed');
    }}));
    assert.equal(q, 3);
    // Too many reports at one timestamp fails closed rather than truncating.
    q = 0;
    await assert.rejects(Data.fetchPublic([target], period, {fetch: async () => {q++; return response(payload([], {numberMatched: 5000}));}}));
    assert.equal(q, 25);
    const app = fs.readFileSync(path.join(__dirname, '../static/js/efterlysta.js'), 'utf8');
    assert(!app.includes('innerHTML'), 'External data must use safe DOM text');
    assert(!/api.artdatabanken.se|subscription-key/i.test(app));
    console.log('PASS Efterlysta: 53 taxa, Swedish 7-day/DST boundaries, public-only schema, locality/record deduplication, order/heat, cache, zero/error/XML and safe saturated-query splitting.');
})().catch(error => {console.error(error); process.exitCode = 1;});
