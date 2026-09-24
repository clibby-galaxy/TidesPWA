/**
 * Immediate Predictions Component (Top Right)
 * Two parallel panels clearly displaying "Next High Tide" and "Next Low Tide"
 * with timing, MLLW height, countdown badges, and upcoming tidal schedule.
 */

import { formatHeight, formatTime, formatDate, formatCountdown } from '../utils/formatters.js';

export function renderPredictions(container, tideData, unit = 'ft', use24Hour = false) {
  if (!tideData) {
    container.innerHTML = `
      <div class="predictions-loading card-glass">
        <div class="skeleton-pulse panel-skeleton"></div>
        <div class="skeleton-pulse panel-skeleton"></div>
      </div>
    `;
    return;
  }

  const { nextHigh, nextLow, hiLoList } = tideData;

  // Next High Tide calculations
  const highCd = nextHigh ? formatCountdown(nextHigh.parsedDate) : null;
  const highTimeStr = nextHigh ? formatTime(nextHigh.parsedDate, use24Hour) : '--:--';
  const highDateStr = nextHigh ? formatDate(nextHigh.parsedDate, true) : '';
  const highHeightStr = nextHigh ? formatHeight(nextHigh.value, unit) : '--';

  // Next Low Tide calculations
  const lowCd = nextLow ? formatCountdown(nextLow.parsedDate) : null;
  const lowTimeStr = nextLow ? formatTime(nextLow.parsedDate, use24Hour) : '--:--';
  const lowDateStr = nextLow ? formatDate(nextLow.parsedDate, true) : '';
  const lowHeightStr = nextLow ? formatHeight(nextLow.value, unit) : '--';

  // Subsequent scheduled high/lows (skipping the immediate Next High and Next Low)
  const nowMs = new Date().getTime();
  const nextHighTime = nextHigh?.parsedDate ? nextHigh.parsedDate.getTime() : null;
  const nextLowTime = nextLow?.parsedDate ? nextLow.parsedDate.getTime() : null;

  const upcomingHiLos = (hiLoList || [])
    .filter(item => {
      const t = item.parsedDate.getTime();
      return t > nowMs && t !== nextHighTime && t !== nextLowTime;
    })
    .slice(0, 4);

  container.innerHTML = `
    <div class="immediate-predictions-container">
      <div class="parallel-panels">
        <!-- Next High Tide Panel -->
        <div class="prediction-card card-glass card-high-tide">
          <div class="pred-card-header">
            <div class="pred-title-group">
              <span class="pred-icon crest-icon">🌊</span>
              <h3 class="pred-title">Next High Tide</h3>
            </div>
            <span class="pred-countdown-badge badge-high">
              ${highCd ? highCd.text : 'Soon'}
            </span>
          </div>

          <div class="pred-body">
            <div class="pred-time-row">
              <span class="pred-time">${highTimeStr}</span>
              <span class="pred-date">${highDateStr}</span>
            </div>
            <div class="pred-height-row">
              <span class="pred-height-value">${highHeightStr}</span>
              <span class="pred-datum-tag">relative to MLLW</span>
            </div>
          </div>

          <div class="pred-wave-visual crest-visual">
            <svg viewBox="0 0 120 28" class="mini-crest-svg">
              <path d="M0 24 Q30 2, 60 14 T120 4" fill="none" stroke="#38bdf8" stroke-width="2.5" stroke-linecap="round"/>
              <circle cx="60" cy="14" r="3.5" fill="#00f5d4" stroke="#08121e" stroke-width="1.5"/>
            </svg>
          </div>
        </div>

        <!-- Next Low Tide Panel -->
        <div class="prediction-card card-glass card-low-tide">
          <div class="pred-card-header">
            <div class="pred-title-group">
              <span class="pred-icon trough-icon">🏖️</span>
              <h3 class="pred-title">Next Low Tide</h3>
            </div>
            <span class="pred-countdown-badge badge-low">
              ${lowCd ? lowCd.text : 'Soon'}
            </span>
          </div>

          <div class="pred-body">
            <div class="pred-time-row">
              <span class="pred-time">${lowTimeStr}</span>
              <span class="pred-date">${lowDateStr}</span>
            </div>
            <div class="pred-height-row">
              <span class="pred-height-value">${lowHeightStr}</span>
              <span class="pred-datum-tag">relative to MLLW</span>
            </div>
          </div>

          <div class="pred-wave-visual trough-visual">
            <svg viewBox="0 0 120 28" class="mini-trough-svg">
              <path d="M0 4 Q30 26, 60 14 T120 24" fill="none" stroke="#2dd4bf" stroke-width="2.5" stroke-linecap="round"/>
              <circle cx="60" cy="14" r="3.5" fill="#fbbf24" stroke="#08121e" stroke-width="1.5"/>
            </svg>
          </div>
        </div>
      </div>

      <!-- Schedule Ribbon (Subsequent Tides) -->
      <div class="schedule-ribbon card-glass">
        <div class="ribbon-title">Subsequent Tides</div>
        <div class="ribbon-items">
          ${upcomingHiLos.map(item => {
            const isH = item.type === 'H';
            const time = formatTime(item.parsedDate, use24Hour);
            const date = formatDate(item.parsedDate, false);
            const height = formatHeight(item.value, unit);
            const cd = formatCountdown(item.parsedDate);
            return `
              <div class="ribbon-item ${isH ? 'item-high' : 'item-low'}">
                <span class="item-tag">${isH ? 'High' : 'Low'}</span>
                <span class="item-time">${date} ${time}</span>
                <span class="item-height">${height}</span>
                <span class="item-rel">${cd.text}</span>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    </div>
  `;
}
