/**
 * Dygnshjulet — Cirkulär solpositions- & skymningsvisualisering
 * för astorpsfaglar.se / Horisonten
 *
 * Ritar ett 24-timmarshjul med skymningszoner som färgade bågar,
 * solmarkör i realtid, och tidpunkter för gryning/soluppgång/
 * solnedgång/skymning.
 *
 * Meeus/NOAA solpositionsalgoritm (zero dependencies).
 * Default: Åstorp (56.0833°N, 12.9500°E)
 * Stöd för GPS via navigator.geolocation.
 */
(function () {
    'use strict';

    var DEFAULT_LAT = 56.0833;
    var DEFAULT_LNG = 12.9500;
    var DEFAULT_NAME = 'Åstorp';
    var STORAGE_KEY = 'twilight_location';
    var UPDATE_INTERVAL = 60000;

    var currentLat = DEFAULT_LAT;
    var currentLng = DEFAULT_LNG;
    var currentName = DEFAULT_NAME;

    // ================================================================
    // Solpositionsberäkning (Meeus/NOAA)
    // ================================================================
    function getJD(date) {
        var y = date.getFullYear();
        var m = date.getMonth() + 1;
        var d = date.getDate();
        if (m <= 2) { y--; m += 12; }
        var A = Math.floor(y / 100);
        var B = 2 - A + Math.floor(A / 4);
        return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + d + B - 1524.5;
    }

    function minutesToDate(date, minutes) {
        var d = new Date(date);
        d.setHours(0, 0, 0, 0);
        d.setMinutes(Math.round(minutes));
        return d;
    }

    function calcSunTimes(date, lat, lng) {
        var JD = getJD(date);
        var T = (JD - 2451545.0) / 36525.0;

        var L0 = (280.46646 + T * (36000.76983 + T * 0.0003032)) % 360;
        var M = (357.52911 + T * (35999.05029 - T * 0.0001537)) % 360;
        var Mrad = M * Math.PI / 180;
        var C = (1.914602 - T * (0.004817 + T * 0.000014)) * Math.sin(Mrad)
            + (0.019993 - T * 0.000101) * Math.sin(2 * Mrad)
            + 0.000289 * Math.sin(3 * Mrad);
        var sunLon = L0 + C;
        var omega = 125.04 - 1934.136 * T;
        var lambda = sunLon - 0.00569 - 0.00478 * Math.sin(omega * Math.PI / 180);

        var eps0 = 23 + (26 + (21.448 - T * (46.815 + T * (0.00059 - T * 0.001813))) / 60) / 60;
        var eps = eps0 + 0.00256 * Math.cos(omega * Math.PI / 180);
        var epsRad = eps * Math.PI / 180;

        var sinDec = Math.sin(epsRad) * Math.sin(lambda * Math.PI / 180);
        var dec = Math.asin(sinDec);

        var y2 = Math.tan(epsRad / 2);
        y2 = y2 * y2;
        var L0rad = L0 * Math.PI / 180;
        var ecc = 0.016708634 - T * (0.000042037 + T * 0.0000001267);
        var EqT = y2 * Math.sin(2 * L0rad)
            - 2 * ecc * Math.sin(Mrad)
            + 4 * ecc * y2 * Math.sin(Mrad) * Math.cos(2 * L0rad)
            - 0.5 * y2 * y2 * Math.sin(4 * L0rad)
            - 1.25 * ecc * ecc * Math.sin(2 * Mrad);
        var eqtMin = EqT * 180 / Math.PI * 4;

        var latRad = lat * Math.PI / 180;

        function timeForAngle(angle) {
            var cosHA = (Math.sin(angle * Math.PI / 180) - Math.sin(latRad) * sinDec)
                / (Math.cos(latRad) * Math.cos(dec));
            if (cosHA > 1 || cosHA < -1) return null;
            var HA = Math.acos(cosHA) * 180 / Math.PI;
            var solarNoon = 720 - 4 * lng - eqtMin;
            var rise = solarNoon - HA * 4;
            var set = solarNoon + HA * 4;
            var tzOff = date.getTimezoneOffset();
            return {
                rise: minutesToDate(date, rise - tzOff),
                set: minutesToDate(date, set - tzOff)
            };
        }

        var sun = timeForAngle(-0.833);
        var civ = timeForAngle(-6);
        var naut = timeForAngle(-12);
        var astr = timeForAngle(-18);

        var solarNoonMin = 720 - 4 * lng - eqtMin - date.getTimezoneOffset();

        return {
            sunrise: sun ? sun.rise : null,
            sunset: sun ? sun.set : null,
            civilDawn: civ ? civ.rise : null,
            civilDusk: civ ? civ.set : null,
            nauticalDawn: naut ? naut.rise : null,
            nauticalDusk: naut ? naut.set : null,
            astronomicalDawn: astr ? astr.rise : null,
            astronomicalDusk: astr ? astr.set : null,
            solarNoon: minutesToDate(date, solarNoonMin)
        };
    }

    // ================================================================
    // Hjälpfunktioner
    // ================================================================
    function fmtTime(d) {
        if (!d) return '--:--';
        var h = d.getHours();
        var m = d.getMinutes();
        return (h < 10 ? '0' : '') + h + ':' + (m < 10 ? '0' : '') + m;
    }

    function minOfDay(d) {
        return d ? d.getHours() * 60 + d.getMinutes() : 0;
    }

    // Konvertera minuter till vinkel (00:00 = toppen = -PI/2)
    function minToAngle(m) {
        return (m / 1440) * Math.PI * 2 - Math.PI / 2;
    }

    // ================================================================
    // Canvas-rendering: Dygnshjulet
    // ================================================================
    function renderWheel(canvas) {
        var dpr = window.devicePixelRatio || 1;
        var rect = canvas.parentElement.getBoundingClientRect();
        var size = Math.min(rect.width, 380);
        canvas.width = size * dpr;
        canvas.height = size * dpr;
        canvas.style.width = size + 'px';
        canvas.style.height = size + 'px';

        var ctx = canvas.getContext('2d');
        ctx.scale(dpr, dpr);

        var cx = size / 2;
        var cy = size / 2;
        var outerR = size / 2 - 8;
        var innerR = outerR - 32;
        var labelR = outerR - 16;

        var now = new Date();
        var times = calcSunTimes(now, currentLat, currentLng);

        // Rensa
        ctx.clearRect(0, 0, size, size);

        // ── Bakgrundscirkel (subtil) ──
        ctx.beginPath();
        ctx.arc(cx, cy, outerR, 0, Math.PI * 2);
        ctx.fillStyle = '#f5f3ef';
        ctx.fill();

        // ── Skymningszoner som bågar ──
        drawZones(ctx, cx, cy, outerR, innerR, times);

        // ── Inre cirkel (vit) ──
        ctx.beginPath();
        ctx.arc(cx, cy, innerR - 1, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();

        // ── Timmarkörer (diskreta streck) ──
        drawHourMarks(ctx, cx, cy, outerR, innerR);

        // ── Tidpunktsetiketter (sunrise, sunset) ──
        drawTimeLabels(ctx, cx, cy, innerR, times, size);

        // ── "Nu"-markör (solposition) ──
        drawNowMarker(ctx, cx, cy, outerR, innerR, now);

        // ── Central information ──
        drawCenterInfo(ctx, cx, cy, innerR, now, times);
    }

    function drawZones(ctx, cx, cy, outerR, innerR, t) {
        var zones = [];

        if (t.astronomicalDawn && t.astronomicalDusk) {
            // Natt (före astronomisk gryning + efter astronomisk skymning)
            zones.push({ from: 0, to: minOfDay(t.astronomicalDawn), color: '#1a1a2e' });
            zones.push({ from: minOfDay(t.astronomicalDusk), to: 1440, color: '#1a1a2e' });

            // Astronomisk skymning
            zones.push({ from: minOfDay(t.astronomicalDawn), to: minOfDay(t.nauticalDawn), color: '#2d3561' });
            zones.push({ from: minOfDay(t.nauticalDusk), to: minOfDay(t.astronomicalDusk), color: '#2d3561' });
        }

        if (t.nauticalDawn && t.nauticalDusk) {
            zones.push({ from: minOfDay(t.nauticalDawn), to: minOfDay(t.civilDawn), color: '#4a6fa5' });
            zones.push({ from: minOfDay(t.civilDusk), to: minOfDay(t.nauticalDusk), color: '#4a6fa5' });
        }

        if (t.civilDawn && t.civilDusk) {
            zones.push({ from: minOfDay(t.civilDawn), to: minOfDay(t.sunrise), color: '#e8a87c' });
            zones.push({ from: minOfDay(t.sunset), to: minOfDay(t.civilDusk), color: '#e8a87c' });
        }

        if (t.sunrise && t.sunset) {
            zones.push({ from: minOfDay(t.sunrise), to: minOfDay(t.sunset), color: '#87ceeb' });
        }

        zones.forEach(function (z) {
            var a1 = minToAngle(z.from);
            var a2 = minToAngle(z.to);
            ctx.beginPath();
            ctx.arc(cx, cy, outerR, a1, a2);
            ctx.arc(cx, cy, innerR, a2, a1, true);
            ctx.closePath();
            ctx.fillStyle = z.color;
            ctx.fill();
        });
    }

    function drawHourMarks(ctx, cx, cy, outerR, innerR) {
        for (var h = 0; h < 24; h++) {
            var angle = minToAngle(h * 60);
            var cos = Math.cos(angle);
            var sin = Math.sin(angle);

            var isMajor = h % 6 === 0;
            var markInner = isMajor ? innerR - 6 : innerR - 3;
            var markOuter = innerR + 1;

            ctx.beginPath();
            ctx.moveTo(cx + cos * markInner, cy + sin * markInner);
            ctx.lineTo(cx + cos * markOuter, cy + sin * markOuter);
            ctx.strokeStyle = isMajor ? 'rgba(0,0,0,0.25)' : 'rgba(0,0,0,0.10)';
            ctx.lineWidth = isMajor ? 1.5 : 0.8;
            ctx.stroke();

            // Timsiffror (00, 06, 12, 18)
            if (isMajor) {
                var labelDist = innerR - 14;
                var label = h < 10 ? '0' + h : '' + h;
                ctx.font = '600 10px Inter, system-ui, sans-serif';
                ctx.fillStyle = 'rgba(0,0,0,0.35)';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(label, cx + cos * labelDist, cy + sin * labelDist);
            }
        }
    }

    function drawTimeLabels(ctx, cx, cy, innerR, times, size) {
        var labelR = innerR - 30;
        var fontSize = size < 300 ? 9 : 10;

        var labels = [];
        if (times.sunrise) {
            labels.push({ min: minOfDay(times.sunrise), text: fmtTime(times.sunrise), prefix: 'upp ' });
        }
        if (times.sunset) {
            labels.push({ min: minOfDay(times.sunset), text: fmtTime(times.sunset), prefix: 'ned ' });
        }

        ctx.font = '500 ' + fontSize + 'px Inter, system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        labels.forEach(function (l) {
            var angle = minToAngle(l.min);
            var x = cx + Math.cos(angle) * labelR;
            var y = cy + Math.sin(angle) * labelR;

            // Bakgrundsbubbla
            var text = l.prefix + l.text;
            var tw = ctx.measureText(text).width + 8;
            ctx.fillStyle = 'rgba(255,255,255,0.85)';
            ctx.beginPath();
            ctx.roundRect(x - tw / 2, y - 7, tw, 14, 4);
            ctx.fill();

            ctx.fillStyle = '#2B5A2B';
            ctx.fillText(text, x, y);
        });
    }

    function drawNowMarker(ctx, cx, cy, outerR, innerR, now) {
        var nowMin = minOfDay(now);
        var angle = minToAngle(nowMin);
        var cos = Math.cos(angle);
        var sin = Math.sin(angle);

        // Linje genom ringen
        var lineInner = innerR - 2;
        var lineOuter = outerR + 3;
        ctx.beginPath();
        ctx.moveTo(cx + cos * lineInner, cy + sin * lineInner);
        ctx.lineTo(cx + cos * lineOuter, cy + sin * lineOuter);
        ctx.strokeStyle = '#c0392b';
        ctx.lineWidth = 2.5;
        ctx.lineCap = 'round';
        ctx.stroke();

        // Yttre punkt
        var dotR = outerR - 4;
        ctx.beginPath();
        ctx.arc(cx + cos * dotR, cy + sin * dotR, 4, 0, Math.PI * 2);
        ctx.fillStyle = '#c0392b';
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1.5;
        ctx.stroke();
    }

    function drawCenterInfo(ctx, cx, cy, innerR, now, times) {
        // Dagsljuslängd
        var dayMs = (times.sunset && times.sunrise) ? times.sunset - times.sunrise : 0;
        var dayH = Math.floor(dayMs / 3600000);
        var dayM = Math.floor((dayMs % 3600000) / 60000);

        // Aktuell fas
        var phase = getCurrentPhase(now, times);

        // Klockan just nu
        ctx.font = '300 28px Inter, system-ui, sans-serif';
        ctx.fillStyle = '#2B5A2B';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(fmtTime(now), cx, cy - 14);

        // Fas
        ctx.font = '500 11px Inter, system-ui, sans-serif';
        ctx.fillStyle = '#666';
        ctx.fillText(phase.label, cx, cy + 8);

        // Dagsljuslängd
        ctx.font = '400 10px Inter, system-ui, sans-serif';
        ctx.fillStyle = '#999';
        ctx.fillText(dayH + ' h ' + dayM + ' min dagsljus', cx, cy + 24);
    }

    function getCurrentPhase(now, times) {
        var m = minOfDay(now);
        if (!times.sunrise || !times.sunset) return { label: 'Polarnatt' };

        var asDawn = times.astronomicalDawn ? minOfDay(times.astronomicalDawn) : 0;
        var naDawn = times.nauticalDawn ? minOfDay(times.nauticalDawn) : 0;
        var ciDawn = times.civilDawn ? minOfDay(times.civilDawn) : 0;
        var sr = minOfDay(times.sunrise);
        var ss = minOfDay(times.sunset);
        var ciDusk = times.civilDusk ? minOfDay(times.civilDusk) : 1440;
        var naDusk = times.nauticalDusk ? minOfDay(times.nauticalDusk) : 1440;
        var asDusk = times.astronomicalDusk ? minOfDay(times.astronomicalDusk) : 1440;

        if (m < asDawn) return { label: 'Natt' };
        if (m < naDawn) return { label: 'Astronomisk gryning' };
        if (m < ciDawn) return { label: 'Nautisk gryning' };
        if (m < sr) return { label: 'Borgerlig gryning' };
        if (m < ss) return { label: 'Dagsljus' };
        if (m < ciDusk) return { label: 'Borgerlig skymning' };
        if (m < naDusk) return { label: 'Nautisk skymning' };
        if (m < asDusk) return { label: 'Astronomisk skymning' };
        return { label: 'Natt' };
    }

    // ================================================================
    // Tidtabell (text under hjulet)
    // ================================================================
    function renderTimetable(container) {
        var now = new Date();
        var times = calcSunTimes(now, currentLat, currentLng);

        var rows = [
            { label: 'Astronomisk gryning', time: times.astronomicalDawn, type: 'astro' },
            { label: 'Nautisk gryning', time: times.nauticalDawn, type: 'naut' },
            { label: 'Borgerlig gryning', time: times.civilDawn, type: 'civil' },
            { label: 'Soluppgang', time: times.sunrise, type: 'sun' },
            { label: 'Solen hogst', time: times.solarNoon, type: 'noon' },
            { label: 'Solnedgang', time: times.sunset, type: 'sun' },
            { label: 'Borgerlig skymning', time: times.civilDusk, type: 'civil' },
            { label: 'Nautisk skymning', time: times.nauticalDusk, type: 'naut' },
            { label: 'Astronomisk skymning', time: times.astronomicalDusk, type: 'astro' }
        ];

        var html = '<div class="dygn-timetable">';

        // Dag-information (Dagsljuslängd & Zenithöjd)
        var dayMs = (times.sunset && times.sunrise) ? times.sunset - times.sunrise : 0;
        var dayH = Math.floor(dayMs / 3600000);
        var dayM = Math.floor((dayMs % 3600000) / 60000);
        html += '<div class="dygn-day-summary" style="width:100%; display:flex; flex-wrap:wrap; gap:var(--space-sm); justify-content:space-between; align-items:baseline; border-bottom: 1px solid rgba(0,0,0,0.06); margin-bottom:var(--space-md); padding-bottom:8px;">';
        html += '<div style="font-family:var(--font-heading); font-size:var(--text-lg); font-weight:700; color:var(--color-primary-dark);">' + dayH + 'h ' + dayM + 'm <span style="font-size:var(--text-xs); color:var(--color-text-muted); font-weight:600; text-transform:uppercase; letter-spacing:0.04em;">dagsljus</span></div>';
        if (times.solarNoon) {
            html += '<div style="font-family:var(--font-heading); font-size:var(--text-xs); font-weight:600; color:var(--color-text-muted); text-transform:uppercase; letter-spacing:0.04em;">Solen högst: <span style="color:var(--color-text); font-size:var(--text-sm);">' + fmtTime(times.solarNoon) + '</span></div>';
        }
        html += '</div>';

        // 2-kolumn layout för Gryning och Skymning
        html += '<div class="dygn-twilight-cols" style="display:grid; grid-template-columns:1fr 1fr; gap:var(--space-lg); margin-bottom:var(--space-md); width:100%;">';

        // Vänsterkolumn: Gryning
        html += '<div class="dygn-section" style="margin-bottom:0;">';
        html += '<div class="dygn-section-label">Gryning</div>';
        for (var i = 0; i <= 3; i++) {
            var rowData = Object.assign({}, rows[i]);
            rowData.label = rowData.label.replace(' gryning', '');
            html += renderRow(rowData, now);
        }
        html += '</div>';

        // Högerkolumn: Skymning
        html += '<div class="dygn-section" style="margin-bottom:0;">';
        html += '<div class="dygn-section-label">Skymning</div>';
        for (var j = 5; j <= 8; j++) {
            var rowData = Object.assign({}, rows[j]);
            rowData.label = rowData.label.replace(' skymning', '');
            html += renderRow(rowData, now);
        }
        html += '</div>';

        html += '</div>'; // End cols

        // Plats + GPS
        html += '<div class="dygn-footer">';
        html += '<span class="dygn-location">' + currentName;
        html += ' <span class="dygn-coords">(' + currentLat.toFixed(2) + ' N, ' + currentLng.toFixed(2) + ' E)</span>';
        html += '</span>';
        
        html += '<div style="display:flex; gap:8px; margin-top:8px;">';
        html += '<button id="dygn-gps-btn" class="dygn-gps-btn">Uppdatera plats</button>';
        html += '<button id="dygn-info-btn" class="dygn-reset-btn" style="color:var(--color-primary); border-color:var(--color-primary-light); background:rgba(43,90,43,0.02);">F\u00f6rklaring</button>';
        html += '</div>';

        html += '</div>';
        
        html += '</div>';
        container.innerHTML = html;

        // Binda knappar
        var gpsBtn = document.getElementById('dygn-gps-btn');
        if (gpsBtn) gpsBtn.addEventListener('click', requestGPS);
        var infoBtn = document.getElementById('dygn-info-btn');
        if (infoBtn) infoBtn.addEventListener('click', toggleInfoModal);
    }

    function toggleInfoModal() {
        var modal = document.getElementById('dygn-info-modal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'dygn-info-modal';
            modal.style.position = 'fixed';
            modal.style.top = '0';
            modal.style.left = '0';
            modal.style.width = '100%';
            modal.style.height = '100%';
            modal.style.backgroundColor = 'rgba(0, 0, 0, 0.45)';
            modal.style.backdropFilter = 'blur(4px)';
            modal.style.webkitBackdropFilter = 'blur(4px)';
            modal.style.zIndex = '9999';
            modal.style.display = 'flex';
            modal.style.alignItems = 'center';
            modal.style.justifyContent = 'center';
            modal.style.padding = '20px';
            modal.style.opacity = '1';
            
            var content = document.createElement('div');
            content.style.backgroundColor = 'rgba(255, 255, 255, 0.98)';
            content.style.borderRadius = 'var(--radius-lg)';
            content.style.padding = 'var(--space-xl)';
            content.style.maxWidth = '500px';
            content.style.maxHeight = '90vh';
            content.style.overflowY = 'auto';
            content.style.boxShadow = '0 10px 40px rgba(0,0,0,0.2)';
            
            content.innerHTML = 
                '<h3 style="margin-top:0; margin-bottom:var(--space-md); color:var(--color-primary-dark); font-family:var(--font-heading); font-size:1.4rem;">Definition av ljusfaser</h3>' +
                '<p style="font-size:15px; line-height:1.6; color:var(--color-text); margin-bottom:var(--space-lg);">De formella atmosfäriska och astronomiska definitionerna för solens depression under horisonten och dess ekologiska gränsvärden.</p>' +
                
                '<div style="margin-bottom:var(--space-md);">' +
                '<span style="display:inline-block; width:12px; height:12px; background:#e8a87c; border-radius:50%; margin-right:8px; transform:translateY(1px);"></span>' +
                '<strong style="color:var(--color-text);">Borgerlig skymning/gryning</strong> (0° till -6°)<br>' +
                '<span style="font-size:14px; color:var(--color-text-muted); display:inline-block; margin-top:4px; line-height:1.5;">Solens geometriska medelpunkt befinner sig från 0° till -6° under horisonten. Atmosfärisk diffusion (främst Rayleigh-spridning) resulterar i en markbelysning som överstiger ~3 lux, vilket möjliggör fullt färgseende hos ögat. Utgör den fototaktiska tröskeln för aktivering av dagsaktiva tättingar ("dawn chorus").</span>' +
                '</div>' +
                
                '<div style="margin-bottom:var(--space-md);">' +
                '<span style="display:inline-block; width:12px; height:12px; background:#4a6fa5; border-radius:50%; margin-right:8px; transform:translateY(1px);"></span>' +
                '<strong style="color:var(--color-text);">Nautisk skymning/gryning</strong> (-6° till -12°)<br>' +
                '<span style="font-size:14px; color:var(--color-text-muted); display:inline-block; margin-top:4px; line-height:1.5;">Solens medelpunkt befinner sig mellan -6° och -12° under horisonten. Geometrin gör att horisontlinjen precis kan urskiljas mot himlen, medan markbelysningen sjunker till intervallen 0.01 – 3 lux. Detta skapar strikt monokromatisk belysning där färgseende upphör. Utgör övergångszonen för skymningsaktiva arter.</span>' +
                '</div>' +
                
                '<div style="margin-bottom:var(--space-lg);">' +
                '<span style="display:inline-block; width:12px; height:12px; background:#2d3561; border-radius:50%; margin-right:8px; transform:translateY(1px);"></span>' +
                '<strong style="color:var(--color-text);">Astronomisk skymning/gryning</strong> (-12° till -18°)<br>' +
                '<span style="font-size:14px; color:var(--color-text-muted); display:inline-block; margin-top:4px; line-height:1.5;">Solvinkel mellan -12° och -18°. Endast de allra högsta atmosfärskikten nås av solens strålar, och markbelysningen understiger 0.01 lux. Utgör gränsen för fullständigt himmelsmörker. Ekologiskt representerar detta den absoluta dvalan för dagsaktiva system.</span>' +
                '</div>' +
                
                '<button id="dygn-info-close" style="padding:10px 20px; font-weight:600; background:var(--color-primary); color:#fff; border:none; border-radius:var(--radius-full); font-family:var(--font-heading); cursor:pointer; width:100%;">Stäng</button>';
            
            modal.appendChild(content);
            document.body.appendChild(modal);
            
            modal.addEventListener('click', function(e) {
                if(e.target === modal) modal.style.display = 'none';
            });
            document.getElementById('dygn-info-close').addEventListener('click', function() {
                modal.style.display = 'none';
            });
        }
        
        modal.style.display = 'flex';
    }

    function renderRow(row, now) {
        var isPast = row.time && now > row.time;
        var cls = 'dygn-row' + (isPast ? ' dygn-row-past' : '');
        var dotCls = 'dygn-dot dygn-dot--' + row.type;

        // Använd korrekta svenska tecken
        var label = row.label
            .replace('Soluppgang', 'Soluppg\u00e5ng')
            .replace('Solnedgang', 'Solnedg\u00e5ng')
            .replace('Solen hogst', 'Solen h\u00f6gst')
            .replace('Aterstall', '\u00c5terst\u00e4ll');

        return '<div class="' + cls + '">' +
            '<span class="' + dotCls + '"></span>' +
            '<span class="dygn-label">' + label + '</span>' +
            '<span class="dygn-time">' + fmtTime(row.time) + '</span>' +
            '</div>';
    }

    // ================================================================
    // GPS + platslager
    // ================================================================
    function loadSavedLocation() {
        try {
            var saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                var data = JSON.parse(saved);
                if (data.lat && data.lng) {
                    currentLat = data.lat;
                    currentLng = data.lng;
                    currentName = data.name || 'Din plats';
                }
            }
        } catch (e) { /* Ignore */ }
    }

    function saveLocation(lat, lng, name) {
        currentLat = lat;
        currentLng = lng;
        currentName = name || 'Din plats';
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify({ lat: lat, lng: lng, name: name }));
        } catch (e) { /* Ignore */ }
    }

    function requestGPS() {
        var btn = document.getElementById('dygn-gps-btn');
        if (btn) { btn.textContent = 'Hamtar position\u2026'; btn.disabled = true; }

        if (!navigator.geolocation) {
            if (btn) {
                btn.textContent = 'GPS stods ej';
                setTimeout(function () { btn.textContent = 'Uppdatera plats'; btn.disabled = false; }, 2000);
            }
            return;
        }

        navigator.geolocation.getCurrentPosition(
            function (pos) {
                saveLocation(pos.coords.latitude, pos.coords.longitude, 'Din plats');
                update();
                if (btn) {
                    btn.textContent = 'Plats uppdaterad';
                    btn.disabled = false;
                    setTimeout(function () { btn.textContent = 'Uppdatera plats'; }, 2000);
                }
            },
            function () {
                if (btn) {
                    btn.textContent = 'Kunde ej hamta';
                    btn.disabled = false;
                    setTimeout(function () { btn.textContent = 'Uppdatera plats'; }, 2000);
                }
            },
            { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
        );
    }

    function resetToDefault() {
        try { localStorage.removeItem(STORAGE_KEY); } catch (e) { /* Ignore */ }
        currentLat = DEFAULT_LAT;
        currentLng = DEFAULT_LNG;
        currentName = DEFAULT_NAME;
        update();
    }

    // ================================================================
    // Init + uppdatering
    // ================================================================
    function update() {
        var canvas = document.getElementById('dygn-canvas');
        var timetable = document.getElementById('dygn-timetable');
        if (canvas) renderWheel(canvas);
        if (timetable) renderTimetable(timetable);
    }

    function init() {
        var canvas = document.getElementById('dygn-canvas');
        if (!canvas) return; // Inte på denna sida

        loadSavedLocation();
        update();

        // Uppdatera varje minut
        setInterval(update, UPDATE_INTERVAL);

        // Rita om vid resize
        var resizeTimer;
        window.addEventListener('resize', function () {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(update, 200);
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
