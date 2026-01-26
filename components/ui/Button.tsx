import React from 'react';

// ============================================
// Base Button
// ============================================

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success' | 'link' | 'gradient';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  fullWidth?: boolean;
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  rounded?: 'sm' | 'md' | 'lg' | 'full';
}

const variants = {
  primary: 'bg-oaxaca-pink text-white hover:bg-oaxaca-pink/90 active:bg-oaxaca-pink/80 shadow-sm focus-visible:ring-2 focus-visible:ring-oaxaca-pink focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-900',
  secondary: 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 hover:bg-gray-200 dark:hover:bg-gray-700 focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-900',
  outline: 'border-2 border-oaxaca-pink text-oaxaca-pink hover:bg-oaxaca-pink/10 dark:hover:bg-oaxaca-pink/20 focus-visible:ring-2 focus-visible:ring-oaxaca-pink focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-900',
  ghost: 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-900',
  danger: 'bg-red-500 text-white hover:bg-red-600 active:bg-red-700 shadow-sm focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-900',
  success: 'bg-green-500 text-white hover:bg-green-600 active:bg-green-700 shadow-sm focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-900',
  link: 'text-oaxaca-pink hover:underline underline-offset-4 p-0 focus-visible:ring-2 focus-visible:ring-oaxaca-pink rounded',
  gradient: 'bg-gradient-to-r from-oaxaca-pink to-oaxaca-earth text-white hover:opacity-90 shadow-md focus-visible:ring-2 focus-visible:ring-oaxaca-pink focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-900',
};

// Sizes with minimum touch target of 44px for accessibility
const sizes = {
  xs: 'px-2 py-1 text-xs min-h-[32px]',
  sm: 'px-3 py-1.5 text-sm min-h-[36px]',
  md: 'px-4 py-2.5 text-base min-h-[44px]',
  lg: 'px-6 py-3.5 text-lg min-h-[48px]',
  xl: 'px-8 py-4 text-xl min-h-[56px]',
};

const roundedClasses = {
  sm: 'rounded-md',
  md: 'rounded-xl',
  lg: 'rounded-2xl',
  full: 'rounded-full',
};

const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  loading = false,
  leftIcon,
  rightIcon,
  rounded = 'md',
  children,
  disabled,
  className = '',
  ...props
}) => {
  const isLinkVariant = variant === 'link';

  return (
    <button
      className={`
        inline-flex items-center justify-center gap-2 font-medium transition-all duration-200 outline-none
        ${variants[variant]}
        ${isLinkVariant ? '' : sizes[size]}
        ${isLinkVariant ? '' : roundedClasses[rounded]}
        ${fullWidth ? 'w-full' : ''}
        ${disabled || loading ? 'opacity-50 cursor-not-allowed' : 'active:scale-[0.98] hover:shadow-md'}
        ${className}
      `}
      disabled={disabled || loading}
      aria-busy={loading}
      {...props}
    >
      {loading ? (
        <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : leftIcon ? (
        <span className="flex-shrink-0">{leftIcon}</span>
      ) : null}
      {children}
      {rightIcon && !loading && (
        <span className="flex-shrink-0">{rightIcon}</span>
      )}
    </button>
  );
};

// ============================================
// Icon Button
// ============================================

interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  rounded?: 'md' | 'lg' | 'full';
  loading?: boolean;
  'aria-label': string;
}

const iconSizes = {
  xs: 'w-6 h-6',
  sm: 'w-8 h-8',
  md: 'w-10 h-10',
  lg: 'w-12 h-12',
  xl: 'w-14 h-14',
};

const iconInnerSizes = {
  xs: 'w-3 h-3',
  sm: 'w-4 h-4',
  md: 'w-5 h-5',
  lg: 'w-6 h-6',
  xl: 'w-7 h-7',
};

export const IconButton: React.FC<IconButtonProps> = ({
  icon,
  variant = 'ghost',
  size = 'md',
  rounded = 'full',
  loading = false,
  disabled,
  className = '',
  ...props
}) => {
  return (
    <button
      className={`
        inline-flex items-center justify-center transition-all
        ${variants[variant]}
        ${iconSizes[size]}
        ${roundedClasses[rounded]}
        ${disabled || loading ? 'opacity-50 cursor-not-allowed' : 'active:scale-95'}
        ${className}
      `}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <div className={`border-2 border-current border-t-transparent rounded-full animate-spin ${iconInnerSizes[size]}`} />
      ) : (
        <span className={iconInnerSizes[size]}>{icon}</span>
      )}
    </button>
  );
};

