/**
 * Interactive Tide Curve Chart Component (24h / 48h)
 * Smooth SVG tidal wave visualization with MLLW reference baseline,
 * real-time "Now" scrubber, crest/trough markers, and hover tooltips.
 */

import { formatHeight, formatTime } from '../utils/formatters.js';

export function renderTideChart(container, tideData, unit = 'ft', use24Hour = false, viewHours = 24) {
  if (!tideData || !tideData.continuousData || tideData.continuousData.length === 0) {
    container.innerHTML = `<div class="chart-loading card-glass"><p>Loading tide curve...</p></div>`;
    return;
  }

  const now = new Date();
  const nowMs = now.getTime();
  const windowMs = viewHours * 3600000;
  // Start from ~2 hours before now to give context
  const startMs = nowMs - 2 * 3600000;
  const endMs = startMs + windowMs;

  // Filter continuous data to this window
  const points = tideData.continuousData.filter(p => {
    const t = p.parsedDate.getTime();
    return t >= startMs && t <= endMs;
  });

  if (points.length < 2) {
    container.innerHTML = `<div class="chart-loading card-glass"><p>Insufficient data points for curve</p></div>`;
    return;
  }

  // Find Min / Max values to calculate SVG scale
  let minVal = Infinity;
  let maxVal = -Infinity;
  for (const p of points) {
    if (p.value < minVal) minVal = p.value;
    if (p.value > maxVal) maxVal = p.value;
  }

  // Add margin around extremes and include 0 MLLW line
  minVal = Math.min(minVal, 0) - 0.5;
  maxVal = maxVal + 0.8;
  const valRange = maxVal - minVal;

  // SVG Dimensions
  const width = 800;
  const height = 220;
  const padLeft = 45;
  const padRight = 20;
  const padTop = 20;
  const padBottom = 35;
  const plotWidth = width - padLeft - padRight;
  const plotHeight = height - padTop - padBottom;

  function getX(timeMs) {
    const frac = (timeMs - startMs) / (endMs - startMs);
    return padLeft + frac * plotWidth;
  }

  function getY(val) {
    const frac = (val - minVal) / valRange;
    return padTop + (1 - frac) * plotHeight;
  }

  // Build smooth SVG path
  let pathD = '';
  let areaD = '';
  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    const x = getX(p.parsedDate.getTime());
    const y = getY(p.value);

    if (i === 0) {
      pathD += `M ${x.toFixed(1)} ${y.toFixed(1)}`;
      areaD += `M ${x.toFixed(1)} ${getY(minVal).toFixed(1)} L ${x.toFixed(1)} ${y.toFixed(1)}`;
    } else {
      // Smooth quadratic/cubic curve
      const prev = points[i - 1];
      const prevX = getX(prev.parsedDate.getTime());
      const prevY = getY(prev.value);
      const midX = (prevX + x) / 2;
      pathD += ` C ${midX.toFixed(1)} ${prevY.toFixed(1)}, ${midX.toFixed(1)} ${y.toFixed(1)}, ${x.toFixed(1)} ${y.toFixed(1)}`;
      areaD += ` C ${midX.toFixed(1)} ${prevY.toFixed(1)}, ${midX.toFixed(1)} ${y.toFixed(1)}, ${x.toFixed(1)} ${y.toFixed(1)}`;
    }
  }

  const lastX = getX(points[points.length - 1].parsedDate.getTime());
  const baseY = getY(minVal);
  areaD += ` L ${lastX.toFixed(1)} ${baseY.toFixed(1)} Z`;

  // MLLW 0.0 baseline Y
  const mllwY = getY(0);

  // Current time scrubber X
  const nowX = getX(nowMs);
  const nowY = getY(tideData.currentHeight);

  // Time axis ticks (every 3 hours for 24h, or 6 hours for 48h)
  const tickIntervalHours = viewHours <= 24 ? 3 : 6;
  const timeTicks = [];
  let tickTime = new Date(startMs);
  tickTime.setMinutes(0, 0, 0);
  while (tickTime.getTime() <= endMs) {
    if (tickTime.getTime() >= startMs) {
      timeTicks.push({
        x: getX(tickTime.getTime()),
        timeStr: formatTime(tickTime, use24Hour),
        isToday: tickTime.getDate() === now.getDate()
      });
    }
    tickTime = new Date(tickTime.getTime() + tickIntervalHours * 3600000);
  }

  // Generate Y-axis ticks
  const yTicks = [];
  const rawStep = valRange > 7 ? 2 : (valRange > 3 ? 1 : 0.5);
  const minTickVal = Math.ceil(minVal / rawStep) * rawStep;
  for (let v = minTickVal; v <= maxVal; v += rawStep) {
    if (Math.abs(v) > 0.05) { // Skip 0 as it has its own dedicated MLLW baseline
      yTicks.push({
        val: v,
        y: getY(v),
        label: `${v > 0 ? '+' : ''}${v.toFixed(v % 1 === 0 ? 0 : 1)}`
      });
    }
  }

  // Filter High/Low crests in range
  const visibleHiLos = (tideData.hiLoList || []).filter(item => {
    const t = item.parsedDate.getTime();
    return t >= startMs && t <= endMs;
  });

  // Dynamic NOW Badge Placement:
  // If water level is near the top (high tide), place NOW badge at bottom of line to prevent crest collision.
  // If water level is near bottom, place NOW badge at top.
  const isNowNearTop = nowY < (padTop + 45);
  const nowBadgeY = isNowNearTop ? (padTop + plotHeight + 14) : (padTop - 8);

  container.innerHTML = `
    <div class="tide-chart-card card-glass">
      <div class="chart-header">
        <div class="chart-title-wrap">
          <h3 class="chart-title">Water Level Forecast</h3>
          <span class="chart-subtitle">Continuous water levels relative to Mean Lower Low Water (MLLW)</span>
        </div>
        <div class="chart-controls">
          <button class="chart-range-btn ${viewHours === 24 ? 'active' : ''}" data-hours="24">24h</button>
          <button class="chart-range-btn ${viewHours === 48 ? 'active' : ''}" data-hours="48">48h</button>
        </div>
      </div>

      <div class="chart-svg-container" id="chartSvgWrapper">
        <svg viewBox="0 0 ${width} ${height}" class="tide-chart-svg" id="tideChartSvg">
          <defs>
            <linearGradient id="chartWaterGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stop-color="#0284c7" stop-opacity="0.45" />
              <stop offset="50%" stop-color="#0ea5e9" stop-opacity="0.25" />
              <stop offset="100%" stop-color="#14b8a6" stop-opacity="0.05" />
            </linearGradient>

            <linearGradient id="tideLineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stop-color="#38bdf8" />
              <stop offset="50%" stop-color="#00f5d4" />
              <stop offset="100%" stop-color="#38bdf8" />
            </linearGradient>
          </defs>

          <!-- Horizontal Reference Grid Lines & Y-axis labels -->
          ${yTicks.map(yt => `
            <line x1="${padLeft}" y1="${yt.y}" x2="${width - padRight}" y2="${yt.y}" class="chart-grid-line" />
            <text x="${padLeft - 8}" y="${yt.y + 3}" text-anchor="end" class="chart-y-tick-text">${yt.label}</text>
          `).join('')}

          <!-- MLLW Baseline 0.0 ft Reference -->
          <line x1="${padLeft}" y1="${mllwY}" x2="${width - padRight}" y2="${mllwY}" class="chart-mllw-line" />
          <text x="${padLeft + 8}" y="${mllwY - 6}" class="chart-mllw-label">0.0 MLLW BASELINE</text>
          <text x="${padLeft - 8}" y="${mllwY + 3}" text-anchor="end" class="chart-mllw-axis-text">0.0</text>

          <!-- Shaded Area Under Tide Curve -->
          <path d="${areaD}" fill="url(#chartWaterGrad)" />

          <!-- Smooth Tide Stroke -->
          <path d="${pathD}" fill="none" stroke="url(#tideLineGrad)" stroke-width="3" stroke-linecap="round" />

          <!-- Time Axis Ticks -->
          ${timeTicks.map(tick => `
            <line x1="${tick.x}" y1="${padTop + plotHeight}" x2="${tick.x}" y2="${padTop + plotHeight + 5}" class="axis-tick-line" />
            <text x="${tick.x}" y="${padTop + plotHeight + 18}" text-anchor="middle" class="axis-tick-text">${tick.timeStr}</text>
          `).join('')}

          <!-- Crests & Troughs Callouts with Collision Avoidance -->
          ${visibleHiLos.map(item => {
            const cx = getX(item.parsedDate.getTime());
            const cy = getY(item.value);
            const isHigh = item.type === 'H';
            const color = isHigh ? '#38bdf8' : '#fbbf24';
            const heightStr = formatHeight(item.value, unit, false);
            const timeStr = formatTime(item.parsedDate, use24Hour);
            const text = `${isHigh ? '▲' : '▼'} ${heightStr}`;

            // Smart Collision Avoidance with the NOW scrubber
            const distToNow = Math.abs(cx - nowX);
            let labelX = cx;
            let textAnchor = 'middle';
            let labelY = isHigh ? cy - 12 : cy + 18;

            if (distToNow < 50) {
              // Horizontally offset label away from the NOW vertical line
              if (nowX <= cx) {
                labelX = cx + 8;
                textAnchor = 'start';
              } else {
                labelX = cx - 8;
                textAnchor = 'end';
              }
              // Vertically offset if close to current water level dot
              if (Math.abs(cy - nowY) < 25) {
                labelY = isHigh ? cy - 18 : cy + 22;
              }
            }

            return `
              <g class="hilo-marker">
                <circle cx="${cx}" cy="${cy}" r="4" fill="${color}" stroke="#08121e" stroke-width="2" />
                <text 
                  x="${labelX}" 
                  y="${labelY}" 
                  text-anchor="${textAnchor}" 
                  class="hilo-marker-text ${isHigh ? 'marker-high' : 'marker-low'}"
                  style="paint-order: stroke; stroke: #08121e; stroke-width: 4px; stroke-linejoin: round;"
                >
                  ${text}
                </text>
              </g>
            `;
          }).join('')}

          <!-- Real-Time "NOW" Scrubber Line & Dot -->
          ${nowX >= padLeft && nowX <= width - padRight ? `
            <g class="now-scrubber-group">
              <line x1="${nowX}" y1="${padTop}" x2="${nowX}" y2="${padTop + plotHeight}" class="now-vertical-line" />
              <circle cx="${nowX}" cy="${nowY}" r="6" class="now-pulsing-outer" />
              <circle cx="${nowX}" cy="${nowY}" r="3.5" fill="#00f5d4" stroke="#08121e" stroke-width="2" />
              
              <!-- Smart Positioned NOW Badge (avoids overlapping high/low crests) -->
              <g transform="translate(${nowX}, ${nowBadgeY})">
                <rect x="-18" y="-9" width="36" height="16" rx="4" fill="#00f5d4" />
                <text x="0" y="3" text-anchor="middle" font-family="'Outfit', sans-serif" font-size="9px" font-weight="800" fill="#08121e">NOW</text>
              </g>
            </g>
          ` : ''}

          <!-- Interactive Hover Crosshair (hidden by default, updated on mousemove) -->
          <g id="chartCrosshair" class="chart-crosshair" style="display: none;">
            <line id="crosshairLine" x1="0" y1="${padTop}" x2="0" y2="${padTop + plotHeight}" />
            <circle id="crosshairDot" cx="0" cy="0" r="4.5" />
          </g>
        </svg>

        <!-- Hover Tooltip -->
        <div id="chartTooltip" class="chart-hover-tooltip" style="display: none;"></div>
      </div>
    </div>
  `;

  // Attach event listeners for range buttons
  container.querySelectorAll('.chart-range-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const hours = parseInt(e.currentTarget.dataset.hours, 10);
      renderTideChart(container, tideData, unit, use24Hour, hours);
    });
  });

  // Attach interactive hover listener
  const svgWrapper = container.querySelector('#chartSvgWrapper');
  const svg = container.querySelector('#tideChartSvg');
  const crosshair = container.querySelector('#chartCrosshair');
  const crosshairLine = container.querySelector('#crosshairLine');
  const crosshairDot = container.querySelector('#crosshairDot');
  const tooltip = container.querySelector('#chartTooltip');

  if (svgWrapper && svg && crosshair && tooltip) {
    svgWrapper.addEventListener('mousemove', (e) => {
      const rect = svg.getBoundingClientRect();
      const clientX = e.clientX - rect.left;
      const svgX = (clientX / rect.width) * width;

      if (svgX >= padLeft && svgX <= width - padRight) {
        // Calculate corresponding time
        const frac = (svgX - padLeft) / plotWidth;
        const hoverTimeMs = startMs + frac * (endMs - startMs);

        // Find closest data point
        let closest = points[0];
        let minDist = Infinity;
        for (const p of points) {
          const dist = Math.abs(p.parsedDate.getTime() - hoverTimeMs);
          if (dist < minDist) {
            minDist = dist;
            closest = p;
          }
        }

        if (closest) {
          const ptX = getX(closest.parsedDate.getTime());
          const ptY = getY(closest.value);

          crosshair.style.display = 'block';
          crosshairLine.setAttribute('x1', ptX);
          crosshairLine.setAttribute('x2', ptX);
          crosshairDot.setAttribute('cx', ptX);
          crosshairDot.setAttribute('cy', ptY);

          tooltip.style.display = 'block';
          tooltip.style.left = `${(ptX / width) * 100}%`;
          tooltip.style.top = `${(ptY / height) * 100}%`;
          tooltip.innerHTML = `
            <div class="tooltip-time">${formatTime(closest.parsedDate, use24Hour)}</div>
            <div class="tooltip-val">${formatHeight(closest.value, unit)}</div>
          `;
        }
      }
    });

    svgWrapper.addEventListener('mouseleave', () => {
      crosshair.style.display = 'none';
      tooltip.style.display = 'none';
    });
  }
}
