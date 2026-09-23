import React, { useState, useEffect } from 'react';
import {
  CalendarRange,
  Trophy,
  Layers,
  Calendar,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Compass,
  ArrowRight,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Info,
} from 'lucide-react';
import { UserProfile, CoachPhilosophy } from '../types';
import {
  SeasonGoal,
  Mesocycle,
  Microcycle,
  SessionLog,
  MicrocycleEvaluation,
} from '../types/planning';
import { planningService } from '../services/planningService';
import {
  validatePhilosophyComplete,
  diffPhilosophy,
  PhilosophyDiffItem,
  CRITICAL_PHILOSOPHY_FIELDS,
  PHILOSOPHY_FIELD_LABELS,
  fetchLivePhilosophy,
} from '../services/philosophyService';
import { SeasonGoalManager } from './planning/SeasonGoalManager';
import { MesocycleManager } from './planning/MesocycleManager';
import { MicrocycleManager } from './planning/MicrocycleManager';
import { ImbalanceDashboard } from './planning/ImbalanceDashboard';
import { WeeklyWorkloadChart } from './planning/WeeklyWorkloadChart';

interface AnnualPlanningViewProps {
  userProfile?: UserProfile | null;
  coachPhilosophy?: CoachPhilosophy | null;
  onNavigateToPhilosophy?: () => void;
}

type PlanningTab = 'temporada' | 'mesociclos' | 'microciclos' | 'desequilibrios';

