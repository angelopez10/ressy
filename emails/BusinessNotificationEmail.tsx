import * as React from 'react';
import { Heading, Text } from '@react-email/components';
import { EmailLayout, DetailTable, EmailButton, INK, INK_SECONDARY } from './EmailLayout';

/** Email al NEGOCIO: nueva reserva o cancelación de un cliente. */
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
  accent,
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
    <EmailLayout preview={preview} businessName={businessName} logoUrl={logoUrl} footer={footer}>
      <Heading as="h1" style={{ margin: '16px 0 8px', fontSize: 20, fontWeight: 700, color: INK, letterSpacing: '-0.02em' }}>
        {heading}
      </Heading>
      <Text style={{ margin: 0, fontSize: 15, lineHeight: '1.6', color: INK_SECONDARY }}>{intro}</Text>
      <DetailTable rows={rows} />
      {ctaUrl && ctaLabel && <EmailButton href={ctaUrl} label={ctaLabel} accent={accent} />}
    </EmailLayout>
  );
}

export default BusinessNotificationEmail;
