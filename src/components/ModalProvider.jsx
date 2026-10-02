import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Button from './Button.jsx';
import { ModalContext } from './modalContext.js';
import './Modal.css';

export function ModalProvider({ children }) {
    const [request, setRequest] = useState(null);
    const [inputValue, setInputValue] = useState('');

    const alert = useCallback((message, opts = {}) => {
        return new Promise((resolve) => {
            setInputValue('');
            setRequest({
                type: 'alert',
                title: opts.title || 'Мэдэгдэл',
                message,
                resolve: () => resolve(undefined),
            });
        });
    }, []);

    const confirm = useCallback((message, opts = {}) => {
        return new Promise((resolve) => {
            setInputValue('');
            setRequest({
                type: 'confirm',
                title: opts.title || 'Баталгаажуулах',
                message,
                resolve,
            });
        });
    }, []);

    const prompt = useCallback((message, defaultValue = '', opts = {}) => {
        return new Promise((resolve) => {
            setInputValue(defaultValue);
            setRequest({
                type: 'prompt',
                title: opts.title || 'Оруулах',
                message,
                resolve,
            });
        });
    }, []);

    const close = (result) => {
        if (!request) return;
        request.resolve(result);
        setRequest(null);
    };

    const modalBoxRef = useRef(null);
    const previouslyFocusedRef = useRef(null);

    useEffect(() => {
        if (!request) return;
        const onKeyDown = (e) => {
            if (e.key === 'Escape') {
                close(request.type === 'alert' ? undefined : request.type === 'prompt' ? null : false);
                return;
            }
            if (e.key !== 'Tab') return;
            const box = modalBoxRef.current;
            if (!box) return;
            const focusable = box.querySelectorAll('button, input, [tabindex]:not([tabindex="-1"])');
            if (focusable.length === 0) return;
            const first = focusable[0];
            const last = focusable[focusable.length - 1];
            if (e.shiftKey && document.activeElement === first) {
                e.preventDefault();
                last.focus();
            } else if (!e.shiftKey && document.activeElement === last) {
                e.preventDefault();
                first.focus();
            }
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [request]);

    useEffect(() => {
        if (request) {
            previouslyFocusedRef.current = document.activeElement;
        } else if (previouslyFocusedRef.current) {
            previouslyFocusedRef.current.focus?.();
            previouslyFocusedRef.current = null;
        }
    }, [request]);

    const contextValue = useMemo(() => ({ alert, confirm, prompt }), [alert, confirm, prompt]);

    return (
        <ModalContext.Provider value={contextValue}>
            {children}
            {request && (
                <div className="modal-overlay" role="presentation" onClick={() => close(request.type === 'alert' ? undefined : false)}>
                    <div ref={modalBoxRef} className="modal-box" role="dialog" aria-modal="true" aria-labelledby="modal-title" onClick={(e) => e.stopPropagation()}>
                        <h3 id="modal-title" className="modal-title">{request.title}</h3>
                        <p className="modal-message">{request.message}</p>

                        {request.type === 'prompt' && (
                            <input
                                className="modal-input"
                                autoFocus
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && close(inputValue)}
                            />
                        )}

                        <div className="modal-actions">
                            {request.type === 'alert' && (
                                <Button onClick={() => close(undefined)} autoFocus>OK</Button>
                            )}
                            {request.type === 'confirm' && (
                                <>
                                    <Button variant="ghost" onClick={() => close(false)}>Цуцлах</Button>
                                    <Button variant="danger" onClick={() => close(true)}>Тийм</Button>
                                </>
                            )}
                            {request.type === 'prompt' && (
                                <>
                                    <Button variant="ghost" onClick={() => close(null)}>Цуцлах</Button>
                                    <Button onClick={() => close(inputValue)}>Хадгалах</Button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </ModalContext.Provider>
    );
}
