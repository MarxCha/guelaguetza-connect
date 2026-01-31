import React, { useState } from 'react';
import {
  ArrowLeft,
  Home,
  Package,
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
  Phone,
  Camera,
  ShoppingBag,
  Ticket,
  Edit,
  Trash2,
  Eye,
  Send,
} from 'lucide-react';
import { ViewState } from '../types';
import { useAuth } from '../contexts/AuthContext';
import GradientPlaceholder from './ui/GradientPlaceholder';

interface SellerDashboardProps {
  onBack: () => void;
  onNavigate?: (view: ViewState) => void;
}

type TabType = 'products' | 'experiences' | 'orders' | 'stats';

// Mock data for seller products - Productos oaxaquenos reales
const MOCK_SELLER_PRODUCTS = [
  {
    id: '1',
    name: 'Alebrije Jaguar Multicolor',
    price: 1850,
    stock: 3,
    sales: 47,
    views: 1234,
    image: '/images/product_alebrije.png',
    category: 'ARTESANIA',
    rating: 4.9,
  },
  {
    id: '2',
    name: 'Mezcal Tobala Reposado 750ml',
    price: 1200,
    stock: 8,
    sales: 89,
    views: 2456,
    image: '/images/product_mezcal.png',
    category: 'MEZCAL',
    rating: 5.0,
  },
  {
    id: '3',
    name: 'Rebozo de Seda San Juan',
    price: 3500,
    stock: 2,
    sales: 12,
    views: 567,
    image: '/images/product_textiles.png',
    category: 'TEXTIL',
    rating: 4.8,
  },
  {
    id: '4',
    name: 'Jarra Barro Negro Dona Rosa',
    price: 950,
    stock: 6,
    sales: 34,
    views: 890,
    image: '/images/product_barro_negro.png',
    category: 'CERAMICA',
    rating: 4.7,
  },
  {
    id: '5',
    name: 'Chocolate de Metate 1kg',
    price: 280,
    stock: 25,
    sales: 156,
    views: 3421,
    image: '',
    category: 'GASTRONOMIA',
    rating: 4.9,
  },
  {
    id: '6',
    name: 'Huipil Bordado a Mano',
    price: 4200,
    stock: 1,
    sales: 8,
    views: 445,
    image: '/images/product_textiles.png',
    category: 'TEXTIL',
    rating: 5.0,
  },
  {
    id: '7',
    name: 'Mezcal Espadin Joven 750ml',
    price: 450,
    stock: 15,
    sales: 203,
    views: 4567,
    image: '/images/product_mezcal.png',
    category: 'MEZCAL',
    rating: 4.6,
  },
  {
    id: '8',
    name: 'Tapete Zapoteco 2x3m',
    price: 8500,
    stock: 2,
    sales: 5,
    views: 234,
    image: '/images/product_textiles.png',
    category: 'TEXTIL',
    rating: 5.0,
  },
];

// Mock data for experiences - Experiencias turisticas reales
const MOCK_SELLER_EXPERIENCES = [
  {
    id: '1',
    title: 'Ruta del Mezcal en Santiago Matatlan',
    time: '9:00 AM',
    date: 'Hoy',
    guests: 6,
    maxGuests: 8,
    location: 'Santiago Matatlan',
    status: 'confirmed' as const,
    earnings: 9000,
    pricePerPerson: 1500,
    duration: '6 horas',
    image: '/images/product_mezcal.png',
  },
  {
    id: '2',
    title: 'Taller de Alebrijes con Maestro Artesano',
    time: '10:00 AM',
    date: 'Hoy',
    guests: 4,
    maxGuests: 6,
    location: 'San Martin Tilcajete',
    status: 'confirmed' as const,
    earnings: 3800,
    pricePerPerson: 950,
    duration: '4 horas',
    image: '/images/product_alebrije.png',
  },
  {
    id: '3',
    title: 'Clase de Cocina: Mole Negro Oaxaqueno',
    time: '11:00 AM',
    date: 'Manana',
    guests: 5,
    maxGuests: 6,
    location: 'Centro Historico',
    status: 'pending' as const,
    earnings: 4750,
    pricePerPerson: 950,
    duration: '5 horas',
    image: '/images/poi_santo_domingo.png',
  },
  {
    id: '4',
    title: 'Tour Hierve el Agua + Monte Alban',
    time: '7:00 AM',
    date: 'Sab 25',
    guests: 8,
    maxGuests: 10,
    location: 'Hierve el Agua',
    status: 'confirmed' as const,
    earnings: 12000,
    pricePerPerson: 1500,
    duration: '10 horas',
    image: '/images/poi_monte_alban.png',
  },
  {
    id: '5',
    title: 'Visita a Teotitlan del Valle + Telar',
    time: '9:00 AM',
    date: 'Dom 26',
    guests: 3,
    maxGuests: 8,
    location: 'Teotitlan del Valle',
    status: 'pending' as const,
    earnings: 2400,
    pricePerPerson: 800,
    duration: '5 horas',
    image: '/images/product_textiles.png',
  },
];

