# Vynra Tune

## Auth OTP (Email) - Next.js App Router

Sistem autentikasi ini menggunakan flow:

1. User input email di `/auth`
2. API generate OTP 6 digit + simpan dengan expired 15 menit
3. OTP dikirim via Resend ke Gmail user
4. User verifikasi di `/verify`
5. Jika valid, server set session cookie lalu user masuk ke homepage (`/`)

## Struktur utama

- `app/auth/page.tsx`
- `app/verify/page.tsx`
- `app/page.tsx` (protected route)
- `app/api/auth/send-otp/route.ts`
- `app/api/auth/verify-otp/route.ts`
- `app/api/auth/logout/route.ts`
- `lib/otp.ts`
- `lib/email.ts`
- `lib/auth-session.ts`
- `store/authStore.ts`

## Setup Resend (Step-by-step)

1. Buat akun di [https://resend.com](https://resend.com).
2. Ambil API key dari dashboard Resend.
3. Di root project, buat file `.env.local`.
4. Isi environment berikut:

```bash
RESEND_API_KEY=your_api_key_here
RESEND_FROM_EMAIL=onboarding@resend.dev
```

5. Restart server Next.js setiap kali ubah env:

```bash
npm run dev
```

6. Test kirim OTP dari halaman `/auth`.

## Catatan penting

- Jika env belum terisi, API tidak akan crash dan akan mengembalikan JSON error yang jelas.
- Untuk produksi, gunakan domain email terverifikasi di Resend, jangan hanya onboarding sender.

## Contoh response API

Success:

```json
{ "success": true }
```

Error:

```json
{ "success": false, "message": "Gagal kirim OTP" }
```

## Catatan produksi

- Session dan OTP saat ini disimpan in-memory (Map) sehingga akan reset saat server restart/deploy baru.
- Untuk production multi-instance, ganti ke database shared (Supabase/Postgres + Prisma) atau Redis agar session/OTP konsisten lintas instance.
