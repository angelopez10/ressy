# Analytics (PostHog) — capa `lib/analytics`

Instrumentación de producto de Ressy. **Todo pasa por esta capa**: ningún
`posthog.capture` suelto. Los nombres y propiedades de eventos están tipados
(`events.ts`) y **todo payload se filtra por un único punto anti-PII**
(`sanitize.ts`) antes de salir.

## Privacidad primero (CLAUDE.md §9)

Ressy maneja datos de clientes finales que **no son usuarios de Ressy**
(nombres, emails, teléfonos, notas del CRM). **Nunca se envían a PostHog.**

- **Punto de filtrado único:** `sanitize()` usa un **allowlist** de keys — solo
  identificadores, enums, booleanos y números. Cualquier otra key se descarta
  (con warning en dev). Aunque un call site pase `customer_email` por error,
  jamás llega a la red. Verificado por tests (`sanitize.test.ts`), incluido uno
  que comprueba que **cada propiedad del catálogo está en el allowlist**.
- **Identidad:** el negocio se identifica por `business_id` / user id, **nunca
  por email** en el payload.
- **Session recording: OFF en todas las superficies** (`disable_session_recording`),
  con enmascarado total si alguna vez se activara. **Autocapture: OFF** — solo
  eventos manuales del catálogo.
- **Booking page pública:** NO monta `PostHogProvider` (hay datos de clientes en
  pantalla). Sus 5 eventos de funnel usan `track()` directo, que comparte el
  init hardened (sin recording, sin autocapture, sin captura de formularios).
- **Consentimiento (opt-out por región):** analytics ON por defecto, OFF hasta
  consentir en la EEA. `hasAnalyticsConsent()` gatea todo `track` del cliente; el
  banner de consentimiento fija el default por región (`consent.ts`). Se respeta
  `Do Not Track`.

## Inicialización y separación dev/prod

- **Client** (`track.ts`): init perezoso de `posthog-js` en el primer evento,
  con config hardened. Un `PostHogProvider` (solo dashboard) identifica al
  negocio una vez.
- **Server** (`server.ts`): singleton de `posthog-node`, `flushAt:1` (envío
  inmediato, apto para serverless). distinctId = `business_id`.
- **Un proyecto PostHog por ambiente**: la misma variable
  `NEXT_PUBLIC_POSTHOG_KEY` con **valor distinto** en dev y prod (Vercel). **En
  local, sin key ⇒ no-op con `console.debug`** — el desarrollo no ensucia ningún
  proyecto. En test (`NODE_ENV=test`) también es no-op.

## Eventos (server vs client)

Propiedades comunes cuando aplican: `business_id`, `plan`, `locale`, `country`
(derivado de la moneda; nunca del visitante).

### Server-side (fuente de verdad — no manipulable por el cliente)

| Evento | Props | Dónde se dispara |
| --- | --- | --- |
| `business_signed_up` | `method` | `onboarding/actions.ts` (create_business) |
| `trial_started` | — | idem (arranque del trial) |
| `onboarding_step_completed` | `step 1–5` | cada `save*` + `publishBusiness` |
| `onboarding_completed` | — | `publishBusiness` |
| `booking_created` | `origin`, `with_deposit` | `booking/actions` (sin anticipo), webhook (con anticipo), `dashboard/actions` (manual) |
| `first_booking_received` | — | mismo punto, solo si es la 1.ª real (ver abajo) |
| `booking_completed` / `booking_no_show` | — | `dashboard/actions` (transición de negocio) |
| `booking_cancelled` | `by` | `booking/actions` (client), `dashboard/actions` (business) |
| `booking_rescheduled` | `by` | idem |
| `reminder_sent` / `reminder_failed` | `channel`, `kind`/`reason` | `notifications/dispatch` |
| `trial_ending_soon` / `trial_ended` | — | `inngest/functions` (cron de trial, día 11/14) |
| `subscription_started` | `plan`, `cycle` | webhook de suscripción |
| `subscription_upgraded` / `subscription_downgraded` | `previous_plan`, `new_plan` | idem (compara tier previo) |
| `subscription_cancelled` | `plan` | idem |
| `payment_failed` | — | idem (`past_due`/`unpaid`) |
| `plan_limit_reached` | `limit` | gating de reservas/servicios/staff |

