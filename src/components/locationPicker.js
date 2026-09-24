/**
 * Location Picker Component
 * Supports:
 * 1. Device GPS Geolocation
 * 2. Municipal Name Search with Enter-key submit, Search button, Autocomplete & Geocoding
 * 3. Quick Coastal Presets
 * 4. Active Station Telemetry
 */

import { searchStations, geocodeMunicipalLocation, POPULAR_COASTAL_HUBS, findNearestStation } from '../api/geocoding.js';

export function renderLocationPicker(container, activeStation, onStationSelect) {
  const customLabel = activeStation.customLabel;
  const officialName = activeStation.name || 'Select Location';
  const displayName = customLabel || officialName;
  const isCustom = customLabel && customLabel !== officialName && officialName !== 'Select Location';

  container.innerHTML = `
    <div class="location-bar card-glass">
      <div class="location-bar-main">
        <!-- Active Station Display -->
        <div class="active-station-group">
          <div class="location-icon">📍</div>
          <div class="station-meta-text">
            <div class="station-name-row">
              <span class="station-name" id="currentStationName" title="${displayName}">${displayName}</span>
              <span class="station-state">${activeStation.state || ''}</span>
            </div>
            <div class="station-id-row">
              ${isCustom ? `<span class="station-sub-name">Station: ${officialName} • </span>` : ''}
              <span class="station-id">ID: ${activeStation.id}</span>
              ${activeStation.distanceMiles !== undefined ? `<span class="station-dist">• ${activeStation.distanceMiles} mi away</span>` : ''}
            </div>
          </div>
        </div>

        <!-- Municipal Search Bar with Enter & Click Submit -->
        <div class="search-input-wrapper">
          <input 
            type="text" 
            id="municipalSearchInput" 
            class="search-input" 
            placeholder="Search city, municipal name, or station (press Enter)..." 
            autocomplete="off"
            tabindex="0"
          />
          <button class="search-submit-btn" id="searchSubmitBtn" title="Search Location" tabindex="0">🔍</button>
          <button class="search-clear-btn" id="searchClearBtn" style="display: none;" title="Clear search">✕</button>
          <div class="search-spinner" id="searchSpinner" style="display: none;"></div>
          
          <!-- Dropdown Autocomplete Results -->
          <div class="search-results-dropdown" id="searchResultsDropdown" style="display: none;"></div>
        </div>

        <!-- GPS Geolocation Button -->
        <button class="gps-btn" id="gpsLocateBtn" title="Use my device location" tabindex="0">
          <span class="gps-icon">🎯</span>
          <span class="gps-label">Use GPS</span>
        </button>
      </div>

      <!-- Quick Coastal Hubs Bar -->
      <div class="coastal-hubs-bar">
        <span class="hubs-label">Popular Coasts:</span>
        <div class="hubs-scroll">
          ${POPULAR_COASTAL_HUBS.map(hub => `
            <button 
              class="hub-chip ${hub.id === activeStation.id ? 'active' : ''}" 
              data-id="${hub.id}"
              tabindex="0"
            >
              ${hub.label}
            </button>
          `).join('')}
        </div>
      </div>
    </div>
  `;

  // Attach elements
  const input = container.querySelector('#municipalSearchInput');
  const dropdown = container.querySelector('#searchResultsDropdown');
  const clearBtn = container.querySelector('#searchClearBtn');
  const searchSubmitBtn = container.querySelector('#searchSubmitBtn');
  const spinner = container.querySelector('#searchSpinner');
  const gpsBtn = container.querySelector('#gpsLocateBtn');

  let debounceTimer = null;

  // Search executor (triggered on Enter, search button click, or dropdown click)
  async function executeSearch(query) {
    const q = (query || '').trim();
    if (!q) return;

    if (debounceTimer) clearTimeout(debounceTimer);
    dropdown.style.display = 'none';
    spinner.style.display = 'block';

    try {
      // 1. Check local station database first
      const matches = await searchStations(q, 3);
      if (matches && matches.length > 0) {
        spinner.style.display = 'none';
        input.value = '';
        clearBtn.style.display = 'none';
        onStationSelect(matches[0], q);
        return;
      }

      // 2. Otherwise geocode via OpenStreetMap Nominatim
      const geocoded = await geocodeMunicipalLocation(q);
      spinner.style.display = 'none';
      if (geocoded && geocoded.station) {
        input.value = '';
        clearBtn.style.display = 'none';
        onStationSelect(geocoded.station, geocoded.resolvedLocation || q);
      } else {
        alert(`Could not find a coastal tide station near "${q}". Please try a nearby harbor or coastal city.`);
      }
    } catch (err) {
      spinner.style.display = 'none';
      console.warn('Search execution failed:', err);
    }
  }

  // Handle Enter Key
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      executeSearch(input.value);
    }
  });

  // Handle Search Button Click
  searchSubmitBtn.addEventListener('click', () => {
    executeSearch(input.value);
  });

  // Live Autocomplete as user types
  input.addEventListener('input', () => {
    const val = input.value.trim();
    clearBtn.style.display = val.length > 0 ? 'block' : 'none';

    if (debounceTimer) clearTimeout(debounceTimer);
    if (val.length < 2) {
      dropdown.style.display = 'none';
      return;
    }

    spinner.style.display = 'block';

    debounceTimer = setTimeout(async () => {
      const matches = await searchStations(val, 6);
      spinner.style.display = 'none';

      let html = '';
      if (matches && matches.length > 0) {
        html += `<div class="dropdown-group-title">Matching Tide Stations</div>`;
        html += matches.map(s => `
          <div class="dropdown-item" data-station='${JSON.stringify(s)}'>
            <span class="item-name">${s.name}</span>
            <span class="item-meta">${s.state} • ID ${s.id}</span>
          </div>
        `).join('');
      }

      // Add Geocode search option
      html += `
        <div class="dropdown-item dropdown-geocode" data-query="${val}">
          <span class="item-name">🔍 Search city "<strong>${val}</strong>" via Geocoder</span>
          <span class="item-meta">Locates nearest coastal tide station</span>
        </div>
      `;

      dropdown.innerHTML = html;
      dropdown.style.display = 'block';

      // Dropdown Item Click Listeners
      dropdown.querySelectorAll('.dropdown-item').forEach(item => {
        item.addEventListener('click', async () => {
          if (item.classList.contains('dropdown-geocode')) {
            executeSearch(item.dataset.query);
          } else {
            const station = JSON.parse(item.dataset.station);
            dropdown.style.display = 'none';
            input.value = '';
            clearBtn.style.display = 'none';
            onStationSelect(station, station.name);
          }
        });
      });
    }, 200);
  });

  clearBtn.addEventListener('click', () => {
    input.value = '';
    clearBtn.style.display = 'none';
    dropdown.style.display = 'none';
    input.focus();
  });

  // Handle GPS Locate
  gpsBtn.addEventListener('click', () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }

    gpsBtn.classList.add('loading');
    gpsBtn.querySelector('.gps-label').textContent = 'Locating...';

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        const nearest = await findNearestStation(latitude, longitude);
        gpsBtn.classList.remove('loading');
        gpsBtn.querySelector('.gps-label').textContent = 'Use GPS';

        if (nearest) {
          onStationSelect(nearest, `Current Location (GPS)`);
        } else {
          alert('Could not identify a tide station near your GPS position.');
        }
      },
      (err) => {
        gpsBtn.classList.remove('loading');
        gpsBtn.querySelector('.gps-label').textContent = 'Use GPS';
        console.warn('Geolocation error:', err);
        alert('Could not access device location. Please search for a city or pick a coastal hub.');
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  });

  // Handle Coastal Hubs Clicks
  container.querySelectorAll('.hub-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const id = chip.dataset.id;
      const hub = POPULAR_COASTAL_HUBS.find(h => h.id === id);
      if (hub) onStationSelect(hub, hub.label);
    });
  });

  // Close dropdown on outside click
  document.addEventListener('click', (e) => {
    if (!container.contains(e.target)) {
      dropdown.style.display = 'none';
    }
  });
}
