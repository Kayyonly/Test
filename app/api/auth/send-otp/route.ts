import { NextResponse } from 'next/server';
import { sendOtpEmail } from '@/lib/email';
import { generateOtpCode, removeOtp, saveOtp } from '@/lib/otp';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = String(body?.email ?? '').trim().toLowerCase();

    if (!EMAIL_REGEX.test(email)) {
      return NextResponse.json({ success: false, message: 'Email tidak valid' }, { status: 400 });
    }

    const otp = generateOtpCode();
    const otpRecord = saveOtp(email, otp);

    const emailResult = await sendOtpEmail({ email, code: otp });

    if (!emailResult.success) {
      // Jangan simpan OTP jika email gagal terkirim agar tidak meninggalkan OTP "hantu".
      removeOtp(email);
      return NextResponse.json(
        { success: false, message: emailResult.message, reason: emailResult.reason },
        { status: emailResult.status ?? 500 },
      );
    }

    return NextResponse.json({
      success: true,
      expiresAt: otpRecord.expiresAt,
      expiresInMs: otpRecord.expiresAt - Date.now(),
    });
  } catch (error) {
    console.error('[SEND_OTP_ROUTE_ERROR]', error);
    return NextResponse.json({ success: false, message: 'Gagal kirim OTP' }, { status: 500 });
  }
}
