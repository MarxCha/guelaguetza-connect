import React, { useState, useRef, forwardRef, useCallback } from 'react';
import { Eye, EyeOff, Search, X, AlertCircle, CheckCircle, Info } from 'lucide-react';
import { triggerHaptic } from '../../utils/haptics';

// ============================================
// Types
// ============================================

type InputSize = 'sm' | 'md' | 'lg';
type InputVariant = 'outlined' | 'filled' | 'underlined';

// ============================================
// Text Input Component
// ============================================

interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string;
  error?: string;
  hint?: string;
  size?: InputSize;
  variant?: InputVariant;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  clearable?: boolean;
  onClear?: () => void;
  fullWidth?: boolean;
}

/**
 * Input - Campo de texto avanzado
 *
 * Features:
 * - Múltiples variantes y tamaños
 * - Iconos izquierda/derecha
 * - Estados de error y ayuda
 * - Botón de limpiar
 *
 * Usage:
 * <Input label="Email" type="email" error="Email inválido" />
 * <Input leftIcon={<Search />} placeholder="Buscar..." />
 */
const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      hint,
      size = 'md',
      variant = 'outlined',
      leftIcon,
      rightIcon,
      clearable = false,
      onClear,
      fullWidth = false,
      className = '',
      disabled,
      value,
      onChange,
      ...props
    },
    ref
  ) => {
    const [isFocused, setIsFocused] = useState(false);

    // Sizes with minimum touch target of 44px for accessibility (WCAG 2.1 SC 2.5.5)
    const sizes = {
      sm: { input: 'h-10 text-sm min-h-[40px]', icon: 'w-4 h-4', label: 'text-xs' },
      md: { input: 'h-11 text-base min-h-[44px]', icon: 'w-5 h-5', label: 'text-sm' },
      lg: { input: 'h-13 text-lg min-h-[52px]', icon: 'w-6 h-6', label: 'text-base' },
    };

    const variants = {
      outlined: `border ${
        error
          ? 'border-red-500 focus:ring-red-500/20'
          : isFocused
          ? 'border-oaxaca-pink ring-2 ring-oaxaca-pink/20'
          : 'border-gray-300 dark:border-gray-600'
      } bg-white dark:bg-gray-800 rounded-xl`,
      filled: `border-0 ${
        error
          ? 'bg-red-50 dark:bg-red-900/20'
          : 'bg-gray-100 dark:bg-gray-800'
      } rounded-xl focus:ring-2 focus:ring-oaxaca-pink/20`,
      underlined: `border-0 border-b-2 rounded-none ${
        error
          ? 'border-red-500'
          : isFocused
          ? 'border-oaxaca-pink'
          : 'border-gray-300 dark:border-gray-600'
      } bg-transparent`,
    };

    const sizeConfig = sizes[size];

    // Improved variants with better focus states for accessibility
    const variantsConfig = {
      outlined: `border ${
        error
          ? 'border-red-500 focus:ring-red-500/20 focus:ring-2'
          : isFocused
          ? 'border-oaxaca-pink ring-2 ring-oaxaca-pink/20'
          : 'border-gray-300 dark:border-gray-600 focus:border-oaxaca-pink focus:ring-2 focus:ring-oaxaca-pink/20'
      } bg-white dark:bg-gray-800 rounded-xl transition-all duration-200`,
      filled: `border-0 ${
        error
          ? 'bg-red-50 dark:bg-red-900/20 ring-2 ring-red-500/20'
          : 'bg-gray-100 dark:bg-gray-800 focus:ring-2 focus:ring-oaxaca-pink/20'
      } rounded-xl transition-all duration-200`,
      underlined: `border-0 border-b-2 rounded-none ${
        error
          ? 'border-red-500'
          : isFocused
          ? 'border-oaxaca-pink'
          : 'border-gray-300 dark:border-gray-600 focus:border-oaxaca-pink'
      } bg-transparent transition-all duration-200`,
    };

    const handleClear = () => {
      onClear?.();
      triggerHaptic('light');
    };

    const showClearButton = clearable && value && String(value).length > 0;

    return (
      <div className={`${fullWidth ? 'w-full' : ''} ${className}`}>
        {label && (
          <label
            className={`block mb-1.5 font-medium text-gray-700 dark:text-gray-300 ${sizeConfig.label}`}
          >
            {label}
          </label>
        )}

        <div className="relative">
          {leftIcon && (
            <div
              className={`absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 ${sizeConfig.icon}`}
              aria-hidden="true"
            >
              {leftIcon}
            </div>
          )}

          <input
            ref={ref}
            value={value}
            onChange={onChange}
            disabled={disabled}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            aria-invalid={error ? 'true' : undefined}
            aria-describedby={error ? `${props.id || 'input'}-error` : undefined}
            className={`w-full px-4 ${leftIcon ? 'pl-10' : ''} ${
              rightIcon || showClearButton ? 'pr-10' : ''
            } ${sizeConfig.input} ${variantsConfig[variant]} ${
              disabled ? 'opacity-50 cursor-not-allowed' : ''
            } outline-none text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500`}
            {...props}
          />

          {(rightIcon || showClearButton) && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
              {showClearButton && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <X className={sizeConfig.icon} />
                </button>
              )}
              {rightIcon && (
                <span className={`text-gray-400 ${sizeConfig.icon}`}>{rightIcon}</span>
              )}
            </div>
          )}

          {error && (
            <AlertCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-red-500" />
          )}
        </div>

        {(error || hint) && (
          <p
            id={error ? `${props.id || 'input'}-error` : undefined}
            className={`mt-1.5 text-sm ${
              error ? 'text-red-500 dark:text-red-400' : 'text-gray-500 dark:text-gray-400'
            }`}
            role={error ? 'alert' : undefined}
          >
            {error || hint}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

// ============================================
// Password Input
// ============================================

interface PasswordInputProps extends Omit<InputProps, 'type' | 'rightIcon'> {
  showStrength?: boolean;
}

export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ showStrength = false, value, ...props }, ref) => {
    const [showPassword, setShowPassword] = useState(false);

    const toggleVisibility = () => {
      setShowPassword(!showPassword);
      triggerHaptic('light');
    };

    const calculateStrength = (password: string): { score: number; label: string; color: string } => {
      let score = 0;
      if (password.length >= 8) score++;
      if (password.length >= 12) score++;
      if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
      if (/\d/.test(password)) score++;
      if (/[^a-zA-Z0-9]/.test(password)) score++;

      const levels = [
        { label: 'Muy débil', color: 'bg-red-500' },
        { label: 'Débil', color: 'bg-orange-500' },
        { label: 'Regular', color: 'bg-yellow-500' },
        { label: 'Buena', color: 'bg-lime-500' },
        { label: 'Fuerte', color: 'bg-green-500' },
      ];

      return { score, ...levels[Math.min(score, 4)] };
    };

    const strength = showStrength && value ? calculateStrength(String(value)) : null;

    return (
      <div>
        <Input
          ref={ref}
          type={showPassword ? 'text' : 'password'}
          value={value}
          rightIcon={
            <button
              type="button"
              onClick={toggleVisibility}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          }
          {...props}
        />

        {strength && String(value).length > 0 && (
          <div className="mt-2">
            <div className="flex gap-1 mb-1">
              {[0, 1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className={`h-1 flex-1 rounded-full ${
                    i < strength.score ? strength.color : 'bg-gray-200 dark:bg-gray-700'
                  }`}
                />
              ))}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Seguridad: {strength.label}
            </p>
          </div>
        )}
      </div>
    );
  }
);

