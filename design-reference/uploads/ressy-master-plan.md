# Ressy — Master Plan
**Plataforma de reservas para negocios de servicios · Worldwide · ES/EN**
*Versión 1.0 — Julio 2026*

---

## 1. Visión y posicionamiento

**Qué es Ressy:** una plataforma SaaS que permite a cualquier negocio de servicios (barberías, clínicas, spas, entrenadores, abogados, talleres mecánicos, estudios de tatuajes, psicólogos, etc.) gestionar su agenda, recibir reservas online 24/7, cobrar anticipos y reducir no-shows con recordatorios automáticos.

**Propuesta de valor (una línea):**
> "Tu negocio abierto para reservas 24/7 — sin llamadas, sin WhatsApp, sin no-shows."

**Posicionamiento vs competencia:**

| Competidor | Fortaleza | Debilidad que Ressy explota |
|---|---|---|
| Calendly | Simplicidad | No pensado para negocios con staff, servicios y pagos |
| Fresha | Gratis + marketplace | Cobra comisión alta por clientes nuevos (~20%), enfocado solo en belleza |
| Booksy | Marketplace fuerte | Caro (~USD 30+/mes/staff), UX recargada, débil en LATAM |
| AgendaPro (LATAM) | Fuerte en Chile/LATAM | Solo español, UX anticuada, pricing alto |
| Square Appointments | Pagos integrados | Solo mercados Square (no LATAM) |

**El ángulo de Ressy:** vertical-agnóstico, bilingüe nativo (ES/EN) desde el día uno, pricing accesible para LATAM y competitivo en USA/Europa, con UX moderna. El mercado hispanohablante + negocios latinos en USA es un nicho de entrada real que los players grandes atienden mal.

**Estrategia de fases:**
- **Fase 1 (SaaS):** cada negocio tiene su booking page pública (`getressy.com/mi-barberia`). Ressy no genera demanda, solo la gestiona.
- **Fase 2 (Red):** directorio/marketplace opcional cuando haya masa crítica de negocios (>500 activos en una ciudad).

---

## 2. Modelo de negocio

### 2.1 Fuentes de ingreso

1. **Suscripción mensual/anual (core)** — freemium con 3 tiers pagos. El plan anual con ~2 meses gratis mejora cash flow y retención.
2. **Fee sobre pagos online (secundario)** — si el negocio cobra anticipos/pagos por Ressy: comisión de plataforma de 1% + fees del procesador (Stripe/Mercado Pago). Opcional, nunca obligatorio.
3. **Add-ons (futuro):** SMS packs (los SMS tienen costo real), marketplace boost, white-label.

### 2.2 Tiers de suscripción

| | **Free** | **Starter** | **Pro** | **Business** |
|---|---|---|---|---|
| Precio USD/mes | $0 | $12 | $29 | $69 |
| Precio anual (equiv/mes) | — | $10 | $24 | $57 |
| Miembros de staff | 1 | 1 | Hasta 5 | Hasta 15 (+$5 c/u extra) |
| Servicios | 5 | Ilimitados | Ilimitados | Ilimitados |
| Reservas/mes | 30 | Ilimitadas | Ilimitadas | Ilimitadas |
| Booking page pública | ✅ | ✅ + dominio propio | ✅ | ✅ + white-label |
| Recordatorios email | ✅ | ✅ | ✅ | ✅ |
| Recordatorios WhatsApp/SMS | — | ✅ (pack básico) | ✅ | ✅ |
| Pagos online / anticipos | — | ✅ | ✅ | ✅ |
| Política de cancelación y cobro de no-show | — | — | ✅ | ✅ |
| Google Calendar sync (2 vías) | 1 vía | ✅ | ✅ | ✅ |
| Reportes y analytics | Básico | Básico | Avanzado | Avanzado + export |
| Multi-sucursal | — | — | — | ✅ |
| Roles y permisos | — | — | Básico | Granular |
| API / webhooks | — | — | — | ✅ |
| Soporte | Comunidad | Email | Email prioritario | Chat prioritario |

**Racional del pricing:** Starter a $12 compite agresivo contra Booksy ($30) y AgendaPro (~$25), y sigue siendo accesible para un barbero independiente en LATAM. Pro es el plan "objetivo" (donde quieres que aterrice la mayoría). Considera **precios regionales** (paridad de poder adquisitivo) vía Stripe: p.ej. LATAM -30/40% — Stripe lo soporta nativo con Adaptive Pricing o price lists por país.

