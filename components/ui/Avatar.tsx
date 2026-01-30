import React, { useState, useCallback } from 'react';
import { Camera, User, Check, Plus, X } from 'lucide-react';
import { triggerHaptic } from '../../utils/haptics';

// ============================================
// Types
// ============================================

type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
type AvatarStatus = 'online' | 'offline' | 'busy' | 'away';
type AvatarShape = 'circle' | 'square' | 'rounded';

// ============================================
// Avatar Component
// ============================================

interface AvatarProps {
  src?: string;
  alt?: string;
  fallback?: string;
  size?: AvatarSize;
  shape?: AvatarShape;
  status?: AvatarStatus;
  badge?: React.ReactNode;
  ring?: boolean;
  ringColor?: string;
  onClick?: () => void;
  className?: string;
}

/**
 * Avatar - Componente de avatar de usuario
 *
 * Features:
 * - Múltiples tamaños
 * - Indicadores de estado
 * - Fallback con iniciales
 * - Bordes y badges
 *
 * Usage:
 * <Avatar src="/user.jpg" alt="Juan" size="lg" status="online" />
 * <Avatar fallback="JD" size="md" />
 */
const Avatar: React.FC<AvatarProps> = ({
  src,
  alt = '',
  fallback,
  size = 'md',
  shape = 'circle',
  status,
  badge,
  ring = false,
  ringColor = 'ring-oaxaca-pink',
  onClick,
  className = '',
}) => {
  const [imageError, setImageError] = useState(false);

  const sizes: Record<AvatarSize, { container: string; text: string; status: string }> = {
    xs: { container: 'w-6 h-6', text: 'text-xs', status: 'w-2 h-2 border' },
    sm: { container: 'w-8 h-8', text: 'text-xs', status: 'w-2.5 h-2.5 border' },
    md: { container: 'w-10 h-10', text: 'text-sm', status: 'w-3 h-3 border-2' },
    lg: { container: 'w-12 h-12', text: 'text-base', status: 'w-3.5 h-3.5 border-2' },
    xl: { container: 'w-16 h-16', text: 'text-lg', status: 'w-4 h-4 border-2' },
    '2xl': { container: 'w-24 h-24', text: 'text-2xl', status: 'w-5 h-5 border-2' },
  };

  const shapes: Record<AvatarShape, string> = {
    circle: 'rounded-full',
    square: 'rounded-none',
    rounded: 'rounded-xl',
  };

  const statusColors: Record<AvatarStatus, string> = {
    online: 'bg-green-500',
    offline: 'bg-gray-400',
    busy: 'bg-red-500',
    away: 'bg-oaxaca-yellow',
  };

  const sizeConfig = sizes[size];
  const initials = fallback || alt?.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();

  const handleClick = () => {
    if (onClick) {
      onClick();
      triggerHaptic('light');
    }
  };

  return (
    <div
      className={`relative inline-flex ${onClick ? 'cursor-pointer' : ''} ${className}`}
      onClick={handleClick}
    >
      <div
        className={`${sizeConfig.container} ${shapes[shape]} overflow-hidden flex items-center justify-center ${
          ring ? `ring-2 ring-offset-2 ${ringColor}` : ''
        } ${
          src && !imageError
            ? ''
            : 'bg-gradient-to-br from-oaxaca-pink to-oaxaca-purple text-white'
        }`}
      >
        {src && !imageError ? (
          <img
            src={src}
            alt={alt}
            className="w-full h-full object-cover"
            onError={() => setImageError(true)}
          />
        ) : initials ? (
          <span className={`font-semibold ${sizeConfig.text}`}>{initials}</span>
        ) : (
          <User className="w-1/2 h-1/2 text-white/80" />
        )}
      </div>

      {status && (
        <span
          className={`absolute bottom-0 right-0 ${shapes[shape]} border-white dark:border-gray-900 ${statusColors[status]} ${sizeConfig.status}`}
        />
      )}

      {badge && (
        <span className="absolute -top-1 -right-1">{badge}</span>
      )}
    </div>
  );
};

// ============================================
// Avatar Group
// ============================================

interface AvatarGroupProps {
  avatars: { src?: string; alt?: string; fallback?: string }[];
  max?: number;
  size?: AvatarSize;
  showCount?: boolean;
  onClick?: () => void;
  className?: string;
}

