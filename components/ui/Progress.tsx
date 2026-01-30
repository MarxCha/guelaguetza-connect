import React from 'react';

// ============================================
// Linear Progress Bar
// ============================================

interface ProgressBarProps {
  value: number;
  max?: number;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  color?: 'pink' | 'green' | 'blue' | 'yellow' | 'red' | 'gradient';
  showValue?: boolean;
  valuePosition?: 'inside' | 'right' | 'top';
  animated?: boolean;
  striped?: boolean;
  rounded?: boolean;
  label?: string;
  className?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  max = 100,
  size = 'md',
  color = 'pink',
  showValue = false,
  valuePosition = 'right',
  animated = false,
  striped = false,
  rounded = true,
  label,
  className = '',
}) => {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));

  const sizes = {
    xs: 'h-1',
    sm: 'h-2',
    md: 'h-3',
    lg: 'h-4',
  };

  const colors = {
    pink: 'bg-oaxaca-pink',
    green: 'bg-green-500',
    blue: 'bg-oaxaca-sky',
    yellow: 'bg-oaxaca-yellow',
    red: 'bg-red-500',
    gradient: 'bg-gradient-to-r from-oaxaca-pink to-oaxaca-earth',
  };

  return (
    <div className={className}>
      {(label || (showValue && valuePosition === 'top')) && (
        <div className="flex justify-between items-center mb-1.5">
          {label && <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</span>}
          {showValue && valuePosition === 'top' && (
            <span className="text-sm text-gray-500 dark:text-gray-400">{Math.round(percentage)}%</span>
          )}
        </div>
      )}

      <div className="flex items-center gap-3">
        <div
          className={`
            flex-1 bg-gray-200 dark:bg-gray-700 overflow-hidden
            ${sizes[size]}
            ${rounded ? 'rounded-full' : ''}
          `}
        >
          <div
            className={`
              h-full transition-all duration-500 ease-out
              ${colors[color]}
              ${rounded ? 'rounded-full' : ''}
              ${striped ? 'bg-stripes' : ''}
              ${animated ? 'animate-stripes' : ''}
            `}
            style={{ width: `${percentage}%` }}
          >
            {showValue && valuePosition === 'inside' && size !== 'xs' && size !== 'sm' && (
              <span className="flex items-center justify-center h-full text-xs font-medium text-white">
                {Math.round(percentage)}%
              </span>
            )}
          </div>
        </div>

        {showValue && valuePosition === 'right' && (
          <span className="text-sm font-medium text-gray-600 dark:text-gray-400 min-w-[3rem] text-right">
            {Math.round(percentage)}%
          </span>
        )}
      </div>
    </div>
  );
};

// ============================================
// Circular Progress
// ============================================

interface CircularProgressProps {
  value: number;
  max?: number;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  strokeWidth?: number;
  color?: 'pink' | 'green' | 'blue' | 'yellow' | 'red';
  showValue?: boolean;
  label?: string;
  children?: React.ReactNode;
  className?: string;
}

