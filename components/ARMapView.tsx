import React, { useState, useEffect, useRef } from 'react';
import {
  ChevronLeft,
  MapPin,
  Navigation,
  Star,
  Heart,
  CheckCircle,
  Filter,
  List,
  Map as MapIcon,
  Locate,
  X,
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, useMap, CircleMarker } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import LoadingSpinner from './ui/LoadingSpinner';
import {
  getNearbyPOIs,
  PointOfInterest,
  POICategory,
  CATEGORY_LABELS,
  CATEGORY_COLORS,
  formatDistance,
} from '../services/poi';
import { ViewState } from '../types';

interface ARMapViewProps {
  onNavigate: (view: ViewState, data?: unknown) => void;
  onBack: () => void;
}

const CATEGORIES: POICategory[] = ['CULTURAL', 'GASTRONOMIA', 'ARTESANIA', 'EVENTO', 'TRANSPORTE', 'NATURALEZA'];

// Default Oaxaca coordinates
const DEFAULT_LAT = 17.0612;
const DEFAULT_LNG = -96.7256;

export default function ARMapView({ onNavigate, onBack }: ARMapViewProps) {
  const [pois, setPois] = useState<PointOfInterest[]>([]);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<POICategory | ''>('');
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState<'map' | 'list'>('map');
  const [selectedPOI, setSelectedPOI] = useState<PointOfInterest | null>(null);

  useEffect(() => {
    // Get user location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        () => {
          // Use default location if geolocation fails
          setUserLocation({ lat: DEFAULT_LAT, lng: DEFAULT_LNG });
        }
      );
    } else {
      setUserLocation({ lat: DEFAULT_LAT, lng: DEFAULT_LNG });
    }
  }, []);

  useEffect(() => {
    if (userLocation) {
      loadPOIs();
    }
  }, [userLocation, selectedCategory]);

  const loadPOIs = async () => {
    if (!userLocation) return;

    try {
      setLoading(true);
      const data = await getNearbyPOIs({
        latitude: userLocation.lat,
        longitude: userLocation.lng,
        radius: 10,
        category: selectedCategory || undefined,
        limit: 50,
      });
      setPois(data);
    } catch (error) {
      console.error('Error loading POIs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePOIClick = (poi: PointOfInterest) => {
    onNavigate(ViewState.POI_DETAIL, { poiId: poi.id });
  };

  const createCategoryIcon = (category: POICategory) => {
    const color = CATEGORY_COLORS[category];
    return L.divIcon({
      className: 'custom-poi-marker',
      html: `
        <div style="
          width: 36px;
          height: 36px;
          background: ${color};
          border: 3px solid white;
          border-radius: 50%;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          display: flex;
          align-items: center;
          justify-content: center;
        ">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="white" stroke="white" stroke-width="2">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/>
            <circle cx="12" cy="10" r="3"/>
          </svg>
        </div>
      `,
      iconSize: [36, 36],
      iconAnchor: [18, 36],
    });
  };

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white p-4 pt-8 md:pt-6 z-10">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <button onClick={onBack} className="p-2 hover:bg-white/20 rounded-full transition">
                <ChevronLeft className="w-6 h-6" />
              </button>
              <div>
                <h1 className="text-xl md:text-2xl font-bold">Mapa Interactivo</h1>
                <p className="text-sm md:text-base text-white/80">{pois.length} lugares cerca de ti</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setViewMode(viewMode === 'map' ? 'list' : 'map')}
                className="p-2 md:p-2.5 bg-white/20 rounded-full hover:bg-white/30 transition"
              >
                {viewMode === 'map' ? <List className="w-5 h-5" /> : <MapIcon className="w-5 h-5" />}
              </button>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`p-2 md:p-2.5 rounded-full transition ${showFilters ? 'bg-white text-emerald-600' : 'bg-white/20 hover:bg-white/30'}`}
              >
                <Filter className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Category filters */}
          {showFilters && (
            <div className="flex gap-2 overflow-x-auto pb-2 md:flex-wrap">
              <button
                onClick={() => setSelectedCategory('')}
                className={`px-3 py-1.5 md:px-4 md:py-2 rounded-full text-sm whitespace-nowrap transition ${
                  selectedCategory === '' ? 'bg-white text-emerald-600' : 'bg-white/20 hover:bg-white/30'
                }`}
              >
                Todos
              </button>
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 md:px-4 md:py-2 rounded-full text-sm whitespace-nowrap transition ${
                    selectedCategory === cat ? 'bg-white text-emerald-600' : 'bg-white/20 hover:bg-white/30'
                  }`}
                >
                  {CATEGORY_LABELS[cat]}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 relative">
        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-800">
            <LoadingSpinner size="lg" text="Cargando mapa..." />
          </div>
        ) : viewMode === 'map' ? (
          <MapContainer
            center={[userLocation?.lat || DEFAULT_LAT, userLocation?.lng || DEFAULT_LNG]}
            zoom={14}
            minZoom={12}
            maxZoom={18}
            maxBounds={[
              [16.85, -96.85], // Southwest corner of Oaxaca area
              [17.25, -96.60], // Northeast corner of Oaxaca area
            ]}
            maxBoundsViscosity={1.0}
            className="h-full w-full z-0"
            zoomControl={false}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {/* User location marker */}
            {userLocation && (
              <CircleMarker
                center={[userLocation.lat, userLocation.lng]}
                radius={10}
                fillColor="#3B82F6"
                fillOpacity={1}
                stroke={true}
                color="white"
                weight={3}
              >
                <Popup>Tu ubicacion</Popup>
              </CircleMarker>
            )}

            {/* POI markers */}
            {pois.map((poi) => (
              <Marker
                key={poi.id}
                position={[poi.latitude, poi.longitude]}
                icon={createCategoryIcon(poi.category)}
                eventHandlers={{
                  click: () => setSelectedPOI(poi),
                }}
              >
                <Popup>
                  <div className="text-center min-w-[150px]">
                    <h3 className="font-semibold">{poi.name}</h3>
                    <p className="text-xs text-gray-500">{CATEGORY_LABELS[poi.category]}</p>
                    {poi.distance !== undefined && (
                      <p className="text-xs text-gray-500">{formatDistance(poi.distance)}</p>
                    )}
                  </div>
                </Popup>
              </Marker>
            ))}

            <LocationControl userLocation={userLocation} />
          </MapContainer>
        ) : (
          <div className="h-full overflow-y-auto p-4 md:p-6 lg:p-8">
            <div className="max-w-7xl mx-auto">
              {pois.length === 0 ? (
                <div className="text-center py-12">
                  <MapPin className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
                  <p className="text-gray-500 dark:text-gray-400">No se encontraron lugares cercanos</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {pois.map((poi) => (
                    <POIListCard key={poi.id} poi={poi} onClick={() => handlePOIClick(poi)} />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Selected POI Panel */}
        {selectedPOI && viewMode === 'map' && (
          <div className="absolute bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 z-[1000]">
            <button
              onClick={() => setSelectedPOI(null)}
              className="absolute top-2 right-2 p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
            >
              <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            </button>

            <div className="flex gap-3">
              <img
                src={selectedPOI.imageUrl || `https://picsum.photos/100/100?random=${selectedPOI.id}`}
                alt={selectedPOI.name}
                className="w-20 h-20 rounded-lg object-cover"
              />
              <div className="flex-1">
                <span
                  className="text-xs font-medium px-2 py-0.5 rounded-full"
                  style={{
                    backgroundColor: `${CATEGORY_COLORS[selectedPOI.category]}20`,
                    color: CATEGORY_COLORS[selectedPOI.category],
                  }}
                >
                  {CATEGORY_LABELS[selectedPOI.category]}
                </span>
                <h3 className="font-semibold mt-1 text-gray-900 dark:text-gray-100">{selectedPOI.name}</h3>
                <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {selectedPOI.rating > 0 && (
                    <div className="flex items-center gap-1">
                      <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                      {selectedPOI.rating.toFixed(1)}
                    </div>
                  )}
                  {selectedPOI.distance !== undefined && (
                    <div className="flex items-center gap-1">
                      <Navigation className="w-4 h-4" />
                      {formatDistance(selectedPOI.distance)}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <button
              onClick={() => handlePOIClick(selectedPOI)}
              className="w-full mt-3 py-2.5 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition"
            >
              Ver detalles
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// Location control component
function LocationControl({ userLocation }: { userLocation: { lat: number; lng: number } | null }) {
  const map = useMap();

  const centerOnUser = () => {
    if (userLocation) {
      map.flyTo([userLocation.lat, userLocation.lng], 15);
    }
  };

  return (
    <div className="leaflet-bottom leaflet-right" style={{ marginBottom: '20px', marginRight: '10px' }}>
      <button
        onClick={centerOnUser}
        className="bg-white p-3 rounded-full shadow-lg hover:bg-gray-50"
        style={{ zIndex: 1000 }}
      >
        <Locate className="w-5 h-5 text-gray-700" />
      </button>
    </div>
  );
}

// List card component
interface POIListCardProps {
  poi: PointOfInterest;
  onClick: () => void;
}

function POIListCard({ poi, onClick }: POIListCardProps) {
  return (
    <div
      onClick={onClick}
      className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden flex cursor-pointer hover:shadow-md hover:scale-[1.02] transition-all"
    >
      <img
        src={poi.imageUrl || `https://picsum.photos/100/100?random=${poi.id}`}
        alt={poi.name}
        className="w-24 md:w-28 h-24 md:h-28 object-cover"
      />
      <div className="flex-1 p-3 md:p-4">
        <span
          className="text-xs font-medium px-2 py-0.5 rounded-full"
          style={{
            backgroundColor: `${CATEGORY_COLORS[poi.category]}20`,
            color: CATEGORY_COLORS[poi.category],
          }}
        >
          {CATEGORY_LABELS[poi.category]}
        </span>
        <h3 className="font-semibold mt-1 line-clamp-1 text-gray-900 dark:text-gray-100">{poi.name}</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-1">{poi.address || poi.description}</p>
        <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400 mt-1">
          {poi.rating > 0 && (
            <div className="flex items-center gap-1">
              <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
              {poi.rating.toFixed(1)}
            </div>
          )}
          {poi.distance !== undefined && (
            <div className="flex items-center gap-1">
              <Navigation className="w-4 h-4" />
              {formatDistance(poi.distance)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
