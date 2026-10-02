import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ToastContext } from './toastContext.js';
import './Toast.css';

const AUTO_DISMISS_MS = 3500;

export function ToastProvider({ children }) {
    const [toasts, setToasts] = useState([]);
    const timeoutIdsRef = useRef(new Set());

    useEffect(() => {
        const ids = timeoutIdsRef.current;
        return () => {
            ids.forEach(id => clearTimeout(id));
            ids.clear();
        };
    }, []);

    const showToast = useCallback((toast) => {
        const id = crypto.randomUUID();
        setToasts(t => [...t, { id, ...toast }]);
        const timeoutId = setTimeout(() => {
            timeoutIdsRef.current.delete(timeoutId);
            setToasts(t => t.filter(item => item.id !== id));
        }, AUTO_DISMISS_MS);
        timeoutIdsRef.current.add(timeoutId);
    }, []);

    const contextValue = useMemo(() => ({ showToast }), [showToast]);

    return (
        <ToastContext.Provider value={contextValue}>
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
