/**
 * Local Tide Application - Main Entry & Orchestrator (Standalone PWA)
 */

import { POPULAR_COASTAL_HUBS, loadStations, findNearestStation } from './api/geocoding.js';
import { getStationTideData } from './api/noaaClient.js';
import { getCelestialOverview } from './astronomy/celestial.js';

import { renderLocationPicker } from './components/locationPicker.js';
import { renderTideGauge } from './components/tideGauge.js';
import { renderPredictions } from './components/predictions.js';
import { renderTideChart } from './components/tideChart.js';
import { renderExtremeTides } from './components/extremeTides.js';

// Application State
const state = {
  activeStation: null,
  tideData: null,
  celestialData: null,
  unit: localStorage.getItem('tides_unit') || 'ft', // 'ft' or 'm'
  use24Hour: localStorage.getItem('tides_24h') === 'true',
  isTvMode: localStorage.getItem('tides_tv') === 'true',
  chartHours: 24,
  isLoading: false,
  autoRefreshInterval: null
};

// DOM Container Elements
const locationContainer = document.getElementById('locationContainer');
const currentGaugeContainer = document.getElementById('currentGaugeContainer');
const predictionsContainer = document.getElementById('predictionsContainer');
const chartContainer = document.getElementById('chartContainer');
const extremeTidesContainer = document.getElementById('extremeTidesContainer');

// Header Controls
const liveClockEl = document.getElementById('liveClock');
const unitToggleBtn = document.getElementById('unitToggleBtn');
const unitToggleLabel = document.getElementById('unitToggleLabel');
const timeFormatToggleBtn = document.getElementById('timeFormatToggleBtn');
const timeFormatLabel = document.getElementById('timeFormatLabel');
const tvModeToggleBtn = document.getElementById('tvModeToggleBtn');
const tvModeLabel = document.getElementById('tvModeLabel');
const refreshDataBtn = document.getElementById('refreshDataBtn');
const refreshIcon = document.getElementById('refreshIcon');

/**
 * Initialize the application
 */
async function init() {
  // 1. Initialize UI controls state
  updateHeaderControlLabels();
  if (state.isTvMode) {
    document.body.classList.add('tv-kiosk-mode');
  }

  // 2. Start digital clock in header
  startDigitalClock();

  // 3. Pre-load stations database in background
  loadStations();

  // 4. Register PWA Service Worker for offline support
  registerServiceWorker();

  // 5. Determine initial station (saved preference, or default to The Battery, NY)
  const savedStation = localStorage.getItem('tides_station');
  if (savedStation) {
    try {
      state.activeStation = JSON.parse(savedStation);
    } catch (e) {
      state.activeStation = POPULAR_COASTAL_HUBS[0];
    }
  } else {
    // Default station: The Battery, New York (ID 8518750)
    state.activeStation = POPULAR_COASTAL_HUBS[0];

    // Attempt automatic GPS lookup if browser allows
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const { latitude, longitude } = pos.coords;
          const nearest = await findNearestStation(latitude, longitude);
          if (nearest) {
            handleStationSelect(nearest, 'Current Location (GPS)');
          }
        },
        (err) => {
          console.info('GPS not granted on launch, using coastal hub.');
        },
        { timeout: 6000, enableHighAccuracy: true }
      );
    }
  }

  // 6. Initial Render of Location Picker
  renderLocationPicker(locationContainer, state.activeStation, handleStationSelect);

  // 7. Fetch Tide & Celestial Data
  await loadDashboardData();

  // 8. Setup auto-refresh every 5 minutes
  setupAutoRefresh();

  // 9. Setup TV Remote / Keyboard Navigation
  setupKeyboardNavigation();

  // 10. Attach Header Control Event Listeners
  setupHeaderListeners();
}

/**
 * Register Service Worker
 */
function registerServiceWorker() {
  if ('serviceWorker' in navigator && window.location.protocol.startsWith('http')) {
    navigator.serviceWorker.register('./sw.js')
      .then((reg) => {
        console.info('Local Tide Service Worker registered with scope:', reg.scope);
      })
      .catch((err) => {
        console.info('Service Worker registration skipped or not supported:', err);
      });
  }
}

/**
 * Update Header Button Labels
 */
function updateHeaderControlLabels() {
  unitToggleLabel.textContent = `Units: ${state.unit}`;
  timeFormatLabel.textContent = state.use24Hour ? '24h' : '12h';
  tvModeLabel.textContent = state.isTvMode ? 'Exit TV' : 'TV Mode';
  if (state.isTvMode) {
    tvModeToggleBtn.classList.add('active');
  } else {
    tvModeToggleBtn.classList.remove('active');
  }
}

/**
 * Start 1-second live clock in header
 */
function startDigitalClock() {
  function updateClock() {
    const now = new Date();
    liveClockEl.textContent = now.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: !state.use24Hour
    });
  }
  updateClock();
  setInterval(updateClock, 1000);
}

let currentFetchId = 0;

/**
 * Show temporary dimming on dashboard panels while fetching new location data
 */
function showDashboardLoading() {
  const cards = [
    currentGaugeContainer.querySelector('.tide-gauge-card'),
    predictionsContainer.querySelector('.immediate-predictions-container'),
    chartContainer.querySelector('.tide-chart-card')
  ];
  cards.forEach(card => {
    if (card) card.classList.add('card-loading-dim');
  });
}

