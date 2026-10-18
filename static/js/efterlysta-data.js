/* Public SOS WFS only. No subscription key, account or protected observations. */
(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory(require('./stockholm-dates.js'));
    else root.EfterlystaData = factory(root.StockholmDates);
}(typeof window !== 'undefined' ? window : this, function (Dates) {
    'use strict';
    var ENDPOINT = 'https://sosgeo.artdata.slu.se/geoserver/SOS/ows';
    var PAGE_SIZE = 5000;
    var CACHE_VERSION = 1;
    var FRESH_MS = 15 * 60 * 1000;
    var FIELDS = ['occurrenceId', 'dataProviderId', 'isPresentObservation', 'startDate', 'endDate',
        'decimalLatitude', 'decimalLongitude', 'locality', 'municipality', 'county',
        'dyntaxaTaxonId', 'vernacularName', 'scientificName', 'taxonCategory', 'isUncertainIdentification', 'organismQuantity'];

    function clean(value) { return typeof value === 'string' ? value.trim() : ''; }
    function normalized(value) { return clean(value).normalize('NFC').toLocaleLowerCase('sv-SE').replace(/\s+/g, ' '); }
    function quoted(value) { return "'" + String(value).replace(/'/g, "''") + "'"; }
    function signature(targets) { return targets.map(function (t) { return t.id + ':' + t.latin; }).join('|'); }

    function buildURL(targets, period, partition) {
        if (!targets.length || !Dates.plainDay(period.fromDay) || !Dates.plainDay(period.toDay)) throw new Error('Ogiltig sökning');
        var taxa = targets.map(function (t) {
            if (!Number.isSafeInteger(t.id) || !/^[A-Za-z -]+$/.test(t.latin)) throw new Error('Ogiltig art');
            // Exact IDs preserve aliases; scientific names also include subspecies.
            return '(dyntaxaTaxonId = ' + t.id + ' OR scientificName = ' + quoted(t.latin) +
                ' OR scientificName LIKE ' + quoted(t.latin + ' %') + ')';
        }).join(' OR ');
        var cql = "dataProviderId = 1 AND county = 'Skåne' AND isPresentObservation = true" +
            ' AND startDate >= ' + quoted(partition ? partition.start : period.startDate) +
            ' AND startDate < ' + quoted(partition ? partition.end : new Date(Date.parse(period.endDate) + 1).toISOString()) +
            ' AND endDate <= ' + quoted(period.endDate) +
            ' AND isUncertainIdentification = false' +
            " AND (taxonCategory = 'Art' OR taxonCategory = 'Underart')" +
            ' AND (' + taxa + ')';
        var params = new URLSearchParams({service: 'WFS', version: '1.0.0', request: 'GetFeature',
            typeName: 'SOS:SpeciesObservations', outputFormat: 'application/json', maxFeatures: String(PAGE_SIZE),
            propertyName: FIELDS.join(','), CQL_FILTER: cql});
        return ENDPOINT + '?' + params.toString();
    }

    function targetFor(properties, targets) {
        var exact = targets.find(function (t) { return t.id === Number(properties.dyntaxaTaxonId); });
        if (exact) return exact;
        var latin = normalized(properties.scientificName);
        return targets.find(function (t) { var base = normalized(t.latin); return latin === base || latin.startsWith(base + ' '); });
    }

    function locationKey(record) {
        var name = normalized(record.locality), municipality = normalized(record.municipality);
        if (name && municipality) return 'name:' + municipality + '|' + name;
        if (Number.isFinite(record.lat) && Number.isFinite(record.lng)) return 'point:' + record.lat.toFixed(5) + ',' + record.lng.toFixed(5);
        return '';
    }

    function normalizeFeature(feature, targets, period) {
        var p = feature && feature.properties;
        if (!p || Number(p.dataProviderId) !== 1 || normalized(p.county) !== 'skåne' ||
            !(p.isPresentObservation === true || p.isPresentObservation === 1) || p.isUncertainIdentification !== false ||
            !['art', 'underart'].includes(normalized(p.taxonCategory))) return null;
        var target = targetFor(p, targets);
        if (!target) return null;
        var day = Dates.observationDay({startDate: p.startDate});
        var endDay = Dates.observationDay({startDate: p.endDate});
        var startTime = Date.parse(p.startDate), endTime = Date.parse(p.endDate);
        if (!day || !endDay || !Number.isFinite(startTime) || !Number.isFinite(endTime) || endTime < startTime ||
            day < period.fromDay || endDay > period.toDay || endDay < day) return null;
        var id = clean(p.occurrenceId);
        if (!/^urn:lsid:artportalen\.se:sighting:\d+$/.test(id)) return null;
        var lat = p.decimalLatitude, lng = p.decimalLongitude;
        var coordsValid = typeof lat === 'number' && typeof lng === 'number' && Number.isFinite(lat) && Number.isFinite(lng) &&
            lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
        var count = p.organismQuantity;
        return {id: id, taxonId: target.id, day: day, endDay: endDay, startDate: clean(p.startDate),
            locality: clean(p.locality), municipality: clean(p.municipality),
            lat: coordsValid ? lat : null, lng: coordsValid ? lng : null,
            count: typeof count === 'number' && Number.isFinite(count) && count >= 0 ? count : null};
    }

    function summarize(records, targets) {
        var byTaxon = {};
        targets.forEach(function (t) { byTaxon[t.id] = {records: [], locations: new Set(), latestDay: ''}; });
        var seen = new Set();
        records.forEach(function (r) {
            if (seen.has(r.id) || !byTaxon[r.taxonId]) return;
            seen.add(r.id);
            var item = byTaxon[r.taxonId], key = locationKey(r);
            item.records.push(r);
            if (key) item.locations.add(key);
            if (r.day > item.latestDay) item.latestDay = r.day;
        });
        Object.keys(byTaxon).forEach(function (id) {
            var item = byTaxon[id];
            item.locationCount = item.locations.size;
            delete item.locations;
            item.records.sort(function (a, b) { return b.day.localeCompare(a.day) || b.startDate.localeCompare(a.startDate) || a.id.localeCompare(b.id); });
        });
        return byTaxon;
    }

    function heatLevel(count) { return count >= 20 ? 3 : count >= 10 ? 2 : count >= 5 ? 1 : count >= 1 ? 0 : null; }
    function orderedTargets(targets, summary) {
        var found = targets.filter(function (t) { return !!t.history; });
        var wanted = targets.filter(function (t) { return !t.history; }).slice();
        wanted.sort(function (a, b) {
            return ((summary[b.id] || {}).locationCount || 0) - ((summary[a.id] || {}).locationCount || 0) ||
                a.name.localeCompare(b.name, 'sv-SE');
        });
        return found.concat(wanted);
    }

    function cacheState(cache, targets, period, now) {
        now = now === undefined ? Date.now() : now;
        if (!cache || cache.version !== CACHE_VERSION || cache.signature !== signature(targets) || cache.complete !== true || cache.rejected > 0 ||
            !Array.isArray(cache.records) || !Number.isFinite(Date.parse(cache.fetchedAt)) || Date.parse(cache.fetchedAt) > now + 60000 ||
            !cache.period || !Dates.plainDay(cache.period.fromDay) || !Dates.plainDay(cache.period.toDay)) return 'invalid';
        if (cache.period.fromDay !== period.fromDay || cache.period.toDay !== period.toDay) return 'different-window';
        if (!cache.records.every(function (r) {
            return r && typeof r.id === 'string' && /^urn:lsid:artportalen\.se:sighting:\d+$/.test(r.id) &&
                targets.some(function (t) { return t.id === r.taxonId; }) &&
                Dates.plainDay(r.day) && Dates.plainDay(r.endDay) && r.day >= period.fromDay && r.endDay <= period.toDay && r.endDay >= r.day &&
                typeof r.startDate === 'string' && typeof r.locality === 'string' && typeof r.municipality === 'string' &&
                (r.lat === null || (Number.isFinite(r.lat) && r.lat >= -90 && r.lat <= 90)) &&
                (r.lng === null || (Number.isFinite(r.lng) && r.lng >= -180 && r.lng <= 180)) &&
                (r.count === null || (Number.isFinite(r.count) && r.count >= 0));
        })) return 'invalid';
        return !cache.lastAttemptFailed && now - Date.parse(cache.fetchedAt) <= FRESH_MS ? 'fresh' : 'stale';
    }

    async function fetchPublic(targets, period, options) {
        options = options || {};
        var fetcher = options.fetch || fetch, batchSize = 8;
        var batches = [];
        for (var i = 0; i < targets.length; i += batchSize) batches.push(targets.slice(i, i + batchSize));
        var collected = [], rejected = 0, pages = 0, completedBatches = 0;
        // Two simultaneous read requests bound load on SLU's public service.
        var next = 0;
        async function runQuery(batch, partition, depth) {
            if (depth > 24) throw new Error('För stort underlag för en säker, komplett sökning');
            var response = await fetcher(buildURL(batch, period, partition), {credentials: 'omit', signal: options.signal});
            if (!response.ok) throw new Error('Datakällan svarade HTTP ' + response.status);
            var data = await response.json();
            if (!data || data.type !== 'FeatureCollection' || !Array.isArray(data.features) || data.features.length > PAGE_SIZE) throw new Error('Ogiltigt datasvar');
            if (data.numberReturned !== undefined && (data.numberReturned === null || data.numberReturned === '' || Number(data.numberReturned) !== data.features.length)) throw new Error('Ofullständigt datasvar');
            pages++;
            // WFS totals are capped at 5000 and offset pages are unstable at tied dates.
            // Split full queries instead of claiming completeness or skipping tied records.
            if (data.features.length === PAGE_SIZE || Number(data.numberMatched) >= PAGE_SIZE || Number(data.totalFeatures) >= PAGE_SIZE) {
                if (batch.length > 1) {
                    var middle = Math.ceil(batch.length / 2);
                    await runQuery(batch.slice(0, middle), partition, depth + 1);
                    await runQuery(batch.slice(middle), partition, depth + 1);
                } else {
                    var from = Date.parse(partition.start), to = Date.parse(partition.end);
                    if (to - from <= 1) throw new Error('För många fynd med samma tidpunkt');
                    var split = new Date(Math.floor((from + to) / 2)).toISOString();
                    await runQuery(batch, {start: partition.start, end: split}, depth + 1);
                    await runQuery(batch, {start: split, end: partition.end}, depth + 1);
                }
                return;
            }
            var total = data.numberMatched === undefined ? data.totalFeatures : data.numberMatched;
            if (total === null || total === '' || !Number.isFinite(Number(total)) || Number(total) !== data.features.length) throw new Error('Ofullständigt svar från datakällan');
            ['numberMatched', 'totalFeatures'].forEach(function (field) {
                if (data[field] !== undefined && (data[field] === null || data[field] === '' || Number(data[field]) !== data.features.length)) throw new Error('Motstridiga totalsiffror från datakällan');
            });
            data.features.forEach(function (feature) {
                var record = normalizeFeature(feature, batch, period);
                if (record) collected.push(record); else rejected++;
            });
        }
        async function runBatch(batch) {
            await runQuery(batch, {start: period.startDate, end: new Date(Date.parse(period.endDate) + 1).toISOString()}, 0);
            completedBatches++;
            if (options.progress) options.progress(completedBatches, batches.length);
        }
        async function worker() { while (next < batches.length) { var batch = batches[next++]; await runBatch(batch); } }
        await Promise.all([worker(), worker()]);
        if (rejected) throw new Error('Underlaget innehåller poster som inte kunde verifieras eller tolkas');
        var seen = new Set();
        var records = collected.filter(function (r) { if (seen.has(r.id)) return false; seen.add(r.id); return true; });
        return {version: CACHE_VERSION, signature: signature(targets), period: period, fetchedAt: new Date().toISOString(),
            complete: true, records: records, rejected: rejected, pages: pages, completedBatches: completedBatches, totalBatches: batches.length};
    }

    return {ENDPOINT: ENDPOINT, PAGE_SIZE: PAGE_SIZE, FRESH_MS: FRESH_MS, buildURL: buildURL,
        normalizeFeature: normalizeFeature, locationKey: locationKey, summarize: summarize, heatLevel: heatLevel,
        orderedTargets: orderedTargets, cacheState: cacheState, fetchPublic: fetchPublic, signature: signature};
}));
