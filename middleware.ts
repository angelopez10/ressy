import createMiddleware from 'next-intl/middleware';
import { routing } from '@/lib/i18n/routing';

export default createMiddleware(routing);

export const config = {
  // Matchea todo salvo los internos de Next, la API y archivos con extensión.
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
};
