import * as React from 'react';
import { Body, Container, Head, Html, Img, Preview, Section } from '@react-email/components';

/**
 * Layout base de los emails de Ressy, alineado al design system de correos
 * transaccionales (design-reference/Ressy Transactional Emails). "Airbnb clean"
 * adaptado a email: estilos inline, tablas, blanco generoso, un solo acento.
 *
 * Dos marcas de header:
 *  - `client`  → marca del NEGOCIO (el cliente final ve el logo/nombre del negocio).
 *  - `ressy`   → marca RESSY (correos del sistema al dueño: reservas, resumen, trial).
 */
export const INK = '#222222';
export const INK_SECONDARY = '#6A6A6A';
export const INK_TERTIARY = '#B0B0B0';
export const BORDER = '#EBEBEB';
export const SURFACE_ALT = '#F7F7F7';
export const ACCENT = '#348D83';
export const SUCCESS = '#008A05';
export const WARNING = '#C13515';

export const FF =
  "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

export type BrandVariant = 'client' | 'ressy';

/** Header con la marca del NEGOCIO (logo o inicial + nombre). */
function ClientHeader({ businessName, logoUrl }: { businessName: string; logoUrl?: string | null }) {
  const initial = businessName.trim().charAt(0).toUpperCase() || 'R';
  return (
    <table role="presentation" cellPadding={0} cellSpacing={0} width="100%">
      <tbody>
        <tr>
          <td style={{ verticalAlign: 'middle', width: 38 }}>
            {logoUrl ? (
              <Img src={logoUrl} alt={businessName} width={38} height={38} style={{ borderRadius: 10, display: 'block' }} />
            ) : (
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 10,
                  background: INK,
                  color: '#fff',
                  fontFamily: FF,
                  fontWeight: 800,
                  fontSize: 18,
                  textAlign: 'center',
                  lineHeight: '38px',
                }}
              >
                {initial}
              </div>
            )}
          </td>
          <td style={{ paddingLeft: 12, fontFamily: FF, fontWeight: 700, fontSize: 16, color: INK }}>
            {businessName}
          </td>
        </tr>
      </tbody>
    </table>
  );
}

/** Header con la marca RESSY (círculo acento + wordmark). Sin imagen externa. */
function RessyHeader() {
  return (
    <table role="presentation" cellPadding={0} cellSpacing={0} width="100%">
      <tbody>
        <tr>
          <td style={{ verticalAlign: 'middle', width: 28 }}>
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: '50%',
                background: ACCENT,
                color: '#fff',
                fontFamily: FF,
                fontWeight: 800,
                fontSize: 12,
                textAlign: 'center',
                lineHeight: '28px',
              }}
            >
              re
            </div>
          </td>
          <td style={{ paddingLeft: 9, fontFamily: FF, fontWeight: 800, fontSize: 17, letterSpacing: '-0.02em', color: INK }}>
            ressy
          </td>
        </tr>
      </tbody>
    </table>
  );
}

/** Footer "Powered by Ressy". Resalta la palabra Ressy si aparece en el texto. */
function Footer({ text }: { text: string }) {
  const parts = text.split('Ressy');
  return (
    <table role="presentation" cellPadding={0} cellSpacing={0} width="100%">
      <tbody>
        <tr>
          <td
            style={{
              padding: '22px 32px 28px',
              borderTop: `1px solid ${BORDER}`,
              fontFamily: FF,
              fontSize: 12,
              lineHeight: '1.7',
              color: INK_TERTIARY,
            }}
          >
            {parts.length > 1
              ? parts.flatMap((p, i) =>
                  i === 0
                    ? [p]
                    : [
                        <span key={i} style={{ color: INK_SECONDARY, fontWeight: 600 }}>
                          Ressy
                        </span>,
                        p,
                      ],
                )
              : text}
          </td>
        </tr>
      </tbody>
    </table>
  );
}

export function EmailLayout({
  preview,
  businessName,
  logoUrl,
  footer,
  variant = 'client',
  children,
}: {
  preview: string;
  businessName: string;
  logoUrl?: string | null;
  footer: string;
  variant?: BrandVariant;
  children: React.ReactNode;
}) {
  return (
    <Html>
      <Head />
      <Preview>{preview}</Preview>
      <Body style={{ backgroundColor: SURFACE_ALT, margin: 0, padding: '20px', fontFamily: FF }}>
        <Container
          style={{
            backgroundColor: '#ffffff',
            borderRadius: 12,
            maxWidth: 600,
            margin: '0 auto',
            overflow: 'hidden',
          }}
        >
          <Section style={{ padding: '26px 32px', borderBottom: `1px solid ${BORDER}` }}>
            {variant === 'ressy' ? (
              <RessyHeader />
            ) : (
              <ClientHeader businessName={businessName} logoUrl={logoUrl} />
            )}
          </Section>

          <Section style={{ padding: '30px 32px 26px' }}>{children}</Section>

          <Footer text={footer} />
        </Container>
      </Body>
    </Html>
  );
}

