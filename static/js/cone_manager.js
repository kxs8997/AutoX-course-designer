// static/js/cone_manager.js

export class ConeManager {
    constructor(app, uiBridge, gridTool) {
        this.app = app;
        this.map = app.map;
        this.uiBridge = uiBridge;
        this.gridTool = gridTool;
        this.icons = app.icons;

        this.cones = [];
        this.coneMarkers = [];
        this.selectedCone = null;
        this.selectedCones = [];
        this.path = null;
        this.pathLengthMeters = 0;
        this.nextConeId = 1;

        // For multi-cone rotation
        this.multiConeRotationCentroid = null;
        this.multiConeOriginalPositions = [];
        this.multiConeRotationAngle = 0; // Relative angle applied during UI interaction
        
        // For box selection tool
        this.isBoxSelectionActive = false;
        this.boxSelectionStart = null;
        this.boxSelectionEnd = null;
        this.boxSelectionRect = null;
        this.crosshair = null;

        this._bindEventHandlers();
    }

    _bindEventHandlers() {
        this.map.on('click', this._handleMapClickForPlacement.bind(this));
        this.map.on('contextmenu', this._handleMapContextMenu.bind(this));
    }
    
    _handleMapClickForPlacement(e) {
        // Prevent cone placement if box selection is active
        if (this.isBoxSelectionActive) {
            // Don't place cones during box selection
            L.DomEvent.preventDefault(e);
            L.DomEvent.stopPropagation(e);
            return;
        }
        
        const latlng = e.latlng;
        const coneType = this.app.state.selectedConeType;
        
        if (this.app.state.isCursorMode || (this.uiBridge.app.clipboardManager && this.uiBridge.app.clipboardManager.pastePreviewActive)) {
            // In cursor mode, simply deselect all cones unless clicking on a cone (which is handled by the cone's click handler)
            this.deselectAllCones();
        } else if (this.app.state.isSelectionMode) {
            // In selection mode, just deselect all cones
            this.deselectAllCones();
        } else {
            // Add cone if none of the above
            this.addCone(latlng, coneType);
        }
    }
    
    _handleMapContextMenu(e) {
        L.DomEvent.preventDefault(e);
        // Show context menu with paste option if there is clipboard content
        if (this.app.uiControls) {
            this.app.uiControls.showConeContextMenu(e, null, []);
        }
    }

    _getUniqueConeId() {
        return this.nextConeId++;
    }

    findConeById(id) {
        return this.cones.find(c => c.id === id);
    }

    // --- Cone Creation and Management ---
    addCone(latlng, type = 'regular_cone', angle = 0, id = null, isUndoRedoOperation = false) {
        const coneId = id || this._getUniqueConeId();
        if (id && id >= this.nextConeId) {
            this.nextConeId = id + 1;
        }

        console.log(`Creating cone with type: ${type}`);
        
        let icon;
        switch (type) {
            case 'regular_cone':
                icon = this.icons.coneIcon;
                console.log('Using REGULAR cone icon:', this.icons.coneIcon.options.iconUrl);
                break;
            case 'laid_down_cone':
                icon = this.icons.laidDownConeIcon;
                console.log('Using LAID DOWN cone icon:', this.icons.laidDownConeIcon.options.iconUrl);
                break;
            case 'pointer_cone':
                icon = this.icons.pointerConeIcon;
                console.log('Using POINTER cone icon:', this.icons.pointerConeIcon.options.iconUrl);
                break;
            default:
                icon = this.icons.coneIcon;
                console.log('Using DEFAULT cone icon:', this.icons.coneIcon.options.iconUrl);
        }
        const marker = L.marker(latlng, {
            icon: icon,
            draggable: true,
            rotationAngle: angle,
            rotationOrigin: 'center center'
        }).addTo(this.map);

        const coneData = {
            id: coneId,
            marker: marker,
            latlng: marker.getLatLng(),
            type: type,
            angle: angle,
        };

        this.cones.push(coneData);
        this.coneMarkers.push(marker);

        marker.on('click', (e) => this._handleConeClick(e, coneData));
        marker.on('dragstart', (e) => this._handleConeDragStart(e, coneData));
        marker.on('drag', (e) => this._handleConeDrag(e, coneData));
        marker.on('dragend', (e) => this._handleConeDragEnd(e, coneData));
        marker.on('contextmenu', (e) => this._handleConeContextMenu(e, coneData));

        this.redrawPath();
        this.uiBridge.updateConeCount(this.cones.length);

        if (!isUndoRedoOperation && this.app.undoRedoManager) {
            const action = {
                type: 'add_cone',
                coneData: { // Store serializable data
                    id: coneId,
                    latlng: { lat: latlng.lat, lng: latlng.lng },
                    type: type,
                    angle: angle
                }
            };
            this.app.undoRedoManager.addAction(action);
        }

        return coneData;
    }

