import { NextResponse } from 'next/server';
import { createClient } from '@/lib/db/server';

/** Cierra sesión y vuelve al login. POST para que no lo dispare un prefetch. */
export async function POST(request: Request) {
  const db = await createClient();
  await db.auth.signOut();
  const { origin } = new URL(request.url);
  return NextResponse.redirect(`${origin}/es/login`, { status: 303 });
}
