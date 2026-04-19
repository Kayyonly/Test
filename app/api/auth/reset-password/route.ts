import { NextResponse } from 'next/server';
import { findOtpByEmail, incrementOtpAttempts, removeOtp } from '@/lib/otp';
import { setUserPassword } from '@/lib/user-account-store';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: Request) {
  const body = await req.json();
  const email = String(body?.email ?? '').trim().toLowerCase();
  const otp = String(body?.otp ?? '').trim();
  const newPassword = String(body?.newPassword ?? '');
  const confirmPassword = String(body?.confirmPassword ?? '');

  if (!EMAIL_REGEX.test(email)) {
    return NextResponse.json({ success: false, message: 'Email tidak valid.' }, { status: 400 });
  }

  if (!/^\d{6}$/.test(otp)) {
    return NextResponse.json({ success: false, message: 'OTP harus 6 digit.' }, { status: 400 });
  }

  if (newPassword.length < 6) {
    return NextResponse.json({ success: false, message: 'Password baru minimal 6 karakter.' }, { status: 400 });
  }

  if (newPassword !== confirmPassword) {
    return NextResponse.json({ success: false, message: 'Konfirmasi password tidak sama.' }, { status: 400 });
  }

  const otpRecord = findOtpByEmail(email);
  if (!otpRecord) {
    return NextResponse.json({ success: false, message: 'OTP tidak ditemukan.' }, { status: 404 });
  }

  if (Date.now() > otpRecord.expiresAt) {
    removeOtp(email);
    return NextResponse.json({ success: false, message: 'OTP sudah kedaluwarsa.' }, { status: 400 });
  }

  if (otpRecord.otp !== otp) {
    incrementOtpAttempts(email);
    return NextResponse.json({ success: false, message: 'OTP tidak valid.' }, { status: 400 });
  }

  removeOtp(email);
  setUserPassword(email, newPassword);

  return NextResponse.json({ success: true, message: 'Password berhasil direset. Silakan login.' });
}
