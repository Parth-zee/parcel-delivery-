/**
 * Everything specific to this delivery lives here. Edit these values to reuse
 * the tracker for another delivery.
 */
export const DELIVERY = {
  partnerName: 'Parth Malviya',
  deliveryType: 'Personal Parcel',
  destinationName: 'LH-10 Mess',
  destinationPlace: 'University of Hyderabad',
  destinationShort: 'University of Hyderabad, Hyderabad',
  city: 'Hyderabad, Telangana',
} as const;

/**
 * Starting position for the destination pin.
 *
 * The exact entrance of LH-10 Mess could not be verified from public map data,
 * so this is the University of Hyderabad campus reference point (Wikipedia
 * infobox: 17.4599791 N, 78.3320099 E). The app treats it as UNCONFIRMED and
 * asks the delivery person to place the real pin before it draws a route.
 *
 * If you already know the exact coordinates, put them here and set
 * `confirmed: true` to skip that step.
 */
export const DEFAULT_DESTINATION = {
  lat: 17.4599791,
  lng: 78.3320099,
  confirmed: false,
  description: 'University of Hyderabad campus (approximate)',
} as const;

/**
 * Published by the University of Hyderabad in its campus QR-code directory
 * (entry: "Ladies Hostels 9 & 10"). Shown as a reference when placing the pin.
 */
export const DESTINATION_REFERENCE_LINK = {
  url: 'https://maps.app.goo.gl/F8qzYfMzC5THJZoB6',
  label: 'UoH campus directory: Ladies Hostels 9 & 10',
} as const;

const env = import.meta.env;

/**
 * Set VITE_LOCATION=off to build a version without GPS, map and routing, for
 * places that block location access (for example a page shown inside another
 * app). Everything else keeps working and the page says location is off.
 */
export const LOCATION_ENABLED = env.VITE_LOCATION !== 'off';

export const MAP_CONFIG = {
  tileUrl: env.VITE_TILE_URL || 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
  attribution:
    env.VITE_TILE_ATTRIBUTION ||
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  maxZoom: Number(env.VITE_TILE_MAX_ZOOM) || 19,
} as const;

export type RoutingProvider = 'osrm' | 'proxy' | 'none';

function readProvider(value: string | undefined): RoutingProvider {
  if (value === 'proxy' || value === 'none' || value === 'osrm') return value;
  return 'osrm';
}

export const ROUTING_CONFIG = {
  provider: readProvider(env.VITE_ROUTING_PROVIDER),
  osrmUrl: (env.VITE_OSRM_URL || 'https://router.project-osrm.org').replace(/\/+$/, ''),
  osrmProfile: env.VITE_OSRM_PROFILE || 'driving',
  proxyUrl: env.VITE_ROUTING_PROXY_URL || '/api/route',
  /** Re-route only after moving at least this far from the last routed point. */
  rerouteAfterMeters: 60,
  /** Never ask the routing service more often than this. */
  minIntervalMs: 15_000,
} as const;

export const GPS_CONFIG = {
  /** A reading older than this is shown as "may be outdated". */
  staleAfterMs: 2 * 60_000,
  /** Extra fresh reading requested this often while the page is visible. */
  refreshEveryMs: 30_000,
  timeoutMs: 20_000,
} as const;

/** Warn (but still allow) "I've Arrived" when GPS is farther than this from the pin. */
export const ARRIVAL_WARNING_METERS = 300;
