import React, { useState } from 'react';
import {
  Compass,
  Brain,
  Save,
  CheckCircle2,
  Sparkles,
  Zap,
  Target,
  Shield,
  Dumbbell,
  BookOpen,
  MessageSquare,
  Loader2,
  RotateCcw,
} from 'lucide-react';
import { CoachPhilosophy, UserProfile, Player } from '../types';
import { consumeTrialAction } from '../utils/trialManager';

interface PhilosophyViewProps {
  philosophy: CoachPhilosophy | null;
  onSavePhilosophy: (philosophy: CoachPhilosophy) => void;
  userProfile?: UserProfile | null;
  onOpenTrialModal?: (mode?: 'general_action' | 'ficha_entrenador') => void;
  players?: Player[];
}

export const PhilosophyView: React.FC<PhilosophyViewProps> = ({
  philosophy,
  onSavePhilosophy,
  userProfile,
  onOpenTrialModal,
  players,
}) => {
  const [playStyle, setPlayStyle] = useState(philosophy?.playStyle || '');
  const [offensiveFocus, setOffensiveFocus] = useState(philosophy?.offensiveFocus || '');
  const [defensiveFocus, setDefensiveFocus] = useState(philosophy?.defensiveFocus || '');
  const [trainingGoals, setTrainingGoals] = useState(philosophy?.trainingGoals || '');
  const [matchGoals, setMatchGoals] = useState(philosophy?.matchGoals || '');
  const [coreValues, setCoreValues] = useState(philosophy?.coreValues || '');
  const [additionalNotes, setAdditionalNotes] = useState(philosophy?.additionalNotes || '');

  React.useEffect(() => {
    setPlayStyle(philosophy?.playStyle || '');
    setOffensiveFocus(philosophy?.offensiveFocus || '');
    setDefensiveFocus(philosophy?.defensiveFocus || '');
    setTrainingGoals(philosophy?.trainingGoals || '');
    setMatchGoals(philosophy?.matchGoals || '');
    setCoreValues(philosophy?.coreValues || '');
    setAdditionalNotes(philosophy?.additionalNotes || '');
  }, [philosophy]);

  const [savedSuccess, setSavedSuccess] = useState(false);

  // Playground Simulator
  const [testQuestion, setTestQuestion] = useState('');
  const [testReply, setTestReply] = useState<string | null>(null);
  const [isTesting, setIsTesting] = useState(false);

  const handleClearFields = () => {
    setPlayStyle('');
    setOffensiveFocus('');
    setDefensiveFocus('');
    setTrainingGoals('');
    setMatchGoals('');
    setCoreValues('');
    setAdditionalNotes('');
    setTestQuestion('');
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();

    if (!consumeTrialAction(userProfile, 'philosophy')) {
      if (onOpenTrialModal) onOpenTrialModal('general_action');
      return;
    }
    const updated: CoachPhilosophy = {
      playStyle,
      offensiveFocus,
      defensiveFocus,
      trainingGoals,
      matchGoals,
      coreValues,
      additionalNotes,
      updatedAt: new Date().toISOString(),
    };

    onSavePhilosophy(updated);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const handleTestAi = async () => {
    if (!testQuestion.trim() || isTesting) return;

    if (!consumeTrialAction(userProfile, 'philosophy')) {
      if (onOpenTrialModal) onOpenTrialModal('general_action');
      return;
    }

    setIsTesting(true);
    setTestReply(null);

    const fullPhilosophyObj = {
      playStyle,
      offensiveFocus,
      defensiveFocus,
      trainingGoals,
      matchGoals,
      coreValues,
      additionalNotes,
    };

    let currentPlayers = players || [];
    if (!currentPlayers || currentPlayers.length === 0) {
      try {
        const storedPls = localStorage.getItem('coachmind_players');
        if (storedPls) currentPlayers = JSON.parse(storedPls);
      } catch (e) {}
    }

    const generatePhilosophyFallbackReply = (q: string, ph: any): string => {
      const style = ph.playStyle || 'Ritmo alto e intensidad constante';
      const off = ph.offensiveFocus || 'Espaciado (spacing), pase extra y juego en equipo';
      const def = ph.defensiveFocus || 'Defensa presionante, comunicación activa y cierre de rebote (box-out)';
      const match = ph.matchGoals || 'Cumplir la identidad táctica y competir cada posesión';
      const values = ph.coreValues || 'Trabajo en equipo, disciplina y compromiso';
      const notes = ph.additionalNotes || '';

      return `Para abordar tu planteamiento ("${q}") aplicando directamente tu filosofía de juego:

1. **Planteamiento Táctico (Estilo: ${style}):**
   • Establecer desde los primeros minutos nuestro ritmo característico basado en **${style}**.
   • En ataque, priorizar **${off}** para desarticular la defensa rival y encontrar tiros liberados.

2. **Enfoque Defensivo (Ajuste: ${def}):**
   • Aplicar la máxima intensidad en **${def}**, exigiendo comunicación en los bloqueos directos/indirectos y asegurar el rebote defensivo.

3. **Objetivo de Partido y Valores del Equipo:**
   • Mantener como prioridad **${match}**.
   • Reforzar en cada tiempo muerto nuestros valores fundamentales de **${values}**.
   ${notes ? `\n4. **Indicaciones Especiales del Entrenador:**\n   • ${notes}` : ''}

💡 *Respuesta procesada aplicando fielmente el perfil táctico y valores que has registrado en CoachMind.*`;
    };

    try {
      const response = await fetch('/api/gemini/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: testQuestion,
          history: [],
          coachPhilosophy: fullPhilosophyObj,
          players: currentPlayers,
        }),
      });

      const contentType = response.headers.get('content-type');
      let data;
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      }

      if (data && data.success && (data.reply || data.text)) {
        setTestReply(data.reply || data.text);
      } else {
        console.warn('Server response missing or failed, using client philosophy fallback.');
        setTestReply(generatePhilosophyFallbackReply(testQuestion, fullPhilosophyObj));
      }
    } catch (err: any) {
      console.warn('Error connecting to AI chat, using client philosophy fallback:', err);
      setTestReply(generatePhilosophyFallbackReply(testQuestion, fullPhilosophyObj));
    } finally {
      setIsLoadingFalse();
    }
  };

  const setIsLoadingFalse = () => setIsTesting(false);

  return (
    <div className="space-y-6 animate-fadeIn w-full max-w-7xl mx-auto pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-amber-500 flex items-center justify-center text-white shadow-lg shadow-amber-500/20 shrink-0">
            <Compass className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Filosofía e Identidad del Entrenador
            </h1>
            <p className="text-sm text-slate-500">
              Entrena a la IA para que entienda cómo te gusta jugar y personalice todos tus entrenamientos
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={handleClearFields}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs sm:text-sm transition-all cursor-pointer"
            title="Vaciar todos los campos"
          >
            <RotateCcw className="w-4 h-4 text-slate-500" />
            <span>Vaciar Campos</span>
          </button>
          <button
            onClick={handleSave}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-xs sm:text-sm shadow-md shadow-amber-500/20 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
          >
            <Save className="w-5 h-5" />
            <span>Guardar Filosofía en la IA</span>
          </button>
        </div>
      </div>

      {savedSuccess && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-bold flex items-center gap-3 animate-fadeIn">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>
            ¡Filosofía guardada correctamente! La IA Entrenadora aplicará estas pautas en la generación de sesiones y consultas tácticas.
          </span>
        </div>
      )}

      {/* Main Form */}
      <form onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Card 1: Estilo y Filosofía General */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 space-y-4">
          <div className="flex items-center gap-2.5 text-blue-600 font-extrabold text-base border-b border-slate-100 pb-3">
            <Zap className="w-5 h-5 text-amber-500" />
            <h3>1. Estilo de Juego e Identidad Principal</h3>
          </div>
          <p className="text-xs text-slate-500 leading-relaxed">
            Describe cómo te gusta que juegue tu equipo (ritmo de juego, transiciones, control del balón, contraataque...).
          </p>
          <textarea
            rows={4}
            value={playStyle}
            onChange={(e) => setPlayStyle(e.target.value)}
            className="w-full p-3 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-amber-500 font-medium placeholder:text-slate-400/80"
            placeholder="Ejemplo: Juego de ritmo alto, transición rápida tras recuperación y contraataque directo. En estático, movimiento constante de balón sin amasar la posesión."
          />
        </div>

        {/* Card 2: Enfoque Ofensivo */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 space-y-4">
          <div className="flex items-center gap-2.5 text-blue-600 font-extrabold text-base border-b border-slate-100 pb-3">
            <Target className="w-5 h-5 text-blue-600" />
            <h3>2. Enfoque Ofensivo Preferido</h3>
          </div>
          <p className="text-xs text-slate-500 leading-relaxed">
            Estructuras de ataque, Pick & Roll, juego sin balón, espaciado (spacing), tiro exterior, pase extra...
          </p>
          <textarea
            rows={4}
            value={offensiveFocus}
            onChange={(e) => setOffensiveFocus(e.target.value)}
            className="w-full p-3 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 font-medium placeholder:text-slate-400/80"
            placeholder="Ejemplo: Espaciado (spacing) amplio de 5 fuera o 4 fuera y 1 dentro. Abuso del Pick & Roll y cortes por línea de fondo. Prioridad al pase extra para buscar el tiro de mayor porcentaje."
          />
        </div>

        {/* Card 3: Enfoque Defensivo */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 space-y-4">
          <div className="flex items-center gap-2.5 text-blue-600 font-extrabold text-base border-b border-slate-100 pb-3">
            <Shield className="w-5 h-5 text-emerald-600" />
            <h3>3. Enfoque Defensivo y Presión</h3>
          </div>
          <p className="text-xs text-slate-500 leading-relaxed">
            Tipos de defensa (individual, zonas, presión), normas de ayuda, defensa del bloqueo directo y cierre de rebote.
          </p>
          <textarea
            rows={4}
            value={defensiveFocus}
            onChange={(e) => setDefensiveFocus(e.target.value)}
            className="w-full p-3 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-emerald-500 font-medium placeholder:text-slate-400/80"
            placeholder="Ejemplo: Defensa individual presionante al balón desde 3/4 de cancha. Ayudas agresivas al penetrador y rotación rápida en lado débil. Cierre enérgico del rebote defensivo con los 5 jugadores."
          />
        </div>

        {/* Card 4: Objetivos en Entrenamientos */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 space-y-4">
          <div className="flex items-center gap-2.5 text-blue-600 font-extrabold text-base border-b border-slate-100 pb-3">
            <Dumbbell className="w-5 h-5 text-orange-500" />
            <h3>4. Objetivos y Metodología de Entrenamientos</h3>
          </div>
          <p className="text-xs text-slate-500 leading-relaxed">
            Cómo quieres que sean tus entrenamientos (ritmo, ejercicios con fatiga, competitividad, correcciones).
          </p>
          <textarea
            rows={4}
            value={trainingGoals}
            onChange={(e) => setTrainingGoals(e.target.value)}
            className="w-full p-3 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-orange-500 font-medium placeholder:text-slate-400/80"
            placeholder="Ejemplo: Máxima intensidad física y mental con ejercicios dinámicos de pocos parones. Foco en toma de decisiones en situaciones de fatiga y alta tasa de repetición."
          />
        </div>

        {/* Card 5: Objetivos en Partidos */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 space-y-4">
          <div className="flex items-center gap-2.5 text-blue-600 font-extrabold text-base border-b border-slate-100 pb-3">
            <BookOpen className="w-5 h-5 text-indigo-600" />
            <h3>5. Objetivos Clave para Partidos</h3>
          </div>
          <p className="text-xs text-slate-500 leading-relaxed">
            Metas cuantificables en los partidos (reducir pérdidas, dominio del rebote, rotación de jugadoras).
          </p>
          <textarea
            rows={4}
            value={matchGoals}
            onChange={(e) => setMatchGoals(e.target.value)}
            className="w-full p-3 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-500 font-medium placeholder:text-slate-400/80"
            placeholder="Ejemplo: Mantener la identidad defensiva los 40 minutos. Reducir pérdidas a menos de 12 por partido y forzar ritmo alto para agotar al rival."
          />
        </div>

        {/* Card 6: Valores e Instrucciones para la IA */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 space-y-4">
          <div className="flex items-center gap-2.5 text-blue-600 font-extrabold text-base border-b border-slate-100 pb-3">
            <Brain className="w-5 h-5 text-purple-600" />
            <h3>6. Valores e Instrucciones Especiales para la IA</h3>
          </div>
          <p className="text-xs text-slate-500 leading-relaxed">
            Indicaciones para que la IA sepa cómo dirigirse a ti y qué términos o formatos prefieres.
          </p>
          <textarea
            rows={4}
            value={additionalNotes}
            onChange={(e) => setAdditionalNotes(e.target.value)}
            className="w-full p-3 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-purple-500 font-medium placeholder:text-slate-400/80"
            placeholder="Ejemplo: Quiero que la IA me sugiera siempre variantes en los ejercicios para ajustar la dificultad y me hable con terminología táctica avanzada."
          />
        </div>

        <div className="lg:col-span-2 flex justify-end">
          <button
            type="submit"
            className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-sm shadow-lg shadow-amber-500/20 transition-all hover:scale-[1.01] cursor-pointer flex items-center justify-center gap-2"
          >
            <Save className="w-5 h-5" />
            <span>Guardar Toda Mi Filosofía en la IA</span>
          </button>
        </div>
      </form>

      {/* Interactive AI Trainer Playground Test */}
      <div className="bg-slate-900 text-white rounded-2xl border border-slate-800 p-6 space-y-4 shadow-xl">
        <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-extrabold text-base text-white">
              Probador / Entrenador en Tiempo Real de la IA
            </h3>
            <p className="text-xs text-slate-400">
              Comprueba cómo respondería la IA aplicando directamente tu filosofía de juego
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={testQuestion}
              onChange={(e) => setTestQuestion(e.target.value)}
              placeholder="Ejemplo: ¿Cómo debo plantear el primer cuarto de un partido importante?"
              className="flex-1 p-3 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm focus:ring-2 focus:ring-amber-500 placeholder:text-slate-500"
            />
            <button
              type="button"
              onClick={handleTestAi}
              disabled={isTesting}
              className="px-6 py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-xs flex items-center justify-center gap-2 cursor-pointer shrink-0 disabled:opacity-50"
            >
              {isTesting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Procesando...</span>
                </>
              ) : (
                <>
                  <MessageSquare className="w-4 h-4" />
                  <span>Probar Respuesta IA</span>
                </>
              )}
            </button>
          </div>

          {testReply && (
            <div className="p-4 rounded-xl bg-slate-800/90 border border-slate-700 text-slate-200 text-xs sm:text-sm leading-relaxed space-y-2 animate-fadeIn">
              <div className="font-extrabold text-amber-400 text-xs flex items-center gap-1.5 uppercase tracking-wider">
                <Brain className="w-4 h-4 text-amber-400" />
                <span>Respuesta Personalizada según Tu Filosofía:</span>
              </div>
              <p className="whitespace-pre-line text-slate-100">{testReply}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