### 2.3 Unit economics objetivo (para validar el modelo)

- CAC objetivo fase temprana: < USD 40 (contenido orgánico + Instagram + referidos)
- ARPU blended objetivo: ~USD 18/mes
- Churn mensual aceptable año 1: < 6% (SMBs churnean alto; recordatorios + pagos son el lock-in)
- LTV estimado: ARPU / churn ≈ USD 300 → LTV/CAC > 3 ✅
- Break-even personal: con costos de infra ~USD 150/mes, ~10 clientes Pro ya cubren costos.

---

## 3. Flujos de usuario

### 3.1 Actores

1. **Cliente final** — persona que reserva (no paga suscripción, no necesita cuenta obligatoria).
2. **Owner/Admin del negocio** — configura y paga la suscripción.
3. **Staff** — presta el servicio, ve su agenda, permisos limitados.
4. **Super Admin (tú)** — panel interno de la plataforma.

### 3.2 Flujo del cliente que agenda

**A. Reserva (happy path)**
1. Entra a la booking page (`getressy.com/{slug}` o dominio propio) — llega por link en Instagram bio, Google, QR en el local o WhatsApp.
2. Ve: branding del negocio, servicios (nombre, duración, precio), staff, reviews (futuro).
3. Selecciona **servicio → profesional (o "cualquiera") → fecha → hora** (slots calculados en tiempo real según disponibilidad, buffers y timezone del negocio; el cliente ve horas en la timezone del negocio con label claro).
4. Ingresa datos: nombre, email, teléfono. **Guest checkout por defecto** — crear cuenta es opcional (fricción mata conversión). Si ya reservó antes con ese email/teléfono, se le reconoce (magic link / OTP).
5. Si el negocio exige anticipo: paga (Stripe / Mercado Pago según país).
6. Confirmación: pantalla + email con archivo .ics ("agregar a calendario") + WhatsApp/SMS si está activo.

**B. Ciclo de vida de la reserva**
- Recordatorio automático T-24h y T-2h (canal según plan).
- **Reagendar/cancelar:** link con token seguro en el email/WhatsApp (sin login). Respeta la política del negocio (p.ej. "hasta 12h antes"). Fuera de ventana → mensaje con política y opción de contactar al negocio.
- Post-servicio: email de agradecimiento + solicitud de review (futuro) + botón "reservar de nuevo".
- No-show: el negocio lo marca; si hay tarjeta guardada y política activa, se cobra el fee configurado.

**C. Estados de una reserva**
`pending_payment → confirmed → (rescheduled) → completed | cancelled_by_client | cancelled_by_business | no_show`

### 3.3 Flujo del Owner/Admin

**A. Onboarding (crítico — objetivo: primera reserva posible en <10 minutos)**
1. Sign up (email + Google OAuth). Elige idioma ES/EN (default por browser).
2. Wizard: nombre del negocio → categoría → país/timezone/moneda → slug de la booking page.
3. Agrega 1-3 servicios (nombre, duración, precio, buffer).
4. Define horario de atención semanal + excepciones.
5. (Opcional) invita staff, conecta Google Calendar, configura pagos.
6. Pantalla final: link de su booking page + QR descargable + botón "compartir en Instagram/WhatsApp". **Este momento es el "aha moment"** — el negocio comparte su link el mismo día.

**B. Operación diaria**
- **Calendario** (vista día/semana, por staff): ver, crear manual (reservas por teléfono/walk-in), mover con drag & drop, bloquear horarios (almuerzo, vacaciones).
- **Notificación** de cada reserva nueva (push/email) .
- Marcar completada / no-show desde el detalle.
- **Clientes (mini-CRM):** historial, notas internas, tags, detección de no-showers recurrentes.

**C. Configuración**
- Servicios y categorías; asignación servicio↔staff.
- Staff: invitación por email, horarios individuales, permisos (ve solo su agenda vs todo).
- Políticas: ventana mínima de reserva, máxima anticipación, cancelación, anticipo (%, fijo o nada), fee de no-show.
- Pagos: conectar Stripe Connect / Mercado Pago.
- Booking page: logo, colores, portada, redes, idioma de cara al cliente (ES/EN/ambos).
- Suscripción: plan, método de pago, facturas (portal de Stripe Billing).

**D. Reportes**
- Reservas por período, ingresos, tasa de no-show, ocupación por staff, servicios top, clientes nuevos vs recurrentes, origen (link directo/QR/Instagram).

