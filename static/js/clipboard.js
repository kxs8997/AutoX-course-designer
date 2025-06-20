// clipboard.js: Manages copy and paste functionality for cones.

export class ClipboardManager {
    constructor(appInstance) {
        this.app = appInstance; // To access coneManager, uiControls
        this.clipboardContent = null; // To store copied cone data
        this.pastePreviewActive = false;
        this.pastePreviewMarkers = [];
        this.pasteAngle = 0; // Angle for pasting rotated copied cones
    }

    /**
     * Copies the currently selected cones to the clipboard.
     * Stores their data (type, angle) and relative positions.
     */
    copySelectedCones() {
        if (!this.app.coneManager) {
            console.warn('No cone manager available.');
            return;
        }
        
        // Get all cones with selection markers
        const selectedCones = [];
        const allCones = this.app.coneManager.cones;
        
        // Find cones that have a selected state by looking for the marker class
        for (const cone of allCones) {
            if (cone.marker && cone.marker._icon && 
                cone.marker._icon.classList.contains('selected-cone')) {
                selectedCones.push(cone);
            }
        }
        
        console.log('Found visually selected cones:', selectedCones);
        
        if (selectedCones.length === 0) {
            console.warn('No selected cones found.');
            this.clipboardContent = null;
            if (this.app.uiControls) this.app.uiControls.updateClipboardStatus(false);
            return;
        }

        // For simplicity, just copy their absolute data
        this.clipboardContent = selectedCones.map(cone => {
            return {
                type: cone.type,
                angle: cone.angle || 0,
                latlng: cone.marker.getLatLng()
            };
        });

        console.log('Cones copied to clipboard:', this.clipboardContent);
        if (this.app.uiControls) this.app.uiControls.updateClipboardStatus(true);
    }

    /**
     * Initiates the paste operation.
     * If content is on the clipboard, it might enable a "paste mode" or directly paste.
     * For now, let's assume it will enable a preview mode.
     * @param {L.LatLng} pasteOriginLatLng - The LatLng where the paste operation is initiated (e.g., mouse click).
     */
    startPaste(pasteOriginLatLng) {
        if (!this.clipboardContent || this.clipboardContent.length === 0) {
            console.warn('Clipboard is empty. Nothing to paste.');
            return;
        }

        if (this.pastePreviewActive) {
            this.clearPastePreview(); // Clear previous preview if any
        }
        
        this.pastePreviewActive = true;
        this.pasteAngle = 0; // Reset paste angle

        // For a single cone, paste it directly at the origin.
        // For multiple cones, calculate an anchor (e.g., centroid or first cone's position)
        // and paste them relative to the pasteOriginLatLng.

        let anchorLatLng;
        if (this.clipboardContent.length > 0) {
            anchorLatLng = this.clipboardContent[0].latlng; // Use first copied cone as anchor
        } else {
            anchorLatLng = pasteOriginLatLng; // Should not happen if clipboardContent is checked
        }

        this.clipboardContent.forEach(copiedConeData => {
            const latOffset = copiedConeData.latlng.lat - anchorLatLng.lat;
            const lngOffset = copiedConeData.latlng.lng - anchorLatLng.lng;

            const targetLatLng = L.latLng(
                pasteOriginLatLng.lat + latOffset,
                pasteOriginLatLng.lng + lngOffset
            );

            // Create a temporary preview marker (non-interactive for now)
            let previewIcon;
            switch(copiedConeData.type) {
                case 'laid_down_cone':
                    previewIcon = this.app.icons.laidDownConeIcon;
                    break;
                case 'pointer_cone':
                    previewIcon = this.app.icons.pointerConeIcon;
                    break;
                default:
                    previewIcon = this.app.icons.coneIcon;
            }
            const previewMarker = L.marker(targetLatLng, {
                icon: previewIcon,
                draggable: false, // Preview markers are not draggable
                opacity: 0.7,
                interactive: false // Make them non-interactive
            }).addTo(this.app.map);
            // Store the original angle but don't apply rotation yet (rotation will be applied in updatePastePreviewRotation)
            previewMarker._originalAngle = copiedConeData.angle || 0;
            previewMarker.setRotationAngle(previewMarker._originalAngle);
            this.pastePreviewMarkers.push(previewMarker);
        });
        
        if (this.app.uiControls) {
            this.app.uiControls.showPasteControls(this.pasteAngle);
            this.app.uiControls.updatePastePreviewStatus(true, this.pasteAngle);
        }
        console.log('Paste preview started at:', pasteOriginLatLng);
    }

