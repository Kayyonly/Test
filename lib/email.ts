type SendOtpEmailInput = {
  email: string;
  code: string;
};

type SendOtpEmailResult = {
  success: boolean;
  message: string;
};

export async function sendOtpEmail({ email, code }: SendOtpEmailInput): Promise<SendOtpEmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL;

  if (!apiKey || !fromEmail) {
    console.error('[OTP_EMAIL_CONFIG_ERROR] Missing RESEND_API_KEY or RESEND_FROM_EMAIL in environment variables.');
    return {
      success: false,
      message: 'Konfigurasi email belum lengkap. Pastikan RESEND_API_KEY dan RESEND_FROM_EMAIL tersedia di .env.local.',
    };
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromEmail,
        to: email,
        subject: 'Kode Verifikasi Vynra Tune',
        text: `Kode verifikasi kamu adalah: ${code}\nKode ini berlaku selama 15 menit.`,
      }),
    });

    if (!response.ok) {
      const responseBody = await response.text();
      console.error('[OTP_EMAIL_SEND_ERROR]', response.status, responseBody);
      return {
        success: false,
        message: 'Gagal kirim OTP',
      };
    }

    return {
      success: true,
      message: 'OTP berhasil dikirim',
    };
  } catch (error) {
    console.error('[OTP_EMAIL_FETCH_ERROR]', error);
    return {
      success: false,
      message: 'Gagal kirim OTP',
    };
  }
}