### 3.4 Flujo del Staff
- Login → ve **solo su agenda** (según permisos).
- Recibe notificación de reservas nuevas/cambios.
- Puede bloquear sus propios horarios y marcar completada/no-show (si el admin lo permite).

### 3.5 Super Admin (panel interno)
- Métricas: MRR, churn, signups, activación (negocios con ≥1 reserva), reservas totales.
- Gestión: buscar negocios, impersonar para soporte, suspender, aplicar cupones/extensiones de trial.
- Feature flags y monitoreo de jobs (recordatorios, webhooks de pago).

---

## 4. Arquitectura técnica (aprovechando tu stack)

### 4.1 Stack recomendado

| Capa | Tecnología | Nota |
|---|---|---|
| Frontend | **Next.js 15 + TypeScript + Tailwind + shadcn/ui** | App Router; ya lo dominas (barbaros-webapp) |
| i18n | **next-intl** | Rutas `/es` `/en`, mensajes en JSON, formateo de fechas/moneda por locale |
| Backend | Next.js API routes / server actions + **Node workers** para jobs | Monolito modular primero; no microservicios |
| DB | **PostgreSQL (Supabase)** | Ya lo usas; RLS para multi-tenancy |
| Auth | Supabase Auth (o Auth0 que ya conoces) | Magic link para clientes finales |
| Pagos | **Stripe** (mundo) + **Mercado Pago** (LATAM) detrás de una interfaz `PaymentProvider` | Stripe Billing para suscripciones; Stripe Connect para cobros de negocios |
| Jobs/colas | **Inngest** o Trigger.dev | Recordatorios T-24h/T-2h, retries, cron |
| Email | Resend + react-email | Templates bilingües |
| WhatsApp/SMS | Twilio (WhatsApp Business API) | Costo variable → por eso va en planes pagos |
| Hosting | Vercel + Supabase (+ Railway para workers si hace falta) | Ya conoces el combo |
| Analytics | PostHog | Funnels de conversión de booking page |

### 4.2 Decisiones críticas de diseño

**Multi-tenancy:** una sola DB, columna `business_id` en todo + RLS de Supabase. Modelo de datos núcleo:

```
businesses ─┬─ locations (fase Business)
            ├─ staff_members ── staff_schedules / schedule_overrides
            ├─ services ──── service_staff (N:M)
            ├─ customers (por negocio, mini-CRM)
            ├─ bookings ── booking_payments
            ├─ policies / settings
            └─ subscription (Stripe)
```

**Cálculo de disponibilidad (el corazón del producto):**
`slots = horario_staff ∩ horario_negocio − bookings_existentes − bloqueos − eventos_google_calendar`, discretizado por duración del servicio + buffers. Cachear por (staff, día) e invalidar al escribir.

**Concurrencia:** dos clientes no pueden tomar el mismo slot → constraint de exclusión en Postgres (`EXCLUDE USING gist` sobre rango de tiempo + staff) + transacción. Es la solución elegante y a prueba de race conditions.

**Timezones (crítico si es worldwide):** guardar TODO en UTC + `timezone` IANA por negocio. Renderizar siempre en la timezone del negocio. Nunca confiar en la del browser para disponibilidad. Cuidado con DST en horarios recurrentes (guardar horarios como hora local + tz, no como UTC).

**Multi-moneda:** el negocio define su moneda (CLP, USD, EUR, MXN...). Ressy no convierte — solo muestra y cobra en la moneda del negocio. Guardar montos en unidades menores (integer).

### 4.3 i18n — estrategia ES/EN

- **App del negocio (dashboard):** idioma por preferencia del usuario.
- **Booking page:** idioma configurable por el negocio (ES, EN o selector para ambos); detección por `Accept-Language` como default.
- **Emails/WhatsApp:** en el idioma del cliente final (capturado en la reserva), no del negocio.
- Todos los strings en archivos `messages/es.json` / `messages/en.json` desde el commit 1 — retrofit de i18n es dolorosísimo. Fechas con `Intl.DateTimeFormat`, monedas con `Intl.NumberFormat`.
- Contenido de marketing (landing, blog) también bilingüe con rutas `/es` `/en` para SEO en ambos idiomas.

---

## 5. Roadmap

### Fase 0 — Fundaciones (semanas 1-2)
- Repo, CI/CD, CLAUDE.md del proyecto, esquema de DB v1, auth, i18n scaffolding, design system sobre el branding existente.

