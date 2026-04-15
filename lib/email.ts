type SendOtpEmailInput = {
  email: string;
  code: string;
};

export type SendOtpEmailResult = {
  success: boolean;
  message: string;
  status?: number;
  reason?: 'RESEND_DOMAIN_NOT_VERIFIED' | 'CONFIG_ERROR' | 'UNKNOWN_ERROR';
};

const RESEND_API_URL = 'https://api.resend.com/emails';
const RESEND_TESTING_LIMIT_MESSAGE = 'You can only send testing emails';

export async function sendOtpEmail({ email, code }: SendOtpEmailInput): Promise<SendOtpEmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL;

  if (!apiKey || !fromEmail) {
    console.error('[OTP_EMAIL_CONFIG_ERROR] Missing RESEND_API_KEY or RESEND_FROM_EMAIL in environment variables.');
    return {
      success: false,
      status: 500,
      reason: 'CONFIG_ERROR',
      message:
        'Konfigurasi email belum lengkap. Set RESEND_API_KEY dan RESEND_FROM_EMAIL (contoh: Vynra Tune <no-reply@domainkamu.com>).',
    };
  }

  try {
    const response = await fetch(RESEND_API_URL, {
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
      const isTestingEmailLimit = responseBody.includes(RESEND_TESTING_LIMIT_MESSAGE);
      console.error('[OTP_EMAIL_SEND_ERROR]', response.status, responseBody);

      if (isTestingEmailLimit) {
        return {
          success: false,
          status: 400,
          reason: 'RESEND_DOMAIN_NOT_VERIFIED',
          message:
            'Akun Resend kamu masih mode testing. Supaya OTP bisa dikirim ke SEMUA email, verifikasi domain di https://resend.com/domains, pasang DNS SPF + DKIM, lalu pakai RESEND_FROM_EMAIL dari domain tersebut (contoh: Vynra Tune <no-reply@domainkamu.com>).',
        };
      }

      return {
        success: false,
        status: response.status,
        reason: 'UNKNOWN_ERROR',
        message: 'Gagal kirim OTP lewat Resend.',
      };
    }

    return {
      success: true,
      status: 200,
      message: 'OTP berhasil dikirim',
    };
  } catch (error) {
    console.error('[OTP_EMAIL_FETCH_ERROR]', error);
    return {
      success: false,
      status: 500,
      reason: 'UNKNOWN_ERROR',
      message: 'Gagal kirim OTP lewat Resend.',
    };
  }
}