export const CircularProgress: React.FC<CircularProgressProps> = ({
  value,
  max = 100,
  size = 'md',
  strokeWidth,
  color = 'pink',
  showValue = true,
  label,
  children,
  className = '',
}) => {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));

  const sizes = {
    sm: { size: 48, stroke: 4, fontSize: 'text-xs' },
    md: { size: 80, stroke: 6, fontSize: 'text-base' },
    lg: { size: 120, stroke: 8, fontSize: 'text-xl' },
    xl: { size: 160, stroke: 10, fontSize: 'text-2xl' },
  };

  const colors = {
    pink: 'stroke-oaxaca-pink',
    green: 'stroke-green-500',
    blue: 'stroke-oaxaca-sky',
    yellow: 'stroke-oaxaca-yellow',
    red: 'stroke-red-500',
  };

  const { size: svgSize, stroke, fontSize } = sizes[size];
  const actualStroke = strokeWidth || stroke;
  const radius = (svgSize - actualStroke) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div className={`relative inline-flex ${className}`}>
      <svg
        width={svgSize}
        height={svgSize}
        className="transform -rotate-90"
      >
        {/* Background circle */}
        <circle
          cx={svgSize / 2}
          cy={svgSize / 2}
          r={radius}
          fill="none"
          strokeWidth={actualStroke}
          className="stroke-gray-200 dark:stroke-gray-700"
        />
        {/* Progress circle */}
        <circle
          cx={svgSize / 2}
          cy={svgSize / 2}
          r={radius}
          fill="none"
          strokeWidth={actualStroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className={`${colors[color]} transition-all duration-500 ease-out`}
        />
      </svg>

      {/* Center content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {children || (
          <>
            {showValue && (
              <span className={`font-bold text-gray-900 dark:text-white ${fontSize}`}>
                {Math.round(percentage)}%
              </span>
            )}
            {label && (
              <span className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{label}</span>
            )}
          </>
        )}
      </div>
    </div>
  );
};

// ============================================
// Steps Progress
// ============================================

interface StepsProgressProps {
  steps: number;
  currentStep: number;
  color?: 'pink' | 'green' | 'blue';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const StepsProgress: React.FC<StepsProgressProps> = ({
  steps,
  currentStep,
  color = 'pink',
  size = 'md',
  className = '',
}) => {
  const colors = {
    pink: 'bg-oaxaca-pink',
    green: 'bg-green-500',
    blue: 'bg-oaxaca-sky',
  };

  const sizes = {
    sm: { dot: 'w-2 h-2', line: 'h-0.5' },
    md: { dot: 'w-3 h-3', line: 'h-1' },
    lg: { dot: 'w-4 h-4', line: 'h-1.5' },
  };

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      {Array.from({ length: steps }, (_, i) => (
        <React.Fragment key={i}>
          <div
            className={`
              ${sizes[size].dot} rounded-full transition-colors
              ${i < currentStep ? colors[color] : 'bg-gray-300 dark:bg-gray-600'}
            `}
          />
          {i < steps - 1 && (
            <div
              className={`
                flex-1 min-w-[20px] ${sizes[size].line} rounded-full transition-colors
                ${i < currentStep - 1 ? colors[color] : 'bg-gray-300 dark:bg-gray-600'}
              `}
            />
          )}
        </React.Fragment>
      ))}
    </div>
  );
};

// ============================================
// Rating Stars
// ============================================

interface RatingProps {
  value: number;
  max?: number;
  onChange?: (value: number) => void;
  size?: 'sm' | 'md' | 'lg';
  color?: 'yellow' | 'pink' | 'red';
  allowHalf?: boolean;
  readonly?: boolean;
  showValue?: boolean;
  count?: number;
  className?: string;
}

export const Rating: React.FC<RatingProps> = ({
  value,
  max = 5,
  onChange,
  size = 'md',
  color = 'yellow',
  allowHalf = false,
  readonly = false,
  showValue = false,
  count,
  className = '',
}) => {
  const [hoverValue, setHoverValue] = React.useState<number | null>(null);

  const sizes = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
  };

  const colors = {
    yellow: 'text-oaxaca-yellow',
    pink: 'text-oaxaca-pink',
    red: 'text-red-500',
  };

  const displayValue = hoverValue !== null ? hoverValue : value;

  const handleClick = (index: number, isHalf: boolean) => {
    if (readonly || !onChange) return;
    const newValue = isHalf ? index + 0.5 : index + 1;
    onChange(newValue);
  };

  const handleMouseMove = (index: number, e: React.MouseEvent<HTMLButtonElement>) => {
    if (readonly) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const isHalf = allowHalf && e.clientX - rect.left < rect.width / 2;
    setHoverValue(isHalf ? index + 0.5 : index + 1);
  };

  const renderStar = (index: number) => {
    const filled = displayValue >= index + 1;
    const halfFilled = allowHalf && displayValue >= index + 0.5 && displayValue < index + 1;

    return (
      <button
        key={index}
        type="button"
        onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const isHalf = allowHalf && e.clientX - rect.left < rect.width / 2;
          handleClick(index, isHalf);
        }}
        onMouseMove={(e) => handleMouseMove(index, e)}
        onMouseLeave={() => setHoverValue(null)}
        disabled={readonly}
        className={`
          ${sizes[size]} relative
          ${readonly ? 'cursor-default' : 'cursor-pointer'}
          transition-transform hover:scale-110
        `}
      >
        {/* Empty star */}
        <svg
          className={`absolute inset-0 ${sizes[size]} text-gray-300 dark:text-gray-600`}
          fill="currentColor"
          viewBox="0 0 24 24"
        >
          <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
        </svg>

        {/* Filled star */}
        {(filled || halfFilled) && (
          <svg
            className={`absolute inset-0 ${sizes[size]} ${colors[color]}`}
            fill="currentColor"
            viewBox="0 0 24 24"
            style={halfFilled ? { clipPath: 'inset(0 50% 0 0)' } : undefined}
          >
            <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
          </svg>
        )}
      </button>
    );
  };

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      <div className="flex">
        {Array.from({ length: max }, (_, i) => renderStar(i))}
      </div>

      {(showValue || count !== undefined) && (
        <div className="ml-2 flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400">
          {showValue && <span className="font-medium">{value.toFixed(1)}</span>}
          {count !== undefined && <span>({count})</span>}
        </div>
      )}
    </div>
  );
};