// ---------------------------------------------------------------------------
// Piezas reutilizables (del design reference)
// ---------------------------------------------------------------------------

export function EmailH1({ children }: { children: React.ReactNode }) {
  return (
    <h1 style={{ margin: '0 0 12px', fontFamily: FF, fontSize: 23, fontWeight: 800, letterSpacing: '-0.02em', color: INK }}>
      {children}
    </h1>
  );
}

export function EmailGreeting({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ margin: '0 0 4px', fontFamily: FF, fontSize: 15, fontWeight: 600, color: INK }}>{children}</p>
  );
}

export function EmailText({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ margin: '0 0 16px', fontFamily: FF, fontSize: 15, lineHeight: '1.65', color: INK_SECONDARY }}>
      {children}
    </p>
  );
}

/** Filas de detalle: sin caja, reglas horizontales, label 110px / valor en negrita. */
export function DetailTable({ rows }: { rows: { label: string; value: string }[] }) {
  return (
    <table role="presentation" cellPadding={0} cellSpacing={0} width="100%" style={{ margin: '4px 0 20px' }}>
      <tbody>
        {rows.map((r, i) => (
          <tr key={r.label}>
            <td
              style={{
                padding: '9px 0',
                borderTop: i === 0 ? 'none' : `1px solid ${BORDER}`,
                fontFamily: FF,
                fontSize: 14,
                color: INK_SECONDARY,
                width: 110,
                verticalAlign: 'top',
              }}
            >
              {r.label}
            </td>
            <td
              style={{
                padding: '9px 0',
                borderTop: i === 0 ? 'none' : `1px solid ${BORDER}`,
                fontFamily: FF,
                fontSize: 14,
                fontWeight: 600,
                color: INK,
              }}
            >
              {r.value}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** Botón primario (solid) o secundario (outline). Radio 10, 16px/700 (email-safe). */
export function EmailButton({
  href,
  label,
  accent = ACCENT,
  variant = 'solid',
}: {
  href: string;
  label: string;
  accent?: string;
  variant?: 'solid' | 'outline';
}) {
  const solid = variant === 'solid';
  const bg = solid ? accent : '#ffffff';
  const col = solid ? '#ffffff' : INK;
  const bd = solid ? accent : BORDER;
  return (
    <table role="presentation" cellPadding={0} cellSpacing={0} align="center" style={{ margin: '18px auto 26px' }}>
      <tbody>
        <tr>
          <td style={{ borderRadius: 10, border: `1px solid ${bd}`, background: bg }}>
            <a
              href={href}
              style={{
                display: 'inline-block',
                padding: '14px 30px',
                fontFamily: FF,
                fontSize: 16,
                fontWeight: 700,
                lineHeight: '20px',
                color: col,
                textDecoration: 'none',
                borderRadius: 10,
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

/** Link secundario (teal). */
export function EmailLink({ href, label }: { href: string; label: string }) {
  return (
    <a href={href} style={{ fontFamily: FF, fontSize: 14, fontWeight: 600, color: ACCENT, textDecoration: 'none' }}>
      {label}
    </a>
  );
}

export type StatusTone = 'confirmed' | 'rescheduled' | 'cancelled';

const STATUS_STYLES: Record<StatusTone, { color: string; background: string }> = {
  confirmed: { color: SUCCESS, background: '#E8F5E9' },
  rescheduled: { color: '#8A5A00', background: '#FFF4E0' },
  cancelled: { color: WARNING, background: '#FDECE8' },
};

/** Badge de estado de la reserva (confirmada / reagendada / cancelada). */
export function StatusBadge({ label, tone }: { label: string; tone: StatusTone }) {
  const s = STATUS_STYLES[tone];
  return (
    <span
      style={{
        display: 'inline-block',
        fontFamily: FF,
        fontSize: 13,
        fontWeight: 700,
        color: s.color,
        background: s.background,
        borderRadius: 8,
        padding: '6px 12px',
      }}
    >
      {label}
    </span>
  );
}

/** Bloque destacado gris (fondo surface-alt), p.ej. mensaje del negocio. */
export function EmailPanel({ children }: { children: React.ReactNode }) {
  return (
    <table role="presentation" cellPadding={0} cellSpacing={0} width="100%" style={{ background: SURFACE_ALT, borderRadius: 12, margin: '4px 0 20px' }}>
      <tbody>
        <tr>
          <td style={{ padding: '18px 22px', fontFamily: FF, fontSize: 14, lineHeight: '1.6', color: INK }}>
            {children}
          </td>
        </tr>
      </tbody>
    </table>
  );
}
