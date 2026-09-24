/**
 * Station Management, Municipal Geocoding & Location Matching (Standalone)
 */

import { calculateDistance } from '../utils/haversine.js';

let stationsCache = null;

export const POPULAR_COASTAL_HUBS = [
  { id: '8518750', name: 'The Battery, New York', state: 'NY', lat: 40.7006, lng: -74.0142, label: 'New York, NY' },
  { id: '9414290', name: 'San Francisco, Golden Gate', state: 'CA', lat: 37.8067, lng: -122.465, label: 'San Francisco, CA' },
  { id: '8723214', name: 'Virginia Key, Biscayne Bay', state: 'FL', lat: 25.7314, lng: -80.1619, label: 'Miami, FL' },
  { id: '8443970', name: 'Boston Harbor', state: 'MA', lat: 42.3539, lng: -71.0503, label: 'Boston, MA' },
  { id: '9447130', name: 'Seattle, Elliott Bay', state: 'WA', lat: 47.6019, lng: -122.3392, label: 'Seattle, WA' },
  { id: '9410170', name: 'San Diego, Broadway Pier', state: 'CA', lat: 32.7142, lng: -117.1733, label: 'San Diego, CA' },
  { id: '1612340', name: 'Honolulu Harbor', state: 'HI', lat: 21.3067, lng: -157.867, label: 'Honolulu, HI' },
  { id: '8771450', name: 'Galveston Pier 21', state: 'TX', lat: 29.31, lng: -94.7933, label: 'Galveston, TX' },
  { id: '8413320', name: 'Bar Harbor, Frenchmans Bay', state: 'ME', lat: 44.3917, lng: -68.205, label: 'Bar Harbor, ME' }
];

/**
 * Load the full 3,499 NOAA stations catalog
 */
export async function loadStations() {
  if (stationsCache) return stationsCache;
  try {
    const stationsUrl = new URL('stations.json', window.location.href).href;
    const res = await fetch(stationsUrl);
    if (res.ok) {
      stationsCache = await res.json();
      return stationsCache;
    }
  } catch (err) {
    console.warn('Could not load local stations.json, falling back to hubs:', err);
  }
  stationsCache = POPULAR_COASTAL_HUBS;
  return stationsCache;
}

/**
 * Find the nearest NOAA station to a given coordinate (lat, lng)
 */
export async function findNearestStation(lat, lng) {
  const stations = await loadStations();
  let closest = null;
  let minDistance = Infinity;

  for (const s of stations) {
    const { miles, km } = calculateDistance(lat, lng, s.lat, s.lng);
    if (miles < minDistance) {
      minDistance = miles;
      closest = {
        ...s,
        distanceMiles: Math.round(miles * 10) / 10,
        distanceKm: Math.round(km * 10) / 10
      };
    }
  }
  return closest;
}

/**
 * Search stations by municipal name, harbor name, or state
 */
export async function searchStations(query, limit = 10) {
  if (!query || query.trim().length < 2) return [];
  const stations = await loadStations();
  const q = query.toLowerCase().trim().replace(/[,]+/g, ' ');
  const parts = q.split(/\s+/).filter(Boolean);

  const scored = [];
  for (const s of stations) {
    const name = (s.name || '').toLowerCase();
    const state = (s.state || '').toLowerCase();
    const id = String(s.id || '');

    let score = 0;
    // Exact ID match
    if (id === q) score += 1000;

    // Full name matches
    if (name === q) score += 500;
    else if (name.startsWith(q)) score += 300;
    else if (name.includes(q)) score += 200;

    // Token matching (e.g. "narragansett" + "ri")
    let matchedTokens = 0;
    for (const p of parts) {
      if (p.length === 2 && state === p) {
        score += 150;
        matchedTokens++;
      } else if (name.includes(p)) {
        score += (p.length > 2 ? 100 : 20);
        matchedTokens++;
      }
    }

    // Bonus if all query words matched
    if (matchedTokens === parts.length) {
      score += 250;
    }

    if (score >= 200 || (parts.length > 1 && matchedTokens === parts.length)) {
      scored.push({ station: s, score });
    }
  }

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map(item => item.station);
}

/**
 * Geocode an arbitrary municipal name using OpenStreetMap Nominatim
 * and locate the closest coastal tide station (direct browser request)
 */
export async function geocodeMunicipalLocation(municipalName) {
  if (!municipalName || !municipalName.trim()) return null;

  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(municipalName)}&format=json&limit=1`;
    const res = await fetch(url, {
      headers: { 'Accept': 'application/json' }
    });
    if (res.ok) {
      const data = await res.json();
      if (data && data.length > 0) {
        const lat = parseFloat(data[0].lat);
        const lng = parseFloat(data[0].lon);
        const nearest = await findNearestStation(lat, lng);
        return {
          query: municipalName,
          resolvedLocation: data[0].display_name,
          targetLat: lat,
          targetLng: lng,
          station: nearest
        };
      }
    }
  } catch (err) {
    console.warn('Municipal geocoding error:', err);
  }
  return null;
}
