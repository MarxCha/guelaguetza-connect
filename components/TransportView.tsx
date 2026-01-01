import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Bus, Clock, MapPin, Navigation as NavIcon, Locate, ChevronRight, Users, Zap } from 'lucide-react';

// Fix Leaflet default marker icons
delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Oaxaca center coordinates
const OAXACA_CENTER: [number, number] = [17.0732, -96.7266];

// Bus routes with real Oaxaca coordinates
interface BusStop {
  id: string;
  name: string;
  coords: [number, number];
}

interface Route {
  id: string;
  name: string;
  shortName: string;
  color: string;
  type: 'ESPECIAL' | 'TRONCAL';
  frequency: number; // minutes
  stops: BusStop[];
  path: [number, number][];
}

const ROUTES: Route[] = [
  {
    id: 'RC01',
    name: 'Ruta Auditorio (Guelaguetza Segura)',
    shortName: 'Auditorio',
    color: '#D9006C',
    type: 'ESPECIAL',
    frequency: 5,
    stops: [
      { id: 's1', name: 'Alameda de León', coords: [17.0614, -96.7253] },
      { id: 's2', name: 'Chedraui Madero', coords: [17.0658, -96.7201] },
      { id: 's3', name: 'Museo Infantil', coords: [17.0712, -96.7156] },
      { id: 's4', name: 'Auditorio Guelaguetza', coords: [17.0789, -96.7089] },
    ],
    path: [
      [17.0614, -96.7253],
      [17.0635, -96.7230],
      [17.0658, -96.7201],
      [17.0685, -96.7178],
      [17.0712, -96.7156],
      [17.0750, -96.7120],
      [17.0789, -96.7089],
    ],
  },
  {
    id: 'RC02',
    name: 'Ruta Feria del Mezcal',
    shortName: 'Mezcal',
    color: '#00AEEF',
    type: 'ESPECIAL',
    frequency: 12,
    stops: [
      { id: 's5', name: 'Centro de Convenciones', coords: [17.0520, -96.7180] },
      { id: 's6', name: 'Parque Juárez', coords: [17.0598, -96.7235] },
      { id: 's7', name: 'Zócalo', coords: [17.0610, -96.7260] },
    ],
    path: [
      [17.0520, -96.7180],
      [17.0550, -96.7200],
      [17.0575, -96.7220],
      [17.0598, -96.7235],
      [17.0610, -96.7260],
    ],
  },
  {
    id: 'T01',
    name: 'Viguera - San Sebastián',
    shortName: 'Viguera',
    color: '#6A0F49',
    type: 'TRONCAL',
    frequency: 8,
    stops: [
      { id: 's8', name: 'Viguera', coords: [17.0450, -96.7350] },
      { id: 's9', name: 'Tecnológico', coords: [17.0520, -96.7300] },
      { id: 's10', name: 'Centro', coords: [17.0610, -96.7260] },
      { id: 's11', name: 'San Sebastián', coords: [17.0700, -96.7200] },
    ],
    path: [
      [17.0450, -96.7350],
      [17.0480, -96.7330],
      [17.0520, -96.7300],
      [17.0560, -96.7280],
      [17.0610, -96.7260],
      [17.0650, -96.7230],
      [17.0700, -96.7200],
    ],
  },
];

