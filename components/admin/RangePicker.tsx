'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { RANGES, type RangeKey } from '@/lib/admin/shared';

/**
 * Selector de rango global del Overview. El rango vive en la URL (`?rango=30d`)
 * y no en estado del cliente: así el server component vuelve a consultar con el
 * rango nuevo y la vista es compartible por link.
 */
export function RangePicker({ current }: { current: RangeKey }) {
  const router = useRouter();
  const params = useSearchParams();

  function pick(key: RangeKey) {
    const next = new URLSearchParams(params.toString());
    next.set('rango', key);
    router.push(`?${next.toString()}`);
  }

  return (
    <div className="bg-surface-alt inline-flex rounded-full p-[3px]">
      {RANGES.map((r) => {
        const active = r.key === current;
        return (
          <button
            key={r.key}
            type="button"
            onClick={() => pick(r.key)}
            aria-pressed={active}
            className={[
              'rounded-full px-3.5 py-1.5 text-[12.5px] font-semibold transition-colors',
              active ? 'bg-surface text-ink shadow-sm' : 'text-ink-secondary hover:text-ink',
            ].join(' ')}
          >
            {r.label}
          </button>
        );
      })}
    </div>
  );
}
