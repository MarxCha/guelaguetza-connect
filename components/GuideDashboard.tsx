import React, { useState } from 'react';
import {
  ArrowLeft,
  Home,
  Compass,
  Users,
  Calendar,
  MessageCircle,
  MapPin,
  Star,
  Clock,
  ChevronRight,
  Plus,
  Bell,
  DollarSign,
  TrendingUp,
  CheckCircle,
  AlertCircle,
  Navigation,
  Phone,
  Camera,
} from 'lucide-react';
import { ViewState } from '../types';
import { useAuth } from '../contexts/AuthContext';
import GradientPlaceholder from './ui/GradientPlaceholder';

interface GuideDashboardProps {
  onBack: () => void;
  onNavigate?: (view: ViewState) => void;
}

const MOCK_TOURS = [
  {
    id: '1',
    title: 'Tour Mezcal Artesanal',
    time: '10:00 AM',
    date: 'Hoy',
    guests: 6,
    maxGuests: 8,
    location: 'Santiago Matatlan',
    status: 'confirmed',
    earnings: 4800,
  },
  {
    id: '2',
    title: 'Clase de Cocina Oaxaquena',
    time: '2:00 PM',
    date: 'Hoy',
    guests: 4,
    maxGuests: 6,
    location: 'Centro Historico',
    status: 'confirmed',
    earnings: 2600,
  },
  {
    id: '3',
    title: 'Recorrido Centro Historico',
    time: '9:00 AM',
    date: 'Manana',
    guests: 8,
    maxGuests: 10,
    location: 'Zocalo de Oaxaca',
    status: 'pending',
    earnings: 3200,
  },
];

const MOCK_MESSAGES = [
  {
    id: '1',
    from: 'Sarah Johnson',
    avatar: 'sarah/100',
    message: 'Hola! Estamos emocionados por el tour de manana...',
    time: '10 min',
    unread: true,
  },
  {
    id: '2',
    from: 'Carlos Rodriguez',
    avatar: 'carlos2/100',
    message: 'Gracias por la experiencia increible!',
    time: '2 hrs',
    unread: false,
  },
  {
    id: '3',
    from: 'Emma Wilson',
    avatar: 'emma/100',
    message: 'Podemos agregar una persona mas al grupo?',
    time: '5 hrs',
    unread: true,
  },
];

const QUICK_ACTIONS = [
  { icon: Plus, label: 'Nueva Experiencia', color: 'bg-purple-500' },
  { icon: Calendar, label: 'Mi Calendario', color: 'bg-blue-500' },
  { icon: MapPin, label: 'Compartir Ubicacion', color: 'bg-green-500' },
  { icon: Camera, label: 'Subir Fotos', color: 'bg-pink-500' },
];

