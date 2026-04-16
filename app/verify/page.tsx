'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { OTPInput } from '@/components/auth/OTPInput';
import { AuthFrame } from '@/components/auth/AuthFrame';
import { useAuthStore } from '@/store/authStore';
import {
  clearPendingEmail,
  clearPendingNextPath,
  getPendingEmail,
  getPendingNextPath,
} from '@/lib/auth-client-storage';

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
    const savedEmail = getPendingEmail();

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
        setError(data?.message ?? 'Verifikasi gagal. Pastikan kode OTP benar.');
        return;
      }

      setUser(email);
      const nextPath = getPendingNextPath();
      clearPendingEmail();
      clearPendingNextPath();
      router.replace(nextPath || '/');
      router.refresh();
    } catch (requestError) {
      console.error(requestError);
      setError('Terjadi gangguan jaringan. Coba lagi.');
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
        setError(data?.message ?? 'Gagal kirim ulang OTP.');
        return;
      }

      setCooldown(RESEND_COOLDOWN);
    } catch (requestError) {
      console.error(requestError);
      setError('Gagal kirim ulang OTP. Coba beberapa saat lagi.');
    } finally {
      setResending(false);
    }
  };

  return (
    <AuthFrame title="Enter OTP" description={email ? `Kode dikirim ke ${email}` : 'Kode dikirim ke email kamu'}>
      <form onSubmit={verifyOtp} className="space-y-5">
        <OTPInput value={otp} onChange={setOtp} disabled={loading} />

        {error ? <p className="text-center text-sm text-red-400">{error}</p> : null}

        <button
          type="submit"
          disabled={loading || otp.length !== 6}
          className="w-full rounded-2xl bg-blue-500 py-3 text-sm font-semibold text-white transition hover:bg-blue-400 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? 'Memverifikasi...' : 'Verify & Continue'}
        </button>
      </form>

      <button
        onClick={resendOtp}
        disabled={isResendDisabled}
        className="mt-4 w-full text-sm text-zinc-300 transition hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
      >
        {cooldown > 0 ? `Kirim ulang OTP dalam ${cooldown}s` : 'Kirim ulang OTP'}
      </button>
    </AuthFrame>
  );
}
