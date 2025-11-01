// src/js/map.js - WITH NAVIGATION
(function () {
    let map, userMarker, pgMarkers = [], directionsService, directionsRenderer;
    const defaultCenter = { lat: 21.1458, lng: 79.0882 };
    let firestoreReady = false;
    let userLocation = null;

    // Wait for Firebase to be ready
    window.addEventListener('firebaseReady', function() {
        console.log('map.js: Firebase is ready');
        firestoreReady = true;
        
        // If map is already initialized, load PG markers
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

        // Initialize Directions Service
        directionsService = new google.maps.DirectionsService();
        directionsRenderer = new google.maps.DirectionsRenderer({
            map: map,
            suppressMarkers: true,
            panel: document.getElementById('directionsPanel')
        });

        console.log('✅ Map and Directions services initialized');

        // Get user's current location
        getUserLocation();

        // Load PG markers if Firestore is ready
        if (firestoreReady && window.db) {
            loadPGMarkers();
        } else {
            console.log('Waiting for Firestore to be ready...');
        }

        // Check if we need to focus on a specific PG
        const params = new URLSearchParams(window.location.search);
        const focusId = params.get('focus') || localStorage.getItem('focusPG');
        if (focusId) {
            console.log('Focusing on PG:', focusId);
            setTimeout(() => focusOnPG(focusId), 2000);
            localStorage.removeItem('focusPG');
        }
    };

    function loadPGMarkers() {
        if (!window.db) {
            console.error('Firestore not available');
            setTimeout(loadPGMarkers, 1000);
            return;
        }

        console.log('Loading PG markers from Firestore...');

        db.collection('pgs').onSnapshot(snapshot => {
            // Clear existing markers
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
        
        // Create marker with custom icon
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

        // Create info window with navigation options
        const infoWindow = new google.maps.InfoWindow({
            content: createInfoWindowContent(pgId, pg)
        });

        // Add click listener
        marker.addListener('click', () => {
            // Close all other info windows
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
        
        const hasUserLocation = userLocation !== null;
        const navigationButtons = hasUserLocation ? `
            <div style="margin: 8px 0;">
                <strong>Get Directions:</strong>
                <div style="display: flex; gap: 4px; margin-top: 4px;">
                    <button onclick="calculateRoute('${pgId}', 'DRIVING')" 
                            style="font-size: 11px; padding: 6px 8px; background: #2563eb; color: white; border: none; border-radius: 4px; cursor: pointer; flex: 1;">
                        🚗 Drive
                    </button>
                    <button onclick="calculateRoute('${pgId}', 'WALKING')" 
                            style="font-size: 11px; padding: 6px 8px; background: #10b981; color: white; border: none; border-radius: 4px; cursor: pointer; flex: 1;">
                        🚶 Walk
                    </button>
                </div>
            </div>
        ` : `
            <div style="margin: 8px 0; font-size: 11px; color: #666;">
                Enable location access for directions
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
                <div style="margin-top: 8px;">
                    <button onclick="clearRoute()" 
                            style="font-size: 10px; padding: 4px 8px; background: #ef4444; color: white; border: none; border-radius: 4px; cursor: pointer; width: 100%;">
                        Clear Route
                    </button>
                </div>
            </div>
        `;
    }

    // Calculate route to PG
    window.calculateRoute = function(pgId, travelMode) {
        if (!userLocation) {
            showToast('Please enable location access for directions', 'warning');
            return;
        }

        const marker = pgMarkers.find(m => m.pgId === pgId);
        if (!marker) {
            showToast('PG location not found', 'error');
            return;
        }

        const destination = marker.getPosition();
        
        const request = {
            origin: userLocation,
            destination: destination,
            travelMode: google.maps.TravelMode[travelMode],
            provideRouteAlternatives: true
        };

        showToast(`Calculating ${travelMode.toLowerCase()} route...`, 'info');

        directionsService.route(request, function(result, status) {
            if (status === 'OK') {
                directionsRenderer.setDirections(result);
                
                // Show directions panel
                const panel = document.getElementById('directionsPanel');
                if (panel) {
                    panel.style.display = 'block';
                }
                
                // Show route info
                const route = result.routes[0];
                const leg = route.legs[0];
                const duration = leg.duration.text;
                const distance = leg.distance.text;
                
                showToast(`${travelMode} route found! ${distance} - ${duration}`, 'success');
                
                // Close all info windows
                pgMarkers.forEach(m => {
                    if (m.infoWindow) m.infoWindow.close();
                });
                
            } else {
                console.error('Directions request failed:', status);
                showToast('Could not calculate route. Please try again.', 'error');
            }
        });
    };

    // Clear current route
    window.clearRoute = function() {
        directionsRenderer.setDirections({routes: []});
        
        // Hide directions panel
        const panel = document.getElementById('directionsPanel');
        if (panel) {
            panel.style.display = 'none';
        }
        
        showToast('Route cleared', 'info');
    };

    // Open in Google Maps app
    window.openInGoogleMaps = function(pgId) {
        const marker = pgMarkers.find(m => m.pgId === pgId);
        if (!marker) {
            showToast('PG location not found', 'error');
            return;
        }

        const position = marker.getPosition();
        const lat = position.lat();
        const lng = position.lng();
        
        // Google Maps URL format
        const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`;
        
        // Open in new tab
        window.open(mapsUrl, '_blank');
    };

    function getUserLocation() {
        if (!navigator.geolocation) {
            console.log('Geolocation not supported');
            showToast('Geolocation not supported by your browser', 'warning');
            return;
        }

        console.log('Getting user location...');

        navigator.geolocation.getCurrentPosition(
            (position) => {
                userLocation = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                };

                console.log('User location found:', userLocation);

                // Add user location marker
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

                // Center map on user location
                map.setCenter(userLocation);
                map.setZoom(14);

                // Show nearby PGs
                showNearbyPGsOnMap(userLocation);

                showToast('Found your location! You can now get directions to PGs.', 'success');

            },
            (error) => {
                console.log('Geolocation failed:', error.message);
                showToast('Unable to get your location. Directions will not be available.', 'warning');
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 60000
            }
        );

        // Watch position for updates
        if (navigator.geolocation.watchPosition) {
            navigator.geolocation.watchPosition(
                (position) => {
                    const newLocation = {
                        lat: position.coords.latitude,
                        lng: position.coords.longitude
                    };
                    
                    userLocation = newLocation;
                    
                    if (userMarker) {
                        userMarker.setPosition(newLocation);
                    }
                },
                (error) => {
                    console.log('Position watch error:', error);
                },
                {
                    enableHighAccuracy: false,
                    maximumAge: 30000
                }
            );
        }
    }

    function showNearbyPGsOnMap(userLocation) {
        if (!pgMarkers.length) {
            console.log('No PG markers to filter');
            return;
        }

        console.log('Filtering PGs by distance from user...');

        let nearbyCount = 0;
        pgMarkers.forEach(marker => {
            const distance = calculateDistance(
                userLocation.lat, userLocation.lng,
                marker.getPosition().lat(), marker.getPosition().lng()
            );
            
            // Show markers within 5km, hide others
            const isNearby = distance <= 5;
            marker.setVisible(isNearby);
            
            if (isNearby) nearbyCount++;
        });

        console.log(`Showing ${nearbyCount} nearby PGs within 5km`);
    }

    function focusOnPG(pgId) {
        console.log('Focusing on PG:', pgId);
        
        const marker = pgMarkers.find(m => m.pgId === pgId);
        if (marker) {
            map.setCenter(marker.getPosition());
            map.setZoom(16);
            setTimeout(() => {
                if (marker.infoWindow) {
                    marker.infoWindow.open(map, marker);
                }
            }, 500);
            console.log('✅ Focused on PG:', pgId);
        } else {
            console.log('PG marker not found:', pgId);
            setTimeout(() => focusOnPG(pgId), 1000);
        }
    }

    // Global function to focus on marker
    window.focusOnMarker = function(pgId) {
        focusOnPG(pgId);
    };

    // Helper functions
    function calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 6371;
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = 
            Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
            Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
    }

    function escapeHtml(str) { 
        if (!str) return ''; 
        return String(str).replace(/[&<>"']/g, m => 
            ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])
        ); 
    }
})();