import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  AdminFilters,
  PeriodFilter,
  DataTypeFilter,
  StatusFilter,
  AdvancedAdminStats,
  TrendDataPoint,
  AdvancedRegionData,
  AdvancedCategoryDistribution,
  StatusDistribution,
  AdvancedRevenueDataPoint,
  AdvancedTopExperience,
  AdvancedTopSeller,
  RecentActivity,
  getAdvancedStats,
  getAdvancedTrends,
  getAdvancedRegionData,
  getAdvancedCategoryDistribution,
  getStatusDistribution,
  getAdvancedRevenueData,
  getAdvancedTopExperiences,
  getAdvancedTopSellers,
  getRecentActivity,
  generateAdvancedMockStats,
  generateAdvancedMockTrends,
  generateAdvancedMockRegionData,
  generateAdvancedMockCategoryDistribution,
  generateMockStatusDistribution,
  generateAdvancedMockRevenueData,
  generateAdvancedMockTopExperiences,
  generateAdvancedMockTopSellers,
  generateMockRecentActivity,
} from '../services/admin';

// Re-export types for convenience
export type {
  PeriodFilter,
  DataTypeFilter,
  StatusFilter,
  AdminFilters,
  AdvancedAdminStats as AdminStats,
  TrendDataPoint as BookingTrend,
  AdvancedRegionData as RegionData,
  AdvancedCategoryDistribution as CategoryDistribution,
  StatusDistribution,
  AdvancedRevenueDataPoint as RevenueData,
  AdvancedTopExperience as TopExperience,
  AdvancedTopSeller as TopSeller,
  RecentActivity as RecentBooking,
};

// Legacy types for backward compatibility
export interface HeatmapData {
  day: number;
  hour: number;
  value: number;
}

// Default filters
export const DEFAULT_FILTERS: AdminFilters = {
  period: '30d',
  dataType: 'all',
  status: 'all',
};

// ==========================================
// useAdminFilters - Manages filter state
// ==========================================

export function useAdminFilters(initialFilters: Partial<AdminFilters> = {}) {
  const [filters, setFilters] = useState<AdminFilters>({
    ...DEFAULT_FILTERS,
    ...initialFilters,
  });

  const setPeriod = useCallback((period: PeriodFilter) => {
    setFilters((prev) => ({ ...prev, period }));
  }, []);

  const setDataType = useCallback((dataType: DataTypeFilter) => {
    setFilters((prev) => ({ ...prev, dataType }));
  }, []);

  const setStatus = useCallback((status: StatusFilter) => {
    setFilters((prev) => ({ ...prev, status }));
  }, []);

  const setCustomDateRange = useCallback((startDate: string, endDate: string) => {
    setFilters((prev) => ({
      ...prev,
      period: 'custom',
      startDate,
      endDate,
    }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
  }, []);

  return {
    filters,
    setFilters,
    setPeriod,
    setDataType,
    setStatus,
    setCustomDateRange,
    resetFilters,
  };
}

// ==========================================
// useAdminStats - Main stats hook
// ==========================================

export function useAdminStats(period: PeriodFilter = '30d', dataType: DataTypeFilter = 'all', status: StatusFilter = 'all') {
  const { token } = useAuth();
  const [stats, setStats] = useState<AdvancedAdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const filters: AdminFilters = useMemo(
    () => ({ period, dataType, status }),
    [period, dataType, status]
  );

  const fetchStats = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      if (token) {
        const data = await getAdvancedStats(filters, token);
        setStats(data);
      } else {
        setStats(generateAdvancedMockStats(filters));
      }
    } catch {
      setStats(generateAdvancedMockStats(filters));
    } finally {
      setLoading(false);
    }
  }, [token, filters]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return { stats, loading, error, refetch: fetchStats };
}

// ==========================================
// useAdvancedAdminStats - With full filters
// ==========================================

export function useAdvancedAdminStats(filters: AdminFilters) {
  const { token } = useAuth();
  const [stats, setStats] = useState<AdvancedAdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      if (token) {
        const data = await getAdvancedStats(filters, token);
        setStats(data);
      } else {
        setStats(generateAdvancedMockStats(filters));
      }
    } catch {
      setStats(generateAdvancedMockStats(filters));
    } finally {
      setLoading(false);
    }
  }, [token, filters]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return { stats, loading, error, refetch: fetchStats };
}

// ==========================================
// useBookingTrends - Trend data hook
// ==========================================

