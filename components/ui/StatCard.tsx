import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: string | number;
  change?: number;
  icon?: React.ReactNode;
  color?: 'pink' | 'purple' | 'yellow' | 'green' | 'blue' | 'red' | 'indigo' | 'orange';
}

const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  change,
  icon,
  color = 'pink',
}) => {
  const colorClasses = {
    pink: 'bg-oaxaca-pink/10 text-oaxaca-pink',
    purple: 'bg-oaxaca-purple/10 text-oaxaca-purple',
    yellow: 'bg-oaxaca-yellow/10 text-oaxaca-yellow',
    green: 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400',
    blue: 'bg-oaxaca-sky-light text-oaxaca-sky dark:bg-oaxaca-sky/20 dark:text-oaxaca-sky',
    red: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
    indigo: 'bg-oaxaca-purple-light text-oaxaca-purple dark:bg-oaxaca-purple/20 dark:text-oaxaca-purple',
    orange: 'bg-oaxaca-yellow-light text-oaxaca-yellow dark:bg-oaxaca-yellow/20 dark:text-oaxaca-yellow',
  };

  const getChangeIcon = () => {
    if (change === undefined) return null;
    if (change > 0) return <TrendingUp size={14} className="text-green-500" />;
    if (change < 0) return <TrendingDown size={14} className="text-red-500" />;
    return <Minus size={14} className="text-gray-400" />;
  };

  const getChangeColor = () => {
    if (change === undefined) return '';
    if (change > 0) return 'text-green-500';
    if (change < 0) return 'text-red-500';
    return 'text-gray-400';
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            {label}
          </p>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">
            {value}
          </p>
          {change !== undefined && (
            <div className="flex items-center gap-1 mt-1">
              {getChangeIcon()}
              <span className={`text-xs font-medium ${getChangeColor()}`}>
                {change >= 0 ? '+' : ''}
                {change}%
              </span>
              <span className="text-xs text-gray-400">vs anterior</span>
            </div>
          )}
        </div>
        {icon && (
          <div className={`p-2 rounded-lg ${colorClasses[color]}`}>
            {icon}
          </div>
        )}
      </div>
    </div>
  );
};

export default StatCard;
