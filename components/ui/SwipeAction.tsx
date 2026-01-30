import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Trash2, Archive, Star, Edit, MoreHorizontal } from 'lucide-react';

export interface SwipeActionConfig {
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  label?: string;
  onClick: () => void;
}

interface SwipeActionProps {
  children: React.ReactNode;
  leftActions?: SwipeActionConfig[];
  rightActions?: SwipeActionConfig[];
  threshold?: number;
  disabled?: boolean;
  onSwipeStart?: () => void;
  onSwipeEnd?: () => void;
  className?: string;
}

// Haptic feedback utility
const triggerHaptic = (type: 'light' | 'medium' | 'heavy' = 'light') => {
  if ('vibrate' in navigator) {
    const patterns = { light: 10, medium: 20, heavy: 30 };
    navigator.vibrate(patterns[type]);
  }
};

/**
 * SwipeAction - Component for swipe-to-reveal actions (like iOS)
 *
 * Usage:
 * <SwipeAction
 *   leftActions={[{ icon: <Star />, color: 'white', bgColor: 'bg-yellow-500', onClick: () => {} }]}
 *   rightActions={[{ icon: <Trash2 />, color: 'white', bgColor: 'bg-red-500', onClick: () => {} }]}
 * >
 *   <YourContent />
 * </SwipeAction>
 */
