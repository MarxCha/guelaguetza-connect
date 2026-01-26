import React, { useState, useEffect, useCallback } from 'react';
import {
  ArrowLeft,
  Calendar,
  RefreshCw,
  Download,
  BarChart3,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  Percent,
  Filter,
  ChevronDown,
  Star,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Home,
  ShoppingCart,
  Package,
  Layers,
  X,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { ViewState } from '../../types';
import AdvancedStatCard, {
  StatCardSkeleton,
  ChartSkeleton,
  TableSkeleton,
} from './AdvancedStatCard';
import {
  TrendChart,
  ComparisonBar,
  DistributionPie,
  RevenueArea,
  ActivityHeatmap,
  StatusPieChart,
} from './charts';
import {
  useAdminFilters,
  useAllDashboardData,
  PeriodFilter,
  DataTypeFilter,
  StatusFilter,
  TopExperience,
  TopSeller,
  RecentBooking,
} from '../../hooks/useAdminStats';

interface AdvancedDashboardProps {
  onBack: () => void;
  onNavigate?: (view: ViewState) => void;
}

interface DateRange {
  start: Date;
  end: Date;
}

const PERIOD_OPTIONS: { value: PeriodFilter; label: string; shortLabel: string }[] = [
  { value: '7d', label: 'Ultimos 7 dias', shortLabel: '7D' },
  { value: '30d', label: 'Ultimos 30 dias', shortLabel: '30D' },
  { value: '90d', label: 'Ultimos 90 dias', shortLabel: '90D' },
  { value: '1y', label: 'Ultimo ano', shortLabel: '1A' },
  { value: 'custom', label: 'Personalizado', shortLabel: 'Custom' },
];

const DATA_TYPE_OPTIONS: { value: DataTypeFilter; label: string; icon: React.ReactNode }[] = [
  { value: 'all', label: 'Todo', icon: <Layers size={14} /> },
  { value: 'bookings', label: 'Reservas', icon: <Calendar size={14} /> },
  { value: 'orders', label: 'Ordenes', icon: <ShoppingCart size={14} /> },
];

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'active', label: 'Activos' },
  { value: 'completed', label: 'Completados' },
  { value: 'cancelled', label: 'Cancelados' },
];

