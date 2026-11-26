import React, { createContext, useCallback, useContext, useState } from 'react';
import { CheckCircle2, AlertCircle, X } from 'lucide-react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((message, type = 'success', duration = 3500) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setToasts((prev) => [...prev, { id, message, type }]);
    if (duration > 0) {
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, duration);
    }
  }, []);

  const value = {
    success: (message, duration) => showToast(message, 'success', duration),
    error: (message, duration) => showToast(message, 'error', duration),
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed right-4 top-4 z-[100] flex w-full max-w-sm flex-col gap-2.5"
      >
        {toasts.map((toast) => {
          const isError = toast.type === 'error';
          return (
            <div
              key={toast.id}
              className={`pointer-events-auto flex items-start gap-3 rounded-xl border px-4 py-3 shadow-lg transition-all ${
                isError
                  ? 'border-rose-200 bg-rose-50 text-rose-900'
                  : 'border-emerald-200 bg-emerald-50 text-emerald-900'
              }`}
            >
              {isError ? (
                <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" />
              ) : (
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
              )}
              <div className="flex-1 text-sm font-medium leading-snug">{toast.message}</div>
              <button
                type="button"
                onClick={() => removeToast(toast.id)}
                className="rounded-lg p-0.5 text-slate-400 hover:bg-white/60 hover:text-slate-700"
                aria-label="Close notification"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    return {
      success: () => {},
      error: () => {},
    };
  }
  return ctx;
}
