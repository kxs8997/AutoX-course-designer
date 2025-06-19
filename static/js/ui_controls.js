console.log('ui_controls.js loaded');

export class UIControls {
    constructor(appInstance) {
        this.app = appInstance; // To access coneManager, gridTool, measureTool, importExportTool etc.

        // General Controls
        this.undoBtn = document.getElementById('undo-btn');
        this.redoBtn = document.getElementById('redo-btn'); // Added Redo button
        this.clearBtn = document.getElementById('clear-btn');
        this.cursorModeCheckbox = document.getElementById('cursor-mode-checkbox');
        this.selectionModeCheckbox = document.getElementById('selection-mode-checkbox');
        this.boxSelectionCheckbox = document.getElementById('box-selection-checkbox');

        // Cone Related UI
        this.coneCountSpan = document.getElementById('cone-count');
        this.pathLengthSpan = document.getElementById('path-length');
        this.selectedConeToolsDiv = document.getElementById('selectedConeTools');
        this.coneRotationSlider = document.getElementById('coneRotationSlider');
        this.selectedConeRotationValueDisplay = document.getElementById('selectedConeRotationValueDisplay');
        this.contextMenu = this._createContextMenu();
        
        // Paste Preview UI - Will be created dynamically when needed
        this.pastePreviewControlsDiv = null;
        this.pasteRotationSlider = null;
        this.pasteRotationValueDisplay = null;
        this.confirmPasteBtn = null;
        this.cancelPasteBtn = null;
        
        // Create the floating paste controls
        this._createFloatingPasteControls();

        // Grid Related UI
        this.snapCheckbox = document.getElementById('snap-to-grid-checkbox');
        this.gridSizeInput = document.getElementById('gridSize');
        this.gridRotationInput = document.getElementById('gridRotation');
        this.gridRotationValueDisplay = document.getElementById('gridRotationValue');

        // Measurement Related UI
        this.measureBtn = document.getElementById('measure-btn');
        this.measurementResultsDiv = document.getElementById('measurement-results');
        this.measurementValueSpan = document.getElementById('measurement-value');

        // Import/Export UI
        this.exportJsonBtn = document.getElementById('export-json-btn');
        this.importJsonBtn = document.getElementById('import-json-btn');
        this.coneTypeRadios = document.querySelectorAll('input[name="coneType"]');

        // Bind event handlers
        this._handleUndo = this._handleUndo.bind(this);
        this._handleRedo = this._handleRedo.bind(this); // Added Redo handler binding
        this._handleClearAll = this._handleClearAll.bind(this);
        this._handleSnapToggle = this._handleSnapToggle.bind(this);
        this._handleGridSizeChange = this._handleGridSizeChange.bind(this);
        this._handleGridRotationChange = this._handleGridRotationChange.bind(this);
        this._handleMeasureToggle = this._handleMeasureToggle.bind(this);
        this._handleConeRotationSliderMouseDownTouchStart = this._handleConeRotationSliderMouseDownTouchStart.bind(this);
        this._handleConeRotationSliderInput = this._handleConeRotationSliderInput.bind(this);
        this._handleConeRotationSliderMouseUpTouchEnd = this._handleConeRotationSliderMouseUpTouchEnd.bind(this);
        this._handleExportJson = this._handleExportJson.bind(this);
        this._handleImportJson = this._handleImportJson.bind(this);
        this._handleConeTypeChange = this._handleConeTypeChange.bind(this);
        this._handleCursorModeToggle = this._handleCursorModeToggle.bind(this);
        this._handleSelectionModeToggle = this._handleSelectionModeToggle.bind(this);
        this._handleBoxSelectionToggle = this._handleBoxSelectionToggle.bind(this);
        this._handleConfirmPaste = this._handleConfirmPaste.bind(this);
        this._handleCancelPaste = this._handleCancelPaste.bind(this);
        this._handlePasteRotationChange = this._handlePasteRotationChange.bind(this);

        this._initEventListeners();
        console.log('UIControls initialized');
    }

