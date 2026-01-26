import React from 'react';
import { ChevronRight, MoreVertical, Heart, Share2, Bookmark, MapPin, Calendar, Clock } from 'lucide-react';
import { triggerHaptic } from '../../utils/haptics';

// ============================================
// Base Card Component
// ============================================

interface CardProps {
  children: React.ReactNode;
  variant?: 'elevated' | 'outlined' | 'filled';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  rounded?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  hoverable?: boolean;
  onClick?: () => void;
  className?: string;
}

/**
 * Card - Componente base de tarjeta
 *
 * Features:
 * - Múltiples variantes
 * - Padding configurable
 * - Hover effects
 *
 * Usage:
 * <Card variant="elevated" padding="md">
 *   Contenido de la tarjeta
 * </Card>
 */
const Card: React.FC<CardProps> = ({
  children,
  variant = 'elevated',
  padding = 'md',
  rounded = 'xl',
  hoverable = false,
  onClick,
  className = '',
}) => {
  const variants = {
    elevated: 'bg-white dark:bg-gray-800 shadow-sm',
    outlined: 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700',
    filled: 'bg-gray-50 dark:bg-gray-900',
  };

  const paddings = {
    none: '',
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-6',
  };

  const roundeds = {
    sm: 'rounded-lg',
    md: 'rounded-xl',
    lg: 'rounded-2xl',
    xl: 'rounded-3xl',
    '2xl': 'rounded-[2rem]',
  };

  const handleClick = () => {
    if (onClick) {
      onClick();
      triggerHaptic('light');
    }
  };

  return (
    <div
      className={`${variants[variant]} ${paddings[padding]} ${roundeds[rounded]} ${
        hoverable ? 'transition-all duration-200 hover:shadow-lg hover:-translate-y-1' : ''
      } ${onClick ? 'cursor-pointer focus-visible:ring-2 focus-visible:ring-oaxaca-pink focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-900' : ''} ${className}`}
      onClick={handleClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick();
        }
      } : undefined}
    >
      {children}
    </div>
  );
};

// ============================================
// Card Header
// ============================================

interface CardHeaderProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

export const CardHeader: React.FC<CardHeaderProps> = ({
  title,
  subtitle,
  icon,
  action,
  className = '',
}) => (
  <div className={`flex items-start justify-between gap-4 ${className}`}>
    <div className="flex items-start gap-3">
      {icon && (
        <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-oaxaca-pink/10 flex items-center justify-center text-oaxaca-pink">
          {icon}
        </div>
      )}
      <div>
        <h3 className="font-semibold text-gray-900 dark:text-white">{title}</h3>
        {subtitle && (
          <p className="text-sm text-gray-500 dark:text-gray-400">{subtitle}</p>
        )}
      </div>
    </div>
    {action}
  </div>
);

// ============================================
// Card Content
// ============================================

interface CardContentProps {
  children: React.ReactNode;
  className?: string;
}

export const CardContent: React.FC<CardContentProps> = ({ children, className = '' }) => (
  <div className={className}>{children}</div>
);

// ============================================
// Card Footer
// ============================================

interface CardFooterProps {
  children: React.ReactNode;
  divider?: boolean;
  className?: string;
}

export const CardFooter: React.FC<CardFooterProps> = ({
  children,
  divider = true,
  className = '',
}) => (
  <div
    className={`${
      divider ? 'border-t border-gray-100 dark:border-gray-700 pt-4 mt-4' : ''
    } ${className}`}
  >
    {children}
  </div>
);

// ============================================
// Image Card
// ============================================

interface ImageCardProps {
  image: string;
  title: string;
  subtitle?: string;
  overlay?: boolean;
  aspectRatio?: '16:9' | '4:3' | '1:1' | '3:4';
  onClick?: () => void;
  className?: string;
}

export const ImageCard: React.FC<ImageCardProps> = ({
  image,
  title,
  subtitle,
  overlay = true,
  aspectRatio = '16:9',
  onClick,
  className = '',
}) => {
  const aspects = {
    '16:9': 'aspect-video',
    '4:3': 'aspect-[4/3]',
    '1:1': 'aspect-square',
    '3:4': 'aspect-[3/4]',
  };

  return (
    <div
      className={`relative overflow-hidden rounded-xl ${onClick ? 'cursor-pointer' : ''} ${className}`}
      onClick={() => {
        onClick?.();
        if (onClick) triggerHaptic('light');
      }}
    >
      <div className={aspects[aspectRatio]}>
        <img src={image} alt={title} className="w-full h-full object-cover" />
      </div>

      {overlay && (
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
      )}

      <div className="absolute bottom-0 left-0 right-0 p-4">
        <h3 className="font-semibold text-white">{title}</h3>
        {subtitle && <p className="text-sm text-white/80">{subtitle}</p>}
      </div>
    </div>
  );
};

// ============================================
// Product Card
// ============================================

