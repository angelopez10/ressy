'use client';

import * as React from 'react';
import { createPortal } from 'react-dom';
import { Check, X, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

type ToastTone = 'success' | 'error';
interface ToastItem {
  id: number;
  message: string;
  tone: ToastTone;
}

interface ToastContextValue {
  toast: (message: string, tone?: ToastTone) => void;
}

const ToastContext = React.createContext<ToastContextValue | null>(null);

/** Feedback de confirmación/errores (CLAUDE.md §6). Montado en el layout del dashboard. */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = React.useState<ToastItem[]>([]);
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  const remove = React.useCallback((id: number) => {
    setItems((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = React.useCallback(
    (message: string, tone: ToastTone = 'success') => {
      const id = Date.now() + Math.random();
      setItems((prev) => [...prev, { id, message, tone }]);
      setTimeout(() => remove(id), 4000);
    },
    [remove],
  );

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      {mounted &&
        createPortal(
          <div className="fixed right-4 bottom-4 z-[200] flex flex-col gap-2" role="region" aria-live="polite">
            {items.map((t) => (
              <div
                key={t.id}
                className="border-border bg-surface shadow-card flex items-center gap-3 rounded-xl border px-4 py-3"
              >
                <span
                  className={cn(
                    'flex size-6 shrink-0 items-center justify-center rounded-full',
                    t.tone === 'success' ? 'bg-success-soft text-success' : 'bg-warning-soft text-warning',
                  )}
                >
                  {t.tone === 'success' ? (
                    <Check className="size-4" aria-hidden="true" />
                  ) : (
                    <AlertTriangle className="size-4" aria-hidden="true" />
                  )}
                </span>
                <span className="text-ink text-sm font-medium">{t.message}</span>
                <button
                  type="button"
                  onClick={() => remove(t.id)}
                  className="text-ink-tertiary hover:text-ink ml-2"
                  aria-label="Close"
                >
                  <X className="size-4" aria-hidden="true" />
                </button>
              </div>
            ))}
          </div>,
          document.body,
        )}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = React.useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