    _createContextMenu() {
        const menu = document.createElement('div');
        menu.className = 'context-menu';
        menu.style.display = 'none';
        menu.style.position = 'absolute';
        menu.style.zIndex = '1000';
        menu.style.backgroundColor = 'white';
        menu.style.border = '1px solid #ccc';
        menu.style.borderRadius = '4px';
        menu.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';
        menu.style.padding = '5px 0';
        document.body.appendChild(menu);
        document.addEventListener('click', (e) => {
            if (!menu.contains(e.target)) this.hideContextMenu();
        });
        menu.addEventListener('contextmenu', (e) => e.stopPropagation());
        return menu;
    }

    hideContextMenu() {
        if (this.contextMenu) {
            this.contextMenu.style.display = 'none';
            this.contextMenu.innerHTML = '';
        }
    }
    
    _createFloatingPasteControls() {
        // Create a floating panel for paste controls
        const pasteControlsDiv = document.createElement('div');
        pasteControlsDiv.className = 'paste-controls';
        pasteControlsDiv.style.position = 'absolute';
        pasteControlsDiv.style.bottom = '20px';
        pasteControlsDiv.style.left = '50%';
        pasteControlsDiv.style.transform = 'translateX(-50%)';
        pasteControlsDiv.style.backgroundColor = 'white';
        pasteControlsDiv.style.padding = '10px 15px';
        pasteControlsDiv.style.borderRadius = '8px';
        pasteControlsDiv.style.boxShadow = '0 2px 10px rgba(0,0,0,0.3)';
        pasteControlsDiv.style.zIndex = '1000';
        pasteControlsDiv.style.display = 'none';
        
        // Create heading
        const heading = document.createElement('h4');
        heading.textContent = 'Paste Preview';
        heading.style.margin = '0 0 10px 0';
        heading.style.textAlign = 'center';
        pasteControlsDiv.appendChild(heading);
        
        // Create rotation controls
        const rotationContainer = document.createElement('div');
        rotationContainer.style.marginBottom = '10px';
        const rotationLabel = document.createElement('label');
        rotationLabel.textContent = 'Rotation: ';
        rotationContainer.appendChild(rotationLabel);
        
        const rotationValue = document.createElement('span');
        rotationValue.textContent = '0\u00b0'; // Degree symbol
        rotationContainer.appendChild(rotationValue);
        
        pasteControlsDiv.appendChild(rotationContainer);
        
        // Create rotation slider
        const rotationSlider = document.createElement('input');
        rotationSlider.type = 'range';
        rotationSlider.min = '0';
        rotationSlider.max = '359';
        rotationSlider.value = '0';
        rotationSlider.style.width = '100%';
        rotationSlider.style.marginBottom = '15px';
        pasteControlsDiv.appendChild(rotationSlider);
        
        // Create button container for alignment
        const buttonContainer = document.createElement('div');
        buttonContainer.style.display = 'flex';
        buttonContainer.style.justifyContent = 'space-between';
        
        // Create confirm button
        const confirmBtn = document.createElement('button');
        confirmBtn.textContent = 'Confirm';
        confirmBtn.style.backgroundColor = '#4CAF50';
        confirmBtn.style.color = 'white';
        confirmBtn.style.border = 'none';
        confirmBtn.style.padding = '8px 16px';
        confirmBtn.style.borderRadius = '4px';
        confirmBtn.style.cursor = 'pointer';
        confirmBtn.style.fontWeight = 'bold';
        buttonContainer.appendChild(confirmBtn);
        
        // Create cancel button
        const cancelBtn = document.createElement('button');
        cancelBtn.textContent = 'Cancel';
        cancelBtn.style.backgroundColor = '#f44336';
        cancelBtn.style.color = 'white';
        cancelBtn.style.border = 'none';
        cancelBtn.style.padding = '8px 16px';
        cancelBtn.style.borderRadius = '4px';
        cancelBtn.style.cursor = 'pointer';
        cancelBtn.style.marginLeft = '10px';
        buttonContainer.appendChild(cancelBtn);
        
        pasteControlsDiv.appendChild(buttonContainer);
        
        // Add to document body
        document.body.appendChild(pasteControlsDiv);
        
        // Store references
        this.pastePreviewControlsDiv = pasteControlsDiv;
        this.pasteRotationSlider = rotationSlider;
        this.pasteRotationValueDisplay = rotationValue;
        this.confirmPasteBtn = confirmBtn;
        this.cancelPasteBtn = cancelBtn;
    }

