# Ressy — Design Brief para Claude Design
**Dirección de arte: "Airbnb clean" · Bilingüe ES/EN · Mobile-first**

> Cómo usar este documento: pégalo completo como primer mensaje en Claude Design junto con el logo de Ressy (PNG) y, si quieres, el master plan. Luego trabaja por sesiones en el orden de la sección 6.

---

## 1. Contexto del producto (para que el diseño no salga genérico)

Ressy es una plataforma SaaS de reservas para negocios de servicios de todo tipo (barberías, clínicas, spas, entrenadores, abogados...). Dos audiencias, dos superficies:

- **Booking page pública**: la ve el cliente final que reserva desde su teléfono (llega por Instagram/WhatsApp/QR). Debe sentirse como reservar un Airbnb: confiable, bonito, cero fricción, guest checkout.
- **Dashboard del negocio**: la usa el dueño/staff a diario. Debe sentirse liviana y clara, no como un ERP.

Mercado worldwide, ES/EN desde el día uno. Todo diseño debe soportar ambos idiomas (el español es ~20-30% más largo: nada de layouts que se rompan con textos largos).

---

## 2. Dirección de arte — "Airbnb clean"

Principios no negociables:

1. **Blanco generoso.** Fondo `#FFFFFF`, secciones alternas en gris cálido muy sutil. El espacio en blanco ES el diseño. Densidad baja, padding generoso.
2. **Un solo color de acento, usado con disciplina.** Solo en CTAs primarios, estados activos y highlights. Todo lo demás es escala de grises cálidos.
3. **Tipografía grande, friendly y confiada.** Headlines grandes con tracking apretado, cuerpo legible y relajado. Jerarquía por tamaño y peso, no por color.
4. **Cards como unidad base.** Bordes `1px` gris muy claro O sombra suave difusa — nunca ambos fuertes. Radios generosos.
5. **Fotografía real y cálida** (personas recibiendo servicios: corte de pelo, masaje, consulta) con tratamiento consistente. Nada de ilustraciones 3D genéricas ni stock corporativo frío.
6. **Botones pill o casi-pill**, CTAs primarios sólidos en acento, secundarios outline gris.
7. **Micro-detalles**: transiciones suaves (150-200ms), hover que eleva sutilmente las cards, skeletons en vez de spinners.
8. **Nada de**: gradientes estridentes, glassmorphism, dark mode en v1, más de 2 pesos tipográficos por pantalla, iconos rellenos.

---

## 3. Design tokens

### Color
*(Nota: ajustar el acento al color primario exacto del logo de Ressy adjunto; los valores de abajo son la propuesta base si el logo lo permite.)*

