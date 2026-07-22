import * as React from 'react';
import {
  EmailLayout,
  DetailTable,
  EmailButton,
  EmailH1,
  EmailGreeting,
  EmailText,
  EmailPanel,
  StatusBadge,
  INK_TERTIARY,
  FF,
  type StatusTone,
} from './EmailLayout';

/**
 * Email al CLIENTE FINAL para todo el ciclo de una reserva: confirmación,
 * recordatorio, reagende, cancelación y post-servicio. Marca del NEGOCIO (el
 * cliente ve su logo/color). El `variant` solo cambia encabezado, intro y CTA;
 * las cadenas llegan resueltas en el idioma del cliente (render.ts).
 */
export interface ClientBookingEmailProps {
  accent: string;
  businessName: string;
  logoUrl?: string | null;
  preview: string;
  greeting: string;
  heading: string;
  intro: string;
  rows: { label: string; value: string }[];
  /** Badge de estado (confirmada/reagendada/cancelada). Ausente en post-servicio. */
  statusLabel?: string;
  statusTone?: StatusTone;
  ctaUrl?: string;
  ctaLabel?: string;
  customMessage?: string | null;
  timezoneNote?: string;
  footer: string;
}

export function ClientBookingEmail({
  accent,
  businessName,
  logoUrl,
  preview,
  greeting,
  heading,
  intro,
  rows,
  statusLabel,
  statusTone,
  ctaUrl,
  ctaLabel,
  customMessage,
  timezoneNote,
  footer,
}: ClientBookingEmailProps) {
  return (
    <EmailLayout preview={preview} businessName={businessName} logoUrl={logoUrl} footer={footer} variant="client">
      <EmailGreeting>{greeting}</EmailGreeting>
      <EmailH1>{heading}</EmailH1>
      <EmailText>{intro}</EmailText>

      {statusLabel && statusTone && (
        <div style={{ margin: '0 0 14px' }}>
          <StatusBadge label={statusLabel} tone={statusTone} />
        </div>
      )}

      <DetailTable rows={rows} />

      {timezoneNote && (
        <p style={{ margin: '-14px 0 16px', fontFamily: FF, fontSize: 12, color: INK_TERTIARY }}>{timezoneNote}</p>
      )}

      {customMessage && <EmailPanel>{customMessage}</EmailPanel>}

      {ctaUrl && ctaLabel && <EmailButton href={ctaUrl} label={ctaLabel} accent={accent} />}
    </EmailLayout>
  );
}

export default ClientBookingEmail;
