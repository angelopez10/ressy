'use client';

import { ChevronRight, User, Users } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { BookingServiceDTO, BookingStaffDTO } from '@/lib/booking/types';

interface Props {
  service: BookingServiceDTO;
  staff: BookingStaffDTO[];
  onSelect: (staffMemberId: string | null) => void;
}

/**
 * Paso 2: elegir profesional. "Cualquier profesional" (resaltado con borde ink)
 * más una card por staff habilitado para el servicio. `null` = cualquiera.
 */
export function StaffStep({ service, staff, onSelect }: Props) {
  const t = useTranslations('booking.staff');

  return (
    <div className="px-5 pt-2 pb-8">
      <h1 className="text-ink text-h3">{t('title')}</h1>
      <p className="text-ink-secondary text-small mt-1">
        {t('serviceSummary', { service: service.name, duration: service.durationMin })}
      </p>

      <ul className="mt-5 flex flex-col gap-2.5">
        <li>
          <StaffRow
            highlighted
            icon={<Users className="size-5" aria-hidden="true" />}
            title={t('any')}
            subtitle={t('anyHint')}
            onClick={() => onSelect(null)}
          />
        </li>
        {staff.map((s) => (
          <li key={s.id}>
            <StaffRow
              avatarUrl={s.avatarUrl}
              icon={<User className="size-5" aria-hidden="true" />}
              title={s.name}
              subtitle={s.role ?? undefined}
              onClick={() => onSelect(s.id)}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}

function StaffRow({
  title,
  subtitle,
  icon,
  avatarUrl,
  highlighted = false,
  onClick,
}: {
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  avatarUrl?: string | null;
  highlighted?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'bg-surface rounded-card flex w-full items-center gap-3.5 border p-3.5 text-left transition-shadow',
        'hover:shadow-card',
        highlighted ? 'border-ink' : 'border-border',
      ].join(' ')}
    >
      <span
        className={[
          'flex size-12 items-center justify-center overflow-hidden rounded-full',
          highlighted ? 'bg-accent-soft text-accent-hover' : 'bg-surface-alt text-ink-secondary',
        ].join(' ')}
      >
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatarUrl} alt="" className="size-full object-cover" />
        ) : (
          icon
        )}
      </span>
      <span className="flex-1">
        <span className="text-ink block font-semibold">{title}</span>
        {subtitle && <span className="text-ink-secondary text-small block">{subtitle}</span>}
      </span>
      <ChevronRight className="text-ink-tertiary size-5" aria-hidden="true" />
    </button>
  );
}
