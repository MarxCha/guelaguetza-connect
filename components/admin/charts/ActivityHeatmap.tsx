import React, { useState } from 'react';
import { HeatmapData } from '../../../hooks/useAdminStats';

interface ActivityHeatmapProps {
  data: HeatmapData[];
  height?: number;
}

const DAYS = ['Dom', 'Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab'];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

const getColorIntensity = (value: number, maxValue: number): string => {
  const intensity = value / maxValue;

  if (intensity === 0) return 'bg-gray-100 dark:bg-gray-800';
  if (intensity < 0.2) return 'bg-blue-100 dark:bg-blue-900/30';
  if (intensity < 0.4) return 'bg-blue-200 dark:bg-blue-800/40';
  if (intensity < 0.6) return 'bg-blue-400 dark:bg-blue-600/60';
  if (intensity < 0.8) return 'bg-blue-500 dark:bg-blue-500/80';
  return 'bg-blue-600 dark:bg-blue-400';
};

const ActivityHeatmap: React.FC<ActivityHeatmapProps> = ({ data, height = 200 }) => {
  const [hoveredCell, setHoveredCell] = useState<{ day: number; hour: number } | null>(null);

  // Create a map for quick lookup
  const dataMap = new Map(
    data.map((d) => [`${d.day}-${d.hour}`, d.value])
  );

  const maxValue = Math.max(...data.map((d) => d.value));

  const getValue = (day: number, hour: number): number => {
    return dataMap.get(`${day}-${hour}`) || 0;
  };

  const formatHour = (hour: number): string => {
    if (hour === 0) return '12am';
    if (hour === 12) return '12pm';
    return hour < 12 ? `${hour}am` : `${hour - 12}pm`;
  };

  const hoveredValue = hoveredCell ? getValue(hoveredCell.day, hoveredCell.hour) : null;

  return (
    <div className="w-full">
      {/* Tooltip */}
      {hoveredCell && (
        <div className="mb-3 text-center">
          <span className="inline-block px-3 py-1.5 bg-gray-100 dark:bg-gray-700 rounded-full text-sm">
            <span className="font-medium text-gray-900 dark:text-white">
              {DAYS[hoveredCell.day]} {formatHour(hoveredCell.hour)}
            </span>
            <span className="mx-2 text-gray-400">|</span>
            <span className="text-blue-600 dark:text-blue-400 font-semibold">
              {hoveredValue} actividades
            </span>
          </span>
        </div>
      )}

      <div
        className="overflow-x-auto"
        style={{ height: height }}
      >
        <div className="min-w-[600px]">
          {/* Hours header */}
          <div className="flex mb-1 pl-10">
            {HOURS.filter((h) => h % 3 === 0).map((hour) => (
              <div
                key={hour}
                className="text-[10px] text-gray-500 dark:text-gray-400"
                style={{ width: `${100 / 8}%` }}
              >
                {formatHour(hour)}
              </div>
            ))}
          </div>

          {/* Grid */}
          <div className="flex flex-col gap-1">
            {DAYS.map((day, dayIndex) => (
              <div key={day} className="flex items-center gap-1">
                {/* Day label */}
                <div className="w-8 text-xs text-gray-500 dark:text-gray-400 text-right pr-2">
                  {day}
                </div>

                {/* Hour cells */}
                <div className="flex-1 flex gap-[2px]">
                  {HOURS.map((hour) => {
                    const value = getValue(dayIndex, hour);
                    const isHovered =
                      hoveredCell?.day === dayIndex && hoveredCell?.hour === hour;

                    return (
                      <div
                        key={hour}
                        className={`
                          flex-1 h-5 rounded-sm cursor-pointer transition-all
                          ${getColorIntensity(value, maxValue)}
                          ${isHovered ? 'ring-2 ring-blue-500 ring-offset-1' : ''}
                        `}
                        onMouseEnter={() => setHoveredCell({ day: dayIndex, hour })}
                        onMouseLeave={() => setHoveredCell(null)}
                        title={`${DAYS[dayIndex]} ${formatHour(hour)}: ${value}`}
                      />
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-2 mt-4">
        <span className="text-xs text-gray-500">Menos</span>
        <div className="flex gap-1">
          <div className="w-4 h-4 rounded-sm bg-gray-100 dark:bg-gray-800" />
          <div className="w-4 h-4 rounded-sm bg-blue-100 dark:bg-blue-900/30" />
          <div className="w-4 h-4 rounded-sm bg-blue-200 dark:bg-blue-800/40" />
          <div className="w-4 h-4 rounded-sm bg-blue-400 dark:bg-blue-600/60" />
          <div className="w-4 h-4 rounded-sm bg-blue-500 dark:bg-blue-500/80" />
          <div className="w-4 h-4 rounded-sm bg-blue-600 dark:bg-blue-400" />
        </div>
        <span className="text-xs text-gray-500">Mas</span>
      </div>
    </div>
  );
};

export default ActivityHeatmap;
