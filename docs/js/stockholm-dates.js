/* Calendar dates and query boundaries independent of the visitor's timezone. */
(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory();
    else root.StockholmDates = factory();
}(typeof window !== 'undefined' ? window : this, function () {
    'use strict';
    var DAY = 86400000;
    var MONTHS = ['jan', 'feb', 'mar', 'apr', 'maj', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'];
    var WEEKDAYS = ['söndag', 'måndag', 'tisdag', 'onsdag', 'torsdag', 'fredag', 'lördag'];

    function plainDay(value) {
        if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return '';
        var timestamp = Date.parse(value + 'T00:00:00Z');
        return Number.isFinite(timestamp) && new Date(timestamp).toISOString().slice(0, 10) === value ? value : '';
    }

    function stockholmDay(instant) {
        var date = instant === undefined ? new Date() : new Date(instant);
        if (!Number.isFinite(date.getTime())) return '';
        return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Stockholm', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
    }

    function addDays(day, amount) {
        if (!plainDay(day)) throw new Error('Invalid calendar date');
        return new Date(Date.parse(day + 'T00:00:00Z') + amount * DAY).toISOString().slice(0, 10);
    }

    function offsetMinutes(instant) {
        var part = new Intl.DateTimeFormat('en-US', { timeZone: 'Europe/Stockholm', timeZoneName: 'shortOffset' })
            .formatToParts(new Date(instant)).find(function (p) { return p.type === 'timeZoneName'; }).value;
        var match = part.match(/^GMT([+-])(\d{1,2})(?::(\d{2}))?$/);
        if (!match) throw new Error('Unknown Stockholm offset');
        return (match[1] === '+' ? 1 : -1) * (Number(match[2]) * 60 + Number(match[3] || 0));
    }

    function midnight(day) {
        if (!plainDay(day)) throw new Error('Invalid calendar date');
        var wallTime = Date.parse(day + 'T00:00:00Z');
        var instant = wallTime - offsetMinutes(wallTime) * 60000;
        return wallTime - offsetMinutes(instant) * 60000;
    }

    function dateWindow(days, now) {
        if (!Number.isInteger(days) || days < 1) throw new Error('Invalid day count');
        var toDay = stockholmDay(now), fromDay = addDays(toDay, 1 - days);
        return {
            fromDay: fromDay, toDay: toDay,
            startDate: new Date(midnight(fromDay)).toISOString(),
            endDate: new Date(midnight(addDays(toDay, 1)) - 1).toISOString()
        };
    }

    function observationDay(event) {
        event = event || {};
        // A source-supplied calendar date is authoritative, never timezone-shifted.
        var plain = plainDay(event.plainStartDate);
        if (plain) return plain;
        var start = event.startDate || '';
        if (/[T ].*(?:Z|[+-]\d{2}:?\d{2})$/i.test(start)) return stockholmDay(start);
        // A date or a timezone-less source timestamp is a local calendar date.
        return plainDay(start.slice(0, 10));
    }

    function formatDay(day, weekday) {
        if (!plainDay(day)) return 'Datum saknas';
        var date = new Date(day + 'T00:00:00Z');
        return (weekday ? WEEKDAYS[date.getUTCDay()] + ' ' : '') + date.getUTCDate() + ' ' + MONTHS[date.getUTCMonth()];
    }

    function difference(from, to) {
        return plainDay(from) && plainDay(to) ? (Date.parse(to) - Date.parse(from)) / DAY : NaN;
    }

    function compareEvents(a, b) {
        var byDay = observationDay(b).localeCompare(observationDay(a));
        return byDay || String((b || {}).startDate || '').localeCompare(String((a || {}).startDate || ''));
    }

    return { plainDay: plainDay, stockholmDay: stockholmDay, addDays: addDays, dateWindow: dateWindow,
        observationDay: observationDay, formatDay: formatDay, difference: difference, compareEvents: compareEvents };
}));
