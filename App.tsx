import React, { useState, useEffect, lazy, Suspense, useRef } from 'react';
import Navigation from './components/Navigation';
import PageTransition from './components/ui/PageTransition';
import HomeView from './components/HomeView';
import TransportView from './components/TransportView';
import StoriesView from './components/StoriesView';
import ChatAssistant from './components/ChatAssistant';
import ProgramView from './components/ProgramView';
import LoginView from './components/LoginView';
import RegisterView from './components/RegisterView';
import ProfileView from './components/ProfileView';
import UserProfileView from './components/UserProfileView';
import BadgesView from './components/BadgesView';
import LeaderboardView from './components/LeaderboardView';
import DirectMessagesView from './components/DirectMessagesView';
import DirectChatView from './components/DirectChatView';
import SearchView from './components/SearchView';
import EventsView from './components/EventsView';
import EventDetailView from './components/EventDetailView';
import AnalyticsDashboard from './components/AnalyticsDashboard';
import AdminDashboard from './components/admin/AdminDashboard';
import MetricsDashboard from './components/admin/MetricsDashboard';
import CommunitiesView from './components/CommunitiesView';
import CommunityDetailView from './components/CommunityDetailView';
// Phase 6 components
import ExperiencesView from './components/ExperiencesView';
import ExperienceDetailView from './components/ExperienceDetailView';
import MyBookingsView from './components/MyBookingsView';
import ARMapView from './components/ARMapView';
import POIDetailView from './components/POIDetailView';
import TiendaView from './components/TiendaView';
import ProductDetailView from './components/ProductDetailView';
import CartView from './components/CartView';
import CheckoutView from './components/CheckoutView';
import WishlistView from './components/WishlistView';
import StreamsView from './components/StreamsView';
import StreamWatchView from './components/StreamWatchView';
import OfflineIndicator from './components/OfflineIndicator';
import UpdatePrompt from './components/UpdatePrompt';
import NotificationPrompt from './components/NotificationPrompt';
import Onboarding from './components/Onboarding';
import DemoUserSelector from './components/DemoUserSelector';
// Landing and role-specific views
import LandingView from './components/LandingView';
import GuideDashboard from './components/GuideDashboard';
import SellerDashboard from './components/SellerDashboard';
import SmartMapView from './components/SmartMapView';
import { ViewState } from './types';
import { Eye } from 'lucide-react';
import { Participant } from './services/dm';
import { useAuth } from './contexts/AuthContext';

// Lazy load ARScanner for code splitting
const ARScanner = lazy(() => import('./components/ARScanner'));

