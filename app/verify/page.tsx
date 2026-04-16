'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { OTPInput } from '@/components/auth/OTPInput';
import { useAuthStore } from '@/store/authStore';

const RESEND_COOLDOWN = 30;

export default function VerifyPage() {
  const router = useRouter();
  const setUser = useAuthStore((state) => state.setUser);

  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState('');
  const [cooldown, setCooldown] = useState(0);

  const isResendDisabled = useMemo(() => cooldown > 0 || resending, [cooldown, resending]);

  useEffect(() => {
    const savedEmail = sessionStorage.getItem('vynra_auth_email');
    if (!savedEmail) {
      router.replace('/auth');
      return;
    }

    setEmail(savedEmail);
    setCooldown(RESEND_COOLDOWN);
  }, [router]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((value) => (value <= 1 ? 0 : value - 1));
    }, 1000);

    return () => clearInterval(timer);
  }, [cooldown]);

  const verifyOtp = async (event: FormEvent) => {
    event.preventDefault();
    setError('');

    setLoading(true);
    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code: otp }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data?.message ?? 'Verifikasi gagal');
        return;
      }

      setUser(email);
      const nextPath = sessionStorage.getItem('vynra_auth_next');
      sessionStorage.removeItem('vynra_auth_email');
      sessionStorage.removeItem('vynra_auth_next');
      router.replace(nextPath && nextPath.startsWith('/') ? nextPath : '/');
      router.refresh();
    } catch (requestError) {
      console.error(requestError);
      setError('Terjadi gangguan jaringan');
    } finally {
      setLoading(false);
    }
  };

  const resendOtp = async () => {
    if (!email || cooldown > 0) return;

    setError('');
    setResending(true);
    try {
      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data?.message ?? 'Gagal kirim ulang OTP');
        return;
      }

      setCooldown(RESEND_COOLDOWN);
      setOtp('');
    } catch (requestError) {
      console.error(requestError);
      setError('Gagal kirim ulang OTP');
    } finally {
      setResending(false);
    }
  };

  return (
    <main className="min-h-screen bg-black px-6 py-10 text-white">
      <div className="mx-auto flex min-h-[80vh] w-full max-w-md flex-col items-center justify-center">
        <div className="w-full rounded-3xl border border-white/10 bg-zinc-950 p-6 shadow-2xl shadow-black/50">
          <p className="text-center text-sm text-zinc-400">Verifikasi ke {email}</p>
          <h1 className="mt-2 text-center text-3xl font-semibold">Enter OTP</h1>

          <form onSubmit={verifyOtp} className="mt-8 space-y-5">
            <OTPInput value={otp} onChange={setOtp} disabled={loading} />

            {error ? <p className="text-center text-sm text-red-400">{error}</p> : null}

            <button
              type="submit"
              disabled={loading || otp.length !== 6}
              className="w-full rounded-xl bg-white py-3 text-sm font-semibold text-black transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? 'Verifying...' : 'Verify & Login'}
            </button>
          </form>

          <button
            onClick={resendOtp}
            disabled={isResendDisabled}
            className="mt-4 w-full text-sm text-zinc-300 disabled:opacity-50"
          >
            {cooldown > 0 ? `Resend OTP in ${cooldown}s` : 'Resend OTP'}
          </button>
        </div>
      </div>
    </main>
  );
}