| Token | Valor | Uso |
|---|---|---|
| `--color-accent` | tomar del logo Ressy | CTAs, links, estados activos, focus rings |
| `--color-accent-hover` | acento -8% luminosidad | Hover de CTAs |
| `--color-accent-soft` | acento al 8% opacidad | Fondos de badges, slots seleccionados |
| `--color-ink` | `#222222` | Texto principal (estilo Airbnb: casi negro, nunca #000) |
| `--color-ink-secondary` | `#6A6A6A` | Texto secundario |
| `--color-ink-tertiary` | `#B0B0B0` | Placeholders, metadatos |
| `--color-border` | `#EBEBEB` | Bordes de cards e inputs |
| `--color-surface` | `#FFFFFF` | Fondo base |
| `--color-surface-alt` | `#F7F7F7` | Secciones alternas, fondo del dashboard |
| `--color-success` | `#008A05` | Confirmaciones, "disponible" |
| `--color-warning` | `#C13515` | Errores, "no disponible", cancelaciones (rojo cálido tipo Airbnb, no #FF0000) |

### Tipografía
- **Familia:** `Figtree` o `Plus Jakarta Sans` (Google Fonts, vibe muy cercana a Airbnb Cereal). Una sola familia para todo.
- Display / hero: 48-64px, weight 700, tracking -2%
- H2 sección: 32-40px, weight 600
- H3 / card title: 20-22px, weight 600
- Body: 16px, weight 400, line-height 1.6
- Small / meta: 14px, weight 400, `--color-ink-secondary`
- Botones: 16px, weight 600

### Forma y espacio
- Radios: cards `16px` · inputs `12px` · botones `9999px` (pill) · modales `24px`
- Sombra card: `0 1px 2px rgba(0,0,0,.06), 0 6px 20px rgba(0,0,0,.06)` (solo en hover/elevación; en reposo, borde)
- Spacing en escala de 8: 8/16/24/32/48/64/96
- Container: max-width `1120px`, padding lateral 24px mobile
- Iconos: Lucide, stroke 1.5px, 20px, color `--color-ink-secondary`

---

## 4. Componentes core a definir en la primera sesión

Botón (primary/secondary/ghost, 3 tamaños, loading state) · Input + label flotante · Select · Card de servicio · Card de profesional (avatar + nombre + rol) · **Chip de slot de hora** (default / hover / seleccionado / no disponible) · Calendario de fechas (mes compacto, días deshabilitados) · Badge de estado de reserva (confirmada/pendiente/cancelada/no-show) · Navbar público · Sidebar del dashboard · Modal / bottom-sheet mobile · Toast · Empty states con ilustración mínima · Skeleton loaders · Toggle ES/EN · Stepper de wizard

---

## 5. Inventario de pantallas (con estados)

### A. Landing page (marketing, ES/EN)
Secciones en orden — copy completo en la sección 7:
1. **Navbar**: logo, Features, Pricing, toggle ES/EN, "Iniciar sesión", CTA "Empieza gratis"
2. **Hero**: headline grande + subhead + CTA + mockup del producto (booking page en un iPhone flotando sobre el calendario del dashboard en desktop). Fondo blanco, sin gradientes.
3. **Barra de confianza**: "Pensado para" + iconos de verticales (barbería, spa, clínica, fitness, legal, tattoo)
4. **Dolor → solución**: split 2 columnas, "antes" (captura caótica de WhatsApp) vs "después" (agenda Ressy limpia)
5. **Cómo funciona en 3 pasos** (cards horizontales)
6. **Features** (grid 2×3): recordatorios WhatsApp, pagos y anticipos, booking page propia, calendario del equipo, mini-CRM, reportes
7. **Pricing**: 4 cards de tiers, Pro destacado con badge "Más popular", toggle mensual/anual
8. **Testimonios / beta** (placeholder para 3 quotes)
9. **FAQ** (acordeón, 6 preguntas)
10. **CTA final** full-width + footer con selector de idioma

Estados: versión ES y EN, mobile y desktop.

### B. Booking page pública (LA pantalla — mobile-first)
Flujo en pasos con stepper superior sutil:
1. **Perfil del negocio**: portada foto, logo, nombre, dirección, redes, lista de servicios como cards (nombre, duración, precio, botón "Reservar")
2. **Selección de profesional**: cards con avatar + opción "Cualquier profesional"
3. **Fecha y hora**: calendario compacto arriba, grid de chips de horas abajo. Estados: disponible / seleccionado / agotado. Label de timezone visible ("Horario de Santiago, GMT-3")
4. **Datos del cliente**: nombre, email, teléfono, nota opcional. Sin registro. Si aplica anticipo: resumen de pago embebido
5. **Confirmación**: check animado sutil, resumen de la reserva en card, botones "Agregar a calendario" y "Reagendar/cancelar"
Extras: pantalla de reagendar/cancelar (desde link tokenizado) · estado "negocio sin horas disponibles esta semana"
Footer discreto: "Powered by Ressy".

### C. Onboarding wizard del negocio (5 pasos)
1. Datos del negocio (nombre, categoría, país/timezone/moneda) → 2. Servicios (repeater: nombre, duración, precio) → 3. Horario semanal (grid días × rangos, copiar lunes a todos) → 4. Booking page (slug con preview en vivo `getressy.com/tu-negocio`, logo, color) → 5. **Pantalla "listo"**: QR grande + link para copiar + botones compartir Instagram/WhatsApp. Esta pantalla debe sentirse como un logro (momento aha).

### D. Dashboard — calendario (pantalla diaria del negocio)
- Vista semana/día, columnas por profesional, hoy destacado
- Bloques de reserva con color por estado, drag & drop
- Panel lateral (desktop) / bottom-sheet (mobile) con detalle de reserva: cliente, servicio, historial, acciones (completar, no-show, reagendar, cancelar)
- Botón "+ Reserva manual" y "Bloquear horario"
- Empty state del primer día: "Comparte tu link para recibir tu primera reserva" + QR

### E. Dashboard — resto (wireframe de alta fidelidad, menos prioridad)
Home con métricas del día · Clientes (tabla + ficha) · Servicios · Equipo · Configuración (tabs: negocio, políticas, pagos, booking page, plan) · Reportes · Pantalla de upgrade de plan (reutiliza cards de pricing)

---

## 6. Plan de sesiones en Claude Design (en orden)

1. **Sesión 1 — Design system**: pega secciones 2-4 + logo. Pide una hoja de componentes con todos los estados.
2. **Sesión 2 — Landing ES**: secciones 5A + 7. Luego pide la variante EN sobre el mismo layout.
3. **Sesión 3 — Booking page** (mobile primero, luego desktop).
4. **Sesión 4 — Onboarding wizard**.
5. **Sesión 5 — Calendario del dashboard**.
6. **Sesión 6 — Pantallas secundarias del dashboard**.

Regla por sesión: pedir SIEMPRE "usa los tokens del design system de la sesión 1" y revisar cada pantalla en 390px y 1440px.

---

## 7. Copy bilingüe de la landing (listo para usar)

### Hero
- **ES — Headline:** "Tu agenda llena. Tus no-shows en cero."
  - Alternativa: "Reservas 24/7 para tu negocio, sin llamadas ni WhatsApp."
- **EN — Headline:** "A full calendar. Zero no-shows."
  - Alternativa: "24/7 bookings for your business — no calls, no chaos."
- **ES — Subhead:** "Ressy le da a tu negocio una página de reservas propia, recordatorios automáticos por WhatsApp y cobro de anticipos. Configúralo en 10 minutos, gratis."
- **EN — Subhead:** "Ressy gives your business its own booking page, automatic WhatsApp reminders, and upfront payments. Set up in 10 minutes, free."
- **CTA primario:** ES "Empieza gratis" / EN "Start for free" · **Secundario:** ES "Ver demo" / EN "See it in action"
- Microcopy bajo CTA: ES "Sin tarjeta de crédito · Plan gratis para siempre" / EN "No credit card · Free plan forever"

### Cómo funciona (3 pasos)
1. ES "Crea tu página" — "Servicios, horarios y tu marca. Listo en minutos." / EN "Create your page" — "Your services, hours, and brand. Ready in minutes."
2. ES "Comparte tu link" — "En Instagram, WhatsApp o con un QR en tu local." / EN "Share your link" — "On Instagram, WhatsApp, or a QR at your counter."
3. ES "Recibe reservas" — "Confirmaciones y recordatorios automáticos. Tú solo atiende." / EN "Get booked" — "Automatic confirmations and reminders. You just show up."

### Features (título + una línea)
| ES | EN |
|---|---|
| **Recordatorios que sí funcionan** — WhatsApp y email antes de cada cita. Adiós no-shows. | **Reminders that actually work** — WhatsApp and email before every appointment. Goodbye no-shows. |
| **Cobra anticipos** — Asegura cada reserva con un pago por adelantado. | **Take deposits** — Secure every booking with an upfront payment. |
| **Tu página, tu marca** — Un link propio con tus colores y tu logo. | **Your page, your brand** — Your own link, your colors, your logo. |
| **Agenda de todo tu equipo** — Cada profesional con su horario, todo en un calendario. | **Your whole team's schedule** — Every pro, every shift, one calendar. |
| **Conoce a tus clientes** — Historial, notas y quién falta a las citas. | **Know your clients** — History, notes, and who keeps missing appointments. |
| **Números claros** — Ingresos, ocupación y servicios top de un vistazo. | **Clear numbers** — Revenue, occupancy, and top services at a glance. |

### Pricing (headers de cards)
- Free — ES "Para partir" / EN "To get started"
- Starter $12 — ES "Para independientes" / EN "For solo pros"
- Pro $29 (Más popular / Most popular) — ES "Para equipos pequeños" / EN "For small teams"
- Business $69 — ES "Para crecer en serio" / EN "For serious growth"
- Toggle: ES "Mensual / Anual (2 meses gratis)" / EN "Monthly / Yearly (2 months free)"

### FAQ (preguntas; respuestas cortas de 2-3 líneas)
1. ES "¿Mis clientes necesitan crear una cuenta?" / EN "Do my clients need an account?" → No, reservan como invitados.
2. ES "¿Puedo cobrar anticipos?" / EN "Can I charge deposits?" → Sí, con Stripe o Mercado Pago según tu país.
3. ES "¿Funciona en mi país?" / EN "Does it work in my country?" → Sí: cualquier zona horaria y moneda.
4. ES "¿Puedo cambiar de plan cuando quiera?" / EN "Can I change plans anytime?" → Sí, upgrade o downgrade sin permanencia.
5. ES "¿Qué pasa si me paso del plan Free?" / EN "What if I outgrow the Free plan?" → Te avisamos antes; nunca perdemos tus reservas.
6. ES "¿Sincroniza con Google Calendar?" / EN "Does it sync with Google Calendar?" → Sí, en dos direcciones.

### CTA final
- ES: "Tu próxima reserva podría llegar hoy. Crea tu página gratis en 10 minutos."
- EN: "Your next booking could come in today. Create your free page in 10 minutes."
