import { useCallback, useEffect, useRef, useState } from 'react';
import { ROUTING_CONFIG } from '../config';
import { haversineMeters } from '../lib/geo';
import { RoutingError, fetchRoute } from '../lib/routing';
import type { Destination, GpsFix, LatLng, RouteResult, RouteState } from '../types';

interface Options {
  origin: GpsFix | null;
  /** False when the origin is not a live reading (e.g. GPS lost). */
  originIsLive: boolean;
  destination: Destination;
  /** Routing is only useful while still on the way. */
  active: boolean;
}

export function useRoute({ origin, originIsLive, destination, active }: Options): {
  state: RouteState;
  retry: () => void;
} {
  const [route, setRoute] = useState<RouteResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryToken, setRetryToken] = useState(0);

  const lastOrigin = useRef<LatLng | null>(null);
  const lastDest = useRef<string>('');
  const lastFetchAt = useRef(0);
  const controller = useRef<AbortController | null>(null);

  const destKey = `${destination.lat.toFixed(6)},${destination.lng.toFixed(6)}`;
  const enabled =
    ROUTING_CONFIG.provider !== 'none' && active && destination.confirmed && !!origin && originIsLive;

  // A route to an old pin is not valid any more.
  useEffect(() => {
    if (lastDest.current && lastDest.current !== destKey) {
      setRoute(null);
      setError(null);
    }
  }, [destKey]);

  useEffect(() => {
    if (!enabled || !origin) return;
    const now = Date.now();
    const destChanged = lastDest.current !== destKey;
    const moved = lastOrigin.current ? haversineMeters(lastOrigin.current, origin) : Infinity;
    const due = now - lastFetchAt.current >= ROUTING_CONFIG.minIntervalMs;
    const needsFirst = !route && !loading && (!error || due);
    const needsUpdate = moved >= ROUTING_CONFIG.rerouteAfterMeters && due;
    if (!destChanged && !needsFirst && !needsUpdate) return;

    controller.current?.abort();
    const ctrl = new AbortController();
    controller.current = ctrl;
    lastFetchAt.current = now;
    lastOrigin.current = { lat: origin.lat, lng: origin.lng };
    lastDest.current = destKey;
    setLoading(true);

    fetchRoute(origin, destination, ctrl.signal)
      .then((r) => {
        if (ctrl.signal.aborted) return;
        setRoute(r);
        setError(null);
      })
      .catch((err: unknown) => {
        if (ctrl.signal.aborted || (err as Error).name === 'AbortError') return;
        setRoute(null);
        setError(err instanceof RoutingError ? err.message : 'Route could not be calculated.');
      })
      .finally(() => {
        if (!ctrl.signal.aborted) setLoading(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, origin?.lat, origin?.lng, destKey, retryToken]);

  useEffect(() => () => controller.current?.abort(), []);

  const retry = useCallback(() => {
    lastFetchAt.current = 0;
    lastOrigin.current = null;
    setError(null);
    setRetryToken((t) => t + 1);
  }, []);

  let state: RouteState;
  if (ROUTING_CONFIG.provider === 'none') state = { status: 'disabled' };
  else if (!active) state = { status: 'not-needed' };
  else if (!destination.confirmed) state = { status: 'needs-pin' };
  else if (!origin || !originIsLive) state = { status: 'needs-gps' };
  else if (error && !loading) state = { status: 'error', message: error, route: null };
  else if (loading) state = { status: 'loading', route };
  else if (route) state = { status: 'ready', route };
  else state = { status: 'loading', route: null };

  return { state, retry };
}
