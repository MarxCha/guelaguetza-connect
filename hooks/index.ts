// Hooks exportados

// Concurrency error handling hooks
export { useCreateBooking, isConcurrencyError } from './useCreateBooking';
export type { ConcurrencyError, UseCreateBookingResult } from './useCreateBooking';

export { useCreateOrder, isStockConflictError } from './useCreateOrder';
export type { StockError, UseCreateOrderResult } from './useCreateOrder';

// Other hooks
export { useOffline } from './useOffline';
export { usePullToRefresh } from './usePullToRefresh';
export { default as useSwipe } from './useSwipe';

// Admin dashboard hooks
export {
  useAdminStats,
  useBookingTrends,
  useRegionData,
  useCategoryDistribution,
  useRevenueData,
  useHeatmapData,
  useTopExperiences,
  useTopSellers,
  useRecentBookings,
} from './useAdminStats';

export type {
  AdminStats,
  BookingTrend,
  RegionData,
  CategoryDistribution,
  RevenueData,
  HeatmapData,
  TopExperience,
  TopSeller,
  RecentBooking,
  PeriodFilter,
} from './useAdminStats';