    // --- Selection Handling ---
    _handleConeClick(event, coneData) {
        L.DomEvent.stopPropagation(event);
        // Make sure coneData is a valid object
        if (!coneData || typeof coneData !== 'object') {
            console.error('Invalid cone data in _handleConeClick:', coneData);
            return;
        }
        
        console.log(`Cone clicked. ID: ${coneData.id}, Selection Mode: ${this.app.state.isSelectionMode}`);

        if (this.app.state.isSelectionMode) {
            this.toggleConeSelection(coneData);
        } else {
            this.selectSingleCone(coneData);
        }
        this.uiBridge.updateSelectedConeTools(this.selectedCones);
    }

    selectSingleCone(coneData) {
        console.log('Selecting single cone:', coneData.id);
        if (this.selectedCones.length > 1 || !this.selectedCones.includes(coneData)) {
            this.deselectAllCones(true); // silent deselect
        }

        if (!this.selectedCones.includes(coneData)) {
            this.selectedCones.push(coneData);
            this.toggleConeSelectionUI(coneData, true);
        }
        this.selectedCone = coneData;
        this.uiBridge.updateSelectedConeTools(this.selectedCones);
        console.log('Selected cones:', this.selectedCones.map(c => c.id));
    }

    toggleConeSelection(coneData) {
        const index = this.selectedCones.indexOf(coneData);
        if (index > -1) {
            console.log('Deselecting cone:', coneData.id);
            this.selectedCones.splice(index, 1);
            this.toggleConeSelectionUI(coneData, false);
        } else {
            console.log('Selecting cone:', coneData.id);
            this.selectedCones.push(coneData);
            this.toggleConeSelectionUI(coneData, true);
        }
        this.selectedCone = this.selectedCones.length > 0 ? this.selectedCones[this.selectedCones.length - 1] : null;
        this.uiBridge.updateSelectedConeTools(this.selectedCones);
        console.log('Selected cones:', this.selectedCones.map(c => c.id));
    }

    deselectAllCones(silent = false) {
        this.selectedCones.forEach(cone => this.toggleConeSelectionUI(cone, false));
        this.selectedCones = [];
        this.selectedCone = null;
        if (!silent) {
            this.uiBridge.updateSelectedConeTools(this.selectedCones);
        }
    }

    toggleConeSelectionUI(coneData, isSelected) {
        const markerElement = coneData.marker.getElement();
        if (markerElement) {
            if (isSelected) {
                markerElement.classList.add('selected-cone');
            } else {
                markerElement.classList.remove('selected-cone');
            }
        }
    }

    // --- Drag and Drop Handlers ---
    _handleConeDragStart(event, coneData) {
        if (!this.selectedCones.includes(coneData)) {
            this.selectSingleCone(coneData);
            this.uiBridge.updateSelectedConeTools(this.selectedCones);
        }

        this.dragStartPositions = new Map();
        this.selectedCones.forEach(sc => {
            this.dragStartPositions.set(sc.id, {
                latlng: sc.marker.getLatLng(),
                originalData: {
                    id: sc.id,
                    latlng: { lat: sc.marker.getLatLng().lat, lng: sc.marker.getLatLng().lng }
                }
            });
        });
    }

    _handleConeDrag(event, draggedConeData) {
        const draggedConeStartPos = this.dragStartPositions.get(draggedConeData.id).latlng;
        const newLatLng = event.target.getLatLng();
        const latDiff = newLatLng.lat - draggedConeStartPos.lat;
        const lngDiff = newLatLng.lng - draggedConeStartPos.lng;

        this.selectedCones.forEach(cone => {
            if (cone.id !== draggedConeData.id) {
                const startPos = this.dragStartPositions.get(cone.id).latlng;
                const updatedLatLng = L.latLng(startPos.lat + latDiff, startPos.lng + lngDiff);
                cone.marker.setLatLng(updatedLatLng);
            }
            cone.latlng = cone.marker.getLatLng(); // Update internal state
        });
        this.redrawPath();
    }

