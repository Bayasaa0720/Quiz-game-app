import { useEffect, useState } from 'react';
import Button from './Button.jsx';
import './InstallPrompt.css';

const DISMISS_KEY = 'quiz_install_dismissed_at';
const DISMISS_COOLDOWN_MS = 10 * 24 * 60 * 60 * 1000; // 10 хоног

function isStandalone() {
    if (typeof window === 'undefined') return false;
    return window.matchMedia?.('(display-mode: standalone)').matches
        || window.navigator.standalone === true; // iOS Safari
}

function wasRecentlyDismissed() {
    try {
        const raw = localStorage.getItem(DISMISS_KEY);
        if (!raw) return false;
        return Date.now() - Number(raw) < DISMISS_COOLDOWN_MS;
    } catch {
        return false;
    }
}

export default function InstallPrompt() {
    const [deferredPrompt, setDeferredPrompt] = useState(null);
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        if (isStandalone() || wasRecentlyDismissed()) return;

        const onBeforeInstall = (e) => {
            e.preventDefault();
            setDeferredPrompt(e);
            setVisible(true);
        };
        window.addEventListener('beforeinstallprompt', onBeforeInstall);
        return () => window.removeEventListener('beforeinstallprompt', onBeforeInstall);
    }, []);

    const dismiss = () => {
        setVisible(false);
        try {
            localStorage.setItem(DISMISS_KEY, String(Date.now()));
        } catch {
            // localStorage unavailable — just hide for this session.
        }
    };

    const install = async () => {
        if (!deferredPrompt) return;
        setVisible(false);
        deferredPrompt.prompt();
        try {
            await deferredPrompt.userChoice;
        } catch {
            // Ignore — nothing actionable either way.
        }
        setDeferredPrompt(null);
    };

    if (!visible) return null;

    return (
        <div className="install-prompt" role="dialog" aria-label="Апп суулгах урилга">
            <div className="install-prompt-text">
                <strong>Tower Climb-ийг гар утсандаа суулгах уу?</strong>
                <span>Нэг товшилтоор нээгдэж, offline-д ч ажиллана.</span>
            </div>
            <div className="install-prompt-actions">
                <Button onClick={install}>Суулгах</Button>
                <Button variant="ghost" onClick={dismiss}>Үгүй</Button>
            </div>
        </div>
    );
}