// ============================================
// Button Group
// ============================================

interface ButtonGroupProps {
  children: React.ReactNode;
  variant?: 'attached' | 'separated';
  size?: 'sm' | 'md' | 'lg';
  orientation?: 'horizontal' | 'vertical';
  className?: string;
}

export const ButtonGroup: React.FC<ButtonGroupProps> = ({
  children,
  variant = 'attached',
  orientation = 'horizontal',
  className = '',
}) => {
  const orientationClasses = {
    horizontal: 'flex-row',
    vertical: 'flex-col',
  };

  const attachedClasses = {
    horizontal: '[&>button:not(:first-child):not(:last-child)]:rounded-none [&>button:first-child]:rounded-r-none [&>button:last-child]:rounded-l-none [&>button:not(:first-child)]:-ml-px',
    vertical: '[&>button:not(:first-child):not(:last-child)]:rounded-none [&>button:first-child]:rounded-b-none [&>button:last-child]:rounded-t-none [&>button:not(:first-child)]:-mt-px',
  };

  return (
    <div
      className={`
        inline-flex ${orientationClasses[orientation]}
        ${variant === 'attached' ? attachedClasses[orientation] : 'gap-2'}
        ${className}
      `}
      role="group"
    >
      {children}
    </div>
  );
};

// ============================================
// Floating Action Button (FAB)
// ============================================

interface FABProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: React.ReactNode;
  label?: string;
  size?: 'sm' | 'md' | 'lg';
  position?: 'bottom-right' | 'bottom-left' | 'bottom-center' | 'top-right' | 'top-left';
  extended?: boolean;
  variant?: 'primary' | 'secondary' | 'danger' | 'success';
}

const fabSizes = {
  sm: 'w-12 h-12',
  md: 'w-14 h-14',
  lg: 'w-16 h-16',
};

const fabPositions = {
  'bottom-right': 'fixed bottom-20 right-4 z-50',
  'bottom-left': 'fixed bottom-20 left-4 z-50',
  'bottom-center': 'fixed bottom-20 left-1/2 -translate-x-1/2 z-50',
  'top-right': 'fixed top-20 right-4 z-50',
  'top-left': 'fixed top-20 left-4 z-50',
};

export const FAB: React.FC<FABProps> = ({
  icon,
  label,
  size = 'md',
  position = 'bottom-right',
  extended = false,
  variant = 'primary',
  disabled,
  className = '',
  ...props
}) => {
  const fabVariants = {
    primary: 'bg-oaxaca-pink text-white hover:bg-oaxaca-pink/90 shadow-lg shadow-oaxaca-pink/30',
    secondary: 'bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-900 hover:bg-gray-700 dark:hover:bg-gray-300 shadow-lg',
    danger: 'bg-red-500 text-white hover:bg-red-600 shadow-lg shadow-red-500/30',
    success: 'bg-green-500 text-white hover:bg-green-600 shadow-lg shadow-green-500/30',
  };

  if (extended && label) {
    return (
      <button
        className={`
          ${fabPositions[position]}
          inline-flex items-center gap-3 px-6 rounded-full transition-all
          ${fabVariants[variant]}
          ${size === 'sm' ? 'h-12 text-sm' : size === 'lg' ? 'h-16 text-lg' : 'h-14 text-base'}
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'active:scale-95 hover:shadow-xl'}
          ${className}
        `}
        disabled={disabled}
        {...props}
      >
        <span className="w-6 h-6">{icon}</span>
        <span className="font-medium">{label}</span>
      </button>
    );
  }

  return (
    <button
      className={`
        ${fabPositions[position]}
        inline-flex items-center justify-center rounded-full transition-all
        ${fabVariants[variant]}
        ${fabSizes[size]}
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'active:scale-95 hover:shadow-xl'}
        ${className}
      `}
      disabled={disabled}
      {...props}
    >
      <span className="w-6 h-6">{icon}</span>
    </button>
  );
};

// ============================================
// Split Button
// ============================================

interface SplitButtonProps {
  mainLabel: string;
  mainAction: () => void;
  options: Array<{
    label: string;
    onClick: () => void;
    icon?: React.ReactNode;
    disabled?: boolean;
  }>;
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  className?: string;
}

