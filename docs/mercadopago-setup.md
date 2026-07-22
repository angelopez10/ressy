# Mercado Pago — anticipos (sesión 10B)

Guía para dejar andando los **anticipos** en local (Chile / CLP). Modelo: cada
negocio conecta **su** cuenta de MP por OAuth y el anticipo se cobra **en su
cuenta**. Ressy nunca toca el dinero ni cobra comisión.

> Todas las variables van en `.env.local` (gitignoreado). Nombres exactos en
> `.env.example`.

---

## 1. Crear la aplicación en Mercado Pago

MP Developers → **Tus integraciones** → **Crear aplicación**.

- **Producto / solución:** **Checkout Pro** (o Checkout API) — *Pagos online*.
  ⚠️ NO "Suscripciones": ese producto no autoriza cobrar en nombre de terceros.
- **País de operación:** Chile.

El **número de la aplicación** (lo ves en la URL: `.../app/<NUMERO>/...`) es tu
**`MP_CLIENT_ID`**.

---

## 2. ⚠️ Dónde está el Client Secret

El **Client Secret NO está** en "Configuración de la aplicación" ni en
"Credenciales de prueba" (esa solo trae Public Key + Access Token). Está en:

> Menú izquierdo → sección **PRODUCCIÓN** → **Credenciales de producción**

Esa página muestra los 4 datos juntos: **Client ID**, **Client Secret**, Access
Token y Public Key.

**Client ID / Client Secret identifican a la APP, no al entorno** — son los
mismos para OAuth aunque conectes una cuenta de **prueba**; lo test/prod lo
define el vendedor que autoriza. Así que copiar el Client Secret desde
"Credenciales de producción" es lo correcto para probar en sandbox.

- `MP_CLIENT_ID` = Client ID (numérico, = número de la app).
- `MP_CLIENT_SECRET` = Client Secret de esa página.

> Si "Credenciales de producción" aparece bloqueada o pide "activar", completa lo
> que pida (datos básicos + preguntas de "Producto integrado" + aceptar términos).
> Eso las desbloquea. El Secret se puede **regenerar** ahí (invalida el anterior).

---

## 3. Redirect URI + PKCE

En **Configuración de la aplicación → Configuración avanzada**:

- **PKCE:** "¿Usas el flujo de código de actualización con PKCE?" → **Sí**
  (el código manda `code_challenge`/`code_verifier`; tiene que estar en Sí).
- **Permisos:** deja marcados al menos `read`, `write` y `offline access`
  (este último es el que habilita el `refresh_token`).
- **Redirect URI:** debe calzar EXACTO con `NEXT_PUBLIC_APP_URL` +
  `/api/payments/mp/callback`.

⚠️ MP suele **rechazar `http://localhost`** como redirect. Para local, usa la URL
**https del túnel** (ver §4) — la misma sirve para OAuth y para el webhook:

```
https://<tu-tunnel>/api/payments/mp/callback     # local (túnel)
https://getressy.com/api/payments/mp/callback    # producción
```

El **Client ID** y el **Client Secret** están al **inicio** de "Configuración de
la aplicación" (bloque de datos de la app), no en las pantallas de credenciales.
Si el Secret aparece oculto, revélalo con el icono de ojo o regenéralo.

---

## 4. Webhook

MP no puede notificar a `localhost`: necesitas un **túnel público**.

```bash
# opción A
ngrok http 3000
# opción B
cloudflared tunnel --url http://localhost:3000
```

Toma la URL pública (ej. `https://abc123.ngrok.app`) y:

1. En `.env.local`: `NEXT_PUBLIC_APP_URL=https://abc123.ngrok.app`
   (así el `notification_url` y las URLs de retorno apuntan al túnel).
2. En MP → menú **Webhooks** → configura la URL de notificaciones:
   ```
   https://abc123.ngrok.app/api/payments/mp/webhook
   ```
   Selecciona el evento **Pagos** (`payment`).
3. MP te da un **secret de firma** para ese webhook → cópialo a
   `MP_WEBHOOK_SECRET`. (Es lo que valida la firma `x-signature`; sin él, el
   webhook se rechaza con 401 a propósito.)

> Sin túnel, la reserva con anticipo queda en `pending_payment` y expira sola a
> los 12 min (el job la libera). El pago igual se aprueba en MP, pero Ressy no se
> entera hasta recibir el webhook.

---

## 5. Cuentas de prueba (sandbox)

MP → menú **Cuentas de prueba** → crea **dos**:

- **Vendedor** — simula al negocio. Es la cuenta que vas a **conectar por OAuth**
  desde el dashboard de Ressy (Ajustes → Pagos → Conectar Mercado Pago).
- **Comprador** — con esta **pagas** el anticipo en el checkout.

⚠️ Deben ser **distintas** y **de prueba** (no tu cuenta real). Para pagar usa
las **tarjetas de prueba** (menú "Tarjetas de prueba"): p. ej. `APRO` para
aprobar, `OTHE` para rechazar.

---

## 6. Variables finales (`.env.local`)

```bash
MP_CLIENT_ID=6706636264563973          # número de la app (URL)
MP_CLIENT_SECRET=<de Configuración de la aplicación>
MP_WEBHOOK_SECRET=<del menú Webhooks>
RESSY_MP_TOKEN_KEY=<openssl rand -base64 32>   # 32 bytes, cifra los tokens
NEXT_PUBLIC_APP_URL=http://localhost:3000       # o la URL del túnel al probar webhooks
```

- Sin espacios al inicio de cada línea.
- `MP_CLIENT_ID` es **numérico** (no `TEST-...` ni `APP_USR-...`).
- El **Access Token / Public Key** de las pantallas de credenciales **no** se
  usan: el token de cobro sale del OAuth del vendedor.

---

## 7. Probar el ciclo completo

1. `pnpm dev` (+ `pnpm inngest` para los jobs de expiración/refresh).
2. Dashboard → **Ajustes → Pagos → Conectar Mercado Pago** → autoriza con la
   **cuenta vendedor de prueba**. Debe volver como "Conectada".
3. **Ajustes → Políticas** (o el servicio) → activa un **anticipo** (%, o monto).
   Requiere plan pago + cuenta conectada (si no, lo bloquea).
4. Abre la **booking page** del negocio y reserva ese servicio → te redirige al
   **checkout de MP** → paga con la **cuenta compradora** + tarjeta `APRO`.
5. Al aprobarse, el **webhook** confirma la reserva (`pending_payment → confirmed`)
   y dispara la confirmación al cliente. En el detalle de la reserva ves el pago.
6. **Reembolso:** detalle de la reserva → "Reembolsar anticipo" (se ejecuta sobre
   la cuenta MP del vendedor).

---

## Notas

- El **access token** del vendedor dura ~180 días; se **refresca solo** (job
  diario) con margen. Si el refresh falla, la cuenta queda en `error` y el
  dashboard avisa que reconecte.
- Los tokens se guardan **cifrados** (AES-256-GCM) en `mp_oauth_accounts`, tabla
  con RLS deny-all: nunca salen al cliente ni a los logs.
- **Fee por no-show:** pendiente (requiere tarjeta guardada). No implementado.
