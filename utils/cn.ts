/**
 * Utility for merging Tailwind CSS classes
 *
 * This is a lightweight alternative to clsx + tailwind-merge
 * that handles common class merging scenarios.
 */

type ClassValue = string | undefined | null | false | 0 | ClassValue[];

/**
 * Merge class names, filtering out falsy values
 *
 * @example
 * cn('base-class', condition && 'conditional-class', className)
 * cn(['class1', 'class2'], 'class3')
 */
export function cn(...inputs: (string | undefined | null | false | 0 | string[])[]): string {
  const result: string[] = [];

  for (const input of inputs) {
    if (!input) continue;

    if (typeof input === 'string') {
      result.push(input);
    } else if (Array.isArray(input)) {
      for (const item of input) {
        if (typeof item === 'string' && item.length > 0) {
          result.push(item);
        }
      }
    }
  }

  return result.join(' ').replace(/\s+/g, ' ').trim();
}

/**
 * Create a variant-based class builder
 *
 * @example
 * const buttonStyles = cva('base-btn', {
 *   variants: {
 *     size: { sm: 'text-sm', lg: 'text-lg' },
 *     color: { primary: 'bg-blue-500', danger: 'bg-red-500' }
 *   },
 *   defaultVariants: { size: 'sm', color: 'primary' }
 * });
 *
 * buttonStyles({ size: 'lg' }) // => 'base-btn text-lg bg-blue-500'
 */
export function cva<T extends Record<string, Record<string, string>>>(
  base: string,
  config: {
    variants: T;
    defaultVariants?: Partial<{ [K in keyof T]: keyof T[K] }>;
    compoundVariants?: Array<
      Partial<{ [K in keyof T]: keyof T[K] }> & { class: string }
    >;
  }
) {
  return (props?: Partial<{ [K in keyof T]: keyof T[K] }>) => {
    const { variants, defaultVariants = {}, compoundVariants = [] } = config;
    const mergedProps = { ...defaultVariants, ...props };

    const variantClasses = Object.entries(mergedProps)
      .map(([key, value]) => {
        const variant = variants[key as keyof T];
        return variant?.[value as keyof typeof variant];
      })
      .filter(Boolean);

    // Check compound variants
    const compoundClasses = compoundVariants
      .filter((compound) => {
        return Object.entries(compound)
          .filter(([key]) => key !== 'class')
          .every(([key, value]) => mergedProps[key as keyof T] === value);
      })
      .map((compound) => compound.class);

    return cn(base, ...variantClasses, ...compoundClasses);
  };
}

/**
 * Focus ring utility classes for accessibility (WCAG AA compliant)
 */
export const focusRing = cn(
  'focus:outline-none',
  'focus-visible:ring-2',
  'focus-visible:ring-oaxaca-pink',
  'focus-visible:ring-offset-2',
  'dark:focus-visible:ring-offset-gray-900'
);

/**
 * Focus ring for dark backgrounds
 */
export const focusRingLight = cn(
  'focus:outline-none',
  'focus-visible:ring-2',
  'focus-visible:ring-white',
  'focus-visible:ring-offset-2',
  'focus-visible:ring-offset-oaxaca-purple'
);

/**
 * Minimum touch target size (44x44px) for WCAG 2.1 SC 2.5.5
 */
export const touchTarget = 'min-w-[44px] min-h-[44px]';

/**
 * Interactive element base styles
 */
export const interactive = cn(
  'cursor-pointer',
  'transition-all duration-200',
  'active:scale-[0.98]',
  focusRing
);

/**
 * Common transition classes
 */
export const transitions = {
  fast: 'transition-all duration-150 ease-out',
  normal: 'transition-all duration-200 ease-out',
  slow: 'transition-all duration-300 ease-out',
  colors: 'transition-colors duration-200',
  transform: 'transition-transform duration-200',
  opacity: 'transition-opacity duration-200',
} as const;

/**
 * Common shadow classes with dark mode support
 */
export const shadows = {
  sm: 'shadow-sm',
  md: 'shadow-md',
  lg: 'shadow-lg',
  xl: 'shadow-xl',
  card: 'shadow-card dark:shadow-none',
  cardHover: 'shadow-card-hover dark:shadow-none',
} as const;

/**
 * Responsive spacing utilities based on the design scale
 * Scale: 4, 8, 12, 16, 24, 32, 48, 64
 */
export const spacing = {
  xs: 'gap-1',      // 4px
  sm: 'gap-2',      // 8px
  md: 'gap-4',      // 16px
  lg: 'gap-6',      // 24px
  xl: 'gap-8',      // 32px
  '2xl': 'gap-12',  // 48px
} as const;

/**
 * Responsive container classes
 */
export const container = cn(
  'w-full',
  'px-4 sm:px-6 lg:px-8',
  'mx-auto',
  'max-w-7xl'
);

/**
 * Card base styles with dark mode support
 */
export const cardBase = cn(
  'bg-white dark:bg-gray-800',
  'rounded-xl',
  'border border-gray-200 dark:border-gray-700',
  'transition-shadow duration-200'
);

/**
 * Card with hover effect
 */
export const cardInteractive = cn(
  cardBase,
  'hover:shadow-lg hover:-translate-y-0.5',
  'cursor-pointer',
  focusRing
);

/**
 * Input base styles
 */
export const inputBase = cn(
  'w-full',
  'px-4 py-3',
  'bg-white dark:bg-gray-800',
  'border border-gray-200 dark:border-gray-600',
  'rounded-xl',
  'text-gray-900 dark:text-white',
  'placeholder-gray-400 dark:placeholder-gray-500',
  'focus:ring-2 focus:ring-oaxaca-pink focus:border-transparent',
  'transition-all duration-200',
  'min-h-[44px]'
);

/**
 * Button base styles
 */
export const buttonBase = cn(
  'inline-flex items-center justify-center',
  'font-medium',
  'rounded-xl',
  'transition-all duration-200',
  'min-h-[44px]',
  focusRing,
  'disabled:opacity-50 disabled:cursor-not-allowed',
  'active:scale-[0.98]'
);

export default cn;
