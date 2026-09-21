import React, { useState } from 'react';
import {
  Calendar,
  Clock,
  Activity,
  Plus,
  Sparkles,
  CheckCircle2,
  XCircle,
  Edit2,
  Trash2,
  Layers,
  Flame,
  Check,
  ChevronRight,
  TrendingDown,
  TrendingUp,
  Compass,
} from 'lucide-react';
import { CoachPhilosophy } from '../../types';
import {
  Microcycle,
  Mesocycle,
  SeasonGoal,
  SessionLog,
  MicrocycleEvaluation,
  PlanningArea,
} from '../../types/planning';
import { SessionLogEditorModal } from './SessionLogEditorModal';
import { MicrocycleCloseModal } from './MicrocycleCloseModal';
import { detectImbalances } from '../../utils/imbalanceDetector';

interface MicrocycleManagerProps {
  mesocycle: Mesocycle;
  seasonGoal: SeasonGoal;
  microcycles: Microcycle[];
  onSaveMicrocycle: (micro: Microcycle) => void;
  onDeleteMicrocycle: (id: string) => void;
  onSaveSession: (microcycleId: string, session: SessionLog) => void;
  onDeleteSession: (microcycleId: string, sessionId: string) => void;
  onSaveEvaluation: (microcycleId: string, evaluation: MicrocycleEvaluation) => void;
  onSelectMesocycle: (mesoId: string) => void;
  isPhilosophyComplete?: boolean;
  missingCriticalFields?: string[];
  currentPhilosophy?: CoachPhilosophy | null;
  onNavigateToPhilosophy?: () => void;
}

