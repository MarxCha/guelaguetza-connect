import React, { useState } from 'react';
import { Users, Shield, ShoppingBag, Compass, ChevronDown, Check } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface DemoUserSelectorProps {
  compact?: boolean;
}

const DEMO_USERS = [
  {
    type: 'user' as const,
    name: 'Usuario Demo',
    description: 'Visitante del festival',
    icon: Users,
    color: 'from-blue-500 to-blue-600',
  },
  {
    type: 'seller' as const,
    name: 'Vendedor Demo',
    description: 'Artesano y comerciante',
    icon: ShoppingBag,
    color: 'from-amber-500 to-amber-600',
  },
  {
    type: 'host' as const,
    name: 'Guia Demo',
    description: 'Guia turistico local',
    icon: Compass,
    color: 'from-green-500 to-green-600',
  },
  {
    type: 'admin' as const,
    name: 'Admin Demo',
    description: 'Administrador del sistema',
    icon: Shield,
    color: 'from-purple-500 to-purple-600',
  },
];

const DemoUserSelector: React.FC<DemoUserSelectorProps> = ({ compact = false }) => {
  const { user, isDemoMode, loginAsDemo } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Map user role to demo user type
  const roleToType: Record<string, 'user' | 'seller' | 'host' | 'admin'> = {
    'USER': 'user',
    'SELLER': 'seller',
    'HOST': 'host',
    'ADMIN': 'admin',
  };
  const currentUserType = roleToType[user?.role || 'USER'] || 'user';
  const currentDemo = DEMO_USERS.find(d => d.type === currentUserType) || DEMO_USERS[0];

  const handleSelect = async (type: 'user' | 'seller' | 'admin' | 'host') => {
    setIsLoading(true);
    await loginAsDemo(type);
    setIsLoading(false);
    setIsOpen(false);
  };

  if (!isDemoMode) return null;

  if (compact) {
    return (
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-white text-sm transition"
        >
          <currentDemo.icon size={16} />
          <span className="hidden sm:inline">{currentDemo.name}</span>
          <ChevronDown size={14} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {isOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
            <div className="absolute top-full right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden z-50">
              <div className="p-2 border-b border-gray-100 dark:border-gray-700">
                <p className="text-xs text-gray-500 dark:text-gray-400 px-2">Cambiar usuario demo</p>
              </div>
              <div className="p-1">
                {DEMO_USERS.map((demo) => (
                  <button
                    key={demo.type}
                    onClick={() => handleSelect(demo.type)}
                    disabled={isLoading}
                    className={`w-full flex items-center gap-3 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition ${
                      demo.type === currentUserType ? 'bg-gray-100 dark:bg-gray-700' : ''
                    }`}
                  >
                    <div className={`p-2 rounded-lg bg-gradient-to-br ${demo.color} text-white`}>
                      <demo.icon size={16} />
                    </div>
                    <div className="flex-1 text-left">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{demo.name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{demo.description}</p>
                    </div>
                    {demo.type === currentUserType && (
                      <Check size={16} className="text-green-500" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
      <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
        <Users size={18} className="text-oaxaca-purple" />
        Modo Demo - Cambiar Usuario
      </h3>
      <div className="grid grid-cols-2 gap-2">
        {DEMO_USERS.map((demo) => (
          <button
            key={demo.type}
            onClick={() => handleSelect(demo.type)}
            disabled={isLoading}
            className={`flex flex-col items-center p-3 rounded-xl transition ${
              demo.type === currentUserType
                ? `bg-gradient-to-br ${demo.color} text-white`
                : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300'
            }`}
          >
            <demo.icon size={24} className="mb-1" />
            <span className="text-xs font-medium">{demo.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default DemoUserSelector;
