import React, { useRef } from 'react';
import {
  X,
  Printer,
  Download,
  Calendar,
  Clock,
  Dumbbell,
  Target,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Flame,
  Users,
  Shield,
  Layers,
} from 'lucide-react';
import { SavedTraining, DrillItem } from '../types';

interface TrainingReportModalProps {
  training: SavedTraining;
  onClose: () => void;
}

export const TrainingReportModal: React.FC<TrainingReportModalProps> = ({
  training,
  onClose,
}) => {
  const printRef = useRef<HTMLDivElement | null>(null);

  const handlePrint = () => {
    window.print();
  };

  const allDrills: DrillItem[] = [
    ...(training.plan?.warmup || []),
    ...(training.plan?.mainDrills || []),
    ...(training.plan?.cooldown || []),
  ];

  const totalTime =
    training.plan?.totalDuration ||
    allDrills.reduce((sum, d) => sum + (d.durationMinutes || 0), 0) ||
    training.durationMinutes;

  const review = training.plan?.reviewReport;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto print:p-0 print:bg-white print:static">
      <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[92vh] overflow-y-auto border border-slate-200 shadow-2xl space-y-6 my-auto animate-scaleUp print:max-h-none print:shadow-none print:border-none print:rounded-none">
        {/* Modal Top Action Bar (Hidden when printing) */}
        <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-sm px-6 py-4 border-b border-slate-100 flex items-center justify-between gap-4 print:hidden">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-orange-500 animate-pulse" />
            <h2 className="font-extrabold text-slate-900 text-base sm:text-lg">
              Informe Oficial de Entrenamiento
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs shadow-md shadow-orange-500/20 transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir / Guardar PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Document Body */}
        <div ref={printRef} className="px-6 sm:px-10 pb-10 space-y-8 print:p-0 print:space-y-6">
          {/* Header Banner */}
          <div className="border-b-2 border-slate-900 pb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-md bg-orange-100 text-orange-800 text-[11px] font-extrabold uppercase tracking-wider">
                  {training.section}
                </span>
                <span className="text-xs text-slate-400 font-medium">
                  {training.createdAt || new Date().toISOString().split('T')[0]}
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                {training.title}
              </h1>
              <p className="text-xs text-slate-500 font-medium">
                Generado por CoachMind - Sistema Metodológico para Entrenadores de Baloncesto
              </p>
            </div>

            {/* Quick Metrics Badge */}
            <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-200/80 shrink-0">
              <div className="text-center px-2">
                <p className="text-[10px] uppercase font-bold text-slate-400">Duración</p>
                <p className="text-lg font-extrabold text-slate-900">{totalTime} min</p>
              </div>
              <div className="w-px h-8 bg-slate-200" />
              <div className="text-center px-2">
                <p className="text-[10px] uppercase font-bold text-slate-400">Ejercicios</p>
                <p className="text-lg font-extrabold text-orange-600">{allDrills.length}</p>
              </div>
              <div className="w-px h-8 bg-slate-200" />
              <div className="text-center px-2">
                <p className="text-[10px] uppercase font-bold text-slate-400">Intensidad</p>
                <p className="text-lg font-extrabold text-blue-600">{training.intensity}</p>
              </div>
            </div>
          </div>

          {/* Session Overview Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs">
            <div>
              <span className="block text-[10px] font-bold text-slate-400 uppercase">Categoría</span>
              <span className="font-extrabold text-slate-800">{training.category} ({training.ageRange || 'Edad específica'})</span>
            </div>
            <div>
              <span className="block text-[10px] font-bold text-slate-400 uppercase">Nivel</span>
              <span className="font-extrabold text-slate-800">{training.level}</span>
            </div>
            <div>
              <span className="block text-[10px] font-bold text-slate-400 uppercase">Intensidad</span>
              <span className="font-extrabold text-slate-800">{training.intensity}</span>
            </div>
            <div>
              <span className="block text-[10px] font-bold text-slate-400 uppercase">Fecha de Sesión</span>
              <span className="font-extrabold text-slate-800">{training.createdAt || 'Hoy'}</span>
            </div>
          </div>

          {/* Objective Box */}
          <div className="p-4 rounded-2xl bg-orange-50/70 border border-orange-200 space-y-1">
            <h3 className="text-xs font-black text-orange-950 uppercase tracking-wider flex items-center gap-1.5">
              <Target className="w-3.5 h-3.5 text-orange-600" />
              Objetivo Principal del Entrenamiento
            </h3>
            <p className="text-xs text-orange-950 font-medium leading-relaxed">
              {training.objective || 'Desarrollo de fundamentos tácticos y juego en equipo.'}
            </p>
          </div>

          {/* AI Audit / Coherence Badge if available */}
          {review && (
            <div className="p-4 rounded-2xl bg-slate-900 text-white space-y-2 border border-slate-800">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  Auditoría Metodológica IA
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-amber-400/20 text-amber-300 font-extrabold text-xs">
                  {review.alignmentScore}% Coherencia
                </span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">{review.summary}</p>
            </div>
          )}

          {/* Drills Breakdown Section */}
          <div className="space-y-6">
            <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2 border-b border-slate-200 pb-2">
              <Dumbbell className="w-5 h-5 text-orange-500" />
              <span>Desglose Detallado de Ejercicios ({allDrills.length})</span>
            </h2>

            {allDrills.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                No hay ejercicios añadidos en esta sesión.
              </div>
            ) : (
              <div className="space-y-6">
                {allDrills.map((drill, index) => (
                  <div
                    key={drill.id || index}
                    className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-sm space-y-4 print:break-inside-avoid print:border-slate-300"
                  >
                    {/* Drill Header */}
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <div className="flex items-center gap-3">
                        <span className="w-7 h-7 rounded-xl bg-orange-500 text-white font-black text-xs flex items-center justify-center shadow-sm">
                          {index + 1}
                        </span>
                        <div>
                          <h3 className="font-extrabold text-slate-900 text-base">
                            {drill.title || `Ejercicio ${index + 1}`}
                          </h3>
                          <p className="text-[11px] text-slate-500">
                            {drill.playersCount || 'Toda la plantilla'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 text-xs font-bold text-orange-600 bg-orange-50 px-3 py-1 rounded-full">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{drill.durationMinutes} min</span>
                      </div>
                    </div>

                    {/* Drill Content Grid: Description vs Diagram */}
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-start">
                      {/* Description & Coaching Tips (7 cols) */}
                      <div className="md:col-span-7 space-y-3">
                        <div>
                          <h4 className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">
                            Descripción y Funcionamiento
                          </h4>
                          <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-line">
                            {drill.description || 'Sin descripción detallada.'}
                          </p>
                        </div>

                        {drill.coachingTips && drill.coachingTips.length > 0 && (
                          <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-100 space-y-1.5">
                            <h5 className="text-[10px] font-black text-blue-900 uppercase tracking-wider">
                              Claves de Corrección del Entrenador:
                            </h5>
                            <ul className="list-disc list-inside text-xs text-blue-950 space-y-0.5">
                              {drill.coachingTips.map((tip, tIdx) => (
                                <li key={tIdx}>{tip}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>

                      {/* Tactical Diagram (5 cols) */}
                      <div className="md:col-span-5 space-y-1">
                        <h4 className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                          <Layers className="w-3.5 h-3.5" />
                          <span>Pizarra Táctica</span>
                        </h4>

                        {drill.diagramDataUrl ? (
                          <div className="rounded-xl overflow-hidden border border-slate-300 bg-slate-950 aspect-[16/10] shadow-sm">
                            <img
                              src={drill.diagramDataUrl}
                              alt={`Pizarra táctica de ${drill.title}`}
                              className="w-full h-full object-contain"
                            />
                          </div>
                        ) : (
                          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 aspect-[16/10] flex flex-col items-center justify-center text-center p-3 text-slate-400">
                            <span className="text-xl mb-1">📋</span>
                            <span className="text-[11px]">Sin diagrama dibujado</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Coach Tactical Notes */}
          {training.plan?.coachNotes && training.plan.coachNotes.length > 0 && (
            <div className="p-5 rounded-2xl bg-slate-900 text-white space-y-3">
              <h3 className="text-xs font-black text-amber-400 uppercase tracking-wider flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                Notas y Recordatorios Tácticos
              </h3>
              <ul className="space-y-1.5 text-xs text-slate-300">
                {training.plan.coachNotes.map((note, nIdx) => (
                  <li key={nIdx} className="flex items-start gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-amber-400 mt-0.5 shrink-0" />
                    <span>{note}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Footer Signature */}
          <div className="pt-6 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-400">
            <span>CoachMind Baloncesto &copy; {new Date().getFullYear()}</span>
            <span>Documento Oficial de Planificación Deportiva</span>
          </div>
        </div>
      </div>
    </div>
  );
};
