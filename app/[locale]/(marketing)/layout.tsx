import type { ReactNode } from 'react';
import { SiteHeader } from '@/components/SiteHeader';

export default function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1">{children}</main>
    </div>
  );
}
