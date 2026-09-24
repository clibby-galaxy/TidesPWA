/**
 * Calculate the great-circle distance between two points on the Earth's surface
 * using the Haversine formula.
 */
export function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 3958.8; // Earth's radius in miles (use 6371 for km)
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const miles = R * c;
  const km = miles * 1.60934;
  return { miles, km };
}

function toRad(degrees) {
  return (degrees * Math.PI) / 180;
}
