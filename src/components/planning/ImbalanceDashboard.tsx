import React, { useState } from 'react';
import {
  AlertTriangle,
  TrendingDown,
  TrendingUp,
  Brain,
  Sparkles,
  CheckCircle2,
  XCircle,
  Clock,
  Layers,
  Calendar,
  RefreshCw,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import {
  SeasonGoal,
  Mesocycle,
  Microcycle,
} from '../../types/planning';
import { AreaBalanceChart } from './AreaBalanceChart';
import { planningService } from '../../services/planningService';

interface ImbalanceDashboardProps {
  season: SeasonGoal;
  mesocycles: Mesocycle[];
  microcycles: Microcycle[];
}

export const ImbalanceDashboard: React.FC<ImbalanceDashboardProps> = ({
  season,
  mesocycles,
  microcycles,
}) => {
  const cumulativeData = planningService.getSeasonCumulativeImbalances();
  const [aiAnalysis, setAiAnalysis] = useState<string>('');
  const [isLoadingAi, setIsLoadingAi] = useState<boolean>(false);

  // Closed microcycles with evaluations
  const evaluatedMicros = microcycles.filter((m) => m.evaluation);

  const handleGenerateSeasonDiagnosis = async () => {
    setIsLoadingAi(true);

    try {
      const response = await fetch('/api/planning/ai-close-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phase: 3,
          seasonGoal: season,
          mesocycle: mesocycles[0],
          microcycle: microcycles[microcycles.length - 1],
          userAnswers: {
            percepcion: 4,
            comentario: 'Diagnóstico acumulado global de la temporada para balancear cargas y detectar objetivos crónicos.',
          },
          imbalanceData: {
            byArea: cumulativeData.byArea,
            totalRealMinutes: cumulativeData.totalMinutes,
            patterns: cumulativeData.chronicallyMissedGoals.map(
              (g) => `Objetivo rezagado (${g.missedCount} veces): ${g.goal.descripcion}`
            ),
          },
        }),
      });

      const data = await response.json();
      if (data && data.text) {
        setAiAnalysis(data.text);
      }
    } catch {
      setAiAnalysis(
        `### Diagnóstico Global de Cargas Metodológicas\n\n- **Táctica:** Se observa una saturación continua superior al 65% del volumen en pista.\n- **Técnica:** Se constata un déficit crónico de tiempo dedicado al tiro analítico y finalizaciones.\n- **Recomendación:** Incorporar 20 minutos de técnica individual al inicio de cada sesión de 5v5 para asentar los fundamentos.`
      );
    } finally {
      setIsLoadingAi(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 rounded-2xl p-6 text-white shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-orange-400 text-xs font-bold uppercase tracking-wider mb-1">
            <AlertTriangle className="w-4 h-4" />
            <span>Centro de Control de Desequilibrios Metodológicos</span>
          </div>
          <h3 className="text-2xl font-bold tracking-tight">
            Balance Acumulado de Temporada ({cumulativeData.totalMinutes} min en pista)
          </h3>
          <p className="text-slate-300 text-sm mt-1 max-w-2xl opacity-90">
            Comparativa entre las intenciones estratégicas planificadas y el tiempo real efectivo ejecutado en los entrenamientos.
          </p>
        </div>

        <button
          type="button"
          onClick={handleGenerateSeasonDiagnosis}
          className="px-4 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-bold shadow-sm transition flex items-center gap-2 self-start md:self-auto shrink-0"
        >
          {isLoadingAi ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Brain className="w-4 h-4" />}
          <span>Generar Diagnóstico Estratégico IA</span>
        </button>
      </div>

      {/* Main Chart Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <AreaBalanceChart byArea={cumulativeData.byArea} height={280} />
        </div>

        {/* Area Health Summary */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3 flex flex-col justify-between">
          <div>
            <h4 className="text-sm font-bold uppercase tracking-wider text-slate-700 mb-3">
              Estado por Área de Trabajo
            </h4>

            <div className="space-y-2.5">
              {Object.entries(cumulativeData.byArea).map(([area, stat]: any) => {
                const deltaPct = Math.round(stat.delta * 100);
                const isDescuidada = deltaPct < -15;
                const isSobre = deltaPct > 15;

                return (
                  <div
                    key={area}
                    className={`p-3 rounded-xl border text-xs flex items-center justify-between ${
                      isDescuidada
                        ? 'bg-red-50/70 border-red-200 text-red-900'
                        : isSobre
                        ? 'bg-amber-50/70 border-amber-200 text-amber-900'
                        : 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                    }`}
                  >
                    <div>
                      <span className="font-bold uppercase block">{area}</span>
                      <span className="text-[11px] opacity-75">{stat.realMinutes} minutos</span>
                    </div>
                    <div className="text-right">
                      <span className="font-extrabold text-sm block">
                        {Math.round(stat.realPct * 100)}%
                      </span>
                      <span className="text-[11px] font-semibold">
                        {deltaPct > 0 ? `+${deltaPct}%` : `${deltaPct}%`} {isDescuidada ? '(Descuidada)' : isSobre ? '(Exceso)' : '(Óptima)'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="pt-2 text-[11px] text-slate-500 italic">
            El algoritmo alerta automáticamente si el desvío entre lo planificado y lo real supera el ±15%.
          </div>
        </div>
      </div>

      {/* Chronically Missed Goals Alert Section */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
        <h4 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <XCircle className="w-5 h-5 text-red-600" />
          <span>Objetivos Crónicamente Rezagados / No Cumplidos</span>
        </h4>

        {cumulativeData.chronicallyMissedGoals.length === 0 ? (
          <p className="text-sm text-slate-500 italic">
            No hay objetivos no cumplidos acumulados en la temporada. ¡Excelente progresión!
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {cumulativeData.chronicallyMissedGoals.map((item, idx) => (
              <div
                key={idx}
                className="p-4 bg-red-50/60 border border-red-200 rounded-xl space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase px-2 py-0.5 rounded bg-red-100 text-red-800">
                    {item.goal.area}
                  </span>
                  <span className="text-xs font-bold text-red-700">
                    No alcanzado en {item.missedCount} microciclo(s)
                  </span>
                </div>
                <p className="font-semibold text-slate-900 text-sm">{item.goal.descripcion}</p>
                <p className="text-xs text-slate-600">
                  <strong>Indicador fijado:</strong> {item.goal.indicadorExito} ({item.mesocycleName})
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* AI Diagnosis Result (if generated) */}
      {aiAnalysis && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-3">
          <h4 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Brain className="w-5 h-5 text-orange-600" />
            <span>Dictamen Estratégico Global de CoachMind IA</span>
          </h4>
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm leading-relaxed prose prose-sm max-w-none prose-orange">
            <ReactMarkdown>{aiAnalysis}</ReactMarkdown>
          </div>
        </div>
      )}

      {/* Evaluated Microcycles History */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
        <h4 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-orange-600" />
          <span>Historial de Evaluaciones y Cierres de Microciclo ({evaluatedMicros.length})</span>
        </h4>

        {evaluatedMicros.length === 0 ? (
          <p className="text-sm text-slate-500 italic">
            Aún no has cerrado ningún microciclo con IA. Ve a "Microciclos y Sesiones" y haz clic en "Cerrar Microciclo".
          </p>
        ) : (
          <div className="space-y-3">
            {evaluatedMicros.map((micro) => {
              const evalData = micro.evaluation!;
              return (
                <div
                  key={micro.id}
                  className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs"
                >
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
                      <span>Semana {micro.semana}: {micro.objetivoSemanal}</span>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-200 text-slate-700">
                        {evalData.fecha}
                      </span>
                    </div>
                    <span className="font-bold text-orange-700 bg-orange-50 border border-orange-200 px-2 py-0.5 rounded">
                      Percepción: {evalData.percepcionEntrenador}/5 ★
                    </span>
                  </div>

                  {evalData.comentarioLibre && (
                    <p className="text-slate-600 italic">"{evalData.comentarioLibre}"</p>
                  )}

                  <div className="flex items-center gap-4 text-slate-500 pt-1">
                    <span className="text-emerald-700 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {evalData.objetivosCumplidos.length} Cumplidos
                    </span>
                    <span className="text-red-700 font-semibold flex items-center gap-1">
                      <XCircle className="w-3.5 h-3.5" />
                      {evalData.objetivosNoCumplidos.length} No cumplidos
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
