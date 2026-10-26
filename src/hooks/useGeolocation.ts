import { useCallback, useEffect, useRef, useState } from 'react';
import { GPS_CONFIG, LOCATION_ENABLED } from '../config';
import type { GeoStatus, GpsFix } from '../types';

export interface GeolocationState {
  status: GeoStatus;
  /** Latest real reading. Kept after a signal loss so it can be shown as "last known". */
  fix: GpsFix | null;
  /** Explanation for denied / unavailable states. */
  message: string | null;
  /** Begin (or retry) location tracking. Safe to call repeatedly. */
  start: () => void;
}

function initialStatus(): GeoStatus {
  if (!LOCATION_ENABLED) return 'unsupported';
  if (typeof navigator === 'undefined' || !('geolocation' in navigator)) return 'unsupported';
  if (typeof window !== 'undefined' && !window.isSecureContext) return 'insecure';
  return 'idle';
}

function toFix(pos: GeolocationPosition): GpsFix {
  const c = pos.coords;
  return {
    lat: c.latitude,
    lng: c.longitude,
    accuracy: c.accuracy,
    timestamp: pos.timestamp || Date.now(),
    speed: c.speed ?? null,
    heading: c.heading ?? null,
  };
}

export function useGeolocation(): GeolocationState {
  const [status, setStatus] = useState<GeoStatus>(initialStatus);
  const [fix, setFix] = useState<GpsFix | null>(null);
  const [message, setMessage] = useState<string | null>(() => {
    const s = initialStatus();
    if (!LOCATION_ENABLED) return 'Live location is off in this version of the page.';
    if (s === 'unsupported') return 'This browser can’t access GPS.';
    if (s === 'insecure') return 'Browsers only share GPS with pages opened over HTTPS.';
    return null;
  });

  const watchId = useRef<number | null>(null);
  const pollTimer = useRef<number | null>(null);
  const hasFix = useRef(false);
  const timeouts = useRef(0);
  const statusRef = useRef(status);
  statusRef.current = status;

  const stop = useCallback(() => {
    if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current);
    watchId.current = null;
    if (pollTimer.current !== null) window.clearInterval(pollTimer.current);
    pollTimer.current = null;
  }, []);

  const onSuccess = useCallback((pos: GeolocationPosition) => {
    const next = toFix(pos);
    hasFix.current = true;
    timeouts.current = 0;
    // Ignore an out-of-order (older) cached reading.
    setFix((prev) => (prev && prev.timestamp > next.timestamp ? prev : next));
    setStatus('active');
    setMessage(null);
  }, []);

  const onError = useCallback(
    (err: GeolocationPositionError) => {
      if (err.code === err.PERMISSION_DENIED) {
        stop();
        setStatus('denied');
        setMessage('Location permission is blocked for this page.');
        return;
      }
      if (err.code === err.TIMEOUT) {
        timeouts.current += 1;
        // The watch keeps running after a timeout; only surface it once it repeats.
        if (timeouts.current < 2 && !hasFix.current) return;
        setStatus('unavailable');
        setMessage(
          hasFix.current
            ? 'No new GPS reading recently.'
            : 'No GPS signal yet. Move near a window or open area.',
        );
        return;
      }
      setStatus('unavailable');
      setMessage('The phone couldn’t determine its position. Check that Location is on.');
    },
    [stop],
  );

  const requestFresh = useCallback(() => {
    navigator.geolocation.getCurrentPosition(onSuccess, onError, {
      enableHighAccuracy: true,
      maximumAge: 0,
      timeout: GPS_CONFIG.timeoutMs,
    });
  }, [onError, onSuccess]);

  const start = useCallback(() => {
    const base = initialStatus();
    if (base === 'unsupported' || base === 'insecure') return;
    stop();
    timeouts.current = 0;
    if (!hasFix.current) setStatus('locating');
    setMessage(null);
    watchId.current = navigator.geolocation.watchPosition(onSuccess, onError, {
      enableHighAccuracy: true,
      maximumAge: 5_000,
      timeout: GPS_CONFIG.timeoutMs,
    });
    // Some phones report rarely while standing still; ask for a fresh reading regularly.
    pollTimer.current = window.setInterval(() => {
      if (document.visibilityState === 'visible') requestFresh();
    }, GPS_CONFIG.refreshEveryMs);
  }, [onError, onSuccess, requestFresh, stop]);

  // If permission was already granted earlier, start straight away; if it was
  // blocked, show that instead of an "Enable" button that can't work.
  useEffect(() => {
    if (initialStatus() !== 'idle' || !navigator.permissions?.query) return;
    let permission: PermissionStatus | null = null;
    let cancelled = false;
    const apply = (state: PermissionState) => {
      if (state === 'granted' && watchId.current === null) start();
      if (state === 'denied') {
        stop();
        setStatus('denied');
        setMessage('Location permission is blocked for this page.');
      }
    };
    navigator.permissions
      .query({ name: 'geolocation' })
      .then((p) => {
        if (cancelled) return;
        permission = p;
        apply(p.state);
        p.onchange = () => apply(p.state);
      })
      .catch(() => {
        /* Permissions API not supported: the Enable button handles it. */
      });
    return () => {
      cancelled = true;
      if (permission) permission.onchange = null;
    };
  }, [start, stop]);

  // Get a fresh reading as soon as the page comes back to the foreground.
  useEffect(() => {
    const onVisible = () => {
      if (
        document.visibilityState === 'visible' &&
        (statusRef.current === 'active' || statusRef.current === 'unavailable')
      ) {
        requestFresh();
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [requestFresh]);

  useEffect(() => stop, [stop]);

  return { status, fix, message, start };
}
