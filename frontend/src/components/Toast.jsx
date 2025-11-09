import { useState, useEffect } from 'react';

let addToastHandler;

export function ToastManager() {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    addToastHandler = (toast) => {
      const id = Date.now();
      setToasts((prev) => [...prev, { id, ...toast }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 4000);
    };
  }, []);

  return (
    <div className="toast-container">
      {toasts.map((t) => (
        <div key={t.id} className={`toast ${t.type}`}>
          <p>{t.message}</p>
        </div>
      ))}
    </div>
  );
}

export const toast = {
  success: (msg) => addToastHandler({ type: 'success', message: msg }),
  error: (msg) => addToastHandler({ type: 'error', message: msg }),
  info: (msg) => addToastHandler({ type: 'info', message: msg }),
  warn: (msg) => addToastHandler({ type: 'warn', message: msg }),
};
