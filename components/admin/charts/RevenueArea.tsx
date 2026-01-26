import React, { useState } from 'react';
import {
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Line,
  ComposedChart,
} from 'recharts';
import { AdvancedRevenueDataPoint } from '../../../services/admin';

interface RevenueAreaProps {
  data: AdvancedRevenueDataPoint[];
  height?: number;
  showComparison?: boolean;
  showCumulative?: boolean;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    dataKey?: string;
    value?: number;
  }>;
  label?: string;
  showCumulative?: boolean;
}

const CustomTooltip = ({ active, payload, label, showCumulative }: CustomTooltipProps) => {
  if (!active || !payload || !payload.length) return null;

  const current = payload.find((p) => p.dataKey === 'revenue' || p.dataKey === 'cumulativeRevenue');
  const previous = payload.find((p) => p.dataKey === 'previousRevenue' || p.dataKey === 'previousCumulative');

  const currentValue = current?.value as number;
  const previousValue = previous?.value as number;
  const diff = previousValue ? ((currentValue - previousValue) / previousValue) * 100 : 0;

  return (
    <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
      <p className="font-medium text-gray-900 dark:text-white mb-2">
        {new Date(label as string).toLocaleDateString('es-MX', {
          weekday: 'short',
          day: 'numeric',
          month: 'short',
        })}
      </p>
      <div className="space-y-1">
        <div className="flex items-center gap-2 text-sm">
          <span className="w-3 h-3 rounded-full bg-blue-500" />
          <span className="text-gray-600 dark:text-gray-400">
            {showCumulative ? 'Acumulado' : 'Actual'}:
          </span>
          <span className="font-semibold text-gray-900 dark:text-white">
            ${currentValue?.toLocaleString()}
          </span>
        </div>
        {previousValue && (
          <>
            <div className="flex items-center gap-2 text-sm">
              <span className="w-3 h-3 rounded-full border-2 border-gray-400 border-dashed" />
              <span className="text-gray-600 dark:text-gray-400">
                {showCumulative ? 'Acum. anterior' : 'Anterior'}:
              </span>
              <span className="font-semibold text-gray-500">
                ${previousValue?.toLocaleString()}
              </span>
            </div>
            <div className={`text-xs mt-1 ${diff >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {diff >= 0 ? '+' : ''}{diff.toFixed(1)}% vs periodo anterior
            </div>
          </>
        )}
      </div>
    </div>
  );
};

const RevenueArea: React.FC<RevenueAreaProps> = ({
  data,
  height = 300,
  showComparison = true,
  showCumulative = false,
}) => {
  const [viewMode, setViewMode] = useState<'daily' | 'cumulative'>(showCumulative ? 'cumulative' : 'daily');

  // Reduce data points for better visualization
  const displayData = data.length > 30
    ? data.filter((_, i) => i % Math.ceil(data.length / 30) === 0)
    : data;

  const revenueKey = viewMode === 'cumulative' ? 'cumulativeRevenue' : 'revenue';
  const previousKey = viewMode === 'cumulative' ? 'previousCumulative' : 'previousRevenue';

  // Calculate max value for Y axis
  const maxRevenue = Math.max(
    ...displayData.map((d) => Math.max(d[revenueKey] || 0, d[previousKey] || 0))
  );

  return (
    <div className="w-full">
      {/* View Mode Toggle */}
      <div className="flex justify-end mb-4">
        <div className="inline-flex rounded-lg bg-gray-100 dark:bg-gray-700 p-1">
          <button
            onClick={() => setViewMode('daily')}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
              viewMode === 'daily'
                ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            Diario
          </button>
          <button
            onClick={() => setViewMode('cumulative')}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
              viewMode === 'cumulative'
                ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            Acumulado
          </button>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={height}>
        <ComposedChart
          data={displayData}
          margin={{ top: 10, right: 20, left: 0, bottom: 5 }}
        >
          <defs>
            <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="colorCumulative" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="3 3"
            className="stroke-gray-200 dark:stroke-gray-700"
            vertical={false}
          />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 12 }}
            tickFormatter={(value) => {
              const date = new Date(value);
              return date.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
            }}
            className="text-gray-500 dark:text-gray-400"
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 12 }}
            tickFormatter={(value) => {
              if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
              if (value >= 1000) return `$${(value / 1000).toFixed(0)}k`;
              return `$${value}`;
            }}
            className="text-gray-500 dark:text-gray-400"
            axisLine={false}
            tickLine={false}
            width={60}
            domain={[0, maxRevenue * 1.1]}
          />
          <Tooltip
            content={({ active, payload, label }) => (
              <CustomTooltip
                active={active}
                payload={payload as CustomTooltipProps['payload']}
                label={label as string}
                showCumulative={viewMode === 'cumulative'}
              />
            )}
          />

          {showComparison && (
            <Line
              type="monotone"
              dataKey={previousKey}
              stroke="#9CA3AF"
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={false}
              name="Periodo anterior"
            />
          )}

          <Area
            type="monotone"
            dataKey={revenueKey}
            stroke={viewMode === 'cumulative' ? '#10B981' : '#3B82F6'}
            strokeWidth={2}
            fillOpacity={1}
            fill={viewMode === 'cumulative' ? 'url(#colorCumulative)' : 'url(#colorRevenue)'}
            name={viewMode === 'cumulative' ? 'Revenue acumulado' : 'Revenue diario'}
          />
        </ComposedChart>
      </ResponsiveContainer>

      {/* Legend */}
      <div className="flex justify-center gap-6 mt-4">
        <div className="flex items-center gap-2">
          <div className={`w-6 h-0.5 ${viewMode === 'cumulative' ? 'bg-green-500' : 'bg-blue-500'}`} />
          <span className="text-xs text-gray-600 dark:text-gray-400">
            {viewMode === 'cumulative' ? 'Acumulado actual' : 'Periodo actual'}
          </span>
        </div>
        {showComparison && (
          <div className="flex items-center gap-2">
            <div className="w-6 h-0.5 border-t-2 border-dashed border-gray-400" />
            <span className="text-xs text-gray-600 dark:text-gray-400">
              {viewMode === 'cumulative' ? 'Acumulado anterior' : 'Periodo anterior'}
            </span>
          </div>
        )}
      </div>

      {/* Summary Stats */}
      {displayData.length > 0 && (
        <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t dark:border-gray-700">
          <div className="text-center">
            <p className="text-xs text-gray-500 dark:text-gray-400">Total periodo</p>
            <p className="text-lg font-bold text-gray-900 dark:text-white">
              ${displayData[displayData.length - 1]?.cumulativeRevenue?.toLocaleString() || 0}
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-500 dark:text-gray-400">Promedio diario</p>
            <p className="text-lg font-bold text-gray-900 dark:text-white">
              ${Math.round(
                displayData.reduce((sum, d) => sum + (d.revenue || 0), 0) / displayData.length
              ).toLocaleString()}
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-500 dark:text-gray-400">Mejor dia</p>
            <p className="text-lg font-bold text-green-600 dark:text-green-400">
              ${Math.max(...displayData.map((d) => d.revenue || 0)).toLocaleString()}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default RevenueArea;
