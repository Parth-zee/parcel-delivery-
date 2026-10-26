import { Check } from 'lucide-react';
import { formatAccuracy, formatShortTime } from '../lib/format';
import type { DeliveryState } from '../types';

interface Props {
  state: DeliveryState;
  /** "self" = the delivery person's own view, "security" = shown to others. */
  perspective?: 'self' | 'security';
}

type StepState = 'done' | 'current' | 'pending';

export function StatusTimeline({ state, perspective = 'self' }: Props) {
  const who = perspective === 'self' ? 'you' : 'the delivery person';
  const { status } = state;

  const steps: { title: string; state: StepState; detail?: string }[] = [
    {
      title: 'Parcel delivery started',
      state: 'done',
      detail: `Tracking started ${formatShortTime(state.startedAt)}`,
    },
    {
      title: 'On the way',
      state: status === 'on_the_way' ? 'current' : 'done',
      detail: status === 'on_the_way' ? 'In progress' : undefined,
    },
    {
      title: 'Arrived at destination',
      state: state.arrivedAt ? 'done' : 'pending',
      detail: state.arrivedAt
        ? `Confirmed by ${who} at ${formatShortTime(state.arrivedAt)}${
            state.arrivedFix ? ` · GPS ${formatAccuracy(state.arrivedFix.accuracy)}` : ''
          }`
        : 'Pending',
    },
    {
      title: 'Handed over to security',
      state: state.handedOverAt ? 'done' : 'pending',
      detail: state.handedOverAt
        ? `Confirmed by ${who} at ${formatShortTime(state.handedOverAt)}`
        : 'Pending',
    },
  ];

  return (
    <ol className="timeline" aria-label="Delivery progress">
      {steps.map((s, i) => (
        <li key={s.title} className={`timeline__step timeline__step--${s.state}`}>
          <span className="timeline__marker" aria-hidden="true">
            {s.state === 'done' ? <Check size={14} strokeWidth={3} /> : i + 1}
          </span>
          <div className="timeline__content">
            <p className="timeline__title">
              {s.title}
              <span className="sr-only">
                {s.state === 'done' ? ' (completed)' : s.state === 'current' ? ' (current)' : ' (pending)'}
              </span>
            </p>
            {s.detail && <p className="timeline__detail">{s.detail}</p>}
          </div>
        </li>
      ))}
    </ol>
  );
}

export const STATUS_LABEL: Record<DeliveryState['status'], string> = {
  on_the_way: 'On the way',
  arrived: 'Arrived at destination',
  handed_over: 'Handed over to security',
};
