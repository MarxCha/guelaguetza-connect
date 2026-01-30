import React, { useState, useEffect } from 'react';
import {
  ChevronLeft,
  MapPin,
  Star,
  Heart,
  Share2,
  Navigation,
  CheckCircle,
  Clock,
  Camera,
  MessageSquare,
  ExternalLink,
} from 'lucide-react';
import LoadingSpinner from './ui/LoadingSpinner';
import GradientPlaceholder from './ui/GradientPlaceholder';
import {
  getPOI,
  toggleFavorite,
  checkIn,
  createPOIReview,
  PointOfInterest,
  POIReview,
  CATEGORY_LABELS,
  CATEGORY_COLORS,
} from '../services/poi';
import { ViewState } from '../types';

interface POIDetailViewProps {
  poiId: string;
  onNavigate: (view: ViewState, data?: unknown) => void;
  onBack: () => void;
}

export default function POIDetailView({ poiId, onNavigate, onBack }: POIDetailViewProps) {
  const [poi, setPoi] = useState<(PointOfInterest & { reviews: POIReview[] }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFavorite, setIsFavorite] = useState(false);
  const [hasCheckedIn, setHasCheckedIn] = useState(false);
  const [checkingIn, setCheckingIn] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewLoading, setReviewLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'info' | 'reviews'>('info');

  useEffect(() => {
    loadPOI();
  }, [poiId]);

  const loadPOI = async () => {
    try {
      setLoading(true);
      const data = await getPOI(poiId);
      setPoi(data);
      setIsFavorite(data.isFavorite || false);
      setHasCheckedIn(data.hasCheckedIn || false);
    } catch (error) {
      console.error('Error loading POI:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleFavorite = async () => {
    try {
      const result = await toggleFavorite(poiId);
      setIsFavorite(result.isFavorite);
    } catch (error) {
      console.error('Error toggling favorite:', error);
    }
  };

  const handleCheckIn = async () => {
    try {
      setCheckingIn(true);
      await checkIn(poiId);
      setHasCheckedIn(true);
      alert('Check-in exitoso! +10 XP');
    } catch (error: unknown) {
      const err = error as { message?: string };
      alert(err.message || 'Error al hacer check-in');
    } finally {
      setCheckingIn(false);
    }
  };

  const handleShare = async () => {
    try {
      await navigator.share({
        title: poi?.name,
        text: poi?.description,
        url: window.location.href,
      });
    } catch {
      navigator.clipboard.writeText(window.location.href);
    }
  };

  const handleOpenMaps = () => {
    if (poi) {
      const url = `https://www.google.com/maps/dir/?api=1&destination=${poi.latitude},${poi.longitude}`;
      window.open(url, '_blank');
    }
  };

  const handleReview = async () => {
    try {
      setReviewLoading(true);
      await createPOIReview(poiId, {
        rating: reviewRating,
        comment: reviewComment || undefined,
      });
      setShowReviewModal(false);
      setReviewRating(5);
      setReviewComment('');
      loadPOI();
    } catch (error: unknown) {
      const err = error as { message?: string };
      alert(err.message || 'Error al enviar la resena');
    } finally {
      setReviewLoading(false);
    }
  };

  if (loading || !poi) {
    return (
      <div className="flex items-center justify-center h-full bg-white dark:bg-gray-900">
        <LoadingSpinner size="lg" text="Cargando lugar..." />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header Image */}
      <div className="relative h-64">
        {poi.imageUrl ? (
          <img
            src={poi.imageUrl}
            alt={poi.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <GradientPlaceholder variant="community" className="w-full h-full" alt={poi.name} />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/30" />

        {/* Navigation */}
        <div className="absolute top-0 left-0 right-0 p-4 pt-12 flex justify-between">
          <button onClick={onBack} className="p-2 bg-black/30 backdrop-blur-sm rounded-full">
            <ChevronLeft className="w-6 h-6 text-white" />
          </button>
          <div className="flex gap-2">
            <button
              onClick={handleToggleFavorite}
              className="p-2 bg-black/30 backdrop-blur-sm rounded-full"
            >
              <Heart className={`w-6 h-6 ${isFavorite ? 'fill-red-500 text-red-500' : 'text-white'}`} />
            </button>
            <button onClick={handleShare} className="p-2 bg-black/30 backdrop-blur-sm rounded-full">
              <Share2 className="w-6 h-6 text-white" />
            </button>
          </div>
        </div>

        {/* Category badge */}
        <div className="absolute bottom-4 left-4">
          <span
            className="px-3 py-1 text-white text-sm font-medium rounded-full"
            style={{ backgroundColor: CATEGORY_COLORS[poi.category] }}
          >
            {CATEGORY_LABELS[poi.category]}
          </span>
        </div>

        {/* Verified badge */}
        {poi.isVerified && (
          <div className="absolute bottom-4 right-4">
            <span className="px-3 py-1 bg-emerald-500 text-white text-sm font-medium rounded-full flex items-center gap-1">
              <CheckCircle className="w-4 h-4" />
              Verificado
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4">
          {/* Title & Rating */}
          <div className="mb-4">
            <h1 className="text-2xl font-bold text-gray-900">{poi.name}</h1>
            <div className="flex items-center gap-3 mt-2">
              {poi.rating > 0 && (
                <div className="flex items-center gap-1">
                  <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                  <span className="font-medium">{poi.rating.toFixed(1)}</span>
                  <span className="text-gray-500">({poi.reviewCount} resenas)</span>
                </div>
              )}
              {poi._count && (
                <span className="text-gray-500">{poi._count.checkIns} check-ins</span>
              )}
            </div>
          </div>

          {/* Location */}
          <div className="flex items-start gap-2 py-4 border-y">
            <MapPin className="w-5 h-5 text-gray-400 mt-0.5" />
            <div className="flex-1">
              <p className="text-gray-900">{poi.address || 'Sin direccion'}</p>
              <button
                onClick={handleOpenMaps}
                className="text-emerald-600 text-sm flex items-center gap-1 mt-1"
              >
                Abrir en Maps
                <ExternalLink className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b mt-4">
            <button
              onClick={() => setActiveTab('info')}
              className={`flex-1 py-3 text-center font-medium border-b-2 transition-colors ${
                activeTab === 'info'
                  ? 'border-emerald-600 text-emerald-600'
                  : 'border-transparent text-gray-500'
              }`}
            >
              Informacion
            </button>
            <button
              onClick={() => setActiveTab('reviews')}
              className={`flex-1 py-3 text-center font-medium border-b-2 transition-colors ${
                activeTab === 'reviews'
                  ? 'border-emerald-600 text-emerald-600'
                  : 'border-transparent text-gray-500'
              }`}
            >
              Resenas ({poi.reviewCount})
            </button>
          </div>

          {activeTab === 'info' ? (
            <div className="py-4">
              <h3 className="font-semibold text-gray-900 mb-2">Descripcion</h3>
              <p className="text-gray-600 whitespace-pre-line">{poi.description}</p>

              {/* AR Badge if available */}
              {poi.arModelUrl && (
                <div className="mt-4 p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-purple-100 rounded-full">
                      <Camera className="w-6 h-6 text-purple-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-purple-900">Experiencia AR disponible</h4>
                      <p className="text-sm text-purple-600">
                        Usa la camara para ver contenido en realidad aumentada
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="py-4">
              {poi.reviews.length === 0 ? (
                <div className="text-center py-8">
                  <MessageSquare className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                  <p className="text-gray-500">Aun no hay resenas</p>
                  <button
                    onClick={() => setShowReviewModal(true)}
                    className="mt-3 text-emerald-600 font-medium"
                  >
                    Se el primero en resenar
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {poi.reviews.map((review) => (
                    <div key={review.id} className="border-b pb-4">
                      <div className="flex items-center gap-3 mb-2">
                        <img
                          src={review.user.avatar || '/default-avatar.png'}
                          alt={review.user.nombre}
                          className="w-10 h-10 rounded-full"
                        />
                        <div>
                          <p className="font-medium">{review.user.nombre}</p>
                          <div className="flex gap-0.5">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star
                                key={star}
                                className={`w-4 h-4 ${
                                  star <= review.rating
                                    ? 'fill-yellow-400 text-yellow-400'
                                    : 'text-gray-300'
                                }`}
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                      {review.comment && <p className="text-gray-600">{review.comment}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="border-t bg-white p-4 flex gap-3">
        <button
          onClick={handleCheckIn}
          disabled={hasCheckedIn || checkingIn}
          className={`flex-1 py-3 rounded-lg font-medium flex items-center justify-center gap-2 ${
            hasCheckedIn
              ? 'bg-emerald-100 text-emerald-600'
              : 'bg-emerald-600 text-white'
          }`}
        >
          <CheckCircle className="w-5 h-5" />
          {hasCheckedIn ? 'Ya hiciste check-in' : checkingIn ? 'Procesando...' : 'Check-in'}
        </button>
        <button
          onClick={handleOpenMaps}
          className="flex-1 py-3 border-2 border-emerald-600 text-emerald-600 rounded-lg font-medium flex items-center justify-center gap-2"
        >
          <Navigation className="w-5 h-5" />
          Ir aqui
        </button>
      </div>

      {/* Review Modal */}
      {showReviewModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl p-6">
            <h2 className="text-xl font-bold mb-4">Deja tu resena</h2>
            <p className="text-gray-600 mb-4">{poi.name}</p>

            {/* Rating */}
            <div className="flex justify-center gap-2 mb-4">
              {[1, 2, 3, 4, 5].map((star) => (
                <button key={star} onClick={() => setReviewRating(star)}>
                  <Star
                    className={`w-10 h-10 ${
                      star <= reviewRating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
                    }`}
                  />
                </button>
              ))}
            </div>

            {/* Comment */}
            <textarea
              value={reviewComment}
              onChange={(e) => setReviewComment(e.target.value)}
              placeholder="Cuentanos tu experiencia (opcional)"
              className="w-full p-3 border rounded-lg resize-none mb-4"
              rows={4}
            />

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={() => setShowReviewModal(false)}
                className="flex-1 py-3 border rounded-lg font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={handleReview}
                disabled={reviewLoading}
                className="flex-1 py-3 bg-emerald-600 text-white rounded-lg font-medium disabled:opacity-50"
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
