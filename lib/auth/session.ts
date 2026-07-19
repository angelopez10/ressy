import 'server-only';

import { createClient } from '@/lib/db/server';
import type { User } from '@supabase/supabase-js';

/** Usuario autenticado actual, o null. Fuente confiable para los guards. */
export async function getUser(): Promise<User | null> {
  const db = await createClient();
  const { data } = await db.auth.getUser();
  return data.user ?? null;
}

/** Negocio del usuario (el primero por si acaso). Base de la lógica de resume. */
export interface UserBusiness {
  id: string;
  slug: string;
  isPublished: boolean;
  name: string;
}

export async function getUserBusiness(): Promise<UserBusiness | null> {
  const db = await createClient();
  // RLS limita `businesses` a las de los negocios donde el usuario es miembro,
  // así que este select ya viene acotado a lo suyo.
  const { data } = await db
    .from('businesses')
    .select('id, slug, is_published, name')
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!data) return null;
  return { id: data.id, slug: data.slug, isPublished: data.is_published, name: data.name };
}
