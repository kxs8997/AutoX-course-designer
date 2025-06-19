// icons.js: Defines and exports Leaflet icon objects.

export const coneIcon = L.icon({
    iconUrl: '/static/images/circle_cone.svg',
    iconSize: [25, 25],
    iconAnchor: [12.5, 12.5]
});

export const laidDownConeIcon = L.icon({
    iconUrl: '/static/images/laid_down_cone.svg',
    iconSize: [25, 25],
    iconAnchor: [12.5, 12.5]
});

export const pointerConeIcon = L.icon({
    iconUrl: '/static/images/pointer_cone.svg',
    iconSize: [25, 25],
    iconAnchor: [12.5, 12.5]
});

export const measurementPointIcon = L.divIcon({
    className: 'measurement-point',
    html: '<div style="background-color: #0078FF; border: 2px solid white; border-radius: 50%; width: 10px; height: 10px;"></div>',
    iconSize: [10, 10],
    iconAnchor: [5, 5]
});
