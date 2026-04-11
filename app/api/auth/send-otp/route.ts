import { NextResponse } from 'next/server';
import { sendOtpEmail } from '@/lib/email';
import { generateOtpCode, saveOtp } from '@/lib/otp';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = String(body?.email ?? '').trim().toLowerCase();

    if (!EMAIL_REGEX.test(email)) {
      return NextResponse.json({ success: false, message: 'Email tidak valid' }, { status: 400 });
    }

    const code = generateOtpCode();
    saveOtp(email, code);

    const emailResult = await sendOtpEmail({ email, code });

    if (!emailResult.success) {
      return NextResponse.json({ success: false, message: emailResult.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[SEND_OTP_ROUTE_ERROR]', error);
    return NextResponse.json({ success: false, message: 'Gagal kirim OTP' }, { status: 500 });
  }
}
