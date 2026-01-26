import { useState, useEffect, useRef, ImgHTMLAttributes } from 'react';

interface LazyImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  src: string;
  alt: string;
  placeholderSrc?: string;
  fallbackSrc?: string;
  threshold?: number;
  rootMargin?: string;
  onLoad?: () => void;
  onError?: () => void;
  className?: string;
  wrapperClassName?: string;
  blur?: boolean;
}

export function LazyImage({
  src,
  alt,
  placeholderSrc = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"%3E%3Crect fill="%23f0f0f0" width="400" height="300"/%3E%3Ctext fill="%23999" x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle"%3ECargando...%3C/text%3E%3C/svg%3E',
  fallbackSrc = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"%3E%3Crect fill="%23f0f0f0" width="400" height="300"/%3E%3Ctext fill="%23999" x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle"%3EError al cargar%3C/text%3E%3C/svg%3E',
  threshold = 0.1,
  rootMargin = '50px',
  onLoad,
  onError,
  className = '',
  wrapperClassName = '',
  blur = true,
  ...props
}: LazyImageProps) {
  const [imageSrc, setImageSrc] = useState(placeholderSrc);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    if (!imgRef.current) return;

    // Verificar si el navegador soporta IntersectionObserver
    if (!('IntersectionObserver' in window)) {
      // Fallback: cargar imagen inmediatamente
      setImageSrc(src);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            // La imagen está visible, cargarla
            const img = new Image();
            img.src = src;

            img.onload = () => {
              setImageSrc(src);
              setIsLoading(false);
              onLoad?.();
            };

            img.onerror = () => {
              setImageSrc(fallbackSrc);
              setIsLoading(false);
              setHasError(true);
              onError?.();
            };

            // Dejar de observar después de cargar
            if (imgRef.current) {
              observer.unobserve(imgRef.current);
            }
          }
        });
      },
      {
        threshold,
        rootMargin,
      }
    );

    observer.observe(imgRef.current);

    return () => {
      if (imgRef.current) {
        observer.unobserve(imgRef.current);
      }
    };
  }, [src, threshold, rootMargin, onLoad, onError, fallbackSrc]);

  return (
    <div className={`relative overflow-hidden ${wrapperClassName}`}>
      <img
        ref={imgRef}
        src={imageSrc}
        alt={alt}
        className={`
          ${className}
          ${isLoading && blur ? 'blur-sm scale-105' : 'blur-0 scale-100'}
          ${isLoading ? 'opacity-50' : 'opacity-100'}
          transition-all duration-500 ease-in-out
        `}
        loading="lazy"
        {...props}
      />

      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-800">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      )}

      {hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-red-50 dark:bg-red-900/20">
          <div className="text-center text-red-600 dark:text-red-400 p-4">
            <svg
              className="w-12 h-12 mx-auto mb-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <p className="text-sm">Error al cargar imagen</p>
          </div>
        </div>
      )}
    </div>
  );
}

// Componente optimizado para avatares
export function LazyAvatar({
  src,
  alt,
  size = 'md',
  ...props
}: Omit<LazyImageProps, 'className' | 'wrapperClassName'> & {
  size?: 'sm' | 'md' | 'lg' | 'xl';
}) {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
    xl: 'w-24 h-24',
  };

  const placeholderSrc = `data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"%3E%3Ccircle fill="%23f0f0f0" cx="50" cy="50" r="50"/%3E%3Ctext fill="%23999" x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" font-size="40"%3E${alt.charAt(0).toUpperCase()}%3C/text%3E%3C/svg%3E`;

  return (
    <LazyImage
      src={src}
      alt={alt}
      placeholderSrc={placeholderSrc}
      className={`${sizeClasses[size]} rounded-full object-cover`}
      wrapperClassName={sizeClasses[size]}
      {...props}
    />
  );
}

// Componente para imágenes de producto con aspect ratio
export function LazyProductImage({
  src,
  alt,
  aspectRatio = '4/3',
  ...props
}: Omit<LazyImageProps, 'className' | 'wrapperClassName'> & {
  aspectRatio?: '1/1' | '4/3' | '16/9' | '3/4';
}) {
  return (
    <LazyImage
      src={src}
      alt={alt}
      className="w-full h-full object-cover"
      wrapperClassName={`w-full aspect-[${aspectRatio}]`}
      {...props}
    />
  );
}

// Componente para banners/heros
export function LazyHeroImage({
  src,
  alt,
  overlay = false,
  overlayOpacity = 0.5,
  children,
  ...props
}: Omit<LazyImageProps, 'className' | 'wrapperClassName'> & {
  overlay?: boolean;
  overlayOpacity?: number;
  children?: React.ReactNode;
}) {
  return (
    <div className="relative w-full h-64 md:h-96 lg:h-[500px]">
      <LazyImage
        src={src}
        alt={alt}
        className="w-full h-full object-cover"
        wrapperClassName="absolute inset-0"
        {...props}
      />
      {overlay && (
        <div
          className="absolute inset-0 bg-black"
          style={{ opacity: overlayOpacity }}
        />
      )}
      {children && (
        <div className="absolute inset-0 flex items-center justify-center z-10">
          {children}
        </div>
      )}
    </div>
  );
}

// Componente para grids de imágenes con skeleton
export function LazyImageGrid({
  images,
  columns = 3,
  gap = 4,
  aspectRatio = '1/1',
}: {
  images: Array<{ src: string; alt: string; id: string }>;
  columns?: number;
  gap?: number;
  aspectRatio?: '1/1' | '4/3' | '16/9';
}) {
  return (
    <div
      className={`grid gap-${gap}`}
      style={{
        gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
      }}
    >
      {images.map((image) => (
        <LazyProductImage
          key={image.id}
          src={image.src}
          alt={image.alt}
          aspectRatio={aspectRatio}
        />
      ))}
    </div>
  );
}
