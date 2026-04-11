import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { AUTH_COOKIE_NAME, clearSession } from '@/lib/auth-session';

export async function POST() {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(AUTH_COOKIE_NAME)?.value;

  clearSession(sessionId);
  cookieStore.delete(AUTH_COOKIE_NAME);

  return NextResponse.json({ success: true });
}