### Client-side (UI — mide intención)

| Evento | Props | Dónde |
| --- | --- | --- |
| `booking_page_viewed` | — | `BookingFlow` (mount) |
| `service_selected` / `slot_selected` / `booking_form_started` | — | `BookingFlow` (pasos) |
| `booking_confirmed` | `with_deposit` | `BookingFlow` (éxito) |
| `booking_link_shared` | `channel` | `CalendarEmptyState`, `Step5Done` |
| `upgrade_cta_clicked` | `from` | `DashboardBanners` |

`reminder_failed.reason` es un **enum** (`delivery_error`…), nunca el error crudo
del proveedor — ese puede contener el email/teléfono del destinatario.

## `first_booking_received` se dispara UNA sola vez por negocio

Lógica en `booking-events.ts::trackBookingCreated`:

1. La reserva ya es **real** (confirmada) cuando se llama — sin anticipo al
   crearse, con anticipo solo cuando el webhook confirmó el pago (`didConfirm`).
2. Se cuentan las reservas reales del negocio (excluye `pending_payment` /
   `payment_expired`) **incluida esta**. Si el total es **1**, es la primera ⇒
   se emite `first_booking_received`.
3. **Dedup de webhooks:** el webhook solo llama cuando hubo transición real
   (`booking_confirm_payment` devuelve `didConfirm`); un reintento no re-cuenta
   ni re-emite. Cubierto por `booking-events.test.ts`.

## Funnels y dashboards a configurar en PostHog

Todos **agregados por el group `business`** (server y client comparten el group),
así los eventos de servidor y de UI se unen por negocio.

1. **Onboarding:** `business_signed_up` → `onboarding_completed` →
   `booking_link_shared` → `first_booking_received`. (Dónde se caen los negocios.)
2. **Booking page:** `booking_page_viewed` → `service_selected` →
   `slot_selected` → `booking_confirmed`. (Punto de fuga visita → reserva.)
3. **Retención de negocios:** cohortes por semana de `business_signed_up`,
   retención sobre `booking_created` (¿siguen creando reservas?).
4. **Conversión de trial:** `trial_started` → `subscription_started`.

## Tasa de no-show → se calcula en la DB, no en PostHog

Es la **métrica de marketing más valiosa**, debe ser **exacta y auditable**.
PostHog pierde eventos (opt-out, adblock, red) y no es la fuente de verdad de
las reservas. El número que se publica sale de un query sobre `bookings`; en
PostHog puede quedar un insight secundario "direccional".

```sql
-- Tasa de no-show por negocio (reservas ya pasadas).
select
  b.business_id,
  count(*) filter (where b.status = 'no_show')                  as no_shows,
  count(*) filter (where b.status in ('no_show','completed'))   as attended_universe,
  round(
    count(*) filter (where b.status = 'no_show')::numeric
    / nullif(count(*) filter (where b.status in ('no_show','completed')), 0),
    4
  ) as no_show_rate
from bookings b
where b.starts_at < now()
group by b.business_id;

-- Global (todas las reservas pasadas).
select
  round(
    count(*) filter (where status = 'no_show')::numeric
    / nullif(count(*) filter (where status in ('no_show','completed')), 0),
    4
  ) as global_no_show_rate
from bookings
where starts_at < now();
```

> El denominador es `no_show + completed` (reservas que llegaron a su hora y se
> resolvieron), no todo el historial: las canceladas con antelación no son
> no-shows y no deben inflar/desinflar la tasa.
