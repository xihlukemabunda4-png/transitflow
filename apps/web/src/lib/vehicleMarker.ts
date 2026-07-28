/**
 * MapLibre positions a Marker by setting `transform: translate(...)` directly
 * on the element passed to it. So rotation for heading must happen on a
 * nested child, not the root element, or the two transforms fight each other.
 */
export function createVehicleMarkerEl(color: string): { root: HTMLDivElement; inner: HTMLDivElement } {
  const root = document.createElement('div');
  root.style.width = '22px';
  root.style.height = '22px';

  const inner = document.createElement('div');
  inner.style.width = '22px';
  inner.style.height = '22px';
  inner.style.position = 'relative';
  inner.style.transformOrigin = '50% 60%';
  inner.innerHTML = `
    <div style="width:20px;height:20px;border-radius:50%;background:${color};border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,.4);margin:1px auto 0;"></div>
    <div style="position:absolute;top:-5px;left:50%;transform:translateX(-50%);width:0;height:0;border-left:5px solid transparent;border-right:5px solid transparent;border-bottom:7px solid ${color};"></div>
  `;
  root.appendChild(inner);
  return { root, inner };
}

export interface VehicleAnimState {
  from: { lat: number; lng: number; heading: number };
  to: { lat: number; lng: number; heading: number };
  fromTs: number;
  toTs: number;
  color: string;
}

/** Shortest-path heading interpolation (handles the 0/360 wraparound). */
export function lerpHeading(fromDeg: number, toDeg: number, t: number): number {
  let delta = toDeg - fromDeg;
  delta = ((delta + 540) % 360) - 180;
  return fromDeg + delta * t;
}