export function useBookingTrends(period: PeriodFilter = '30d', dataType: DataTypeFilter = 'all') {
  const { token } = useAuth();
  const [trends, setTrends] = useState<TrendDataPoint[]>([]);
  const [loading, setLoading] = useState(true);

  const filters: AdminFilters = useMemo(
    () => ({ period, dataType, status: 'all' }),
    [period, dataType]
  );

  const fetchTrends = useCallback(async () => {
    setLoading(true);

    try {
      if (token) {
        const data = await getAdvancedTrends(filters, token);
        setTrends(data);
      } else {
        setTrends(generateAdvancedMockTrends(filters));
      }
    } catch {
      setTrends(generateAdvancedMockTrends(filters));
    } finally {
      setLoading(false);
    }
  }, [token, filters]);

  useEffect(() => {
    fetchTrends();
  }, [fetchTrends]);

  return { trends, loading, refetch: fetchTrends };
}

// ==========================================
// useAdvancedTrends - With full filters
// ==========================================

export function useAdvancedTrends(filters: AdminFilters) {
  const { token } = useAuth();
  const [trends, setTrends] = useState<TrendDataPoint[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTrends = useCallback(async () => {
    setLoading(true);

    try {
      if (token) {
        const data = await getAdvancedTrends(filters, token);
        setTrends(data);
      } else {
        setTrends(generateAdvancedMockTrends(filters));
      }
    } catch {
      setTrends(generateAdvancedMockTrends(filters));
    } finally {
      setLoading(false);
    }
  }, [token, filters]);

  useEffect(() => {
    fetchTrends();
  }, [fetchTrends]);

  return { trends, loading, refetch: fetchTrends };
}

// ==========================================
// useRegionData
// ==========================================

export function useRegionData(filters?: AdminFilters) {
  const { token } = useAuth();
  const [regions, setRegions] = useState<AdvancedRegionData[]>([]);
  const [loading, setLoading] = useState(true);

  const effectiveFilters = filters || DEFAULT_FILTERS;

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        if (token) {
          const data = await getAdvancedRegionData(effectiveFilters, token);
          setRegions(data);
        } else {
          setRegions(generateAdvancedMockRegionData());
        }
      } catch {
        setRegions(generateAdvancedMockRegionData());
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [token, effectiveFilters]);

  return { regions, loading };
}

// ==========================================
// useCategoryDistribution
// ==========================================

export function useCategoryDistribution(filters?: AdminFilters) {
  const { token } = useAuth();
  const [categories, setCategories] = useState<AdvancedCategoryDistribution[]>([]);
  const [loading, setLoading] = useState(true);

  const effectiveFilters = filters || DEFAULT_FILTERS;

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        if (token) {
          const data = await getAdvancedCategoryDistribution(effectiveFilters, token);
          setCategories(data);
        } else {
          setCategories(generateAdvancedMockCategoryDistribution());
        }
      } catch {
        setCategories(generateAdvancedMockCategoryDistribution());
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [token, effectiveFilters]);

  return { categories, loading };
}

// ==========================================
// useStatusDistribution
// ==========================================

export function useStatusDistribution(filters: AdminFilters) {
  const { token } = useAuth();
  const [statusData, setStatusData] = useState<StatusDistribution[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        if (token) {
          const data = await getStatusDistribution(filters, token);
          setStatusData(data);
        } else {
          setStatusData(generateMockStatusDistribution(filters));
        }
      } catch {
        setStatusData(generateMockStatusDistribution(filters));
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [token, filters]);

  return { statusData, loading };
}

// ==========================================
// useRevenueData
// ==========================================

export function useRevenueData(period: PeriodFilter = '30d', dataType: DataTypeFilter = 'all') {
  const { token } = useAuth();
  const [revenue, setRevenue] = useState<AdvancedRevenueDataPoint[]>([]);
  const [loading, setLoading] = useState(true);

  const filters: AdminFilters = useMemo(
    () => ({ period, dataType, status: 'all' }),
    [period, dataType]
  );

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        if (token) {
          const data = await getAdvancedRevenueData(filters, token);
          setRevenue(data);
        } else {
          setRevenue(generateAdvancedMockRevenueData(filters));
        }
      } catch {
        setRevenue(generateAdvancedMockRevenueData(filters));
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [token, filters]);

  return { revenue, loading };
}

// ==========================================
// useAdvancedRevenueData - With full filters
// ==========================================

export function useAdvancedRevenueData(filters: AdminFilters) {
  const { token } = useAuth();
  const [revenue, setRevenue] = useState<AdvancedRevenueDataPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        if (token) {
          const data = await getAdvancedRevenueData(filters, token);
          setRevenue(data);
        } else {
          setRevenue(generateAdvancedMockRevenueData(filters));
        }
      } catch {
        setRevenue(generateAdvancedMockRevenueData(filters));
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [token, filters]);

  return { revenue, loading };
}

// ==========================================
// useHeatmapData
// ==========================================