    _initEventListeners() {
        if (this.undoBtn) this.undoBtn.addEventListener('click', this._handleUndo);
        if (this.redoBtn) this.redoBtn.addEventListener('click', this._handleRedo); // Added Redo listener
        if (this.clearBtn) this.clearBtn.addEventListener('click', this._handleClearAll);
        if (this.snapCheckbox) this.snapCheckbox.addEventListener('change', this._handleSnapToggle);
        if (this.gridSizeInput) this.gridSizeInput.addEventListener('input', this._handleGridSizeChange);
        if (this.gridRotationInput) this.gridRotationInput.addEventListener('input', this._handleGridRotationChange);
        if (this.measureBtn) this.measureBtn.addEventListener('click', this._handleMeasureToggle);
        if (this.exportJsonBtn) this.exportJsonBtn.addEventListener('click', this._handleExportJson);
        if (this.importJsonBtn) this.importJsonBtn.addEventListener('click', this._handleImportJson);
        if (this.cursorModeCheckbox) this.cursorModeCheckbox.addEventListener('change', this._handleCursorModeToggle);
        if (this.selectionModeCheckbox) this.selectionModeCheckbox.addEventListener('change', this._handleSelectionModeToggle);
        if (this.boxSelectionCheckbox) this.boxSelectionCheckbox.addEventListener('change', this._handleBoxSelectionToggle);

        this.coneTypeRadios.forEach(radio => {
            radio.addEventListener('change', this._handleConeTypeChange);
        });

        if (this.coneRotationSlider) {
            this.coneRotationSlider.addEventListener('mousedown', this._handleConeRotationSliderMouseDownTouchStart);
            this.coneRotationSlider.addEventListener('touchstart', this._handleConeRotationSliderMouseDownTouchStart, { passive: false });
            this.coneRotationSlider.addEventListener('input', this._handleConeRotationSliderInput);
            this.coneRotationSlider.addEventListener('mouseup', this._handleConeRotationSliderMouseUpTouchEnd);
            this.coneRotationSlider.addEventListener('touchend', this._handleConeRotationSliderMouseUpTouchEnd);
        }
        
        // Paste preview controls are created dynamically, set up listeners here
        if (this.confirmPasteBtn) {
            this.confirmPasteBtn.addEventListener('click', this._handleConfirmPaste);
        }
        if (this.cancelPasteBtn) {
            this.cancelPasteBtn.addEventListener('click', this._handleCancelPaste);
        }
        if (this.pasteRotationSlider) {
            this.pasteRotationSlider.addEventListener('input', this._handlePasteRotationChange);
        }
        console.log('UIControls event listeners initialized.');
    }

    // --- Event Handlers ---
    _handleUndo() {
        if (this.app.undoRedoManager) {
            this.app.undoRedoManager.undo();
        } else {
            console.warn('UndoRedoManager not available.');
        }
    }

    _handleRedo() {
        if (this.app.undoRedoManager) {
            this.app.undoRedoManager.redo();
        } else {
            console.warn('UndoRedoManager not available.');
        }
    }

    _handleClearAll() {
        if (this.app.coneManager) this.app.coneManager.clearAllCones();
        // if (this.app.measureTool) this.app.measureTool.clearMeasurements(); // Future
        console.log('Clear All button clicked.');
    }

    _handleSnapToggle() {
        if (this.app.gridTool) {
            this.app.gridTool.drawGrid();
        } else {
            console.warn('GridTool not available. Snap toggle: ', this.snapCheckbox.checked);
        }
    }

    _handleGridSizeChange() {
        // const newSize = parseFloat(this.gridSizeInput.value); // GridTool reads this directly
        if (this.app.gridTool) {
            this.app.gridTool.drawGrid();
        } else {
            console.warn('GridTool not available. Grid size change.');
        }
    }

