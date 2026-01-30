import React from 'react';
import {
  Music,
  Flower2,
  Theater,
  UtensilsCrossed,
  Palette,
  Camera,
  Mountain,
  ShoppingBag,
  Sparkles,
  Users,
  MapPin,
  Star,
  type LucideIcon,
} from 'lucide-react';

export type PlaceholderVariant =
  | 'dancers'
  | 'pineapple'
  | 'stage'
  | 'food'
  | 'crafts'
  | 'mezcal'
  | 'nature'
  | 'music'
  | 'shop'
  | 'community'
  | 'event'
  | 'default';

interface GradientPlaceholderProps {
  variant?: PlaceholderVariant;
  className?: string;
  alt?: string;
  iconSize?: number;
}

const VARIANT_CONFIG: Record<PlaceholderVariant, {
  gradient: string;
  icon: LucideIcon;
  label: string;
}> = {
  dancers: {
    gradient: 'from-oaxaca-pink via-oaxaca-purple to-oaxaca-pink',
    icon: Theater,
    label: 'Danza',
  },
  pineapple: {
    gradient: 'from-oaxaca-yellow via-oaxaca-pink to-oaxaca-purple',
    icon: Flower2,
    label: 'Flor de Piña',
  },
  stage: {
    gradient: 'from-oaxaca-purple via-oaxaca-sky to-oaxaca-purple',
    icon: Sparkles,
    label: 'Escenario',
  },
  food: {
    gradient: 'from-oaxaca-yellow via-oaxaca-earth to-oaxaca-yellow',
    icon: UtensilsCrossed,
    label: 'Gastronomía',
  },
  crafts: {
    gradient: 'from-oaxaca-earth via-oaxaca-purple to-oaxaca-pink',
    icon: Palette,
    label: 'Artesanías',
  },
  mezcal: {
    gradient: 'from-oaxaca-earth via-oaxaca-yellow to-oaxaca-earth',
    icon: Star,
    label: 'Mezcal',
  },
  nature: {
    gradient: 'from-emerald-600 via-oaxaca-sky to-emerald-600',
    icon: Mountain,
    label: 'Naturaleza',
  },
  music: {
    gradient: 'from-oaxaca-pink via-oaxaca-purple to-oaxaca-sky',
    icon: Music,
    label: 'Música',
  },
  shop: {
    gradient: 'from-oaxaca-yellow via-oaxaca-pink to-oaxaca-purple',
    icon: ShoppingBag,
    label: 'Tienda',
  },
  community: {
    gradient: 'from-oaxaca-sky via-oaxaca-purple to-oaxaca-pink',
    icon: Users,
    label: 'Comunidad',
  },
  event: {
    gradient: 'from-oaxaca-pink via-oaxaca-yellow to-oaxaca-purple',
    icon: MapPin,
    label: 'Evento',
  },
  default: {
    gradient: 'from-oaxaca-purple via-oaxaca-pink to-oaxaca-yellow',
    icon: Sparkles,
    label: 'Guelaguetza',
  },
};

const GradientPlaceholder: React.FC<GradientPlaceholderProps> = ({
  variant = 'default',
  className = '',
  alt,
  iconSize = 48,
}) => {
  const config = VARIANT_CONFIG[variant];
  const Icon = config.icon;

  return (
    <div
      className={`bg-gradient-to-br ${config.gradient} flex items-center justify-center relative overflow-hidden ${className}`}
      role="img"
      aria-label={alt || config.label}
    >
      {/* Decorative circles */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute -top-8 -right-8 w-32 h-32 bg-white rounded-full" />
        <div className="absolute -bottom-8 -left-8 w-24 h-24 bg-white rounded-full" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 bg-white rounded-full" />
      </div>
      <Icon size={iconSize} className="text-white/80 relative z-10" />
    </div>
  );
};

/**
 * Maps event category strings to placeholder variants
 */
export function categoryToVariant(category: string): PlaceholderVariant {
  const map: Record<string, PlaceholderVariant> = {
    DANZA: 'dancers',
    MUSICA: 'music',
    GASTRONOMIA: 'food',
    ARTESANIA: 'crafts',
    CEREMONIA: 'stage',
    DESFILE: 'dancers',
    OTRO: 'default',
  };
  return map[category] || 'default';
}

export default GradientPlaceholder;
