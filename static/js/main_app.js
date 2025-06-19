// main_app.js: Main application orchestrator. Initializes modules.

import { initializeMap } from './map_setup.js';
import * as Icons from './icons.js';
import { ConeManager } from './cone_manager.js';
import { UIControls } from './ui_controls.js';
import { GridTool } from './grid_tool.js';
import { MeasureTool } from './measure_tool.js';
import { ImportExportTool } from './import_export.js';
import { ClipboardManager } from './clipboard.js';
import { UndoRedoManager } from './undo_redo.js';

document.addEventListener('DOMContentLoaded', function () {
    console.log('DOMContentLoaded event fired in main_app.js');
    const map = initializeMap();

    // State object that will be shared across modules
    const appState = {
        isCursorMode: false,
        isSelectionMode: false,
        isMeasuringMode: false,
        selectedConeType: 'regular_cone',
    };

    // Create a temporary app instance for initialization
    // This will be replaced by the final appInstance once all modules are ready
    let tempAppInstance = { map: map, icons: Icons, state: appState };

    // Initialize all modules first
    const uiControls = new UIControls(tempAppInstance);
    const gridTool = new GridTool(map, uiControls, appState);
    const measureTool = new MeasureTool(map, Icons, uiControls, appState);
    const importExportTool = new ImportExportTool(tempAppInstance);
    const clipboardManager = new ClipboardManager(tempAppInstance);
    const undoRedoManager = new UndoRedoManager(tempAppInstance);
    // ConeManager is special since it depends on other tools being in the app instance
    const coneManager = new ConeManager(tempAppInstance, uiControls, gridTool);

    // Now create the final, complete app instance
    const appInstance = {
        map: map,
        icons: Icons,
        state: appState,
        coneManager: coneManager,
        uiControls: uiControls,
        gridTool: gridTool,
        measureTool: measureTool,
        importExportTool: importExportTool,
        clipboardManager: clipboardManager,
        undoRedoManager: undoRedoManager,
    };

    // Re-assign the complete appInstance to modules that need it
    uiControls.app = appInstance;
    importExportTool.app = appInstance;
    clipboardManager.app = appInstance;
    undoRedoManager.app = appInstance;
    coneManager.app = appInstance;

    // Expose the appInstance globally for debugging and potential inter-module access (to be refined)
    window.courseEditor = appInstance;
    console.log('Course editor appInstance initialized:', window.courseEditor);

    // Call the old main.js logic if needed, passing necessary parts of appInstance
    // This will be phased out as functionality moves to modules.
    if (typeof initializeOldMainLogic === 'function') {
        // Pass only what's absolutely necessary for the remaining old logic.
        // coneManager and uiControls are now part of appInstance.
        initializeOldMainLogic(map, Icons, coneManager, uiControls); 
    } else {
        console.log('initializeOldMainLogic not found, assuming all logic is modularized.');
    }
});
