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
            case 'delete': // Single cone deletion
            case 'delete_cone': // For compatibility with both naming conventions
                console.log(`Processing ${action.type} action:`, action);
                
                // The action could have either coneData (old format) or cones array (new format)
                if (action.coneData) {
                    // Old format: Single cone in coneData property
                    if (isUndo) {
                        console.log(`Undoing ${action.type} action for cone:`, action.coneData);
                        
                        // Extra safety checks for required properties
                        if (!action.coneData.latlng || !action.coneData.type) {
                            console.error('Missing required cone properties for undo', action.coneData);
                            break;
                        }
                        
                        const angle = action.coneData.angle || 0; // Default to 0 if angle is missing
                        coneManager.addCone(action.coneData.latlng, action.coneData.type, angle, true, action.coneData.originalRef || action.coneData); // true for isImport/isRedo
                    } else {
                        // To redo 'delete' or 'delete_cone', we delete it again.
                        const coneToRedelete = action.coneData.originalRef || coneManager.findConeByProperties(action.coneData);
                        if (coneToRedelete) {
                            console.log(`Redoing ${action.type} action for cone:`, coneToRedelete);
                            coneManager.deleteConeData(coneToRedelete, true);
                        } else {
                            console.warn(`Could not find cone to re-delete`, action.coneData);
                        }
                    }
                } 
                else if (action.cones && action.cones.length > 0) {
                    // New format: Array of cones in cones property
                    console.log(`Processing ${action.type} with ${action.cones.length} cones`);
                    
                    if (isUndo) {
                        // Recreate all the deleted cones
                        action.cones.forEach(cone => {
                            console.log('Restoring deleted cone:', cone);
                            if (cone.latlng && cone.type) {
                                const angle = cone.angle || 0;
                                coneManager.addCone(cone.latlng, cone.type, angle, true, cone);
                            } else {
                                console.error('Cone missing required properties:', cone);
                            }
                        });
                    } else {
                        // Re-delete all the cones
                        action.cones.forEach(cone => {
                            const coneToRedelete = coneManager.findConeByProperties(cone);
                            if (coneToRedelete) {
                                coneManager.deleteConeData(coneToRedelete, true);
                            } else {
                                console.warn('Could not find cone to re-delete', cone);
                            }
                        });
                    }
                } 
                else {
                    console.error(`Invalid ${action.type} action format - missing both coneData and cones`, action);
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
                console.log(`Processing clear_all_cones action:`, action);
                
                if (isUndo) {
                    // Check both property names for compatibility (conesData and oldConesData)
                    const conesArray = action.oldConesData || action.conesData;
                    
                    if (!conesArray || !Array.isArray(conesArray)) {
                        console.error('Missing or invalid cones data for clear_all_cones action', action);
                        break;
                    }
                    
                    console.log(`Restoring ${conesArray.length} cones from clear all`);
                    conesArray.forEach(coneData => {
                        if (coneData && coneData.latlng && coneData.type) {
                            const angle = coneData.angle || 0;
                            coneManager.addCone(coneData.latlng, coneData.type, angle, true, coneData.originalRef || coneData);
                        } else {
                            console.error('Invalid cone data in cones array', coneData);
                        }
                    });
                }
                else { // Redo clear all
                    console.log('Redoing clear all');
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

