import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * ============================================================================
 * Tests de LA barrera del panel de Super Admin
 * ============================================================================
 * Lo que se prueba acá no es "que funcione cuando todo está bien", sino que
 * FALLE en cada escenario de ataque. Cada `it` es una forma concreta de tratar
 * de entrar:
 *
 *   - un dueño de negocio cualquiera (sin fila en `ressy_admins`)
 *   - un admin al que le revocaron el acceso
 *   - un admin fuera de la allowlist de emails
 *   - un admin sin superar el OTP (sin elevación)
 *   - una cookie de sesión elevada FORJADA
 *   - una cookie válida pero de OTRO admin
 *   - una elevación revocada o vencida
 *   - una cookie de impersonación forjada, vencida, o en manos de un no-admin
 *
 * La DB es un doble en memoria: acá no se testea Postgres, se testea la lógica
 * de decisión de la app.
 * ============================================================================
 */

const SECRET = 's'.repeat(48);

type Row = Record<string, unknown>;

const state = {
  user: null as { id: string; email: string } | null,
  ressy_admins: [] as Row[],
  admin_sessions: [] as Row[],
  admin_impersonations: [] as Row[],
  businesses: [] as Row[],
  cookies: new Map<string, string>(),
  rpcCalls: [] as { fn: string; args: unknown }[],
};

function makeQuery(table: keyof typeof state) {
  const filters: [string, unknown][] = [];
  const q = {
    select: () => q,
    insert: () => q,
    update: () => q,
    delete: () => q,
    eq: (k: string, v: unknown) => (filters.push([k, v]), q),
    is: (k: string, v: unknown) => (filters.push([k, v]), q),
    order: () => q,
    limit: () => q,
    match: () => q,
    maybeSingle: async () => ({ data: rows()[0] ?? null, error: null }),
    single: async () => ({ data: rows()[0] ?? null, error: null }),
  };
  function rows(): Row[] {
    const all = (state[table] as Row[]) ?? [];
    return all.filter((r) =>
      filters.every(([k, v]) => (v === null ? r[k] === null || r[k] === undefined : r[k] === v)),
    );
  }
  return q;
}

const fakeDb = {
  from: (t: string) => makeQuery(t as keyof typeof state),
  rpc: async (fn: string, args: unknown) => {
    state.rpcCalls.push({ fn, args });
    return { data: null, error: null };
  },
};

vi.mock('@/lib/db/service', () => ({
  createServiceClient: () => fakeDb,
}));

vi.mock('@/lib/auth/session', () => ({
  getUser: async () => state.user,
}));

vi.mock('next/headers', () => ({
  cookies: async () => ({
    get: (name: string) => {
      const value = state.cookies.get(name);
      return value === undefined ? undefined : { name, value };
    },
    set: (name: string, value: string) => void state.cookies.set(name, value),
    delete: (name: string) => void state.cookies.delete(name),
  }),
  headers: async () => new Map<string, string>([['user-agent', 'vitest']]) as unknown as Headers,
}));

vi.mock('next/navigation', () => ({
  notFound: () => {
    throw new Error('NEXT_NOT_FOUND');
  },
}));

const ADMIN_ID = 'admin-1';
const OTHER_ADMIN_ID = 'admin-2';
const BIZ_ID = 'biz-1';

async function mod() {
  return import('./guard');
}

/** Escribe la cookie de sesión elevada tal como lo haría el flujo real. */
async function setSessionCookie(opts: { sid: string; uid: string; expOffsetSec?: number }) {
  const { signPayload } = await import('./signing');
  const { ADMIN_SESSION_COOKIE } = await import('./env');
  const signed = signPayload({
    sid: opts.sid,
    uid: opts.uid,
    exp: Math.floor(Date.now() / 1000) + (opts.expOffsetSec ?? 3600),
  })!;
  state.cookies.set(ADMIN_SESSION_COOKIE, signed);
}

function seedHappyPath() {
  state.user = { id: ADMIN_ID, email: 'staff@getressy.com' };
  state.ressy_admins = [
    { user_id: ADMIN_ID, email: 'staff@getressy.com', name: 'Staff', role: 'owner', revoked_at: null },
  ];
  state.admin_sessions = [
    {
      id: 'sess-1',
      user_id: ADMIN_ID,
      expires_at: new Date(Date.now() + 3_600_000).toISOString(),
      revoked_at: null,
    },
  ];
}

beforeEach(() => {
  vi.resetModules();
  process.env.RESSY_ADMIN_SECRET = SECRET;
  delete process.env.RESSY_ADMIN_EMAILS;
  state.user = null;
  state.ressy_admins = [];
  state.admin_sessions = [];
  state.admin_impersonations = [];
  state.businesses = [{ id: BIZ_ID, name: 'Barbería Bravo' }];
  state.cookies = new Map();
  state.rpcCalls = [];
});

