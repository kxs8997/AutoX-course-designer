// static/js/import_export.js: Handles JSON import and export of course data.
console.log('import_export.js loaded');

export class ImportExportTool {
    constructor(appInstance) {
        this.app = appInstance; // Provides access to map, coneManager, uiControls, gridTool, etc.
        console.log('ImportExportTool initialized');
    }

    exportCourseToJson() {
        // Logic from main.js for exportJsonBtn.addEventListener will go here
        console.log('Exporting course to JSON...');
        const { map, coneManager, uiControls } = this.app;

        if (!coneManager || !uiControls) {
            console.error('ConeManager or UIControls not available for export.');
            alert('Error: Required components not ready for export.');
            return;
        }

        const pathLengthText = uiControls.pathLengthSpan ? uiControls.pathLengthSpan.textContent : '0 ft';
        const pathLengthFeet = parseFloat(pathLengthText.replace(' ft', '')) || 0;
        const pathLengthMeters = pathLengthFeet / 3.28084;

        const courseData = {
            cones: coneManager.cones.map(cone => ({
                latlng: cone.marker.getLatLng(),
                type: cone.data.type,
                angle: cone.data.angle || 0
            })),
            mapCenter: map.getCenter(),
            mapZoom: map.getZoom(),
            gridSettings: {
                enabled: uiControls.snapCheckbox.checked,
                size: parseFloat(uiControls.gridSizeInput.value),
                rotation: parseFloat(uiControls.gridRotationInput.value)
            },
            timestamp: new Date().toISOString(),
            stats: {
                coneCount: coneManager.cones.length,
                pathLength: pathLengthMeters
            }
        };
        
        const jsonData = JSON.stringify(courseData, null, 2);
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
        console.log('Course exported successfully.');
    }

    triggerImport() {
        // Logic from main.js for importJsonBtn.addEventListener (part 1: creating input)
        console.log('Triggering JSON import...');
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = '.json';
        fileInput.style.display = 'none';
        document.body.appendChild(fileInput);
        
        fileInput.addEventListener('change', (event) => this._handleFileImport(event, fileInput));
        
        fileInput.click();
    }

    _handleFileImport(event, fileInput) {
        // Logic from main.js for importJsonBtn.addEventListener (part 2: file reading and processing)
        const file = event.target.files[0];
        if (!file) {
            if (fileInput) document.body.removeChild(fileInput);
            return;
        }
        
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const courseData = JSON.parse(e.target.result);
                const { map, coneManager, uiControls, gridTool, icons } = this.app;

                if (!map || !coneManager || !uiControls || !gridTool || !icons) {
                    console.error('Required application components not available for import.');
                    alert('Error: Application components not ready for import.');
                    return;
                }

                coneManager.clearAllCones();
                
                if (courseData.mapCenter) {
                    map.setView([courseData.mapCenter.lat, courseData.mapCenter.lng], courseData.mapZoom || 18);
                }
                
                if (courseData.gridSettings) {
                    uiControls.snapCheckbox.checked = courseData.gridSettings.enabled;
                    uiControls.gridSizeInput.value = courseData.gridSettings.size;
                    uiControls.gridRotationInput.value = courseData.gridSettings.rotation;
                    if (uiControls.gridRotationValueDisplay) {
                        uiControls.gridRotationValueDisplay.textContent = courseData.gridSettings.rotation;
                    }
                    gridTool.drawGrid();
                }
                
                if (courseData.cones && Array.isArray(courseData.cones)) {
                    courseData.cones.forEach(coneDataImport => {
                        const latlng = L.latLng(coneDataImport.latlng.lat, coneDataImport.latlng.lng);
                        const coneType = coneDataImport.type || 'regular_cone';
                        const angle = coneDataImport.angle || 0;
                        
                        // Use ConeManager to add cones to ensure all logic (marker creation, events, etc.) is centralized
                        coneManager.addCone(latlng, coneType, angle, false); // false for not adding to undo stack during import
                    });
                }
                
                alert('Course imported successfully!');
            } catch (error) {
                console.error('Failed to import course:', error);
                alert('Error importing course data. Please check the file format.');
            }
            
            if (fileInput) document.body.removeChild(fileInput);
        };
        
        reader.onerror = () => {
            alert('Error reading the file.');
            if (fileInput) document.body.removeChild(fileInput);
        };
        
        reader.readAsText(file);
    }
}

