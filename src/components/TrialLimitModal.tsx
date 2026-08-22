import React from 'react';
import { Sparkles, Lock, ShieldAlert, ArrowRight, X } from 'lucide-react';

interface TrialLimitModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenRegisterModal: () => void;
  mode?: 'general_action' | 'ficha_entrenador';
}

export const TrialLimitModal: React.FC<TrialLimitModalProps> = ({
  isOpen,
  onClose,
  onOpenRegisterModal,
  mode = 'general_action',
}) => {
  if (!isOpen) return null;

  const isFicha = mode === 'ficha_entrenador';

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn overflow-y-auto"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-slate-900 border border-amber-500/30 rounded-2xl w-full max-w-sm sm:max-w-md text-white shadow-2xl p-4 sm:p-5 relative my-auto max-h-[85vh] overflow-y-auto custom-scrollbar flex flex-col"
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3 right-3 p-1.5 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer z-20"
          title="Cerrar modal"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Glow Decor */}
        <div className="absolute -top-10 -left-10 w-28 h-28 bg-amber-500/20 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 text-center space-y-3 my-auto">
          {/* Icon Badge */}
          <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-500 text-white flex items-center justify-center mx-auto shadow-md shadow-amber-500/20 border border-amber-400/40 shrink-0">
            {isFicha ? <Lock className="w-5 h-5" /> : <ShieldAlert className="w-5 h-5" />}
          </div>

          {/* Title & Description */}
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[10px] font-bold uppercase tracking-wide">
              <Sparkles className="w-3 h-3" />
              <span>Suscripción Requerida para Acciones</span>
            </div>

            <h3 className="text-base sm:text-lg font-black text-white tracking-tight leading-snug">
              {isFicha
                ? 'Ficha Oficial de Entrenador Reservada a Suscriptores'
                : 'Suscripción Necesaria para Crear y Guardar'}
            </h3>

            <p className="text-slate-300 text-xs leading-normal max-w-xs mx-auto">
              {isFicha
                ? 'La Ficha de Entrenador está reservada para suscriptores. Elige tu plan para activar tu licencia de entrenador y todas las funciones.'
                : 'En Modo Invitado puedes explorar y consultar todos los apartados de la aplicación. Para ejecutar acciones (crear entrenamientos, guardar jugadas, añadir jugadores o consultar a la IA), activa tu suscripción.'}
            </p>
          </div>

          {/* Value Highlights */}
          <div className="p-3.5 rounded-xl bg-slate-800/80 border border-slate-700/80 text-left space-y-2 text-xs text-slate-300">
            <div className="font-extrabold text-amber-400 flex items-center gap-1.5 text-xs uppercase tracking-wide">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Planes de Suscripción Oficiales:</span>
            </div>
            
            <div className="space-y-1.5 text-[11px]">
              <div className="p-2 rounded-lg bg-slate-900/80 border border-slate-700/60 flex items-center justify-between">
                <div>
                  <span className="font-bold text-white block">Plan Mensual — 5 € / mes</span>
                  <span className="text-slate-400 text-[10px]">500 créditos semanales en cada apartado</span>
                </div>
              </div>

              <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-between">
                <div>
                  <span className="font-extrabold text-amber-300 block">Plan Anual — 60 € / año</span>
                  <span className="text-amber-200/80 text-[10px]">1.000 créditos semanales en cada apartado</span>
                </div>
                <span className="px-1.5 py-0.5 rounded bg-amber-500 text-slate-950 text-[9px] font-black uppercase shrink-0">Recomendado</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-1 flex flex-col sm:flex-row gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all cursor-pointer"
            >
              Cerrar y Continuar
            </button>

            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenRegisterModal();
              }}
              className="flex-1 py-2 px-3 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-600 hover:to-orange-600 text-white text-xs font-extrabold flex items-center justify-center gap-1 shadow-md shadow-amber-500/20 active:scale-95 transition-all cursor-pointer"
            >
              <span>Ver Planes y Suscribirse</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

