import * as React from 'react';
import { EmailLayout, EmailButton, EmailH1, EmailText, EmailPanel, INK_TERTIARY, FF } from './EmailLayout';

/**
 * Magic link de acceso a Ressy. A diferencia del resto de los correos, este NO
 * lo manda nuestra capa de notificaciones: lo manda SUPABASE AUTH. Por eso se
 * compila a HTML estático (scripts/build-auth-emails.mts) dejando el placeholder
 * `{{ .ConfirmationURL }}` de Supabase como href del botón.
 *
 * Marca RESSY (es un correo de la plataforma, no de un negocio).
 */
const COPY = {
  es: {
    preview: 'Tu link de acceso a Ressy',
    heading: 'Inicia sesión en Ressy',
    intro: 'Toca el botón para entrar a tu cuenta. No necesitas contraseña.',
    cta: 'Entrar a Ressy',
    expiry: (min: number) =>
      min >= 60
        ? `Este link expira en ${min / 60} hora${min / 60 > 1 ? 's' : ''} y solo se puede usar una vez. No lo compartas con nadie.`
        : `Este link expira en ${min} minutos y solo se puede usar una vez. No lo compartas con nadie.`,
    ignore: 'Si no pediste este correo, puedes ignorarlo sin problema.',
    footer: 'Enviado con Ressy',
  },
  en: {
    preview: 'Your Ressy login link',
    heading: 'Log in to Ressy',
    intro: 'Tap the button to sign in to your account. No password needed.',
    cta: 'Log in to Ressy',
    expiry: (min: number) =>
      min >= 60
        ? `This link expires in ${min / 60} hour${min / 60 > 1 ? 's' : ''} and can only be used once. Don't share it with anyone.`
        : `This link expires in ${min} minutes and can only be used once. Don't share it with anyone.`,
    ignore: "If you didn't request this email, you can safely ignore it.",
    footer: 'Sent with Ressy',
  },
} as const;

export interface MagicLinkEmailProps {
  locale: 'es' | 'en';
  /** URL de confirmación. En el HTML compilado es el placeholder de Supabase. */
  url: string;
  /** Minutos de validez del link (config.toml → auth.email.otp_expiry). */
  expiryMinutes?: number;
}

export function MagicLinkEmail({ locale, url, expiryMinutes = 60 }: MagicLinkEmailProps) {
  const c = COPY[locale];
  return (
    <EmailLayout preview={c.preview} businessName="Ressy" footer={c.footer} variant="ressy">
      <EmailH1>{c.heading}</EmailH1>
      <EmailText>{c.intro}</EmailText>

      <EmailButton href={url} label={c.cta} />

      <EmailPanel>{c.expiry(expiryMinutes)}</EmailPanel>

      <p style={{ margin: 0, fontFamily: FF, fontSize: 12, lineHeight: '1.6', color: INK_TERTIARY }}>
        {c.ignore}
      </p>
    </EmailLayout>
  );
}

export default MagicLinkEmail;
