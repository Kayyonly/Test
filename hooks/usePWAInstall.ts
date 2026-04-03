'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
}

export function usePWAInstall() {
  const deferredPromptRef = useRef<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [canInstall, setCanInstall] = useState(false);

  useEffect(() => {
    const displayModeQuery = window.matchMedia('(display-mode: standalone)');

    const syncInstalledState = () => {
      const installed = displayModeQuery.matches;
      setIsInstalled(installed);
      if (installed) {
        deferredPromptRef.current = null;
        setCanInstall(false);
      }
    };

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      deferredPromptRef.current = event as BeforeInstallPromptEvent;
      setCanInstall(!displayModeQuery.matches);
    };

    syncInstalledState();

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    displayModeQuery.addEventListener('change', syncInstalledState);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      displayModeQuery.removeEventListener('change', syncInstalledState);
    };
  }, []);

  const installPWA = useCallback(async () => {
    const deferredPrompt = deferredPromptRef.current;
    if (!deferredPrompt || isInstalled) {
      return;
    }

    await deferredPrompt.prompt();
    const choiceResult = await deferredPrompt.userChoice;

    if (choiceResult.outcome === 'accepted') {
      deferredPromptRef.current = null;
      setCanInstall(false);
    }
  }, [isInstalled]);

  return {
    canInstall: canInstall && !isInstalled,
    installPWA,
  };
}
