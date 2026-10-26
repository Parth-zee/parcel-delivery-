import { LoaderCircle, MapPinned, RefreshCw, Route, TriangleAlert } from 'lucide-react';
import { formatDistance, formatDuration } from '../lib/format';
import { travelModeLabel } from '../lib/routing';
import type { RouteState } from '../types';

interface Props {
  state: RouteState;
  onRetry: () => void;
  onSetPin: () => void;
}

/** Distance and ETA — shown only when they come from real route data. */
export function RouteSummary({ state, onRetry, onSetPin }: Props) {
  switch (state.status) {
    case 'disabled':
    case 'not-needed':
      return null;

    case 'needs-pin':
      return (
        <div className="route-row route-row--notice">
          <MapPinned size={18} aria-hidden="true" />
          <p>
            Destination pin is approximate. <strong>Set the exact LH-10 Mess spot</strong> to get a
            route.
          </p>
          <button type="button" className="btn btn--small btn--outline" onClick={onSetPin}>
            Set pin
          </button>
        </div>
      );

    case 'needs-gps':
      return (
        <div className="route-row route-row--muted">
          <Route size={18} aria-hidden="true" />
          <p>Route and travel time appear once live GPS is available.</p>
        </div>
      );

    case 'error':
      return (
        <div className="route-row route-row--notice">
          <TriangleAlert size={18} aria-hidden="true" />
          <p>Route unavailable. {state.message}</p>
          <button type="button" className="btn btn--small btn--outline" onClick={onRetry}>
            <RefreshCw size={14} aria-hidden="true" /> Retry
          </button>
        </div>
      );

    case 'loading':
      if (!state.route) {
        return (
          <div className="route-row route-row--muted">
            <LoaderCircle size={18} className="spin" aria-hidden="true" />
            <p>Calculating route…</p>
          </div>
        );
      }
      return <RouteFacts route={state.route} updating />;

    case 'ready':
      return <RouteFacts route={state.route} />;
  }
}

function RouteFacts({
  route,
  updating = false,
}: {
  route: { distanceMeters: number; durationSeconds: number; profile: string; provider: string };
  updating?: boolean;
}) {
  const mode = travelModeLabel(route.profile);
  const isCar = /driv|car/i.test(route.profile);
  return (
    <div className="route-facts" aria-live="off">
      <div className="route-facts__item">
        <span className="route-facts__value">{formatDistance(route.distanceMeters)}</span>
        <span className="route-facts__label">{mode}</span>
      </div>
      <span className="route-facts__sep" aria-hidden="true" />
      <div className="route-facts__item">
        <span className="route-facts__value">≈ {formatDuration(route.durationSeconds)}</span>
        <span className="route-facts__label">{isCar ? 'est. drive time' : 'est. travel time'}</span>
      </div>
      <span className="route-facts__source">
        {updating ? 'Updating…' : `Route: ${route.provider}`}
      </span>
    </div>
  );
}
