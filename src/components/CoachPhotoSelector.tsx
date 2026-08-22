import React, { useState, useRef } from 'react';
import { Camera, Upload, Grid, Info, X, Check, RefreshCw, AlertCircle, Sparkles, Image as ImageIcon, Loader2 } from 'lucide-react';

interface CoachPhotoSelectorProps {
  currentPhotoUrl: string;
  onSelectPhoto: (url: string) => void;
  avatarPresets?: string[];
}

export const defaultAvatarPresets = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=300&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=300&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=300&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=300&auto=format&fit=crop&q=80',
];

/**
 * Compresses and scales down any user-uploaded image to a lightweight 3:4 ID format (max 600x800)
 * to ensure 100% compatibility with mobile storage (localStorage 5MB limit) and fast rendering.
 */
const compressAndResizeImage = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Error al leer el archivo de imagen'));
    reader.onload = (event) => {
      const img = new Image();
      img.onerror = () => reject(new Error('No se pudo decodificar la imagen'));
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const maxTargetWidth = 600;
          const maxTargetHeight = 800;

          let width = img.width;
          let height = img.height;

          // Compute dimensions maintaining aspect ratio or scaling down
          if (width > maxTargetWidth || height > maxTargetHeight) {
            const ratio = Math.min(maxTargetWidth / width, maxTargetHeight / height);
            width = Math.round(width * ratio);
            height = Math.round(height * ratio);
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(event.target?.result as string);
            return;
          }

          // Smooth rendering
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, width, height);

          // Export as optimized JPEG (compact ~40-70kb)
          const optimizedDataUrl = canvas.toDataURL('image/jpeg', 0.85);
          resolve(optimizedDataUrl);
        } catch (err) {
          // Fallback to original data url if canvas manipulation fails
          resolve(event.target?.result as string);
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
};

