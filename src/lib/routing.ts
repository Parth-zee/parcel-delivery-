import { ROUTING_CONFIG } from '../config';
import type { LatLng, RouteResult } from '../types';

export class RoutingError extends Error {}

function assertRoute(r: RouteResult): RouteResult {
  if (
    !Number.isFinite(r.distanceMeters) ||
    !Number.isFinite(r.durationSeconds) ||
    r.distanceMeters < 0 ||
    r.durationSeconds < 0 ||
    !Array.isArray(r.coordinates) ||
    r.coordinates.length < 2 ||
    r.coordinates.some(
      (c) => !Array.isArray(c) || !Number.isFinite(c[0]) || !Number.isFinite(c[1]),
    )
  ) {
    throw new RoutingError('The routing service returned incomplete route data.');
  }
  return r;
}

async function fetchJson(url: string, signal: AbortSignal): Promise<unknown> {
  let res: Response;
  try {
    res = await fetch(url, { signal, headers: { Accept: 'application/json' } });
  } catch (err) {
    if ((err as Error).name === 'AbortError') throw err;
    throw new RoutingError('Couldn’t reach the routing service (network error).');
  }
  if (res.status === 429) throw new RoutingError('The routing service is busy (rate limited).');
  if (!res.ok) throw new RoutingError(`The routing service returned an error (${res.status}).`);
  try {
    return await res.json();
  } catch {
    throw new RoutingError('The routing service sent an unreadable response.');
  }
}

interface OsrmResponse {
  code?: string;
  message?: string;
  routes?: {
    distance: number;
    duration: number;
    geometry: { coordinates: [number, number][] };
  }[];
}

async function fetchOsrm(from: LatLng, to: LatLng, signal: AbortSignal): Promise<RouteResult> {
  const { osrmUrl, osrmProfile } = ROUTING_CONFIG;
  const url =
    `${osrmUrl}/route/v1/${encodeURIComponent(osrmProfile)}/` +
    `${from.lng.toFixed(6)},${from.lat.toFixed(6)};${to.lng.toFixed(6)},${to.lat.toFixed(6)}` +
    `?overview=full&geometries=geojson&alternatives=false&steps=false`;
  const data = (await fetchJson(url, signal)) as OsrmResponse;
  if (data.code !== 'Ok' || !data.routes?.length) {
    throw new RoutingError(
      data.code === 'NoRoute'
        ? 'No road route was found between you and the destination.'
        : `Routing failed${data.message ? `: ${data.message}` : '.'}`,
    );
  }
  const r = data.routes[0];
  return assertRoute({
    distanceMeters: r.distance,
    durationSeconds: r.duration,
    coordinates: (r.geometry?.coordinates ?? []).map(([lng, lat]) => [lat, lng]),
    provider: 'OSRM',
    profile: osrmProfile,
    fetchedAt: Date.now(),
  });
}

interface ProxyResponse {
  distanceMeters: number;
  durationSeconds: number;
  coordinates: [number, number][];
  provider?: string;
  profile?: string;
  error?: string;
}

async function fetchProxy(from: LatLng, to: LatLng, signal: AbortSignal): Promise<RouteResult> {
  const base = new URL(ROUTING_CONFIG.proxyUrl, window.location.origin);
  base.searchParams.set('from', `${from.lat.toFixed(6)},${from.lng.toFixed(6)}`);
  base.searchParams.set('to', `${to.lat.toFixed(6)},${to.lng.toFixed(6)}`);
  const data = (await fetchJson(base.toString(), signal)) as ProxyResponse;
  if (data.error) throw new RoutingError(data.error);
  return assertRoute({
    distanceMeters: data.distanceMeters,
    durationSeconds: data.durationSeconds,
    coordinates: data.coordinates,
    provider: data.provider ?? 'Routing proxy',
    profile: data.profile ?? 'unknown',
    fetchedAt: Date.now(),
  });
}

export function fetchRoute(from: LatLng, to: LatLng, signal: AbortSignal): Promise<RouteResult> {
  switch (ROUTING_CONFIG.provider) {
    case 'osrm':
      return fetchOsrm(from, to, signal);
    case 'proxy':
      return fetchProxy(from, to, signal);
    default:
      return Promise.reject(new RoutingError('Routing is turned off.'));
  }
}

/** Human description of the travel mode a profile name implies. */
export function travelModeLabel(profile: string): string {
  const p = profile.toLowerCase();
  if (p.includes('foot') || p.includes('walk')) return 'walking';
  if (p.includes('cycl') || p.includes('bike')) return 'cycling';
  return 'by road';
}
