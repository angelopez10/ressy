import * as React from 'react';
import { Heading, Section, Text } from '@react-email/components';
import { EmailLayout, BORDER, INK, INK_SECONDARY } from './EmailLayout';

export interface DailySummaryItem {
  time: string;
  customer: string;
  service: string;
}

/** Resumen diario al negocio: la agenda del día temprano por la mañana. */
export interface DailySummaryEmailProps {
  businessName: string;
  logoUrl?: string | null;
  preview: string;
  heading: string;
  intro: string;
  emptyText: string;
  items: DailySummaryItem[];
  footer: string;
}

export function DailySummaryEmail({
  businessName,
  logoUrl,
  preview,
  heading,
  intro,
  emptyText,
  items,
  footer,
}: DailySummaryEmailProps) {
  return (
    <EmailLayout preview={preview} businessName={businessName} logoUrl={logoUrl} footer={footer}>
      <Heading as="h1" style={{ margin: '16px 0 8px', fontSize: 20, fontWeight: 700, color: INK, letterSpacing: '-0.02em' }}>
        {heading}
      </Heading>
      <Text style={{ margin: 0, fontSize: 15, lineHeight: '1.6', color: INK_SECONDARY }}>{intro}</Text>

      {items.length === 0 ? (
        <Text style={{ margin: '16px 0 0', fontSize: 14, color: INK_SECONDARY }}>{emptyText}</Text>
      ) : (
        <Section style={{ border: `1px solid ${BORDER}`, borderRadius: 14, margin: '16px 0', overflow: 'hidden' }}>
          {items.map((it, i) => (
            <table key={i} width="100%" cellPadding={0} cellSpacing={0} role="presentation">
              <tbody>
                <tr>
                  <td style={{ padding: '12px 16px', borderTop: i === 0 ? 'none' : `1px solid ${BORDER}`, width: 64, fontSize: 14, fontWeight: 700, color: INK }}>
                    {it.time}
                  </td>
                  <td style={{ padding: '12px 16px', borderTop: i === 0 ? 'none' : `1px solid ${BORDER}`, fontSize: 14, color: INK }}>
                    <strong>{it.customer}</strong>
                    <span style={{ color: INK_SECONDARY }}> · {it.service}</span>
                  </td>
                </tr>
              </tbody>
            </table>
          ))}
        </Section>
      )}
    </EmailLayout>
  );
}

export default DailySummaryEmail;
