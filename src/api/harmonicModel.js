/**
 * Astronomical Harmonic Tidal Constituent Model (Global / Offline Fallback)
 * Provides realistic MLLW tide curves and high/low predictions for any coordinate
 * based on principal tidal constituents:
 * M2 (Principal lunar semidiurnal, 12.42h)
 * S2 (Principal solar semidiurnal, 12.00h)
 * N2 (Larger lunar elliptic semidiurnal, 12.66h)
 * K1 (Lunar diurnal, 23.93h)
 * O1 (Lunar diurnal, 25.82h)
 */

export function generateHarmonicTideData(lat, lng, startDate = new Date(), hours = 48) {
  // Realistic coastal tidal amplitude (half of peak-to-trough range)
  // Typical coastal tidal range is 3.0 to 5.5 ft -> semi-amplitude of 1.5 to 2.8 ft
  const absLat = Math.abs(lat);
  let totalRange = 3.8; // Standard mean coastal range in feet (~3.8 ft)

  // Regional realistic tidal ranges
  if (absLat < 30 && lng > -98 && lng < -80) {
    totalRange = 2.2; // Gulf of Mexico & South Florida (micro-tidal: 1.5 - 2.5 ft)
  } else if (absLat > 42 && lng < -67 && lng > -72) {
    totalRange = 9.0; // Northern Gulf of Maine / Bay of Fundy approach
  } else if (absLat > 46 && lng < -120 && lng > -128) {
    totalRange = 7.5; // Puget Sound / Pacific Northwest
  } else if (absLat > 32 && absLat < 42 && lng < -116 && lng > -126) {
    totalRange = 4.8; // California coast (mixed semidiurnal: ~4.5 - 5.5 ft)
  } else {
    totalRange = 3.6 + Math.sin(absLat * (Math.PI / 180)) * 1.5; // Default ~3.6 to 4.8 ft
  }

  // Amplitude = half of total range
  const targetAmplitude = totalRange / 2;

  // Periods in hours
  const M2_PERIOD = 12.4206012; // Principal lunar semidiurnal
  const S2_PERIOD = 12.0000000; // Principal solar semidiurnal
  const N2_PERIOD = 12.6583475; // Larger lunar elliptic
  const K1_PERIOD = 23.9344721; // Lunar diurnal
  const O1_PERIOD = 25.8193387; // Principal lunar diurnal

  // Relative constituent weights normalized to sum to 1.0
  const wM2 = 0.50;
  const wS2 = 0.20;
  const wN2 = 0.10;
  const wK1 = 0.12;
  const wO1 = 0.08;

  // Phase offsets derived deterministically from location
  const phiM2 = ((lng * 0.1) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI);
  const phiS2 = ((lng * 0.12) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI);
  const phiK1 = ((lat * 0.15) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI);

  const startMs = startDate.getTime();
  const stepMinutes = 6;
  const totalSteps = Math.floor((hours * 60) / stepMinutes);

  const rawPredictions = [];
  let minRaw = Infinity;

  for (let i = 0; i <= totalSteps; i++) {
    const tMs = startMs + i * stepMinutes * 60 * 1000;
    const tHours = (tMs - 946728000000) / 3600000; // hours since Jan 1 2000

    const m2 = wM2 * targetAmplitude * Math.cos((2 * Math.PI * tHours / M2_PERIOD) - phiM2);
    const s2 = wS2 * targetAmplitude * Math.cos((2 * Math.PI * tHours / S2_PERIOD) - phiS2);
    const n2 = wN2 * targetAmplitude * Math.cos((2 * Math.PI * tHours / N2_PERIOD) - phiM2 * 0.8);
    const k1 = wK1 * targetAmplitude * Math.cos((2 * Math.PI * tHours / K1_PERIOD) - phiK1);
    const o1 = wO1 * targetAmplitude * Math.cos((2 * Math.PI * tHours / O1_PERIOD) - phiK1 * 0.9);

    const val = m2 + s2 + n2 + k1 + o1;
    if (val < minRaw) minRaw = val;

    rawPredictions.push({
      timeMs: tMs,
      iso: new Date(tMs).toISOString().replace('T', ' ').substring(0, 16),
      raw: val
    });
  }

  // Reference to MLLW: low water datum sits near ~0.2 ft above absolute minimum
  const mllwOffset = Math.abs(minRaw) + 0.2;
  const normalized = rawPredictions.map(p => ({
    t: p.iso,
    v: (p.raw + mllwOffset).toFixed(3),
    parsedDate: new Date(p.timeMs),
    value: parseFloat((p.raw + mllwOffset).toFixed(3))
  }));

  // Detect High / Low peaks
  const hiLos = [];
  for (let i = 1; i < normalized.length - 1; i++) {
    const prev = normalized[i - 1].value;
    const curr = normalized[i].value;
    const next = normalized[i + 1].value;

    if (curr > prev && curr > next) {
      hiLos.push({
        t: normalized[i].t,
        v: curr.toFixed(3),
        value: curr,
        type: 'H',
        parsedDate: normalized[i].parsedDate
      });
    } else if (curr < prev && curr < next) {
      hiLos.push({
        t: normalized[i].t,
        v: curr.toFixed(3),
        value: curr,
        type: 'L',
        parsedDate: normalized[i].parsedDate
      });
    }
  }

  return {
    predictions: normalized,
    hiLos
  };
}
