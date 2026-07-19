import type { ReactNode } from 'react';

/**
 * Encabezado de pantalla del dashboard (mockup `pageHead`): título + subtítulo a
 * la izquierda, acción opcional a la derecha. Mantiene el ritmo entre pantallas.
 */
export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-ink text-2xl font-bold tracking-tight">{title}</h1>
        {subtitle && <p className="text-ink-secondary mt-1.5 text-sm">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
