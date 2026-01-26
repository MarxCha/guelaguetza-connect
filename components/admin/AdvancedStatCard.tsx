import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import {
  AreaChart,
  Area,
  ResponsiveContainer,
} from 'recharts';

interface SparklineData {
  value: number;
}

interface AdvancedStatCardProps {
  title: string;
  value: string | number;
  previousValue?: string | number;
  change?: number;
  icon?: React.ReactNode;
  color?: 'pink' | 'purple' | 'yellow' | 'green' | 'blue' | 'red' | 'indigo' | 'orange';
  sparklineData?: SparklineData[];
  format?: 'number' | 'currency' | 'percentage';
  loading?: boolean;
  subtitle?: string;
  compact?: boolean;
}

// Skeleton Loader Component
export function StatCardSkeleton({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm animate-pulse ${compact ? 'p-3' : 'p-4'}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          {/* Title skeleton */}
          <div className={`bg-gray-200 dark:bg-gray-700 rounded ${compact ? 'h-2.5 w-16' : 'h-3 w-20'}`} />
          {/* Value skeleton */}
          <div className={`bg-gray-200 dark:bg-gray-700 rounded mt-2 ${compact ? 'h-6 w-20' : 'h-8 w-24'}`} />
          {/* Change skeleton */}
          <div className={`bg-gray-200 dark:bg-gray-700 rounded mt-2 ${compact ? 'h-2.5 w-12' : 'h-3 w-16'}`} />
        </div>
        {/* Icon skeleton */}
        <div className={`bg-gray-200 dark:bg-gray-700 rounded-lg ${compact ? 'w-8 h-8' : 'w-10 h-10'}`} />
      </div>
      {/* Sparkline skeleton */}
      {!compact && (
        <div className="mt-3 h-12 bg-gray-100 dark:bg-gray-700/50 rounded" />
      )}
    </div>
  );
}

