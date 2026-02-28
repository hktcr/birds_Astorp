    // ================================================================
    // CHART 5: Vindkomponenter 2.0 — Symmetrisk Zonal & Färgkodad
    // ================================================================
    function buildWindChart() {
        var canvas = document.getElementById('wind-chart');
        if (!canvas) return;

        var urlDir = 'https://opendata-download-metobs.smhi.se/api/version/1.0/parameter/3/station/' + STATION_TEMP + '/period/latest-months/data.json';
        var urlSpd = 'https://opendata-download-metobs.smhi.se/api/version/1.0/parameter/4/station/' + STATION_TEMP + '/period/latest-months/data.json';

        Promise.all([fetch(urlDir).then(function (r) { return r.json(); }), fetch(urlSpd).then(function (r) { return r.json(); })]).then(function (results) {
            var dirVals = results[0].value || [];
            var spdVals = results[1].value || [];

            var spdMap = {};
            spdVals.forEach(function (v) { spdMap[v.date] = parseFloat(v.value) || 0; });

            var startMs = new Date('2026-01-01').getTime();

            // Samla vektor-energi per dag för N/S och V/Ö
            var dayData = {};
            dirVals.forEach(function (v) {
                if (v.date < startMs) return;
                var deg = parseFloat(v.value);
                var spd = spdMap[v.date] || 0;
                if (isNaN(deg) || spd === 0) return;

                var d = new Date(v.date).toISOString().slice(0, 10);
                if (!dayData[d]) dayData[d] = { ns_net: 0, ew_net: 0, sum_spd: 0, count: 0 };

                var rad = deg * Math.PI / 180;
                // deg är varifrån vinden blåser. 0 = N, 90 = Ö, 180 = S, 270 = V

                // Nord/Syd-vektor. cos(0)=1 (Nord), cos(180)=-1 (Syd)
                dayData[d].ns_net += Math.cos(rad) * spd;
                // Öst/Väst-vektor. sin(90)=1 (Öst), sin(270)=-1 (Väst)
                dayData[d].ew_net += Math.sin(rad) * spd;

                dayData[d].sum_spd += spd;
                dayData[d].count++;
            });

            var days = Object.keys(dayData).sort();
            var dayItems = [];
            var maxVal = 0;

            // Färgpalett för väderstreck (RGB)
            // N = Blå, Ö = Lila, S = Röd, V = Gul
            var C_N = [70, 130, 180];
            var C_E = [148, 0, 211];
            var C_S = [205, 92, 92];
            var C_W = [238, 175, 40];

            function lerpColor(c1, c2, t) {
                return [
                    Math.round(c1[0] + (c2[0] - c1[0]) * t),
                    Math.round(c1[1] + (c2[1] - c1[1]) * t),
                    Math.round(c1[2] + (c2[2] - c1[2]) * t)
                ];
            }

            function getColorFromAngle(deg) {
                // Normalisera deg till 0-360
                deg = ((deg % 360) + 360) % 360;
                if (deg <= 90) return lerpColor(C_N, C_E, deg / 90);
                if (deg <= 180) return lerpColor(C_E, C_S, (deg - 90) / 90);
                if (deg <= 270) return lerpColor(C_S, C_W, (deg - 180) / 90);
                return lerpColor(C_W, C_N, (deg - 270) / 90);
            }

            days.forEach(function (d) {
                var dd = dayData[d];
                var ns = dd.count > 0 ? dd.ns_net / dd.count : 0;
                var ew = dd.count > 0 ? dd.ew_net / dd.count : 0;

                // Vinkel för dagens snittvind (i grader från Norr)
                var angle = Math.atan2(ew, ns) * 180 / Math.PI;
                if (angle < 0) angle += 360; // Hantera negativ vinkel
                var color = getColorFromAngle(angle);

                // Fördelning av höjd.
                // Zonal (Ö/V) komponent delas 50/50 på både norr och söder raden för symmetri.
                // Meridional (N/S) komponent bygger enbart på sin egen rad.
                var absEW = Math.abs(ew);
                var h_n = (ns > 0 ? ns : 0) + (absEW / 2);
                var h_s = (ns < 0 ? Math.abs(ns) : 0) + (absEW / 2);

                dayItems.push({
                    h_n: h_n,
                    h_s: h_s,
                    color: color,
                    totalMag: Math.sqrt(ns * ns + ew * ew) // Endast för intern max-check
                });

                if (h_n > maxVal) maxVal = h_n;
                if (h_s > maxVal) maxVal = h_s;
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
            
            // Endast 2 rader i detta nya format
            var rowH = window.innerWidth < 600 ? 55 : 80;
            var gap = 2; // Mycket litet gap mellan N och S (mittaxeln)
            var bottomPad = 24;
            
            var h = (rowH * 2) + gap + bottomPad;
            canvas.width = w * dpr;
            canvas.height = h * dpr;
            canvas.style.width = w + 'px';
            canvas.style.height = h + 'px';
            var ctx = canvas.getContext('2d');
            ctx.scale(dpr, dpr);

            // Ritar hela diagrammet (återanvänds vid redraw)
            var drawAll = function(hightlightFromIdx, highlightToIdx) {
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

                var y_n = 0;
                var y_s = rowH + gap;
                
                // Bakgrund för raderna
                ctx.fillStyle = 'rgba(0,0,0,0.015)';
                ctx.fillRect(labelW, y_n, chartW, rowH);
                ctx.fillRect(labelW, y_s, chartW, rowH);

                // Centerlinjen (mellan Nord och Syd raden)
                ctx.strokeStyle = 'rgba(0,0,0,0.1)';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(labelW, rowH + gap / 2);
                ctx.lineTo(w, rowH + gap / 2);
                ctx.stroke();

                for (var i = 0; i < days.length; i++) {
                    var item = dayItems[i];
                    if (item.h_n < 0.1 && item.h_s < 0.1) continue;

                    var xi = dayIndices[i];
                    var x = labelW + xi * cellW;
                    
                    var normN = maxVal > 0 ? item.h_n / maxVal : 0;
                    var normS = maxVal > 0 ? item.h_s / maxVal : 0;
                    
                    var barH_N = normN * (rowH - 1);
                    var barH_S = normS * (rowH - 1);
                    
                    // Alpha baserad på total "energi"
                    var energyNorm = maxVal > 0 ? item.totalMag / (maxVal*1.5) : 0;
                    var alpha = 0.4 + 0.6 * Math.min(1, Math.pow(Math.abs(energyNorm), 0.5));

                    var c = item.color;
                    ctx.fillStyle = 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + alpha.toFixed(3) + ')';
                    
                    // Rita Nord-stapel (går nerifrån mittaxeln och UPPÅT ← dvs dras från rowH och upp)
                    if (barH_N > 0) {
                        ctx.fillRect(x, y_n + rowH - barH_N, Math.ceil(cellW) + 0.3, barH_N);
                    }
                    // Rita Syd-stapel (går från mittaxeln och NEDÅT)
                    if (barH_S > 0) {
                        ctx.fillRect(x, y_s, Math.ceil(cellW) + 0.3, barH_S);
                    }
                }

                // Etiketter (N, S)  -- I mitten axeln!
                ctx.textAlign = 'right';
                ctx.textBaseline = 'middle';
                ctx.font = 'bold 12px Inter, sans-serif';
                ctx.fillStyle = 'rgba(70,130,180,0.9)'; // Blå för N
                ctx.fillText('N', labelW - 6, rowH - 6);
                ctx.fillStyle = 'rgba(205,92,92,0.9)';  // Röd för S
                ctx.fillText('S', labelW - 6, rowH + gap + 6);
                
                // Månadslinjer + labels
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
                }

                // Enkel legend i övre vänstra hörnet av hela ritytan
                ctx.textAlign = 'left';
                ctx.textBaseline = 'top';
                ctx.font = '9px Inter, sans-serif';
                var legX = labelW + 6;
                var legY = 6;
                // Bakgrund till legenden
                ctx.fillStyle = 'rgba(255,255,255,0.85)';
                ctx.fillRect(legX - 2, legY - 2, 130, 14);
                
                ctx.fillStyle = 'rgba(70,130,180,1)';
                ctx.fillText('N: Blå', legX, legY);
                ctx.fillStyle = 'rgba(148,0,211,1)';
                ctx.fillText('Ö: Lila', legX + 33, legY);
                ctx.fillStyle = 'rgba(205,92,92,1)';
                ctx.fillText('S: Röd', legX + 66, legY);
                ctx.fillStyle = 'rgba(238,175,40,1)';
                ctx.fillText('V: Gul', legX + 99, legY);
            };

            drawAll();

            window._windChartMeta = { canvas: canvas, ctx: ctx, dpr: dpr, w: w, h: h, drawAll: drawAll, dayIndices: dayIndices };
        }).catch(function (error) {
            console.error('Error fetching wind data:', error);
        });
    }
