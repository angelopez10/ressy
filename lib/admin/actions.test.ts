import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * ============================================================================
 * Análisis estático: ninguna server action de admin sin guard
 * ============================================================================
 * En Next, cada función exportada de un archivo `'use server'` es un endpoint
 * POST direccionable. El guard del layout NO las cubre. O sea que olvidarse un
 * `requireAdmin()` al agregar una action nueva expone datos de todos los
 * negocios, y es un olvido silencioso: la app compila, los tests pasan, la UI
 * funciona.
 *
 * Este test lee el archivo y lo verifica. Es feo comparado con un test de
 * comportamiento, pero es el que atrapa el error que de verdad va a ocurrir
 * dentro de seis meses, cuando nadie se acuerde de esta regla.
 * ============================================================================
 */

const SOURCE = readFileSync(join(process.cwd(), 'lib/admin/actions.ts'), 'utf8');

/** Las que legítimamente NO piden elevación, con su motivo. */
const EXEMPT: Record<string, string> = {
  // Si la elevación venció con una impersonación abierta, el usuario TIENE que
  // poder salir igual. Borra la cookie siempre y solo marca la fila si el actor
  // sigue siendo válido: no lee ni escribe datos de negocio.
  stopImpersonation: 'salida de emergencia de la impersonación',
};

/** Guards aceptables como primera llamada de una action. */
const GUARDS = ['requireAdmin(', 'requireAdminRole(', 'requireAdminIdentity('];

interface Action {
  name: string;
  body: string;
}

function parseExportedActions(src: string): Action[] {
  const actions: Action[] = [];
  const re = /export async function (\w+)\s*\(/g;
  let match: RegExpExecArray | null;

  while ((match = re.exec(src)) !== null) {
    const name = match[1]!;
    const nextIdx = src.indexOf('export async function', match.index + 1);
    const body = src.slice(match.index, nextIdx === -1 ? src.length : nextIdx);
    actions.push({ name, body });
  }
  return actions;
}

describe('lib/admin/actions.ts — toda action exportada empieza con el guard', () => {
  const actions = parseExportedActions(SOURCE);

  it('el archivo es un módulo de server actions', () => {
    expect(SOURCE.startsWith("'use server'")).toBe(true);
  });

  it('encuentra actions para revisar (si esto falla, el parser se rompió)', () => {
    // Sin esta comprobación, un parser roto haría pasar todo el resto en vacío.
    expect(actions.length).toBeGreaterThanOrEqual(8);
  });

  it.each(
    parseExportedActions(SOURCE).map((a) => [a.name, a] as const),
  )('%s llama a un guard antes de tocar nada', (name, action) => {
    if (EXEMPT[name]) {
      expect(EXEMPT[name]).toBeTruthy();
      return;
    }

    const hasGuard = GUARDS.some((g) => action.body.includes(g));
    expect(hasGuard, `${name} no llama a requireAdmin/requireAdminRole/requireAdminIdentity`).toBe(
      true,
    );

    // Y tiene que ser lo PRIMERO: validar input o leer la DB antes del guard
    // ya es trabajo hecho a pedido de alguien sin autorizar.
    const guardIdx = Math.min(
      ...GUARDS.map((g) => action.body.indexOf(g)).filter((i) => i >= 0),
    );
    const dbIdx = action.body.indexOf('createAdminDb(');
    if (dbIdx >= 0) {
      expect(guardIdx, `${name} construye el cliente elevado antes del guard`).toBeLessThan(dbIdx);
    }
  });

  it('las acciones destructivas o de dinero exigen rol owner', () => {
    // Suspender, cancelar y cambiar plan no son cosas de soporte.
    for (const name of ['setSuspended', 'cancelSubscription', 'changePlan']) {
      const action = actions.find((a) => a.name === name);
      expect(action, `falta la action ${name}`).toBeDefined();
      expect(action!.body).toContain("requireAdminRole('owner')");
    }
  });

  it('ninguna action usa el cliente de servicio directamente', () => {
    // `createServiceClient` bypassa RLS sin exigir un AdminActor. En el panel el
    // único camino válido es `createAdminDb(actor)`, que lo pide por tipo.
    expect(SOURCE).not.toContain('createServiceClient');
  });
});