    /**
     * Updates the rotation of the paste preview markers as a group around the first element.
     * @param {number} angle - The new rotation angle in degrees.
     */
    updatePastePreviewRotation(angle) {
        if (!this.pastePreviewActive || this.pastePreviewMarkers.length === 0) return;
        this.pasteAngle = angle;
        
        console.log(`Updating rotation for ${this.pastePreviewMarkers.length} preview markers to angle: ${angle}`);

        // If no markers or only one marker, just rotate in place
        if (this.pastePreviewMarkers.length <= 1) {
            if (this.pastePreviewMarkers.length === 1) {
                const marker = this.pastePreviewMarkers[0];
                const baseAngle = marker._originalAngle || 0;
                const newAngle = baseAngle + this.pasteAngle;
                marker.options.rotationAngle = newAngle;
                marker.setRotationAngle(newAngle);
            }
            
            if (this.app.uiControls) {
                this.app.uiControls.updatePasteRotationDisplay(this.pasteAngle);
            }
            return;
        }

        // Get the center point (first marker position)
        const pivotPoint = this.pastePreviewMarkers[0].getLatLng();
        
        // First, rotate each marker's icon for orientation
        for (let i = 0; i < this.pastePreviewMarkers.length; i++) {
            const marker = this.pastePreviewMarkers[i];
            const baseAngle = marker._originalAngle || 0;
            const newAngle = baseAngle + this.pasteAngle;
            
            // Update individual cone orientation
            marker.options.rotationAngle = newAngle;
            marker.setRotationAngle(newAngle);
        }
        
        // Then, rotate each marker's position around the pivot point (except the first one)
        for (let i = 1; i < this.pastePreviewMarkers.length; i++) {
            const marker = this.pastePreviewMarkers[i];
            
            // Calculate the original position relative to the pivot point
            // We need to convert from LatLng to pixel coordinates for rotation math
            const markerOriginalLatLng = marker._originalLatLng || marker.getLatLng();
            
            // Store the original position if not already stored
            if (!marker._originalLatLng) {
                marker._originalLatLng = L.latLng(markerOriginalLatLng.lat, markerOriginalLatLng.lng);
            }
            
            // Calculate offset from pivot in meters
            const latOffsetOriginal = (markerOriginalLatLng.lat - pivotPoint.lat) * 111111; // approx meters per degree latitude
            const lngOffsetOriginal = (markerOriginalLatLng.lng - pivotPoint.lng) * 111111 * Math.cos(pivotPoint.lat * Math.PI / 180);
            
            // Rotate the offset using trig functions (in radians)
            const angleRad = this.pasteAngle * Math.PI / 180;
            const latOffsetRotated = latOffsetOriginal * Math.cos(angleRad) - lngOffsetOriginal * Math.sin(angleRad);
            const lngOffsetRotated = latOffsetOriginal * Math.sin(angleRad) + lngOffsetOriginal * Math.cos(angleRad);
            
            // Convert back to LatLng
            const newLat = pivotPoint.lat + latOffsetRotated / 111111;
            const newLng = pivotPoint.lng + lngOffsetRotated / (111111 * Math.cos(pivotPoint.lat * Math.PI / 180));
            
            // Set the new position
            marker.setLatLng([newLat, newLng]);
            
            console.log(`Marker ${i}: Rotated position from [${markerOriginalLatLng.lat}, ${markerOriginalLatLng.lng}] to [${newLat}, ${newLng}]`);
        }
        
        // Update UI after all rotations
        if (this.app.uiControls) {
            this.app.uiControls.updatePasteRotationDisplay(this.pasteAngle);
        }
    }


    /**
     * Finalizes the paste operation, creating actual cones from the preview.
     */
    confirmPaste() {
        if (!this.pastePreviewActive || this.pastePreviewMarkers.length === 0) {
            console.warn('No active paste preview to confirm.');
            return;
        }

        const pastedConesData = [];
        this.pastePreviewMarkers.forEach((previewMarker, index) => {
            const originalConeData = this.clipboardContent[index];
            const finalAngle = (originalConeData.angle || 0) + this.pasteAngle;
            
            pastedConesData.push({
                latlng: previewMarker.getLatLng(),
                type: originalConeData.type,
                angle: finalAngle
            });
        });

        // Add cones through ConeManager
        if (this.app.coneManager) {
            this.app.coneManager.addMultipleCones(pastedConesData);
        }

        this.clearPastePreview();
        console.log('Paste confirmed.');
    }

    /**
     * Clears the paste preview markers from the map and resets paste state.
     */
    clearPastePreview() {
        this.pastePreviewMarkers.forEach(marker => this.app.map.removeLayer(marker));
        this.pastePreviewMarkers = [];
        this.pastePreviewActive = false;
        this.pasteAngle = 0;
        if (this.app.uiControls) {
            this.app.uiControls.hidePasteControls();
            this.app.uiControls.updatePastePreviewStatus(false);
        }
        console.log('Paste preview cleared.');
    }

    /**
     * Checks if there is content on the clipboard.
     * @returns {boolean} True if clipboard has content, false otherwise.
     */
    hasContent() {
        return this.clipboardContent && this.clipboardContent.length > 0;
    }
}

