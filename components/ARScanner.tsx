import React, { useState, useRef, useEffect } from 'react';
import { Camera, X, Scan, Zap, Volume2, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import GradientPlaceholder from './ui/GradientPlaceholder';

interface MarkerData {
  id: string;
  name: string;
  region: string;
  description: string;
  color: string;
  image: string;
  facts: string[];
}

const MARKERS_DATA: MarkerData[] = [
  {
    id: 'danzante',
    name: 'Danzante de la Pluma',
    region: 'Valles Centrales',
    description: 'Simboliza la conquista de México. El penacho representa el sol y el poder espiritual, adornado con espejos para reflejar la luz divina.',
    color: '#D9006C',
    image: '400/300?random=201',
    facts: ['Pesa hasta 25 kg', 'Danza por 8 horas', 'Tradición de 500 años']
  },
  {
    id: 'barro',
    name: 'Barro Negro de Oaxaca',
    region: 'San Bartolo Coyotepec',
    description: 'Artesanía ancestral de arcilla negra pulida. Su color característico se obtiene mediante un proceso de horneado especial sin oxígeno.',
    color: '#1C1917',
    image: '400/300?random=202',
    facts: ['Técnica prehispánica', 'Sin pintura añadida', 'Patrimonio cultural']
  },
  {
    id: 'alebrije',
    name: 'Alebrije Oaxaqueño',
    region: 'San Martín Tilcajete',
    description: 'Seres fantásticos tallados en madera de copal y pintados a mano con diseños zapotecos. Se cree que son guías espirituales.',
    color: '#FFD100',
    image: '400/300?random=203',
    facts: ['Madera de copal', 'Pintados a mano', 'Guías espirituales']
  },
  {
    id: 'flor',
    name: 'Danza Flor de Piña',
    region: 'Tuxtepec',
    description: 'Las mujeres bailan con piñas en los hombros, representando la abundancia y fertilidad de la región de la Cuenca del Papaloapan.',
    color: '#00AEEF',
    image: '400/300?random=204',
    facts: ['Solo mujeres danzan', 'Piñas reales', 'Huipil bordado']
  }
];

interface ARScannerProps {
  onBack?: () => void;
}

const ARScanner: React.FC<ARScannerProps> = ({ onBack }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [detectedMarker, setDetectedMarker] = useState<MarkerData | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showGallery, setShowGallery] = useState(false);

  useEffect(() => {
    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          setHasPermission(true);
        }
      } catch (err) {
        console.error("Camera error:", err);
        setHasPermission(false);
      }
    };

    if (!showGallery) {
      startCamera();
    }

    return () => {
      if (videoRef.current?.srcObject) {
        (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
      }
    };
  }, [showGallery]);

  // Simulated scanning
  useEffect(() => {
    if (!hasPermission || detectedMarker || showGallery) {
      setIsScanning(false);
      return;
    }

    setIsScanning(true);
    let progress = 0;

    const interval = setInterval(() => {
      progress += Math.random() * 15 + 5;
      setScanProgress(Math.min(progress, 100));

      if (progress >= 100) {
        clearInterval(interval);
        const marker = MARKERS_DATA[currentIndex % MARKERS_DATA.length];
        setDetectedMarker(marker);
        setIsScanning(false);
      }
    }, 200);

    return () => clearInterval(interval);
  }, [hasPermission, detectedMarker, showGallery, currentIndex]);

  const handleReset = () => {
    setDetectedMarker(null);
    setScanProgress(0);
    setCurrentIndex(prev => prev + 1);
  };

  const handleGallery = () => {
    setShowGallery(true);
    setDetectedMarker(null);
  };

  const nextItem = () => setCurrentIndex(prev => (prev + 1) % MARKERS_DATA.length);
  const prevItem = () => setCurrentIndex(prev => (prev - 1 + MARKERS_DATA.length) % MARKERS_DATA.length);

  // Gallery Mode
  if (showGallery) {
    const item = MARKERS_DATA[currentIndex];
    return (
      <div className="h-full bg-gradient-to-br from-gray-900 via-purple-900/30 to-black flex flex-col">
        {/* Header */}
        <div className="p-4 flex items-center justify-between">
          <button onClick={onBack || (() => setShowGallery(false))} className="text-white p-2 rounded-full bg-white/10">
            <X size={24} />
          </button>
          <h2 className="text-white font-bold">Museo Virtual</h2>
          <button onClick={() => setShowGallery(false)} className="text-white p-2 rounded-full bg-white/10">
            <Camera size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col items-center justify-center px-6 pb-24">
          {/* Image Card */}
          <div className="relative w-full max-w-sm aspect-[4/3] rounded-2xl overflow-hidden shadow-2xl mb-6">
            {item.image ? (
              <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
            ) : (
              <GradientPlaceholder variant="crafts" className="w-full h-full" alt={item.name} />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
            <div className="absolute bottom-4 left-4 right-4">
              <p className="text-xs text-white/60 uppercase tracking-wider">{item.region}</p>
              <h3 className="text-xl font-bold text-white">{item.name}</h3>
            </div>
            {/* Sparkle effect */}
            <div className="absolute top-4 right-4">
              <Sparkles className="text-yellow-400 animate-pulse" size={24} />
            </div>
          </div>

          {/* Navigation */}
          <div className="flex items-center gap-4 mb-6">
            <button onClick={prevItem} className="p-3 rounded-full bg-white/10 text-white hover:bg-white/20">
              <ChevronLeft size={24} />
            </button>
            <div className="flex gap-2">
              {MARKERS_DATA.map((_, i) => (
                <div key={i} className={`w-2 h-2 rounded-full transition-all ${i === currentIndex ? 'bg-oaxaca-pink w-6' : 'bg-white/30'}`} />
              ))}
            </div>
            <button onClick={nextItem} className="p-3 rounded-full bg-white/10 text-white hover:bg-white/20">
              <ChevronRight size={24} />
            </button>
          </div>

          {/* Description */}
          <p className="text-white/80 text-sm text-center leading-relaxed mb-4 max-w-sm">
            {item.description}
          </p>

          {/* Facts */}
          <div className="flex flex-wrap justify-center gap-2">
            {item.facts.map((fact, i) => (
              <span key={i} className="px-3 py-1 rounded-full text-xs font-medium text-white" style={{ backgroundColor: item.color + '80' }}>
                {fact}
              </span>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Camera Mode
  return (
    <div className="relative h-full bg-black overflow-hidden">
      {/* Camera Feed */}
      {hasPermission === true ? (
        <video ref={videoRef} autoPlay playsInline muted className="absolute inset-0 w-full h-full object-cover" />
      ) : hasPermission === false ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900 text-white p-6 text-center">
          <Camera size={48} className="mb-4 text-gray-500" />
          <p className="text-lg font-medium mb-2">Cámara no disponible</p>
          <p className="text-sm text-gray-400 mb-6">Permite el acceso a la cámara o explora el museo virtual</p>
          <button onClick={handleGallery} className="bg-oaxaca-pink text-white px-6 py-3 rounded-full font-medium">
            Ver Museo Virtual
          </button>
        </div>
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-oaxaca-pink border-t-transparent" />
        </div>
      )}

      {/* AR Overlay */}
      {hasPermission && (
        <>
          {/* Header */}
          <div className="absolute top-4 left-4 right-4 z-20 flex justify-between items-center">
            <div className="flex items-center gap-2">
              {onBack && (
                <button onClick={onBack} className="bg-black/50 backdrop-blur-md p-2 rounded-full text-white">
                  <X size={20} />
                </button>
              )}
              <div className="bg-black/50 backdrop-blur-md px-4 py-2 rounded-full">
                <p className="text-white text-sm font-medium">Museo Invisible AR</p>
              </div>
            </div>
            <button onClick={handleGallery} className="bg-white/20 backdrop-blur-md p-2 rounded-full text-white">
              <Sparkles size={20} />
            </button>
          </div>

          {/* Scanning Reticle */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="relative w-64 h-64">
              {/* Corner brackets */}
              <div className="absolute top-0 left-0 w-12 h-12 border-t-4 border-l-4 border-white rounded-tl-lg" />
              <div className="absolute top-0 right-0 w-12 h-12 border-t-4 border-r-4 border-white rounded-tr-lg" />
              <div className="absolute bottom-0 left-0 w-12 h-12 border-b-4 border-l-4 border-white rounded-bl-lg" />
              <div className="absolute bottom-0 right-0 w-12 h-12 border-b-4 border-r-4 border-white rounded-br-lg" />

              {/* Scanning animation */}
              {isScanning && (
                <div className="absolute inset-4 overflow-hidden rounded-lg">
                  <div
                    className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-oaxaca-pink to-transparent"
                    style={{
                      top: `${(scanProgress % 100)}%`,
                      boxShadow: '0 0 20px rgba(217, 0, 108, 0.8)',
                      animation: 'none'
                    }}
                  />
                </div>
              )}

              {/* Detection pulse */}
              {detectedMarker && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-20 h-20 rounded-full bg-oaxaca-yellow/30 animate-ping" />
                  <Zap className="absolute text-oaxaca-yellow" size={32} />
                </div>
              )}
            </div>
          </div>

          {/* Status Bar */}
          <div className="absolute bottom-32 left-0 right-0 flex justify-center">
            <div className="bg-black/60 backdrop-blur-md px-4 py-2 rounded-full flex items-center gap-3">
              {isScanning ? (
                <>
                  <Scan size={18} className="text-white animate-pulse" />
                  <span className="text-white text-sm">Escaneando... {Math.round(scanProgress)}%</span>
                </>
              ) : detectedMarker ? (
                <>
                  <Zap size={18} className="text-oaxaca-yellow" />
                  <span className="text-oaxaca-yellow text-sm font-bold">¡Encontrado!</span>
                </>
              ) : (
                <>
                  <Camera size={18} className="text-white" />
                  <span className="text-white text-sm">Apunta a un objeto cultural</span>
                </>
              )}
            </div>
          </div>
        </>
      )}

      {/* Detection Card */}
      {detectedMarker && (
        <div className="absolute bottom-24 left-4 right-4 bg-white rounded-2xl p-4 shadow-2xl z-30 animate-in slide-in-from-bottom duration-300">
          <div className="flex gap-4">
            {detectedMarker.image ? (
              <img src={detectedMarker.image} alt={detectedMarker.name} className="w-20 h-20 rounded-xl object-cover" />
            ) : (
              <GradientPlaceholder variant="crafts" className="w-20 h-20 rounded-xl" alt={detectedMarker.name} />
            )}
            <div className="flex-1">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-bold text-gray-900">{detectedMarker.name}</h3>
                  <p className="text-xs text-gray-500">{detectedMarker.region}</p>
                </div>
                <button onClick={handleReset} className="p-1 rounded-full hover:bg-gray-100">
                  <X size={18} className="text-gray-400" />
                </button>
              </div>
              <p className="text-xs text-gray-600 mt-1 line-clamp-2">{detectedMarker.description}</p>
            </div>
          </div>
          <div className="flex gap-2 mt-3">
            <button
              onClick={handleGallery}
              className="flex-1 py-2 rounded-lg text-sm font-medium text-white flex items-center justify-center gap-2"
              style={{ backgroundColor: detectedMarker.color }}
            >
              <Sparkles size={16} /> Ver más
            </button>
            <button className="flex-1 py-2 rounded-lg text-sm font-medium border border-gray-200 text-gray-700 flex items-center justify-center gap-2">
              <Volume2 size={16} /> Audio
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ARScanner;
