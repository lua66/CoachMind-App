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
  X,
  Eraser,
  FolderPlus,
  Save,
  AlertCircle,
} from 'lucide-react';
import { CoachPhilosophy } from '../../types';
import {
  Microcycle,
  Mesocycle,
  SeasonGoal,
  SessionLog,
  MicrocycleEvaluation,
  PlanningArea,
  CycleState,
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
  onSelectMesocycle?: (mesoId: string) => void;
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

  // Microcycle Create / Edit Modal State
  const [editingMicro, setEditingMicro] = useState<Microcycle | null>(null);
  const [isCreatingMicro, setIsCreatingMicro] = useState(false);

  const handleOpenCreateMicrocycle = () => {
    const nextSemana = sortedMicros.length > 0 ? Math.max(...sortedMicros.map((m) => m.semana)) + 1 : 1;
    const newMicroDraft: Microcycle = {
      id: `micro-${Date.now()}`,
      mesocycleId: mesocycle?.id || 'meso-general',
      semana: nextSemana,
      fechaInicio: '',
      fechaFin: '',
      objetivoSemanal: `Semana ${nextSemana}: Objetivos y modelo de juego`,
      cargasPlanificadas: {
        sesiones: 3, // Flexible default, customizable
        intensidad: 'Alta',
        volumenMinutos: 270,
      },
      goalIds: mesocycle?.goals ? mesocycle.goals.map((g) => g.id) : [],
      estado: sortedMicros.length === 0 ? 'activo' : 'planificado',
      sessions: [],
    };
    setEditingMicro(newMicroDraft);
    setIsCreatingMicro(true);
  };

  const handleOpenEditMicrocycle = (micro: Microcycle) => {
    setEditingMicro({ ...micro });
    setIsCreatingMicro(false);
  };

  const handleSaveMicrocycleForm = () => {
    if (!editingMicro) return;
    if (!editingMicro.objetivoSemanal.trim()) {
      alert('Por favor, indica un objetivo para el microciclo semanal.');
      return;
    }
    onSaveMicrocycle(editingMicro);
    setSelectedMicroId(editingMicro.id);
    setEditingMicro(null);
    setIsCreatingMicro(false);
  };

  const handleClearAllMicros = () => {
    if (window.confirm('¿Deseas eliminar todos los microciclos de este bloque?')) {
      microcycles.forEach((m) => onDeleteMicrocycle(m.id));
      setSelectedMicroId('');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-semibold uppercase tracking-wider mb-1">
            <Layers className="w-3.5 h-3.5 text-orange-600" />
            <span>{mesocycle?.nombre || 'Planificación de la Temporada'}</span>
          </div>
          <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-orange-600" />
            <span>Microciclos Semanales</span>
          </h3>
          <p className="text-sm text-slate-500 mt-0.5">
            Planificación de cada semana con total flexibilidad en el número de sesiones (2, 3, 4, 5+ sesiones), volumen e intensidad.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          {microcycles.length > 0 && (
            <button
              type="button"
              onClick={handleClearAllMicros}
              className="px-3 py-2 text-xs font-semibold text-slate-600 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition flex items-center gap-1.5 cursor-pointer"
              title="Borrar todos los microciclos"
            >
              <Eraser className="w-3.5 h-3.5" />
              <span>Vaciar Microciclos</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleOpenCreateMicrocycle}
            className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-sm font-bold shadow-sm transition flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Crear Microciclo</span>
          </button>
        </div>
      </div>

      {/* Microcycle Modal: Create / Edit */}
      {editingMicro && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h4 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-orange-600" />
                <span>{isCreatingMicro ? 'Crear Nuevo Microciclo Semanal' : `Editar Microciclo (Semana ${editingMicro.semana})`}</span>
              </h4>
              <button
                type="button"
                onClick={() => {
                  setEditingMicro(null);
                  setIsCreatingMicro(false);
                }}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Número de Semana
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={editingMicro.semana}
                    onChange={(e) => setEditingMicro({ ...editingMicro, semana: parseInt(e.target.value) || 1 })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-800 focus:bg-white focus:border-orange-500 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Estado
                  </label>
                  <select
                    value={editingMicro.estado}
                    onChange={(e) => setEditingMicro({ ...editingMicro, estado: e.target.value as CycleState })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-800 focus:bg-white focus:border-orange-500 focus:outline-hidden cursor-pointer"
                  >
                    <option value="planificado">Planificado</option>
                    <option value="activo">Activo (En curso)</option>
                    <option value="cerrado">Cerrado / Evaluado</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Objetivo del Microciclo Semanal
                </label>
                <textarea
                  rows={2}
                  value={editingMicro.objetivoSemanal}
                  onChange={(e) => setEditingMicro({ ...editingMicro, objetivoSemanal: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-800 focus:bg-white focus:border-orange-500 focus:outline-hidden"
                  placeholder="p. ej. Introducción de normas defensivas y consolidación del tiro tras recepción..."
                />
              </div>

              {/* Weekly Sessions Configuration (Completely flexible) */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-800">
                  Configuración de Carga Semanal
                </label>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-semibold text-slate-700">Sesiones programadas en la semana:</span>
                    <span className="text-sm font-extrabold text-orange-700">
                      {editingMicro.cargasPlanificadas?.sesiones || 3} sesiones
                    </span>
                  </div>
                  {/* Quick chips for 2, 3, 4, 5, 6 sessions */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {[1, 2, 3, 4, 5, 6, 7].map((num) => (
                      <button
                        key={num}
                        type="button"
                        onClick={() =>
                          setEditingMicro({
                            ...editingMicro,
                            cargasPlanificadas: {
                              ...editingMicro.cargasPlanificadas,
                              sesiones: num,
                              volumenMinutos: num * 90, // reasonable default based on count
                            },
                          })
                        }
                        className={`px-3 py-1 text-xs rounded-lg font-bold border transition cursor-pointer ${
                          editingMicro.cargasPlanificadas?.sesiones === num
                            ? 'bg-orange-600 text-white border-orange-600'
                            : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                        }`}
                      >
                        {num} {num === 1 ? 'sesión' : 'sesiones'}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Volumen total (minutos)
                    </label>
                    <input
                      type="number"
                      step="15"
                      min="30"
                      value={editingMicro.cargasPlanificadas?.volumenMinutos || 270}
                      onChange={(e) =>
                        setEditingMicro({
                          ...editingMicro,
                          cargasPlanificadas: {
                            ...editingMicro.cargasPlanificadas,
                            volumenMinutos: parseInt(e.target.value) || 0,
                          },
                        })
                      }
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-800 focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Intensidad Prevista
                    </label>
                    <select
                      value={editingMicro.cargasPlanificadas?.intensidad || 'Alta'}
                      onChange={(e) =>
                        setEditingMicro({
                          ...editingMicro,
                          cargasPlanificadas: {
                            ...editingMicro.cargasPlanificadas,
                            sesiones: editingMicro.cargasPlanificadas?.sesiones || 3,
                            volumenMinutos: editingMicro.cargasPlanificadas?.volumenMinutos || 270,
                            intensidad: e.target.value as 'Baja' | 'Media' | 'Alta' | 'Máxima',
                          },
                        })
                      }
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-800 focus:outline-hidden cursor-pointer"
                    >
                      <option value="Baja">Baja</option>
                      <option value="Media">Media</option>
                      <option value="Alta">Alta</option>
                      <option value="Máxima">Máxima</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Fecha Inicio Semana
                  </label>
                  <input
                    type="date"
                    value={editingMicro.fechaInicio}
                    onChange={(e) => setEditingMicro({ ...editingMicro, fechaInicio: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-800 focus:bg-white focus:border-orange-500 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Fecha Fin Semana
                  </label>
                  <input
                    type="date"
                    value={editingMicro.fechaFin}
                    onChange={(e) => setEditingMicro({ ...editingMicro, fechaFin: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-800 focus:bg-white focus:border-orange-500 focus:outline-hidden"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setEditingMicro(null);
                  setIsCreatingMicro(false);
                }}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm font-medium transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveMicrocycleForm}
                className="px-5 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-sm font-bold shadow-sm transition flex items-center gap-1.5 cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>Guardar Microciclo</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Microcycles List or Empty State */}
      {!currentMicro ? (
        <div className="bg-white border-2 border-dashed border-slate-200 rounded-2xl p-10 text-center space-y-4 shadow-2xs">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-orange-50 border border-orange-100 text-orange-600 flex items-center justify-center">
            <Calendar className="w-7 h-7" />
          </div>
          <div className="max-w-md mx-auto space-y-1.5">
            <h3 className="text-lg font-bold text-slate-900">
              No hay Microciclos Creados
            </h3>
            <p className="text-sm text-slate-500">
              Crea microciclos semanales con total libertad en el número de entrenamientos semanales (2, 3, 4 o 5 sesiones) y registra el trabajo de tu equipo.
            </p>
          </div>
          <div>
            <button
              type="button"
              onClick={handleOpenCreateMicrocycle}
              className="px-5 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-sm font-bold transition inline-flex items-center gap-2 shadow-sm cursor-pointer"
            >
              <FolderPlus className="w-4 h-4" />
              <span>Crear Microciclo</span>
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Week Selector Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2">
            {sortedMicros.map((micro) => {
              const isSelected = micro.id === currentMicro.id;
              return (
                <button
                  key={micro.id}
                  type="button"
                  onClick={() => setSelectedMicroId(micro.id)}
                  className={`px-4 py-2.5 rounded-xl text-xs font-bold shrink-0 transition flex items-center gap-2 border cursor-pointer ${
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

            <button
              type="button"
              onClick={handleOpenCreateMicrocycle}
              className="px-3.5 py-2 rounded-xl text-xs font-bold text-orange-600 bg-orange-50 hover:bg-orange-100 border border-orange-200 shrink-0 transition flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Añadir Semana</span>
            </button>
          </div>

          {/* Active Microcycle Detail Card */}
          {(() => {
            const historical = sortedMicros.filter(
              (m) => m.id !== currentMicro.id && m.semana < currentMicro.semana
            );
            const mesoGoals = mesocycle?.goals || [];
            const imbalanceData = detectImbalances(
              mesoGoals,
              currentMicro.sessions || [],
              historical,
              currentMicro.evaluation?.objetivosNoCumplidos || []
            );

            const totalSessionsLogged = (currentMicro.sessions || []).length;
            const totalMinutesLogged = (currentMicro.sessions || []).reduce(
              (s, x) => s + (Number(x.duracionMin) || 0),
              0
            );

            return (
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
                {/* Micro Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2.5 flex-wrap">
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

                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => handleOpenEditMicrocycle(currentMicro)}
                      className="px-3 py-2 border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                    >
                      <Edit2 className="w-3.5 h-3.5 text-slate-500" />
                      <span>Editar Microciclo</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm(`¿Deseas eliminar la Semana ${currentMicro.semana}?`)) {
                          onDeleteMicrocycle(currentMicro.id);
                        }
                      }}
                      className="p-2 border border-slate-200 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition cursor-pointer"
                      title="Eliminar microciclo"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => setIsCloseModalOpen(true)}
                      className="px-4 py-2 rounded-xl text-xs font-bold shadow-sm transition flex items-center gap-1.5 cursor-pointer bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white"
                    >
                      <Sparkles className="w-4 h-4" />
                      <span>
                        {currentMicro.estado === 'cerrado' ? 'Revisar Cierre IA' : 'Cerrar Microciclo'}
                      </span>
                    </button>
                  </div>
                </div>

                {/* Planned vs Real Loads Metric Badges */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs">
                    <span className="text-slate-500 font-semibold block mb-0.5">Sesiones Semanales</span>
                    <span className="text-sm font-extrabold text-slate-900">
                      {totalSessionsLogged} / {currentMicro.cargasPlanificadas?.sesiones || 3}
                    </span>
                    <span className="text-[11px] text-slate-400 block">registradas en pista</span>
                  </div>

                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs">
                    <span className="text-slate-500 font-semibold block mb-0.5">Volumen Total</span>
                    <span className="text-sm font-extrabold text-slate-900">
                      {totalMinutesLogged} / {currentMicro.cargasPlanificadas?.volumenMinutos || 270} min
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
                    <span className="text-[11px] text-slate-400 block">balance determinista</span>
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

                {/* Linked Mesocycle Goals if available */}
                {mesoGoals.length > 0 && (
                  <div className="space-y-3">
                    <h5 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                      Objetivos del Mesociclo Vinculados a esta Semana
                    </h5>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                      {mesoGoals.map((goal) => {
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
                )}

                {/* Session Logs Section */}
                <div className="space-y-4 pt-2 border-t border-slate-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <h5 className="text-sm font-bold text-slate-900">
                        Registros de Sesiones de Entrenamiento ({totalSessionsLogged})
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
                      className="px-3.5 py-1.5 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-xs font-semibold shadow-xs flex items-center gap-1 transition cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Registrar Sesión</span>
                    </button>
                  </div>

                  {totalSessionsLogged === 0 ? (
                    <div className="p-6 text-center bg-slate-50 border border-slate-200 rounded-xl text-slate-500 text-xs">
                      No hay sesiones registradas todavía en esta semana. Añade la primera sesión de entrenamiento.
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
                                className="p-1.5 text-slate-400 hover:text-slate-600 rounded transition cursor-pointer"
                                title="Editar sesión"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => onDeleteSession(currentMicro.id, session.id)}
                                className="p-1.5 text-slate-300 hover:text-red-600 rounded transition cursor-pointer"
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
            );
          })()}
        </>
      )}

      {/* Session Editor Modal */}
      {isSessionModalOpen && currentMicro && (
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
      {isCloseModalOpen && currentMicro && (
        <MicrocycleCloseModal
          microcycle={currentMicro}
          mesocycle={mesocycle}
          seasonGoal={seasonGoal}
          historicalMicrocycles={sortedMicros.filter(
            (m) => m.id !== currentMicro.id && m.semana < currentMicro.semana
          )}
          coachPhilosophy={currentPhilosophy}
          onSaveEvaluationAndAdvance={(evaluation, nextMicroDraft) => {
            onSaveEvaluation(currentMicro.id, evaluation);
            if (nextMicroDraft) {
              const fullNextMicro: Microcycle = {
                id: `micro-${Date.now()}`,
                mesocycleId: mesocycle?.id || 'meso-general',
                semana: nextMicroDraft.semana || currentMicro.semana + 1,
                fechaInicio: '',
                fechaFin: '',
                objetivoSemanal: nextMicroDraft.objetivoSemanal || 'Continuidad y refuerzo',
                cargasPlanificadas: nextMicroDraft.cargasPlanificadas || {
                  sesiones: 3,
                  intensidad: 'Alta',
                  volumenMinutos: 270,
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