// Mock orders - Pedidos y reservas variados
const MOCK_ORDERS = [
  {
    id: 'ORD-2847',
    type: 'product' as const,
    item: 'Alebrije Jaguar Multicolor',
    customer: 'Sarah Johnson',
    avatar: 'sarah/100',
    amount: 1850,
    status: 'pending' as const,
    date: 'Hace 15 min',
    location: 'CDMX, Mexico',
  },
  {
    id: 'RES-1923',
    type: 'experience' as const,
    item: 'Ruta del Mezcal',
    customer: 'Michael Chen',
    avatar: 'michael/100',
    amount: 4500,
    guests: 3,
    status: 'confirmed' as const,
    date: 'Hoy 9:00 AM',
    location: 'Hotel Quinta Real',
  },
  {
    id: 'ORD-2845',
    type: 'product' as const,
    item: 'Mezcal Tobala Reposado x2',
    customer: 'Ana Martinez',
    avatar: 'ana2/100',
    amount: 2400,
    status: 'shipped' as const,
    date: 'Ayer 18:00',
    location: 'Guadalajara, JAL',
  },
  {
    id: 'RES-1920',
    type: 'experience' as const,
    item: 'Taller de Alebrijes',
    customer: 'Emma Wilson',
    avatar: 'emma2/100',
    amount: 1900,
    guests: 2,
    status: 'pending' as const,
    date: 'Manana 10:00 AM',
    location: 'Airbnb Centro',
  },
  {
    id: 'ORD-2843',
    type: 'product' as const,
    item: 'Chocolate de Metate 1kg x5',
    customer: 'Roberto Sanchez',
    avatar: 'roberto/100',
    amount: 1400,
    status: 'shipped' as const,
    date: 'Hace 2 dias',
    location: 'Monterrey, NL',
  },
  {
    id: 'RES-1918',
    type: 'experience' as const,
    item: 'Clase de Cocina Oaxaquena',
    customer: 'Lisa Thompson',
    avatar: 'lisa/100',
    amount: 4750,
    guests: 5,
    status: 'confirmed' as const,
    date: 'Dom 26, 11:00 AM',
    location: 'Hotel Parador',
  },
  {
    id: 'ORD-2840',
    type: 'product' as const,
    item: 'Huipil Bordado a Mano',
    customer: 'Jennifer Davis',
    avatar: 'jennifer/100',
    amount: 4200,
    status: 'pending' as const,
    date: 'Hace 1 hora',
    location: 'Austin, TX, USA',
  },
  {
    id: 'RES-1915',
    type: 'experience' as const,
    item: 'Tour Hierve el Agua',
    customer: 'David Kim',
    avatar: 'david/100',
    amount: 3000,
    guests: 2,
    status: 'confirmed' as const,
    date: 'Sab 25, 7:00 AM',
    location: 'Holiday Inn Express',
  },
];

const QUICK_ACTIONS = [
  { icon: Plus, label: 'Nuevo Producto', color: 'bg-oaxaca-yellow' },
  { icon: Ticket, label: 'Nueva Experiencia', color: 'bg-oaxaca-purple' },
  { icon: Calendar, label: 'Mi Calendario', color: 'bg-oaxaca-sky' },
  { icon: Camera, label: 'Subir Fotos', color: 'bg-oaxaca-pink' },
];

// Categories for filtering
const PRODUCT_CATEGORIES = [
  { key: 'ALL', label: 'Todos' },
  { key: 'ARTESANIA', label: 'Artesanias' },
  { key: 'MEZCAL', label: 'Mezcal' },
  { key: 'TEXTIL', label: 'Textiles' },
  { key: 'CERAMICA', label: 'Ceramica' },
  { key: 'GASTRONOMIA', label: 'Gastronomia' },
];

