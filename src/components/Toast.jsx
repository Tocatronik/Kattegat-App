import { createContext, useContext, useState, useCallback, useEffect } from 'react';

const ToastCtx = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const show = useCallback((message, opts = {}) => {
    const id = Date.now() + Math.random();
    const toast = {
      id,
      message,
      type: opts.type || 'info', // 'success' | 'error' | 'warning' | 'info'
      duration: opts.duration ?? 4000,
    };
    setToasts(prev => [...prev, toast]);
    if (toast.duration > 0) {
      setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), toast.duration);
    }
    return id;
  }, []);

  const dismiss = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const api = {
    show,
    dismiss,
    success: (msg, opts) => show(msg, { ...opts, type: 'success' }),
    error: (msg, opts) => show(msg, { ...opts, type: 'error', duration: opts?.duration ?? 6000 }),
    warning: (msg, opts) => show(msg, { ...opts, type: 'warning' }),
    info: (msg, opts) => show(msg, { ...opts, type: 'info' }),
  };

  return (
    <ToastCtx.Provider value={api}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </ToastCtx.Provider>
  );
}

function ToastContainer({ toasts, onDismiss }) {
  return (
    <div style={{
      position:'fixed', top:'env(safe-area-inset-top, 16px)', right:16,
      zIndex:9999, display:'flex', flexDirection:'column', gap:8,
      maxWidth:'calc(100vw - 32px)', pointerEvents:'none'
    }}>
      {toasts.map(t => <ToastItem key={t.id} toast={t} onDismiss={() => onDismiss(t.id)} />)}
    </div>
  );
}

const BG = {
  success: 'linear-gradient(135deg, #1F4837 0%, #2D6651 100%)',
  error: 'linear-gradient(135deg, #4A1F23 0%, #6B2B30 100%)',
  warning: 'linear-gradient(135deg, #4A371F 0%, #6B502B 100%)',
  info: 'linear-gradient(135deg, #1F2D3D 0%, #2C3E50 100%)',
};
const BORDER = {
  success: '#5DAA80', error: '#D4787A', warning: '#E8B055', info: '#9DA8B5',
};
const ICON = { success: '✓', error: '⚠', warning: '⚠', info: 'ℹ' };

function ToastItem({ toast, onDismiss }) {
  const [show, setShow] = useState(false);
  useEffect(() => { setShow(true); }, []);
  return (
    <div
      onClick={onDismiss}
      style={{
        background: BG[toast.type],
        border: `1px solid ${BORDER[toast.type]}40`,
        borderLeft: `3px solid ${BORDER[toast.type]}`,
        color: '#E5EAF0', padding:'12px 16px', borderRadius:10,
        fontSize:13, fontWeight:500, lineHeight:1.45,
        minWidth:240, maxWidth:380, pointerEvents:'auto', cursor:'pointer',
        boxShadow:'0 10px 30px rgba(0,0,0,0.35)',
        transform: show ? 'translateX(0)' : 'translateX(110%)',
        opacity: show ? 1 : 0,
        transition: 'transform 0.25s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.2s',
        display:'flex', gap:10, alignItems:'flex-start',
      }}
    >
      <span style={{fontSize:16, lineHeight:1.2, flexShrink:0, color: BORDER[toast.type]}}>{ICON[toast.type]}</span>
      <span style={{wordBreak:'break-word'}}>{toast.message}</span>
    </div>
  );
}

export function useToast() {
  const ctx = useContext(ToastCtx);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
