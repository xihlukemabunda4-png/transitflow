// Set NEXT_PUBLIC_API_URL in the hosting environment (e.g. Vercel project
// settings) to point at a deployed API. Without it this falls back to the
// local dev server, which only resolves on a developer's own machine — a
// deployed build with no value set will load but show no data.
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

// OpenFreeMap Liberty style — free, no API key, full street-level detail
// (the maplibre demo tiles only have country outlines, which renders as a
// blank background at city zoom). Swap for a Mapbox style URL + access token
// once an account is set up (see docs/09-roadmap.md Phase 0).
export const MAP_STYLE_URL = 'https://tiles.openfreemap.org/styles/liberty';
