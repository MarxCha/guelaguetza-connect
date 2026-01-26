import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { RegionData } from '../../../hooks/useAdminStats';

interface ComparisonBarProps {
  data: RegionData[];
  height?: number;
  maxItems?: number;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    payload: RegionData;
  }>;
}

const getPerformanceColor = (performance: string) => {
  switch (performance) {
    case 'excellent':
      return '#10B981';
    case 'good':
      return '#3B82F6';
    case 'average':
      return '#F59E0B';
    case 'poor':
      return '#EF4444';
    default:
      return '#6B7280';
  }
};

const CustomTooltip = ({ active, payload }: CustomTooltipProps) => {
  if (!active || !payload || !payload.length) return null;

  const data = payload[0].payload;

  return (
    <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
      <p className="font-medium text-gray-900 dark:text-white mb-2">{data.region}</p>
      <div className="space-y-1 text-sm">
        <div className="flex justify-between gap-4">
          <span className="text-gray-500">Reservas:</span>
          <span className="font-semibold text-gray-900 dark:text-white">
            {data.bookings.toLocaleString()}
          </span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-gray-500">Ingresos:</span>
          <span className="font-semibold text-gray-900 dark:text-white">
            ${data.revenue.toLocaleString()}
          </span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-gray-500">Performance:</span>
          <span
            className="px-2 py-0.5 text-xs rounded-full font-medium"
            style={{
              backgroundColor: `${getPerformanceColor(data.performance)}20`,
              color: getPerformanceColor(data.performance),
            }}
          >
            {data.performance === 'excellent' ? 'Excelente' :
             data.performance === 'good' ? 'Bueno' :
             data.performance === 'average' ? 'Promedio' : 'Bajo'}
          </span>
        </div>
      </div>
    </div>
  );
};

const ComparisonBar: React.FC<ComparisonBarProps> = ({
  data,
  height = 400,
  maxItems = 10,
}) => {
  // Sort by bookings and limit to maxItems
  const sortedData = [...data]
    .sort((a, b) => b.bookings - a.bookings)
    .slice(0, maxItems);

  return (
    <div className="w-full">
      <ResponsiveContainer width="100%" height={height}>
        <BarChart
          data={sortedData}
          layout="vertical"
          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            horizontal={true}
            vertical={false}
            className="stroke-gray-200 dark:stroke-gray-700"
          />
          <XAxis
            type="number"
            tick={{ fontSize: 12 }}
            className="text-gray-500 dark:text-gray-400"
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            dataKey="region"
            type="category"
            width={100}
            tick={{ fontSize: 12 }}
            className="text-gray-500 dark:text-gray-400"
            axisLine={false}
            tickLine={false}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'transparent' }} />
          <Bar
            dataKey="bookings"
            radius={[0, 4, 4, 0]}
            barSize={24}
          >
            {sortedData.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={getPerformanceColor(entry.performance)}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Legend */}
      <div className="flex flex-wrap justify-center gap-4 mt-4">
        {[
          { label: 'Excelente', color: '#10B981' },
          { label: 'Bueno', color: '#3B82F6' },
          { label: 'Promedio', color: '#F59E0B' },
          { label: 'Bajo', color: '#EF4444' },
        ].map(({ label, color }) => (
          <div key={label} className="flex items-center gap-2">
            <span
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: color }}
            />
            <span className="text-xs text-gray-600 dark:text-gray-400">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ComparisonBar;