    _handleGridRotationChange() {
        const newRotation = parseFloat(this.gridRotationInput.value);
        this.updateGridRotationDisplay(newRotation);
        if (this.app.gridTool) {
            this.app.gridTool.drawGrid();
        } else {
            console.warn('GridTool not available. Grid rotation change: ', newRotation);
        }
    }

    _handleMeasureToggle() {
        if (this.app.measureTool && typeof this.app.measureTool.toggleMeasureMode === 'function') {
            this.app.measureTool.toggleMeasureMode();
        } else {
            console.warn('MeasureTool or toggleMeasureMode function not available. Measure toggle clicked.');
        }
    }

    _handleConeRotationSliderMouseDownTouchStart(event) {
        if (this.app.coneManager && this.app.coneManager.selectedCones.length > 1) {
            this.app.coneManager.startSelectedConesRotation();
        }
        // For touch events, prevent default to avoid page scroll when dragging slider
        if (event.type === 'touchstart') {
            event.preventDefault();
        }
    }

    _handleConeRotationSliderInput() {
        const angle = parseInt(this.coneRotationSlider.value);
        this.selectedConeRotationValueDisplay.textContent = angle;
        if (this.app.coneManager) {
            const selectedCones = this.app.coneManager.selectedCones;
            if (selectedCones.length === 1) {
                this.app.coneManager.setSelectedConeRotation(selectedCones[0], angle);
            } else if (selectedCones.length > 1) {
                this.app.coneManager.rotateSelectedConesByAngle(angle);
            }
        }
    }

    _handleConeRotationSliderMouseUpTouchEnd() {
        if (this.app.coneManager && this.app.coneManager.selectedCones.length > 1) {
            this.app.coneManager.finishSelectedConesRotation();
        }
    }

    _handleExportJson() {
        if (this.app.importExportTool && typeof this.app.importExportTool.exportCourseToJson === 'function') {
            this.app.importExportTool.exportCourseToJson();
        } else {
            console.warn('ImportExportTool or exportCourseToJson function not available. Export JSON clicked.');
        }
    }

    _handleImportJson() {
        if (this.app.importExportTool && typeof this.app.importExportTool.triggerImport === 'function') {
            this.app.importExportTool.triggerImport();
        } else {
            console.warn('ImportExportTool or triggerImport function not available. Import JSON clicked.');
        }
    }

    _handleConeTypeChange(event) {
        if (this.app.state) {
            this.app.state.selectedConeType = event.target.value;
        }
    }

    _handleCursorModeToggle() {
        if (this.app.state) this.app.state.isCursorMode = this.cursorModeCheckbox.checked;
        console.log('Cursor mode toggled:', this.cursorModeCheckbox.checked);
         if (this.cursorModeCheckbox.checked && this.selectionModeCheckbox.checked) {
            this.selectionModeCheckbox.checked = false;
            this._handleSelectionModeToggle(); // Update selection mode state
        }
    }

    _handleSelectionModeToggle() {
        const isSelectionMode = this.selectionModeCheckbox.checked;
        if (this.app.state) this.app.state.isSelectionMode = isSelectionMode;
        console.log('Selection mode toggled:', isSelectionMode);
        if (isSelectionMode) {
            if (this.cursorModeCheckbox.checked) {
                this.cursorModeCheckbox.checked = false;
                this._handleCursorModeToggle(); // Update cursor mode state
            }
            if (this.boxSelectionCheckbox.checked) {
                this.boxSelectionCheckbox.checked = false;
                this._handleBoxSelectionToggle(); // Update box selection mode state
            }
        }
    }
    
    _handleBoxSelectionToggle() {
        const isBoxSelectionMode = this.boxSelectionCheckbox.checked;
        if (this.app.state) this.app.state.isBoxSelectionMode = isBoxSelectionMode;
        console.log('Box selection mode toggled:', isBoxSelectionMode);
        
        if (isBoxSelectionMode) {
            // If box selection is turned on, deselect any currently selected cones
            if (this.app.coneManager) {
                this.app.coneManager.deselectAllCones();
            }
            
            // Turn off other modes that would conflict
            if (this.cursorModeCheckbox.checked) {
                this.cursorModeCheckbox.checked = false;
                this._handleCursorModeToggle(); // Update cursor mode state
            }
            if (this.selectionModeCheckbox.checked) {
                this.selectionModeCheckbox.checked = false;
                this._handleSelectionModeToggle(); // Update selection mode state
            }

            // Start the box selection mode
            if (this.app.coneManager) {
                this.app.coneManager.startBoxSelection();
            }
        } else {
            // Clean up box selection when toggled off
            if (this.app.coneManager) {
                this.app.coneManager.stopBoxSelection();
            }
        }
    }
    
