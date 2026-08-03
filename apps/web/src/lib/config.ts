// Hardcoded for local dev — becomes env-driven (NEXT_PUBLIC_API_URL) once
// there's a deployed environment to point at (Phase 2).
export const API_BASE_URL = 'http://localhost:3001';

// OpenFreeMap Liberty style — free, no API key, full street-level detail
// (the maplibre demo tiles only have country outlines, which renders as a
// blank background at city zoom). Swap for a Mapbox style URL + access token
// once an account is set up (see docs/09-roadmap.md Phase 0).
export const MAP_STYLE_URL = 'https://tiles.openfreemap.org/styles/liberty';
