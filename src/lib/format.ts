const timeFmt = new Intl.DateTimeFormat('en-IN', {
  hour: 'numeric',
  minute: '2-digit',
  second: '2-digit',
  hour12: true,
});

const shortTimeFmt = new Intl.DateTimeFormat('en-IN', {
  hour: 'numeric',
  minute: '2-digit',
  hour12: true,
});

const dateTimeFmt = new Intl.DateTimeFormat('en-IN', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
  second: '2-digit',
  hour12: true,
});

const upperAmPm = (s: string) => s.replace(/\b(am|pm)\b/g, (m) => m.toUpperCase());

/** 10:21:34 PM */
export const formatTime = (ts: number) => upperAmPm(timeFmt.format(ts));
/** 10:21 PM */
export const formatShortTime = (ts: number) => upperAmPm(shortTimeFmt.format(ts));
/** 25 Oct 2026, 10:21:34 PM */
export const formatDateTime = (ts: number) => upperAmPm(dateTimeFmt.format(ts));

export function formatAgo(ms: number): string {
  const s = Math.max(0, Math.round(ms / 1000));
  if (s < 5) return 'just now';
  if (s < 60) return `${s} s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  return `${h} h ${m % 60} min ago`;
}

export function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.max(10, Math.round(meters / 10) * 10)} m`;
  if (meters < 10_000) return `${(meters / 1000).toFixed(1)} km`;
  return `${Math.round(meters / 1000)} km`;
}

export function formatDuration(seconds: number): string {
  const totalMin = Math.max(1, Math.round(seconds / 60));
  if (totalMin < 60) return `${totalMin} min`;
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}

export function formatAccuracy(meters: number): string {
  if (meters >= 1000) return `±${(meters / 1000).toFixed(1)} km`;
  return `±${Math.round(meters)} m`;
}
