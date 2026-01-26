import React, { useState, useRef, useEffect } from 'react';
import { Sun, Moon, Monitor, ChevronDown } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { triggerHaptic } from '../../utils/haptics';

// ============================================
// Types
// ============================================

interface ThemeToggleProps {
  /** Show as simple toggle or dropdown with all options */
  variant?: 'toggle' | 'dropdown' | 'compact';
  /** Size of the toggle */
  size?: 'sm' | 'md' | 'lg';
  /** Show label text */
  showLabel?: boolean;
  /** Additional CSS classes */
  className?: string;
}

// ============================================
// Theme Options
// ============================================

const themeOptions = [
  { value: 'light', label: 'Claro', icon: Sun },
  { value: 'dark', label: 'Oscuro', icon: Moon },
  { value: 'system', label: 'Sistema', icon: Monitor },
] as const;

// ============================================
// Sizes
// ============================================

const sizes = {
  sm: {
    button: 'w-8 h-8',
    icon: 'w-4 h-4',
    text: 'text-sm',
    dropdown: 'min-w-[140px]',
  },
  md: {
    button: 'w-10 h-10',
    icon: 'w-5 h-5',
    text: 'text-base',
    dropdown: 'min-w-[160px]',
  },
  lg: {
    button: 'w-12 h-12',
    icon: 'w-6 h-6',
    text: 'text-lg',
    dropdown: 'min-w-[180px]',
  },
};

// ============================================
// Simple Toggle Component
// ============================================

