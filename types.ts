export enum ViewState {
  HOME = 'HOME',
  TRANSPORT = 'TRANSPORT',
  AR_SCANNER = 'AR_SCANNER',
  STORIES = 'STORIES',
  CHAT = 'CHAT',
  PROGRAM = 'PROGRAM',
  LOGIN = 'LOGIN',
  REGISTER = 'REGISTER',
  PROFILE = 'PROFILE',
  USER_PROFILE = 'USER_PROFILE',
  BADGES = 'BADGES',
  LEADERBOARD = 'LEADERBOARD',
  DIRECT_MESSAGES = 'DIRECT_MESSAGES',
  DIRECT_CHAT = 'DIRECT_CHAT',
  SEARCH = 'SEARCH',
  EVENTS = 'EVENTS',
  EVENT_DETAIL = 'EVENT_DETAIL',
  ANALYTICS = 'ANALYTICS',
  ADMIN = 'ADMIN',
  ADMIN_ADVANCED = 'ADMIN_ADVANCED',
  COMMUNITIES = 'COMMUNITIES',
  COMMUNITY_DETAIL = 'COMMUNITY_DETAIL',
  // Role-specific dashboards
  GUIDE_DASHBOARD = 'GUIDE_DASHBOARD',
  SELLER_DASHBOARD = 'SELLER_DASHBOARD',
  // Phase 6: Marketplace
  TIENDA = 'TIENDA',
  PRODUCT_DETAIL = 'PRODUCT_DETAIL',
  CART = 'CART',
  CHECKOUT = 'CHECKOUT',
  ORDERS = 'ORDERS',
  WISHLIST = 'WISHLIST',
  // Phase 6: Streaming
  STREAMS = 'STREAMS',
  STREAM_WATCH = 'STREAM_WATCH',
  // Phase 6: AR Map
  AR_MAP = 'AR_MAP',
  POI_DETAIL = 'POI_DETAIL',
  SMART_MAP = 'SMART_MAP',
  // Phase 6: Reservaciones
  EXPERIENCES = 'EXPERIENCES',
  EXPERIENCE_DETAIL = 'EXPERIENCE_DETAIL',
  MY_BOOKINGS = 'MY_BOOKINGS'
}

export interface BusRoute {
  id: string;
  name: string;
  color: string;
  type: 'TRONCAL' | 'ESPECIAL' | 'PEATONAL';
  eta: number; // minutes
  stops: string[];
}

export interface Story {
  id: string;
  user: string;
  avatar: string;
  mediaUrl: string; // Image or Video placeholder
  location: string;
  likes: number;
  description: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
}

export interface CulturalPoint {
  id: string;
  title: string;
  description: string;
  coordinate: { x: number; y: number }; // Relative percentage for map
  type: 'EVENT' | 'LANDMARK';
}