interface ProductCardProps {
  product: {
    id: string;
    name: string;
    price: number;
    originalPrice?: number;
    image: string;
    rating?: number;
    reviews?: number;
    badge?: string;
    seller?: string;
  };
  variant?: 'default' | 'compact' | 'horizontal';
  onAddToCart?: () => void;
  onFavorite?: () => void;
  isFavorite?: boolean;
  onClick?: () => void;
  className?: string;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  variant = 'default',
  onAddToCart,
  onFavorite,
  isFavorite = false,
  onClick,
  className = '',
}) => {
  const formatPrice = (price: number) =>
    new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(price);

  const discount = product.originalPrice
    ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
    : 0;

  if (variant === 'horizontal') {
    return (
      <Card variant="elevated" padding="sm" onClick={onClick} className={`flex gap-4 ${className}`}>
        <div className="relative w-24 h-24 flex-shrink-0">
          <img
            src={product.image}
            alt={product.name}
            className="w-full h-full object-cover rounded-lg"
          />
          {product.badge && (
            <span className="absolute top-1 left-1 px-2 py-0.5 text-xs font-medium bg-oaxaca-pink text-white rounded-full">
              {product.badge}
            </span>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-gray-900 dark:text-white truncate">{product.name}</h3>
          {product.seller && (
            <p className="text-sm text-gray-500 dark:text-gray-400">{product.seller}</p>
          )}
          <div className="mt-2 flex items-center gap-2">
            <span className="font-bold text-oaxaca-pink">{formatPrice(product.price)}</span>
            {product.originalPrice && (
              <span className="text-sm text-gray-400 line-through">
                {formatPrice(product.originalPrice)}
              </span>
            )}
          </div>
        </div>
      </Card>
    );
  }

  if (variant === 'compact') {
    return (
      <Card variant="elevated" padding="none" onClick={onClick} className={className}>
        <div className="relative aspect-square">
          <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
        </div>
        <div className="p-3">
          <h3 className="text-sm font-medium text-gray-900 dark:text-white truncate">
            {product.name}
          </h3>
          <span className="text-sm font-bold text-oaxaca-pink">{formatPrice(product.price)}</span>
        </div>
      </Card>
    );
  }

  return (
    <Card variant="elevated" padding="none" className={className}>
      <div className="relative">
        <img
          src={product.image}
          alt={product.name}
          className="w-full aspect-square object-cover"
          onClick={onClick}
        />

        {product.badge && (
          <span className="absolute top-3 left-3 px-2 py-1 text-xs font-medium bg-oaxaca-pink text-white rounded-full">
            {product.badge}
          </span>
        )}

        {discount > 0 && (
          <span className="absolute top-3 right-3 px-2 py-1 text-xs font-medium bg-red-500 text-white rounded-full">
            -{discount}%
          </span>
        )}

        {onFavorite && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onFavorite();
              triggerHaptic('impact');
            }}
            className="absolute bottom-3 right-3 p-2 bg-white dark:bg-gray-800 rounded-full shadow-lg"
          >
            <Heart
              size={20}
              className={isFavorite ? 'fill-oaxaca-pink text-oaxaca-pink' : 'text-gray-400'}
            />
          </button>
        )}
      </div>

      <div className="p-4">
        <h3
          className="font-medium text-gray-900 dark:text-white line-clamp-2 cursor-pointer"
          onClick={onClick}
        >
          {product.name}
        </h3>

        {product.seller && (
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{product.seller}</p>
        )}

        {product.rating && (
          <div className="mt-2 flex items-center gap-1">
            <span className="text-amber-500">★</span>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {product.rating}
            </span>
            {product.reviews && (
              <span className="text-sm text-gray-400">({product.reviews})</span>
            )}
          </div>
        )}

        <div className="mt-3 flex items-center justify-between">
          <div>
            <span className="text-lg font-bold text-oaxaca-pink">{formatPrice(product.price)}</span>
            {product.originalPrice && (
              <span className="ml-2 text-sm text-gray-400 line-through">
                {formatPrice(product.originalPrice)}
              </span>
            )}
          </div>

          {onAddToCart && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onAddToCart();
                triggerHaptic('impact');
              }}
              className="p-2 bg-oaxaca-pink text-white rounded-xl hover:bg-oaxaca-pink/90 transition-colors"
            >
              <span className="sr-only">Agregar al carrito</span>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </Card>
  );
};

// ============================================
// Event Card
// ============================================

interface EventCardProps {
  event: {
    id: string;
    title: string;
    date: Date;
    time?: string;
    location?: string;
    image?: string;
    category?: string;
    attending?: number;
  };
  variant?: 'default' | 'compact' | 'featured';
  onSave?: () => void;
  isSaved?: boolean;
  onClick?: () => void;
  className?: string;
}

