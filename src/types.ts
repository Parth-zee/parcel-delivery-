export interface LatLng {
  lat: number;
  lng: number;
}

/** One real reading from the browser Geolocation API. */
export interface GpsFix extends LatLng {
  /** Radius of 68% confidence, in metres, as reported by the device. */
  accuracy: number;
  /** When the device took the reading (ms since epoch). */
  timestamp: number;
  speed: number | null;
  heading: number | null;
}

export type GeoStatus =
  | 'idle' // permission not requested yet
  | 'locating' // waiting for the first fix
  | 'active' // receiving fixes
  | 'denied' // the person (or browser) blocked location access
  | 'unavailable' // permission granted but no GPS signal / position error
  | 'unsupported' // browser has no Geolocation API
  | 'insecure'; // page not served over HTTPS, so the browser refuses GPS

export type DeliveryStatus = 'on_the_way' | 'arrived' | 'handed_over';

export type PinSource = 'default' | 'map' | 'gps' | 'coordinates';

export interface Destination extends LatLng {
  /** True once the delivery person has checked and saved the pin. */
  confirmed: boolean;
  confirmedAt: number | null;
  source: PinSource;
}

export interface DeliveryState {
  version: 1;
  status: DeliveryStatus;
  /** When this tracking session was started on this device. */
  startedAt: number;
  arrivedAt: number | null;
  /** GPS reading at the moment arrival was confirmed, if one was available. */
  arrivedFix: GpsFix | null;
  handedOverAt: number | null;
  handoverFix: GpsFix | null;
  destination: Destination;
}

export interface RouteResult {
  distanceMeters: number;
  durationSeconds: number;
  /** [lat, lng] pairs */
  coordinates: [number, number][];
  provider: string;
  profile: string;
  fetchedAt: number;
}

export type RouteState =
  | { status: 'disabled' }
  | { status: 'not-needed' }
  | { status: 'needs-pin' }
  | { status: 'needs-gps' }
  | { status: 'loading'; route: RouteResult | null }
  | { status: 'ready'; route: RouteResult }
  | { status: 'error'; message: string; route: null };
