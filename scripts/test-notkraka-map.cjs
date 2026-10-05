'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const map = require('../static/js/notkraka-map.js');
const TODAY = '2026-10-04';
const feature = (overrides = {}) => ({ type: 'Feature', properties: {
    occurrenceId: 'urn:lsid:artportalen.se:sighting:123',
    url: 'https://www.artportalen.se/sighting/123',
    dyntaxaTaxonId: 100090, dataProviderId: 1, municipality: 'Åstorp', isPresentObservation: true,
    startDate: '2026-09-30T22:00:00Z', decimalLatitude: 56.09238, decimalLongitude: 13.08285,
    locality: 'Forsgård', organismQuantity: 4, coordinateUncertaintyInMeters: 250,
    ...overrides
} });
const collection = features => ({ type: 'FeatureCollection', features, numberMatched: features.length });
const response = data => ({ ok: true, json: async () => data });

test('WFS request is credential-free and tightly scoped', () => {
    const url = new URL(map.buildURL());
    assert.equal(url.hostname, 'sosgeo.artdata.slu.se');
    assert.equal(url.searchParams.get('version'), '1.0.0');
    assert.equal(url.searchParams.get('srsName'), 'EPSG:4326');
    assert.equal(url.searchParams.get('CQL_Filter'), "dyntaxaTaxonId=100090 AND municipality='Åstorp' AND dataProviderId=1 AND isPresentObservation=TRUE");
    assert(!/key|token|secret/i.test(map.buildURL()));
});

test('Swedish calendar dates are independent of visitor timezone', () => {
    assert.equal(map.dateInSweden('2026-09-30T22:00:00Z'), '2026-10-01');
    assert.equal(map.dateInSweden('2025-12-31T23:30:00Z'), '2026-01-01');
    assert.equal(map.dateInSweden('2026-03-29T00:30:00Z'), '2026-03-29');
    assert.equal(map.dateInSweden('2026-03-29'), '2026-03-29');
    assert.equal(map.dateInSweden('invalid'), null);
});

test('Existing year colors and inclusive decade boundaries are preserved', () => {
    assert.equal(map.periodFor('2026-01-01', TODAY), 'current');
    assert.equal(map.periodFor('2025-12-31', TODAY), 'last-year');
    assert.equal(map.periodFor('2016-01-01', TODAY), 'decade');
    assert.equal(map.periodFor('2015-12-31', TODAY), 'older');
    assert.deepEqual(map.COLORS, { current: '#dc2626', 'last-year': '#f97316', decade: '#eab308', older: '#9ca3af' });
});

test('Normalizes quantities, dates and uncertainty; deduplicates occurrence IDs', () => {
    const result = map.normalize(collection([feature(), feature()]), TODAY);
    assert.equal(result.length, 1);
    assert.equal(result[0].date, '2026-10-01');
    assert.equal(result[0].quantity, 4);
    assert.equal(result[0].uncertainty, 250);
    const unknown = map.normalize(collection([feature({ organismQuantity: null, coordinateUncertaintyInMeters: null })]), TODAY)[0];
    assert.equal(unknown.quantity, null);
    assert.equal(unknown.uncertainty, null);
});

test('Rejects incomplete/invalid responses; filters wrong taxa, sources and absent sightings', () => {
    assert.throws(() => map.normalize({ ...collection([feature()]), numberMatched: 2 }, TODAY));
    assert.throws(() => map.normalize({ records: [] }, TODAY));
    const result = map.normalize(collection([feature(), feature({ occurrenceId: 'wrong', dyntaxaTaxonId: 99 }), feature({ occurrenceId: 'absent', isPresentObservation: false }), feature({ occurrenceId: 'other', dataProviderId: 2 }), feature({ occurrenceId: 'future', startDate: '2027-01-01' })]), TODAY);
    assert.equal(result.length, 1);
    assert.throws(() => map.normalize(collection([feature({ decimalLatitude: null })]), TODAY));
});

test('Thirty-day filter includes today and preceding 29 calendar dates', () => {
    const records = ['2026-09-04', '2026-09-05', '2026-10-04'].map(date => ({ date }));
    assert.deepEqual(map.filterRecords(records, 'recent', TODAY).map(r => r.date), ['2026-09-05', '2026-10-04']);
    assert.equal(map.filterRecords(records, 'current', TODAY).length, 3);
    assert.equal(map.filterRecords(records, 'last-year', TODAY).length, 0);
});

test('Location markers use report count and latest date, not summed bird quantities', () => {
    const records = map.normalize(collection([feature(), feature({ occurrenceId: 'second', startDate: '2025-06-01', organismQuantity: 10 })]), TODAY);
    const groups = map.groupRecords(records);
    assert.equal(groups.length, 1);
    assert.equal(groups[0].records.length, 2);
    assert.equal(groups[0].date, '2026-10-01');
});

test('Observation links cannot inject an arbitrary protocol or destination', () => {
    assert.equal(map.sourceURL('javascript:alert(1)'), null);
    assert.equal(map.sourceURL('https://evil.example/sighting/123'), null);
    assert.equal(map.sourceURL('https://artportalen.se.evil.example/sighting/123'), null);
    assert.equal(map.sourceURL('https://www.artportalen.se/sighting/123'), 'https://www.artportalen.se/sighting/123');
});

test('Every load requests fresh data; a valid empty result never becomes stale fallback', async () => {
    const calls = [];
    const fetcher = async (url, options) => { calls.push({ url, options }); return response(collection([])); };
    const data = await map.loadData('/fallback.json', fetcher, TODAY);
    assert.equal(data.reserve, false);
    assert.deepEqual(data.records, []);
    assert.equal(calls.length, 1);
    assert.equal(calls[0].options.cache, 'no-store');
    assert.equal(calls[0].options.credentials, 'omit');
    await map.loadData('/fallback.json', fetcher, TODAY);
    assert.equal(calls.length, 2);
});

test('Network failure uses dated reserve data; missing reserve data stays an error', async () => {
    const fallback = { ...collection([feature()]), fetchedAt: '2026-10-04T18:04:24Z' };
    const fetcher = async url => { if (url.startsWith('https:')) throw new Error('offline'); return response(fallback); };
    const data = await map.loadData('/fallback.json', fetcher, TODAY);
    assert.equal(data.reserve, true);
    assert.equal(data.fetchedAt, fallback.fetchedAt);
    assert.equal(data.records.length, 1);
    await assert.rejects(map.loadData('/fallback.json', async () => { throw new Error('offline'); }, TODAY));
});

test('Published snapshot is complete, dated and omits reporter identities', () => {
    const snapshot = JSON.parse(fs.readFileSync(path.join(__dirname, '../static/data/notkraka-astorp-fallback.json'), 'utf8'));
    const records = map.normalize(snapshot, TODAY);
    assert.equal(records.length, snapshot.numberMatched);
    assert.equal(records.filter(r => r.date.startsWith('2026')).length, 2);
    assert.equal(records[0].date, '2026-10-01');
    assert(!/recordedBy|reportedBy/.test(JSON.stringify(snapshot)));
    assert(!Number.isNaN(new Date(snapshot.fetchedAt).getTime()));
});
