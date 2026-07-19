import Image from 'next/image';
import { cn } from '@/lib/utils';

/**
 * Logo circular + wordmark "ressy". Se usa en el navbar y el footer de la landing.
 * `size` controla el diámetro del logo; el texto escala con él.
 */
export function Wordmark({ size = 34, className }: { size?: number; className?: string }) {
  return (
    <span className={cn('flex items-center gap-2', className)}>
      <Image
        src="/ressy-logo.png"
        alt="Ressy"
        width={size}
        height={size}
        className="rounded-full"
        priority
      />
      <span
        className="text-ink font-extrabold tracking-tight"
        style={{ fontSize: Math.round(size * 0.58) }}
      >
        ressy
      </span>
    </span>
  );
}
