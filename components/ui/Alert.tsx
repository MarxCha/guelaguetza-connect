import React from 'react';

// ============================================
// Alert
// ============================================

interface AlertProps {
  type?: 'info' | 'success' | 'warning' | 'error';
  title?: string;
  children: React.ReactNode;
  icon?: React.ReactNode;
  showIcon?: boolean;
  dismissible?: boolean;
  onDismiss?: () => void;
  action?: {
    label: string;
    onClick: () => void;
  };
  variant?: 'filled' | 'outlined' | 'soft';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const alertIcons = {
  info: (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" />
    </svg>
  ),
  success: (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
    </svg>
  ),
  warning: (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
      <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z" />
    </svg>
  ),
  error: (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
    </svg>
  ),
};

const alertColors = {
  info: {
    filled: 'bg-oaxaca-sky text-white',
    outlined: 'border-2 border-oaxaca-sky text-oaxaca-sky dark:text-oaxaca-sky',
    soft: 'bg-oaxaca-sky-light dark:bg-oaxaca-sky/20 text-oaxaca-sky dark:text-oaxaca-sky border border-oaxaca-sky/30 dark:border-oaxaca-sky/30',
  },
  success: {
    filled: 'bg-green-500 text-white',
    outlined: 'border-2 border-green-500 text-green-700 dark:text-green-400',
    soft: 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800',
  },
  warning: {
    filled: 'bg-oaxaca-yellow text-white',
    outlined: 'border-2 border-oaxaca-yellow text-oaxaca-yellow dark:text-oaxaca-yellow',
    soft: 'bg-oaxaca-yellow-light dark:bg-oaxaca-yellow/20 text-oaxaca-yellow dark:text-oaxaca-yellow border border-oaxaca-yellow/30 dark:border-oaxaca-yellow/30',
  },
  error: {
    filled: 'bg-red-500 text-white',
    outlined: 'border-2 border-red-500 text-red-700 dark:text-red-400',
    soft: 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800',
  },
};

const alertSizes = {
  sm: 'px-3 py-2 text-sm',
  md: 'px-4 py-3 text-base',
  lg: 'px-5 py-4 text-lg',
};

export const Alert: React.FC<AlertProps> = ({
  type = 'info',
  title,
  children,
  icon,
  showIcon = true,
  dismissible = false,
  onDismiss,
  action,
  variant = 'soft',
  size = 'md',
  className = '',
}) => {
  const [isVisible, setIsVisible] = React.useState(true);

  const handleDismiss = () => {
    setIsVisible(false);
    onDismiss?.();
  };

  if (!isVisible) return null;

  return (
    <div
      role="alert"
      className={`
        ${alertColors[type][variant]}
        ${alertSizes[size]}
        rounded-xl flex items-start gap-3
        ${className}
      `}
    >
      {showIcon && (
        <span className="flex-shrink-0 mt-0.5">
          {icon || alertIcons[type]}
        </span>
      )}

      <div className="flex-1 min-w-0">
        {title && (
          <h4 className="font-semibold mb-1">{title}</h4>
        )}
        <div className={title ? 'text-sm opacity-90' : ''}>{children}</div>

        {action && (
          <button
            onClick={action.onClick}
            className="mt-2 font-medium underline underline-offset-2 hover:opacity-80"
          >
            {action.label}
          </button>
        )}
      </div>

      {dismissible && (
        <button
          onClick={handleDismiss}
          className="flex-shrink-0 p-1 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
          aria-label="Cerrar alerta"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
};

// ============================================
// Banner (Full-width Top/Bottom)
// ============================================

interface BannerProps {
  type?: 'info' | 'success' | 'warning' | 'error' | 'promo';
  children: React.ReactNode;
  icon?: React.ReactNode;
  action?: {
    label: string;
    onClick: () => void;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  dismissible?: boolean;
  onDismiss?: () => void;
  position?: 'top' | 'bottom';
  sticky?: boolean;
  className?: string;
}

const bannerColors = {
  info: 'bg-oaxaca-sky text-white',
  success: 'bg-green-600 text-white',
  warning: 'bg-oaxaca-yellow text-gray-900',
  error: 'bg-red-600 text-white',
  promo: 'bg-gradient-to-r from-oaxaca-pink to-oaxaca-earth text-white',
};

export const Banner: React.FC<BannerProps> = ({
  type = 'info',
  children,
  icon,
  action,
  secondaryAction,
  dismissible = true,
  onDismiss,
  position = 'top',
  sticky = false,
  className = '',
}) => {
  const [isVisible, setIsVisible] = React.useState(true);

  const handleDismiss = () => {
    setIsVisible(false);
    onDismiss?.();
  };

  if (!isVisible) return null;

  return (
    <div
      role="banner"
      className={`
        ${bannerColors[type]}
        ${sticky ? 'sticky z-40' : ''}
        ${position === 'top' ? 'top-0' : 'bottom-0'}
        px-4 py-3
        ${className}
      `}
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {icon && <span className="flex-shrink-0">{icon}</span>}
          <p className="text-sm font-medium">{children}</p>
        </div>

        <div className="flex items-center gap-3">
          {secondaryAction && (
            <button
              onClick={secondaryAction.onClick}
              className="text-sm font-medium underline underline-offset-2 hover:opacity-80"
            >
              {secondaryAction.label}
            </button>
          )}

          {action && (
            <button
              onClick={action.onClick}
              className={`
                px-4 py-1.5 rounded-lg text-sm font-semibold
                ${type === 'warning' ? 'bg-gray-900 text-white' : 'bg-white/20 hover:bg-white/30'}
                transition-colors
              `}
            >
              {action.label}
            </button>
          )}

          {dismissible && (
            <button
              onClick={handleDismiss}
              className="p-1 rounded-lg hover:bg-white/20 transition-colors"
              aria-label="Cerrar banner"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// ============================================
// Inline Alert / Callout
// ============================================

interface CalloutProps {
  type?: 'info' | 'tip' | 'warning' | 'danger' | 'note';
  title?: string;
  children: React.ReactNode;
  icon?: React.ReactNode;
  collapsible?: boolean;
  defaultExpanded?: boolean;
  className?: string;
}

const calloutColors = {
  info: {
    border: 'border-l-oaxaca-sky',
    bg: 'bg-oaxaca-sky-light dark:bg-oaxaca-sky/10',
    icon: 'text-oaxaca-sky',
  },
  tip: {
    border: 'border-l-green-500',
    bg: 'bg-green-50 dark:bg-green-900/10',
    icon: 'text-green-500',
  },
  warning: {
    border: 'border-l-oaxaca-yellow',
    bg: 'bg-oaxaca-yellow-light dark:bg-oaxaca-yellow/10',
    icon: 'text-oaxaca-yellow',
  },
  danger: {
    border: 'border-l-red-500',
    bg: 'bg-red-50 dark:bg-red-900/10',
    icon: 'text-red-500',
  },
  note: {
    border: 'border-l-gray-500',
    bg: 'bg-gray-50 dark:bg-gray-800',
    icon: 'text-gray-500',
  },
};

const calloutIcons = {
  info: (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" />
    </svg>
  ),
  tip: (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
      <path d="M9 21c0 .55.45 1 1 1h4c.55 0 1-.45 1-1v-1H9v1zm3-19C8.14 2 5 5.14 5 9c0 2.38 1.19 4.47 3 5.74V17c0 .55.45 1 1 1h6c.55 0 1-.45 1-1v-2.26c1.81-1.27 3-3.36 3-5.74 0-3.86-3.14-7-7-7z" />
    </svg>
  ),
  warning: (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
      <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z" />
    </svg>
  ),
  danger: (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
    </svg>
  ),
  note: (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
      <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z" />
    </svg>
  ),
};

export const Callout: React.FC<CalloutProps> = ({
  type = 'info',
  title,
  children,
  icon,
  collapsible = false,
  defaultExpanded = true,
  className = '',
}) => {
  const [isExpanded, setIsExpanded] = React.useState(defaultExpanded);

  return (
    <div
      className={`
        ${calloutColors[type].bg}
        ${calloutColors[type].border}
        border-l-4 rounded-r-xl overflow-hidden
        ${className}
      `}
    >
      {(title || collapsible) && (
        <button
          onClick={() => collapsible && setIsExpanded(!isExpanded)}
          disabled={!collapsible}
          className={`
            w-full px-4 py-3 flex items-center gap-3
            ${collapsible ? 'cursor-pointer hover:bg-black/5 dark:hover:bg-white/5' : ''}
          `}
        >
          <span className={`flex-shrink-0 ${calloutColors[type].icon}`}>
            {icon || calloutIcons[type]}
          </span>
          {title && (
            <span className="flex-1 text-left font-semibold text-gray-900 dark:text-white">
              {title}
            </span>
          )}
          {collapsible && (
            <svg
              className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          )}
        </button>
      )}

      {(!collapsible || isExpanded) && (
        <div className={`px-4 pb-4 ${title ? 'pt-0 pl-12' : 'pt-4'} text-gray-700 dark:text-gray-300`}>
          {!title && (
            <div className="flex items-start gap-3">
              <span className={`flex-shrink-0 ${calloutColors[type].icon}`}>
                {icon || calloutIcons[type]}
              </span>
              <div>{children}</div>
            </div>
          )}
          {title && children}
        </div>
      )}
    </div>
  );
};

// ============================================
// Empty State
// ============================================

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const defaultEmptyIcon = (
  <svg className="w-full h-full text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
  </svg>
);

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon = defaultEmptyIcon,
  title,
  description,
  action,
  secondaryAction,
  size = 'md',
  className = '',
}) => {
  const sizes = {
    sm: {
      icon: 'w-12 h-12',
      title: 'text-base',
      description: 'text-sm',
      padding: 'py-8',
    },
    md: {
      icon: 'w-16 h-16',
      title: 'text-lg',
      description: 'text-base',
      padding: 'py-12',
    },
    lg: {
      icon: 'w-20 h-20',
      title: 'text-xl',
      description: 'text-lg',
      padding: 'py-16',
    },
  };

  return (
    <div className={`text-center ${sizes[size].padding} ${className}`}>
      <div className={`${sizes[size].icon} mx-auto mb-4`}>
        {icon}
      </div>
      <h3 className={`${sizes[size].title} font-semibold text-gray-900 dark:text-white mb-2`}>
        {title}
      </h3>
      {description && (
        <p className={`${sizes[size].description} text-gray-500 dark:text-gray-400 mb-6 max-w-sm mx-auto`}>
          {description}
        </p>
      )}
      {(action || secondaryAction) && (
        <div className="flex items-center justify-center gap-3">
          {action && (
            <button
              onClick={action.onClick}
              className="px-6 py-2.5 bg-oaxaca-pink text-white rounded-xl font-medium hover:bg-oaxaca-pink/90 transition-colors"
            >
              {action.label}
            </button>
          )}
          {secondaryAction && (
            <button
              onClick={secondaryAction.onClick}
              className="px-6 py-2.5 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white font-medium transition-colors"
            >
              {secondaryAction.label}
            </button>
          )}
        </div>
      )}
    </div>
  );
};

// ============================================
// Error State
// ============================================

interface ErrorStateProps {
  title?: string;
  description?: string;
  error?: Error | string;
  showDetails?: boolean;
  onRetry?: () => void;
  onGoBack?: () => void;
  className?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Algo salió mal',
  description = 'Ha ocurrido un error inesperado. Por favor, intenta de nuevo.',
  error,
  showDetails = false,
  onRetry,
  onGoBack,
  className = '',
}) => {
  const [showError, setShowError] = React.useState(false);
  const errorMessage = error instanceof Error ? error.message : error;

  return (
    <div className={`text-center py-12 ${className}`}>
      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
        <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      </div>

      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
        {title}
      </h3>
      <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-sm mx-auto">
        {description}
      </p>

      <div className="flex items-center justify-center gap-3">
        {onRetry && (
          <button
            onClick={onRetry}
            className="px-6 py-2.5 bg-oaxaca-pink text-white rounded-xl font-medium hover:bg-oaxaca-pink/90 transition-colors flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Reintentar
          </button>
        )}
        {onGoBack && (
          <button
            onClick={onGoBack}
            className="px-6 py-2.5 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white font-medium transition-colors"
          >
            Volver
          </button>
        )}
      </div>

      {showDetails && errorMessage && (
        <div className="mt-6">
          <button
            onClick={() => setShowError(!showError)}
            className="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 underline"
          >
            {showError ? 'Ocultar detalles' : 'Ver detalles del error'}
          </button>
          {showError && (
            <pre className="mt-2 p-4 bg-gray-100 dark:bg-gray-800 rounded-xl text-left text-xs text-red-600 dark:text-red-400 overflow-x-auto max-w-lg mx-auto">
              {errorMessage}
            </pre>
          )}
        </div>
      )}
    </div>
  );
};

// ============================================
// Offline Banner
// ============================================

interface OfflineBannerProps {
  message?: string;
  onRetry?: () => void;
  className?: string;
}

export const OfflineBanner: React.FC<OfflineBannerProps> = ({
  message = 'Sin conexión a internet',
  onRetry,
  className = '',
}) => {
  return (
    <div className={`bg-gray-900 text-white px-4 py-2 flex items-center justify-center gap-3 ${className}`}>
      <svg className="w-5 h-5 text-oaxaca-yellow" fill="currentColor" viewBox="0 0 24 24">
        <path d="M23.64 7c-.45-.34-4.93-4-11.64-4-1.5 0-2.89.19-4.15.48L18.18 13.8 23.64 7zM17.04 15.22L3.27 1.44 2 2.72l2.05 2.06C1.91 5.76.59 6.82.36 7l11.63 14.49.01.01.01-.01 3.9-4.86 3.32 3.32 1.27-1.27-3.46-3.46z" />
      </svg>
      <span className="text-sm font-medium">{message}</span>
      {onRetry && (
        <button
          onClick={onRetry}
          className="text-sm font-medium underline underline-offset-2 hover:opacity-80"
        >
          Reintentar
        </button>
      )}
    </div>
  );
};

// ============================================
// Maintenance Banner
// ============================================

interface MaintenanceBannerProps {
  title?: string;
  message?: string;
  estimatedTime?: string;
  className?: string;
}

export const MaintenanceBanner: React.FC<MaintenanceBannerProps> = ({
  title = 'Mantenimiento programado',
  message = 'Estamos realizando mejoras en el sistema.',
  estimatedTime,
  className = '',
}) => {
  return (
    <div className={`bg-gradient-to-r from-oaxaca-yellow to-oaxaca-yellow text-white ${className}`}>
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex items-center justify-center gap-3">
          <svg className="w-6 h-6 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
            <path d="M22.7 19l-9.1-9.1c.9-2.3.4-5-1.5-6.9-2-2-5-2.4-7.4-1.3L9 6 6 9 1.6 4.7C.4 7.1.9 10.1 2.9 12.1c1.9 1.9 4.6 2.4 6.9 1.5l9.1 9.1c.4.4 1 .4 1.4 0l2.3-2.3c.5-.4.5-1.1.1-1.4z" />
          </svg>
          <div className="text-center">
            <p className="font-semibold">{title}</p>
            <p className="text-sm opacity-90">
              {message}
              {estimatedTime && ` Tiempo estimado: ${estimatedTime}`}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================
// Feature Announcement
// ============================================

interface FeatureAnnouncementProps {
  badge?: string;
  title: string;
  description: string;
  image?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  dismissible?: boolean;
  onDismiss?: () => void;
  className?: string;
}

export const FeatureAnnouncement: React.FC<FeatureAnnouncementProps> = ({
  badge = 'Nuevo',
  title,
  description,
  image,
  action,
  dismissible = true,
  onDismiss,
  className = '',
}) => {
  const [isVisible, setIsVisible] = React.useState(true);

  const handleDismiss = () => {
    setIsVisible(false);
    onDismiss?.();
  };

  if (!isVisible) return null;

  return (
    <div className={`bg-gradient-to-r from-oaxaca-pink/10 to-oaxaca-earth/10 dark:from-oaxaca-pink/20 dark:to-oaxaca-earth/20 rounded-2xl p-6 relative overflow-hidden ${className}`}>
      {dismissible && (
        <button
          onClick={handleDismiss}
          className="absolute top-4 right-4 p-1 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 text-gray-500 transition-colors"
          aria-label="Cerrar"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}

      <div className="flex items-start gap-6">
        {image && (
          <img src={image} alt="" className="w-24 h-24 object-contain flex-shrink-0" />
        )}
        <div className="flex-1">
          {badge && (
            <span className="inline-block px-2 py-0.5 bg-oaxaca-pink text-white text-xs font-semibold rounded-full mb-2">
              {badge}
            </span>
          )}
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
            {title}
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            {description}
          </p>
          {action && (
            <button
              onClick={action.onClick}
              className="inline-flex items-center gap-2 text-oaxaca-pink font-semibold hover:underline"
            >
              {action.label}
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// ============================================
// Cookie Consent Banner
// ============================================

interface CookieConsentProps {
  onAcceptAll: () => void;
  onAcceptEssential: () => void;
  onCustomize?: () => void;
  privacyPolicyUrl?: string;
  className?: string;
}

export const CookieConsent: React.FC<CookieConsentProps> = ({
  onAcceptAll,
  onAcceptEssential,
  onCustomize,
  privacyPolicyUrl,
  className = '',
}) => {
  return (
    <div className={`fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 shadow-2xl border-t border-gray-200 dark:border-gray-800 p-4 z-50 ${className}`}>
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center gap-4">
        <div className="flex-1">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Utilizamos cookies para mejorar tu experiencia. Al continuar navegando, aceptas nuestra{' '}
            {privacyPolicyUrl ? (
              <a href={privacyPolicyUrl} className="text-oaxaca-pink underline">
                política de privacidad
              </a>
            ) : (
              'política de privacidad'
            )}
            .
          </p>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          {onCustomize && (
            <button
              onClick={onCustomize}
              className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white font-medium"
            >
              Personalizar
            </button>
          )}
          <button
            onClick={onAcceptEssential}
            className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 font-medium"
          >
            Solo esenciales
          </button>
          <button
            onClick={onAcceptAll}
            className="px-4 py-2 text-sm bg-oaxaca-pink text-white rounded-lg hover:bg-oaxaca-pink/90 font-medium"
          >
            Aceptar todas
          </button>
        </div>
      </div>
    </div>
  );
};
