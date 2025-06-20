// static/js/drawing_tools.js: Manages drawing permanent lines between cones
console.log('drawing_tools.js loaded - MAJOR COLOR FIX v2');

export class DrawingTools {
    constructor(appInstance) {
        this.app = appInstance;
        this.map = appInstance.map;
        this.uiControls = appInstance.uiControls;
        this.coneManager = appInstance.coneManager;
        
        this.isLineToolActive = false;
        this.startCone = null;
        this.lines = [];
        this.lineLayer = L.layerGroup().addTo(this.map);
        
        // Line style properties
        this._lineColor = '#ff0000'; // Red by default
        this.lineWeight = 2; // Line width in pixels
        this.lineOpacity = 0.8;
        
        // Bind methods
        this._handleConeClick = this._handleConeClick.bind(this);
        this.handleConeClick = this.handleConeClick.bind(this);
        
        // Define this to flag that our fix is loaded
        window.drawingToolsFixApplied = true;
        
        console.log('DrawingTools initialized with color:', this._lineColor);
    }
    
    // Getter and setter for lineColor to ensure it's properly tracked
    get lineColor() {
        return this._lineColor;
    }
    
    set lineColor(color) {
        console.log(`DrawingTools: Setting line color to ${color} using setter`);
        this._lineColor = color;
    }
    
    setLineToolActive(active) {
        this.isLineToolActive = active;
        
        if (this.isLineToolActive) {
            console.log('Line tool activated');
            // Change cursor to indicate drawing mode
            this.map.getContainer().style.cursor = 'crosshair';
            
            // Start listening for cone clicks to select line endpoints
            this._attachConeClickHandlers();
        } else {
            console.log('Line tool deactivated');
            // Reset cursor
            this.map.getContainer().style.cursor = '';
            
            // Reset state
            this.startCone = null;
            
            // Remove click handlers
            this._detachConeClickHandlers();
        }
    }
    
    setLineColor(color) {
        console.log(`Setting line color to: ${color}`);
        this.lineColor = color;
    }
    
    _attachConeClickHandlers() {
        // We don't directly attach to cones, instead we'll intercept cone selection from ConeManager
        // This avoids conflicts with existing cone functionality
        console.log('Attached cone click handlers for line tool');
    }
    
    _detachConeClickHandlers() {
        console.log('Detached cone click handlers for line tool');
    }
    
    // Public method to handle cone clicks from ConeManager
    handleConeClick(cone) {
        console.log('handleConeClick called with cone:', cone.id);
        this._handleConeClick(cone);
    }
    
    // This should be called when a cone is selected in the app
    _handleConeClick(cone) {
        if (!this.isLineToolActive) return;
        
        console.log('Cone clicked for line tool:', cone);
        
        if (!this.startCone) {
            // Set as first endpoint
            this.startCone = cone;
            console.log('Set start cone for line:', cone.id);
        } else {
            // We have both endpoints, create the line
            this._createLine(this.startCone, cone);
            // Reset for next line
            this.startCone = null;
        }
    }
    
