import type { MrrPoint } from '@/lib/admin/queries';
import { usd } from '@/lib/admin/format';

/**
 * Gráfico de MRR. SVG plano, renderizado en el servidor: sin JS de cliente, sin
 * librería. Es una línea con área — `recharts` (que ya está en el repo para los
 * reportes del negocio) exigiría 'use client' y no aporta nada acá.
 *
 * Cuando todavía no hay historia muestra un vacío explícito en vez de una línea
 * plana en cero, que se leería como "el MRR es 0" en vez de "no medimos aún".
 */
export function MrrChart({ points }: { points: MrrPoint[] }) {
  if (points.length < 2) {
    return (
      <div className="text-ink-tertiary flex h-[200px] flex-col items-center justify-center gap-1 text-center">
        <p className="text-[13px] font-semibold">Todavía no hay historia de MRR</p>
        <p className="text-[12px]">
          El snapshot diario empieza a acumular desde hoy. En unos días esto es una curva.
        </p>
      </div>
    );
  }

  const W = 680;
  const H = 200;
  const values = points.map((p) => p.totalUsd);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const step = W / (points.length - 1);

  const coords = points.map((p, i) => {
    const x = i * step;
    const y = H - ((p.totalUsd - min) / span) * (H - 24) - 12;
    return [x, y] as const;
  });

  const line = coords.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');
  const area = `${line} L ${coords.at(-1)![0].toFixed(1)} ${H} L 0 ${H} Z`;
  const [lastX, lastY] = coords.at(-1)!;

  // Etiquetas espaciadas: como mucho 6, para que no se pisen.
  const labelEvery = Math.max(1, Math.ceil(points.length / 6));
  const labels = points.filter((_, i) => i % labelEvery === 0);
  const monthFmt = new Intl.DateTimeFormat('es', { month: 'short' });

  return (
    <div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="block h-auto w-full overflow-visible"
        role="img"
        aria-label={`MRR: de ${usd(values[0]!)} a ${usd(values.at(-1)!)}`}
      >
        <defs>
          <linearGradient id="mrr-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="var(--color-accent)" stopOpacity=".16" />
            <stop offset="1" stopColor="var(--color-accent)" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[50, 100, 150].map((y) => (
          <line key={y} x1="0" y1={y} x2={W} y2={y} stroke="var(--color-border)" strokeWidth="1" />
        ))}
        <path d={area} fill="url(#mrr-fill)" />
        <path
          d={line}
          fill="none"
          stroke="var(--color-accent)"
          strokeWidth="2.5"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        <circle cx={lastX} cy={lastY} r="4.5" fill="var(--color-accent)" stroke="#fff" strokeWidth="2" />
      </svg>
      <div className="text-ink-tertiary mt-1.5 flex justify-between text-[11px]">
        {labels.map((p) => (
          <span key={p.day}>{monthFmt.format(new Date(p.day))}</span>
        ))}
      </div>
    </div>
  );
}