// ---------------------------------------------------------------------------
// Camino feliz: sirve de control. Si esto falla, el resto no prueba nada.
// ---------------------------------------------------------------------------
describe('requireAdmin — camino feliz', () => {
  it('deja pasar a un admin vigente con elevación válida', async () => {
    seedHappyPath();
    await setSessionCookie({ sid: 'sess-1', uid: ADMIN_ID });
    const { requireAdmin } = await mod();
    const actor = await requireAdmin();
    expect(actor.userId).toBe(ADMIN_ID);
    expect(actor.sessionId).toBe('sess-1');
    expect(actor.role).toBe('owner');
  });
});

// ---------------------------------------------------------------------------
// Lo que de verdad importa: cada forma de NO entrar.
// ---------------------------------------------------------------------------
describe('requireAdmin — rechazos', () => {
  it('sin sesión de Supabase', async () => {
    const { requireAdmin } = await mod();
    await expect(requireAdmin()).rejects.toThrow('NEXT_NOT_FOUND');
  });

  it('DUEÑO DE NEGOCIO cualquiera: sesión válida pero sin fila en ressy_admins', async () => {
    // Éste es el escenario central del prompt: un cliente de Ressy, logueado,
    // apuntando al panel. No hay rol de negocio que lo habilite.
    state.user = { id: 'owner-de-barberia', email: 'dueño@barberia.cl' };
    state.ressy_admins = [];
    await setSessionCookie({ sid: 'sess-1', uid: 'owner-de-barberia' });

    const { requireAdmin, getAdminIdentity } = await mod();
    expect(await getAdminIdentity()).toBeNull();
    await expect(requireAdmin()).rejects.toThrow('NEXT_NOT_FOUND');
  });

  it('admin REVOCADO', async () => {
    seedHappyPath();
    state.ressy_admins[0]!.revoked_at = new Date().toISOString();
    await setSessionCookie({ sid: 'sess-1', uid: ADMIN_ID });
    const { requireAdmin } = await mod();
    await expect(requireAdmin()).rejects.toThrow('NEXT_NOT_FOUND');
  });

  it('admin en la tabla pero FUERA de la allowlist de emails', async () => {
    seedHappyPath();
    process.env.RESSY_ADMIN_EMAILS = 'otra@getressy.com';
    await setSessionCookie({ sid: 'sess-1', uid: ADMIN_ID });
    const { requireAdmin } = await mod();
    await expect(requireAdmin()).rejects.toThrow('NEXT_NOT_FOUND');
  });

  it('admin SIN elevación (no superó el OTP): no hay cookie', async () => {
    seedHappyPath();
    const { requireAdmin, getAdminIdentity } = await mod();
    // Es admin…
    expect((await getAdminIdentity())?.userId).toBe(ADMIN_ID);
    // …pero no entra.
    await expect(requireAdmin()).rejects.toThrow('NEXT_NOT_FOUND');
  });

  it('cookie de elevación FORJADA (firmada con otro secreto)', async () => {
    seedHappyPath();
    const { ADMIN_SESSION_COOKIE } = await import('./env');
    process.env.RESSY_ADMIN_SECRET = 'x'.repeat(48);
    const { signPayload } = await import('./signing');
    const forged = signPayload({
      sid: 'sess-1',
      uid: ADMIN_ID,
      exp: Math.floor(Date.now() / 1000) + 3600,
    })!;
    process.env.RESSY_ADMIN_SECRET = SECRET; // vuelve el secreto real
    state.cookies.set(ADMIN_SESSION_COOKIE, forged);

    vi.resetModules();
    const { requireAdmin } = await import('./guard');
    await expect(requireAdmin()).rejects.toThrow('NEXT_NOT_FOUND');
  });

  it('cookie válida pero de OTRO admin (sesión robada + login propio)', async () => {
    seedHappyPath();
    state.admin_sessions = [
      {
        id: 'sess-otro',
        user_id: OTHER_ADMIN_ID,
        expires_at: new Date(Date.now() + 3_600_000).toISOString(),
        revoked_at: null,
      },
    ];
    // La cookie dice que es del otro admin; la sesión de Supabase es la propia.
    await setSessionCookie({ sid: 'sess-otro', uid: OTHER_ADMIN_ID });
    const { requireAdmin } = await mod();
    await expect(requireAdmin()).rejects.toThrow('NEXT_NOT_FOUND');
  });

  it('elevación REVOCADA en la DB (la fila manda sobre la cookie)', async () => {
    seedHappyPath();
    state.admin_sessions[0]!.revoked_at = new Date().toISOString();
    await setSessionCookie({ sid: 'sess-1', uid: ADMIN_ID });
    const { requireAdmin } = await mod();
    await expect(requireAdmin()).rejects.toThrow('NEXT_NOT_FOUND');
  });

  it('elevación VENCIDA en la DB aunque la cookie diga que no', async () => {
    seedHappyPath();
    state.admin_sessions[0]!.expires_at = new Date(Date.now() - 1000).toISOString();
    await setSessionCookie({ sid: 'sess-1', uid: ADMIN_ID, expOffsetSec: 99_999 });
    const { requireAdmin } = await mod();
    await expect(requireAdmin()).rejects.toThrow('NEXT_NOT_FOUND');
  });

  it('cookie vencida por su propio exp', async () => {
    seedHappyPath();
    await setSessionCookie({ sid: 'sess-1', uid: ADMIN_ID, expOffsetSec: -10 });
    const { requireAdmin } = await mod();
    await expect(requireAdmin()).rejects.toThrow('NEXT_NOT_FOUND');
  });

  it('sin RESSY_ADMIN_SECRET el panel no existe para nadie', async () => {
    seedHappyPath();
    await setSessionCookie({ sid: 'sess-1', uid: ADMIN_ID });
    delete process.env.RESSY_ADMIN_SECRET;
    vi.resetModules();
    const { requireAdmin } = await import('./guard');
    await expect(requireAdmin()).rejects.toThrow('NEXT_NOT_FOUND');
  });
});

