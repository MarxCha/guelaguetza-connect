import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { CheckCircle, XCircle, AlertCircle, Info, X, Loader2 } from 'lucide-react';

type ToastType = 'success' | 'error' | 'warning' | 'info' | 'loading';
type ToastPosition = 'top' | 'bottom' | 'top-right' | 'bottom-right';

interface ToastAction {
  label: string;
  onClick: () => void;
}

interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
  action?: ToastAction;
  dismissible?: boolean;
  showProgress?: boolean;
}

interface ToastContextType {
  showToast: (toast: Omit<Toast, 'id'>) => string;
  success: (title: string, message?: string, options?: Partial<Toast>) => string;
  error: (title: string, message?: string, options?: Partial<Toast>) => string;
  warning: (title: string, message?: string, options?: Partial<Toast>) => string;
  info: (title: string, message?: string, options?: Partial<Toast>) => string;
  loading: (title: string, message?: string) => string;
  dismiss: (id: string) => void;
  dismissAll: () => void;
  update: (id: string, toast: Partial<Omit<Toast, 'id'>>) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

const icons: Record<ToastType, React.ReactNode> = {
  success: <CheckCircle className="w-5 h-5 text-green-500" />,
  error: <XCircle className="w-5 h-5 text-red-500" />,
  warning: <AlertCircle className="w-5 h-5 text-oaxaca-yellow" />,
  info: <Info className="w-5 h-5 text-oaxaca-sky" />,
  loading: <Loader2 className="w-5 h-5 text-oaxaca-pink animate-spin" />,
};

const bgColors: Record<ToastType, string> = {
  success: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800',
  error: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800',
  warning: 'bg-oaxaca-yellow-light dark:bg-oaxaca-yellow/20 border-oaxaca-yellow/30 dark:border-oaxaca-yellow/30',
  info: 'bg-oaxaca-sky-light dark:bg-oaxaca-sky/20 border-oaxaca-sky/30 dark:border-oaxaca-sky/30',
  loading: 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700',
};

const progressColors: Record<ToastType, string> = {
  success: 'bg-green-500',
  error: 'bg-red-500',
  warning: 'bg-oaxaca-yellow',
  info: 'bg-oaxaca-sky',
  loading: 'bg-oaxaca-pink',
};

// Haptic feedback utility
const triggerHaptic = (type: 'light' | 'medium' | 'heavy' = 'light') => {
  if ('vibrate' in navigator) {
    const patterns = { light: 10, medium: 20, heavy: 30 };
    navigator.vibrate(patterns[type]);
  }
};

// Individual Toast Item Component with progress bar
const ToastItem: React.FC<{
  toast: Toast;
  onDismiss: (id: string) => void;
  index: number;
}> = ({ toast, onDismiss, index }) => {
  const [progress, setProgress] = useState(100);
  const [isExiting, setIsExiting] = useState(false);
  const startTimeRef = useRef(Date.now());
  const duration = toast.duration ?? 4000;

  useEffect(() => {
    if (toast.type === 'loading' || duration <= 0) return;

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      const remaining = Math.max(0, 100 - (elapsed / duration) * 100);
      setProgress(remaining);

      if (remaining <= 0) {
        clearInterval(interval);
      }
    }, 50);

    return () => clearInterval(interval);
  }, [duration, toast.type]);

  const handleDismiss = () => {
    setIsExiting(true);
    setTimeout(() => onDismiss(toast.id), 200);
  };

  return (
    <div
      className={`pointer-events-auto p-4 rounded-xl border shadow-lg ${bgColors[toast.type]} transition-all duration-200 ${
        isExiting ? 'opacity-0 translate-x-4' : 'opacity-100 translate-x-0'
      }`}
      style={{
        animation: `slideInRight 0.3s ease-out ${index * 50}ms both`,
      }}
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">
          {icons[toast.type]}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-gray-900 dark:text-gray-100">
            {toast.title}
          </p>
          {toast.message && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
              {toast.message}
            </p>
          )}
          {toast.action && (
            <button
              onClick={() => {
                toast.action?.onClick();
                handleDismiss();
              }}
              className="mt-2 text-sm font-medium text-oaxaca-pink hover:text-oaxaca-purple transition-colors"
            >
              {toast.action.label}
            </button>
          )}
        </div>
        {(toast.dismissible !== false && toast.type !== 'loading') && (
          <button
            onClick={handleDismiss}
            className="flex-shrink-0 p-1 hover:bg-black/5 dark:hover:bg-white/10 rounded-full transition"
          >
            <X className="w-4 h-4 text-gray-400" />
          </button>
        )}
      </div>

      {/* Progress bar */}
      {toast.showProgress !== false && toast.type !== 'loading' && duration > 0 && (
        <div className="mt-3 h-1 bg-black/10 dark:bg-white/10 rounded-full overflow-hidden">
          <div
            className={`h-full ${progressColors[toast.type]} transition-all duration-100 ease-linear`}
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </div>
  );
};

