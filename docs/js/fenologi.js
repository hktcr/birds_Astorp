/**
 * Fenologi — Fågelåret i Åstorp
 * Jämför lokala ankomstdatum med historiska Åstorp- och Skånerekord.
 */
(function () {
    'use strict';

    const MONTH_SHORT = ['jan', 'feb', 'mars', 'apr', 'maj', 'juni', 'juli', 'aug', 'sep', 'okt', 'nov', 'dec'];
    const DAYS_IN_MONTH = [0, 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

    let data = [];
    let sortMode = 'taxonomic';
    let filterMode = 'all';

    async function init() {
        const tbody = document.getElementById('fen-tbody');
        try {
            const res = await fetch('/data/fenologi-db.json');
            data = await res.json();

            render();
            setupControls();
        } catch (e) {
            console.error('Fenologi load error:', e);
            tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:2rem; color:#b91c1c;">Fel vid laddning: ${e.message}</td></tr>`;
        }
    }

    function setupControls() {
        document.querySelectorAll('.fen-toggle-btn[data-sort]').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.fen-toggle-btn[data-sort]').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                sortMode = btn.dataset.sort;
                render();
            });
        });
        document.querySelectorAll('.fen-toggle-btn[data-filter]').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.fen-toggle-btn[data-filter]').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                filterMode = btn.dataset.filter;
                render();
            });
        });
    }

    function mmddToDays(str) {
        if (!str) return 9999;
        const p = str.split('-');
        if (p.length !== 2) return 9999;
        const m = parseInt(p[0], 10), d = parseInt(p[1], 10);
        let days = d;
        for (let i = 1; i < m; i++) days += DAYS_IN_MONTH[i];
        return days;
    }

    function humanDate(mmdd) {
        if (!mmdd) return '–';
        const p = mmdd.split('-');
        if (p.length !== 2) return mmdd;
        const mi = parseInt(p[0], 10) - 1;
        const d = parseInt(p[1], 10);
        return mi >= 0 && mi < 12 ? `${d} ${MONTH_SHORT[mi]}` : mmdd;
    }

    function render() {
        let items = data.filter(d => {
            if (filterMode === 'arrived') return d.obs2026 !== null;
            if (filterMode === 'missing') return d.obs2026 === null;
            return true;
        });

        items.sort((a, b) => {
            if (sortMode === 'chronological') {
                const da = a.obs2026 ? mmddToDays(a.obs2026.date.substring(5)) : 9999;
                const db = b.obs2026 ? mmddToDays(b.obs2026.date.substring(5)) : 9999;
                if (da !== db) return da - db;
            }
            return a.taxoIndex - b.taxoIndex;
        });

        const tbody = document.getElementById('fen-tbody');
        tbody.innerHTML = '';

        items.forEach((item, idx) => {
            // --- Main row ---
            const tr = document.createElement('tr');
            const rowId = 'fen-detail-' + idx;

            let rowClass = 'fen-row';
            let badgeHtml = '';
            let statusNote = '';

            if (!item.obs2026) {
                rowClass += ' fen-row--waiting';
                badgeHtml = `<span class="fen-badge fen-badge--waiting">Vantas</span>`;
            } else {
                rowClass += ' fen-row--arrived';
                const obsMmdd = item.obs2026.date.substring(5);
                const obsDays = mmddToDays(obsMmdd);
                const skaneDays = mmddToDays(item.skaneRec);
                const astorpDays = mmddToDays(item.astorpHist);

                if (item.skaneRec && obsDays <= skaneDays) {
                    rowClass = 'fen-row fen-row--skane-record';
                    const diff = skaneDays - obsDays;
                    badgeHtml = `<span class="fen-badge fen-badge--skane">Skanerekord?</span>`;
                    statusNote = diff === 0
                        ? 'Tangerar gällande Skånerekord.'
                        : `${diff} dagar före gällande Skånerekord.`;
                } else if (item.astorpHist && obsDays < astorpDays) {
                    rowClass = 'fen-row fen-row--astorp-record';
                    const diff = astorpDays - obsDays;
                    badgeHtml = `<span class="fen-badge fen-badge--astorp-new">Nytt Astorpsrekord</span>`;
                    statusNote = `${diff} dagar tidigare an foregaende Astorpsrekord (${humanDate(item.astorpHist)}).`;
                } else {
                    badgeHtml = `<span class="fen-badge fen-badge--ok">Anland</span>`;
                }
            }

            tr.className = rowClass;
            tr.setAttribute('aria-expanded', 'false');
            tr.setAttribute('data-detail', rowId);

            const obsDate = item.obs2026 ? humanDate(item.obs2026.date.substring(5)) : '–';
            const astorpHistDate = item.astorpHist ? humanDate(item.astorpHist) : '–';
            const skaneDate = item.skaneRec ? humanDate(item.skaneRec) : '–';

            tr.innerHTML = `
                <td>
                    <div class="fen-species">${item.name}</div>
                    <div class="fen-latin">${item.latin}</div>
                </td>
                <td class="fen-date${!item.obs2026 ? ' fen-date--dim' : ''}">${obsDate}</td>
                <td class="fen-date fen-date--dim">${astorpHistDate}</td>
                <td class="fen-date fen-date--dim">${skaneDate}</td>
                <td>${badgeHtml}</td>
            `;

            // Click handler
            tr.addEventListener('click', () => toggleDetail(rowId, tr));
            tbody.appendChild(tr);

            // --- Detail row (hidden by default) ---
            const detailTr = document.createElement('tr');
            detailTr.className = 'fen-detail-row';
            detailTr.id = rowId;

            let detailItems = '';

            if (item.obs2026) {
                detailItems += detailBlock('Datum', item.obs2026.date);
                detailItems += detailBlock('Lokal', item.obs2026.location || '–');
                if (item.obs2026.lat && item.obs2026.lng) {
                    detailItems += detailBlock('Koordinater', `${item.obs2026.lat.toFixed(4)}, ${item.obs2026.lng.toFixed(4)}`);
                }
            } else {
                detailItems += detailBlock('Status', 'Ej observerad i Astorp under 2026');
            }

            if (item.astorpHist) {
                detailItems += detailBlock('Astorp historiskt rekord', humanDate(item.astorpHist));
            }
            if (item.skaneRec) {
                detailItems += detailBlock('Skane (FiSk 2021)', humanDate(item.skaneRec));
            }
            if (statusNote) {
                detailItems += detailBlock('Notering', statusNote);
            }

            detailTr.innerHTML = `<td colspan="5"><div class="fen-detail">${detailItems}</div></td>`;
            tbody.appendChild(detailTr);
        });

        document.getElementById('fen-count').textContent = items.length;
    }

    function detailBlock(label, value) {
        return `<div class="fen-detail-item"><span class="fen-detail-label">${label}</span><span class="fen-detail-value">${value}</span></div>`;
    }

    function toggleDetail(rowId, mainRow) {
        const detail = document.getElementById(rowId);
        if (!detail) return;

        // Close all others first
        document.querySelectorAll('.fen-detail-row.open').forEach(r => {
            if (r.id !== rowId) {
                r.classList.remove('open');
                const prev = r.previousElementSibling;
                if (prev) prev.setAttribute('aria-expanded', 'false');
            }
        });

        const isOpen = detail.classList.contains('open');
        detail.classList.toggle('open');
        mainRow.setAttribute('aria-expanded', isOpen ? 'false' : 'true');
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
