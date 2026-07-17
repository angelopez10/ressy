# CLAUDE.md — Ressy

> Plataforma SaaS de reservas para negocios de servicios de todo tipo (barberías, spas, clínicas, entrenadores, etc). Worldwide, bilingüe ES/EN desde el día uno. Este archivo es la fuente de verdad del proyecto: léelo completo antes de cada tarea y respétalo.

---

## 1. Qué estamos construyendo

Ressy le da a cada negocio su propia **booking page pública** (`getressy.com/{slug}`) donde sus clientes reservan servicios 24/7, con recordatorios automáticos (email/WhatsApp) y cobro de anticipos. El negocio gestiona todo desde un **dashboard** (agenda, servicios, staff, clientes, reportes). Monetización: freemium con 4 tiers (Free / Starter $12 / Pro $29 / Business $69).

Dos superficies con audiencias distintas:

- **Booking page** → la usa el cliente final desde el móvil. Prioridad absoluta: confianza, cero fricción, guest checkout. Es LA pantalla del producto.
- **Dashboard** → lo usa el dueño/staff a diario. Debe sentirse liviano, no como un ERP.

---

## 2. Stack tecnológico

| Capa               | Tecnología                                                                       |
| ------------------ | -------------------------------------------------------------------------------- |
| Framework          | Next.js 15 (App Router) + TypeScript (strict)                                    |
| Estilos            | Tailwind CSS + shadcn/ui                                                         |
| i18n               | next-intl (rutas `/es` `/en`)                                                    |
| DB                 | PostgreSQL vía Supabase (RLS para multi-tenancy)                                 |
| Auth               | Supabase Auth (magic link para clientes finales)                                 |
| Pagos              | Stripe (global) + Mercado Pago (LATAM), detrás de una interfaz `PaymentProvider` |
| Suscripciones      | Stripe Billing                                                                   |
| Cobros de negocios | Stripe Connect                                                                   |
| Jobs/colas         | Inngest (recordatorios T-24h/T-2h, retries, cron)                                |
| Email              | Resend + react-email (templates bilingües)                                       |
| WhatsApp/SMS       | Twilio (solo en planes pagos por su costo)                                       |
| Hosting            | Vercel + Supabase (Railway para workers si hace falta)                           |
| Analytics          | PostHog (funnels de conversión de la booking page)                               |

Package manager: **pnpm**. No introducir dependencias nuevas sin justificarlo.

---

## 3. Decisiones de arquitectura (NO negociables)

**Multi-tenancy:** una sola DB, columna `business_id` en todas las tablas de negocio + Row Level Security de Supabase. Nunca consultar sin filtrar por tenant. Nunca confiar en el `business_id` que venga del cliente sin validarlo contra la sesión.

**Timezones (crítico, worldwide):** guardar TODO en UTC + una columna `timezone` IANA por negocio. Renderizar siempre en la timezone del negocio con label visible al cliente. Nunca usar la timezone del browser para calcular disponibilidad. Cuidado con DST: los horarios recurrentes se guardan como hora local + tz, no como UTC absoluto. Tener tests dedicados a esto.

**Multi-moneda:** el negocio define su moneda (CLP, USD, EUR, MXN...). Ressy no convierte, solo muestra y cobra en la moneda del negocio. Guardar montos en la unidad menor (integer, ej. centavos).

**Motor de disponibilidad (el corazón):**
`slots = horario_staff ∩ horario_negocio − bookings_existentes − bloqueos − eventos_google_calendar`, discretizado por duración del servicio + buffers. Cachear por (staff, día) e invalidar al escribir.

**Concurrencia de reservas:** dos clientes NO pueden tomar el mismo slot. Usar constraint de exclusión de Postgres (`EXCLUDE USING gist` sobre rango de tiempo + staff) dentro de una transacción. No resolver esto solo en código de aplicación.

**Pagos:** toda integración de pago pasa por la interfaz `PaymentProvider` (métodos como `createCheckout`, `refund`, `handleWebhook`). Stripe y Mercado Pago son implementaciones intercambiables. Nunca llamar al SDK de un proveedor directamente desde la UI o los route handlers de negocio.

**Estados de una reserva:**
`pending_payment → confirmed → (rescheduled) → completed | cancelled_by_client | cancelled_by_business | no_show`
Toda transición pasa por una función central que valida el estado origen; no mutar el estado a mano.

---

## 4. Modelo de datos (núcleo)

```
businesses ─┬─ locations            (solo plan Business)
            ├─ staff_members ─────── staff_schedules / schedule_overrides
            ├─ services ──────────── service_staff (N:M)
            ├─ customers             (mini-CRM, por negocio)
            ├─ bookings ──────────── booking_payments
            ├─ policies / settings
            └─ subscription          (referencia a Stripe)
```

Convenciones de esquema: PK `id` uuid; timestamps `created_at` / `updated_at` en UTC; snake_case en DB, camelCase en TS (mapear en la capa de datos); toda tabla de negocio lleva `business_id` con RLS.

---

## 5. Design system — "Airbnb clean"

Dirección de arte: blanco generoso, un solo acento usado con disciplina, tipografía grande y friendly, cards como unidad base, fotografía cálida real. Nada de gradientes estridentes, glassmorphism, dark mode (v1), ni más de 2 pesos tipográficos por pantalla.

### Tokens (confía en estos valores, vienen del design system aprobado)