export const ToastProvider: React.FC<{ children: React.ReactNode; position?: ToastPosition }> = ({
  children,
  position = 'bottom'
}) => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timeoutsRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  const dismiss = useCallback((id: string) => {
    const timeout = timeoutsRef.current.get(id);
    if (timeout) {
      clearTimeout(timeout);
      timeoutsRef.current.delete(id);
    }
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const dismissAll = useCallback(() => {
    timeoutsRef.current.forEach(timeout => clearTimeout(timeout));
    timeoutsRef.current.clear();
    setToasts([]);
  }, []);

  const update = useCallback((id: string, updates: Partial<Omit<Toast, 'id'>>) => {
    setToasts(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));

    // If updating to a non-loading type, set auto-dismiss
    if (updates.type && updates.type !== 'loading') {
      const duration = updates.duration ?? 4000;
      if (duration > 0) {
        const existingTimeout = timeoutsRef.current.get(id);
        if (existingTimeout) clearTimeout(existingTimeout);

        const timeout = setTimeout(() => dismiss(id), duration);
        timeoutsRef.current.set(id, timeout);
      }
    }
  }, [dismiss]);

  const showToast = useCallback((toast: Omit<Toast, 'id'>): string => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const duration = toast.type === 'loading' ? 0 : (toast.duration ?? 4000);

    // Trigger haptic feedback
    if (toast.type === 'success') triggerHaptic('light');
    else if (toast.type === 'error') triggerHaptic('medium');
    else if (toast.type === 'warning') triggerHaptic('light');

    setToasts(prev => {
      // Limit to 5 toasts max
      const newToasts = prev.length >= 5 ? prev.slice(1) : prev;
      return [...newToasts, { ...toast, id, duration }];
    });

    if (duration > 0) {
      const timeout = setTimeout(() => dismiss(id), duration);
      timeoutsRef.current.set(id, timeout);
    }

    return id;
  }, [dismiss]);

  const success = useCallback((title: string, message?: string, options?: Partial<Toast>): string => {
    return showToast({ type: 'success', title, message, ...options });
  }, [showToast]);

  const error = useCallback((title: string, message?: string, options?: Partial<Toast>): string => {
    return showToast({ type: 'error', title, message, duration: 6000, ...options });
  }, [showToast]);

  const warning = useCallback((title: string, message?: string, options?: Partial<Toast>): string => {
    return showToast({ type: 'warning', title, message, ...options });
  }, [showToast]);

  const info = useCallback((title: string, message?: string, options?: Partial<Toast>): string => {
    return showToast({ type: 'info', title, message, ...options });
  }, [showToast]);

  const loading = useCallback((title: string, message?: string): string => {
    return showToast({ type: 'loading', title, message, duration: 0, dismissible: false });
  }, [showToast]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      timeoutsRef.current.forEach(timeout => clearTimeout(timeout));
    };
  }, []);

  const positionClasses = {
    'top': 'top-4 left-4 right-4 md:left-auto md:right-4 md:w-96',
    'bottom': 'bottom-20 md:bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96',
    'top-right': 'top-4 right-4 w-96',
    'bottom-right': 'bottom-4 right-4 w-96',
  };

  return (
    <ToastContext.Provider value={{ showToast, success, error, warning, info, loading, dismiss, dismissAll, update }}>
      {children}

      {/* Toast Container */}
      <div className={`fixed ${positionClasses[position]} z-50 space-y-2 pointer-events-none`}>
        {toasts.map((toast, index) => (
          <ToastItem
            key={toast.id}
            toast={toast}
            onDismiss={dismiss}
            index={index}
          />
        ))}
      </div>

      {/* Keyframe animation for slide in */}
      <style>{`
        @keyframes slideInRight {
          from {
            opacity: 0;
            transform: translateX(100%);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
      `}</style>
    </ToastContext.Provider>
  );
};

// Promise-based toast for async operations
export const toast = {
  promise: async <T,>(
    promise: Promise<T>,
    messages: {
      loading: string;
      success: string | ((data: T) => string);
      error: string | ((err: unknown) => string);
    },
    toastFn: ToastContextType
  ): Promise<T> => {
    const id = toastFn.loading(messages.loading);

    try {
      const result = await promise;
      toastFn.update(id, {
        type: 'success',
        title: typeof messages.success === 'function' ? messages.success(result) : messages.success,
      });
      return result;
    } catch (err) {
      toastFn.update(id, {
        type: 'error',
        title: typeof messages.error === 'function' ? messages.error(err) : messages.error,
      });
      throw err;
    }
  },
};

