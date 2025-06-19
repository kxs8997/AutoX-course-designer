// static/js/measure_tool.js: Manages distance measurement functionality.
console.log('measure_tool.js loaded');

export class MeasureTool {
    constructor(map, icons, uiControls, appState) {
        this.map = map;
        this.icons = icons; // For measurement point icons
        this.uiControls = uiControls; // To update UI elements like measure button text/style and results
        this.appState = appState; // To interact with global app state if needed

        this.isMeasuring = false;
        this.measureStartPoint = null;
        this.tempMeasureLine = null;
        this.measureLayer = L.layerGroup().addTo(this.map);

        // Bind methods
        this._handleMapClickForMeasure = this._handleMapClickForMeasure.bind(this);
        // this.toggleMeasureMode = this.toggleMeasureMode.bind(this); // This will be called by UIControls

        console.log('MeasureTool initialized');
    }

    toggleMeasureMode() {
        this.isMeasuring = !this.isMeasuring;
        if (this.isMeasuring) {
            if (this.uiControls.measureBtn) {
                this.uiControls.measureBtn.textContent = 'Stop Measuring';
                this.uiControls.measureBtn.style.backgroundColor = '#ffc107'; // Yellow for active
            }
            this.map.getContainer().style.cursor = 'crosshair';
            if (this.uiControls.measurementResultsDiv) {
                this.uiControls.measurementResultsDiv.style.display = 'block'; // Show results area
            }
            this.map.on('click', this._handleMapClickForMeasure);
            // Prevent cone placement by ConeManager while measuring
            this.appState.isMeasuringMode = true; 
            console.log('Measurement mode ENABLED.');
        } else {
            if (this.uiControls.measureBtn) {
                this.uiControls.measureBtn.textContent = 'Measure Distance';
                this.uiControls.measureBtn.style.backgroundColor = '';
            }
            this.map.getContainer().style.cursor = '';
            this.map.off('click', this._handleMapClickForMeasure);
            this.clearMeasurements(); // Clear existing points and lines
            // Hide results area if not measuring, but only if it's currently empty or we want to reset it
            // if (this.uiControls.measurementValueSpan) this.uiControls.measurementValueSpan.textContent = '0.0';
            // if (this.uiControls.measurementResultsDiv) this.uiControls.measurementResultsDiv.style.display = 'none';
            this.appState.isMeasuringMode = false;
            console.log('Measurement mode DISABLED.');
        }
    }

    _handleMapClickForMeasure(e) {
        if (!this.isMeasuring) return;

        // Prevent map click from propagating to other handlers like ConeManager's placement
        L.DomEvent.stopPropagation(e.originalEvent);
        L.DomEvent.preventDefault(e.originalEvent);

        if (!this.measureStartPoint) {
            this.measureStartPoint = e.latlng;
            L.marker(this.measureStartPoint, { icon: this.icons.measurementPointIcon }).addTo(this.measureLayer);
            if (this.tempMeasureLine) {
                this.map.removeLayer(this.tempMeasureLine);
            }
            // Optional: Add a temporary line that follows the mouse until the second click
            // this.map.on('mousemove', this._drawTempMeasureLine, this);
        } else {
            const measureEndPoint = e.latlng;
            L.marker(measureEndPoint, { icon: this.icons.measurementPointIcon }).addTo(this.measureLayer);
            const distance = this.measureStartPoint.distanceTo(measureEndPoint);
            L.polyline([this.measureStartPoint, measureEndPoint], { color: 'red' }).addTo(this.measureLayer);
            
            this._updateMeasurementDisplay(distance);
            
            this.measureStartPoint = null; // Reset for the next measurement segment
            // this.map.off('mousemove', this._drawTempMeasureLine, this); // Stop drawing temp line
        }
    }

    // _drawTempMeasureLine(e) { // Optional: for live feedback
    //     if (this.measureStartPoint && this.isMeasuring) {
    //         if (this.tempMeasureLine) {
    //             this.map.removeLayer(this.tempMeasureLine);
    //         }
    //         this.tempMeasureLine = L.polyline([this.measureStartPoint, e.latlng], { color: 'red', dashArray: '5, 5' }).addTo(this.map);
    //     }
    // }

    _updateMeasurementDisplay(distanceMeters) {
        const distanceFeet = (distanceMeters * 3.28084).toFixed(1);
        if (this.uiControls.measurementValueSpan) {
            this.uiControls.measurementValueSpan.textContent = distanceFeet;
        }
        if (this.uiControls.measurementResultsDiv) {
            this.uiControls.measurementResultsDiv.style.display = 'block';
        }
    }

    clearMeasurements() {
        this.measureLayer.clearLayers();
        this.measureStartPoint = null;
        if (this.tempMeasureLine) {
            this.map.removeLayer(this.tempMeasureLine);
            this.tempMeasureLine = null;
        }
        // Reset measurement value in UI
        if (this.uiControls.measurementValueSpan) {
            this.uiControls.measurementValueSpan.textContent = '0.0';
        }
        // Optionally hide the results div if it's empty and we are not actively measuring
        // if (!this.isMeasuring && this.uiControls.measurementResultsDiv) {
        //     this.uiControls.measurementResultsDiv.style.display = 'none'; 
        // }
        console.log('Measurements cleared.');
    }
}

