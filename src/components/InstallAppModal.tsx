import React, { useState } from 'react';
import {
  X,
  Share2,
  PlusSquare,
  Smartphone,
  Tablet,
  Laptop,
  CheckCircle2,
  Copy,
  Check,
  ExternalLink,
  Sparkles,
  Download,
  Info,
} from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface InstallAppModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const InstallAppModal: React.FC<InstallAppModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { isInstallable, isIOS, isIPad, install } = usePWAInstall();
  const [activeTab, setActiveTab] = useState<'ios' | 'android' | 'pc'>(() => {
    if (isIOS || isIPad) return 'ios';
    return 'ios'; // Default to iOS since user specifically asked for iPad/iOS
  });

  const [copiedLink, setCopiedLink] = useState(false);
  const [installing, setInstalling] = useState(false);

  if (!isOpen) return null;

  const OFFICIAL_APP_URL = 'https://coach-mind-app.vercel.app/';

  const handleCopyLink = () => {
    navigator.clipboard.writeText(OFFICIAL_APP_URL);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 3000);
  };

  const handleNativeInstall = async () => {
    setInstalling(true);
    const success = await install();
    setInstalling(false);
    if (success) {
      onClose();
    }
  };

  return (
    <div
      data-allow-action="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl w-full max-w-xl max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden animate-scaleUp"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="bg-[#0B132B] text-white p-5 sm:p-6 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-amber-600 to-orange-500 flex items-center justify-center text-white shadow-lg shadow-orange-500/20 shrink-0">
              <Download className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg sm:text-xl font-black text-white tracking-tight">
                  Descargar CoachMind como App
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-400 text-[10px] font-black uppercase">
                  PWA Oficial
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Instálala en tu iPad, tablet, móvil u ordenador en 3 sencillos pasos
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Cerrar modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="bg-slate-100 p-2 border-b border-slate-200 flex items-center gap-1">
          <button
            type="button"
            onClick={() => setActiveTab('ios')}
            className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'ios'
                ? 'bg-white text-slate-950 shadow-sm border border-slate-200/80'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Tablet className="w-4 h-4 text-blue-600" />
            <span>iPad / iPhone (iOS)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('android')}
            className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'android'
                ? 'bg-white text-slate-950 shadow-sm border border-slate-200/80'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Smartphone className="w-4 h-4 text-emerald-600" />
            <span>Tablet / Móvil Android</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('pc')}
            className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'pc'
                ? 'bg-white text-slate-950 shadow-sm border border-slate-200/80'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Laptop className="w-4 h-4 text-purple-600" />
            <span>PC / Mac / Portátil</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 text-slate-800">
          {/* TAB 1: iOS (iPad / iPhone) */}
          {activeTab === 'ios' && (
            <div className="space-y-5 animate-fadeIn">
              {/* Note about Apple Safari installation */}
              <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-950 flex items-start gap-3">
                <Info className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="text-xs space-y-1">
                  <p className="font-extrabold text-amber-900">
                    ¿Por qué en iPad / iPhone no hay un botón de descarga directo de archivo?
                  </p>
                  <p className="text-amber-800 leading-relaxed">
                    Por seguridad, Apple (iOS / iPadOS) requiere que todas las aplicaciones web se instalen a través del navegador <strong>Safari</strong> mediante la opción <strong>"Añadir a la pantalla de inicio"</strong>. ¡Es 100% seguro, gratis y no ocupa espacio de App Store!
                  </p>
                </div>
              </div>

              {/* Step by step guide with illustrations */}
              <div className="space-y-3">
                <h4 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <span>Pasos para instalar en tu iPad / iPhone:</span>
                </h4>

                {/* Step 1 */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/90 flex items-start gap-3.5 hover:border-blue-300 transition-colors">
                  <div className="w-8 h-8 rounded-xl bg-blue-600 text-white font-black flex items-center justify-center shrink-0 shadow-md">
                    1
                  </div>
                  <div className="space-y-1 text-xs">
                    <p className="font-black text-slate-900 text-sm flex items-center gap-1.5 flex-wrap">
                      <span>Abre esta web en</span>
                      <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-extrabold">Safari</span>
                      <span>y toca</span>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-200 text-slate-900 font-extrabold border border-slate-300">
                        <Share2 className="w-3.5 h-3.5 text-blue-600 stroke-[2.5]" />
                        Compartir
                      </span>
                    </p>
                    <p className="text-slate-600 leading-relaxed">
                      En el iPad, el icono de <strong>Compartir</strong> (un recuadro con una flecha hacia arriba) se encuentra en la <strong>barra superior derecha de Safari</strong> (o en la barra inferior en el iPhone).
                    </p>
                  </div>
                </div>

                {/* Step 2 */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/90 flex items-start gap-3.5 hover:border-blue-300 transition-colors">
                  <div className="w-8 h-8 rounded-xl bg-blue-600 text-white font-black flex items-center justify-center shrink-0 shadow-md">
                    2
                  </div>
                  <div className="space-y-1 text-xs">
                    <p className="font-black text-slate-900 text-sm flex items-center gap-1.5 flex-wrap">
                      <span>Selecciona</span>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-200 text-slate-900 font-extrabold border border-slate-300">
                        <PlusSquare className="w-3.5 h-3.5 text-blue-600 stroke-[2.5]" />
                        Añadir a la pantalla de inicio
                      </span>
                    </p>
                    <p className="text-slate-600 leading-relaxed">
                      Desliza hacia abajo en el menú que se despliega hasta encontrar la opción con el símbolo <strong>"+"</strong> llamada <em>"Añadir a la pantalla de inicio"</em> (o <em>"Add to Home Screen"</em> si tu iPad está en inglés).
                    </p>
                  </div>
                </div>

                {/* Step 3 */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/90 flex items-start gap-3.5 hover:border-blue-300 transition-colors">
                  <div className="w-8 h-8 rounded-xl bg-blue-600 text-white font-black flex items-center justify-center shrink-0 shadow-md">
                    3
                  </div>
                  <div className="space-y-1 text-xs">
                    <p className="font-black text-slate-900 text-sm flex items-center gap-1.5">
                      <span>Toca en</span>
                      <span className="px-2 py-0.5 rounded bg-blue-600 text-white font-extrabold shadow-xs">
                        Añadir
                      </span>
                      <span>(esquina superior derecha)</span>
                    </p>
                    <p className="text-slate-600 leading-relaxed">
                      ¡Listo! El icono de <strong>CoachMind</strong> aparecerá en tu escritorio de apps del iPad. Al abrirlo, se ejecutará <strong>a pantalla completa</strong> como una aplicación nativa, sin barras de URL.
                    </p>
                  </div>
                </div>
              </div>

              {/* Copy URL button for opening directly in Safari */}
              <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-200 space-y-3">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                  <div className="text-xs text-blue-950">
                    <span className="font-extrabold block">Enlace oficial de la Web App:</span>
                    <span className="text-blue-700 font-mono text-[11px] select-all bg-white/80 px-2 py-0.5 rounded border border-blue-200 inline-block mt-1">
                      {OFFICIAL_APP_URL}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <button
                      type="button"
                      onClick={handleCopyLink}
                      className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black text-xs flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer shrink-0"
                    >
                      {copiedLink ? (
                        <>
                          <Check className="w-4 h-4 text-white stroke-[3]" />
                          <span>¡Enlace Copiado!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4 text-white" />
                          <span>Copiar Enlace</span>
                        </>
                      )}
                    </button>

                    <a
                      href={OFFICIAL_APP_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2.5 rounded-xl bg-white hover:bg-blue-100 text-blue-700 border border-blue-300 transition-all cursor-pointer flex items-center justify-center"
                      title="Abrir en nueva pestaña"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                </div>

                <p className="text-[11px] text-blue-800 leading-tight">
                  Pega este enlace en <strong>Safari</strong> en tu iPad para añadirlo a la pantalla de inicio como App.
                </p>
              </div>
            </div>
          )}

          {/* TAB 2: Android */}
          {activeTab === 'android' && (
            <div className="space-y-5 animate-fadeIn">
              {isInstallable ? (
                <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-200 text-center space-y-3">
                  <Sparkles className="w-8 h-8 text-emerald-600 mx-auto" />
                  <h4 className="font-black text-slate-900 text-base">
                    ¡Tu dispositivo es compatible con la instalación directa con 1 clic!
                  </h4>
                  <p className="text-xs text-slate-600 max-w-md mx-auto">
                    Pulsa el botón de abajo para instalar CoachMind directamente en tu tablet o móvil Android.
                  </p>
                  <button
                    type="button"
                    disabled={installing}
                    onClick={handleNativeInstall}
                    className="px-6 py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30 transition-all cursor-pointer mx-auto"
                  >
                    <Download className="w-5 h-5" />
                    <span>{installing ? 'Instalando...' : 'Instalar App en Android Ahora'}</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <h4 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                    Instalación en Google Chrome / Android:
                  </h4>
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/90 text-xs space-y-2">
                    <p className="font-extrabold text-slate-900">
                      1. Toca el menú de los <strong>3 puntos verticales (⋮)</strong> en la esquina superior derecha de Google Chrome.
                    </p>
                    <p className="font-extrabold text-slate-900">
                      2. Selecciona la opción <strong>"Instalar aplicación"</strong> o <strong>"Añadir a la pantalla de inicio"</strong>.
                    </p>
                    <p className="font-extrabold text-slate-900">
                      3. Confirma pulsando <strong>"Instalar"</strong>.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: PC / Mac */}
          {activeTab === 'pc' && (
            <div className="space-y-4 animate-fadeIn">
              {isInstallable && (
                <button
                  type="button"
                  disabled={installing}
                  onClick={handleNativeInstall}
                  className="w-full p-4 rounded-2xl bg-purple-600 hover:bg-purple-500 text-white font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-purple-600/25 transition-all cursor-pointer"
                >
                  <Download className="w-5 h-5" />
                  <span>{installing ? 'Instalando...' : 'Instalar CoachMind en este Ordenador'}</span>
                </button>
              )}

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/90 text-xs space-y-3">
                <h5 className="font-black text-slate-900 text-sm">
                  Instalación en Google Chrome, Microsoft Edge o Brave:
                </h5>
                <p className="text-slate-600 leading-relaxed">
                  En la <strong>barra de direcciones (URL)</strong> de tu navegador en la parte superior derecha, haz clic en el icono de <strong>Instalar aplicación</strong> (un monitor con una flecha hacia abajo o un símbolo <strong>⊕</strong>) y pulsa <strong>"Instalar"</strong>.
                </p>
              </div>
            </div>
          )}

          {/* Advantages of PWA */}
          <div className="p-4 rounded-2xl bg-slate-900 text-white space-y-2.5">
            <h5 className="text-xs font-black uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-amber-400" />
              <span>Ventajas de usar CoachMind en modo App</span>
            </h5>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-slate-300">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                <span>Pantalla completa sin barras de navegador</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                <span>Acceso directo instantáneo desde el escritorio</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                <span>Ideal para llevar a la pista de baloncesto</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                <span>Guardado de partidos y pizarra táctica offline</span>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-black transition-all cursor-pointer"
          >
            Entendido, cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
