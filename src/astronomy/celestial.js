/**
 * High-precision Celestial Mechanics & Astronomical Calculations for Tides
 * Computes:
 * 1. Lunar distance, orbital position & phase angle (Meeus algorithm)
 * 2. Next Spring Tides (Syzygy: New Moon & Full Moon alignment)
 * 3. Next Perigean Tides (Lunar Perigee closest approach)
 * 4. Next King Tides (Perigean Spring Tides: Coincidence of Syzygy + Perigee)
 */

const TO_RAD = Math.PI / 180;
const TO_DEG = 180 / Math.PI;

/**
 * Compute lunar ephemeris at a given Date
 */
export function getLunarDetails(date = new Date()) {
  const t = date.getTime();
  const d = (t / 86400000) - 10957.5; // Days since 2000 Jan 1 12h TT

  // Mean orbital elements (degrees)
  const L = (218.316 + 13.176396 * d) % 360; // Moon's mean longitude
  const M = ((134.963 + 13.064993 * d) % 360 + 360) % 360; // Moon's mean anomaly
  const F = ((93.272 + 13.229350 * d) % 360 + 360) % 360;  // Moon's argument of latitude
  const D = ((297.850 + 12.190749 * d) % 360 + 360) % 360; // Mean elongation

  // Lunar distance from Earth in kilometers
  const distKm = 385000 
    - 20905 * Math.cos(M * TO_RAD) 
    - 3699 * Math.cos((2 * D - M) * TO_RAD) 
    - 2956 * Math.cos(2 * D * TO_RAD)
    - 570 * Math.cos(2 * M * TO_RAD);

  // Phase angle: 0 deg = New Moon, 180 deg = Full Moon
  const phaseAngle = D;
  const illuminated = (1 - Math.cos(phaseAngle * TO_RAD)) / 2;

  // Phase name
  let phaseName = 'New Moon';
  if (phaseAngle >= 350 || phaseAngle < 10) phaseName = 'New Moon';
  else if (phaseAngle >= 10 && phaseAngle < 80) phaseName = 'Waxing Crescent';
  else if (phaseAngle >= 80 && phaseAngle < 100) phaseName = 'First Quarter';
  else if (phaseAngle >= 100 && phaseAngle < 170) phaseName = 'Waxing Gibbous';
  else if (phaseAngle >= 170 && phaseAngle < 190) phaseName = 'Full Moon';
  else if (phaseAngle >= 190 && phaseAngle < 260) phaseName = 'Waning Gibbous';
  else if (phaseAngle >= 260 && phaseAngle < 280) phaseName = 'Last Quarter';
  else phaseName = 'Waning Crescent';

  return {
    distKm: Math.round(distKm),
    distMiles: Math.round(distKm * 0.621371),
    phaseAngle,
    illuminated: Math.round(illuminated * 100),
    phaseName,
    meanAnomaly: M
  };
}

/**
 * Find upcoming Syzygies (New Moon & Full Moon)
 * which generate Spring Tides (maximum tidal range).
 */
export function findUpcomingSpringTides(startDate = new Date(), count = 3) {
  const results = [];
  let t = startDate.getTime();
  const step = 3600000 * 2; // 2 hour coarse step
  let prevAngle = getLunarDetails(new Date(t)).phaseAngle;

  for (let i = 0; i < 90 * 12 && results.length < count; i++) {
    t += step;
    const curAngle = getLunarDetails(new Date(t)).phaseAngle;

    // Detect zero crossing (New Moon) or 180 crossing (Full Moon)
    const isNew = (prevAngle > 330 && curAngle < 30);
    const isFull = (prevAngle < 180 && curAngle >= 180);

    if (isNew || isFull) {
      let bestT = t;
      let minDiff = 999;
      // Refine to within 5 minutes
      for (let fine = t - step; fine <= t + step; fine += 60000 * 5) {
        const a = getLunarDetails(new Date(fine)).phaseAngle;
        const diff = isNew ? Math.min(a, 360 - a) : Math.abs(a - 180);
        if (diff < minDiff) {
          minDiff = diff;
          bestT = fine;
        }
      }
      const eventDate = new Date(bestT);
      if (eventDate.getTime() > startDate.getTime()) {
        results.push({
          type: isNew ? 'New Moon' : 'Full Moon',
          date: eventDate,
          details: getLunarDetails(eventDate)
        });
      }
    }
    prevAngle = curAngle;
  }
  return results;
}

