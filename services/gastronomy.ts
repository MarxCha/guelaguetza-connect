// Gastronomy Service - Curated Oaxacan Food Places

export type GastronomyCategory = 'TLAYUDAS' | 'MEZCAL' | 'CHOCOLATE' | 'NIEVES';

export interface GastronomyPlace {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  category: GastronomyCategory;
  address: string;
  latitude: number;
  longitude: number;
  mustTry: string;
  vibe: string;
  priceRange: '$' | '$$' | '$$$';
  requiresReservation?: boolean;
}

// Category helpers
export const getCategoryLabel = (category: GastronomyCategory): string => {
  const labels: Record<GastronomyCategory, string> = {
    TLAYUDAS: 'Tlayudas',
    MEZCAL: 'Mezcal',
    CHOCOLATE: 'Chocolate',
    NIEVES: 'Nieves',
  };
  return labels[category];
};

export const getCategoryIcon = (category: GastronomyCategory): string => {
  const icons: Record<GastronomyCategory, string> = {
    TLAYUDAS: 'flame',
    MEZCAL: 'wine',
    CHOCOLATE: 'coffee',
    NIEVES: 'ice-cream-cone',
  };
  return icons[category];
};

export const getCategoryColor = (category: GastronomyCategory): string => {
  const colors: Record<GastronomyCategory, string> = {
    TLAYUDAS: '#EF4444',    // Red
    MEZCAL: '#8B5CF6',      // Purple
    CHOCOLATE: '#92400E',   // Brown
    NIEVES: '#06B6D4',      // Cyan
  };
  return colors[category];
};

// Deep link helpers
export const getGoogleMapsUrl = (place: GastronomyPlace): string => {
  const query = encodeURIComponent(`${place.name}, Oaxaca, Mexico`);
  return `https://www.google.com/maps/search/?api=1&query=${query}`;
};

export const getGoogleMapsDirectionsUrl = (place: GastronomyPlace): string => {
  return `https://www.google.com/maps/dir/?api=1&destination=${place.latitude},${place.longitude}`;
};

