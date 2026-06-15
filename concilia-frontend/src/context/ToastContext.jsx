import React, { createContext, useContext, useState, useCallback, useRef, useMemo } from 'react';

const ToastContext = createContext(null);

let toastIdCounter = 0;

export const ToastProvider = ({ children }) => {
    const [toasts, setToasts] = useState([]);
    const timersRef = useRef({});

    const removeToast = useCallback((id) => {
        clearTimeout(timersRef.current[id]);
        delete timersRef.current[id];
        setToasts((prev) => prev.filter((t) => t.id !== id));
    }, []);

    const addToast = useCallback((message, type = 'success', duration = 4000) => {
        const id = ++toastIdCounter;
        setToasts((prev) => [...prev, { id, message, type }]);
        if (duration > 0) {
            timersRef.current[id] = setTimeout(() => removeToast(id), duration);
        }
        return id;
    }, [removeToast]);

    const toast = useMemo(() => ({
        success: (msg, dur) => addToast(msg, 'success', dur),
        error:   (msg, dur) => addToast(msg, 'error', dur || 6000),
        warning: (msg, dur) => addToast(msg, 'warning', dur || 5000),
        info:    (msg, dur) => addToast(msg, 'info', dur),
    }), [addToast]);

    return (
        <ToastContext.Provider value={{ toast, toasts, removeToast }}>
            {children}
        </ToastContext.Provider>
    );
};

export const useToast = () => {
    const ctx = useContext(ToastContext);
    if (!ctx) throw new Error('useToast must be used within ToastProvider');
    return ctx.toast;
};

export const useToastState = () => {
    const ctx = useContext(ToastContext);
    if (!ctx) throw new Error('useToastState must be used within ToastProvider');
    return { toasts: ctx.toasts, removeToast: ctx.removeToast };
};