// Custom bus icon
const createBusIcon = (color: string) => L.divIcon({
  className: 'custom-bus-icon',
  html: `
    <div style="
      background-color: ${color};
      width: 32px;
      height: 32px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 3px solid white;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    ">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
        <path d="M4 16c0 .88.39 1.67 1 2.22V20c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h8v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1.78c.61-.55 1-1.34 1-2.22V6c0-3.5-3.58-4-8-4s-8 .5-8 4v10zm3.5 1c-.83 0-1.5-.67-1.5-1.5S6.67 14 7.5 14s1.5.67 1.5 1.5S8.33 17 7.5 17zm9 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm1.5-6H6V6h12v5z"/>
      </svg>
    </div>
  `,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

// Custom stop icon
const createStopIcon = (color: string, isMain: boolean = false) => L.divIcon({
  className: 'custom-stop-icon',
  html: `
    <div style="
      background-color: white;
      width: ${isMain ? '16px' : '12px'};
      height: ${isMain ? '16px' : '12px'};
      border-radius: 50%;
      border: 3px solid ${color};
      box-shadow: 0 1px 4px rgba(0,0,0,0.2);
    "></div>
  `,
  iconSize: [isMain ? 16 : 12, isMain ? 16 : 12],
  iconAnchor: [isMain ? 8 : 6, isMain ? 8 : 6],
});

// Interpolate position along a path
const interpolatePosition = (path: [number, number][], progress: number): [number, number] => {
  const totalPoints = path.length - 1;
  const exactPoint = progress * totalPoints;
  const lowerIndex = Math.floor(exactPoint);
  const upperIndex = Math.min(lowerIndex + 1, totalPoints);
  const fraction = exactPoint - lowerIndex;

  return [
    path[lowerIndex][0] + (path[upperIndex][0] - path[lowerIndex][0]) * fraction,
    path[lowerIndex][1] + (path[upperIndex][1] - path[lowerIndex][1]) * fraction,
  ];
};

// Component to recenter map
const RecenterMap: React.FC<{ coords: [number, number] }> = ({ coords }) => {
  const map = useMap();
  useEffect(() => {
    map.setView(coords, 14, { animate: true });
  }, [coords, map]);
  return null;
};

// Animated bus marker component
const AnimatedBus: React.FC<{ route: Route; offset: number }> = ({ route, offset }) => {
  const [progress, setProgress] = useState(offset);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress(prev => (prev + 0.002) % 1);
    }, 50);
    return () => clearInterval(interval);
  }, []);

  const position = interpolatePosition(route.path, progress);

  return (
    <Marker position={position} icon={createBusIcon(route.color)}>
      <Popup>
        <div className="text-center">
          <strong>{route.id}</strong>
          <p className="text-sm text-gray-600">{route.name}</p>
        </div>
      </Popup>
    </Marker>
  );
};

