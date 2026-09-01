import React, { useState, useMemo } from 'react';
import {
  Trophy,
  Users,
  CheckCircle2,
  XCircle,
  Calendar,
  Clock,
  MapPin,
  Search,
  Filter,
  ArrowRight,
  TrendingUp,
  ShieldAlert,
  Share2,
  Copy,
  Check,
  CalendarDays,
  Plane,
  Home,
  Award,
  Sparkles,
  Info,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { CalendarEvent, Player, PlayerRole, UserProfile } from '../types';
import { INITIAL_PLAYERS } from '../data/initialData';

interface MatchAttendanceViewProps {
  players: Player[];
  calendarEvents: CalendarEvent[];
  onUpdateCalendarEvent?: (event: CalendarEvent) => void;
  onNavigateToCalendar?: () => void;
  userProfile?: UserProfile | null;
  onOpenTrialModal?: (mode?: 'general_action' | 'ficha_entrenador') => void;
}

const normalizeName = (name: string) =>
  name.replace(/^#?\d+\s*/, '').trim().toLowerCase();

const isPlayerAbsentInMatch = (player: Player, absentList: string[] = []) => {
  const norm = normalizeName(player.name);
  return absentList.some(
    (item) =>
      normalizeName(item) === norm ||
      item.trim().toLowerCase() === player.name.trim().toLowerCase()
  );
};

export const MatchAttendanceView: React.FC<MatchAttendanceViewProps> = ({
  players,
  calendarEvents,
  onUpdateCalendarEvent,
  onNavigateToCalendar,
}) => {
  const [activeTab, setActiveTab] = useState<'matches' | 'players'>('matches');
  const [filterType, setFilterType] = useState<'all' | 'home' | 'away' | 'official' | 'friendly'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [copiedMatchId, setCopiedMatchId] = useState<string | null>(null);
  const [selectedPlayerFilter, setSelectedPlayerFilter] = useState<string | 'all'>('all');
  const [roleFilter, setRoleFilter] = useState<PlayerRole | 'all'>('all');

  const effectivePlayers = useMemo(() => (players && players.length > 0 ? players : INITIAL_PLAYERS), [players]);

  // Filtrar solo eventos de tipo partido u amistoso
  const matchEvents = useMemo(() => {
    return calendarEvents
      .filter((ev) => ev.type === 'match' || ev.type === 'friendly')
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [calendarEvents]);

  // Filtrar según selector y búsqueda
  const filteredMatches = useMemo(() => {
    return matchEvents.filter((ev) => {
      // Filtro de tipo
      if (filterType === 'home' && ev.isHome === false) return false;
      if (filterType === 'away' && ev.isHome !== false) return false;
      if (filterType === 'official' && ev.type !== 'match') return false;
      if (filterType === 'friendly' && ev.type !== 'friendly') return false;

      // Filtro de búsqueda
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const opp = (ev.opponent || '').toLowerCase();
        const tit = (ev.title || '').toLowerCase();
        const loc = (ev.location || '').toLowerCase();
        const dat = (ev.date || '').toLowerCase();
        const matchesQuery = opp.includes(query) || tit.includes(query) || loc.includes(query) || dat.includes(query);
        if (!matchesQuery) return false;
      }

      return true;
    });
  }, [matchEvents, filterType, searchTerm]);

  // Estadísticas globales
  const stats = useMemo(() => {
    const totalMatches = matchEvents.length;
    if (totalMatches === 0 || effectivePlayers.length === 0) {
      return {
        totalMatches: 0,
        averageAttendancePct: 100,
        totalConvocatorias: 0,
        totalBajas: 0,
        homeMatches: 0,
        awayMatches: 0,
      };
    }

    let totalPossibleSlots = totalMatches * effectivePlayers.length;
    let totalBajasCount = 0;

    matchEvents.forEach((m) => {
      const bajas = m.absentPlayers || [];
      effectivePlayers.forEach((p) => {
        if (isPlayerAbsentInMatch(p, bajas)) {
          totalBajasCount++;
        }
      });
    });

    const totalConvocatorias = totalPossibleSlots - totalBajasCount;
    const averageAttendancePct = Math.round((totalConvocatorias / (totalPossibleSlots || 1)) * 100);
    const homeMatches = matchEvents.filter((m) => m.isHome !== false).length;
    const awayMatches = matchEvents.filter((m) => m.isHome === false).length;

    return {
      totalMatches,
      averageAttendancePct,
      totalConvocatorias,
      totalBajas: totalBajasCount,
      homeMatches,
      awayMatches,
    };
  }, [matchEvents, effectivePlayers]);

  // Estadísticas por jugadora
  const playerStatsList = useMemo(() => {
    return effectivePlayers
      .map((p) => {
        const total = matchEvents.length;
        let attended = 0;
        let absent = 0;
        const matchHistory: { match: CalendarEvent; isPresent: boolean }[] = [];

        matchEvents.forEach((m) => {
          const isAbsent = isPlayerAbsentInMatch(p, m.absentPlayers || []);
          if (isAbsent) {
            absent++;
          } else {
            attended++;
          }
          matchHistory.push({ match: m, isPresent: !isAbsent });
        });

        const pct = total > 0 ? Math.round((attended / total) * 100) : 100;

        return {
          player: p,
          totalMatches: total,
          attendedMatches: attended,
          absentMatches: absent,
          attendancePct: pct,
          matchHistory,
        };
      })
      .filter((item) => {
        if (roleFilter !== 'all' && item.player.role !== roleFilter) return false;
        if (searchTerm.trim()) {
          const q = searchTerm.toLowerCase();
          const name = item.player.name.toLowerCase();
          const num = item.player.jerseyNumber.toString();
          return name.includes(q) || num.includes(q);
        }
        return true;
      })
      .sort((a, b) => b.attendancePct - a.attendancePct || b.attendedMatches - a.attendedMatches);
  }, [effectivePlayers, matchEvents, roleFilter, searchTerm]);

  // Toggle rápida de baja / convocada para un partido
  const handleTogglePlayerInMatch = (match: CalendarEvent, player: Player) => {
    if (!onUpdateCalendarEvent) return;

    const currentBajas = match.absentPlayers || [];
    const isCurrentlyAbsent = isPlayerAbsentInMatch(player, currentBajas);
    let newBajas: string[];

    if (isCurrentlyAbsent) {
      // Quitar de bajas -> pasa a convocada
      const norm = normalizeName(player.name);
      newBajas = currentBajas.filter((name) => {
        const cleanCurrent = normalizeName(name);
        return cleanCurrent !== norm && name.trim() !== player.name.trim();
      });
    } else {
      // Añadir a bajas
      newBajas = [...currentBajas, player.name];
    }

    const updatedMatch: CalendarEvent = {
      ...match,
      absentPlayers: newBajas.length > 0 ? newBajas : undefined,
    };

    onUpdateCalendarEvent(updatedMatch);
  };

  // Quitar todas las bajas de un partido
  const handleClearAllMatchBajas = (match: CalendarEvent) => {
    if (!onUpdateCalendarEvent) return;
    const updatedMatch: CalendarEvent = {
      ...match,
      absentPlayers: undefined,
    };
    onUpdateCalendarEvent(updatedMatch);
  };

  // Copiar resumen de convocatoria de partido al portapapeles
  const handleCopyMatchRoster = (match: CalendarEvent) => {
    const isFriendly = match.type === 'friendly';
    const opponent = match.opponent || 'Rival';
    const dateFormatted = match.date;
    const location = match.location || (match.isHome !== false ? 'Pabellón Local' : 'Pabellón Visitante');
    const condition = match.isHome !== false ? '🏠 Local' : '✈️ Visitante';
    const timeStr = match.startTime ? `${match.startTime}h (Cita: ${match.arrivalTime || '--:--'}h)` : '';

    const absentList = match.absentPlayers || [];
    const convocadas: string[] = [];
    const bajas: string[] = [];

    players.forEach((p) => {
      if (isPlayerAbsentInMatch(p, absentList)) {
        bajas.push(`#${p.jerseyNumber} ${p.name.toUpperCase()}`);
      } else {
        convocadas.push(`#${p.jerseyNumber} ${p.name.toUpperCase()}`);
      }
    });

    const text = [
      `🏀 CONVOCATORIA DE PARTIDO | ${isFriendly ? 'AMISTOSO' : 'OFICIAL'}`,
      `🆚 vs ${opponent.toUpperCase()} (${condition})`,
      `📅 Fecha: ${dateFormatted} | ⏰ ${timeStr}`,
      `📍 Lugar: ${location}`,
      ``,
      `🟢 JUGADORAS CONVOCADAS (${convocadas.length}/${players.length}):`,
      convocadas.length > 0 ? convocadas.map((c) => `  ✓ ${c}`).join('\n') : '  (Sin jugadoras)',
      ``,
      `🔴 BAJAS / AUSENCIAS (${bajas.length}):`,
      bajas.length > 0 ? bajas.map((b) => `  ✕ ${b}`).join('\n') : '  ✓ Ninguna baja (Plantilla Completa)',
      ``,
      match.notes ? `📝 Indicaciones: ${match.notes}` : '',
    ].filter(Boolean).join('\n');

    navigator.clipboard.writeText(text);
    setCopiedMatchId(match.id);
    setTimeout(() => setCopiedMatchId(null), 2500);
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Resumen de Métricas Globales */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-black shrink-0">
            <Trophy className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-500 block">Partidos Calendario</span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl font-black text-slate-900">{stats.totalMatches}</span>
              <span className="text-[11px] font-semibold text-slate-400">
                ({stats.homeMatches} 🏠 / {stats.awayMatches} ✈️)
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-black shrink-0">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-500 block">Ratio Asistencia</span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl font-black text-emerald-600">{stats.averageAttendancePct}%</span>
              <span className="text-[11px] font-semibold text-slate-400">promedio</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-black shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-500 block">Convocatorias Totales</span>
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-black text-slate-900">{stats.totalConvocatorias}</span>
              <span className="text-[11px] font-semibold text-emerald-600">asistencias</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center font-black shrink-0">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-500 block">Bajas / Ausencias</span>
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-black text-red-600">{stats.totalBajas}</span>
              <span className="text-[11px] font-semibold text-slate-400">registradas</span>
            </div>
          </div>
        </div>
      </div>

      {/* Controles de Vista y Filtros */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Tabs Internos */}
          <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setActiveTab('matches')}
              className={`px-4 py-2 rounded-lg font-black text-xs transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'matches'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Trophy className="w-4 h-4 text-amber-500" />
              <span>Convocatorias por Partido ({matchEvents.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('players')}
              className={`px-4 py-2 rounded-lg font-black text-xs transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'players'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Users className="w-4 h-4 text-emerald-600" />
              <span>Ranking Asistencia Jugadoras ({players.length})</span>
            </button>
          </div>

          {/* Acciones y Búsqueda */}
          <div className="flex items-center gap-2.5">
            <div className="relative w-full sm:w-60">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={activeTab === 'matches' ? 'Buscar rival o lugar...' : 'Buscar dorsal o jugadora...'}
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 font-medium"
              />
            </div>

            {onNavigateToCalendar && (
              <button
                type="button"
                onClick={onNavigateToCalendar}
                className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs flex items-center gap-1.5 transition-all shadow-sm cursor-pointer shrink-0"
              >
                <CalendarDays className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden sm:inline">Ir al Calendario</span>
              </button>
            )}
          </div>
        </div>

        {/* Filtros de Tipo de Partido o Posición */}
        {activeTab === 'matches' ? (
          <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-100">
            <span className="text-[11px] font-bold text-slate-400 mr-1 flex items-center gap-1">
              <Filter className="w-3 h-3" /> Filtrar:
            </span>
            <button
              type="button"
              onClick={() => setFilterType('all')}
              className={`px-3 py-1 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                filterType === 'all'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Todos ({matchEvents.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterType('home')}
              className={`px-3 py-1 rounded-lg text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1 ${
                filterType === 'home'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <span>🏠 Local</span>
            </button>
            <button
              type="button"
              onClick={() => setFilterType('away')}
              className={`px-3 py-1 rounded-lg text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1 ${
                filterType === 'away'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <span>✈️ Visitante</span>
            </button>
            <button
              type="button"
              onClick={() => setFilterType('official')}
              className={`px-3 py-1 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                filterType === 'official'
                  ? 'bg-purple-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Oficiales
            </button>
            <button
              type="button"
              onClick={() => setFilterType('friendly')}
              className={`px-3 py-1 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                filterType === 'friendly'
                  ? 'bg-amber-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Amistosos
            </button>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-100">
            <span className="text-[11px] font-bold text-slate-400 mr-1 flex items-center gap-1">
              <Filter className="w-3 h-3" /> Posición:
            </span>
            {(['all', 'Base', 'Escolta', 'Alero', 'Ala-Pívot', 'Pívot'] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRoleFilter(r)}
                className={`px-3 py-1 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                  roleFilter === r
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {r === 'all' ? 'Todas' : r}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* PESTAÑA 1: VISTA POR PARTIDO (TARJETAS DE CONVOCATORIA) */}
      {activeTab === 'matches' && (
        <div className="space-y-4">
          {filteredMatches.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-500 flex items-center justify-center mx-auto shadow-inner">
                <Trophy className="w-8 h-8" />
              </div>
              <div className="max-w-md mx-auto space-y-1.5">
                <h3 className="text-base font-extrabold text-slate-900">
                  No hay partidos registrados en el Calendario
                </h3>
                <p className="text-xs text-slate-500">
                  Crea tus partidos oficiales o amistosos en el apartado de <strong>Calendario</strong>. Toda la plantilla quedará convocada automáticamente y podrás marcar ausencias con 1 clic.
                </p>
              </div>
              {onNavigateToCalendar && (
                <button
                  type="button"
                  onClick={onNavigateToCalendar}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs shadow-md transition-all cursor-pointer"
                >
                  Ir al Calendario a crear un partido
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {filteredMatches.map((match) => {
                const isHome = match.isHome !== false;
                const isFriendly = match.type === 'friendly';
                const absentList = match.absentPlayers || [];

                // Separar convocadas y bajas
                const convocadasPlayers = effectivePlayers.filter((p) => !isPlayerAbsentInMatch(p, absentList));
                const bajasPlayers = effectivePlayers.filter((p) => isPlayerAbsentInMatch(p, absentList));

                const attendancePct =
                  effectivePlayers.length > 0 ? Math.round((convocadasPlayers.length / effectivePlayers.length) * 100) : 100;

                const isCopied = copiedMatchId === match.id;

                return (
                  <div
                    key={match.id}
                    className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden transition-all hover:shadow-md"
                  >
                    {/* Cabecera del Partido */}
                    <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-900 via-[#0B132B] to-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1 ${
                              isHome
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                            }`}
                          >
                            {isHome ? <Home className="w-3 h-3" /> : <Plane className="w-3 h-3" />}
                            <span>{isHome ? 'Local 🏠' : 'Visitante ✈️'}</span>
                          </span>

                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            {isFriendly
                              ? 'Amistoso Pretemporada'
                              : `Oficial · ${match.leg ? match.leg.toUpperCase() : 'PARTIDO'}`}
                          </span>

                          <span className="text-xs font-bold text-slate-300 flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            {match.date}
                          </span>

                          {match.startTime && (
                            <span className="text-xs font-bold text-slate-300 flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5 text-slate-400" />
                              {match.startTime}h {match.arrivalTime ? `(Cita: ${match.arrivalTime}h)` : ''}
                            </span>
                          )}
                        </div>

                        <h3 className="text-lg sm:text-xl font-black text-white flex items-center gap-2">
                          <span>vs {match.opponent || match.title || 'Rival'}</span>
                        </h3>

                        {match.location && (
                          <p className="text-xs text-slate-300 flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                            <span>{match.location}</span>
                          </p>
                        )}
                      </div>

                      {/* Botón copiar y Ratio */}
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleCopyMatchRoster(match)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition-all cursor-pointer ${
                            isCopied
                              ? 'bg-emerald-600 text-white'
                              : 'bg-white/10 hover:bg-white/20 text-white'
                          }`}
                          title="Copiar lista de convocadas y bajas para WhatsApp"
                        >
                          {isCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>{isCopied ? '¡Copiado!' : 'Copiar Convocatoria'}</span>
                        </button>

                        <div className="text-right pl-2 border-l border-white/10">
                          <span className="text-[10px] uppercase font-extrabold text-slate-400 block">
                            Asistencia
                          </span>
                          <span
                            className={`text-base font-black ${
                              attendancePct >= 80 ? 'text-emerald-400' : 'text-amber-400'
                            }`}
                          >
                            {attendancePct}%
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Cuerpo: Roster Interactivo (Convocadas y Bajas) */}
                    <div className="p-4 sm:p-5 space-y-4">
                      {/* Instrucción rápida */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-200/60">
                        <div className="flex items-center gap-2 text-slate-600">
                          <Info className="w-4 h-4 text-blue-500 shrink-0" />
                          <span>
                            Haz clic en cualquier jugadora para cambiar su estado entre <strong>Convocada (🟢)</strong> y <strong>Baja (🔴)</strong>.
                          </span>
                        </div>

                        {bajasPlayers.length > 0 && (
                          <button
                            type="button"
                            onClick={() => handleClearAllMatchBajas(match)}
                            className="text-emerald-700 hover:text-emerald-900 font-extrabold text-xs underline cursor-pointer shrink-0 self-start sm:self-auto"
                          >
                            Quitar todas las bajas (Juegan todas)
                          </button>
                        )}
                      </div>

                      {/* Sección de Convocadas */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-black uppercase text-emerald-800 flex items-center gap-1.5">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            <span>
                              Jugadoras Convocadas / Asistentes ({convocadasPlayers.length}/{players.length}):
                            </span>
                          </h4>
                          <span className="text-[11px] font-bold text-slate-400">
                            🟢 Convocadas para el partido
                          </span>
                        </div>

                        {convocadasPlayers.length === 0 ? (
                          <p className="text-xs text-slate-400 italic p-3 bg-slate-50 rounded-xl">
                            No hay jugadoras convocadas en este partido.
                          </p>
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            {convocadasPlayers.map((p) => (
                              <button
                                key={p.id}
                                type="button"
                                onClick={() => handleTogglePlayerInMatch(match, p)}
                                className="group px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200/80 font-black text-xs flex items-center gap-1.5 transition-all shadow-xs cursor-pointer hover:border-emerald-300"
                                title="Clic para marcar como BAJA"
                              >
                                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                                <span>#{p.jerseyNumber} {p.name}</span>
                                <span className="text-[10px] text-emerald-700 font-semibold opacity-70 group-hover:opacity-100">
                                  ({p.role})
                                </span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Sección de Bajas */}
                      <div className="space-y-2 pt-2 border-t border-slate-100">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-black uppercase text-red-800 flex items-center gap-1.5">
                            <ShieldAlert className="w-4 h-4 text-red-600" />
                            <span>
                              Jugadoras Bajas / Lesionadas ({bajasPlayers.length}):
                            </span>
                          </h4>
                          <span className="text-[11px] font-bold text-slate-400">
                            🔴 No asisten al partido
                          </span>
                        </div>

                        {bajasPlayers.length === 0 ? (
                          <div className="p-2.5 rounded-xl bg-emerald-50/60 border border-emerald-100 text-emerald-800 text-xs font-bold flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            <span>¡Excelente! No hay ninguna baja registrada para este partido. Toda la plantilla asiste.</span>
                          </div>
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            {bajasPlayers.map((p) => (
                              <button
                                key={p.id}
                                type="button"
                                onClick={() => handleTogglePlayerInMatch(match, p)}
                                className="px-3 py-1.5 rounded-xl bg-red-100/90 hover:bg-red-200 text-red-900 border border-red-300 font-black text-xs flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
                                title="Clic para reactivar como CONVOCADA"
                              >
                                <span className="w-2 h-2 rounded-full bg-red-600" />
                                <span>#{p.jerseyNumber} {p.name}</span>
                                <span className="text-[10px] bg-red-800 text-white px-1.5 py-0.2 rounded font-extrabold">
                                  BAJA ✕
                                </span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Notas de partido */}
                      {match.notes && (
                        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 space-y-1">
                          <span className="font-extrabold text-slate-800 block">Notas del Entrenador:</span>
                          <p className="text-slate-600 leading-relaxed">{match.notes}</p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* PESTAÑA 2: RANKING Y ESTADÍSTICAS POR JUGADORA */}
      {activeTab === 'players' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {playerStatsList.map(({ player, totalMatches, attendedMatches, absentMatches, attendancePct, matchHistory }) => {
              const isHigh = attendancePct >= 80;
              const isMid = attendancePct >= 60 && attendancePct < 80;

              return (
                <div
                  key={player.id}
                  className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition-all space-y-4"
                >
                  {/* Fila superior con Jugadora y Ratio */}
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-slate-900 text-amber-400 font-black text-lg flex items-center justify-center shadow-md shrink-0">
                        #{player.jerseyNumber}
                      </div>
                      <div>
                        <h4 className="text-base font-black text-slate-900 capitalize">
                          {player.name}
                        </h4>
                        <span className="text-xs font-bold text-slate-500">
                          {player.role} · {player.heightCm} cm
                        </span>
                      </div>
                    </div>

                    <div className="text-right">
                      <span
                        className={`text-2xl font-black ${
                          isHigh ? 'text-emerald-600' : isMid ? 'text-amber-600' : 'text-red-600'
                        }`}
                      >
                        {attendancePct}%
                      </span>
                      <span className="text-[11px] font-bold text-slate-400 block">
                        Asistencia a Partidos
                      </span>
                    </div>
                  </div>

                  {/* Barra de Progreso */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs font-bold">
                      <span className="text-emerald-700 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        {attendedMatches} {attendedMatches === 1 ? 'partido jugado' : 'partidos jugados'}
                      </span>
                      <span className="text-red-700 flex items-center gap-1">
                        <XCircle className="w-3.5 h-3.5 text-red-600" />
                        {absentMatches} {absentMatches === 1 ? 'baja' : 'bajas'}
                      </span>
                    </div>

                    <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden flex">
                      <div
                        className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                        style={{ width: `${attendancePct}%` }}
                      />
                      <div
                        className="bg-red-400 h-full transition-all duration-500"
                        style={{ width: `${100 - attendancePct}%` }}
                      />
                    </div>
                  </div>

                  {/* Historial de Últimos Partidos */}
                  <div className="space-y-2 pt-2 border-t border-slate-100">
                    <span className="text-[11px] font-extrabold uppercase text-slate-500 block">
                      Historial de Partidos:
                    </span>

                    {matchHistory.length === 0 ? (
                      <p className="text-xs text-slate-400 italic">No hay partidos en el calendario.</p>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {matchHistory.map(({ match, isPresent }, idx) => (
                          <span
                            key={idx}
                            className={`px-2 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 border ${
                              isPresent
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                : 'bg-red-50 text-red-800 border-red-200'
                            }`}
                            title={`${isPresent ? 'Convocada' : 'Baja'} vs ${match.opponent || 'Rival'} (${match.date})`}
                          >
                            <span>{isPresent ? '🟢' : '🔴'}</span>
                            <span>vs {match.opponent || 'Rival'}</span>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
