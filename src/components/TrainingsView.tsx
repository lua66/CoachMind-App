import React, { useState } from 'react';
import {
  Calendar,
  Plus,
  Flame,
  Users,
  ClipboardList,
  ChevronDown,
  ChevronUp,
  Eye,
  Trash2,
  Clock,
  Dumbbell,
  Printer,
  Download,
  FileText,
  Loader2,
} from 'lucide-react';
import { SavedTraining, TrainingSection, ViewMode, UserProfile } from '../types';
import { TrainingReportModal } from './TrainingReportModal';
import { exportTrainingSessionToPdf } from '../utils/pdfExport';

interface TrainingsViewProps {
  trainings: SavedTraining[];
  onNavigate: (view: ViewMode) => void;
  onDeleteTraining: (id: string) => void;
  userProfile?: UserProfile | null;
  onOpenTrialModal?: (mode?: 'general_action' | 'ficha_entrenador') => void;
}

export const TrainingsView: React.FC<TrainingsViewProps> = ({
  trainings,
  onNavigate,
  onDeleteTraining,
  userProfile,
  onOpenTrialModal,
}) => {
  const [expandedSection, setExpandedSection] = useState<TrainingSection | null>(null);
  const [selectedTraining, setSelectedTraining] = useState<SavedTraining | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const handleDownloadPdf = async (training: SavedTraining) => {
    setDownloadingId(training.id);
    try {
      await exportTrainingSessionToPdf(training);
    } catch (err) {
      console.error('Error downloading training PDF:', err);
    } finally {
      setDownloadingId(null);
    }
  };

  const sections: {
    id: TrainingSection;
    title: string;
    subtitle: string;
    icon: React.ElementType;
    iconBg: string;
  }[] = [
    {
      id: 'Ejercicios de pretemporada',
      title: 'Ejercicios de pretemporada',
      subtitle: 'Preparación física y base',
      icon: Flame,
      iconBg: 'bg-orange-500 text-white shadow-orange-500/20',
    },
    {
      id: 'Técnica individual y colectiva',
      title: 'Técnica individual y colectiva',
      subtitle: 'Fundamentos individuales y de equipo',
      icon: Users,
      iconBg: 'bg-blue-600 text-white shadow-blue-600/20',
    },
    {
      id: 'Táctica de equipo',
      title: 'Táctica de equipo',
      subtitle: 'Sistemas, defensas y estrategia',
      icon: ClipboardList,
      iconBg: 'bg-indigo-600 text-white shadow-indigo-600/20',
    },
    {
      id: 'Otros entrenamientos',
      title: 'Otros entrenamientos',
      subtitle: 'Guardados sin clasificar',
      icon: Calendar,
      iconBg: 'bg-slate-700 text-white shadow-slate-700/20',
    },
  ];

  const toggleSection = (secId: TrainingSection) => {
    setExpandedSection((prev) => (prev === secId ? null : secId));
  };

  return (
    <div className="space-y-6 animate-fadeIn max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-600/20 shrink-0">
            <Calendar className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              Entrenamientos
            </h1>
            <p className="text-xs text-slate-500">Tus sesiones guardadas y clasificadas</p>
          </div>
        </div>

        <button
          onClick={() => {
            if (!userProfile) {
              if (onOpenTrialModal) onOpenTrialModal('general_action');
              return;
            }
            onNavigate('create-training');
          }}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md shadow-blue-600/30 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Nuevo</span>
        </button>
      </div>

      {/* Sections Accordion */}
      <div className="space-y-4">
        {sections.map((sec) => {
          const Icon = sec.icon;
          const sectionTrainings = trainings.filter((t) => t.section === sec.id);
          const isExpanded = expandedSection === sec.id;

          return (
            <div
              key={sec.id}
              className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden transition-all duration-200"
            >
              {/* Section Accordion Header */}
              <div
                onClick={() => toggleSection(sec.id)}
                className="p-5 flex items-center justify-between cursor-pointer hover:bg-slate-50/80 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-md ${sec.iconBg}`}
                  >
                    <Icon className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-base">{sec.title}</h3>
                    <p className="text-xs text-slate-500">{sec.subtitle}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-600 text-xs font-bold flex items-center justify-center">
                    {sectionTrainings.length}
                  </span>
                  {isExpanded ? (
                    <ChevronUp className="w-5 h-5 text-slate-400" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-slate-400" />
                  )}
                </div>
              </div>

              {/* Section Content */}
              {isExpanded && (
                <div className="p-5 pt-0 border-t border-slate-100 space-y-3 bg-slate-50/50">
                  {sectionTrainings.length === 0 ? (
                    <div className="py-8 text-center text-xs text-slate-400">
                      No hay sesiones guardadas en esta categoría.
                    </div>
                  ) : (
                    sectionTrainings.map((item) => (
                      <div
                        key={item.id}
                        className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow transition-all space-y-3"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="space-y-1.5">
                            <h4 className="font-extrabold text-slate-900 text-lg capitalize">
                              {item.title}
                            </h4>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-xs font-medium">
                                {item.category}
                              </span>
                              <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-xs font-medium">
                                {item.level}
                              </span>
                              <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-xs font-medium">
                                {item.intensity}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleDownloadPdf(item)}
                              disabled={downloadingId === item.id}
                              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs transition-all shadow-sm cursor-pointer disabled:opacity-60"
                              title="Descargar archivo PDF completo"
                            >
                              {downloadingId === item.id ? (
                                <>
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  <span>Descargando...</span>
                                </>
                              ) : (
                                <>
                                  <Download className="w-3.5 h-3.5" />
                                  <span>Descargar PDF</span>
                                </>
                              )}
                            </button>
                            <button
                              onClick={() => setSelectedTraining(item)}
                              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition-all shadow-sm cursor-pointer"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>Ver</span>
                            </button>
                            <button
                              onClick={() => {
                                if (!userProfile) {
                                  if (onOpenTrialModal) onOpenTrialModal('general_action');
                                  return;
                                }
                                onDeleteTraining(item.id);
                              }}
                              className="p-2 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                              title="Eliminar entrenamiento"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                          ¡Hola! Soy **CoachMind**. {item.objective}
                        </p>

                        <div className="flex items-center gap-4 text-xs text-slate-400 pt-1">
                          <div className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            <span>{item.durationMinutes} min</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Dumbbell className="w-3.5 h-3.5 text-slate-400" />
                            <span>{item.exerciseCount || 12} ejercicios</span>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Drill Detail & Official Report Modal */}
      {selectedTraining && (
        <TrainingReportModal
          training={selectedTraining}
          onClose={() => setSelectedTraining(null)}
        />
      )}
    </div>
  );
};
