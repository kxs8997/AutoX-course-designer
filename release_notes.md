# AutoX Course Designer V1.0 - Release Notes

## Overview
AutoX Course Designer V1.0 is the first stable release of our web-based autocross course design tool. This application helps autocross event organizers and enthusiasts create, edit and share course layouts using an interactive map interface.

## Key Features

### Course Design Tools
- **Multiple Cone Types**: Place regular cones, laid down cones, and pointer cones
- **Cone Rotation**: Precisely rotate individual cones or groups of selected cones
- **Selection Tool**: Select multiple cones using box selection for group operations
- **Copy/Paste**: Copy and paste single cones or cone groups with rotation control
- **Undo/Redo**: Full support for undoing and redoing course design actions

### Interface Modes
- **Edit Mode**: Default mode for placing and manipulating cones
- **Cursor Mode**: Navigate and select without placing cones
- **Selection Tool**: Select multiple cones using a box selection

### Measurement & Grid Features
- **Measure Distance**: Calculate and display distances between points on the course
- **Path Length**: Automatic calculation of total course length
- **Grid System**: Optional snap-to-grid functionality with adjustable grid size and rotation
- **Cone Counter**: Automatic tracking of the total number of cones used

### Import/Export
- **JSON Export/Import**: Save and load course designs in JSON format for sharing and future editing

### Venue Management
- **Venue Selection**: Quickly switch between predefined venues (FLR and WNY regions)
- **Map Centering**: Automatic map centering on venue selection

### Navigation Controls
- **Spacebar Panning**: Hold spacebar + drag for consistent map panning in all modes
- **Contextual Cursor**: Cursor changes based on active mode for better UX

## User Experience Improvements
- **Modular Architecture**: Improved code organization for better maintainability
- **Default Cursor Mode**: Application starts in cursor mode for easier navigation
- **Simplified UI**: Streamlined interface with mode radio buttons for intuitive interaction
- **Context Menu**: Right-click context menu for common operations on cones

## Technical Details
- **Browser-Based**: Runs in any modern web browser
- **Leaflet Maps**: Built on the reliable Leaflet mapping library
- **Local Deployment**: Runs locally without requiring internet access after initial load

## Known Issues
- Some browsers may require additional permissions for copy/paste operations
- Performance may vary when working with very large course designs

## Future Development
- Further UI/UX improvements based on user feedback
- Additional venue presets
- Course validation tools
