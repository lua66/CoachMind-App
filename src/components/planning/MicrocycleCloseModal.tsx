import React, { useState, useEffect } from 'react';
import {
  X,
  Sparkles,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ArrowRight,
  TrendingDown,
  TrendingUp,
  Brain,
  Save,
  Check,
  RefreshCw,
  Clock,
  Send,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { CoachPhilosophy } from '../../types';
import {
  Microcycle,
  Mesocycle,
  SeasonGoal,
  MicrocycleEvaluation,
  ImbalanceDetectionResult,
} from '../../types/planning';
import { detectImbalances } from '../../utils/imbalanceDetector';
import { AreaBalanceChart } from './AreaBalanceChart';

interface MicrocycleCloseModalProps {
  microcycle: Microcycle;
  mesocycle: Mesocycle;
  seasonGoal: SeasonGoal;
  historicalMicrocycles: Microcycle[];
  coachPhilosophy?: CoachPhilosophy | null;
  onSaveEvaluationAndAdvance: (
    evaluation: MicrocycleEvaluation,
    nextMicroDraft?: Partial<Microcycle>
  ) => void;
  onClose: () => void;
}

export const MicrocycleCloseModal: React.FC<MicrocycleCloseModalProps> = ({
  microcycle,
  mesocycle,
  seasonGoal,
  historicalMicrocycles,
  coachPhilosophy,
  onSaveEvaluationAndAdvance,
  onClose,
}) => {
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);

  // Phase 1 - Goal Fulfillment Checklist
  const [fulfilledGoalIds, setFulfilledGoalIds] = useState<string[]>(
    microcycle.evaluation?.objetivosCumplidos ||
      mesocycle.goals.filter((g) => g.estado === 'cumplido').map((g) => g.id)
  );
  const [unfulfilledGoalIds, setUnfulfilledGoalIds] = useState<string[]>(
    microcycle.evaluation?.objetivosNoCumplidos ||
      mesocycle.goals.filter((g) => g.estado === 'no_cumplido').map((g) => g.id)
  );

  // Coach Reflection Questions
  const [percepcion, setPercepcion] = useState<number>(microcycle.evaluation?.percepcionEntrenador || 4);
  const [comentarioLibre, setComentarioLibre] = useState<string>(
    microcycle.evaluation?.comentarioLibre ||
      'En situaciones de partido fallamos tiros liberados y finalizaciones cómodas. La táctica funcionó para generar tiros abiertos, pero la ejecución técnica individual no estuvo al nivel deseado.'
  );
  const [incidencias, setIncidencias] = useState<string>(
    (microcycle.evaluation?.incidencias || ['Bajo porcentaje en tiros exteriores', 'Pérdidas no forzadas']).join(', ')
  );

  // Imbalance Detection Data
  const [imbalanceResult, setImbalanceResult] = useState<ImbalanceDetectionResult>(() =>
    detectImbalances(mesocycle.goals, microcycle.sessions || [], historicalMicrocycles, unfulfilledGoalIds)
  );

  // AI Response
  const [aiReport, setAiReport] = useState<string>(microcycle.evaluation?.resumenIA || '');
  const [isLoadingAi, setIsLoadingAi] = useState<boolean>(false);

  // Re-run detector whenever unfulfilled goals change
  useEffect(() => {
    const res = detectImbalances(
      mesocycle.goals,
      microcycle.sessions || [],
      historicalMicrocycles,
      unfulfilledGoalIds
    );
    setImbalanceResult(res);
  }, [unfulfilledGoalIds, mesocycle.goals, microcycle.sessions, historicalMicrocycles]);

  const toggleGoalFulfillment = (goalId: string) => {
    if (fulfilledGoalIds.includes(goalId)) {
      setFulfilledGoalIds(fulfilledGoalIds.filter((id) => id !== goalId));
      if (!unfulfilledGoalIds.includes(goalId)) {
        setUnfulfilledGoalIds([...unfulfilledGoalIds, goalId]);
      }
    } else {
      setUnfulfilledGoalIds(unfulfilledGoalIds.filter((id) => id !== goalId));
      setFulfilledGoalIds([...fulfilledGoalIds, goalId]);
    }
  };

  const handleRequestAiEvaluation = async () => {
    setIsLoadingAi(true);
    setCurrentStep(2);

    try {
      const response = await fetch('/api/planning/ai-close-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phase: 3,
          seasonGoal,
          mesocycle,
          microcycle,
          coachPhilosophy,
          userAnswers: {
            percepcion,
            comentario: comentarioLibre,
            incidencias,
          },
          imbalanceData: imbalanceResult,
        }),
      });

      const data = await response.json();
      if (!response.ok && data?.message) {
        setAiReport(`⚠️ **Bloqueo Metodológico:**\n\n${data.message}`);
      } else if (data && data.text) {
        setAiReport(data.text);
      }
    } catch (err) {
      console.warn('Fallback to local AI response generator:', err);
    } finally {
      setIsLoadingAi(false);
    }
  };

  const handleFinalize = () => {
    const evaluation: MicrocycleEvaluation = {
      id: `eval-micro-${microcycle.semana}-${Date.now()}`,
      microcycleId: microcycle.id,
      fecha: new Date().toISOString().split('T')[0],
      objetivosCumplidos: fulfilledGoalIds,
      objetivosNoCumplidos: unfulfilledGoalIds,
      comentarioLibre,
      percepcionEntrenador: percepcion,
      incidencias: incidencias.split(',').map((s) => s.trim()).filter(Boolean),
      resumenIA: aiReport,
      propuestaSiguienteMicro: `Microciclo Semana ${microcycle.semana + 1}: Refuerzo de técnica de tiro y ajuste de cargas.`,
    };

    // Auto draft next microcycle
    const nextMicroDraft: Partial<Microcycle> = {
      semana: microcycle.semana + 1,
      objetivoSemanal: `Refuerzo de técnica individual y continuidad del sistema (Micro #${microcycle.semana + 1})`,
      cargasPlanificadas: {
        sesiones: 4,
        intensidad: 'Alta',
        volumenMinutos: 360,
      },
      goalIds: [...unfulfilledGoalIds, ...(mesocycle.goals[0] ? [mesocycle.goals[0].id] : [])],
      estado: 'planificado',
      sessions: [],
    };

    onSaveEvaluationAndAdvance(evaluation, nextMicroDraft);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-3xl w-full shadow-2xl border border-slate-200 overflow-hidden my-6">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-orange-600 via-amber-600 to-orange-700 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
              <Brain className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold">Cierre del Microciclo #{microcycle.semana} con IA</h3>
              <p className="text-xs text-orange-100">{mesocycle.nombre} • Análisis Metodológico</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Indicator */}
        <div className="px-6 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs font-semibold text-slate-600">
          <div className="flex items-center gap-2">
            <span
              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                currentStep === 1 ? 'bg-orange-600 text-white' : 'bg-emerald-600 text-white'
              }`}
            >
              1
            </span>
            <span className={currentStep === 1 ? 'text-orange-600 font-bold' : 'text-slate-600'}>
              Checklist & Preguntas
            </span>
          </div>

          <ArrowRight className="w-4 h-4 text-slate-300" />

          <div className="flex items-center gap-2">
            <span
              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                currentStep === 2 ? 'bg-orange-600 text-white' : 'bg-slate-200 text-slate-600'
              }`}
            >
              2
            </span>
            <span className={currentStep === 2 ? 'text-orange-600 font-bold' : 'text-slate-600'}>
              Desequilibrios & Hipótesis IA
            </span>
          </div>

          <ArrowRight className="w-4 h-4 text-slate-300" />

          <div className="flex items-center gap-2">
            <span
              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                currentStep === 3 ? 'bg-orange-600 text-white' : 'bg-slate-200 text-slate-600'
              }`}
            >
              3
            </span>
            <span className={currentStep === 3 ? 'text-orange-600 font-bold' : 'text-slate-600'}>
              Propuesta Siguiente Micro
            </span>
          </div>
        </div>

        {/* Body Content */}
        <div className="p-6 max-h-[70vh] overflow-y-auto space-y-6">
          {currentStep === 1 ? (
            // ================= STEP 1: CHECKLIST & COACH REFLECTION =================
            <div className="space-y-6">
              {/* Linked Goals Checklist */}
              <div>
                <h4 className="text-sm font-bold uppercase tracking-wider text-slate-700 mb-2.5">
                  1. Balance de Objetivos del Microciclo
                </h4>
                <p className="text-xs text-slate-500 mb-3">
                  Marca cuáles consideras que se han cumplido tras los entrenamientos y partidos de esta semana.
                </p>

                <div className="space-y-2.5">
                  {mesocycle.goals.map((goal) => {
                    const isFulfilled = fulfilledGoalIds.includes(goal.id);

                    return (
                      <div
                        key={goal.id}
                        onClick={() => toggleGoalFulfillment(goal.id)}
                        className={`p-3.5 rounded-xl border cursor-pointer transition flex items-center justify-between gap-3 ${
                          isFulfilled
                            ? 'bg-emerald-50/70 border-emerald-300'
                            : 'bg-red-50/70 border-red-300'
                        }`}
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold uppercase px-2 py-0.5 rounded bg-white/80 text-slate-700 border border-slate-200">
                              {goal.area}
                            </span>
                            <span className="text-sm font-semibold text-slate-900">{goal.descripcion}</span>
                          </div>
                          <p className="text-xs text-slate-500 pl-1">Indicador: {goal.indicadorExito}</p>
                        </div>

                        <div className="shrink-0 flex items-center gap-1.5 font-bold text-xs">
                          {isFulfilled ? (
                            <span className="text-emerald-700 flex items-center gap-1">
                              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                              Cumplido
                            </span>
                          ) : (
                            <span className="text-red-700 flex items-center gap-1">
                              <XCircle className="w-5 h-5 text-red-600" />
                              No cumplido
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 3 Reflection Questions */}
              <div className="space-y-4 pt-4 border-t border-slate-100">
                <h4 className="text-sm font-bold uppercase tracking-wider text-slate-700">
                  2. Reflexión Metodológica del Entrenador
                </h4>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Pregunta 1: Percepción General del Rendimiento (1 a 5 estrellas)
                  </label>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((val) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setPercepcion(val)}
                        className={`px-3.5 py-1.5 rounded-lg border text-sm font-bold transition ${
                          percepcion === val
                            ? 'bg-orange-600 text-white border-orange-600 shadow-xs'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {val} {val === 5 ? '★ Excelente' : val === 4 ? '★ Muy Bueno' : val === 3 ? '★ Aceptable' : '★ Bajo'}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Pregunta 2: ¿Por qué crees que los objetivos marcados como no cumplidos no llegaron al nivel esperado?
                  </label>
                  <textarea
                    rows={2}
                    value={comentarioLibre}
                    onChange={(e) => setComentarioLibre(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-800 focus:bg-white focus:outline-none"
                    placeholder="Escribe tus observaciones sinceras..."
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Pregunta 3: Incidencias, ausencias o factores imprevistos
                  </label>
                  <input
                    type="text"
                    value={incidencias}
                    onChange={(e) => setIncidencias(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-800 focus:bg-white focus:outline-none"
                    placeholder="p. ej. Bajas por lesión, poco acierto exterior..."
                  />
                </div>
              </div>
            </div>
          ) : (
            // ================= STEP 2 & 3: IMBALANCE DASHBOARD & AI PROPOSAL =================
            <div className="space-y-6">
              {/* Imbalance Detector Visual Chart */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-orange-600" />
                    <span>Radiografía Empírica de Desequilibrios en Pista</span>
                  </h4>
                  <span className="text-xs text-slate-500 font-semibold">
                    Total: {imbalanceResult.totalRealMinutes} min en {(microcycle.sessions || []).length} sesiones
                  </span>
                </div>

                <AreaBalanceChart byArea={imbalanceResult.byArea} height={200} />
              </div>

              {/* Area Deltas & Status Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {Object.values(imbalanceResult.byArea).map((stat) => (
                  <div
                    key={stat.area}
                    className={`p-3 rounded-xl border text-xs ${
                      stat.status === 'descuidada'
                        ? 'bg-red-50/80 border-red-200 text-red-900'
                        : stat.status === 'sobre_trabajada'
                        ? 'bg-amber-50/80 border-amber-200 text-amber-900'
                        : 'bg-emerald-50/80 border-emerald-200 text-emerald-900'
                    }`}
                  >
                    <div className="flex items-center justify-between font-bold uppercase mb-1">
                      <span>{stat.area}</span>
                      {stat.status === 'descuidada' && <TrendingDown className="w-3.5 h-3.5 text-red-600" />}
                      {stat.status === 'sobre_trabajada' && <TrendingUp className="w-3.5 h-3.5 text-amber-600" />}
                    </div>
                    <div className="text-base font-extrabold">{Math.round(stat.realPct * 100)}% real</div>
                    <div className="text-[11px] opacity-80">
                      {stat.realMinutes} min (Delta: {stat.delta > 0 ? `+${Math.round(stat.delta * 100)}` : Math.round(stat.delta * 100)}%)
                    </div>
                  </div>
                ))}
              </div>

              {/* Detector Correlations / Hypotheses */}
              {imbalanceResult.correlations.length > 0 && (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-2">
                  <h5 className="text-xs font-bold uppercase tracking-wider text-amber-900 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                    <span>Correlaciones Automáticas Detectadas por el Algoritmo</span>
                  </h5>
                  <ul className="space-y-1.5 text-xs text-amber-800">
                    {imbalanceResult.correlations.map((c, i) => (
                      <li key={i} className="flex items-start gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-600 mt-1.5 shrink-0" />
                        <span>
                          <strong>[{c.area.toUpperCase()}]</strong> {c.suspectedCause} <em>({c.evidence})</em>
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* AI Structured Report & Next Micro Proposal */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
                    <Brain className="w-4 h-4 text-orange-600" />
                    <span>Dictamen y Propuesta Metodológica de CoachMind IA</span>
                  </h4>
                  {isLoadingAi && (
                    <span className="text-xs text-orange-600 font-medium flex items-center gap-1">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      Analizando sesiones...
                    </span>
                  )}
                </div>

                <div className="p-5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm leading-relaxed prose prose-sm max-w-none prose-orange">
                  {isLoadingAi ? (
                    <div className="py-8 flex flex-col items-center justify-center text-center text-slate-500 space-y-2">
                      <RefreshCw className="w-6 h-6 animate-spin text-orange-600" />
                      <p className="text-xs font-semibold">Generando hipótesis causales y ajustando la carga para el siguiente microciclo...</p>
                    </div>
                  ) : (
                    <ReactMarkdown>{aiReport}</ReactMarkdown>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Controls */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          {currentStep === 1 ? (
            <>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-200 rounded-lg transition"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={handleRequestAiEvaluation}
                className="px-5 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-sm font-semibold shadow-sm transition flex items-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                <span>Analizar con IA y Ver Desequilibrios</span>
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-200 rounded-lg transition"
              >
                Volver a Modificar
              </button>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleFinalize}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold shadow-sm transition flex items-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  <span>Guardar Evaluación y Crear Siguiente Microciclo</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
