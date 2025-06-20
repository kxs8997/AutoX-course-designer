// map_setup.js: Handles Leaflet map initialization and venue selection.

// Define venue locations
export const venues = {
    'flr': { lat: 42.711941, lng:  -76.879949, name: 'FLR region' },
    'wny': { lat: 42.77769, lng: -78.78499, name: 'WNY region' }
};

export function initializeMap() {
    // Start with FLR venue as default
    const defaultVenue = venues.flr;
    const map = L.map('map').setView([defaultVenue.lat, defaultVenue.lng], 19);

    // Add Google Satellite Layer
    L.tileLayer('https://{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}',{
        maxZoom: 22,
        subdomains:['mt0','mt1','mt2','mt3'],
        attribution: 'Map data &copy; Google'
    }).addTo(map);
    
    // Setup venue button handlers
    setupVenueButtons(map);

    console.log('Map initialized in map_setup.js with FLR location');
    return map;
}

// Set up venue button handlers
function setupVenueButtons(map) {
    // Use a timeout to ensure all elements are ready
    setTimeout(() => {
        const flrBtn = document.getElementById('flr-btn');
        const wnyBtn = document.getElementById('wny-btn');
        
        console.log('Setting up venue buttons, found elements:', 
                    { flrBtn: !!flrBtn, wnyBtn: !!wnyBtn });
        
        // Function to change the map view to specific coordinates
        function changeMapView(lat, lng, venueName) {
            try {
                console.log(`Changing map view to ${venueName}: ${lat}, ${lng}`);
                map.setView([lat, lng], 18);
                console.log(`Map view set to ${venueName}`);
            } catch (error) {
                console.error(`Error setting map view to ${venueName}:`, error);
                alert(`Error setting venue: ${error.message}`);
            }
        }
        
        // Setup FLR button
        if (flrBtn) {
            flrBtn.addEventListener('click', () => {
                console.log('FLR button clicked');
                const flrLat = venues.flr.lat;
                const flrLng = venues.flr.lng;
                changeMapView(flrLat, flrLng, venues.flr.name);
            });
            console.log('FLR button event listener attached');
        } else {
            console.error('Could not find flr-btn element');
        }
        
        // Setup WNY button
        if (wnyBtn) {
            wnyBtn.addEventListener('click', () => {
                console.log('WNY button clicked');
                const wnyLat = venues.wny.lat;
                const wnyLng = venues.wny.lng;
                changeMapView(wnyLat, wnyLng, venues.wny.name);
            });
            console.log('WNY button event listener attached');
        } else {
            console.error('Could not find wny-btn element');
        }
    }, 500); // Small delay to ensure DOM is fully ready
}
