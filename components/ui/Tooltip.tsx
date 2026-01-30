import React, { useState, useRef, useEffect, useCallback, createContext, useContext } from 'react';
import { createPortal } from 'react-dom';
import { X, Info, HelpCircle, AlertCircle, CheckCircle } from 'lucide-react';

// ============================================
// Types
// ============================================

type TooltipPlacement = 'top' | 'bottom' | 'left' | 'right';
type TooltipTrigger = 'hover' | 'click' | 'focus' | 'manual';

interface Position {
  top: number;
  left: number;
}

// ============================================
// Tooltip Component
// ============================================

interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactElement;
  placement?: TooltipPlacement;
  trigger?: TooltipTrigger;
  delay?: number;
  offset?: number;
  disabled?: boolean;
  className?: string;
  arrow?: boolean;
  maxWidth?: number;
}

/**
 * Tooltip - Información contextual al pasar el cursor
 *
 * Features:
 * - Múltiples posiciones
 * - Diferentes triggers
 * - Delay configurable
 * - Flecha opcional
 *
 * Usage:
 * <Tooltip content="Información útil">
 *   <button>Hover me</button>
 * </Tooltip>
 */
export const Tooltip: React.FC<TooltipProps> = ({
  content,
  children,
  placement = 'top',
  trigger = 'hover',
  delay = 200,
  offset = 8,
  disabled = false,
  className = '',
  arrow = true,
  maxWidth = 250,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState<Position>({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const calculatePosition = useCallback(() => {
    if (!triggerRef.current || !tooltipRef.current) return;

    const triggerRect = triggerRef.current.getBoundingClientRect();
    const tooltipRect = tooltipRef.current.getBoundingClientRect();
    const scrollY = window.scrollY;
    const scrollX = window.scrollX;

    let top = 0;
    let left = 0;

    switch (placement) {
      case 'top':
        top = triggerRect.top + scrollY - tooltipRect.height - offset;
        left = triggerRect.left + scrollX + (triggerRect.width - tooltipRect.width) / 2;
        break;
      case 'bottom':
        top = triggerRect.bottom + scrollY + offset;
        left = triggerRect.left + scrollX + (triggerRect.width - tooltipRect.width) / 2;
        break;
      case 'left':
        top = triggerRect.top + scrollY + (triggerRect.height - tooltipRect.height) / 2;
        left = triggerRect.left + scrollX - tooltipRect.width - offset;
        break;
      case 'right':
        top = triggerRect.top + scrollY + (triggerRect.height - tooltipRect.height) / 2;
        left = triggerRect.right + scrollX + offset;
        break;
    }

    // Keep tooltip within viewport
    const padding = 10;
    left = Math.max(padding, Math.min(left, window.innerWidth - tooltipRect.width - padding));
    top = Math.max(padding, top);

    setPosition({ top, left });
  }, [placement, offset]);

  useEffect(() => {
    if (isVisible) {
      calculatePosition();
      window.addEventListener('scroll', calculatePosition, true);
      window.addEventListener('resize', calculatePosition);

      return () => {
        window.removeEventListener('scroll', calculatePosition, true);
        window.removeEventListener('resize', calculatePosition);
      };
    }
  }, [isVisible, calculatePosition]);

  const show = useCallback(() => {
    if (disabled) return;

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    if (delay > 0) {
      timeoutRef.current = setTimeout(() => setIsVisible(true), delay);
    } else {
      setIsVisible(true);
    }
  }, [disabled, delay]);

  const hide = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsVisible(false);
  }, []);

  const toggle = useCallback(() => {
    if (isVisible) {
      hide();
    } else {
      show();
    }
  }, [isVisible, show, hide]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // Clone child and add event handlers
  const triggerProps: Record<string, unknown> = {
    ref: triggerRef,
  };

  if (trigger === 'hover' || trigger === 'focus') {
    triggerProps.onMouseEnter = show;
    triggerProps.onMouseLeave = hide;
    triggerProps.onFocus = show;
    triggerProps.onBlur = hide;
  }

  if (trigger === 'click') {
    triggerProps.onClick = toggle;
  }

  const arrowStyles: Record<TooltipPlacement, string> = {
    top: 'bottom-0 left-1/2 -translate-x-1/2 translate-y-full border-l-transparent border-r-transparent border-b-transparent',
    bottom: 'top-0 left-1/2 -translate-x-1/2 -translate-y-full border-l-transparent border-r-transparent border-t-transparent',
    left: 'right-0 top-1/2 translate-x-full -translate-y-1/2 border-t-transparent border-b-transparent border-r-transparent',
    right: 'left-0 top-1/2 -translate-x-full -translate-y-1/2 border-t-transparent border-b-transparent border-l-transparent',
  };

  return (
    <>
      {React.cloneElement(children, triggerProps)}

      {isVisible && typeof document !== 'undefined' && createPortal(
        <div
          ref={tooltipRef}
          role="tooltip"
          className={`fixed z-50 px-3 py-2 text-sm bg-gray-900 dark:bg-gray-700 text-white rounded-lg shadow-lg animate-in fade-in zoom-in-95 duration-150 ${className}`}
          style={{
            top: position.top,
            left: position.left,
            maxWidth,
          }}
        >
          {content}
          {arrow && (
            <div
              className={`absolute w-0 h-0 border-4 border-gray-900 dark:border-gray-700 ${arrowStyles[placement]}`}
            />
          )}
        </div>,
        document.body
      )}
    </>
  );
};

// ============================================
// Popover Component
// ============================================

interface PopoverContextType {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
}

const PopoverContext = createContext<PopoverContextType | null>(null);

const usePopoverContext = () => {
  const context = useContext(PopoverContext);
  if (!context) {
    throw new Error('Popover components must be used within Popover');
  }
  return context;
};

interface PopoverProps {
  children: React.ReactNode;
  defaultOpen?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

/**
 * Popover - Contenido flotante interactivo
 *
 * Features:
 * - Contenido rico
 * - Click outside para cerrar
 * - Escape para cerrar
 * - Posicionamiento automático
 *
 * Usage:
 * <Popover>
 *   <PopoverTrigger>
 *     <button>Abrir</button>
 *   </PopoverTrigger>
 *   <PopoverContent>
 *     Contenido del popover
 *   </PopoverContent>
 * </Popover>
 */
export const Popover: React.FC<PopoverProps> = ({
  children,
  defaultOpen = false,
  open: controlledOpen,
  onOpenChange,
}) => {
  const [internalOpen, setInternalOpen] = useState(defaultOpen);

  const isOpen = controlledOpen ?? internalOpen;

  const open = useCallback(() => {
    setInternalOpen(true);
    onOpenChange?.(true);
  }, [onOpenChange]);

  const close = useCallback(() => {
    setInternalOpen(false);
    onOpenChange?.(false);
  }, [onOpenChange]);

  const toggle = useCallback(() => {
    const newValue = !isOpen;
    setInternalOpen(newValue);
    onOpenChange?.(newValue);
  }, [isOpen, onOpenChange]);

  return (
    <PopoverContext.Provider value={{ isOpen, open, close, toggle }}>
      <div className="relative inline-block">
        {children}
      </div>
    </PopoverContext.Provider>
  );
};

interface PopoverTriggerProps {
  children: React.ReactElement;
  asChild?: boolean;
}

export const PopoverTrigger: React.FC<PopoverTriggerProps> = ({ children }) => {
  const { toggle } = usePopoverContext();

  return React.cloneElement(children as React.ReactElement<{ onClick?: (e: React.MouseEvent) => void }>, {
    onClick: (e: React.MouseEvent) => {
      (children as React.ReactElement<{ onClick?: (e: React.MouseEvent) => void }>).props.onClick?.(e);
      toggle();
    },
  });
};

interface PopoverContentProps {
  children: React.ReactNode;
  placement?: TooltipPlacement;
  className?: string;
  showClose?: boolean;
  align?: 'start' | 'center' | 'end';
}

export const PopoverContent: React.FC<PopoverContentProps> = ({
  children,
  placement = 'bottom',
  className = '',
  showClose = false,
  align = 'center',
}) => {
  const { isOpen, close } = usePopoverContext();
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (contentRef.current && !contentRef.current.contains(e.target as Node)) {
        // Check if click is on the trigger
        const trigger = contentRef.current.parentElement?.querySelector('[data-popover-trigger]');
        if (trigger && trigger.contains(e.target as Node)) return;
        close();
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, close]);

  if (!isOpen) return null;

  const placementStyles: Record<TooltipPlacement, string> = {
    top: 'bottom-full mb-2',
    bottom: 'top-full mt-2',
    left: 'right-full mr-2',
    right: 'left-full ml-2',
  };

  const alignStyles: Record<string, string> = {
    start: 'left-0',
    center: 'left-1/2 -translate-x-1/2',
    end: 'right-0',
  };

  return (
    <div
      ref={contentRef}
      className={`absolute z-50 min-w-[200px] bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 animate-in fade-in zoom-in-95 duration-150 ${placementStyles[placement]} ${alignStyles[align]} ${className}`}
    >
      {showClose && (
        <button
          onClick={close}
          className="absolute top-2 right-2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          <X size={16} />
        </button>
      )}
      {children}
    </div>
  );
};

// ============================================
// InfoTooltip Component
// ============================================

interface InfoTooltipProps {
  content: React.ReactNode;
  variant?: 'info' | 'help' | 'warning' | 'success';
  size?: number;
  className?: string;
}

export const InfoTooltip: React.FC<InfoTooltipProps> = ({
  content,
  variant = 'info',
  size = 16,
  className = '',
}) => {
  const icons = {
    info: Info,
    help: HelpCircle,
    warning: AlertCircle,
    success: CheckCircle,
  };

  const colors = {
    info: 'text-oaxaca-sky',
    help: 'text-gray-400',
    warning: 'text-oaxaca-yellow',
    success: 'text-green-500',
  };

  const Icon = icons[variant];

  return (
    <Tooltip content={content}>
      <button className={`inline-flex ${colors[variant]} ${className}`}>
        <Icon size={size} />
      </button>
    </Tooltip>
  );
};

// ============================================
// Dropdown Menu Component
// ============================================

interface DropdownMenuProps {
  trigger: React.ReactElement;
  children: React.ReactNode;
  placement?: TooltipPlacement;
  align?: 'start' | 'center' | 'end';
  className?: string;
}

export const DropdownMenu: React.FC<DropdownMenuProps> = ({
  trigger,
  children,
  placement = 'bottom',
  align = 'start',
  className = '',
}) => {
  return (
    <Popover>
      <PopoverTrigger>{trigger}</PopoverTrigger>
      <PopoverContent placement={placement} align={align} className={`p-1 ${className}`}>
        {children}
      </PopoverContent>
    </Popover>
  );
};

interface DropdownItemProps {
  children: React.ReactNode;
  onClick?: () => void;
  icon?: React.ReactNode;
  disabled?: boolean;
  danger?: boolean;
  className?: string;
}

export const DropdownItem: React.FC<DropdownItemProps> = ({
  children,
  onClick,
  icon,
  disabled = false,
  danger = false,
  className = '',
}) => {
  const { close } = usePopoverContext();

  return (
    <button
      onClick={() => {
        if (!disabled) {
          onClick?.();
          close();
        }
      }}
      disabled={disabled}
      className={`w-full flex items-center gap-3 px-3 py-2 text-sm rounded-lg transition-colors ${
        disabled
          ? 'opacity-50 cursor-not-allowed'
          : danger
          ? 'text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20'
          : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'
      } ${className}`}
    >
      {icon && <span className="flex-shrink-0">{icon}</span>}
      {children}
    </button>
  );
};

export const DropdownDivider: React.FC = () => (
  <div className="my-1 h-px bg-gray-200 dark:bg-gray-700" />
);

interface DropdownLabelProps {
  children: React.ReactNode;
}

export const DropdownLabel: React.FC<DropdownLabelProps> = ({ children }) => (
  <div className="px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
    {children}
  </div>
);

// ============================================
// HoverCard Component
// ============================================

interface HoverCardProps {
  trigger: React.ReactElement;
  children: React.ReactNode;
  placement?: TooltipPlacement;
  delay?: number;
  className?: string;
}

export const HoverCard: React.FC<HoverCardProps> = ({
  trigger,
  children,
  placement = 'bottom',
  delay = 300,
  className = '',
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState<Position>({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const calculatePosition = useCallback(() => {
    if (!triggerRef.current || !cardRef.current) return;

    const triggerRect = triggerRef.current.getBoundingClientRect();
    const cardRect = cardRef.current.getBoundingClientRect();
    const scrollY = window.scrollY;
    const scrollX = window.scrollX;
    const offset = 8;

    let top = 0;
    let left = 0;

    switch (placement) {
      case 'top':
        top = triggerRect.top + scrollY - cardRect.height - offset;
        left = triggerRect.left + scrollX + (triggerRect.width - cardRect.width) / 2;
        break;
      case 'bottom':
        top = triggerRect.bottom + scrollY + offset;
        left = triggerRect.left + scrollX + (triggerRect.width - cardRect.width) / 2;
        break;
      case 'left':
        top = triggerRect.top + scrollY + (triggerRect.height - cardRect.height) / 2;
        left = triggerRect.left + scrollX - cardRect.width - offset;
        break;
      case 'right':
        top = triggerRect.top + scrollY + (triggerRect.height - cardRect.height) / 2;
        left = triggerRect.right + scrollX + offset;
        break;
    }

    setPosition({ top, left });
  }, [placement]);

  useEffect(() => {
    if (isVisible) {
      calculatePosition();
    }
  }, [isVisible, calculatePosition]);

  const show = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setIsVisible(true), delay);
  };

  const hide = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setIsVisible(false), 100);
  };

  const keepOpen = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  return (
    <>
      {React.cloneElement(trigger as React.ReactElement<{ ref?: React.Ref<HTMLElement>; onMouseEnter?: () => void; onMouseLeave?: () => void }>, {
        ref: triggerRef,
        onMouseEnter: show,
        onMouseLeave: hide,
      })}

      {isVisible && typeof document !== 'undefined' && createPortal(
        <div
          ref={cardRef}
          onMouseEnter={keepOpen}
          onMouseLeave={hide}
          className={`fixed z-50 min-w-[280px] bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 animate-in fade-in zoom-in-95 duration-150 ${className}`}
          style={{
            top: position.top,
            left: position.left,
          }}
        >
          {children}
        </div>,
        document.body
      )}
    </>
  );
};

// ============================================
// useTooltip Hook
// ============================================

export const useTooltip = (initialVisible = false) => {
  const [isVisible, setIsVisible] = useState(initialVisible);

  const show = useCallback(() => setIsVisible(true), []);
  const hide = useCallback(() => setIsVisible(false), []);
  const toggle = useCallback(() => setIsVisible((v) => !v), []);

  return {
    isVisible,
    show,
    hide,
    toggle,
    tooltipProps: {
      trigger: 'manual' as TooltipTrigger,
    },
  };
};

// ============================================
// usePopover Hook
// ============================================

export const usePopover = (initialOpen = false) => {
  const [isOpen, setIsOpen] = useState(initialOpen);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen((v) => !v), []);

  return {
    isOpen,
    open,
    close,
    toggle,
    popoverProps: {
      open: isOpen,
      onOpenChange: setIsOpen,
    },
  };
};

export default Tooltip;