    _handleConeDragEnd(event, coneData) {
        let finalPositions = [];
        let originalPositions = [];

        this.selectedCones.forEach(sc => {
            const finalLatLng = sc.marker.getLatLng();
            let snappedLatLng = finalLatLng;
            if (this.gridTool) {
                snappedLatLng = this.gridTool.snapToGrid(finalLatLng);
                if (snappedLatLng.lat !== finalLatLng.lat || snappedLatLng.lng !== finalLatLng.lng) {
                    sc.marker.setLatLng(snappedLatLng);
                }
            }
            sc.latlng = snappedLatLng; // Final update to internal state

            finalPositions.push({ id: sc.id, latlng: { lat: snappedLatLng.lat, lng: snappedLatLng.lng } });
            originalPositions.push(this.dragStartPositions.get(sc.id).originalData);
        });

        this.redrawPath();
        this.calculatePathLength();
        this.dragStartPositions = null;

        if (this.app.undoRedoManager) {
            const action = {
                type: 'move_cones',
                cones: finalPositions.map(fp => {
                    const op = originalPositions.find(op => op.id === fp.id);
                    return {
                        coneId: fp.id,
                        oldLatLng: op.latlng,
                        newLatLng: fp.latlng
                    };
                })
            };
            this.app.undoRedoManager.addAction(action);
        }
    }

    // --- Context Menu ---
    _handleConeContextMenu(event, coneData) {
        L.DomEvent.stopPropagation(event.originalEvent);
        L.DomEvent.preventDefault(event.originalEvent);

        // If the clicked cone is not in the current selection, select it exclusively.
        if (!this.selectedCones.includes(coneData)) {
            this.selectSingleCone(coneData);
        }

        // Now show the context menu. The selection is guaranteed to contain the clicked cone.
        this.app.uiControls.showConeContextMenu(event, coneData, this.selectedCones);
    }

    // --- Path and Stats ---
    redrawPath() {
        // Path drawing disabled by user request.
        // if (this.path) {
        //     this.path.remove();
        // }

        // if (this.cones.length > 1) {
        //     const latlngs = this.cones.map(cone => cone.marker.getLatLng());
        //     this.path = L.polyline(latlngs, { color: 'blue' }).addTo(this.map);
        // }
        this.calculatePathLength();
    }

    calculatePathLength() {
        this.pathLengthMeters = 0;
        if (this.cones.length > 1) {
            const latlngs = this.cones.map(cone => cone.marker.getLatLng());
            for (let i = 0; i < latlngs.length - 1; i++) {
                this.pathLengthMeters += latlngs[i].distanceTo(latlngs[i + 1]);
            }
        }
    }

    deleteCone(coneData, isUndoRedoOperation = false) {
        const index = this.cones.findIndex(c => c === coneData);
        if (index > -1) {
            this.cones.splice(index, 1);
            this.map.removeLayer(coneData.marker);
            
            if (!isUndoRedoOperation && this.uiBridge.app.undoRedoManager) {
                this.uiBridge.app.undoRedoManager.addAction({
                    type: 'delete',
                    cones: [{
                        id: coneData.id,
                        latlng: { lat: coneData.latlng.lat, lng: coneData.latlng.lng },
                        type: coneData.type,
                        angle: coneData.angle
                    }]
                });
            }
            
            this.redrawPath();
        }
    }
    
    _handleConeDragEnd(event, coneData) {
        let finalPositions = [];
        let originalPositions = [];

        this.selectedCones.forEach(sc => {
            const finalLatLng = sc.marker.getLatLng();
            let snappedLatLng = finalLatLng;
            if (this.gridTool) {
                snappedLatLng = this.gridTool.snapToGrid(finalLatLng);
                if (snappedLatLng.lat !== finalLatLng.lat || snappedLatLng.lng !== finalLatLng.lng) {
                    sc.marker.setLatLng(snappedLatLng);
                }
            }
            
            // Store positions for undo/redo
            finalPositions.push({
                id: sc.id,
                latlng: sc.marker.getLatLng()
            });
            
            const originalPos = this.dragStartPositions.get(sc.id);
            if (originalPos) {
                originalPositions.push({
                    id: sc.id,
                    latlng: originalPos.latlng
                });
            }
            
            // Update internal latlng state
            sc.latlng = sc.marker.getLatLng();
        });
        
        this.dragStartPositions.clear();
        this.redrawPath();
        
        // Add to undo/redo stack if it's not already an undo/redo operation
        if (!event.undoRedoOperation && this.uiBridge.app.undoRedoManager && originalPositions.length > 0) {
            this.uiBridge.app.undoRedoManager.addAction({
                type: 'move',
                originalPositions: originalPositions,
                newPositions: finalPositions
            });
        }
    }

