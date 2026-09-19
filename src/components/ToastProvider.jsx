import { useCallback, useState } from 'react';
import { ToastContext } from './toastContext.js';
import './Toast.css';

const AUTO_DISMISS_MS = 3500;

export function ToastProvider({ children }) {
    const [toasts, setToasts] = useState([]);

    const showToast = useCallback((toast) => {
        const id = crypto.randomUUID();
        setToasts(t => [...t, { id, ...toast }]);
        setTimeout(() => {
            setToasts(t => t.filter(item => item.id !== id));
        }, AUTO_DISMISS_MS);
    }, []);

    return (
        <ToastContext.Provider value={{ showToast }}>
            {children}
            <div className="toast-stack" aria-live="polite">
                {toasts.map(t => (
                    <div key={t.id} className="toast">
                        <span className="toast-icon" aria-hidden="true">{t.icon || '🔔'}</span>
                        <div className="toast-body">
                            <strong>{t.title}</strong>
                            {t.message && <p>{t.message}</p>}
                        </div>
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
}
