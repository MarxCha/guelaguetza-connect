import React from 'react';
import {
  ArrowLeft,
  Home,
  Menu,
  X,
  Search,
  Bell,
  User,
  Settings,
  Shield,
  ChevronRight,
} from 'lucide-react';
import { ViewState } from '../../types';
import ThemeToggle from './ThemeToggle';

interface BreadcrumbItem {
  label: string;
  view?: ViewState;
}

interface GlobalHeaderProps {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  onNavigate?: (view: ViewState) => void;
  breadcrumbs?: BreadcrumbItem[];
  showHomeButton?: boolean;
  showSearch?: boolean;
  showNotifications?: boolean;
  showMenu?: boolean;
  variant?: 'default' | 'gradient' | 'transparent';
  gradientFrom?: string;
  gradientTo?: string;
  actions?: React.ReactNode;
  icon?: React.ReactNode;
}

const GlobalHeader: React.FC<GlobalHeaderProps> = ({
  title,
  subtitle,
  onBack,
  onNavigate,
  breadcrumbs,
  showHomeButton = true,
  showSearch = false,
  showNotifications = false,
  showMenu = false,
  variant = 'default',
  gradientFrom = 'from-oaxaca-purple',
  gradientTo = 'to-oaxaca-pink',
  actions,
  icon,
}) => {
  const [menuOpen, setMenuOpen] = React.useState(false);

  const quickLinks = [
    { label: 'Inicio', view: ViewState.HOME, icon: Home },
    { label: 'Perfil', view: ViewState.PROFILE, icon: User },
    { label: 'Buscar', view: ViewState.SEARCH, icon: Search },
    { label: 'Configuracion', view: ViewState.PROFILE, icon: Settings },
  ];

  const getHeaderClasses = () => {
    switch (variant) {
      case 'gradient':
        return `bg-gradient-to-r ${gradientFrom} ${gradientTo} text-white`;
      case 'transparent':
        return 'bg-transparent text-gray-900 dark:text-white';
      default:
        return 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm';
    }
  };

  const getButtonClasses = () => {
    switch (variant) {
      case 'gradient':
        return 'hover:bg-white/20 text-white';
      case 'transparent':
        return 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300';
      default:
        return 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300';
    }
  };

  return (
    <>
      <header className={`sticky top-0 z-30 ${getHeaderClasses()}`}>
        <div className="px-3 sm:px-4 py-2.5 sm:py-3 max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            {/* Left section */}
            <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
              {onBack && (
                <button
                  onClick={onBack}
                  className={`p-2 rounded-full transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-oaxaca-pink ${getButtonClasses()}`}
                  aria-label="Volver"
                >
                  <ArrowLeft size={18} className="sm:w-5 sm:h-5" />
                </button>
              )}
              {showHomeButton && !onBack && onNavigate && (
                <button
                  onClick={() => onNavigate(ViewState.HOME)}
                  className={`p-2 rounded-full transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center focus-visible:ring-2 focus-visible:ring-oaxaca-pink ${getButtonClasses()}`}
                  aria-label="Ir al inicio"
                >
                  <Home size={18} className="sm:w-5 sm:h-5" />
                </button>
              )}
              {icon && <div className="ml-1 flex-shrink-0" aria-hidden="true">{icon}</div>}
              <div className="ml-1 min-w-0">
                <h1 className="font-bold text-base sm:text-lg leading-tight truncate">{title}</h1>
                {subtitle && (
                  <p className={`text-[10px] sm:text-xs truncate ${variant === 'gradient' ? 'text-white/70' : 'text-gray-500 dark:text-gray-400'}`}>
                    {subtitle}
                  </p>
                )}
              </div>
            </div>

            {/* Right section */}
            <div className="flex items-center gap-0.5 sm:gap-1 flex-shrink-0">
              {showSearch && onNavigate && (
                <button
                  onClick={() => onNavigate(ViewState.SEARCH)}
                  className={`p-2 rounded-full transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center focus-visible:ring-2 focus-visible:ring-oaxaca-pink ${getButtonClasses()}`}
                  aria-label="Buscar"
                >
                  <Search size={18} className="sm:w-5 sm:h-5" />
                </button>
              )}
              {showNotifications && (
                <button
                  className={`p-2 rounded-full transition-colors relative min-w-[44px] min-h-[44px] flex items-center justify-center focus-visible:ring-2 focus-visible:ring-oaxaca-pink ${getButtonClasses()}`}
                  aria-label="Notificaciones - tienes notificaciones nuevas"
                >
                  <Bell size={18} className="sm:w-5 sm:h-5" />
                  <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full" aria-hidden="true" />
                </button>
              )}
              {actions}
              {showMenu && (
                <button
                  onClick={() => setMenuOpen(!menuOpen)}
                  className={`p-2 rounded-full transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center focus-visible:ring-2 focus-visible:ring-oaxaca-pink ${getButtonClasses()}`}
                  aria-label={menuOpen ? 'Cerrar menu' : 'Abrir menu'}
                  aria-expanded={menuOpen}
                  aria-controls="navigation-menu"
                >
                  {menuOpen ? <X size={18} className="sm:w-5 sm:h-5" /> : <Menu size={18} className="sm:w-5 sm:h-5" />}
                </button>
              )}
            </div>
          </div>

          {/* Breadcrumbs */}
          {breadcrumbs && breadcrumbs.length > 0 && (
            <div className="flex items-center gap-1 mt-2 text-xs overflow-x-auto">
              {breadcrumbs.map((item, index) => (
                <React.Fragment key={index}>
                  {index > 0 && (
                    <ChevronRight size={12} className={variant === 'gradient' ? 'text-white/50' : 'text-gray-400'} />
                  )}
                  {item.view && onNavigate ? (
                    <button
                      onClick={() => onNavigate(item.view!)}
                      className={`hover:underline whitespace-nowrap ${
                        variant === 'gradient' ? 'text-white/70 hover:text-white' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
                      }`}
                    >
                      {item.label}
                    </button>
                  ) : (
                    <span className={`whitespace-nowrap ${
                      index === breadcrumbs.length - 1
                        ? variant === 'gradient' ? 'text-white font-medium' : 'text-gray-900 dark:text-white font-medium'
                        : variant === 'gradient' ? 'text-white/70' : 'text-gray-500 dark:text-gray-400'
                    }`}>
                      {item.label}
                    </span>
                  )}
                </React.Fragment>
              ))}
            </div>
          )}
        </div>
      </header>

      {/* Quick navigation menu */}
      {menuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50"
          onClick={() => setMenuOpen(false)}
          aria-hidden="true"
        >
          <nav
            id="navigation-menu"
            className="absolute right-0 top-0 h-full w-64 sm:w-72 bg-white dark:bg-gray-800 shadow-xl"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Menu de navegacion"
          >
            <div className="p-3 sm:p-4 border-b dark:border-gray-700">
              <div className="flex items-center justify-between">
                <h2 className="font-bold text-gray-900 dark:text-white text-base sm:text-lg">Menu</h2>
                <button
                  onClick={() => setMenuOpen(false)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full min-w-[44px] min-h-[44px] flex items-center justify-center transition-colors focus-visible:ring-2 focus-visible:ring-oaxaca-pink"
                  aria-label="Cerrar menu"
                >
                  <X size={18} className="sm:w-5 sm:h-5 text-gray-600 dark:text-gray-300" />
                </button>
              </div>
            </div>
            <div className="p-2">
              {quickLinks.map((link) => (
                <button
                  key={link.label}
                  onClick={() => {
                    onNavigate?.(link.view);
                    setMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-3 px-3 sm:px-4 py-2.5 sm:py-3 text-left hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors min-h-[48px] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-oaxaca-pink"
                >
                  <link.icon size={18} className="sm:w-5 sm:h-5 text-gray-500 dark:text-gray-400 flex-shrink-0" aria-hidden="true" />
                  <span className="text-gray-700 dark:text-gray-200 text-sm sm:text-base">{link.label}</span>
                </button>
              ))}

              {/* Theme Toggle in Menu */}
              <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-gray-200 dark:border-gray-700 px-3 sm:px-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Tema</span>
                  <ThemeToggle variant="dropdown" size="sm" />
                </div>
              </div>
            </div>
          </nav>
        </div>
      )}
    </>
  );
};

export default GlobalHeader;
