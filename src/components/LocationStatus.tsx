import { LoaderCircle, LocateOff, MapPin, RefreshCw, TriangleAlert } from 'lucide-react';
import { GPS_CONFIG } from '../config';
import type { GeolocationState } from '../hooks/useGeolocation';
import { formatAccuracy, formatAgo, formatTime } from '../lib/format';

interface ChipProps {
  geo: GeolocationState;
  now: number;
}

export type LocationView = 'live' | 'stale' | 'locating' | 'off' | 'unavailable';

export function locationView(geo: GeolocationState, now: number): LocationView {
  switch (geo.status) {
    case 'active':
      return geo.fix && now - geo.fix.timestamp > GPS_CONFIG.staleAfterMs ? 'stale' : 'live';
    case 'locating':
      return 'locating';
    case 'idle':
      return 'off';
    default:
      return 'unavailable';
  }
}

/** Small status pill that floats over the top of the map. */
export function LocationChip({ geo, now }: ChipProps) {
  const view = locationView(geo, now);
  const fix = geo.fix;

  if (view === 'live' && fix) {
    return (
      <div className="loc-chip loc-chip--live">
        <span className="live-dot" aria-hidden="true" />
        <span>
          <strong>Live GPS</strong> · {formatAccuracy(fix.accuracy)} · {formatTime(fix.timestamp)}
        </span>
      </div>
    );
  }
  if (view === 'stale' && fix) {
    return (
      <div className="loc-chip loc-chip--warn">
        <TriangleAlert size={16} aria-hidden="true" />
        <span>
          <strong>GPS may be outdated</strong> · {formatAgo(now - fix.timestamp)}
        </span>
      </div>
    );
  }
  if (view === 'locating') {
    return (
      <div className="loc-chip">
        <LoaderCircle size={16} className="spin" aria-hidden="true" />
        <span>Finding your GPS position…</span>
      </div>
    );
  }
  if (view === 'off') {
    return (
      <div className="loc-chip">
        <LocateOff size={16} aria-hidden="true" />
        <span>Location off</span>
      </div>
    );
  }
  return (
    <div className="loc-chip loc-chip--error">
      <LocateOff size={16} aria-hidden="true" />
      <span>
        <strong>Location unavailable</strong>
        {fix ? ` · last known ${formatAgo(now - fix.timestamp)}` : ''}
      </span>
      {geo.status !== 'unsupported' && geo.status !== 'insecure' && (
        <button type="button" className="loc-chip__retry" onClick={geo.start}>
          <RefreshCw size={14} aria-hidden="true" /> Retry
        </button>
      )}
    </div>
  );
}

interface CardProps {
  geo: GeolocationState;
}

/** Large overlay shown on the map when there is no position to show. */
export function LocationCard({ geo }: CardProps) {
  if (geo.fix) return null;

  if (geo.status === 'idle') {
    return (
      <div className="map-card" role="group" aria-labelledby="loc-card-title">
        <div className="map-card__head">
          <span className="map-card__icon" aria-hidden="true">
            <MapPin size={20} />
          </span>
          <h2 id="loc-card-title" className="map-card__title">
            Share your live location
          </h2>
        </div>
        <p className="map-card__text">
          Your GPS position stays in this browser. It’s shared only with the routing service, to
          calculate the route to the destination.
        </p>
        <button type="button" className="btn btn--primary btn--block" onClick={geo.start}>
          Enable location
        </button>
      </div>
    );
  }

  if (geo.status === 'locating') return null;

  const help: Record<string, string> = {
    denied:
      'Allow location for this site: tap the icon left of the address bar → Permissions → Location → Allow. Then tap Retry.',
    unavailable:
      'Turn on Location in your phone’s quick settings, and make sure “Use precise location” is allowed for Chrome.',
    unsupported: 'Open this page in Chrome or another up-to-date browser.',
    insecure: 'Open the https:// address of this tracker. Browsers block GPS on plain http:// pages.',
  };

  return (
    <div className="map-card map-card--error" role="group" aria-labelledby="loc-card-title">
      <div className="map-card__head">
        <span className="map-card__icon" aria-hidden="true">
          <LocateOff size={20} />
        </span>
        <h2 id="loc-card-title" className="map-card__title">
          Location unavailable
        </h2>
      </div>
      {geo.message && <p className="map-card__text">{geo.message}</p>}
      <p className="map-card__text map-card__text--muted">{help[geo.status]}</p>
      {geo.status !== 'unsupported' && geo.status !== 'insecure' && (
        <button type="button" className="btn btn--primary btn--block" onClick={geo.start}>
          <RefreshCw size={18} aria-hidden="true" /> Retry
        </button>
      )}
    </div>
  );
}
