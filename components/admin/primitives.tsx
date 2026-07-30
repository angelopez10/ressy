import type { CSSProperties, ReactNode } from 'react';
import Link from 'next/link';
import { TrendingDown, TrendingUp } from 'lucide-react';
import { pill } from '@/lib/admin/format';

/**
 * Primitivos del cockpit. Son propios y no los de `components/ui` a propósito:
 * el panel es DENSO (12–13px, cards de 14px de radio, mucha tabla) mientras que
 * el producto es amplio y aireado. Mezclarlos terminaría deformando los
 * primitivos del producto para servir a una pantalla interna.
 *
 * Los colores siguen saliendo de los tokens de Ressy (CLAUDE.md §5).
 */

export function Panel({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`border-border bg-surface rounded-2xl border ${className}`}>{children}</div>
  );
}

export function PanelTitle({ children, aside }: { children: ReactNode; aside?: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 px-5 pt-4 pb-3">
      <h2 className="text-ink text-[15px] font-bold">{children}</h2>
      {aside ? <div className="text-ink-secondary text-[13px]">{aside}</div> : null}
    </div>
  );
}

/** Píldora tintada. Un solo lugar para el patrón `color + color18` del mockup. */
export function Pill({ color, children }: { color: string; children: ReactNode }) {
  return (
    <span
      className="inline-block rounded-full px-2.5 py-[3px] text-[11.5px] font-bold whitespace-nowrap"
      style={pill(color)}
    >
      {children}
    </span>
  );
}

export function Dot({ color, title }: { color: string; title?: string }) {
  return (
    <span
      className="inline-block size-[9px] shrink-0 rounded-full"
      style={{ backgroundColor: color }}
      title={title}
      aria-label={title}
    />
  );
}

export function Kpi({
  label,
  value,
  delta,
  hint,
}: {
  label: string;
  value: string;
  /** `null` cuando no hay período anterior con el que comparar. */
  delta?: { pct: number; good: boolean } | null;
  hint?: string;
}) {
  return (
    <div className="border-border bg-surface rounded-[14px] border p-4">
      <p className="text-ink-secondary mb-2 text-[12.5px] font-medium">{label}</p>
      <p className="text-ink text-[27px] leading-none font-extrabold tracking-tight">{value}</p>
      <div className="mt-2.5 flex items-center gap-1 text-[12.5px] font-bold">
        {delta ? (
          <>
            <span
              className="inline-flex items-center gap-1"
              style={{ color: delta.good ? 'var(--color-success)' : 'var(--color-warning)' }}
            >
              {delta.pct >= 0 ? (
                <TrendingUp className="size-3.5" aria-hidden="true" />
              ) : (
                <TrendingDown className="size-3.5" aria-hidden="true" />
              )}
              {delta.pct >= 0 ? '+' : ''}
              {delta.pct}%
            </span>
            <span className="text-ink-tertiary font-medium">vs. período ant.</span>
          </>
        ) : (
          <span className="text-ink-tertiary font-medium">{hint ?? 'sin comparación'}</span>
        )}
      </div>
    </div>
  );
}

export function FunnelBar({
  label,
  n,
  total,
  color,
  drop,
}: {
  label: string;
  n: number;
  total: number;
  color: string;
  drop?: string | null;
}) {
  const width = total > 0 ? Math.round((n / total) * 100) : 0;
  return (
    <div>
      <div className="mb-1.5 flex justify-between text-[13px]">
        <span className="text-ink font-semibold">{label}</span>
        <span className="text-ink-secondary">
          {n} · {width}%
        </span>
      </div>
      <div className="bg-surface-alt h-3 overflow-hidden rounded-full">
        <div
          className="h-full rounded-full"
          style={{ width: `${width}%`, backgroundColor: color }}
        />
      </div>
      {drop ? <p className="text-warning mt-1 text-[11px]">↓ {drop} de fuga</p> : null}
    </div>
  );
}

export function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="border-border text-ink-tertiary rounded-2xl border border-dashed px-6 py-10 text-center">
      <p className="text-ink text-[15px] font-semibold">{title}</p>
      <p className="mt-1 text-[13px]">{body}</p>
    </div>
  );
}

/** Fila de tabla clickeable que sigue siendo un link real (accesible, con Cmd+click). */
export function RowLink({
  href,
  children,
  style,
}: {
  href: string;
  children: ReactNode;
  style?: CSSProperties;
}) {
  return (
    <Link href={href} style={style} className="contents">
      {children}
    </Link>
  );
}
