import { Crosshair, ExternalLink, MapPinned } from 'lucide-react';
import { useId, useState } from 'react';
import { DELIVERY, DESTINATION_REFERENCE_LINK } from '../config';
import { formatCoords, parseLocationInput } from '../lib/geo';
import type { GpsFix, LatLng, PinSource } from '../types';

interface Props {
  draft: LatLng;
  draftSource: PinSource;
  fix: GpsFix | null;
  fixIsLive: boolean;
  onDraftChange: (p: LatLng, source: PinSource) => void;
  onSave: () => void;
  onCancel: () => void;
}

/** Replaces the bottom sheet content while the destination pin is being placed. */
export function PinEditor({ draft, draftSource, fix, fixIsLive, onDraftChange, onSave, onCancel }: Props) {
  const inputId = useId();
  const errorId = useId();
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);

  const applyText = () => {
    const r = parseLocationInput(text);
    if (r.ok) {
      setError(null);
      onDraftChange(r.value, 'coordinates');
    } else {
      setError(r.message);
    }
  };

  return (
    <section className="sheet sheet--editor" aria-labelledby="pin-editor-title">
      <div className="sheet__handle" aria-hidden="true" />
      <div className="editor__head">
        <span className="editor__icon" aria-hidden="true">
          <MapPinned size={20} />
        </span>
        <div>
          <h2 id="pin-editor-title" className="editor__title">
            Set the {DELIVERY.destinationName} pin
          </h2>
          <p className="editor__hint">
            Drag the orange pin to the mess entrance, or tap the map to place it.
          </p>
        </div>
      </div>

      <p className="editor__coords">
        Pin at <strong>{formatCoords(draft)}</strong>
        {draftSource === 'default' && ' (campus reference point, not the mess)'}
      </p>

      <div className="editor__tools">
        <button
          type="button"
          className="btn btn--outline btn--small"
          onClick={() => fix && onDraftChange({ lat: fix.lat, lng: fix.lng }, 'gps')}
          disabled={!fix || !fixIsLive}
        >
          <Crosshair size={16} aria-hidden="true" /> Use my current GPS position
        </button>
        <a
          className="btn btn--outline btn--small"
          href={DESTINATION_REFERENCE_LINK.url}
          target="_blank"
          rel="noopener noreferrer"
        >
          <ExternalLink size={16} aria-hidden="true" /> {DESTINATION_REFERENCE_LINK.label}
        </a>
      </div>
      {(!fix || !fixIsLive) && (
        <p className="editor__note">“Use my current GPS position” works once live GPS is on.</p>
      )}

      <label className="field__label" htmlFor={inputId}>
        Or paste coordinates / a full map link
      </label>
      <div className="field__row">
        <input
          id={inputId}
          className="field__input"
          inputMode="text"
          autoComplete="off"
          placeholder="17.4600, 78.3320"
          value={text}
          aria-invalid={!!error}
          aria-describedby={error ? errorId : undefined}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') applyText();
          }}
        />
        <button type="button" className="btn btn--outline" onClick={applyText}>
          Apply
        </button>
      </div>
      {error && (
        <p id={errorId} className="field__error" role="alert">
          {error}
        </p>
      )}

      <div className="editor__actions">
        <button type="button" className="btn btn--ghost" onClick={onCancel}>
          Cancel
        </button>
        <button type="button" className="btn btn--primary" onClick={onSave}>
          Save pin
        </button>
      </div>
      <p className="editor__note">Saving marks the pin as checked by you. You can change it any time.</p>
    </section>
  );
}
