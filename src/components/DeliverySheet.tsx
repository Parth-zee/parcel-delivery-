import { CircleCheck, LocateOff, MapPin, MapPinned, PackageCheck, ScanEye } from 'lucide-react';
import { DELIVERY, LOCATION_ENABLED } from '../config';
import type { GeolocationState } from '../hooks/useGeolocation';
import { formatAccuracy, formatAgo, formatDateTime } from '../lib/format';
import type { DeliveryState, RouteState } from '../types';
import { RouteSummary } from './RouteSummary';
import { STATUS_LABEL, StatusTimeline } from './StatusTimeline';

interface Props {
  delivery: DeliveryState;
  geo: GeolocationState;
  route: RouteState;
  now: number;
  onRetryRoute: () => void;
  onArrive: () => void;
  onHandover: () => void;
  onShowSecurity: () => void;
  onAdjustPin: () => void;
  onReset: () => void;
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join('');
}

export function DeliverySheet({
  delivery,
  geo,
  route,
  now,
  onRetryRoute,
  onArrive,
  onHandover,
  onShowSecurity,
  onAdjustPin,
  onReset,
}: Props) {
  const { status, destination } = delivery;
  const fix = geo.fix;

  return (
    <section className="sheet" aria-labelledby="partner-name">
      <div className="sheet__handle" aria-hidden="true" />
      <p className="eyebrow">Your Parcel Delivery</p>

      <div className="partner">
        <span className="avatar" aria-hidden="true">
          {initials(DELIVERY.partnerName)}
        </span>
        <div className="partner__text">
          <h2 id="partner-name" className="partner__name">
            {DELIVERY.partnerName}
          </h2>
          <p className="partner__role">Delivery partner · {DELIVERY.deliveryType}</p>
        </div>
      </div>

      <div className="dest">
        <span className="dest__icon" aria-hidden="true">
          <MapPin size={18} />
        </span>
        <div>
          <p className="dest__title">Delivering to {DELIVERY.destinationName}</p>
          <p className="dest__sub">{DELIVERY.destinationShort}</p>
        </div>
      </div>

      <div className="status-line">
        <span className="status-line__label">Status:</span>
        <span className={`status-pill status-pill--${status}`}>{STATUS_LABEL[status]}</span>
      </div>

      <div className="actions">
        {status === 'on_the_way' && (
          <button type="button" className="btn btn--primary btn--lg" onClick={onArrive}>
            <CircleCheck size={20} aria-hidden="true" /> I’ve Arrived
          </button>
        )}
        {status === 'arrived' && (
          <button type="button" className="btn btn--primary btn--lg" onClick={onHandover}>
            <PackageCheck size={20} aria-hidden="true" /> Confirm Handover
          </button>
        )}
        <button
          type="button"
          className={`btn btn--dark btn--lg ${status === 'handed_over' ? 'btn--span' : ''}`}
          onClick={onShowSecurity}
        >
          <ScanEye size={20} aria-hidden="true" /> Show to Security
        </button>
      </div>

      {LOCATION_ENABLED ? (
        <RouteSummary state={route} onRetry={onRetryRoute} onSetPin={onAdjustPin} />
      ) : (
        <div className="route-row route-row--muted">
          <LocateOff size={18} aria-hidden="true" />
          <p>Live location and map are off in this version of the page.</p>
        </div>
      )}

      {status === 'handed_over' && (
        <p className="done-note" role="status">
          <PackageCheck size={18} aria-hidden="true" /> Delivery complete. Thanks!
        </p>
      )}

      <h3 className="section-title">Delivery progress</h3>
      <StatusTimeline state={delivery} />

      <h3 className="section-title">Details</h3>
      <dl className="details">
        <div>
          <dt>Destination</dt>
          <dd>
            {DELIVERY.destinationName}, {DELIVERY.destinationShort}
          </dd>
        </div>
        <div>
          <dt>City</dt>
          <dd>{DELIVERY.city}</dd>
        </div>
        <div>
          <dt>Delivery type</dt>
          <dd>{DELIVERY.deliveryType}</dd>
        </div>
        {LOCATION_ENABLED && (
        <div>
          <dt>Destination pin</dt>
          <dd className="details__with-action">
            <span>
              {destination.confirmed ? 'Checked by you' : 'Approximate — not yet checked'}
            </span>
            <button type="button" className="link-btn" onClick={onAdjustPin}>
              <MapPinned size={15} aria-hidden="true" /> Adjust
            </button>
          </dd>
        </div>
        )}
        {!LOCATION_ENABLED && (
          <div>
            <dt>Live location</dt>
            <dd>Not available in this version</dd>
          </div>
        )}
        {LOCATION_ENABLED && (
        <>
        <div>
          <dt>Last updated</dt>
          <dd>
            {fix ? (
              <>
                {formatDateTime(fix.timestamp)}
                <span className="details__muted"> ({formatAgo(now - fix.timestamp)})</span>
              </>
            ) : (
              'No GPS reading yet'
            )}
          </dd>
        </div>
        <div>
          <dt>GPS accuracy</dt>
          <dd>{fix ? `${formatAccuracy(fix.accuracy)} (reported by the phone)` : '—'}</dd>
        </div>
        </>
        )}
      </dl>

      <p className="disclaimer">
        Personal tracking page run by the delivery person on their own phone. Not affiliated with
        any delivery company, the University of Hyderabad, or the hostel administration.
      </p>
      <button type="button" className="link-btn link-btn--muted" onClick={onReset}>
        Start a new delivery…
      </button>
    </section>
  );
}
