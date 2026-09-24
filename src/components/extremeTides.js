/**
 * Extreme Tides Countdowns Component (Bottom Row - 3 Distinct Vertical Columns)
 * 1. Spring Tide (Sun-Moon-Earth alignment / Syzygy graphic)
 * 2. Perigean Tide (Elliptical orbit / Perigee graphic)
 * 3. King Tide (Combined celestial mechanics / Extreme tide graphic)
 */

import { formatCountdown, formatDate, formatTime } from '../utils/formatters.js';

export function renderExtremeTides(container, celestialData, use24Hour = false) {
  if (!celestialData) {
    container.innerHTML = `
      <div class="extreme-loading card-glass">
        <div class="skeleton-pulse column-skeleton"></div>
        <div class="skeleton-pulse column-skeleton"></div>
        <div class="skeleton-pulse column-skeleton"></div>
      </div>
    `;
    return;
  }

  const { current, nextSpringTide, nextPerigee, nextKingTide, upcomingKingTides } = celestialData;
  const now = new Date();

  // Countdown calculations
  const springCd = nextSpringTide ? formatCountdown(nextSpringTide.date, now) : null;
  const perigeeCd = nextPerigee ? formatCountdown(nextPerigee.date, now) : null;
  const kingCd = nextKingTide ? formatCountdown(nextKingTide.peakDate, now) : null;

  container.innerHTML = `
    <div class="extreme-tides-section">
      <div class="section-title-wrap">
        <h2 class="section-title">Astronomical Extreme Tides</h2>
        <span class="section-subtitle">Long-term celestial mechanics driving maximum tidal variation</span>
      </div>

      <div class="three-columns-grid">
        <!-- COLUMN 1: SPRING TIDE -->
        <div class="extreme-column card-glass card-spring-tide" id="colSpringTide">
          <div class="column-header">
            <div class="column-tag-wrap">
              <span class="column-tag tag-spring">Fortnightly Cycle</span>
              <span class="column-period">Every ~14.8 Days</span>
            </div>
            <h3 class="column-title">Spring Tide</h3>
            <p class="column-sub">Maximum Tidal Range (Syzygy)</p>
          </div>

          <!-- Educational Graphic: Sun-Earth-Moon Alignment -->
          <div class="celestial-graphic-wrap">
            <svg viewBox="0 0 300 130" class="celestial-svg" id="springTideSvg">
              <defs>
                <radialGradient id="sunGlow" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stop-color="#fef08a" />
                  <stop offset="40%" stop-color="#f59e0b" />
                  <stop offset="100%" stop-color="#b45309" stop-opacity="0" />
                </radialGradient>
                <radialGradient id="earthGrad" cx="35%" cy="35%" r="65%">
                  <stop offset="0%" stop-color="#38bdf8" />
                  <stop offset="50%" stop-color="#0284c7" />
                  <stop offset="100%" stop-color="#0f172a" />
                </radialGradient>
                <linearGradient id="tidalBulgeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stop-color="#38bdf8" stop-opacity="0.5" />
                  <stop offset="50%" stop-color="#0284c7" stop-opacity="0.1" />
                  <stop offset="100%" stop-color="#38bdf8" stop-opacity="0.5" />
                </linearGradient>
              </defs>

              <!-- Syzygy Axis Line -->
              <line x1="15" y1="65" x2="285" y2="65" stroke="#38bdf8" stroke-width="1" stroke-dasharray="4 4" opacity="0.4" />

              <!-- Sun on Left -->
              <circle cx="28" cy="65" r="24" fill="url(#sunGlow)" />
              <circle cx="28" cy="65" r="14" fill="#fbbf24" />
              <text x="28" y="105" class="celestial-label" text-anchor="middle">SUN</text>

              <!-- Gravitational Force Vectors -->
              <path d="M 60 65 L 110 65" stroke="#f59e0b" stroke-width="1.5" marker-end="url(#arrow)" opacity="0.6" />
              <text x="85" y="58" class="vector-label" text-anchor="middle">Solar Pull</text>

              <!-- Earth in Center with Tidal Bulges -->
              <!-- Elliptical ocean tidal bulge aligned along the Sun-Moon axis -->
              <ellipse cx="150" cy="65" rx="36" ry="24" fill="url(#tidalBulgeGrad)" stroke="#38bdf8" stroke-width="1.5" stroke-dasharray="3 2" class="bulge-pulse" />
              <!-- Earth solid body -->
              <circle cx="150" cy="65" r="19" fill="url(#earthGrad)" stroke="#1e293b" stroke-width="1" />
              <text x="150" y="105" class="celestial-label" text-anchor="middle">EARTH</text>

              <!-- Moon on Right (New or Full Moon Alignment) -->
              <!-- Connecting alignment beam -->
              <ellipse cx="260" cy="65" rx="14" ry="14" fill="#cbd5e1" stroke="#94a3b8" stroke-width="1.5" />
              <path d="M 260 51 A 14 14 0 0 1 260 79 Z" fill="#475569" opacity="0.7" />
              <circle cx="260" cy="65" r="18" fill="none" stroke="#e2e8f0" stroke-width="1" stroke-dasharray="2 2" opacity="0.5" />
              <text x="260" y="105" class="celestial-label" text-anchor="middle">MOON</text>

              <text x="150" y="20" class="syzygy-header-text" text-anchor="middle">SYZYGY ALIGNMENT (0° / 180°)</text>
              <text x="150" y="122" class="syzygy-sub-text" text-anchor="middle">Solar & Lunar Bulges Combine</text>
            </svg>
          </div>

          <!-- Countdown Display -->
          <div class="countdown-card">
            <div class="countdown-label">Next Spring Tide in:</div>
            <div class="countdown-timer" id="springTimer">
              <div class="time-block"><span class="time-num">${springCd?.days ?? 0}</span><span class="time-unit">d</span></div>
              <div class="time-colon">:</div>
              <div class="time-block"><span class="time-num">${String(springCd?.hours ?? 0).padStart(2, '0')}</span><span class="time-unit">h</span></div>
              <div class="time-colon">:</div>
              <div class="time-block"><span class="time-num">${String(springCd?.minutes ?? 0).padStart(2, '0')}</span><span class="time-unit">m</span></div>
              <div class="time-colon">:</div>
              <div class="time-block"><span class="time-num">${String(springCd?.seconds ?? 0).padStart(2, '0')}</span><span class="time-unit">s</span></div>
            </div>
            <div class="event-target-meta">
              <span class="event-phase-tag">${nextSpringTide ? nextSpringTide.type : 'Syzygy'}</span>
              <span class="event-target-date">${nextSpringTide ? formatDate(nextSpringTide.date, true) : '--'}</span>
            </div>
          </div>

          <!-- Educational Explanation -->
          <div class="column-explanation">
            <p class="explanation-p">
              Spring tides occur twice monthly during the <strong>New Moon</strong> and <strong>Full Moon</strong>. The gravitational pulls of the Sun and Moon reinforce each other along the same axis, producing the month's <em>highest high tides</em> and <em>lowest low tides</em>.
            </p>
          </div>
        </div>

        <!-- COLUMN 2: PERIGEAN TIDE -->
        <div class="extreme-column card-glass card-perigean-tide" id="colPerigeanTide">
          <div class="column-header">
            <div class="column-tag-wrap">
              <span class="column-tag tag-perigee">Anomalistic Month</span>
              <span class="column-period">Every ~27.5 Days</span>
            </div>
            <h3 class="column-title">Perigean Tide</h3>
            <p class="column-sub">Closest Lunar Approach (Perigee)</p>
          </div>

          <!-- Educational Graphic: Elliptical Orbit Diagram -->
          <div class="celestial-graphic-wrap">
            <svg viewBox="0 0 300 130" class="celestial-svg" id="perigeeSvg">
              <defs>
                <radialGradient id="perigeeGlow" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stop-color="#00f5d4" stop-opacity="0.8" />
                  <stop offset="100%" stop-color="#00f5d4" stop-opacity="0" />
                </radialGradient>
              </defs>

              <!-- Elliptical Orbit Track -->
              <!-- Earth is at one focus (x=115, y=65) -->
              <ellipse cx="145" cy="65" rx="125" ry="46" fill="none" stroke="#64748b" stroke-width="1.5" stroke-dasharray="4 3" />

              <!-- Earth at Orbital Focus -->
              <circle cx="115" cy="65" r="16" fill="url(#earthGrad)" stroke="#1e293b" stroke-width="1" />
              <text x="115" y="98" class="celestial-label" text-anchor="middle">EARTH</text>

              <!-- Apogee (Farthest point on right: x=270) -->
              <circle cx="270" cy="65" r="8" fill="#475569" stroke="#64748b" stroke-width="1" />
              <text x="270" y="86" class="celestial-sub-label" text-anchor="middle">Apogee</text>
              <text x="270" y="99" class="dist-label" text-anchor="middle">~405k km</text>

              <!-- Perigee (Closest point on left: x=20) -->
              <circle cx="20" cy="65" r="18" fill="url(#perigeeGlow)" class="glow-pulse" />
              <circle cx="20" cy="65" r="10" fill="#00f5d4" stroke="#0f172a" stroke-width="1.5" />
              <text x="32" y="44" class="celestial-highlight-label" text-anchor="middle">PERIGEE</text>
              <text x="28" y="98" class="dist-label text-cyan" text-anchor="middle">~356k km</text>

              <!-- Proximity distance arrow -->
              <path d="M 100 65 L 35 65" stroke="#00f5d4" stroke-width="1.5" stroke-dasharray="2 2" />
              <text x="68" y="58" class="proximity-label" text-anchor="middle">Closest Approach</text>

              <text x="150" y="16" class="syzygy-header-text" text-anchor="middle">ELLIPTICAL LUNAR ORBIT</text>
              <text x="150" y="122" class="syzygy-sub-text" text-anchor="middle">Gravitational Force Proportional to 1/r³</text>
            </svg>
          </div>

          <!-- Countdown Display -->
          <div class="countdown-card">
            <div class="countdown-label">Next Lunar Perigee in:</div>
            <div class="countdown-timer" id="perigeeTimer">
              <div class="time-block"><span class="time-num">${perigeeCd?.days ?? 0}</span><span class="time-unit">d</span></div>
              <div class="time-colon">:</div>
              <div class="time-block"><span class="time-num">${String(perigeeCd?.hours ?? 0).padStart(2, '0')}</span><span class="time-unit">h</span></div>
              <div class="time-colon">:</div>
              <div class="time-block"><span class="time-num">${String(perigeeCd?.minutes ?? 0).padStart(2, '0')}</span><span class="time-unit">m</span></div>
              <div class="time-colon">:</div>
              <div class="time-block"><span class="time-num">${String(perigeeCd?.seconds ?? 0).padStart(2, '0')}</span><span class="time-unit">s</span></div>
            </div>
            <div class="event-target-meta">
              <span class="event-phase-tag tag-cyan">Dist: ${nextPerigee ? (nextPerigee.distanceKm.toLocaleString() + ' km') : '--'}</span>
              <span class="event-target-date">${nextPerigee ? formatDate(nextPerigee.date, true) : '--'}</span>
            </div>
          </div>

          <!-- Educational Explanation -->
          <div class="column-explanation">
            <p class="explanation-p">
              The Moon's orbit is elliptical. When the Moon reaches <strong>Perigee</strong> (its closest orbital point to Earth), its tide-generating force increases by <strong>20% to 40%</strong> because tidal force scales with 1/r³, creating larger tidal swings.
            </p>
          </div>
        </div>

        <!-- COLUMN 3: KING TIDE -->
        <div class="extreme-column card-glass card-king-tide" id="colKingTide">
          <div class="column-header">
            <div class="column-tag-wrap">
              <span class="column-tag tag-king">Annual Peak Event</span>
              <span class="column-period">3–4 Times / Year</span>
            </div>
            <h3 class="column-title">King Tide</h3>
            <p class="column-sub">Perigean Spring Tide</p>
          </div>

          <!-- Educational Graphic: Combined Celestial Mechanics -->
          <div class="celestial-graphic-wrap">
            <svg viewBox="0 0 300 130" class="celestial-svg" id="kingTideSvg">
              <defs>
                <radialGradient id="kingGlow" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stop-color="#f43f5e" stop-opacity="0.6" />
                  <stop offset="50%" stop-color="#fb7185" stop-opacity="0.3" />
                  <stop offset="100%" stop-color="#881337" stop-opacity="0" />
                </radialGradient>
                <linearGradient id="extremeBulgeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stop-color="#f43f5e" stop-opacity="0.6" />
                  <stop offset="50%" stop-color="#38bdf8" stop-opacity="0.2" />
                  <stop offset="100%" stop-color="#f43f5e" stop-opacity="0.6" />
                </linearGradient>
              </defs>

              <!-- Coincident Alignment Rays -->
              <line x1="20" y1="65" x2="280" y2="65" stroke="#f43f5e" stroke-width="1.5" stroke-dasharray="3 3" opacity="0.6" />

              <!-- Sun -->
              <circle cx="25" cy="65" r="16" fill="url(#sunGlow)" />
              <circle cx="25" cy="65" r="10" fill="#fbbf24" />
              <text x="25" y="98" class="celestial-label" text-anchor="middle">SUN</text>

              <!-- Earth with Super-Bulge -->
              <!-- Super-extended ocean bulge reflecting King Tide water swell -->
              <ellipse cx="140" cy="65" rx="44" ry="24" fill="url(#extremeBulgeGrad)" stroke="#f43f5e" stroke-width="2" class="king-bulge-pulse" />
              <circle cx="140" cy="65" r="18" fill="url(#earthGrad)" stroke="#1e293b" stroke-width="1" />
              <text x="140" y="98" class="celestial-label" text-anchor="middle">EARTH</text>

              <!-- Perigean Moon (Closer to Earth than normal) -->
              <circle cx="235" cy="65" r="22" fill="url(#kingGlow)" class="glow-pulse" />
              <ellipse cx="235" cy="65" r="13" fill="#fecdd3" stroke="#f43f5e" stroke-width="1.5" />
              <text x="235" y="42" class="celestial-highlight-label text-rose" text-anchor="middle">PERIGEE MOON</text>
              <text x="235" y="98" class="dist-label text-rose" text-anchor="middle">Closest + Full/New</text>

              <!-- High Water Mark Alert -->
              <rect x="105" y="6" width="70" height="18" rx="4" fill="#881337" opacity="0.9" />
              <text x="140" y="19" class="king-alert-text" text-anchor="middle">PEAK HIGH WATER</text>
              <text x="140" y="122" class="syzygy-sub-text text-rose" text-anchor="middle">Perigee + Syzygy Coincide (≤48h)</text>
            </svg>
          </div>

          <!-- Countdown Display -->
          <div class="countdown-card card-king-timer">
            <div class="countdown-label">Next King Tide in:</div>
            <div class="countdown-timer" id="kingTimer">
              <div class="time-block"><span class="time-num">${kingCd?.days ?? 0}</span><span class="time-unit">d</span></div>
              <div class="time-colon">:</div>
              <div class="time-block"><span class="time-num">${String(kingCd?.hours ?? 0).padStart(2, '0')}</span><span class="time-unit">h</span></div>
              <div class="time-colon">:</div>
              <div class="time-block"><span class="time-num">${String(kingCd?.minutes ?? 0).padStart(2, '0')}</span><span class="time-unit">m</span></div>
              <div class="time-colon">:</div>
              <div class="time-block"><span class="time-num">${String(kingCd?.seconds ?? 0).padStart(2, '0')}</span><span class="time-unit">s</span></div>
            </div>
            <div class="event-target-meta">
              <span class="event-phase-tag tag-rose">Peak: ${nextKingTide ? (nextKingTide.syzygyType + ' + Perigee') : 'King Tide'}</span>
              <span class="event-target-date">${nextKingTide ? formatDate(nextKingTide.peakDate, true) : '--'}</span>
            </div>
          </div>

          <!-- Educational Explanation & Upcoming Schedule -->
          <div class="column-explanation">
            <p class="explanation-p">
              A <strong>King Tide</strong> occurs when the Sun, Earth, and Moon align (<strong>Syzygy</strong>) at the exact time the Moon is at its closest point to Earth (<strong>Perigee</strong>). This produces the highest astronomical tides of the year, frequently causing "sunny day" nuisance coastal flooding.
            </p>

            ${upcomingKingTides && upcomingKingTides.length > 1 ? `
              <div class="upcoming-king-list">
                <span class="upcoming-king-title">Upcoming King Tide Windows:</span>
                <ul>
                  ${upcomingKingTides.slice(0, 3).map(kt => `
                    <li><strong>${formatDate(kt.peakDate, true)}</strong> (${kt.syzygyType}, ~${kt.diffHours}h alignment)</li>
                  `).join('')}
                </ul>
              </div>
            ` : ''}
          </div>
        </div>
      </div>
    </div>
  `;

  // Start live 1-second countdown ticking for all three columns
  startLiveCountdowns(container, celestialData);
}

