import { api } from './api';
import { MOCK_EXPERIENCES } from './mockData';

// Types
export type ExperienceCategory = 'TOUR' | 'TALLER' | 'DEGUSTACION' | 'CLASE' | 'VISITA';
export type BookingStatus = 'PENDING_PAYMENT' | 'PAYMENT_FAILED' | 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED';

export interface Experience {
  id: string;
  hostId: string;
  title: string;
  description: string;
  imageUrl: string | null;
  images: string[];
  category: ExperienceCategory;
  price: string;
  duration: number;
  maxCapacity: number;
  location: string;
  latitude: number | null;
  longitude: number | null;
  includes: string[];
  languages: string[];
  isActive: boolean;
  rating: number;
  reviewCount: number;
  createdAt: string;
  host: {
    id: string;
    nombre: string;
    apellido: string;
    avatar: string | null;
  };
  _count?: {
    reviews: number;
    bookings: number;
  };
}

export interface TimeSlot {
  id: string;
  experienceId: string;
  date: string;
  startTime: string;
  endTime: string;
  capacity: number;
  bookedCount: number;
  isAvailable: boolean;
  availableSpots?: number;
}

export interface Booking {
  id: string;
  userId: string;
  experienceId: string;
  timeSlotId: string;
  status: BookingStatus;
  guestCount: number;
  totalPrice: string;
  specialRequests: string | null;
  stripePaymentId: string | null;
  confirmedAt: string | null;
  cancelledAt: string | null;
  createdAt: string;
  experience: Experience;
  timeSlot: TimeSlot;
  user?: {
    id: string;
    nombre: string;
    apellido: string;
    email: string;
    avatar?: string;
  };
}

export interface ExperienceReview {
  id: string;
  userId: string;
  experienceId: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  user: {
    id: string;
    nombre: string;
    avatar: string | null;
  };
}

export interface ExperienceQuery {
  category?: ExperienceCategory;
  minPrice?: number;
  maxPrice?: number;
  date?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface BookingQuery {
  status?: BookingStatus;
  page?: number;
  limit?: number;
}

export interface CreateBookingInput {
  experienceId: string;
  timeSlotId: string;
  guestCount: number;
  specialRequests?: string;
}

export interface CreateExperienceInput {
  title: string;
  description: string;
  imageUrl?: string;
  images?: string[];
  category: ExperienceCategory;
  price: number;
  duration: number;
  maxCapacity: number;
  location: string;
  latitude?: number;
  longitude?: number;
  includes?: string[];
  languages?: string[];
}

// API Functions
export async function getExperiences(query: ExperienceQuery = {}) {
  try {
    const params = new URLSearchParams();
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined) params.append(key, String(value));
    });

    const response = await api.get<{
      experiences: Experience[];
      pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
      };
    }>(`/bookings/experiences?${params}`);
    return response;
  } catch {
    // Return mock data when backend is unavailable
    const { page = 1, limit = 10, category, search } = query;
    let filtered = MOCK_EXPERIENCES.map(exp => ({
      id: exp.id,
      hostId: exp.host.id,
      title: exp.title,
      description: exp.description,
      imageUrl: exp.imageUrl,
      images: [exp.imageUrl],
      category: 'TOUR' as ExperienceCategory,
      price: String(exp.price),
      duration: parseInt(exp.duration) * 60 || 120,
      maxCapacity: exp.maxGuests,
      location: exp.location,
      latitude: null,
      longitude: null,
      includes: ['Guia local', 'Degustacion', 'Transporte'],
      languages: ['Espanol', 'Ingles'],
      isActive: true,
      rating: exp.rating,
      reviewCount: exp.reviewCount,
      createdAt: new Date().toISOString(),
      host: {
        id: exp.host.id,
        nombre: exp.host.nombre,
        apellido: exp.host.apellido || '',
        avatar: exp.host.avatar,
      },
    }));

    if (category) {
      filtered = filtered.filter(e => e.category === category);
    }
    if (search) {
      const s = search.toLowerCase();
      filtered = filtered.filter(e =>
        e.title.toLowerCase().includes(s) ||
        e.description.toLowerCase().includes(s)
      );
    }

    const start = (page - 1) * limit;
    const paginated = filtered.slice(start, start + limit);

    return {
      experiences: paginated,
      pagination: {
        page,
        limit,
        total: filtered.length,
        totalPages: Math.ceil(filtered.length / limit),
      },
    };
  }
}

