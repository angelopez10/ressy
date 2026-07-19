import * as React from 'react';
import { Body, Container, Head, Hr, Html, Img, Preview, Section, Text } from '@react-email/components';

/**
 * Layout base de los emails de Ressy. Design system "Airbnb clean" adaptado a
 * email: estilos inline, tipografía sans, blanco generoso, un solo acento
 * (configurable por negocio). react-email genera tablas compatibles con clientes
 * de correo.
 */
export const INK = '#222222';
export const INK_SECONDARY = '#6A6A6A';
export const BORDER = '#EBEBEB';
export const SURFACE_ALT = '#F7F7F7';

const fontFamily =
  "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

export function EmailLayout({
  preview,
  businessName,
  logoUrl,
  footer,
  children,
}: {
  preview: string;
  businessName: string;
  logoUrl?: string | null;
  footer: string;
  children: React.ReactNode;
}) {
  return (
    <Html>
      <Head />
      <Preview>{preview}</Preview>
      <Body style={{ backgroundColor: SURFACE_ALT, margin: 0, padding: '24px 0', fontFamily }}>
        <Container
          style={{
            backgroundColor: '#ffffff',
            borderRadius: 16,
            border: `1px solid ${BORDER}`,
            maxWidth: 480,
            margin: '0 auto',
            overflow: 'hidden',
          }}
        >
          <Section style={{ padding: '24px 28px 0' }}>
            {logoUrl ? (
              <Img src={logoUrl} alt={businessName} height={40} style={{ borderRadius: 8, maxHeight: 40 }} />
            ) : (
              <Text style={{ margin: 0, fontSize: 18, fontWeight: 800, color: INK, letterSpacing: '-0.02em' }}>
                {businessName}
              </Text>
            )}
          </Section>

          <Section style={{ padding: '8px 28px 28px' }}>{children}</Section>

          <Hr style={{ borderColor: BORDER, margin: 0 }} />
          <Section style={{ padding: '16px 28px' }}>
            <Text style={{ margin: 0, fontSize: 12, color: '#B0B0B0', textAlign: 'center' }}>{footer}</Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

export function DetailTable({ rows }: { rows: { label: string; value: string }[] }) {
  return (
    <Section
      style={{
        border: `1px solid ${BORDER}`,
        borderRadius: 14,
        margin: '16px 0',
        overflow: 'hidden',
      }}
    >
      {rows.map((r, i) => (
        <table key={r.label} width="100%" cellPadding={0} cellSpacing={0} role="presentation">
          <tbody>
            <tr>
              <td
                style={{
                  padding: '12px 16px',
                  borderTop: i === 0 ? 'none' : `1px solid ${BORDER}`,
                  fontSize: 13,
                  color: INK_SECONDARY,
                }}
              >
                {r.label}
              </td>
              <td
                style={{
                  padding: '12px 16px',
                  borderTop: i === 0 ? 'none' : `1px solid ${BORDER}`,
                  fontSize: 13,
                  fontWeight: 600,
                  color: INK,
                  textAlign: 'right',
                }}
              >
                {r.value}
              </td>
            </tr>
          </tbody>
        </table>
      ))}
    </Section>
  );
}

export function EmailButton({ href, label, accent }: { href: string; label: string; accent: string }) {
  return (
    <table cellPadding={0} cellSpacing={0} role="presentation" style={{ margin: '8px 0' }}>
      <tbody>
        <tr>
          <td style={{ borderRadius: 9999, backgroundColor: accent }}>
            <a
              href={href}
              style={{
                display: 'inline-block',
                padding: '12px 24px',
                color: '#ffffff',
                fontSize: 15,
                fontWeight: 600,
                textDecoration: 'none',
                borderRadius: 9999,
              }}
            >
              {label}
            </a>
          </td>
        </tr>
      </tbody>
    </table>
  );
}