    _handleConfirmPaste() {
        if (this.app.clipboardManager) {
            this.app.clipboardManager.confirmPaste();
            this.hidePasteControls();
            console.log('Paste confirmed');
        }
    }
    
    _handleCancelPaste() {
        if (this.app.clipboardManager) {
            this.app.clipboardManager.clearPastePreview();
            this.hidePasteControls();
            console.log('Paste canceled');
        }
    }
    
    _handlePasteRotationChange() {
        if (this.app.clipboardManager && this.pasteRotationSlider) {
            const angle = parseInt(this.pasteRotationSlider.value);
            this.app.clipboardManager.updatePastePreviewRotation(angle);
            this.updatePasteRotationDisplay(angle);
            console.log('UIControls: Update paste rotation display to:', angle);
        }
    }

    // --- UI Update Methods (to be called by other modules / uiBridge) ---
    updateConeCount(count) {
        if (this.coneCountSpan) this.coneCountSpan.textContent = count;
    }

    updatePathLength(lengthMeters) {
        if (this.pathLengthSpan) {
            const lengthFeet = (lengthMeters * 3.28084).toFixed(1);
            this.pathLengthSpan.textContent = `${lengthFeet} ft`;
        }
    }

    _addContextMenuOption(text, onClickAction) {
        const item = document.createElement('div');
        item.className = 'context-menu-item';
        item.textContent = text;
        item.onclick = () => {
            onClickAction();
            this.hideContextMenu();
        };
        this.contextMenu.appendChild(item);
    }

    showConeContextMenu(event, coneData, selectedCones) {
        if (!this.contextMenu || !this.app.coneManager) return;

        this.contextMenu.innerHTML = '';
        this.contextMenu.style.left = event.originalEvent.pageX + 'px';
        this.contextMenu.style.top = event.originalEvent.pageY + 'px';

        if (selectedCones.length > 1) {
            this._addContextMenuOption('Delete Selected Cones', () => this.app.coneManager.deleteSelectedCones());
            this._addContextMenuOption('Copy Selected Cones', () => this.app.coneManager.copySelectedCones());
            // Reset Rotation for multiple might be complex, TBD if needed as group action vs individual
        } else if (coneData) {
            this._addContextMenuOption('Delete Cone', () => this.app.coneManager.deleteCone(coneData));
            this._addContextMenuOption('Toggle Cone Type', () => this.app.coneManager.toggleConeType(coneData));
            this._addContextMenuOption('Reset Rotation', () => this.app.coneManager.resetConeRotation(coneData));
                        this._addContextMenuOption('Copy Cone', () => this.app.coneManager.copySelectedCones());
        }

        // Check ClipboardManager directly for paste availability
        if (this.app.clipboardManager && this.app.clipboardManager.hasContent()) {
            this._addContextMenuOption('Paste Cones', () => {
                // Pass the map click event's latlng for paste location
                if (event.latlng) { 
                    this.app.coneManager.startPastePreview(event.latlng);
                } else {
                    console.error('Cannot paste without a map location from the event.');
                }
            });
        }

        this.contextMenu.style.display = 'block';
    }

    updateSelectedConeTools(selectedCones) {
        if (!this.selectedConeToolsDiv || !this.coneRotationSlider || !this.selectedConeRotationValueDisplay) return;

        if (selectedCones && selectedCones.length > 0) {
            this.selectedConeToolsDiv.style.display = 'block';
            if (selectedCones.length === 1) {
                const angle = selectedCones[0].angle || 0;
                this.coneRotationSlider.value = angle;
                this.selectedConeRotationValueDisplay.textContent = angle;
            } else {
                // For multi-select, slider starts at 0 for relative rotation
                // The actual rotation is handled by rotateSelectedConesByAngle
                this.coneRotationSlider.value = 0; 
                this.selectedConeRotationValueDisplay.textContent = '0 (Group)';
            }
        } else {
            this.selectedConeToolsDiv.style.display = 'none';
        }
    }