const AdvancedDashboard: React.FC<AdvancedDashboardProps> = ({
  onBack,
  onNavigate,
}) => {
  const { user } = useAuth();

  // Filter state
  const {
    filters,
    setPeriod,
    setDataType,
    setStatus,
    setCustomDateRange,
    resetFilters,
  } = useAdminFilters();

  // UI state
  const [showPeriodDropdown, setShowPeriodDropdown] = useState(false);
  const [showFiltersPanel, setShowFiltersPanel] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [activeSection, setActiveSection] = useState<'overview' | 'tables'>('overview');
  const [customRange, setCustomRange] = useState<DateRange>({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    end: new Date(),
  });

  // Data hooks
  const {
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
    loading,
    refetch,
  } = useAllDashboardData(filters);

  // Generate sparkline data from trends
  const generateSparkline = (key: 'bookings' | 'orders' | 'revenue') => {
    return trends.slice(-14).map((t) => ({ value: t[key] }));
  };

  // Calculate changes
  const calculateChange = (current: number, previous: number): number => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  };

  // Auto refresh every 5 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      handleRefresh();
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setLastRefresh(new Date());
    setTimeout(() => setRefreshing(false), 500);
  }, [refetch]);

  const handlePeriodChange = (newPeriod: PeriodFilter) => {
    setPeriod(newPeriod);
    setShowPeriodDropdown(false);
  };

  const handleCustomDateApply = () => {
    setCustomDateRange(
      customRange.start.toISOString().split('T')[0],
      customRange.end.toISOString().split('T')[0]
    );
    setShowPeriodDropdown(false);
  };

  // Export to CSV
  const exportToCSV = () => {
    const headers = ['Fecha', 'Reservas', 'Ordenes', 'Revenue', 'Confirmadas', 'Canceladas'];
    const rows = trends.map((t) => [
      t.date,
      t.bookings,
      t.orders,
      t.revenue,
      t.confirmed,
      t.cancelled,
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((r) => r.join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute(
      'download',
      `dashboard_${filters.period}_${filters.dataType}_${new Date().toISOString().split('T')[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getStatusColor = (status: RecentBooking['status']) => {
    switch (status) {
      case 'pending':
      case 'processing':
        return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'confirmed':
      case 'shipped':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
      case 'completed':
      case 'delivered':
        return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
      case 'cancelled':
        return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
      default:
        return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  const getStatusIcon = (status: RecentBooking['status']) => {
    switch (status) {
      case 'pending':
      case 'processing':
        return <Clock size={12} />;
      case 'confirmed':
      case 'shipped':
        return <Package size={12} />;
      case 'completed':
      case 'delivered':
        return <CheckCircle size={12} />;
      case 'cancelled':
        return <XCircle size={12} />;
      default:
        return <AlertCircle size={12} />;
    }
  };

  const getStatusLabel = (status: RecentBooking['status']) => {
    const labels: Record<string, string> = {
      pending: 'Pendiente',
      confirmed: 'Confirmado',
      completed: 'Completado',
      cancelled: 'Cancelado',
      processing: 'Procesando',
      shipped: 'Enviado',
      delivered: 'Entregado',
    };
    return labels[status] || status;
  };

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    if (trend === 'up') return <TrendingUp size={14} className="text-green-500" />;
    if (trend === 'down') return <TrendingDown size={14} className="text-red-500" />;
    return null;
  };

  // Count active filters
  const activeFiltersCount = [
    filters.dataType !== 'all',
    filters.status !== 'all',
    filters.period === 'custom',
  ].filter(Boolean).length;

  return (
    <div className="h-full bg-gray-100 dark:bg-gray-950 overflow-hidden flex flex-col">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-900 via-purple-900 to-indigo-900 text-white">
        <div className="px-4 py-4">
          {/* Top bar */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <button
                onClick={onBack}
                className="p-2 hover:bg-white/10 rounded-full transition"
                aria-label="Volver"
              >
                <ArrowLeft size={20} />
              </button>
              <div className="flex items-center gap-2">
                <div className="p-2 bg-gradient-to-br from-blue-400 to-purple-500 rounded-lg">
                  <BarChart3 size={20} className="text-white" />
                </div>
                <div>
                  <h1 className="font-bold text-lg">Dashboard Avanzado</h1>
                  <p className="text-xs text-white/60">
                    Metricas y Analytics - {user?.nombre || 'Admin'}
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleRefresh}
                className={`p-2 hover:bg-white/10 rounded-full transition ${
                  refreshing ? 'animate-spin' : ''
                }`}
                aria-label="Actualizar"
              >
                <RefreshCw size={18} />
              </button>
              <button
                onClick={exportToCSV}
                className="p-2 hover:bg-white/10 rounded-full transition"
                aria-label="Exportar CSV"
              >
                <Download size={18} />
              </button>
              {onNavigate && (
                <button
                  onClick={() => onNavigate(ViewState.HOME)}
                  className="p-2 hover:bg-white/10 rounded-full transition"
                  aria-label="Ir a inicio"
                >
                  <Home size={18} />
                </button>
              )}
            </div>
          </div>

          {/* Filters Row */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Period selector */}
            <div className="relative">
              <button
                onClick={() => setShowPeriodDropdown(!showPeriodDropdown)}
                className="flex items-center gap-2 px-4 py-2 bg-white/10 rounded-lg hover:bg-white/20 transition"
              >
                <Calendar size={16} />
                <span className="text-sm">
                  {PERIOD_OPTIONS.find((p) => p.value === filters.period)?.label}
                </span>
                <ChevronDown size={16} />
              </button>

              {showPeriodDropdown && (
                <div className="absolute top-full left-0 mt-2 w-64 bg-white dark:bg-gray-800 rounded-lg shadow-lg py-1 z-50">
                  {PERIOD_OPTIONS.filter((p) => p.value !== 'custom').map((option) => (
                    <button
                      key={option.value}
                      onClick={() => handlePeriodChange(option.value)}
                      className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition ${
                        filters.period === option.value
                          ? 'text-blue-600 dark:text-blue-400 font-medium'
                          : 'text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                  <div className="border-t dark:border-gray-700 mt-1 pt-1">
                    <div className="px-4 py-2">
                      <p className="text-xs text-gray-500 mb-2">Rango personalizado</p>
                      <div className="flex gap-2 mb-2">
                        <input
                          type="date"
                          value={customRange.start.toISOString().split('T')[0]}
                          onChange={(e) =>
                            setCustomRange((prev) => ({
                              ...prev,
                              start: new Date(e.target.value),
                            }))
                          }
                          className="flex-1 px-2 py-1 text-xs border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        />
                        <input
                          type="date"
                          value={customRange.end.toISOString().split('T')[0]}
                          onChange={(e) =>
                            setCustomRange((prev) => ({
                              ...prev,
                              end: new Date(e.target.value),
                            }))
                          }
                          className="flex-1 px-2 py-1 text-xs border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        />
                      </div>
                      <button
                        onClick={handleCustomDateApply}
                        className="w-full py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition"
                      >
                        Aplicar
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Data Type Toggle */}
            <div className="flex bg-white/10 rounded-lg p-1">
              {DATA_TYPE_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setDataType(option.value)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition ${
                    filters.dataType === option.value
                      ? 'bg-white text-gray-900'
                      : 'text-white/80 hover:text-white hover:bg-white/10'
                  }`}
                >
                  {option.icon}
                  <span className="hidden sm:inline">{option.label}</span>
                </button>
              ))}
            </div>

            {/* More Filters Button */}
            <button
              onClick={() => setShowFiltersPanel(!showFiltersPanel)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${
                showFiltersPanel || activeFiltersCount > 0
                  ? 'bg-white text-gray-900'
                  : 'bg-white/10 hover:bg-white/20 text-white'
              }`}
            >
              <Filter size={16} />
              <span className="text-sm">Filtros</span>
              {activeFiltersCount > 0 && (
                <span className="px-1.5 py-0.5 text-xs bg-blue-600 text-white rounded-full">
                  {activeFiltersCount}
                </span>
              )}
            </button>

            {/* Last refresh time */}
            <div className="text-xs text-white/60 ml-auto hidden sm:block">
              Actualizado: {lastRefresh.toLocaleTimeString('es-MX')}
            </div>
          </div>

          {/* Expandable Filters Panel */}
          {showFiltersPanel && (
            <div className="mt-4 p-4 bg-white/10 rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium">Filtros avanzados</h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={resetFilters}
                    className="text-xs text-white/60 hover:text-white"
                  >
                    Limpiar filtros
                  </button>
                  <button
                    onClick={() => setShowFiltersPanel(false)}
                    className="p-1 hover:bg-white/10 rounded"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs text-white/60 mb-1">Estado</label>
                  <select
                    value={filters.status}
                    onChange={(e) => setStatus(e.target.value as StatusFilter)}
                    className="w-full px-3 py-2 bg-white/10 rounded-lg text-sm border-0 focus:ring-2 focus:ring-white/30"
                  >
                    {STATUS_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value} className="text-gray-900">
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Section tabs */}
          <div className="flex gap-2 mt-4">
            <button
              onClick={() => setActiveSection('overview')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                activeSection === 'overview'
                  ? 'bg-white text-gray-900'
                  : 'bg-white/10 text-white/80 hover:bg-white/20'
              }`}
            >
              Resumen
            </button>
            <button
              onClick={() => setActiveSection('tables')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                activeSection === 'tables'
                  ? 'bg-white text-gray-900'
                  : 'bg-white/10 text-white/80 hover:bg-white/20'
              }`}
            >
              Tablas
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4 space-y-6">
          {activeSection === 'overview' && (
            <>
              {/* Stats Cards */}
              <section>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <TrendingUp size={20} className="text-blue-500" />
                  Metricas Principales
                </h2>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {filters.dataType !== 'orders' && (
                    <AdvancedStatCard
                      title="Total Reservas"
                      value={stats?.totalBookings || 0}
                      previousValue={stats?.previousPeriod.totalBookings}
                      change={
                        stats
                          ? calculateChange(
                              stats.totalBookings,
                              stats.previousPeriod.totalBookings
                            )
                          : undefined
                      }
                      icon={<Calendar size={20} />}
                      color="blue"
                      sparklineData={generateSparkline('bookings')}
                      loading={loading.stats}
                    />
                  )}
                  {filters.dataType !== 'bookings' && (
                    <AdvancedStatCard
                      title="Total Ordenes"
                      value={stats?.totalOrders || 0}
                      previousValue={stats?.previousPeriod.totalOrders}
                      change={
                        stats
                          ? calculateChange(
                              stats.totalOrders,
                              stats.previousPeriod.totalOrders
                            )
                          : undefined
                      }
                      icon={<ShoppingCart size={20} />}
                      color="purple"
                      sparklineData={generateSparkline('orders')}
                      loading={loading.stats}
                    />
                  )}
                  <AdvancedStatCard
                    title="Revenue Total"
                    value={stats?.totalRevenue || 0}
                    previousValue={stats?.previousPeriod.totalRevenue}
                    change={
                      stats
                        ? calculateChange(
                            stats.totalRevenue,
                            stats.previousPeriod.totalRevenue
                          )
                        : undefined
                    }
                    icon={<DollarSign size={20} />}
                    color="green"
                    format="currency"
                    sparklineData={generateSparkline('revenue')}
                    loading={loading.stats}
                  />
                  <AdvancedStatCard
                    title="Usuarios Activos"
                    value={stats?.activeUsers || 0}
                    previousValue={stats?.previousPeriod.activeUsers}
                    change={
                      stats
                        ? calculateChange(
                            stats.activeUsers,
                            stats.previousPeriod.activeUsers
                          )
                        : undefined
                    }
                    icon={<Users size={20} />}
                    color="indigo"
                    loading={loading.stats}
                  />
                  <AdvancedStatCard
                    title="Tasa Conversion"
                    value={stats?.conversionRate || 0}
                    previousValue={stats?.previousPeriod.conversionRate}
                    change={
                      stats
                        ? calculateChange(
                            stats.conversionRate,
                            stats.previousPeriod.conversionRate
                          )
                        : undefined
                    }
                    icon={<Percent size={20} />}
                    color="yellow"
                    format="percentage"
                    loading={loading.stats}
                  />
                </div>
              </section>

              {/* Charts Row 1 */}
              <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Booking/Order Trends */}
                <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <TrendingUp size={18} className="text-blue-500" />
                    Tendencia de {filters.dataType === 'orders' ? 'Ordenes' : filters.dataType === 'bookings' ? 'Reservas' : 'Actividad'}
                  </h3>
                  {loading.trends ? (
                    <div className="h-[300px] flex items-center justify-center">
                      <RefreshCw className="animate-spin text-gray-400" size={32} />
                    </div>
                  ) : (
                    <TrendChart
                      data={trends}
                      height={300}
                      dataType={filters.dataType}
                      showRevenue={filters.dataType === 'all'}
                    />
                  )}
                </div>

                {/* Revenue Over Time */}
                <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <DollarSign size={18} className="text-green-500" />
                    Ingresos en el Tiempo
                  </h3>
                  {loading.revenue ? (
                    <div className="h-[300px] flex items-center justify-center">
                      <RefreshCw className="animate-spin text-gray-400" size={32} />
                    </div>
                  ) : (
                    <RevenueArea data={revenue} height={260} showComparison />
                  )}
                </div>
              </section>

              {/* Charts Row 2 */}
              <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Region Comparison */}
                <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <BarChart3 size={18} className="text-purple-500" />
                    Top 10 Regiones
                  </h3>
                  {loading.regions ? (
                    <div className="h-[400px] flex items-center justify-center">
                      <RefreshCw className="animate-spin text-gray-400" size={32} />
                    </div>
                  ) : (
                    <ComparisonBar data={regions} height={400} maxItems={10} />
                  )}
                </div>

                {/* Status Distribution */}
                <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <Filter size={18} className="text-pink-500" />
                    Distribucion por Estado
                  </h3>
                  {loading.status ? (
                    <div className="h-[300px] flex items-center justify-center">
                      <RefreshCw className="animate-spin text-gray-400" size={32} />
                    </div>
                  ) : (
                    <StatusPieChart data={statusData} height={300} />
                  )}
                </div>
              </section>

              {/* Category Distribution */}
              <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <Layers size={18} className="text-orange-500" />
                    Distribucion por Categoria
                  </h3>
                  {loading.categories ? (
                    <div className="h-[300px] flex items-center justify-center">
                      <RefreshCw className="animate-spin text-gray-400" size={32} />
                    </div>
                  ) : (
                    <DistributionPie data={categories} height={300} />
                  )}
                </div>

                {/* Heatmap */}
                <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <Clock size={18} className="text-orange-500" />
                    Actividad por Horas Pico
                  </h3>
                  {loading.heatmap ? (
                    <div className="h-[200px] flex items-center justify-center">
                      <RefreshCw className="animate-spin text-gray-400" size={32} />
                    </div>
                  ) : (
                    <ActivityHeatmap data={heatmap} height={200} />
                  )}
                </div>
              </section>
            </>
          )}

          {activeSection === 'tables' && (
            <>
              {/* Top Experiences Table */}
              <section className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
                <div className="p-4 border-b dark:border-gray-700">
                  <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <Star size={18} className="text-yellow-500" />
                    Top Experiencias (por Reservas)
                  </h3>
                </div>
                {loading.experiences ? (
                  <TableSkeleton rows={5} />
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 dark:bg-gray-700/50">
                        <tr>
                          <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            #
                          </th>
                          <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Experiencia
                          </th>
                          <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Categoria
                          </th>
                          <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Reservas
                          </th>
                          <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Revenue
                          </th>
                          <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Rating
                          </th>
                          <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Tendencia
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y dark:divide-gray-700">
                        {experiences.map((exp: TopExperience, index: number) => (
                          <tr
                            key={exp.id}
                            className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition"
                          >
                            <td className="px-4 py-3 text-sm text-gray-500">
                              {index + 1}
                            </td>
                            <td className="px-4 py-3">
                              <span className="text-sm font-medium text-gray-900 dark:text-white">
                                {exp.name}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <span className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-full">
                                {exp.category}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <span className="text-sm font-semibold text-gray-900 dark:text-white">
                                {exp.bookings}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <span className="text-sm font-semibold text-green-600 dark:text-green-400">
                                ${exp.revenue.toLocaleString()}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <span className="inline-flex items-center gap-1 text-sm text-yellow-600">
                                <Star size={14} fill="currentColor" />
                                {exp.rating}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-center">
                              {getTrendIcon(exp.trend)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>

              {/* Top Sellers Table */}
              <section className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
                <div className="p-4 border-b dark:border-gray-700">
                  <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <Users size={18} className="text-purple-500" />
                    Top Vendedores (por Revenue)
                  </h3>
                </div>
                {loading.sellers ? (
                  <TableSkeleton rows={5} />
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 dark:bg-gray-700/50">
                        <tr>
                          <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            #
                          </th>
                          <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Vendedor
                          </th>
                          <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Revenue Total
                          </th>
                          <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Reservas
                          </th>
                          <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Ordenes
                          </th>
                          <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Rating
                          </th>
                          <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Tendencia
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y dark:divide-gray-700">
                        {sellers.map((seller: TopSeller, index: number) => (
                          <tr
                            key={seller.id}
                            className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition"
                          >
                            <td className="px-4 py-3 text-sm text-gray-500">
                              {index + 1}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-xs font-bold">
                                  {seller.avatar}
                                </div>
                                <span className="text-sm font-medium text-gray-900 dark:text-white">
                                  {seller.name}
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <span className="text-sm font-semibold text-green-600 dark:text-green-400">
                                ${seller.totalRevenue.toLocaleString()}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <span className="text-sm font-semibold text-gray-900 dark:text-white">
                                {seller.totalBookings}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <span className="text-sm font-semibold text-gray-900 dark:text-white">
                                {seller.totalOrders}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <span className="inline-flex items-center gap-1 text-sm text-yellow-600">
                                <Star size={14} fill="currentColor" />
                                {seller.rating}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-center">
                              {getTrendIcon(seller.trend)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>

              {/* Recent Activity Table */}
              <section className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
                <div className="p-4 border-b dark:border-gray-700 flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <Calendar size={18} className="text-blue-500" />
                    Actividad Reciente
                  </h3>
                  <button className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
                    Ver todo
                  </button>
                </div>
                {loading.bookings ? (
                  <TableSkeleton rows={10} />
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 dark:bg-gray-700/50">
                        <tr>
                          <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            ID
                          </th>
                          <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Tipo
                          </th>
                          <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Nombre
                          </th>
                          <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Cliente
                          </th>
                          <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Fecha
                          </th>
                          <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Estado
                          </th>
                          <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Monto
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y dark:divide-gray-700">
                        {bookings.slice(0, 10).map((booking: RecentBooking) => (
                          <tr
                            key={booking.id}
                            className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition"
                          >
                            <td className="px-4 py-3 text-xs text-gray-500 font-mono">
                              {booking.id}
                            </td>
                            <td className="px-4 py-3">
                              <span
                                className={`text-xs px-2 py-1 rounded-full font-medium ${
                                  booking.type === 'order'
                                    ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
                                    : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                                }`}
                              >
                                {booking.type === 'order' ? 'Orden' : 'Reserva'}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <span className="text-sm font-medium text-gray-900 dark:text-white">
                                {booking.name}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                              {booking.customerName}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                              {new Date(booking.date).toLocaleDateString('es-MX', {
                                day: 'numeric',
                                month: 'short',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </td>
                            <td className="px-4 py-3">
                              <span
                                className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full font-medium ${getStatusColor(
                                  booking.status
                                )}`}
                              >
                                {getStatusIcon(booking.status)}
                                {getStatusLabel(booking.status)}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <span className="text-sm font-semibold text-gray-900 dark:text-white">
                                ${booking.amount.toLocaleString()}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            </>
          )}
        </div>
      </div>

      {/* Click outside to close dropdowns */}
      {(showPeriodDropdown || showFiltersPanel) && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => {
            setShowPeriodDropdown(false);
          }}
        />
      )}
    </div>
  );
};

export default AdvancedDashboard;
