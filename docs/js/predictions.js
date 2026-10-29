/* Seasonal suggestions from historical species/calendar-day counts.
 * These are relative scores, not calibrated sighting probabilities.
 * Legacy localStorage rounds are deliberately neither read nor deleted.
 */
(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory(require('./stockholm-dates.js'));
    else root.AstorpPredictions = factory(root.StockholmDates);
}(typeof window !== 'undefined' ? window : this, function (dates) {
    'use strict';
    var HORIZON = 30;
    function key(name) { return String(name).trim().normalize('NFC').toLocaleLowerCase('sv'); }

    function rank(checklist, guide, daily, now) {
        var today = dates.stockholmDay(now);
        if (!today || !checklist || !Number.isInteger(checklist.year) || !Array.isArray(checklist.observations)) throw new Error('Invalid checklist/date');
        if (Number(today.slice(0, 4)) !== checklist.year) return { status: 'wrong-year', year: checklist.year, today: today, candidates: [] };
        if (!guide || !Array.isArray(guide.species) || !daily || typeof daily !== 'object' || Array.isArray(daily)) throw new Error('Invalid historical data');
        var observed = new Set();
        checklist.observations.forEach(function (obs) {
            if (!obs || !obs.species || !dates.plainDay(obs.date)) throw new Error('Invalid observation');
            if (Number(obs.date.slice(0, 4)) === checklist.year && obs.date <= today) observed.add(key(obs.species));
        });
        var calendar = [];
        for (var offset = 0; offset < HORIZON; offset++) {
            var day = dates.addDays(today, offset);
            if (Number(day.slice(0, 4)) !== checklist.year) break;
            calendar.push({ day: day.slice(5), weight: HORIZON - offset });
        }
        var byName = Object.create(null);
        Object.keys(daily).filter(function (name) { return name !== '_meta'; }).forEach(function (name) {
            var counts = daily[name];
            if (!counts || typeof counts !== 'object' || Array.isArray(counts)) throw new Error('Invalid day counts');
            Object.keys(counts).forEach(function (day) {
                // The reference year is leap so valid 29 February records survive.
                if (!/^\d{2}-\d{2}$/.test(day) || !dates.plainDay('2000-' + day) || !Number.isInteger(counts[day]) || counts[day] < 0) throw new Error('Invalid historical day/count');
            });
            var normalized = key(name);
            if (byName[normalized]) throw new Error('Duplicate historical species');
            byName[normalized] = counts;
        });
        var seen = new Set();
        var candidates = [];
        guide.species.forEach(function (species) {
            if (!species || typeof species.name !== 'string' || !species.name.trim()) throw new Error('Invalid species');
            var normalized = key(species.name);
            if (seen.has(normalized)) throw new Error('Duplicate species');
            seen.add(normalized);
            if (observed.has(normalized) || !byName[normalized]) return;
            var score = calendar.reduce(function (sum, entry) { return sum + (byName[normalized][entry.day] || 0) * entry.weight; }, 0);
            if (score > 0) candidates.push({ name: species.name, score: score });
        });
        candidates.sort(function (a, b) { return b.score - a.score || a.name.localeCompare(b.name, 'sv'); });
        return { status: 'ok', today: today, endDay: dates.addDays(today, calendar.length - 1), year: checklist.year,
            sourceDate: daily._meta && daily._meta.generated || '', candidates: candidates.slice(0, 3) };
    }

    function mount(options) {
        var env = options.environment || window;
        var doc = env.document;
        var cards = doc.getElementById('prediction-cards');
        var status = doc.getElementById('prediction-score');
        if (!cards || !status) return;
        var lastDay = '', busy = false;
        function message(text) { cards.replaceChildren(); status.textContent = text; }
        function getJSON(url) {
            return env.fetch(url, { cache: 'no-cache' }).then(function (response) {
                if (!response.ok) throw new Error('HTTP ' + response.status);
                return response.json();
            });
        }
        function refresh() {
            if (busy) return Promise.resolve();
            busy = true;
            return Promise.all([getJSON(options.checklistURL), getJSON(options.guideURL), getJSON(options.dailyURL)])
                .then(function (sources) {
                    var result = rank(sources[0], sources[1], sources[2], new env.Date());
                    lastDay = result.today;
                    if (result.status === 'wrong-year') {
                        message('Årslistan gäller ' + result.year + '. Aktuella tips kräver en årslista för ' + result.today.slice(0, 4) + '.');
                        return;
                    }
                    cards.replaceChildren();
                    result.candidates.forEach(function (candidate) {
                        var href = options.speciesLinks[key(candidate.name)];
                        var card = doc.createElement(href ? 'a' : 'div');
                        card.className = 'prediction-card';
                        if (href) { card.href = href; card.setAttribute('aria-describedby', 'prediction-link-hint'); }
                        var label = doc.createElement('span');
                        label.className = 'prediction-species';
                        label.textContent = candidate.name;
                        card.appendChild(label);
                        cards.appendChild(card);
                    });
                    status.textContent = (result.candidates.length ? 'Period: ' : 'Inga återstående arter har fynd i underlaget för perioden ')
                        + dates.formatDay(result.today) + ' till ' + dates.formatDay(result.endDay) + ' ' + result.year + '.';
                    var source = doc.getElementById('prediction-source');
                    if (source) source.textContent = 'Dagsunderlag märkt ' + (dates.plainDay(result.sourceDate) ? result.sourceDate : 'med okänt datum')
                        + '. Historiska fynd från Artportalen och fältdagboken. Fynden är ojämnt rapporterade och underlaget uppdateras inte i realtid.';
                }).catch(function () {
                    lastDay = '';
                    message('Tipsen kunde inte beräknas. Ladda om sidan för att försöka igen.');
                }).finally(function () { busy = false; });
        }
        // Recompute on Stockholm date changes, including a page left open overnight.
        var timer = env.setInterval(function () {
            if (!doc.hidden && dates.stockholmDay(new env.Date()) !== lastDay) refresh();
        }, 60000);
        function onVisible() { if (!doc.hidden) refresh(); }
        doc.addEventListener('visibilitychange', onVisible);
        var ready = refresh();
        return { ready: ready, refresh: refresh, destroy: function () { env.clearInterval(timer); doc.removeEventListener('visibilitychange', onVisible); } };
    }
    return { rank: rank, mount: mount };
}));