    updateGridRotationDisplay(angle) {
        if (this.gridRotationValueDisplay) this.gridRotationValueDisplay.textContent = angle;
    }

    updateMeasurementUI(distanceMeters, isActive) {
        if (!this.measurementResultsDiv || !this.measurementValueSpan) return;
        if (isActive && distanceMeters !== null) {
            const distanceFeet = (distanceMeters * 3.28084).toFixed(1);
            this.measurementValueSpan.textContent = `${distanceFeet} ft`;
            this.measurementResultsDiv.style.display = 'block';
        } else {
            this.measurementResultsDiv.style.display = 'none';
            this.measurementValueSpan.textContent = '0';
        }
    }

    updateClipboardStatus(hasContent) {
        console.log('UIControls: Clipboard has content:', hasContent);
        // This can be used to enable/disable a dedicated paste button if one exists
        // Or to dynamically add/remove 'Paste' from context menu (already handled in showConeContextMenu)
    }

    showPasteControls(initialAngle) {
        console.log('UIControls: Show paste controls, initial angle:', initialAngle);
        if (this.pastePreviewControlsDiv) {
            this.pastePreviewControlsDiv.style.display = 'block';
            
            // Position it properly over the map
            const mapContainer = document.getElementById('map');
            if (mapContainer) {
                this.pastePreviewControlsDiv.style.position = 'absolute';
                this.pastePreviewControlsDiv.style.zIndex = '1001'; // Above other map elements
            }
        }
        if (this.pasteRotationSlider) {
            this.pasteRotationSlider.value = initialAngle;
        }
        if (this.pasteRotationValueDisplay) {
            this.pasteRotationValueDisplay.textContent = initialAngle + '°';
        }
    }

    hidePasteControls() {
        console.log('UIControls: Hide paste controls');
        if (this.pastePreviewControlsDiv) {
            this.pastePreviewControlsDiv.style.display = 'none';
        }
    }

    updatePasteRotationDisplay(angle) {
        console.log('UIControls: Update paste rotation display to:', angle);
        if (this.pasteRotationValueDisplay) {
            this.pasteRotationValueDisplay.textContent = angle + '\u00b0';
        }
    }

    // This method is called by ConeManager via uiBridge when multi-cone rotation starts/updates
    updateMultiConeRotationUI(isRotating, currentAngle) {
        if (!this.selectedConeToolsDiv || !this.coneRotationSlider || !this.selectedConeRotationValueDisplay) return;
        
        const selectedCones = this.app.coneManager ? this.app.coneManager.selectedCones : [];

        if (isRotating && selectedCones.length > 1) {
            this.selectedConeToolsDiv.style.display = 'block';
            this.coneRotationSlider.value = currentAngle;
            this.selectedConeRotationValueDisplay.textContent = `${currentAngle}° (Group)`;
        } else if (!isRotating) {
            // After rotation finishes, revert to showing individual cone's angle or hide if no selection
            this.updateSelectedConeTools(selectedCones);
        }
    }

    updatePastePreviewStatus(isPreviewing, angle = 0) {
        console.log(`UIControls: Paste preview status: ${isPreviewing}, Angle: ${angle}`);
        // Future: Update UI elements related to paste preview, e.g., rotation display or cursor.
        // For example, if a specific paste preview UI element exists:
        // const pastePreviewInfo = document.getElementById('paste-preview-info');
        // if (pastePreviewInfo) {
        //     pastePreviewInfo.textContent = isPreviewing ? `Pasting at ${angle}°` : 'Not pasting';
        //     pastePreviewInfo.style.display = isPreviewing ? 'block' : 'none';
        // }
    }

    updateUndoRedoButtons(canUndo, canRedo) {
        if (this.undoBtn) {
            this.undoBtn.disabled = !canUndo;
        }
        if (this.redoBtn) {
            this.redoBtn.disabled = !canRedo;
        }
    }
}
