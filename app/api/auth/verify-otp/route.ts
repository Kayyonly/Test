import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { AUTH_COOKIE_NAME } from '@/lib/auth-constants';
import { createAuthSession } from '@/lib/auth-session';
import { findOtpByEmail, incrementOtpAttempts, removeOtp } from '@/lib/otp';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_VERIFY_ATTEMPTS = 5;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = String(body?.email ?? '').trim().toLowerCase();
    const inputOtp = String(body?.otp ?? body?.code ?? '').trim();

    if (!EMAIL_REGEX.test(email)) {
      return NextResponse.json({ success: false, message: 'Email tidak valid' }, { status: 400 });
    }

    if (!/^\d{6}$/.test(inputOtp)) {
      return NextResponse.json({ success: false, message: 'Kode salah' }, { status: 400 });
    }

    const otpRecord = findOtpByEmail(email);

    if (!otpRecord) {
      return NextResponse.json({ success: false, message: 'OTP tidak ditemukan' }, { status: 404 });
    }

    const now = Date.now();
    const { otp: storedOtp, expiresAt } = otpRecord;

    console.log({
      email,
      inputOtp,
      storedOtp,
      now,
      expiresAt,
    });

    if (now > expiresAt) {
      removeOtp(email);
      return NextResponse.json({ success: false, message: 'Kode sudah expired' }, { status: 400 });
    }

    if (inputOtp.trim() !== storedOtp) {
      const updated = incrementOtpAttempts(email);

      if (updated && updated.failedAttempts >= MAX_VERIFY_ATTEMPTS) {
        removeOtp(email);
        return NextResponse.json(
          { success: false, message: 'Terlalu banyak percobaan. Silakan minta OTP baru.' },
          { status: 429 },
        );
      }

      return NextResponse.json({ success: false, message: 'Kode salah' }, { status: 400 });
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
    console.error('[VERIFY_OTP_ROUTE_ERROR]', error);
    return NextResponse.json({ success: false, message: 'Gagal verifikasi OTP' }, { status: 500 });
  }
}
