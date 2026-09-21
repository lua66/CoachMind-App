import React, { useState } from 'react';
import {
  Layers,
  Plus,
  Calendar,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowRight,
  Edit2,
  Trash2,
  Sparkles,
  Award,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Compass,
} from 'lucide-react';
import { CoachPhilosophy } from '../../types';
import {
  Mesocycle,
  MesocycleGoal,
  PlanningArea,
  GoalStatus,
  CycleState,
} from '../../types/planning';

interface MesocycleManagerProps {
  mesocycles: Mesocycle[];
  onSaveMesocycle: (meso: Mesocycle) => void;
  onDeleteMesocycle: (id: string) => void;
  onSelectMesocycleForMicrocycles: (mesoId: string) => void;
  isPhilosophyComplete?: boolean;
  missingCriticalFields?: string[];
  currentPhilosophy?: CoachPhilosophy | null;
  onNavigateToPhilosophy?: () => void;
}

const AREA_CONFIG: Record<
  PlanningArea,
  { label: string; badgeClass: string; borderClass: string }
> = {
  tecnica: {
    label: 'Técnica Individual',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    borderClass: 'border-l-emerald-500',
  },
  tactica: {
    label: 'Táctica de Equipo',
    badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
    borderClass: 'border-l-blue-500',
  },
  fisica: {
    label: 'Preparación Física',
    badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
    borderClass: 'border-l-amber-500',
  },
  mental: {
    label: 'Psicológica / Mental',
    badgeClass: 'bg-purple-50 text-purple-700 border-purple-200',
    borderClass: 'border-l-purple-500',
  },
};

const STATUS_ICONS: Record<GoalStatus, { label: string; icon: any; colorClass: string }> = {
  cumplido: { label: 'Cumplido', icon: CheckCircle2, colorClass: 'text-emerald-600' },
  no_cumplido: { label: 'No cumplido', icon: XCircle, colorClass: 'text-red-600' },
  en_progreso: { label: 'En progreso', icon: Clock, colorClass: 'text-amber-600' },
  pendiente: { label: 'Pendiente', icon: Clock, colorClass: 'text-slate-400' },
};