export const AvatarGroup: React.FC<AvatarGroupProps> = ({
  avatars,
  max = 4,
  size = 'md',
  showCount = true,
  onClick,
  className = '',
}) => {
  const visibleAvatars = avatars.slice(0, max);
  const remaining = avatars.length - max;

  const overlaps: Record<AvatarSize, string> = {
    xs: '-ml-2',
    sm: '-ml-2',
    md: '-ml-3',
    lg: '-ml-4',
    xl: '-ml-5',
    '2xl': '-ml-6',
  };

  const sizes: Record<AvatarSize, string> = {
    xs: 'w-6 h-6 text-[10px]',
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base',
    xl: 'w-16 h-16 text-lg',
    '2xl': 'w-24 h-24 text-xl',
  };

  return (
    <div className={`flex items-center ${className}`} onClick={onClick}>
      {visibleAvatars.map((avatar, index) => (
        <div key={index} className={index > 0 ? overlaps[size] : ''}>
          <Avatar
            src={avatar.src}
            alt={avatar.alt}
            fallback={avatar.fallback}
            size={size}
            ring
            ringColor="ring-white dark:ring-gray-900"
          />
        </div>
      ))}

      {showCount && remaining > 0 && (
        <div
          className={`${overlaps[size]} ${sizes[size]} rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center font-medium text-gray-600 dark:text-gray-300 ring-2 ring-white dark:ring-gray-900`}
        >
          +{remaining}
        </div>
      )}
    </div>
  );
};

// ============================================
// Editable Avatar
// ============================================

interface EditableAvatarProps {
  src?: string;
  alt?: string;
  fallback?: string;
  size?: AvatarSize;
  onChange?: (file: File) => void;
  loading?: boolean;
  className?: string;
}

export const EditableAvatar: React.FC<EditableAvatarProps> = ({
  src,
  alt,
  fallback,
  size = 'xl',
  onChange,
  loading = false,
  className = '',
}) => {
  const inputRef = React.useRef<HTMLInputElement>(null);

  const handleClick = () => {
    inputRef.current?.click();
    triggerHaptic('light');
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onChange) {
      onChange(file);
    }
  };

  return (
    <div className={`relative inline-flex ${className}`}>
      <Avatar src={src} alt={alt} fallback={fallback} size={size} />

      <button
        onClick={handleClick}
        disabled={loading}
        className="absolute bottom-0 right-0 p-2 bg-oaxaca-pink text-white rounded-full shadow-lg hover:bg-oaxaca-pink/90 transition-colors disabled:opacity-50"
      >
        {loading ? (
          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        ) : (
          <Camera size={16} />
        )}
      </button>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleChange}
        className="hidden"
      />
    </div>
  );
};

// ============================================
// User Card
// ============================================

interface UserCardProps {
  user: {
    name: string;
    avatar?: string;
    subtitle?: string;
    verified?: boolean;
  };
  size?: 'sm' | 'md' | 'lg';
  action?: React.ReactNode;
  onClick?: () => void;
  className?: string;
}

export const UserCard: React.FC<UserCardProps> = ({
  user,
  size = 'md',
  action,
  onClick,
  className = '',
}) => {
  const sizeConfigs = {
    sm: { avatar: 'sm' as AvatarSize, name: 'text-sm', subtitle: 'text-xs' },
    md: { avatar: 'md' as AvatarSize, name: 'text-base', subtitle: 'text-sm' },
    lg: { avatar: 'lg' as AvatarSize, name: 'text-lg', subtitle: 'text-base' },
  };

  const config = sizeConfigs[size];

  return (
    <div
      className={`flex items-center gap-3 ${onClick ? 'cursor-pointer' : ''} ${className}`}
      onClick={onClick}
    >
      <Avatar
        src={user.avatar}
        alt={user.name}
        size={config.avatar}
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1">
          <span className={`font-medium text-gray-900 dark:text-white truncate ${config.name}`}>
            {user.name}
          </span>
          {user.verified && (
            <Check size={14} className="flex-shrink-0 text-oaxaca-sky" />
          )}
        </div>
        {user.subtitle && (
          <p className={`text-gray-500 dark:text-gray-400 truncate ${config.subtitle}`}>
            {user.subtitle}
          </p>
        )}
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  );
};

// ============================================
// User List Item
// ============================================

interface UserListItemProps {
  user: {
    id: string;
    name: string;
    avatar?: string;
    subtitle?: string;
    status?: AvatarStatus;
    verified?: boolean;
  };
  selected?: boolean;
  selectable?: boolean;
  action?: 'follow' | 'add' | 'remove' | 'custom';
  customAction?: React.ReactNode;
  onSelect?: () => void;
  onAction?: () => void;
  className?: string;
}

