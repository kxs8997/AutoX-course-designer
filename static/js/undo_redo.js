// static/js/undo_redo.js
console.log('undo_redo.js loaded');

export class UndoRedoManager {
    constructor(appInstance) {
        this.app = appInstance;
        this.undoStack = [];
        this.redoStack = [];
        this.maxStackSize = 50; // Limit stack size to prevent memory issues

        console.log('UndoRedoManager initialized');
    }

    addAction(action) {
        if (this.undoStack.length >= this.maxStackSize) {
            this.undoStack.shift(); // Remove the oldest action if stack is full
        }
        this.undoStack.push(action);
        this.redoStack = []; // Clear redo stack whenever a new action is performed
        this._updateUIButtons();
        // console.log('Action added:', action, 'Undo stack size:', this.undoStack.length);
    }

    undo() {
        if (this.undoStack.length === 0) {
            // console.log('Undo stack empty.');
            return;
        }

        const action = this.undoStack.pop();
        // console.log('Undoing action:', action);

        // Perform the reverse of the action
        this._performAction(action, true); // true for undo

        this.redoStack.push(action);
        this._updateUIButtons();
    }

    redo() {
        if (this.redoStack.length === 0) {
            // console.log('Redo stack empty.');
            return;
        }

        const action = this.redoStack.pop();
        // console.log('Redoing action:', action);

        // Perform the action (forward)
        this._performAction(action, false); // false for redo (or forward)

        this.undoStack.push(action);
        this._updateUIButtons();
    }

