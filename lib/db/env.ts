/**
 * Lectura de env vars de Supabase con fallo temprano y explícito.
 * Solo `NEXT_PUBLIC_*` puede llegar al bundle del cliente (CLAUDE.md §9).
 *
 * Nombres según el sistema nuevo de API keys de Supabase:
 *   publishable (`sb_publishable_...`) → browser, la protege RLS
 *   secret      (`sb_secret_...`)      → servidor, bypassa RLS
 */
function required(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(`Falta la variable de entorno ${name}. Cópiala desde .env.example.`);
  }
  return value;
}

export function getPublicSupabaseEnv() {
  return {
    url: required('NEXT_PUBLIC_SUPABASE_URL', process.env.NEXT_PUBLIC_SUPABASE_URL),
    publishableKey: required(
      'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    ),
  };
}

/**
 * Secret key: bypassa RLS por completo. Solo para código de servidor de
 * confianza (webhooks, jobs de Inngest). NUNCA importar esto desde un
 * componente ni exponerlo con el prefijo NEXT_PUBLIC_.
 */
export function getSupabaseSecretKey(): string {
  return required('SUPABASE_SECRET_KEY', process.env.SUPABASE_SECRET_KEY);
}