    deleteSelectedCones(isUndoRedoOperation = false) {
        if (this.selectedCones.length === 0) return;

        const deletedConesDataForUndo = this.selectedCones.map(coneData => ({
            id: coneData.id,
            latlng: { lat: coneData.latlng.lat, lng: coneData.latlng.lng },
            type: coneData.type,
            angle: coneData.angle
        }));

        this.selectedCones.forEach(coneData => {
            const index = this.cones.findIndex(c => c === coneData);
            if (index > -1) {
                this.map.removeLayer(coneData.marker);
                this.cones.splice(index, 1);
                this.coneMarkers.splice(this.coneMarkers.indexOf(coneData.marker), 1);
            }
        });

        this.selectedCones = [];
        this.selectedCone = null;

        this.redrawPath();
        this.calculatePathLength();
        this.uiBridge.updateConeCount(this.cones.length);
        this.uiBridge.updateSelectedConeTools(this.selectedCones);

        if (!isUndoRedoOperation && this.app.undoRedoManager && deletedConesDataForUndo.length > 0) {
            const action = {
                type: 'delete_multiple_cones',
                conesData: deletedConesDataForUndo
            };
            this.app.undoRedoManager.addAction(action);
        }
    }

    clearAllCones(isUndoRedoOperation = false) {
        const conesDataForUndo = this.cones.map(c => ({
            id: c.id,
            latlng: { lat: c.latlng.lat, lng: c.latlng.lng },
            type: c.type,
            angle: c.angle
        }));

        this.coneMarkers.forEach(marker => this.map.removeLayer(marker));
        this.cones = [];
        this.coneMarkers = [];
        this.selectedCone = null;
        this.selectedCones = [];

        if (this.path) {
            this.path.remove();
            this.path = null;
        }
        this.pathLengthMeters = 0;

        this.uiBridge.updateConeCount(0);
        this.uiBridge.updatePathLength(0);
        this.uiBridge.updateSelectedConeTools([]);

        if (!isUndoRedoOperation && this.app.undoRedoManager && conesDataForUndo.length > 0) {
            const action = {
                type: 'clear_all_cones',
                conesData: conesDataForUndo
            };
            this.app.undoRedoManager.addAction(action);
        }
    }

    toggleConeType(coneData, isUndoRedoOperation = false) {
        if (!coneData || !coneData.marker) return;

        const oldType = coneData.type;
        let newType;
        let newIcon;

        if (coneData.type === 'regular_cone') {
            newType = 'laid_down_cone';
            newIcon = this.icons.laidDownConeIcon;
        } else {
            newType = 'regular_cone';
            newIcon = this.icons.coneIcon;
        }

        coneData.type = newType;
        coneData.marker.setIcon(newIcon);

        if (this.selectedCones.includes(coneData)) {
            this.uiBridge.updateSelectedConeTools(this.selectedCones);
        }

        if (!isUndoRedoOperation && this.app.undoRedoManager) {
            const action = {
                type: 'toggle_cone_type',
                coneId: coneData.id,
                oldType: oldType,
                newType: newType
            };
            this.app.undoRedoManager.addAction(action);
        }
    }

    resetConeRotation(coneData, isUndoRedoOperation = false) {
        if (!coneData || !coneData.marker) return;
        this.setSelectedConeRotation(coneData, 0, isUndoRedoOperation);
    }

    startSelectedConesRotation() {
        if (this.selectedCones.length < 2) {
            return false;
        }

        this.multiConeRotationCentroid = this._calculateCentroid(this.selectedCones);
        this.multiConeOriginalPositions = this.selectedCones.map(cone => ({
            coneId: cone.id,
            coneRef: cone,
            originalLatLng: L.latLng(cone.latlng.lat, cone.latlng.lng),
            originalAngle: cone.angle
        }));
        this.multiConeRotationAngle = 0;
        this.uiBridge.updateMultiConeRotationUI(true, 0);
        return true;
    }

