import { LocateFixed } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ConfirmDialog } from './components/ConfirmDialog';
import { DeliverySheet } from './components/DeliverySheet';
import { Header } from './components/Header';
import { LocationCard, LocationChip, locationView } from './components/LocationStatus';
import { PinEditor } from './components/PinEditor';
import { SecurityView } from './components/SecurityView';
import { TrackingMap, type TrackingMapHandle } from './components/TrackingMap';
import { ARRIVAL_WARNING_METERS, DELIVERY, LOCATION_ENABLED, ROUTING_CONFIG } from './config';
import { useDelivery } from './hooks/useDelivery';
import { useGeolocation } from './hooks/useGeolocation';
import { useNow } from './hooks/useNow';
import { useRoute } from './hooks/useRoute';
import { formatAccuracy, formatDistance, formatTime } from './lib/format';
import { haversineMeters } from './lib/geo';
import type { LatLng, PinSource } from './types';

type Dialog = 'arrive' | 'handover' | 'reset' | null;

export default function App() {
  const geo = useGeolocation();
  const delivery = useDelivery();
  const now = useNow(1000);
  const mapRef = useRef<TrackingMapHandle>(null);

  const view = locationView(geo, now);
  const fixIsLive = view === 'live';
  // The large card replaces the small chip while there is no position at all.
  const showLocationCard = !geo.fix && geo.status !== 'locating';
  const { state, markArrived, markHandedOver, setDestination, reset } = delivery;

  const route = useRoute({
    origin: geo.fix,
    originIsLive: fixIsLive,
    destination: state.destination,
    active: state.status === 'on_the_way',
  });

  const routeCoords = useMemo(() => {
    const s = route.state;
    if (s.status === 'ready') return s.route.coordinates;
    if (s.status === 'loading' && s.route) return s.route.coordinates;
    return null;
  }, [route.state]);
  const routeAttribution = routeCoords
    ? ROUTING_CONFIG.provider === 'osrm'
      ? 'Route: <a href="https://project-osrm.org">OSRM</a>'
      : 'Route: routing service'
    : undefined;

  // ---------------------------------------------------------- Security mode
  const [securityMode, setSecurityMode] = useState(
    () => window.history.state?.view === 'security',
  );
  useEffect(() => {
    const onPop = () => setSecurityMode(window.history.state?.view === 'security');
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);
  const openSecurity = useCallback(() => {
    window.history.pushState({ view: 'security' }, '');
    setSecurityMode(true);
  }, []);
  const closeSecurity = useCallback(() => {
    if (window.history.state?.view === 'security') window.history.back();
    else setSecurityMode(false);
  }, []);

  // ---------------------------------------------------------- Center button
  const pendingCenter = useRef(false);
  const [centerHint, setCenterHint] = useState<string | null>(null);
  const centerOnMe = () => {
    if (mapRef.current?.centerOnUser()) {
      setCenterHint(null);
      return;
    }
    pendingCenter.current = true;
    if (geo.status === 'idle' || geo.status === 'denied' || geo.status === 'unavailable') geo.start();
    setCenterHint(
      geo.status === 'unsupported' || geo.status === 'insecure'
        ? 'Location unavailable on this page.'
        : 'Waiting for GPS… the map will center when it arrives.',
    );
  };
  useEffect(() => {
    if (geo.fix && pendingCenter.current) {
      pendingCenter.current = false;
      setCenterHint(null);
      mapRef.current?.centerOnUser();
    }
  }, [geo.fix]);
  useEffect(() => {
    if (!centerHint) return;
    const t = window.setTimeout(() => setCenterHint(null), 5000);
    return () => window.clearTimeout(t);
  }, [centerHint]);

  // ---------------------------------------------------------- Pin editing
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<{ point: LatLng; source: PinSource } | null>(null);
  const startEditing = () => {
    if (securityMode) closeSecurity();
    setDraft({
      point: { lat: state.destination.lat, lng: state.destination.lng },
      source: state.destination.source,
    });
    setEditing(true);
  };
  const changeDraft = (point: LatLng, source: PinSource) => {
    setDraft({ point, source });
    if (source !== 'map') mapRef.current?.panTo(point);
  };
  const saveDraft = () => {
    if (draft) setDestination(draft.point, draft.source === 'default' ? 'map' : draft.source);
    setEditing(false);
    setDraft(null);
  };
  const cancelEditing = () => {
    setEditing(false);
    setDraft(null);
  };

  // ---------------------------------------------------------- Dialogs
  const [dialog, setDialog] = useState<Dialog>(null);
  const liveFix = fixIsLive ? geo.fix : null;
  const distanceToPin =
    liveFix && state.destination.confirmed ? haversineMeters(liveFix, state.destination) : null;

  // Screen-reader announcement for status changes (not the ticking clock).
  const announcement = useMemo(() => {
    if (view === 'live') return 'Live GPS location is on.';
    if (view === 'locating') return 'Finding your GPS position.';
    if (view === 'unavailable') return 'Location unavailable.';
    if (view === 'stale') return 'GPS location may be outdated.';
    return '';
  }, [view]);

  return (
    <div className={`app ${LOCATION_ENABLED ? '' : 'app--no-map'}`}>
      <Header
        onAdjustPin={LOCATION_ENABLED ? startEditing : undefined}
        onReset={() => setDialog('reset')}
      />
      <p className="sr-only" aria-live="polite">
        {announcement}
      </p>

      <main className={`layout ${LOCATION_ENABLED ? '' : 'layout--no-map'}`}>
        {LOCATION_ENABLED && (
        <section className="map-pane" aria-label="Live map">
          <TrackingMap
            ref={mapRef}
            fix={geo.fix}
            fixIsLive={fixIsLive}
            destination={state.destination}
            destinationLabel={DELIVERY.destinationName}
            route={routeCoords}
            routeAttribution={routeAttribution}
            editing={editing}
            draftPin={draft?.point ?? null}
            onDraftPinChange={(p) => changeDraft(p, 'map')}
            ariaLabel="Map showing your GPS position and the LH-10 Mess destination"
          />
          {!editing && !showLocationCard && (
            <div className="map-pane__top">
              <LocationChip geo={geo} now={now} />
            </div>
          )}
          {!editing && showLocationCard && <LocationCard geo={geo} />}
          {!editing && (
            <div className="map-pane__bottom">
              {centerHint && (
                <p className="toast" role="status">
                  {centerHint}
                </p>
              )}
              <button type="button" className="fab" onClick={centerOnMe}>
                <LocateFixed size={18} aria-hidden="true" /> Center on My Location
              </button>
            </div>
          )}
        </section>
        )}

        {editing && draft ? (
          <PinEditor
            draft={draft.point}
            draftSource={draft.source}
            fix={geo.fix}
            fixIsLive={fixIsLive}
            onDraftChange={changeDraft}
            onSave={saveDraft}
            onCancel={cancelEditing}
          />
        ) : (
          <DeliverySheet
            delivery={state}
            geo={geo}
            route={route.state}
            now={now}
            onRetryRoute={route.retry}
            onArrive={() => setDialog('arrive')}
            onHandover={() => setDialog('handover')}
            onShowSecurity={openSecurity}
            onAdjustPin={startEditing}
            onReset={() => setDialog('reset')}
          />
        )}
      </main>

      {securityMode && (
        <SecurityView
          delivery={state}
          geo={geo}
          routeCoords={routeCoords}
          routeAttribution={routeAttribution}
          now={now}
          onBack={closeSecurity}
        />
      )}

      <ConfirmDialog
        open={dialog === 'arrive'}
        title="Mark as arrived?"
        confirmLabel="Yes, I’ve arrived"
        onCancel={() => setDialog(null)}
        onConfirm={() => {
          markArrived(liveFix);
          setDialog(null);
        }}
      >
        <p>
          This updates the status to <strong>Arrived at destination</strong> ({DELIVERY.destinationName})
          and records the time{liveFix ? ' and your current GPS reading' : ''}.
        </p>
        {liveFix ? (
          <p className="dialog__meta">
            GPS now: {formatTime(liveFix.timestamp)} · {formatAccuracy(liveFix.accuracy)}
          </p>
        ) : (
          <p className="dialog__meta">No live GPS reading — only the time will be recorded.</p>
        )}
        {distanceToPin !== null && distanceToPin > ARRIVAL_WARNING_METERS && (
          <p className="dialog__warn">
            Your GPS position is about {formatDistance(distanceToPin)} (straight line) from the
            destination pin. Check that you’re at the right place, or adjust the pin.
          </p>
        )}
      </ConfirmDialog>

      <ConfirmDialog
        open={dialog === 'handover'}
        title="Confirm parcel handover"
        confirmLabel="Mark as handed over"
        acknowledgement="I have handed the parcel to the hostel security."
        onCancel={() => setDialog(null)}
        onConfirm={() => {
          markHandedOver(liveFix);
          setDialog(null);
        }}
      >
        <p>
          This marks the delivery as <strong>Handed over to security</strong>. It can’t be undone
          except by starting a new delivery.
        </p>
      </ConfirmDialog>

      <ConfirmDialog
        open={dialog === 'reset'}
        title="Start a new delivery?"
        confirmLabel="Start new delivery"
        tone="danger"
        onCancel={() => setDialog(null)}
        onConfirm={() => {
          reset();
          setDialog(null);
        }}
      >
        <p>
          The progress steps go back to <strong>On the way</strong>. Your saved destination pin is
          kept.
        </p>
      </ConfirmDialog>
    </div>
  );
}