export const SplitButton: React.FC<SplitButtonProps> = ({
  mainLabel,
  mainAction,
  options,
  variant = 'primary',
  size = 'md',
  disabled = false,
  className = '',
}) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className={`relative inline-flex ${className}`} ref={dropdownRef}>
      <button
        className={`
          ${variants[variant]}
          ${sizes[size]}
          rounded-l-xl font-medium transition-all
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'active:scale-[0.98]'}
        `}
        onClick={mainAction}
        disabled={disabled}
      >
        {mainLabel}
      </button>
      <button
        className={`
          ${variants[variant]}
          ${size === 'sm' ? 'px-2' : size === 'lg' ? 'px-4' : 'px-3'}
          ${sizes[size].split(' ')[1]}
          rounded-r-xl border-l border-white/20 font-medium transition-all
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'active:scale-[0.98]'}
        `}
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled}
        aria-haspopup="true"
        aria-expanded={isOpen}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-1 min-w-[160px] bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
          {options.map((option, index) => (
            <button
              key={index}
              className="w-full px-4 py-2 text-left text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={() => {
                option.onClick();
                setIsOpen(false);
              }}
              disabled={option.disabled}
            >
              {option.icon && <span className="w-4 h-4">{option.icon}</span>}
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// ============================================
// Loading Button
// ============================================

interface LoadingButtonProps extends ButtonProps {
  loadingText?: string;
  successText?: string;
  errorText?: string;
  status?: 'idle' | 'loading' | 'success' | 'error';
  showStatusIcon?: boolean;
}

export const LoadingButton: React.FC<LoadingButtonProps> = ({
  loadingText = 'Cargando...',
  successText = 'Completado',
  errorText = 'Error',
  status = 'idle',
  showStatusIcon = true,
  children,
  variant = 'primary',
  ...props
}) => {
  const statusVariant = status === 'success' ? 'success' : status === 'error' ? 'danger' : variant;

  const statusIcons = {
    loading: (
      <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
    ),
    success: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
    ),
    error: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
      </svg>
    ),
  };

  const statusText = {
    idle: children,
    loading: loadingText,
    success: successText,
    error: errorText,
  };

  return (
    <Button
      variant={statusVariant}
      leftIcon={showStatusIcon && status !== 'idle' ? statusIcons[status] : undefined}
      disabled={status === 'loading'}
      {...props}
    >
      {statusText[status]}
    </Button>
  );
};

// ============================================
// Social Button
// ============================================

interface SocialButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  provider: 'google' | 'facebook' | 'apple' | 'twitter' | 'github';
  label?: string;
  fullWidth?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const socialProviders = {
  google: {
    bg: 'bg-white hover:bg-gray-50 border border-gray-300 text-gray-700',
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24">
        <path fill="#4285F4" d="M23.745 12.27c0-.79-.07-1.54-.19-2.27h-11.3v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"/>
        <path fill="#34A853" d="M12.255 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96h-3.98v3.09C3.515 21.3 7.565 24 12.255 24z"/>
        <path fill="#FBBC05" d="M5.525 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62h-3.98a11.86 11.86 0 000 10.76l3.98-3.09z"/>
        <path fill="#EA4335" d="M12.255 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C18.205 1.19 15.495 0 12.255 0c-4.69 0-8.74 2.7-10.71 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z"/>
      </svg>
    ),
    label: 'Continuar con Google',
  },
  facebook: {
    bg: 'bg-[#1877F2] hover:bg-[#166FE5] text-white',
    icon: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
      </svg>
    ),
    label: 'Continuar con Facebook',
  },
  apple: {
    bg: 'bg-black hover:bg-gray-900 text-white',
    icon: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701"/>
      </svg>
    ),
    label: 'Continuar con Apple',
  },
  twitter: {
    bg: 'bg-black hover:bg-gray-900 text-white',
    icon: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
      </svg>
    ),
    label: 'Continuar con X',
  },
  github: {
    bg: 'bg-gray-900 hover:bg-gray-800 text-white',
    icon: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
      </svg>
    ),
    label: 'Continuar con GitHub',
  },
};

export const SocialButton: React.FC<SocialButtonProps> = ({
  provider,
  label,
  fullWidth = false,
  size = 'md',
  disabled,
  className = '',
  ...props
}) => {
  const { bg, icon, label: defaultLabel } = socialProviders[provider];

  return (
    <button
      className={`
        inline-flex items-center justify-center gap-3 rounded-xl font-medium transition-all
        ${bg}
        ${sizes[size]}
        ${fullWidth ? 'w-full' : ''}
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'active:scale-[0.98]'}
        ${className}
      `}
      disabled={disabled}
      {...props}
    >
      {icon}
      <span>{label || defaultLabel}</span>
    </button>
  );
};