const TransportView: React.FC = () => {
  const [selectedRoute, setSelectedRoute] = useState<Route>(ROUTES[0]);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [mapCenter, setMapCenter] = useState<[number, number]>(OAXACA_CENTER);
  const [showAllRoutes, setShowAllRoutes] = useState(true);
  const [eta, setEta] = useState(selectedRoute.frequency);
  const mapRef = useRef<L.Map | null>(null);

  // Simulate ETA countdown
  useEffect(() => {
    const interval = setInterval(() => {
      setEta(prev => prev <= 1 ? selectedRoute.frequency : prev - 1);
    }, 60000); // Update every minute
    return () => clearInterval(interval);
  }, [selectedRoute]);

  // Get user location
  const locateUser = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const coords: [number, number] = [position.coords.latitude, position.coords.longitude];
          setUserLocation(coords);
          setMapCenter(coords);
        },
        () => {
          // Fallback to Oaxaca center
          setMapCenter(OAXACA_CENTER);
        }
      );
    }
  };

  const selectRoute = (route: Route) => {
    setSelectedRoute(route);
    setEta(route.frequency);
    setShowAllRoutes(false);
    // Center on route
    const midPoint = route.path[Math.floor(route.path.length / 2)];
    setMapCenter(midPoint);
  };

  return (
    <div className="h-full flex flex-col bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-white px-4 py-3 shadow-sm z-20 sticky top-0">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h2 className="text-xl font-bold text-oaxaca-purple flex items-center gap-2">
              <Bus className="text-oaxaca-pink" size={24} />
              BinniBus
            </h2>
            <p className="text-xs text-gray-500">Transporte oficial Guelaguetza 2025</p>
          </div>
          <button
            onClick={locateUser}
            className="p-2 bg-oaxaca-pink text-white rounded-full shadow-md hover:bg-oaxaca-purple transition-colors"
          >
            <Locate size={20} />
          </button>
        </div>

        {/* Route Selector */}
        <div className="flex gap-2 overflow-x-auto py-2 no-scrollbar">
          <button
            onClick={() => setShowAllRoutes(true)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
              showAllRoutes ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600'
            }`}
          >
            Todas
          </button>
          {ROUTES.map((route) => (
            <button
              key={route.id}
              onClick={() => selectRoute(route)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all flex items-center gap-1.5 ${
                selectedRoute.id === route.id && !showAllRoutes
                  ? 'bg-gray-900 text-white shadow-md'
                  : 'bg-gray-100 text-gray-600'
              }`}
            >
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: route.color }} />
              {route.shortName}
            </button>
          ))}
        </div>
      </div>

      {/* Map Container */}
      <div className="flex-1 relative">
        <MapContainer
          center={mapCenter}
          zoom={14}
          className="h-full w-full z-10"
          ref={mapRef}
          zoomControl={false}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <RecenterMap coords={mapCenter} />

          {/* User location marker */}
          {userLocation && (
            <Marker position={userLocation}>
              <Popup>Tu ubicación</Popup>
            </Marker>
          )}

          {/* Routes */}
          {(showAllRoutes ? ROUTES : [selectedRoute]).map((route) => (
            <React.Fragment key={route.id}>
              {/* Route polyline */}
              <Polyline
                positions={route.path}
                pathOptions={{
                  color: route.color,
                  weight: 5,
                  opacity: 0.8,
                  lineCap: 'round',
                  lineJoin: 'round',
                }}
              />

              {/* Bus stops */}
              {route.stops.map((stop, index) => (
                <Marker
                  key={stop.id}
                  position={stop.coords}
                  icon={createStopIcon(route.color, index === 0 || index === route.stops.length - 1)}
                >
                  <Popup>
                    <div className="text-center min-w-[120px]">
                      <p className="font-semibold text-sm">{stop.name}</p>
                      <p className="text-xs text-gray-500">{route.id} - {route.shortName}</p>
                    </div>
                  </Popup>
                </Marker>
              ))}

              {/* Animated buses */}
              <AnimatedBus route={route} offset={0} />
              {route.type === 'TRONCAL' && <AnimatedBus route={route} offset={0.5} />}
            </React.Fragment>
          ))}
        </MapContainer>

        {/* Route Info Card */}
        <div className="absolute bottom-4 left-4 right-4 z-20">
          <div
            className="bg-white rounded-2xl shadow-xl p-4 border-l-4"
            style={{ borderColor: selectedRoute.color }}
          >
            <div className="flex justify-between items-start mb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span
                    className="px-2 py-0.5 rounded text-xs font-bold text-white"
                    style={{ backgroundColor: selectedRoute.color }}
                  >
                    {selectedRoute.id}
                  </span>
                  <span className="text-xs text-gray-500 uppercase">{selectedRoute.type}</span>
                </div>
                <h3 className="font-bold text-gray-800 mt-1">{selectedRoute.name}</h3>
              </div>
              <div className="text-right">
                <div className="flex items-center gap-1 text-oaxaca-pink">
                  <Clock size={16} />
                  <span className="text-2xl font-bold">{eta}</span>
                  <span className="text-xs">min</span>
                </div>
                <p className="text-xs text-gray-500">Próximo bus</p>
              </div>
            </div>

            {/* Stats */}
            <div className="flex gap-4 mb-3 text-xs text-gray-600">
              <div className="flex items-center gap-1">
                <MapPin size={14} />
                <span>{selectedRoute.stops.length} paradas</span>
              </div>
              <div className="flex items-center gap-1">
                <Zap size={14} />
                <span>Cada {selectedRoute.frequency} min</span>
              </div>
              <div className="flex items-center gap-1">
                <Users size={14} />
                <span>Capacidad: 40</span>
              </div>
            </div>

            {/* Stops preview */}
            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
              {selectedRoute.stops.map((stop, i) => (
                <React.Fragment key={stop.id}>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: selectedRoute.color }}
                    />
                    <span className="text-xs whitespace-nowrap">{stop.name}</span>
                  </div>
                  {i < selectedRoute.stops.length - 1 && (
                    <ChevronRight size={12} className="text-gray-400 flex-shrink-0" />
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TransportView;
