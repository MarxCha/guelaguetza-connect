import React, { useState } from 'react';
import { Calendar, Clock, MapPin, Star, ChevronRight, Ticket, Music, Users, Utensils } from 'lucide-react';

interface Event {
  id: string;
  time: string;
  title: string;
  location: string;
  type: 'main' | 'cultural' | 'gastro' | 'music';
  featured?: boolean;
  description?: string;
}

interface DaySchedule {
  date: string;
  dayName: string;
  dayNumber: number;
  events: Event[];
}

const SCHEDULE: DaySchedule[] = [
  {
    date: '2025-07-21',
    dayName: 'Lunes',
    dayNumber: 21,
    events: [
      { id: '1', time: '09:00', title: 'Apertura Feria del Mezcal', location: 'CCCO', type: 'gastro' },
      { id: '2', time: '11:00', title: 'Desfile de Delegaciones', location: 'Centro Histórico', type: 'main', featured: true, description: 'Más de 16 delegaciones recorren las calles principales' },
      { id: '3', time: '17:00', title: 'Guelaguetza - Primer Lunes', location: 'Auditorio Guelaguetza', type: 'main', featured: true, description: 'Presentación oficial de las delegaciones' },
      { id: '4', time: '20:00', title: 'Noche de Gala', location: 'Zócalo', type: 'music' },
    ]
  },
  {
    date: '2025-07-22',
    dayName: 'Martes',
    dayNumber: 22,
    events: [
      { id: '5', time: '10:00', title: 'Exposición de Alebrijes', location: 'Santo Domingo', type: 'cultural' },
      { id: '6', time: '12:00', title: 'Taller de Barro Negro', location: 'San Bartolo', type: 'cultural' },
      { id: '7', time: '18:00', title: 'Concierto de Marimba', location: 'Alameda', type: 'music' },
      { id: '8', time: '20:00', title: 'Muestra Gastronómica', location: 'CCCO', type: 'gastro' },
    ]
  },
  {
    date: '2025-07-23',
    dayName: 'Miércoles',
    dayNumber: 23,
    events: [
      { id: '9', time: '09:00', title: 'Cata de Mezcales', location: 'Feria del Mezcal', type: 'gastro' },
      { id: '10', time: '11:00', title: 'Danza de la Pluma', location: 'Zócalo', type: 'cultural', featured: true },
      { id: '11', time: '17:00', title: 'Bani Stui Gulal', location: 'Cerro del Fortín', type: 'main' },
      { id: '12', time: '21:00', title: 'Fuegos Artificiales', location: 'Auditorio', type: 'main' },
    ]
  },
  {
    date: '2025-07-24',
    dayName: 'Jueves',
    dayNumber: 24,
    events: [
      { id: '13', time: '10:00', title: 'Mercado de Artesanías', location: 'Benito Juárez', type: 'cultural' },
      { id: '14', time: '14:00', title: 'Festival del Mole', location: 'San Agustín Etla', type: 'gastro', featured: true },
      { id: '15', time: '18:00', title: 'Calenda Nocturna', location: 'Centro', type: 'cultural' },
    ]
  },
  {
    date: '2025-07-25',
    dayName: 'Viernes',
    dayNumber: 25,
    events: [
      { id: '16', time: '09:00', title: 'Visita a Monte Albán', location: 'Monte Albán', type: 'cultural' },
      { id: '17', time: '16:00', title: 'Concierto Regional', location: 'Teatro Macedonio', type: 'music' },
      { id: '18', time: '20:00', title: 'Noche Oaxaqueña', location: 'Zócalo', type: 'music', featured: true },
    ]
  },
  {
    date: '2025-07-26',
    dayName: 'Sábado',
    dayNumber: 26,
    events: [
      { id: '19', time: '10:00', title: 'Feria del Tejate', location: 'San Andrés', type: 'gastro' },
      { id: '20', time: '12:00', title: 'Exhibición de Textiles', location: 'Museo Textil', type: 'cultural' },
      { id: '21', time: '18:00', title: 'Donají: Leyenda', location: 'Auditorio', type: 'main', featured: true },
    ]
  },
  {
    date: '2025-07-27',
    dayName: 'Domingo',
    dayNumber: 27,
    events: [
      { id: '22', time: '11:00', title: 'Desfile Final', location: 'Centro', type: 'main' },
      { id: '23', time: '17:00', title: 'Guelaguetza - Último Lunes', location: 'Auditorio Guelaguetza', type: 'main', featured: true, description: 'Gran cierre con todas las delegaciones' },
      { id: '24', time: '21:00', title: 'Clausura y Fuegos', location: 'Cerro del Fortín', type: 'main' },
    ]
  },
  {
    date: '2025-07-28',
    dayName: 'Lunes',
    dayNumber: 28,
    events: [
      { id: '25', time: '10:00', title: 'Clausura Feria Mezcal', location: 'CCCO', type: 'gastro' },
      { id: '26', time: '12:00', title: 'Despedida de Delegaciones', location: 'Zócalo', type: 'cultural' },
    ]
  },
];