const SellerDashboard: React.FC<SellerDashboardProps> = ({ onBack, onNavigate }) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('products');
  const [productFilter, setProductFilter] = useState('ALL');

  // Calculate stats
  const totalProducts = MOCK_SELLER_PRODUCTS.length;
  const totalExperiences = MOCK_SELLER_EXPERIENCES.length;
  const todayEarnings = MOCK_SELLER_EXPERIENCES
    .filter(e => e.date === 'Hoy')
    .reduce((acc, e) => acc + e.earnings, 0);
  const pendingOrders = MOCK_ORDERS.filter(o => o.status === 'pending').length;
  const totalSales = MOCK_SELLER_PRODUCTS.reduce((acc, p) => acc + p.sales, 0);
  const monthlyEarnings = 28450; // Mock monthly earnings

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
      case 'pending':
        return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'shipped':
        return 'bg-oaxaca-sky-light text-oaxaca-sky dark:bg-oaxaca-sky/20 dark:text-oaxaca-sky';
      default:
        return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'confirmed': return 'Confirmado';
      case 'pending': return 'Pendiente';
      case 'shipped': return 'Enviado';
      default: return status;
    }
  };

  return (
    <div className="h-full bg-gray-50 dark:bg-gray-950 overflow-y-auto pb-20">
      {/* Header */}
      <div className="bg-gradient-to-br from-oaxaca-yellow via-oaxaca-pink to-oaxaca-purple text-white">
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
                <h1 className="font-bold text-xl">Panel de Vendedor</h1>
                <p className="text-xs text-white/70">Bienvenido, {user?.nombre || 'Vendedor'}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button className="p-2 hover:bg-white/10 rounded-full transition relative">
                <Bell size={18} />
                {pendingOrders > 0 && (
                  <span className="absolute top-0 right-0 w-4 h-4 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center font-bold">
                    {pendingOrders}
                  </span>
                )}
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

          {/* Quick Stats */}
          <div className="grid grid-cols-4 gap-2 mb-4">
            <div className="bg-white/10 backdrop-blur rounded-xl p-2 text-center">
              <Package size={16} className="mx-auto mb-0.5" />
              <div className="text-lg font-bold">{totalProducts}</div>
              <div className="text-[10px] text-white/70">Productos</div>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-xl p-2 text-center">
              <DollarSign size={16} className="mx-auto mb-0.5" />
              <div className="text-lg font-bold">${(monthlyEarnings / 1000).toFixed(1)}k</div>
              <div className="text-[10px] text-white/70">Ventas</div>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-xl p-2 text-center">
              <Ticket size={16} className="mx-auto mb-0.5" />
              <div className="text-lg font-bold">{totalExperiences}</div>
              <div className="text-[10px] text-white/70">Experiencias</div>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-xl p-2 text-center">
              <Star size={16} className="mx-auto mb-0.5" />
              <div className="text-lg font-bold">4.8</div>
              <div className="text-[10px] text-white/70">Rating</div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 overflow-x-auto">
            {([
              { key: 'products', label: 'Productos' },
              { key: 'experiences', label: 'Experiencias' },
              { key: 'orders', label: 'Pedidos' },
              { key: 'stats', label: 'Stats' },
            ] as const).map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium transition whitespace-nowrap ${
                  activeTab === tab.key
                    ? 'bg-white text-oaxaca-pink'
                    : 'bg-white/20 hover:bg-white/30'
                }`}
              >
                {tab.label}
                {tab.key === 'orders' && pendingOrders > 0 && (
                  <span className="ml-1 bg-red-500 text-white text-[10px] px-1.5 rounded-full">
                    {pendingOrders}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Quick Actions */}
        <div className="grid grid-cols-4 gap-2 mb-6">
          {QUICK_ACTIONS.map((action) => (
            <button
              key={action.label}
              className="flex flex-col items-center gap-1.5 p-2 bg-white dark:bg-gray-800 rounded-xl shadow-sm hover:shadow-md transition"
            >
              <div className={`p-2 ${action.color} rounded-full text-white`}>
                <action.icon size={16} />
              </div>
              <span className="text-[10px] text-gray-600 dark:text-gray-300 text-center leading-tight">
                {action.label}
              </span>
            </button>
          ))}
        </div>

        {/* Products Tab */}
        {activeTab === 'products' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-gray-900 dark:text-white">Mis Productos</h2>
              <button className="text-sm text-oaxaca-yellow dark:text-oaxaca-yellow font-medium flex items-center gap-1">
                <Plus size={16} /> Agregar
              </button>
            </div>

            {/* Category Filter */}
            <div className="flex gap-2 overflow-x-auto pb-2">
              {PRODUCT_CATEGORIES.map((cat) => (
                <button
                  key={cat.key}
                  onClick={() => setProductFilter(cat.key)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition ${
                    productFilter === cat.key
                      ? 'bg-oaxaca-yellow text-white'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {MOCK_SELLER_PRODUCTS
              .filter(p => productFilter === 'ALL' || p.category === productFilter)
              .map((product) => (
              <div
                key={product.id}
                className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm flex gap-3"
              >
                <div className="relative">
                  {product.image ? (
                    <img
                      src={product.image}
                      alt={product.name}
                      className="w-20 h-20 rounded-lg object-cover"
                    />
                  ) : (
                    <GradientPlaceholder variant="shop" className="w-20 h-20 rounded-lg" alt={product.name} />
                  )}
                  {product.stock <= 3 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] px-1.5 py-0.5 rounded-full">
                      Pocas!
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-medium text-gray-900 dark:text-white text-sm truncate">
                      {product.name}
                    </h3>
                    <div className="flex items-center gap-0.5 shrink-0">
                      <Star size={12} className="text-yellow-400 fill-yellow-400" />
                      <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{product.rating}</span>
                    </div>
                  </div>
                  <p className="text-lg font-bold text-oaxaca-yellow dark:text-oaxaca-yellow">
                    ${product.price.toLocaleString()}
                  </p>
                  <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400 mt-1">
                    <span className={`flex items-center gap-1 ${product.stock <= 3 ? 'text-red-500' : ''}`}>
                      <Package size={12} />
                      Stock: {product.stock}
                    </span>
                    <span className="flex items-center gap-1">
                      <ShoppingBag size={12} />
                      {product.sales} ventas
                    </span>
                    <span className="flex items-center gap-1">
                      <Eye size={12} />
                      {product.views}
                    </span>
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <button className="p-1.5 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition">
                    <Edit size={14} className="text-gray-600 dark:text-gray-300" />
                  </button>
                  <button className="p-1.5 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition">
                    <Trash2 size={14} className="text-gray-600 dark:text-gray-300" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Experiences Tab */}
        {activeTab === 'experiences' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-gray-900 dark:text-white">Mis Experiencias</h2>
              <button className="text-sm text-oaxaca-purple dark:text-oaxaca-pink font-medium flex items-center gap-1">
                <Plus size={16} /> Nueva
              </button>
            </div>

            {MOCK_SELLER_EXPERIENCES.map((exp) => (
              <div
                key={exp.id}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden"
              >
                {/* Header with image */}
                <div className="relative h-32">
                  {exp.image ? (
                    <img
                      src={exp.image}
                      alt={exp.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <GradientPlaceholder variant="event" className="w-full h-full" alt={exp.title} />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-3">
                    <h3 className="font-semibold text-white text-sm leading-tight">{exp.title}</h3>
                    <div className="flex items-center gap-3 text-xs text-white/80 mt-1">
                      <span className="flex items-center gap-1">
                        <Clock size={12} />
                        {exp.duration}
                      </span>
                      <span className="flex items-center gap-1">
                        <DollarSign size={12} />
                        ${exp.pricePerPerson}/persona
                      </span>
                    </div>
                  </div>
                  <span className={`absolute top-2 right-2 px-2 py-1 rounded-full text-[10px] font-medium ${getStatusColor(exp.status)}`}>
                    {getStatusLabel(exp.status)}
                  </span>
                </div>

                {/* Details */}
                <div className="p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                      <Calendar size={14} />
                      <span className="font-medium">{exp.date}</span>
                      <span>{exp.time}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-gray-600 dark:text-gray-300 mb-3">
                    <div className="flex items-center gap-1">
                      <MapPin size={12} className="text-gray-400" />
                      <span>{exp.location}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Users size={12} className="text-gray-400" />
                      <span className={exp.guests >= exp.maxGuests ? 'text-green-500 font-medium' : ''}>
                        {exp.guests}/{exp.maxGuests} personas
                        {exp.guests >= exp.maxGuests && ' (Lleno!)'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t dark:border-gray-700">
                    <div className="text-sm">
                      <span className="text-gray-500">Ganancias: </span>
                      <span className="font-semibold text-green-600">${exp.earnings.toLocaleString()}</span>
                    </div>
                    <div className="flex gap-2">
                      <button className="p-2 bg-gray-100 dark:bg-gray-700 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 transition">
                        <Phone size={14} className="text-gray-600 dark:text-gray-300" />
                      </button>
                      <button className="p-2 bg-gray-100 dark:bg-gray-700 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 transition">
                        <MessageCircle size={14} className="text-gray-600 dark:text-gray-300" />
                      </button>
                      <button className="p-2 bg-oaxaca-purple rounded-full hover:bg-oaxaca-purple/90 transition">
                        <Edit size={14} className="text-white" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Orders Tab */}
        {activeTab === 'orders' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-gray-900 dark:text-white">Pedidos y Reservas</h2>
              {pendingOrders > 0 && (
                <span className="text-xs bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 px-2 py-1 rounded-full">
                  {pendingOrders} pendientes
                </span>
              )}
            </div>

            {/* Order Type Filter Pills */}
            <div className="flex gap-2">
              <span className="px-3 py-1.5 rounded-full text-xs font-medium bg-oaxaca-yellow text-white">
                Todos ({MOCK_ORDERS.length})
              </span>
              <span className="px-3 py-1.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300">
                Productos ({MOCK_ORDERS.filter(o => o.type === 'product').length})
              </span>
              <span className="px-3 py-1.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300">
                Experiencias ({MOCK_ORDERS.filter(o => o.type === 'experience').length})
              </span>
            </div>

            {MOCK_ORDERS.map((order) => (
              <div
                key={order.id}
                className={`bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm ${
                  order.status === 'pending' ? 'border-l-4 border-yellow-500' : ''
                } ${order.status === 'shipped' ? 'border-l-4 border-oaxaca-sky' : ''}`}
              >
                <div className="flex items-start gap-3">
                  {order.avatar ? (
                    <img
                      src={order.avatar}
                      alt={order.customer}
                      className="w-12 h-12 rounded-full object-cover border-2 border-gray-100 dark:border-gray-700"
                    />
                  ) : (
                    <GradientPlaceholder variant="community" className="w-12 h-12 rounded-full border-2 border-gray-100 dark:border-gray-700" alt={order.customer} />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium text-gray-900 dark:text-white text-sm">
                          {order.customer}
                        </h3>
                        <p className="text-[10px] text-gray-400 font-mono">{order.id}</p>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${getStatusColor(order.status)}`}>
                        {getStatusLabel(order.status)}
                      </span>
                    </div>

                    <div className="mt-2 p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                      {order.type === 'product' ? (
                        <div className="flex items-center gap-2 text-sm">
                          <Package size={14} className="text-oaxaca-yellow" />
                          <span className="text-gray-700 dark:text-gray-200">{order.item}</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-sm">
                          <Ticket size={14} className="text-oaxaca-purple" />
                          <span className="text-gray-700 dark:text-gray-200">{order.item}</span>
                          <span className="text-xs bg-oaxaca-purple-light dark:bg-oaxaca-purple/20 text-oaxaca-purple dark:text-oaxaca-pink px-1.5 py-0.5 rounded">
                            {order.guests} persona{order.guests !== 1 ? 's' : ''}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Location */}
                    <div className="flex items-center gap-1 mt-2 text-xs text-gray-500 dark:text-gray-400">
                      <MapPin size={12} />
                      <span>{order.location}</span>
                    </div>

                    <div className="flex items-center justify-between mt-3 pt-2 border-t dark:border-gray-700">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-bold text-oaxaca-yellow dark:text-oaxaca-yellow">
                          ${order.amount.toLocaleString()}
                        </span>
                        <span className="text-xs text-gray-400">{order.date}</span>
                      </div>
                      <div className="flex gap-1">
                        <button className="p-1.5 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition">
                          <MessageCircle size={12} className="text-gray-600 dark:text-gray-300" />
                        </button>
                        {order.status === 'pending' && order.type === 'product' && (
                          <button className="p-1.5 bg-oaxaca-sky rounded-lg hover:bg-oaxaca-sky/90 transition flex items-center gap-1">
                            <Send size={12} className="text-white" />
                            <span className="text-[10px] text-white font-medium pr-1">Enviar</span>
                          </button>
                        )}
                        {order.status === 'pending' && order.type === 'experience' && (
                          <button className="p-1.5 bg-green-500 rounded-lg hover:bg-green-600 transition flex items-center gap-1">
                            <CheckCircle size={12} className="text-white" />
                            <span className="text-[10px] text-white font-medium pr-1">Confirmar</span>
                          </button>
                        )}
                        {order.status === 'shipped' && (
                          <span className="px-2 py-1 bg-oaxaca-sky-light dark:bg-oaxaca-sky/20 text-oaxaca-sky dark:text-oaxaca-sky text-[10px] rounded-lg flex items-center gap-1">
                            <Send size={10} />
                            En camino
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Stats Tab */}
        {activeTab === 'stats' && (
          <div className="space-y-4">
            <h2 className="font-semibold text-gray-900 dark:text-white">Mis Estadisticas</h2>

            {/* Rating */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-600 dark:text-gray-300">Calificacion General</span>
                <div className="flex items-center gap-1">
                  <Star size={20} className="text-yellow-400 fill-yellow-400" />
                  <span className="text-2xl font-bold text-gray-900 dark:text-white">4.8</span>
                </div>
              </div>
              <div className="text-xs text-gray-500">Basado en 89 resenas (productos + experiencias)</div>
            </div>

            {/* Monthly Stats Grid */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm text-center">
                <Package size={20} className="mx-auto mb-1 text-oaxaca-yellow" />
                <div className="text-2xl font-bold text-gray-900 dark:text-white">{totalSales}</div>
                <div className="text-xs text-gray-500">Productos vendidos</div>
                <div className="text-[10px] text-green-500 flex items-center justify-center gap-1 mt-1">
                  <TrendingUp size={10} />
                  +15% vs anterior
                </div>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm text-center">
                <Ticket size={20} className="mx-auto mb-1 text-oaxaca-purple" />
                <div className="text-2xl font-bold text-gray-900 dark:text-white">47</div>
                <div className="text-xs text-gray-500">Experiencias</div>
                <div className="text-[10px] text-green-500 flex items-center justify-center gap-1 mt-1">
                  <TrendingUp size={10} />
                  +12% vs anterior
                </div>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm text-center">
                <Users size={20} className="mx-auto mb-1 text-oaxaca-sky" />
                <div className="text-2xl font-bold text-gray-900 dark:text-white">284</div>
                <div className="text-xs text-gray-500">Clientes atendidos</div>
                <div className="text-[10px] text-green-500 flex items-center justify-center gap-1 mt-1">
                  <TrendingUp size={10} />
                  +18% vs anterior
                </div>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm text-center">
                <Eye size={20} className="mx-auto mb-1 text-oaxaca-pink" />
                <div className="text-2xl font-bold text-gray-900 dark:text-white">2.3k</div>
                <div className="text-xs text-gray-500">Vistas totales</div>
                <div className="text-[10px] text-green-500 flex items-center justify-center gap-1 mt-1">
                  <TrendingUp size={10} />
                  +24% vs anterior
                </div>
              </div>
            </div>

            {/* Monthly Earnings */}
            <div className="bg-gradient-to-r from-oaxaca-yellow to-oaxaca-pink rounded-xl p-4 text-white">
              <div className="text-sm text-white/80 mb-1">Ganancias del mes</div>
              <div className="text-3xl font-bold">${monthlyEarnings.toLocaleString()}</div>
              <div className="flex items-center gap-4 mt-2 text-sm">
                <div className="flex items-center gap-1 text-white/80">
                  <Package size={14} />
                  <span>Productos: $18,450</span>
                </div>
                <div className="flex items-center gap-1 text-white/80">
                  <Ticket size={14} />
                  <span>Experiencias: $10,000</span>
                </div>
              </div>
              <div className="flex items-center gap-1 text-sm text-white/80 mt-2">
                <TrendingUp size={14} />
                <span>+23% comparado con mes anterior</span>
              </div>
            </div>

            {/* Achievements */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
              <h3 className="font-medium text-gray-900 dark:text-white mb-3">Logros</h3>
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <CheckCircle size={18} className="text-green-500" />
                  <span className="text-sm text-gray-600 dark:text-gray-300">Vendedor Verificado</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle size={18} className="text-green-500" />
                  <span className="text-sm text-gray-600 dark:text-gray-300">100+ Ventas completadas</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle size={18} className="text-green-500" />
                  <span className="text-sm text-gray-600 dark:text-gray-300">Super Anfitrion 2025</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle size={18} className="text-green-500" />
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

export default SellerDashboard;
