/* Public minimal snapshot reader. No credentials, personal-data or live SOS requests. */
(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory(require('./stockholm-dates.js'));
    else root.ArtportalenSnapshot = factory(root.StockholmDates);
}(typeof window !== 'undefined' ? window : this, function (dates) {
    'use strict';
    function select(data, days, now) {
        const source = data && data.source;
        const window = dates.dateWindow(days, now);
        if (!source || data.schemaVersion !== 1 || source.dataProviderId !== 1 || source.municipalityId !== '1277' ||
            source.complete !== true || source.sensitiveObservations !== false ||
            !Array.isArray(data.records) || source.recordCount !== data.records.length ||
            !dates.plainDay(source.fromDay) || !dates.plainDay(source.toDay) ||
            source.fromDay > window.fromDay || source.toDay < window.toDay) {
            throw new Error('Komplett Artportalen-underlag saknas för vald period.');
        }
        const fetched = Date.parse(source.retrievedAt);
        const instant = now === undefined ? Date.now() : new Date(now).getTime();
        if (!Number.isFinite(fetched) || fetched > instant || instant - fetched > 86400000) {
            throw new Error('Underlaget är inte aktuellt. Senaste fullständiga filen har bevarats.');
        }
        const query = source.query || {};
        if (!query.dataProvider || JSON.stringify(query.dataProvider.ids) !== '[1]' ||
            !query.geographics || JSON.stringify(query.geographics.areas) !== '[{"areaType":"Municipality","featureId":"1277"}]' ||
            !query.taxon || JSON.stringify(query.taxon.ids) !== '[4000104]' || query.taxon.includeUnderlyingTaxa !== true ||
            !query.date || query.date.dateFilterType !== 'OnlyStartDate') {
            throw new Error('Källurval saknas eller avviker.');
        }
        const seen = new Set(), result = [];
        data.records.forEach(record => {
            const taxon = record && record.taxon, occurrence = record && record.occurrence;
            const date = dates.observationDay(record && record.event);
            if (!record || record.dataProviderId !== 1 || record.municipalityId !== '1277' || !taxon || !Number.isSafeInteger(taxon.id) || taxon.id <= 0 ||
                typeof taxon.taxonRank !== 'string' || !taxon.taxonRank.trim() ||
                typeof taxon.scientificName !== 'string' || !taxon.scientificName.trim() ||
                (taxon.vernacularName != null && typeof taxon.vernacularName !== 'string') ||
                !occurrence || typeof occurrence.occurrenceId !== 'string' || !occurrence.occurrenceId.trim() ||
                seen.has(occurrence.occurrenceId) || !date || date < source.fromDay || date > source.toDay ||
                typeof occurrence.isPositiveObservation !== 'boolean') {
                throw new Error('Ofullständiga, dubblerade eller felkällade observationer.');
            }
            seen.add(occurrence.occurrenceId);
            if (date >= window.fromDay && date <= window.toDay && occurrence.isPositiveObservation) {
                // Project only safe minimal fields even if an input accidentally contains more.
                result.push({dataProviderId: 1, municipalityId: '1277', taxon: {id: taxon.id, taxonRank: taxon.taxonRank,
                    vernacularName: taxon.vernacularName || taxon.scientificName, scientificName: taxon.scientificName},
                    occurrence: {occurrenceId: occurrence.occurrenceId, isPositiveObservation: true},
                    event: {plainStartDate: date, startDate: date}});
            }
        });
        return result;
    }
    async function load(fetcher, url, days, now) {
        const response = await fetcher(url, {cache: 'no-store'});
        if (!response.ok) throw new Error('Underlag saknas (HTTP ' + response.status + ').');
        return select(await response.json(), days, now);
    }
    return {select, load};
}));