/**
 * Load Tide & Celestial Data for the active station
 */
async function loadDashboardData(showLoadingIndicator = false) {
  const fetchId = ++currentFetchId;
  state.isLoading = true;
  refreshIcon.style.animation = 'spin 0.8s linear infinite';

  if (showLoadingIndicator) {
    showDashboardLoading();
  }

  try {
    const now = new Date();

    // 1. Calculate Celestial Data (Spring, Perigean, King Tides)
    state.celestialData = getCelestialOverview(now);

    // 2. Query NOAA CO-OPS Tide Data
    const tideData = await getStationTideData(state.activeStation, now);

    // If a newer location request was initiated while this one was in flight, ignore this stale result
    if (fetchId !== currentFetchId) {
      return;
    }

    state.tideData = tideData;

    // 3. Render all components
    renderComponents();
  } catch (err) {
    if (fetchId === currentFetchId) {
      console.error('Failed to load dashboard data:', err);
    }
  } finally {
    if (fetchId === currentFetchId) {
      state.isLoading = false;
      refreshIcon.style.animation = 'none';
    }
  }
}

/**
 * Render all dashboard components with current state
 */
function renderComponents() {
  renderTideGauge(currentGaugeContainer, state.tideData, state.unit);
  renderPredictions(predictionsContainer, state.tideData, state.unit, state.use24Hour);
  renderTideChart(chartContainer, state.tideData, state.unit, state.use24Hour, state.chartHours);
  renderExtremeTides(extremeTidesContainer, state.celestialData, state.use24Hour);
}

/**
 * Handle selection of a new station (via search, GPS, or hubs)
 */
async function handleStationSelect(newStation, customLabel = null) {
  state.activeStation = {
    ...newStation,
    customLabel
  };
  localStorage.setItem('tides_station', JSON.stringify(state.activeStation));

  // Update Location Bar immediately
  renderLocationPicker(locationContainer, state.activeStation, handleStationSelect);

  // Reload data immediately for this station with loading indicator
  await loadDashboardData(true);
}

/**
 * Setup Auto-Refresh (Every 5 minutes)
 */
function setupAutoRefresh() {
  if (state.autoRefreshInterval) clearInterval(state.autoRefreshInterval);
  state.autoRefreshInterval = setInterval(() => {
    console.info('Auto-refreshing tide data...');
    loadDashboardData();
  }, 5 * 60 * 1000);
}

/**
 * Attach Header Control Button Listeners
 */
function setupHeaderListeners() {
  // Toggle Feet / Meters
  unitToggleBtn.addEventListener('click', () => {
    state.unit = state.unit === 'ft' ? 'm' : 'ft';
    localStorage.setItem('tides_unit', state.unit);
    updateHeaderControlLabels();
    renderComponents();
  });

  // Toggle 12h / 24h
  timeFormatToggleBtn.addEventListener('click', () => {
    state.use24Hour = !state.use24Hour;
    localStorage.setItem('tides_24h', state.use24Hour);
    updateHeaderControlLabels();
    renderComponents();
  });

  // Toggle Google TV Kiosk Display Mode
  tvModeToggleBtn.addEventListener('click', () => {
    state.isTvMode = !state.isTvMode;
    localStorage.setItem('tides_tv', state.isTvMode);
    document.body.classList.toggle('tv-kiosk-mode', state.isTvMode);
    updateHeaderControlLabels();

    // If TV Mode activated, attempt Fullscreen
    if (state.isTvMode && document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else if (!state.isTvMode && document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
  });

  // Manual Refresh
  refreshDataBtn.addEventListener('click', () => {
    loadDashboardData();
  });
}

/**
 * Google TV Remote & Keyboard D-Pad Navigation
 */
function setupKeyboardNavigation() {
  window.addEventListener('keydown', (e) => {
    // Quick Hotkeys
    if (e.key === 't' || e.key === 'T') {
      if (document.activeElement.tagName !== 'INPUT') {
        tvModeToggleBtn.click();
      }
    } else if (e.key === 'f' || e.key === 'F') {
      if (document.activeElement.tagName !== 'INPUT') {
        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen().catch(() => {});
        } else {
          document.exitFullscreen().catch(() => {});
        }
      }
    } else if (e.key === 'u' || e.key === 'U') {
      if (document.activeElement.tagName !== 'INPUT') {
        unitToggleBtn.click();
      }
    } else if (e.key === 'r' || e.key === 'R') {
      if (document.activeElement.tagName !== 'INPUT') {
        refreshDataBtn.click();
      }
    }

    // D-Pad / Arrow keys navigation between focusable elements
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
      const focusable = Array.from(
        document.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
      ).filter(el => el.offsetParent !== null && !el.disabled);

      const index = focusable.indexOf(document.activeElement);
      if (index === -1) {
        if (focusable.length > 0) focusable[0].focus();
        return;
      }

      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        const next = (index + 1) % focusable.length;
        focusable[next].focus();
        e.preventDefault();
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        const prev = (index - 1 + focusable.length) % focusable.length;
        focusable[prev].focus();
        e.preventDefault();
      }
    }
  });
}

// Start app on DOMContentLoaded
window.addEventListener('DOMContentLoaded', init);
