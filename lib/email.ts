export async function sendOtpEmail({
  email,
  code,
}: {
  email: string;
  code: string;
}): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL;

  if (!apiKey || !fromEmail) {
    throw new Error('Konfigurasi email belum lengkap. Set RESEND_API_KEY dan RESEND_FROM_EMAIL.');
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: fromEmail,
      to: email,
      subject: 'Kode Verifikasi Login',
      text: `Kode verifikasi kamu adalah: ${code} (berlaku 15 menit)`,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Gagal mengirim email OTP: ${response.status} ${body}`);
  }
}