const SwipeAction: React.FC<SwipeActionProps> = ({
  children,
  leftActions = [],
  rightActions = [],
  threshold = 80,
  disabled = false,
  onSwipeStart,
  onSwipeEnd,
  className = '',
}) => {
  const [translateX, setTranslateX] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const [isRevealed, setIsRevealed] = useState<'left' | 'right' | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const startX = useRef(0);
  const startY = useRef(0);
  const currentX = useRef(0);
  const isHorizontalSwipe = useRef<boolean | null>(null);

  const maxLeftSwipe = leftActions.length * 70;
  const maxRightSwipe = rightActions.length * 70;

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (disabled) return;
    startX.current = e.touches[0].clientX;
    startY.current = e.touches[0].clientY;
    currentX.current = startX.current;
    isHorizontalSwipe.current = null;
  }, [disabled]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (disabled) return;

    const touchX = e.touches[0].clientX;
    const touchY = e.touches[0].clientY;
    const deltaX = touchX - startX.current;
    const deltaY = touchY - startY.current;

    // Determine swipe direction on first significant movement
    if (isHorizontalSwipe.current === null) {
      if (Math.abs(deltaX) > 10 || Math.abs(deltaY) > 10) {
        isHorizontalSwipe.current = Math.abs(deltaX) > Math.abs(deltaY);
        if (isHorizontalSwipe.current) {
          setIsSwiping(true);
          onSwipeStart?.();
        }
      }
    }

    if (!isHorizontalSwipe.current) return;

    currentX.current = touchX;

    // Calculate new position with resistance
    let newTranslateX = deltaX;

    // Apply resistance at edges
    if (newTranslateX > 0 && leftActions.length === 0) {
      newTranslateX = newTranslateX * 0.2;
    } else if (newTranslateX < 0 && rightActions.length === 0) {
      newTranslateX = newTranslateX * 0.2;
    } else if (newTranslateX > maxLeftSwipe) {
      newTranslateX = maxLeftSwipe + (newTranslateX - maxLeftSwipe) * 0.2;
    } else if (newTranslateX < -maxRightSwipe) {
      newTranslateX = -maxRightSwipe + (newTranslateX + maxRightSwipe) * 0.2;
    }

    setTranslateX(newTranslateX);

    // Haptic feedback when crossing threshold
    if (Math.abs(deltaX) >= threshold && Math.abs(translateX) < threshold) {
      triggerHaptic('light');
    }
  }, [disabled, leftActions.length, rightActions.length, maxLeftSwipe, maxRightSwipe, threshold, translateX, onSwipeStart]);

  const handleTouchEnd = useCallback(() => {
    if (!isSwiping) return;

    setIsSwiping(false);
    onSwipeEnd?.();

    const shouldRevealLeft = translateX > threshold && leftActions.length > 0;
    const shouldRevealRight = translateX < -threshold && rightActions.length > 0;

    if (shouldRevealLeft) {
      setTranslateX(maxLeftSwipe);
      setIsRevealed('left');
      triggerHaptic('medium');
    } else if (shouldRevealRight) {
      setTranslateX(-maxRightSwipe);
      setIsRevealed('right');
      triggerHaptic('medium');
    } else {
      setTranslateX(0);
      setIsRevealed(null);
    }
  }, [isSwiping, translateX, threshold, leftActions.length, rightActions.length, maxLeftSwipe, maxRightSwipe, onSwipeEnd]);

  // Close on click outside or on action click
  const handleActionClick = useCallback((action: SwipeActionConfig) => {
    triggerHaptic('light');
    action.onClick();
    setTranslateX(0);
    setIsRevealed(null);
  }, []);

  const closeActions = useCallback(() => {
    setTranslateX(0);
    setIsRevealed(null);
  }, []);

  // Close when clicking the main content if revealed
  const handleContentClick = useCallback(() => {
    if (isRevealed) {
      closeActions();
    }
  }, [isRevealed, closeActions]);

  // Close on escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isRevealed) {
        closeActions();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isRevealed, closeActions]);

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden ${className}`}
    >
      {/* Left Actions */}
      {leftActions.length > 0 && (
        <div className="absolute left-0 top-0 bottom-0 flex">
          {leftActions.map((action, index) => (
            <button
              key={index}
              onClick={() => handleActionClick(action)}
              className={`flex items-center justify-center w-[70px] ${action.bgColor} transition-transform`}
              style={{
                transform: `translateX(${Math.min(0, translateX - maxLeftSwipe)}px)`,
              }}
              aria-label={action.label}
            >
              <div className="flex flex-col items-center gap-1">
                <span style={{ color: action.color }}>{action.icon}</span>
                {action.label && (
                  <span className="text-xs font-medium" style={{ color: action.color }}>
                    {action.label}
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Right Actions */}
      {rightActions.length > 0 && (
        <div className="absolute right-0 top-0 bottom-0 flex">
          {rightActions.map((action, index) => (
            <button
              key={index}
              onClick={() => handleActionClick(action)}
              className={`flex items-center justify-center w-[70px] ${action.bgColor} transition-transform`}
              style={{
                transform: `translateX(${Math.max(0, translateX + maxRightSwipe)}px)`,
              }}
              aria-label={action.label}
            >
              <div className="flex flex-col items-center gap-1">
                <span style={{ color: action.color }}>{action.icon}</span>
                {action.label && (
                  <span className="text-xs font-medium" style={{ color: action.color }}>
                    {action.label}
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Main Content */}
      <div
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={handleContentClick}
        className="relative bg-white dark:bg-gray-800"
        style={{
          transform: `translateX(${translateX}px)`,
          transition: isSwiping ? 'none' : 'transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        }}
      >
        {children}
      </div>
    </div>
  );
};

// Pre-configured swipe actions
export const deleteAction = (onClick: () => void): SwipeActionConfig => ({
  icon: <Trash2 size={20} />,
  color: 'white',
  bgColor: 'bg-red-500',
  label: 'Eliminar',
  onClick,
});

export const archiveAction = (onClick: () => void): SwipeActionConfig => ({
  icon: <Archive size={20} />,
  color: 'white',
  bgColor: 'bg-oaxaca-sky',
  label: 'Archivar',
  onClick,
});

export const starAction = (onClick: () => void): SwipeActionConfig => ({
  icon: <Star size={20} />,
  color: 'white',
  bgColor: 'bg-oaxaca-yellow',
  label: 'Favorito',
  onClick,
});

export const editAction = (onClick: () => void): SwipeActionConfig => ({
  icon: <Edit size={20} />,
  color: 'white',
  bgColor: 'bg-green-500',
  label: 'Editar',
  onClick,
});

export const moreAction = (onClick: () => void): SwipeActionConfig => ({
  icon: <MoreHorizontal size={20} />,
  color: 'white',
  bgColor: 'bg-gray-500',
  label: 'Mas',
  onClick,
});

/**
 * SwipeToDelete - Simplified swipe-to-delete component
 */
interface SwipeToDeleteProps {
  children: React.ReactNode;
  onDelete: () => void;
  confirmDelete?: boolean;
  className?: string;
}

export const SwipeToDelete: React.FC<SwipeToDeleteProps> = ({
  children,
  onDelete,
  confirmDelete = false,
  className = '',
}) => {
  const handleDelete = () => {
    if (confirmDelete) {
      if (window.confirm('¿Eliminar este elemento?')) {
        onDelete();
      }
    } else {
      onDelete();
    }
  };

  return (
    <SwipeAction
      rightActions={[deleteAction(handleDelete)]}
      className={className}
    >
      {children}
    </SwipeAction>
  );
};

export default SwipeAction;