const GuideDashboard: React.FC<GuideDashboardProps> = ({ onBack, onNavigate }) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'tours' | 'messages' | 'stats'>('tours');

  const todayEarnings = MOCK_TOURS.filter(t => t.date === 'Hoy').reduce((acc, t) => acc + t.earnings, 0);
  const totalGuests = MOCK_TOURS.filter(t => t.date === 'Hoy').reduce((acc, t) => acc + t.guests, 0);

  return (
    <div className="h-full bg-gray-50 dark:bg-gray-950 overflow-y-auto">
      {/* Header */}
      <div className="bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-600 text-white">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <button
                onClick={onBack}
                className="p-2 hover:bg-white/10 rounded-full transition"
              >
                <ArrowLeft size={20} />
              </button>
              <div>
                <h1 className="font-bold text-xl">Panel de Guia</h1>
                <p className="text-xs text-white/70">Bienvenido, {user?.nombre || 'Guia'}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button className="p-2 hover:bg-white/10 rounded-full transition relative">
                <Bell size={18} />
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
              </button>
              {onNavigate && (
                <button
                  onClick={() => onNavigate(ViewState.HOME)}
                  className="p-2 hover:bg-white/10 rounded-full transition"
                >
                  <Home size={18} />
                </button>
              )}
            </div>
          </div>

          {/* Today's Stats */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="bg-white/10 backdrop-blur rounded-xl p-3 text-center">
              <Calendar size={20} className="mx-auto mb-1" />
              <div className="text-xl font-bold">{MOCK_TOURS.filter(t => t.date === 'Hoy').length}</div>
              <div className="text-xs text-white/70">Tours hoy</div>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-xl p-3 text-center">
              <Users size={20} className="mx-auto mb-1" />
              <div className="text-xl font-bold">{totalGuests}</div>
              <div className="text-xs text-white/70">Visitantes</div>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-xl p-3 text-center">
              <DollarSign size={20} className="mx-auto mb-1" />
              <div className="text-xl font-bold">${(todayEarnings / 1000).toFixed(1)}k</div>
              <div className="text-xs text-white/70">Ganancias</div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-2">
            {(['tours', 'messages', 'stats'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${
                  activeTab === tab
                    ? 'bg-white text-teal-600'
                    : 'bg-white/20 hover:bg-white/30'
                }`}
              >
                {tab === 'tours' ? 'Mis Tours' : tab === 'messages' ? 'Mensajes' : 'Estadisticas'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Quick Actions */}
        <div className="grid grid-cols-4 gap-3 mb-6">
          {QUICK_ACTIONS.map((action) => (
            <button
              key={action.label}
              className="flex flex-col items-center gap-2 p-3 bg-white dark:bg-gray-800 rounded-xl shadow-sm hover:shadow-md transition"
            >
              <div className={`p-2 ${action.color} rounded-full text-white`}>
                <action.icon size={18} />
              </div>
              <span className="text-xs text-gray-600 dark:text-gray-300 text-center leading-tight">
                {action.label}
              </span>
            </button>
          ))}
        </div>

        {activeTab === 'tours' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-gray-900 dark:text-white">Proximos Tours</h2>
              <button className="text-sm text-teal-600 dark:text-teal-400 font-medium flex items-center gap-1">
                Ver todos <ChevronRight size={16} />
              </button>
            </div>

            {MOCK_TOURS.map((tour) => (
              <div
                key={tour.id}
                className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">{tour.title}</h3>
                    <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mt-1">
                      <Clock size={14} />
                      <span>{tour.time}</span>
                      <span className="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded">
                        {tour.date}
                      </span>
                    </div>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    tour.status === 'confirmed'
                      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                      : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                  }`}>
                    {tour.status === 'confirmed' ? 'Confirmado' : 'Pendiente'}
                  </span>
                </div>

                <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-300 mb-3">
                  <div className="flex items-center gap-1">
                    <MapPin size={14} className="text-gray-400" />
                    <span>{tour.location}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Users size={14} className="text-gray-400" />
                    <span>{tour.guests}/{tour.maxGuests} personas</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t dark:border-gray-700">
                  <div className="text-sm">
                    <span className="text-gray-500">Ganancias: </span>
                    <span className="font-semibold text-green-600">${tour.earnings.toLocaleString()}</span>
                  </div>
                  <div className="flex gap-2">
                    <button className="p-2 bg-gray-100 dark:bg-gray-700 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 transition">
                      <Phone size={16} className="text-gray-600 dark:text-gray-300" />
                    </button>
                    <button className="p-2 bg-gray-100 dark:bg-gray-700 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 transition">
                      <MessageCircle size={16} className="text-gray-600 dark:text-gray-300" />
                    </button>
                    <button className="p-2 bg-teal-500 rounded-full hover:bg-teal-600 transition">
                      <Navigation size={16} className="text-white" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'messages' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-semibold text-gray-900 dark:text-white">Mensajes Recientes</h2>
              <span className="text-xs bg-red-500 text-white px-2 py-0.5 rounded-full">
                2 nuevos
              </span>
            </div>

            {MOCK_MESSAGES.map((msg) => (
              <div
                key={msg.id}
                className={`bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm flex items-center gap-3 ${
                  msg.unread ? 'border-l-4 border-teal-500' : ''
                }`}
              >
                {msg.avatar ? (
                  <img
                    src={msg.avatar}
                    alt={msg.from}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                ) : (
                  <GradientPlaceholder variant="community" className="w-12 h-12 rounded-full" alt={msg.from} />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium text-gray-900 dark:text-white">{msg.from}</h3>
                    <span className="text-xs text-gray-400">{msg.time}</span>
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                    {msg.message}
                  </p>
                </div>
                {msg.unread && (
                  <div className="w-3 h-3 bg-teal-500 rounded-full" />
                )}
              </div>
            ))}
          </div>
        )}

        {activeTab === 'stats' && (
          <div className="space-y-4">
            <h2 className="font-semibold text-gray-900 dark:text-white mb-4">Mis Estadisticas</h2>

            {/* Rating */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-600 dark:text-gray-300">Calificacion</span>
                <div className="flex items-center gap-1">
                  <Star size={20} className="text-yellow-400 fill-yellow-400" />
                  <span className="text-2xl font-bold text-gray-900 dark:text-white">4.9</span>
                </div>
              </div>
              <div className="text-xs text-gray-500">Basado en 156 resenas</div>
            </div>

            {/* Monthly Stats */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm text-center">
                <div className="text-3xl font-bold text-gray-900 dark:text-white">47</div>
                <div className="text-sm text-gray-500">Tours este mes</div>
                <div className="text-xs text-green-500 flex items-center justify-center gap-1 mt-1">
                  <TrendingUp size={12} />
                  +12% vs anterior
                </div>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm text-center">
                <div className="text-3xl font-bold text-gray-900 dark:text-white">284</div>
                <div className="text-sm text-gray-500">Turistas atendidos</div>
                <div className="text-xs text-green-500 flex items-center justify-center gap-1 mt-1">
                  <TrendingUp size={12} />
                  +18% vs anterior
                </div>
              </div>
            </div>

            {/* Earnings */}
            <div className="bg-gradient-to-r from-teal-500 to-emerald-500 rounded-xl p-4 text-white">
              <div className="text-sm text-white/80 mb-1">Ganancias del mes</div>
              <div className="text-3xl font-bold">$45,680</div>
              <div className="flex items-center gap-1 text-sm text-white/80 mt-2">
                <TrendingUp size={14} />
                <span>+23% comparado con julio</span>
              </div>
            </div>

            {/* Achievements */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
              <h3 className="font-medium text-gray-900 dark:text-white mb-3">Logros</h3>
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <CheckCircle size={20} className="text-green-500" />
                  <span className="text-sm text-gray-600 dark:text-gray-300">Super Anfitrion 2025</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle size={20} className="text-green-500" />
                  <span className="text-sm text-gray-600 dark:text-gray-300">100+ Tours completados</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle size={20} className="text-green-500" />
                  <span className="text-sm text-gray-600 dark:text-gray-300">Experto en Guelaguetza</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GuideDashboard;
