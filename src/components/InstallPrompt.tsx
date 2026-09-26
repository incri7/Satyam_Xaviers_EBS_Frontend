import React, { useEffect, useState } from 'react';
import { Download, X, Smartphone } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';

const DISMISS_KEY = 'sx_install_prompt_dismissed';

/**
 * "Install the app" banner shown after login (client ask 2026-07-10:
 * install on first login for easy access to the browser-based app).
 *
 * Uses the browser's beforeinstallprompt event (Chrome/Edge/Android).
 * On iOS Safari there is no programmatic install — we show a hint instead.
 */
export const InstallPrompt: React.FC = () => {
    const { isAuthenticated } = useAuthStore();
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
    const [showIosHint, setShowIosHint] = useState(false);
    const [dismissed, setDismissed] = useState(() => localStorage.getItem(DISMISS_KEY) === '1');

    const isStandalone =
        window.matchMedia('(display-mode: standalone)').matches ||
        (navigator as any).standalone === true;

    useEffect(() => {
        const handler = (e: Event) => {
            e.preventDefault();
            setDeferredPrompt(e);
        };
        window.addEventListener('beforeinstallprompt', handler);

        // iOS Safari: no beforeinstallprompt — show a manual hint
        const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
        if (isIos && !isStandalone) setShowIosHint(true);

        return () => window.removeEventListener('beforeinstallprompt', handler);
    }, [isStandalone]);

    const dismiss = () => {
        localStorage.setItem(DISMISS_KEY, '1');
        setDismissed(true);
    };

    const install = async () => {
        if (!deferredPrompt) return;
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') setDeferredPrompt(null);
        dismiss();
    };

    if (!isAuthenticated || isStandalone || dismissed) return null;
    if (!deferredPrompt && !showIosHint) return null;

    return (
        <div data-floating-bottom className="fixed bottom-4 left-4 right-4 md:left-auto md:right-6 md:max-w-sm z-[90]">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl p-4 flex items-start gap-3">
                <div className="w-10 h-10 bg-brand/10 rounded-xl flex items-center justify-center text-brand shrink-0">
                    <Smartphone className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                    <p className="font-bold text-slate-900 text-sm">Install Satyam Xavier's EBS</p>
                    {deferredPrompt ? (
                        <p className="text-xs text-slate-500 font-medium mt-0.5">
                            Add the app to your home screen for one-tap access.
                        </p>
                    ) : (
                        <p className="text-xs text-slate-500 font-medium mt-0.5">
                            Tap the Share button, then "Add to Home Screen".
                        </p>
                    )}
                    {deferredPrompt && (
                        <button
                            onClick={install}
                            className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 bg-brand text-white text-xs font-bold rounded-xl hover:opacity-95 transition-all"
                        >
                            <Download className="w-3.5 h-3.5" />
                            Install App
                        </button>
                    )}
                </div>
                <button onClick={dismiss} className="p-1.5 text-slate-300 hover:text-slate-500 transition-colors shrink-0">
                    <X className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
};
