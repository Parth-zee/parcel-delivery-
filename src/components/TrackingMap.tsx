import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { MAP_CONFIG } from '../config';
import type { Destination, GpsFix, LatLng } from '../types';

export interface TrackingMapHandle {
  /** Pans to the GPS position. Returns false if there is no position yet. */
  centerOnUser: () => boolean;
  /** Fits the GPS position, destination and route on screen. */
  fitAll: () => void;
  panTo: (p: LatLng) => void;
}

interface Props {
  fix: GpsFix | null;
  /** False when `fix` is only a last-known position. */
  fixIsLive: boolean;
  destination: Destination;
  destinationLabel: string;
  route: [number, number][] | null;
  routeAttribution?: string;
  /** Pin-adjust mode: the destination pin can be dragged, or moved by tapping the map. */
  editing?: boolean;
  draftPin?: LatLng | null;
  onDraftPinChange?: (p: LatLng) => void;
  compact?: boolean;
  ariaLabel: string;
}

const userIcon = (live: boolean) =>
  L.divIcon({
    className: '',
    html: `<div class="user-dot ${live ? '' : 'user-dot--stale'}" aria-hidden="true"><span></span></div>`,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
  });

const destIcon = (editing: boolean) =>
  L.divIcon({
    className: '',
    html: `<div class="dest-pin ${editing ? 'dest-pin--editing' : ''}" aria-hidden="true">
      <svg viewBox="0 0 40 52" width="40" height="52"><path d="M20 1.5C9.8 1.5 1.5 9.6 1.5 19.7 1.5 33 20 50.5 20 50.5S38.5 33 38.5 19.7C38.5 9.6 30.2 1.5 20 1.5Z" /><circle cx="20" cy="19.5" r="7.5" /></svg>
    </div>`,
    iconSize: [40, 52],
    iconAnchor: [20, 50],
    tooltipAnchor: [0, -46],
  });

/**
 * Room around fitted points so the pin (and its label above it) clears the
 * status chip at the top and the button / sheet edge at the bottom.
 */
const fitPadding = (compact: boolean): L.FitBoundsOptions =>
  compact
    ? { paddingTopLeft: [36, 96], paddingBottomRight: [36, 28] }
    : { paddingTopLeft: [44, 140], paddingBottomRight: [56, 96] };

