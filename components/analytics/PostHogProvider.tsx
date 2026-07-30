'use client';

/**
 * Identifica al negocio en analytics una sola vez, al montar el shell del
 * dashboard. NO inicializa nada por sí mismo: `identifyBusiness` (capa
 * `lib/analytics`) hace el init perezoso y seguro (session recording OFF,
 * autocapture OFF) y respeta el consentimiento. No renderiza UI.
 *
 * IMPORTANTE (privacidad): este provider va SOLO en dashboard/marketing. En la
 * booking page pública NO se monta —los datos de clientes finales están en
 * pantalla— y allí los eventos del funnel usan `track()` directo, que comparte
 * el mismo init hardened.
 */

import { useEffect } from 'react';
import { identifyBusiness } from '@/lib/analytics';
import type { AnalyticsLocale } from '@/lib/analytics';
import type { PlanId } from '@/lib/plans/config';

export function PostHogProvider({
  userId,
  businessId,
  plan,
  locale,
}: {
  userId: string;
  businessId: string;
  plan: PlanId;
  locale: AnalyticsLocale;
}) {
  useEffect(() => {
    identifyBusiness(userId, { businessId, plan, locale });
  }, [userId, businessId, plan, locale]);

  return null;
}