**Tipografía:** `Plus Jakarta Sans` (Google Fonts), una sola familia para todo.

- Display/hero: 48–64px / 800 / tracking -2%
- H2: 32–40px / 600 · H3: 20–22px / 600
- Body: 16px / 400 / line-height 1.6 · Small: 14px / 400
- Botones: 16px / 600

**Color:**

| Token                   | Valor                  | Uso                                                       |
| ----------------------- | ---------------------- | --------------------------------------------------------- |
| `--color-accent`        | `#348D83`              | CTAs, links, estados activos, focus rings (teal de Ressy) |
| `--color-accent-hover`  | `#2C7A71`              | hover de CTAs                                             |
| `--color-accent-soft`   | `rgba(52,141,131,.08)` | fondos de badges, slot seleccionado                       |
| `--color-ink`           | `#222222`              | texto principal (nunca #000)                              |
| `--color-ink-secondary` | `#6A6A6A`              | texto secundario                                          |
| `--color-ink-tertiary`  | `#B0B0B0`              | placeholders, metadatos                                   |
| `--color-border`        | `#EBEBEB`              | bordes de cards e inputs                                  |
| `--color-surface`       | `#FFFFFF`              | fondo base                                                |
| `--color-surface-alt`   | `#F7F7F7`              | secciones alternas, fondo del dashboard                   |
| `--color-success`       | `#008A05`              | confirmaciones, "disponible"                              |
| `--color-warning`       | `#C13515`              | errores, "no disponible", cancelaciones                   |

**Forma y espacio:**

- Radios: cards `16px` · inputs `12px` · botones `9999px` (pill) · modales `24px`
- Sombra card (solo en hover/elevación; en reposo va borde): `0 1px 2px rgba(0,0,0,.06), 0 6px 20px rgba(0,0,0,.06)`
- Spacing en escala de 8: 8/16/24/32/48/64/96 · Container max-width `1120px` (24px de padding lateral en móvil)
- Iconos: Lucide, stroke 1.5px, 20px, color `--color-ink-secondary`

Estos tokens viven como variables CSS / theme de Tailwind. Todo componente los consume; nunca hardcodear un hex fuera del theme.

---

## 6. Convenciones de código

- **TypeScript strict**, sin `any`. Tipos derivados de Zod schemas cuando se validan inputs.
- **Server Components por defecto**; `"use client"` solo cuando hay interactividad real.
- **Validación**: Zod en todo límite (route handlers, server actions, forms).
- **Data fetching**: server actions o route handlers; nada de fetch a la DB desde el cliente.
- **Nombres**: componentes `PascalCase`, hooks `useCamelCase`, archivos de componente `PascalCase.tsx`.
- **i18n**: CERO strings hardcodeados en UI. Todo texto vive en `messages/es.json` y `messages/en.json`. Fechas con `Intl.DateTimeFormat`, monedas con `Intl.NumberFormat`. Recordar que el ES es ~25% más largo que el EN: los layouts deben aguantar el texto español.
- **Idioma de cada superficie**: dashboard → preferencia del usuario; booking page → configurable por el negocio (default por `Accept-Language`); emails/WhatsApp → idioma del cliente final capturado en la reserva.
- **Errores**: nunca tragar errores en silencio; loguear con contexto (`business_id`, `booking_id`).
- **Commits**: convencionales (`feat:`, `fix:`, `chore:`...), en inglés, imperativo.
- **Tests**: obligatorios para el motor de disponibilidad y las transiciones de estado de reserva. Vitest para unit, Playwright para el flujo de reserva end-to-end.

---

## 7. Cómo trabajar en este repo

- **Vertical slices, no capas horizontales.** Cada feature se construye completa (DB → API → UI) antes de pasar a la siguiente. Orden del roadmap: (1) fundaciones → (2) booking page pública + motor de disponibilidad → (3) onboarding wizard → (4) calendario del admin → (5) pagos/recordatorios/reportes.
- **Diseños**: los mockups de referencia viven en `/design-reference` (exportados de Claude Design como HTML/screenshots). Al construir una pantalla, míralos y replica estructura y tokens; no inventar estilos.
- **Antes de escribir código nuevo**: revisar si ya existe un componente/util que resuelva parte del problema.
- **Alcance del MVP** (respétalo, no hagas de más): sin marketplace, sin app nativa, sin multi-sucursal en v1. Un solo miembro de staff está bien para el primer corte.

---

## 8. Estructura de carpetas (referencia)

```
app/
  [locale]/
    (marketing)/        landing pública ES/EN
    (booking)/[slug]/   booking page pública
    (dashboard)/        app del negocio (auth)
    api/                route handlers
components/
  ui/                   primitivos (shadcn, con tokens Ressy)
  booking/              componentes de la booking page
  dashboard/
lib/
  db/                   acceso a Supabase, tipos
  availability/         motor de disponibilidad (+ tests)
  payments/             PaymentProvider + implementaciones
  i18n/
messages/               es.json / en.json
design-reference/       mockups exportados de Claude Design
```

---

## 9. Seguridad y datos

- Nunca exponer secrets al cliente (solo `NEXT_PUBLIC_*` es público).
- Validar webhooks de Stripe/Mercado Pago por firma antes de procesarlos.
- RLS activo en todas las tablas; asumir que cualquier query sin filtro de tenant es un bug.
- No loguear PII de clientes finales (email/teléfono) en texto plano en logs de producción.