    _createLine(startCone, endCone) {
        // DEBUGGING VERSION WITH ALERTS
        console.log('**** DEBUGGING VERSION WITH ALERTS ****');
        
        // Show debug alert for line creation start
        alert('DEBUG: Line creation started');
        
        if (!startCone || !endCone) {
            console.error('Cannot create line: missing endpoint');
            return;
        }
        
        // Force color selection check
        let userSelectedColor;
        
        // Try to get the color from the picker if available
        // The HTML uses id="line-color" not "lineColorPicker"
        const colorPicker = document.getElementById('line-color');
        
        // Display color picker info
        if (colorPicker) {
            alert(`Color picker found: value = ${colorPicker.value}`);
        } else {
            alert('Color picker NOT FOUND');
        }
        
        if (colorPicker && colorPicker.value) {
            userSelectedColor = colorPicker.value;
            console.log(`Found color picker with value: ${userSelectedColor}`);
        } else {
            // Fall back to the stored color
            userSelectedColor = this._lineColor || '#ff0000';
            console.log(`Using stored color: ${userSelectedColor}`);
        }
        
        // Log the color we're using
        alert(`LINE COLOR WILL BE: ${userSelectedColor}`);
        
        // Create line on map using the determined color
        const line = L.polyline(
            [startCone.marker.getLatLng(), endCone.marker.getLatLng()], 
            {
                color: userSelectedColor,
                weight: this.lineWeight,
                opacity: this.lineOpacity,
                interactive: true,
                className: 'autox-line'
            }
        ).addTo(this.lineLayer);
        
        // Verify line color after creation
        setTimeout(() => {
            alert(`Actual line color: ${line.options.color}`);
        }, 100);
        
        // Store line data - create this before the click handler so it's in scope
        const lineData = {
            id: this._generateUniqueId(),
            startConeId: startCone.id,
            endConeId: endCone.id,
            line: line,
            color: this.lineColor,
            weight: this.lineWeight,
            opacity: this.lineOpacity
        };
        
        // Add click handler for line deletion
        line.on('click', (e) => {
            L.DomEvent.stopPropagation(e);
            if (confirm('Delete this line?')) {
                this.removeLine(lineData.id);
            }
        });
        
        // Add hover styling
        line.on('mouseover', () => {
            line.setStyle({ weight: this.lineWeight + 2, opacity: 1.0 });
        });
        
        line.on('mouseout', () => {
            line.setStyle({ weight: this.lineWeight, opacity: this.lineOpacity });
        });
        
        // lineData was already defined earlier in this method, no need to define it again
        
        this.lines.push(lineData);
        
        console.log(`Line created: ${lineData.id} between cones ${startCone.id} and ${endCone.id}`);
        
        return lineData;
    }
    
    // Update line positions when cones move
    updateLinePositions() {
        this.lines.forEach(lineData => {
            const startCone = this.coneManager.findConeById(lineData.startConeId);
            const endCone = this.coneManager.findConeById(lineData.endConeId);
            
            if (startCone && endCone) {
                lineData.line.setLatLngs([
                    startCone.marker.getLatLng(),
                    endCone.marker.getLatLng()
                ]);
            }
        });
    }
    
    removeLine(lineId) {
        const index = this.lines.findIndex(line => line.id === lineId);
        if (index !== -1) {
            const line = this.lines[index];
            this.lineLayer.removeLayer(line.line);
            this.lines.splice(index, 1);
            console.log(`Line ${lineId} removed`);
        }
    }
    
    clearAllLines() {
        console.log('Clearing all lines');
        this.lineLayer.clearLayers();
        this.lines = [];
        this.startCone = null;
    }
    
    // Export line data for JSON saving
    exportLines() {
        return this.lines.map(line => ({
            startConeId: line.startConeId,
            endConeId: line.endConeId,
            color: line.color,
            weight: line.weight,
            opacity: line.opacity
        }));
    }
    
    // Import line data from JSON
    importLines(linesData) {
        // First clear any existing lines
        this.clearAllLines();
        
        // Then create new lines from imported data
        if (linesData && Array.isArray(linesData)) {
            linesData.forEach(lineData => {
                const startCone = this.coneManager.findConeById(lineData.startConeId);
                const endCone = this.coneManager.findConeById(lineData.endConeId);
                
                if (startCone && endCone) {
                    // Create the line with imported properties
                    const line = L.polyline(
                        [startCone.marker.getLatLng(), endCone.marker.getLatLng()], 
                        {
                            color: lineData.color || this.lineColor, 
                            weight: lineData.weight || this.lineWeight,
                            opacity: lineData.opacity || this.lineOpacity
                        }
                    ).addTo(this.lineLayer);
                    
                    // Store in our lines array
                    this.lines.push({
                        id: this._generateUniqueId(),
                        startConeId: lineData.startConeId,
                        endConeId: lineData.endConeId,
                        line: line,
                        color: lineData.color || this.lineColor,
                        weight: lineData.weight || this.lineWeight,
                        opacity: lineData.opacity || this.lineOpacity
                    });
                }
            });
        }
        
        console.log(`Imported ${this.lines.length} lines`);
    }
    
    // Helper to generate unique IDs
    _generateUniqueId() {
        return 'line_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
    }
}