export const TrackingMap = forwardRef<TrackingMapHandle, Props>(function TrackingMap(
  {
    fix,
    fixIsLive,
    destination,
    destinationLabel,
    route,
    routeAttribution,
    editing = false,
    draftPin = null,
    onDraftPinChange,
    compact = false,
    ariaLabel,
  },
  ref,
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const userMarker = useRef<L.Marker | null>(null);
  const accuracyCircle = useRef<L.Circle | null>(null);
  const destMarker = useRef<L.Marker | null>(null);
  const routeLayer = useRef<L.LayerGroup | null>(null);
  const fittedOnce = useRef(false);
  const onDraftRef = useRef(onDraftPinChange);
  onDraftRef.current = onDraftPinChange;
  const editingRef = useRef(editing);
  editingRef.current = editing;

  const pinPosition: LatLng = editing && draftPin ? draftPin : destination;

  // Create the map once.
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, {
      zoomControl: false,
      attributionControl: true,
      center: [destination.lat, destination.lng],
      zoom: 15,
    });
    L.control.zoom({ position: 'topright' }).addTo(map);
    map.attributionControl.setPrefix('<a href="https://leafletjs.com">Leaflet</a>');
    L.tileLayer(MAP_CONFIG.tileUrl, {
      attribution: MAP_CONFIG.attribution,
      maxZoom: MAP_CONFIG.maxZoom,
      crossOrigin: true,
    }).addTo(map);
    routeLayer.current = L.layerGroup().addTo(map);

    map.on('click', (e: L.LeafletMouseEvent) => {
      if (editingRef.current) onDraftRef.current?.({ lat: e.latlng.lat, lng: e.latlng.lng });
    });

    const ro = new ResizeObserver(() => map.invalidateSize());
    ro.observe(containerRef.current);
    mapRef.current = map;
    return () => {
      ro.disconnect();
      map.remove();
      mapRef.current = null;
      userMarker.current = null;
      accuracyCircle.current = null;
      destMarker.current = null;
      routeLayer.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // GPS marker + accuracy circle.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (!fix) {
      userMarker.current?.remove();
      accuracyCircle.current?.remove();
      userMarker.current = null;
      accuracyCircle.current = null;
      return;
    }
    const ll: L.LatLngExpression = [fix.lat, fix.lng];
    if (!userMarker.current) {
      accuracyCircle.current = L.circle(ll, {
        radius: fix.accuracy,
        className: 'accuracy-circle',
        interactive: false,
      }).addTo(map);
      userMarker.current = L.marker(ll, {
        icon: userIcon(fixIsLive),
        keyboard: false,
        zIndexOffset: 500,
        title: fixIsLive ? 'Your current GPS position' : 'Your last known GPS position',
      }).addTo(map);
    } else {
      userMarker.current.setLatLng(ll);
      userMarker.current.setIcon(userIcon(fixIsLive));
      accuracyCircle.current?.setLatLng(ll).setRadius(fix.accuracy);
    }
    accuracyCircle.current?.setStyle({
      color: fixIsLive ? '#2563eb' : '#8a8a93',
      fillColor: fixIsLive ? '#3b82f6' : '#a1a1aa',
    });
  }, [fix, fixIsLive]);

  // Destination pin.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const ll: L.LatLngExpression = [pinPosition.lat, pinPosition.lng];
    if (!destMarker.current) {
      destMarker.current = L.marker(ll, {
        icon: destIcon(editing),
        draggable: editing,
        keyboard: false,
        zIndexOffset: 400,
      }).addTo(map);
      destMarker.current.on('dragend', () => {
        const p = destMarker.current?.getLatLng();
        if (p) onDraftRef.current?.({ lat: p.lat, lng: p.lng });
      });
    } else {
      destMarker.current.setLatLng(ll);
      destMarker.current.setIcon(destIcon(editing));
    }
    const m = destMarker.current;
    if (editing) m.dragging?.enable();
    else m.dragging?.disable();

    const label = editing
      ? 'Drag me to the entrance'
      : `${destinationLabel}${destination.confirmed ? '' : ' (approx.)'}`;
    m.unbindTooltip();
    m.bindTooltip(label, {
      permanent: true,
      direction: 'top',
      className: 'dest-tooltip',
      offset: [0, 0],
    });
  }, [pinPosition.lat, pinPosition.lng, editing, destination.confirmed, destinationLabel]);

  // Route line.
  useEffect(() => {
    const map = mapRef.current;
    const group = routeLayer.current;
    if (!map || !group) return;
    group.clearLayers();
    if (route && route.length > 1 && !editing) {
      L.polyline(route, { className: 'route-casing', weight: 9, interactive: false }).addTo(group);
      L.polyline(route, { className: 'route-line', weight: 5, interactive: false }).addTo(group);
    }
    const attr = map.attributionControl;
    if (routeAttribution) {
      attr.addAttribution(routeAttribution);
      return () => {
        attr.removeAttribution(routeAttribution);
      };
    }
  }, [route, routeAttribution, editing]);

  // Fit both points on screen the first time a GPS position arrives.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !fix || fittedOnce.current || editing) return;
    fittedOnce.current = true;
    map.invalidateSize(); // the container may have been resized since creation
    map.fitBounds(
      L.latLngBounds([
        [fix.lat, fix.lng],
        [destination.lat, destination.lng],
      ]),
      { ...fitPadding(compact), maxZoom: 17 },
    );
  }, [fix, destination.lat, destination.lng, editing, compact]);

  useImperativeHandle(
    ref,
    () => ({
      centerOnUser: () => {
        const map = mapRef.current;
        if (!map || !fix) return false;
        map.invalidateSize();
        map.flyTo([fix.lat, fix.lng], Math.max(map.getZoom(), 17), { duration: 0.6 });
        return true;
      },
      fitAll: () => {
        const map = mapRef.current;
        if (!map) return;
        const pts: L.LatLngExpression[] = [[destination.lat, destination.lng]];
        if (fix) pts.push([fix.lat, fix.lng]);
        if (route) pts.push(...route);
        if (pts.length === 1) map.setView(pts[0], 16);
        else map.fitBounds(L.latLngBounds(pts), { ...fitPadding(compact), maxZoom: 17 });
      },
      panTo: (p: LatLng) => {
        mapRef.current?.setView([p.lat, p.lng], Math.max(mapRef.current.getZoom(), 17));
      },
    }),
    [fix, destination.lat, destination.lng, route, compact],
  );

  // Leaflet adds its own classes to the container element, so React must not
  // manage that element's className: the changing classes live on a wrapper.
  return (
    <div
      className={`map ${compact ? 'map--compact' : ''} ${editing ? 'map--editing' : ''}`}
      role="region"
      aria-label={ariaLabel}
    >
      <div ref={containerRef} className="map__canvas" />
    </div>
  );
});
