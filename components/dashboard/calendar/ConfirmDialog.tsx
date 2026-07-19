'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

/**
 * Confirmación de una acción destructiva (cancelar / no-show). Opcionalmente
 * captura un motivo. CLAUDE.md §6/accesibilidad: las acciones destructivas
 * siempre pasan por aquí.
 */
export function ConfirmDialog({
  open,
  title,
  body,
  withReason,
  destructive = true,
  loading,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  body: string;
  withReason?: boolean;
  destructive?: boolean;
  loading?: boolean;
  onConfirm: (reason?: string) => void;
  onCancel: () => void;
}) {
  const t = useTranslations('dashboard.calendar');
  const [reason, setReason] = useState('');

  return (
    <Modal open={open} onClose={onCancel} side="center" label={title} className="max-w-md">
      <div className="flex flex-col gap-4 p-6">
        <div className="flex flex-col gap-1.5">
          <h2 className="text-h3 text-ink">{title}</h2>
          <p className="text-body text-ink-secondary">{body}</p>
        </div>
        {withReason && (
          <Input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={t('confirm.cancelReason')}
            aria-label={t('confirm.cancelReason')}
          />
        )}
        <div className="flex justify-end gap-2.5">
          <Button variant="ghost" onClick={onCancel} disabled={loading}>
            {t('confirm.keep')}
          </Button>
          <Button
            variant={destructive ? 'destructive' : 'primary'}
            loading={loading}
            onClick={() => onConfirm(reason.trim() || undefined)}
          >
            {t('confirm.confirm')}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
