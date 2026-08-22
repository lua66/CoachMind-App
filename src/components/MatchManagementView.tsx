import React, { useState } from 'react';
import {
  Brain,
  Zap,
  Shield,
  Activity,
  AlertTriangle,
  RotateCcw,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Award,
  ChevronRight,
  Gauge,
  Sliders,
  Sparkles,
  TrendingDown,
  Clock,
  Eye,
  Users,
  Maximize2,
  Lock,
  UserX,
  HeartPulse,
  Scale,
  Flame,
  Target,
  ArrowRight
} from 'lucide-react';
import {
  MATCH_SCENARIOS,
  FALSE_WINNER_CONCEPTS,
  SUBSTITUTION_SCIENCE,
  METHODOLOGY_BANNER,
  Scenario,
  ScenarioOption
} from '../data/matchManagementData';

type SubTab =
  | 'simulator'
  | 'false-winner'
  | 'substitutions'
  | 'advantages'
  | 'timeouts'
  | 'reading';

export const MatchManagementView: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<SubTab>('simulator');

  // Simulator State
  const [currentScenarioIndex, setCurrentScenarioIndex] = useState<number>(0);
  const [selectedOption, setSelectedOption] = useState<ScenarioOption | null>(null);
  const [currentLevelFilter, setCurrentLevelFilter] = useState<number | 'all'>('all');
  const [completedScenarios, setCompletedScenarios] = useState<Record<string, ScenarioOption>>({});

  const filteredScenarios = currentLevelFilter === 'all'
    ? MATCH_SCENARIOS
    : MATCH_SCENARIOS.filter(s => s.level === currentLevelFilter);

  const activeScenario: Scenario = filteredScenarios[currentScenarioIndex] || MATCH_SCENARIOS[0];

  const handleSelectOption = (option: ScenarioOption) => {
    setSelectedOption(option);
    setCompletedScenarios(prev => ({
      ...prev,
      [activeScenario.id]: option
    }));
  };

  const handleNextScenario = () => {
    if (currentScenarioIndex < filteredScenarios.length - 1) {
      setCurrentScenarioIndex(prev => prev + 1);
      const nextScen = filteredScenarios[currentScenarioIndex + 1];
      setSelectedOption(completedScenarios[nextScen.id] || null);
    }
  };

  const handlePrevScenario = () => {
    if (currentScenarioIndex > 0) {
      setCurrentScenarioIndex(prev => prev - 1);
      const prevScen = filteredScenarios[currentScenarioIndex - 1];
      setSelectedOption(completedScenarios[prevScen.id] || null);
    }
  };

  // Calculate overall profile stats from answered scenarios
  const answeredCount = Object.keys(completedScenarios).length;
  let gameReadingScore = 0;
  let emotionalScore = 0;
  let subsScore = 0;
  let tacticsScore = 0;
  let advantageScore = 0;
  let anticipationScore = 0;

  if (answeredCount > 0) {
    (Object.values(completedScenarios) as ScenarioOption[]).forEach(opt => {
      gameReadingScore += opt.categoryScores.gameReading;
      emotionalScore += opt.categoryScores.emotionalManagement;
      subsScore += opt.categoryScores.substitutions;
      tacticsScore += opt.categoryScores.tactics;
      advantageScore += opt.categoryScores.advantageManagement;
      anticipationScore += opt.categoryScores.anticipation;
    });
    gameReadingScore = Math.round(gameReadingScore / answeredCount);
    emotionalScore = Math.round(emotionalScore / answeredCount);
    subsScore = Math.round(subsScore / answeredCount);
    tacticsScore = Math.round(tacticsScore / answeredCount);
    advantageScore = Math.round(advantageScore / answeredCount);
    anticipationScore = Math.round(anticipationScore / answeredCount);
  } else {
    // Default base scores
    gameReadingScore = 75;
    emotionalScore = 70;
    subsScore = 80;
    tacticsScore = 78;
    advantageScore = 65;
    anticipationScore = 72;
  }

  const globalScore = Math.round(
    (gameReadingScore + emotionalScore + subsScore + tacticsScore + advantageScore + anticipationScore) / 6
  );

  // Substitution Tool State
  const [selectedNeed, setSelectedNeed] = useState<string>('defensa');

  // Momentum Gauge Value Calculation
  const currentMomentum = selectedOption
    ? Math.max(10, Math.min(90, activeScenario.initialMomentum + selectedOption.momentumShiftDelta))
    : activeScenario.initialMomentum;

  return (
    <div className="space-y-6 pb-12">
      {/* HEADER BANNER */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950 p-6 sm:p-8 border border-slate-800 shadow-2xl">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-8 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/10 border border-teal-500/30 text-teal-400 text-xs font-bold uppercase tracking-wider">
              <Brain className="w-3.5 h-3.5" />
              Módulo Táctico Avanzado — CoachMind Basketball
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-white tracking-tight flex items-center gap-3">
              Gestión del Partido
            </h1>
            <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
              Lee el juego en tiempo real, interpreta dinámicas emocionales y toma decisiones críticas bajo presión competitiva.
            </p>
          </div>

          <div className="w-full md:w-auto flex-shrink-0">
            <div className="p-4 rounded-xl bg-slate-950/80 border border-teal-500/30 text-center space-y-1">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-teal-400 block">
                Filosofía de Dirección
              </span>
              <p className="text-xs sm:text-sm font-extrabold text-amber-300 italic max-w-xs">
                "{METHODOLOGY_BANNER}"
              </p>
            </div>
          </div>
        </div>

        {/* SUB-NAV TABS */}
        <div className="mt-8 pt-6 border-t border-slate-800/80 flex items-center gap-2 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveSubTab('simulator')}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 transition-all whitespace-nowrap cursor-pointer ${
              activeSubTab === 'simulator'
                ? 'bg-teal-500 text-slate-950 shadow-lg shadow-teal-500/20 font-extrabold'
                : 'bg-slate-800/60 text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <Activity className="w-4 h-4" />
            🎮 Simulador de Partido
          </button>

          <button
            onClick={() => setActiveSubTab('false-winner')}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 transition-all whitespace-nowrap cursor-pointer ${
              activeSubTab === 'false-winner'
                ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20 font-extrabold'
                : 'bg-slate-800/60 text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <AlertTriangle className="w-4 h-4" />
            ⚠️ Síndrome del Falso Ganador
          </button>

          <button
            onClick={() => setActiveSubTab('substitutions')}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 transition-all whitespace-nowrap cursor-pointer ${
              activeSubTab === 'substitutions'
                ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20 font-extrabold'
                : 'bg-slate-800/60 text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <RotateCcw className="w-4 h-4" />
            🔄 Ciencia de las Sustituciones
          </button>

          <button
            onClick={() => setActiveSubTab('advantages')}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 transition-all whitespace-nowrap cursor-pointer ${
              activeSubTab === 'advantages'
                ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20 font-extrabold'
                : 'bg-slate-800/60 text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <TrendingDown className="w-4 h-4" />
            📈 Ventajas y Parciales
          </button>

          <button
            onClick={() => setActiveSubTab('timeouts')}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 transition-all whitespace-nowrap cursor-pointer ${
              activeSubTab === 'timeouts'
                ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20 font-extrabold'
                : 'bg-slate-800/60 text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <Clock className="w-4 h-4" />
            ⏱️ Tiempos Muertos & Finales
          </button>

          <button
            onClick={() => setActiveSubTab('reading')}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 transition-all whitespace-nowrap cursor-pointer ${
              activeSubTab === 'reading'
                ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/20 font-extrabold'
                : 'bg-slate-800/60 text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <Eye className="w-4 h-4" />
            🧠 Lectura del Partido
          </button>
        </div>
      </div>

      {/* ---------------------------------------------------------------------- */}
      {/* 1. TAB: SIMULADOR DE PARTIDO */}
      {/* ---------------------------------------------------------------------- */}
      {activeSubTab === 'simulator' && (
        <div className="space-y-6">
          {/* LEVEL FILTERS & SCENARIO NAVIGATION */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 p-4 rounded-xl bg-slate-900 border border-slate-800">
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
              <span className="text-xs font-bold text-slate-400 whitespace-nowrap mr-1">Nivel:</span>
              <button
                onClick={() => { setCurrentLevelFilter('all'); setCurrentScenarioIndex(0); setSelectedOption(null); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                  currentLevelFilter === 'all'
                    ? 'bg-teal-500 text-slate-950'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                Todos ({MATCH_SCENARIOS.length})
              </button>
              {[1, 2, 3, 4].map(lvl => (
                <button
                  key={lvl}
                  onClick={() => { setCurrentLevelFilter(lvl); setCurrentScenarioIndex(0); setSelectedOption(null); }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer whitespace-nowrap ${
                    currentLevelFilter === lvl
                      ? 'bg-teal-500 text-slate-950'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  Nivel {lvl}
                </button>
              ))}
            </div>

            <div className="flex items-center justify-between sm:justify-end gap-3 border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-800">
              <span className="text-xs font-bold text-slate-400">
                Escenario {currentScenarioIndex + 1} de {filteredScenarios.length}
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={handlePrevScenario}
                  disabled={currentScenarioIndex === 0}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-xs font-bold hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  Anterior
                </button>
                <button
                  onClick={handleNextScenario}
                  disabled={currentScenarioIndex === filteredScenarios.length - 1}
                  className="px-3 py-1.5 rounded-lg bg-teal-500 text-slate-950 text-xs font-black hover:bg-teal-400 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  Siguiente
                </button>
              </div>
            </div>
          </div>

          {/* MAIN SIMULATOR CARD */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              {/* SCENARIO CONTEXT CARD */}
              <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden shadow-xl">
                {/* MATCH SCOREBOARD TOP HEADER */}
                <div className="bg-slate-950 p-4 sm:p-6 border-b border-slate-800">
                  <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                    <span className="px-3 py-1 rounded-md bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-extrabold uppercase tracking-wider">
                      {activeScenario.levelLabel}
                    </span>

                    <div className="flex items-center gap-3 text-slate-300 text-xs font-bold">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-teal-400" />
                        {activeScenario.quarter}
                      </span>
                      <span className="text-slate-600">•</span>
                      <span className="font-mono text-teal-300 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                        {activeScenario.timeRemaining}
                      </span>
                    </div>
                  </div>

                  {/* SCOREBOARD DISPLAY */}
                  <div className="grid grid-cols-2 gap-4 bg-slate-900/90 p-4 rounded-xl border border-slate-800/80 text-center">
                    <div className="space-y-1">
                      <span className="text-xs font-extrabold text-teal-400 uppercase tracking-wider block">
                        TU EQUIPO
                      </span>
                      <span className="text-3xl sm:text-4xl font-black font-mono text-white tracking-wider">
                        {activeScenario.scoreUs}
                      </span>
                    </div>
                    <div className="space-y-1 border-l border-slate-800">
                      <span className="text-xs font-extrabold text-slate-400 uppercase tracking-wider block">
                        RIVAL
                      </span>
                      <span className="text-3xl sm:text-4xl font-black font-mono text-slate-300 tracking-wider">
                        {activeScenario.scoreRival}
                      </span>
                    </div>
                  </div>
                </div>

                {/* SCENARIO BODY */}
                <div className="p-6 space-y-5">
                  <h3 className="text-lg sm:text-xl font-bold text-white leading-snug">
                    {activeScenario.title}
                  </h3>

                  <div className="space-y-2 bg-slate-950/50 p-4 rounded-xl border border-slate-800/60">
                    <span className="text-xs font-extrabold uppercase tracking-wider text-slate-400 block mb-2">
                      Situación en Pista:
                    </span>
                    <ul className="space-y-2 text-sm text-slate-300">
                      {activeScenario.contextPoints.map((pt, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-teal-400 mt-2 shrink-0" />
                          <span>{pt}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* MOMENTO DEL PARTIDO DYNAMIC GAUGE */}
                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                    <div className="flex items-center justify-between text-xs font-extrabold">
                      <span className="text-teal-400 uppercase tracking-wider flex items-center gap-1.5">
                        <Flame className="w-4 h-4 text-amber-400" />
                        MOMENTO DEL PARTIDO
                      </span>
                      <span className="text-slate-400">
                        {selectedOption ? 'Actualizado según tu decisión' : 'Inercia Competitiva'}
                      </span>
                    </div>

                    <div className="relative pt-2 pb-1">
                      <div className="h-3 rounded-full bg-slate-800 overflow-hidden relative flex">
                        <div className="w-1/2 bg-gradient-to-r from-teal-500 to-indigo-500 h-full" />
                        <div className="w-1/2 bg-gradient-to-r from-indigo-500 to-rose-500 h-full" />
                      </div>

                      {/* Gauge Needle Pointer */}
                      <div
                        className="absolute top-0 transform -translate-x-1/2 transition-all duration-700 ease-out flex flex-col items-center"
                        style={{ left: `${currentMomentum}%` }}
                      >
                        <div className="w-3.5 h-3.5 rounded-full bg-amber-400 border-2 border-slate-950 shadow-lg shadow-amber-500/50" />
                        <div className="w-0.5 h-2 bg-amber-400" />
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 pt-1">
                      <span className="text-teal-300">TU EQUIPO ↑</span>
                      <span className="text-slate-500">Igualado</span>
                      <span className="text-rose-400">RIVAL ↑</span>
                    </div>

                    {selectedOption && (
                      <p className="text-xs text-amber-300/90 italic bg-amber-950/30 p-2.5 rounded border border-amber-800/40 mt-2">
                        💡 {selectedOption.momentumShiftDelta >= 0 ? 'Muestras buen control del ritmo.' : '¡Atención! El marcador sigue a favor pero el rival gana la inercia competitiva.'}
                      </p>
                    )}
                  </div>

                  {/* QUESTION AND OPTIONS */}
                  <div className="space-y-4 pt-2">
                    <h4 className="text-base font-extrabold text-teal-300 flex items-center gap-2">
                      <HelpCircle className="w-5 h-5 text-teal-400" />
                      {activeScenario.question}
                    </h4>

                    <div className="grid grid-cols-1 gap-3">
                      {activeScenario.options.map((opt) => {
                        const isSelected = selectedOption?.id === opt.id;
                        return (
                          <button
                            key={opt.id}
                            onClick={() => handleSelectOption(opt)}
                            className={`p-4 rounded-xl text-left border transition-all cursor-pointer flex items-start gap-3 ${
                              isSelected
                                ? 'bg-teal-950/60 border-teal-500 text-white shadow-lg shadow-teal-500/10'
                                : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-slate-950'
                            }`}
                          >
                            <span
                              className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black shrink-0 ${
                                isSelected
                                  ? 'bg-teal-500 text-slate-950'
                                  : 'bg-slate-800 text-slate-300'
                              }`}
                            >
                              {opt.letter}
                            </span>
                            <span className="text-sm font-medium leading-snug pt-0.5">
                              {opt.text}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* DECISION ANALYSIS FEEDBACK PANEL */}
              {selectedOption && (
                <div className="rounded-2xl bg-slate-900 border border-teal-500/40 p-6 space-y-6 shadow-2xl animate-fadeIn">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-extrabold uppercase tracking-widest text-slate-400">
                        Evaluación de la Decisión
                      </span>
                      {selectedOption.recommendationType === 'optimal' && (
                        <span className="px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-extrabold flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          🟢 Adecuada
                        </span>
                      )}
                      {selectedOption.recommendationType === 'conditioned' && (
                        <span className="px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-extrabold flex items-center gap-1.5">
                          <AlertTriangle className="w-4 h-4 text-amber-400" />
                          🟡 Condicionada
                        </span>
                      )}
                      {selectedOption.recommendationType === 'risky' && (
                        <span className="px-3 py-1 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs font-extrabold flex items-center gap-1.5">
                          <XCircle className="w-4 h-4 text-rose-400" />
                          🔴 Poco Recomendable
                        </span>
                      )}
                    </div>
                  </div>

                  {/* PROS AND CONS GRID */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 rounded-xl bg-emerald-950/30 border border-emerald-800/40 space-y-2">
                      <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider block">
                        ✅ Ventaja Táctica Principal
                      </span>
                      <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
                        {selectedOption.advantage}
                      </p>
                    </div>

                    <div className="p-4 rounded-xl bg-rose-950/30 border border-rose-800/40 space-y-2">
                      <span className="text-xs font-bold text-rose-400 uppercase tracking-wider block">
                        ⚠️ Riesgo o Penalización
                      </span>
                      <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
                        {selectedOption.risk}
                      </p>
                    </div>
                  </div>

                  {/* LEARNING FEEDBACK: QUÉ VISTE / QUÉ NO VISTE */}
                  <div className="space-y-3 bg-slate-950 p-5 rounded-xl border border-slate-800">
                    <h5 className="text-xs font-extrabold uppercase tracking-widest text-teal-400">
                      Análisis Metodológico CoachMind
                    </h5>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                      <div className="space-y-1">
                        <span className="text-xs font-bold text-teal-300 flex items-center gap-1.5">
                          <Eye className="w-3.5 h-3.5 text-teal-400" />
                          ¿Qué viste?
                        </span>
                        <p className="text-xs text-slate-300">{selectedOption.whatYouSaw}</p>
                      </div>

                      <div className="space-y-1">
                        <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                          <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
                          ¿Qué NO viste?
                        </span>
                        <p className="text-xs text-slate-300">{selectedOption.whatYouMissed}</p>
                      </div>

                      <div className="space-y-1">
                        <span className="text-xs font-bold text-indigo-300 flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5 text-indigo-400" />
                          ¿Qué podría hacer el rival?
                        </span>
                        <p className="text-xs text-slate-300">{selectedOption.probableRivalReaction}</p>
                      </div>

                      <div className="space-y-1">
                        <span className="text-xs font-bold text-purple-300 flex items-center gap-1.5">
                          <Target className="w-3.5 h-3.5 text-purple-400" />
                          ¿Qué observar en la siguiente posesión?
                        </span>
                        <p className="text-xs text-slate-300">{selectedOption.nextPossessionFocus}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* RIGHT SIDEBAR: COACH PROFILE & EVALUATION RADAR */}
            <div className="space-y-6">
              <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-6">
                <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                  <div className="flex items-center gap-2">
                    <Award className="w-5 h-5 text-amber-400" />
                    <h3 className="text-base font-extrabold text-white">
                      PERFIL DE ENTRENADOR
                    </h3>
                  </div>
                  <span className="text-xs font-bold text-slate-400">
                    {answeredCount} / {MATCH_SCENARIOS.length} Escenarios
                  </span>
                </div>

                {/* GLOBAL SCORE BADGE */}
                <div className="text-center p-6 rounded-xl bg-gradient-to-br from-slate-950 to-indigo-950 border border-indigo-500/30 space-y-2">
                  <span className="text-xs font-extrabold text-indigo-300 uppercase tracking-widest block">
                    Puntuación de Lectura
                  </span>
                  <div className="text-4xl sm:text-5xl font-black text-white font-mono tracking-tight">
                    {globalScore}<span className="text-2xl text-slate-500 font-normal">/100</span>
                  </div>
                  <p className="text-xs text-slate-400">
                    {globalScore >= 85 ? '🌟 Entrenador de Nivel Élite' : globalScore >= 70 ? '🟢 Sólido Lector de Partido' : '🟠 Necesita Reforzar Anticipación'}
                  </p>
                </div>

                {/* 6 SKILL AXES */}
                <div className="space-y-3.5 pt-2">
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs font-bold">
                      <span className="text-slate-300">Lectura del Partido</span>
                      <span className="text-teal-400">{gameReadingScore}/100</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
                      <div className="h-full bg-teal-500 transition-all duration-500" style={{ width: `${gameReadingScore}%` }} />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-xs font-bold">
                      <span className="text-slate-300">Gestión Emocional</span>
                      <span className="text-amber-400">{emotionalScore}/100</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
                      <div className="h-full bg-amber-500 transition-all duration-500" style={{ width: `${emotionalScore}%` }} />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-xs font-bold">
                      <span className="text-slate-300">Gestión de Sustituciones</span>
                      <span className="text-indigo-400">{subsScore}/100</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
                      <div className="h-full bg-indigo-500 transition-all duration-500" style={{ width: `${subsScore}%` }} />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-xs font-bold">
                      <span className="text-slate-300">Gestión Táctica</span>
                      <span className="text-emerald-400">{tacticsScore}/100</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
                      <div className="h-full bg-emerald-500 transition-all duration-500" style={{ width: `${tacticsScore}%` }} />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-xs font-bold">
                      <span className="text-slate-300">Gestión de Ventajas</span>
                      <span className="text-blue-400">{advantageScore}/100</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
                      <div className="h-full bg-blue-500 transition-all duration-500" style={{ width: `${advantageScore}%` }} />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-xs font-bold">
                      <span className="text-slate-300">Capacidad de Anticipación</span>
                      <span className="text-purple-400">{anticipationScore}/100</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
                      <div className="h-full bg-purple-500 transition-all duration-500" style={{ width: `${anticipationScore}%` }} />
                    </div>
                  </div>
                </div>

                {/* STRENGTHS AND AREAS TO IMPROVE */}
                <div className="pt-4 border-t border-slate-800 space-y-3">
                  <div className="space-y-1.5">
                    <span className="text-xs font-extrabold text-emerald-400 uppercase tracking-wider block">
                      🟢 Fortalezas Detectadas
                    </span>
                    <ul className="text-xs text-slate-300 space-y-1">
                      <li className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        Reacción rápida ante faltas tempranas de jugadores clave.
                      </li>
                      <li className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        Identificación clara del momento de pedir Tiempo Muerto.
                      </li>
                    </ul>
                  </div>

                  <div className="space-y-1.5 pt-2">
                    <span className="text-xs font-extrabold text-amber-400 uppercase tracking-wider block">
                      🟠 A Mejorar
                    </span>
                    <ul className="text-xs text-slate-300 space-y-1">
                      <li className="flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        Uso estratégico del Bonus de Faltas rival.
                      </li>
                      <li className="flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        Evitar decisiones especulativas cuando el marcador va +10.
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------------------- */}
      {/* 2. TAB: SÍNDROME DEL FALSO GANADOR */}
      {/* ---------------------------------------------------------------------- */}
      {activeSubTab === 'false-winner' && (
        <div className="space-y-6">
          {/* MAIN CONCEPT HERO */}
          <div className="p-6 sm:p-8 rounded-2xl bg-gradient-to-br from-amber-950/60 via-slate-900 to-slate-950 border border-amber-500/40 shadow-2xl space-y-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-extrabold uppercase">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                Concepto Metodológico CoachMind
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                {FALSE_WINNER_CONCEPTS.title}
              </h2>
              <p className="text-amber-200/90 text-sm sm:text-base italic font-semibold">
                "{FALSE_WINNER_CONCEPTS.subtitle}"
              </p>
            </div>

            <p className="text-slate-300 text-sm sm:text-base leading-relaxed bg-slate-950/70 p-5 rounded-xl border border-slate-800">
              {FALSE_WINNER_CONCEPTS.definition}
            </p>

            {/* BEHAVIOR MODIFICATIONS GRID */}
            <div className="space-y-3 pt-2">
              <h3 className="text-xs font-extrabold uppercase tracking-widest text-amber-400">
                Modificaciones Inconscientes del Comportamiento Colectivo:
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {FALSE_WINNER_CONCEPTS.behaviorChanges.map((item, idx) => (
                  <div key={idx} className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1.5 hover:border-amber-500/40 transition-all">
                    <span className="text-xs font-extrabold text-amber-300 flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center text-[10px] shrink-0">
                        {idx + 1}
                      </span>
                      {item.title}
                    </span>
                    <p className="text-xs text-slate-400 leading-normal pl-7">
                      {item.desc}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* EL RIVAL LO DETECTA SECTION */}
          <div className="p-6 sm:p-8 rounded-2xl bg-slate-900 border border-slate-800 space-y-6 shadow-xl">
            <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
              <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400 shrink-0">
                <Eye className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-black text-white uppercase tracking-tight">
                  👁️ EL RIVAL TAMBIÉN ESTÁ LEYENDO EL PARTIDO
                </h3>
                <p className="text-xs text-slate-400">
                  Lo que el entrenador rival identifica de inmediato para iniciar su remontada:
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {FALSE_WINNER_CONCEPTS.rivalDetects.map((pt, idx) => (
                <div key={idx} className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80 text-xs text-slate-300 flex items-start gap-2.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-400 mt-1.5 shrink-0" />
                  <span>{pt}</span>
                </div>
              ))}
            </div>

            {/* HIGHLIGHT QUOTE CARD */}
            <div className="p-6 rounded-xl bg-gradient-to-r from-teal-950 via-slate-950 to-indigo-950 border border-teal-500/40 text-center space-y-2">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-teal-400 block">
                REGLA DE ORO COACHMIND
              </span>
              <p className="text-lg sm:text-2xl font-black text-amber-300 tracking-tight italic">
                "{FALSE_WINNER_CONCEPTS.highlightQuote}"
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------------------- */}
      {/* 3. TAB: LA CIENCIA DE LAS SUSTITUCIONES */}
      {/* ---------------------------------------------------------------------- */}
      {activeSubTab === 'substitutions' && (
        <div className="space-y-6">
          {/* RULE HERO BANNER */}
          <div className="p-6 sm:p-8 rounded-2xl bg-gradient-to-r from-indigo-950 via-slate-900 to-slate-950 border border-indigo-500/40 text-center space-y-4 shadow-2xl">
            <span className="px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 text-xs font-extrabold uppercase tracking-wider">
              {SUBSTITUTION_SCIENCE.subtitle}
            </span>

            <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-white tracking-tight uppercase leading-snug">
              "{SUBSTITUTION_SCIENCE.rule}"
            </h2>

            <p className="text-slate-300 text-sm max-w-2xl mx-auto leading-relaxed">
              {SUBSTITUTION_SCIENCE.description}
            </p>
          </div>

          {/* INTERACTIVE NEED SELECTOR */}
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-6">
            <h3 className="text-base font-extrabold text-white flex items-center gap-2">
              <Sliders className="w-5 h-5 text-indigo-400" />
              ¿Qué necesita el partido AHORA MISMO? (Haz clic para analizar):
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 gap-3">
              {SUBSTITUTION_SCIENCE.needs.map((need) => {
                const isSelected = selectedNeed === need.id;
                return (
                  <button
                    key={need.id}
                    onClick={() => setSelectedNeed(need.id)}
                    className={`p-4 rounded-xl border text-left transition-all cursor-pointer space-y-2 ${
                      isSelected
                        ? 'bg-indigo-950/80 border-indigo-500 text-white shadow-lg shadow-indigo-500/20'
                        : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <span className="text-xs font-extrabold block text-indigo-300">
                      {need.label}
                    </span>
                    <p className="text-xs text-slate-400 leading-snug">
                      {need.description}
                    </p>
                  </button>
                );
              })}
            </div>

            {/* RECOMMENDATION PANEL FOR SELECTED NEED */}
            {selectedNeed && (
              <div className="p-5 rounded-xl bg-slate-950 border border-indigo-500/40 space-y-3 animate-fadeIn">
                <span className="text-xs font-extrabold text-teal-400 uppercase tracking-widest block">
                  Perfil de Jugador a Introducir en Pista:
                </span>
                {selectedNeed === 'defensa' && (
                  <p className="text-sm text-slate-200">
                    Saca a un especialista defensivo con brazos largos y piernas rápidas. No busques talento anotador en esta rotación; prioriza alguien que comunique en los bloqueos directos y cierre las penetraciones.
                  </p>
                )}
                {selectedNeed === 'rebote' && (
                  <p className="text-sm text-slate-200">
                    Saca a tu pívot más físico o alero alto de buena envergadura. Indícale explícitamente: "Tu único objetivo en esta ventana de 3 minutos es cerrar el box-out y asegurar el rebote defensivo".
                  </p>
                )}
                {selectedNeed === 'velocidad' && (
                  <p className="text-sm text-slate-200">
                    Introduce un quinteto bajito (small-ball) con 2 bases o escoltas agresivos en primera línea para correr al contraataque tras recuperar el balón.
                  </p>
                )}
                {selectedNeed === 'control' && (
                  <p className="text-sm text-slate-200">
                    Pon a tu base más experimentado y metódico. Prohíbe los pases de fantasía en transición y exige jugar sistemas estáticos de al menos 3 pases antes del primer tiro.
                  </p>
                )}
                {selectedNeed === 'generacion' && (
                  <p className="text-sm text-slate-200">
                    Saca al anotador descarado o alero con capacidad de jugar 1v1 desde el bote para generar colapsos en la defensa rival.
                  </p>
                )}
                {selectedNeed === 'frenar' && (
                  <p className="text-sm text-slate-200">
                    Ingresa a tu perro de presa defensivo. Asignación individual única: no salta a ninguna ayuda y persigue cara a cara al anotador rival.
                  </p>
                )}
                {selectedNeed === 'descanso' && (
                  <p className="text-sm text-slate-200">
                    Da descanso a tus pilares 2 minutos antes del final del cuarto para tenerlos al 100% en los minutos de la verdad.
                  </p>
                )}
                {selectedNeed === 'ritmo' && (
                  <p className="text-sm text-slate-200">
                    Ajusta la velocidad del partido según conveniencia: adormece el juego si el rival está eufórico o acelera con presión si el rival muestra cansancio.
                  </p>
                )}
                {selectedNeed === 'equilibrio' && (
                  <p className="text-sm text-slate-200">
                    Asegura que el quinteto en pista tenga al menos un generador, dos tiradores exteriores para abrir campo y dos reboteadores sólidos.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------------------- */}
      {/* 4. TAB: GESTIÓN DE VENTAJAS Y PARCIALES */}
      {/* ---------------------------------------------------------------------- */}
      {activeSubTab === 'advantages' && (
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-6">
            <h2 className="text-xl font-black text-white flex items-center gap-2">
              <TrendingDown className="w-5 h-5 text-emerald-400" />
              Gestión Táctica de Ventajas en el Marcador
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-5 rounded-xl bg-slate-950 border border-emerald-800/40 space-y-3">
                <span className="px-2.5 py-1 rounded bg-emerald-500/20 text-emerald-300 font-mono text-xs font-black">
                  VENTAJA CORTA (+5)
                </span>
                <p className="text-xs text-slate-300 leading-relaxed">
                  No modifiques el plan inicial. Es una ventaja volátil que puede desaparecer en dos posesiones. Mantén la agresividad sin especular con el reloj.
                </p>
              </div>

              <div className="p-5 rounded-xl bg-slate-950 border border-teal-800/40 space-y-3">
                <span className="px-2.5 py-1 rounded bg-teal-500/20 text-teal-300 font-mono text-xs font-black">
                  VENTAJA MEDIA (+10)
                </span>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Momento crítico de riesgo de entrada del "Síndrome del Falso Ganador". El rival arriesgará con defensas de presión o tiros rápidos. Asegura el rebote defensivo.
                </p>
              </div>

              <div className="p-5 rounded-xl bg-slate-950 border border-indigo-800/40 space-y-3">
                <span className="px-2.5 py-1 rounded bg-indigo-500/20 text-indigo-300 font-mono text-xs font-black">
                  VENTAJA CÓMODA (+15)
                </span>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Ataca la moral del rival manteniendo la máxima presión defensiva. Si aflojas la intensidad, revivirás al rival ofreciendo transiciones fáciles.
                </p>
              </div>
            </div>

            {/* PARCIALES RIVALES */}
            <div className="pt-4 border-t border-slate-800 space-y-4">
              <h3 className="text-sm font-extrabold text-amber-300 uppercase tracking-wider">
                Detección y Reacción ante Parciales Rivales
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-slate-950 border border-amber-800/40 space-y-2">
                  <span className="text-xs font-bold text-amber-400">
                    ⚠️ Parcial de 0-6 en contra
                  </span>
                  <p className="text-xs text-slate-300">
                    Aviso de alerta. Corrige verbalmente desde la banda la asignación en balance defensivo y exige mover el balón en ataque. No te precipites con tiempo muerto si el equipo muestra buen criterio.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-slate-950 border border-rose-800/40 space-y-2">
                  <span className="text-xs font-bold text-rose-400">
                    🚨 Parcial de 0-10 en contra
                  </span>
                  <p className="text-xs text-slate-300">
                    Intervención obligatoria. Pide tiempo muerto inmediatamente. La inercia psicológica ha cambiado por completo a favor del rival.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------------------- */}
      {/* 5. TAB: TIEMPOS MUERTOS & FINALES */}
      {/* ---------------------------------------------------------------------- */}
      {activeSubTab === 'timeouts' && (
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-6">
            <h2 className="text-xl font-black text-white flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-400" />
              Gestión Estratégica de Tiempos Muertos y Últimos 2 Minutos
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3 bg-slate-950 p-5 rounded-xl border border-slate-800">
                <h3 className="text-sm font-bold text-blue-300 uppercase tracking-wider">
                  Objetivos Claros del Tiempo Muerto:
                </h3>
                <ul className="space-y-2 text-xs text-slate-300">
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1.5 shrink-0" />
                    <span><strong>Cortar racha o inercia eufórica del rival.</strong></span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1.5 shrink-0" />
                    <span><strong>Dibujar jugada especial ATO (After Time Out)</strong> para tiro de alto porcentaje.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1.5 shrink-0" />
                    <span><strong>Ajuste defensivo puntual</strong> contra su referente o sistema que hace daño.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1.5 shrink-0" />
                    <span><strong>Calmar la ansiedad o sobreexcitación</strong> en los últimos 2 minutos.</span>
                  </li>
                </ul>
              </div>

              <div className="space-y-3 bg-slate-950 p-5 rounded-xl border border-slate-800">
                <h3 className="text-sm font-bold text-purple-300 uppercase tracking-wider">
                  Checklist para los Últimos 2 Minutos:
                </h3>
                <ul className="space-y-2 text-xs text-slate-300">
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-400 mt-1.5 shrink-0" />
                    <span>¿Cuántas faltas de equipo llevamos nosotros y el rival? (Bonus)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-400 mt-1.5 shrink-0" />
                    <span>¿Quiénes son nuestros mejores tiradores de tiros libres en pista?</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-400 mt-1.5 shrink-0" />
                    <span>¿Tenemos la falta táctica "gratis" antes de entrar en bonus?</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-400 mt-1.5 shrink-0" />
                    <span>¿Nos quedan tiempos muertos restantes para avanzar balón a campo de ataque?</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------------------- */}
      {/* 6. TAB: LECTURA DEL PARTIDO */}
      {/* ---------------------------------------------------------------------- */}
      {activeSubTab === 'reading' && (
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-6">
            <h2 className="text-xl font-black text-white flex items-center gap-2">
              <Eye className="w-5 h-5 text-purple-400" />
              Indicadores Clave de Lectura del Juego en Vivo
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <span className="text-xs font-bold text-purple-300 uppercase tracking-wider block">
                  1. Ritmo de Juego
                </span>
                <p className="text-xs text-slate-300">
                  Observa la velocidad con la que el base rival cruza el medio campo. Si tarda más de 5 segundos, tu presión está funcionando.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <span className="text-xs font-bold text-purple-300 uppercase tracking-wider block">
                  2. Balance Defensivo
                </span>
                <p className="text-xs text-slate-300">
                  Comprueba si los 3 exteriores vuelven corriendo antes de que el rival capture el rebote defensivo.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <span className="text-xs font-bold text-purple-300 uppercase tracking-wider block">
                  3. Lenguaje Corporal
                </span>
                <p className="text-xs text-slate-300">
                  Analiza las miradas entre compañeros tras un error: ¿se animan o se echan la culpa?
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
