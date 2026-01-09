// Events Service - API calls
import { MOCK_EVENTS } from './mockData';

const API_BASE = (import.meta as { env: { VITE_API_URL?: string } }).env.VITE_API_URL || 'http://localhost:3000/api';

export type EventCategory =
  | 'DANZA'
  | 'MUSICA'
  | 'GASTRONOMIA'
  | 'ARTESANIA'
  | 'CEREMONIA'
  | 'DESFILE'
  | 'OTRO';

export type TicketStatus = 'AVAILABLE' | 'FEW_LEFT' | 'SOLD_OUT' | 'FREE';

export interface Event {
  id: string;
  title: string;
  description: string;
  imageUrl: string | null;
  location: string;
  latitude: number | null;
  longitude: number | null;
  startDate: string;
  endDate: string | null;
  category: EventCategory;
  isOfficial: boolean;
  rsvpCount: number;
  hasRSVP?: boolean;
  hasReminder?: boolean;
  ticketStatus?: TicketStatus;
  maxCapacity?: number;
}

export interface EventDetail extends Event {
  createdAt: string;
  updatedAt: string;
}

export interface EventsResponse {
  events: Event[];
  hasMore: boolean;
  total: number;
}

export interface MyRSVPsResponse {
  events: Event[];
  total: number;
}

// Get events with filters
export async function getEvents(
  options: {
    category?: EventCategory;
    startDate?: Date;
    endDate?: Date;
    page?: number;
    limit?: number;
  } = {},
  token?: string
): Promise<EventsResponse> {
  const { category, startDate, endDate, page = 1, limit = 20 } = options;

  try {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });

    if (category) params.append('category', category);
    if (startDate) params.append('startDate', startDate.toISOString());
    if (endDate) params.append('endDate', endDate.toISOString());

    const headers: HeadersInit = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE}/events?${params}`, { headers });

    if (!response.ok) {
      throw new Error('Error al obtener eventos');
    }

    const data = await response.json();
    return data.data;
  } catch {
    // Return mock data when backend is unavailable
    let filteredEvents = [...MOCK_EVENTS];

    if (category) {
      filteredEvents = filteredEvents.filter(e => e.category === category);
    }

    const start = (page - 1) * limit;
    const paginatedEvents = filteredEvents.slice(start, start + limit);

    return {
      events: paginatedEvents,
      hasMore: start + limit < filteredEvents.length,
      total: filteredEvents.length,
    };
  }
}

// Get single event
export async function getEvent(eventId: string, token?: string): Promise<EventDetail> {
  try {
    const headers: HeadersInit = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE}/events/${eventId}`, { headers });

    if (!response.ok) {
      throw new Error('Evento no encontrado');
    }

    const data = await response.json();
    return data.data;
  } catch {
    // Return mock data when backend is unavailable
    const event = MOCK_EVENTS.find(e => e.id === eventId);
    if (event) {
      return {
        ...event,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    }
    throw new Error('Evento no encontrado');
  }
}

// Create RSVP
export async function createRSVP(eventId: string, token: string): Promise<void> {
  const response = await fetch(`${API_BASE}/events/${eventId}/rsvp`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Error al confirmar asistencia');
  }
}

// Delete RSVP
export async function deleteRSVP(eventId: string, token: string): Promise<void> {
  const response = await fetch(`${API_BASE}/events/${eventId}/rsvp`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error('Error al cancelar asistencia');
  }
}

// Create reminder
export async function createReminder(
  eventId: string,
  remindAt: Date,
  token: string
): Promise<void> {
  const response = await fetch(`${API_BASE}/events/${eventId}/reminder`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ remindAt: remindAt.toISOString() }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Error al crear recordatorio');
  }
}

// Delete reminder
export async function deleteReminder(eventId: string, token: string): Promise<void> {
  const response = await fetch(`${API_BASE}/events/${eventId}/reminder`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error('Error al eliminar recordatorio');
  }
}

// Get user's RSVPd events
export async function getMyRSVPs(token: string): Promise<MyRSVPsResponse> {
  const response = await fetch(`${API_BASE}/events/my-rsvps`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error('Error al obtener mis eventos');
  }

  const data = await response.json();
  return data.data;
}

