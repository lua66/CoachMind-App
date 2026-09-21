import React, { useState } from 'react';
import {
  X,
  Plus,
  Trash2,
  Clock,
  Activity,
  Check,
  Calendar,
} from 'lucide-react';
import {
  SessionLog,
  SessionContentItem,
  PlanningArea,
} from '../../types/planning';

interface SessionLogEditorModalProps {
  session?: SessionLog | null;
  microcycleId: string;
  onSave: (session: SessionLog) => void;
  onClose: () => void;
}

const DEFAULT_AREAS: PlanningArea[] = ['tecnica', 'tactica', 'fisica', 'mental'];

const AREA_LABELS: Record<PlanningArea, string> = {
  tecnica: 'Técnica',
  tactica: 'Táctica',
  fisica: 'Física',
  mental: 'Mental',
};

const AREA_COLORS: Record<PlanningArea, string> = {
  tecnica: 'bg-emerald-500',
  tactica: 'bg-blue-500',
  fisica: 'bg-amber-500',
  mental: 'bg-purple-500',
};

export const SessionLogEditorModal: React.FC<SessionLogEditorModalProps> = ({
  session,
  microcycleId,
  onSave,
  onClose,
}) => {
  const [fecha, setFecha] = useState(session?.fecha || new Date().toISOString().split('T')[0]);
  const [titulo, setTitulo] = useState(session?.titulo || 'Sesión de entrenamiento en pista');
  const [notas, setNotas] = useState(session?.notas || '');
  const [rpe, setRpe] = useState<number>(session?.rpe || 7);

  const [contenidos, setContenidos] = useState<SessionContentItem[]>(
    session?.contenidos && session.contenidos.length > 0
      ? session.contenidos
      : [
          { area: 'fisica', contenido: 'Activación neuro-muscular y movilidad', duracionMin: 20 },
          { area: 'tecnica', contenido: 'Fundamentos de pase y tiro tras recepción', duracionMin: 20 },
          { area: 'tactica', contenido: 'Lectura de Pick & Roll central y 5v5', duracionMin: 50 },
        ]
  );

  const totalMinutos = contenidos.reduce((sum, item) => sum + (Number(item.duracionMin) || 0), 0);

  // Minutes & percentages per area
  const areaMinutes: Record<PlanningArea, number> = {
    tecnica: 0,
    tactica: 0,
    fisica: 0,
    mental: 0,
  };

  contenidos.forEach((item) => {
    if (areaMinutes[item.area] !== undefined) {
      areaMinutes[item.area] += Number(item.duracionMin) || 0;
    }
  });

  const handleAddContent = () => {
    setContenidos([
      ...contenidos,
      { area: 'tactica', contenido: 'Nuevo bloque de entrenamiento', duracionMin: 15 },
    ]);
  };

  const handleUpdateContent = (index: number, field: keyof SessionContentItem, val: any) => {
    const updated = [...contenidos];
    updated[index] = { ...updated[index], [field]: val };
    setContenidos(updated);
  };

  const handleRemoveContent = (index: number) => {
    setContenidos(contenidos.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newSession: SessionLog = {
      id: session?.id || `sess-${Date.now()}`,
      microcycleId,
      fecha,
      titulo: titulo.trim() || 'Sesión de entrenamiento',
      duracionMin: totalMinutos > 0 ? totalMinutos : 90,
      contenidos,
      notas,
      rpe,
    };
    onSave(newSession);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden my-8">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-orange-600" />
            <h3 className="text-lg font-bold text-slate-900">
              {session ? 'Editar Registro de Sesión' : 'Registrar Nueva Sesión'}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {/* Date & Title */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Fecha
              </label>
              <div className="relative">
                <input
                  type="date"
                  required
                  value={fecha}
                  onChange={(e) => setFecha(e.target.value)}
                  className="w-full pl-3 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-800 focus:bg-white focus:border-orange-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Título o Foco de la Sesión
              </label>
              <input
                type="text"
                required
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                placeholder="p. ej. Sesión 2: Balance defensivo y Pick & Roll"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-800 focus:bg-white focus:border-orange-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Time Distribution Visual Bar */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
              <span className="flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-orange-600" />
                <span>Tiempo Total en Pista: {totalMinutos} minutos</span>
              </span>
              <span className="text-slate-500">Desglose en tiempo real</span>
            </div>

            {/* Visual multi-colored progress bar */}
            {totalMinutos > 0 ? (
              <div className="h-3 w-full bg-slate-200 rounded-full overflow-hidden flex">
                {DEFAULT_AREAS.map((area) => {
                  const mins = areaMinutes[area];
                  if (mins <= 0) return null;
                  const pct = (mins / totalMinutos) * 100;
                  return (
                    <div
                      key={area}
                      style={{ width: `${pct}%` }}
                      className={`${AREA_COLORS[area]} h-full`}
                      title={`${AREA_LABELS[area]}: ${mins} min (${Math.round(pct)}%)`}
                    />
                  );
                })}
              </div>
            ) : (
              <div className="h-3 w-full bg-slate-200 rounded-full" />
            )}

            {/* Badges per area */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
              {DEFAULT_AREAS.map((area) => {
                const mins = areaMinutes[area];
                const pct = totalMinutos > 0 ? Math.round((mins / totalMinutos) * 100) : 0;
                return (
                  <div
                    key={area}
                    className="p-1.5 bg-white border border-slate-200 rounded-lg text-xs flex items-center justify-between"
                  >
                    <span className="text-slate-600 font-medium flex items-center gap-1">
                      <span className={`w-2 h-2 rounded-full ${AREA_COLORS[area]}`} />
                      {AREA_LABELS[area]}
                    </span>
                    <span className="font-bold text-slate-800">
                      {mins}' <span className="text-slate-400 font-normal">({pct}%)</span>
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Dynamic Content Blocks */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                Bloques de Contenido y Ejercicios ({contenidos.length})
              </label>
              <button
                type="button"
                onClick={handleAddContent}
                className="text-xs font-semibold text-orange-600 hover:text-orange-700 flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Añadir Bloque</span>
              </button>
            </div>

            <div className="space-y-2.5">
              {contenidos.map((item, idx) => (
                <div
                  key={idx}
                  className="p-3 bg-white border border-slate-200 rounded-xl flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 shadow-2xs"
                >
                  {/* Area Selector */}
                  <div className="sm:w-36 shrink-0">
                    <select
                      value={item.area}
                      onChange={(e) => handleUpdateContent(idx, 'area', e.target.value as PlanningArea)}
                      className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none"
                    >
                      <option value="tecnica">Técnica</option>
                      <option value="tactica">Táctica</option>
                      <option value="fisica">Física</option>
                      <option value="mental">Mental</option>
                    </select>
                  </div>

                  {/* Description / Drill */}
                  <div className="flex-1">
                    <input
                      type="text"
                      required
                      value={item.contenido}
                      onChange={(e) => handleUpdateContent(idx, 'contenido', e.target.value)}
                      placeholder="Descripción del ejercicio o tarea..."
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-800 focus:bg-white focus:outline-none"
                    />
                  </div>

                  {/* Minutes */}
                  <div className="w-24 shrink-0 flex items-center gap-1">
                    <input
                      type="number"
                      min={1}
                      max={180}
                      required
                      value={item.duracionMin}
                      onChange={(e) => handleUpdateContent(idx, 'duracionMin', parseInt(e.target.value, 10) || 0)}
                      className="w-16 px-2 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-center font-bold text-slate-800 focus:bg-white focus:outline-none"
                    />
                    <span className="text-xs text-slate-500 font-medium">min</span>
                  </div>

                  {/* Delete button */}
                  <button
                    type="button"
                    onClick={() => handleRemoveContent(idx)}
                    className="p-1.5 text-slate-300 hover:text-red-600 transition shrink-0 self-end sm:self-center"
                    title="Eliminar bloque"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* RPE & Notes */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-100">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                RPE / Esfuerzo (1-10)
              </label>
              <select
                value={rpe}
                onChange={(e) => setRpe(parseInt(e.target.value, 10) || 7)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-800 focus:bg-white focus:outline-none"
              >
                <option value={4}>4 - Muy Suave / Recuperación</option>
                <option value={5}>5 - Moderado</option>
                <option value={6}>6 - Medio-Alto</option>
                <option value={7}>7 - Alta Intensidad habitual</option>
                <option value={8}>8 - Muy Alta Intensidad</option>
                <option value={9}>9 - Máximo esfuerzo</option>
                <option value={10}>10 - Extenuante / Límite</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Observaciones del Entrenador
              </label>
              <input
                type="text"
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
                placeholder="p. ej. Buena intensidad en el 5v5, fallos en tiro tras corte..."
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-800 focus:bg-white focus:outline-none"
              />
            </div>
          </div>

          {/* Modal Footer */}
          <div className="flex justify-end gap-2 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-sm font-semibold shadow-sm transition flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>Guardar Sesión</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
