import React, { useState, useEffect } from 'react';
import { ArrowLeft, Calendar, Clock, MapPin, Users, ExternalLink, Loader2, Share2 } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useAuth } from '../contexts/AuthContext';
import RSVPButton from './ui/RSVPButton';
import {
  getEvent,
  EventDetail,
  formatEventDate,
  formatEventTime,
  getCategoryLabel,
  getCategoryColor,
  getCategoryIcon,
} from '../services/events';

interface EventDetailViewProps {
  eventId: string;
  onBack: () => void;
}

// Custom event marker icon
const createEventIcon = (color: string) => L.divIcon({
  className: 'custom-event-icon',
  html: `
    <div style="
      background-color: ${color};
      width: 36px;
      height: 36px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 3px solid white;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    ">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
        <circle cx="12" cy="10" r="3"></circle>
      </svg>
    </div>
  `,
  iconSize: [36, 36],
  iconAnchor: [18, 36],
  popupAnchor: [0, -36],
});

const EventDetailView: React.FC<EventDetailViewProps> = ({
  eventId,
  onBack,
}) => {
  const { token, isAuthenticated } = useAuth();
  const [event, setEvent] = useState<EventDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadEvent();
  }, [eventId, token]);

  const loadEvent = async () => {
    setLoading(true);
    try {
      const data = await getEvent(eventId, token || undefined);
      setEvent(data);
    } catch (error) {
      console.error('Error loading event:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    if (!event) return;

    const shareData = {
      title: event.title,
      text: `${event.title} - ${formatEventDate(event.startDate)} en ${event.location}`,
      url: window.location.href,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch {
        // User cancelled or error
      }
    } else {
      // Fallback: copy to clipboard
      await navigator.clipboard.writeText(`${shareData.text}\n${shareData.url}`);
    }
  };

  const openInMaps = () => {
    if (!event || !event.latitude || !event.longitude) return;

    const url = `https://www.google.com/maps/search/?api=1&query=${event.latitude},${event.longitude}`;
    window.open(url, '_blank');
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <Loader2 className="animate-spin text-oaxaca-pink" size={40} />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900 p-6">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
          Evento no encontrado
        </h2>
        <button
          onClick={onBack}
          className="text-oaxaca-pink font-medium"
        >
          Volver
        </button>
      </div>
    );
  }

  const categoryColor = getCategoryColor(event.category);

  return (
    <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* Header Image */}
      <div className="relative">
        {event.imageUrl ? (
          <img
            src={event.imageUrl}
            alt={event.title}
            className="w-full h-56 object-cover"
          />
        ) : (
          <div
            className="w-full h-56 flex items-center justify-center text-6xl"
            style={{ backgroundColor: `${categoryColor}30` }}
          >
            {getCategoryIcon(event.category)}
          </div>
        )}

        {/* Back button */}
        <button
          onClick={onBack}
          className="absolute top-4 left-4 p-2 bg-white/90 dark:bg-gray-800/90 rounded-full shadow-lg"
        >
          <ArrowLeft size={24} className="text-gray-900 dark:text-white" />
        </button>

        {/* Share button */}
        <button
          onClick={handleShare}
          className="absolute top-4 right-4 p-2 bg-white/90 dark:bg-gray-800/90 rounded-full shadow-lg"
        >
          <Share2 size={24} className="text-gray-900 dark:text-white" />
        </button>

        {/* Category badge */}
        <div
          className="absolute bottom-4 left-4 px-3 py-1 rounded-full text-white text-sm font-medium"
          style={{ backgroundColor: categoryColor }}
        >
          {getCategoryIcon(event.category)} {getCategoryLabel(event.category)}
        </div>

        {/* Official badge */}
        {event.isOfficial && (
          <div className="absolute bottom-4 right-4 px-3 py-1 bg-oaxaca-pink text-white text-sm font-medium rounded-full">
            Evento Oficial
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4 space-y-6">
          {/* Title */}
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {event.title}
            </h1>
            <div className="flex items-center gap-2 mt-2 text-sm text-gray-500">
              <Users size={16} />
              <span>{event.rsvpCount} personas asistirán</span>
            </div>
          </div>

          {/* Date & Time */}
          <div className="flex items-start gap-4 p-4 bg-white dark:bg-gray-800 rounded-xl">
            <div className="p-3 bg-oaxaca-pink/10 rounded-lg">
              <Calendar size={24} className="text-oaxaca-pink" />
            </div>
            <div>
              <p className="font-semibold text-gray-900 dark:text-white capitalize">
                {formatEventDate(event.startDate)}
              </p>
              <p className="text-gray-500 dark:text-gray-400 flex items-center gap-1 mt-1">
                <Clock size={14} />
                {formatEventTime(event.startDate)}
                {event.endDate && ` - ${formatEventTime(event.endDate)}`}
              </p>
            </div>
          </div>

          {/* Location */}
          <div className="flex items-start gap-4 p-4 bg-white dark:bg-gray-800 rounded-xl">
            <div className="p-3 bg-oaxaca-pink/10 rounded-lg">
              <MapPin size={24} className="text-oaxaca-pink" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-gray-900 dark:text-white">
                {event.location}
              </p>
              {event.latitude && event.longitude && (
                <button
                  onClick={openInMaps}
                  className="text-oaxaca-pink text-sm flex items-center gap-1 mt-1 hover:underline"
                >
                  <ExternalLink size={14} />
                  Abrir en Google Maps
                </button>
              )}
            </div>
          </div>

          {/* Description */}
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
              Acerca del evento
            </h2>
            <p className="text-gray-600 dark:text-gray-300 whitespace-pre-line">
              {event.description}
            </p>
          </div>

          {/* Map */}
          {event.latitude && event.longitude && (
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                Ubicación
              </h2>
              <div className="h-48 rounded-xl overflow-hidden">
                <MapContainer
                  center={[event.latitude, event.longitude]}
                  zoom={15}
                  minZoom={12}
                  maxZoom={18}
                  maxBounds={[
                    [16.85, -96.85], // Southwest corner of Oaxaca area
                    [17.25, -96.60], // Northeast corner of Oaxaca area
                  ]}
                  maxBoundsViscosity={1.0}
                  className="h-full w-full"
                  zoomControl={false}
                >
                  <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  />
                  <Marker
                    position={[event.latitude, event.longitude]}
                    icon={createEventIcon(categoryColor)}
                  >
                    <Popup>{event.location}</Popup>
                  </Marker>
                </MapContainer>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* RSVP Button */}
      <div className="p-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
        <RSVPButton
          eventId={event.id}
          hasRSVP={event.hasRSVP || false}
          hasReminder={event.hasReminder}
          eventDate={event.startDate}
          onUpdate={(hasRSVP, hasReminder) => {
            setEvent((prev) =>
              prev ? { ...prev, hasRSVP, hasReminder } : prev
            );
          }}
        />
      </div>
    </div>
  );
};

export default EventDetailView;
