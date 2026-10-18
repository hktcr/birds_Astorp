(function () {
    'use strict';
    var Data = window.EfterlystaData, Dates = window.StockholmDates;
    var targets = JSON.parse(document.getElementById('efterlysta-targets').textContent);
    var grid = document.getElementById('bountyGrid');
    var status = document.getElementById('efterlysta-status');
    var coverage = document.getElementById('efterlysta-coverage');
    var refreshButton = document.getElementById('efterlysta-refresh');
    var detail = document.getElementById('efterlysta-detail');
    var detailContent = document.getElementById('efterlysta-detail-content');
    var mapDialog = document.getElementById('skane-map-dialog');
    var CACHE_KEY = 'efterlysta-public-skane-v1';
    var period = Dates.dateWindow(7), activeCache = null, summary = {}, current = false;
    var pending = null, controller = null, generation = 0, openTaxon = null, map = null, markers = null, lastFailure = false;
    var cards = {};
    grid.querySelectorAll('[data-taxon-id]').forEach(function (card) { cards[card.dataset.taxonId] = card; });

    function element(tag, text, className) {
        var node = document.createElement(tag);
        if (text !== undefined) node.textContent = text;
        if (className) node.className = className;
        return node;
    }
    function rangeLabel(window) { return Dates.formatDay(window.fromDay) + '–' + Dates.formatDay(window.toDay) + ' ' + window.toDay.slice(0, 4); }
    function timeLabel(instant) { return new Intl.DateTimeFormat('sv-SE', {timeZone: 'Europe/Stockholm', dateStyle: 'short', timeStyle: 'short'}).format(new Date(instant)); }
    function readCache() { try { return JSON.parse(localStorage.getItem(CACHE_KEY)); } catch (_) { return null; } }
    function saveCache(cache) { try { localStorage.setItem(CACHE_KEY, JSON.stringify(cache)); } catch (_) { /* Live data remains usable if storage is unavailable. */ } }
    function sourceLink(record) { return 'https://www.artportalen.se/sighting/' + record.id.split(':').pop(); }
    function recordCount(record) { return record.count === null ? 'Antal ej angivet' : record.count + (record.count === 1 ? ' individ' : ' individer'); }
    function recordDate(record) { return Dates.formatDay(record.day) + (record.endDay !== record.day ? '–' + Dates.formatDay(record.endDay) : ''); }
    function setStatus(message, state) { status.textContent = message; status.dataset.state = state; }

    function drawCards(cache, isCurrent) {
        activeCache = cache; current = isCurrent;
        summary = Data.summarize(cache ? cache.records : [], targets);
        Data.orderedTargets(targets, cache ? summary : {}).forEach(function (target) {
            var card = cards[target.id], item = summary[target.id];
            card.classList.remove('heat-0', 'heat-1', 'heat-2', 'heat-3');
            card.removeAttribute('data-unique-locs');
            if (!target.history) {
                var label = 'Aktuellt underlag saknas';
                if (cache) {
                    card.dataset.uniqueLocs = String(item.locationCount);
                    label = (isCurrent ? '' : 'Sparat: ') + item.locationCount + (item.locationCount === 1 ? ' lokal' : ' lokaler') + ' · ' + item.records.length + ' rapporter';
                    var level = Data.heatLevel(item.locationCount);
                    if (isCurrent && level !== null) card.classList.add('heat-' + level);
                }
                card.querySelector('.bounty-count').textContent = label;
            }
            grid.appendChild(card);
        });
        if (cache) {
            coverage.textContent = 'Period: ' + rangeLabel(cache.period) + ' (svensk tid). Hämtat ' + timeLabel(cache.fetchedAt) +
                '. Samtliga ' + targets.length + ' arter sökta, ' + cache.records.length + ' offentliga rapporter. ' +
                (cache.rejected ? cache.rejected + ' ofullständiga eller avvikande poster räknas inte. ' : '') +
                'Dagens rapportering pågår.';
        } else coverage.textContent = 'Avsedd period: ' + rangeLabel(period) + ' (svensk tid). Inga aktuella antal eller färger visas innan hela sökningen lyckats.';
        if (detail.open && openTaxon) renderDetail(openTaxon);
        if (mapDialog.open) closeMap();
    }

    function renderDetail(target) {
        detailContent.replaceChildren();
        document.getElementById('efterlysta-detail-title').textContent = target.name;
        if (target.history) {
            detailContent.appendChild(element('p', target.history.text, 'tomtkryss-modal-content'));
        }
        if (!activeCache) {
            detailContent.appendChild(element('p', 'Aktuella Skånefynd kunde inte visas. Försök uppdatera fynden.'));
            return;
        }
        var item = summary[target.id];
        detailContent.appendChild(element('p', (current ? 'Offentliga fynd i Skåne' : 'Sparat underlag, inte aktuellt verifierat') +
            ' · ' + rangeLabel(activeCache.period) + ' · hämtat ' + timeLabel(activeCache.fetchedAt), 'modal-subtitle'));
        if (!item.records.length) {
            detailContent.appendChild(element('p', 'Inga offentliga rapporter hittades för arten under perioden. Det betyder inte att arten saknas i Skåne.'));
            return;
        }
        detailContent.appendChild(element('p', item.locationCount + ' lokaler · ' + item.records.length + ' rapporter'));
        if (item.records.some(function (r) { return r.lat !== null && r.lng !== null; })) {
            var mapButton = element('button', 'Visa på karta', 'efterlysta-map-button');
            mapButton.type = 'button';
            mapButton.addEventListener('click', function () { openMap(target); });
            detailContent.appendChild(mapButton);
        }
        var list = element('div', undefined, 'modal-obs-list');
        item.records.forEach(function (record) {
            var row = element('article', undefined, 'modal-obs-item');
            var location = (record.locality || 'Lokal ej angiven') + (record.municipality ? ' · ' + record.municipality : '');
            row.appendChild(element('strong', location, 'modal-obs-loc'));
            row.appendChild(element('span', recordDate(record) + ' · ' + recordCount(record), 'modal-obs-meta'));
            var link = element('a', 'Se originalfyndet i Artportalen');
            link.href = sourceLink(record); link.target = '_blank'; link.rel = 'noopener noreferrer';
            row.appendChild(link); list.appendChild(row);
        });
        detailContent.appendChild(list);
    }

    function openDetail(target) { openTaxon = target; renderDetail(target); if (!detail.open) detail.showModal(); }
    function closeDetail() { closeMap(); detail.close(); openTaxon = null; }
    function closeMap() { if (mapDialog.open) mapDialog.close(); }
    function openMap(target) {
        var records = summary[target.id].records;
        document.getElementById('skane-map-title').textContent = 'Skånefynd: ' + target.name;
        document.getElementById('skane-map-note').textContent = (current ? '' : 'Sparat, inte aktuellt verifierat. ') +
            rangeLabel(activeCache.period) + ' · hämtat ' + timeLabel(activeCache.fetchedAt) + '. Endast offentliga positioner.';
        if (!mapDialog.open) mapDialog.showModal();
        if (!window.L) {
            document.getElementById('skane-map-note').textContent += ' Kartbiblioteket kunde inte laddas.';
            return;
        }
        if (!map) {
            map = L.map('skane-map-container').setView([55.85, 13.45], 8);
            L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {maxZoom: 18, attribution: '© OpenStreetMap'}).addTo(map);
            markers = L.layerGroup().addTo(map);
        }
        markers.clearLayers();
        var bounds = [];
        records.forEach(function (record) {
            if (record.lat === null || record.lng === null) return;
            var popup = element('div');
            popup.appendChild(element('strong', (record.locality || 'Lokal ej angiven') + ' · ' + record.municipality));
            popup.appendChild(element('p', recordDate(record) + ' · ' + recordCount(record)));
            var link = element('a', 'Originalfyndet'); link.href = sourceLink(record); link.target = '_blank'; link.rel = 'noopener noreferrer';
            popup.appendChild(link);
            L.circleMarker([record.lat, record.lng], {radius: 6, color: '#9a3412', fillColor: '#f97316', fillOpacity: 0.6}).addTo(markers).bindPopup(popup);
            bounds.push([record.lat, record.lng]);
        });
        requestAnimationFrame(function () { map.invalidateSize(); if (bounds.length) map.fitBounds(bounds, {padding: [25, 25], maxZoom: 12}); });
    }

    async function refresh(force) {
        var nextPeriod = Dates.dateWindow(7);
        var changedWindow = nextPeriod.fromDay !== period.fromDay || nextPeriod.toDay !== period.toDay;
        if (pending && !changedWindow) return pending;
        if (controller) controller.abort();
        period = nextPeriod;
        var cached = activeCache || readCache();
        var state = Data.cacheState(cached, targets, period);
        if (!force && state === 'fresh' && !lastFailure) {
            if (activeCache !== cached || !current) drawCards(cached, true);
            setStatus('Aktuellt underlag från de senaste sju dagarna. Automatisk kontroll var 15:e minut.', 'fresh');
            return;
        }
        if (state === 'fresh' || state === 'stale') drawCards(cached, false); else drawCards(null, false);
        setStatus('Hämtar offentliga Skånefynd för ' + rangeLabel(period) + '…', 'loading');
        refreshButton.disabled = true;
        controller = new AbortController();
        var ownController = controller, run = ++generation;
        var timer = setTimeout(function () { ownController.abort(); }, 90000);
        pending = Data.fetchPublic(targets, period, {
            signal: ownController.signal,
            progress: function (done, total) { if (run === generation) setStatus('Hämtar Skånefynd: ' + done + ' av ' + total + ' artgrupper klara…', 'loading'); }
        }).then(function (cache) {
            if (run !== generation) return;
            // A query spanning Swedish midnight must never label yesterday's window current.
            if (cache.period.toDay !== Dates.stockholmDay()) { pending = null; return refresh(true); }
            lastFailure = false;
            saveCache(cache); drawCards(cache, true);
            setStatus(cache.records.length ? 'Aktuella Skånefynd hämtade. Sortering och färger använder samma sjudagarsperiod.' :
                'Sökningen lyckades: inga offentliga rapporter för de listade arterna under perioden.', 'fresh');
        }).catch(function () {
            ownController.abort();
            if (run !== generation) return;
            lastFailure = true;
            var fallback = Data.cacheState(cached, targets, period);
            if (fallback === 'fresh' || fallback === 'stale') {
                cached = Object.assign({}, cached, {lastAttemptFailed: true});
                saveCache(cached);
                drawCards(cached, false);
                setStatus('Hela hämtningen kunde inte slutföras. Sparat underlag visas med hämtningstid; färgerna är avstängda tills en ny hämtning lyckas.', 'stale');
            } else {
                drawCards(null, false);
                setStatus('Hela hämtningen kunde inte slutföras. Aktuell sortering och färgmarkering är inte tillgängliga. Försök igen.', 'error');
                if (fallback === 'different-window') coverage.textContent += ' Det sparade underlaget avser ' + rangeLabel(cached.period) + ' och används inte för dagens rangordning.';
            }
        }).finally(function () {
            clearTimeout(timer);
            if (run === generation) { pending = null; refreshButton.disabled = false; }
        });
        return pending;
    }

    targets.forEach(function (target) { cards[target.id].addEventListener('click', function () { openDetail(target); }); });
    refreshButton.addEventListener('click', function () { refresh(true); });
    document.getElementById('efterlysta-close').addEventListener('click', closeDetail);
    document.getElementById('skane-map-close').addEventListener('click', closeMap);
    [detail, mapDialog].forEach(function (dialog) {
        dialog.addEventListener('click', function (event) {
            if (event.target !== dialog) return;
            var rect = dialog.getBoundingClientRect();
            if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
        });
    });
    mapDialog.addEventListener('keydown', function (event) {
        if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); closeMap(); }
    }, true);
    document.addEventListener('visibilitychange', function () { if (!document.hidden) refresh(false); });
    setInterval(function () { if (!document.hidden) refresh(false); }, 60000);
    refresh(false);
}());
