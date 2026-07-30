'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { AlertTriangle, CircleDot, Clock, Coins, Layers, Search } from 'lucide-react';

/**
 * Filtros de la tabla de Negocios. Todo el estado vive en la URL: el filtrado
 * es server-side, así que cambiar un filtro es navegar, y cualquier vista queda
 * compartible por link con el equipo.
 *
 * La búsqueda va con debounce para no disparar una query por tecla.
 */

const PLANS = ['free', 'solo', 'team', 'studio'];
const STATES = ['activo', 'trial', 'gracia', 'free', 'cancelado', 'suspendido'];
const CURRENCIES = ['CLP', 'USD', 'EUR', 'MXN', 'ARS', 'COP'];

export function BusinessFiltersBar({ total }: { total: number }) {
  const router = useRouter();
  const params = useSearchParams();
  const [q, setQ] = useState(params.get('q') ?? '');

  // Debounce de la búsqueda: 350 ms sin teclear ⇒ navega.
  useEffect(() => {
    const current = params.get('q') ?? '';
    if (q === current) return;
    const id = setTimeout(() => {
      const next = new URLSearchParams(params.toString());
      if (q) next.set('q', q);
      else next.delete('q');
      next.delete('pagina');
      router.push(`?${next.toString()}`);
    }, 350);
    return () => clearTimeout(id);
  }, [q, params, router]);

  function setParam(key: string, value: string | null) {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    next.delete('pagina');
    router.push(`?${next.toString()}`);
  }

  /** Recorre las opciones de un filtro: todas → a → b → … → todas. */
  function cycle(key: string, options: string[]) {
    const current = params.get(key);
    const idx = current ? options.indexOf(current) : -1;
    const nextValue = idx + 1 >= options.length ? null : options[idx + 1]!;
    setParam(key, nextValue);
  }

  const chip = (active: boolean) =>
    [
      'inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-[12.5px] font-semibold transition-colors',
      active
        ? 'border-accent bg-accent-soft text-accent'
        : 'border-border bg-surface text-ink-secondary hover:border-ink-tertiary',
    ].join(' ');

  const plan = params.get('plan');
  const estado = params.get('estado');
  const moneda = params.get('moneda');
  const salud = params.get('salud');
  const trial = params.get('trial') === '1';

  return (
    <div className="flex flex-wrap items-center gap-2.5">
      <div className="relative min-w-[220px] flex-1 sm:max-w-[340px]">
        <Search
          className="text-ink-tertiary absolute top-1/2 left-3 size-4 -translate-y-1/2"
          aria-hidden="true"
        />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar por nombre o slug…"
          aria-label="Buscar negocios"
          className="border-border bg-surface text-ink focus:border-accent w-full rounded-[10px] border py-2.5 pr-3 pl-9 text-[13.5px] outline-none"
        />
      </div>

      <button type="button" onClick={() => cycle('plan', PLANS)} className={chip(Boolean(plan))}>
        <Layers className="size-3.5" aria-hidden="true" />
        {plan ? `Plan ${plan}` : 'Todos los planes'}
      </button>

      <button
        type="button"
        onClick={() => cycle('estado', STATES)}
        className={chip(Boolean(estado))}
      >
        <CircleDot className="size-3.5" aria-hidden="true" />
        {estado ?? 'Todos los estados'}
      </button>

      <button
        type="button"
        onClick={() => cycle('moneda', CURRENCIES)}
        className={chip(Boolean(moneda))}
      >
        <Coins className="size-3.5" aria-hidden="true" />
        {moneda ?? 'Toda moneda'}
      </button>

      <button
        type="button"
        onClick={() => setParam('salud', salud === 'riesgo' ? null : 'riesgo')}
        className={chip(salud === 'riesgo')}
      >
        <AlertTriangle className="size-3.5" aria-hidden="true" />
        En riesgo
      </button>

      <button
        type="button"
        onClick={() => setParam('trial', trial ? null : '1')}
        className={chip(trial)}
      >
        <Clock className="size-3.5" aria-hidden="true" />
        Trial por vencer
      </button>

      <p className="text-ink-secondary ml-auto text-[13px]">
        <strong className="text-ink">{total}</strong> negocios
      </p>
    </div>
  );
}
