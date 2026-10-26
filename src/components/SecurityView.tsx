import { ArrowLeft, Info } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { DELIVERY, LOCATION_ENABLED } from '../config';
import type { GeolocationState } from '../hooks/useGeolocation';
import { useWakeLock } from '../hooks/useWakeLock';
import { formatAccuracy, formatAgo, formatTime } from '../lib/format';
import type { DeliveryState } from '../types';
import { locationView } from './LocationStatus';
import { STATUS_LABEL, StatusTimeline } from './StatusTimeline';
import { TrackingMap } from './TrackingMap';

interface Props {
  delivery: DeliveryState;
  geo: GeolocationState;
  routeCoords: [number, number][] | null;
  routeAttribution?: string;
  now: number;
  onBack: () => void;
}

/** Large, high-contrast summary to hand to the hostel security desk. */
export function SecurityView({ delivery, geo, routeCoords, routeAttribution, now, onBack }: Props) {
  useWakeLock(true);
  const backRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    backRef.current?.focus();
    document.body.classList.add('no-scroll');
    return () => document.body.classList.remove('no-scroll');
  }, []);

  const view = locationView(geo, now);
  const fix = geo.fix;
  const fixIsLive = view === 'live';

  const handover = delivery.handedOverAt
    ? `Handed over at ${formatTime(delivery.handedOverAt)}`
    : 'Not handed over yet';

  return (
    <div className="security" role="dialog" aria-modal="true" aria-labelledby="sec-name">
      <div className="security__bar">
        <button ref={backRef} type="button" className="btn btn--ghost btn--small" onClick={onBack}>
          <ArrowLeft size={18} aria-hidden="true" /> Back
        </button>
        <span className="chip chip--orange">Personal Parcel Delivery</span>
      </div>

      <div className="security__scroll">
        <div className={`security__grid ${LOCATION_ENABLED ? '' : 'security__grid--no-map'}`}>
          <div className="security__info">
            <p className="security__label">Delivery partner</p>
            <p id="sec-name" className="security__name">
              {DELIVERY.partnerName}
            </p>

            <p className="security__label">Delivering to</p>
            <p className="security__dest">{DELIVERY.destinationName}</p>
            <p className="security__place">
              {DELIVERY.destinationPlace}, {DELIVERY.city}
            </p>

            <div className={`security__status security__status--${delivery.status}`}>
              <span className="security__label">Current status</span>
              <span className="security__status-text">{STATUS_LABEL[delivery.status]}</span>
            </div>

            <div className="security__facts">
              <div className="fact">
                <span className="fact__label">Parcel handover</span>
                <span
                  className={`fact__value ${delivery.handedOverAt ? 'fact__value--ok' : 'fact__value--pending'}`}
                >
                  {handover}
                </span>
              </div>
              <div className="fact">
                <span className="fact__label">Last GPS update</span>
                {fix ? (
                  <span className={`fact__value ${fixIsLive ? '' : 'fact__value--warn'}`}>
                    {formatTime(fix.timestamp)}
                    <span className="fact__sub">
                      {formatAgo(now - fix.timestamp)} · {formatAccuracy(fix.accuracy)}
                      {fixIsLive ? '' : ' · not live'}
                    </span>
                  </span>
                ) : (
                  <span className="fact__value fact__value--warn">Location unavailable</span>
                )}
              </div>
            </div>
          </div>

          {LOCATION_ENABLED && (
          <div className="security__map-wrap">
            <TrackingMap
              fix={fix}
              fixIsLive={fixIsLive}
              destination={delivery.destination}
              destinationLabel={DELIVERY.destinationName}
              route={routeCoords}
              routeAttribution={routeAttribution}
              compact
              ariaLabel="Map of the delivery person's current position and the destination"
            />
            {!fix && (
              <p className="security__map-note">
                Location unavailable — the map shows the destination only.
              </p>
            )}
            {!delivery.destination.confirmed && (
              <p className="security__map-note security__map-note--soft">
                Destination pin is approximate.
              </p>
            )}
          </div>
          )}

          <div className="security__timeline">
            <StatusTimeline state={delivery} perspective="security" />
          </div>
        </div>

        <p className="security__disclaimer">
          <Info size={16} aria-hidden="true" />
          <span>
            Information entered by the delivery person on their own phone. This is not an official
            pass and has not been verified by any company, the university, or the hostel.
          </span>
        </p>

        <button type="button" className="btn btn--dark btn--lg btn--block" onClick={onBack}>
          <ArrowLeft size={20} aria-hidden="true" /> Back to tracking screen
        </button>
      </div>
    </div>
  );
}
