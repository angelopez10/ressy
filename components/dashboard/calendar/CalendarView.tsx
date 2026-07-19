'use client';

import { useState } from 'react';
import { useRouter } from '@/lib/i18n/navigation';
import type { AgendaBundle, AgendaBookingDTO } from '@/lib/dashboard/types';
import { CalendarToolbar } from './CalendarToolbar';
import { CalendarGrid } from './CalendarGrid';
import { CalendarEmptyState } from './CalendarEmptyState';
import { BookingDetailPanel } from './BookingDetailPanel';
import { ManualBookingDialog } from './ManualBookingDialog';
import { BlockTimeDialog } from './BlockTimeDialog';
import { RescheduleDialog } from './RescheduleDialog';

/**
 * Orquesta el calendario del dashboard: toolbar + grilla + paneles/diálogos.
 * Mantiene el estado de UI (reserva seleccionada, diálogos abiertos). Tras una
 * mutación exitosa hace `router.refresh()` para que el server component vuelva a
 * leer el rango con RLS, sin recargar la página entera.
 */
export function CalendarView({
  bundle,
  locale,
  nowIso,
}: {
  bundle: AgendaBundle;
  locale: string;
  nowIso: string;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<AgendaBookingDTO | null>(null);
  const [rescheduling, setRescheduling] = useState<AgendaBookingDTO | null>(null);
  const [manualOpen, setManualOpen] = useState(false);
  const [blockOpen, setBlockOpen] = useState(false);

  function refresh() {
    router.refresh();
  }

  const isEmpty = bundle.bookings.length === 0;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-5">
      <CalendarToolbar
        bundle={bundle}
        locale={locale}
        onBlock={() => setBlockOpen(true)}
        onManual={() => setManualOpen(true)}
      />

      <div className="border-border bg-surface rounded-card min-h-0 flex-1 overflow-auto border">
        {isEmpty ? (
          <CalendarEmptyState slug={bundle.business.slug} locale={locale} />
        ) : (
          <CalendarGrid bundle={bundle} locale={locale} nowIso={nowIso} onSelect={setSelected} />
        )}
      </div>

      {selected && (
        <BookingDetailPanel
          booking={selected}
          bundle={bundle}
          locale={locale}
          onClose={() => setSelected(null)}
          onReschedule={(b) => {
            setSelected(null);
            setRescheduling(b);
          }}
          onChanged={() => {
            setSelected(null);
            refresh();
          }}
        />
      )}

      {rescheduling && (
        <RescheduleDialog
          booking={rescheduling}
          bundle={bundle}
          locale={locale}
          onClose={() => setRescheduling(null)}
          onDone={() => {
            setRescheduling(null);
            refresh();
          }}
        />
      )}

      {manualOpen && (
        <ManualBookingDialog
          bundle={bundle}
          locale={locale}
          onClose={() => setManualOpen(false)}
          onDone={() => {
            setManualOpen(false);
            refresh();
          }}
        />
      )}

      {blockOpen && (
        <BlockTimeDialog
          bundle={bundle}
          onClose={() => setBlockOpen(false)}
          onDone={() => {
            setBlockOpen(false);
            refresh();
          }}
        />
      )}
    </div>
  );
}
