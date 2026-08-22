import React, { useState, useEffect } from 'react';
import {
  User,
  Camera,
  Award,
  ShieldCheck,
  Building2,
  Calendar,
  Users,
  Edit3,
  Save,
  CheckCircle2,
  Sparkles,
  Globe,
  Trophy,
  BadgeCheck,
  Lock,
  TrendingUp,
  Activity,
  BarChart3,
  PieChart as PieIcon,
  Flame,
  PlusCircle,
  ArrowRight,
  Target,
  Brain,
  Dumbbell,
  BookOpen,
  Layout,
  AlertCircle,
  Trash2,
  Star,
  Smartphone,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { ReviewModal, getStoredReviews } from './ReviewModal';
import { CoachPhotoSelector } from './CoachPhotoSelector';
import { AppReview } from '../types';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  CartesianGrid,
} from 'recharts';
import {
  ViewMode,
  SavedTraining,
  Player,
  UserProfile,
  MatchRecord,
  CalendarEvent,
  CoachPhilosophy,
} from '../types';

interface CoachViewProps {
  onNavigate: (view: ViewMode) => void;
  trainings?: SavedTraining[];
  players?: Player[];
  matches?: MatchRecord[];
  calendarEvents?: CalendarEvent[];
  coachPhilosophy?: CoachPhilosophy | null;
  userProfile?: UserProfile | null;
  onUpdateProfile?: (updated: UserProfile) => void;
  onDeleteMatch?: (id: string) => void;
  onClearMatches?: () => void;
  onUpdateMatches?: (newMatches: MatchRecord[]) => void;
  onOpenRegisterModal?: () => void;
  onOpenFichaLockModal?: () => void;
  onClearProfile?: () => void;
}