let countdownInterval = null;

function startLiveCountdowns(container, celestialData) {
  if (countdownInterval) clearInterval(countdownInterval);

  countdownInterval = setInterval(() => {
    const now = new Date();
    const { nextSpringTide, nextPerigee, nextKingTide } = celestialData;

    updateTimerElement(container.querySelector('#springTimer'), nextSpringTide?.date, now);
    updateTimerElement(container.querySelector('#perigeeTimer'), nextPerigee?.date, now);
    updateTimerElement(container.querySelector('#kingTimer'), nextKingTide?.peakDate, now);
  }, 1000);
}

function updateTimerElement(timerEl, targetDate, now) {
  if (!timerEl || !targetDate) return;
  const cd = formatCountdown(targetDate, now);
  timerEl.innerHTML = `
    <div class="time-block"><span class="time-num">${cd.days}</span><span class="time-unit">d</span></div>
    <div class="time-colon">:</div>
    <div class="time-block"><span class="time-num">${String(cd.hours).padStart(2, '0')}</span><span class="time-unit">h</span></div>
    <div class="time-colon">:</div>
    <div class="time-block"><span class="time-num">${String(cd.minutes).padStart(2, '0')}</span><span class="time-unit">m</span></div>
    <div class="time-colon">:</div>
    <div class="time-block"><span class="time-num">${String(cd.seconds).padStart(2, '0')}</span><span class="time-unit">s</span></div>
  `;
}