export const UserListItem: React.FC<UserListItemProps> = ({
  user,
  selected = false,
  selectable = false,
  action,
  customAction,
  onSelect,
  onAction,
  className = '',
}) => {
  const handleClick = () => {
    if (selectable && onSelect) {
      onSelect();
      triggerHaptic('selection');
    }
  };

  const renderAction = () => {
    if (customAction) return customAction;

    if (action === 'follow') {
      return (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onAction?.();
            triggerHaptic('impact');
          }}
          className="px-3 py-1.5 bg-oaxaca-pink text-white text-sm font-medium rounded-lg hover:bg-oaxaca-pink/90 transition-colors"
        >
          Seguir
        </button>
      );
    }

    if (action === 'add') {
      return (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onAction?.();
            triggerHaptic('impact');
          }}
          className="p-2 text-oaxaca-pink hover:bg-oaxaca-pink/10 rounded-lg transition-colors"
        >
          <Plus size={20} />
        </button>
      );
    }

    if (action === 'remove') {
      return (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onAction?.();
            triggerHaptic('impact');
          }}
          className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
        >
          <X size={20} />
        </button>
      );
    }

    return null;
  };

  return (
    <div
      className={`flex items-center gap-3 p-3 rounded-xl transition-colors ${
        selectable ? 'cursor-pointer' : ''
      } ${
        selected
          ? 'bg-oaxaca-pink/10'
          : 'hover:bg-gray-50 dark:hover:bg-gray-800'
      } ${className}`}
      onClick={handleClick}
    >
      {selectable && (
        <div
          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
            selected
              ? 'bg-oaxaca-pink border-oaxaca-pink'
              : 'border-gray-300 dark:border-gray-600'
          }`}
        >
          {selected && <Check size={12} className="text-white" />}
        </div>
      )}

      <Avatar
        src={user.avatar}
        alt={user.name}
        size="md"
        status={user.status}
      />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1">
          <span className="font-medium text-gray-900 dark:text-white truncate">
            {user.name}
          </span>
          {user.verified && (
            <Check size={14} className="flex-shrink-0 text-oaxaca-sky" />
          )}
        </div>
        {user.subtitle && (
          <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
            {user.subtitle}
          </p>
        )}
      </div>

      {renderAction()}
    </div>
  );
};

// ============================================
// Profile Header
// ============================================

interface ProfileHeaderProps {
  user: {
    name: string;
    username?: string;
    avatar?: string;
    coverImage?: string;
    bio?: string;
    verified?: boolean;
  };
  stats?: { label: string; value: number | string }[];
  action?: React.ReactNode;
  isOwn?: boolean;
  onEditProfile?: () => void;
  onEditCover?: () => void;
  className?: string;
}

export const ProfileHeader: React.FC<ProfileHeaderProps> = ({
  user,
  stats,
  action,
  isOwn = false,
  onEditProfile,
  onEditCover,
  className = '',
}) => {
  return (
    <div className={className}>
      {/* Cover Image */}
      <div className="relative h-32 md:h-48 bg-gradient-to-r from-oaxaca-pink to-oaxaca-purple">
        {user.coverImage && (
          <img
            src={user.coverImage}
            alt="Cover"
            className="w-full h-full object-cover"
          />
        )}
        {isOwn && onEditCover && (
          <button
            onClick={onEditCover}
            className="absolute top-4 right-4 p-2 bg-black/30 text-white rounded-lg hover:bg-black/50 transition-colors"
          >
            <Camera size={16} />
          </button>
        )}
      </div>

      {/* Profile Info */}
      <div className="px-4 pb-4">
        <div className="relative -mt-12 mb-4">
          <Avatar
            src={user.avatar}
            alt={user.name}
            size="2xl"
            ring
            ringColor="ring-white dark:ring-gray-900"
          />
          {isOwn && onEditProfile && (
            <button
              onClick={onEditProfile}
              className="absolute bottom-0 right-0 p-2 bg-oaxaca-pink text-white rounded-full shadow-lg"
            >
              <Camera size={16} />
            </button>
          )}
        </div>

        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                {user.name}
              </h1>
              {user.verified && (
                <Check size={18} className="text-oaxaca-sky" />
              )}
            </div>
            {user.username && (
              <p className="text-gray-500 dark:text-gray-400">@{user.username}</p>
            )}
            {user.bio && (
              <p className="mt-2 text-gray-700 dark:text-gray-300">{user.bio}</p>
            )}
          </div>
          {action}
        </div>

        {/* Stats */}
        {stats && stats.length > 0 && (
          <div className="flex gap-6 mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-lg font-bold text-gray-900 dark:text-white">
                  {typeof stat.value === 'number' ? stat.value.toLocaleString('es-MX') : stat.value}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================
// useAvatar Hook
// ============================================

export const useAvatar = (initialSrc?: string) => {
  const [src, setSrc] = useState(initialSrc);
  const [loading, setLoading] = useState(false);

  const upload = useCallback(async (file: File, uploadFn: (file: File) => Promise<string>) => {
    setLoading(true);
    try {
      const url = await uploadFn(file);
      setSrc(url);
      return url;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    src,
    setSrc,
    loading,
    upload,
    avatarProps: {
      src,
      loading,
    },
  };
};

export default Avatar;