export const AnnualPlanningView: React.FC<AnnualPlanningViewProps> = ({
  userProfile,
  coachPhilosophy,
  onNavigateToPhilosophy,
}) => {
  const [activeTab, setActiveTab] = useState<PlanningTab>('temporada');
  const [season, setSeason] = useState<SeasonGoal>(() => planningService.getSeason());
  const [mesocycles, setMesocycles] = useState<Mesocycle[]>(() => planningService.getMesocycles());
  const [microcycles, setMicrocycles] = useState<Microcycle[]>(() => planningService.getMicrocycles());
  const [selectedMesocycleId, setSelectedMesocycleId] = useState<string>(
    mesocycles[0]?.id || ''
  );
  const [isDiffDismissed, setIsDiffDismissed] = useState(false);
  const [activePhilosophy, setActivePhilosophy] = useState<CoachPhilosophy | null>(
    coachPhilosophy || null
  );

  // Sync when coachPhilosophy prop updates
  useEffect(() => {
    if (coachPhilosophy) {
      setActivePhilosophy(coachPhilosophy);
    }
  }, [coachPhilosophy]);

  // Reload data from service and live philosophy on event
  const reloadData = async () => {
    setSeason(planningService.getSeason());
    const m = planningService.getMesocycles();
    setMesocycles(m);
    const mc = planningService.getMicrocycles();
    setMicrocycles(mc);
    if (!selectedMesocycleId && m[0]) {
      setSelectedMesocycleId(m[0].id);
    }

    try {
      const live = await fetchLivePhilosophy();
      if (live) {
        setActivePhilosophy(live);
      }
    } catch {
      // Keep optimistic
    }
  };

  useEffect(() => {
    reloadData();

    const handleSavedEvent = async () => {
      try {
        const live = await fetchLivePhilosophy(true);
        if (live) {
          setActivePhilosophy(live);
        }
      } catch {
        // Fallback
      }
    };

    window.addEventListener('coachmind_philosophy_saved', handleSavedEvent);
    return () => {
      window.removeEventListener('coachmind_philosophy_saved', handleSavedEvent);
    };
  }, []);

  // Validation and Diff calculation
  const validation = validatePhilosophyComplete(activePhilosophy);
  const isPhilosophyComplete = validation.complete;
  const missingCritical = validation.missingCritical;

  const diffs: PhilosophyDiffItem[] =
    isPhilosophyComplete && season?.philosophySnapshot && activePhilosophy
      ? diffPhilosophy(activePhilosophy, season.philosophySnapshot)
      : [];
  const hasDiffs = diffs.length > 0 && !isDiffDismissed;

  const handleUpdateSnapshot = () => {
    if (activePhilosophy) {
      const updated = planningService.updateSeasonPhilosophySnapshot(activePhilosophy);
      setSeason(updated);
      setIsDiffDismissed(false);
    }
  };

  const fallbackMesocycle: Mesocycle = {
    id: 'meso-general',
    seasonGoalId: season?.id || 'season-current',
    numero: 1,
    nombre: 'Planificación de la Temporada',
    fechaInicio: '',
    fechaFin: '',
    objetivoPrincipal: 'Desarrollo y competición semanal',
    estado: 'activo',
    goals: [],
  };
  const activeMesocycle = mesocycles.find((m) => m.id === selectedMesocycleId) || mesocycles[0] || fallbackMesocycle;
  const activeMicrocycles = mesocycles.length > 0
    ? microcycles.filter((m) => m.mesocycleId === activeMesocycle.id || !m.mesocycleId)
    : microcycles;

  // Handlers
  const handleSaveSeason = (updated: SeasonGoal) => {
    const saved = planningService.saveSeason(updated);
    setSeason(saved);
  };

  const handleSaveMesocycle = (meso: Mesocycle) => {
    const saved = planningService.saveMesocycle(meso);
    setMesocycles(planningService.getMesocycles());
  };

  const handleDeleteMesocycle = (id: string) => {
    planningService.deleteMesocycle(id);
    setMesocycles(planningService.getMesocycles());
  };

  const handleSaveMicrocycle = (micro: Microcycle) => {
    planningService.saveMicrocycle(micro);
    setMicrocycles(planningService.getMicrocycles());
  };

  const handleDeleteMicrocycle = (id: string) => {
    planningService.deleteMicrocycle(id);
    setMicrocycles(planningService.getMicrocycles());
  };

  const handleSaveSession = (microcycleId: string, session: SessionLog) => {
    planningService.saveSessionLog(microcycleId, session);
    setMicrocycles(planningService.getMicrocycles());
  };

  const handleDeleteSession = (microcycleId: string, sessionId: string) => {
    planningService.deleteSessionLog(microcycleId, sessionId);
    setMicrocycles(planningService.getMicrocycles());
  };

  const handleSaveEvaluation = (microcycleId: string, evaluation: MicrocycleEvaluation) => {
    planningService.saveEvaluation(microcycleId, evaluation);
    setMesocycles(planningService.getMesocycles());
    setMicrocycles(planningService.getMicrocycles());
  };

  const handleResetSeed = () => {
    if (window.confirm('¿Deseas restaurar la planificación de ejemplo (Temporada 2025-2026 con 3 microciclos y sesiones reales pre-cargadas)?')) {
      planningService.resetToDefaultSeed();
      reloadData();
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Alert if philosophy snapshot has differences */}
      {hasDiffs && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-amber-900 shadow-2xs">
          <div className="flex items-center gap-2.5 text-sm font-medium">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
            <span>
              Tu <strong>Filosofía de Entrenador</strong> ha sido actualizada. Puedes sincronizar la temporada con tu nueva identidad.
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleUpdateSnapshot}
              className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold transition cursor-pointer"
            >
              Sincronizar ahora
            </button>
            <button
              type="button"
              onClick={() => setIsDiffDismissed(true)}
              className="px-2.5 py-1.5 text-xs text-amber-700 hover:text-amber-900 transition cursor-pointer"
            >
              Descartar
            </button>
          </div>
        </div>
      )}

      {/* Main Planning Area Full Width */}
      <div className="w-full space-y-6">
        {/* View Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-orange-50 text-orange-600 rounded-2xl border border-orange-100 shadow-xs">
              <CalendarRange className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl font-black tracking-tight text-slate-900">
                  Objetivos de la Temporada {season.temporada ? season.temporada : ''}
                </h1>
                {season.categoria && (
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-orange-100 text-orange-800 font-bold uppercase">
                    {season.categoria}
                  </span>
                )}
                {isPhilosophyComplete && (
                  <button
                    type="button"
                    onClick={onNavigateToPhilosophy}
                    className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 font-semibold flex items-center gap-1 hover:bg-emerald-100 transition cursor-pointer"
                    title="Ver Filosofía de Entrenador"
                  >
                    <Compass className="w-3 h-3 text-emerald-600" />
                    <span>Filosofía: {coachPhilosophy?.playStyle?.slice(0, 30) || 'Activa'}</span>
                  </button>
                )}
              </div>
              <p className="text-sm text-slate-500 mt-0.5">
                Concreción anual de tu Filosofía de Entrenador (subordinada a tu identidad).
              </p>
            </div>
          </div>

          {/* Quick Reset Seed Button */}
          <button
            type="button"
            onClick={handleResetSeed}
            className="px-3.5 py-2 text-xs font-semibold text-slate-600 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition flex items-center gap-1.5 self-start sm:self-auto shadow-2xs cursor-pointer"
            title="Restaurar datos de ejemplo"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Restaurar Datos de Ejemplo</span>
          </button>
        </div>

        {/* Navigation Sub-Tabs */}
        <div className="flex items-center gap-2 bg-slate-100/80 p-1.5 rounded-2xl border border-slate-200 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('temporada')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 shrink-0 ${
              activeTab === 'temporada'
                ? 'bg-white text-orange-700 shadow-xs border border-slate-200/80'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            <Trophy className="w-4 h-4" />
            <span>1. Temporada y Objetivos</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('mesociclos')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 shrink-0 ${
              activeTab === 'mesociclos'
                ? 'bg-white text-orange-700 shadow-xs border border-slate-200/80'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>2. Mesociclos ({mesocycles.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('microciclos')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 shrink-0 ${
              activeTab === 'microciclos'
                ? 'bg-white text-orange-700 shadow-xs border border-slate-200/80'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>3. Microciclos</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('desequilibrios')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 shrink-0 ${
              activeTab === 'desequilibrios'
                ? 'bg-white text-orange-700 shadow-xs border border-slate-200/80'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            <AlertTriangle className="w-4 h-4 text-orange-600" />
            <span>4. Dashboard de Desequilibrios</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="pt-2 space-y-6">
          {activeTab === 'temporada' && (
            <>
              <SeasonGoalManager
                season={season}
                onSave={handleSaveSeason}
                isPhilosophyComplete={isPhilosophyComplete}
                missingCriticalFields={missingCritical}
                currentPhilosophy={activePhilosophy}
                onNavigateToPhilosophy={onNavigateToPhilosophy}
                onUpdateSnapshot={handleUpdateSnapshot}
              />

              {/* Weekly Workload Bar Chart Visualization */}
              <WeeklyWorkloadChart
                microcycles={microcycles}
                mesocycles={mesocycles}
                onSelectMicrocycle={(microId, mesoId) => {
                  setSelectedMesocycleId(mesoId);
                  setActiveTab('microciclos');
                }}
              />
            </>
          )}

          {activeTab === 'mesociclos' && (
            <MesocycleManager
              mesocycles={mesocycles}
              onSaveMesocycle={handleSaveMesocycle}
              onDeleteMesocycle={handleDeleteMesocycle}
              onSelectMesocycleForMicrocycles={(mesoId) => {
                setSelectedMesocycleId(mesoId);
                setActiveTab('microciclos');
              }}
              isPhilosophyComplete={isPhilosophyComplete}
              missingCriticalFields={missingCritical}
              currentPhilosophy={activePhilosophy}
              onNavigateToPhilosophy={onNavigateToPhilosophy}
            />
          )}

          {activeTab === 'microciclos' && activeMesocycle && (
            <MicrocycleManager
              mesocycle={activeMesocycle}
              seasonGoal={season}
              microcycles={activeMicrocycles}
              onSaveMicrocycle={handleSaveMicrocycle}
              onDeleteMicrocycle={handleDeleteMicrocycle}
              onSaveSession={handleSaveSession}
              onDeleteSession={handleDeleteSession}
              onSaveEvaluation={handleSaveEvaluation}
              onSelectMesocycle={setSelectedMesocycleId}
              isPhilosophyComplete={isPhilosophyComplete}
              missingCriticalFields={missingCritical}
              currentPhilosophy={activePhilosophy}
              onNavigateToPhilosophy={onNavigateToPhilosophy}
            />
          )}

          {activeTab === 'desequilibrios' && (
            <ImbalanceDashboard
              season={season}
              mesocycles={mesocycles}
              microcycles={microcycles}
            />
          )}
        </div>
      </div>
    </div>
  );
};

