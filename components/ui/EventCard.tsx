import React from 'react';
import { Calendar, MapPin, Users, Clock, Ticket, Star, CalendarPlus, AlertCircle } from 'lucide-react';
import {
  Event,
  formatEventDate,
  formatEventTime,
  getCategoryLabel,
  getCategoryColor,
  getCategoryIcon,
  getTicketStatus,
  getTicketStatusLabel,
  getTicketStatusColor,
  generateGoogleCalendarLink,
} from '../../services/events';

interface EventCardProps {
  event: Event;
  onClick?: () => void;
  compact?: boolean;
}

// Expand common abbreviations for tourists
const expandLocation = (location: string): string => {
  const abbreviations: Record<string, string> = {
    'CCCO': 'Centro Cultural y de Convenciones de Oaxaca',
    'CASA': 'Centro de las Artes de San Agustín',
    'MUPO': 'Museo de los Pintores Oaxaqueños',
    'IAGO': 'Instituto de Artes Gráficas de Oaxaca',
    'MACO': 'Museo de Arte Contemporáneo de Oaxaca',
    'FAHHO': 'Fundación Alfredo Harp Helú Oaxaca',
    'UABJO': 'Universidad Autónoma Benito Juárez de Oaxaca',
  };

  for (const [abbr, full] of Object.entries(abbreviations)) {
    if (location.includes(abbr)) {
      return location.replace(abbr, full);
    }
  }
  return location;
};

// Default images by category for events without images
const getCategoryDefaultImage = (category: string): string => {
  const images: Record<string, string> = {
    'DANZA': 'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=400&q=80',
    'MUSICA': 'https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=400&q=80',
    'GASTRONOMIA': 'https://images.unsplash.com/photo-1613514785940-daed07799d9b?w=400&q=80',
    'ARTESANIA': 'https://images.unsplash.com/photo-1604176424472-17cd740f74e9?w=400&q=80',
    'CEREMONIA': 'https://images.unsplash.com/photo-1518998053901-5348d3961a04?w=400&q=80',
    'DESFILE': 'https://images.unsplash.com/photo-1569974507005-6dc61f97fb5c?w=400&q=80',
    'OTRO': 'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=400&q=80',
  };
  return images[category] || images['OTRO'];
};

