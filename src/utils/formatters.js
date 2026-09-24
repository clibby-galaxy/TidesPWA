/**
 * Formatting utilities for units, dates, times, and countdowns.
 */

export function formatHeight(feetValue, unit = 'ft', includeDatum = true) {
  if (feetValue === null || feetValue === undefined || isNaN(feetValue)) {
    return '--';
  }
  const num = parseFloat(feetValue);
  let val, unitLabel;
  if (unit === 'm') {
    val = (num * 0.3048).toFixed(2);
    unitLabel = 'm';
  } else {
    val = num.toFixed(2);
    unitLabel = 'ft';
  }
  const prefix = num >= 0 ? '+' : '';
  const datumStr = includeDatum ? ' MLLW' : '';
  return `${prefix}${val} ${unitLabel}${datumStr}`;
}

export function formatHeightValue(feetValue, unit = 'ft') {
  if (feetValue === null || feetValue === undefined || isNaN(feetValue)) {
    return '--';
  }
  const num = parseFloat(feetValue);
  return unit === 'm' ? (num * 0.3048).toFixed(2) : num.toFixed(2);
}

export function formatTime(dateOrIso, use24Hour = false) {
  if (!dateOrIso) return '--:--';
  const date = typeof dateOrIso === 'string' ? new Date(dateOrIso.replace(' ', 'T')) : dateOrIso;
  if (isNaN(date.getTime())) return '--:--';

  return date.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    hour12: !use24Hour
  });
}

export function formatDate(dateOrIso, includeWeekday = true) {
  if (!dateOrIso) return '';
  const date = typeof dateOrIso === 'string' ? new Date(dateOrIso.replace(' ', 'T')) : dateOrIso;
  if (isNaN(date.getTime())) return '';

  const options = {
    month: 'short',
    day: 'numeric'
  };
  if (includeWeekday) options.weekday = 'short';
  return date.toLocaleDateString([], options);
}

export function formatCountdown(targetDate, fromDate = new Date()) {
  const target = targetDate instanceof Date ? targetDate : new Date(targetDate);
  const diffMs = target.getTime() - fromDate.getTime();
  
  if (diffMs <= 0) {
    return {
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      totalMs: 0,
      text: 'Now / Happening',
      shortText: 'Now'
    };
  }

  const totalSecs = Math.floor(diffMs / 1000);
  const days = Math.floor(totalSecs / 86400);
  const hours = Math.floor((totalSecs % 86400) / 3600);
  const minutes = Math.floor((totalSecs % 3600) / 60);
  const seconds = totalSecs % 60;

  let text = '';
  if (days > 0) {
    text = `${days}d ${hours}h ${minutes}m`;
  } else if (hours > 0) {
    text = `${hours}h ${minutes}m`;
  } else {
    text = `${minutes}m ${seconds}s`;
  }

  return {
    days,
    hours,
    minutes,
    seconds,
    totalMs: diffMs,
    text: `in ${text}`,
    shortText: text
  };
}

export function formatCompactCountdown(targetDate, fromDate = new Date()) {
  const cd = formatCountdown(targetDate, fromDate);
  if (cd.totalMs <= 0) return 'Now';
  if (cd.days > 0) return `${cd.days}d ${cd.hours}h`;
  if (cd.hours > 0) return `${cd.hours}h ${cd.minutes}m`;
  return `${cd.minutes}m`;
}
