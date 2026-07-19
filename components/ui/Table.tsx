import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * Tabla del dashboard. Envuélvela en `<TableScroll>` para que en móvil haga
 * scroll horizontal controlado en vez de romper el layout (CLAUDE.md: tablas
 * usables en móvil). Estilos alineados al mockup: header en mayúsculas, filas
 * con borde inferior y hover suave.
 */
export function TableScroll({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('border-border rounded-card w-full overflow-x-auto border', className)}>
      {children}
    </div>
  );
}

export function Table({ className, ...props }: React.TableHTMLAttributes<HTMLTableElement>) {
  return <table className={cn('w-full border-collapse text-left', className)} {...props} />;
}

export function Th({ className, ...props }: React.ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={cn(
        'text-ink-secondary border-border border-b px-4 py-3 text-xs font-semibold tracking-wide uppercase',
        className,
      )}
      {...props}
    />
  );
}

export function Td({ className, ...props }: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className={cn('border-border border-b px-4 py-3.5 text-sm', className)} {...props} />;
}

export function Tr({
  className,
  interactive,
  ...props
}: React.HTMLAttributes<HTMLTableRowElement> & { interactive?: boolean }) {
  return (
    <tr
      className={cn(
        'last:[&>td]:border-0',
        interactive && 'hover:bg-surface-alt cursor-pointer transition-colors',
        className,
      )}
      {...props}
    />
  );
}