export const EventCard: React.FC<EventCardProps> = ({
  event,
  variant = 'default',
  onSave,
  isSaved = false,
  onClick,
  className = '',
}) => {
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('es-MX', {
      day: 'numeric',
      month: 'short',
    });
  };

  const formatWeekday = (date: Date) => {
    return date.toLocaleDateString('es-MX', { weekday: 'short' });
  };

  if (variant === 'compact') {
    return (
      <Card
        variant="outlined"
        padding="sm"
        onClick={onClick}
        className={`flex items-center gap-3 ${className}`}
      >
        <div className="flex-shrink-0 w-12 text-center">
          <div className="text-xs text-gray-500 uppercase">{formatWeekday(event.date)}</div>
          <div className="text-lg font-bold text-oaxaca-pink">{event.date.getDate()}</div>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-gray-900 dark:text-white truncate">{event.title}</h3>
          {event.time && (
            <p className="text-sm text-gray-500 dark:text-gray-400">{event.time}</p>
          )}
        </div>
        <ChevronRight size={20} className="text-gray-400" />
      </Card>
    );
  }

  if (variant === 'featured') {
    return (
      <Card variant="elevated" padding="none" className={className}>
        <div className="relative h-48">
          {event.image ? (
            <img src={event.image} alt={event.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-r from-oaxaca-pink to-oaxaca-purple" />
          )}

          <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />

          {event.category && (
            <span className="absolute top-3 left-3 px-2 py-1 text-xs font-medium bg-white/20 backdrop-blur-sm text-white rounded-full">
              {event.category}
            </span>
          )}

          {onSave && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onSave();
                triggerHaptic('impact');
              }}
              className="absolute top-3 right-3 p-2 bg-white/20 backdrop-blur-sm rounded-full"
            >
              <Bookmark
                size={18}
                className={isSaved ? 'fill-white text-white' : 'text-white'}
              />
            </button>
          )}

          <div className="absolute bottom-0 left-0 right-0 p-4">
            <h3 className="text-lg font-bold text-white">{event.title}</h3>
          </div>
        </div>

        <div className="p-4 flex items-center justify-between" onClick={onClick}>
          <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
            <span className="flex items-center gap-1">
              <Calendar size={14} />
              {formatDate(event.date)}
            </span>
            {event.time && (
              <span className="flex items-center gap-1">
                <Clock size={14} />
                {event.time}
              </span>
            )}
          </div>

          {event.attending && (
            <span className="text-sm text-gray-500">
              {event.attending} asistentes
            </span>
          )}
        </div>
      </Card>
    );
  }

  return (
    <Card variant="elevated" padding="md" onClick={onClick} className={className}>
      <div className="flex gap-4">
        <div className="flex-shrink-0 w-14 text-center">
          <div className="text-xs text-gray-500 uppercase">{formatWeekday(event.date)}</div>
          <div className="text-2xl font-bold text-oaxaca-pink">{event.date.getDate()}</div>
          <div className="text-xs text-gray-500">{formatDate(event.date).split(' ')[1]}</div>
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 dark:text-white">{event.title}</h3>

          {event.time && (
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
              <Clock size={14} />
              {event.time}
            </p>
          )}

          {event.location && (
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
              <MapPin size={14} />
              {event.location}
            </p>
          )}
        </div>

        {onSave && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onSave();
              triggerHaptic('impact');
            }}
            className="flex-shrink-0"
          >
            <Bookmark
              size={20}
              className={isSaved ? 'fill-oaxaca-pink text-oaxaca-pink' : 'text-gray-400'}
            />
          </button>
        )}
      </div>
    </Card>
  );
};

// ============================================
// Action Card
// ============================================

interface ActionCardProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}

export const ActionCard: React.FC<ActionCardProps> = ({
  title,
  description,
  icon,
  onClick,
  disabled = false,
  className = '',
}) => (
  <Card
    variant="outlined"
    padding="md"
    hoverable={!disabled}
    onClick={disabled ? undefined : onClick}
    className={`${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
  >
    <div className="flex items-center gap-4">
      {icon && (
        <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-oaxaca-pink/10 flex items-center justify-center text-oaxaca-pink">
          {icon}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <h3 className="font-medium text-gray-900 dark:text-white">{title}</h3>
        {description && (
          <p className="text-sm text-gray-500 dark:text-gray-400">{description}</p>
        )}
      </div>
      <ChevronRight size={20} className="text-gray-400" />
    </div>
  </Card>
);

// ============================================
// Stat Card
// ============================================

interface StatCardProps {
  title: string;
  value: string | number;
  change?: { value: number; type: 'increase' | 'decrease' };
  icon?: React.ReactNode;
  className?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  change,
  icon,
  className = '',
}) => (
  <Card variant="elevated" padding="md" className={className}>
    <div className="flex items-start justify-between">
      <div>
        <p className="text-sm text-gray-500 dark:text-gray-400">{title}</p>
        <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">
          {typeof value === 'number' ? value.toLocaleString('es-MX') : value}
        </p>
        {change && (
          <p
            className={`mt-1 text-sm font-medium ${
              change.type === 'increase' ? 'text-green-500' : 'text-red-500'
            }`}
          >
            {change.type === 'increase' ? '↑' : '↓'} {Math.abs(change.value)}%
          </p>
        )}
      </div>
      {icon && (
        <div className="p-3 bg-oaxaca-pink/10 rounded-xl text-oaxaca-pink">{icon}</div>
      )}
    </div>
  </Card>
);

export default Card;
