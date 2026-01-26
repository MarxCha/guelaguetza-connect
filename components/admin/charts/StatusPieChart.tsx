import React, { useState } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Sector,
} from 'recharts';
import { StatusDistribution } from '../../../services/admin';

interface StatusPieChartProps {
  data: StatusDistribution[];
  height?: number;
  showPercentages?: boolean;
  title?: string;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    payload: StatusDistribution;
  }>;
}

interface ActiveShapeProps {
  cx: number;
  cy: number;
  midAngle: number;
  innerRadius: number;
  outerRadius: number;
  startAngle: number;
  endAngle: number;
  fill: string;
  payload: StatusDistribution;
  percent: number;
  value: number;
}

const RADIAN = Math.PI / 180;

const renderActiveShape = (props: ActiveShapeProps) => {
  const {
    cx,
    cy,
    midAngle,
    innerRadius,
    outerRadius,
    startAngle,
    endAngle,
    fill,
    payload,
    percent,
  } = props;

  const sin = Math.sin(-RADIAN * midAngle);
  const cos = Math.cos(-RADIAN * midAngle);
  const sx = cx + (outerRadius + 10) * cos;
  const sy = cy + (outerRadius + 10) * sin;
  const mx = cx + (outerRadius + 20) * cos;
  const my = cy + (outerRadius + 20) * sin;
  const ex = mx + (cos >= 0 ? 1 : -1) * 22;
  const ey = my;
  const textAnchor = cos >= 0 ? 'start' : 'end';

  return (
    <g>
      <text
        x={cx}
        y={cy}
        dy={-5}
        textAnchor="middle"
        className="fill-gray-900 dark:fill-white text-sm font-medium"
      >
        {payload.status}
      </text>
      <text
        x={cx}
        y={cy}
        dy={15}
        textAnchor="middle"
        className="fill-gray-500 dark:fill-gray-400 text-xs"
      >
        {payload.count.toLocaleString()}
      </text>
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
      />
      <Sector
        cx={cx}
        cy={cy}
        startAngle={startAngle}
        endAngle={endAngle}
        innerRadius={outerRadius + 6}
        outerRadius={outerRadius + 10}
        fill={fill}
      />
      <path d={`M${sx},${sy}L${mx},${my}L${ex},${ey}`} stroke={fill} fill="none" />
      <circle cx={ex} cy={ey} r={2} fill={fill} stroke="none" />
      <text
        x={ex + (cos >= 0 ? 1 : -1) * 8}
        y={ey}
        textAnchor={textAnchor}
        className="fill-gray-700 dark:fill-gray-300 text-xs"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    </g>
  );
};

const CustomTooltip = ({ active, payload }: CustomTooltipProps) => {
  if (!active || !payload || !payload.length) return null;

  const data = payload[0].payload;

  return (
    <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
      <div className="flex items-center gap-2 mb-1">
        <span
          className="w-3 h-3 rounded-full"
          style={{ backgroundColor: data.color }}
        />
        <span className="font-medium text-gray-900 dark:text-white">{data.status}</span>
      </div>
      <div className="text-sm text-gray-500 space-y-1">
        <p>
          <span className="font-semibold text-gray-900 dark:text-white">
            {data.count.toLocaleString()}
          </span>{' '}
          registros
        </p>
        <p>
          <span className="font-semibold text-gray-900 dark:text-white">
            {data.percentage}%
          </span>{' '}
          del total
        </p>
      </div>
    </div>
  );
};

const StatusPieChart: React.FC<StatusPieChartProps> = ({
  data,
  height = 300,
  showPercentages = true,
}) => {
  const [activeIndex, setActiveIndex] = useState(0);

  const onPieEnter = (_: unknown, index: number) => {
    setActiveIndex(index);
  };

  // Transform data for the pie chart (use percentage as value)
  const chartData = data.map((item) => ({
    ...item,
    value: item.percentage,
  }));

  return (
    <div className="w-full">
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie
            activeIndex={activeIndex}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            activeShape={showPercentages ? renderActiveShape as any : undefined}
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={80}
            paddingAngle={2}
            dataKey="value"
            onMouseEnter={onPieEnter}
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          {!showPercentages && <Tooltip content={<CustomTooltip />} />}
        </PieChart>
      </ResponsiveContainer>

      {/* Interactive Legend */}
      <div className="flex flex-wrap justify-center gap-3 mt-4">
        {data.map((entry, index) => (
          <button
            key={entry.status}
            onClick={() => setActiveIndex(index)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full transition-all ${
              activeIndex === index
                ? 'bg-gray-100 dark:bg-gray-700'
                : 'hover:bg-gray-50 dark:hover:bg-gray-800'
            }`}
          >
            <span
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-xs text-gray-600 dark:text-gray-300">{entry.status}</span>
            <span className="text-xs font-semibold text-gray-900 dark:text-white">
              {entry.percentage}%
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default StatusPieChart;
