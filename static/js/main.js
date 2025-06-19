console.log('main.js script loaded, awaiting initialization call.');

// This function will be called by main_app.js during the transition
function initializeOldMainLogic(map, icons, coneManager, uiControls) {
    console.log('initializeOldMainLogic called with map and icons');
    // Ensure map and icons are available in this scope
    // The 'map' and 'icons' variables are now passed as parameters.
    // Replace direct use of 'coneIcon', 'laidDownConeIcon', etc. with 'icons.coneIcon', 'icons.laidDownConeIcon', etc.
    // The 'map' variable is already correctly named.
    console.log('DOMContentLoaded event fired');
    // Map will be initialized in map_setup.js and imported
    // let map; // We'll get this from map_setup.js later
    // console.log('Map initialization moved to map_setup.js'); // map object is now passed in

    // --- State ---
    let courseElements = []; // To track elements for undo (each cone is 1 element)

    // Icon definitions moved to icons.js and are passed in via the 'icons' parameter.
    // Example: icons.coneIcon, icons.laidDownConeIcon, etc.

    // Context menu is now managed by UIControls.js

    // --- DOM Elements (Many are now managed by UIControls.js) ---
    // Retain elements needed for logic still in main.js (e.g., grid, measure, import/export, venue search)
    const searchBtn = document.getElementById('venue-search-btn'); // For map_setup or future search module
    const searchInput = document.getElementById('venue-search'); // For map_setup or future search module
    
    // Grid related DOM elements are now managed by UIControls and GridTool.

    // Measure related DOM elements are now managed by UIControls and MeasureTool.

    // Import/Export related DOM elements and their event listeners are now managed by UIControls and ImportExportTool.

    // UIControls now handles: undoBtn, clearBtn, coneCountSpan, pathLengthSpan, 
    // cursorModeCheckbox, selectionModeCheckbox, selectedConeToolsDiv, coneRotationSlider, selectedConeRotationValueDisplay.

    // --- Helper Functions (Most cone-related helpers are now in ConeManager or UIControls) ---
    // clearAllCones is now handled by coneManager.clearAllCones() via UIControls.
    
    // Remnants of addConesToMap are removed as this is now handled by ConeManager.

    // Minimum zoom level at which to show the grid (to prevent performance issues when zoomed out)
    const MIN_GRID_ZOOM_LEVEL = 17; // Adjust this value as needed based on testing
    
    // Grid functions (shouldShowGrid, drawGrid, getSnappedLatLng) have been moved to GridTool.js

    map.on('click', function(e) {
        // Measurement logic is now handled by MeasureTool.
        
        // If cursor mode is active (not placing cones), do nothing further on map click.
        // Deselection of cones is handled by ConeManager itself when a click occurs not on a cone.
        if (uiControls.app.state.isCursorMode) { 
            // console.log('Map click in cursor mode - no cone placement by main.js.');
            return;
        }

        // Cone placement logic has been moved to ConeManager and is triggered by its own map click handler
        // when not in cursor mode or selection mode. So, no cone placement code here anymore.
        // console.log('Map clicked in main.js, but cone placement is now handled by ConeManager.');
    });
    console.log('Map click event listener attached.');

    // Obsolete functions (handleMapClickDeselection, copyCones, calculateDistanceInMeters, showContextMenu, 
    // deleteCone, deleteSelectedCones, toggleConeType, resetConeRotation) have been removed or their 
    // functionality is now in ConeManager and/or UIControls.

    // Undo, Clear, Cone Rotation Slider, and related multi-cone rotation logic and event listeners 
    // are now handled by ConeManager and UIControls.

    // Event listeners for grid are now handled by UIControls.js and GridTool.js

    // Measurement functions (clearMeasurements, toggleMeasureMode) and event listener for measureBtn
    // have been moved to MeasureTool.js and UIControls.js.

    // Export and Import course data logic and event listeners have been moved to ImportExportTool.js and UIControls.js.
    // Paste UI creation code removed.

    // Paste preview utility functions (rotatePointAroundOrigin, relativePositionToLatLng) removed.
    // Core paste functions (startPastePreview, updatePastePreviewMarkers, clearPastePreviewMarkers, clearPastePreview, confirmPaste) removed.
    // This functionality will be handled by ConeManager or deprecated.
    // Paste-related event listeners (rotation controls, keyboard shortcuts, context menu paste) removed.

    // Mousemove listener for tempMeasureLine has been removed as it's part of MeasureTool now.

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
} // Closing brace for initializeOldMainLogic

window.initializeOldMainLogic = initializeOldMainLogic;
