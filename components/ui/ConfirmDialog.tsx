'use client';

import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';

/** Confirmación genérica para acciones destructivas (CLAUDE.md §6). */
export function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel,
  cancelLabel,
  destructive = true,
  loading,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  body: string;
  confirmLabel: string;
  cancelLabel: string;
  destructive?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Modal open={open} onClose={onCancel} side="center" label={title} className="max-w-md">
      <div className="flex flex-col gap-4 p-6">
        <div className="flex flex-col gap-1.5">
          <h2 className="text-h3 text-ink">{title}</h2>
          <p className="text-body text-ink-secondary">{body}</p>
        </div>
        <div className="flex justify-end gap-2.5">
          <Button variant="ghost" onClick={onCancel} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button variant={destructive ? 'destructive' : 'primary'} loading={loading} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