describe('requireAdminRole — acciones de dinero/destructivas', () => {
  it('un admin de soporte no pasa el gate de owner', async () => {
    seedHappyPath();
    state.ressy_admins[0]!.role = 'support';
    await setSessionCookie({ sid: 'sess-1', uid: ADMIN_ID });
    const { requireAdminRole } = await mod();
    await expect(requireAdminRole('owner')).rejects.toThrow('NEXT_NOT_FOUND');
    // …pero sí entra al panel.
    await expect(requireAdminRole('support')).resolves.toMatchObject({ role: 'support' });
  });
});

// ---------------------------------------------------------------------------
// Impersonación: la pieza que toca la resolución de tenant del dashboard.
// ---------------------------------------------------------------------------
describe('getActiveImpersonation', () => {
  async function setImpersonationCookie(opts: {
    iid: string;
    bid: string;
    uid: string;
    expOffsetSec?: number;
    secret?: string;
  }) {
    const prev = process.env.RESSY_ADMIN_SECRET;
    if (opts.secret) process.env.RESSY_ADMIN_SECRET = opts.secret;
    vi.resetModules();
    const { signPayload } = await import('./signing');
    const { IMPERSONATION_COOKIE } = await import('./env');
    const signed = signPayload({
      iid: opts.iid,
      bid: opts.bid,
      uid: opts.uid,
      exp: Math.floor(Date.now() / 1000) + (opts.expOffsetSec ?? 1800),
    })!;
    process.env.RESSY_ADMIN_SECRET = prev;
    vi.resetModules();
    state.cookies.set(IMPERSONATION_COOKIE, signed);
  }

  function seedImpersonation(over: Partial<Row> = {}) {
    state.admin_impersonations = [
      {
        id: 'imp-1',
        admin_user_id: ADMIN_ID,
        business_id: BIZ_ID,
        expires_at: new Date(Date.now() + 1_800_000).toISOString(),
        ended_at: null,
        ...over,
      },
    ];
  }

  it('SIN cookie devuelve null sin tocar la DB (camino rápido del dashboard)', async () => {
    // Es el 100% de los requests de negocios reales: no debe costar una query.
    state.user = { id: 'dueño', email: 'a@b.cl' };
    const { getActiveImpersonation } = await import('./impersonation');
    expect(await getActiveImpersonation()).toBeNull();
    expect(state.rpcCalls).toHaveLength(0);
  });

  it('camino feliz: admin elevado con fila viva', async () => {
    seedHappyPath();
    seedImpersonation();
    await setSessionCookie({ sid: 'sess-1', uid: ADMIN_ID });
    await setImpersonationCookie({ iid: 'imp-1', bid: BIZ_ID, uid: ADMIN_ID });

    const { getActiveImpersonation } = await import('./impersonation');
    const active = await getActiveImpersonation();
    expect(active).toMatchObject({ id: 'imp-1', businessId: BIZ_ID, adminUserId: ADMIN_ID });
  });

  it('cookie de impersonación FORJADA con otro secreto', async () => {
    seedHappyPath();
    seedImpersonation();
    await setSessionCookie({ sid: 'sess-1', uid: ADMIN_ID });
    await setImpersonationCookie({
      iid: 'imp-1',
      bid: BIZ_ID,
      uid: ADMIN_ID,
      secret: 'z'.repeat(48),
    });

    const { getActiveImpersonation } = await import('./impersonation');
    expect(await getActiveImpersonation()).toBeNull();
  });

  it('cookie VÁLIDA en manos de quien NO es admin', async () => {
    // El caso feo: se filtra una cookie de impersonación y la usa un dueño de
    // negocio cualquiera. Sin ser admin, no vale nada.
    seedImpersonation();
    state.user = { id: 'dueño-random', email: 'dueño@barberia.cl' };
    state.ressy_admins = [];
    await setImpersonationCookie({ iid: 'imp-1', bid: BIZ_ID, uid: ADMIN_ID });

    const { getActiveImpersonation } = await import('./impersonation');
    expect(await getActiveImpersonation()).toBeNull();
  });

  it('cookie de un admin usada por OTRO admin', async () => {
    seedHappyPath();
    seedImpersonation({ admin_user_id: OTHER_ADMIN_ID });
    await setSessionCookie({ sid: 'sess-1', uid: ADMIN_ID });
    await setImpersonationCookie({ iid: 'imp-1', bid: BIZ_ID, uid: OTHER_ADMIN_ID });

    const { getActiveImpersonation } = await import('./impersonation');
    expect(await getActiveImpersonation()).toBeNull();
  });

  it('la sesión ya TERMINÓ (ended_at)', async () => {
    seedHappyPath();
    seedImpersonation({ ended_at: new Date().toISOString() });
    await setSessionCookie({ sid: 'sess-1', uid: ADMIN_ID });
    await setImpersonationCookie({ iid: 'imp-1', bid: BIZ_ID, uid: ADMIN_ID });

    const { getActiveImpersonation } = await import('./impersonation');
    expect(await getActiveImpersonation()).toBeNull();
  });

  it('la sesión VENCIÓ en la DB', async () => {
    seedHappyPath();
    seedImpersonation({ expires_at: new Date(Date.now() - 1000).toISOString() });
    await setSessionCookie({ sid: 'sess-1', uid: ADMIN_ID });
    await setImpersonationCookie({ iid: 'imp-1', bid: BIZ_ID, uid: ADMIN_ID, expOffsetSec: 99_999 });

    const { getActiveImpersonation } = await import('./impersonation');
    expect(await getActiveImpersonation()).toBeNull();
  });

  it('la cookie apunta a OTRO negocio que la fila (business_id manipulado)', async () => {
    seedHappyPath();
    seedImpersonation({ business_id: 'biz-legitimo' });
    await setSessionCookie({ sid: 'sess-1', uid: ADMIN_ID });
    await setImpersonationCookie({ iid: 'imp-1', bid: 'biz-de-otro', uid: ADMIN_ID });

    const { getActiveImpersonation } = await import('./impersonation');
    expect(await getActiveImpersonation()).toBeNull();
  });

  it('el admin perdió la elevación mientras impersonaba', async () => {
    seedHappyPath();
    seedImpersonation();
    state.admin_sessions[0]!.revoked_at = new Date().toISOString();
    await setSessionCookie({ sid: 'sess-1', uid: ADMIN_ID });
    await setImpersonationCookie({ iid: 'imp-1', bid: BIZ_ID, uid: ADMIN_ID });

    const { getActiveImpersonation } = await import('./impersonation');
    expect(await getActiveImpersonation()).toBeNull();
  });
});