    _performAction(action, isUndo) {
        const coneManager = this.app.coneManager;
        if (!coneManager) {
            console.error('ConeManager not available in UndoRedoManager.');
            return;
        }

        switch (action.type) {
            case 'add_cone':
                if (isUndo) {
                    // To undo 'add_cone', we need to delete the cone that was added.
                    // The action should store enough info to identify/remove it, e.g., the cone object itself or its ID.
                    // Assuming action.coneData contains the actual cone object added.
                    if (action.coneData && action.coneData.marker) {
                        coneManager.deleteConeData(action.coneData, true); // true to skip adding to undo stack
                    }
                } else {
                    // To redo 'add_cone', we re-add the cone.
                    // Assuming action.coneData contains { latlng, type, angle }
                    coneManager.addCone(action.coneData.latlng, action.coneData.type, action.coneData.angle, true, action.coneData); // true for isImport/isRedo, pass original coneData
                }
                break;
            case 'delete_cone':
                // action.coneData should be the cone that was deleted { latlng, type, angle, originalRef (optional) }
                if (isUndo) {
                    // To undo 'delete_cone', we re-add the cone.
                    coneManager.addCone(action.coneData.latlng, action.coneData.type, action.coneData.angle, true, action.coneData.originalRef || action.coneData); // true for isImport/isRedo
                } else {
                    // To redo 'delete_cone', we delete it again.
                    // Need a way to find the cone if it was re-added. Using originalRef if available.
                    const coneToRedelete = action.coneData.originalRef || coneManager.findConeByProperties(action.coneData);
                    if (coneToRedelete) {
                        coneManager.deleteConeData(coneToRedelete, true);
                    }
                }
                break;
            case 'delete_multiple_cones':
                // action.conesData should be an array of cone data objects
                if (isUndo) {
                    action.conesData.forEach(coneData => {
                        coneManager.addCone(coneData.latlng, coneData.type, coneData.angle, true, coneData.originalRef || coneData);
                    });
                } else {
                    action.conesData.forEach(coneData => {
                        const coneToRedelete = coneData.originalRef || coneManager.findConeByProperties(coneData);
                        if (coneToRedelete) {
                           coneManager.deleteConeData(coneToRedelete, true);
                        }
                    });
                }
                break;
            case 'move_cone':
                // action.coneRef, action.oldLatLng, action.newLatLng
                const targetConeMove = action.coneRef;
                if (targetConeMove && targetConeMove.marker) {
                    const latLngToSet = isUndo ? action.oldLatLng : action.newLatLng;
                    targetConeMove.marker.setLatLng(latLngToSet);
                    targetConeMove.latlng = L.latLng(latLngToSet.lat, latLngToSet.lng);
                    coneManager.redrawPath();
                    coneManager.calculatePathLength();
                }
                break;
            case 'move_multiple_cones':
                // action.conesMovementData: [{ coneRef, oldLatLng, newLatLng }]
                action.conesMovementData.forEach(moveData => {
                    const targetCone = moveData.coneRef;
                    if (targetCone && targetCone.marker) {
                        const latLngToSet = isUndo ? moveData.oldLatLng : moveData.newLatLng;
                        targetCone.marker.setLatLng(latLngToSet);
                        targetCone.latlng = L.latLng(latLngToSet.lat, latLngToSet.lng);
                    }
                });
                coneManager.redrawPath();
                coneManager.calculatePathLength();
                break;
            case 'rotate_cone': // Single cone rotation
                // action.coneRef, action.oldAngle, action.newAngle
                const targetConeRotate = action.coneRef;
                if (targetConeRotate && targetConeRotate.marker) {
                    const angleToSet = isUndo ? action.oldAngle : action.newAngle;
                    targetConeRotate.marker.setRotationAngle(angleToSet);
                    targetConeRotate.angle = angleToSet;
                }
                break;
            case 'rotate_multiple_cones': // Group rotation
                // action.conesRotationData: [{ coneRef, oldAngle, newAngle, oldLatLng, newLatLng }]
                // This handles both position and angle changes from group rotation
                action.conesRotationData.forEach(rotData => {
                    const targetCone = rotData.coneRef;
                    if (targetCone && targetCone.marker) {
                        const angleToSet = isUndo ? rotData.oldAngle : rotData.newAngle;
                        const latLngToSet = isUndo ? rotData.oldLatLng : rotData.newLatLng;
                        targetCone.marker.setRotationAngle(angleToSet);
                        targetCone.angle = angleToSet;
                        targetCone.marker.setLatLng(latLngToSet);
                        targetCone.latlng = L.latLng(latLngToSet.lat, latLngToSet.lng);
                    }
                });
                coneManager.redrawPath();
                coneManager.calculatePathLength();
                break;
            case 'toggle_cone_type':
                // action.coneRef, action.oldType, action.newType
                const targetConeToggle = action.coneRef;
                if (targetConeToggle && targetConeToggle.marker) {
                    const typeToSet = isUndo ? action.oldType : action.newType;
                    const iconToSet = typeToSet === 'laid_down_cone' ? this.app.icons.laidDownConeIcon : this.app.icons.coneIcon;
                    targetConeToggle.type = typeToSet;
                    targetConeToggle.marker.setIcon(iconToSet);
                }
                break;
            // Add more action types as needed (e.g., clear_all_cones)
            case 'clear_all_cones':
                // action.oldConesData: array of all cone data that were cleared
                if (isUndo) {
                    action.oldConesData.forEach(coneData => {
                        coneManager.addCone(coneData.latlng, coneData.type, coneData.angle, true, coneData.originalRef || coneData);
                    });
                }
                else { // Redo clear all
                    coneManager.clearAllCones(true); // true to skip adding to undo stack
                }
                break;
            default:
                console.warn('Unknown action type for undo/redo:', action.type);
        }
        // After performing action, ensure UI reflects the state (e.g. selection tools)
        if (this.app.uiControls) {
            this.app.uiControls.updateSelectedConeTools(coneManager.selectedCones);
        }
    }

    _updateUIButtons() {
        if (this.app.uiControls) {
            this.app.uiControls.updateUndoRedoButtons(this.undoStack.length > 0, this.redoStack.length > 0);
        }
    }

    clearStacks() {
        this.undoStack = [];
        this.redoStack = [];
        this._updateUIButtons();
    }
}