export async function getExperience(id: string) {
  try {
    const response = await api.get<Experience & { reviews: ExperienceReview[] }>(`/bookings/experiences/${id}`);
    return response;
  } catch {
    // Return mock data when backend is unavailable
    const mockExp = MOCK_EXPERIENCES.find(e => e.id === id);
    if (!mockExp) {
      throw new Error('Experience not found');
    }

    return {
      id: mockExp.id,
      hostId: mockExp.host.id,
      title: mockExp.title,
      description: mockExp.description,
      imageUrl: mockExp.imageUrl,
      images: [mockExp.imageUrl],
      category: 'TOUR' as ExperienceCategory,
      price: String(mockExp.price),
      duration: parseInt(mockExp.duration) * 60 || 120,
      maxCapacity: mockExp.maxGuests,
      location: mockExp.location,
      latitude: 17.0732,
      longitude: -96.7266,
      includes: ['Guía local certificado', 'Degustación de productos locales', 'Transporte incluido', 'Seguro de viaje'],
      languages: ['Español', 'Inglés'],
      isActive: true,
      rating: mockExp.rating,
      reviewCount: mockExp.reviewCount,
      createdAt: new Date().toISOString(),
      host: {
        id: mockExp.host.id,
        nombre: mockExp.host.nombre,
        apellido: mockExp.host.apellido || '',
        avatar: mockExp.host.avatar,
      },
      reviews: [
        {
          id: 'review_1',
          userId: 'user_1',
          experienceId: mockExp.id,
          rating: 5,
          comment: '¡Increíble experiencia! El guía fue muy amable y conocedor.',
          createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
          user: {
            id: 'user_1',
            nombre: 'María',
            avatar: 'https://randomuser.me/api/portraits/women/44.jpg',
          },
        },
        {
          id: 'review_2',
          userId: 'user_2',
          experienceId: mockExp.id,
          rating: 4,
          comment: 'Muy buena experiencia, recomendado para familias.',
          createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          user: {
            id: 'user_2',
            nombre: 'Carlos',
            avatar: 'https://randomuser.me/api/portraits/men/32.jpg',
          },
        },
      ],
    };
  }
}

export async function createExperience(data: CreateExperienceInput) {
  const response = await api.post<Experience>('/bookings/experiences', data);
  return response;
}

export async function updateExperience(id: string, data: Partial<CreateExperienceInput>) {
  const response = await api.put<Experience>(`/bookings/experiences/${id}`, data);
  return response;
}

export async function deleteExperience(id: string) {
  const response = await api.delete<{ message: string }>(`/bookings/experiences/${id}`);
  return response;
}

