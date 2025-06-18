# AutoX Course Designer

A web-based tool for designing autocross courses with precise cone placement, measurement tools, and course visualization.

## Features

### Cone Placement
- **Multiple Cone Types**: Place regular cones, laid down cones, or pointer cones on the map
- **Cursor Mode**: Toggle cursor mode to prevent accidental cone placement when navigating the map
- **Snap-to-Grid**: Enable grid snapping for precise cone placement
  - Adjustable grid size (in feet)
  - Adjustable grid rotation for diagonal alignments
- **Selection Mode**: Shift+Click to select multiple cones for group operations

### Cone Manipulation
- **Cone Rotation**: Rotate individual cones or groups of selected cones
  - Use the rotation slider in the sidebar
  - Multi-selected cones rotate around the first cone in the selection
- **Type Toggling**: Right-click a cone to change its type (e.g., from regular to laid down)
- **Copy & Paste**: 
  - Copy selected cones and paste them elsewhere on the course
  - Preview paste position with adjustable rotation before confirming
- **Delete**: Remove individual cones or multiple selected cones at once

### Context Menu
Right-click on cones or the map for quick actions:
- **Individual Cone Actions**:
  - Delete Cone
  - Toggle Cone Type
  - Reset Rotation
  - Copy Selected Cone
- **Multi-Select Actions**:
  - Copy Selected Cones
  - Delete Selected Cones
- **Paste Actions**:
  - Paste Here (when clipboard has cones)
  - Includes rotation preview and confirmation

### Measurement Tools
- **Distance Measurement**: Measure the distance between any two points on the course
- **Path Length**: Automatically calculated total course path length
- **Cone Count**: Track the total number of cones used in the course

### Import/Export
- **Export to JSON**: Save your course design to a JSON file
- **Import from JSON**: Load a previously saved course design

### Venue Setup
- **Venue Search**: Quickly find and navigate to common autocross venues
- **Map Navigation**: Pan and zoom the map to position your course precisely

## Cone Types

### Regular Cone
Standard upright cone used for most course elements.

### Laid Down Cone
A cone placed on its side, typically used to indicate direction or slaloms.

### Pointer Cone
A specialized cone with a directional pointer, useful for indicating course flow or direction changes.

## Getting Started

1. Open the application in your web browser
2. Use the venue search to find your desired location
3. Select a cone type from the sidebar
4. Ensure cursor mode is unchecked when you want to place cones
5. Click on the map to place cones
6. Use the various tools in the sidebar to refine your course

## Tips
- Enable cursor mode when navigating the map to prevent accidental cone placement
- Use grid snapping for precise, uniform layouts
- When pasting cones, use the rotation slider to adjust their orientation before confirming
- For multi-selection, hold Shift while clicking cones, then use the rotation tools or right-click for group operations

## Technical Information
- Built with Leaflet.js for mapping
- Uses Google Satellite imagery for base maps
- Implements the Leaflet RotatedMarker plugin for cone rotation
- Backend powered by Flask
