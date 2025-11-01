// src/js/pg.js - COMPLETE ENHANCED VERSION
(function () {
  let map, marker, autocomplete;
  const defaultCenter = { lat: 21.1458, lng: 79.0882 };

  // Global variables for search and filtering
  let allPGs = [];
  let currentLocation = null;
  let userMarker = null;

  // Initialize location map
  window.initLocationMap = function() {
    console.log('initLocationMap called - checking elements...');
    
    // Check if Google Maps is loaded
    if (!window.google || !window.google.maps) {
      console.error('Google Maps not loaded');
      showToast('Maps not loaded. Please refresh the page.', 'error');
      return;
    }

    // Check if map element exists and is visible
    const mapElement = document.getElementById('locationMap');
    if (!mapElement) {
      console.error('Map element not found!');
      showToast('Map container not found.', 'error');
      return;
    }

    // Check if element is visible and has dimensions
    const rect = mapElement.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) {
      console.error('Map element has zero dimensions - might be hidden');
      // Try again after a delay
      setTimeout(() => window.initLocationMap(), 500);
      return;
    }

    console.log('✅ Map element found and visible, initializing...');
    
    try {
      // Clear any loading content
      mapElement.innerHTML = '';

      map = new google.maps.Map(mapElement, {
        center: defaultCenter,
        zoom: 13
      });

      // Add click listener
      map.addListener('click', (e) => {
        setMarkerPosition(e.latLng);
        reverseGeocode(e.latLng);
      });

      // Initialize autocomplete
      const searchInput = document.getElementById('locationSearch');
      if (searchInput && google.maps.places) {
        initializeModernAutocomplete(searchInput);
      }

      // Try to get user's location
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const userLocation = {
              lat: position.coords.latitude,
              lng: position.coords.longitude
            };
            map.setCenter(userLocation);
            map.setZoom(14);
            showToast('Found your location! Click to place PG marker.', 'success');
          },
          (error) => {
            console.log('Geolocation failed:', error.message);
            showToast('Map ready! Click to select PG location.', 'info');
          }
        );
      } else {
        showToast('Map ready! Click to select PG location.', 'info');
      }

      console.log('✅ Location map initialized successfully');

    } catch (error) {
      console.error('❌ Failed to initialize location map:', error);
      showToast('Failed to initialize map: ' + error.message, 'error');
      
      // Show error in map container
      mapElement.innerHTML = `
        <div class="h-100 d-flex align-items-center justify-content-center text-danger">
          <div class="text-center">
            <div>❌ Map failed to load</div>
            <small>${error.message}</small>
            <br>
            <button class="btn btn-sm btn-outline-primary mt-2" onclick="window.initLocationMap()">
              Retry
            </button>
          </div>
        </div>
      `;
    }
  };

  // Modern autocomplete implementation
  async function initializeModernAutocomplete(inputElement) {
    try {
      // Check if we can use the modern API
      if (!google.maps.places.PlaceAutocompleteElement) {
        console.warn('Modern PlaceAutocompleteElement not available, falling back to classic');
        initializeClassicAutocomplete(inputElement);
        return;
      }

      // Create modern autocomplete
      const autocomplete = new google.maps.places.PlaceAutocompleteElement({
        inputElement: inputElement,
        componentRestrictions: { country: 'in' }
      });

      // Listen for place changes
      autocomplete.addListener('place_changed', () => {
        const place = autocomplete.value;
        if (!place || !place.geometry) {
          showToast('No details available for this location', 'warning');
          return;
        }

        map.setCenter(place.geometry.location);
        map.setZoom(16);
        setMarkerPosition(place.geometry.location);
        updateLocationDisplay(place);
      });

      console.log('✅ Modern PlaceAutocompleteElement initialized');

    } catch (error) {
      console.warn('Modern autocomplete failed, falling back to classic:', error);
      initializeClassicAutocomplete(inputElement);
    }
  }

  // Fallback to classic autocomplete
  function initializeClassicAutocomplete(inputElement) {
    const autocomplete = new google.maps.places.Autocomplete(inputElement, {
      types: ['geocode', 'establishment'],
      componentRestrictions: { country: 'in' }
    });

    autocomplete.addListener('place_changed', () => {
      const place = autocomplete.getPlace();
      if (!place.geometry) {
        showToast('No details available for this location', 'warning');
        return;
      }

      map.setCenter(place.geometry.location);
      map.setZoom(16);
      setMarkerPosition(place.geometry.location);
      updateLocationDisplay(place);
    });
  }

  function setMarkerPosition(latLng) {
    if (!marker) {
      // Try to use AdvancedMarkerElement if available
      if (google.maps.marker && google.maps.marker.AdvancedMarkerElement) {
        marker = new google.maps.marker.AdvancedMarkerElement({
          map: map,
          position: latLng,
          gmpDraggable: true
        });
      } else {
        // Fallback to classic Marker
        marker = new google.maps.Marker({
          map: map,
          position: latLng,
          draggable: true,
          animation: google.maps.Animation.DROP
        });
      }
      
      marker.addListener('dragend', () => {
        reverseGeocode(marker.position);
      });
    }

    marker.position = latLng;
    
    // Update hidden coordinates
    document.getElementById('latitude').value = latLng.lat();
    document.getElementById('longitude').value = latLng.lng();
  }

  function reverseGeocode(latLng) {
    if (!window.google) return;

    const geocoder = new google.maps.Geocoder();
    geocoder.geocode({ location: latLng }, (results, status) => {
      if (status === 'OK' && results[0]) {
        updateLocationDisplay(results[0]);
      } else {
        document.getElementById('selectedLocation').innerHTML = 
          '<small class="text-muted">Location selected but address not found</small>';
      }
    });
  }

  function updateLocationDisplay(place) {
    const address = place.formatted_address || place.vicinity || 'Address not available';
    const locationDiv = document.getElementById('selectedLocation');
    
    document.getElementById('address').value = address;
    
    locationDiv.innerHTML = `
      <div class="location-info">
        <strong>📍 ${place.name || 'Selected Location'}</strong><br>
        <small>${address}</small><br>
        <small class="text-success">✓ Location saved</small>
      </div>
    `;
  }

  window.searchLocation = function() {
    const searchInput = document.getElementById('locationSearch');
    if (searchInput && searchInput.value.trim()) {
      const event = new Event('input', { bubbles: true });
      searchInput.dispatchEvent(event);
    }
  };

  // Wait for Firebase to be ready
  window.addEventListener('firebaseReady', () => {
    console.log('pg.js: Firebase is ready, initializing...');
    initializePGModule();
  });

  function initializePGModule() {
    const collectionName = 'pgs';
    const col = db.collection(collectionName);

    // Enhanced Add PG form handling
    const pgForm = document.getElementById('pgForm');
    if (pgForm) {
      pgForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const submitBtn = document.getElementById('submitBtn');
        const submitText = document.getElementById('submitText');
        const submitSpinner = document.getElementById('submitSpinner');
        
        // Show loading state
        submitBtn.disabled = true;
        submitText.textContent = 'Adding PG...';
        submitSpinner.classList.remove('d-none');

        try {
          // Check if user is authenticated (optional - remove if you want public submissions)
          const user = auth.currentUser;
          if (!user) {
            // Uncomment if you want to require login
            // throw new Error('Please log in to add a PG listing');
          }

          // Get form values
          const name = document.getElementById('pgName').value.trim();
          const owner = document.getElementById('ownerName').value.trim();
          const contact = document.getElementById('contact').value.trim();
          const rent = Number(document.getElementById('rent').value || 0);
          const facilities = (document.getElementById('facilities').value || '')
            .split(',').map(s => s.trim()).filter(Boolean);
          const imageFile = document.getElementById('pgImage').files[0];
          
          // Get location data
          const latitude = parseFloat(document.getElementById('latitude').value);
          const longitude = parseFloat(document.getElementById('longitude').value);
          const address = document.getElementById('address').value.trim();

          // Validation
          if (!name || !contact || !rent) {
            throw new Error('Please complete all required fields');
          }

          if (!latitude || !longitude) {
            throw new Error('Please select a location on the map');
          }

          let photo_url = 'images/default_pg.jpg';

          // Upload image if provided (temporarily disabled due to CORS)
          /*
          if (imageFile && window.storage) {
            try {
              const storageRef = storage.ref();
              const imgRef = storageRef.child(`pg_images/${Date.now()}_${imageFile.name}`);
              await imgRef.put(imageFile);
              photo_url = await imgRef.getDownloadURL();
            } catch (err) {
              console.warn('Image upload failed, using default image', err);
            }
          }
          */

          // Prepare payload
          const payload = {
            name,
            owner_name: owner,
            contact,
            rent,
            address,
            facilities,
            photo_url,
            latitude,
            longitude,
            user_id: user ? user.uid : null,
            user_email: user ? user.email : null,
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            created_at: new Date().toISOString()
          };

          console.log('Adding PG to Firestore:', payload);

          // Add to Firestore
          const docRef = await col.add(payload);
          console.log('PG added with ID:', docRef.id);

          // Success
          showToast('PG added successfully!', 'success');
          
          // Redirect after short delay
          setTimeout(() => {
            window.location.href = 'index.html';
          }, 1500);

        } catch (err) {
          console.error('Add PG error:', err);
          showToast(`Error: ${err.message}`, 'error');
          
          // Reset button state
          submitBtn.disabled = false;
          submitText.textContent = 'Submit PG Listing';
          submitSpinner.classList.add('d-none');
        }
      });

      // Initialize map when form is ready
      setTimeout(() => window.initLocationMap(), 1000);
    }

    // Load all PGs for search functionality
    loadAllPGs(col);

    // Initialize homepage features
    initializeHomepageFeatures(col);
  }

  // Load all PGs for search functionality
  function loadAllPGs(col) {
    col.orderBy('timestamp', 'desc').onSnapshot(snapshot => {
      allPGs = [];
      snapshot.forEach(doc => {
        allPGs.push({
          id: doc.id,
          ...doc.data(),
          // Add searchable text for better searching
          searchText: `${doc.data().name || ''} ${doc.data().address || ''} ${doc.data().facilities?.join(' ') || ''}`.toLowerCase()
        });
      });
      
      console.log(`✅ Loaded ${allPGs.length} PGs for search`);
      renderPGs(allPGs); // Initial render
      
      // Update results count
      updateResultsCount(allPGs.length);
    }, err => {
      console.error('Error loading PGs:', err);
      showToast('Failed to load PGs', 'error');
    });
  }

  // Initialize homepage search and filter features
  function initializeHomepageFeatures(col) {
    const searchInput = document.getElementById('searchInput');
    const searchBtn = document.getElementById('searchBtn');
    const maxRentInput = document.getElementById('maxRent');
    const sortSelect = document.getElementById('sortBy');
    const facilityFilter = document.getElementById('facilityFilter');

    // Search button click
    if (searchBtn) {
      searchBtn.addEventListener('click', performSearch);
    }

    // Search on Enter key
    if (searchInput) {
      searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          performSearch();
        }
      });
    }

    // Real-time filtering
    if (maxRentInput) {
      maxRentInput.addEventListener('input', applyFilters);
    }
    if (sortSelect) {
      sortSelect.addEventListener('change', applyFilters);
    }
    if (facilityFilter) {
      facilityFilter.addEventListener('change', applyFilters);
    }
  }

  // Perform search function
  function performSearch() {
    const searchInput = document.getElementById('searchInput');
    const searchBtn = document.getElementById('searchBtn');
    const searchText = document.getElementById('searchText');
    const searchSpinner = document.getElementById('searchSpinner');
    
    if (!searchInput) return;

    const query = searchInput.value.trim().toLowerCase();
    
    // Show loading state
    searchBtn.disabled = true;
    searchText.textContent = 'Searching...';
    searchSpinner.classList.remove('d-none');

    setTimeout(() => {
      let filteredPGs = allPGs;

      // Text search
      if (query) {
        filteredPGs = filteredPGs.filter(pg => 
          pg.searchText.includes(query) ||
          (pg.name && pg.name.toLowerCase().includes(query)) ||
          (pg.address && pg.address.toLowerCase().includes(query)) ||
          (pg.facilities && pg.facilities.some(f => f.toLowerCase().includes(query)))
        );
      }

      // Apply additional filters
      filteredPGs = applyAdditionalFilters(filteredPGs);
      
      // Render results
      renderPGs(filteredPGs);
      
      // Reset button state
      searchBtn.disabled = false;
      searchText.textContent = 'Search';
      searchSpinner.classList.add('d-none');
    }, 500);
  }

  // Apply additional filters (rent, facilities, etc.)
  function applyAdditionalFilters(pgs) {
    let filtered = [...pgs];
    
    // Max rent filter
    const maxRent = document.getElementById('maxRent')?.value;
    if (maxRent) {
      filtered = filtered.filter(pg => pg.rent <= parseInt(maxRent));
    }
    
    // Facility filter
    const facility = document.getElementById('facilityFilter')?.value;
    if (facility) {
      filtered = filtered.filter(pg => 
        pg.facilities && pg.facilities.includes(facility)
      );
    }
    
    // Sort filter
    const sortBy = document.getElementById('sortBy')?.value;
    switch (sortBy) {
      case 'rent_low':
        filtered.sort((a, b) => (a.rent || 0) - (b.rent || 0));
        break;
      case 'rent_high':
        filtered.sort((a, b) => (b.rent || 0) - (a.rent || 0));
        break;
      case 'newest':
      default:
        // Already sorted by timestamp from Firestore
        break;
    }
    
    return filtered;
  }

  // Apply all filters
  function applyFilters() {
    let filteredPGs = allPGs;
    filteredPGs = applyAdditionalFilters(filteredPGs);
    renderPGs(filteredPGs);
  }

  // Render PGs to the page
  function renderPGs(pgs) {
    const container = document.getElementById('pgContainer');
    const noResults = document.getElementById('noResults');
    
    if (!container) return;

    container.innerHTML = '';
    
    if (pgs.length === 0) {
      if (noResults) noResults.classList.remove('d-none');
      updateResultsCount(0);
      return;
    }
    
    if (noResults) noResults.classList.add('d-none');
    
    pgs.forEach(pg => {
      const colDiv = document.createElement('div');
      colDiv.className = 'col-md-4 mb-4';
      colDiv.innerHTML = createPGCard(pg);
      container.appendChild(colDiv);
    });
    
    updateResultsCount(pgs.length);
  }

  // Create PG card HTML
  function createPGCard(pg) {
    const facilities = pg.facilities || [];
    const displayFacilities = facilities.slice(0, 3);
    const remaining = facilities.length - 3;
    
    return `
      <div class="pg-card" data-pg-id="${pg.id}">
        <img src="${pg.photo_url || 'images/default_pg.jpg'}" alt="${escapeHtml(pg.name)}" 
             onerror="this.src='images/default_pg.jpg'">
        <div class="details">
          <h5>${escapeHtml(pg.name)}</h5>
          <div class="price">₹${pg.rent?.toLocaleString() || 'N/A'}/month</div>
          <div class="address">${escapeHtml(pg.address || 'Address not specified')}</div>
          
          ${facilities.length ? `
            <div class="facilities">
              ${displayFacilities.map(f => `<span class="facility-tag">${escapeHtml(f)}</span>`).join('')}
              ${remaining > 0 ? `<span class="facility-tag">+${remaining} more</span>` : ''}
            </div>
          ` : ''}
          
          <div class="mt-2 text-muted small">
            <i class="fas fa-map-marker-alt"></i>
            ${pg.latitude && pg.longitude ? 'Location available' : 'Location not set'}
          </div>
          
          <div class="actions">
            <a class="btn btn-primary" href="pg_details.html?id=${pg.id}">View Details</a>
            <a class="btn btn-outline-primary" href="tel:${pg.contact}">Call</a>
            <a class="btn btn-outline-secondary" href="map.html?focus=${pg.id}" 
               onclick="focusOnPG('${pg.id}')">View on Map</a>
          </div>
        </div>
      </div>
    `;
  }

  // Update results count
  function updateResultsCount(count) {
    const resultsCount = document.getElementById('resultsCount');
    if (resultsCount) {
      resultsCount.textContent = `${count} PG${count !== 1 ? 's' : ''} found`;
    }
  }

  // Show all PGs (reset search)
  window.showAllPGs = function() {
    const searchInput = document.getElementById('searchInput');
    const maxRentInput = document.getElementById('maxRent');
    const sortSelect = document.getElementById('sortBy');
    const facilityFilter = document.getElementById('facilityFilter');
    
    if (searchInput) searchInput.value = '';
    if (maxRentInput) maxRentInput.value = '';
    if (sortSelect) sortSelect.value = 'newest';
    if (facilityFilter) facilityFilter.value = '';
    
    renderPGs(allPGs);
  };

  // Use current location for search
  window.useCurrentLocation = function() {
    if (!navigator.geolocation) {
      showToast('Geolocation is not supported by your browser', 'error');
      return;
    }

    const searchBtn = document.getElementById('searchBtn');
    const searchText = document.getElementById('searchText');
    const searchSpinner = document.getElementById('searchSpinner');
    
    // Show loading state
    searchBtn.disabled = true;
    searchText.textContent = 'Getting location...';
    searchSpinner.classList.remove('d-none');

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        currentLocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };
        
        try {
          // Reverse geocode to get address
          const address = await reverseGeocodePosition(currentLocation);
          document.getElementById('searchInput').value = address;
          
          // Show nearby PGs
          showNearbyPGs(currentLocation);
          
        } catch (error) {
          showToast('Found your location! Showing nearby PGs.', 'success');
          showNearbyPGs(currentLocation);
        }
        
        // Reset button state
        searchBtn.disabled = false;
        searchText.textContent = 'Search';
        searchSpinner.classList.add('d-none');
      },
      (error) => {
        console.error('Geolocation error:', error);
        showToast('Unable to get your location', 'error');
        
        // Reset button state
        searchBtn.disabled = false;
        searchText.textContent = 'Search';
        searchSpinner.classList.add('d-none');
      }
    );
  };

  // Show PGs near a location
  function showNearbyPGs(location) {
    if (!location || allPGs.length === 0) return;
    
    // Calculate distances and show PGs within 10km
    const nearbyPGs = allPGs.filter(pg => {
      if (!pg.latitude || !pg.longitude) return false;
      
      const distance = calculateDistance(
        location.lat, location.lng,
        pg.latitude, pg.longitude
      );
      
      pg.distance = distance; // Store distance for sorting
      return distance <= 10; // Within 10km
    });
    
    // Sort by distance
    nearbyPGs.sort((a, b) => (a.distance || Infinity) - (b.distance || Infinity));
    
    renderPGs(nearbyPGs);
    showToast(`Found ${nearbyPGs.length} PGs within 10km`, 'success');
  }

  // Calculate distance between two coordinates (Haversine formula)
  function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c; // Distance in km
  }

  // Reverse geocode coordinates to address
  async function reverseGeocodePosition(position) {
    if (!window.google || !window.google.maps) {
      throw new Error('Google Maps not loaded');
    }
    
    return new Promise((resolve, reject) => {
      const geocoder = new google.maps.Geocoder();
      geocoder.geocode({ location: position }, (results, status) => {
        if (status === 'OK' && results[0]) {
          resolve(results[0].formatted_address);
        } else {
          reject(new Error('Geocoding failed'));
        }
      });
    });
  }

  // Focus on specific PG on map
  window.focusOnPG = function(pgId) {
    // This will be used by the map page
    localStorage.setItem('focusPG', pgId);
  };

  // Utility function for HTML escaping
  function escapeHtml(str) { 
    if (!str) return ''; 
    return String(str).replace(/[&<>"']/g, m => 
      ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])
    ); 
  }
})();