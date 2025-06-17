console.log('main.js script loaded');
document.addEventListener('DOMContentLoaded', function () {
    console.log('DOMContentLoaded event fired');
    // Initialize map
        const map = L.map('map').setView([42.71146335390179, -76.87963989760163], 19);

    // Add Google Satellite Layer
    L.tileLayer('https://{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}',{
        maxZoom: 20,
        subdomains:['mt0','mt1','mt2','mt3'],
        attribution: 'Map data &copy; Google'
    }).addTo(map);

    console.log('Map initialized');

    // --- State ---
    let cones = []; // Array to store [lat, lng] for each cone
    let coneMarkers = []; // Array to store L.marker objects
    let courseElements = []; // To track elements for undo (each cone is 1 element)
    let gridLayer;
    let selectedCone = null; // To store { marker, data } of the selected cone
    // Course path is made invisible (opacity 0) but still used for path length calculations
    let coursePath = L.polyline([], { color: '#FFFF00', weight: 3, opacity: 0 }).addTo(map);
    let measureLayer = L.layerGroup().addTo(map);

    let isMeasuring = false;
    let measureStartPoint = null;
    let tempMeasureLine = null;

    const coneIcon = L.icon({
        iconUrl: '/static/images/cone.svg',
        iconSize: [25, 25],
        iconAnchor: [12.5, 12.5]
    });
    const laidDownConeIcon = L.icon({
        iconUrl: '/static/images/laid_down_cone.svg',
        iconSize: [25, 25], // Adjust if the SVG aspect ratio is different
        iconAnchor: [12.5, 12.5]
    });
    
    // Blue dot icon for measurement points
    const measurementPointIcon = L.divIcon({
        className: 'measurement-point',
        html: '<div style="background-color: #0078FF; border: 2px solid white; border-radius: 50%; width: 10px; height: 10px;"></div>',
        iconSize: [10, 10],
        iconAnchor: [5, 5]
    });

    // Create a context menu div that we'll position and show/hide as needed
    const contextMenu = document.createElement('div');
    contextMenu.className = 'context-menu';
    contextMenu.style.display = 'none';
    contextMenu.style.position = 'absolute';
    contextMenu.style.zIndex = 1000;
    contextMenu.style.backgroundColor = 'white';
    contextMenu.style.border = '1px solid #ccc';
    contextMenu.style.borderRadius = '4px';
    contextMenu.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';
    contextMenu.style.padding = '5px 0';
    document.body.appendChild(contextMenu);
    
    // Close context menu when clicking elsewhere
    document.addEventListener('click', function() {
        contextMenu.style.display = 'none';
    });

    // --- DOM Elements ---
    const searchBtn = document.getElementById('venue-search-btn');
    const searchInput = document.getElementById('venue-search');
    const undoBtn = document.getElementById('undo-btn');
    const clearBtn = document.getElementById('clear-btn');
    const coneCountSpan = document.getElementById('cone-count');
    const pathLengthSpan = document.getElementById('path-length'); 
    const gridSizeInput = document.getElementById('gridSize'); 
    const gridRotationInput = document.getElementById('gridRotation');
    const gridRotationValueDisplay = document.getElementById('gridRotationValue');
    const snapCheckbox = document.getElementById('snap-to-grid-checkbox');
    const measureBtn = document.getElementById('measure-btn');
    const selectedConeToolsDiv = document.getElementById('selectedConeTools');
    const coneRotationSlider = document.getElementById('coneRotationSlider');
    const selectedConeRotationValueDisplay = document.getElementById('selectedConeRotationValueDisplay'); // Corrected ID for cone rotation
    const measurementResultsDiv = document.getElementById('measurement-results');
    const measurementValueSpan = document.getElementById('measurement-value');
    const exportJsonBtn = document.getElementById('export-json-btn');
    const importJsonBtn = document.getElementById('import-json-btn');

    // --- Helper Functions ---
    function calculatePathLength() {
        coneCountSpan.textContent = cones.length;
        let totalDistance = 0;
        if (cones.length > 1) {
            for (let i = 0; i < cones.length - 1; i++) {
                const point1 = cones[i].latlng;
                const point2 = cones[i+1].latlng;
                totalDistance += point1.distanceTo(point2);
            }
        }
        pathLengthSpan.textContent = (totalDistance * 3.28084).toFixed(1); 
    }

    function redrawPath() {
        const latLngs = cones.map(cone => cone.latlng);
        coursePath.setLatLngs(latLngs);
    }

    function addConesToMap(coneLatLng, type = 'regular_cone') {
        console.log('addConesToMap called with:', coneLatLng, 'type:', type);
        const iconToUse = type === 'laid_down_cone' ? laidDownConeIcon : coneIcon;
        let coneData, marker;

        if (type === 'laid_down_cone') {
            console.log('Attempting to create a laid_down_cone');
            coneData = { latlng: coneLatLng, type: type, angle: 0 };
            // Create a standard marker first, then set rotation (L.rotatedMarker doesn't exist)
            marker = L.marker(coneLatLng, { 
                icon: iconToUse,
                draggable: true  // Make marker draggable
            }).addTo(map);
            marker.setRotationAngle(0);
            
            // Handle drag events to update cone position
            marker.on('dragend', function(e) {
                coneData.latlng = marker.getLatLng();
                calculatePathLength();
                redrawPath();
            }); // This extension method comes from the Leaflet.RotatedMarker plugin
            marker.on('click', function(e) { // Pass 'e' to the handler
                // If this cone is already selected, deselect it by acting like a map click
                if (selectedCone && selectedCone.marker === marker) {
                    handleMapClickDeselection();
                    return;
                }
                selectedCone = { marker: marker, data: coneData };
                selectedConeToolsDiv.style.display = 'block';
                coneRotationSlider.value = coneData.angle;
                selectedConeRotationValueDisplay.textContent = coneData.angle;
                // Prevent map click from firing and deselecting immediately
                L.DomEvent.stopPropagation(e);
            });
            
            // Add context menu for laid down cones
            marker.on('contextmenu', function(e) {
                showContextMenu(e, marker, coneData);
                L.DomEvent.stopPropagation(e);
                L.DomEvent.preventDefault(e);
            });
        } else { // regular_cone
            coneData = { latlng: coneLatLng, type: type, angle: 0 }; // Add angle property for regular cones too
            marker = L.marker(coneLatLng, { 
                icon: iconToUse,
                draggable: true  // Make marker draggable
            }).addTo(map);
            marker.setRotationAngle(0); // Apply rotation to regular cones too
            
            // Handle drag events to update cone position
            marker.on('dragend', function(e) {
                coneData.latlng = marker.getLatLng();
                calculatePathLength();
                redrawPath();
            });
            // Allow regular cones to be selected for rotation just like laid down cones
            marker.on('click', function(e) { // Pass 'e' to the handler
                // If this cone is already selected, deselect it by acting like a map click
                if (selectedCone && selectedCone.marker === marker) {
                    handleMapClickDeselection();
                    return;
                }
                selectedCone = { marker: marker, data: coneData };
                selectedConeToolsDiv.style.display = 'block';
                coneRotationSlider.value = coneData.angle;
                selectedConeRotationValueDisplay.textContent = coneData.angle;
                // Prevent map click from firing and deselecting immediately
                L.DomEvent.stopPropagation(e);
            });
            
            // Add context menu for regular cones
            marker.on('contextmenu', function(e) {
                showContextMenu(e, marker, coneData);
                L.DomEvent.stopPropagation(e);
                L.DomEvent.preventDefault(e);
            });
        }
        
        cones.push(coneData);
        coneMarkers.push(marker);
        
        courseElements.push(1); // Each cone is one element for undo
        redrawPath();
        calculatePathLength();
    }

    // Minimum zoom level at which to show the grid (to prevent performance issues when zoomed out)
    const MIN_GRID_ZOOM_LEVEL = 17; // Adjust this value as needed based on testing
    
    function shouldShowGrid() {
        return snapCheckbox.checked && map.getZoom() >= MIN_GRID_ZOOM_LEVEL;
    }
    
    function drawGrid() {
        if (gridLayer) {
            map.removeLayer(gridLayer);
        }
        
        // Don't draw grid if snap is off or zoom level is too low
        if (!snapCheckbox.checked || map.getZoom() < MIN_GRID_ZOOM_LEVEL) {
            return;
        }
        
        // Add warning message if zoom level is too low but snap is on
        if (snapCheckbox.checked && map.getZoom() < MIN_GRID_ZOOM_LEVEL) {
            console.log('Grid is turned on but not displaying - zoom in closer to see grid lines');
        }

        gridLayer = L.layerGroup().addTo(map);
        const bounds = map.getBounds();
        const gridSizeFeet = parseFloat(gridSizeInput.value) || 10;
        const gridSizeMeters = gridSizeFeet / 3.28084;
        const rotationDegrees = parseFloat(gridRotationInput.value) || 0;
        const rotationRadians = rotationDegrees * Math.PI / 180;
        const mapCenter = map.getCenter(); 

        function rotatePoint(point, origin, angleRad) {
            const R = 6378137; 
            const pointPx = map.latLngToContainerPoint(point);
            const originPx = map.latLngToContainerPoint(origin);

            const x = pointPx.x - originPx.x;
            const y = pointPx.y - originPx.y;

            const rotatedX = x * Math.cos(angleRad) - y * Math.sin(angleRad);
            const rotatedY = x * Math.sin(angleRad) + y * Math.cos(angleRad);

            return map.containerPointToLatLng(L.point(rotatedX + originPx.x, rotatedY + originPx.y));
        }

        const northEast = bounds.getNorthEast();
        const southWest = bounds.getSouthWest();
        const northWest = bounds.getNorthWest();
        const southEast = bounds.getSouthEast();

        const viewBoundsDiagonal = map.containerPointToLatLng([0,0]).distanceTo(map.containerPointToLatLng([map.getSize().x, map.getSize().y]));
        const searchRadiusMeters = viewBoundsDiagonal / 2; 

        const iterations = Math.ceil(searchRadiusMeters / gridSizeMeters) + 2; 
        const degPerMeterLat = 1 / 111111; 
        const degPerMeterLngAtCenter = 1 / (111111 * Math.cos(mapCenter.lat * Math.PI / 180)); 

        for (let i = -iterations; i <= iterations; i++) {
            const offsetMeters = i * gridSizeMeters;

            const lat_h = mapCenter.lat + (offsetMeters * degPerMeterLat);
            const lng_v = mapCenter.lng + (offsetMeters * degPerMeterLngAtCenter);

            const lineHalfLengthGeoDegreesLat = searchRadiusMeters * 2 * degPerMeterLat;
            const lineHalfLengthGeoDegreesLng = searchRadiusMeters * 2 * degPerMeterLngAtCenter;

            let p1_h = L.latLng(lat_h, mapCenter.lng - lineHalfLengthGeoDegreesLng);
            let p2_h = L.latLng(lat_h, mapCenter.lng + lineHalfLengthGeoDegreesLng);

            let p1_v = L.latLng(mapCenter.lat - lineHalfLengthGeoDegreesLat, lng_v);
            let p2_v = L.latLng(mapCenter.lat + lineHalfLengthGeoDegreesLat, lng_v);

            if (rotationRadians !== 0) {
                p1_h = rotatePoint(p1_h, mapCenter, rotationRadians);
                p2_h = rotatePoint(p2_h, mapCenter, rotationRadians);
                p1_v = rotatePoint(p1_v, mapCenter, rotationRadians);
                p2_v = rotatePoint(p2_v, mapCenter, rotationRadians);
            }

            L.polyline([p1_h, p2_h], { color: 'black', weight: 0.5, dashArray: '5, 5' }).addTo(gridLayer);
            L.polyline([p1_v, p2_v], { color: 'black', weight: 0.5, dashArray: '5, 5' }).addTo(gridLayer);
        }
    }

    function getSnappedLatLng(latlng) {
        const gridSizeFeet = parseFloat(gridSizeInput.value) || 10;
        const gridSizeMeters = gridSizeFeet / 3.28084;
        const rotationDegrees = parseFloat(gridRotationInput.value) || 0;
        const rotationRadians = rotationDegrees * Math.PI / 180;
        const mapCenter = map.getCenter(); 

        const pointPx = map.latLngToContainerPoint(latlng);
        const originPx = map.latLngToContainerPoint(mapCenter);

        let x = pointPx.x - originPx.x;
        let y = pointPx.y - originPx.y;

        const unrotatedX = x * Math.cos(-rotationRadians) - y * Math.sin(-rotationRadians);
        const unrotatedY = x * Math.sin(-rotationRadians) + y * Math.cos(-rotationRadians);
        
        const unrotatedPointPxRelativeToOrigin = L.point(unrotatedX, unrotatedY);

        const pointPlusGridSizeLng = mapCenter.lng + (gridSizeMeters / (111111 * Math.cos(mapCenter.lat * Math.PI / 180)));
        const gridPixelX = map.latLngToContainerPoint(L.latLng(mapCenter.lat, pointPlusGridSizeLng)).x - originPx.x;
        
        const pointPlusGridSizeLat = mapCenter.lat + (gridSizeMeters / 111111);
        const gridPixelY = map.latLngToContainerPoint(L.latLng(pointPlusGridSizeLat, mapCenter.lng)).y - originPx.y; 
        
        const p0 = map.project(mapCenter);
        const p1Lat = map.project(L.latLng(mapCenter.lat + (gridSizeMeters/111111), mapCenter.lng));
        const p1Lng = map.project(L.latLng(mapCenter.lat, mapCenter.lng + (gridSizeMeters / (111111 * Math.cos(mapCenter.lat * Math.PI/180)))));
        const gridStepPxLat = Math.abs(p1Lat.y - p0.y);
        const gridStepPxLng = Math.abs(p1Lng.x - p0.x);

        if (gridStepPxLng === 0 || gridStepPxLat === 0) return latlng; 

        const snappedUnrotatedX = Math.round(unrotatedPointPxRelativeToOrigin.x / gridStepPxLng) * gridStepPxLng;
        const snappedUnrotatedY = Math.round(unrotatedPointPxRelativeToOrigin.y / gridStepPxLat) * gridStepPxLat;

        x = snappedUnrotatedX;
        y = snappedUnrotatedY;
        const rotatedSnappedX = x * Math.cos(rotationRadians) - y * Math.sin(rotationRadians);
        const rotatedSnappedY = x * Math.sin(rotationRadians) + y * Math.cos(rotationRadians);

        const finalSnappedPx = L.point(rotatedSnappedX + originPx.x, rotatedSnappedY + originPx.y);
        return map.containerPointToLatLng(finalSnappedPx);
    }

    // --- Event Listeners ---
    map.on('click', function(e) {
        if (isMeasuring) {
            if (!measureStartPoint) {
                measureStartPoint = e.latlng;
                L.marker(measureStartPoint, { icon: measurementPointIcon }).addTo(measureLayer); 
            } else {
                const measureEndPoint = e.latlng;
                L.marker(measureEndPoint, { icon: measurementPointIcon }).addTo(measureLayer);
                const distance = measureStartPoint.distanceTo(measureEndPoint);
                L.polyline([measureStartPoint, measureEndPoint], { color: 'red' }).addTo(measureLayer);
                
                // Update measurement UI instead of showing alert
                const distanceFeet = (distance * 3.28084).toFixed(1);
                measurementValueSpan.textContent = distanceFeet;
                measurementResultsDiv.style.display = 'block';
                
                measureStartPoint = null; 
            }
            return; 
        }

        const selectedConeTypeRadio = document.querySelector('input[name="coneType"]:checked');
        const coneType = selectedConeTypeRadio ? selectedConeTypeRadio.value : 'regular_cone'; 
        console.log('Map clicked. Attempting to place cone of type:', coneType, 'at:', e.latlng);

        // This is a map click, not a marker click. Deselect any selected cone.
        handleMapClickDeselection();

        let snappedLatLng = e.latlng;
        if (snapCheckbox.checked) {
            snappedLatLng = getSnappedLatLng(e.latlng);
        }

        addConesToMap(snappedLatLng, coneType); // Handles 'regular_cone' or 'laid_down_cone'
    });
    console.log('Map click event listener attached.');

    function handleMapClickDeselection() {
        if (selectedCone) {
            selectedCone = null;
            selectedConeToolsDiv.style.display = 'none';
        }
    }
    
    function showContextMenu(e, marker, coneData) {
        // Clear existing menu items
        contextMenu.innerHTML = '';
        
        // Position the menu at the click location
        const clickEvent = e.originalEvent;
        contextMenu.style.left = clickEvent.pageX + 'px';
        contextMenu.style.top = clickEvent.pageY + 'px';
        
        // Create and add menu items
        const options = [
            { text: 'Delete Cone', action: function() { deleteCone(marker, coneData); }},
            { text: 'Toggle Cone Type', action: function() { toggleConeType(marker, coneData); }}
        ];
        
        // Add 'Reset Rotation' option for all cone types since all can be rotated now
        options.push({ text: 'Reset Rotation', action: function() { resetConeRotation(marker, coneData); }});
        
        // Create the menu items
        options.forEach(option => {
            const menuItem = document.createElement('div');
            menuItem.className = 'context-menu-item';
            menuItem.textContent = option.text;
            menuItem.style.padding = '8px 12px';
            menuItem.style.cursor = 'pointer';
            
            menuItem.addEventListener('mouseover', function() {
                this.style.backgroundColor = '#f0f0f0';
            });
            
            menuItem.addEventListener('mouseout', function() {
                this.style.backgroundColor = 'transparent';
            });
            
            menuItem.addEventListener('click', function(evt) {
                option.action();
                contextMenu.style.display = 'none';
                evt.stopPropagation();
            });
            
            contextMenu.appendChild(menuItem);
        });
        
        // Show the menu
        contextMenu.style.display = 'block';
    }
    
    function deleteCone(marker, coneData) {
        // Find the index of the cone in the arrays
        const index = cones.findIndex(cone => cone === coneData);
        if (index !== -1) {
            // Remove from arrays
            cones.splice(index, 1);
            coneMarkers.splice(index, 1);
            
            // Remove from map
            map.removeLayer(marker);
            
            // If this was the selected cone, deselect it
            if (selectedCone && selectedCone.marker === marker) {
                handleMapClickDeselection();
            }
            
            // Update path and stats
            redrawPath();
            calculatePathLength();
            document.getElementById('cone-count').textContent = cones.length;
        }
    }
    
    function toggleConeType(marker, coneData) {
        // Remove old marker from map
        map.removeLayer(marker);
        
        // Toggle cone type
        const newType = coneData.type === 'regular_cone' ? 'laid_down_cone' : 'regular_cone';
        
        // Create a new cone of the other type at the same location
        addConesToMap(coneData.latlng, newType);
        
        // Remove the old cone data
        deleteCone(marker, coneData);
    }
    
    function resetConeRotation(marker, coneData) {
        // Reset rotation to 0
        coneData.angle = 0;
        marker.setRotationAngle(0);
        
        // Update UI if this cone is selected
        if (selectedCone && selectedCone.data === coneData) {
            coneRotationSlider.value = 0;
            selectedConeRotationValueDisplay.textContent = '0';
        }
    }

    function undoLastAction() {
        if (cones.length === 0) return;

        const removedConeData = cones.pop(); 
        const removedMarker = coneMarkers.pop();
        map.removeLayer(removedMarker);
        courseElements.pop();

        // If the removed cone was the selected one, deselect it
        if (selectedCone && selectedCone.marker === removedMarker) {
            handleMapClickDeselection();
        }
        
        redrawPath();
        calculatePathLength();
    }

    undoBtn.addEventListener('click', undoLastAction);

    clearBtn.addEventListener('click', () => {
        handleMapClickDeselection(); // Deselect cone before clearing
        coneMarkers.forEach(marker => map.removeLayer(marker));
        coneMarkers = [];
        cones = [];
        courseElements = [];
        redrawPath();
        calculatePathLength();
        clearMeasurements(); // Also clear any measurement drawings
    });

    snapCheckbox.addEventListener('change', drawGrid);
    gridSizeInput.addEventListener('input', drawGrid);
    gridRotationInput.addEventListener('input', () => {
        gridRotationValueDisplay.textContent = gridRotationInput.value;
        drawGrid(); // Redraw grid when rotation changes
    });
    map.on('moveend', drawGrid);
    map.on('zoomend', drawGrid); // Also update grid when zoom changes

    coneRotationSlider.addEventListener('input', () => {
        if (selectedCone) {
            const newAngle = parseInt(coneRotationSlider.value);
            selectedCone.data.angle = newAngle;
            selectedCone.marker.setRotationAngle(newAngle);
            selectedConeRotationValueDisplay.textContent = newAngle;
        }
    });

    function clearMeasurements() {
        measureLayer.clearLayers();
        measureStartPoint = null;
        if (tempMeasureLine) {
            map.removeLayer(tempMeasureLine);
            tempMeasureLine = null;
        }
        // Reset measurement value
        measurementValueSpan.textContent = '0.0';
    }
    
    function toggleMeasureMode() {
        isMeasuring = !isMeasuring;
        if (isMeasuring) {
            measureBtn.textContent = 'Stop Measuring';
            measureBtn.style.backgroundColor = '#ffc107'; // A yellow color to indicate active state
            map.getContainer().style.cursor = 'crosshair';
            // Show measurement results section when measuring starts
            measurementResultsDiv.style.display = 'block';
        } else {
            measureBtn.textContent = 'Measure Distance';
            measureBtn.style.backgroundColor = '';
            map.getContainer().style.cursor = '';
            clearMeasurements();
        }
    }

    measureBtn.addEventListener('click', toggleMeasureMode);

    // Export course data to JSON
    exportJsonBtn.addEventListener('click', () => {
        // Create the data object with all course information
        const courseData = {
            cones: cones.map(cone => ({
                latlng: cone.latlng,
                type: cone.type,
                angle: cone.angle || 0
            })),
            mapCenter: map.getCenter(),
            mapZoom: map.getZoom(),
            gridSettings: {
                enabled: snapCheckbox.checked,
                size: parseFloat(gridSizeInput.value),
                rotation: parseFloat(document.getElementById('gridRotation').value)
            },
            timestamp: new Date().toISOString(),
            stats: {
                coneCount: cones.length,
                pathLength: parseFloat(document.getElementById('path-length').innerText)
            }
        };
        
        // Convert to JSON string
        const jsonData = JSON.stringify(courseData, null, 2);
        
        // Create and trigger download
        const blob = new Blob([jsonData], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const courseName = 'autocross_course_' + new Date().toISOString().replace(/[:.]/g, '-');
        a.download = courseName + '.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    });
    
    // Import course data from JSON file
    importJsonBtn.addEventListener('click', () => {
        // Create a hidden file input element
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = '.json';
        fileInput.style.display = 'none';
        document.body.appendChild(fileInput);
        
        // Handle file selection
        fileInput.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (!file) {
                document.body.removeChild(fileInput);
                return;
            }
            
            const reader = new FileReader();
            reader.onload = function(event) {
                try {
                    // Parse the JSON data
                    const courseData = JSON.parse(event.target.result);
                    
                    // Clear current course
                    clearAllCones();
                    
                    // Set map view
                    if (courseData.mapCenter) {
                        map.setView([courseData.mapCenter.lat, courseData.mapCenter.lng], courseData.mapZoom || 18);
                    }
                    
                    // Set grid settings
                    if (courseData.gridSettings) {
                        snapCheckbox.checked = courseData.gridSettings.enabled;
                        gridSizeInput.value = courseData.gridSettings.size;
                        const gridRotationInputEl = document.getElementById('gridRotation');
                        gridRotationInputEl.value = courseData.gridSettings.rotation;
                        gridRotationValueDisplay.textContent = courseData.gridSettings.rotation;
                        drawGrid();
                    }
                    
                    // Import cones
                    if (courseData.cones && Array.isArray(courseData.cones)) {
                        courseData.cones.forEach(coneData => {
                            // Get the LatLng object from the data
                            const latlng = L.latLng(coneData.latlng.lat, coneData.latlng.lng);
                            // Place the cone
                            const coneType = coneData.type || 'regular_cone'; // Default to regular cone if not specified
                            
                            // Create the cone object
                            const newCone = {
                                latlng: latlng,
                                type: coneType,
                                angle: coneData.angle || 0
                            };
                            
                            // Create the marker based on type
                            let marker;
                            if (coneType === 'laid_down_cone') {
                                marker = L.rotatedMarker(latlng, {
                                    icon: laidDownConeIcon,
                                    draggable: true,
                                    rotationOrigin: 'center center'
                                }).addTo(map);
                            } else { // regular cone
                                marker = L.rotatedMarker(latlng, {
                                    icon: coneIcon,
                                    draggable: true,
                                    rotationOrigin: 'center center'
                                }).addTo(map);
                            }
                            
                            // Set rotation angle if it exists
                            if (coneData.angle) {
                                marker.setRotationAngle(coneData.angle);
                            }
                            
                            // Setup event handlers
                            marker.on('dragend', function(e) {
                                // Update the cone's position in the cones array
                                for (let i = 0; i < cones.length; i++) {
                                    if (coneMarkers[i] === marker) {
                                        cones[i].latlng = marker.getLatLng();
                                        break;
                                    }
                                }
                                // Recalculate the course path
                                calculatePathLength();
                            });
                            
                            marker.on('contextmenu', function(e) {
                                showContextMenu(e, marker);
                            });
                            
                            marker.on('click', function() {
                                selectCone({
                                    marker: marker,
                                    data: newCone
                                });
                            });
                            
                            // Add to our arrays
                            cones.push(newCone);
                            coneMarkers.push(marker);
                        });
                        
                        // Update path and counts
                        calculatePathLength();
                        document.getElementById('cone-count').textContent = cones.length;
                    }
                    
                    alert('Course imported successfully!');
                } catch (error) {
                    console.error('Failed to import course:', error);
                    alert('Error importing course data. Please check the file format.');
                }
                
                // Clean up
                document.body.removeChild(fileInput);
            };
            
            reader.onerror = function() {
                alert('Error reading the file.');
                document.body.removeChild(fileInput);
            };
            
            reader.readAsText(file);
        });
        
        // Trigger file selection dialog
        fileInput.click();
    });

    map.on('mousemove', function(e) {
        if (isMeasuring && measureStartPoint && tempMeasureLine) {
            tempMeasureLine.setLatLngs([measureStartPoint, e.latlng]);
        }
    });

    searchBtn.addEventListener('click', async () => {
        const address = searchInput.value;
        if (!address) return;

        try {
            const response = await fetch('/search_venue', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ address: address }),
            });

            const data = await response.json();

            if (response.ok) {
                alert(`Venue found: ${data.address}\nLat: ${data.latitude}, Lon: ${data.longitude}`);
                map.setView([data.latitude, data.longitude], 18);
            } else {
                alert(`Error: ${data.error}`);
            }
        } catch (error) {
            console.error('Search failed:', error);
            alert('An error occurred while searching for the venue.');
        }
    });
});
