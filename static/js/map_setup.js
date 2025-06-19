// map_setup.js: Handles Leaflet map initialization and venue search.

export function initializeMap() {
    const map = L.map('map').setView([42.71146335390179, -76.87963989760163], 19);

    // Add Google Satellite Layer
    L.tileLayer('https://{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}',{
        maxZoom: 20,
        subdomains:['mt0','mt1','mt2','mt3'],
        attribution: 'Map data &copy; Google'
    }).addTo(map);

    console.log('Map initialized in map_setup.js');
    return map;
}
