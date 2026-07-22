import 'server-only';

/**
 * Config de Mercado Pago (Chile, CLP). TODOS son secretos de servidor — ninguno
 * lleva prefijo NEXT_PUBLIC_ (CLAUDE.md §9). Si falta config, el provider se
 * reporta "no configurado" y la UI de conexión queda deshabilitada con aviso.
 *
 * - MP_CLIENT_ID / MP_CLIENT_SECRET: credenciales de la APLICACIÓN de Ressy en
 *   MP (no de un vendedor). Se usan para el flujo OAuth y para refrescar tokens.
 * - MP_WEBHOOK_SECRET: secret de la app para validar la firma `x-signature`.
 * - RESSY_MP_TOKEN_KEY: clave AES-256 (32 bytes en base64/hex) para cifrar los
 *   tokens de los vendedores en reposo. El activo más sensible del sistema.
 */

export interface MpConfig {
  clientId: string;
  clientSecret: string;
  /** Base del sitio para armar redirect_uri y notification_url. */
  appUrl: string;
}

export function getMpConfig(): MpConfig | null {
  const clientId = process.env.MP_CLIENT_ID;
  const clientSecret = process.env.MP_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;
  return {
    clientId,
    clientSecret,
    appUrl: process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000',
  };
}

export function getMpWebhookSecret(): string | null {
  return process.env.MP_WEBHOOK_SECRET ?? null;
}

/**
 * Access token de la CUENTA DE RESSY para el preapproval de suscripciones del
 * plan. A diferencia del OAuth de vendedores (anticipos), acá el dinero SÍ va a
 * Ressy — es el ingreso SaaS. Secreto de servidor; sin él, el billing por MP se
 * reporta "no configurado" y el upgrade queda deshabilitado.
 */
export function getMpAccessToken(): string | null {
  return process.env.MP_ACCESS_TOKEN ?? null;
}

/**
 * Email del PAGADOR a forzar SOLO en sandbox. MP exige que collector y payer sean
 * ambos usuarios de prueba (o ambos reales); como el collector es el test user del
 * `MP_ACCESS_TOKEN` de prueba, el payer también debe serlo. En dev, el usuario
 * logueado en Ressy suele tener un email real, así que este override lo reemplaza
 * por el de un COMPRADOR de prueba. Solo aplica con `MP_SANDBOX=true`; en
 * producción se ignora y se usa el email real del negocio.
 */
export function getMpTestPayerEmail(): string | null {
  if (!isMpSandbox()) return null;
  return process.env.MP_TEST_PAYER_EMAIL ?? null;
}

/**
 * ¿Usar el checkout de SANDBOX de MP? En dev con usuarios de prueba hay que
 * mandar al comprador a `sandbox.mercadopago.cl` (sandbox_init_point); pagar en
 * producción (`www.mercadopago.cl`) una preferencia de un vendedor de prueba da
 * "algo anduvo mal". Los test users reportan `live_mode: true`, así que no sirve
 * ese flag para decidir — se usa esta env explícita. En producción: sin setear.
 */
export function isMpSandbox(): boolean {
  return process.env.MP_SANDBOX === 'true';
}

/** redirect_uri registrado en la app de MP. Debe calzar EXACTO con el del panel. */
export function getMpRedirectUri(): string {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  return `${base}/api/payments/mp/callback`;
}
