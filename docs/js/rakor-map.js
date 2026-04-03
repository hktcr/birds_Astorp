document.addEventListener('DOMContentLoaded', () => {
    // 1. Initialize Map
    // Start view somewhere in Skåne, will fit bounds soon.
    const map = L.map('map', {
        zoomControl: false // We will add it inside so it doesn't get exported, or hide via CSS
    }).setView([56.13, 12.94], 12);

    L.control.zoom({ position: 'topright' }).addTo(map);

    // Define Tile Layers
    const streetLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
    });

    const topoLayer = L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
        attribution: 'Map data: &copy; OpenStreetMap contributors, SRTM | Map style: &copy; OpenTopoMap (CC-BY-SA)',
        maxZoom: 17
    });

    const satLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
        maxZoom: 19
    });

    // Add default
    streetLayer.addTo(map);

    // Create Layer Control (Only in Admin)
    const baseLayers = {
        "Karta (Street)": streetLayer,
        "Terräng (Topo)": topoLayer,
        "Satellit": satLayer
    };

    if (window.RAKOR_MODE === 'admin') {
        L.control.layers(baseLayers, null, { position: 'topleft' }).addTo(map);
    }

    // Layers
    let maskLayer = new L.FeatureGroup().addTo(map);
    let cellsLayer = new L.FeatureGroup().addTo(map);
    let groupLayer = new L.FeatureGroup().addTo(map);
    let highlightLayer = new L.FeatureGroup().addTo(map);
    let labelsLayer = new L.FeatureGroup(); // Added but not to map initially

    // Grid config
    const gridSizeKm = 0.25; // 250x250m rutor

    // State
    let astorpPolygon = null;
    let allCells = []; // Array of { id, polygon }
    let selectedCellIds = new Set();
    
    // Persistent state
    let state = {
        grids: {}, 
        groups: {} 
    };

    // Load state from the centralized Database JSON replacing localstorage mechanism
    function loadState() {
        return fetch(dbUrl)
            .then(res => {
                if(!res.ok) return {};
                return res.json();
            })
            .then(dbData => {
                // Initialize default state
                state = { grids: {}, groups: {} };
                // Load from DB
                if (dbData && dbData.groups) {
                    state = dbData;
                }
            })
            .catch(err => console.warn("Kunde inte ladda databas: ", err));
    }

    // Prepare JSON for export downloading
    function getExportState() {
        return state;
    }

    // 2. Load GeoJSON
    // geojsonUrl is defined in the HTML template
    fetch(geojsonUrl)
        .then(res => res.json())
        .then(data => {
            if (data.features && data.features.length > 0) {
                astorpPolygon = data.features[0]; 
                drawMask(astorpPolygon);
                generateGrids(astorpPolygon);
                
                // After grids are mapped, load DB and render
                loadState().then(() => {
                    renderState();
                });
            }
        })
        .catch(err => alert("Error loading Åstorp boundaries: " + err));

    // ----------------------------------------------------
    // Mask logic
    // ----------------------------------------------------
    function drawMask(innerPolygon) {
        // Create an outer boundary covering the whole world
        const outerCoords = [
            [[-90, -180], [90, -180], [90, 180], [-90, 180], [-90, -180]]
        ];

        // Ensure inner polygon coordinates are extracted. Assuming it's a Polygon (not MultiPolygon for simplicity)
        // Adjust if it is MultiPolygon. Turf returns GeoJSON. 
        let holes = innerPolygon.geometry.coordinates;
        if (innerPolygon.geometry.type === 'MultiPolygon') {
             // Just take the largest polygon as hole for simplicity, assuming Åstorp is mostly contiguous.
             holes = innerPolygon.geometry.coordinates[0];
        }

        // Polygon with a hole
        const invertedPoly = turf.polygon([...outerCoords, ...holes]);

        L.geoJSON(invertedPoly, {
            style: {
                fillColor: '#ffffff',
                fillOpacity: 1.0,
                color: 'transparent',
                weight: 0
            },
            interactive: false
        }).addTo(maskLayer);

        // Fit map bounds to Åstorp
        const bbox = turf.bbox(innerPolygon);
        map.fitBounds([[bbox[1], bbox[0]], [bbox[3], bbox[2]]]);
    }

    // ----------------------------------------------------
    // Grid Generation logic
    // ----------------------------------------------------
    function generateGrids(boundaryFeature) {
        const bbox = turf.bbox(boundaryFeature);
        // Generates grid using configured size
        const grid = turf.squareGrid(bbox, gridSizeKm, { units: 'kilometers' });

        // Filter valid cells (those that intersect Astorp)
        let validCells = [];
        turf.featureEach(grid, function(currentFeature) {
            // Check intersection to drop cells completely outside the jagged municipal borders
            const intersection = turf.intersect(currentFeature, boundaryFeature);
            if (intersection) {
                // Calculate centroid for sorting
                const center = turf.centroid(currentFeature);
                currentFeature.properties.centroid = center.geometry.coordinates; // [lon, lat]
                validCells.push(currentFeature);
            }
        });

        // Extrahera unika X (Longitud) och Y (Latitud) för att bestämma det globala rutnätets kolumner och rader
        const xSet = new Set();
        const ySet = new Set();

        validCells.forEach(cell => {
            // Avrundar till ~11m precision för att gruppera flyttalsfel
            const xKey = Math.round(cell.properties.centroid[0] * 10000);
            const yKey = Math.round(cell.properties.centroid[1] * 10000);
            xSet.add(xKey);
            ySet.add(yKey);
            cell.properties.xKey = xKey;
            cell.properties.yKey = yKey;
        });

        // Sortera X stigande (Väst till Öst = A, B, C...)
        const sortedX = Array.from(xSet).sort((a,b) => a - b);
        // Sortera Y fallande (Norr till Söder = 1, 2, 3...)
        const sortedY = Array.from(ySet).sort((a,b) => b - a);

        // Helper for generating Letters: A, B .. Z, AA, AB..
        const getColumnLabel = (index) => {
            let label = '';
            while (index >= 0) {
                label = String.fromCharCode((index % 26) + 65) + label;
                index = Math.floor(index / 26) - 1;
            }
            return label;
        };

        validCells.forEach(cell => {
            const colIdx = sortedX.indexOf(cell.properties.xKey);
            const rowIdx = sortedY.indexOf(cell.properties.yKey);

            const colLabel = getColumnLabel(colIdx);
            const rowNum = rowIdx + 1;
            const id = `${colLabel}${rowNum}`;
            
            cell.properties.gridId = id;
            allCells.push({
                id: id,
                polygon: cell
            });

            // Add invisible label marker
            const center = cell.properties.centroid;
            const icon = L.divIcon({
                className: 'grid-id-label',
                html: id,
                iconSize: [40, 20],
                iconAnchor: [20, 10]
            });
            L.marker([center[1], center[0]], { icon: icon, interactive: false }).addTo(labelsLayer);
        });

        console.log(`Generated ${allCells.length} valid ${gridSizeKm*1000}x${gridSizeKm*1000}m grids.`);
    }

    // ----------------------------------------------------
    // Rendering logic
    // ----------------------------------------------------
    function getCellDefaultStyle(id) {
        return {
            fillColor: '#FFD700', // Yellow
            fillOpacity: 0.3,
            color: '#c2a300',
            weight: 1,
            className: 'grid-cell default-cell'
        };
    }

    function renderState() {
        cellsLayer.clearLayers();
        groupLayer.clearLayers();

        let cellsByGroup = {};

        allCells.forEach(cellObj => {
            const id = cellObj.id;
                // If Viewer Mode, do not add click events!
                const isIteractive = window.RAKOR_MODE === 'admin';
                const s = state.grids[id];

                if (s && s.status === 'nest' && s.group) {
                    // Collect for group rendering later
                    if (!cellsByGroup[s.group]) cellsByGroup[s.group] = [];
                    cellsByGroup[s.group].push(cellObj.polygon);
                } else if (s && s.status === 'empty') {
                    // Inventoried but 0 nests
                    let layer = L.geoJSON(cellObj.polygon, {
                        style: { fillColor: '#ffffff', fillOpacity: 0.8, color: 'transparent', weight: 0 },
                        interactive: isIteractive
                    }).addTo(cellsLayer);
                    if (isIteractive) layer.on('click', () => toggleSelection(id));
                } else {
                    // Default uninventoried
                    let layer = L.geoJSON(cellObj.polygon, {
                        style: getCellDefaultStyle(id),
                        interactive: isIteractive
                    }).addTo(cellsLayer);
                    if (isIteractive) layer.on('click', () => toggleSelection(id));
                }
            });

            // Extrapolate and render groups
            for (const groupId in cellsByGroup) {
                const polys = cellsByGroup[groupId];
                const groupInfo = state.groups[groupId];
                const isIteractive = window.RAKOR_MODE === 'admin';
                
                if (polys.length > 0) {
                    let merged = polys[0];
                    for (let i = 1; i < polys.length; i++) {
                        merged = turf.union(merged, polys[i]);
                    }

                    // VEP Design Principle: Subtle Area Tint
                    let groupGeo = L.geoJSON(merged, {
                        style: {
                            fillColor: 'rgb(46, 204, 113)', // Grön
                            fillOpacity: 0.15, // Mycket subtil
                            color: '#27ae60', // Tunnare gräns
                            weight: 1
                        },
                        interactive: isIteractive
                    }).addTo(groupLayer);

                    if (isIteractive) {
                         groupGeo.on('click', () => {
                             polys.forEach(p => toggleSelection(p.properties.gridId, true));
                         });
                    }

                    // Text Marker / Point Coordinate (VEP Design Principle: Prominent Needle point)
                    // Defaults to centroid if no exact coordinate
                    let centerCoord = [turf.centroid(merged).geometry.coordinates[1], turf.centroid(merged).geometry.coordinates[0]];
                    if (groupInfo && groupInfo.coordinate) {
                        try {
                            let parts = groupInfo.coordinate.split(',');
                            if (parts.length === 2 && !isNaN(parseFloat(parts[0])) && !isNaN(parseFloat(parts[1]))) {
                                centerCoord = [parseFloat(parts[0]), parseFloat(parts[1])];
                            }
                        } catch(e) {}
                    }

                    const count = groupInfo ? groupInfo.count : "?";
                    
                    const icon = L.divIcon({
                        className: 'nest-label-icon',
                        html: `<div class="nest-label-container" title="${groupInfo.date || ''}">${count}</div>`,
                        iconSize: [30, 30],
                        iconAnchor: [15, 15]
                    });

                    L.marker(centerCoord, {
                        icon: icon,
                        interactive: false // So it doesn't block clicks on polygon
                    }).addTo(groupLayer);
                    
                    // Liten röd prick inuti knappen om det var en exact koordiant
                    if (groupInfo && groupInfo.coordinate) {
                       L.circleMarker(centerCoord, {radius: 2, color: 'red', fillColor: 'red', fillOpacity: 1, interactive: false}).addTo(groupLayer);
                    }
                }
            }
            
            renderHighlights();
        }

    // ----------------------------------------------------
    // User Interaction Logic (Only wired up if in Admin mode)
    // ----------------------------------------------------
    if (window.RAKOR_MODE === 'admin') {
    function toggleSelection(id, forceSelect = false) {
        if (selectedCellIds.has(id) && !forceSelect) {
            selectedCellIds.delete(id);
        } else {
            selectedCellIds.add(id);
        }
        updateUI();
        renderHighlights();
    }

    function renderHighlights() {
        highlightLayer.clearLayers();
        allCells.forEach(cellObj => {
            if (selectedCellIds.has(cellObj.id)) {
                L.geoJSON(cellObj.polygon, {
                    style: {
                        fillColor: '#3498db',
                        fillOpacity: 0.6,
                        color: '#2980b9',
                        weight: 2
                    },
                    interactive: false // Let underlying layer handle clicks
                }).addTo(highlightLayer);
            }
        });
    }

    function updateUI() {
        const countSpan = document.getElementById('selected-count');
        const listDiv = document.getElementById('selected-list');
        const saveBtn = document.getElementById('btn-save-nests');
        const clearSelBtn = document.getElementById('btn-clear-selection');

        countSpan.innerText = selectedCellIds.size;
        
        let ids = Array.from(selectedCellIds).sort();
        listDiv.innerText = ids.join(", ") || "Inga markerade";

        const hasSelection = selectedCellIds.size > 0;
        saveBtn.disabled = !hasSelection;
        clearSelBtn.disabled = !hasSelection;
    }

    document.getElementById('btn-clear-selection').addEventListener('click', () => {
        selectedCellIds.clear();
        updateUI();
        renderHighlights();
    });

    document.getElementById('btn-save-nests').addEventListener('click', () => {
        if (selectedCellIds.size === 0) return;

        const count = parseInt(document.getElementById('nest-count').value, 10);
        const coord = document.getElementById('nest-coord').value.trim();
        const obsDate = document.getElementById('nest-date').value.trim();
        
        // Remove selection from existing groups
        selectedCellIds.forEach(id => {
            const existing = state.grids[id];
            if (existing && existing.group) {
                // If it was the last cell in a group, remove the group entirely
                let cellsInGroup = 0;
                for (const k in state.grids) {
                    if (state.grids[k].group === existing.group) cellsInGroup++;
                }
                if (cellsInGroup <= 1) { // Will be 0 after this
                    delete state.groups[existing.group];
                }
            }
        });

        if (count === 0) {
            // Mark as empty
            selectedCellIds.forEach(id => {
                state.grids[id] = { status: 'empty' };
            });
        } else {
            // Mark as nest and create common group with date/coords
            const groupId = 'obs_' + (obsDate || 'nodate') + '_' + Math.floor(Math.random() * 10000);
            
            state.groups[groupId] = { count: count };
            if (coord) state.groups[groupId].coordinate = coord;
            if (obsDate) state.groups[groupId].date = obsDate;
            
            selectedCellIds.forEach(id => {
                state.grids[id] = { status: 'nest', group: groupId };
            });
        }

        selectedCellIds.clear();
        document.getElementById('nest-count').value = "0";
        document.getElementById('nest-coord').value = "";
        updateUI();
        renderState();
    });

    document.getElementById('btn-export-image').addEventListener('click', () => {
        // Hide UI for export
        document.body.classList.add('export-mode');
        
        // Wait a frame so layout updates
        setTimeout(() => {
            html2canvas(document.getElementById('map'), {
                useCORS: true,
                allowTaint: false,
                backgroundColor: "#ffffff"
            }).then(canvas => {
                document.body.classList.remove('export-mode');
                
                const link = document.createElement('a');
                link.download = `rakor-astorp-${new Date().toISOString().split('T')[0]}.png`;
                link.href = canvas.toDataURL('image/png');
                link.click();
            }).catch(err => {
                document.body.classList.remove('export-mode');
                alert("Misslyckades att skapa bild: " + err);
            });
        }, 100);
    });

    document.getElementById('btn-export-data').addEventListener('click', () => {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(getExportState(), null, 2));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", `rakobservations-${new Date().toISOString().split('T')[0]}.json`);
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
    });

    document.getElementById('toggle-grid-ids').addEventListener('change', (e) => {
        if (e.target.checked) {
            map.addLayer(labelsLayer);
        } else {
            map.removeLayer(labelsLayer);
        }
    });

    // Run initial UI update to ensure disabled state is set
    updateUI();
    
    } // End of Admin Interactive Logic
});
