import type { LatLng } from '../types';

const EARTH_RADIUS_M = 6_371_008.8;

/** Straight-line (great-circle) distance in metres. */
export function haversineMeters(a: LatLng, b: LatLng): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function isValidLatLng(lat: number, lng: number): boolean {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    Math.abs(lat) <= 90 &&
    Math.abs(lng) <= 180 &&
    !(lat === 0 && lng === 0)
  );
}

export type ParseResult =
  | { ok: true; value: LatLng }
  | { ok: false; message: string };

const NUM = '(-?\\d{1,3}(?:\\.\\d+)?)';

/**
 * Accepts plain coordinates ("17.4600, 78.3320"), geo: URIs, and the common
 * long Google Maps / OpenStreetMap URL formats that carry coordinates.
 * Short links (maps.app.goo.gl) cannot be expanded from the browser.
 */
export function parseLocationInput(raw: string): ParseResult {
  const text = raw.trim();
  if (!text) return { ok: false, message: 'Enter coordinates or paste a map link.' };

  if (/maps\.app\.goo\.gl|goo\.gl\/maps/i.test(text)) {
    return {
      ok: false,
      message:
        'Short links can’t be read here. Open the link, long-press the exact spot, copy the coordinates shown, and paste them.',
    };
  }

  const patterns: RegExp[] = [
    new RegExp(`!3d${NUM}!4d${NUM}`), // Google place data (most precise)
    new RegExp(`[?&](?:q|query|ll|destination|center)=${NUM},\\s*${NUM}`),
    new RegExp(`@${NUM},${NUM}`),
    new RegExp(`mlat=${NUM}&mlon=${NUM}`), // openstreetmap.org
    new RegExp(`#map=\\d+/${NUM}/${NUM}`), // openstreetmap.org
    new RegExp(`geo:${NUM},${NUM}`),
    new RegExp(`^${NUM}\\s*[,;\\s]\\s*${NUM}$`),
  ];

  for (const pattern of patterns) {
    const m = text.match(pattern);
    if (m) {
      const lat = Number(m[1]);
      const lng = Number(m[2]);
      if (isValidLatLng(lat, lng)) return { ok: true, value: { lat, lng } };
      return { ok: false, message: 'Those numbers aren’t valid latitude/longitude values.' };
    }
  }
  return {
    ok: false,
    message: 'Couldn’t find coordinates. Use the format 17.4600, 78.3320.',
  };
}

export function formatCoords(p: LatLng, digits = 5): string {
  return `${p.lat.toFixed(digits)}, ${p.lng.toFixed(digits)}`;
}
