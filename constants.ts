import { BusRoute, Story, CulturalPoint } from './types';

export const ROUTES: BusRoute[] = [
  {
    id: 'RC01',
    name: 'Ruta Auditorio (Guelaguetza Segura)',
    color: '#D9006C', // Oaxaca Pink
    type: 'ESPECIAL',
    eta: 5,
    stops: ['Alameda de León', 'Chedraui Madero', 'Museo Infantil', 'Auditorio Guelaguetza']
  },
  {
    id: 'RC02',
    name: 'Ruta Feria del Mezcal',
    color: '#00AEEF', // Sky Blue
    type: 'ESPECIAL',
    eta: 12,
    stops: ['Centro Convenciones (CCCO)', 'Parque Juárez', 'Centro Histórico']
  },
  {
    id: 'T01',
    name: 'Viguera - San Sebastián',
    color: '#6A0F49', // Purple
    type: 'TRONCAL',
    eta: 8,
    stops: ['Viguera', 'Tecnológico', 'Centro', 'Rosario']
  }
];

export const STORIES: Story[] = [
  {
    id: '1',
    user: 'Ana Morales',
    avatar: '50/50?random=1',
    mediaUrl: '400/600?random=101',
    location: 'Auditorio Guelaguetza',
    likes: 342,
    description: '¡Viviendo la magia del Lunes del Cerro! 🎉 #Guelaguetza2025'
  },
  {
    id: '2',
    user: 'Carlos Ruiz',
    avatar: '50/50?random=2',
    mediaUrl: '400/600?random=102',
    location: 'Feria del Mezcal',
    likes: 89,
    description: 'Probando los mejores mezcales artesanales. 🥃'
  },
  {
    id: '3',
    user: 'Viajeros Oax',
    avatar: '50/50?random=3',
    mediaUrl: '400/600?random=103',
    location: 'Santo Domingo',
    likes: 1205,
    description: 'El desfile de delegaciones es impresionante. 😍'
  }
];

export const MAP_POINTS: CulturalPoint[] = [
  { id: '1', title: 'Auditorio Guelaguetza', description: 'Sede principal del evento.', coordinate: { x: 50, y: 20 }, type: 'EVENT' },
  { id: '2', title: 'Templo de Santo Domingo', description: 'Corazón cultural.', coordinate: { x: 50, y: 50 }, type: 'LANDMARK' },
  { id: '3', title: 'Feria del Mezcal (CCCO)', description: 'Degustación y venta.', coordinate: { x: 80, y: 70 }, type: 'EVENT' },
  { id: '4', title: 'Zócalo / Alameda', description: 'Punto de reunión central.', coordinate: { x: 50, y: 60 }, type: 'LANDMARK' },
];

export const AI_SYSTEM_INSTRUCTION = `
You are "GuelaBot", an expert cultural guide for the Guelaguetza festival in Oaxaca, Mexico.
Your tone is festive, welcoming, and helpful.
You provide information about:
1. Transport (BinniBus routes like RC01, RC02).
2. Cultural history of the dances (Flor de Piña, Danza de la Pluma).
3. Schedule of events.
Keep answers concise (under 80 words) as you are a chat assistant on a mobile app.
If asked about tickets, refer them to the official Ticketmaster page or physical booths.
IMPORTANT: You must only answer in Spanish.
`;