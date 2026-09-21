import React, { useState, useEffect, useCallback } from 'react';
import {
  Compass,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  RefreshCw,
} from 'lucide-react';
import { CoachPhilosophy } from '../../types';
import {
  isFieldComplete,
  validatePhilosophyComplete,
  fetchLivePhilosophy,
  CRITICAL_PHILOSOPHY_FIELDS,
  ALL_PHILOSOPHY_FIELDS,
  PHILOSOPHY_FIELD_LABELS,
} from '../../services/philosophyService';

interface PhilosophyActiveSidebarProps {
  optimisticPhilosophy?: CoachPhilosophy | null;
  onNavigateToPhilosophy?: () => void;
  authToken?: string | null;
  className?: string;
}

export const PhilosophyActiveSidebar: React.FC<PhilosophyActiveSidebarProps> = ({
  optimisticPhilosophy,
  onNavigateToPhilosophy,
  authToken,
  className = '',
}) => {
  const [philosophy, setPhilosophy] = useState<CoachPhilosophy | null>(
    () => optimisticPhilosophy || null
  );
  const [isLoading, setIsLoading] = useState(false);
  const [fetchError, setFetchError] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isTabletCollapsed, setIsTabletCollapsed] = useState(false);

  const loadLivePhilosophy = useCallback(
    async (force = false) => {
      setIsLoading(true);
      setFetchError(false);
      try {
        const live = await fetchLivePhilosophy(force, authToken);
        if (live) {
          setPhilosophy(live);
        } else if (!optimisticPhilosophy) {
          setPhilosophy(null);
        }
      } catch (err) {
        console.warn('Error al refrescar filosofía viva:', err);
        setFetchError(true);
      } finally {
        setIsLoading(false);
      }
    },
    [authToken, optimisticPhilosophy]
  );

  // Sync with optimistic updates
  useEffect(() => {
    if (optimisticPhilosophy) {
      setPhilosophy(optimisticPhilosophy);
    }
  }, [optimisticPhilosophy]);

  // Primary Live Fetch & Window Focus Listener
  useEffect(() => {
    loadLivePhilosophy();

    const handleFocus = () => {
      loadLivePhilosophy();
    };

    const handleSavedEvent = () => {
      loadLivePhilosophy(true);
    };

    window.addEventListener('focus', handleFocus);
    window.addEventListener('coachmind_philosophy_saved', handleSavedEvent);

    return () => {
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('coachmind_philosophy_saved', handleSavedEvent);
    };
  }, [loadLivePhilosophy]);

  // Evaluate completeness & 3 distinct states
  const validation = validatePhilosophyComplete(philosophy);
  const { status, missingCritical } = validation;

  // Format array values if needed (e.g. coreValues)
  const renderFieldValue = (fieldKey: keyof typeof PHILOSOPHY_FIELD_LABELS) => {
    const rawVal = philosophy ? (philosophy as any)[fieldKey] : null;
    const complete = isFieldComplete(rawVal);

    if (!complete) {
      return <span className="text-slate-400 italic text-xs">Sin definir</span>;
    }

    if (Array.isArray(rawVal)) {
      return (
        <span className="text-slate-800 text-xs font-medium leading-relaxed">
          {rawVal.join(', ')}
        </span>
      );
    }

    return (
      <span className="text-slate-800 text-xs font-medium leading-relaxed break-words whitespace-pre-wrap">
        {String(rawVal)}
      </span>
    );
  };

  const getStatusBadge = () => {
    switch (status) {
      case 'complete':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            <span>Completa (4/4 críticos)</span>
          </span>
        );
      case 'partial':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
            <AlertTriangle className="w-3 h-3 text-amber-600" />
            <span>Incompleta (Faltan {missingCritical.length} críticos)</span>
          </span>
        );
      case 'empty':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-red-100 text-red-800 border border-red-300">
            <AlertCircle className="w-3 h-3 text-red-600" />
            <span>Vacía (Sin definir)</span>
          </span>
        );
    }
  };

  const containerStateStyles = () => {
    switch (status) {
      case 'complete':
        return 'border-emerald-200/80 bg-white shadow-xs';
      case 'partial':
        return 'border-amber-300 bg-amber-50/40 shadow-xs';
      case 'empty':
      default:
        return 'border-red-300 bg-red-50/40 shadow-xs';
    }
  };

  return (
    <div
      className={`rounded-2xl border transition-all ${containerStateStyles()} ${className}`}
    >
      {/* HEADER SECTION */}
      <div className="p-4 border-b border-slate-200/80 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div
            className={`p-2 rounded-xl shrink-0 ${
              status === 'complete'
                ? 'bg-emerald-100 text-emerald-700'
                : status === 'partial'
                ? 'bg-amber-100 text-amber-700'
                : 'bg-red-100 text-red-700'
            }`}
          >
            <Compass className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-extrabold text-sm text-slate-900 tracking-tight">
                Filosofía Activa
              </h3>
              {isLoading && (
                <RefreshCw className="w-3 h-3 text-slate-400 animate-spin" />
              )}
            </div>
            <p className="text-[11px] text-slate-500">
              Fuente de verdad raíz • Solo lectura
            </p>
          </div>
        </div>

        {/* Mobile Accordion Toggle & Tablet Collapse Button */}
        <div className="flex items-center gap-1.5">
          <div className="hidden sm:block">{getStatusBadge()}</div>

          <button
            type="button"
            onClick={() => setIsMobileOpen(!isMobileOpen)}
            className="sm:hidden p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700"
            aria-label="Alternar Filosofía"
          >
            {isMobileOpen ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setIsTabletCollapsed(!isTabletCollapsed)}
            className="hidden sm:flex lg:hidden p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700"
            aria-label="Colapsar panel"
          >
            {isTabletCollapsed ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronUp className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* MOBILE HEADER STATUS BADGE */}
      <div className="sm:hidden px-4 py-2 border-b border-slate-100 flex items-center justify-between">
        {getStatusBadge()}
      </div>

      {/* BODY CONTENT (Responsive visibility) */}
      <div
        className={`${
          isMobileOpen ? 'block' : 'hidden'
        } sm:${isTabletCollapsed ? 'hidden' : 'block'} lg:block p-4 space-y-4`}
      >
        {/* Fetch Error Warning */}
        {fetchError && (
          <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center justify-between gap-2">
            <span>No se pudo sincronizar en vivo.</span>
            <button
              type="button"
              onClick={() => loadLivePhilosophy(true)}
              className="font-bold underline hover:text-amber-950 cursor-pointer"
            >
              Reintentar
            </button>
          </div>
        )}

        {/* STATE WARNING MESSAGES */}
        {status === 'empty' && (
          <div className="p-3.5 rounded-xl bg-red-100/80 border border-red-300 text-red-950 space-y-2.5">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <p className="text-xs font-semibold leading-relaxed">
                Aún no has definido tu Filosofía de Entrenador. Es el punto de partida obligatorio.
              </p>
            </div>
            <button
              type="button"
              onClick={onNavigateToPhilosophy}
              className="w-full py-2 px-3 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-lg transition flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer"
            >
              <Compass className="w-3.5 h-3.5" />
              <span>Definir Filosofía</span>
            </button>
          </div>
        )}

        {status === 'partial' && (
          <div className="p-3.5 rounded-xl bg-amber-100/80 border border-amber-300 text-amber-950 space-y-2.5">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-xs font-semibold leading-relaxed">
                Tu filosofía está incompleta. Antes de crear objetivos, mesociclos o microciclos debes completarla.
              </p>
            </div>
            <button
              type="button"
              onClick={onNavigateToPhilosophy}
              className="w-full py-2 px-3 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-lg transition flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer"
            >
              <Compass className="w-3.5 h-3.5" />
              <span>Completar Filosofía</span>
            </button>
          </div>
        )}

        {/* 7 FIELDS IN STRICT MANDATORY ORDER */}
        <div className="space-y-3 pt-1">
          {ALL_PHILOSOPHY_FIELDS.map((fieldKey, idx) => {
            const isCritical = CRITICAL_PHILOSOPHY_FIELDS.includes(fieldKey);
            const val = philosophy ? (philosophy as any)[fieldKey] : null;
            const complete = isFieldComplete(val);
            const isMissingCritical = isCritical && !complete;

            return (
              <div
                key={fieldKey}
                className={`p-2.5 rounded-xl border transition ${
                  isMissingCritical
                    ? 'border-red-300 bg-red-50/50'
                    : 'border-slate-200/80 bg-slate-50/50'
                }`}
              >
                <div className="flex items-center justify-between gap-1.5 mb-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-mono font-bold text-slate-400">
                      {idx + 1}.
                    </span>
                    <span className="text-[11px] font-bold text-slate-700">
                      {PHILOSOPHY_FIELD_LABELS[fieldKey]}
                    </span>
                  </div>

                  {isCritical ? (
                    <span
                      className={`text-[9px] px-1.5 py-0.2 rounded font-extrabold uppercase ${
                        complete
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-red-100 text-red-800 border border-red-200'
                      }`}
                    >
                      {complete ? 'Crítico OK' : 'Crítico Falta'}
                    </span>
                  ) : (
                    <span className="text-[9px] text-slate-400 font-medium">
                      Opcional
                    </span>
                  )}
                </div>

                <div className="pl-3.5 border-l-2 border-slate-200">
                  {renderFieldValue(fieldKey)}
                </div>
              </div>
            );
          })}
        </div>

        {/* BOTTOM ACTION BUTTON */}
        <div className="pt-2 border-t border-slate-200/80">
          <button
            type="button"
            onClick={onNavigateToPhilosophy}
            className="w-full py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs transition flex items-center justify-center gap-2 cursor-pointer"
          >
            <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
            <span>Editar en Filosofía de Entrenador</span>
          </button>
        </div>
      </div>
    </div>
  );
};
