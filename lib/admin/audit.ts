import 'server-only';

/**
 * ============================================================================
 * Ressy — Bitácora de acciones sensibles de admin
 * ============================================================================
 * Responde siempre: QUIÉN, QUÉ, CUÁNDO y SOBRE QUÉ NEGOCIO.
 *
 * Dos formas de escribir, según dónde viva la acción:
 *
 *  - Acciones que son una RPC de Postgres (`admin_extend_trial`,
 *    `admin_set_suspended`, ...): la RPC llama a `admin_log` DENTRO de su misma
 *    transacción. Es imposible que la acción ocurra y el registro no. No hace
 *    falta llamar nada de acá.
 *  - Acciones que no tocan la DB de negocio (entrar al panel, iniciar/terminar
 *    una impersonación): se registran con `logAdminAction`.
 *
 * La tabla es append-only por trigger: ni con la secret key se puede reescribir
 * o borrar una fila. Un log editable no sirve como evidencia.
 *
 * NUNCA meter PII de clientes finales en `payload` (CLAUDE.md §9): el panel
 * puede MOSTRAR datos de un cliente en contexto de soporte, pero no los copia a
 * un lugar nuevo.
 * ============================================================================
 */

import { createAdminDb } from './db';
import type { AdminActor } from './guard';

/** Vocabulario cerrado: si no está acá, no se registra por accidente con otro nombre. */
export type AdminAction =
  | 'admin.step_up'
  | 'admin.step_up_failed'
  | 'admin.sign_out'
  | 'impersonate.start'
  | 'impersonate.end'
  | 'trial.extend'
  | 'plan.change'
  | 'business.suspend'
  | 'business.unsuspend'
  | 'subscription.cancel'
  | 'admin.grant'
  | 'admin.revoke';

export interface AuditEntry {
  action: AdminAction;
  businessId?: string | null;
  payload?: Record<string, unknown>;
}

/**
 * Escribe una fila. Best-effort a propósito en el sentido de que NO revierte la
 * acción del usuario si falla el log, pero sí lo grita en los logs del servidor
 * con contexto: un fallo de auditoría es un incidente, no un detalle.
 */
export async function logAdminAction(actor: AdminActor, entry: AuditEntry): Promise<void> {
  try {
    const db = createAdminDb(actor);
    const { error } = await db.rpc('admin_log', {
      p_admin_user_id: actor.userId,
      p_admin_email: actor.email,
      p_action: entry.action,
      p_business_id: entry.businessId ?? null,
      p_payload: (entry.payload ?? {}) as never,
      p_ip: actor.ip,
      p_user_agent: actor.userAgent,
    });
    if (error) {
      console.error('[admin-audit] NO se pudo registrar la acción', {
        action: entry.action,
        business_id: entry.businessId ?? null,
        admin_user_id: actor.userId,
        error: error.message,
      });
    }
  } catch (err) {
    console.error('[admin-audit] excepción al registrar la acción', {
      action: entry.action,
      business_id: entry.businessId ?? null,
      admin_user_id: actor.userId,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

/**
 * Variante para eventos que ocurren ANTES de existir un actor elevado (un OTP
 * fallido, por ejemplo). Recibe los datos sueltos porque todavía no hay sesión.
 */
export async function logPreElevationEvent(params: {
  userId: string;
  email: string;
  action: Extract<AdminAction, 'admin.step_up' | 'admin.step_up_failed'>;
  payload?: Record<string, unknown>;
  ip: string | null;
  userAgent: string | null;
}): Promise<void> {
  try {
    // Sin actor todavía: se usa el cliente de lookup, igual que el guard.
    const { createAdminLookupClient } = await import('./db');
    const db = createAdminLookupClient();
    const { error } = await db.rpc('admin_log', {
      p_admin_user_id: params.userId,
      p_admin_email: params.email,
      p_action: params.action,
      p_business_id: null,
      p_payload: (params.payload ?? {}) as never,
      p_ip: params.ip,
      p_user_agent: params.userAgent,
    });
    if (error) {
      console.error('[admin-audit] fallo al registrar evento de step-up', error.message);
    }
  } catch (err) {
    console.error('[admin-audit] excepción en evento de step-up', String(err));
  }
}