// Format event date
export function formatEventDate(date: string): string {
  return new Date(date).toLocaleDateString('es-MX', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

// Format event time
export function formatEventTime(date: string): string {
  return new Date(date).toLocaleTimeString('es-MX', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

// Get category label
export function getCategoryLabel(category: EventCategory): string {
  const labels: Record<EventCategory, string> = {
    DANZA: 'Danza',
    MUSICA: 'Música',
    GASTRONOMIA: 'Gastronomía',
    ARTESANIA: 'Artesanía',
    CEREMONIA: 'Ceremonia',
    DESFILE: 'Desfile',
    OTRO: 'Otro',
  };
  return labels[category] || category;
}

// Get category color
export function getCategoryColor(category: EventCategory): string {
  const colors: Record<EventCategory, string> = {
    DANZA: '#E91E63',
    MUSICA: '#9C27B0',
    GASTRONOMIA: '#FF9800',
    ARTESANIA: '#4CAF50',
    CEREMONIA: '#3F51B5',
    DESFILE: '#F44336',
    OTRO: '#607D8B',
  };
  return colors[category] || '#607D8B';
}

// Get category icon
export function getCategoryIcon(category: EventCategory): string {
  const icons: Record<EventCategory, string> = {
    DANZA: '💃',
    MUSICA: '🎵',
    GASTRONOMIA: '🍽️',
    ARTESANIA: '🎨',
    CEREMONIA: '🎭',
    DESFILE: '🎪',
    OTRO: '📅',
  };
  return icons[category] || '📅';
}

// Get ticket status for an event (simulated based on rsvpCount for official events)
export function getTicketStatus(event: Event): TicketStatus {
  if (event.ticketStatus) return event.ticketStatus;
  if (!event.isOfficial) return 'FREE';

  // Simulate availability based on rsvpCount
  const capacity = event.maxCapacity || 500;
  const occupancyRate = event.rsvpCount / capacity;

  if (occupancyRate >= 0.95) return 'SOLD_OUT';
  if (occupancyRate >= 0.8) return 'FEW_LEFT';
  return 'AVAILABLE';
}

// Get ticket status label
export function getTicketStatusLabel(status: TicketStatus): string {
  const labels: Record<TicketStatus, string> = {
    AVAILABLE: 'Disponible',
    FEW_LEFT: 'Últimos boletos',
    SOLD_OUT: 'Agotado',
    FREE: 'Entrada libre',
  };
  return labels[status];
}

// Get ticket status color
export function getTicketStatusColor(status: TicketStatus): { bg: string; text: string } {
  const colors: Record<TicketStatus, { bg: string; text: string }> = {
    AVAILABLE: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-600 dark:text-green-400' },
    FEW_LEFT: { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-600 dark:text-amber-400' },
    SOLD_OUT: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-600 dark:text-red-400' },
    FREE: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-600 dark:text-blue-400' },
  };
  return colors[status];
}

// Generate Google Calendar link
export function generateGoogleCalendarLink(event: Event): string {
  const startDate = new Date(event.startDate);
  const endDate = event.endDate ? new Date(event.endDate) : new Date(startDate.getTime() + 2 * 60 * 60 * 1000); // Default 2 hours

  const formatDate = (date: Date) => date.toISOString().replace(/-|:|\.\d+/g, '').slice(0, 15) + 'Z';

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.title,
    dates: `${formatDate(startDate)}/${formatDate(endDate)}`,
    details: event.description,
    location: event.location,
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

// Generate iCal/ICS file content
export function generateICalContent(event: Event): string {
  const startDate = new Date(event.startDate);
  const endDate = event.endDate ? new Date(event.endDate) : new Date(startDate.getTime() + 2 * 60 * 60 * 1000);

  const formatDate = (date: Date) => date.toISOString().replace(/-|:|\.\d+/g, '').slice(0, 15) + 'Z';

  return `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Guelaguetza Connect//ES
BEGIN:VEVENT
UID:${event.id}@guelaguetza-connect
DTSTAMP:${formatDate(new Date())}
DTSTART:${formatDate(startDate)}
DTEND:${formatDate(endDate)}
SUMMARY:${event.title}
DESCRIPTION:${event.description.replace(/\n/g, '\\n')}
LOCATION:${event.location}
END:VEVENT
END:VCALENDAR`;
}

// Download iCal file
export function downloadICalFile(event: Event): void {
  const content = generateICalContent(event);
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = `${event.title.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.ics`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
