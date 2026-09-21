import React from 'react';
import {
  Compass,
  ArrowRight,
  AlertTriangle,
  RefreshCw,
  Layers,
  ChevronRight,
} from 'lucide-react';
import { PhilosophyDiffItem } from '../../services/philosophyService';

interface HierarchyBannerProps {
  onNavigateToPhilosophy?: () => void;
  diffs?: PhilosophyDiffItem[];
  onUpdateSnapshot?: () => void;
  onReviewAffectedGoals?: () => void;
}

export const HierarchyBanner: React.FC<HierarchyBannerProps> = ({
  onNavigateToPhilosophy,
  diffs = [],
  onUpdateSnapshot,
  onReviewAffectedGoals,
}) => {
  const hasDiffs = diffs.length > 0;

  return (
    <div
      className={`rounded-2xl border transition-all duration-200 shadow-sm overflow-hidden ${
        hasDiffs
          ? 'bg-amber-50/90 border-amber-300 text-amber-950'
          : 'bg-slate-900 border-slate-800 text-white'
      }`}
    >
      <div className="p-5 sm:p-6 space-y-4">
        {/* Top Header & Action */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div
              className={`p-2.5 rounded-xl shrink-0 ${
                hasDiffs
                  ? 'bg-amber-200/70 text-amber-800'
                  : 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
              }`}
            >
              {hasDiffs ? (
                <AlertTriangle className="w-5 h-5 animate-bounce" />
              ) : (
                <Compass className="w-5 h-5" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-black tracking-tight">
                  Jerarquía de trabajo
                </h2>
                {hasDiffs && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-amber-200 text-amber-900 border border-amber-300">
                    Filosofía modificada • Snapshot desactualizado
                  </span>
                )}
              </div>
              <p
                className={`text-xs sm:text-sm mt-0.5 leading-relaxed max-w-3xl ${
                  hasDiffs ? 'text-amber-900 font-medium' : 'text-slate-300'
                }`}
              >
                Estos objetivos se construyen SOBRE tu Filosofía de Entrenador. No la sustituyen. Si cambias tu filosofía, revisa estos objetivos.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onNavigateToPhilosophy}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 self-start sm:self-auto shrink-0 shadow-xs cursor-pointer ${
              hasDiffs
                ? 'bg-amber-900 text-amber-50 hover:bg-amber-800'
                : 'bg-orange-500 hover:bg-orange-600 text-white'
            }`}
          >
            <Compass className="w-4 h-4" />
            <span>Ver Filosofía de Entrenador</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Visual Mini-Hierarchy Diagram */}
        <div
          className={`p-3.5 sm:p-4 rounded-xl font-mono text-xs border ${
            hasDiffs
              ? 'bg-amber-100/70 border-amber-200/80 text-amber-950'
              : 'bg-slate-950/70 border-slate-800/80 text-slate-200'
          }`}
        >
          <div className="flex items-center gap-2 font-bold mb-2">
            <Layers className="w-3.5 h-3.5 text-orange-500" />
            <span className="uppercase tracking-wider text-[10px] opacity-75">
              Estructura Jerárquica de Fuentes (Arriba manda • Abajo obedece)
            </span>
          </div>

          <div className="space-y-1 pl-1 text-[11px] sm:text-xs">
            <div className="flex items-center gap-1.5 font-bold text-emerald-600 dark:text-emerald-400">
              <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-[10px]">1. RAÍZ</span>
              <span>Filosofía de Entrenador (raíz, constitución)</span>
            </div>
            <div className="pl-4 flex items-center gap-1.5 text-orange-600 dark:text-orange-400 font-medium">
              <span className="opacity-60">└─&gt;</span>
              <span className="px-1.5 py-0.5 rounded bg-orange-500/20 text-[10px] font-bold">2. ANUAL</span>
              <span>Objetivos de la Temporada (esta sección)</span>
            </div>
            <div className="pl-8 flex items-center gap-1.5 text-sky-600 dark:text-sky-400 font-medium">
              <span className="opacity-60">└─&gt;</span>
              <span className="px-1.5 py-0.5 rounded bg-sky-500/20 text-[10px] font-bold">3. BLOQUES</span>
              <span>Mesociclos</span>
            </div>
            <div className="pl-12 flex items-center gap-1.5 text-purple-600 dark:text-purple-400 font-medium">
              <span className="opacity-60">└─&gt;</span>
              <span className="px-1.5 py-0.5 rounded bg-purple-500/20 text-[10px] font-bold">4. SEMANAS</span>
              <span>Microciclos</span>
            </div>
          </div>
        </div>

        {/* Snapshot Diff Banner Options if active */}
        {hasDiffs && (
          <div className="p-4 rounded-xl bg-amber-200/60 border border-amber-300 space-y-3">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="space-y-0.5">
                <span className="text-xs font-bold text-amber-950 block">
                  Hay {diffs.length} cambio(s) en tu Filosofía respecto a cuando se abrió la temporada:
                </span>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {diffs.map((d) => (
                    <span
                      key={d.field}
                      className={`text-[10px] px-2 py-0.5 rounded-md font-semibold ${
                        d.critical
                          ? 'bg-red-600 text-white'
                          : 'bg-amber-300/80 text-amber-950'
                      }`}
                    >
                      {d.label}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {onReviewAffectedGoals && (
                  <button
                    type="button"
                    onClick={onReviewAffectedGoals}
                    className="px-3 py-1.5 bg-white hover:bg-amber-100 text-amber-950 text-xs font-bold rounded-lg border border-amber-300 transition cursor-pointer shadow-2xs"
                  >
                    Revisar objetivos afectados
                  </button>
                )}
                {onUpdateSnapshot && (
                  <button
                    type="button"
                    onClick={onUpdateSnapshot}
                    className="px-3 py-1.5 bg-amber-900 hover:bg-amber-800 text-white text-xs font-bold rounded-lg transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Actualizar Snapshot</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Footer Mandatory Rule */}
        <div
          className={`pt-2 border-t text-xs flex items-center justify-between flex-wrap gap-2 ${
            hasDiffs ? 'border-amber-200 text-amber-900' : 'border-slate-800 text-slate-400'
          }`}
        >
          <span className="font-semibold italic">
            "Arriba manda. Abajo obedece. Si algo contradice la filosofía, la IA lo detecta, avisa y bloquea."
          </span>
          <span className="text-[11px] font-mono opacity-80">
            Regla de subordinación CoachMind
          </span>
        </div>
      </div>
    </div>
  );
};
