import * as React from 'react';
import { Heading, Text } from '@react-email/components';
import { EmailLayout, DetailTable, EmailButton, INK, INK_SECONDARY, SURFACE_ALT } from './EmailLayout';

/**
 * Email al cliente para todo el ciclo de una reserva: confirmación, recordatorio,
 * reagende, cancelación y post-servicio. Comparten estructura; el `variant` solo
 * cambia el encabezado, el intro y el CTA. Todas las cadenas llegan ya resueltas
 * en el idioma del cliente (render.ts), así que el template no sabe de i18n.
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
  ctaUrl,
  ctaLabel,
  customMessage,
  timezoneNote,
  footer,
}: ClientBookingEmailProps) {
  return (
    <EmailLayout preview={preview} businessName={businessName} logoUrl={logoUrl} footer={footer}>
      <Text style={{ margin: '16px 0 0', fontSize: 14, color: INK_SECONDARY }}>{greeting}</Text>
      <Heading as="h1" style={{ margin: '4px 0 8px', fontSize: 22, fontWeight: 700, color: INK, letterSpacing: '-0.02em' }}>
        {heading}
      </Heading>
      <Text style={{ margin: 0, fontSize: 15, lineHeight: '1.6', color: INK_SECONDARY }}>{intro}</Text>

      <DetailTable rows={rows} />

      {timezoneNote && (
        <Text style={{ margin: '-8px 0 0', fontSize: 12, color: '#B0B0B0' }}>{timezoneNote}</Text>
      )}

      {customMessage && (
        <Text
          style={{
            margin: '16px 0 0',
            padding: '12px 14px',
            backgroundColor: SURFACE_ALT,
            borderRadius: 12,
            fontSize: 14,
            color: INK,
          }}
        >
          {customMessage}
        </Text>
      )}

      {ctaUrl && ctaLabel && <EmailButton href={ctaUrl} label={ctaLabel} accent={accent} />}
    </EmailLayout>
  );
}

export default ClientBookingEmail;