export const CoachView: React.FC<CoachViewProps> = ({
  onNavigate,
  trainings = [],
  players = [],
  matches = [],
  calendarEvents = [],
  coachPhilosophy = null,
  userProfile,
  onUpdateProfile,
  onDeleteMatch,
  onClearMatches,
  onUpdateMatches,
  onOpenRegisterModal,
  onOpenFichaLockModal,
  onClearProfile,
}) => {
  // Initialize form state from userProfile or default empty state
  const [firstName, setFirstName] = useState(userProfile?.firstName || '');
  const [lastName, setLastName] = useState(userProfile?.lastName || '');
  const [photoUrl, setPhotoUrl] = useState(userProfile?.photoUrl || '');
  const [season, setSeason] = useState(userProfile?.season || '2025 - 2026');
  const [club, setClub] = useState(userProfile?.club || '');
  const [age, setAge] = useState<string | number>(userProfile?.age || '');
  const [coachLevel, setCoachLevel] = useState<string>(
    userProfile?.coachLevel || 'Nivel 1'
  );
  const [titleFederation, setTitleFederation] = useState<string>(
    userProfile?.titleFederation || ''
  );
  const [workFederation, setWorkFederation] = useState<string>(
    userProfile?.workFederation || ''
  );

  const [isEditing, setIsEditing] = useState<boolean>(!userProfile?.firstName);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  // Update internal state if userProfile prop changes
  useEffect(() => {
    if (userProfile) {
      if (userProfile.firstName) setFirstName(userProfile.firstName);
      if (userProfile.lastName) setLastName(userProfile.lastName);
      if (userProfile.photoUrl) setPhotoUrl(userProfile.photoUrl);
      if (userProfile.season) setSeason(userProfile.season);
      if (userProfile.club) setClub(userProfile.club);
      if (userProfile.age) setAge(userProfile.age);
      if (userProfile.coachLevel) setCoachLevel(userProfile.coachLevel);
      if (userProfile.titleFederation) setTitleFederation(userProfile.titleFederation);
      if (userProfile.workFederation) setWorkFederation(userProfile.workFederation);
    }
  }, [userProfile]);

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();

    if (!userProfile) {
      if (onOpenFichaLockModal) {
        onOpenFichaLockModal();
      } else if (onOpenRegisterModal) {
        onOpenRegisterModal();
      }
      return;
    }

    const updatedProfile: UserProfile = {
      firstName: firstName || 'Entrenador',
      lastName: lastName || '',
      email: userProfile?.email || '',
      phone: userProfile?.phone || '',
      country: userProfile?.country || 'España',
      town: userProfile?.town || '',
      club: club || 'Club Baloncesto',
      teamLevel: userProfile?.teamLevel || 'Autonómico',
      teamCategory: userProfile?.teamCategory || 'Senior',
      registeredAt: userProfile?.registeredAt || new Date().toISOString().split('T')[0],
      subscriptionStatus: userProfile?.subscriptionStatus || 'active',
      subscriptionPlan: userProfile?.subscriptionPlan || 'monthly',
      paymentMethod: userProfile?.paymentMethod || 'visa',
      photoUrl,
      age,
      season,
      coachLevel,
      titleFederation,
      workFederation,
    };

    if (onUpdateProfile) {
      onUpdateProfile(updatedProfile);
    } else {
      try {
        localStorage.setItem('coachmind_user_profile', JSON.stringify(updatedProfile));
      } catch (err) {
        console.error('Error guardando perfil en localStorage:', err);
      }
    }

    setIsEditing(false);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const fullName = `${firstName} ${lastName}`.trim() || 'Entrenador/a';

  // Photo presets for easy selection
  const avatarPresets = [
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=500&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=500&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=500&auto=format&fit=crop&q=80',
  ];

  const [isClearMatchesModalOpen, setIsClearMatchesModalOpen] = useState(false);
  const [reviews, setReviews] = useState<AppReview[]>(() => getStoredReviews());
  const [showAllReviews, setShowAllReviews] = useState(false);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);

  useEffect(() => {
    const handleReviewsUpdate = () => {
      setReviews(getStoredReviews());
    };
    window.addEventListener('coachmind_reviews_updated', handleReviewsUpdate);
    return () => {
      window.removeEventListener('coachmind_reviews_updated', handleReviewsUpdate);
    };
  }, []);

  const confirmClearMatches = () => {
    if (onClearMatches) {
      onClearMatches();
    } else {
      localStorage.removeItem('coachmind_matches');
    }
    setIsClearMatchesModalOpen(false);
  };

  // 1. CALCULATE MATCH RESULTS & STATS
  const wins = matches.filter((m) => m.scoreUs > m.scoreThem).length;
  const losses = matches.filter((m) => m.scoreUs < m.scoreThem).length;
  const ties = matches.filter((m) => m.scoreUs === m.scoreThem).length;
  const totalMatches = matches.length;
  const winRate = totalMatches > 0 ? Math.round((wins / totalMatches) * 100) : 0;

  const totalPointsUs = matches.reduce((acc, m) => acc + m.scoreUs, 0);
  const totalPointsThem = matches.reduce((acc, m) => acc + m.scoreThem, 0);
  const avgPointsUs = totalMatches > 0 ? (totalPointsUs / totalMatches).toFixed(1) : '0';
  const avgPointsThem = totalMatches > 0 ? (totalPointsThem / totalMatches).toFixed(1) : '0';

  // Pie chart data
  const pieData = [
    { name: 'Victorias (Ganados)', value: wins, color: '#10B981' },
    { name: 'Derrotas (Perdidos)', value: losses, color: '#EF4444' },
    ...(ties > 0 ? [{ name: 'Empates', value: ties, color: '#F59E0B' }] : []),
  ];

  // Bar Chart data for match progression
  const barMatchData = matches.map((m, idx) => ({
    name: m.opponent ? m.opponent.split(' ')[0] : `Rival ${idx + 1}`,
    fullName: m.opponent || `Rival ${idx + 1}`,
    Nuestros: m.scoreUs,
    Rival: m.scoreThem,
    Resultado: m.scoreUs > m.scoreThem ? 'Victoria' : m.scoreUs < m.scoreThem ? 'Derrota' : 'Empate',
  }));

  // 2. CALCULATE TOOL USAGE / ACTIVITY
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

  const getSavedAiCount = (): number => {
    try {
      const saved = localStorage.getItem('coachmind_ai_library');
      if (!saved) return 0;
      const parsed = JSON.parse(saved);
      return Array.isArray(parsed) ? parsed.length : 0;
    } catch {
      return 0;
    }
  };

  const savedPlaysCount = getTacticalPlaysCount();
  const savedAiCount = getSavedAiCount();

  const sectionMetrics = [
    {
      section: 'Ficha Entrenador',
      view: 'coach' as ViewMode,
      icon: User,
      currentCount: (userProfile?.firstName || firstName) ? 1 : 0,
      idealTarget: 1,
      scorePct: (userProfile?.firstName || firstName) ? 100 : 0,
      unit: 'Perfil Oficial',
      description: 'Carnet de entrenador y federación configurados',
      color: 'bg-emerald-500 text-emerald-500',
    },
    {
      section: 'Filosofía',
      view: 'philosophy' as ViewMode,
      icon: BookOpen,
      currentCount: coachPhilosophy ? 1 : 0,
      idealTarget: 1,
      scorePct: coachPhilosophy ? 100 : 0,
      unit: 'Filosofía definida',
      description: 'Principios de juego e ideario táctico para la IA',
      color: 'bg-teal-500 text-teal-500',
    },
    {
      section: 'Plantilla Jugadores',
      view: 'players' as ViewMode,
      icon: Users,
      currentCount: players.length,
      idealTarget: 10,
      scorePct: Math.min(100, Math.round((players.length / 10) * 100)),
      unit: 'Jugadores registrados',
      description: 'Roster completo con características y estadísticas',
      color: 'bg-blue-500 text-blue-500',
    },
    {
      section: 'Entrenamientos',
      view: 'trainings' as ViewMode,
      icon: Dumbbell,
      currentCount: trainings.length,
      idealTarget: 5,
      scorePct: Math.min(100, Math.round((trainings.length / 5) * 100)),
      unit: 'Sesiones creadas',
      description: 'Planes de entrenamiento diseñados con IA',
      color: 'bg-amber-500 text-amber-500',
    },
    {
      section: 'Partidos y Stats',
      view: 'stats' as ViewMode,
      icon: Trophy,
      currentCount: matches.length,
      idealTarget: 5,
      scorePct: Math.min(100, Math.round((matches.length / 5) * 100)),
      unit: 'Partidos analizados',
      description: 'Seguimiento de marcadores y análisis táctico de la IA',
      color: 'bg-purple-500 text-purple-500',
    },
    {
      section: 'Calendario',
      view: 'calendar' as ViewMode,
      icon: Calendar,
      currentCount: calendarEvents.length,
      idealTarget: 4,
      scorePct: Math.min(100, Math.round((calendarEvents.length / 4) * 100)),
      unit: 'Eventos programados',
      description: 'Partidos, entrenamientos y citas en el calendario',
      color: 'bg-indigo-500 text-indigo-500',
    },
    {
      section: 'Pizarra Táctica',
      view: 'whiteboard' as ViewMode,
      icon: Layout,
      currentCount: savedPlaysCount,
      idealTarget: 3,
      scorePct: Math.min(100, Math.round((savedPlaysCount / 3) * 100)),
      unit: 'Jugadas dibujadas',
      description: 'Sistemas y jugadas guardadas en la cancha interactiva',
      color: 'bg-orange-500 text-orange-500',
    },
    {
      section: 'IA Entrenadora',
      view: 'coach-ai' as ViewMode,
      icon: Brain,
      currentCount: savedAiCount,
      idealTarget: 3,
      scorePct: Math.min(100, Math.round((savedAiCount / 3) * 100)),
      unit: 'Consultas guardadas',
      description: 'Consultas tácticas y preparación metodológica en tiempo real',
      color: 'bg-blue-600 text-blue-600',
    },
  ];

  const overallActivityScore = Math.round(
    sectionMetrics.reduce((acc, curr) => acc + curr.scorePct, 0) / sectionMetrics.length
  );

  const radarData = sectionMetrics.map((item) => ({
    subject: item.section,
    Uso: item.scorePct,
    fullMark: 100,
  }));

  return (
    <div className="space-y-8 animate-fadeIn max-w-7xl mx-auto pb-12">
      {/* Top Section Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-600 font-bold shrink-0">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              Ficha & Licencia del Entrenador
            </h1>
            <p className="text-xs text-slate-500">
              Gestión de tu carnet federativo, titulación, trayectoria y balance de competición
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {userProfile ? (
            <span className="px-3 py-1.5 rounded-full bg-emerald-500/10 text-emerald-700 border border-emerald-500/20 font-black text-xs uppercase flex items-center gap-1.5">
              <BadgeCheck className="w-4 h-4 text-emerald-600" />
              Licencia Oficial Verificada
            </span>
          ) : (
            <button
              type="button"
              onClick={onOpenRegisterModal}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-extrabold text-xs shadow-md shadow-amber-500/20 flex items-center gap-1.5 cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              <span>Crear Licencia Oficial Gratis</span>
            </button>
          )}
        </div>
      </div>

      {saveSuccess && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-bold flex items-center gap-3 animate-fadeIn">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>¡Ficha del Entrenador guardada e integrada con éxito en tu perfil!</span>
        </div>
      )}

      {/* MAIN COACH PROFILE CARD SECTION */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-md overflow-hidden">
        {/* Card Header Bar */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 font-bold">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-extrabold text-base tracking-wide text-white">
                Ficha Técnica & Licencia Oficial
              </h2>
              <p className="text-[11px] text-slate-400">
                Información federativa, nivel de estudios y equipo asignado
              </p>
            </div>
          </div>

          {userProfile ? (
            <button
              type="button"
              onClick={() => setIsEditing(!isEditing)}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 font-extrabold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
            >
              <Edit3 className="w-4 h-4" />
              <span>{isEditing ? 'Ver Carnet Oficial' : 'Editar Ficha'}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onOpenFichaLockModal || onOpenRegisterModal}
              className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-xs flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Activar Ficha Oficial</span>
            </button>
          )}
        </div>

        {/* Content Body */}
        {userProfile ? (
          isEditing ? (
            /* FORM / EDIT MODE */
            <form onSubmit={handleSaveProfile} className="p-6 space-y-6">
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-slate-800 text-xs font-semibold flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
                <span>
                  Rellena tus datos para personalizar tu carnet oficial y entrenar a la IA con tu perfil federativo.
                </span>
              </div>

              {/* Photo Selection with Camera, Upload & Gallery options */}
              <div className="space-y-2">
                <label className="block text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Camera className="w-4 h-4 text-amber-500" />
                  <span>Foto Oficial de Licencia del Entrenador</span>
                </label>

                <CoachPhotoSelector
                  currentPhotoUrl={photoUrl}
                  onSelectPhoto={(url) => setPhotoUrl(url)}
                  avatarPresets={avatarPresets}
                />
              </div>

              {/* Name & Age */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Nombre *</label>
                  <input
                    type="text"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="ej. Juan"
                    className="w-full p-3 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Apellidos *</label>
                  <input
                    type="text"
                    required
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="ej. Pérez"
                    className="w-full p-3 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Edad (Años) *</label>
                  <input
                    type="number"
                    required
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    placeholder="ej. 32"
                    className="w-full p-3 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              {/* Season & Team */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Temporada *</label>
                  <input
                    type="text"
                    required
                    value={season}
                    onChange={(e) => setSeason(e.target.value)}
                    placeholder="ej. 2025 - 2026"
                    className="w-full p-3 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Equipo / Club *</label>
                  <input
                    type="text"
                    required
                    value={club}
                    onChange={(e) => setClub(e.target.value)}
                    placeholder="ej. CB Madrid Senior Femenino"
                    className="w-full p-3 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              {/* Coach Level / Studies */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nivel de Entrenador / Estudios de Baloncesto *
                </label>
                <select
                  value={coachLevel}
                  onChange={(e) => setCoachLevel(e.target.value)}
                  className="w-full p-3 rounded-xl border border-slate-200 text-sm font-semibold focus:ring-2 focus:ring-amber-500 bg-white"
                >
                  <option value="Nivel 0">Nivel 0 (Iniciación / Monitor de Iniciación)</option>
                  <option value="Nivel 1">Nivel 1 (Entrenador de Baloncesto de Base / Iniciación)</option>
                  <option value="Nivel 2">Nivel 2 (Entrenador de Baloncesto Territorial / Avanzado)</option>
                  <option value="Nivel Nacional">Nivel Nacional (Entrenador Superior FEB / FIBA Nacional)</option>
                  <option value="Nivel Profesional">Nivel Profesional (Liga ACB / EuroLeague / Profesional)</option>
                </select>
              </div>

              {/* Title Federation & Working Federation */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Federación en la que se ganó el título *
                  </label>
                  <input
                    type="text"
                    required
                    value={titleFederation}
                    onChange={(e) => setTitleFederation(e.target.value)}
                    placeholder="ej. Federación Española de Baloncesto (FEB)"
                    className="w-full p-3 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Federación en la que trabajan actualmente *
                  </label>
                  <input
                    type="text"
                    required
                    value={workFederation}
                    onChange={(e) => setWorkFederation(e.target.value)}
                    placeholder="ej. Federación de Baloncesto de Madrid (FBM)"
                    className="w-full p-3 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-5 py-3 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-8 py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-sm shadow-md shadow-amber-500/20 cursor-pointer flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  <span>Guardar Ficha del Entrenador</span>
                </button>
              </div>
            </form>
          ) : (
            /* OFFICIAL DISPLAY CARD MODE */
            <div className="p-6 sm:p-8">
              <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-2xl p-6 sm:p-8 text-white shadow-2xl border border-slate-700/80">
                {/* Watermark Logo */}
                <div className="absolute right-4 bottom-4 opacity-10 pointer-events-none">
                  <Trophy className="w-48 h-48 text-white" />
                </div>

                <div className="relative z-10 grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                  {/* Photo & Badge Column */}
                  <div className="md:col-span-4 flex flex-col items-center text-center space-y-3 border-b md:border-b-0 md:border-r border-slate-700/80 pb-6 md:pb-0 md:pr-6">
                    <div className="relative">
                      <img
                        src={photoUrl || avatarPresets[0]}
                        alt={fullName}
                        className="w-28 h-28 sm:w-32 sm:h-32 rounded-2xl object-cover border-4 border-amber-500 shadow-xl"
                        onError={(e) => {
                          (e.target as HTMLElement).setAttribute('src', avatarPresets[0]);
                        }}
                      />
                      <div className="absolute -bottom-2 -right-2 bg-amber-500 text-white p-1.5 rounded-xl shadow-md border-2 border-slate-900">
                        <ShieldCheck className="w-5 h-5" />
                      </div>
                    </div>

                    <div>
                      <h3 className="font-extrabold text-xl sm:text-2xl text-white tracking-tight">
                        {fullName}
                      </h3>
                      <p className="text-xs font-bold text-amber-400 mt-0.5">{coachLevel}</p>
                    </div>

                    <span className="px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 font-extrabold text-[11px] tracking-wider uppercase">
                      Temporada {season}
                    </span>
                  </div>

                  {/* Details Column */}
                  <div className="md:col-span-8 space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Item 1: Equipo */}
                      <div className="p-3.5 rounded-xl bg-slate-800/80 border border-slate-700/60 space-y-1">
                        <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5 text-amber-400" />
                          Equipo / Club
                        </span>
                        <p className="font-extrabold text-white text-sm sm:text-base">{club || 'Sin especificar'}</p>
                      </div>

                      {/* Item 2: Edad */}
                      <div className="p-3.5 rounded-xl bg-slate-800/80 border border-slate-700/60 space-y-1">
                        <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-blue-400" />
                          Edad
                        </span>
                        <p className="font-extrabold text-white text-sm sm:text-base">{age ? `${age} Años` : 'Sin especificar'}</p>
                      </div>

                      {/* Item 3: Nivel / Estudios */}
                      <div className="p-3.5 rounded-xl bg-slate-800/80 border border-slate-700/60 space-y-1">
                        <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                          <Award className="w-3.5 h-3.5 text-emerald-400" />
                          Estudios de Baloncesto
                        </span>
                        <p className="font-extrabold text-amber-300 text-sm">{coachLevel}</p>
                      </div>

                      {/* Item 4: Temporada */}
                      <div className="p-3.5 rounded-xl bg-slate-800/80 border border-slate-700/60 space-y-1">
                        <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-purple-400" />
                          Temporada
                        </span>
                        <p className="font-extrabold text-white text-sm">{season}</p>
                      </div>

                      {/* Item 5: Federación donde se ganó el título */}
                      <div className="p-3.5 rounded-xl bg-slate-800/80 border border-slate-700/60 space-y-1 col-span-1 sm:col-span-2">
                        <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-orange-400" />
                          Federación de Título Obtenido
                        </span>
                        <p className="font-bold text-slate-200 text-xs sm:text-sm">{titleFederation || 'Sin especificar'}</p>
                      </div>

                      {/* Item 6: Federación donde trabaja actualmente */}
                      <div className="p-3.5 rounded-xl bg-slate-800/80 border border-slate-700/60 space-y-1 col-span-1 sm:col-span-2">
                        <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                          <Globe className="w-3.5 h-3.5 text-cyan-400" />
                          Federación de Trabajo Actual
                        </span>
                        <p className="font-bold text-slate-200 text-xs sm:text-sm">{workFederation || 'Sin especificar'}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )
        ) : (
          /* UNREGISTERED / NO SUBSCRIPTION PROMO CARD */
          <div className="p-8 text-center space-y-4 bg-slate-50 border-t border-slate-100">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center mx-auto border border-amber-500/20 shadow-sm">
              <Trophy className="w-7 h-7 text-amber-500" />
            </div>
            <div className="max-w-md mx-auto space-y-1.5">
              <h3 className="text-base sm:text-lg font-extrabold text-slate-900">
                No hay ninguna Ficha de Entrenador activada
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
                Regístrate gratis en CoachMind para activar tu carnet oficial con foto, titulación federativa, club de baloncesto y vinculación con la IA.
              </p>
            </div>
            <button
              type="button"
              onClick={onOpenFichaLockModal || onOpenRegisterModal}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-extrabold text-xs sm:text-sm shadow-md shadow-amber-500/20 transition-all cursor-pointer inline-flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              <span>Activar Ficha Oficial de Entrenador</span>
            </button>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* SECTION 1: MATCH RESULTS & AVANCE CHARTS (PARTIDOS GANADOS vs PERDIDOS) */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-md p-6 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 flex items-center justify-center font-bold">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                Evolución & Balance de Partidos
              </h2>
              <p className="text-xs text-slate-500">
                Visualización gráfica de victorias, derrotas y efectividad en la competición
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {totalMatches > 0 && (
              <button
                type="button"
                onClick={() => setIsClearMatchesModalOpen(true)}
                className="px-3.5 py-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>Borrar análisis de partidos</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => onNavigate('stats')}
              className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Registrar Partido</span>
            </button>

            <button
              type="button"
              onClick={() => onNavigate('match-analysis')}
              className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <span>Ir a Análisis Táctico</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Quick Stat Badges */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Partidos Jugados
            </span>
            <div className="text-2xl font-black text-slate-900">{totalMatches}</div>
          </div>

          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 space-y-1">
            <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              Victorias (Ganados)
            </span>
            <div className="text-2xl font-black text-emerald-600">{wins}</div>
          </div>

          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 space-y-1">
            <span className="text-[11px] font-bold text-rose-700 uppercase tracking-wider flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
              Derrotas (Perdidos)
            </span>
            <div className="text-2xl font-black text-rose-600">{losses}</div>
          </div>

          <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 space-y-1">
            <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wider flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5 text-amber-600" />
              Efectividad
            </span>
            <div className="text-2xl font-black text-amber-600">{winRate}%</div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          {/* Pie Chart: Victorias vs Derrotas */}
          <div className="lg:col-span-5 bg-slate-50 rounded-2xl p-4 sm:p-6 border border-slate-200 space-y-3 flex flex-col items-center text-center">
            <h3 className="font-extrabold text-slate-800 text-sm uppercase tracking-wider flex items-center gap-2">
              <PieIcon className="w-4 h-4 text-emerald-600" />
              <span>Proporción Ganados / Perdidos</span>
            </h3>

            <div className="w-full h-56">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0F172A',
                      borderRadius: '12px',
                      color: '#FFF',
                      fontSize: '12px',
                      fontWeight: 'bold',
                      border: 'none',
                    }}
                  />
                  <Legend
                    verticalAlign="bottom"
                    height={36}
                    formatter={(value) => <span className="text-xs font-bold text-slate-700">{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="text-xs text-slate-600 font-semibold bg-white p-2.5 rounded-xl border border-slate-200 w-full flex justify-around">
              <div>
                <span className="block text-[10px] text-slate-400">Media a Favor</span>
                <span className="font-extrabold text-emerald-600 text-sm">{avgPointsUs} pts</span>
              </div>
              <div className="w-px bg-slate-200" />
              <div>
                <span className="block text-[10px] text-slate-400">Media En Contra</span>
                <span className="font-extrabold text-rose-500 text-sm">{avgPointsThem} pts</span>
              </div>
            </div>
          </div>

          {/* Bar Chart: Marcador por Partido */}
          <div className="lg:col-span-7 bg-slate-50 rounded-2xl p-4 sm:p-6 border border-slate-200 space-y-3">
            <h3 className="font-extrabold text-slate-800 text-sm uppercase tracking-wider flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-indigo-600" />
              <span>Puntuación por Partido (Nuestros vs Rival)</span>
            </h3>

            <div className="w-full h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barMatchData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fontWeight: 'bold' }} stroke="#64748B" />
                  <YAxis tick={{ fontSize: 11 }} stroke="#64748B" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0F172A',
                      borderRadius: '12px',
                      color: '#FFF',
                      fontSize: '12px',
                      border: 'none',
                    }}
                  />
                  <Legend
                    wrapperStyle={{ paddingTop: '10px' }}
                    formatter={(value) => <span className="text-xs font-bold text-slate-700">{value}</span>}
                  />
                  <Bar dataKey="Nuestros" fill="#10B981" radius={[6, 6, 0, 0]} name="Puntos Nuestros" />
                  <Bar dataKey="Rival" fill="#EF4444" radius={[6, 6, 0, 0]} name="Puntos Rival" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 2: TOOL USAGE / COACH ACTIVITY CHART (APROVECHAMIENTO DE LA APP)  */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-md p-6 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 flex items-center justify-center font-bold">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                Actividad del Entrenador por Sección
              </h2>
              <p className="text-xs text-slate-500">
                Medidor de uso de CoachMind para aprovechar al 100% todas las funciones de la herramienta
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-3.5 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-700 font-black text-xs flex items-center gap-1.5">
              <Flame className="w-4 h-4 text-amber-500" />
              <span>Aprovechamiento Global: {overallActivityScore}%</span>
            </span>
          </div>
        </div>

        {/* Global Progress Bar */}
        <div className="space-y-2 bg-slate-50 p-4 rounded-xl border border-slate-200">
          <div className="flex justify-between items-center text-xs">
            <span className="font-extrabold text-slate-800 flex items-center gap-1.5">
              <Target className="w-4 h-4 text-amber-500" />
              Nivel de Adopción de la Aplicación
            </span>
            <span className="font-black text-amber-600 text-sm">{overallActivityScore}% / 100%</span>
          </div>

          <div className="w-full bg-slate-200 rounded-full h-3.5 overflow-hidden p-0.5">
            <div
              className="bg-gradient-to-r from-amber-500 via-amber-400 to-emerald-500 h-full rounded-full transition-all duration-1000 shadow-sm"
              style={{ width: `${overallActivityScore}%` }}
            />
          </div>

          <p className="text-[11px] text-slate-500 font-medium pt-1">
            {overallActivityScore >= 80
              ? '🏆 ¡Excelente! Estás utilizando CoachMind como un verdadero Entrenador Profesional.'
              : overallActivityScore >= 50
              ? '⚡ Buen ritmo. Añade más jugadas en la pizarra o entrenamientos para maximizar el rendimiento de tu equipo.'
              : '🚀 Completa las secciones del menú lateral para sacar el máximo partido a tu aplicación.'}
          </p>
        </div>

        {/* Grid layout: Activity Radar Chart & Section List Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          {/* Radar Chart */}
          <div className="lg:col-span-5 bg-slate-900 text-white rounded-2xl p-4 sm:p-6 shadow-xl border border-slate-800 flex flex-col items-center text-center space-y-2">
            <h3 className="font-extrabold text-amber-400 text-xs uppercase tracking-wider flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              Mapa Radial de Uso
            </h3>

            <div className="w-full h-64">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                  <PolarGrid stroke="#334155" />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: '#94A3B8', fontSize: 10, fontWeight: 'bold' }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="#475569" />
                  <Radar
                    name="Nivel de Uso"
                    dataKey="Uso"
                    stroke="#F59E0B"
                    fill="#F59E0B"
                    fillOpacity={0.45}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0F172A',
                      borderRadius: '12px',
                      color: '#FFF',
                      fontSize: '12px',
                      border: '1px solid #334155',
                    }}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Activity Item Cards by Section */}
          <div className="lg:col-span-7 space-y-3">
            <h3 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider text-slate-500">
              Desglose de uso por cada apartado del menú izquierdo:
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {sectionMetrics.map((item) => {
                const IconComponent = item.icon;
                const isComplete = item.scorePct >= 100;

                return (
                  <div
                    key={item.section}
                    className="p-3.5 rounded-xl border border-slate-200 hover:border-amber-300 bg-slate-50/50 hover:bg-white transition-all space-y-2 group"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-7 h-7 rounded-lg ${item.color.split(' ')[0]}/10 flex items-center justify-center font-bold`}
                        >
                          <IconComponent className="w-4 h-4 text-slate-800" />
                        </div>
                        <span className="font-extrabold text-slate-900 text-xs">{item.section}</span>
                      </div>

                      <span
                        className={`text-[10px] font-black px-2 py-0.5 rounded-md ${
                          isComplete ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-900'
                        }`}
                      >
                        {item.scorePct}%
                      </span>
                    </div>

                    {/* Progress Bar for item */}
                    <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          isComplete ? 'bg-emerald-500' : 'bg-amber-500'
                        }`}
                        style={{ width: `${item.scorePct}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-500 pt-0.5">
                      <span>
                        <strong className="text-slate-800">{item.currentCount}</strong> {item.unit}
                      </span>

                      <button
                        type="button"
                        onClick={() => onNavigate(item.view)}
                        className="text-amber-600 hover:text-amber-700 font-bold flex items-center gap-0.5 cursor-pointer opacity-80 group-hover:opacity-100"
                      >
                        <span>Ir</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 3: REVIEWS & VALORACIONES DE ENTRENADORES                         */}
      {/* ========================================================================= */}
      {(() => {
        const sortedReviews = [...reviews].sort((a, b) => {
          const timeA = new Date(a.createdAt).getTime() || 0;
          const timeB = new Date(b.createdAt).getTime() || 0;
          if (timeA !== timeB) return timeB - timeA;
          return b.id.localeCompare(a.id);
        });

        const totalRevCount = sortedReviews.length;
        const sumRevRating = sortedReviews.reduce((acc, r) => acc + r.rating, 0);
        const avgRevRating = totalRevCount > 0 ? (sumRevRating / totalRevCount).toFixed(1) : '5.0';

        const displayedReviews = showAllReviews ? sortedReviews : sortedReviews.slice(0, 4);

        return (
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-md p-6 sm:p-8 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center font-bold">
                  <Star className="w-5 h-5 fill-amber-500" />
                </div>
                <div>
                  <h2 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                    Valoraciones & Reseñas de Entrenadores
                  </h2>
                  <p className="text-xs text-slate-500">
                    Opiniones reales de los entrenadores que utilizan CoachMind
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="px-3.5 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 font-extrabold text-xs flex items-center gap-1.5 shadow-sm">
                  <span className="text-amber-500 text-sm">★</span>
                  <span>{avgRevRating} / 5.0</span>
                  <span className="text-slate-500 font-semibold">({totalRevCount} valoraciones)</span>
                </div>

                <button
                  type="button"
                  onClick={() => setIsReviewModalOpen(true)}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-extrabold text-xs shadow-md shadow-amber-500/20 transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Añadir mi Valoración</span>
                </button>
              </div>
            </div>

            {/* Reviews Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {displayedReviews.map((rev) => (
                <div
                  key={rev.id}
                  className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 hover:border-amber-300 hover:bg-amber-50/20 transition-all flex flex-col justify-between space-y-3 relative group"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`w-3.5 h-3.5 ${
                              star <= rev.rating
                                ? 'text-amber-400 fill-amber-400'
                                : 'text-slate-300'
                            }`}
                          />
                        ))}
                      </div>
                      <span className="text-[10px] font-bold text-slate-400">{rev.createdAt}</span>
                    </div>

                    <p className="text-xs text-slate-700 italic leading-relaxed line-clamp-4">
                      "{rev.comment}"
                    </p>
                  </div>

                  <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px]">
                    <div>
                      <span className="font-extrabold text-slate-900 block">{rev.authorName}</span>
                      <span className="text-slate-500 text-[10px] block font-medium">
                        {rev.club || 'Club Baloncesto'} {rev.role ? `• ${rev.role}` : ''}
                      </span>
                    </div>

                    <span className="w-6 h-6 rounded-full bg-amber-100 text-amber-700 font-extrabold text-[10px] flex items-center justify-center shrink-0">
                      {rev.authorName.charAt(0)}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {sortedReviews.length > 4 && (
              <div className="flex justify-center pt-2">
                <button
                  type="button"
                  onClick={() => setShowAllReviews(!showAllReviews)}
                  className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-amber-50 hover:text-amber-800 text-slate-700 font-extrabold text-xs border border-slate-200 hover:border-amber-300 transition-all cursor-pointer flex items-center gap-2 shadow-sm"
                >
                  {showAllReviews ? (
                    <>
                      <span>Ver menos reseñas</span>
                      <ChevronUp className="w-4 h-4 text-amber-600" />
                    </>
                  ) : (
                    <>
                      <span>Ver más reseñas ({sortedReviews.length - 4} más)</span>
                      <ChevronDown className="w-4 h-4 text-amber-600" />
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        );
      })()}

      {/* Clear Matches Confirmation Modal */}
      {isClearMatchesModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 space-y-4 border border-slate-200 shadow-2xl animate-scaleUp">
            <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="font-extrabold text-slate-900 text-lg">¿Borrar análisis de partidos?</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Esta acción eliminará todos los partidos registrados y restablecerá las gráficas de resultados a cero.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsClearMatchesModalOpen(false)}
                className="py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmClearMatches}
                className="py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-md shadow-red-600/20 cursor-pointer"
              >
                Sí, borrar todo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Review Modal */}
      <ReviewModal
        isOpen={isReviewModalOpen}
        onClose={() => setIsReviewModalOpen(false)}
        userProfile={userProfile}
      />
    </div>
  );
};
