import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Plus_Jakarta_Sans } from 'next/font/google';
import '../globals.css';

/**
 * Layout raíz del panel interno. Vive FUERA de `app/[locale]/`, así que emite su
 * propio `<html>` (el root layout del repo es un passthrough).
 *
 * Sin i18n a propósito: el Super Admin lo usa solo el equipo de Ressy y va en
 * español (CLAUDE.md · sesión 13). Eso ahorra toda la capa de next-intl acá.
 *
 * Este layout NO tiene guard: es solo el shell del documento. Quién puede
 * entrar lo deciden `app/(superadmin)/admin/(panel)/layout.tsx` y, sobre todo,
 * cada server action (lib/admin/guard.ts).
 */

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-plus-jakarta',
  weight: ['400', '600', '800'],
});

export const metadata: Metadata = {
  title: 'Ressy · Panel interno',
  // El panel no debe aparecer en ningún índice, jamás.
  robots: { index: false, follow: false, nocache: true },
};

export default function SuperAdminRootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es" className={plusJakarta.variable}>
      <body>{children}</body>
    </html>
  );
}