// ============================================
// Like/Heart Rating
// ============================================

interface LikeRatingProps {
  liked: boolean;
  count?: number;
  onChange?: (liked: boolean) => void;
  size?: 'sm' | 'md' | 'lg';
  showCount?: boolean;
  animated?: boolean;
  className?: string;
}

export const LikeRating: React.FC<LikeRatingProps> = ({
  liked,
  count = 0,
  onChange,
  size = 'md',
  showCount = true,
  animated = true,
  className = '',
}) => {
  const sizes = {
    sm: 'w-5 h-5',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
  };

  const handleClick = () => {
    onChange?.(!liked);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`
        inline-flex items-center gap-1.5
        ${liked ? 'text-red-500' : 'text-gray-400 hover:text-red-400'}
        transition-colors
        ${className}
      `}
    >
      <svg
        className={`
          ${sizes[size]}
          ${animated && liked ? 'animate-bounce-once' : ''}
          transition-transform active:scale-90
        `}
        fill={liked ? 'currentColor' : 'none'}
        stroke="currentColor"
        viewBox="0 0 24 24"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
        />
      </svg>
      {showCount && (
        <span className={`font-medium ${size === 'sm' ? 'text-xs' : 'text-sm'}`}>
          {count}
        </span>
      )}
    </button>
  );
};

// ============================================
// Emoji Rating
// ============================================