    setSelectedConeRotation(coneData, angle, isUndoRedoOperation = false) {
        if (!coneData || !coneData.marker) return;

        const oldAngle = coneData.angle;
        if (oldAngle === angle) return;

        coneData.angle = angle;
        if (typeof coneData.marker.setRotationAngle === 'function') {
            coneData.marker.setRotationAngle(angle);
        }

        if (this.selectedCones.includes(coneData)) {
            this.uiBridge.updateSelectedConeTools(this.selectedCones);
        }

        if (!isUndoRedoOperation && this.app.undoRedoManager) {
            const action = {
                type: 'rotate_cone',
                coneId: coneData.id,
                oldAngle: oldAngle,
                newAngle: angle
            };
            this.app.undoRedoManager.addAction(action);
        }
    }

    rotateSelectedConesByAngle(newAbsoluteAngle) {
        if (this.selectedCones.length < 2 || !this.multiConeRotationCentroid || !this.multiConeOriginalPositions) {
            return;
        }

        const centroidProjected = this._latLngToRelativeMeters(this.multiConeRotationCentroid);

        this.multiConeOriginalPositions.forEach(item => {
            const cone = item.coneRef;
            const originalProjected = this._latLngToRelativeMeters(item.originalLatLng);
            const newProjected = this._rotatePointAroundOrigin(originalProjected, centroidProjected, newAbsoluteAngle);
            const newLatLng = this._relativeMetersToLatLng(newProjected);

            cone.latlng.lat = newLatLng.lat;
            cone.latlng.lng = newLatLng.lng;
            cone.marker.setLatLng(newLatLng);

            const newConeAngle = (item.originalAngle + newAbsoluteAngle + 360) % 360;
            cone.angle = newConeAngle;
            if (typeof cone.marker.setRotationAngle === 'function') {
                cone.marker.setRotationAngle(newConeAngle);
            }
        });

        this.multiConeRotationAngle = newAbsoluteAngle;
        this.redrawPath();
        this.calculatePathLength();
        this.uiBridge.updateMultiConeRotationUI(true, newAbsoluteAngle);
    }

    finishSelectedConesRotation(isUndoRedoOperation = false) {
        if (this.selectedCones.length < 2 || !this.multiConeRotationCentroid || this.multiConeOriginalPositions.length === 0) {
            this.uiBridge.updateMultiConeRotationUI(false, 0);
            this.multiConeRotationCentroid = null;
            this.multiConeOriginalPositions = [];
            this.multiConeRotationAngle = 0;
            return;
        }

        const rotationAngleApplied = this.multiConeRotationAngle;
        const centroidUsed = { lat: this.multiConeRotationCentroid.lat, lng: this.multiConeRotationCentroid.lng };

        const actionCones = this.multiConeOriginalPositions.map(origPos => {
            const currentCone = this.findConeById(origPos.coneId);
            if (!currentCone) return null;
            return {
                coneId: currentCone.id,
                oldAngle: origPos.originalAngle,
                newAngle: currentCone.angle,
                oldLatLng: { lat: origPos.originalLatLng.lat, lng: origPos.originalLatLng.lng },
                newLatLng: { lat: currentCone.latlng.lat, lng: currentCone.latlng.lng }
            };
        }).filter(c => c !== null);

        if (!isUndoRedoOperation && this.app.undoRedoManager && actionCones.length > 0 && rotationAngleApplied !== 0) {
            const action = {
                type: 'rotate_multiple_cones',
                conesRotated: actionCones,
                centroid: centroidUsed,
                rotationAngleApplied: rotationAngleApplied
            };
            this.app.undoRedoManager.addAction(action);
        }

        this.multiConeRotationCentroid = null;
        this.multiConeOriginalPositions = [];
        this.multiConeRotationAngle = 0;
        this.uiBridge.updateMultiConeRotationUI(false, 0);
    }

    // --- Clipboard Delegation ---
    copySelectedCones() {
        if (this.uiBridge.app.clipboardManager) {
            this.uiBridge.app.clipboardManager.copySelectedCones();
        } else {
            console.warn('ClipboardManager not available to copy cones.');
        }
    }

    startPastePreview(latlng) {
        if (this.uiBridge.app.clipboardManager) {
            this.uiBridge.app.clipboardManager.startPaste(latlng);
        } else {
            console.warn('ClipboardManager not available to start paste preview.');
        }
    }

    confirmPaste() {
        if (this.uiBridge.app.clipboardManager) {
            this.uiBridge.app.clipboardManager.confirmPaste();
        } else {
            console.warn('ClipboardManager not available to confirm paste.');
        }
    }

