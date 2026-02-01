import React, { useState } from 'react';
import { Home, Bus, Camera, Search, User, ShoppingBag, Radio, Map, Ticket, MessageCircle, Users, CalendarDays, MoreHorizontal, X } from 'lucide-react';
import { ViewState } from '../types';
import { useAuth } from '../contexts/AuthContext';
import haptics from '../services/haptics';
import NotificationBell from './ui/NotificationBell';
import NotificationsDropdown from './NotificationsDropdown';
import ThemeToggle from './ui/ThemeToggle';

interface NavigationProps {
  currentView: ViewState;
  setView: (view: ViewState) => void;
  onUserProfile?: (userId: string) => void;
  variant?: 'bottom' | 'sidebar';
}

const Navigation: React.FC<NavigationProps> = ({ currentView, setView, onUserProfile, variant = 'bottom' }) => {
  const { isAuthenticated, user } = useAuth();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  // Main nav items for mobile (4 items + More button)
  const mobileNavItems = [
    { view: ViewState.HOME, icon: '/images/ui/icon_home.png', label: 'Inicio', isImage: true },
    { view: ViewState.PROGRAM, icon: CalendarDays, label: 'Programa' },
    { view: ViewState.TIENDA, icon: '/images/ui/icon_market.png', label: 'Tienda', isImage: true },
    { view: ViewState.PROFILE, icon: User, label: 'Perfil' },
  ];

  // Items shown in desktop sidebar - all main items
  const mainNavItems = [
    { view: ViewState.HOME, icon: '/images/ui/icon_home.png', label: 'Inicio', isImage: true },
    { view: ViewState.PROGRAM, icon: CalendarDays, label: 'Programa' },
    { view: ViewState.TIENDA, icon: '/images/ui/icon_market.png', label: 'Tienda', isImage: true },
    { view: ViewState.SEARCH, icon: Search, label: 'Buscar' },
    { view: ViewState.PROFILE, icon: User, label: 'Perfil' },
  ];

  // Extra items for sidebar "Explorar" section
  const extraNavItems = [
    { view: ViewState.TRANSPORT, icon: '/images/ui/icon_transport.png', label: 'BinniBus', isImage: true },
    { view: ViewState.STREAMS, icon: '/images/ui/icon_live.png', label: 'En Vivo', isImage: true },
    { view: ViewState.SMART_MAP, icon: '/images/ui/icon_plan.png', label: 'Mapa', isImage: true },
    { view: ViewState.EXPERIENCES, icon: '/images/ui/icon_events.png', label: 'Tours', isImage: true },
    { view: ViewState.COMMUNITIES, icon: '/images/ui/icon_community.png', label: 'Comunidad', isImage: true },
    { view: ViewState.AR_SCANNER, icon: '/images/ui/icon_ar.png', label: 'AR Scanner', isImage: true },
    { view: ViewState.CHAT, icon: MessageCircle, label: 'GuelaBot' },
  ];

  // All extra items for mobile "More" menu (includes Search)
  const moreMenuItems = [
    { view: ViewState.SEARCH, icon: Search, label: 'Buscar' },
    ...extraNavItems,
  ];

  const handleNavClick = (view: ViewState) => {
    haptics.tap();
    setView(view);
  };

  // Sidebar variant for tablet/desktop
  if (variant === 'sidebar') {
    return (
      <>
        <aside
          className="hidden md:flex flex-col w-64 lg:w-72 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 h-full"
          role="complementary"
          aria-label="Barra lateral de navegación"
        >
          {/* Logo/Brand */}
          <div className="p-6 border-b border-gray-100 dark:border-gray-800">
            <h1 className="text-xl font-bold text-oaxaca-pink">Guelaguetza</h1>
            <p className="text-xs text-gray-500 dark:text-gray-500">Connect 2025</p>
          </div>

          {/* Main Navigation */}
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto" role="navigation" aria-label="Navegación principal">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 px-3" aria-hidden="true">Principal</p>
            {mainNavItems.map((item) => {
              const isActive = currentView === item.view;
              const isProfile = item.view === ViewState.PROFILE;

              return (
                <button
                  key={item.view}
                  onClick={() => handleNavClick(item.view)}
                  aria-label={item.label}
                  aria-current={isActive ? 'page' : undefined}
                  className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-xl transition-all ${isActive
                    ? 'bg-oaxaca-pink/10 text-oaxaca-pink font-medium'
                    : 'text-gray-600 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800'
                    }`}
                >
                  {isProfile && isAuthenticated && user?.faceData ? (
                    <img
                      src={user.faceData}
                      alt="Perfil"
                      className={`w-5 h-5 rounded-full object-cover ${isActive ? 'ring-2 ring-oaxaca-pink' : ''}`}
                    />
                  ) : item.isImage ? (
                    <img
                      src={item.icon as string}
                      alt={item.label}
                      className={`w-5 h-5 object-contain ${isActive ? 'brightness-100' : 'brightness-0 opacity-60 dark:invert'}`}
                    />
                  ) : (
                    <item.icon size={20} strokeWidth={isActive ? 2.5 : 2} aria-hidden="true" />
                  )}
                  <span className="text-sm">{item.label}</span>
                </button>
              );
            })}

            <div className="my-4 border-t border-gray-100 dark:border-gray-800" aria-hidden="true" />

            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 px-3" aria-hidden="true">Explorar</p>
            {extraNavItems.map((item) => {
              const isActive = currentView === item.view;

              return (
                <button
                  key={item.view}
                  onClick={() => handleNavClick(item.view)}
                  aria-label={item.label}
                  aria-current={isActive ? 'page' : undefined}
                  className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-xl transition-all ${isActive
                    ? 'bg-oaxaca-pink/10 text-oaxaca-pink font-medium'
                    : 'text-gray-600 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800'
                    }`}
                >
                  {item.isImage ? (
                    <img
                      src={item.icon as string}
                      alt={item.label}
                      className={`w-5 h-5 object-contain ${isActive ? 'brightness-100' : 'brightness-0 opacity-60 dark:invert'}`}
                    />
                  ) : (
                    <item.icon size={20} strokeWidth={isActive ? 2.5 : 2} aria-hidden="true" />
                  )}
                  <span className="text-sm">{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Theme Toggle & User Info */}
          <div className="p-4 border-t border-gray-100 dark:border-gray-800 space-y-4">
            {/* Theme Toggle */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Tema</span>
              <ThemeToggle variant="dropdown" size="sm" showLabel={false} />
            </div>

            {/* User Info & Notifications */}
            {isAuthenticated && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-oaxaca-pink/20 flex items-center justify-center">
                    {user?.faceData ? (
                      <img src={user.faceData} alt="" className="w-10 h-10 rounded-full object-cover" />
                    ) : (
                      <User size={20} className="text-oaxaca-pink" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                      {user?.nombre}
                    </p>
                    <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                  </div>
                </div>
                <NotificationBell onClick={() => setShowNotifications(true)} />
              </div>
            )}
          </div>
        </aside>

        {/* Notifications Dropdown */}
        <NotificationsDropdown
          isOpen={showNotifications}
          onClose={() => setShowNotifications(false)}
          onUserProfile={onUserProfile}
        />
      </>
    );
  }

  // Check if current view is in the "More" menu
  const isMoreActive = moreMenuItems.some(item => item.view === currentView);

  // Bottom variant for mobile
  return (
    <>
      {/* More Menu Bottom Sheet */}
      {showMoreMenu && (
        <div
          className="md:hidden fixed inset-0 z-[60]"
          role="dialog"
          aria-modal="true"
          aria-label="Menú de exploración"
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
            onClick={() => setShowMoreMenu(false)}
            aria-hidden="true"
          />

          {/* Bottom Sheet */}
          <div className="absolute bottom-0 left-0 right-0 bg-white dark:bg-gray-900 rounded-t-3xl pb-safe animate-slide-up">
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-2" aria-hidden="true">
              <div className="w-10 h-1 bg-gray-300 dark:bg-gray-600 rounded-full" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-6 pb-4 border-b border-gray-100 dark:border-gray-800">
              <h3 id="more-menu-title" className="text-lg font-semibold text-gray-900 dark:text-white">Explorar</h3>
              <button
                onClick={() => setShowMoreMenu(false)}
                className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                aria-label="Cerrar menú"
              >
                <X size={20} className="text-gray-500" />
              </button>
            </div>

            {/* Menu Grid */}
            <div className="grid grid-cols-4 gap-2 p-4">
              {moreMenuItems.map((item) => {
                const isActive = currentView === item.view;
                return (
                  <button
                    key={item.view}
                    onClick={() => {
                      handleNavClick(item.view);
                      setShowMoreMenu(false);
                    }}
                    className={`flex flex-col items-center justify-center p-3 rounded-2xl transition-all ${isActive
                      ? 'bg-oaxaca-pink/10 text-oaxaca-pink'
                      : 'text-gray-600 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800'
                      }`}
                  >
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-2 ${isActive
                      ? 'bg-oaxaca-pink/20'
                      : 'bg-gray-100 dark:bg-gray-800'
                      }`}>
                      {item.isImage ? (
                        <img
                          src={item.icon as string}
                          alt={item.label}
                          className={`w-6 h-6 object-contain ${isActive ? 'brightness-100' : 'brightness-0 opacity-60 dark:invert'}`}
                        />
                      ) : (
                        <item.icon size={24} strokeWidth={isActive ? 2.5 : 2} />
                      )}
                    </div>
                    <span className="text-xs font-medium text-center leading-tight">{item.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Theme Toggle for Mobile */}
            <div className="px-4 pb-4 pt-2 border-t border-gray-100 dark:border-gray-800 mt-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Tema</span>
                <ThemeToggle variant="dropdown" size="sm" showLabel />
              </div>
            </div>
          </div>
        </div>
      )}

      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 pb-safe z-50 transition-colors"
        role="navigation"
        aria-label="Navegacion principal"
      >
        {/* Minimum height of 64px ensures 44px touch targets with some padding */}
        <div className="flex justify-around items-center h-16 sm:h-[68px]">
          {mobileNavItems.map((item) => {
            const isActive = currentView === item.view;
            const isProfile = item.view === ViewState.PROFILE;

            return (
              <button
                key={item.view}
                onClick={() => handleNavClick(item.view)}
                aria-label={item.label}
                aria-current={isActive ? 'page' : undefined}
                className={`flex flex-col items-center justify-center w-full h-full min-h-[48px] transition-colors duration-200 focus-visible:bg-gray-100 dark:focus-visible:bg-gray-800 focus-visible:outline-none ${isActive ? 'text-oaxaca-pink' : 'text-gray-500 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'
                  }`}
              >
                {isProfile && isAuthenticated && user?.faceData ? (
                  <div className="relative">
                    <img
                      src={user.faceData}
                      alt="Perfil"
                      className={`w-6 h-6 rounded-full object-cover ${isActive ? 'ring-2 ring-oaxaca-pink' : ''}`}
                    />
                  </div>
                ) : isProfile ? (
                  <div className="relative">
                    <item.icon size={24} strokeWidth={isActive ? 2.5 : 2} />
                  </div>
                ) : item.isImage ? (
                  <img
                    src={item.icon as string}
                    alt={item.label}
                    className={`w-6 h-6 object-contain mb-0.5 ${isActive ? 'brightness-100' : 'brightness-0 opacity-60 dark:invert'}`}
                  />
                ) : (
                  <item.icon size={24} strokeWidth={isActive ? 2.5 : 2} />
                )}
                <span className="text-[10px] font-medium mt-1">{item.label}</span>
              </button>
            );
          })}

          {/* More Button - With minimum 44px touch target */}
          <button
            onClick={() => {
              haptics.tap();
              setShowMoreMenu(true);
            }}
            aria-label="Mas opciones"
            aria-expanded={showMoreMenu}
            aria-haspopup="dialog"
            className={`flex flex-col items-center justify-center w-full h-full min-h-[48px] transition-colors duration-200 focus-visible:bg-gray-100 dark:focus-visible:bg-gray-800 focus-visible:outline-none ${isMoreActive ? 'text-oaxaca-pink' : 'text-gray-500 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'
              }`}
          >
            <MoreHorizontal size={24} strokeWidth={isMoreActive ? 2.5 : 2} aria-hidden="true" />
            <span className="text-[10px] sm:text-xs font-medium mt-1">Mas</span>
          </button>
        </div>

        {/* Notification Bell - floating above nav */}
        {isAuthenticated && (
          <div className="absolute -top-10 right-4">
            <NotificationBell onClick={() => setShowNotifications(true)} />
          </div>
        )}
      </nav>

      {/* Notifications Dropdown */}
      <NotificationsDropdown
        isOpen={showNotifications}
        onClose={() => setShowNotifications(false)}
        onUserProfile={onUserProfile}
      />
    </>
  );
};

export default Navigation;
