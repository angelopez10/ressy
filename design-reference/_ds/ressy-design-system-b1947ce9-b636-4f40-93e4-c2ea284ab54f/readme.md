# Ressy Design System

> **Dirección vigente (brief Jul 2026): "Airbnb clean"** — ver `uploads/ressy-design-brief.md` y la sección *Art direction* abajo. Para pantallas NUEVAS usa los tokens `--color-*` / `--radius-*` / `--space-*` / `--type-*` de `tokens/brief.css`; los `--colors-*` de fig-tokens son el extracto crudo del Figma original y alimentan los componentes materializados.

Ressy is a booking/scheduling app: small service businesses (barbershops, salons, freelancers) manage appointments, and their clients book in a few taps. The kit covers two surfaces:

1. **Mobile app** — a Spanish-language iOS app: home dashboard (today's appointments, occupancy/revenue stats), and a "Quick reserve" flow (pick a service → pick date/time → contact details → confirmation).
2. **Marketing site** — an English-language "coming soon" waitlist landing page.

**Source:** a Figma file ("ressy.fig", pages: Sketches, Design-system, Screens) mounted read-only for this build, plus the design brief `uploads/ressy-design-brief.md` (art direction, tokens, screen inventory, bilingual landing copy). No GitHub repo or codebase was attached.

## Index

- `styles.css` — root stylesheet, imports every token file below. Link this from anything using the system.
- `tokens/` — `fig-tokens.css` (raw Figma variables), `brief.css` (**capa "Airbnb clean" del brief — usar para trabajo nuevo**), `colors.css` (aliases semánticos del extracto), `typography.css` (fuentes + escala del Figma), `effects.css` (sombras).
- `components/core/` — 26 React primitives extracted from the kit (list below) + `fig-tokens.css` / `fig-assets.css`.
- `components/flow/` — 20 flow-diagram symbols (nodes + connectors) from the file's user-flow pages.
- `assets/icons/` — 99-icon set (`icon-data.js` + `Icon.jsx` wrapper).
- `assets/logo/` — the Ressy logomark (only mark defined in the file).
- `guidelines/` — foundation specimen cards (colors, type, spacing, radius, stroke, elevation, brand).
- `ui_kits/mobile-app/` — click-through iOS app prototype (Dashboard + Quick Reserve flow).
- `ui_kits/marketing-site/` — the lead-capture landing page.

## Components (26 + Icon wrapper)

Button, Input, Toggle, Dropdown, DatePicker, Caledar (calendar week strip — "Caledar" is the exact spelling used in the source file), TimePicker, Service, ServicePicker, SummaryCard, Navbar, Modal, Component1 (calendar day-of-month cell), AlphabeticKeyboard, EmojiKeyboard, NumericKeyboard (Ressy's custom in-app keyboards), FaCalendar, FaGear, FaHouse, FaLayerGroup (bottom-nav glyphs), NuevaReservaCard, ProximaCitaCard, ReservasActivasCard, UsuarioProximaCitaCard (dashboard cards), VuesaxLinearArrowDown, IconSet / `Icon` (99-icon set wrapper).

This is the complete set of the 15 named component families in the Figma file's variable/component inventory, plus the standalone dashboard-card symbols and Fa-icon glyphs actually used on the Dashboard screen.

### Flow-diagram symbols (`components/flow/`)
The file's remaining standalone symbols are connector/box primitives from its internal user-flow diagrams (the "Flow" / "Process flow chart" pages), built as their own group: Base, Bypass, Check, Choice, CircleSmall, Corner, CurvedStart, CurvedMiddle, CurvedEnd, EndArrow, EndCircle, FlowTurnOffset, Hook, Label, Option, Page, Point, Quote, Section, Straight. Use them for wireflow/sitemap diagrams in the Ressy style — they are not product UI components.

### Intentional additions
None — `Icon` is a thin wrapper around the materialized `IconSet` so icons can be referenced by name (`<Icon name="IconSetIconSetHome"/>`).

## Art direction — "Airbnb clean" (brief Jul 2026)

El brief redefine la dirección para todo trabajo nuevo (landing, booking page pública, onboarding, dashboard). Reglas no negociables:

- **Blanco generoso**: fondo `#FFFFFF`, secciones alternas `#F7F7F7` (`--color-surface-alt`). Densidad baja, padding generoso.
- **Un solo acento con disciplina**: `--color-accent` — solo CTAs primarios, estados activos, focus rings. Todo lo demás en tintas cálidas (`--color-ink #222`, nunca `#000`; secundaria `#6A6A6A`; terciaria `#B0B0B0`). *Nota: el logo del kit es monocromo, así que el acento hereda el amarillo del kit (`#ffb502`) — con texto ink encima, nunca texto blanco. Confirmar contra el logo PNG final.*
- **Tipografía**: una sola familia — **Plus Jakarta Sans** (ya en el kit; el brief también acepta Figtree). Display 48–64/700/tracking -2%, H2 32–40/600, H3 20–22/600, body 16/400/1.6, small 14, botones 16/600. Máx. 2 pesos por pantalla.
- **Cards**: borde `1px #EBEBEB` en reposo O sombra suave (`--shadow-card-elevated`) al elevar — nunca ambos fuertes. Radios: cards 16, inputs 12, botones pill (9999), modales 24.
- **Botones**: pill; primario sólido acento, secundario outline gris.
- **Espaciado**: escala de 8 (8/16/24/32/48/64/96); container 1120px, padding lateral 24px móvil.
- **Iconos**: Lucide, stroke 1.5px, 20px, color ink-secondary (CDN) — para superficies nuevas; el icon set del Figma queda para el app kit heredado.
- **Fotografía real y cálida** (personas recibiendo servicios); nada de 3D genérico ni stock frío. Pedir material real — no generar.
- **Micro-detalles**: transiciones 150–200ms, hover eleva cards sutilmente, skeletons en vez de spinners.
- **Prohibido**: gradientes estridentes, glassmorphism, dark mode en v1, iconos rellenos.
- **Bilingüe ES/EN desde el día uno**: el español es ~20–30% más largo — ningún layout puede romperse con textos largos. Copy completo de la landing (hero, features, pricing, FAQ) listo en la sección 7 del brief.

## Content fundamentals

- **Product voice (mobile app, Spanish):** warm and informal — "**Hola Franco :)**" greets the user by first name with a smiley, not a formal salutation. Labels are plain, task-first ("Elige un servicio", "Datos de Contacto", "Completa tus datos para confirmar"). No emoji inside the app itself.
- **Marketing voice (landing page, English):** bigger, more energetic — the hero headline is set in bold uppercase display type ("ONE CLICK, ZERO STRESS—BOOKING HAS NEVER BEEN EASIER."), a mix of short punchy claims and one longer explainer sentence. It uses exactly one emoji, 🚀, at the end of the sub-headline ("Ressy is coming soon!🚀") — the only emoji found anywhere in the kit.
- **Casing:** product UI is sentence case; the marketing hero headline is the one deliberate all-caps moment reserved for the single biggest claim on a page.
- **Person:** direct address ("Ingresa tu Correo aqui", "Te notificaremos sobre tus citas al correo que escribas aqui") — instructive "tu/tus", not distant third person.
- **Numbers as proof, not decoration:** dashboard stats ("600" clientes, "80%" ocupación) are large and literal — no invented copy needed around them.

## Visual foundations

- **Color:** the interface itself runs almost entirely on a neutral ink/white/gray scale (`--colors-neutral-*`) — buttons are near-black (`rgb(28,28,28)`), text is black or mid-gray. A single **yellow accent** (`rgb(255,181,2)`) marks the one primary marketing CTA (the waitlist submit button). Beyond that, Ressy carries a **6-hue category palette** (blue, green, red, yellow, electric green, purple — each with 5 shades) used for tagging services/calendar entries, not as a brand identity — treat it as a data/category system, never as "the brand color."
- **Type:** Roboto is the workhorse for everything product-facing — body text, buttons, inputs, and (at 900-weight, uppercase) the huge marketing display headline. Plus Jakarta Sans (SemiBold, uppercase, tracked) appears only as small "eyebrow" section labels inside the spec pages. Inter shows up in dense internal captions. One legacy component (a toggle label) references Proxima Nova at 700 weight — substituted with **Poppins** (closest geometric-sans match on Google Fonts); flagged below.
- **Spacing/radius/stroke:** tight, deliberate non-4px-grid values straight from the file — spacing steps 4/8/12/16/20/24/32/40/48/56; radius 2/4/6/8/10/12/16/full; stroke 1/2/4/6px. Buttons use a small 5–6px radius; cards use a much rounder 20–24px radius — the two don't share a scale.
- **Surfaces & cards:** two card styles only — a **flat card** (white fill, 1px dark hairline border, no shadow) used in spec/documentation pages, and a **soft elevated card** (`0px 3px 50px rgba(0,0,0,0.07)`, 20–24px radius, no border) used for real product surfaces (summary card, stat tiles). No gradients, no glassmorphism, no colored left-border cards.
- **Backgrounds:** flat solid fills only — light gray (`#ededed`/`#f2f2f2`) app/marketing backgrounds, near-black spec-page backgrounds. No photography, no illustration, no texture/grain, no full-bleed imagery anywhere in the kit.
- **Buttons & states:** filled rectangular/rounded buttons in three sizes; disabled state simply swaps to light gray (`rgb(219,219,219)`) fill — no opacity fade. No separate hover/press treatment is defined in the source; use a small (~8%) darken on hover and a 2%-scale-down on press as a safe default.
- **Toggle:** a pill switch, off = gray track, on = green outline+knob (`rgb(67,208,98)`) — no fill flood, just a stroke ring.
- **Motion:** the file defines no transition/easing specs — no animation reference exists. Treat this as a static, no-frills interface: simple, immediate state changes, no bounce/fade choreography implied.
- **Corner radii:** small (2–6px) on functional controls (buttons, inputs, day cells), large (12–24px) on content cards and containers — a two-tier system, not a single global radius.
- **Elevation:** exactly two levels — flat/bordered and one soft shadow. No multi-level elevation system.

## Iconography

A single custom **99-icon set** ("Icon Set" component family) — simple two-tone line/fill glyphs (home, calendar, settings, search, person, mail, etc.), extracted whole into `assets/icons/icon-data.js` + `Icon.jsx` (`<Icon name="IconSetIconSetHome" size={24}/>`). A few "Fa"-prefixed icons (FaCalendar, FaGear, FaHouse, FaLayerGroup) are separate one-off glyphs used specifically in the dashboard's bottom nav. No icon font, no emoji-as-icon usage, no unicode-glyph icons. The one emoji in the whole kit (🚀) is copy, not iconography.

## Brand mark

The file defines exactly one mark: an abstract "R" formed from two overlapping vector paths (copied verbatim to `assets/logo/ressy-logomark.svg`). There is no lockup variant, no favicon, no app icon in the source — the wordmark "ressy" is set in type (Plus Jakarta Sans ExtraBold) everywhere a lockup is needed.

## Fonts — substitution flag

Inter, Roboto, and Plus Jakarta Sans load from Google Fonts (`tokens/typography.css`) — exact family match, no substitution needed. **Proxima Nova** (used once, a toggle label) has no font file in the kit and isn't on Google Fonts — substituted with **Poppins**. If you have Proxima Nova's real files, drop them in `assets/fonts/` and swap the `@font-face`/import in `tokens/typography.css`.
