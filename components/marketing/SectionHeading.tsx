import { cn } from '@/lib/utils';

/**
 * Encabezado centrado de sección: eyebrow en acento + h2. Reutilizado por casi
 * todas las bandas de la landing para mantener el mismo ritmo vertical.
 */
export function SectionHeading({
  eyebrow,
  title,
  className,
}: {
  eyebrow: string;
  title: string;
  className?: string;
}) {
  return (
    <div className={cn('mx-auto max-w-2xl text-center', className)}>
      <p className="text-accent text-xs font-bold tracking-[0.1em] uppercase">{eyebrow}</p>
      <h2 className="text-h2 text-ink mt-2.5 text-balance">{title}</h2>
    </div>
  );
}
