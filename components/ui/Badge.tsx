import React, { useState, useCallback } from 'react';
import { X, Check, AlertCircle, Clock, Star, Zap, Crown, Shield, Heart } from 'lucide-react';
import { triggerHaptic } from '../../utils/haptics';

// ============================================
// Types
// ============================================

type BadgeVariant = 'default' | 'secondary' | 'success' | 'warning' | 'danger' | 'info' | 'pink';
type BadgeSize = 'sm' | 'md' | 'lg';

// ============================================
// Badge Component
// ============================================

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  size?: BadgeSize;
  icon?: React.ReactNode;
  dot?: boolean;
  pulse?: boolean;
  rounded?: boolean;
  removable?: boolean;
  onRemove?: () => void;
  className?: string;
}

/**
 * Badge - Etiquetas para indicar estado o categoría
 *
 * Features:
 * - Múltiples variantes de color
 * - Tamaños configurables
 * - Iconos opcionales
 * - Indicador de punto/pulso
 * - Removible
 *
 * Usage:
 * <Badge variant="success">Activo</Badge>
 * <Badge variant="warning" dot>Pendiente</Badge>
 */
const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'default',
  size = 'md',
  icon,
  dot = false,
  pulse = false,
  rounded = false,
  removable = false,
  onRemove,
  className = '',
}) => {
  const variants: Record<BadgeVariant, string> = {
    default: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
    secondary: 'bg-gray-200 text-gray-600 dark:bg-gray-600 dark:text-gray-300',
    success: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    warning: 'bg-oaxaca-yellow-light text-oaxaca-yellow dark:bg-oaxaca-yellow/20 dark:text-oaxaca-yellow',
    danger: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    info: 'bg-oaxaca-sky-light text-oaxaca-sky dark:bg-oaxaca-sky/20 dark:text-oaxaca-sky',
    pink: 'bg-oaxaca-pink/10 text-oaxaca-pink',
  };

  const sizes: Record<BadgeSize, string> = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-xs px-2.5 py-1',
    lg: 'text-sm px-3 py-1.5',
  };

  const dotColors: Record<BadgeVariant, string> = {
    default: 'bg-gray-500',
    secondary: 'bg-gray-400',
    success: 'bg-green-500',
    warning: 'bg-oaxaca-yellow',
    danger: 'bg-red-500',
    info: 'bg-oaxaca-sky',
    pink: 'bg-oaxaca-pink',
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    onRemove?.();
    triggerHaptic('light');
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium ${variants[variant]} ${sizes[size]} ${
        rounded ? 'rounded-full' : 'rounded-md'
      } ${className}`}
    >
      {dot && (
        <span className="relative flex h-2 w-2">
          {pulse && (
            <span
              className={`absolute inline-flex h-full w-full rounded-full ${dotColors[variant]} opacity-75 animate-ping`}
            />
          )}
          <span className={`relative inline-flex rounded-full h-2 w-2 ${dotColors[variant]}`} />
        </span>
      )}
      {icon && <span className="flex-shrink-0">{icon}</span>}
      {children}
      {removable && (
        <button
          onClick={handleRemove}
          className="flex-shrink-0 ml-0.5 -mr-1 p-0.5 rounded hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
        >
          <X size={12} />
        </button>
      )}
    </span>
  );
};

// ============================================
// Tag Component
// ============================================

interface TagProps {
  children: React.ReactNode;
  color?: string;
  selected?: boolean;
  onClick?: () => void;
  onRemove?: () => void;
  size?: BadgeSize;
  className?: string;
}

export const Tag: React.FC<TagProps> = ({
  children,
  color,
  selected = false,
  onClick,
  onRemove,
  size = 'md',
  className = '',
}) => {
  const sizes: Record<BadgeSize, string> = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-xs px-2.5 py-1',
    lg: 'text-sm px-3 py-1.5',
  };

  const baseStyles = color
    ? {
        backgroundColor: selected ? color : `${color}15`,
        color: selected ? 'white' : color,
        borderColor: color,
      }
    : undefined;

  return (
    <span
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 font-medium rounded-full border transition-all ${
        sizes[size]
      } ${
        color
          ? 'border-current'
          : selected
          ? 'bg-oaxaca-pink text-white border-oaxaca-pink'
          : 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600'
      } ${onClick ? 'cursor-pointer hover:shadow-md' : ''} ${className}`}
      style={baseStyles}
    >
      {children}
      {onRemove && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
            triggerHaptic('light');
          }}
          className="flex-shrink-0 p-0.5 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
        >
          <X size={12} />
        </button>
      )}
    </span>
  );
};

// ============================================
// StatusBadge Component
// ============================================