    cancelPastePreview() {
        if (this.uiBridge.app.clipboardManager && typeof this.uiBridge.app.clipboardManager.clearPastePreview === 'function') {
            this.uiBridge.app.clipboardManager.clearPastePreview();
        } else {
            console.warn('ClipboardManager or clearPastePreview not available.');
        }
    }

    updatePastePreviewRotation(angle) {
        if (this.uiBridge.app.clipboardManager) {
            this.uiBridge.app.clipboardManager.updatePastePreviewRotation(angle);
        } else {
            console.warn('ClipboardManager not available to update paste preview rotation.');
        }
    }
    
    /**
     * Adds multiple cones to the map at once - used for paste operations
     * @param {Array} conesData - Array of cone data objects with latlng, type, and angle
     */
    addMultipleCones(conesData) {
        if (!Array.isArray(conesData) || conesData.length === 0) {
            console.warn('Invalid or empty cones data array provided to addMultipleCones');
            return [];
        }
        
        const addedCones = [];
        
        conesData.forEach(coneData => {
            // Create a new cone with the provided data
            const newCone = {
                id: this.nextConeId++,
                latlng: coneData.latlng,
                type: coneData.type || 'regular_cone',
                angle: coneData.angle || 0
            };
            
            // Create a new marker for the cone
            let icon;
            switch (newCone.type) {
                case 'regular_cone':
                    icon = this.icons.coneIcon;
                    break;
                case 'laid_down_cone':
                    icon = this.icons.laidDownConeIcon;
                    break;
                case 'pointer_cone':
                    icon = this.icons.pointerConeIcon;
                    break;
                default:
                    icon = this.icons.coneIcon;
            }
            
            const marker = L.marker(newCone.latlng, {
                icon: icon,
                draggable: true,
                rotationAngle: newCone.angle,
                rotationOrigin: 'center center'
            });
            
            // Store cone data reference in the marker
            marker.coneData = newCone;
            newCone.marker = marker; // Reference back to the marker
            
            // Add the cone to our arrays
            this.cones.push(newCone);
            this.coneMarkers.push(marker);
            
            // Add event handlers directly to the marker
            marker.on('click', (e) => this._handleConeClick(e, newCone));
            marker.on('dragstart', (e) => this._handleConeDragStart(e, newCone));
            marker.on('drag', (e) => this._handleConeDrag(e, newCone));
            marker.on('dragend', (e) => this._handleConeDragEnd(e, newCone));
            marker.on('contextmenu', (e) => this._handleConeContextMenu(e, newCone));
            
            // Add the marker to the map
            marker.addTo(this.map);
            addedCones.push(newCone);
        });
        
        // Redraw path and update counts
        this.redrawPath();
        this.calculatePathLength();
        // Update cone count in UI
        if (this.app && this.app.uiControls) {
            this.app.uiControls.updateConeCount(this.cones.size);
        }
        
        // Add to undo stack if available
        if (this.app.undoRedoManager) {
            this.app.undoRedoManager.addAction({
                type: 'add_multiple_cones',
                cones: addedCones.map(cone => ({
                    id: cone.id,
                    latlng: { lat: cone.latlng.lat, lng: cone.latlng.lng },
                    type: cone.type,
                    angle: cone.angle
                })),
                undo: () => {
                    // Remove the added cones during undo
                    addedCones.forEach(cone => this.removeCone(cone.id, true));
                },
                redo: () => {
                    // Re-add the cones during redo
                    this.addMultipleCones(addedCones.map(cone => ({
                        latlng: { lat: cone.latlng.lat, lng: cone.latlng.lng },
                        type: cone.type,
                        angle: cone.angle
                    })));
                }
            });
        }
        return addedCones;
    }

    // --- Geometric Helpers ---
    _calculateCentroid(cones) {
        if (!cones || cones.length === 0) return null;
        let sumLat = 0;
        let sumLng = 0;
        cones.forEach(cone => {
            sumLat += cone.latlng.lat;
            sumLng += cone.latlng.lng;
        });
        return L.latLng(sumLat / cones.length, sumLng / cones.length);
    }
    