const App: React.FC = () => {
  const { isAuthenticated, isDemoMode, user } = useAuth();
  const [currentView, setCurrentView] = useState<ViewState>(ViewState.HOME);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [previousView, setPreviousView] = useState<ViewState>(ViewState.HOME);
  const [showLanding, setShowLanding] = useState(true);
  const [adminViewingAsUser, setAdminViewingAsUser] = useState(false);

  // DM state
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [selectedParticipant, setSelectedParticipant] = useState<Participant | null>(null);

  // Events state
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

  // Communities state
  const [selectedCommunityId, setSelectedCommunityId] = useState<string | null>(null);

  // Phase 6 state
  const [selectedExperienceId, setSelectedExperienceId] = useState<string | null>(null);
  const [selectedPoiId, setSelectedPoiId] = useState<string | null>(null);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [selectedStreamId, setSelectedStreamId] = useState<string | null>(null);

  // Handle user selection from landing - receives role directly to avoid race condition
  const handleUserSelected = (selectedRole?: string) => {
    setShowLanding(false);
    setAdminViewingAsUser(false); // Reset admin view mode
    // Set initial view based on selected role
    const role = selectedRole || user?.role;
    if (role === 'ADMIN') {
      setCurrentView(ViewState.ADMIN);
    } else if (role === 'SELLER' || role === 'HOST') {
      // Both SELLER and HOST (legacy) use the unified SellerDashboard
      setCurrentView(ViewState.SELLER_DASHBOARD);
    } else {
      setCurrentView(ViewState.HOME);
    }
  };

  const handleViewUserProfile = (userId: string) => {
    setSelectedUserId(userId);
    setPreviousView(currentView);
    setCurrentView(ViewState.USER_PROFILE);
  };

  const handleOpenChat = (conversationId: string, participant: Participant) => {
    setSelectedConversationId(conversationId);
    setSelectedParticipant(participant);
    setCurrentView(ViewState.DIRECT_CHAT);
  };

  const handleEventDetail = (eventId: string) => {
    setSelectedEventId(eventId);
    setCurrentView(ViewState.EVENT_DETAIL);
  };

  const handleCommunityDetail = (communityId: string) => {
    setSelectedCommunityId(communityId);
    setCurrentView(ViewState.COMMUNITY_DETAIL);
  };

  // Phase 6 handlers
  const handleNavigate = (view: ViewState, data?: unknown) => {
    const d = data as Record<string, unknown> | undefined;
    if (d?.experienceId) setSelectedExperienceId(d.experienceId as string);
    if (d?.poiId) setSelectedPoiId(d.poiId as string);
    if (d?.productId) setSelectedProductId(d.productId as string);
    if (d?.streamId) setSelectedStreamId(d.streamId as string);
    setCurrentView(view);
  };

  // Check if onboarding has been completed
  useEffect(() => {
    const completed = localStorage.getItem('guelaguetza_onboarding_completed');
    if (!completed) {
      setShowOnboarding(true);
    }
  }, []);

  const renderView = () => {
    switch (currentView) {
      case ViewState.HOME:
        return <HomeView setView={setCurrentView} />;
      case ViewState.TRANSPORT:
        return <TransportView onBack={() => setCurrentView(ViewState.HOME)} />;
      case ViewState.AR_SCANNER:
        return (
          <Suspense fallback={<div className="flex items-center justify-center h-full">Cargando AR...</div>}>
            <ARScanner onBack={() => setCurrentView(ViewState.HOME)} />
          </Suspense>
        );
      case ViewState.STORIES:
        return <StoriesView onUserProfile={handleViewUserProfile} onBack={() => setCurrentView(ViewState.HOME)} />;
      case ViewState.USER_PROFILE:
        return selectedUserId ? (
          <UserProfileView
            userId={selectedUserId}
            onBack={() => setCurrentView(previousView)}
            onOpenChat={handleOpenChat}
          />
        ) : (
          <StoriesView onUserProfile={handleViewUserProfile} />
        );
      case ViewState.CHAT:
        return <ChatAssistant onBack={() => setCurrentView(ViewState.HOME)} />;
      case ViewState.PROGRAM:
        return <ProgramView onBack={() => setCurrentView(ViewState.HOME)} />;
      case ViewState.LOGIN:
        return <LoginView setView={setCurrentView} />;
      case ViewState.REGISTER:
        return <RegisterView setView={setCurrentView} />;
      case ViewState.PROFILE:
        return <ProfileView setView={setCurrentView} />;
      case ViewState.BADGES:
        return <BadgesView onBack={() => setCurrentView(ViewState.PROFILE)} />;
      case ViewState.LEADERBOARD:
        return (
          <LeaderboardView
            onBack={() => setCurrentView(ViewState.PROFILE)}
            onUserProfile={handleViewUserProfile}
          />
        );
      case ViewState.DIRECT_MESSAGES:
        return (
          <DirectMessagesView
            onBack={() => setCurrentView(ViewState.PROFILE)}
            onOpenChat={handleOpenChat}
          />
        );
      case ViewState.DIRECT_CHAT:
        return selectedConversationId && selectedParticipant ? (
          <DirectChatView
            conversationId={selectedConversationId}
            participant={selectedParticipant}
            onBack={() => setCurrentView(ViewState.DIRECT_MESSAGES)}
            onUserProfile={handleViewUserProfile}
          />
        ) : (
          <DirectMessagesView
            onBack={() => setCurrentView(ViewState.PROFILE)}
            onOpenChat={handleOpenChat}
          />
        );
      case ViewState.SEARCH:
        return (
          <SearchView
            onBack={() => setCurrentView(ViewState.HOME)}
            onUserProfile={handleViewUserProfile}
          />
        );
      case ViewState.EVENTS:
        return (
          <EventsView
            onBack={() => setCurrentView(ViewState.HOME)}
            onEventDetail={handleEventDetail}
          />
        );
      case ViewState.EVENT_DETAIL:
        return selectedEventId ? (
          <EventDetailView
            eventId={selectedEventId}
            onBack={() => setCurrentView(ViewState.EVENTS)}
          />
        ) : (
          <EventsView
            onBack={() => setCurrentView(ViewState.HOME)}
            onEventDetail={handleEventDetail}
          />
        );
      case ViewState.ANALYTICS:
        return (
          <AnalyticsDashboard
            onBack={() => setCurrentView(ViewState.PROFILE)}
          />
        );
      case ViewState.ADMIN:
        return (
          <MetricsDashboard
            onBack={() => setShowLanding(true)}
            onNavigate={(view: ViewState) => {
              if (view === ViewState.HOME) {
                setAdminViewingAsUser(true);
              }
              setCurrentView(view);
            }}
          />
        );
      case ViewState.SELLER_DASHBOARD:
        return (
          <SellerDashboard
            onBack={() => setShowLanding(true)}
            onNavigate={(view: ViewState) => setCurrentView(view)}
          />
        );
      case ViewState.GUIDE_DASHBOARD:
        // Legacy: redirect to SellerDashboard
        return (
          <SellerDashboard
            onBack={() => setShowLanding(true)}
            onNavigate={(view: ViewState) => setCurrentView(view)}
          />
        );
      case ViewState.COMMUNITIES:
        return (
          <CommunitiesView
            onCommunityClick={handleCommunityDetail}
            onBack={() => setCurrentView(ViewState.HOME)}
          />
        );
      case ViewState.COMMUNITY_DETAIL:
        return selectedCommunityId ? (
          <CommunityDetailView
            communityId={selectedCommunityId}
            onBack={() => setCurrentView(ViewState.COMMUNITIES)}
            onUserProfile={handleViewUserProfile}
          />
        ) : (
          <CommunitiesView
            onCommunityClick={handleCommunityDetail}
          />
        );
      // Phase 6: Experiences/Bookings
      case ViewState.EXPERIENCES:
        return (
          <ExperiencesView
            onNavigate={handleNavigate}
            onBack={() => setCurrentView(ViewState.HOME)}
          />
        );
      case ViewState.EXPERIENCE_DETAIL:
        return selectedExperienceId ? (
          <ExperienceDetailView
            experienceId={selectedExperienceId}
            onNavigate={handleNavigate}
            onBack={() => setCurrentView(ViewState.EXPERIENCES)}
          />
        ) : (
          <ExperiencesView
            onNavigate={handleNavigate}
            onBack={() => setCurrentView(ViewState.HOME)}
          />
        );
      case ViewState.MY_BOOKINGS:
        return (
          <MyBookingsView
            onNavigate={handleNavigate}
            onBack={() => setCurrentView(ViewState.EXPERIENCES)}
          />
        );
      // Phase 6: AR Map
      case ViewState.AR_MAP:
        return (
          <ARMapView
            onNavigate={handleNavigate}
            onBack={() => setCurrentView(ViewState.HOME)}
          />
        );
      case ViewState.POI_DETAIL:
        return selectedPoiId ? (
          <POIDetailView
            poiId={selectedPoiId}
            onNavigate={handleNavigate}
            onBack={() => setCurrentView(ViewState.AR_MAP)}
          />
        ) : (
          <ARMapView
            onNavigate={handleNavigate}
            onBack={() => setCurrentView(ViewState.HOME)}
          />
        );
      case ViewState.SMART_MAP:
        return (
          <SmartMapView
            onBack={() => setCurrentView(ViewState.HOME)}
          />
        );
      // Phase 6: Marketplace
      case ViewState.TIENDA:
        return (
          <TiendaView
            onNavigate={handleNavigate}
            onBack={() => setCurrentView(ViewState.HOME)}
          />
        );
      case ViewState.PRODUCT_DETAIL:
        return selectedProductId ? (
          <ProductDetailView
            productId={selectedProductId}
            onNavigate={handleNavigate}
            onBack={() => setCurrentView(ViewState.TIENDA)}
          />
        ) : (
          <TiendaView
            onNavigate={handleNavigate}
            onBack={() => setCurrentView(ViewState.HOME)}
          />
        );
      case ViewState.CART:
        return (
          <CartView
            onNavigate={handleNavigate}
            onBack={() => setCurrentView(ViewState.TIENDA)}
          />
        );
      case ViewState.CHECKOUT:
        return (
          <CheckoutView
            onNavigate={handleNavigate}
            onBack={() => setCurrentView(ViewState.CART)}
          />
        );
      case ViewState.ORDERS:
        return (
          <CartView
            onNavigate={handleNavigate}
            onBack={() => setCurrentView(ViewState.TIENDA)}
          />
        );
      case ViewState.WISHLIST:
        return (
          <WishlistView
            onNavigate={handleNavigate}
            onBack={() => setCurrentView(ViewState.HOME)}
          />
        );
      // Phase 6: Streaming
      case ViewState.STREAMS:
        return (
          <StreamsView
            onNavigate={handleNavigate}
            onBack={() => setCurrentView(ViewState.HOME)}
          />
        );
      case ViewState.STREAM_WATCH:
        return selectedStreamId ? (
          <StreamWatchView
            streamId={selectedStreamId}
            onNavigate={handleNavigate}
            onBack={() => setCurrentView(ViewState.STREAMS)}
          />
        ) : (
          <StreamsView
            onNavigate={handleNavigate}
            onBack={() => setCurrentView(ViewState.HOME)}
          />
        );
      default:
        return <HomeView setView={setCurrentView} />;
    }
  };

  // Hide navigation on auth screens, user profile, gamification views, and new feature views
  const hideNav = [
    ViewState.LOGIN,
    ViewState.REGISTER,
    ViewState.USER_PROFILE,
    ViewState.BADGES,
    ViewState.LEADERBOARD,
    ViewState.DIRECT_MESSAGES,
    ViewState.DIRECT_CHAT,
    ViewState.SEARCH,
    ViewState.EVENTS,
    ViewState.EVENT_DETAIL,
    ViewState.ANALYTICS,
    ViewState.ADMIN,
    ViewState.GUIDE_DASHBOARD,
    ViewState.SELLER_DASHBOARD,
    ViewState.COMMUNITIES,
    ViewState.COMMUNITY_DETAIL,
    // Phase 6 views
    ViewState.EXPERIENCES,
    ViewState.EXPERIENCE_DETAIL,
    ViewState.MY_BOOKINGS,
    ViewState.AR_MAP,
    ViewState.POI_DETAIL,
    ViewState.SMART_MAP,
    ViewState.TIENDA,
    ViewState.PRODUCT_DETAIL,
    ViewState.CART,
    ViewState.CHECKOUT,
    ViewState.ORDERS,
    ViewState.STREAMS,
    ViewState.STREAM_WATCH,
  ].includes(currentView);

  // Show landing page if not authenticated or showLanding is true
  if (showLanding) {
    return <LandingView onUserSelected={handleUserSelected} />;
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-950 font-sans transition-colors">
      {/* Demo Mode Indicator */}
      {isDemoMode && !adminViewingAsUser && (
        <div className="fixed top-0 left-0 right-0 bg-gradient-to-r from-oaxaca-sky to-oaxaca-purple text-white text-xs py-1.5 px-4 z-50 flex items-center justify-between">
          <span className="hidden sm:inline">Modo Demo: {user?.nombre}</span>
          <span className="sm:hidden">Demo</span>
          <DemoUserSelector
            compact
            onUserChange={(type) => {
              // Map demo type to role and navigate
              const roleMap: Record<string, string> = {
                user: 'USER',
                seller: 'SELLER',
                admin: 'ADMIN',
              };
              handleUserSelected(roleMap[type]);
            }}
          />
        </div>
      )}

      {/* Admin Viewing as User Banner */}
      {adminViewingAsUser && user?.role === 'ADMIN' && (
        <div className="fixed top-0 left-0 right-0 bg-gradient-to-r from-oaxaca-purple to-oaxaca-pink text-white text-xs py-2 px-4 z-50 flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Eye size={14} />
            <span className="hidden sm:inline">Modo Vista de Usuario - Administrador</span>
            <span className="sm:hidden">Vista Usuario</span>
          </span>
          <button
            onClick={() => {
              setAdminViewingAsUser(false);
              setCurrentView(ViewState.ADMIN);
            }}
            className="bg-white/20 hover:bg-white/30 px-3 py-1 rounded-full transition text-xs font-medium"
          >
            Volver al Panel
          </button>
        </div>
      )}

      <div className={`flex h-screen ${isDemoMode || adminViewingAsUser ? 'pt-8' : ''}`}>
        {/* Sidebar Navigation - Desktop/Tablet */}
        {!hideNav && (
          <Navigation
            currentView={currentView}
            setView={setCurrentView}
            onUserProfile={handleViewUserProfile}
            variant="sidebar"
          />
        )}

        {/* Main Content */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {/* Onboarding */}
          {showOnboarding && <Onboarding onComplete={() => setShowOnboarding(false)} />}

          {/* PWA Offline Indicator */}
          <OfflineIndicator />

          <div className="flex-1 overflow-y-auto no-scrollbar scroll-smooth bg-white dark:bg-gray-900 lg:rounded-tl-2xl">
            <PageTransition key={currentView} type="fade" duration={200}>
              {renderView()}
            </PageTransition>
          </div>

          {/* Bottom Navigation - Mobile Only */}
          {!hideNav && (
            <Navigation
              currentView={currentView}
              setView={setCurrentView}
              onUserProfile={handleViewUserProfile}
              variant="bottom"
            />
          )}
        </main>
      </div>

      {/* PWA Prompts */}
      <NotificationPrompt />
      <UpdatePrompt />
    </div>
  );
};

export default App;