PasswordInput.displayName = 'PasswordInput';

// ============================================
// Search Input
// ============================================

interface SearchInputProps extends Omit<InputProps, 'leftIcon' | 'type'> {
  onSearch?: (value: string) => void;
  loading?: boolean;
}

export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(
  ({ onSearch, loading = false, value, onChange, ...props }, ref) => {
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' && onSearch) {
        onSearch(String(value || ''));
      }
    };

    return (
      <Input
        ref={ref}
        type="search"
        value={value}
        onChange={onChange}
        leftIcon={<Search className="w-5 h-5" />}
        rightIcon={
          loading ? (
            <div className="w-5 h-5 border-2 border-gray-300 border-t-oaxaca-pink rounded-full animate-spin" />
          ) : undefined
        }
        clearable
        onKeyDown={handleKeyDown}
        {...props}
      />
    );
  }
);

SearchInput.displayName = 'SearchInput';

// ============================================
// Textarea Component
// ============================================

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
  size?: InputSize;
  variant?: InputVariant;
  autoResize?: boolean;
  maxLength?: number;
  showCount?: boolean;
  fullWidth?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      label,
      error,
      hint,
      size = 'md',
      variant = 'outlined',
      autoResize = false,
      maxLength,
      showCount = false,
      fullWidth = false,
      className = '',
      disabled,
      value,
      onChange,
      rows = 4,
      ...props
    },
    ref
  ) => {
    const textareaRef = useRef<HTMLTextAreaElement | null>(null);
    const [isFocused, setIsFocused] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      onChange?.(e);

      if (autoResize && textareaRef.current) {
        textareaRef.current.style.height = 'auto';
        textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
      }
    };

    const setRefs = useCallback(
      (node: HTMLTextAreaElement | null) => {
        textareaRef.current = node;
        if (typeof ref === 'function') {
          ref(node);
        } else if (ref) {
          ref.current = node;
        }
      },
      [ref]
    );

    const sizes = {
      sm: { input: 'text-sm p-3', label: 'text-xs' },
      md: { input: 'text-base p-4', label: 'text-sm' },
      lg: { input: 'text-lg p-5', label: 'text-base' },
    };

    const variants = {
      outlined: `border ${
        error
          ? 'border-red-500 focus:ring-red-500/20'
          : isFocused
          ? 'border-oaxaca-pink ring-2 ring-oaxaca-pink/20'
          : 'border-gray-300 dark:border-gray-600'
      } bg-white dark:bg-gray-800 rounded-xl`,
      filled: `border-0 ${
        error
          ? 'bg-red-50 dark:bg-red-900/20'
          : 'bg-gray-100 dark:bg-gray-800'
      } rounded-xl focus:ring-2 focus:ring-oaxaca-pink/20`,
      underlined: `border-0 border-b-2 rounded-none ${
        error
          ? 'border-red-500'
          : isFocused
          ? 'border-oaxaca-pink'
          : 'border-gray-300 dark:border-gray-600'
      } bg-transparent`,
    };

    const sizeConfig = sizes[size];
    const charCount = String(value || '').length;

    return (
      <div className={`${fullWidth ? 'w-full' : ''} ${className}`}>
        {label && (
          <label
            className={`block mb-1.5 font-medium text-gray-700 dark:text-gray-300 ${sizeConfig.label}`}
          >
            {label}
          </label>
        )}

        <textarea
          ref={setRefs}
          value={value}
          onChange={handleChange}
          disabled={disabled}
          rows={rows}
          maxLength={maxLength}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          className={`w-full ${sizeConfig.input} ${variants[variant]} ${
            disabled ? 'opacity-50 cursor-not-allowed' : ''
          } outline-none transition-all text-gray-900 dark:text-white placeholder-gray-400 resize-none`}
          {...props}
        />

        <div className="flex items-center justify-between mt-1.5">
          {(error || hint) && (
            <p
              className={`text-sm ${
                error ? 'text-red-500' : 'text-gray-500 dark:text-gray-400'
              }`}
            >
              {error || hint}
            </p>
          )}
          {showCount && (
            <p className="text-sm text-gray-400">
              {charCount}
              {maxLength && `/${maxLength}`}
            </p>
          )}
        </div>
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';

// ============================================
// Checkbox Component
// ============================================

interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'size'> {
  label?: string;
  description?: string;
  size?: 'sm' | 'md' | 'lg';
  indeterminate?: boolean;
  error?: string;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  (
    {
      label,
      description,
      size = 'md',
      indeterminate = false,
      error,
      className = '',
      checked,
      onChange,
      disabled,
      ...props
    },
    ref
  ) => {
    const inputRef = useRef<HTMLInputElement | null>(null);

    React.useEffect(() => {
      if (inputRef.current) {
        inputRef.current.indeterminate = indeterminate;
      }
    }, [indeterminate]);

    const setRefs = useCallback(
      (node: HTMLInputElement | null) => {
        inputRef.current = node;
        if (typeof ref === 'function') {
          ref(node);
        } else if (ref) {
          ref.current = node;
        }
      },
      [ref]
    );

    const sizes = {
      sm: { box: 'w-4 h-4', icon: 'w-3 h-3', label: 'text-sm' },
      md: { box: 'w-5 h-5', icon: 'w-3.5 h-3.5', label: 'text-base' },
      lg: { box: 'w-6 h-6', icon: 'w-4 h-4', label: 'text-lg' },
    };

    const sizeConfig = sizes[size];

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange?.(e);
      triggerHaptic('selection');
    };

    return (
      <label
        className={`flex items-start gap-3 ${
          disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
        } ${className}`}
      >
        <div className="relative flex-shrink-0">
          <input
            ref={setRefs}
            type="checkbox"
            checked={checked}
            onChange={handleChange}
            disabled={disabled}
            className="sr-only"
            {...props}
          />
          <div
            className={`${sizeConfig.box} rounded border-2 flex items-center justify-center transition-colors ${
              checked || indeterminate
                ? 'bg-oaxaca-pink border-oaxaca-pink'
                : error
                ? 'border-red-500'
                : 'border-gray-300 dark:border-gray-600'
            }`}
          >
            {checked && (
              <svg className={`${sizeConfig.icon} text-white`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            )}
            {indeterminate && !checked && (
              <div className="w-2.5 h-0.5 bg-white rounded-full" />
            )}
          </div>
        </div>
        {(label || description) && (
          <div>
            {label && (
              <span className={`font-medium text-gray-900 dark:text-white ${sizeConfig.label}`}>
                {label}
              </span>
            )}
            {description && (
              <p className="text-sm text-gray-500 dark:text-gray-400">{description}</p>
            )}
            {error && <p className="text-sm text-red-500 mt-1">{error}</p>}
          </div>
        )}
      </label>
    );
  }
);

Checkbox.displayName = 'Checkbox';

// ============================================
// Radio Component
// ============================================

interface RadioOption {
  value: string;
  label: string;
  description?: string;
  disabled?: boolean;
}

interface RadioGroupProps {
  name: string;
  options: RadioOption[];
  value?: string;
  onChange?: (value: string) => void;
  size?: 'sm' | 'md' | 'lg';
  orientation?: 'horizontal' | 'vertical';
  error?: string;
  className?: string;
}

export const RadioGroup: React.FC<RadioGroupProps> = ({
  name,
  options,
  value,
  onChange,
  size = 'md',
  orientation = 'vertical',
  error,
  className = '',
}) => {
  const sizes = {
    sm: { radio: 'w-4 h-4', dot: 'w-2 h-2', label: 'text-sm' },
    md: { radio: 'w-5 h-5', dot: 'w-2.5 h-2.5', label: 'text-base' },
    lg: { radio: 'w-6 h-6', dot: 'w-3 h-3', label: 'text-lg' },
  };

  const sizeConfig = sizes[size];

  const handleChange = (optionValue: string) => {
    onChange?.(optionValue);
    triggerHaptic('selection');
  };

  return (
    <div
      className={`${
        orientation === 'horizontal' ? 'flex flex-wrap gap-4' : 'space-y-3'
      } ${className}`}
    >
      {options.map((option) => (
        <label
          key={option.value}
          className={`flex items-start gap-3 ${
            option.disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
          }`}
        >
          <div className="relative flex-shrink-0">
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={value === option.value}
              onChange={() => handleChange(option.value)}
              disabled={option.disabled}
              className="sr-only"
            />
            <div
              className={`${sizeConfig.radio} rounded-full border-2 flex items-center justify-center transition-colors ${
                value === option.value
                  ? 'border-oaxaca-pink'
                  : error
                  ? 'border-red-500'
                  : 'border-gray-300 dark:border-gray-600'
              }`}
            >
              {value === option.value && (
                <div className={`${sizeConfig.dot} rounded-full bg-oaxaca-pink`} />
              )}
            </div>
          </div>
          <div>
            <span className={`font-medium text-gray-900 dark:text-white ${sizeConfig.label}`}>
              {option.label}
            </span>
            {option.description && (
              <p className="text-sm text-gray-500 dark:text-gray-400">{option.description}</p>
            )}
          </div>
        </label>
      ))}
      {error && <p className="text-sm text-red-500 mt-1">{error}</p>}
    </div>
  );
};

// ============================================
// Switch Component
// ============================================

interface SwitchProps {
  checked?: boolean;
  onChange?: (checked: boolean) => void;
  label?: string;
  description?: string;
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  className?: string;
}

export const Switch: React.FC<SwitchProps> = ({
  checked = false,
  onChange,
  label,
  description,
  size = 'md',
  disabled = false,
  className = '',
}) => {
  const sizes = {
    sm: { track: 'w-8 h-5', thumb: 'w-3.5 h-3.5', translate: 'translate-x-3.5', label: 'text-sm' },
    md: { track: 'w-11 h-6', thumb: 'w-5 h-5', translate: 'translate-x-5', label: 'text-base' },
    lg: { track: 'w-14 h-8', thumb: 'w-6 h-6', translate: 'translate-x-6', label: 'text-lg' },
  };

  const sizeConfig = sizes[size];

  const handleClick = () => {
    if (!disabled) {
      onChange?.(!checked);
      triggerHaptic('selection');
    }
  };

  return (
    <label
      className={`flex items-center gap-3 ${
        disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
      } ${className}`}
    >
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={handleClick}
        disabled={disabled}
        className={`relative inline-flex ${sizeConfig.track} shrink-0 rounded-full transition-colors ${
          checked ? 'bg-oaxaca-pink' : 'bg-gray-200 dark:bg-gray-700'
        }`}
      >
        <span
          className={`pointer-events-none inline-block ${sizeConfig.thumb} transform rounded-full bg-white shadow-lg ring-0 transition-transform ${
            checked ? sizeConfig.translate : 'translate-x-0.5'
          }`}
        />
      </button>
      {(label || description) && (
        <div>
          {label && (
            <span className={`font-medium text-gray-900 dark:text-white ${sizeConfig.label}`}>
              {label}
            </span>
          )}
          {description && (
            <p className="text-sm text-gray-500 dark:text-gray-400">{description}</p>
          )}
        </div>
      )}
    </label>
  );
};

// ============================================
// Input with Addon
// ============================================

interface InputAddonProps extends InputProps {
  addonBefore?: React.ReactNode;
  addonAfter?: React.ReactNode;
}

export const InputAddon = forwardRef<HTMLInputElement, InputAddonProps>(
  ({ addonBefore, addonAfter, className = '', ...props }, ref) => {
    return (
      <div className={`flex ${className}`}>
        {addonBefore && (
          <div className="flex items-center px-4 bg-gray-100 dark:bg-gray-800 border border-r-0 border-gray-300 dark:border-gray-600 rounded-l-xl text-gray-500 dark:text-gray-400">
            {addonBefore}
          </div>
        )}
        <Input
          ref={ref}
          className={`flex-1 ${addonBefore ? '!rounded-l-none' : ''} ${
            addonAfter ? '!rounded-r-none' : ''
          }`}
          {...props}
        />
        {addonAfter && (
          <div className="flex items-center px-4 bg-gray-100 dark:bg-gray-800 border border-l-0 border-gray-300 dark:border-gray-600 rounded-r-xl text-gray-500 dark:text-gray-400">
            {addonAfter}
          </div>
        )}
      </div>
    );
  }
);

InputAddon.displayName = 'InputAddon';

// ============================================
// OTP Input
// ============================================

interface OTPInputProps {
  length?: number;
  value?: string;
  onChange?: (value: string) => void;
  error?: string;
  autoFocus?: boolean;
  className?: string;
}

export const OTPInput: React.FC<OTPInputProps> = ({
  length = 6,
  value = '',
  onChange,
  error,
  autoFocus = false,
  className = '',
}) => {
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);

  const handleChange = (index: number, char: string) => {
    if (!/^\d*$/.test(char)) return;

    const newValue = value.split('');
    newValue[index] = char;
    const result = newValue.join('').slice(0, length);
    onChange?.(result);

    if (char && index < length - 1) {
      inputsRef.current[index + 1]?.focus();
    }

    triggerHaptic('light');
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !value[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length);
    onChange?.(pastedData);

    const nextEmptyIndex = Math.min(pastedData.length, length - 1);
    inputsRef.current[nextEmptyIndex]?.focus();
  };

  return (
    <div className={className}>
      <div className="flex gap-2 justify-center">
        {Array.from({ length }, (_, i) => (
          <input
            key={i}
            ref={(el) => { inputsRef.current[i] = el; }}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={value[i] || ''}
            onChange={(e) => handleChange(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            onPaste={handlePaste}
            autoFocus={autoFocus && i === 0}
            className={`w-12 h-14 text-center text-xl font-bold border-2 rounded-xl outline-none transition-colors ${
              error
                ? 'border-red-500'
                : 'border-gray-300 dark:border-gray-600 focus:border-oaxaca-pink focus:ring-2 focus:ring-oaxaca-pink/20'
            } bg-white dark:bg-gray-800 text-gray-900 dark:text-white`}
          />
        ))}
      </div>
      {error && <p className="text-sm text-red-500 text-center mt-2">{error}</p>}
    </div>
  );
};

export default Input;