// ============================================
// Notification Banner Component
// ============================================

interface NotificationBannerProps {
  type?: 'info' | 'success' | 'warning' | 'error';
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  dismissible?: boolean;
  onDismiss?: () => void;
  className?: string;
}

export const NotificationBanner: React.FC<NotificationBannerProps> = ({
  type = 'info',
  title,
  description,
  action,
  dismissible = true,
  onDismiss,
  className = '',
}) => {
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible) return null;

  const colors: Record<string, string> = {
    info: 'bg-oaxaca-sky-light dark:bg-oaxaca-sky/20 border-oaxaca-sky/30 dark:border-oaxaca-sky/30 text-oaxaca-sky dark:text-oaxaca-sky',
    success: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-800 dark:text-green-200',
    warning: 'bg-oaxaca-yellow-light dark:bg-oaxaca-yellow/20 border-oaxaca-yellow/30 dark:border-oaxaca-yellow/30 text-oaxaca-yellow dark:text-oaxaca-yellow',
    error: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200',
  };

  const bannerIcons: Record<string, React.ReactNode> = {
    info: <Info size={20} />,
    success: <CheckCircle size={20} />,
    warning: <AlertCircle size={20} />,
    error: <XCircle size={20} />,
  };

  const handleDismiss = () => {
    setIsVisible(false);
    onDismiss?.();
  };

  return (
    <div className={`flex items-start gap-3 p-4 rounded-xl border ${colors[type]} ${className}`}>
      <span className="flex-shrink-0 mt-0.5">{bannerIcons[type]}</span>

      <div className="flex-1">
        <p className="font-medium">{title}</p>
        {description && <p className="mt-1 text-sm opacity-80">{description}</p>}
        {action && (
          <button
            onClick={action.onClick}
            className="mt-2 text-sm font-medium underline underline-offset-2 hover:no-underline"
          >
            {action.label}
          </button>
        )}
      </div>

      {dismissible && (
        <button onClick={handleDismiss} className="flex-shrink-0 p-1 rounded hover:bg-black/5 transition-colors">
          <X size={16} />
        </button>
      )}
    </div>
  );
};

// ============================================
// Snackbar Component
// ============================================

interface SnackbarProps {
  isOpen: boolean;
  onClose: () => void;
  message: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  duration?: number;
  position?: 'top' | 'bottom';
}

export const Snackbar: React.FC<SnackbarProps> = ({
  isOpen,
  onClose,
  message,
  action,
  duration = 5000,
  position = 'bottom',
}) => {
  useEffect(() => {
    if (!isOpen || duration === 0) return;

    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [isOpen, duration, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className={`fixed left-1/2 -translate-x-1/2 z-50 ${
        position === 'top' ? 'top-4' : 'bottom-20 md:bottom-4'
      }`}
      style={{
        animation: position === 'top' ? 'slideInFromTop 0.3s ease-out' : 'slideInFromBottom 0.3s ease-out',
      }}
    >
      <div className="flex items-center gap-4 px-4 py-3 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded-xl shadow-lg">
        <span className="text-sm">{message}</span>
        {action && (
          <button
            onClick={() => {
              action.onClick();
              onClose();
            }}
            className="text-sm font-medium text-oaxaca-pink hover:text-oaxaca-pink/80"
          >
            {action.label}
          </button>
        )}
        <button onClick={onClose} className="p-1 rounded hover:bg-white/10 transition-colors">
          <X size={14} />
        </button>
      </div>

      <style>{`
        @keyframes slideInFromTop {
          from { opacity: 0; transform: translate(-50%, -100%); }
          to { opacity: 1; transform: translate(-50%, 0); }
        }
        @keyframes slideInFromBottom {
          from { opacity: 0; transform: translate(-50%, 100%); }
          to { opacity: 1; transform: translate(-50%, 0); }
        }
      `}</style>
    </div>
  );
};

// ============================================
// useSnackbar Hook
// ============================================

export const useSnackbar = () => {
  const [snackbar, setSnackbar] = useState<{
    isOpen: boolean;
    message: string;
    action?: { label: string; onClick: () => void };
  }>({ isOpen: false, message: '' });

  const show = useCallback((message: string, action?: { label: string; onClick: () => void }) => {
    setSnackbar({ isOpen: true, message, action });
    triggerHaptic('light');
  }, []);

  const hide = useCallback(() => {
    setSnackbar((prev) => ({ ...prev, isOpen: false }));
  }, []);

  const SnackbarComponent = (
    <Snackbar
      isOpen={snackbar.isOpen}
      onClose={hide}
      message={snackbar.message}
      action={snackbar.action}
    />
  );

  return { show, hide, Snackbar: SnackbarComponent };
};
