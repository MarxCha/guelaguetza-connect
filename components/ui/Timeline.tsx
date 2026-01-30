import React from 'react';
import { Check, Circle, Clock, AlertCircle, X } from 'lucide-react';
import { triggerHaptic } from '../../utils/haptics';

// ============================================
// Types
// ============================================

type StepStatus = 'completed' | 'current' | 'pending' | 'error' | 'skipped';

interface Step {
  id: string;
  title: string;
  description?: string;
  status: StepStatus;
  icon?: React.ReactNode;
  timestamp?: Date;
}

// ============================================
// Stepper Component
// ============================================

interface StepperProps {
  steps: Step[];
  currentStep?: number;
  onChange?: (stepIndex: number) => void;
  orientation?: 'horizontal' | 'vertical';
  size?: 'sm' | 'md' | 'lg';
  showNumbers?: boolean;
  clickable?: boolean;
  className?: string;
}

/**
 * Stepper - Componente de pasos para procesos
 *
 * Features:
 * - Orientación horizontal/vertical
 * - Estados de paso
 * - Navegación por click
 * - Múltiples tamaños
 *
 * Usage:
 * <Stepper
 *   steps={[
 *     { id: '1', title: 'Datos', status: 'completed' },
 *     { id: '2', title: 'Pago', status: 'current' },
 *     { id: '3', title: 'Confirmación', status: 'pending' },
 *   ]}
 * />
 */
