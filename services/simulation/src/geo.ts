export interface LatLng {
  lat: number;
  lng: number;
}

const EARTH_RADIUS_M = 6371000;

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

function toDeg(rad: number): number {
  return (rad * 180) / Math.PI;
}

export function haversineMeters(a: LatLng, b: LatLng): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h));
}

export function bearingDegrees(a: LatLng, b: LatLng): number {
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const dLng = toRad(b.lng - a.lng);

  const y = Math.sin(dLng) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

/** Cumulative distance (meters) from the first point to each point in `points`. */
export function cumulativeDistances(points: LatLng[]): number[] {
  const cum = [0];
  for (let i = 1; i < points.length; i++) {
    cum.push(cum[i - 1] + haversineMeters(points[i - 1], points[i]));
  }
  return cum;
}

export interface PathPosition extends LatLng {
  heading: number;
}

/**
 * Position + heading at `targetDistanceM` along a polyline, given its precomputed
 * cumulative distances. `targetDistanceM` is clamped to [0, total length].
 */
export function pointAlongPath(points: LatLng[], cumDistances: number[], targetDistanceM: number): PathPosition {
  const total = cumDistances[cumDistances.length - 1];
  const d = Math.max(0, Math.min(targetDistanceM, total));

  let segIndex = 0;
  while (segIndex < cumDistances.length - 2 && cumDistances[segIndex + 1] < d) {
    segIndex++;
  }

  const segStart = points[segIndex];
  const segEnd = points[segIndex + 1] ?? points[segIndex];
  const segStartDist = cumDistances[segIndex];
  const segEndDist = cumDistances[segIndex + 1] ?? segStartDist;
  const segLength = segEndDist - segStartDist;
  const t = segLength > 0 ? (d - segStartDist) / segLength : 0;

  return {
    lat: segStart.lat + (segEnd.lat - segStart.lat) * t,
    lng: segStart.lng + (segEnd.lng - segStart.lng) * t,
    heading: bearingDegrees(segStart, segEnd),
  };
}