const EventCard: React.FC<EventCardProps> = ({
  event,
  onClick,
  compact = false,
}) => {
  const categoryColor = getCategoryColor(event.category);
  const imageUrl = event.imageUrl || getCategoryDefaultImage(event.category);
  const ticketStatus = getTicketStatus(event);
  const statusColors = getTicketStatusColor(ticketStatus);

  if (compact) {
    return (
      <button
        onClick={onClick}
        className="w-full flex gap-3 p-2 bg-white dark:bg-gray-800 rounded-xl shadow-sm hover:shadow-md transition-all text-left overflow-hidden"
      >
        {/* Thumbnail Image */}
        <div className="relative flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden">
          <img
            src={imageUrl}
            alt={event.title}
            className="w-full h-full object-cover"
          />
          {/* Category overlay */}
          <div
            className="absolute bottom-0 left-0 right-0 py-0.5 text-center text-[10px] font-medium text-white"
            style={{ backgroundColor: categoryColor }}
          >
            {getCategoryIcon(event.category)} {getCategoryLabel(event.category)}
          </div>
          {/* Official badge */}
          {event.isOfficial && (
            <div className="absolute top-1 right-1">
              <Star size={14} className="text-oaxaca-yellow fill-oaxaca-yellow drop-shadow" />
            </div>
          )}
          {/* Sold out overlay */}
          {ticketStatus === 'SOLD_OUT' && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <span className="text-white text-[10px] font-bold bg-red-600 px-2 py-0.5 rounded">AGOTADO</span>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0 py-1">
          <h3 className="font-semibold text-gray-900 dark:text-white line-clamp-1">{event.title}</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1 mt-1">
            <Clock size={12} className="flex-shrink-0" />
            {formatEventTime(event.startDate)}
            <span className="mx-1">•</span>
            <MapPin size={12} className="flex-shrink-0" />
            <span className="truncate">{event.location}</span>
          </p>
          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center gap-1 text-xs text-gray-400">
              <Users size={12} />
              <span>{event.rsvpCount} asistirán</span>
            </div>
            {/* Ticket status badge */}
            {event.isOfficial ? (
              ticketStatus === 'SOLD_OUT' ? (
                <span className="px-2 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-[10px] font-bold rounded-full">
                  Agotado
                </span>
              ) : ticketStatus === 'FEW_LEFT' ? (
                <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 text-[10px] font-bold rounded-full flex items-center gap-1 animate-pulse">
                  <AlertCircle size={10} />
                  Últimos!
                </span>
              ) : (
                <span className="px-2 py-0.5 bg-oaxaca-pink text-white text-[10px] font-bold rounded-full flex items-center gap-1">
                  <Ticket size={10} />
                  Boletos
                </span>
              )
            ) : (
              <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-[10px] font-medium rounded-full">
                Entrada libre
              </span>
            )}
          </div>
        </div>
      </button>
    );
  }

  return (
    <button
      onClick={onClick}
      className="w-full bg-white dark:bg-gray-800 rounded-2xl shadow-sm hover:shadow-md transition-all overflow-hidden text-left"
    >
      {/* Image - Always show image now */}
      <div className="relative h-40 w-full">
        <img
          src={imageUrl}
          alt={event.title}
          className="w-full h-full object-cover"
        />
        {/* Category badge */}
        <div
          className="absolute top-3 left-3 px-3 py-1 rounded-full text-white text-xs font-medium"
          style={{ backgroundColor: categoryColor }}
        >
          {getCategoryIcon(event.category)} {getCategoryLabel(event.category)}
        </div>
        {/* Official badge */}
        {event.isOfficial && (
          <div className="absolute top-3 right-3 px-2 py-1 bg-oaxaca-pink text-white text-xs font-medium rounded-full flex items-center gap-1">
            <Star size={12} className="fill-white" />
            Oficial
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="font-bold text-lg text-gray-900 dark:text-white line-clamp-2">
          {event.title}
        </h3>

        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 line-clamp-2">
          {event.description}
        </p>

        <div className="mt-4 space-y-2">
          {/* Date */}
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
            <Calendar size={16} className="text-oaxaca-pink flex-shrink-0" />
            <span>{formatEventDate(event.startDate)}</span>
            <span className="text-gray-400">|</span>
            <Clock size={16} className="text-oaxaca-pink flex-shrink-0" />
            <span>{formatEventTime(event.startDate)}</span>
          </div>

          {/* Location - expanded for tourists */}
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
            <MapPin size={16} className="text-oaxaca-pink flex-shrink-0" />
            <span className="line-clamp-1">{expandLocation(event.location)}</span>
          </div>
        </div>

        {/* Ticket Status Banner */}
        {event.isOfficial && ticketStatus !== 'AVAILABLE' && (
          <div className={`flex items-center justify-center gap-2 py-2 ${statusColors.bg} ${statusColors.text}`}>
            {ticketStatus === 'SOLD_OUT' && <AlertCircle size={14} />}
            {ticketStatus === 'FEW_LEFT' && <AlertCircle size={14} className="animate-pulse" />}
            <span className="text-xs font-semibold">{getTicketStatusLabel(ticketStatus)}</span>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 text-sm text-gray-500">
              <Users size={16} />
              <span>{event.rsvpCount}</span>
            </div>
            {/* Add to Calendar button */}
            <a
              href={generateGoogleCalendarLink(event)}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-1 px-2 py-1 text-xs text-gray-500 hover:text-oaxaca-purple hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-full transition"
              title="Añadir a Google Calendar"
            >
              <CalendarPlus size={14} />
              <span className="hidden sm:inline">Calendario</span>
            </a>
          </div>

          {event.hasRSVP ? (
            <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 text-xs font-medium rounded-full">
              Confirmado
            </span>
          ) : event.isOfficial ? (
            ticketStatus === 'SOLD_OUT' ? (
              <span className="px-3 py-1.5 bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 text-xs font-medium rounded-full cursor-not-allowed">
                Agotado
              </span>
            ) : (
              <span className={`px-3 py-1.5 text-white text-xs font-bold rounded-full flex items-center gap-1 shadow-sm ${
                ticketStatus === 'FEW_LEFT' ? 'bg-amber-500 hover:bg-amber-600 animate-pulse' : 'bg-oaxaca-pink hover:bg-oaxaca-pink/90'
              }`}>
                <Ticket size={12} />
                {ticketStatus === 'FEW_LEFT' ? 'Últimos boletos!' : 'Obtener boletos'}
              </span>
            )
          ) : (
            <span className="px-3 py-1.5 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs font-medium rounded-full">
              Entrada libre
            </span>
          )}
        </div>
      </div>
    </button>
  );
};

export default EventCard;