const Stepper: React.FC<StepperProps> = ({
  steps,
  currentStep,
  onChange,
  orientation = 'horizontal',
  size = 'md',
  showNumbers = true,
  clickable = false,
  className = '',
}) => {
  const sizes = {
    sm: {
      circle: 'w-8 h-8 text-sm',
      title: 'text-sm',
      description: 'text-xs',
      connector: orientation === 'horizontal' ? 'h-0.5' : 'w-0.5',
    },
    md: {
      circle: 'w-10 h-10 text-base',
      title: 'text-sm',
      description: 'text-xs',
      connector: orientation === 'horizontal' ? 'h-0.5' : 'w-0.5',
    },
    lg: {
      circle: 'w-12 h-12 text-lg',
      title: 'text-base',
      description: 'text-sm',
      connector: orientation === 'horizontal' ? 'h-1' : 'w-1',
    },
  };

  const sizeConfig = sizes[size];

  const getStatusStyles = (status: StepStatus) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500 text-white border-green-500';
      case 'current':
        return 'bg-oaxaca-pink text-white border-oaxaca-pink ring-4 ring-oaxaca-pink/20';
      case 'error':
        return 'bg-red-500 text-white border-red-500';
      case 'skipped':
        return 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 border-gray-300 dark:border-gray-600';
      default:
        return 'bg-white dark:bg-gray-800 text-gray-400 border-gray-300 dark:border-gray-600';
    }
  };

  const getConnectorStyles = (status: StepStatus, nextStatus?: StepStatus) => {
    if (status === 'completed' || nextStatus === 'completed' || nextStatus === 'current') {
      return 'bg-green-500';
    }
    return 'bg-gray-200 dark:bg-gray-700';
  };

  const getStatusIcon = (status: StepStatus, index: number) => {
    switch (status) {
      case 'completed':
        return <Check size={size === 'sm' ? 16 : size === 'md' ? 18 : 22} />;
      case 'error':
        return <X size={size === 'sm' ? 16 : size === 'md' ? 18 : 22} />;
      case 'skipped':
        return <Circle size={size === 'sm' ? 8 : size === 'md' ? 10 : 12} fill="currentColor" />;
      default:
        return showNumbers ? index + 1 : <Circle size={size === 'sm' ? 8 : size === 'md' ? 10 : 12} />;
    }
  };

  const handleStepClick = (index: number) => {
    if (clickable && onChange) {
      onChange(index);
      triggerHaptic('selection');
    }
  };

  if (orientation === 'vertical') {
    return (
      <div className={`flex flex-col ${className}`}>
        {steps.map((step, index) => (
          <div key={step.id} className="flex">
            {/* Circle and connector */}
            <div className="flex flex-col items-center">
              <button
                onClick={() => handleStepClick(index)}
                disabled={!clickable}
                className={`flex items-center justify-center rounded-full border-2 transition-all ${
                  sizeConfig.circle
                } ${getStatusStyles(step.status)} ${
                  clickable ? 'cursor-pointer hover:scale-105' : 'cursor-default'
                }`}
              >
                {step.icon || getStatusIcon(step.status, index)}
              </button>

              {index < steps.length - 1 && (
                <div
                  className={`flex-1 min-h-[40px] ${sizeConfig.connector} ${getConnectorStyles(
                    step.status,
                    steps[index + 1]?.status
                  )}`}
                />
              )}
            </div>

            {/* Content */}
            <div className="ml-4 pb-8">
              <h4
                className={`font-medium ${sizeConfig.title} ${
                  step.status === 'current'
                    ? 'text-oaxaca-pink'
                    : step.status === 'completed'
                    ? 'text-gray-900 dark:text-white'
                    : 'text-gray-500 dark:text-gray-400'
                }`}
              >
                {step.title}
              </h4>
              {step.description && (
                <p className={`mt-0.5 text-gray-500 dark:text-gray-400 ${sizeConfig.description}`}>
                  {step.description}
                </p>
              )}
              {step.timestamp && (
                <p className="mt-1 text-xs text-gray-400">
                  {step.timestamp.toLocaleTimeString('es-MX', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Horizontal orientation
  return (
    <div className={`flex items-start ${className}`}>
      {steps.map((step, index) => (
        <div
          key={step.id}
          className={`flex items-start ${index < steps.length - 1 ? 'flex-1' : ''}`}
        >
          <div className="flex flex-col items-center">
            <button
              onClick={() => handleStepClick(index)}
              disabled={!clickable}
              className={`flex items-center justify-center rounded-full border-2 transition-all ${
                sizeConfig.circle
              } ${getStatusStyles(step.status)} ${
                clickable ? 'cursor-pointer hover:scale-105' : 'cursor-default'
              }`}
            >
              {step.icon || getStatusIcon(step.status, index)}
            </button>

            <div className="mt-2 text-center max-w-[100px]">
              <h4
                className={`font-medium ${sizeConfig.title} ${
                  step.status === 'current'
                    ? 'text-oaxaca-pink'
                    : step.status === 'completed'
                    ? 'text-gray-900 dark:text-white'
                    : 'text-gray-500 dark:text-gray-400'
                }`}
              >
                {step.title}
              </h4>
              {step.description && (
                <p
                  className={`mt-0.5 text-gray-500 dark:text-gray-400 ${sizeConfig.description} line-clamp-2`}
                >
                  {step.description}
                </p>
              )}
            </div>
          </div>

          {index < steps.length - 1 && (
            <div className="flex-1 flex items-center px-2 pt-4 md:pt-5">
              <div
                className={`flex-1 ${sizeConfig.connector} ${getConnectorStyles(
                  step.status,
                  steps[index + 1]?.status
                )}`}
              />
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

// ============================================
// Timeline Component
// ============================================

interface TimelineEvent {
  id: string;
  title: string;
  description?: string;
  timestamp: Date;
  icon?: React.ReactNode;
  type?: 'default' | 'success' | 'warning' | 'error' | 'info';
  user?: {
    name: string;
    avatar?: string;
  };
}

interface TimelineProps {
  events: TimelineEvent[];
  showTime?: boolean;
  showDate?: boolean;
  groupByDate?: boolean;
  className?: string;
}

export const Timeline: React.FC<TimelineProps> = ({
  events,
  showTime = true,
  showDate = true,
  groupByDate = false,
  className = '',
}) => {
  const typeColors: Record<string, string> = {
    default: 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400',
    success: 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400',
    warning: 'bg-oaxaca-yellow-light dark:bg-oaxaca-yellow/20 text-oaxaca-yellow dark:text-oaxaca-yellow',
    error: 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400',
    info: 'bg-oaxaca-sky-light dark:bg-oaxaca-sky/20 text-oaxaca-sky dark:text-oaxaca-sky',
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('es-MX', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('es-MX', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Group events by date if needed
  const groupedEvents = groupByDate
    ? events.reduce((acc, event) => {
        const dateKey = event.timestamp.toDateString();
        if (!acc[dateKey]) {
          acc[dateKey] = [];
        }
        acc[dateKey].push(event);
        return acc;
      }, {} as Record<string, TimelineEvent[]>)
    : null;

  const renderEvent = (event: TimelineEvent, isLast: boolean) => (
    <div key={event.id} className="flex gap-4">
      {/* Icon */}
      <div className="flex flex-col items-center">
        <div
          className={`w-10 h-10 rounded-full flex items-center justify-center ${
            typeColors[event.type || 'default']
          }`}
        >
          {event.icon || <Clock size={18} />}
        </div>
        {!isLast && <div className="flex-1 w-0.5 bg-gray-200 dark:bg-gray-700 my-2" />}
      </div>

      {/* Content */}
      <div className={`flex-1 ${!isLast ? 'pb-6' : ''}`}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h4 className="font-medium text-gray-900 dark:text-white">{event.title}</h4>
            {event.description && (
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {event.description}
              </p>
            )}
            {event.user && (
              <div className="mt-2 flex items-center gap-2">
                {event.user.avatar ? (
                  <img
                    src={event.user.avatar}
                    alt={event.user.name}
                    className="w-5 h-5 rounded-full"
                  />
                ) : (
                  <div className="w-5 h-5 rounded-full bg-oaxaca-pink/10 text-oaxaca-pink flex items-center justify-center text-xs font-medium">
                    {event.user.name.charAt(0)}
                  </div>
                )}
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {event.user.name}
                </span>
              </div>
            )}
          </div>

          {showTime && (
            <span className="text-xs text-gray-400 whitespace-nowrap">
              {formatTime(event.timestamp)}
            </span>
          )}
        </div>
      </div>
    </div>
  );

  if (groupByDate && groupedEvents) {
    return (
      <div className={`space-y-8 ${className}`}>
        {Object.entries(groupedEvents).map(([dateKey, dateEvents]) => (
          <div key={dateKey}>
            {showDate && (
              <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-4 capitalize">
                {formatDate(new Date(dateKey))}
              </h3>
            )}
            <div className="space-y-0">
              {dateEvents.map((event, index) =>
                renderEvent(event, index === dateEvents.length - 1)
              )}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={className}>
      {events.map((event, index) => renderEvent(event, index === events.length - 1))}
    </div>
  );
};

// ============================================
// ProgressStepper Component
// ============================================

interface ProgressStepperProps {
  currentStep: number;
  totalSteps: number;
  labels?: string[];
  showProgress?: boolean;
  className?: string;
}

export const ProgressStepper: React.FC<ProgressStepperProps> = ({
  currentStep,
  totalSteps,
  labels,
  showProgress = true,
  className = '',
}) => {
  const progress = (currentStep / totalSteps) * 100;

  return (
    <div className={className}>
      {/* Progress bar */}
      <div className="relative h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div
          className="absolute top-0 left-0 h-full bg-oaxaca-pink transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Steps */}
      <div className="mt-2 flex justify-between">
        {Array.from({ length: totalSteps }, (_, i) => (
          <div
            key={i}
            className={`flex flex-col items-center ${
              i + 1 <= currentStep ? 'text-oaxaca-pink' : 'text-gray-400'
            }`}
          >
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                i + 1 < currentStep
                  ? 'bg-oaxaca-pink text-white'
                  : i + 1 === currentStep
                  ? 'bg-oaxaca-pink text-white ring-4 ring-oaxaca-pink/20'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-500'
              }`}
            >
              {i + 1 < currentStep ? <Check size={14} /> : i + 1}
            </div>
            {labels && labels[i] && (
              <span className="mt-1 text-xs text-center max-w-[60px] truncate">
                {labels[i]}
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Progress text */}
      {showProgress && (
        <p className="mt-3 text-center text-sm text-gray-500 dark:text-gray-400">
          Paso {currentStep} de {totalSteps}
        </p>
      )}
    </div>
  );
};

// ============================================
// OrderTimeline Component
// ============================================

interface OrderStatus {
  status: 'ordered' | 'confirmed' | 'preparing' | 'shipped' | 'delivered' | 'cancelled';
  timestamp?: Date;
  description?: string;
}

interface OrderTimelineProps {
  statuses: OrderStatus[];
  currentStatus: OrderStatus['status'];
  className?: string;
}

export const OrderTimeline: React.FC<OrderTimelineProps> = ({
  statuses,
  currentStatus,
  className = '',
}) => {
  const statusConfig: Record<
    OrderStatus['status'],
    { label: string; icon: React.ReactNode; color: string }
  > = {
    ordered: { label: 'Pedido realizado', icon: <Clock size={18} />, color: 'bg-oaxaca-sky' },
    confirmed: { label: 'Confirmado', icon: <Check size={18} />, color: 'bg-green-500' },
    preparing: { label: 'En preparación', icon: <Clock size={18} />, color: 'bg-oaxaca-yellow' },
    shipped: { label: 'Enviado', icon: <Check size={18} />, color: 'bg-oaxaca-purple' },
    delivered: { label: 'Entregado', icon: <Check size={18} />, color: 'bg-green-500' },
    cancelled: { label: 'Cancelado', icon: <X size={18} />, color: 'bg-red-500' },
  };

  const statusOrder: OrderStatus['status'][] = [
    'ordered',
    'confirmed',
    'preparing',
    'shipped',
    'delivered',
  ];

  const currentIndex = statusOrder.indexOf(currentStatus);
  const isCancelled = currentStatus === 'cancelled';

  return (
    <div className={className}>
      {statusOrder.map((status, index) => {
        const config = statusConfig[status];
        const statusData = statuses.find((s) => s.status === status);
        const isCompleted = !isCancelled && index <= currentIndex;
        const isCurrent = !isCancelled && index === currentIndex;

        return (
          <div key={status} className="flex gap-4">
            {/* Icon */}
            <div className="flex flex-col items-center">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                  isCancelled
                    ? 'bg-gray-200 dark:bg-gray-700 text-gray-400'
                    : isCompleted
                    ? `${config.color} text-white`
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-400'
                } ${isCurrent ? 'ring-4 ring-oaxaca-pink/20' : ''}`}
              >
                {isCompleted ? <Check size={18} /> : config.icon}
              </div>
              {index < statusOrder.length - 1 && (
                <div
                  className={`flex-1 w-0.5 my-2 ${
                    !isCancelled && index < currentIndex
                      ? 'bg-green-500'
                      : 'bg-gray-200 dark:bg-gray-700'
                  }`}
                  style={{ minHeight: '30px' }}
                />
              )}
            </div>

            {/* Content */}
            <div className="flex-1 pb-6">
              <h4
                className={`font-medium ${
                  isCompleted ? 'text-gray-900 dark:text-white' : 'text-gray-400'
                }`}
              >
                {config.label}
              </h4>
              {statusData?.description && (
                <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
                  {statusData.description}
                </p>
              )}
              {statusData?.timestamp && (
                <p className="mt-1 text-xs text-gray-400">
                  {statusData.timestamp.toLocaleDateString('es-MX', {
                    day: 'numeric',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              )}
            </div>
          </div>
        );
      })}

      {isCancelled && (
        <div className="flex gap-4">
          <div className="flex flex-col items-center">
            <div className="w-10 h-10 rounded-full flex items-center justify-center bg-red-500 text-white">
              <X size={18} />
            </div>
          </div>
          <div className="flex-1">
            <h4 className="font-medium text-red-500">Cancelado</h4>
            {statuses.find((s) => s.status === 'cancelled')?.description && (
              <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
                {statuses.find((s) => s.status === 'cancelled')?.description}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================
// useStepper Hook
// ============================================

export const useStepper = (totalSteps: number, initialStep = 0) => {
  const [currentStep, setCurrentStep] = React.useState(initialStep);

  const next = React.useCallback(() => {
    setCurrentStep((prev) => Math.min(prev + 1, totalSteps - 1));
    triggerHaptic('selection');
  }, [totalSteps]);

  const prev = React.useCallback(() => {
    setCurrentStep((prev) => Math.max(prev - 1, 0));
    triggerHaptic('selection');
  }, []);

  const goTo = React.useCallback((step: number) => {
    setCurrentStep(Math.max(0, Math.min(step, totalSteps - 1)));
    triggerHaptic('selection');
  }, [totalSteps]);

  const reset = React.useCallback(() => {
    setCurrentStep(initialStep);
  }, [initialStep]);

  return {
    currentStep,
    next,
    prev,
    goTo,
    reset,
    isFirst: currentStep === 0,
    isLast: currentStep === totalSteps - 1,
    progress: ((currentStep + 1) / totalSteps) * 100,
  };
};

export default Stepper;