describe('assertNotImpersonating — la impersonación es de solo lectura', () => {
  it('lanza cuando hay sesión de soporte activa', async () => {
    seedHappyPath();
    state.admin_impersonations = [
      {
        id: 'imp-1',
        admin_user_id: ADMIN_ID,
        business_id: BIZ_ID,
        expires_at: new Date(Date.now() + 1_800_000).toISOString(),
        ended_at: null,
      },
    ];
    await setSessionCookie({ sid: 'sess-1', uid: ADMIN_ID });
    const { signPayload } = await import('./signing');
    const { IMPERSONATION_COOKIE } = await import('./env');
    state.cookies.set(
      IMPERSONATION_COOKIE,
      signPayload({
        iid: 'imp-1',
        bid: BIZ_ID,
        uid: ADMIN_ID,
        exp: Math.floor(Date.now() / 1000) + 1800,
      })!,
    );

    const { assertNotImpersonating } = await import('./impersonation');
    await expect(assertNotImpersonating()).rejects.toThrow(/impersonation_read_only/);
  });

  it('no lanza para un usuario normal', async () => {
    state.user = { id: 'dueño', email: 'a@b.cl' };
    const { assertNotImpersonating } = await import('./impersonation');
    await expect(assertNotImpersonating()).resolves.toBeUndefined();
  });
});