// Time Slots
export async function getTimeSlots(experienceId: string, startDate: string, endDate?: string) {
  try {
    const params = new URLSearchParams({ startDate });
    if (endDate) params.append('endDate', endDate);

    const response = await api.get<TimeSlot[]>(`/bookings/experiences/${experienceId}/slots?${params}`);
    return response;
  } catch {
    // Return mock time slots
    const start = new Date(startDate);
    const slots: TimeSlot[] = [];

    // Generate slots for 7 days
    for (let day = 0; day < 7; day++) {
      const slotDate = new Date(start);
      slotDate.setDate(start.getDate() + day);
      const dateStr = slotDate.toISOString().split('T')[0];

      // Morning slot
      slots.push({
        id: `slot_${experienceId}_${day}_morning`,
        experienceId,
        date: dateStr,
        startTime: '09:00',
        endTime: '12:00',
        capacity: 10,
        bookedCount: Math.floor(Math.random() * 5),
        isAvailable: true,
        availableSpots: 10 - Math.floor(Math.random() * 5),
      });

      // Afternoon slot
      slots.push({
        id: `slot_${experienceId}_${day}_afternoon`,
        experienceId,
        date: dateStr,
        startTime: '15:00',
        endTime: '18:00',
        capacity: 10,
        bookedCount: Math.floor(Math.random() * 5),
        isAvailable: true,
        availableSpots: 10 - Math.floor(Math.random() * 5),
      });
    }

    return slots;
  }
}

export async function createTimeSlots(experienceId: string, slots: Array<{
  date: string;
  startTime: string;
  endTime: string;
  capacity?: number;
}>) {
  const response = await api.post<{ created: number }>(`/bookings/experiences/${experienceId}/slots`, { slots });
  return response;
}

export async function deleteTimeSlot(slotId: string) {
  const response = await api.delete<{ message: string }>(`/bookings/slots/${slotId}`);
  return response;
}

// Bookings
const BOOKINGS_STORAGE_KEY = 'guelaguetza_bookings';

function getMockBookings(): Booking[] {
  try {
    const stored = localStorage.getItem(BOOKINGS_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveMockBookings(bookings: Booking[]) {
  localStorage.setItem(BOOKINGS_STORAGE_KEY, JSON.stringify(bookings));
}

export async function getMyBookings(query: BookingQuery = {}) {
  try {
    const params = new URLSearchParams();
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined) params.append(key, String(value));
    });

    const response = await api.get<{
      bookings: Booking[];
      pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
      };
    }>(`/bookings/bookings?${params}`);
    return response;
  } catch {
    // Return mock bookings from localStorage
    const { page = 1, limit = 10, status } = query;
    let bookings = getMockBookings();

    if (status) {
      bookings = bookings.filter(b => b.status === status);
    }

    const start = (page - 1) * limit;
    const paginated = bookings.slice(start, start + limit);

    return {
      bookings: paginated,
      pagination: {
        page,
        limit,
        total: bookings.length,
        totalPages: Math.ceil(bookings.length / limit),
      },
    };
  }
}

export async function getBooking(id: string) {
  const response = await api.get<Booking>(`/bookings/bookings/${id}`);
  return response;
}

export async function createBooking(data: CreateBookingInput) {
  try {
    const response = await api.post<{
      booking: Booking;
      clientSecret: string | null;
    }>('/bookings/bookings', data);
    return response;
  } catch {
    // Create mock booking and save to localStorage
    const mockExp = MOCK_EXPERIENCES.find(e => e.id === data.experienceId);
    if (!mockExp) {
      throw new Error('Experience not found');
    }

    const bookingId = `booking_${Date.now()}`;
    const totalPrice = parseFloat(String(mockExp.price)) * data.guestCount;

    const newBooking: Booking = {
      id: bookingId,
      userId: 'mock_user',
      experienceId: data.experienceId,
      timeSlotId: data.timeSlotId,
      status: 'CONFIRMED',
      guestCount: data.guestCount,
      totalPrice: String(totalPrice),
      specialRequests: data.specialRequests || null,
      stripePaymentId: null,
      confirmedAt: new Date().toISOString(),
      cancelledAt: null,
      createdAt: new Date().toISOString(),
      experience: {
        id: mockExp.id,
        hostId: mockExp.host.id,
        title: mockExp.title,
        description: mockExp.description,
        imageUrl: mockExp.imageUrl,
        images: [mockExp.imageUrl],
        category: 'TOUR' as ExperienceCategory,
        price: String(mockExp.price),
        duration: parseInt(mockExp.duration) * 60 || 120,
        maxCapacity: mockExp.maxGuests,
        location: mockExp.location,
        latitude: null,
        longitude: null,
        includes: [],
        languages: ['Español'],
        isActive: true,
        rating: mockExp.rating,
        reviewCount: mockExp.reviewCount,
        createdAt: new Date().toISOString(),
        host: {
          id: mockExp.host.id,
          nombre: mockExp.host.nombre,
          apellido: mockExp.host.apellido || '',
          avatar: mockExp.host.avatar,
        },
      },
      timeSlot: {
        id: data.timeSlotId,
        experienceId: data.experienceId,
        date: data.timeSlotId.includes('_') ? new Date().toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        startTime: data.timeSlotId.includes('morning') ? '09:00' : '15:00',
        endTime: data.timeSlotId.includes('morning') ? '12:00' : '18:00',
        capacity: 10,
        bookedCount: 1,
        isAvailable: true,
      },
    };

    // Save to localStorage
    const existingBookings = getMockBookings();
    existingBookings.unshift(newBooking);
    saveMockBookings(existingBookings);

    return {
      booking: newBooking,
      clientSecret: null,
    };
  }
}

