import type { ReactNode } from 'react';
import './globals.css';

/**
 * Root layout mínimo: el `<html>` real lo emite `app/[locale]/layout.tsx`,
 * que es quien conoce el idioma para el atributo `lang`.
 */
export default function RootLayout({ children }: { children: ReactNode }) {
  return children;
}
