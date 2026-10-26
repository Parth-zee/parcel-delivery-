import { useCallback, useEffect, useReducer } from 'react';
import { DEFAULT_DESTINATION } from '../config';
import { isValidLatLng } from '../lib/geo';
import type { DeliveryState, GpsFix, LatLng, PinSource } from '../types';

const STORAGE_KEY = 'parcel-tracker:v1';

type Action =
  | { type: 'arrive'; at: number; fix: GpsFix | null }
  | { type: 'handover'; at: number; fix: GpsFix | null }
  | { type: 'set-destination'; at: number; point: LatLng; source: PinSource }
  | { type: 'reset'; at: number };

function freshState(now: number, destination?: DeliveryState['destination']): DeliveryState {
  return {
    version: 1,
    status: 'on_the_way',
    startedAt: now,
    arrivedAt: null,
    arrivedFix: null,
    handedOverAt: null,
    handoverFix: null,
    destination: destination ?? {
      lat: DEFAULT_DESTINATION.lat,
      lng: DEFAULT_DESTINATION.lng,
      confirmed: DEFAULT_DESTINATION.confirmed,
      confirmedAt: null,
      source: 'default',
    },
  };
}

function reducer(state: DeliveryState, action: Action): DeliveryState {
  switch (action.type) {
    case 'arrive':
      if (state.status !== 'on_the_way') return state;
      return { ...state, status: 'arrived', arrivedAt: action.at, arrivedFix: action.fix };
    case 'handover':
      if (state.status !== 'arrived') return state;
      return { ...state, status: 'handed_over', handedOverAt: action.at, handoverFix: action.fix };
    case 'set-destination':
      return {
        ...state,
        destination: {
          lat: action.point.lat,
          lng: action.point.lng,
          confirmed: true,
          confirmedAt: action.at,
          source: action.source,
        },
      };
    case 'reset':
      // A new delivery keeps the confirmed destination pin.
      return freshState(action.at, state.destination);
  }
}

function isDeliveryState(v: unknown): v is DeliveryState {
  if (!v || typeof v !== 'object') return false;
  const s = v as DeliveryState;
  return (
    s.version === 1 &&
    ['on_the_way', 'arrived', 'handed_over'].includes(s.status) &&
    typeof s.startedAt === 'number' &&
    !!s.destination &&
    isValidLatLng(s.destination.lat, s.destination.lng) &&
    typeof s.destination.confirmed === 'boolean'
  );
}

function load(): DeliveryState {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed: unknown = JSON.parse(raw);
      if (isDeliveryState(parsed)) return parsed;
    }
  } catch {
    /* storage blocked or corrupt: start fresh */
  }
  return freshState(Date.now());
}

export function useDelivery() {
  const [state, dispatch] = useReducer(reducer, undefined, load);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* storage unavailable: state still works for this page load */
    }
  }, [state]);

  return {
    state,
    markArrived: useCallback(
      (fix: GpsFix | null) => dispatch({ type: 'arrive', at: Date.now(), fix }),
      [],
    ),
    markHandedOver: useCallback(
      (fix: GpsFix | null) => dispatch({ type: 'handover', at: Date.now(), fix }),
      [],
    ),
    setDestination: useCallback(
      (point: LatLng, source: PinSource) =>
        dispatch({ type: 'set-destination', at: Date.now(), point, source }),
      [],
    ),
    reset: useCallback(() => dispatch({ type: 'reset', at: Date.now() }), []),
  };
}
