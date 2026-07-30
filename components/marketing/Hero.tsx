import { useFormatter, useTranslations } from 'next-intl';
import { CalendarCheck, CheckCircle2, PlayCircle } from 'lucide-react';
import { Link } from '@/lib/i18n/navigation';
import { Button } from '@/components/ui/Button';

/**
 * Hero de la landing. Único `h1` de la página. A la derecha, la booking page
 * mostrándose a sí misma (`BookingPreview`) con la card flotante de "nueva
 * reserva" encima, como en el mockup.
 */
export function Hero() {
  const t = useTranslations('marketing.hero');

  return (
    <section className="container-page grid items-center gap-12 py-16 sm:py-20 lg:grid-cols-[1.05fr_1fr] lg:gap-14">
      <div>
        <span className="bg-accent-soft text-accent-hover mb-5 inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-sm font-semibold">
          <span className="bg-accent size-1.5 rounded-full" aria-hidden="true" />
          {t('pill')}
        </span>

        <h1 className="text-display text-ink text-balance">{t('title')}</h1>

        <p className="text-ink-secondary mt-5 max-w-xl text-lg leading-relaxed text-pretty">
          {t('subtitle')}
        </p>

        <div className="mt-8 flex flex-col gap-3.5 sm:flex-row sm:flex-wrap">
          <Button size="lg" asChild>
            <Link href="/onboarding">{t('cta')}</Link>
          </Button>
          <Button size="lg" variant="secondary" asChild>
            <a href="#how-it-works">
              <PlayCircle aria-hidden="true" />
              {t('secondaryCta')}
            </a>
          </Button>
        </div>

        <p className="text-ink-tertiary mt-4 flex items-center gap-2 text-sm">
          <CheckCircle2 className="text-success size-4 shrink-0" aria-hidden="true" />
          {t('micro')}
        </p>
      </div>

      <div className="relative">
        <BookingPreview />

        {/* Card flotante: se apoya en el borde del panel, así que necesita al
            contenedor `relative` de arriba como referencia de posición.
            En móvil va en el flujo, debajo: flotando tapaba el CTA de la card. */}
        <div className="border-border bg-surface shadow-card mt-4 flex items-center gap-3 rounded-2xl border p-4 sm:absolute sm:-bottom-5 sm:-left-5 sm:mt-0">
          <span className="text-success flex size-10 shrink-0 items-center justify-center rounded-full bg-[rgba(0,138,5,0.12)]">
            <CalendarCheck className="size-5" aria-hidden="true" />
          </span>
          <span>
            <span className="text-ink block text-sm font-bold">{t('cardTitle')}</span>
            <span className="text-ink-secondary block text-xs">{t('cardSub')}</span>
          </span>
        </div>
      </div>
    </section>
  );
}

/**
 * Vista previa de la booking page: el producto mostrándose a sí mismo.
 *
 * Se renderiza con HTML y los tokens de Ressy en vez de ser una imagen, porque
 * así queda nítida en cualquier densidad de pantalla, se adapta al ancho sin
 * recortes, hereda los tokens si cambia el acento, y no suma peso de descarga
 * al LCP del hero.
 *
 * Es DECORATIVA: `aria-hidden` + un texto alternativo para lectores de
 * pantalla. Un lector no debería tener que recorrer horarios falsos, y estas
 * horas no son datos reales ni ofrecen nada reservable.
 */
function BookingPreview() {
  const t = useTranslations('marketing.hero');
  const format = useFormatter();

  // Fecha de muestra fija (no `new Date()`): con una fecha viva, servidor y
  // cliente pueden renderizar días distintos y React tira un error de
  // hidratación. Se formatea con Intl, así el EN no hereda el "jue, 30 jul".
  //
  // Se fuerza `timeZone: 'UTC'` al formatear: sin eso la medianoche UTC se
  // renderiza como el día ANTERIOR en cualquier tz con offset negativo (que es
  // toda LATAM), y la card mostraría un día distinto según quién la mire.
  const sampleDate = new Date(Date.UTC(2026, 6, 30));

  // El slot elegido y el agotado están fijos: cuentan la historia de un solo
  // vistazo (hay horarios, uno ya se tomó, y reservar es un clic).
  const slots = [
    { time: '10:00', state: 'free' },
    { time: '11:30', state: 'selected' },
    { time: '13:00', state: 'free' },
    { time: '15:00', state: 'free' },
    { time: '16:30', state: 'free' },
    { time: '18:00', state: 'taken' },
  ] as const;

  return (
    <>
      <span className="sr-only">{t('imageAlt')}</span>

      {/* El 4/3 solo desde `sm`: en móvil esa proporción deja el panel más bajo
          que la card de adentro y la card se sale por abajo. Ahí crece con su
          contenido. */}
      <div
        aria-hidden="true"
        className="bg-accent relative overflow-hidden rounded-3xl px-6 py-8 sm:aspect-[4/3] sm:p-8"
      >
        {/* Círculos suaves del mockup: profundidad sin gradientes (CLAUDE.md §5). */}
        <span className="absolute -top-16 -right-10 size-56 rounded-full bg-white/[0.07]" />
        <span className="absolute -bottom-24 -left-16 size-64 rounded-full bg-white/[0.05]" />

        <div className="relative flex size-full items-center justify-center">
          <div className="bg-surface w-full max-w-[300px] rounded-2xl p-5 shadow-[0_8px_30px_rgba(0,0,0,0.12)]">
            <div className="flex items-center gap-2.5">
              <span className="bg-accent flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-extrabold text-white">
                re
              </span>
              <span className="text-ink truncate text-[15px] font-bold">{t('demoBusiness')}</span>
            </div>

            <p className="text-ink-secondary mt-4 text-xs">
              {t('demoPickTime')} ·{' '}
              {format.dateTime(sampleDate, {
                weekday: 'short',
                day: 'numeric',
                month: 'short',
                timeZone: 'UTC',
              })}
            </p>

            <div className="mt-2.5 grid grid-cols-3 gap-2">
              {slots.map((slot) => (
                <span
                  key={slot.time}
                  className={
                    slot.state === 'selected'
                      ? 'bg-accent rounded-input py-2 text-center text-[13px] font-semibold text-white'
                      : slot.state === 'taken'
                        ? 'border-border text-ink-tertiary rounded-input border py-2 text-center text-[13px] line-through'
                        : 'border-border text-ink rounded-input border py-2 text-center text-[13px] font-medium'
                  }
                >
                  {slot.time}
                </span>
              ))}
            </div>

            <span className="bg-accent rounded-button mt-4 block py-2.5 text-center text-[13px] font-semibold text-white">
              {t('demoBook')}
            </span>
          </div>
        </div>
      </div>
    </>
  );
}
