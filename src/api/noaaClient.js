/**
 * NOAA CO-OPS API Client
 * Queries free official US tide predictions and water levels relative to MLLW.
 */

import { generateHarmonicTideData } from './harmonicModel.js';

const NOAA_BASE_URL = 'https://api.tidesandcurrents.noaa.gov/api/prod/datagetter';

/**
 * Format a Date object as YYYYMMDD for NOAA API
 */
function formatDateParam(d) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}${month}${day}`;
}

/**
 * Parse NOAA timestamp (e.g., "2026-09-16 17:30") into a JS Date
 */
export function parseNoaaTime(timeStr) {
  if (!timeStr) return new Date();
  // Standardize "YYYY-MM-DD HH:MM" to "YYYY-MM-DDTHH:MM:00"
  const iso = timeStr.replace(' ', 'T') + ':00';
  return new Date(iso);
}

/**
 * Fetch high/low tide predictions from NOAA
 */
export async function fetchHiLoPredictions(stationId, beginDate = new Date(), rangeHours = 72) {
  const bDate = formatDateParam(beginDate);
  const url = `${NOAA_BASE_URL}?begin_date=${bDate}&range=${rangeHours}&station=${stationId}&product=predictions&interval=hilo&datum=MLLW&time_zone=lst_ldt&units=english&format=json`;

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`NOAA API HTTP ${res.status}`);
    const data = await res.json();
    if (data.error) throw new Error(data.error.message || 'NOAA API Error');
    return data.predictions || [];
  } catch (err) {
    console.warn('Failed to fetch NOAA Hi/Lo predictions:', err.message);
    return null;
  }
}

/**
 * Fetch continuous 6-minute interval tide predictions from NOAA
 */
export async function fetchContinuousPredictions(stationId, beginDate = new Date(), rangeHours = 48) {
  const bDate = formatDateParam(beginDate);
  const url = `${NOAA_BASE_URL}?begin_date=${bDate}&range=${rangeHours}&station=${stationId}&product=predictions&datum=MLLW&time_zone=lst_ldt&units=english&format=json`;

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`NOAA API HTTP ${res.status}`);
    const data = await res.json();
    if (data.error) throw new Error(data.error.message || 'NOAA API Error');
    return data.predictions || [];
  } catch (err) {
    console.warn('Failed to fetch NOAA continuous predictions:', err.message);
    return null;
  }
}

/**
 * Fetch latest observed real-time water level from NOAA sensor (if available)
 */
export async function fetchLatestWaterLevel(stationId) {
  const url = `${NOAA_BASE_URL}?date=latest&station=${stationId}&product=water_level&datum=MLLW&time_zone=lst_ldt&units=english&format=json`;

  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    if (data.data && data.data.length > 0) {
      return {
        height: parseFloat(data.data[0].v),
        time: parseNoaaTime(data.data[0].t),
        timeStr: data.data[0].t,
        isObservation: true
      };
    }
  } catch (err) {
    // Some secondary harmonic stations only provide predictions, not real-time gauge telemetry
  }
  return null;
}

/**
 * Synthesize smooth continuous 6-minute tidal curve from NOAA High/Low points
 * using half-cosine spline interpolation
 */
export function synthesizeContinuousFromHiLos(hiLos, startMs, endMs, stepMin = 6) {
  if (!hiLos || hiLos.length < 2) return [];
  const sorted = [...hiLos].sort((a, b) => a.parsedDate.getTime() - b.parsedDate.getTime());
  const points = [];
  const stepMs = stepMin * 60 * 1000;

  for (let t = startMs; t <= endMs; t += stepMs) {
    let p1 = null, p2 = null;
    for (let i = 0; i < sorted.length - 1; i++) {
      const t1 = sorted[i].parsedDate.getTime();
      const t2 = sorted[i + 1].parsedDate.getTime();
      if (t >= t1 && t <= t2) {
        p1 = sorted[i];
        p2 = sorted[i + 1];
        break;
      }
    }

    if (p1 && p2) {
      const t1 = p1.parsedDate.getTime();
      const t2 = p2.parsedDate.getTime();
      const frac = (t - t1) / (t2 - t1);
      // Half-cosine curve between high and low tide peaks
      const cosFrac = (1 - Math.cos(frac * Math.PI)) / 2;
      const val = p1.value + cosFrac * (p2.value - p1.value);
      const isoStr = new Date(t).toISOString().replace('T', ' ').substring(0, 16);
      points.push({
        t: isoStr,
        v: val.toFixed(3),
        parsedDate: new Date(t),
        value: parseFloat(val.toFixed(3))
      });
    } else if (sorted.length > 0) {
      const closest = t < sorted[0].parsedDate.getTime() ? sorted[0] : sorted[sorted.length - 1];
      const isoStr = new Date(t).toISOString().replace('T', ' ').substring(0, 16);
      points.push({
        t: isoStr,
        v: closest.value.toFixed(3),
        parsedDate: new Date(t),
        value: closest.value
      });
    }
  }
  return points;
}

/**
 * Core function to assemble comprehensive tide data for a station
 */
export async function getStationTideData(station, referenceDate = new Date()) {
  const refTime = referenceDate.getTime();
  const stationId = station.id;

  // Query NOAA predictions (starting from 12 hours ago so we have previous high/lows)
  const startDate = new Date(refTime - 12 * 3600000);
  
  let [hiLos, continuous, latestObs] = await Promise.all([
    fetchHiLoPredictions(stationId, startDate, 72),
    fetchContinuousPredictions(stationId, startDate, 48),
    fetchLatestWaterLevel(stationId)
  ]);

  let isFallback = false;
  let parsedHiLos = [];
  let parsedContinuous = [];

  // If we got official NOAA Hi/Lo predictions:
  if (hiLos && hiLos.length > 0) {
    parsedHiLos = hiLos.map(item => ({
      ...item,
      parsedDate: parseNoaaTime(item.t),
      value: parseFloat(item.v),
      type: item.type // 'H' or 'L'
    }));

    if (continuous && continuous.length > 0) {
      parsedContinuous = continuous.map(item => ({
        ...item,
        parsedDate: parseNoaaTime(item.t),
        value: parseFloat(item.v)
      }));
    } else {
      // Subordinate station without continuous endpoint: synthesize smooth 6-min curve
      // directly through NOAA's actual High & Low points
      const endMs = startDate.getTime() + 48 * 3600000;
      parsedContinuous = synthesizeContinuousFromHiLos(parsedHiLos, startDate.getTime(), endMs);
    }
  } else {
    // Complete network failure or coordinates outside NOAA coverage
    console.info('Using astronomical harmonic model for station:', station.name);
    isFallback = true;
    const harmonic = generateHarmonicTideData(station.lat, station.lng, startDate, 48);
    parsedContinuous = harmonic.predictions;
    parsedHiLos = harmonic.hiLos;
  }

  // Find the closest high and low tides around referenceDate
  let pastTide = null;
  let nextTide = null;
  let nextHigh = null;
  let nextLow = null;

  for (let i = 0; i < parsedHiLos.length; i++) {
    const item = parsedHiLos[i];
    const t = item.parsedDate.getTime();

    if (t <= refTime) {
      pastTide = item;
    } else {
      if (!nextTide) nextTide = item;
      if (!nextHigh && item.type === 'H') nextHigh = item;
      if (!nextLow && item.type === 'L') nextLow = item;
    }
  }

  // Estimate current water level:
  // Use latest observation if fresh (< 2 hours old), otherwise interpolate from continuous predictions
  let currentHeight = null;
  let isRealtimeSensor = false;

  if (latestObs && Math.abs(latestObs.time.getTime() - refTime) < 2 * 3600000) {
    currentHeight = latestObs.height;
    isRealtimeSensor = true;
  } else {
    // Find closest continuous prediction points and linearly interpolate
    let prevPoint = parsedContinuous[0];
    let nextPoint = parsedContinuous[parsedContinuous.length - 1];

    for (let i = 0; i < parsedContinuous.length - 1; i++) {
      const p1 = parsedContinuous[i];
      const p2 = parsedContinuous[i + 1];
      if (p1.parsedDate.getTime() <= refTime && p2.parsedDate.getTime() >= refTime) {
        prevPoint = p1;
        nextPoint = p2;
        break;
      }
    }

    if (prevPoint && nextPoint && prevPoint !== nextPoint) {
      const span = nextPoint.parsedDate.getTime() - prevPoint.parsedDate.getTime();
      const frac = span > 0 ? (refTime - prevPoint.parsedDate.getTime()) / span : 0;
      currentHeight = prevPoint.value + frac * (nextPoint.value - prevPoint.value);
    } else if (prevPoint) {
      currentHeight = prevPoint.value;
    }
  }

  // Determine Rising / Falling status
  // If the next upcoming tide is High Tide ('H'), the water is Rising!
  // If the next upcoming tide is Low Tide ('L'), the water is Falling!
  let isRising = false;
  if (nextTide) {
    isRising = (nextTide.type === 'H');
  } else if (parsedContinuous.length > 2) {
    // check continuous slope
    const sampleIdx = parsedContinuous.findIndex(p => p.parsedDate.getTime() >= refTime);
    if (sampleIdx > 0 && sampleIdx < parsedContinuous.length) {
      isRising = parsedContinuous[sampleIdx].value >= parsedContinuous[sampleIdx - 1].value;
    }
  }

  // Calculate cycle progress (percentage between previous turn and next turn)
  let cycleProgress = 50;
  if (pastTide && nextTide) {
    const totalDuration = nextTide.parsedDate.getTime() - pastTide.parsedDate.getTime();
    const elapsed = refTime - pastTide.parsedDate.getTime();
    if (totalDuration > 0) {
      cycleProgress = Math.max(0, Math.min(100, Math.round((elapsed / totalDuration) * 100)));
    }
  }

  // Calculate water level percentage relative to recent low and upcoming high
  let levelPercentage = 50;
  let minRange = 0;
  let maxRange = 6;
  if (pastTide && nextTide) {
    const lowVal = Math.min(pastTide.value, nextTide.value);
    const highVal = Math.max(pastTide.value, nextTide.value);
    minRange = lowVal;
    maxRange = highVal;
    if (highVal > lowVal) {
      levelPercentage = Math.max(0, Math.min(100, Math.round(((currentHeight - lowVal) / (highVal - lowVal)) * 100)));
    }
  }

  return {
    station,
    currentHeight: currentHeight !== null ? parseFloat(currentHeight.toFixed(2)) : 0,
    isRising,
    statusText: isRising ? 'Rising' : 'Falling',
    isRealtimeSensor,
    isFallback,
    pastTide,
    nextTide,
    nextHigh,
    nextLow,
    cycleProgress,
    levelPercentage,
    minRange: parseFloat(minRange.toFixed(1)),
    maxRange: parseFloat(maxRange.toFixed(1)),
    continuousData: parsedContinuous,
    hiLoList: parsedHiLos,
    fetchedAt: new Date()
  };
}
