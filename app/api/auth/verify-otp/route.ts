import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { AUTH_COOKIE_NAME, createAuthSession } from '@/lib/auth-session';
import { findOtpByEmail, removeOtp } from '@/lib/otp';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = String(body?.email ?? '').trim().toLowerCase();
    const code = String(body?.code ?? '').trim();

    if (!EMAIL_REGEX.test(email)) {
      return NextResponse.json({ error: 'Email tidak valid' }, { status: 400 });
    }

    if (!/^\d{6}$/.test(code)) {
      return NextResponse.json({ error: 'Kode salah' }, { status: 400 });
    }

    const otpRecord = findOtpByEmail(email);

    if (!otpRecord) {
      return NextResponse.json({ error: 'Kode sudah expired' }, { status: 400 });
    }

    if (otpRecord.code !== code) {
      return NextResponse.json({ error: 'Kode salah' }, { status: 400 });
    }

    removeOtp(email);

    const { id, maxAgeSeconds } = createAuthSession(email);
    const cookieStore = await cookies();
    cookieStore.set(AUTH_COOKIE_NAME, id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: maxAgeSeconds,
    });

    return NextResponse.json({ success: true, email });
  } catch (error) {
    console.error('verify otp error', error);
    return NextResponse.json({ error: 'Gagal verifikasi OTP' }, { status: 500 });
  }
}