export const CoachPhotoSelector: React.FC<CoachPhotoSelectorProps> = ({
  currentPhotoUrl,
  onSelectPhoto,
  avatarPresets = defaultAvatarPresets,
}) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'camera' | 'presets'>('presets');
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [uploadFeedback, setUploadFeedback] = useState<string | null>(null);

  const fileGalleryInputRef = useRef<HTMLInputElement>(null);
  const fileCameraInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Handle File Upload from device (Gallery or Native Mobile Camera)
  const processSelectedFile = async (file: File | undefined) => {
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Por favor, selecciona un archivo de imagen válido (JPG, PNG, WEBP).');
      return;
    }

    try {
      setIsProcessingFile(true);
      setUploadFeedback('Optimizando foto para tu ficha oficial...');

      const optimizedUrl = await compressAndResizeImage(file);
      onSelectPhoto(optimizedUrl);

      setUploadFeedback('¡Foto cargada y optimizada con éxito!');
      setTimeout(() => {
        setUploadFeedback(null);
        setIsProcessingFile(false);
      }, 2000);
    } catch (err: any) {
      console.error('Error procesando imagen:', err);
      setIsProcessingFile(false);
      setUploadFeedback('Error al procesar la foto. Intenta con otra imagen.');
      setTimeout(() => setUploadFeedback(null), 3000);
    }
  };

  const handleGalleryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    processSelectedFile(file);
    // Reset input value to allow selecting same file again if needed
    e.target.value = '';
  };

  const handleNativeCameraChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    processSelectedFile(file);
    // Reset input value
    e.target.value = '';
  };

  // Start Live WebRTC Camera Stream (for desktop or browsers supporting getUserMedia)
  const startLiveCamera = async () => {
    setCameraError(null);
    setIsCameraOpen(true);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Tu navegador no permite acceso directo a la cámara por video en vivo.');
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 800 }, facingMode: 'user' },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (err: any) {
      console.error('Error al acceder a la cámara:', err);
      setCameraError(
        'No se pudo abrir la cámara en vivo del navegador. Puedes usar la opción "Hacer Foto con Móvil" o "Galería".'
      );
    }
  };

  // Stop Camera Stream
  const stopLiveCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsCameraOpen(false);
  };

  // Capture Photo from Video Stream
  const capturePhoto = () => {
    if (!videoRef.current) return;
    setIsCapturing(true);

    const canvas = document.createElement('canvas');
    canvas.width = 300;
    canvas.height = 400;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      const video = videoRef.current;
      const vWidth = video.videoWidth || 640;
      const vHeight = video.videoHeight || 480;

      // Crop video to 3:4 ratio centered
      let sourceWidth = vWidth;
      let sourceHeight = (vWidth * 4) / 3;
      if (sourceHeight > vHeight) {
        sourceHeight = vHeight;
        sourceWidth = (vHeight * 3) / 4;
      }

      const sourceX = (vWidth - sourceWidth) / 2;
      const sourceY = (vHeight - sourceHeight) / 2;

      ctx.drawImage(video, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, 300, 400);

      const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
      onSelectPhoto(dataUrl);
      setUploadFeedback('¡Foto capturada con éxito!');
      setTimeout(() => setUploadFeedback(null), 2500);
    }

    setIsCapturing(false);
    stopLiveCamera();
  };

  return (
    <div className="space-y-4 p-4 rounded-2xl bg-slate-50 border border-slate-200 shadow-sm" id="coach-photo-selector-container">
      {/* Information Banner about Official ID Photo Format */}
      <div className="p-3.5 rounded-xl bg-gradient-to-r from-blue-900/90 via-slate-900 to-indigo-900 text-white space-y-2 border border-blue-500/30">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/30">
            <Info className="w-4 h-4 text-amber-400" />
          </div>
          <h4 className="font-extrabold text-xs text-amber-300 uppercase tracking-wider">
            Requisitos de la Imagen para la Ficha Oficial
          </h4>
        </div>

        <div className="text-[11px] text-slate-200 leading-relaxed space-y-1 pl-1">
          <p className="flex items-center gap-1.5 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
            <span><strong>Formato:</strong> Fotografía tipo Carnet de Identidad / DNI / Licencia federativa oficial.</span>
          </p>
          <p className="flex items-center gap-1.5 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
            <span><strong>Dimensiones recomendadas:</strong> Proporción 3:4 (rostro centrado, fondo claro o neutro).</span>
          </p>
        </div>
      </div>

      {/* Upload Feedback Toast */}
      {uploadFeedback && (
        <div className={`p-3 rounded-xl text-xs font-bold flex items-center gap-2 animate-fadeIn ${
          uploadFeedback.includes('Error')
            ? 'bg-rose-50 border border-rose-200 text-rose-800'
            : 'bg-emerald-50 border border-emerald-200 text-emerald-800'
        }`}>
          {isProcessingFile ? (
            <Loader2 className="w-4 h-4 text-amber-600 animate-spin shrink-0" />
          ) : uploadFeedback.includes('Error') ? (
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          ) : (
            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
          )}
          <span>{uploadFeedback}</span>
        </div>
      )}

      {/* Preview & Selection Controls */}
      <div className="flex flex-col sm:flex-row items-center gap-4">
        {/* Current Photo Preview */}
        <div className="relative shrink-0">
          <img
            src={currentPhotoUrl || avatarPresets[0]}
            alt="Foto Entrenador"
            className="w-24 h-32 rounded-xl object-cover border-2 border-amber-500 shadow-md bg-slate-200"
            onError={(e) => {
              (e.target as HTMLElement).setAttribute('src', avatarPresets[0]);
            }}
          />
          <div className="absolute -bottom-2 -right-2 bg-amber-500 text-white p-1 rounded-lg text-[9px] font-black uppercase shadow">
            3:4 Carnet
          </div>
        </div>

        {/* Action Tabs */}
        <div className="flex-1 space-y-3 w-full">
          <div className="flex items-center gap-1.5 p-1 bg-slate-200/80 rounded-xl">
            <button
              type="button"
              id="coach-tab-upload-btn"
              onClick={() => {
                stopLiveCamera();
                setActiveTab('upload');
              }}
              className={`flex-1 py-2 px-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'upload'
                  ? 'bg-amber-500 text-white shadow-sm'
                  : 'text-slate-700 hover:bg-slate-300/60'
              }`}
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Subir / Móvil</span>
            </button>

            <button
              type="button"
              id="coach-tab-camera-btn"
              onClick={() => {
                setActiveTab('camera');
                startLiveCamera();
              }}
              className={`flex-1 py-2 px-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'camera' || isCameraOpen
                  ? 'bg-amber-500 text-white shadow-sm'
                  : 'text-slate-700 hover:bg-slate-300/60'
              }`}
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Cámara Web</span>
            </button>

            <button
              type="button"
              id="coach-tab-presets-btn"
              onClick={() => {
                stopLiveCamera();
                setActiveTab('presets');
              }}
              className={`flex-1 py-2 px-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'presets'
                  ? 'bg-amber-500 text-white shadow-sm'
                  : 'text-slate-700 hover:bg-slate-300/60'
              }`}
            >
              <Grid className="w-3.5 h-3.5" />
              <span>Pasarela</span>
            </button>
          </div>

          {/* Hidden File Inputs: 1 for Gallery/Files, 1 for Native Phone Camera Capture */}
          <input
            ref={fileGalleryInputRef}
            type="file"
            accept="image/*"
            onChange={handleGalleryChange}
            className="hidden"
            id="coach-gallery-file-input"
          />

          <input
            ref={fileCameraInputRef}
            type="file"
            accept="image/*"
            capture="user"
            onChange={handleNativeCameraChange}
            className="hidden"
            id="coach-camera-file-input"
          />

          {/* Tab Content 1: Upload Status & Mobile Buttons */}
          {activeTab === 'upload' && (
            <div className="p-3.5 bg-white rounded-xl border border-slate-200 space-y-3">
              <p className="text-xs font-semibold text-slate-700 text-center">
                Elige cómo quieres añadir tu foto oficial desde tu dispositivo móvil u ordenador:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {/* Button 1: Native Mobile Camera */}
                <button
                  type="button"
                  id="coach-take-mobile-photo-btn"
                  disabled={isProcessingFile}
                  onClick={() => fileCameraInputRef.current?.click()}
                  className="w-full py-2.5 px-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-xl text-xs font-extrabold cursor-pointer flex items-center justify-center gap-2 shadow-sm transition-all active:scale-95"
                >
                  <Camera className="w-4 h-4" />
                  <span>Hacer Foto con Móvil</span>
                </button>

                {/* Button 2: Choose from Gallery / Computer Files */}
                <button
                  type="button"
                  id="coach-browse-gallery-btn"
                  disabled={isProcessingFile}
                  onClick={() => fileGalleryInputRef.current?.click()}
                  className="w-full py-2.5 px-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-extrabold cursor-pointer flex items-center justify-center gap-2 shadow-sm transition-all active:scale-95"
                >
                  <ImageIcon className="w-4 h-4 text-amber-400" />
                  <span>Elegir de Galería / Archivos</span>
                </button>
              </div>

              <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-500 text-center font-medium pt-0.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>La imagen se optimiza automáticamente para cargar al instante sin consumir memoria.</span>
              </div>
            </div>
          )}

          {/* Tab Content 2: Live Camera instructions */}
          {activeTab === 'camera' && (
            <div className="p-3.5 bg-white rounded-xl border border-slate-200 text-center space-y-2">
              <p className="text-xs font-semibold text-slate-700">
                Usa tu cámara web para tomar una foto carnet en tiempo real.
              </p>
              <button
                type="button"
                id="coach-reopen-camera-btn"
                onClick={startLiveCamera}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-extrabold cursor-pointer inline-flex items-center gap-1.5 shadow-sm"
              >
                <Camera className="w-4 h-4" />
                <span>Abrir Visor de Cámara</span>
              </button>
            </div>
          )}

          {/* Tab Content 3: Pasarela / Presets */}
          {activeTab === 'presets' && (
            <div className="space-y-1.5">
              <span className="text-[11px] font-bold text-slate-600 block">
                Selecciona una foto de la pasarela de avatares oficiales:
              </span>
              <div className="flex items-center gap-2 flex-wrap">
                {avatarPresets.map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    id={`coach-preset-avatar-${idx}`}
                    onClick={() => {
                      onSelectPhoto(preset);
                      setUploadFeedback('Avatar seleccionado');
                      setTimeout(() => setUploadFeedback(null), 1500);
                    }}
                    className={`w-11 h-14 rounded-lg overflow-hidden border-2 transition-all cursor-pointer ${
                      currentPhotoUrl === preset
                        ? 'border-amber-500 ring-2 ring-amber-500/40 scale-105 shadow-md'
                        : 'border-slate-300 opacity-70 hover:opacity-100 hover:border-amber-400'
                    }`}
                  >
                    <img src={preset} alt={`Avatar ${idx + 1}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Camera Live Modal */}
      {isCameraOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4" id="coach-camera-modal">
          <div className="bg-slate-900 border border-slate-700 text-white rounded-2xl p-5 max-w-sm w-full space-y-4 shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-amber-400 font-extrabold text-sm">
                <Camera className="w-4 h-4" />
                <span>Tirar Foto de Carnet</span>
              </div>
              <button
                type="button"
                id="coach-close-camera-modal-btn"
                onClick={stopLiveCamera}
                className="text-slate-400 hover:text-white p-1 rounded-lg bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {cameraError ? (
              <div className="p-4 bg-red-950/80 border border-red-800 rounded-xl text-red-200 text-xs space-y-3 text-center">
                <AlertCircle className="w-6 h-6 text-red-400 mx-auto" />
                <p className="leading-relaxed">{cameraError}</p>
                <div className="flex flex-col gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      stopLiveCamera();
                      fileCameraInputRef.current?.click();
                    }}
                    className="w-full py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-bold cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>Usar Cámara Nativa del Móvil</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      stopLiveCamera();
                      fileGalleryInputRef.current?.click();
                    }}
                    className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-bold cursor-pointer"
                  >
                    Elegir Foto de Galería
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="relative mx-auto w-[240px] h-[320px] rounded-xl overflow-hidden bg-black border-2 border-amber-500 shadow-inner flex items-center justify-center">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                  {/* ID Photo Overlay Guide */}
                  <div className="absolute inset-0 border-2 border-dashed border-amber-400/40 rounded-xl pointer-events-none flex flex-col items-center justify-center">
                    <div className="w-32 h-40 border border-amber-400/60 rounded-full" />
                    <span className="text-[10px] text-amber-300 bg-slate-950/80 px-2 py-0.5 rounded mt-2 font-bold">
                      Centra tu rostro aquí (3:4)
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    id="coach-cancel-camera-capture-btn"
                    onClick={stopLiveCamera}
                    className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    id="coach-confirm-camera-capture-btn"
                    onClick={capturePhoto}
                    disabled={isCapturing}
                    className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white text-xs font-black shadow-lg shadow-amber-500/20 cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Camera className="w-4 h-4" />
                    <span>Capturar y Usar</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