### Fase 1 — MVP (semanas 3-8) → *beta privada con la waitlist*
- Onboarding wizard completo
- Servicios, horarios, staff (1 solo miembro está bien para MVP)
- Booking page pública + motor de disponibilidad + reserva guest
- Emails de confirmación/recordatorio + reagendar/cancelar con token
- Calendario del admin (ver, crear manual, bloquear)
- **Criterio de salida:** 10 negocios reales de la waitlist con reservas reales

### Fase 2 — Monetización (semanas 9-14) → *lanzamiento público*
- Stripe Billing: planes, trial de 14 días de Pro, downgrade a Free
- Pagos online / anticipos (Stripe Connect primero; Mercado Pago después)
- WhatsApp/SMS reminders
- Google Calendar sync 2 vías
- Reportes básicos, mini-CRM
- Landing pública ES/EN con pricing (reemplaza la waitlist)

### Fase 3 — Retención y escala (semanas 15-24)
- Políticas de no-show con cobro automático
- Multi-staff avanzado, permisos, multi-sucursal (plan Business)
- Reviews post-servicio, "reservar de nuevo", reportes avanzados
- App móvil ligera para el negocio (PWA primero; nativa después solo si hay tracción)

### Fase 4 — Red (mes 7+, condicionado a tracción)
- Directorio público por ciudad/categoría, SEO programático ("barberías en Providencia")
- Programa de referidos, API pública

---

## 6. Go-to-market

1. **Activar la waitlist existente** — email de "estamos construyendo, ¿quieres ser beta tester?" con call corto. Los primeros 10-20 negocios se consiguen a mano.
2. **Nicho de entrada:** elegir 1-2 verticales para el mensaje inicial (barberías/estética es el clásico: alta frecuencia, mucho no-show, presencia fuerte en Instagram — y ya tienes experiencia con barbaros-webapp). El producto es agnóstico, el marketing no debe serlo al inicio.
3. **Instagram (@get.ressy):** contenido bilingüe de "antes/después" (agenda en WhatsApp caótico → Ressy), demos de 30s, casos de beta testers.
4. **Loop viral incorporado:** cada booking page dice "Powered by Ressy" (removible solo en Business) — el mismo growth loop de Calendly.
5. **SEO programático** en Fase 4.
6. **Mercados iniciales:** Chile (lo conoces, red local, Mercado Pago/Webpay) + hispanos en USA (pagan en USD, mercado enorme, mal atendido en español).

---

## 7. KPIs a trackear desde el día 1

| Métrica | Definición | Meta 6 meses |
|---|---|---|
| Activación | % de signups con ≥1 reserva real en 7 días | > 40% |
| Time-to-first-booking | Tiempo signup → primera reserva | < 48h |
| Negocios activos | ≥5 reservas/mes | 100 |
| MRR | Ingreso recurrente | USD 1.500 |
| Conversión booking page | Visita → reserva completada | > 25% |
| No-show rate de la plataforma | Argumento de venta: "Ressy reduce tus no-shows X%" | dato propio |
| Churn mensual | Cancelaciones/base | < 6% |

---

## 8. Riesgos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| Mercado saturado (Calendly, Fresha, Booksy) | Nicho ES/EN + LATAM pricing + vertical de entrada; no competir de frente |
| Churn alto de SMBs | Lock-in por pagos + historial de clientes + recordatorios; plan anual con descuento |
| Costos de WhatsApp/SMS se comen el margen | Solo en planes pagos; límites mensuales por plan |
| Complejidad de timezones/DST | UTC + IANA desde el día 1; suite de tests dedicada al motor de disponibilidad |
| Ser solo dev con trabajo full-time | Scope brutal del MVP: sin marketplace, sin app nativa, sin multi-sucursal en v1. Claude Code multi-agente como multiplicador |

---

## 9. Próximos pasos inmediatos (esta semana)

1. Validar/ajustar este plan (¿SaaS-first ok? ¿verticales de entrada? ¿pricing?)
2. Email a la waitlist para medir pulso y reclutar 5 beta testers
3. Definir esquema de DB v1 y crear el repo con scaffolding (Next.js + next-intl + Supabase)
4. Escribir el CLAUDE.md del proyecto con estas decisiones para trabajar con agentes
5. Diseñar el flujo de booking page en Figma o directo en código (es LA pantalla del producto)
