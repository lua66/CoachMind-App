import React, { useState } from 'react';
import { Download, Tablet, Smartphone } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { InstallAppModal } from './InstallAppModal';

interface InstallAppButtonProps {
  variant?: 'sidebar' | 'header' | 'banner' | 'settings';
  className?: string;
  label?: string;
}

export const InstallAppButton: React.FC<InstallAppButtonProps> = ({
  variant = 'sidebar',
  className = '',
  label,
}) => {
  const { isInstalled, isIOS, isIPad } = usePWAInstall();
  const [isModalOpen, setIsModalOpen] = useState(false);

  // If running in standalone mode (already installed), we can still allow opening instructions or keep subtle
  return (
    <>
      {variant === 'header' && (
        <button
          type="button"
          data-allow-action="true"
          onClick={() => setIsModalOpen(true)}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 text-xs font-black shadow-md shadow-amber-500/20 active:scale-95 transition-all cursor-pointer ${className}`}
          title="Descargar e instalar CoachMind como App en tu iPad / tablet / móvil"
        >
          <Download className="w-3.5 h-3.5 text-slate-950 stroke-[3]" />
          <span>{label || 'Descargar App'}</span>
        </button>
      )}

      {variant === 'sidebar' && (
        <button
          type="button"
          data-allow-action="true"
          onClick={() => setIsModalOpen(true)}
          className={`w-full flex items-center justify-between p-3 rounded-2xl bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-transparent border border-amber-500/30 hover:border-amber-400/60 text-amber-300 hover:text-white transition-all group cursor-pointer shadow-sm ${className}`}
          title="Instalar en iPad, Tablet o Móvil"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-black shrink-0 group-hover:scale-105 transition-transform shadow-md">
              <Download className="w-4 h-4 text-slate-950 stroke-[2.5]" />
            </div>
            <div className="text-left">
              <div className="text-xs font-black text-white group-hover:text-amber-300 transition-colors">
                {label || 'Descargar App'}
              </div>
              <div className="text-[10px] text-amber-300/80 font-semibold">
                iPad • Tablet • Móvil • PC
              </div>
            </div>
          </div>

          <span className="px-1.5 py-0.5 rounded bg-amber-400/20 text-amber-300 text-[9px] font-black uppercase tracking-wider">
            Instalar
          </span>
        </button>
      )}

      {variant === 'banner' && (
        <button
          type="button"
          data-allow-action="true"
          onClick={() => setIsModalOpen(true)}
          className={`px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs flex items-center gap-2 shadow-md shadow-amber-500/20 transition-all cursor-pointer ${className}`}
        >
          <Download className="w-4 h-4 text-slate-950 stroke-[2.5]" />
          <span>{label || '📲 Descargar en iPad / Tablet'}</span>
        </button>
      )}

      {variant === 'settings' && (
        <button
          type="button"
          data-allow-action="true"
          onClick={() => setIsModalOpen(true)}
          className={`w-full p-4 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-sm flex items-center justify-center gap-2.5 shadow-lg shadow-amber-500/25 transition-all cursor-pointer ${className}`}
        >
          <Download className="w-5 h-5 text-slate-950 stroke-[2.5]" />
          <span>{label || 'Ver Instrucciones para Descargar App en iPad / Móvil'}</span>
        </button>
      )}

      <InstallAppModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
};
