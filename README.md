# Ressy

Plataforma SaaS de reservas para negocios de servicios. Worldwide, bilingüe ES/EN.

La fuente de verdad del proyecto es [`CLAUDE.md`](./CLAUDE.md): stack, arquitectura,
design tokens y convenciones. Este README solo cubre cómo levantar el repo.

## Requisitos

- Node 20+
- pnpm 10+ (`npm i -g pnpm`)

## Arrancar

```bash
pnpm install
cp .env.example .env.local   # rellena las vars de Supabase
pnpm dev
```

Abre http://localhost:3000 — redirige a `/es` o `/en` según tu `Accept-Language`.

> Las vars de Supabase todavía no son necesarias: ninguna pantalla consulta la DB
> en este corte. El cliente falla explícitamente si faltan cuando se use.

### Scripts

| Comando          | Qué hace                    |
| ---------------- | --------------------------- |
| `pnpm dev`       | Dev server (Turbopack)      |
| `pnpm build`     | Build de producción         |
| `pnpm lint`      | ESLint                      |
| `pnpm typecheck` | `tsc --noEmit`              |
| `pnpm format`    | Prettier sobre todo el repo |

## Rutas

| Ruta                                | Qué es                                                 |
| ----------------------------------- | ------------------------------------------------------ |
| `/es` · `/en`                       | Landing placeholder                                    |
| `/es/styleguide` · `/en/styleguide` | **Los primitivos con los tokens Ressy**                |
| `/es/dashboard` · `/en/dashboard`   | Shell del dashboard (sin auth)                         |
| `/es/{slug}`                        | Booking page placeholder (ej. `/es/barberia-el-corte`) |

## Dónde viven los tokens

Todo el design system está en **[`app/globals.css`](./app/globals.css)**, en un solo
bloque `@theme`. Los nombres coinciden 1:1 con la tabla del `CLAUDE.md` §5, así que
Tailwind v4 genera la variable CSS _y_ la utilidad a la vez:

```
--color-accent: #348d83   →   var(--color-accent) · bg-accent · text-accent
--radius-card: 16px       →   rounded-card
--shadow-card: ...        →   shadow-card
```

No hay `tailwind.config.ts`: Tailwind v4 es CSS-first y el theme se declara ahí.
La fuente (Plus Jakarta Sans) la carga `next/font` en
[`app/[locale]/layout.tsx`](./app/[locale]/layout.tsx) y se conecta al theme vía
`--font-sans`.

### Dos trampas conocidas con shadcn/ui

1. **`accent` significa cosas distintas.** Para shadcn, `accent` es el gris de hover
   de menús; para nosotros es el teal de marca. En `globals.css` gana el nuestro y
   shadcn recibe el teal a través de `--color-primary`. **Si agregas un componente
   con el CLI y usa `hover:bg-accent` para un hover de fondo, cámbialo a
   `hover:bg-muted`** o te saldrá un fondo teal sólido.
2. **Nombres de archivo.** El CLI de shadcn genera `button.tsx` en minúscula; el
   `CLAUDE.md` §6 pide `PascalCase.tsx`. Renombra tras generar.

## Estructura

```
app/[locale]/
  (marketing)/        landing
  (booking)/[slug]/   booking page pública
  (dashboard)/        app del negocio
  styleguide/         referencia visual del design system
components/ui/        primitivos (Button, Input, Card, Badge)
lib/i18n/             routing, request, navigation de next-intl
lib/db/               cliente de Supabase (browser + server)
messages/             es.json · en.json
design-reference/     mockups de Claude Design
```

### Ojo: slugs reservados

La booking page vive en `/[locale]/[slug]`, hermana de `/styleguide` y `/dashboard`.
Next resuelve los segmentos estáticos primero, así que funciona — pero significa que
ningún negocio puede tener el slug `dashboard`, `styleguide` ni ninguna ruta que
agreguemos a ese nivel. **Hay que validar contra una lista de slugs reservados**
cuando se implemente el onboarding.

## Todavía no existe (por diseño)

Este corte es solo scaffolding. Pendiente, en orden de roadmap (`CLAUDE.md` §7):

- Esquema de DB, RLS y multi-tenancy por `business_id`
- Motor de disponibilidad + el constraint `EXCLUDE USING gist` de concurrencia
- Interfaz `PaymentProvider` (Stripe / Mercado Pago)
- Máquina de estados de reserva
- Auth real (Supabase Auth) y protección de rutas del dashboard
- Tests (Vitest para disponibilidad y timezones, Playwright para el flujo de reserva)
