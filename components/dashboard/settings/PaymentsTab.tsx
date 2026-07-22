'use client';

import { useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { CreditCard, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useToast } from '@/components/ui/Toast';
import { formatMoney } from '@/lib/booking/format';
import { disconnectMp } from '@/lib/dashboard/payments.actions';
import type { MpConnectionInfo } from '@/lib/payments/mercadopago/account';
import type { DepositRow } from '@/lib/dashboard/payments';

/**
 * Tab de Pagos: conexión de la cuenta de Mercado Pago del negocio + anticipos
 * cobrados. Los montos están en la cuenta MP del negocio, NO en Ressy.
 * Solo planes pagos (el gate real vive en el server; acá se refleja).
 */
export function PaymentsTab({
  connection,
  deposits,
  canUseDeposits,
  hasDepositsConfigured,
  locale,
}: {
  connection: MpConnectionInfo;
  deposits: DepositRow[];
  canUseDeposits: boolean;
  hasDepositsConfigured: boolean;
  locale: string;
}) {
  const t = useTranslations('dashboard.settings.payments');
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useState(connection.status);

  function onDisconnect() {
    startTransition(async () => {
      const res = await disconnectMp();
      if (res.ok) {
        setStatus('disconnected');
        toast(t('disconnected'));
      } else {
        toast(t('error'), 'error');
      }
    });
  }

  const tone = status === 'connected' ? 'success' : status === 'error' ? 'warning' : 'neutral';
  const StatusIcon = status === 'connected' ? CheckCircle2 : status === 'error' ? AlertTriangle : XCircle;

  return (
    <div className="flex flex-col gap-5">
      <p className="text-ink-secondary text-sm">{t('intro')}</p>

      {/* Alerta: desconectada + anticipos configurados = no puede cobrar. */}
      {status !== 'connected' && hasDepositsConfigured ? (
        <div className="border-warning/25 bg-warning/[0.06] text-warning flex items-start gap-2 rounded-2xl border px-4 py-3 text-sm">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <span>{t('alertDisconnected')}</span>
        </div>
      ) : null}

      <Card className="flex flex-col gap-4 p-5">
        <div className="flex items-center gap-4">
          <div className="bg-surface-alt text-ink-secondary flex size-11 items-center justify-center rounded-xl">
            <CreditCard className="size-5" aria-hidden="true" />
          </div>
          <div className="flex-1">
            <div className="text-ink font-semibold">Mercado Pago</div>
            <div className="text-ink-tertiary text-xs">{t('mpSubtitle')}</div>
          </div>
          <Badge tone={tone}>
            <StatusIcon className="mr-1 inline size-3.5" aria-hidden="true" />
            {t(`status.${status}`)}
          </Badge>
        </div>

        {!canUseDeposits ? (
          <p className="text-ink-secondary text-sm">{t('needPaidPlan')}</p>
        ) : status === 'connected' ? (
          <div className="flex flex-wrap gap-2.5">
            {/* Reconectar por si el scope cambió. Es un route handler OAuth (no una
                página): navegación completa a propósito para arrancar el redirect. */}
            <Button variant="secondary" size="sm" asChild>
              {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
              <a href="/api/payments/mp/connect">{t('reconnect')}</a>
            </Button>
            <Button variant="ghost" size="sm" onClick={onDisconnect} loading={pending}>
              {t('disconnect')}
            </Button>
          </div>
        ) : (
          <div>
            {/* Link, no fetch: es un redirect OAuth con cookies del servidor. */}
            <Button size="sm" asChild>
              {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
              <a href="/api/payments/mp/connect">{t('connect')}</a>
            </Button>
          </div>
        )}
      </Card>

      {/* Anticipos cobrados. Deja claro dónde está el dinero. */}
      <div className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between">
          <h3 className="text-ink text-base font-semibold">{t('depositsTitle')}</h3>
        </div>
        <p className="text-ink-tertiary text-xs">{t('depositsNote')}</p>

        {deposits.length === 0 ? (
          <p className="text-ink-secondary bg-surface-alt rounded-input mt-1 p-3 text-sm">{t('noDeposits')}</p>
        ) : (
          <div className="border-border divide-border mt-1 divide-y overflow-hidden rounded-2xl border">
            {deposits.map((d) => (
              <div key={`${d.bookingId}-${d.createdAt}`} className="flex items-center gap-3 px-4 py-3 text-sm">
                <div className="min-w-0 flex-1">
                  <div className="text-ink truncate font-medium">
                    {d.serviceName ?? '—'}
                    {d.customerName ? <span className="text-ink-secondary"> · {d.customerName}</span> : null}
                  </div>
                  <div className="text-ink-tertiary text-xs">
                    {new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(new Date(d.createdAt))}
                    {d.method ? ` · ${d.method}` : ''}
                  </div>
                </div>
                <div className="text-ink font-semibold">{formatMoney(d.amount, d.currency, locale)}</div>
                <Badge tone={d.status === 'refunded' ? 'neutral' : d.status === 'paid' ? 'success' : 'warning'}>
                  {t(`paymentStatus.${d.status}`)}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
