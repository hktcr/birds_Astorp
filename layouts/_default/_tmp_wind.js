            var spdMap = {};
            spdVals.forEach(function (v) { spdMap[v.date] = parseFloat(v.value) || 0; });

            var startMs = new Date('2026-01-01').getTime();

            // Samla energi (tid × hastighet) i de fyra kardinalriktningarna per dag
            var dayData = {};
            dirVals.forEach(function (v) {
                if (v.date < startMs) return;
                var deg = parseFloat(v.value);
                var spd = spdMap[v.date] || 0;
                if (isNaN(deg) || spd === 0) return;

                var d = new Date(v.date).toISOString().slice(0, 10);
                if (!dayData[d]) dayData[d] = { s: 0, n: 0, v: 0, o: 0, count: 0 };

                var rad = deg * Math.PI / 180;
                // deg är varifrån vinden blåser. 0 = N, 90 = Ö, 180 = S, 270 = V

                // Nord/Syd-komponent. cos(0)=1 (Nord), cos(180)=-1 (Syd)
                var ns = Math.cos(rad);
                if (ns > 0) dayData[d].n += ns * spd;
                else if (ns < 0) dayData[d].s += Math.abs(ns) * spd;

                // Öst/Väst-komponent. sin(90)=1 (Öst), sin(270)=-1 (Väst)
                var ew = Math.sin(rad);
                if (ew > 0) dayData[d].o += ew * spd;
                else if (ew < 0) dayData[d].v += Math.abs(ew) * spd;

                dayData[d].count++;
            });

            var days = Object.keys(dayData).sort();
            var vals = { s: [], n: [], v: [], o: [] };
            var maxVal = 0;

            days.forEach(function (d) {
                var dd = dayData[d];
                // Snitt per observationstillfälle under dagen
                var s = dd.count > 0 ? dd.s / dd.count : 0;
                var n = dd.count > 0 ? dd.n / dd.count : 0;
                var v = dd.count > 0 ? dd.v / dd.count : 0;
                var o = dd.count > 0 ? dd.o / dd.count : 0;

                vals.s.push(s);
                vals.n.push(n);
                vals.v.push(v);
                vals.o.push(o);

                maxVal = Math.max(maxVal, s, n, v, o);
            });

            var dayIndices = days.map(function (d) {
                var dt = new Date(d);
                var jan1 = new Date(dt.getFullYear(), 0, 1);
                return Math.floor((dt - jan1) / 86400000);
            });

            // === Canvas setup ===
            var dpr = window.devicePixelRatio || 1;
            var w = canvas.parentElement.clientWidth;
            var labelW = 24;
            var chartW = w - labelW;
            var cellW = chartW / 365;

            // Gör diagrammet rejält mycket högre. 4 rader.
            var rowH = window.innerWidth < 600 ? 40 : 60;
            var gap = 8;
            var groupGap = 16; // Extra mellanrum mellan N/S och V/Ö paret
            var bottomPad = 24;

            var h = (rowH * 4) + (gap * 3) + groupGap + bottomPad; // 3 gaps between 4 rows, 1 groupGap
            canvas.width = w * dpr;
            canvas.height = h * dpr;
            canvas.style.width = w + 'px';
            canvas.style.height = h + 'px';
            var ctx = canvas.getContext('2d');
            ctx.scale(dpr, dpr);

            // Raddefinitioner. S och N som ett block, sedan V och Ö.
            var rows = [
                { id: 'S', y: 0, data: vals.s, color: { r: 205, g: 92, b: 92 } },
                { id: 'N', y: rowH + gap, data: vals.n, color: { r: 70, g: 130, b: 180 } },
                { id: 'V', y: (rowH + gap) * 2 + groupGap, data: vals.v, color: { r: 218, g: 145, b: 32 } },
                { id: 'Ö', y: (rowH + gap) * 3 + groupGap, data: vals.o, color: { r: 56, g: 163, b: 155 } }
            ];

            // Ritar hela diagrammet (återanvänds vid redraw)
            var drawAll = function (hightlightFromIdx, highlightToIdx) {
                ctx.fillStyle = '#fff';
                ctx.fillRect(0, 0, w, h);

                if (hightlightFromIdx !== undefined && highlightToIdx !== undefined) {
                    var hx1 = labelW + hightlightFromIdx * cellW;
                    var hx2 = labelW + (highlightToIdx + 1) * cellW;
                    ctx.fillStyle = 'rgba(255, 235, 59, 0.3)';
                    ctx.fillRect(hx1, 0, hx2 - hx1, h - bottomPad);
                    ctx.strokeStyle = 'rgba(255, 193, 7, 0.6)';
                    ctx.lineWidth = 1;
                    ctx.strokeRect(hx1, 0, hx2 - hx1, h - bottomPad);
                }

                rows.forEach(function (row) {
                    ctx.fillStyle = 'rgba(0,0,0,0.015)';
                    ctx.fillRect(labelW, row.y, chartW, rowH);

                    // Baslinje för raden (i botten av raden, stapeln växer uppåt)
                    ctx.strokeStyle = 'rgba(0,0,0,0.08)';
                    ctx.lineWidth = 0.5;
                    ctx.beginPath();
                    ctx.moveTo(labelW, row.y + rowH);
                    ctx.lineTo(w, row.y + rowH);
                    ctx.stroke();

                    for (var i = 0; i < days.length; i++) {
                        var val = row.data[i];
                        if (val < 0.1) continue;

                        var xi = dayIndices[i];
                        var x = labelW + xi * cellW;

                        var norm = maxVal > 0 ? val / maxVal : 0;
                        var barH = norm * (rowH - 1);
                        var alpha = 0.4 + 0.6 * norm;

                        var c = row.color;
                        ctx.fillStyle = 'rgba(' + c.r + ',' + c.g + ',' + c.b + ',' + alpha.toFixed(3) + ')';
                        ctx.fillRect(x, row.y + rowH - barH, Math.ceil(cellW) + 0.2, barH);
                    }

                    // Etikett (S, N, V, Ö)
                    ctx.textAlign = 'right';
                    ctx.textBaseline = 'middle';
                    ctx.font = '11px Inter, sans-serif';
                    ctx.fillStyle = 'rgba(' + row.color.r + ',' + row.color.g + ',' + row.color.b + ',0.8)';
                    ctx.fillText(row.id, labelW - 6, row.y + rowH / 2);
                });

                var monthStarts = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
                var monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Maj', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dec'];
                ctx.strokeStyle = 'rgba(0,0,0,0.08)';
                ctx.lineWidth = 0.5;
                ctx.textAlign = 'center';
                ctx.font = '9px Inter, sans-serif';
                ctx.fillStyle = '#999';
                for (var m = 0; m < 12; m++) {
                    var mx = labelW + monthStarts[m] * cellW;
                    ctx.beginPath();
                    ctx.moveTo(mx, 0);
                    ctx.lineTo(mx, h - bottomPad);
                    ctx.stroke();
