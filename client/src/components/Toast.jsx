import { useCallback, useRef, useState } from 'react';
import { ToastContext } from './ToastContext';


let idCounter = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timers = useRef({});

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    clearTimeout(timers.current[id]);
    delete timers.current[id];
  }, []);

  const push = useCallback(
    (message, type = 'info', duration = 4000) => {
      const id = ++idCounter;
      setToasts((prev) => [...prev, { id, message, type }]);
      timers.current[id] = setTimeout(() => dismiss(id), duration);
      return id;
    },
    [dismiss],
  );

  const toast = {
    success: (msg) => push(msg, 'success'),
    error: (msg) => push(msg, 'error'),
    info: (msg) => push(msg, 'info'),
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 w-80 max-w-[calc(100vw-2rem)]">
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onDismiss={() => dismiss(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastItem({ toast, onDismiss }) {
  const styles = {
    success: 'bg-emerald-600/90 border-emerald-400/40',
    error: 'bg-rose-600/90 border-rose-400/40',
    info: 'bg-slate-700/90 border-slate-500/40',
  };

  const icons = {
    success: '✓',
    error: '✕',
    info: 'ℹ',
  };

  return (
    <div
      role="alert"
      className={`flex items-start gap-3 rounded-lg border px-4 py-3 shadow-lg backdrop-blur text-white text-sm animate-[fadeIn_0.15s_ease-out] ${styles[toast.type]}`}
    >
      <span className="font-bold leading-5">{icons[toast.type]}</span>
      <p className="flex-1 leading-5">{toast.message}</p>
      <button
        onClick={onDismiss}
        className="text-white/70 hover:text-white transition-colors leading-5"
        aria-label="Dismiss notification"
      >
        ✕
      </button>
    </div>
  );
}
