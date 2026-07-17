import { createNavigation } from 'next-intl/navigation';
import { routing } from './routing';

/**
 * Wrappers de navegación conscientes del locale. Usar SIEMPRE estos en vez de
 * los de `next/link` / `next/navigation`: preservan el prefijo `/es` | `/en`.
 */
export const { Link, redirect, usePathname, useRouter, getPathname } = createNavigation(routing);