interface EmojiRatingProps {
  value: number;
  onChange?: (value: number) => void;
  readonly?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const emojis = [
  { emoji: '😡', label: 'Muy malo' },
  { emoji: '😕', label: 'Malo' },
  { emoji: '😐', label: 'Regular' },
  { emoji: '😊', label: 'Bueno' },
  { emoji: '😍', label: 'Excelente' },
];

export const EmojiRating: React.FC<EmojiRatingProps> = ({
  value,
  onChange,
  readonly = false,
  size = 'md',
  className = '',
}) => {
  const sizes = {
    sm: 'text-2xl',
    md: 'text-3xl',
    lg: 'text-4xl',
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {emojis.map((item, index) => (
        <button
          key={index}
          type="button"
          onClick={() => !readonly && onChange?.(index + 1)}
          disabled={readonly}
          title={item.label}
          className={`
            ${sizes[size]}
            transition-all
            ${value === index + 1 ? 'scale-125' : 'opacity-50 hover:opacity-100'}
            ${readonly ? 'cursor-default' : 'cursor-pointer hover:scale-110'}
          `}
        >
          {item.emoji}
        </button>
      ))}
    </div>
  );
};

// ============================================
// Score Badge
// ============================================

interface ScoreBadgeProps {
  score: number;
  max?: number;
  size?: 'sm' | 'md' | 'lg';
  showMax?: boolean;
  className?: string;
}

export const ScoreBadge: React.FC<ScoreBadgeProps> = ({
  score,
  max = 10,
  size = 'md',
  showMax = false,
  className = '',
}) => {
  const percentage = (score / max) * 100;

  let colorClass = 'bg-red-500';
  if (percentage >= 80) colorClass = 'bg-green-500';
  else if (percentage >= 60) colorClass = 'bg-oaxaca-yellow';
  else if (percentage >= 40) colorClass = 'bg-oaxaca-yellow';

  const sizes = {
    sm: 'w-8 h-8 text-sm',
    md: 'w-10 h-10 text-base',
    lg: 'w-14 h-14 text-xl',
  };

  return (
    <div
      className={`
        ${sizes[size]}
        ${colorClass}
        rounded-lg flex flex-col items-center justify-center text-white font-bold
        ${className}
      `}
    >
      <span>{score.toFixed(1)}</span>
      {showMax && <span className="text-xs opacity-80">/{max}</span>}
    </div>
  );
};

// ============================================
// Review Summary
// ============================================

interface ReviewSummaryProps {
  averageRating: number;
  totalReviews: number;
  distribution: {
    5: number;
    4: number;
    3: number;
    2: number;
    1: number;
  };
  className?: string;
}

export const ReviewSummary: React.FC<ReviewSummaryProps> = ({
  averageRating,
  totalReviews,
  distribution,
  className = '',
}) => {
  const maxCount = Math.max(...Object.values(distribution));

  return (
    <div className={`flex gap-6 ${className}`}>
      {/* Average */}
      <div className="text-center">
        <div className="text-5xl font-bold text-gray-900 dark:text-white">
          {averageRating.toFixed(1)}
        </div>
        <Rating value={averageRating} readonly size="sm" />
        <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          {totalReviews.toLocaleString()} reseñas
        </div>
      </div>

      {/* Distribution */}
      <div className="flex-1 space-y-2">
        {([5, 4, 3, 2, 1] as const).map((stars) => (
          <div key={stars} className="flex items-center gap-2">
            <span className="w-3 text-sm text-gray-600 dark:text-gray-400">{stars}</span>
            <svg className="w-4 h-4 text-oaxaca-yellow" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
            </svg>
            <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-oaxaca-yellow rounded-full transition-all duration-500"
                style={{ width: `${maxCount > 0 ? (distribution[stars] / maxCount) * 100 : 0}%` }}
              />
            </div>
            <span className="w-10 text-sm text-gray-500 dark:text-gray-400 text-right">
              {distribution[stars]}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

// ============================================
// Skill Progress
// ============================================

interface SkillProgressProps {
  skills: Array<{
    name: string;
    value: number;
    max?: number;
    color?: 'pink' | 'green' | 'blue' | 'yellow' | 'red';
  }>;
  showValues?: boolean;
  animated?: boolean;
  className?: string;
}

export const SkillProgress: React.FC<SkillProgressProps> = ({
  skills,
  showValues = true,
  animated = true,
  className = '',
}) => {
  const colors = {
    pink: 'bg-oaxaca-pink',
    green: 'bg-green-500',
    blue: 'bg-oaxaca-sky',
    yellow: 'bg-oaxaca-yellow',
    red: 'bg-red-500',
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {skills.map((skill, index) => {
        const percentage = (skill.value / (skill.max || 100)) * 100;

        return (
          <div key={index}>
            <div className="flex justify-between items-center mb-1">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {skill.name}
              </span>
              {showValues && (
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {skill.value}/{skill.max || 100}
                </span>
              )}
            </div>
            <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className={`
                  h-full rounded-full
                  ${colors[skill.color || 'pink']}
                  ${animated ? 'transition-all duration-1000 ease-out' : ''}
                `}
                style={{ width: `${percentage}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};

// ============================================
// Stats Card
// ============================================

interface StatItemProps {
  label: string;
  value: string | number;
  change?: number;
  icon?: React.ReactNode;
  color?: 'pink' | 'green' | 'blue' | 'yellow' | 'red';
  className?: string;
}

export const StatItem: React.FC<StatItemProps> = ({
  label,
  value,
  change,
  icon,
  color = 'pink',
  className = '',
}) => {
  const colors = {
    pink: 'bg-oaxaca-pink/10 text-oaxaca-pink',
    green: 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400',
    blue: 'bg-oaxaca-sky-light dark:bg-oaxaca-sky/20 text-oaxaca-sky dark:text-oaxaca-sky',
    yellow: 'bg-oaxaca-yellow-light dark:bg-oaxaca-yellow/20 text-oaxaca-yellow dark:text-oaxaca-yellow',
    red: 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400',
  };

  return (
    <div className={`p-4 bg-white dark:bg-gray-800 rounded-xl ${className}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{value}</p>
          {change !== undefined && (
            <div className={`flex items-center gap-1 mt-1 text-sm ${change >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                {change >= 0 ? (
                  <path d="M7 14l5-5 5 5H7z" />
                ) : (
                  <path d="M7 10l5 5 5-5H7z" />
                )}
              </svg>
              <span>{Math.abs(change)}%</span>
            </div>
          )}
        </div>
        {icon && (
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${colors[color]}`}>
            {icon}
          </div>
        )}
      </div>
    </div>
  );
};