export async function confirmBooking(id: string) {
  const response = await api.post<Booking>(`/bookings/bookings/${id}/confirm`, {});
  return response;
}

export async function cancelBooking(id: string) {
  const response = await api.post<Booking>(`/bookings/bookings/${id}/cancel`, {});
  return response;
}

export async function completeBooking(id: string) {
  const response = await api.post<Booking>(`/bookings/bookings/${id}/complete`, {});
  return response;
}

export async function retryBookingPayment(id: string) {
  try {
    // En el futuro, esto llamará al backend para reintentar el pago
    // Por ahora, creamos un nuevo intento de pago con Stripe
    const response = await api.post<{
      booking: Booking;
      clientSecret: string | null;
      paymentIntentId?: string;
    }>(`/bookings/bookings/${id}/retry-payment`, {});
    return response;
  } catch (error) {
    // Si el backend no tiene el endpoint aún, devolvemos un error descriptivo
    throw new Error('El sistema de reintentos de pago no está disponible. Por favor, crea una nueva reservación.');
  }
}

// Reviews
export async function createExperienceReview(experienceId: string, data: { rating: number; comment?: string }) {
  const response = await api.post<ExperienceReview>(`/bookings/experiences/${experienceId}/reviews`, data);
  return response;
}

// Host Functions
export async function getHostExperiences() {
  const response = await api.get<Experience[]>('/bookings/host/experiences');
  return response;
}

export async function getHostBookings(query: BookingQuery = {}) {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined) params.append(key, String(value));
  });

  const response = await api.get<{
    bookings: Booking[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }>(`/bookings/host/bookings?${params}`);
  return response;
}

// Helpers
export const CATEGORY_LABELS: Record<ExperienceCategory, string> = {
  TOUR: 'Tour',
  TALLER: 'Taller',
  DEGUSTACION: 'Degustacion',
  CLASE: 'Clase',
  VISITA: 'Visita',
};

export const STATUS_LABELS: Record<BookingStatus, string> = {
  PENDING_PAYMENT: 'Procesando pago',
  PAYMENT_FAILED: 'Error en pago',
  PENDING: 'Pendiente',
  CONFIRMED: 'Confirmada',
  CANCELLED: 'Cancelada',
  COMPLETED: 'Completada',
};

export const STATUS_COLORS: Record<BookingStatus, string> = {
  PENDING_PAYMENT: 'amber',
  PAYMENT_FAILED: 'red',
  PENDING: 'blue',
  CONFIRMED: 'green',
  CANCELLED: 'gray',
  COMPLETED: 'emerald',
};

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
}

export function formatPrice(price: string | number): string {
  const numPrice = typeof price === 'string' ? parseFloat(price) : price;
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
  }).format(numPrice);
}
