/**
 * Optional routing proxy for OpenRouteService (https://openrouteservice.org).
 *
 * Keeps the ORS API key on the server. Enable it by:
 *   1. Setting ORS_API_KEY (and optionally ORS_PROFILE) in Netlify's
 *      environment variables.
 *   2. Building the site with VITE_ROUTING_PROVIDER=proxy.
 *
 * GET /api/route?from=<lat>,<lng>&to=<lat>,<lng>
 * -> { distanceMeters, durationSeconds, coordinates: [[lat, lng], ...], provider, profile }
 */

declare const Netlify: { env: { get(name: string): string | undefined } };

const MAX_DISTANCE_KM = 150; // refuse obviously unrelated requests

function parsePoint(value: string | null): [number, number] | null {
  if (!value) return null;
  const [lat, lng] = value.split(',').map(Number);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  return [lat, lng];
}

function km(a: [number, number], b: [number, number]): number {
  const r = (d: number) => (d * Math.PI) / 180;
  const h =
    Math.sin(r(b[0] - a[0]) / 2) ** 2 +
    Math.cos(r(a[0])) * Math.cos(r(b[0])) * Math.sin(r(b[1] - a[1]) / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  });

export default async (req: Request): Promise<Response> => {
  const key = Netlify.env.get('ORS_API_KEY');
  if (!key) return json({ error: 'Routing proxy is not configured (ORS_API_KEY missing).' }, 503);

  const url = new URL(req.url);
  const from = parsePoint(url.searchParams.get('from'));
  const to = parsePoint(url.searchParams.get('to'));
  if (!from || !to) return json({ error: 'Invalid from/to coordinates.' }, 400);
  if (km(from, to) > MAX_DISTANCE_KM) return json({ error: 'Points are too far apart.' }, 400);

  const profile = Netlify.env.get('ORS_PROFILE') || 'driving-car';
  const upstream = await fetch(
    `https://api.openrouteservice.org/v2/directions/${encodeURIComponent(profile)}/geojson`,
    {
      method: 'POST',
      headers: {
        Authorization: key,
        'Content-Type': 'application/json',
        Accept: 'application/geo+json, application/json',
      },
      body: JSON.stringify({
        coordinates: [
          [from[1], from[0]],
          [to[1], to[0]],
        ],
      }),
    },
  ).catch(() => null);

  if (!upstream) return json({ error: 'Could not reach OpenRouteService.' }, 502);
  if (!upstream.ok) return json({ error: `OpenRouteService error (${upstream.status}).` }, 502);

  const data = (await upstream.json()) as {
    features?: {
      geometry?: { coordinates?: [number, number][] };
      properties?: { summary?: { distance?: number; duration?: number } };
    }[];
  };
  const f = data.features?.[0];
  const coords = f?.geometry?.coordinates;
  const summary = f?.properties?.summary;
  if (!coords?.length || summary?.distance == null || summary?.duration == null) {
    return json({ error: 'OpenRouteService returned no route.' }, 502);
  }

  return json({
    distanceMeters: summary.distance,
    durationSeconds: summary.duration,
    coordinates: coords.map(([lng, lat]) => [lat, lng]),
    provider: 'OpenRouteService',
    profile,
  });
};

export const config = { path: '/api/route' };
