import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';

const ConfirmContext = createContext(null);

export function ConfirmProvider({ children }) {
  const [dialog, setDialog] = useState(null);

  const confirm = useCallback(
    ({
      title = 'Are you sure?',
      message = '',
      confirmText = 'Confirm',
      cancelText = 'Cancel',
      variant = 'danger',
    } = {}) =>
      new Promise((resolve) => {
        setDialog({
          title,
          message,
          confirmText,
          cancelText,
          variant,
          resolve,
        });
      }),
    []
  );

  const handleClose = useCallback(
    (result) => {
      setDialog((prev) => {
        if (prev?.resolve) prev.resolve(result);
        return null;
      });
    },
    []
  );

  useEffect(() => {
    if (!dialog) return;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') handleClose(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [dialog, handleClose]);

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {dialog && (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm"
          onClick={() => handleClose(false)}
        >
          <div
            className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-6 py-4">
              <div className="flex items-center gap-3">
                <div
                  className={`rounded-xl p-2 ${
                    dialog.variant === 'warning'
                      ? 'bg-amber-50 text-amber-600'
                      : 'bg-rose-50 text-rose-600'
                  }`}
                >
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <h3 className="text-base font-bold text-slate-900">
                  {dialog.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => handleClose(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="px-6 py-4">
              <p className="text-sm leading-relaxed text-slate-600">
                {dialog.message}
              </p>
            </div>

            <div className="flex items-center justify-end gap-2.5 border-t border-slate-100 bg-slate-50/70 px-6 py-3.5">
              <button
                type="button"
                onClick={() => handleClose(false)}
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                {dialog.cancelText}
              </button>
              <button
                type="button"
                onClick={() => handleClose(true)}
                className={`rounded-xl px-4 py-2 text-xs font-semibold text-white shadow-sm ${
                  dialog.variant === 'warning'
                    ? 'bg-amber-600 hover:bg-amber-700'
                    : 'bg-rose-600 hover:bg-rose-700'
                }`}
              >
                {dialog.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) {
    return async ({ message }) => window.confirm(message);
  }
  return ctx;
}