// Curated places data
export const GASTRONOMY_PLACES: GastronomyPlace[] = [
  // TLAYUDAS
  {
    id: 'tlayudas-libres',
    name: 'Tlayudas Libres (Doña Martha)',
    description: 'Se come en bancos en la banqueta o mesas sencillas. Auténtica experiencia callejera nocturna.',
    imageUrl: 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=400&h=400&fit=crop',
    category: 'TLAYUDAS',
    address: 'Calle de los Libres, Centro, Oaxaca',
    latitude: 17.0615,
    longitude: -96.7253,
    mustTry: 'Tlayuda mixta con tasajo y chorizo al carbón',
    vibe: 'Callejero, nocturno, auténtico',
    priceRange: '$',
  },
  {
    id: 'tlayudas-el-negro',
    name: 'Tlayudas El Negro',
    description: 'Restaurante familiar con servicio rápido, muy popular entre locales. Varias sucursales.',
    imageUrl: 'https://images.unsplash.com/photo-1551504734-5ee1c4a1479b?w=400&h=400&fit=crop',
    category: 'TLAYUDAS',
    address: 'Vicente Guerrero, Col. Alemán, Oaxaca',
    latitude: 17.0632,
    longitude: -96.7198,
    mustTry: 'Tlayuda de costilla o chapulines',
    vibe: 'Familiar, servicio rápido, popular',
    priceRange: '$',
  },
  {
    id: 'pasillo-de-humo',
    name: 'Pasillo de Humo',
    description: 'Eliges tu carne cruda y te la asan al momento. Experiencia sensorial única en el mercado.',
    imageUrl: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=400&h=400&fit=crop',
    category: 'TLAYUDAS',
    address: 'Mercado 20 de Noviembre, Centro',
    latitude: 17.0598,
    longitude: -96.7234,
    mustTry: 'Carne asada al momento con tlayuda',
    vibe: 'Caótico, sensorial, inmersivo',
    priceRange: '$',
  },

  // MEZCAL
  {
    id: 'la-mezcaloteca',
    name: 'La Mezcaloteca',
    description: 'Lugar educativo, no un bar de fiesta. Cata guiada experta con la mayor selección de mezcales.',
    imageUrl: 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=400&h=400&fit=crop',
    category: 'MEZCAL',
    address: 'Reforma, Centro, Oaxaca',
    latitude: 17.0608,
    longitude: -96.7256,
    mustTry: 'Cata educativa de mezcales artesanales',
    vibe: 'Íntimo, biblioteca de sabores',
    priceRange: '$$',
    requiresReservation: true,
  },
  {
    id: 'in-situ-mezcaleria',
    name: 'In Situ Mezcalería',
    description: 'Liderado por Ulises Torrentera, experto mezcalero. La mayor variedad de agaves silvestres.',
    imageUrl: 'https://images.unsplash.com/photo-1569529465841-dfecdab7503b?w=400&h=400&fit=crop',
    category: 'MEZCAL',
    address: 'Morelos, Centro, Oaxaca',
    latitude: 17.0622,
    longitude: -96.7241,
    mustTry: 'Mezcales de agave silvestre',
    vibe: 'Intelectual, experto, auténtico',
    priceRange: '$$',
  },
  {
    id: 'sabina-sabe',
    name: 'Sabina Sabe',
    description: 'Ambiente chic y moderno. Excelente coctelería con mezcal para quienes prefieren algo más elaborado.',
    imageUrl: 'https://images.unsplash.com/photo-1470337458703-46ad1756a187?w=400&h=400&fit=crop',
    category: 'MEZCAL',
    address: '5 de Mayo, Centro, Oaxaca',
    latitude: 17.0635,
    longitude: -96.7228,
    mustTry: 'Cócteles artesanales con mezcal',
    vibe: 'Chic, moderno, sofisticado',
    priceRange: '$$$',
  },

  // CHOCOLATE
  {
    id: 'chocolate-mayordomo',
    name: 'Chocolate Mayordomo',
    description: 'Aroma intenso de cacao. Puedes ver cómo muelen el cacao tradicionalmente.',
    imageUrl: 'https://images.unsplash.com/photo-1481391319762-47dff72954d9?w=400&h=400&fit=crop',
    category: 'CHOCOLATE',
    address: 'Macedonio Alcalá / Mercado 20 de Noviembre',
    latitude: 17.0605,
    longitude: -96.7240,
    mustTry: 'Chocolate de agua con pan de yema',
    vibe: 'Comercial, aromático, tradicional',
    priceRange: '$',
  },
  {
    id: 'rito-chocolateria',
    name: 'Rito Chocolatería',
    description: 'Chocolatería artesanal con cuidado estético. Muy instagrammable.',
    imageUrl: 'https://images.unsplash.com/photo-1511381939415-e44015466834?w=400&h=400&fit=crop',
    category: 'CHOCOLATE',
    address: 'Porfirio Díaz, Centro, Oaxaca',
    latitude: 17.0618,
    longitude: -96.7215,
    mustTry: 'Chocolate frío con alto % de cacao',
    vibe: 'Artesanal, estético, moderno',
    priceRange: '$$',
  },
  {
    id: 'oaxaca-en-una-taza',
    name: 'Oaxaca en una Taza',
    description: 'Cafetería acogedora con terraza pequeña. Ambiente relajado para disfrutar chocolate.',
    imageUrl: 'https://images.unsplash.com/photo-1517578239113-b03992dcdd25?w=400&h=400&fit=crop',
    category: 'CHOCOLATE',
    address: 'Calle de la Constitución, Centro',
    latitude: 17.0612,
    longitude: -96.7248,
    mustTry: 'Chocolate caliente tradicional',
    vibe: 'Acogedor, tranquilo, local',
    priceRange: '$',
  },

  // NIEVES
  {
    id: 'nieves-chaguita',
    name: 'Nieves Chagüita',
    description: 'Una institución en Oaxaca desde hace décadas. Sabores tradicionales únicos.',
    imageUrl: 'https://images.unsplash.com/photo-1497034825429-c343d7c6a68f?w=400&h=400&fit=crop',
    category: 'NIEVES',
    address: 'Mercado Benito Juárez, Centro',
    latitude: 17.0602,
    longitude: -96.7225,
    mustTry: 'Leche quemada con tuna',
    vibe: 'Tradicional, histórico, auténtico',
    priceRange: '$',
  },
  {
    id: 'jardin-socrates',
    name: 'Jardín Sócrates (Plaza de la Danza)',
    description: 'Al aire libre junto a la Basílica de la Soledad. Varios puestos de nieves artesanales.',
    imageUrl: 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=400&h=400&fit=crop',
    category: 'NIEVES',
    address: 'Plaza de la Danza, junto a Basílica de la Soledad',
    latitude: 17.0588,
    longitude: -96.7268,
    mustTry: 'Beso de Ángel o Pétalos de Rosa',
    vibe: 'Al aire libre, familiar, refrescante',
    priceRange: '$',
  },
];

// Get places by category
export const getPlacesByCategory = (category: GastronomyCategory | 'ALL'): GastronomyPlace[] => {
  if (category === 'ALL') {
    return GASTRONOMY_PLACES;
  }
  return GASTRONOMY_PLACES.filter(place => place.category === category);
};

// Get all categories
export const GASTRONOMY_CATEGORIES: GastronomyCategory[] = ['TLAYUDAS', 'MEZCAL', 'CHOCOLATE', 'NIEVES'];
