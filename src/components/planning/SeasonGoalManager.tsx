import React, { useState, useEffect } from 'react';
import {
  Trophy,
  Target,
  GraduationCap,
  Flame,
  Calendar,
  Edit2,
  Check,
  X,
  Plus,
  Trash2,
  Sparkles,
  Eraser,
  FolderPlus,
  Save,
} from 'lucide-react';
import { CoachPhilosophy } from '../../types';
import { SeasonGoal } from '../../types/planning';

interface SeasonGoalManagerProps {
  season: SeasonGoal;
  onSave: (updated: SeasonGoal) => void;
  isPhilosophyComplete?: boolean;
  missingCriticalFields?: string[];
  currentPhilosophy?: CoachPhilosophy | null;
  onNavigateToPhilosophy?: () => void;
  onUpdateSnapshot?: () => void;
}

export const SeasonGoalManager: React.FC<SeasonGoalManagerProps> = ({
  season,
  onSave,
  isPhilosophyComplete = true,
  missingCriticalFields = [],
  currentPhilosophy,
  onNavigateToPhilosophy,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<SeasonGoal>({ ...season });
  const [newSportGoal, setNewSportGoal] = useState('');
  const [newFormGoal, setNewFormGoal] = useState('');

  // Sync formData with season prop updates
  useEffect(() => {
    setFormData({ ...season });
  }, [season]);

  const isEmptySeason =
    !season.objetivoPrincipal?.trim() &&
    !season.estiloDeJuego?.trim() &&
    (!season.objetivosDeportivos || season.objetivosDeportivos.length === 0) &&
    (!season.objetivosFormativos || season.objetivosFormativos.length === 0) &&
    !season.temporada?.trim();

  const handleSave = () => {
    onSave(formData);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setFormData({ ...season });
    setIsEditing(false);
  };

  const handleClearAll = () => {
    if (window.confirm('¿Deseas vaciar todos los campos de este panel?')) {
      const cleared: SeasonGoal = {
        ...formData,
        temporada: '',
        categoria: '',
        objetivoPrincipal: '',
        estiloDeJuego: '',
        objetivosDeportivos: [],
        objetivosFormativos: [],
        fechaInicio: '',
        fechaFin: '',
      };
      setFormData(cleared);
      onSave(cleared);
      setIsEditing(false);
    }
  };

  const addSportGoal = () => {
    if (newSportGoal.trim()) {
      setFormData({
        ...formData,
        objetivosDeportivos: [...(formData.objetivosDeportivos || []), newSportGoal.trim()],
      });
      setNewSportGoal('');
    }
  };

  const removeSportGoal = (index: number) => {
    setFormData({
      ...formData,
      objetivosDeportivos: (formData.objetivosDeportivos || []).filter((_, i) => i !== index),
    });
  };

  const addFormGoal = () => {
    if (newFormGoal.trim()) {
      setFormData({
        ...formData,
        objetivosFormativos: [...(formData.objetivosFormativos || []), newFormGoal.trim()],
      });
      setNewFormGoal('');
    }
  };

  const removeFormGoal = (index: number) => {
    setFormData({
      ...formData,
      objetivosFormativos: (formData.objetivosFormativos || []).filter((_, i) => i !== index),
    });
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-orange-600 via-amber-600 to-orange-700 rounded-2xl p-6 text-white shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-orange-100 text-sm font-medium mb-1">
            <Trophy className="w-4 h-4" />
            <span>Objetivos Globales de la Temporada</span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight">
            {formData.temporada
              ? `Temporada ${formData.temporada} ${formData.categoria ? `• ${formData.categoria}` : ''}`
              : 'Objetivos de Temporada'}
          </h2>
          <p className="text-orange-50 text-sm mt-1 max-w-2xl opacity-90">
            Marco estratégico rector para todos los mesociclos, microciclos y sesiones de entrenamiento.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {isEditing ? (
            <>
              <button
                type="button"
                onClick={handleCancel}
                className="px-3.5 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg text-sm font-medium transition flex items-center gap-1.5 cursor-pointer"
              >
                <X className="w-4 h-4" />
                <span>Cancelar</span>
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="px-4 py-2 bg-white text-orange-700 hover:bg-orange-50 rounded-lg text-sm font-bold shadow-sm transition flex items-center gap-1.5 cursor-pointer"
              >
                <Check className="w-4 h-4 text-orange-600" />
                <span>Guardar Objetivos</span>
              </button>
            </>
          ) : (
            <>
              {!isEmptySeason && (
                <button
                  type="button"
                  onClick={handleClearAll}
                  className="px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm font-medium transition flex items-center gap-1.5 cursor-pointer"
                  title="Vaciar todos los campos del panel"
                >
                  <Eraser className="w-4 h-4" />
                  <span>Vaciar Panel</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="px-5 py-2.5 bg-white text-orange-700 hover:bg-orange-50 rounded-xl text-sm font-bold shadow-sm transition flex items-center gap-2 cursor-pointer"
              >
                <Edit2 className="w-4 h-4" />
                <span>{isEmptySeason ? 'Crear Objetivos' : 'Editar Objetivos'}</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Main Content: Edit Mode OR View Mode (Empty or Populated) */}
      {isEditing ? (
        // EDIT MODE
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="text-base font-bold text-slate-900">
              Formulario de Objetivos de la Temporada
            </h3>
            <button
              type="button"
              onClick={() => {
                setFormData({
                  ...formData,
                  temporada: '',
                  categoria: '',
                  objetivoPrincipal: '',
                  estiloDeJuego: '',
                  objetivosDeportivos: [],
                  objetivosFormativos: [],
                  fechaInicio: '',
                  fechaFin: '',
                });
              }}
              className="text-xs text-rose-600 hover:text-rose-800 font-semibold flex items-center gap-1 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Limpiar todo</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Temporada (p. ej. 2025-2026)
              </label>
              <input
                type="text"
                value={formData.temporada}
                onChange={(e) => setFormData({ ...formData, temporada: e.target.value })}
                placeholder="2025-2026"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-800 focus:bg-white focus:border-orange-500 focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Categoría (p. ej. Senior, Junior, Cadete)
              </label>
              <input
                type="text"
                value={formData.categoria}
                onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
                placeholder="Senior A"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-800 focus:bg-white focus:border-orange-500 focus:outline-hidden"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              Objetivo Principal de la Temporada
            </label>
            <textarea
              rows={2}
              value={formData.objetivoPrincipal}
              onChange={(e) => setFormData({ ...formData, objetivoPrincipal: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-800 focus:bg-white focus:border-orange-500 focus:outline-hidden"
              placeholder="Define la meta o reto principal de tu equipo para la temporada..."
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              Estilo de Juego Propuesto
            </label>
            <textarea
              rows={2}
              value={formData.estiloDeJuego}
              onChange={(e) => setFormData({ ...formData, estiloDeJuego: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-800 focus:bg-white focus:border-orange-500 focus:outline-hidden"
              placeholder="Describe el estilo e identidad de juego que identificará al equipo..."
            />
          </div>

          {/* Objetivos Deportivos */}
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
              Objetivos Deportivos / Competitivos
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={newSportGoal}
                onChange={(e) => setNewSportGoal(e.target.value)}
                placeholder="Añadir objetivo deportivo..."
                className="flex-1 px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-800 focus:bg-white focus:border-orange-500 focus:outline-hidden"
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addSportGoal())}
              />
              <button
                type="button"
                onClick={addSportGoal}
                className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-sm font-semibold transition flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Añadir</span>
              </button>
            </div>
            <div className="space-y-2">
              {(formData.objetivosDeportivos || []).map((goal, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800"
                >
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    {goal}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeSportGoal(idx)}
                    className="text-slate-400 hover:text-red-600 transition p-1 cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Objetivos Formativos */}
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
              Objetivos Formativos / Desarrollo
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={newFormGoal}
                onChange={(e) => setNewFormGoal(e.target.value)}
                placeholder="Añadir objetivo formativo..."
                className="flex-1 px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-800 focus:bg-white focus:border-orange-500 focus:outline-hidden"
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addFormGoal())}
              />
              <button
                type="button"
                onClick={addFormGoal}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-semibold transition flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Añadir</span>
              </button>
            </div>
            <div className="space-y-2">
              {(formData.objetivosFormativos || []).map((goal, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800"
                >
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-purple-500" />
                    {goal}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeFormGoal(idx)}
                    className="text-slate-400 hover:text-red-600 transition p-1 cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Fecha Inicio
              </label>
              <input
                type="date"
                value={formData.fechaInicio}
                onChange={(e) => setFormData({ ...formData, fechaInicio: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-800 focus:bg-white focus:border-orange-500 focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Fecha Fin
              </label>
              <input
                type="date"
                value={formData.fechaFin}
                onChange={(e) => setFormData({ ...formData, fechaFin: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-800 focus:bg-white focus:border-orange-500 focus:outline-hidden"
              />
            </div>
          </div>

          {/* Form Actions Footer */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={handleCancel}
              className="px-4 py-2.5 border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-xl text-sm font-semibold transition flex items-center gap-1.5 cursor-pointer"
            >
              <X className="w-4 h-4" />
              <span>Cancelar</span>
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-6 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-sm font-bold shadow-md transition flex items-center gap-2 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>Guardar Objetivos</span>
            </button>
          </div>
        </div>
      ) : isEmptySeason ? (
        // CLEAN EMPTY STATE
        <div className="bg-white border-2 border-dashed border-slate-200 rounded-2xl p-10 text-center space-y-4 shadow-2xs">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-orange-50 border border-orange-100 text-orange-600 flex items-center justify-center">
            <Target className="w-7 h-7" />
          </div>
          <div className="max-w-md mx-auto space-y-1.5">
            <h3 className="text-lg font-bold text-slate-900">
              Panel de Objetivos Vacío
            </h3>
            <p className="text-sm text-slate-500">
              No hay objetivos de temporada configurados todavía. Puedes definir el objetivo principal, estilo de juego, metas deportivas y formativas desde cero.
            </p>
          </div>
          <div>
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="px-5 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-sm font-bold transition inline-flex items-center gap-2 shadow-sm cursor-pointer"
            >
              <FolderPlus className="w-4 h-4" />
              <span>Crear Objetivos</span>
            </button>
          </div>
        </div>
      ) : (
        // VIEW MODE (POPULATED)
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Main Goal Card */}
          <div className="md:col-span-2 bg-white border border-slate-200 rounded-2xl p-6 shadow-xs hover:border-slate-300 transition">
            <div className="flex items-center gap-2.5 mb-2.5">
              <div className="w-8 h-8 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center font-bold">
                <Target className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-slate-900 text-base">Objetivo Principal de Temporada</h3>
            </div>
            <p className="text-slate-700 text-base font-medium leading-relaxed pl-10">
              {formData.objetivoPrincipal ? `"${formData.objetivoPrincipal}"` : <span className="text-slate-400 italic">No especificado</span>}
            </p>
          </div>

          {/* Style of Play Card */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs hover:border-slate-300 transition">
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center">
                <Flame className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-slate-900 text-base">Estilo de Juego e Identidad</h3>
            </div>
            <p className="text-slate-600 text-sm leading-relaxed pl-10">
              {formData.estiloDeJuego || <span className="text-slate-400 italic">No definido aún</span>}
            </p>
          </div>

          {/* Dates & Duration Card */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs hover:border-slate-300 transition">
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
                <Calendar className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-slate-900 text-base">Periodo y Calendario</h3>
            </div>
            <div className="pl-10 space-y-1.5 text-sm">
              <div className="flex items-center justify-between text-slate-600">
                <span>Inicio de temporada:</span>
                <span className="font-semibold text-slate-800">{formData.fechaInicio || 'Por definir'}</span>
              </div>
              <div className="flex items-center justify-between text-slate-600">
                <span>Cierre previsto:</span>
                <span className="font-semibold text-slate-800">{formData.fechaFin || 'Por definir'}</span>
              </div>
            </div>
          </div>

          {/* Sporting Goals */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs hover:border-slate-300 transition">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center">
                <Trophy className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-slate-900 text-base">Objetivos Deportivos</h3>
            </div>
            {formData.objetivosDeportivos && formData.objetivosDeportivos.length > 0 ? (
              <ul className="space-y-2.5 pl-2">
                {formData.objetivosDeportivos.map((goal, idx) => (
                  <li key={idx} className="flex items-start gap-2.5 text-sm text-slate-700">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                    <span>{goal}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-slate-400 italic pl-10">Sin objetivos deportivos registrados</p>
            )}
          </div>

          {/* Formative Goals */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs hover:border-slate-300 transition">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center">
                <GraduationCap className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-slate-900 text-base">Objetivos Formativos</h3>
            </div>
            {formData.objetivosFormativos && formData.objetivosFormativos.length > 0 ? (
              <ul className="space-y-2.5 pl-2">
                {formData.objetivosFormativos.map((goal, idx) => (
                  <li key={idx} className="flex items-start gap-2.5 text-sm text-slate-700">
                    <span className="w-2 h-2 rounded-full bg-purple-500 mt-1.5 shrink-0" />
                    <span>{goal}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-slate-400 italic pl-10">Sin objetivos formativos registrados</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