const SimpleToggle: React.FC<{ size: 'sm' | 'md' | 'lg'; className?: string }> = ({
  size,
  className = '',
}) => {
  const { isDark, toggleTheme } = useTheme();
  const sizeConfig = sizes[size];

  const handleToggle = () => {
    toggleTheme();
    triggerHaptic('light');
  };

  return (
    <button
      onClick={handleToggle}
      className={`
        relative ${sizeConfig.button}
        rounded-full
        bg-gray-100 dark:bg-gray-800
        hover:bg-gray-200 dark:hover:bg-gray-700
        border border-gray-200 dark:border-gray-700
        transition-all duration-200
        focus:outline-none focus:ring-2 focus:ring-oaxaca-pink focus:ring-offset-2
        dark:focus:ring-offset-gray-900
        ${className}
      `}
      aria-label={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
      title={isDark ? 'Modo claro' : 'Modo oscuro'}
    >
      {/* Sun Icon */}
      <Sun
        className={`
          absolute inset-0 m-auto ${sizeConfig.icon}
          text-amber-500
          transition-all duration-300
          ${isDark ? 'opacity-0 rotate-90 scale-50' : 'opacity-100 rotate-0 scale-100'}
        `}
      />
      {/* Moon Icon */}
      <Moon
        className={`
          absolute inset-0 m-auto ${sizeConfig.icon}
          text-blue-400
          transition-all duration-300
          ${isDark ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 -rotate-90 scale-50'}
        `}
      />
    </button>
  );
};

// ============================================
// Compact Toggle (for inline use)
// ============================================

const CompactToggle: React.FC<{ size: 'sm' | 'md' | 'lg'; showLabel?: boolean; className?: string }> = ({
  size,
  showLabel = false,
  className = '',
}) => {
  const { isDark, toggleTheme } = useTheme();
  const sizeConfig = sizes[size];

  const handleToggle = () => {
    toggleTheme();
    triggerHaptic('light');
  };

  return (
    <button
      onClick={handleToggle}
      className={`
        inline-flex items-center gap-2
        px-3 py-1.5 rounded-lg
        text-gray-600 dark:text-gray-300
        hover:bg-gray-100 dark:hover:bg-gray-800
        transition-colors duration-200
        focus:outline-none focus:ring-2 focus:ring-oaxaca-pink
        ${className}
      `}
      aria-label={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
    >
      {isDark ? (
        <Moon className={`${sizeConfig.icon} text-blue-400`} />
      ) : (
        <Sun className={`${sizeConfig.icon} text-amber-500`} />
      )}
      {showLabel && (
        <span className={sizeConfig.text}>
          {isDark ? 'Oscuro' : 'Claro'}
        </span>
      )}
    </button>
  );
};

// ============================================
// Dropdown Toggle
// ============================================

const DropdownToggle: React.FC<{ size: 'sm' | 'md' | 'lg'; showLabel?: boolean; className?: string }> = ({
  size,
  showLabel = true,
  className = '',
}) => {
  const { theme, setTheme, isDark } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const sizeConfig = sizes[size];

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close dropdown on escape
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false);
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, []);

  const handleSelect = (value: 'light' | 'dark' | 'system') => {
    setTheme(value);
    setIsOpen(false);
    triggerHaptic('selection');
  };

  const currentOption = themeOptions.find(opt => opt.value === theme) || themeOptions[2];
  const CurrentIcon = currentOption.icon;

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`
          inline-flex items-center gap-2
          px-3 py-2 rounded-xl
          bg-gray-100 dark:bg-gray-800
          hover:bg-gray-200 dark:hover:bg-gray-700
          border border-gray-200 dark:border-gray-700
          transition-all duration-200
          focus:outline-none focus:ring-2 focus:ring-oaxaca-pink focus:ring-offset-2
          dark:focus:ring-offset-gray-900
        `}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label="Seleccionar tema"
      >
        <CurrentIcon
          className={`${sizeConfig.icon} ${
            isDark ? 'text-blue-400' : theme === 'system' ? 'text-gray-500' : 'text-amber-500'
          }`}
        />
        {showLabel && (
          <span className={`${sizeConfig.text} text-gray-700 dark:text-gray-200 font-medium`}>
            {currentOption.label}
          </span>
        )}
        <ChevronDown
          className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          className={`
            absolute right-0 top-full mt-2 z-50
            ${sizeConfig.dropdown}
            bg-white dark:bg-gray-800
            rounded-xl shadow-lg
            border border-gray-200 dark:border-gray-700
            py-1 overflow-hidden
            animate-in fade-in slide-in-from-top-2 duration-200
          `}
          role="listbox"
          aria-label="Opciones de tema"
        >
          {themeOptions.map((option) => {
            const Icon = option.icon;
            const isSelected = theme === option.value;

            return (
              <button
                key={option.value}
                onClick={() => handleSelect(option.value)}
                className={`
                  w-full flex items-center gap-3 px-4 py-2.5
                  transition-colors duration-150
                  ${isSelected
                    ? 'bg-oaxaca-pink/10 text-oaxaca-pink'
                    : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }
                `}
                role="option"
                aria-selected={isSelected}
              >
                <Icon
                  className={`${sizeConfig.icon} ${
                    isSelected
                      ? 'text-oaxaca-pink'
                      : option.value === 'light'
                      ? 'text-amber-500'
                      : option.value === 'dark'
                      ? 'text-blue-400'
                      : 'text-gray-500 dark:text-gray-400'
                  }`}
                />
                <span className={`${sizeConfig.text} font-medium`}>{option.label}</span>
                {isSelected && (
                  <svg
                    className="w-4 h-4 ml-auto text-oaxaca-pink"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ============================================
// Main Component
// ============================================

const ThemeToggle: React.FC<ThemeToggleProps> = ({
  variant = 'toggle',
  size = 'md',
  showLabel = false,
  className = '',
}) => {
  switch (variant) {
    case 'toggle':
      return <SimpleToggle size={size} className={className} />;
    case 'compact':
      return <CompactToggle size={size} showLabel={showLabel} className={className} />;
    case 'dropdown':
      return <DropdownToggle size={size} showLabel={showLabel} className={className} />;
    default:
      return <SimpleToggle size={size} className={className} />;
  }
};

// ============================================
// Theme Segment Control (Alternative UI)
// ============================================

export const ThemeSegmentControl: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { theme, setTheme } = useTheme();

  const handleSelect = (value: 'light' | 'dark' | 'system') => {
    setTheme(value);
    triggerHaptic('selection');
  };

  return (
    <div
      className={`
        inline-flex p-1 rounded-xl
        bg-gray-100 dark:bg-gray-800
        ${className}
      `}
      role="radiogroup"
      aria-label="Seleccionar tema"
    >
      {themeOptions.map((option) => {
        const Icon = option.icon;
        const isSelected = theme === option.value;

        return (
          <button
            key={option.value}
            onClick={() => handleSelect(option.value)}
            className={`
              flex items-center gap-2 px-3 py-2 rounded-lg
              transition-all duration-200
              ${isSelected
                ? 'bg-white dark:bg-gray-700 shadow-sm text-oaxaca-pink'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }
            `}
            role="radio"
            aria-checked={isSelected}
          >
            <Icon className="w-4 h-4" />
            <span className="text-sm font-medium hidden sm:inline">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
};

export default ThemeToggle;
