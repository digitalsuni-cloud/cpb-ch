import { useState, useCallback } from 'react';

let _idCounter = 0;

export function useToast() {
    const [toasts, setToasts] = useState([]);

    const showToast = useCallback(({ type = 'info', title, message, duration = 6000, action, dedupeKey } = {}) => {
        setToasts(prev => {
            // If a dedupeKey is provided and a toast with that key already exists, skip
            if (dedupeKey && prev.some(t => t.dedupeKey === dedupeKey)) return prev;
            const id = ++_idCounter;
            return [...prev, { id, type, title, message, duration, action, dedupeKey }];
        });
    }, []);

    const removeToast = useCallback((id) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    return { toasts, showToast, removeToast };
}
