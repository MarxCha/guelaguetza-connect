import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { TrendDataPoint } from '../../../services/admin';

interface TrendChartProps {
  data: TrendDataPoint[];
  height?: number;
  showLegend?: boolean;
  dataType?: 'bookings' | 'orders' | 'all';
  showRevenue?: boolean;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    color?: string;
    name?: string;
    value?: number;
    dataKey?: string;
  }>;
  label?: string;
}

const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
  if (!active || !payload || !payload.length) return null;

  return (
    <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
      <p className="font-medium text-gray-900 dark:text-white mb-2">
        {new Date(label as string).toLocaleDateString('es-MX', {
          weekday: 'short',
          day: 'numeric',
          month: 'short',
        })}
      </p>
      {payload.map((entry, index) => (
        <div key={index} className="flex items-center gap-2 text-sm">
          <span
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-gray-600 dark:text-gray-400">{entry.name}:</span>
          <span className="font-semibold text-gray-900 dark:text-white">
            {entry.dataKey === 'revenue'
              ? `$${(entry.value as number).toLocaleString()}`
              : entry.value}
          </span>
        </div>
      ))}
    </div>
  );
};

const TrendChart: React.FC<TrendChartProps> = ({
  data,
  height = 300,
  showLegend = true,
  dataType = 'all',
  showRevenue = false,
}) => {
  // Reduce data points for better visualization if too many
  const displayData = data.length > 30
    ? data.filter((_, i) => i % Math.ceil(data.length / 30) === 0)
    : data;

  // Determine which lines to show based on dataType
  const showBookings = dataType === 'bookings' || dataType === 'all';
  const showOrders = dataType === 'orders' || dataType === 'all';

  return (
    <div className="w-full">
      <ResponsiveContainer width="100%" height={height}>
        <LineChart
          data={displayData}
          margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
        >
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
            className="text-gray-500 dark:text-gray-400"
            axisLine={false}
            tickLine={false}
            width={40}
            yAxisId="left"
          />
          {showRevenue && (
            <YAxis
              tick={{ fontSize: 12 }}
              className="text-gray-500 dark:text-gray-400"
              axisLine={false}
              tickLine={false}
              width={60}
              yAxisId="right"
              orientation="right"
              tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
            />
          )}
          <Tooltip content={<CustomTooltip />} />
          {showLegend && (
            <Legend
              wrapperStyle={{ paddingTop: '20px' }}
              formatter={(value) => (
                <span className="text-sm text-gray-600 dark:text-gray-300">{value}</span>
              )}
            />
          )}

          {/* Bookings lines */}
          {showBookings && (
            <>
              <Line
                type="monotone"
                dataKey="bookings"
                name="Reservas"
                stroke="#3B82F6"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 6, fill: '#3B82F6' }}
                yAxisId="left"
              />
              <Line
                type="monotone"
                dataKey="confirmed"
                name="Confirmadas"
                stroke="#10B981"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 6, fill: '#10B981' }}
                yAxisId="left"
              />
              <Line
                type="monotone"
                dataKey="cancelled"
                name="Canceladas"
                stroke="#EF4444"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 6, fill: '#EF4444' }}
                yAxisId="left"
              />
            </>
          )}

          {/* Orders line */}
          {showOrders && (
            <Line
              type="monotone"
              dataKey="orders"
              name="Ordenes"
              stroke="#8B5CF6"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 6, fill: '#8B5CF6' }}
              yAxisId="left"
            />
          )}

          {/* Revenue line (optional) */}
          {showRevenue && (
            <Line
              type="monotone"
              dataKey="revenue"
              name="Revenue"
              stroke="#F59E0B"
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={false}
              activeDot={{ r: 6, fill: '#F59E0B' }}
              yAxisId="right"
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

// Legacy support - map old data format to new format
export function mapLegacyTrendData(legacyData: { date: string; created: number; confirmed: number; cancelled: number }[]): TrendDataPoint[] {
  return legacyData.map(item => ({
    date: item.date,
    bookings: item.created,
    orders: 0,
    revenue: item.created * 250, // Estimate
    confirmed: item.confirmed,
    cancelled: item.cancelled,
    completed: Math.floor(item.confirmed * 0.9),
  }));
}

export default TrendChart;
