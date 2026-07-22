import * as React from 'react';
import { EmailLayout, DetailTable, EmailButton, EmailH1, EmailText } from './EmailLayout';

/**
 * Email al NEGOCIO (dueño): nueva reserva, cancelación de un cliente o aviso de
 * trial. Marca RESSY (lo envía Ressy, no el negocio). El botón usa el teal de
 * Ressy, no el acento del negocio.
 */
export interface BusinessNotificationEmailProps {
  accent: string;
  businessName: string;
  logoUrl?: string | null;
  preview: string;
  heading: string;
  intro: string;
  rows: { label: string; value: string }[];
  ctaUrl?: string;
  ctaLabel?: string;
  footer: string;
}

export function BusinessNotificationEmail({
  businessName,
  logoUrl,
  preview,
  heading,
  intro,
  rows,
  ctaUrl,
  ctaLabel,
  footer,
}: BusinessNotificationEmailProps) {
  return (
    <EmailLayout preview={preview} businessName={businessName} logoUrl={logoUrl} footer={footer} variant="ressy">
      <EmailH1>{heading}</EmailH1>
      <EmailText>{intro}</EmailText>
      {rows.length > 0 && <DetailTable rows={rows} />}
      {ctaUrl && ctaLabel && <EmailButton href={ctaUrl} label={ctaLabel} />}
    </EmailLayout>
  );
}

export default BusinessNotificationEmail;