interface StatusBadgeProps {
  status: 'online' | 'offline' | 'busy' | 'away' | 'pending' | 'approved' | 'rejected';
  showLabel?: boolean;
  size?: BadgeSize;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  showLabel = true,
  size = 'md',
  className = '',
}) => {
  const statusConfig: Record<
    StatusBadgeProps['status'],
    { color: string; label: string; icon?: React.ReactNode }
  > = {
    online: { color: 'bg-green-500', label: 'En línea' },
    offline: { color: 'bg-gray-400', label: 'Desconectado' },
    busy: { color: 'bg-red-500', label: 'Ocupado' },
    away: { color: 'bg-oaxaca-yellow', label: 'Ausente' },
    pending: { color: 'bg-oaxaca-yellow', label: 'Pendiente', icon: <Clock size={12} /> },
    approved: { color: 'bg-green-500', label: 'Aprobado', icon: <Check size={12} /> },
    rejected: { color: 'bg-red-500', label: 'Rechazado', icon: <X size={12} /> },
  };

  const config = statusConfig[status];

  const sizes: Record<BadgeSize, string> = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-xs px-2.5 py-1',
    lg: 'text-sm px-3 py-1.5',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium rounded-full ${sizes[size]} ${className}`}
    >
      <span className={`w-2 h-2 rounded-full ${config.color}`} />
      {config.icon}
      {showLabel && <span className="text-gray-700 dark:text-gray-300">{config.label}</span>}
    </span>
  );
};

// ============================================
// NotificationBadge Component
// ============================================

interface NotificationBadgeProps {
  count: number;
  max?: number;
  showZero?: boolean;
  dot?: boolean;
  children: React.ReactNode;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  className?: string;
}

export const NotificationBadge: React.FC<NotificationBadgeProps> = ({
  count,
  max = 99,
  showZero = false,
  dot = false,
  children,
  position = 'top-right',
  className = '',
}) => {
  const displayCount = count > max ? `${max}+` : count;
  const show = dot || count > 0 || showZero;

  const positions: Record<NotificationBadgeProps['position'], string> = {
    'top-right': 'top-0 right-0 -translate-y-1/2 translate-x-1/2',
    'top-left': 'top-0 left-0 -translate-y-1/2 -translate-x-1/2',
    'bottom-right': 'bottom-0 right-0 translate-y-1/2 translate-x-1/2',
    'bottom-left': 'bottom-0 left-0 translate-y-1/2 -translate-x-1/2',
  };

  return (
    <div className={`relative inline-flex ${className}`}>
      {children}
      {show && (
        <span
          className={`absolute ${positions[position!]} flex items-center justify-center bg-red-500 text-white font-bold ${
            dot
              ? 'w-3 h-3 rounded-full'
              : 'min-w-[1.25rem] h-5 px-1.5 rounded-full text-xs'
          }`}
        >
          {!dot && displayCount}
        </span>
      )}
    </div>
  );
};

// ============================================
// FeatureBadge Component
// ============================================

interface FeatureBadgeProps {
  type: 'new' | 'beta' | 'pro' | 'premium' | 'popular' | 'featured' | 'verified';
  size?: BadgeSize;
  className?: string;
}

export const FeatureBadge: React.FC<FeatureBadgeProps> = ({
  type,
  size = 'sm',
  className = '',
}) => {
  const config: Record<
    FeatureBadgeProps['type'],
    { label: string; icon: React.ReactNode; colors: string }
  > = {
    new: {
      label: 'Nuevo',
      icon: <Zap size={12} />,
      colors: 'bg-green-500 text-white',
    },
    beta: {
      label: 'Beta',
      icon: <AlertCircle size={12} />,
      colors: 'bg-oaxaca-purple text-white',
    },
    pro: {
      label: 'Pro',
      icon: <Star size={12} />,
      colors: 'bg-gradient-to-r from-oaxaca-yellow to-oaxaca-yellow text-white',
    },
    premium: {
      label: 'Premium',
      icon: <Crown size={12} />,
      colors: 'bg-gradient-to-r from-oaxaca-pink to-oaxaca-purple text-white',
    },
    popular: {
      label: 'Popular',
      icon: <Heart size={12} />,
      colors: 'bg-oaxaca-pink text-white',
    },
    featured: {
      label: 'Destacado',
      icon: <Star size={12} />,
      colors: 'bg-oaxaca-yellow text-white',
    },
    verified: {
      label: 'Verificado',
      icon: <Shield size={12} />,
      colors: 'bg-oaxaca-sky text-white',
    },
  };

  const { label, icon, colors } = config[type];

  const sizes: Record<BadgeSize, string> = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-xs px-2.5 py-1',
    lg: 'text-sm px-3 py-1.5',
  };

  return (
    <span
      className={`inline-flex items-center gap-1 font-semibold rounded-full ${colors} ${sizes[size]} ${className}`}
    >
      {icon}
      {label}
    </span>
  );
};

// ============================================
// TagInput Component
// ============================================

interface TagInputProps {
  tags: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  maxTags?: number;
  suggestions?: string[];
  className?: string;
}

export const TagInput: React.FC<TagInputProps> = ({
  tags,
  onChange,
  placeholder = 'Agregar etiqueta...',
  maxTags = Infinity,
  suggestions = [],
  className = '',
}) => {
  const [input, setInput] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);

  const filteredSuggestions = suggestions.filter(
    (s) => s.toLowerCase().includes(input.toLowerCase()) && !tags.includes(s)
  );

  const addTag = useCallback(
    (tag: string) => {
      const trimmed = tag.trim();
      if (trimmed && !tags.includes(trimmed) && tags.length < maxTags) {
        onChange([...tags, trimmed]);
        setInput('');
        triggerHaptic('light');
      }
    },
    [tags, onChange, maxTags]
  );

  const removeTag = useCallback(
    (tagToRemove: string) => {
      onChange(tags.filter((t) => t !== tagToRemove));
      triggerHaptic('light');
    },
    [tags, onChange]
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && input) {
      e.preventDefault();
      addTag(input);
    } else if (e.key === 'Backspace' && !input && tags.length > 0) {
      removeTag(tags[tags.length - 1]);
    }
  };

  return (
    <div className={`relative ${className}`}>
      <div className="flex flex-wrap gap-2 p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus-within:ring-2 focus-within:ring-oaxaca-pink focus-within:border-transparent">
        {tags.map((tag) => (
          <Tag key={tag} onRemove={() => removeTag(tag)}>
            {tag}
          </Tag>
        ))}
        {tags.length < maxTags && (
          <input
            type="text"
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              setShowSuggestions(true);
            }}
            onKeyDown={handleKeyDown}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
            placeholder={tags.length === 0 ? placeholder : ''}
            className="flex-1 min-w-[100px] bg-transparent border-none outline-none text-sm text-gray-900 dark:text-white placeholder-gray-400"
          />
        )}
      </div>

      {/* Suggestions dropdown */}
      {showSuggestions && filteredSuggestions.length > 0 && (
        <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg max-h-48 overflow-y-auto">
          {filteredSuggestions.map((suggestion) => (
            <button
              key={suggestion}
              onClick={() => addTag(suggestion)}
              className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 first:rounded-t-xl last:rounded-b-xl"
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}

      {maxTags !== Infinity && (
        <p className="mt-1 text-xs text-gray-500">
          {tags.length}/{maxTags} etiquetas
        </p>
      )}
    </div>
  );
};

// ============================================
// CategoryTags Component
// ============================================

interface Category {
  id: string;
  name: string;
  color?: string;
  icon?: React.ReactNode;
}

interface CategoryTagsProps {
  categories: Category[];
  selected: string[];
  onChange: (selected: string[]) => void;
  multiSelect?: boolean;
  className?: string;
}

export const CategoryTags: React.FC<CategoryTagsProps> = ({
  categories,
  selected,
  onChange,
  multiSelect = true,
  className = '',
}) => {
  const handleClick = (categoryId: string) => {
    if (multiSelect) {
      if (selected.includes(categoryId)) {
        onChange(selected.filter((id) => id !== categoryId));
      } else {
        onChange([...selected, categoryId]);
      }
    } else {
      onChange(selected.includes(categoryId) ? [] : [categoryId]);
    }
    triggerHaptic('selection');
  };

  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {categories.map((category) => (
        <Tag
          key={category.id}
          color={category.color}
          selected={selected.includes(category.id)}
          onClick={() => handleClick(category.id)}
        >
          {category.icon}
          {category.name}
        </Tag>
      ))}
    </div>
  );
};

// ============================================
// AvatarWithBadge Component
// ============================================

interface AvatarWithBadgeProps {
  src?: string;
  alt: string;
  fallback?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  badge?: React.ReactNode;
  status?: 'online' | 'offline' | 'busy' | 'away';
  className?: string;
}

export const AvatarWithBadge: React.FC<AvatarWithBadgeProps> = ({
  src,
  alt,
  fallback,
  size = 'md',
  badge,
  status,
  className = '',
}) => {
  const sizes: Record<string, { avatar: string; status: string }> = {
    sm: { avatar: 'w-8 h-8 text-xs', status: 'w-2.5 h-2.5 border' },
    md: { avatar: 'w-10 h-10 text-sm', status: 'w-3 h-3 border-2' },
    lg: { avatar: 'w-12 h-12 text-base', status: 'w-3.5 h-3.5 border-2' },
    xl: { avatar: 'w-16 h-16 text-lg', status: 'w-4 h-4 border-2' },
  };

  const statusColors: Record<string, string> = {
    online: 'bg-green-500',
    offline: 'bg-gray-400',
    busy: 'bg-red-500',
    away: 'bg-oaxaca-yellow',
  };

  return (
    <div className={`relative inline-flex ${className}`}>
      {src ? (
        <img
          src={src}
          alt={alt}
          className={`rounded-full object-cover ${sizes[size].avatar}`}
        />
      ) : (
        <div
          className={`rounded-full bg-oaxaca-pink/10 text-oaxaca-pink flex items-center justify-center font-semibold ${sizes[size].avatar}`}
        >
          {fallback || alt.charAt(0).toUpperCase()}
        </div>
      )}

      {status && (
        <span
          className={`absolute bottom-0 right-0 rounded-full border-white dark:border-gray-900 ${statusColors[status]} ${sizes[size].status}`}
        />
      )}

      {badge && (
        <span className="absolute -top-1 -right-1">
          {badge}
        </span>
      )}
    </div>
  );
};

export default Badge;