const typeConfig = {
  main: { icon: Star, color: 'bg-oaxaca-pink', label: 'Principal' },
  cultural: { icon: Users, color: 'bg-oaxaca-purple', label: 'Cultural' },
  gastro: { icon: Utensils, color: 'bg-oaxaca-yellow text-gray-900', label: 'Gastronomía' },
  music: { icon: Music, color: 'bg-oaxaca-sky', label: 'Música' },
};

const ProgramView: React.FC = () => {
  const [selectedDay, setSelectedDay] = useState(0);
  const [filter, setFilter] = useState<string | null>(null);

  const currentSchedule = SCHEDULE[selectedDay];
  const filteredEvents = filter
    ? currentSchedule.events.filter(e => e.type === filter)
    : currentSchedule.events;

  return (
    <div className="h-full flex flex-col bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-oaxaca-purple p-4 pt-6 text-white">
        <div className="flex items-center gap-2 mb-1">
          <Calendar size={20} className="text-oaxaca-yellow" />
          <h2 className="text-xl font-bold">Programa Guelaguetza 2025</h2>
        </div>
        <p className="text-sm text-white/70">Julio 21 - 28, Oaxaca de Juárez</p>
      </div>

      {/* Day Selector */}
      <div className="bg-white shadow-sm sticky top-0 z-10">
        <div className="flex overflow-x-auto no-scrollbar px-2 py-3 gap-2">
          {SCHEDULE.map((day, index) => (
            <button
              key={day.date}
              onClick={() => setSelectedDay(index)}
              className={`flex-shrink-0 px-4 py-2 rounded-xl text-center transition-all ${
                selectedDay === index
                  ? 'bg-oaxaca-pink text-white shadow-md'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <p className="text-xs font-medium">{day.dayName}</p>
              <p className="text-lg font-bold">{day.dayNumber}</p>
            </button>
          ))}
        </div>

        {/* Filters */}
        <div className="flex gap-2 px-4 pb-3 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setFilter(null)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition ${
              !filter ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600'
            }`}
          >
            Todos
          </button>
          {Object.entries(typeConfig).map(([key, config]) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition flex items-center gap-1 ${
                filter === key ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600'
              }`}
            >
              <config.icon size={12} />
              {config.label}
            </button>
          ))}
        </div>
      </div>

      {/* Events List */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {filteredEvents.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <Calendar size={48} className="mx-auto mb-3 opacity-50" />
            <p>No hay eventos de este tipo</p>
          </div>
        ) : (
          filteredEvents.map((event) => {
            const config = typeConfig[event.type];
            const Icon = config.icon;
            return (
              <div
                key={event.id}
                className={`bg-white rounded-xl p-4 shadow-sm border-l-4 ${
                  event.featured ? 'border-oaxaca-pink' : 'border-gray-200'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`${config.color} p-2 rounded-lg text-white`}>
                    <Icon size={18} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-bold text-gray-900">{event.title}</h3>
                        <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <Clock size={12} />
                            {event.time}
                          </span>
                          <span className="flex items-center gap-1">
                            <MapPin size={12} />
                            {event.location}
                          </span>
                        </div>
                      </div>
                      {event.featured && (
                        <Star size={16} className="text-oaxaca-yellow fill-oaxaca-yellow" />
                      )}
                    </div>
                    {event.description && (
                      <p className="text-xs text-gray-600 mt-2">{event.description}</p>
                    )}
                  </div>
                </div>
                {event.featured && (
                  <button className="w-full mt-3 py-2 bg-oaxaca-pink/10 text-oaxaca-pink rounded-lg text-sm font-medium flex items-center justify-center gap-2 hover:bg-oaxaca-pink/20 transition">
                    <Ticket size={16} />
                    Obtener boletos
                    <ChevronRight size={16} />
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default ProgramView;
