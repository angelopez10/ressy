import * as React from 'react';
import { EmailLayout, EmailH1, EmailText, BORDER, INK, INK_SECONDARY, SURFACE_ALT, FF } from './EmailLayout';

export interface DailySummaryItem {
  time: string;
  customer: string;
  service: string;
}

/** Resumen diario al NEGOCIO: la agenda del día temprano por la mañana. Marca Ressy. */
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
    <EmailLayout preview={preview} businessName={businessName} logoUrl={logoUrl} footer={footer} variant="ressy">
      <EmailH1>{heading}</EmailH1>
      <EmailText>{intro}</EmailText>

      {items.length === 0 ? (
        <EmailText>{emptyText}</EmailText>
      ) : (
        <table
          role="presentation"
          cellPadding={0}
          cellSpacing={0}
          width="100%"
          style={{ background: SURFACE_ALT, borderRadius: 12, margin: '4px 0 8px' }}
        >
          <tbody>
            <tr>
              <td style={{ padding: '8px 22px', fontFamily: FF }}>
                {items.map((it, i) => (
                  <table key={i} role="presentation" cellPadding={0} cellSpacing={0} width="100%">
                    <tbody>
                      <tr>
                        <td
                          style={{
                            width: 56,
                            padding: '12px 0',
                            borderTop: i === 0 ? 'none' : `1px solid ${BORDER}`,
                            fontSize: 15,
                            fontWeight: 800,
                            color: INK,
                            verticalAlign: 'top',
                          }}
                        >
                          {it.time}
                        </td>
                        <td
                          style={{
                            padding: '12px 0',
                            borderTop: i === 0 ? 'none' : `1px solid ${BORDER}`,
                            fontSize: 14,
                            color: INK,
                          }}
                        >
                          <span style={{ fontWeight: 700 }}>{it.customer}</span>
                          <span style={{ color: INK_SECONDARY }}> · {it.service}</span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                ))}
              </td>
            </tr>
          </tbody>
        </table>
      )}
    </EmailLayout>
  );
}

export default DailySummaryEmail;