export function useHeatmapData() {
  const [heatmap, setHeatmap] = useState<HeatmapData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Generate mock heatmap data
    const data: HeatmapData[] = [];

    for (let day = 0; day < 7; day++) {
      for (let hour = 0; hour < 24; hour++) {
        let baseValue = 0;
        if (hour >= 9 && hour <= 18) {
          baseValue = 30 + Math.random() * 50;
        } else if (hour >= 6 && hour <= 21) {
          baseValue = 10 + Math.random() * 30;
        } else {
          baseValue = Math.random() * 10;
        }

        if (day === 5 || day === 6) {
          baseValue *= 1.3;
        }

        data.push({
          day,
          hour,
          value: Math.floor(baseValue),
        });
      }
    }

    setTimeout(() => {
      setHeatmap(data);
      setLoading(false);
    }, 500);
  }, []);

  return { heatmap, loading };
}

// ==========================================
// useTopExperiences
// ==========================================

export function useTopExperiences(filters?: AdminFilters) {
  const { token } = useAuth();
  const [experiences, setExperiences] = useState<AdvancedTopExperience[]>([]);
  const [loading, setLoading] = useState(true);

  const effectiveFilters = filters || DEFAULT_FILTERS;

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        if (token) {
          const data = await getAdvancedTopExperiences(effectiveFilters, token);
          setExperiences(data);
        } else {
          setExperiences(generateAdvancedMockTopExperiences());
        }
      } catch {
        setExperiences(generateAdvancedMockTopExperiences());
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [token, effectiveFilters]);

  return { experiences, loading };
}

// ==========================================
// useTopSellers
// ==========================================

export function useTopSellers(filters?: AdminFilters) {
  const { token } = useAuth();
  const [sellers, setSellers] = useState<AdvancedTopSeller[]>([]);
  const [loading, setLoading] = useState(true);

  const effectiveFilters = filters || DEFAULT_FILTERS;

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        if (token) {
          const data = await getAdvancedTopSellers(effectiveFilters, token);
          setSellers(data);
        } else {
          setSellers(generateAdvancedMockTopSellers());
        }
      } catch {
        setSellers(generateAdvancedMockTopSellers());
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [token, effectiveFilters]);

  return { sellers, loading };
}

// ==========================================
// useRecentBookings / useRecentActivity
// ==========================================

export function useRecentBookings(filters?: AdminFilters) {
  const { token } = useAuth();
  const [bookings, setBookings] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);

  const effectiveFilters = filters || DEFAULT_FILTERS;

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        if (token) {
          const data = await getRecentActivity(effectiveFilters, token);
          setBookings(data);
        } else {
          setBookings(generateMockRecentActivity(effectiveFilters));
        }
      } catch {
        setBookings(generateMockRecentActivity(effectiveFilters));
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [token, effectiveFilters]);

  return { bookings, loading };
}

// ==========================================
// useAllDashboardData - Combined hook for all data
// ==========================================

export function useAllDashboardData(filters: AdminFilters) {
  const { stats, loading: statsLoading, refetch: refetchStats } = useAdvancedAdminStats(filters);
  const { trends, loading: trendsLoading, refetch: refetchTrends } = useAdvancedTrends(filters);
  const { regions, loading: regionsLoading } = useRegionData(filters);
  const { categories, loading: categoriesLoading } = useCategoryDistribution(filters);
  const { statusData, loading: statusLoading } = useStatusDistribution(filters);
  const { revenue, loading: revenueLoading } = useAdvancedRevenueData(filters);
  const { heatmap, loading: heatmapLoading } = useHeatmapData();
  const { experiences, loading: experiencesLoading } = useTopExperiences(filters);
  const { sellers, loading: sellersLoading } = useTopSellers(filters);
  const { bookings, loading: bookingsLoading } = useRecentBookings(filters);

  const isLoading = statsLoading || trendsLoading || regionsLoading || categoriesLoading ||
    statusLoading || revenueLoading || heatmapLoading || experiencesLoading || sellersLoading || bookingsLoading;

  const refetchAll = useCallback(async () => {
    await Promise.all([refetchStats(), refetchTrends()]);
  }, [refetchStats, refetchTrends]);

  return {
    stats,
    trends,
    regions,
    categories,
    statusData,
    revenue,
    heatmap,
    experiences,
    sellers,
    bookings,
    isLoading,
    loading: {
      stats: statsLoading,
      trends: trendsLoading,
      regions: regionsLoading,
      categories: categoriesLoading,
      status: statusLoading,
      revenue: revenueLoading,
      heatmap: heatmapLoading,
      experiences: experiencesLoading,
      sellers: sellersLoading,
      bookings: bookingsLoading,
    },
    refetch: refetchAll,
  };
}