export const MesocycleManager: React.FC<MesocycleManagerProps> = ({
  mesocycles,
  onSaveMesocycle,
  onDeleteMesocycle,
  onSelectMesocycleForMicrocycles,
  isPhilosophyComplete = true,
  missingCriticalFields = [],
  currentPhilosophy,
  onNavigateToPhilosophy,
}) => {
  const [expandedId, setExpandedId] = useState<string | null>(mesocycles[0]?.id || null);
  const [isCreating, setIsCreating] = useState(false);
  const [editingMeso, setEditingMeso] = useState<Mesocycle | null>(null);

  // New Goal Temp State
  const [addingGoalMesoId, setAddingGoalMesoId] = useState<string | null>(null);
  const [newGoalArea, setNewGoalArea] = useState<PlanningArea>('tecnica');
  const [newGoalDesc, setNewGoalDesc] = useState('');
  const [newGoalIndicator, setNewGoalIndicator] = useState('');

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const handleToggleGoalStatus = (meso: Mesocycle, goalId: string) => {
    const updatedGoals = meso.goals.map((g) => {
      if (g.id === goalId) {
        const nextStatus: Record<GoalStatus, GoalStatus> = {
          pendiente: 'en_progreso',
          en_progreso: 'cumplido',
          cumplido: 'no_cumplido',
          no_cumplido: 'pendiente',
        };
        return { ...g, estado: nextStatus[g.estado] || 'pendiente' };
      }
      return g;
    });

    onSaveMesocycle({
      ...meso,
      goals: updatedGoals,
    });
  };

  const handleAddGoal = (meso: Mesocycle) => {
    if (!newGoalDesc.trim()) return;

    const newGoal: MesocycleGoal = {
      id: `goal-${Date.now()}`,
      mesocycleId: meso.id,
      area: newGoalArea,
      descripcion: newGoalDesc.trim(),
      indicadorExito: newGoalIndicator.trim() || 'Evaluación cualitativa en pista',
      estado: 'pendiente',
    };

    onSaveMesocycle({
      ...meso,
      goals: [...meso.goals, newGoal],
    });

    setNewGoalDesc('');
    setNewGoalIndicator('');
    setAddingGoalMesoId(null);
  };

  const handleDeleteGoal = (meso: Mesocycle, goalId: string) => {
    onSaveMesocycle({
      ...meso,
      goals: meso.goals.filter((g) => g.id !== goalId),
    });
  };

  const handleCreateNewMeso = () => {
    if (!isPhilosophyComplete) {
      onNavigateToPhilosophy?.();
      return;
    }
    const nextNum = mesocycles.length + 1;
    const newMeso: Mesocycle = {
      id: `meso-${Date.now()}`,
      seasonGoalId: 'season-2025-2026-senior',
      numero: nextNum,
      nombre: `Mesociclo ${nextNum}: Fase ${nextNum}`,
      fechaInicio: '',
      fechaFin: '',
      objetivoPrincipal: '',
      estado: 'planificado',
      goals: [],
    };
    setEditingMeso(newMeso);
    setIsCreating(true);
  };

  const handleSaveEdit = () => {
    if (!isPhilosophyComplete) {
      onNavigateToPhilosophy?.();
      return;
    }
    if (editingMeso) {
      onSaveMesocycle(editingMeso);
      setEditingMeso(null);
      setIsCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Layers className="w-5 h-5 text-orange-600" />
            <span>Estructura de Mesociclos ({mesocycles.length})</span>
          </h3>
          <p className="text-sm text-slate-500 mt-0.5">
            Bloques de 3 a 6 semanas con objetivos específicos por área técnica, táctica, física y mental.
          </p>
        </div>

        <button
          type="button"
          onClick={handleCreateNewMeso}
          className={`px-4 py-2 rounded-lg text-sm font-semibold shadow-sm transition flex items-center gap-1.5 self-start sm:self-auto cursor-pointer ${
            isPhilosophyComplete
              ? 'bg-orange-600 hover:bg-orange-700 text-white'
              : 'bg-amber-600 hover:bg-amber-700 text-white'
          }`}
        >
          {isPhilosophyComplete ? <Plus className="w-4 h-4" /> : <Compass className="w-4 h-4" />}
          <span>{isPhilosophyComplete ? 'Nuevo Mesociclo' : 'Completar Filosofía'}</span>
        </button>
      </div>

      {/* Mesocycle Edit Modal */}
      {editingMeso && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-xl border border-slate-200 space-y-4">
            <h4 className="text-lg font-bold text-slate-900">
              {isCreating ? 'Crear Nuevo Mesociclo' : 'Editar Mesociclo'}
            </h4>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Nombre del Mesociclo
                </label>
                <input
                  type="text"
                  value={editingMeso.nombre}
                  onChange={(e) => setEditingMeso({ ...editingMeso, nombre: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-800 focus:bg-white focus:border-orange-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Objetivo Principal del Mesociclo
                </label>
                <textarea
                  rows={2}
                  value={editingMeso.objetivoPrincipal}
                  onChange={(e) => setEditingMeso({ ...editingMeso, objetivoPrincipal: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-800 focus:bg-white focus:border-orange-500 focus:outline-none"
                  placeholder="p. ej. Puesta a punto y automatización de normas colectivas."
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Fecha Inicio
                  </label>
                  <input
                    type="date"
                    value={editingMeso.fechaInicio}
                    onChange={(e) => setEditingMeso({ ...editingMeso, fechaInicio: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-800 focus:bg-white focus:border-orange-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Fecha Fin
                  </label>
                  <input
                    type="date"
                    value={editingMeso.fechaFin}
                    onChange={(e) => setEditingMeso({ ...editingMeso, fechaFin: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-800 focus:bg-white focus:border-orange-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Estado
                </label>
                <select
                  value={editingMeso.estado}
                  onChange={(e) => setEditingMeso({ ...editingMeso, estado: e.target.value as CycleState })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-800 focus:bg-white focus:border-orange-500 focus:outline-none"
                >
                  <option value="planificado">Planificado</option>
                  <option value="activo">Activo (En curso)</option>
                  <option value="cerrado">Cerrado / Evaluado</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setEditingMeso(null);
                  setIsCreating(false);
                }}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm font-medium transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-sm font-semibold transition"
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mesocycles List */}
      <div className="space-y-4">
        {mesocycles.map((meso) => {
          const isExpanded = expandedId === meso.id;
          const goalsCount = meso.goals.length;
          const fulfilledCount = meso.goals.filter((g) => g.estado === 'cumplido').length;
          const unfulfilledCount = meso.goals.filter((g) => g.estado === 'no_cumplido').length;

          return (
            <div
              key={meso.id}
              className={`bg-white border transition-all rounded-2xl shadow-xs overflow-hidden ${
                isExpanded ? 'border-orange-300 ring-2 ring-orange-500/10' : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              {/* Mesocycle Header */}
              <div
                className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer select-none bg-slate-50/50 hover:bg-slate-50"
                onClick={() => toggleExpand(meso.id)}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="font-bold text-slate-900 text-lg">{meso.nombre}</span>
                    <span
                      className={`text-xs px-2.5 py-0.5 rounded-full font-semibold border ${
                        meso.estado === 'activo'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : meso.estado === 'cerrado'
                          ? 'bg-slate-100 text-slate-600 border-slate-200'
                          : 'bg-blue-50 text-blue-700 border-blue-200'
                      }`}
                    >
                      {meso.estado === 'activo' ? '● En Curso' : meso.estado === 'cerrado' ? '✓ Cerrado' : 'Planificado'}
                    </span>
                    {meso.fechaInicio && (
                      <span className="text-xs text-slate-500 flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {meso.fechaInicio} — {meso.fechaFin || 'En curso'}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-slate-600">{meso.objetivoPrincipal}</p>
                </div>

                <div className="flex items-center gap-3 shrink-0" onClick={(e) => e.stopPropagation()}>
                  {/* Goals progress pill */}
                  <div className="text-xs px-3 py-1.5 bg-slate-100 rounded-lg text-slate-700 flex items-center gap-2">
                    <span>{goalsCount} objetivos</span>
                    {fulfilledCount > 0 && <span className="text-emerald-600 font-bold">✓ {fulfilledCount}</span>}
                    {unfulfilledCount > 0 && <span className="text-red-600 font-bold">✕ {unfulfilledCount}</span>}
                  </div>

                  <button
                    type="button"
                    onClick={() => onSelectMesocycleForMicrocycles(meso.id)}
                    className="px-3 py-1.5 bg-orange-50 hover:bg-orange-100 text-orange-700 rounded-lg text-xs font-semibold flex items-center gap-1 transition"
                  >
                    <span>Ver Microciclos</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => setEditingMeso(meso)}
                    className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 rounded-lg transition"
                    title="Editar Mesociclo"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => toggleExpand(meso.id)}
                    className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg transition"
                  >
                    {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {/* Mesocycle Expanded Body */}
              {isExpanded && (
                <div className="p-6 border-t border-slate-100 space-y-6">
                  {/* AI Memory / Summary if closed */}
                  {meso.resumenCierre && (
                    <div className="p-4 bg-amber-50/70 border border-amber-200/80 rounded-xl flex items-start gap-3">
                      <Sparkles className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                      <div className="text-sm">
                        <span className="font-bold text-amber-900 block mb-0.5">
                          Memoria Histórica del Mesociclo (Cierre)
                        </span>
                        <p className="text-amber-800 leading-relaxed">{meso.resumenCierre}</p>
                      </div>
                    </div>
                  )}

                  {/* Specific Goals Section */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm font-bold uppercase tracking-wider text-slate-700">
                        Objetivos Específicos por Área ({meso.goals.length})
                      </h4>

                      <button
                        type="button"
                        onClick={() => setAddingGoalMesoId(addingGoalMesoId === meso.id ? null : meso.id)}
                        className="text-xs font-semibold text-orange-600 hover:text-orange-700 flex items-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Añadir Objetivo</span>
                      </button>
                    </div>

                    {/* Add Goal Inline Form */}
                    {addingGoalMesoId === meso.id && (
                      <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl mb-4 space-y-3">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div>
                            <label className="block text-xs font-semibold text-slate-600 mb-1">Área</label>
                            <select
                              value={newGoalArea}
                              onChange={(e) => setNewGoalArea(e.target.value as PlanningArea)}
                              className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-sm text-slate-800 focus:outline-none"
                            >
                              <option value="tecnica">Técnica Individual</option>
                              <option value="tactica">Táctica de Equipo</option>
                              <option value="fisica">Preparación Física</option>
                              <option value="mental">Mental / Psicológica</option>
                            </select>
                          </div>
                          <div className="sm:col-span-2">
                            <label className="block text-xs font-semibold text-slate-600 mb-1">
                              Descripción del Objetivo
                            </label>
                            <input
                              type="text"
                              value={newGoalDesc}
                              onChange={(e) => setNewGoalDesc(e.target.value)}
                              placeholder="p. ej. Mecánica y velocidad de armado de tiro tras recepción..."
                              className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-sm text-slate-800 focus:outline-none"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-600 mb-1">
                            Indicador de Éxito / Métrica
                          </label>
                          <input
                            type="text"
                            value={newGoalIndicator}
                            onChange={(e) => setNewGoalIndicator(e.target.value)}
                            placeholder="p. ej. >45% de acierto en series de tiro exterior con oposición..."
                            className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-sm text-slate-800 focus:outline-none"
                          />
                        </div>

                        <div className="flex justify-end gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => setAddingGoalMesoId(null)}
                            className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-700"
                          >
                            Cancelar
                          </button>
                          <button
                            type="button"
                            onClick={() => handleAddGoal(meso)}
                            className="px-3 py-1.5 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-xs font-semibold"
                          >
                            Guardar Objetivo
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Goals List */}
                    {meso.goals.length === 0 ? (
                      <p className="text-sm text-slate-400 italic py-2">
                        No se han definido objetivos específicos para este mesociclo. Haz clic en "Añadir Objetivo".
                      </p>
                    ) : (
                      <div className="space-y-2.5">
                        {meso.goals.map((goal) => {
                          const areaConfig = AREA_CONFIG[goal.area] || AREA_CONFIG.tecnica;
                          const statusInfo = STATUS_ICONS[goal.estado] || STATUS_ICONS.pendiente;
                          const StatusIcon = statusInfo.icon;

                          return (
                            <div
                              key={goal.id}
                              className="p-3.5 bg-white border border-slate-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-slate-300 transition"
                            >
                              <div className="space-y-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span
                                    className={`text-xs px-2.5 py-0.5 rounded-full font-semibold border ${areaConfig.badgeClass}`}
                                  >
                                    {areaConfig.label}
                                  </span>
                                  <span className="font-semibold text-slate-800 text-sm">{goal.descripcion}</span>
                                </div>
                                <p className="text-xs text-slate-500">
                                  <strong className="text-slate-600">Indicador:</strong> {goal.indicadorExito}
                                </p>
                              </div>

                              <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                                <button
                                  type="button"
                                  onClick={() => handleToggleGoalStatus(meso, goal.id)}
                                  className={`px-2.5 py-1 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition ${
                                    goal.estado === 'cumplido'
                                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                                      : goal.estado === 'no_cumplido'
                                      ? 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'
                                      : goal.estado === 'en_progreso'
                                      ? 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
                                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                                  }`}
                                  title="Haz clic para cambiar estado"
                                >
                                  <StatusIcon className={`w-3.5 h-3.5 ${statusInfo.colorClass}`} />
                                  <span>{statusInfo.label}</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleDeleteGoal(meso, goal.id)}
                                  className="p-1 text-slate-300 hover:text-red-600 rounded transition"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
