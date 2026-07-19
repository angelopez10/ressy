import type { LucideIcon } from 'lucide-react';
import { Card } from '@/components/ui/Card';

/** Tarjeta de métrica (mockup `stat`): ícono + label + valor grande + sub. */
export function StatCard({
  Icon,
  label,
  value,
  sub,
}: {
  Icon: LucideIcon;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <Card className="p-5">
      <div className="text-ink-secondary mb-3 flex items-center gap-2 text-xs font-medium">
        <Icon className="size-4" aria-hidden="true" />
        {label}
      </div>
      <div className="text-ink text-3xl font-bold tracking-tight">{value}</div>
      {sub && <div className="text-ink-secondary mt-1 text-xs">{sub}</div>}
    </Card>
  );
}
