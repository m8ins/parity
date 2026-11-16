'use client';

import { useEffect } from 'react';

/** Text inputs match :focus-visible on pointer focus in browsers as well.
 * Track input modality so pointer focus stays white, keyboard focus outlined. */
export function InteractionMode() {
  useEffect(() => {
    const keyboard = (event: KeyboardEvent) => {
      if (event.key === 'Tab') document.documentElement.dataset.keyboard = 'true';
    };
    const pointer = () => { document.documentElement.dataset.keyboard = 'false'; };
    document.addEventListener('keydown', keyboard, true);
    document.addEventListener('pointerdown', pointer, true);
    return () => { document.removeEventListener('keydown', keyboard, true); document.removeEventListener('pointerdown', pointer, true); };
  }, []);
  return null;
}
