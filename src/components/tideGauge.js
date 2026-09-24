/**
 * Prominent Tide Gauge & Tide Clock Component (Top Left)
 * Visually represents water level, rising/falling status, MLLW height, and cycle progress.
 */

import { formatHeight, formatCountdown } from '../utils/formatters.js';

export function renderTideGauge(container, tideData, unit = 'ft') {
  if (!tideData) {
    container.innerHTML = `
      <div class="gauge-loading card-glass">
        <div class="skeleton-pulse circle-skeleton"></div>
        <div class="skeleton-pulse text-skeleton"></div>
      </div>
    `;
    return;
  }

  const {
    currentHeight,
    isRising,
    statusText,
    nextTide,
    levelPercentage,
    minRange,
    maxRange,
    isRealtimeSensor,
    station
  } = tideData;

  // Height display in current unit
  const heightStr = formatHeight(currentHeight, unit, false);
  const minRangeStr = formatHeight(minRange, unit, false);
  const maxRangeStr = formatHeight(maxRange, unit, false);

  // Countdown to next tide event
  const cd = nextTide ? formatCountdown(nextTide.parsedDate) : null;
  const nextTypeStr = nextTide ? (nextTide.type === 'H' ? 'High Tide' : 'Low Tide') : 'Turn';
  const countdownStr = cd ? `${nextTypeStr} ${cd.text}` : '--';

  // SVG Wave dynamic offset based on water percentage (0% to 100%)
  // SVG viewBox is 0 0 200 200. Center is (100, 100), radius 78.
  // Water level Y spans from 170 (empty) to 30 (full)
  const waterY = 170 - (levelPercentage / 100) * 140;

  // Wave path generator
  const wavePath1 = `M 15 ${waterY} Q 60 ${waterY - 8}, 100 ${waterY} T 185 ${waterY} L 185 185 L 15 185 Z`;
  const wavePath2 = `M 15 ${waterY + 2} Q 50 ${waterY + 6}, 100 ${waterY + 2} T 185 ${waterY + 2} L 185 185 L 15 185 Z`;

  // Status icon and color class
  const statusClass = isRising ? 'status-rising' : 'status-falling';
  const arrowIcon = isRising ? '▲' : '▼';
  const arrowDirection = isRising ? 'Rising' : 'Falling';

  container.innerHTML = `
    <div class="tide-gauge-card card-glass">
      <div class="card-header">
        <div class="header-left">
          <span class="card-tag">Current Status</span>
          <span class="sensor-badge ${isRealtimeSensor ? 'badge-sensor' : 'badge-pred'}">
            ${isRealtimeSensor ? '● Live Sensor' : '○ NOAA Prediction'}
          </span>
        </div>
        <div class="status-indicator ${statusClass}">
          <span class="status-arrow">${arrowIcon}</span>
          <span class="status-label">${arrowDirection}</span>
        </div>
      </div>

      <div class="gauge-display-wrap">
        <div class="tide-dial">
          <svg class="tide-dial-svg" viewBox="0 0 200 200">
            <defs>
              <linearGradient id="gaugeBgGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stop-color="#0b1e36" stop-opacity="0.8" />
                <stop offset="100%" stop-color="#050e1a" stop-opacity="0.95" />
              </linearGradient>

              <linearGradient id="waterGradPrimary" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#0284c7" stop-opacity="0.8" />
                <stop offset="50%" stop-color="#0ea5e9" stop-opacity="0.85" />
                <stop offset="100%" stop-color="#14b8a6" stop-opacity="0.9" />
              </linearGradient>

              <linearGradient id="waterGradSecondary" x1="0%" y1="100%" x2="100%" y2="0%">
                <stop offset="0%" stop-color="#0369a1" stop-opacity="0.4" />
                <stop offset="100%" stop-color="#2dd4bf" stop-opacity="0.5" />
              </linearGradient>

              <clipPath id="circleClip">
                <circle cx="100" cy="100" r="82" />
              </clipPath>

              <filter id="waterGlow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>

            <!-- Outer Dial Ring -->
            <circle cx="100" cy="100" r="92" class="dial-outer-track" />
            <circle cx="100" cy="100" r="82" fill="url(#gaugeBgGrad)" class="dial-inner-bg" />

            <!-- Dial Ticks (High, Mid, Low) -->
            <line x1="100" y1="10" x2="100" y2="18" class="dial-tick tick-high" />
            <line x1="100" y1="182" x2="100" y2="190" class="dial-tick tick-low" />
            <line x1="10" y1="100" x2="18" y2="100" class="dial-tick" />
            <line x1="182" y1="100" x2="190" y2="100" class="dial-tick" />

            <!-- Labels on ring -->
            <text x="100" y="27" text-anchor="middle" class="dial-label-text high-label">HIGH</text>
            <text x="100" y="177" text-anchor="middle" class="dial-label-text low-label">LOW</text>

            <!-- Clipped Wave Water Level -->
            <g clip-path="url(#circleClip)">
              <path d="${wavePath2}" fill="url(#waterGradSecondary)" class="wave-layer-back" />
              <path d="${wavePath1}" fill="url(#waterGradPrimary)" class="wave-layer-front" filter="url(#waterGlow)" />
            </g>

            <!-- Dial Bezel Glow -->
            <circle cx="100" cy="100" r="82" class="dial-bezel-border" />
          </svg>

          <!-- Centered Numerical Readout Overlay -->
          <div class="gauge-center-content">
            <div class="gauge-height-number">${heightStr}</div>
            <div class="gauge-datum-badge">
              <span class="datum-tag">MLLW</span>
              <span class="datum-tooltip" title="Mean Lower Low Water: The average of the lower low water height of each tidal day observed over the National Tidal Datum Epoch.">ⓘ</span>
            </div>
            <div class="gauge-water-pct">${levelPercentage}% of Cycle</div>
          </div>
        </div>
      </div>

      <!-- Bottom Card Metadata -->
      <div class="gauge-footer">
        <div class="next-turn-banner ${statusClass}">
          <div class="turn-icon">${isRising ? '↗' : '↘'}</div>
          <div class="turn-info">
            <div class="turn-title">${countdownStr}</div>
            <div class="turn-sub">${nextTide ? `Expected ${formatHeight(nextTide.value, unit)}` : ''}</div>
          </div>
        </div>

        <div class="tidal-range-bar-wrap">
          <div class="range-labels">
            <span class="range-min">Low: ${minRangeStr}</span>
            <span class="range-cur">Current: ${heightStr}</span>
            <span class="range-max">High: ${maxRangeStr}</span>
          </div>
          <div class="range-track">
            <div class="range-progress" style="width: ${levelPercentage}%"></div>
            <div class="range-thumb" style="left: ${levelPercentage}%"></div>
          </div>
        </div>
      </div>
    </div>
  `;
}