// ============================================
// Segmented Control
// ============================================

interface SegmentedControlProps {
  options: Array<{
    value: string;
    label: string;
    icon?: React.ReactNode;
    disabled?: boolean;
  }>;
  value: string;
  onChange: (value: string) => void;
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  className?: string;
}

export const SegmentedControl: React.FC<SegmentedControlProps> = ({
  options,
  value,
  onChange,
  size = 'md',
  fullWidth = false,
  className = '',
}) => {
  const segmentSizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-2.5 text-lg',
  };

  return (
    <div
      className={`
        inline-flex bg-gray-100 dark:bg-gray-800 rounded-xl p-1
        ${fullWidth ? 'w-full' : ''}
        ${className}
      `}
      role="tablist"
    >
      {options.map((option) => (
        <button
          key={option.value}
          role="tab"
          aria-selected={value === option.value}
          className={`
            ${segmentSizes[size]}
            ${fullWidth ? 'flex-1' : ''}
            rounded-lg font-medium transition-all flex items-center justify-center gap-2
            ${
              value === option.value
                ? 'bg-white dark:bg-gray-700 text-oaxaca-pink shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }
            ${option.disabled ? 'opacity-50 cursor-not-allowed' : ''}
          `}
          onClick={() => !option.disabled && onChange(option.value)}
          disabled={option.disabled}
        >
          {option.icon && <span className="w-4 h-4">{option.icon}</span>}
          {option.label}
        </button>
      ))}
    </div>
  );
};

// ============================================
// Chip / Tag Button
// ============================================

interface ChipProps {
  label: string;
  variant?: 'filled' | 'outlined';
  color?: 'default' | 'primary' | 'success' | 'warning' | 'error';
  size?: 'sm' | 'md';
  icon?: React.ReactNode;
  onDelete?: () => void;
  onClick?: () => void;
  selected?: boolean;
  className?: string;
}

const chipColors = {
  default: {
    filled: 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300',
    outlined: 'border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300',
  },
  primary: {
    filled: 'bg-oaxaca-pink/10 text-oaxaca-pink',
    outlined: 'border border-oaxaca-pink text-oaxaca-pink',
  },
  success: {
    filled: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
    outlined: 'border border-green-500 text-green-600 dark:text-green-400',
  },
  warning: {
    filled: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400',
    outlined: 'border border-yellow-500 text-yellow-600 dark:text-yellow-400',
  },
  error: {
    filled: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
    outlined: 'border border-red-500 text-red-600 dark:text-red-400',
  },
};

export const Chip: React.FC<ChipProps> = ({
  label,
  variant = 'filled',
  color = 'default',
  size = 'md',
  icon,
  onDelete,
  onClick,
  selected = false,
  className = '',
}) => {
  const chipSizes = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-3 py-1 text-sm',
  };

  const isClickable = !!onClick;
  const colorClass = selected ? chipColors.primary[variant] : chipColors[color][variant];

  return (
    <span
      className={`
        inline-flex items-center gap-1.5 rounded-full font-medium transition-all
        ${chipSizes[size]}
        ${colorClass}
        ${isClickable ? 'cursor-pointer hover:opacity-80' : ''}
        ${selected ? 'ring-2 ring-oaxaca-pink/30' : ''}
        ${className}
      `}
      onClick={onClick}
      role={isClickable ? 'button' : undefined}
    >
      {icon && <span className="w-4 h-4">{icon}</span>}
      {label}
      {onDelete && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="w-4 h-4 rounded-full hover:bg-black/10 dark:hover:bg-white/10 flex items-center justify-center ml-0.5"
          aria-label="Eliminar"
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </span>
  );
};

// ============================================
// Toggle Button
// ============================================

interface ToggleButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  selected?: boolean;
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

export const ToggleButton: React.FC<ToggleButtonProps> = ({
  selected = false,
  size = 'md',
  children,
  disabled,
  className = '',
  ...props
}) => {
  return (
    <button
      className={`
        ${sizes[size]}
        rounded-xl font-medium transition-all
        ${
          selected
            ? 'bg-oaxaca-pink text-white'
            : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
        }
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'active:scale-[0.98]'}
        ${className}
      `}
      disabled={disabled}
      aria-pressed={selected}
      {...props}
    >
      {children}
    </button>
  );
};

export default Button;
