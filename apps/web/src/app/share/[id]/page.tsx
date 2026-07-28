'use client';

import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useEffect, useRef, useState } from 'react';
import type { TripShareView } from '@transitflow/types';
import { api } from '@/lib/api';
import { MAP_STYLE_URL } from '@/lib/config';
import { formatEta } from '@/lib/format';

/**
 * Public, unauthenticated view for a link created via "Share My Trip" — see
 * services/api/src/trip-share.controller.ts. Polls REST (no websocket) since
 * this is a single anonymous viewer, not worth a dedicated subscription
 * channel for the MVP.
 */
export default function ShareTripPage({ params }: { params: { id: string } }) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markerRef = useRef<maplibregl.Marker | null>(null);

  const [share, setShare] = useState<TripShareView | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      try {
        const data = await api.viewTripShare(params.id);
        if (cancelled) return;
        setShare(data);
        setError(null);

        if (data.position) {
          if (!mapRef.current && mapContainerRef.current) {
            mapRef.current = new maplibregl.Map({
              container: mapContainerRef.current,
              style: MAP_STYLE_URL,
              center: [data.position.lng, data.position.lat],
              zoom: 14,
            });
            markerRef.current = new maplibregl.Marker({ color: data.routeColor ?? '#0EA36E' })
              .setLngLat([data.position.lng, data.position.lat])
              .addTo(mapRef.current);
          } else if (mapRef.current && markerRef.current) {
            markerRef.current.setLngLat([data.position.lng, data.position.lat]);
            mapRef.current.easeTo({ center: [data.position.lng, data.position.lat], duration: 800 });
          }
        }
      } catch {
        if (!cancelled) setError('This shared trip has expired or no longer exists.');
      }
    }

    poll();
    const interval = setInterval(poll, 5000);
    return () => {
      cancelled = true;
      clearInterval(interval);
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [params.id]);

  if (error) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-tf-bg text-tf-text px-6">
        <p className="text-tf-text-muted">{error}</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-tf-bg text-tf-text flex flex-col">
      <div className="p-4 border-b border-tf-border">
        <h1 className="text-lg font-bold">Live Trip</h1>
        {share && (
          <div className="flex items-center gap-2 mt-1 text-sm">
            {share.routeShortName && (
              <span
                className="rounded-tf-sm px-2 py-0.5 text-xs font-bold text-white"
                style={{ background: share.routeColor ?? '#0EA36E' }}
              >
                {share.routeShortName}
              </span>
            )}
            <span className="text-tf-text-muted">{share.vehicleLabel}</span>
          </div>
        )}
        {share?.destinationStopName && (
          <p className="text-sm mt-2">
            Heading to <span className="font-semibold">{share.destinationStopName}</span>
            {share.etaSeconds !== null && (
              <span className="text-tf-primary font-bold"> · {formatEta(share.etaSeconds)}</span>
            )}
          </p>
        )}
      </div>
      <div ref={mapContainerRef} className="flex-1" />
      {share && (
        <p className="p-2 text-center text-xs text-tf-text-muted border-t border-tf-border">
          Link expires {new Date(share.expiresAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
        </p>
      )}
    </main>
  );
}
