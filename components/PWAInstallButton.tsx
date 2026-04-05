'use client';

import { useMemo, useState } from 'react';
import { Download, Share2, X } from 'lucide-react';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import { usePlayerStore } from '@/lib/store';

export function PWAInstallButton() {
  const currentTrack = usePlayerStore((state) => state.currentTrack);
  const {
    hasPrompt,
    isIOS,
    showInstallButton,
    requiresManualInstructions,
    installPWA,
  } = usePWAInstall();
  const [showInstructions, setShowInstructions] = useState(false);

  const bottomClassName = currentTrack ? 'bottom-[152px]' : 'bottom-[88px]';

  const helperText = useMemo(() => {
    if (isIOS) return 'Tap Share → Add to Home Screen';
    if (hasPrompt) return 'Install app for faster access';
    return 'Install not ready? Open browser menu and choose Install App';
  }, [hasPrompt, isIOS]);

  if (!showInstallButton) {
    return null;
  }

  const onInstallClick = async () => {
    if (hasPrompt) {
      await installPWA();
      return;
    }

    setShowInstructions(true);
  };

  return (
    <>
      <div className={`fixed ${bottomClassName} left-4 right-4 z-30 pointer-events-none`}>
        <div className="pointer-events-auto mx-auto w-full max-w-md rounded-2xl border border-white/10 bg-[#121214]/90 p-3 backdrop-blur-xl shadow-2xl">
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                void onInstallClick();
              }}
              className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-white text-black font-semibold transition hover:bg-white/90 active:scale-[0.99]"
            >
              <Download className="h-4 w-4" />
              <span>Install App</span>
            </button>
            {requiresManualInstructions && (
              <button
                onClick={() => setShowInstructions(true)}
                className="rounded-xl border border-white/20 px-3 py-2 text-sm text-white/80 transition hover:bg-white/10"
              >
                How to
              </button>
            )}
          </div>
          <p className="mt-2 text-center text-xs text-white/60">{helperText}</p>
        </div>
      </div>

      {showInstructions && (
        <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm px-4" onClick={() => setShowInstructions(false)}>
          <div
            className="mx-auto mt-24 w-full max-w-md rounded-3xl border border-white/10 bg-[#18181B] p-5"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">Install Music App</h3>
              <button onClick={() => setShowInstructions(false)} className="rounded-full p-2 text-white/60 hover:bg-white/10 hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>

            {isIOS ? (
              <ol className="space-y-2 text-sm text-white/80">
                <li className="flex items-start gap-2"><span className="mt-0.5 text-white">1.</span><span>Tap tombol <Share2 className="inline h-4 w-4" /> Share di Safari.</span></li>
                <li className="flex items-start gap-2"><span className="mt-0.5 text-white">2.</span><span>Scroll menu, lalu pilih <strong>Add to Home Screen</strong>.</span></li>
                <li className="flex items-start gap-2"><span className="mt-0.5 text-white">3.</span><span>Tap <strong>Add</strong> untuk menyimpan app ke Home Screen.</span></li>
              </ol>
            ) : (
              <ol className="space-y-2 text-sm text-white/80">
                <li className="flex items-start gap-2"><span className="mt-0.5 text-white">1.</span><span>Buka menu browser (⋮ / ⋯).</span></li>
                <li className="flex items-start gap-2"><span className="mt-0.5 text-white">2.</span><span>Pilih <strong>Install app</strong> atau <strong>Add to Home screen</strong>.</span></li>
                <li className="flex items-start gap-2"><span className="mt-0.5 text-white">3.</span><span>Konfirmasi instalasi.</span></li>
              </ol>
            )}
          </div>
        </div>
      )}
    </>
  );
}
