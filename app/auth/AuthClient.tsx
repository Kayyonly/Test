'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type AuthClientProps = {
  nextPath?: string;
};

export default function AuthClient({ nextPath }: AuthClientProps) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  useEffect(() => {
    if (nextPath && nextPath.startsWith('/')) {
      sessionStorage.setItem('vynra_auth_next', nextPath);
    }
  }, [nextPath]);

  const submitEmail = async (event: FormEvent) => {
    event.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();

    if (!EMAIL_REGEX.test(normalizedEmail)) {
      setError('Email tidak valid');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: normalizedEmail }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data?.message ?? 'Gagal mengirim OTP');
        return;
      }

      sessionStorage.setItem('vynra_auth_email', normalizedEmail);
      router.push('/verify');
    } catch (requestError) {
      console.error(requestError);
      setError('Terjadi gangguan. Coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-black px-6 py-10 text-white">
      <div className="mx-auto flex min-h-[80vh] w-full max-w-md flex-col items-center justify-center">
        <div className="w-full rounded-3xl border border-white/10 bg-zinc-950 p-6 shadow-2xl shadow-black/50">
          <p className="text-center text-sm uppercase tracking-[0.3em] text-zinc-400">Vynra Tune</p>
          <h1 className="mt-3 text-center text-3xl font-semibold">Sign in</h1>
          <p className="mt-2 text-center text-sm text-zinc-400">Masuk / daftar pakai OTP email.</p>

          <form onSubmit={submitEmail} className="mt-8 space-y-4">
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              placeholder="Email Gmail kamu"
              className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-base outline-none ring-white/20 transition focus:ring-2"
            />

            {error ? <p className="text-sm text-red-400">{error}</p> : null}

            <button
              type="submit"
              disabled={loading || email.trim().length === 0}
              className="w-full rounded-xl bg-white py-3 text-sm font-semibold text-black transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? 'Sending OTP...' : 'Continue'}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
