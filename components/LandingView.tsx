import React, { useState, useEffect } from 'react';
import {
  Users,
  ShoppingBag,
  Shield,
  ChevronRight,
  Sparkles,
  MapPin,
  Calendar,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const HERO_IMAGES = [
  '/images/guelaguetza-dancers.png',
  '/images/guelaguetza-pineapple.png',
  '/images/guelaguetza-stage.png',
];

interface LandingViewProps {
  onUserSelected: (role?: string) => void;
}

const USER_TYPES = [
  {
    type: 'user' as const,
    name: 'Visitante',
    title: 'Soy Visitante',
    description: 'Explora la Guelaguetza, descubre eventos, transporte, historias y conecta con la comunidad.',
    icon: Users,
    color: 'from-blue-500 to-indigo-600',
    features: ['Mapa interactivo', 'Rutas de transporte', 'Eventos y calendario', 'Historias de la comunidad'],
  },
  {
    type: 'seller' as const,
    name: 'Artesano / Vendedor',
    title: 'Soy Vendedor',
    description: 'Vende productos artesanales, ofrece tours y experiencias, gestiona pedidos y reservas.',
    icon: ShoppingBag,
    color: 'from-amber-500 to-orange-600',
    features: ['Gestiona productos', 'Crea experiencias', 'Pedidos y reservas', 'Estadisticas de ventas'],
  },
  {
    type: 'admin' as const,
    name: 'Administrador',
    title: 'Administrador',
    description: 'Panel de metricas, estadisticas de uso y gestion de la plataforma.',
    icon: Shield,
    color: 'from-purple-500 to-violet-600',
    features: ['Dashboard de metricas', 'Gestion de usuarios', 'Ver app como usuario', 'Reportes de actividad'],
  },
];

const LandingView: React.FC<LandingViewProps> = ({ onUserSelected }) => {
  const { loginAsDemo } = useAuth();
  const [loading, setLoading] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [heroIndex, setHeroIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setHeroIndex((prev) => (prev + 1) % HERO_IMAGES.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const handleSelectUser = async (type: 'user' | 'seller' | 'admin') => {
    setLoading(type);
    setSelectedType(type);
    await loginAsDemo(type);
    // Map type to role
    const roleMap: Record<string, string> = {
      user: 'USER',
      seller: 'SELLER',
      admin: 'ADMIN',
    };
    setTimeout(() => {
      onUserSelected(roleMap[type]);
    }, 300);
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Background Image Carousel */}
      {HERO_IMAGES.map((img, index) => (
        <div
          key={img}
          className={`absolute inset-0 transition-opacity duration-1000 ${
            index === heroIndex ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <img
            src={img}
            alt=""
            className="w-full h-full object-cover"
          />
        </div>
      ))}

      {/* Overlay gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-oaxaca-purple/80 via-oaxaca-pink/70 to-oaxaca-yellow/60" />

      {/* Decorative blur elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-white/10 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Header */}
        <header className="pt-8 pb-6 px-6 text-center">
          <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-full px-4 py-2 mb-4">
            <Sparkles size={16} className="text-oaxaca-yellow" />
            <span className="text-white text-sm font-medium">Julio 21-28, 2025</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-2">
            Guelaguetza Connect
          </h1>
          <p className="text-white/80 text-lg max-w-md mx-auto">
            La maxima fiesta de los oaxaquenos en tu bolsillo
          </p>
        </header>

        {/* Main Content */}
        <main className="flex-1 px-4 pb-8">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-white text-center text-xl font-semibold mb-6">
              Selecciona como deseas ingresar
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {USER_TYPES.map((userType) => (
                <button
                  key={userType.type}
                  onClick={() => handleSelectUser(userType.type)}
                  disabled={loading !== null}
                  className={`relative bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm rounded-2xl p-5 text-left transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl active:scale-[0.98] ${
                    selectedType === userType.type ? 'ring-4 ring-white shadow-2xl scale-[1.02]' : ''
                  } ${loading && loading !== userType.type ? 'opacity-50' : ''}`}
                >
                  {/* Icon & Title */}
                  <div className="flex items-start gap-4 mb-3">
                    <div className={`p-3 rounded-xl bg-gradient-to-br ${userType.color} text-white shadow-lg`}>
                      <userType.icon size={28} />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-lg text-gray-900 dark:text-white">
                        {userType.title}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {userType.name}
                      </p>
                    </div>
                    <ChevronRight
                      size={24}
                      className={`text-gray-400 transition-transform ${
                        selectedType === userType.type ? 'translate-x-1' : ''
                      }`}
                    />
                  </div>

                  {/* Description */}
                  <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
                    {userType.description}
                  </p>

                  {/* Features */}
                  <div className="flex flex-wrap gap-2">
                    {userType.features.map((feature, idx) => (
                      <span
                        key={idx}
                        className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-1 rounded-full"
                      >
                        {feature}
                      </span>
                    ))}
                  </div>

                  {/* Loading indicator */}
                  {loading === userType.type && (
                    <div className="absolute inset-0 bg-white/80 dark:bg-gray-800/80 rounded-2xl flex items-center justify-center">
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 border-2 border-oaxaca-purple border-t-transparent rounded-full animate-spin" />
                        <span className="text-oaxaca-purple font-medium">Ingresando...</span>
                      </div>
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer className="py-6 px-4 text-center">
          <div className="flex items-center justify-center gap-6 text-white/60 text-sm mb-4">
            <div className="flex items-center gap-1">
              <MapPin size={14} />
              <span>Oaxaca, Mexico</span>
            </div>
            <div className="flex items-center gap-1">
              <Calendar size={14} />
              <span>Guelaguetza 2025</span>
            </div>
          </div>
          <p className="text-white/40 text-xs">
            Celebrando la cultura y tradiciones de Oaxaca
          </p>
        </footer>
      </div>
    </div>
  );
};

export default LandingView;
