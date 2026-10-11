/* Date-aware SMHI data handling shared by the page and its regression tests. */
(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory();
    else root.WeatherData = factory();
}(typeof window !== 'undefined' ? window : this, function () {
    'use strict';
    var DAY = 86400000;
    var START = '2026-01-01';
    var END = '2026-12-31';

    function dayOffset(day, amount) {
        return new Date(Date.parse(day + 'T00:00:00Z') + amount * DAY).toISOString().slice(0, 10);
    }

    function today() {
        return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Stockholm' }).format(new Date());
    }

    function mergeValues(archive, live) {
        var values = new Map();
        // Archive wins over provisional live measurements on overlap.
        [live || [], archive || []].forEach(function (rows) {
            rows.forEach(function (row) {
                var day = row.ref || (Number.isFinite(row.date) ? new Date(row.date).toISOString().slice(0, 10) : '');
                if (day < START || day > END || row.value == null || String(row.value).trim() === '' || row.quality === 'R') return;
                var value = Number(row.value);
                if (!Number.isFinite(value)) return;
                var item = { value: value, quality: row.quality };
                if (row.ref) item.ref = row.ref;
                else item.date = row.date;
                values.set(row.ref || row.date, item);
            });
        });
        return Array.from(values.values()).sort(function (a, b) {
            var x = a.ref || a.date, y = b.ref || b.date;
            return x < y ? -1 : x > y ? 1 : 0;
        });
    }

    function dailyPoints(points) {
        var map = new Map();
        (points || []).forEach(function (point) {
            if (/^\d{4}-\d{2}-\d{2}$/.test(point.x) && Number.isFinite(point.y)) map.set(point.x, point.y);
        });
        return Array.from(map, function (entry) { return { x: entry[0], y: entry[1] }; })
            .sort(function (a, b) { return a.x.localeCompare(b.x); });
    }

    function coverage(points, from, to, now) {
        var rows = dailyPoints(points);
        var yesterday = dayOffset(now || today(), -1);
        from = from > START ? from : START;
        to = [to || END, END, yesterday].sort()[0];
        var count = rows.filter(function (p) { return p.x >= from && p.x <= to; }).length;
        var expected = from > to ? 0 : Math.round((Date.parse(to) - Date.parse(from)) / DAY) + 1;
        var latest = rows.length ? rows[rows.length - 1].x : null;
        var stale = latest && latest < dayOffset(now || today(), -2);
        var text = rows.length ? 'Underlag: ' + rows[0].x + ' till ' + latest + '. ' : 'Mätdata saknas. ';
        text += expected ? count + ' av ' + expected + ' avslutade dygn i vald period.' : 'Inga avslutade dygn i vald period.';
        if (count < expected) text += ' Luckor är saknade värden, inte noll.';
        if (stale) text += ' Serien är inte aktuell.';
        return { text: text, incomplete: count < expected || !rows.length || !!stale, latest: latest };
    }

    function withGaps(points) {
        var rows = dailyPoints(points), result = [];
        rows.forEach(function (point, index) {
            if (index && dayOffset(rows[index - 1].x, 1) < point.x) {
                result.push({ x: dayOffset(rows[index - 1].x, 1), y: null });
            }
            result.push(point);
        });
        return result;
    }

    function meadowWindow(flow, rain, now) {
        now = now || today();
        var yesterday = dayOffset(now, -1);
        var sources = [dailyPoints(flow), dailyPoints(rain)].map(function (rows) {
            return rows.filter(function (p) { return p.x <= yesterday; });
        });
        var dates = sources.map(function (rows) { return rows.length ? rows[rows.length - 1].x : null; });
        var reason = 'Regn senast ' + (dates[1] || 'saknas') + '. Vattenföring senast ' + (dates[0] || 'saknas') + '.';
        if (dates.some(function (date) { return !date || date < dayOffset(now, -2); })) {
            return { available: false, reason: 'Underlaget saknas eller är för gammalt. ' + reason };
        }
        var to = dates.slice().sort()[0], from = dayOffset(to, -13);
        var windows = sources.map(function (rows) { return rows.filter(function (p) { return p.x >= from && p.x <= to; }); });
        if (windows.some(function (rows) { return rows.length !== 14; })) {
            return { available: false, reason: 'Ofullständigt underlag för ' + from + ' till ' + to + '. ' + reason };
        }
        return { available: true, from: from, to: to, flow: windows[0], rain: windows[1] };
    }

    var archiveRequest;
    function getJSON(url) {
        return fetch(url).then(function (r) {
            if (!r.ok) throw new Error('HTTP ' + r.status);
            return r.json();
        });
    }

    function loadMetobs(param, station) {
        if (!archiveRequest) archiveRequest = getJSON('/data/weather-archive-2026.json').catch(function () { return null; });
        var liveURL = 'https://opendata-download-metobs.smhi.se/api/version/1.0/parameter/' + param + '/station/' + station + '/period/latest-months/data.json';
        return Promise.all([archiveRequest, getJSON(liveURL).catch(function () { return null; })]).then(function (results) {
            var archive = results[0] && results[0].series && results[0].series[param + '/' + station];
            var live = results[1];
            var warnings = [];
            if (!archive || !Array.isArray(archive.value)) warnings.push('Årsarkivet kunde inte laddas.');
            if (!live || !Array.isArray(live.value)) warnings.push('Senaste mätningarna kunde inte laddas.');
            return { value: mergeValues(archive && Array.isArray(archive.value) ? archive.value : [], live && Array.isArray(live.value) ? live.value : []), warnings: warnings };
        });
    }

    return { dayOffset: dayOffset, today: today, mergeValues: mergeValues, dailyPoints: dailyPoints, coverage: coverage, withGaps: withGaps, meadowWindow: meadowWindow, loadMetobs: loadMetobs };
}));
