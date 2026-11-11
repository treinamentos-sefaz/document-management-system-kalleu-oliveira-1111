import { useEffect } from 'react';
import Icon from './Icon.jsx';

const AUTO_DISMISS_MS = 4000;

export default function Toast({ toast, onClose }) {
  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(onClose, AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [toast, onClose]);

  if (!toast) return null;

  return (
    <div className={`toast toast--${toast.type}`} role="status" aria-live="polite">
      <Icon name={toast.type === 'success' ? 'check' : 'alert'} size={18} />
      <span>{toast.message}</span>
      <button type="button" className="toast__close" onClick={onClose} aria-label="Fechar aviso">
        <Icon name="close" size={16} />
      </button>
    </div>
  );
}
