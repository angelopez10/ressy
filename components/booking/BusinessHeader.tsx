'use client';

import { Clock, MapPin } from 'lucide-react';
import type { BookingBusinessDTO } from '@/lib/booking/types';
import { cn } from '@/lib/utils';

/**
 * Portada del negocio: cover con el acento, tile de logo, nombre y categoría.
 * Se reusa en el paso 1 en móvil (arriba de los servicios) y en el rail lateral
 * del desktop. `compact` reduce la altura del cover para el rail.
 */
export function BusinessHeader({
  business,
  compact = false,
  className,
}: {
  business: BookingBusinessDTO;
  compact?: boolean;
  className?: string;
}) {
  const accent = business.accentColor ?? '#348D83';

  return (
    <div className={className}>
      <div
        className={cn('relative', compact ? 'h-20' : 'h-32')}
        style={{ background: `linear-gradient(135deg, ${accent}, #2c7970)` }}
      />
      <div className="relative -mt-12 px-5">
        <div className="bg-surface shadow-card flex size-20 items-center justify-center overflow-hidden rounded-[20px] border-[3px] border-white">
          {business.logoUrl ? (
            // Logo remoto arbitrario (Supabase storage / URL del negocio); <img>
            // evita configurar remotePatterns de next/image para cada host.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={business.logoUrl} alt={business.name} className="size-full object-cover" />
          ) : (
            <span className="bg-ink flex size-full items-center justify-center text-2xl font-extrabold text-white">
              {business.name.charAt(0)}
            </span>
          )}
        </div>

        <h1 className="text-ink mt-3 text-2xl font-bold tracking-tight">{business.name}</h1>
        <div className="mt-2 flex flex-col gap-1.5">
          {business.category && (
            <p className="text-ink-secondary text-small flex items-center gap-1.5">
              <MapPin className="size-4 shrink-0" aria-hidden="true" />
              {business.category}
            </p>
          )}
          {business.hoursSummary && (
            <p className="text-ink-secondary text-small flex items-center gap-1.5">
              <Clock className="size-4 shrink-0" aria-hidden="true" />
              {business.hoursSummary}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
