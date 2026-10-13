/**
 * Dialog accessibility helper.
 *
 * Keeps modal keyboard behavior consistent without pulling in a dependency:
 * - closes on Escape
 * - moves focus into the dialog when it opens and restores it on close
 * - locks background scroll while open
 *
 * Usage:
 *   const panelRef = useDialogA11y(isOpen, onClose);
 *   <div onClick={onClose}>                       // backdrop
 *     <div ref={panelRef} tabIndex={-1} ... />     // dialog panel
 *   </div>
 */

import { useEffect, useRef } from 'react';

export function useDialogA11y<T extends HTMLElement = HTMLDivElement>(
  isOpen: boolean,
  onClose: () => void
) {
  const panelRef = useRef<T>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!isOpen) return;

    const previouslyFocused =
      typeof document !== 'undefined' ? (document.activeElement as HTMLElement | null) : null;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onCloseRef.current();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const focusTimer = window.setTimeout(() => {
      panelRef.current?.focus();
    }, 0);

    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus?.();
    };
  }, [isOpen]);

  return panelRef;
}