const AdvancedStatCard: React.FC<AdvancedStatCardProps> = ({
  title,
  value,
  previousValue,
  change,
  icon,
  color = 'blue',
  sparklineData,
  format = 'number',
  loading = false,
  subtitle,
  compact = false,
}) => {
  const colorClasses = {
    pink: {
      bg: 'bg-pink-100 dark:bg-pink-900/30',
      text: 'text-pink-600 dark:text-pink-400',
      sparkline: '#EC4899',
      gradient: 'from-pink-500 to-rose-500',
    },
    purple: {
      bg: 'bg-purple-100 dark:bg-purple-900/30',
      text: 'text-purple-600 dark:text-purple-400',
      sparkline: '#8B5CF6',
      gradient: 'from-purple-500 to-violet-500',
    },
    yellow: {
      bg: 'bg-yellow-100 dark:bg-yellow-900/30',
      text: 'text-yellow-600 dark:text-yellow-400',
      sparkline: '#F59E0B',
      gradient: 'from-yellow-500 to-amber-500',
    },
    green: {
      bg: 'bg-green-100 dark:bg-green-900/30',
      text: 'text-green-600 dark:text-green-400',
      sparkline: '#10B981',
      gradient: 'from-green-500 to-emerald-500',
    },
    blue: {
      bg: 'bg-blue-100 dark:bg-blue-900/30',
      text: 'text-blue-600 dark:text-blue-400',
      sparkline: '#3B82F6',
      gradient: 'from-blue-500 to-cyan-500',
    },
    red: {
      bg: 'bg-red-100 dark:bg-red-900/30',
      text: 'text-red-600 dark:text-red-400',
      sparkline: '#EF4444',
      gradient: 'from-red-500 to-rose-500',
    },
    indigo: {
      bg: 'bg-indigo-100 dark:bg-indigo-900/30',
      text: 'text-indigo-600 dark:text-indigo-400',
      sparkline: '#6366F1',
      gradient: 'from-indigo-500 to-purple-500',
    },
    orange: {
      bg: 'bg-orange-100 dark:bg-orange-900/30',
      text: 'text-orange-600 dark:text-orange-400',
      sparkline: '#F97316',
      gradient: 'from-orange-500 to-amber-500',
    },
  };

  const getChangeIcon = () => {
    if (change === undefined) return null;
    if (change > 0) return <TrendingUp size={compact ? 12 : 14} className="text-green-500" />;
    if (change < 0) return <TrendingDown size={compact ? 12 : 14} className="text-red-500" />;
    return <Minus size={compact ? 12 : 14} className="text-gray-400" />;
  };

  const getChangeColor = () => {
    if (change === undefined) return '';
    if (change > 0) return 'text-green-500';
    if (change < 0) return 'text-red-500';
    return 'text-gray-400';
  };

  const formatValue = (val: string | number): string => {
    if (typeof val === 'string') return val;

    switch (format) {
      case 'currency':
        if (val >= 1000000) {
          return `$${(val / 1000000).toFixed(1)}M`;
        }
        if (val >= 1000) {
          return `$${(val / 1000).toFixed(1)}k`;
        }
        return `$${val.toLocaleString('es-MX')}`;
      case 'percentage':
        return `${val.toFixed(1)}%`;
      default:
        if (val >= 1000000) {
          return `${(val / 1000000).toFixed(1)}M`;
        }
        if (val >= 1000) {
          return `${(val / 1000).toFixed(1)}k`;
        }
        return val.toLocaleString('es-MX');
    }
  };

  if (loading) {
    return <StatCardSkeleton compact={compact} />;
  }

  return (
    <div
      className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 ${
        compact ? 'p-3' : 'p-4'
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p
            className={`text-gray-500 dark:text-gray-400 uppercase tracking-wider font-medium truncate ${
              compact ? 'text-[10px]' : 'text-xs'
            }`}
          >
            {title}
          </p>
          <p
            className={`font-bold text-gray-900 dark:text-gray-100 mt-1 ${
              compact ? 'text-xl' : 'text-2xl'
            }`}
          >
            {formatValue(value)}
          </p>

          {subtitle && (
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{subtitle}</p>
          )}

          <div className={`flex items-center gap-2 ${compact ? 'mt-1' : 'mt-2'}`}>
            {change !== undefined && (
              <div className="flex items-center gap-1">
                {getChangeIcon()}
                <span className={`font-medium ${getChangeColor()} ${compact ? 'text-[10px]' : 'text-xs'}`}>
                  {change >= 0 ? '+' : ''}
                  {change.toFixed(1)}%
                </span>
              </div>
            )}
            {previousValue !== undefined && !compact && (
              <span className="text-xs text-gray-400">
                vs {formatValue(previousValue)}
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-col items-end gap-2">
          {icon && (
            <div
              className={`rounded-lg ${colorClasses[color].bg} ${colorClasses[color].text} ${
                compact ? 'p-1.5' : 'p-2'
              }`}
            >
              {icon}
            </div>
          )}
        </div>
      </div>

      {/* Mini Sparkline */}
      {sparklineData && sparklineData.length > 0 && !compact && (
        <div className="mt-3 h-12 -mx-2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={sparklineData}>
              <defs>
                <linearGradient id={`gradient-${color}-${title.replace(/\s/g, '')}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={colorClasses[color].sparkline} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={colorClasses[color].sparkline} stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area
                type="monotone"
                dataKey="value"
                stroke={colorClasses[color].sparkline}
                strokeWidth={1.5}
                fill={`url(#gradient-${color}-${title.replace(/\s/g, '')})`}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};

// Stats Grid Skeleton
export function StatsGridSkeleton({ count = 4, columns = 4 }: { count?: number; columns?: number }) {
  return (
    <div className={`grid grid-cols-2 lg:grid-cols-${columns} gap-4`}>
      {Array.from({ length: count }).map((_, index) => (
        <StatCardSkeleton key={index} />
      ))}
    </div>
  );
}

// Chart Skeleton
export function ChartSkeleton({ height = 300 }: { height?: number }) {
  return (
    <div
      className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm animate-pulse"
      style={{ height: height + 60 }}
    >
      {/* Title skeleton */}
      <div className="h-5 w-40 bg-gray-200 dark:bg-gray-700 rounded mb-4" />
      {/* Chart area skeleton */}
      <div
        className="bg-gray-100 dark:bg-gray-700/50 rounded-lg flex items-end justify-around p-4"
        style={{ height }}
      >
        {Array.from({ length: 7 }).map((_, i) => (
          <div
            key={i}
            className="bg-gray-200 dark:bg-gray-600 rounded-t w-8"
            style={{ height: `${30 + Math.random() * 60}%` }}
          />
        ))}
      </div>
    </div>
  );
}

// Table Skeleton
export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden animate-pulse">
      {/* Header */}
      <div className="p-4 border-b dark:border-gray-700">
        <div className="h-5 w-48 bg-gray-200 dark:bg-gray-700 rounded" />
      </div>
      {/* Table header */}
      <div className="bg-gray-50 dark:bg-gray-700/50 px-4 py-3 flex gap-4">
        <div className="h-3 w-8 bg-gray-200 dark:bg-gray-600 rounded" />
        <div className="h-3 w-32 bg-gray-200 dark:bg-gray-600 rounded" />
        <div className="h-3 w-20 bg-gray-200 dark:bg-gray-600 rounded flex-1" />
        <div className="h-3 w-16 bg-gray-200 dark:bg-gray-600 rounded" />
        <div className="h-3 w-16 bg-gray-200 dark:bg-gray-600 rounded" />
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, index) => (
        <div
          key={index}
          className="px-4 py-3 flex items-center gap-4 border-b dark:border-gray-700 last:border-0"
        >
          <div className="h-4 w-8 bg-gray-200 dark:bg-gray-700 rounded" />
          <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded" />
          <div className="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded flex-1" />
          <div className="h-4 w-16 bg-gray-200 dark:bg-gray-700 rounded" />
          <div className="h-4 w-16 bg-gray-200 dark:bg-gray-700 rounded" />
        </div>
      ))}
    </div>
  );
}

export default AdvancedStatCard;
