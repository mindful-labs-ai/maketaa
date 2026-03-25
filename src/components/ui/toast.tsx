'use client';

import { useState, useEffect } from 'react';
import { Info, AlertTriangle, XCircle, CheckCircle, X } from 'lucide-react';
import { useToastStore, type Toast } from '@/lib/shared/useToastStore';
import { cn } from '@/lib/shared/utils';

const variantConfig = {
  info: {
    icon: Info,
    color: '#60A5FA',
  },
  warning: {
    icon: AlertTriangle,
    color: '#FBBF24',
  },
  error: {
    icon: XCircle,
    color: '#F87171',
  },
  success: {
    icon: CheckCircle,
    color: '#34D399',
  },
} as const;

function ToastItem({ toast }: { toast: Toast }) {
  const removeToast = useToastStore(s => s.removeToast);
  const [visible, setVisible] = useState(false);

  const { icon: Icon, color } = variantConfig[toast.type];

  useEffect(() => {
    // Trigger enter animation
    const enterTimer = setTimeout(() => setVisible(true), 10);
    // Trigger exit animation before removal
    const exitTimer = setTimeout(() => setVisible(false), 4700);
    return () => {
      clearTimeout(enterTimer);
      clearTimeout(exitTimer);
    };
  }, [toast.id]);

  return (
    <div
      role='alert'
      style={{
        transition: 'opacity 300ms ease, transform 300ms ease',
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(12px)',
        maxWidth: '380px',
        width: '380px',
        background: 'var(--surface-2)',
        border: '1px solid rgba(42,42,58,0.4)',
        borderRadius: '12px',
        padding: '16px',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '12px',
      }}
    >
      {/* Colored icon */}
      <Icon
        size={20}
        style={{ color, flexShrink: 0, marginTop: '1px' }}
        aria-hidden='true'
      />

      {/* Text content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p
          style={{
            color: 'var(--text-primary)',
            fontWeight: 600,
            fontSize: '14px',
            lineHeight: '20px',
            margin: 0,
          }}
        >
          {toast.title}
        </p>
        {toast.message && (
          <p
            style={{
              color: 'var(--text-secondary)',
              fontSize: '13px',
              lineHeight: '18px',
              margin: '2px 0 0',
            }}
          >
            {toast.message}
          </p>
        )}
      </div>

      {/* Close button */}
      <button
        type='button'
        onClick={() => removeToast(toast.id)}
        aria-label='닫기'
        className={cn(
          'shrink-0 rounded-md p-0.5',
          'text-[var(--text-secondary)] hover:text-[var(--text-primary)]',
          'transition-colors'
        )}
      >
        <X size={16} />
      </button>
    </div>
  );
}

export function ToastContainer() {
  const toasts = useToastStore(s => s.toasts);

  return (
    <div
      aria-live='polite'
      aria-label='알림'
      style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        pointerEvents: toasts.length === 0 ? 'none' : 'auto',
      }}
    >
      {toasts.map(toast => (
        <ToastItem key={toast.id} toast={toast} />
      ))}
    </div>
  );
}
