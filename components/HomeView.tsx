import React, { useState } from 'react';
import { MapPin, Calendar, PlayCircle, Camera, X, ChevronRight, Utensils, Wine, Coffee, IceCream } from 'lucide-react';
import { ViewState } from '../types';

interface HomeViewProps {
  setView: (view: ViewState) => void;
}

const GASTRO_ITEMS = [
  { name: 'Tlayudas', desc: 'Tortilla gigante con asiento, frijoles y quesillo', icon: Utensils },
  { name: 'Mezcal', desc: 'Destilado artesanal de agave oaxaqueño', icon: Wine },
  { name: 'Chocolate', desc: 'Bebida tradicional de cacao y canela', icon: Coffee },
  { name: 'Nieves', desc: 'Helados artesanales de sabores regionales', icon: IceCream },
];

const HomeView: React.FC<HomeViewProps> = ({ setView }) => {
  const [showGastroModal, setShowGastroModal] = useState(false);

  return (
    <div className="pb-24 animate-fade-in">
      {/* Hero Header */}
      <div className="relative h-64 bg-oaxaca-pink rounded-b-[2rem] overflow-hidden shadow-lg">
        <img
          src="https://picsum.photos/800/600?grayscale&blur=2"
          alt="Guelaguetza Texture"
          className="absolute inset-0 w-full h-full object-cover opacity-30 mix-blend-multiply"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-oaxaca-pink/90"></div>
        <div className="absolute bottom-6 left-6 right-6 text-white">
          <p className="text-sm font-semibold uppercase tracking-wider mb-1 text-oaxaca-yellow">Julio 21-28, 2025</p>
          <h1 className="text-3xl font-bold leading-tight">Guelaguetza Connect</h1>
          <p className="text-white/90 text-sm mt-2">La máxima fiesta de los Oaxaqueños en tu bolsillo.</p>
        </div>
      </div>

      {/* Next Event Card */}
      <div className="px-6 -mt-8 relative z-10">
        <div
          onClick={() => setView(ViewState.PROGRAM)}
          className="bg-white rounded-xl shadow-md p-4 flex items-center justify-between border-l-4 border-oaxaca-yellow cursor-pointer hover:shadow-lg transition active:scale-[0.98]"
        >
          <div>
            <h3 className="font-bold text-gray-800">Próximo Evento</h3>
            <p className="text-sm text-gray-500">Desfile de Delegaciones • 17:00</p>
          </div>
          <button className="bg-oaxaca-purple text-white p-2 rounded-full hover:bg-opacity-90 transition">
             <PlayCircle size={24} />
          </button>
        </div>
      </div>

      {/* Quick Actions Grid */}
      <div className="grid grid-cols-2 gap-4 px-6 mt-6">
        <div
          onClick={() => setView(ViewState.TRANSPORT)}
          className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 active:scale-95 transition cursor-pointer hover:shadow-md"
        >
          <div className="bg-blue-100 w-10 h-10 rounded-full flex items-center justify-center text-blue-600 mb-3">
            <MapPin size={20} />
          </div>
          <h3 className="font-bold text-gray-800">Transporte</h3>
          <p className="text-xs text-gray-500 mt-1">Rutas seguras y ETA</p>
        </div>

        <div
          onClick={() => setView(ViewState.AR_SCANNER)}
          className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 active:scale-95 transition cursor-pointer hover:shadow-md"
        >
          <div className="bg-purple-100 w-10 h-10 rounded-full flex items-center justify-center text-purple-600 mb-3">
            <Camera size={20} />
          </div>
          <h3 className="font-bold text-gray-800">Museo AR</h3>
          <p className="text-xs text-gray-500 mt-1">Descubre la magia</p>
        </div>

        <div
          onClick={() => setView(ViewState.STORIES)}
          className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 active:scale-95 transition cursor-pointer hover:shadow-md"
        >
          <div className="bg-pink-100 w-10 h-10 rounded-full flex items-center justify-center text-pink-600 mb-3">
            <PlayCircle size={20} />
          </div>
          <h3 className="font-bold text-gray-800">Historias</h3>
          <p className="text-xs text-gray-500 mt-1">Momentos en vivo</p>
        </div>

        <div
          onClick={() => setView(ViewState.PROGRAM)}
          className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 active:scale-95 transition cursor-pointer hover:shadow-md"
        >
          <div className="bg-yellow-100 w-10 h-10 rounded-full flex items-center justify-center text-yellow-700 mb-3">
            <Calendar size={20} />
          </div>
          <h3 className="font-bold text-gray-800">Programa</h3>
          <p className="text-xs text-gray-500 mt-1">Ver calendario</p>
        </div>
      </div>

      {/* Featured Banner - Gastronomy */}
      <div className="px-6 mt-8">
        <h2 className="font-bold text-lg mb-4 text-gray-800">Descubre Oaxaca</h2>
        <div
          onClick={() => setShowGastroModal(true)}
          className="relative rounded-xl overflow-hidden h-40 shadow-md cursor-pointer hover:shadow-lg transition active:scale-[0.98]"
        >
          <img src="https://picsum.photos/600/300?grayscale" alt="Cultural" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/50 to-transparent flex items-center">
            <div className="pl-6">
              <p className="text-oaxaca-yellow text-xs font-semibold uppercase tracking-wider">Guía culinaria</p>
              <p className="font-bold text-2xl text-white">Gastronomía</p>
              <div className="mt-2 flex items-center gap-1 text-white/80 text-xs">
                <span>Explorar</span>
                <ChevronRight size={14} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Gastronomy Modal */}
      {showGastroModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md max-h-[80vh] overflow-hidden animate-in slide-in-from-bottom duration-300">
            {/* Modal Header */}
            <div className="bg-oaxaca-purple p-4 text-white flex items-center justify-between">
              <div>
                <h3 className="font-bold text-lg">Gastronomía Oaxaqueña</h3>
                <p className="text-xs text-white/70">Sabores que enamoran</p>
              </div>
              <button
                onClick={() => setShowGastroModal(false)}
                className="p-1 rounded-full hover:bg-white/20 transition"
              >
                <X size={24} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-4 space-y-3 overflow-y-auto max-h-[60vh]">
              {GASTRO_ITEMS.map((item, index) => (
                <div key={index} className="flex items-center gap-4 p-3 bg-gray-50 rounded-xl">
                  <div className="bg-oaxaca-yellow/20 p-3 rounded-full">
                    <item.icon size={24} className="text-oaxaca-purple" />
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900">{item.name}</h4>
                    <p className="text-xs text-gray-500">{item.desc}</p>
                  </div>
                </div>
              ))}

              <div className="pt-4 border-t border-gray-100">
                <p className="text-xs text-gray-500 text-center">
                  Visita la Feria del Mezcal en el CCCO y el Mercado 20 de Noviembre para probar estos deliciosos platillos.
                </p>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-gray-100">
              <button
                onClick={() => {
                  setShowGastroModal(false);
                  setView(ViewState.CHAT);
                }}
                className="w-full py-3 bg-oaxaca-pink text-white rounded-xl font-medium hover:bg-opacity-90 transition"
              >
                Pregunta a GuelaBot por recomendaciones
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HomeView;
