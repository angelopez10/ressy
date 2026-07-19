'use client';

import { useEffect, useState } from 'react';

/**
 * ¿Viewport de móvil? (< 640px, el breakpoint `sm` de Tailwind). Decide si un
 * modal se presenta como panel lateral o como bottom-sheet. Arranca en `false`
 * para coincidir con el render del server y evitar hydration mismatch.
 */
export function useIsMobile(query = '(max-width: 639px)'): boolean {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia(query);
    const update = () => setIsMobile(mql.matches);
    update();
    mql.addEventListener('change', update);
    return () => mql.removeEventListener('change', update);
  }, [query]);

  return isMobile;
}
