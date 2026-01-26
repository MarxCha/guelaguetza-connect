import React, { useState, useEffect } from 'react';
import {
  ChevronLeft,
  Calendar,
  Clock,
  MapPin,
  Users,
  Ticket,
  Star,
  RefreshCw,
} from 'lucide-react';
import LoadingSpinner from './ui/LoadingSpinner';
import LoadingButton from './ui/LoadingButton';
import { useToast } from './ui/Toast';
import PaymentErrorModal from './ui/PaymentErrorModal';
import {
  getMyBookings,
  cancelBooking,
  createExperienceReview,
  retryBookingPayment,
  Booking,
  BookingStatus,
  formatDuration,
  formatPrice,
} from '../services/bookings';
import {
  BookingStatusBadge,
  canCancelBooking,
  canRetryBookingPayment,
  canReviewBooking,
} from './ui/StatusBadge';
import { ViewState } from '../types';

interface MyBookingsViewProps {
  onNavigate: (view: ViewState, data?: unknown) => void;
  onBack: () => void;
}

type TabStatus = 'all' | BookingStatus;

export default function MyBookingsView({ onNavigate, onBack }: MyBookingsViewProps) {
  const toast = useToast();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabStatus>('all');
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewLoading, setReviewLoading] = useState(false);
  const [showPaymentErrorModal, setShowPaymentErrorModal] = useState(false);
  const [paymentErrorBooking, setPaymentErrorBooking] = useState<Booking | null>(null);
  const [retryingPayment, setRetryingPayment] = useState(false);

  useEffect(() => {
    loadBookings();
  }, [activeTab]);

  const loadBookings = async () => {
    try {
      setLoading(true);
      const result = await getMyBookings({
        status: activeTab === 'all' ? undefined : activeTab,
        limit: 50,
      });
      setBookings(result.bookings);
    } catch (error) {
      console.error('Error loading bookings:', error);
      toast.error('Error al cargar', 'No se pudieron cargar tus reservaciones');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (booking: Booking) => {
    if (!confirm('Estas seguro de cancelar esta reservacion?')) return;

    try {
      await cancelBooking(booking.id);
      toast.success('Reservación cancelada', 'Tu reservación ha sido cancelada');
      loadBookings();
    } catch (error) {
      console.error('Error cancelling booking:', error);
      toast.error('Error al cancelar', 'No se pudo cancelar la reservación');
    }
  };

  const handleReview = async () => {
    if (!selectedBooking) return;

    try {
      setReviewLoading(true);
      await createExperienceReview(selectedBooking.experienceId, {
        rating: reviewRating,
        comment: reviewComment || undefined,
      });
      setShowReviewModal(false);
      setSelectedBooking(null);
      setReviewRating(5);
      setReviewComment('');
      toast.success('Reseña enviada', 'Gracias por compartir tu experiencia');
    } catch (error) {
      console.error('Error creating review:', error);
      toast.error('Error al enviar', 'No se pudo enviar la reseña');
    } finally {
      setReviewLoading(false);
    }
  };

  const handleRetryPayment = async (booking: Booking) => {
    setPaymentErrorBooking(booking);
    setShowPaymentErrorModal(true);
  };

  const handleRetryPaymentConfirm = async () => {
    if (!paymentErrorBooking) return;

    try {
      setRetryingPayment(true);
      const result = await retryBookingPayment(paymentErrorBooking.id);

      // Si tenemos un clientSecret, redirigir a Stripe Checkout
      if (result.clientSecret) {
        toast.info('Redirigiendo a pago', 'Serás redirigido a completar el pago');
        setShowPaymentErrorModal(false);
        // TODO: Integrar con Stripe Checkout
        // window.location.href = `/checkout?payment_intent=${result.clientSecret}`;
      } else {
        toast.success('Pago procesado', 'Tu pago ha sido procesado exitosamente');
        setShowPaymentErrorModal(false);
        loadBookings(); // Recargar la lista
      }
    } catch (error) {
      console.error('Error retrying payment:', error);
      toast.error('Error al procesar pago', error instanceof Error ? error.message : 'No se pudo procesar el pago');
    } finally {
      setRetryingPayment(false);
    }
  };

  const tabs: { key: TabStatus; label: string }[] = [
    { key: 'all', label: 'Todas' },
    { key: 'PENDING_PAYMENT', label: 'Procesando' },
    { key: 'PAYMENT_FAILED', label: 'Error pago' },
    { key: 'PENDING', label: 'Pendientes' },
    { key: 'CONFIRMED', label: 'Confirmadas' },
    { key: 'COMPLETED', label: 'Completadas' },
    { key: 'CANCELLED', label: 'Canceladas' },
  ];

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-gradient-to-r from-pink-600 to-purple-600 text-white p-3 sm:p-4 pt-10 sm:pt-12">
        <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4 max-w-4xl mx-auto">
          <button
            onClick={onBack}
            className="p-2 hover:bg-white/20 rounded-full min-w-[44px] min-h-[44px] flex items-center justify-center transition-colors focus-visible:ring-2 focus-visible:ring-white"
            aria-label="Volver"
          >
            <ChevronLeft className="w-5 sm:w-6 h-5 sm:h-6" />
          </button>
          <div>
            <h1 className="text-lg sm:text-xl font-bold">Mis Reservaciones</h1>
            <p className="text-xs sm:text-sm text-white/80">{bookings.length} reservaciones</p>
          </div>
        </div>

        {/* Tabs - Scrollable on mobile */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide max-w-4xl mx-auto" role="tablist" aria-label="Filtrar reservaciones">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              role="tab"
              aria-selected={activeTab === tab.key}
              className={`px-3 py-1.5 rounded-full text-xs sm:text-sm whitespace-nowrap transition-colors min-h-[36px] focus-visible:ring-2 focus-visible:ring-white ${
                activeTab === tab.key ? 'bg-white text-purple-600 font-medium' : 'bg-white/20 hover:bg-white/30'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-4">
        <div className="max-w-4xl mx-auto">
        {loading ? (
          <LoadingSpinner text="Cargando reservaciones..." />
        ) : bookings.length === 0 ? (
          <div className="text-center py-8 sm:py-12">
            <Ticket className="w-12 sm:w-16 h-12 sm:h-16 mx-auto text-gray-300 dark:text-gray-600 mb-3 sm:mb-4" aria-hidden="true" />
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-2">Sin reservaciones</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 px-4">Aun no has reservado ninguna experiencia</p>
            <button
              onClick={() => onNavigate(ViewState.EXPERIENCES)}
              className="px-5 sm:px-6 py-2.5 sm:py-3 bg-purple-600 text-white rounded-xl font-medium hover:bg-purple-700 active:scale-[0.98] transition-all min-h-[44px] focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2 text-sm sm:text-base"
            >
              Explorar experiencias
            </button>
          </div>
        ) : (
          <div className="space-y-3 sm:space-y-4">
            {bookings.map((booking) => (
              <BookingCard
                key={booking.id}
                booking={booking}
                onCancel={() => handleCancel(booking)}
                onReview={() => {
                  setSelectedBooking(booking);
                  setShowReviewModal(true);
                }}
                onRetryPayment={() => handleRetryPayment(booking)}
                onClick={() => onNavigate(ViewState.EXPERIENCE_DETAIL, { experienceId: booking.experienceId })}
              />
            ))}
          </div>
        )}
        </div>
      </div>

      {/* Payment Error Modal */}
      {showPaymentErrorModal && paymentErrorBooking && (
        <PaymentErrorModal
          isOpen={showPaymentErrorModal}
          onClose={() => {
            setShowPaymentErrorModal(false);
            setPaymentErrorBooking(null);
          }}
          onRetry={handleRetryPaymentConfirm}
          bookingId={paymentErrorBooking.id}
          amount={formatPrice(paymentErrorBooking.totalPrice)}
          retrying={retryingPayment}
        />
      )}

      {/* Review Modal */}
      {showReviewModal && selectedBooking && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-3 sm:p-4" role="dialog" aria-modal="true" aria-labelledby="review-modal-title">
          <div className="bg-white dark:bg-gray-800 w-full max-w-md rounded-2xl p-4 sm:p-6">
            <h2 id="review-modal-title" className="text-lg sm:text-xl font-bold mb-3 sm:mb-4 text-gray-900 dark:text-white">Deja tu resena</h2>
            <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300 mb-4">{selectedBooking.experience.title}</p>

            {/* Rating */}
            <fieldset className="mb-4">
              <legend className="sr-only">Calificacion</legend>
              <div className="flex justify-center gap-1 sm:gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => setReviewRating(star)}
                    aria-label={`${star} ${star === 1 ? 'estrella' : 'estrellas'}`}
                    aria-pressed={star <= reviewRating}
                    className="p-1 min-w-[44px] min-h-[44px] flex items-center justify-center focus-visible:ring-2 focus-visible:ring-purple-500 rounded"
                  >
                    <Star
                      className={`w-8 sm:w-10 h-8 sm:h-10 transition-colors ${
                        star <= reviewRating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300 dark:text-gray-600'
                      }`}
                    />
                  </button>
                ))}
              </div>
            </fieldset>

            {/* Comment */}
            <label htmlFor="review-comment" className="sr-only">Comentario</label>
            <textarea
              id="review-comment"
              value={reviewComment}
              onChange={(e) => setReviewComment(e.target.value)}
              placeholder="Cuentanos tu experiencia (opcional)"
              className="w-full p-3 border border-gray-200 dark:border-gray-600 rounded-lg resize-none mb-4 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 text-sm sm:text-base focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              rows={4}
            />

            {/* Actions */}
            <div className="flex gap-2 sm:gap-3">
              <button
                onClick={() => setShowReviewModal(false)}
                className="flex-1 py-2.5 sm:py-3 border border-gray-300 dark:border-gray-600 rounded-lg font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 min-h-[44px] transition-colors focus-visible:ring-2 focus-visible:ring-gray-500 text-sm sm:text-base"
              >
                Cancelar
              </button>
              <button
                onClick={handleReview}
                disabled={reviewLoading}
                className="flex-1 py-2.5 sm:py-3 bg-purple-600 text-white rounded-lg font-medium disabled:opacity-50 min-h-[44px] hover:bg-purple-700 active:scale-[0.98] transition-all focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2 text-sm sm:text-base"
                aria-busy={reviewLoading}
              >
                {reviewLoading ? 'Enviando...' : 'Enviar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface BookingCardProps {
  booking: Booking;
  onCancel: () => void;
  onReview: () => void;
  onRetryPayment: () => void;
  onClick: () => void;
}

function BookingCard({ booking, onCancel, onReview, onRetryPayment, onClick }: BookingCardProps) {
  const [isRetrying, setIsRetrying] = useState(false);
  const experience = booking.experience;
  const slot = booking.timeSlot;

  const handleRetryPayment = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsRetrying(true);
    try {
      await onRetryPayment();
    } finally {
      setIsRetrying(false);
    }
  };

  return (
    <article className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden transition-shadow hover:shadow-md">
      {/* Image & Status */}
      <div
        className="relative h-28 sm:h-32 cursor-pointer"
        onClick={onClick}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onClick();
          }
        }}
      >
        <img
          src={experience.imageUrl || `https://picsum.photos/400/200?random=${experience.id}`}
          alt=""
          className="w-full h-full object-cover"
          loading="lazy"
        />
        <div className="absolute top-2 sm:top-3 right-2 sm:right-3 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm rounded-full p-0.5 sm:p-1">
          <BookingStatusBadge status={booking.status} size="sm" />
        </div>
      </div>

      {/* Info */}
      <div className="p-3 sm:p-4">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-2 text-sm sm:text-base line-clamp-1">{experience.title}</h3>

        <div className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm text-gray-600 dark:text-gray-400">
          <div className="flex items-center gap-2">
            <Calendar className="w-3.5 sm:w-4 h-3.5 sm:h-4 flex-shrink-0" aria-hidden="true" />
            <span className="truncate">
              {new Date(slot.date).toLocaleDateString('es-MX', {
                weekday: 'short',
                day: 'numeric',
                month: 'short',
              })}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-3.5 sm:w-4 h-3.5 sm:h-4 flex-shrink-0" aria-hidden="true" />
            <span>
              {slot.startTime} - {slot.endTime}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Users className="w-3.5 sm:w-4 h-3.5 sm:h-4 flex-shrink-0" aria-hidden="true" />
            <span>
              {booking.guestCount} {booking.guestCount === 1 ? 'persona' : 'personas'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="w-3.5 sm:w-4 h-3.5 sm:h-4 flex-shrink-0" aria-hidden="true" />
            <span className="truncate">{experience.location}</span>
          </div>
        </div>

        {/* Total */}
        <div className="flex justify-between items-center mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-gray-100 dark:border-gray-700">
          <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Total pagado</span>
          <span className="text-base sm:text-lg font-bold text-purple-600 dark:text-purple-400">{formatPrice(booking.totalPrice)}</span>
        </div>

        {/* Actions */}
        <div className="flex gap-2 mt-3 sm:mt-4">
          {/* Estado: PAYMENT_FAILED - Boton de reintentar pago */}
          {canRetryBookingPayment(booking.status) && (
            <LoadingButton
              onClick={handleRetryPayment}
              isLoading={isRetrying}
              variant="primary"
              className="flex-1 py-2 sm:py-2.5 bg-purple-600 text-white rounded-lg font-medium flex items-center justify-center gap-1.5 sm:gap-2 hover:bg-purple-700 transition-colors disabled:opacity-50 min-h-[40px] sm:min-h-[44px] text-xs sm:text-sm"
              aria-label="Reintentar pago"
            >
              <RefreshCw className="w-3.5 sm:w-4 h-3.5 sm:h-4" aria-hidden="true" />
              {isRetrying ? 'Procesando...' : 'Reintentar'}
            </LoadingButton>
          )}

          {/* Estado: PENDING_PAYMENT - Mostrar estado de procesamiento */}
          {booking.status === 'PENDING_PAYMENT' && (
            <div
              className="flex-1 py-2 sm:py-2.5 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 text-amber-700 dark:text-amber-400 rounded-lg font-medium flex items-center justify-center gap-1.5 sm:gap-2 min-h-[40px] sm:min-h-[44px] text-xs sm:text-sm"
              role="status"
              aria-live="polite"
            >
              <RefreshCw className="w-3.5 sm:w-4 h-3.5 sm:h-4 animate-spin" aria-hidden="true" />
              <span>Procesando...</span>
            </div>
          )}

          {/* Estado: PENDING o CONFIRMED - Boton de cancelar */}
          {canCancelBooking(booking.status) && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onCancel();
              }}
              className="flex-1 py-2 sm:py-2.5 border border-red-500 dark:border-red-400 text-red-500 dark:text-red-400 rounded-lg font-medium hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors min-h-[40px] sm:min-h-[44px] text-xs sm:text-sm focus-visible:ring-2 focus-visible:ring-red-500"
              aria-label="Cancelar reservacion"
            >
              Cancelar
            </button>
          )}

          {/* Estado: COMPLETED - Boton de dejar resena */}
          {canReviewBooking(booking.status) && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onReview();
              }}
              className="flex-1 py-2 sm:py-2.5 bg-purple-600 text-white rounded-lg font-medium flex items-center justify-center gap-1.5 sm:gap-2 hover:bg-purple-700 transition-colors min-h-[40px] sm:min-h-[44px] text-xs sm:text-sm focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2"
              aria-label="Dejar resena"
            >
              <Star className="w-3.5 sm:w-4 h-3.5 sm:h-4" aria-hidden="true" />
              Resena
            </button>
          )}

          {/* Estado: CANCELLED - Mensaje informativo */}
          {booking.status === 'CANCELLED' && (
            <div className="flex-1 py-2 sm:py-2.5 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 rounded-lg font-medium text-center min-h-[40px] sm:min-h-[44px] flex items-center justify-center text-xs sm:text-sm">
              Cancelada
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