    // --- Box Selection Tool Methods ---
    startBoxSelection() {
        this.isBoxSelectionActive = true;
        // Reset any existing selection elements
        this.stopBoxSelectionWithoutToggle();
        
        // Add event listeners for box selection
        this._boxSelectionMouseDownHandler = this._handleBoxSelectionMouseDown.bind(this);
        this._boxSelectionMouseMoveHandler = this._handleBoxSelectionMouseMove.bind(this);
        this._boxSelectionMouseUpHandler = this._handleBoxSelectionMouseUp.bind(this);
        
        this.map.on('mousedown', this._boxSelectionMouseDownHandler);
        this.map.on('mousemove', this._handleCrosshairMove.bind(this));
        
        // Create crosshair element
        this._createCrosshair();
        
        // Set the cursor style for the map container
        this.map.getContainer().style.cursor = 'crosshair';
        
        // Store current map dragging state and disable dragging
        this._mapDraggingWasEnabled = this.map.dragging.enabled();
        this.map.dragging.disable();
        
        console.log('Box selection mode activated');
    }
    
    stopBoxSelection() {
        if (!this.isBoxSelectionActive) return;
        
        this.stopBoxSelectionWithoutToggle();
        this.isBoxSelectionActive = false;
        
        // Reset the cursor style
        this.map.getContainer().style.cursor = '';
        
        // Re-enable map dragging if it was previously enabled
        if (this._mapDraggingWasEnabled) {
            this.map.dragging.enable();
        }
        
        console.log('Box selection mode deactivated');
    }
    
    stopBoxSelectionWithoutToggle() {
        // Remove box selection event listeners
        if (this._boxSelectionMouseDownHandler) {
            this.map.off('mousedown', this._boxSelectionMouseDownHandler);
        }
        if (this._boxSelectionMouseMoveHandler) {
            this.map.off('mousemove', this._boxSelectionMouseMoveHandler);
        }
        if (this._boxSelectionMouseUpHandler) {
            this.map.off('mouseup', this._boxSelectionMouseUpHandler);
        }
        
        // Remove crosshair
        if (this.crosshair) {
            this.map.getContainer().removeChild(this.crosshair);
            this.crosshair = null;
        }
        
        // Remove any existing selection rectangle
        if (this.boxSelectionRect) {
            this.boxSelectionRect.remove();
            this.boxSelectionRect = null;
        }
        
        this.boxSelectionStart = null;
        this.boxSelectionEnd = null;
    }
    
    _createCrosshair() {
        // Remove any existing crosshair
        if (this.crosshair) {
            this.map.getContainer().removeChild(this.crosshair);
        }
        
        // Create crosshair container div
        const crosshair = document.createElement('div');
        crosshair.className = 'crosshair';
        crosshair.style.position = 'absolute';
        crosshair.style.pointerEvents = 'none';
        crosshair.style.zIndex = '1000';
        
        // Create horizontal line
        const hLine = document.createElement('div');
        hLine.style.position = 'absolute';
        hLine.style.width = '20px';
        hLine.style.height = '2px';
        hLine.style.backgroundColor = 'red';
        hLine.style.top = '0px';
        hLine.style.left = '-10px';
        
        // Create vertical line
        const vLine = document.createElement('div');
        vLine.style.position = 'absolute';
        vLine.style.width = '2px';
        vLine.style.height = '20px';
        vLine.style.backgroundColor = 'red';
        vLine.style.top = '-10px';
        vLine.style.left = '0px';
        
        // Add the lines to the crosshair container
        crosshair.appendChild(hLine);
        crosshair.appendChild(vLine);
        
        // Add the crosshair to the map container
        this.map.getContainer().appendChild(crosshair);
        this.crosshair = crosshair;
    }
    
    _handleCrosshairMove(e) {
        if (!this.isBoxSelectionActive || !this.crosshair) return;
        
        // Get the mouse position relative to the map container
        const containerPoint = this.map.mouseEventToContainerPoint(e);
        
        // Update crosshair position
        this.crosshair.style.left = containerPoint.x + 'px';
        this.crosshair.style.top = containerPoint.y + 'px';
    }
    
    _handleBoxSelectionMouseDown(e) {
        // Only start box selection if the user is drawing a box (left mouse button)
        if (e.originalEvent.button !== 0) return;
        
        L.DomEvent.preventDefault(e);
        L.DomEvent.stopPropagation(e);
        
        this.boxSelectionStart = e.latlng;
        
        // Add event listeners for mouse movement and up
        this.map.on('mousemove', this._boxSelectionMouseMoveHandler);
        this.map.on('mouseup', this._boxSelectionMouseUpHandler);
    }
    
