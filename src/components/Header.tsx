import { EllipsisVertical, MapPinned, Package, RotateCcw } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';

interface Props {
  /** Omitted when there is no map (location turned off). */
  onAdjustPin?: () => void;
  onReset: () => void;
}

export function Header({ onAdjustPin, onReset }: Props) {
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const wrapRef = useRef<HTMLDivElement>(null);
  const firstItem = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    firstItem.current?.focus();
    const onDown = (e: PointerEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const choose = (fn: () => void) => () => {
    setOpen(false);
    fn();
  };

  return (
    <header className="topbar">
      <div className="topbar__brand">
        <span className="topbar__logo" aria-hidden="true">
          <Package size={20} strokeWidth={2.4} />
        </span>
        <h1 className="topbar__title">Parcel Delivery</h1>
        <span className="chip chip--orange">Personal Delivery</span>
      </div>
      <div className="menu" ref={wrapRef}>
        <button
          type="button"
          className="icon-btn"
          aria-label="More options"
          aria-haspopup="menu"
          aria-expanded={open}
          aria-controls={menuId}
          onClick={() => setOpen((o) => !o)}
        >
          <EllipsisVertical size={22} />
        </button>
        {open && (
          <div className="menu__list" role="menu" id={menuId}>
            {onAdjustPin && (
              <button ref={firstItem} type="button" role="menuitem" onClick={choose(onAdjustPin)}>
                <MapPinned size={18} aria-hidden="true" /> Adjust destination pin
              </button>
            )}
            <button
              ref={onAdjustPin ? undefined : firstItem}
              type="button"
              role="menuitem"
              onClick={choose(onReset)}
            >
              <RotateCcw size={18} aria-hidden="true" /> Start a new delivery…
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
