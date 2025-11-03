// src/js/map.js - SIMPLIFIED WITH GOOGLE MAPS INTEGRATION
(function () {
    let map, userMarker, pgMarkers = [];
    const defaultCenter = { lat: 21.1458, lng: 79.0882 };
    let firestoreReady = false;
    let userLocation = null;
    let customStartLocation = null;

    // Wait for Firebase to be ready
    window.addEventListener('firebaseReady', function() {
        console.log('map.js: Firebase is ready');
        firestoreReady = true;
        
        if (map) {
            loadPGMarkers();
        }
    });

    window.initMap = function () {
        console.log('initMap called - initializing map...');
        
        if (!window.google || !window.google.maps) {
            console.error('Google Maps not loaded');
            return;
        }

        map = new google.maps.Map(document.getElementById('map'), {
            center: defaultCenter,
            zoom: 13,
            mapTypeControl: true,
            streetViewControl: true,
            fullscreenControl: true
        });

        console.log('✅ Map initialized');

        // Add custom controls
        addCustomControls();

        // Get user's current location
        getUserLocation();

        // Load PG markers if Firestore is ready
        if (firestoreReady && window.db) {
            loadPGMarkers();
        }

        // Check if we need to focus on a specific PG
        const params = new URLSearchParams(window.location.search);
        const focusId = params.get('focus') || localStorage.getItem('focusPG');
        if (focusId) {
            setTimeout(() => focusOnPG(focusId), 2000);
            localStorage.removeItem('focusPG');
        }
    };

    // Add custom controls to map
    function addCustomControls() {
        // Create custom control div
        const customControlDiv = document.createElement('div');
        customControlDiv.className = 'custom-map-controls';
        
        // Set start location button
        const setStartBtn = document.createElement('button');
        setStartBtn.className = 'custom-control-btn';
        setStartBtn.innerHTML = '📍 Set Start';
        setStartBtn.title = 'Click on map to set starting point';
        setStartBtn.onclick = enableStartLocationSelection;
        
        // Use my location button
        const myLocationBtn = document.createElement('button');
        myLocationBtn.className = 'custom-control-btn';
        myLocationBtn.innerHTML = '🎯 My Location';
        myLocationBtn.title = 'Use my current location';
        myLocationBtn.onclick = useMyLocation;
        
        customControlDiv.appendChild(setStartBtn);
        customControlDiv.appendChild(myLocationBtn);
        
        map.controls[google.maps.ControlPosition.TOP_LEFT].push(customControlDiv);
    }

    // Enable start location selection
    function enableStartLocationSelection() {
        showToast('Click anywhere on the map to set start location', 'info');
        
        // Change cursor to crosshair
        map.setOptions({ draggableCursor: 'crosshair' });
        
        // Add click listener for start location
        const clickListener = map.addListener('click', (e) => {
            setCustomStartLocation(e.latLng);
            google.maps.event.removeListener(clickListener);
            map.setOptions({ draggableCursor: null }); // Reset cursor
        });
    }

    // Use my current location
    function useMyLocation() {
        if (userLocation) {
            customStartLocation = userLocation;
            showToast('Using your current location as start point', 'success');
        } else {
            showToast('Getting your location...', 'info');
            getUserLocation().then(location => {
                customStartLocation = location;
                showToast('Using your current location as start point', 'success');
            }).catch(error => {
                showToast('Could not get your location. Please set manually.', 'error');
            });
        }
    }

    // Set custom start location
    function setCustomStartLocation(latLng) {
        customStartLocation = {
            lat: latLng.lat(),
            lng: latLng.lng()
        };
        
        showToast('Start location set! Click "Get Directions" on any PG.', 'success');
    }

    function loadPGMarkers() {
        if (!window.db) {
            setTimeout(loadPGMarkers, 1000);
            return;
        }

        console.log('Loading PG markers from Firestore...');

        db.collection('pgs').onSnapshot(snapshot => {
            pgMarkers.forEach(marker => {
                if (marker.setMap) marker.setMap(null);
            });
            pgMarkers = [];

            let markersAdded = 0;
            snapshot.forEach(doc => {
                const pg = doc.data();
                if (pg.latitude && pg.longitude) {
                    addPGMarker(doc.id, pg);
                    markersAdded++;
                }
            });

            console.log(`✅ Added ${markersAdded} PG markers`);
            
            const focusId = new URLSearchParams(window.location.search).get('focus');
            if (focusId && markersAdded > 0) {
                setTimeout(() => focusOnPG(focusId), 500);
            }
        }, err => {
            console.error('Failed to load PG markers:', err);
            showToast('Failed to load PG locations', 'error');
        });
    }

    function addPGMarker(pgId, pg) {
        const position = { lat: pg.latitude, lng: pg.longitude };
        
        const marker = new google.maps.Marker({
            position: position,
            map: map,
            title: pg.name,
            icon: {
                url: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAzMiAzMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjMyIiBoZWlnaHQ9IjMyIiByeD0iNiIgZmlsbD0iIzI1NjNlYiIvPgo8cGF0aCBkPSJNMTYgOEMxMy43OTEgOCAxMiA5Ljc5MSAxMiAxMkMxMiAxNC4yMDkgMTMuNzkxIDE2IDE2IDE2QzE4LjIwOSAxNiAyMCAxNC4yMDkgMjAgMTJDMjAgOS43OTEgMTguMjA5IDggMTYgOFpNMTYgMjBDMTEuNTg2IDIwIDggMTYuNDE0IDggMTJDOCA3LjU4NiAxMS41ODYgNCAxNiA0QzIwLjQxNCA0IDI0IDcuNTg2IDI0IDEyQzI0IDE2LjQxNCAyMC40MTQgMjAgMTYgMjBaIiBmaWxsPSJ3aGl0ZSIvPgo8L3N2Zz4K',
                scaledSize: new google.maps.Size(24, 24),
                anchor: new google.maps.Point(12, 12)
            }
        });

        const infoWindow = new google.maps.InfoWindow({
            content: createInfoWindowContent(pgId, pg)
        });

        marker.addListener('click', () => {
            pgMarkers.forEach(m => {
                if (m.infoWindow) m.infoWindow.close();
            });
            
            infoWindow.open(map, marker);
            marker.infoWindow = infoWindow;
        });

        marker.pgId = pgId;
        marker.infoWindow = infoWindow;
        pgMarkers.push(marker);

        return marker;
    }

    function createInfoWindowContent(pgId, pg) {
        const facilities = pg.facilities && pg.facilities.length ? 
            pg.facilities.slice(0, 3).join(', ') : 'No facilities listed';
        
        const hasStartLocation = userLocation !== null || customStartLocation !== null;
        const startLocationText = customStartLocation ? 
            (customStartLocation === userLocation ? 'Your Location' : 'Custom Location') : 
            'No start location set';
        
        const navigationButtons = `
            <div style="margin: 8px 0;">
                <strong>Get Directions:</strong>
                <div style="font-size: 11px; color: #666; margin: 4px 0;">
                    From: ${startLocationText}
                </div>
                <div style="display: flex; gap: 4px; margin-top: 6px;">
                    <button onclick="openGoogleMapsDirections('${pgId}', 'driving')" 
                            style="font-size: 11px; padding: 6px 8px; background: #2563eb; color: white; border: none; border-radius: 4px; cursor: pointer; flex: 1;">
                        🚗 Drive
                    </button>
                    <button onclick="openGoogleMapsDirections('${pgId}', 'walking')" 
                            style="font-size: 11px; padding: 6px 8px; background: #10b981; color: white; border: none; border-radius: 4px; cursor: pointer; flex: 1;">
                        🚶 Walk
                    </button>
                </div>
                ${!hasStartLocation ? `
                <div style="margin-top: 6px;">
                    <button onclick="enableStartLocationSelection()" 
                            style="font-size: 10px; padding: 4px 8px; background: #f59e0b; color: white; border: none; border-radius: 4px; cursor: pointer; width: 100%;">
                        📍 Set Start Location First
                    </button>
                </div>
                ` : ''}
            </div>
        `;
            
        return `
            <div style="max-width: 280px; padding: 12px;">
                <h6 style="margin: 0 0 8px 0; color: #2563eb; font-size: 14px;">${escapeHtml(pg.name)}</h6>
                <p style="margin: 0 0 4px 0; font-size: 13px; font-weight: bold;">
                    ₹${pg.rent?.toLocaleString() || 'N/A'}/month
                </p>
                <p style="margin: 0 0 8px 0; font-size: 12px; color: #666;">
                    ${escapeHtml(pg.address || 'Address not available')}
                </p>
                <p style="margin: 0 0 8px 0; font-size: 11px; color: #888;">
                    <strong>Facilities:</strong> ${facilities}
                </p>
                ${navigationButtons}
                <div style="display: flex; gap: 4px; flex-wrap: wrap; margin-top: 8px;">
                    <a href="pg_details.html?id=${pgId}" 
                       style="font-size: 11px; padding: 6px 10px; background: #2563eb; color: white; text-decoration: none; border-radius: 4px; flex: 1; text-align: center;">
                        View Details
                    </a>
                    <a href="tel:${pg.contact}" 
                       style="font-size: 11px; padding: 6px 10px; background: #10b981; color: white; text-decoration: none; border-radius: 4px; flex: 1; text-align: center;">
                        📞 Call
                    </a>
                </div>
            </div>
        `;
    }

    // Open Google Maps with directions - SIMPLIFIED
    window.openGoogleMapsDirections = function(pgId, travelMode) {
        let origin = customStartLocation || userLocation;
        
        if (!origin) {
            showToast('Please set a start location first using the "Set Start" button', 'warning');
            enableStartLocationSelection();
            return;
        }

        const marker = pgMarkers.find(m => m.pgId === pgId);
        if (!marker) {
            showToast('PG location not found', 'error');
            return;
        }

        const destination = marker.getPosition();
        const destLat = destination.lat();
        const destLng = destination.lng();
        const originLat = origin.lat;
        const originLng = origin.lng;

        // Create Google Maps URL
        const mapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${originLat},${originLng}&destination=${destLat},${destLng}&travelmode=${travelMode}`;
        
        console.log('Opening Google Maps:', mapsUrl);
        
        // Open in new tab
        window.open(mapsUrl, '_blank', 'noopener,noreferrer');
        
        showToast(`Opening Google Maps with ${travelMode} directions...`, 'success');
    };

    // Enable start location selection globally
    window.enableStartLocationSelection = enableStartLocationSelection;

    // Improved getUserLocation with Promise
    function getUserLocation() {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                reject(new Error('Geolocation not supported'));
                return;
            }

            navigator.geolocation.getCurrentPosition(
                (position) => {
                    userLocation = {
                        lat: position.coords.latitude,
                        lng: position.coords.longitude
                    };

                    console.log('User location found:', userLocation);

                    // Add user location marker
                    if (!userMarker) {
                        userMarker = new google.maps.Marker({
                            position: userLocation,
                            map: map,
                            title: 'Your Location',
                            icon: {
                                url: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMTIiIGN5PSIxMiIgcj0iMyIgZmlsbD0iIzEwYjk4MSIvPgo8Y2lyY2xlIGN4PSIxMiIgY3k9IjEyIiByPSI5IiBzdHJva2U9IiMxMGI5ODEiIHN0cm9rZS13aWR0aD0iMiIgZmlsbD0ibm9uZSIvPgo8L3N2Zz4K',
                                scaledSize: new google.maps.Size(24, 24),
                                anchor: new google.maps.Point(12, 12)
                            },
                            zIndex: 1000
                        });
                    }

                    // Center map on user location
                    map.setCenter(userLocation);
                    map.setZoom(14);

                    resolve(userLocation);
                },
                (error) => {
                    console.log('Geolocation failed:', error.message);
                    reject(error);
                },
                {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 60000
                }
            );
        });
    }

    function focusOnPG(pgId) {
        const marker = pgMarkers.find(m => m.pgId === pgId);
        if (marker) {
            map.setCenter(marker.getPosition());
            map.setZoom(16);
            setTimeout(() => {
                if (marker.infoWindow) {
                    marker.infoWindow.open(map, marker);
                }
            }, 500);
        }
    }

    // Global function to focus on marker
    window.focusOnMarker = function(pgId) {
        focusOnPG(pgId);
    };

    // Helper functions
    function escapeHtml(str) { 
        if (!str) return ''; 
        return String(str).replace(/[&<>"']/g, m => 
            ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])
        ); 
    }
})();