    _handleBoxSelectionMouseMove(e) {
        if (!this.boxSelectionStart) return;
        
        this.boxSelectionEnd = e.latlng;
        
        // Update or create the selection rectangle
        if (this.boxSelectionRect) {
            this.boxSelectionRect.setBounds(L.latLngBounds(this.boxSelectionStart, this.boxSelectionEnd));
        } else {
            this.boxSelectionRect = L.rectangle(L.latLngBounds(this.boxSelectionStart, this.boxSelectionEnd), {
                color: '#3388ff',
                weight: 1,
                opacity: 0.5,
                fillOpacity: 0.2
            }).addTo(this.map);
        }
    }
    
    _handleBoxSelectionMouseUp(e) {
        if (!this.boxSelectionStart) return;
        
        // Prevent default behavior and stop event propagation
        L.DomEvent.preventDefault(e);
        L.DomEvent.stopPropagation(e);
        
        // Complete the box selection
        this.boxSelectionEnd = e.latlng;
        
        // Select all cones within the box
        this._selectConesInBox();
        
        // Remove the movement handlers
        this.map.off('mousemove', this._boxSelectionMouseMoveHandler);
        this.map.off('mouseup', this._boxSelectionMouseUpHandler);
        
        // Remove the selection rectangle
        if (this.boxSelectionRect) {
            this.boxSelectionRect.remove();
            this.boxSelectionRect = null;
        }
        
        this.boxSelectionStart = null;
        this.boxSelectionEnd = null;
        
        // Use setTimeout to prevent any click events from being triggered afterward
        setTimeout(() => {
            this.isBoxSelecting = false;
        }, 10);
    }
    
    _selectConesInBox() {
        if (!this.boxSelectionStart || !this.boxSelectionEnd) return;
        
        // Create a bounds object from the selection points
        const bounds = L.latLngBounds(this.boxSelectionStart, this.boxSelectionEnd);
        
        // Deselect any previously selected cones
        this.deselectAllCones(true);
        
        // Select all cones within the bounds
        const selectedCones = [];
        this.cones.forEach(cone => {
            if (bounds.contains(cone.latlng)) {
                selectedCones.push(cone);
                this.toggleConeSelectionUI(cone, true);
            }
        });
        
        // Update the selection arrays
        this.selectedCones = selectedCones;
        this.selectedCone = this.selectedCones.length > 0 ? this.selectedCones[0] : null;
        
        // Update the UI
        this.uiBridge.updateSelectedConeTools(this.selectedCones);
        
        console.log('Selected', this.selectedCones.length, 'cones in box');
    }

    _rotatePointAroundOrigin(point, origin, angleDegrees) {
        const angleRad = angleDegrees * (Math.PI / 180);
        const s = Math.sin(angleRad);
        const c = Math.cos(angleRad);

        // translate point back to origin:
        point.x -= origin.x;
        point.y -= origin.y;

        // rotate point
        const xnew = point.x * c - point.y * s;
        const ynew = point.x * s + point.y * c;

        // translate point back:
        point.x = xnew + origin.x;
        point.y = ynew + origin.y;
        return point;
    }

    _latLngToRelativeMeters(latlng) {
        // Project to a consistent plane (pixels at max zoom) for accurate geometric calculations
        return this.map.project(latlng, this.map.getMaxZoom());
    }

    _relativeMetersToLatLng(point) {
        // Unproject from the consistent plane back to geographic coordinates
        return this.map.unproject(point, this.map.getMaxZoom());
    }

    updateConeProperties(coneId, properties, isUndoRedoOperation = true) {
        const coneData = this.findConeById(coneId);
        if (!coneData) {
            console.warn(`updateConeProperties: Cone with ID ${coneId} not found.`);
            return;
        }

        let needsPathRedraw = false;

        if (properties.latlng) {
            const newLatLng = L.latLng(properties.latlng.lat, properties.latlng.lng);
            coneData.latlng = newLatLng;
            coneData.marker.setLatLng(newLatLng);
            needsPathRedraw = true;
        }
        if (properties.angle !== undefined) {
            coneData.angle = properties.angle;
            if (typeof coneData.marker.setRotationAngle === 'function') {
                coneData.marker.setRotationAngle(properties.angle);
            }
        }
        if (properties.type) {
            coneData.type = properties.type;
            const newIcon = properties.type === 'regular_cone' ? this.icons.coneIcon : this.icons.laidDownConeIcon;
            coneData.marker.setIcon(newIcon);
        }

        if (needsPathRedraw) {
            this.redrawPath();
        }

        if (this.selectedCones.includes(coneData)) {
            this.uiBridge.updateSelectedConeTools(this.selectedCones);
        }
    }
}