import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Trophy,
  BadgeCheck,
  Smartphone,
  MessageSquare,
  Users,
  Dumbbell,
  ClipboardList,
  Brain,
  Award,
  ArrowRight,
  Calendar,
  BarChart3,
  Video,
  BookOpen,
  Star,
  ThumbsUp,
  HeartHandshake,
} from 'lucide-react';
import {
  ViewMode,
  SavedTraining,
  Player,
  UserProfile,
  MatchRecord,
  CalendarEvent,
  CoachPhilosophy,
  AppReview,
} from '../types';
import { getStoredReviews } from './ReviewModal';

interface DashboardViewProps {
  onNavigate: (view: ViewMode) => void;
  trainings?: SavedTraining[];
  players?: Player[];
  matches?: MatchRecord[];
  calendarEvents?: CalendarEvent[];
  coachPhilosophy?: CoachPhilosophy | null;
  onQuickAskAi?: (question: string) => void;
  userProfile?: UserProfile | null;
  onUpdateProfile?: (updated: UserProfile) => void;
  onDeleteMatch?: (id: string) => void;
  onClearMatches?: () => void;
  onUpdateMatches?: (newMatches: MatchRecord[]) => void;
  onOpenRegisterModal?: () => void;
  onOpenFichaLockModal?: () => void;
  onClearProfile?: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  onNavigate,
  trainings = [],
  players = [],
  matches = [],
  calendarEvents = [],
  coachPhilosophy = null,
  userProfile,
  onOpenRegisterModal,
  onClearProfile,
}) => {
  const firstName = userProfile?.firstName || 'Entrenador';

  const [appReviews, setAppReviews] = useState<AppReview[]>(() => getStoredReviews());

  useEffect(() => {
    const handleReviewsUpdate = () => {
      setAppReviews(getStoredReviews());
    };
    window.addEventListener('coachmind_reviews_updated', handleReviewsUpdate);
    return () => {
      window.removeEventListener('coachmind_reviews_updated', handleReviewsUpdate);
    };
  }, []);

  // Count saved plays
  const getTacticalPlaysCount = (): number => {
    try {
      const saved = localStorage.getItem('coach_saved_plays');
      if (!saved) return 0;
      const parsed = JSON.parse(saved);
      return Array.isArray(parsed) ? parsed.length : 0;
    } catch {
      return 0;
    }
  };

  const savedPlaysCount = getTacticalPlaysCount();

  return (
    <div className="space-y-6 animate-fadeIn max-w-7xl mx-auto pb-12">
      {/* TARJETA 1: TOP BANNER DE BIENVENIDA */}
      <div className="relative overflow-hidden rounded-2xl bg-[#0F172A] p-6 sm:p-8 text-white shadow-xl border border-slate-800">
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold">
              <span className="text-base">🏀</span> Panel Principal • CoachMind
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white flex items-center gap-2">
              <span>{userProfile ? `¡Hola, ${firstName}!` : '¡Bienvenido a CoachMind!'}</span>
              <span className="animate-bounce">👋</span>
            </h1>
            <p className="text-slate-300 text-sm max-w-xl">
              {userProfile
                ? 'Acceso directo a las herramientas tácticas de tu equipo: diseña ejercicios con IA, organiza partidos y dibuja jugadas en la pizarra.'
                : 'Explora la pizarra táctica, los entrenamientos y las estadísticas de forma 100% gratuita. Obtén tu carnet oficial en el apartado Entrenador.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {userProfile ? (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onNavigate('coach')}
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs flex items-center gap-1.5 transition-all shadow-md cursor-pointer"
                >
                  <Award className="w-4 h-4 text-slate-950" />
                  <span>Ver Ficha de Entrenador</span>
                </button>
                {onClearProfile && (
                  <button
                    type="button"
                    onClick={onClearProfile}
                    className="px-3 py-2 rounded-xl bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 text-red-300 font-extrabold text-xs transition-all cursor-pointer"
                    title="Cerrar esta sesión"
                  >
                    <span>Cerrar Sesión</span>
                  </button>
                )}
              </div>
            ) : (
              <button
                type="button"
                onClick={onOpenRegisterModal}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-extrabold text-xs flex items-center gap-2 shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-amber-200" />
                <span>⭐ Obtener Licencia Gratuita</span>
              </button>
            )}
          </div>
        </div>

        {/* Background decorative basketball circle */}
        <div className="absolute -right-12 -bottom-12 w-64 h-64 rounded-full border-[16px] border-slate-800/40 pointer-events-none" />
      </div>

      {/* ACCESOS RÁPIDOS Y RESUMEN TÁCTICO DE OPERACIONES */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-md p-6 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div>
            <h2 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              <span>Panel de Control Táctico</span>
              <Sparkles className="w-5 h-5 text-amber-500" />
            </h2>
            <p className="text-xs text-slate-500">
              Métricas clave y accesos directos a tus herramientas de dirección de equipo
            </p>
          </div>

          <button
            type="button"
            onClick={() => onNavigate('coach')}
            className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-amber-50 hover:text-amber-900 text-slate-800 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer border border-slate-200"
          >
            <Award className="w-4 h-4 text-amber-600" />
            <span>Ir al apartado Entrenador</span>
            <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
          </button>
        </div>

        {/* Métricas clave rápidas */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <button
            type="button"
            onClick={() => onNavigate('players')}
            className="p-4 rounded-2xl bg-blue-50/60 hover:bg-blue-100/80 border border-blue-200/80 transition-all text-left group cursor-pointer space-y-1"
          >
            <div className="flex items-center justify-between">
              <Users className="w-5 h-5 text-blue-600" />
              <ArrowRight className="w-4 h-4 text-blue-400 group-hover:translate-x-1 transition-transform" />
            </div>
            <div className="text-2xl font-black text-slate-900 mt-2">{players.length}</div>
            <span className="text-xs font-bold text-blue-900 block">Jugadores en Plantilla</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('trainings')}
            className="p-4 rounded-2xl bg-amber-50/60 hover:bg-amber-100/80 border border-amber-200/80 transition-all text-left group cursor-pointer space-y-1"
          >
            <div className="flex items-center justify-between">
              <Dumbbell className="w-5 h-5 text-amber-600" />
              <ArrowRight className="w-4 h-4 text-amber-400 group-hover:translate-x-1 transition-transform" />
            </div>
            <div className="text-2xl font-black text-slate-900 mt-2">{trainings.length}</div>
            <span className="text-xs font-bold text-amber-900 block">Entrenamientos Creados</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('match-analysis')}
            className="p-4 rounded-2xl bg-emerald-50/60 hover:bg-emerald-100/80 border border-emerald-200/80 transition-all text-left group cursor-pointer space-y-1"
          >
            <div className="flex items-center justify-between">
              <Trophy className="w-5 h-5 text-emerald-600" />
              <ArrowRight className="w-4 h-4 text-emerald-400 group-hover:translate-x-1 transition-transform" />
            </div>
            <div className="text-2xl font-black text-slate-900 mt-2">{matches.length}</div>
            <span className="text-xs font-bold text-emerald-900 block">Partidos Registrados</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('whiteboard')}
            className="p-4 rounded-2xl bg-purple-50/60 hover:bg-purple-100/80 border border-purple-200/80 transition-all text-left group cursor-pointer space-y-1"
          >
            <div className="flex items-center justify-between">
              <ClipboardList className="w-5 h-5 text-purple-600" />
              <ArrowRight className="w-4 h-4 text-purple-400 group-hover:translate-x-1 transition-transform" />
            </div>
            <div className="text-2xl font-black text-slate-900 mt-2">{savedPlaysCount}</div>
            <span className="text-xs font-bold text-purple-900 block">Jugadas en Pizarra</span>
          </button>
        </div>

        {/* BANNER DESTACADO PARA EL NUEVO MÓDULO GESTIÓN DEL PARTIDO */}
        <div
          onClick={() => onNavigate('match-management')}
          className="p-6 rounded-2xl bg-gradient-to-r from-teal-950 via-slate-900 to-indigo-950 border border-teal-500/40 text-white hover:border-teal-400 transition-all cursor-pointer shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6 group"
        >
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/30 text-xs font-black uppercase tracking-wider">
              <Brain className="w-3.5 h-3.5 text-teal-400" />
              ¡Novedad Metodológica!
            </div>
            <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
              🧠 Gestión del Partido
            </h3>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Aprende a leer el partido, domina la Ciencia de las Sustituciones, evita el Síndrome del Falso Ganador y entrena con el Simulador Interactivo de Decisiones en tiempo real.
            </p>
          </div>

          <div className="flex items-center gap-2 px-5 py-3 rounded-xl bg-teal-500 text-slate-950 font-black text-xs sm:text-sm group-hover:bg-teal-400 transition-all shrink-0">
            <span>Entrar al Simulador</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        {/* Accesos rápidos en cuadrícula */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
          <div
            onClick={() => onNavigate('create-training')}
            className="p-5 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 text-white hover:from-amber-600 hover:to-orange-600 transition-all cursor-pointer space-y-3 group shadow-md"
          >
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-amber-300 group-hover:bg-white/20">
              <Dumbbell className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-white">Diseñar Entrenamiento con IA</h3>
              <p className="text-xs text-slate-300 mt-1">
                Genera sesiones según la categoría de tu equipo, intensidad y objetivos tácticos.
              </p>
            </div>
            <div className="flex items-center gap-1 text-xs font-bold text-amber-300 group-hover:text-white pt-1">
              <span>Diseñar Sesión</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          <div
            onClick={() => onNavigate('whiteboard')}
            className="p-5 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 text-white hover:from-amber-600 hover:to-orange-600 transition-all cursor-pointer space-y-3 group shadow-md"
          >
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-amber-300 group-hover:bg-white/20">
              <ClipboardList className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-white">Pizarra Táctica Interactiva</h3>
              <p className="text-xs text-slate-300 mt-1">
                Dibuja pases, bloqueos, cortes y movimientos tácticos en una cancha de baloncesto 2D.
              </p>
            </div>
            <div className="flex items-center gap-1 text-xs font-bold text-amber-300 group-hover:text-white pt-1">
              <span>Abrir Pizarra</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          <div
            onClick={() => onNavigate('coach-ai')}
            className="p-5 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 text-white hover:from-amber-600 hover:to-orange-600 transition-all cursor-pointer space-y-3 group shadow-md"
          >
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-amber-300 group-hover:bg-white/20">
              <Brain className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-white">Consultar a la IA Entrenadora</h3>
              <p className="text-xs text-slate-300 mt-1">
                Resuelve dudas de metodología, táctica defensiva y preparación psicológica en tiempo real.
              </p>
            </div>
            <div className="flex items-center gap-1 text-xs font-bold text-amber-300 group-hover:text-white pt-1">
              <span>Consultar IA</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </div>
      </div>

      {/* TARJETA 4: PANEL DE RESEÑAS Y LIKES DE ENTRENADORES */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-md p-6 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-600 text-xs font-extrabold">
              <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
              <span>Panel de Reseñas y Opiniones Reales</span>
            </div>
            <h2 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              <span>Comentarios y Likes de Entrenadores</span>
              <ThumbsUp className="w-5 h-5 text-amber-500 fill-amber-500" />
            </h2>
            <p className="text-xs text-slate-500">
              Conoce lo que dicen otros entrenadores de baloncesto sobre CoachMind ({appReviews.length} valoraciones registradas)
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 flex items-center gap-2 text-xs font-black text-amber-900">
              <div className="flex text-amber-400">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star key={s} className="w-4 h-4 fill-amber-400" />
                ))}
              </div>
              <span>5.0 / 5.0</span>
            </div>
          </div>
        </div>

        {/* Grid of Reviews */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {appReviews.map((rev) => (
            <div
              key={rev.id}
              className="p-5 rounded-2xl bg-slate-50/80 border border-slate-200/80 space-y-3 relative hover:border-amber-300 transition-all shadow-sm"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 text-slate-950 font-black text-sm flex items-center justify-center shadow-md">
                    {rev.authorName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h4 className="font-extrabold text-sm text-slate-900">{rev.authorName}</h4>
                    <p className="text-[11px] font-semibold text-amber-600">
                      {rev.club} • <span className="text-slate-500">{rev.role}</span>
                    </p>
                  </div>
                </div>

                <div className="flex text-amber-400 shrink-0">
                  {Array.from({ length: rev.rating || 5 }).map((_, i) => (
                    <Star key={i} className="w-3.5 h-3.5 fill-amber-400" />
                  ))}
                </div>
              </div>

              <p className="text-xs text-slate-700 italic leading-relaxed pt-1">
                "{rev.comment}"
              </p>

              <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-200/50">
                <span>Fecha: {rev.createdAt}</span>
                <span className="flex items-center gap-1 font-bold text-amber-600">
                  <ThumbsUp className="w-3 h-3 fill-amber-500 text-amber-500" /> Like Verificado
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
