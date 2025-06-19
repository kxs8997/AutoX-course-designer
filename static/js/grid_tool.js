console.log('grid_tool.js loaded');

export class GridTool {
    constructor(map, uiControls, appState) {
        this.map = map;
        this.uiControls = uiControls; // Provides access to snapCheckbox, gridSizeInput, gridRotationInput
        this.appState = appState; // For future use, if needed

        this.gridLayer = null;
        this.MIN_GRID_ZOOM_LEVEL = 17;

        this._bindMethods();
        this.initGridEventListeners();
        this.drawGrid(); // Initial draw based on default/loaded settings
        console.log('GridTool initialized');
    }

    _bindMethods() {
        this.drawGrid = this.drawGrid.bind(this);
        this.getSnappedLatLng = this.getSnappedLatLng.bind(this);
        // No explicit binding needed for shouldShowGrid as it's called internally
    }

    initGridEventListeners() {
        if (this.uiControls.snapCheckbox) {
            this.uiControls.snapCheckbox.addEventListener('change', this.drawGrid);
        }
        if (this.uiControls.gridSizeInput) {
            this.uiControls.gridSizeInput.addEventListener('input', this.drawGrid);
        }
        if (this.uiControls.gridRotationInput) {
            // The event listener in UIControls already updates the display, so GridTool just needs to redraw.
            this.uiControls.gridRotationInput.addEventListener('input', this.drawGrid);
        }
        this.map.on('moveend', this.drawGrid);
        this.map.on('zoomend', this.drawGrid);
        console.log('GridTool event listeners initialized.');
    }

    shouldShowGrid() {
        return this.uiControls.snapCheckbox.checked && this.map.getZoom() >= this.MIN_GRID_ZOOM_LEVEL;
    }

    drawGrid() {
        if (this.gridLayer) {
            this.map.removeLayer(this.gridLayer);
            this.gridLayer = null;
        }

        if (!this.shouldShowGrid()) {
            if (this.uiControls.snapCheckbox.checked && this.map.getZoom() < this.MIN_GRID_ZOOM_LEVEL) {
                console.log('Grid is turned on but not displaying - zoom in closer to see grid lines');
            }
            return;
        }

        this.gridLayer = L.layerGroup().addTo(this.map);
        const bounds = this.map.getBounds();
        const gridSizeFeet = parseFloat(this.uiControls.gridSizeInput.value) || 10;
        const gridSizeMeters = gridSizeFeet / 3.28084;
        const rotationDegrees = parseFloat(this.uiControls.gridRotationInput.value) || 0;
        const rotationRadians = rotationDegrees * Math.PI / 180;
        const mapCenter = this.map.getCenter();

        function rotatePoint(point, origin, angleRad, mapInstance) {
            const pointPx = mapInstance.latLngToContainerPoint(point);
            const originPx = mapInstance.latLngToContainerPoint(origin);
            const x = pointPx.x - originPx.x;
            const y = pointPx.y - originPx.y;
            const rotatedX = x * Math.cos(angleRad) - y * Math.sin(angleRad);
            const rotatedY = x * Math.sin(angleRad) + y * Math.cos(angleRad);
            return mapInstance.containerPointToLatLng(L.point(rotatedX + originPx.x, rotatedY + originPx.y));
        }

        const viewBoundsDiagonal = this.map.containerPointToLatLng([0,0]).distanceTo(this.map.containerPointToLatLng([this.map.getSize().x, this.map.getSize().y]));
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
                p1_h = rotatePoint(p1_h, mapCenter, rotationRadians, this.map);
                p2_h = rotatePoint(p2_h, mapCenter, rotationRadians, this.map);
                p1_v = rotatePoint(p1_v, mapCenter, rotationRadians, this.map);
                p2_v = rotatePoint(p2_v, mapCenter, rotationRadians, this.map);
            }

            L.polyline([p1_h, p2_h], { color: 'black', weight: 0.5, dashArray: '5, 5' }).addTo(this.gridLayer);
            L.polyline([p1_v, p2_v], { color: 'black', weight: 0.5, dashArray: '5, 5' }).addTo(this.gridLayer);
        }
    }

    getSnappedLatLng(latlng) {
        if (!this.uiControls.snapCheckbox.checked) return latlng; // Only snap if checkbox is checked

        const gridSizeFeet = parseFloat(this.uiControls.gridSizeInput.value) || 10;
        const gridSizeMeters = gridSizeFeet / 3.28084;
        const rotationDegrees = parseFloat(this.uiControls.gridRotationInput.value) || 0;
        const rotationRadians = rotationDegrees * Math.PI / 180;
        const mapCenter = this.map.getCenter();

        const pointPx = this.map.latLngToContainerPoint(latlng);
        const originPx = this.map.latLngToContainerPoint(mapCenter);

        let x = pointPx.x - originPx.x;
        let y = pointPx.y - originPx.y;

        const unrotatedX = x * Math.cos(-rotationRadians) - y * Math.sin(-rotationRadians);
        const unrotatedY = x * Math.sin(-rotationRadians) + y * Math.cos(-rotationRadians);

        const p0 = this.map.project(mapCenter);
        const p1Lat = this.map.project(L.latLng(mapCenter.lat + (gridSizeMeters/111111), mapCenter.lng));
        const p1Lng = this.map.project(L.latLng(mapCenter.lat, mapCenter.lng + (gridSizeMeters / (111111 * Math.cos(mapCenter.lat * Math.PI/180)))));
        const gridStepPxLat = Math.abs(p1Lat.y - p0.y);
        const gridStepPxLng = Math.abs(p1Lng.x - p0.x);

        if (gridStepPxLng === 0 || gridStepPxLat === 0) return latlng;

        const snappedUnrotatedX = Math.round(unrotatedX / gridStepPxLng) * gridStepPxLng;
        const snappedUnrotatedY = Math.round(unrotatedY / gridStepPxLat) * gridStepPxLat;

        const rotatedSnappedX = snappedUnrotatedX * Math.cos(rotationRadians) - snappedUnrotatedY * Math.sin(rotationRadians);
        const rotatedSnappedY = snappedUnrotatedX * Math.sin(rotationRadians) + snappedUnrotatedY * Math.cos(rotationRadians);

        return this.map.containerPointToLatLng(L.point(rotatedSnappedX + originPx.x, rotatedSnappedY + originPx.y));
    }
    
    // Public method to be called by ConeManager if needed
    snapToGrid(latlng) {
        if (this.shouldShowGrid() && this.uiControls.snapCheckbox.checked) {
            return this.getSnappedLatLng(latlng);
        }
        return latlng;
    }
}