/**
 * Find upcoming Lunar Perigees (closest approach to Earth).
 * Lunar distance is minimized (~356,000 - 370,000 km).
 */
export function findUpcomingPerigees(startDate = new Date(), count = 3) {
  const results = [];
  let t = startDate.getTime();
  const step = 3600000 * 3; // 3 hour coarse step
  let prevDist = getLunarDetails(new Date(t)).distKm;
  let decreasing = false;

  for (let i = 0; i < 90 * 8 && results.length < count; i++) {
    t += step;
    const curDist = getLunarDetails(new Date(t)).distKm;
    if (curDist < prevDist) decreasing = true;

    if (decreasing && curDist > prevDist) {
      // Local minimum bracketed
      let bestT = t - step;
      let minD = prevDist;
      for (let fine = t - 2 * step; fine <= t; fine += 60000 * 10) {
        const d = getLunarDetails(new Date(fine)).distKm;
        if (d < minD) {
          minD = d;
          bestT = fine;
        }
      }
      const eventDate = new Date(bestT);
      if (eventDate.getTime() > startDate.getTime()) {
        results.push({
          date: eventDate,
          distanceKm: Math.round(minD),
          distanceMiles: Math.round(minD * 0.621371)
        });
      }
      decreasing = false;
    }
    prevDist = curDist;
  }
  return results;
}

/**
 * Find upcoming King Tides (Perigean Spring Tides).
 * Occurs when a Spring Tide (New or Full Moon) coincides within ~36-48 hours of Perigee.
 */
export function findUpcomingKingTides(startDate = new Date(), count = 3) {
  const syzygies = findUpcomingSpringTides(startDate, 24);
  const perigees = findUpcomingPerigees(startDate, 24);
  const kingTides = [];

  for (const s of syzygies) {
    for (const p of perigees) {
      const diffHours = Math.abs(s.date.getTime() - p.date.getTime()) / 3600000;
      // King Tides occur when Syzygy and Perigee align within 48 hours
      if (diffHours <= 48) {
        // The peak tidal height occurs right around the syzygy or perigee (usually closest high tide)
        const peakTime = Math.min(s.date.getTime(), p.date.getTime()) + (Math.abs(s.date.getTime() - p.date.getTime()) / 2);
        const peakDate = new Date(peakTime);
        
        if (peakDate.getTime() > startDate.getTime()) {
          kingTides.push({
            syzygyType: s.type,
            syzygyDate: s.date,
            perigeeDate: p.date,
            peakDate,
            diffHours: Math.round(diffHours * 10) / 10,
            perigeeDistanceKm: p.distanceKm,
            perigeeDistanceMiles: p.distanceMiles
          });
        }
      }
    }
  }

  // Sort by peak date and return unique events
  kingTides.sort((a, b) => a.peakDate.getTime() - b.peakDate.getTime());
  
  // Deduplicate events that are within 5 days of each other
  const filtered = [];
  for (const kt of kingTides) {
    if (!filtered.some(f => Math.abs(f.peakDate.getTime() - kt.peakDate.getTime()) < 5 * 86400000)) {
      filtered.push(kt);
    }
    if (filtered.length >= count) break;
  }
  return filtered;
}

/**
 * Get comprehensive celestial status for dashboard
 */
export function getCelestialOverview(now = new Date()) {
  const currentLunar = getLunarDetails(now);
  const springTides = findUpcomingSpringTides(now, 2);
  const perigees = findUpcomingPerigees(now, 2);
  const kingTides = findUpcomingKingTides(now, 3);

  return {
    current: currentLunar,
    nextSpringTide: springTides[0] || null,
    nextPerigee: perigees[0] || null,
    nextKingTide: kingTides[0] || null,
    upcomingKingTides: kingTides
  };
}
