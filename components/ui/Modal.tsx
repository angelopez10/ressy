'use client';

import * as React from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Modal accesible sin dependencias nuevas. `side` decide la presentación:
 *   - 'center' : diálogo centrado (confirmaciones, formularios en desktop).
 *   - 'right'  : panel lateral (detalle de reserva en desktop).
 *   - 'bottom' : bottom-sheet (todo en móvil).
 *
 * Cierra con Escape y con click en el backdrop. Al montar, mueve el foco al
 * panel; bloquea el scroll del body. Un focus-trap completo se puede añadir
 * después; para el MVP esto cubre teclado + lectores básicos (role="dialog",
 * aria-modal, aria-label).
 */
export function Modal({
  open,
  onClose,
  side = 'center',
  label,
  className,
  children,
}: {
  open: boolean;
  onClose: () => void;
  side?: 'center' | 'right' | 'bottom';
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  const panelRef = React.useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => setMounted(true), []);

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    panelRef.current?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  if (!mounted || !open) return null;

  const positioning =
    side === 'right'
      ? 'items-stretch justify-end'
      : side === 'bottom'
        ? 'items-end justify-center'
        : 'items-center justify-center p-4';

  const panelShape =
    side === 'right'
      ? 'h-full w-full max-w-sm rounded-l-modal'
      : side === 'bottom'
        ? 'w-full rounded-t-modal max-h-[90vh]'
        : 'w-full max-w-lg rounded-modal max-h-[90vh]';

  return createPortal(
    <div className={cn('fixed inset-0 z-[100] flex', positioning)}>
      <button
        type="button"
        aria-hidden="true"
        tabIndex={-1}
        onClick={onClose}
        className="absolute inset-0 bg-ink/40"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        tabIndex={-1}
        className={cn(
          'bg-surface relative flex flex-col overflow-hidden shadow-xl outline-none',
          panelShape,
          className,
        )}
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}

/** Cabecera estándar con título y botón de cerrar. */
export function ModalHeader({
  title,
  onClose,
  closeLabel,
}: {
  title: string;
  onClose: () => void;
  closeLabel: string;
}) {
  return (
    <div className="border-border flex items-center justify-between gap-4 border-b px-5 py-4">
      <h2 className="text-h3 text-ink">{title}</h2>
      <button
        type="button"
        onClick={onClose}
        aria-label={closeLabel}
        className="text-ink-secondary hover:bg-surface-alt hover:text-ink flex size-9 items-center justify-center rounded-full transition-colors"
      >
        <X className="size-5" aria-hidden="true" />
      </button>
    </div>
  );
}