const AREA_COLORS: Record<PlanningArea, { bg: string; text: string; dot: string }> = {
  tecnica: { bg: 'bg-emerald-50', text: 'text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
  tactica: { bg: 'bg-blue-50', text: 'text-blue-700 border-blue-200', dot: 'bg-blue-500' },
  fisica: { bg: 'bg-amber-50', text: 'text-amber-700 border-amber-200', dot: 'bg-amber-500' },
  mental: { bg: 'bg-purple-50', text: 'text-purple-700 border-purple-200', dot: 'bg-purple-500' },
};

export const MicrocycleManager: React.FC<MicrocycleManagerProps> = ({
  mesocycle,
  seasonGoal,
  microcycles,
  onSaveMicrocycle,
  onDeleteMicrocycle,
  onSaveSession,
  onDeleteSession,
  onSaveEvaluation,
  onSelectMesocycle,
  isPhilosophyComplete = true,
  missingCriticalFields = [],
  currentPhilosophy,
  onNavigateToPhilosophy,
}) => {
  // Sort microcycles by week
  const sortedMicros = [...microcycles].sort((a, b) => a.semana - b.semana);
  const [selectedMicroId, setSelectedMicroId] = useState<string>(
    sortedMicros.find((m) => m.estado === 'activo')?.id || sortedMicros[0]?.id || ''
  );

  const currentMicro = sortedMicros.find((m) => m.id === selectedMicroId) || sortedMicros[0];

  // Modals state
  const [isSessionModalOpen, setIsSessionModalOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<SessionLog | null>(null);
  const [isCloseModalOpen, setIsCloseModalOpen] = useState(false);

  // Quick New Microcycle
  const handleAddNewMicrocycle = () => {
    if (!isPhilosophyComplete) {
      onNavigateToPhilosophy?.();
      return;
    }
    const nextSemana = sortedMicros.length > 0 ? Math.max(...sortedMicros.map((m) => m.semana)) + 1 : 1;
    const newMicro: Microcycle = {
      id: `micro-${Date.now()}`,
      mesocycleId: mesocycle.id,
      semana: nextSemana,
      fechaInicio: '',
      fechaFin: '',
      objetivoSemanal: `Microciclo Semana ${nextSemana}: Consolidación y competición`,
      cargasPlanificadas: {
        sesiones: 4,
        intensidad: 'Alta',
        volumenMinutos: 360,
      },
      goalIds: mesocycle.goals.map((g) => g.id),
      estado: 'planificado',
      sessions: [],
    };
    onSaveMicrocycle(newMicro);
    setSelectedMicroId(newMicro.id);
  };

  if (!currentMicro) {
    return (
      <div className="p-8 text-center bg-white border border-slate-200 rounded-2xl">
        <p className="text-slate-500 mb-4">No hay microciclos creados para este mesociclo.</p>
        <button
          type="button"
          onClick={handleAddNewMicrocycle}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition cursor-pointer ${
            isPhilosophyComplete
              ? 'bg-orange-600 hover:bg-orange-700 text-white'
              : 'bg-amber-600 hover:bg-amber-700 text-white'
          }`}
        >
          {isPhilosophyComplete ? 'Crear Primer Microciclo' : 'Completar Filosofía'}
        </button>
      </div>
    );
  }

  // Calculate live imbalance metrics for the current micro
  const historical = sortedMicros.filter((m) => m.id !== currentMicro.id && m.semana < currentMicro.semana);
  const imbalanceData = detectImbalances(
    mesocycle.goals,
    currentMicro.sessions || [],
    historical,
    currentMicro.evaluation?.objetivosNoCumplidos || []
  );

  const totalSessionsLogged = (currentMicro.sessions || []).length;
  const totalMinutesLogged = (currentMicro.sessions || []).reduce((s, x) => s + (Number(x.duracionMin) || 0), 0);

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb & Mesocycle Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-semibold uppercase tracking-wider mb-1">
            <Layers className="w-3.5 h-3.5 text-orange-600" />
            <span>{mesocycle.nombre}</span>
          </div>
          <h3 className="text-xl font-bold text-slate-900">
            Microciclos y Sesiones de Entrenamiento
          </h3>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleAddNewMicrocycle}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition cursor-pointer ${
              isPhilosophyComplete
                ? 'bg-orange-50 hover:bg-orange-100 text-orange-700'
                : 'bg-amber-100 hover:bg-amber-200 text-amber-900'
            }`}
          >
            {isPhilosophyComplete ? <Plus className="w-3.5 h-3.5" /> : <Compass className="w-3.5 h-3.5" />}
            <span>{isPhilosophyComplete ? 'Añadir Microciclo' : 'Completar Filosofía'}</span>
          </button>
        </div>
      </div>

      {/* Week Selector Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {sortedMicros.map((micro) => {
          const isSelected = micro.id === currentMicro.id;
          return (
            <button
              key={micro.id}
              type="button"
              onClick={() => setSelectedMicroId(micro.id)}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold shrink-0 transition flex items-center gap-2 border ${
                isSelected
                  ? 'bg-orange-600 text-white border-orange-600 shadow-sm'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:border-slate-300'
              }`}
            >
              <span>Semana {micro.semana}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded font-semibold ${
                  isSelected
                    ? 'bg-white/20 text-white'
                    : micro.estado === 'cerrado'
                    ? 'bg-slate-100 text-slate-600'
                    : micro.estado === 'activo'
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'bg-blue-50 text-blue-700'
                }`}
              >
                {micro.estado === 'cerrado' ? '✓ Cerrado' : micro.estado === 'activo' ? '● Activo' : 'Planificado'}
              </span>
            </button>
          );
        })}
      </div>

      {/* Active Microcycle Card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
        {/* Micro Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <h4 className="text-xl font-bold text-slate-900">
                Semana {currentMicro.semana}: {currentMicro.objetivoSemanal}
              </h4>
              <span
                className={`text-xs px-2.5 py-0.5 rounded-full font-semibold border ${
                  currentMicro.estado === 'cerrado'
                    ? 'bg-slate-100 text-slate-600 border-slate-200'
                    : currentMicro.estado === 'activo'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-blue-50 text-blue-700 border-blue-200'
                }`}
              >
                {currentMicro.estado === 'cerrado'
                  ? 'Microciclo Evaluado'
                  : currentMicro.estado === 'activo'
                  ? 'En Curso'
                  : 'Planificado'}
              </span>
            </div>
            {currentMicro.fechaInicio && (
              <p className="text-xs text-slate-500 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                {currentMicro.fechaInicio} — {currentMicro.fechaFin || 'Fin de semana'}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                if (!isPhilosophyComplete) {
                  onNavigateToPhilosophy?.();
                } else {
                  setIsCloseModalOpen(true);
                }
              }}
              className={`px-4 py-2 rounded-xl text-xs font-bold shadow-sm transition flex items-center gap-1.5 cursor-pointer ${
                isPhilosophyComplete
                  ? 'bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white'
                  : 'bg-amber-600 hover:bg-amber-700 text-white'
              }`}
            >
              {isPhilosophyComplete ? <Sparkles className="w-4 h-4" /> : <Compass className="w-4 h-4" />}
              <span>
                {isPhilosophyComplete
                  ? currentMicro.estado === 'cerrado'
                    ? 'Revisar Cierre IA'
                    : 'Cerrar Microciclo con IA'
                  : 'Completar Filosofía para Cierre IA'}
              </span>
            </button>
          </div>
        </div>

        {/* Planned vs Real Loads Metric Badges */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs">
            <span className="text-slate-500 font-semibold block mb-0.5">Sesiones</span>
            <span className="text-sm font-extrabold text-slate-900">
              {totalSessionsLogged} / {currentMicro.cargasPlanificadas?.sesiones || 4}
            </span>
            <span className="text-[11px] text-slate-400 block">registradas en pista</span>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs">
            <span className="text-slate-500 font-semibold block mb-0.5">Volumen Total</span>
            <span className="text-sm font-extrabold text-slate-900">
              {totalMinutesLogged} / {currentMicro.cargasPlanificadas?.volumenMinutos || 360} min
            </span>
            <span className="text-[11px] text-slate-400 block">minutos acumulados</span>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs">
            <span className="text-slate-500 font-semibold block mb-0.5">Intensidad</span>
            <span className="text-sm font-extrabold text-orange-600 flex items-center gap-1">
              <Flame className="w-3.5 h-3.5" />
              {currentMicro.cargasPlanificadas?.intensidad || 'Alta'}
            </span>
            <span className="text-[11px] text-slate-400 block">carga programada</span>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs">
            <span className="text-slate-500 font-semibold block mb-0.5">Diagnóstico Cargas</span>
            <span className="text-xs font-bold text-slate-800 line-clamp-1">
              {imbalanceData.summaryText}
            </span>
            <span className="text-[11px] text-slate-400 block">algoritmo determinista</span>
          </div>
        </div>

        {/* Real-time Imbalance Indicators Strip */}
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-700 uppercase tracking-wider">
            <span>Distribución de Tiempo en Pista por Área (% Real vs Planificado)</span>
            <span className="text-slate-400 text-[11px] lowercase">actualizado por sesión</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {(['tecnica', 'tactica', 'fisica', 'mental'] as PlanningArea[]).map((area) => {
              const stat = imbalanceData.byArea[area];
              const realPct = Math.round((stat?.realPct || 0) * 100);
              const planPct = Math.round((stat?.plannedPct || 0.25) * 100);
              const isNeglected = stat?.status === 'descuidada';
              const isOverworked = stat?.status === 'sobre_trabajada';

              return (
                <div
                  key={area}
                  className={`p-2.5 rounded-lg border text-xs flex items-center justify-between ${
                    isNeglected
                      ? 'bg-red-50/70 border-red-200 text-red-900'
                      : isOverworked
                      ? 'bg-amber-50/70 border-amber-200 text-amber-900'
                      : 'bg-white border-slate-200 text-slate-800'
                  }`}
                >
                  <div className="space-y-0.5">
                    <span className="font-bold uppercase text-[11px] block">{area}</span>
                    <span className="text-slate-500 text-[11px]">{stat?.realMinutes || 0} min</span>
                  </div>
                  <div className="text-right">
                    <span className="font-extrabold text-sm block">{realPct}%</span>
                    <span className="text-[10px] text-slate-400">obj: {planPct}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Linked Mesocycle Goals */}
        <div className="space-y-3">
          <h5 className="text-xs font-bold uppercase tracking-wider text-slate-700">
            Objetivos del Mesociclo Vinculados a esta Semana
          </h5>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {mesocycle.goals.map((goal) => {
              const isFulfilled = currentMicro.evaluation?.objetivosCumplidos?.includes(goal.id);
              const isUnfulfilled = currentMicro.evaluation?.objetivosNoCumplidos?.includes(goal.id);

              return (
                <div
                  key={goal.id}
                  className="p-3 bg-white border border-slate-200 rounded-xl text-xs space-y-1 flex items-start justify-between gap-2"
                >
                  <div>
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="font-bold uppercase px-1.5 py-0.2 rounded bg-slate-100 text-slate-700 text-[10px]">
                        {goal.area}
                      </span>
                      <span className="font-semibold text-slate-800">{goal.descripcion}</span>
                    </div>
                    <p className="text-slate-500 text-[11px]">{goal.indicadorExito}</p>
                  </div>

                  {isFulfilled ? (
                    <span className="shrink-0 text-emerald-600 font-bold flex items-center gap-0.5">
                      <CheckCircle2 className="w-4 h-4" />
                    </span>
                  ) : isUnfulfilled ? (
                    <span className="shrink-0 text-red-600 font-bold flex items-center gap-0.5">
                      <XCircle className="w-4 h-4" />
                    </span>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>

        {/* Session Logs Section */}
        <div className="space-y-4 pt-2 border-t border-slate-100">
          <div className="flex items-center justify-between">
            <div>
              <h5 className="text-sm font-bold text-slate-900">
                Registros de Sesiones en Pista ({totalSessionsLogged})
              </h5>
              <p className="text-xs text-slate-500">
                Desglose de tareas con minutaje por área técnica, táctica, física y mental.
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                setEditingSession(null);
                setIsSessionModalOpen(true);
              }}
              className="px-3.5 py-1.5 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-xs font-semibold shadow-xs flex items-center gap-1 transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Registrar Sesión</span>
            </button>
          </div>

          {totalSessionsLogged === 0 ? (
            <div className="p-6 text-center bg-slate-50 border border-slate-200 rounded-xl text-slate-500 text-xs">
              No hay sesiones registradas todavía. Añade la primera sesión para que el algoritmo calcule los desequilibrios.
            </div>
          ) : (
            <div className="space-y-3">
              {(currentMicro.sessions || []).map((session, idx) => (
                <div
                  key={session.id}
                  className="p-4 bg-white border border-slate-200 rounded-xl hover:border-slate-300 transition shadow-2xs space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <span className="w-6 h-6 rounded-full bg-orange-100 text-orange-700 font-bold text-xs flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <div>
                        <span className="font-bold text-slate-900 text-sm">{session.titulo}</span>
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                          <span>{session.fecha}</span>
                          <span>•</span>
                          <span className="font-semibold text-slate-700">{session.duracionMin} min</span>
                          {session.rpe && (
                            <>
                              <span>•</span>
                              <span>RPE: {session.rpe}/10</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 self-end sm:self-auto">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingSession(session);
                          setIsSessionModalOpen(true);
                        }}
                        className="p-1.5 text-slate-400 hover:text-slate-600 rounded transition"
                        title="Editar sesión"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteSession(currentMicro.id, session.id)}
                        className="p-1.5 text-slate-300 hover:text-red-600 rounded transition"
                        title="Eliminar sesión"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Contents pill strip */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                    {(session.contenidos || []).map((c, cIdx) => {
                      const color = AREA_COLORS[c.area] || AREA_COLORS.tecnica;
                      return (
                        <div
                          key={cIdx}
                          className={`p-2 rounded-lg border text-xs flex items-start gap-2 ${color.bg} ${color.text}`}
                        >
                          <span className={`w-2 h-2 rounded-full ${color.dot} mt-1 shrink-0`} />
                          <div className="flex-1 min-w-0">
                            <span className="font-semibold block truncate">{c.contenido}</span>
                            <span className="text-[11px] opacity-80">{c.duracionMin} min</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {session.notas && (
                    <p className="text-xs text-slate-500 italic pl-1 border-l-2 border-slate-200">
                      "{session.notas}"
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Session Editor Modal */}
      {isSessionModalOpen && (
        <SessionLogEditorModal
          session={editingSession}
          microcycleId={currentMicro.id}
          onSave={(sess) => {
            onSaveSession(currentMicro.id, sess);
            setIsSessionModalOpen(false);
            setEditingSession(null);
          }}
          onClose={() => {
            setIsSessionModalOpen(false);
            setEditingSession(null);
          }}
        />
      )}

      {/* Microcycle Closing Flow Modal */}
      {isCloseModalOpen && (
        <MicrocycleCloseModal
          microcycle={currentMicro}
          mesocycle={mesocycle}
          seasonGoal={seasonGoal}
          historicalMicrocycles={historical}
          coachPhilosophy={currentPhilosophy}
          onSaveEvaluationAndAdvance={(evaluation, nextMicroDraft) => {
            onSaveEvaluation(currentMicro.id, evaluation);
            if (nextMicroDraft) {
              const fullNextMicro: Microcycle = {
                id: `micro-${Date.now()}`,
                mesocycleId: mesocycle.id,
                semana: nextMicroDraft.semana || currentMicro.semana + 1,
                fechaInicio: '',
                fechaFin: '',
                objetivoSemanal: nextMicroDraft.objetivoSemanal || 'Continuidad y refuerzo',
                cargasPlanificadas: nextMicroDraft.cargasPlanificadas || {
                  sesiones: 4,
                  intensidad: 'Alta',
                  volumenMinutos: 360,
                },
                goalIds: nextMicroDraft.goalIds || [],
                estado: 'planificado',
                sessions: [],
              };
              onSaveMicrocycle(fullNextMicro);
              setSelectedMicroId(fullNextMicro.id);
            }
            setIsCloseModalOpen(false);
          }}
          onClose={() => setIsCloseModalOpen(false)}
        />
      )}
    </div>
  );
};
