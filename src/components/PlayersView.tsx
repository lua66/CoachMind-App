import React, { useState } from 'react';
import {
  Users,
  Target,
  Plus,
  Search,
  Trash2,
  X,
  BarChart3,
  ArrowLeft,
  UserPlus,
  ChevronRight,
  Pencil,
  CalendarDays,
  LayoutGrid,
  ListFilter,
  CheckCircle2,
  Trophy,
} from 'lucide-react';
import { CalendarEvent, Player, PlayerRole, UserProfile } from '../types';
import { INITIAL_PLAYERS } from '../data/initialData';
import { PlayerAttendanceView } from './PlayerAttendanceView';
import { MatchAttendanceView } from './MatchAttendanceView';

interface PlayersViewProps {
  players: Player[];
  calendarEvents?: CalendarEvent[];
  onAddPlayer?: (player: Player) => void;
  onDeletePlayer?: (id: string) => void;
  onUpdatePlayer?: (player: Player) => void;
  onUpdateCalendarEvent?: (event: CalendarEvent) => void;
  onNavigateToStats?: () => void;
  onNavigateToCalendar?: () => void;
  userProfile?: UserProfile | null;
  onOpenTrialModal?: (mode?: 'general_action' | 'ficha_entrenador') => void;
}

// Configuración de visualización por rol de juego
const ROLE_CONFIG: Record<
  PlayerRole,
  {
    title: string;
    code: string;
    subtitle: string;
    icon: string;
    colorBg: string;
    colorText: string;
    badgeBg: string;
    cardBorder: string;
    hoverBorder: string;
    accentBg: string;
  }
> = {
  Base: {
    title: 'Bases',
    code: '1',
    subtitle: 'Directoras de juego, ritmo de partido, visión de pase y organización táctica',
    icon: '🏀',
    colorBg: 'bg-emerald-600',
    colorText: 'text-emerald-700',
    badgeBg: 'bg-emerald-100 text-emerald-800',
    cardBorder: 'border-emerald-200',
    hoverBorder: 'hover:border-emerald-500',
    accentBg: 'bg-emerald-50/60',
  },
  Escolta: {
    title: 'Escoltas',
    code: '2',
    subtitle: 'Tiradoras exteriores, penetración tras bote y presión defensiva en perímetro',
    icon: '🎯',
    colorBg: 'bg-blue-600',
    colorText: 'text-blue-700',
    badgeBg: 'bg-blue-100 text-blue-800',
    cardBorder: 'border-blue-200',
    hoverBorder: 'hover:border-blue-500',
    accentBg: 'bg-blue-50/60',
  },
  Alero: {
    title: 'Aleros',
    code: '3',
    subtitle: 'Polivalencia física exterior, rebote en carrera y versatilidad anotadora',
    icon: '⚡',
    colorBg: 'bg-purple-600',
    colorText: 'text-purple-700',
    badgeBg: 'bg-purple-100 text-purple-800',
    cardBorder: 'border-purple-200',
    hoverBorder: 'hover:border-purple-500',
    accentBg: 'bg-purple-50/60',
  },
  'Ala-Pívot': {
    title: 'Ala-Pívots',
    code: '4',
    subtitle: 'Juego interior móvil, Pick & Pop, presencia física y rebote',
    icon: '💪',
    colorBg: 'bg-amber-600',
    colorText: 'text-amber-700',
    badgeBg: 'bg-amber-100 text-amber-800',
    cardBorder: 'border-amber-200',
    hoverBorder: 'hover:border-amber-500',
    accentBg: 'bg-amber-50/60',
  },
  Pívot: {
    title: 'Pívots',
    code: '5',
    subtitle: 'Referentes en zona baja, juego de espaldas al aro, rebote y tapones',
    icon: '🛡️',
    colorBg: 'bg-rose-600',
    colorText: 'text-rose-700',
    badgeBg: 'bg-rose-100 text-rose-800',
    cardBorder: 'border-rose-200',
    hoverBorder: 'hover:border-rose-500',
    accentBg: 'bg-rose-50/60',
  },
};

const ROLES_ORDER: PlayerRole[] = ['Base', 'Escolta', 'Alero', 'Ala-Pívot', 'Pívot'];

export const PlayersView: React.FC<PlayersViewProps> = ({
  players,
  calendarEvents = [],
  onAddPlayer,
  onDeletePlayer,
  onUpdatePlayer,
  onUpdateCalendarEvent,
  onNavigateToStats,
  onNavigateToCalendar,
  userProfile,
  onOpenTrialModal,
}) => {
  const effectivePlayers = players && players.length > 0 ? players : INITIAL_PLAYERS;
  const [activeMainTab, setActiveMainTab] = useState<'roles' | 'attendance' | 'match_attendance' | 'roster'>('roles');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState<PlayerRole | null>(null);

  const matchEventsCount = calendarEvents.filter(
    (ev) => ev.type === 'match' || ev.type === 'friendly'
  ).length;

  // Modal Add Player
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [modalRole, setModalRole] = useState<PlayerRole>('Base');
  const [name, setName] = useState('');
  const [jerseyNumber, setJerseyNumber] = useState<number | ''>('');
  const [heightCm, setHeightCm] = useState<number | ''>('');
  const [strengthsText, setStrengthsText] = useState('');
  const [improvementsText, setImprovementsText] = useState('');

  // Modal Edit Player
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
  const [editName, setEditName] = useState('');
  const [editJerseyNumber, setEditJerseyNumber] = useState<number | ''>('');
  const [editRole, setEditRole] = useState<PlayerRole>('Base');
  const [editHeightCm, setEditHeightCm] = useState<number | ''>('');
  const [editAttendancePct, setEditAttendancePct] = useState<number | ''>('');
  const [editStrengthsText, setEditStrengthsText] = useState('');
  const [editImprovementsText, setEditImprovementsText] = useState('');
  const [editPpg, setEditPpg] = useState<number | ''>('');
  const [editRpg, setEditRpg] = useState<number | ''>('');
  const [editApg, setEditApg] = useState<number | ''>('');

  // Delete modal
  const [playerToDelete, setPlayerToDelete] = useState<Player | null>(null);

  const handleSelectRole = (role: PlayerRole) => {
    setSelectedRole(role);
    setActiveMainTab('roles');
  };

  const handleBackToDashboard = () => {
    setSelectedRole(null);
  };

  const handleOpenAddModal = (defaultRole?: PlayerRole) => {
    if (!userProfile) {
      if (onOpenTrialModal) onOpenTrialModal('general_action');
      return;
    }
    if (defaultRole) {
      setModalRole(defaultRole);
    } else if (selectedRole) {
      setModalRole(selectedRole);
    }
    setName('');
    setJerseyNumber('');
    setHeightCm('');
    setStrengthsText('');
    setImprovementsText('');
    setIsAddModalOpen(true);
  };

  const handleOpenEditModal = (player: Player) => {
    if (!userProfile) {
      if (onOpenTrialModal) onOpenTrialModal('general_action');
      return;
    }
    setEditingPlayer(player);
    setEditName(player.name);
    setEditJerseyNumber(player.jerseyNumber);
    setEditRole(player.role);
    setEditHeightCm(player.heightCm ?? 175);
    setEditAttendancePct(player.attendancePct ?? 95);
    setEditStrengthsText((player.strengths || []).join(', '));
    setEditImprovementsText((player.areasToImprove || []).join(', '));
    setEditPpg(player.stats?.pointsPerGame ?? 0);
    setEditRpg(player.stats?.reboundsPerGame ?? 0);
    setEditApg(player.stats?.assistsPerGame ?? 0);
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || jerseyNumber === '') return;

    const strengthsList = strengthsText
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    const improvementsList = improvementsText
      .split(',')
      .map((i) => i.trim())
      .filter((i) => i.length > 0);

    const newPlayer: Player = {
      id: `pl-${Date.now()}`,
      name: name.trim().toLowerCase(),
      jerseyNumber: Number(jerseyNumber),
      role: modalRole,
      heightCm: heightCm !== '' ? Number(heightCm) : 175,
      attendancePct: 100,
      stats: {
        pointsPerGame: 0,
        reboundsPerGame: 0,
        assistsPerGame: 0,
        stealsPerGame: 0,
        turnoversPerGame: 0,
        fieldGoalPct: 0,
        threePointPct: 0,
        freeThrowPct: 0,
      },
      strengths: strengthsList.length > 0 ? strengthsList : ['Compromiso', 'Lectura táctica'],
      areasToImprove: improvementsList.length > 0 ? improvementsList : ['Técnica individual'],
    };

    if (onAddPlayer) {
      onAddPlayer(newPlayer);
    }

    // Auto-select role created if on dashboard
    if (!selectedRole) {
      setSelectedRole(modalRole);
    }

    setIsAddModalOpen(false);
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPlayer || !editName.trim() || editJerseyNumber === '') return;

    const strengthsList = editStrengthsText
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    const improvementsList = editImprovementsText
      .split(',')
      .map((i) => i.trim())
      .filter((i) => i.length > 0);

    const updatedPlayer: Player = {
      ...editingPlayer,
      name: editName.trim().toLowerCase(),
      jerseyNumber: Number(editJerseyNumber),
      role: editRole,
      heightCm: editHeightCm !== '' ? Number(editHeightCm) : 175,
      attendancePct: editAttendancePct !== '' ? Number(editAttendancePct) : 95,
      strengths: strengthsList,
      areasToImprove: improvementsList,
      stats: {
        ...editingPlayer.stats,
        pointsPerGame: editPpg !== '' ? Number(editPpg) : 0,
        reboundsPerGame: editRpg !== '' ? Number(editRpg) : 0,
        assistsPerGame: editApg !== '' ? Number(editApg) : 0,
      },
    };

    if (onUpdatePlayer) {
      onUpdatePlayer(updatedPlayer);
    }

    setEditingPlayer(null);
  };

  const filterMatchesSearch = (p: Player) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const cleanTerm = term.startsWith('#') ? term.slice(1) : term;

    const nameNormalized = (p.name || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const jerseyStr = (p.jerseyNumber !== undefined && p.jerseyNumber !== null) ? p.jerseyNumber.toString() : '';

    return nameNormalized.includes(cleanTerm) || jerseyStr.includes(cleanTerm);
  };

  return (
    <div className="space-y-6 animate-fadeIn max-w-6xl mx-auto pb-12">
      {/* Header Panel with Main Tabs */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-lg shadow-emerald-600/20 shrink-0">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                {activeMainTab === 'attendance'
                  ? 'Control de Asistencia Diaria'
                  : activeMainTab === 'match_attendance'
                  ? 'Control de Asistencia a Partidos'
                  : activeMainTab === 'roster'
                  ? 'Plantilla Completa del Equipo'
                  : selectedRole
                  ? `Tarjetas de ${ROLE_CONFIG[selectedRole].title}`
                  : 'Plantilla por Rol de Juego'}
              </h1>
              <p className="text-xs font-semibold text-slate-500">
                {activeMainTab === 'attendance'
                  ? 'Pasa asistencia diaria, registra justificaciones y analiza ratios acumulados'
                  : activeMainTab === 'match_attendance'
                  ? 'Convocatorias y bajas sincronizadas con los partidos del calendario (Local y Visitante)'
                  : activeMainTab === 'roster'
                  ? 'Listado general con dorsales, roles, promedios y porcentajes de asistencia'
                  : selectedRole
                  ? `Mostrando únicamente las jugadoras clasificadas como ${selectedRole}`
                  : 'Selecciona una tarjeta para ver, editar y gestionar sus jugadoras'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {selectedRole && activeMainTab === 'roles' ? (
              <button
                type="button"
                onClick={handleBackToDashboard}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs shadow-md transition-all cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Volver a Tarjetas</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleOpenAddModal('Base')}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-md shadow-emerald-600/20 transition-all hover:scale-[1.02] cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Añadir Jugadora</span>
              </button>
            )}

            {onNavigateToStats && (
              <button
                type="button"
                onClick={onNavigateToStats}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
              >
                <BarChart3 className="w-4 h-4" />
                <span className="hidden sm:inline">Ver Estadísticas</span>
              </button>
            )}
          </div>
        </div>

        {/* Top View Selector Tabs */}
        <div className="flex items-center gap-2 pt-3 border-t border-slate-100 overflow-x-auto pb-1 sm:pb-0">
          <button
            type="button"
            onClick={() => {
              setActiveMainTab('roles');
              setSelectedRole(null);
            }}
            className={`px-4 py-2.5 rounded-xl font-black text-xs transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
              activeMainTab === 'roles'
                ? 'bg-slate-900 text-white shadow-md'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
            }`}
          >
            <LayoutGrid className="w-4 h-4" />
            <span>Tarjetas por Posición (5)</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveMainTab('attendance');
              setSelectedRole(null);
            }}
            className={`px-4 py-2.5 rounded-xl font-black text-xs transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
              activeMainTab === 'attendance'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
            }`}
          >
            <CalendarDays className="w-4 h-4" />
            <span>Control de Asistencia Diaria</span>
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-emerald-500/30 text-white font-extrabold">
              Nuevo
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveMainTab('match_attendance');
              setSelectedRole(null);
            }}
            className={`px-4 py-2.5 rounded-xl font-black text-xs transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
              activeMainTab === 'match_attendance'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
            }`}
          >
            <Trophy className="w-4 h-4 text-amber-400" />
            <span>Asistencias a Partidos</span>
            <span
              className={`px-1.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                activeMainTab === 'match_attendance'
                  ? 'bg-blue-500/30 text-white'
                  : 'bg-slate-200 text-slate-700'
              }`}
            >
              {matchEventsCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveMainTab('roster');
              setSelectedRole(null);
            }}
            className={`px-4 py-2.5 rounded-xl font-black text-xs transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
              activeMainTab === 'roster'
                ? 'bg-slate-900 text-white shadow-md'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
            }`}
          >
            <ListFilter className="w-4 h-4" />
            <span>Plantilla Completa ({effectivePlayers.length})</span>
          </button>
        </div>
      </div>

      {/* SUB-VIEW 1: ASISTENCIA DIARIA */}
      {activeMainTab === 'attendance' && (
        <PlayerAttendanceView
          players={effectivePlayers}
          onUpdatePlayer={onUpdatePlayer}
          userProfile={userProfile}
          onOpenTrialModal={onOpenTrialModal}
        />
      )}

      {/* SUB-VIEW 2: ASISTENCIA A PARTIDOS */}
      {activeMainTab === 'match_attendance' && (
        <MatchAttendanceView
          players={effectivePlayers}
          calendarEvents={calendarEvents}
          onUpdateCalendarEvent={onUpdateCalendarEvent}
          onNavigateToCalendar={onNavigateToCalendar}
          userProfile={userProfile}
          onOpenTrialModal={onOpenTrialModal}
        />
      )}

      {/* SUB-VIEW 2: PLANTILLA COMPLETA */}
      {activeMainTab === 'roster' && (
        <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por dorsal o nombre..."
                className="w-full pl-9 pr-8 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20 font-medium"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 p-0.5 rounded-full hover:bg-slate-200 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={() => handleOpenAddModal('Base')}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Añadir Jugadora</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 font-black uppercase text-[10px] tracking-wider">
                  <th className="pb-3 px-3">Dorsal</th>
                  <th className="pb-3 px-3">Nombre</th>
                  <th className="pb-3 px-3">Posición</th>
                  <th className="pb-3 px-3">Altura</th>
                  <th className="pb-3 px-3 text-center">Asistencia (%)</th>
                  <th className="pb-3 px-3">Promedios</th>
                  <th className="pb-3 px-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {effectivePlayers.filter(filterMatchesSearch).length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-slate-400 font-medium">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Users className="w-8 h-8 text-slate-300 stroke-[1.5]" />
                        <p className="text-xs font-bold text-slate-600">
                          {searchTerm ? 'No se encontraron jugadoras con ese criterio' : 'Aún no hay jugadoras registradas en tu plantilla'}
                        </p>
                        {!searchTerm && (
                          <button
                            type="button"
                            onClick={() => handleOpenAddModal('Base')}
                            className="mt-1 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-black cursor-pointer transition-colors"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            Añadir la primera jugadora
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  effectivePlayers.filter(filterMatchesSearch).map((p) => {
                    const cfg = ROLE_CONFIG[p.role];
                    return (
                      <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 px-3">
                          <span className={`w-8 h-8 rounded-xl ${cfg.colorBg} text-white font-black text-xs flex items-center justify-center shadow-xs`}>
                            #{p.jerseyNumber}
                          </span>
                        </td>
                        <td className="py-3.5 px-3 font-extrabold text-slate-900 capitalize">
                          {p.name}
                        </td>
                        <td className="py-3.5 px-3">
                          <span className={`px-2 py-0.5 rounded-md font-bold text-[11px] ${cfg.badgeBg}`}>
                            {p.role}
                          </span>
                        </td>
                        <td className="py-3.5 px-3 font-semibold text-slate-600">
                          {p.heightCm ? `${p.heightCm} cm` : '175 cm'}
                        </td>
                        <td className="py-3.5 px-3 text-center">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full font-black text-[11px] ${
                            (p.attendancePct ?? 95) >= 90
                              ? 'bg-emerald-100 text-emerald-800'
                              : (p.attendancePct ?? 95) >= 75
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}>
                            {p.attendancePct ?? 95}%
                          </span>
                        </td>
                        <td className="py-3.5 px-3 font-bold text-slate-700">
                          {p.stats?.pointsPerGame ?? 0} PPG · {p.stats?.reboundsPerGame ?? 0} RPG
                        </td>
                        <td className="py-3.5 px-3 text-right">
                          <div className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleOpenEditModal(p)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors cursor-pointer"
                              title="Editar"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setPlayerToDelete(p)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                              title="Eliminar"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUB-VIEW 3: ROLES Y TARJETAS */}
      {activeMainTab === 'roles' && !selectedRole && (
        <div className="space-y-6">
          {/* Search Bar on Dashboard */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
            <div className="text-xs font-bold text-slate-600">
              Presiona en una posición para abrir su tarjeta individual:
            </div>

            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar jugadora por nombre o dorsal..."
                className="w-full pl-9 pr-8 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20 font-medium"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 transition-colors p-0.5 rounded-full hover:bg-slate-200 cursor-pointer"
                  title="Limpiar búsqueda"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* GRID DE 5 TARJETAS CUADRADAS */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5 sm:gap-4">
            {ROLES_ORDER.map((roleKey) => {
              const config = ROLE_CONFIG[roleKey];
              const totalRolePlayers = effectivePlayers.filter((p) => p.role === roleKey);
              const matchedRolePlayers = totalRolePlayers.filter(filterMatchesSearch);
              const isSearching = searchTerm.trim().length > 0;

              return (
                <button
                  key={roleKey}
                  onClick={() => handleSelectRole(roleKey)}
                  className={`p-4 sm:p-5 rounded-2xl border bg-white ${config.cardBorder} ${config.hoverBorder} hover:shadow-lg hover:-translate-y-0.5 transition-all cursor-pointer text-left relative flex flex-col justify-between aspect-square group shadow-xs`}
                >
                  {/* Top Row: Icon + Arrow Indicator */}
                  <div className="flex items-center justify-between w-full">
                    <div
                      className={`w-11 h-11 sm:w-12 sm:h-12 rounded-2xl ${config.colorBg} text-white flex items-center justify-center text-xl sm:text-2xl shadow-md transition-transform group-hover:scale-110`}
                    >
                      {config.icon}
                    </div>
                    <div className="w-8 h-8 rounded-xl bg-slate-100 group-hover:bg-slate-900 group-hover:text-white text-slate-600 flex items-center justify-center transition-all shadow-2xs">
                      <ChevronRight className="w-4 h-4" />
                    </div>
                  </div>

                  {/* Middle: Title & Count */}
                  <div className="mt-3 space-y-1">
                    <div className="text-[11px] font-black text-slate-400 uppercase tracking-wider">
                      Posición {config.code}
                    </div>
                    <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight leading-snug group-hover:text-emerald-700 transition-colors">
                      {config.title}
                    </h3>
                    <div className="pt-1">
                      {isSearching ? (
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-extrabold ${
                            matchedRolePlayers.length > 0
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          {matchedRolePlayers.length} {matchedRolePlayers.length === 1 ? 'coincidencia' : 'coincidencias'}
                        </span>
                      ) : (
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-extrabold ${config.badgeBg}`}
                        >
                          {totalRolePlayers.length} {totalRolePlayers.length === 1 ? 'jugadora' : 'jugadoras'}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Bottom Action Hint */}
                  <div className="pt-2 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1 group-hover:text-slate-800 transition-colors">
                    <span>Toca para abrir tarjeta</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* VISTA 2: TARJETA SELECCIONADA Y ABIERTA (DESAPARECEN LAS DEMÁS TARJETAS) */}
      {activeMainTab === 'roles' && selectedRole && (
        <div className="space-y-6 animate-in fade-in zoom-in-95 duration-200">
          {/* Top Bar with Role Pills Navigation + Search */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
            {/* Quick Role Switcher Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto custom-scrollbar pb-1 md:pb-0">
              <button
                onClick={handleBackToDashboard}
                className="px-3.5 py-2 rounded-xl bg-slate-900 text-white font-extrabold text-xs flex items-center gap-1.5 shrink-0 hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Volver al Panel</span>
              </button>

              <div className="h-4 w-px bg-slate-200 mx-1 shrink-0" />

              {ROLES_ORDER.map((roleKey) => {
                const config = ROLE_CONFIG[roleKey];
                const count = effectivePlayers.filter((p) => p.role === roleKey).length;
                const isSelected = selectedRole === roleKey;

                return (
                  <button
                    key={roleKey}
                    onClick={() => setSelectedRole(roleKey)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                      isSelected
                        ? `${config.colorBg} text-white shadow-xs`
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    <span>{config.icon}</span>
                    <span>{roleKey}</span>
                    <span
                      className={`px-1.5 py-0.2 text-[10px] rounded-full ${
                        isSelected ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Search Input inside Opened Role */}
            <div className="relative w-full md:w-64 shrink-0">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={`Buscar en ${selectedRole}...`}
                className="w-full pl-9 pr-8 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20 font-medium"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 transition-colors p-0.5 rounded-full hover:bg-slate-200 cursor-pointer"
                  title="Limpiar búsqueda"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* DETALLE COMPLETO DE LA TARJETA SELECCIONADA */}
          {(() => {
            const config = ROLE_CONFIG[selectedRole];
            const rolePlayers = effectivePlayers
              .filter((p) => p.role === selectedRole)
              .filter(filterMatchesSearch);

            return (
              <div
                className={`bg-white rounded-2xl border ${config.cardBorder} shadow-md overflow-hidden space-y-6`}
              >
                {/* Header Banner del Rol */}
                <div className="p-5 sm:p-6 bg-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800">
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-12 h-12 rounded-2xl ${config.colorBg} text-white flex items-center justify-center text-2xl shadow-lg shrink-0`}
                    >
                      {config.icon}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-xl font-black tracking-tight text-white">
                          Tarjetas de {config.title}
                        </h2>
                        <span
                          className={`text-xs font-black px-2.5 py-0.5 rounded-full ${config.badgeBg}`}
                        >
                          Posición {config.code}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 font-medium mt-1">
                        {config.subtitle}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <button
                      onClick={() => handleOpenAddModal(selectedRole)}
                      className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl ${config.colorBg} hover:opacity-90 text-white font-extrabold text-xs shadow-md transition-transform active:scale-95 cursor-pointer shrink-0`}
                    >
                      <UserPlus className="w-4 h-4" />
                      <span>Añadir {selectedRole}</span>
                    </button>

                    <button
                      onClick={handleBackToDashboard}
                      className="px-3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold text-xs transition-colors cursor-pointer flex items-center gap-1.5"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      <span>Volver</span>
                    </button>
                  </div>
                </div>

                {/* Grid de Jugadoras en esta tarjeta */}
                <div className="p-5 sm:p-6 pt-0">
                  {rolePlayers.length === 0 ? (
                    <div className="py-12 text-center border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50 space-y-3">
                      <div className="w-12 h-12 rounded-full bg-slate-200/80 text-slate-500 flex items-center justify-center mx-auto text-xl">
                        {config.icon}
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm font-extrabold text-slate-800">
                          No hay jugadoras registradas como {selectedRole}
                        </p>
                        <p className="text-xs text-slate-500 font-medium max-w-sm mx-auto">
                          {searchTerm
                            ? `Ninguna jugadora coincide con "${searchTerm}".`
                            : `Añade a tu primera ${selectedRole} para controlar su perfil y desarrollo.`}
                        </p>
                      </div>
                      <button
                        onClick={() => handleOpenAddModal(selectedRole)}
                        className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-white font-extrabold text-xs shadow-md transition-all cursor-pointer ${config.colorBg}`}
                      >
                        <Plus className="w-4 h-4" />
                        <span>Registrar primera {selectedRole}</span>
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {rolePlayers.map((player) => (
                        <div
                          key={player.id}
                          className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs hover:shadow-md transition-all space-y-4 relative group"
                        >
                          {/* Datos Principales */}
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-3.5">
                              {/* Dorsal Badge */}
                              <div
                                className={`w-12 h-12 rounded-xl ${config.colorBg} text-white font-black text-xl flex items-center justify-center shadow-md shrink-0`}
                              >
                                #{player.jerseyNumber}
                              </div>
                              <div>
                                <h3 className="font-extrabold text-slate-900 text-base capitalize leading-tight">
                                  {player.name}
                                </h3>
                                <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 mt-0.5">
                                  <span
                                    className={`px-2 py-0.5 rounded-md font-bold text-[11px] ${config.badgeBg}`}
                                  >
                                    {player.role}
                                  </span>
                                  <span>•</span>
                                  <span>
                                    {player.heightCm ? `${player.heightCm} cm` : '175 cm'}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Action Buttons: Edit and Delete */}
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => handleOpenEditModal(player)}
                                className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-colors cursor-pointer"
                                title="Editar jugadora"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setPlayerToDelete(player)}
                                className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors cursor-pointer"
                                title="Eliminar jugadora"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>

                          {/* Plan de Desarrollo Individual */}
                          <div className="space-y-2.5 pt-3 border-t border-slate-100">
                            <div className="flex items-center justify-between text-[11px] font-extrabold text-slate-700 uppercase tracking-wider">
                              <span className="flex items-center gap-1">
                                <Target className="w-3.5 h-3.5 text-emerald-600" />
                                Desarrollo Individual
                              </span>
                              <span className="text-slate-400 normal-case font-bold">
                                Asistencia:{' '}
                                <span className="text-emerald-600 font-extrabold">
                                  {player.attendancePct || 95}%
                                </span>
                              </span>
                            </div>

                            <div className="grid grid-cols-2 gap-2 text-xs">
                              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                                  Fortalezas
                                </span>
                                <ul className="text-slate-800 font-bold space-y-0.5 text-[11px]">
                                  {player.strengths && player.strengths.length > 0 ? (
                                    player.strengths.slice(0, 3).map((s, idx) => (
                                      <li key={idx} className="truncate">
                                        • {s}
                                      </li>
                                    ))
                                  ) : (
                                    <li className="text-slate-400 italic">• Tiro exterior</li>
                                  )}
                                </ul>
                              </div>

                              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                                  Áreas de Mejora
                                </span>
                                <ul className="text-slate-800 font-bold space-y-0.5 text-[11px]">
                                  {player.areasToImprove && player.areasToImprove.length > 0 ? (
                                    player.areasToImprove.slice(0, 3).map((a, idx) => (
                                      <li key={idx} className="truncate">
                                        → {a}
                                      </li>
                                    ))
                                  ) : (
                                    <li className="text-slate-400 italic">→ Manejo de balón</li>
                                  )}
                                </ul>
                              </div>
                            </div>
                          </div>

                          {/* Stats Summary Footer */}
                          <div className="flex items-center justify-between text-xs font-bold text-slate-600 bg-slate-50 px-3.5 py-2.5 rounded-xl border border-slate-100">
                            <span className="text-slate-500 text-[11px]">Promedios temporada:</span>
                            <span className="text-slate-900 font-extrabold">
                              {player.stats?.pointsPerGame ?? 0} PPG · {player.stats?.reboundsPerGame ?? 0}{' '}
                              RPG · {player.stats?.assistsPerGame ?? 0} APG
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* Modal Añadir Jugadora */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-emerald-600 p-5 text-white flex items-center justify-between">
              <div>
                <h3 className="text-lg font-black tracking-tight">Añadir Jugadora por Rol</h3>
                <p className="text-xs text-emerald-100 mt-0.5">
                  Asigna la posición para clasificarla en su tarjeta correspondiente
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-emerald-700 text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-extrabold text-slate-800 mb-1">
                  Nombre completo <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ej. Paula Martín"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-extrabold text-slate-800 mb-1">
                    Dorsal <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    min={0}
                    max={99}
                    value={jerseyNumber}
                    onChange={(e) =>
                      setJerseyNumber(e.target.value === '' ? '' : Number(e.target.value))
                    }
                    placeholder="Ej. 10"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-extrabold text-slate-800 mb-1">
                    Rol / Posición <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={modalRole}
                    onChange={(e) => setModalRole(e.target.value as PlayerRole)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  >
                    <option value="Base">🏀 Base</option>
                    <option value="Escolta">🎯 Escolta</option>
                    <option value="Alero">⚡ Alero</option>
                    <option value="Ala-Pívot">💪 Ala-Pívot</option>
                    <option value="Pívot">🛡️ Pívot</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-extrabold text-slate-800 mb-1">
                  Altura (cm)
                </label>
                <input
                  type="number"
                  value={heightCm}
                  onChange={(e) =>
                    setHeightCm(e.target.value === '' ? '' : Number(e.target.value))
                  }
                  placeholder="Ej. 178"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-extrabold text-slate-800 mb-1">
                  Fortalezas (separadas por coma)
                </label>
                <input
                  type="text"
                  value={strengthsText}
                  onChange={(e) => setStrengthsText(e.target.value)}
                  placeholder="Ej. Visión de juego, Tiro tras bote"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-extrabold text-slate-800 mb-1">
                  Áreas de Mejora (separadas por coma)
                </label>
                <input
                  type="text"
                  value={improvementsText}
                  onChange={(e) => setImprovementsText(e.target.value)}
                  placeholder="Ej. Mano izquierda, Tiro libre bajo presión"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              <div className="pt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-extrabold transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
                >
                  Guardar en Tarjeta
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Editar Jugadora */}
      {editingPlayer && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
            <div className="bg-slate-900 p-5 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-black">
                  <Pencil className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-lg font-black tracking-tight">Editar Ficha de Jugadora</h3>
                  <p className="text-xs text-slate-300 mt-0.5 capitalize">
                    {editingPlayer.name} (#{editingPlayer.jerseyNumber})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingPlayer(null)}
                className="p-1.5 rounded-lg hover:bg-slate-800 text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="p-6 space-y-4 overflow-y-auto custom-scrollbar flex-1">
              {/* Información Básica */}
              <div>
                <label className="block text-xs font-extrabold text-slate-800 mb-1">
                  Nombre completo <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="Ej. Paula Martín"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 capitalize"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-extrabold text-slate-800 mb-1">
                    Dorsal <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    min={0}
                    max={99}
                    value={editJerseyNumber}
                    onChange={(e) =>
                      setEditJerseyNumber(e.target.value === '' ? '' : Number(e.target.value))
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-extrabold text-slate-800 mb-1">
                    Rol / Posición <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={editRole}
                    onChange={(e) => setEditRole(e.target.value as PlayerRole)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  >
                    <option value="Base">🏀 Base</option>
                    <option value="Escolta">🎯 Escolta</option>
                    <option value="Alero">⚡ Alero</option>
                    <option value="Ala-Pívot">💪 Ala-Pívot</option>
                    <option value="Pívot">🛡️ Pívot</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-extrabold text-slate-800 mb-1">
                    Altura (cm)
                  </label>
                  <input
                    type="number"
                    value={editHeightCm}
                    onChange={(e) =>
                      setEditHeightCm(e.target.value === '' ? '' : Number(e.target.value))
                    }
                    placeholder="175"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-extrabold text-slate-800 mb-1">
                    Asistencia (%)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={editAttendancePct}
                    onChange={(e) =>
                      setEditAttendancePct(e.target.value === '' ? '' : Number(e.target.value))
                    }
                    placeholder="95"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Desarrollo Individual */}
              <div>
                <label className="block text-xs font-extrabold text-slate-800 mb-1">
                  Fortalezas (separadas por comas)
                </label>
                <input
                  type="text"
                  value={editStrengthsText}
                  onChange={(e) => setEditStrengthsText(e.target.value)}
                  placeholder="Ej. Tiro exterior, Visión de juego, Defensa"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-extrabold text-slate-800 mb-1">
                  Áreas de Mejora (separadas por comas)
                </label>
                <input
                  type="text"
                  value={editImprovementsText}
                  onChange={(e) => setEditImprovementsText(e.target.value)}
                  placeholder="Ej. Manejo mano izquierda, Tiro libre"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              {/* Estadísticas Promedio */}
              <div className="pt-2 border-t border-slate-100 space-y-2">
                <span className="text-[11px] font-black text-slate-500 uppercase tracking-wider block">
                  Promedios de Temporada
                </span>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[11px] font-extrabold text-slate-700 mb-1">
                      PPG (Puntos)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={editPpg}
                      onChange={(e) =>
                        setEditPpg(e.target.value === '' ? '' : Number(e.target.value))
                      }
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-extrabold text-slate-700 mb-1">
                      RPG (Rebotes)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={editRpg}
                      onChange={(e) =>
                        setEditRpg(e.target.value === '' ? '' : Number(e.target.value))
                      }
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-extrabold text-slate-700 mb-1">
                      APG (Asist.)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={editApg}
                      onChange={(e) =>
                        setEditApg(e.target.value === '' ? '' : Number(e.target.value))
                      }
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-3 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setEditingPlayer(null)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-extrabold transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
                >
                  Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm Delete Modal */}
      {playerToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-100 space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-lg font-black text-slate-900">¿Eliminar jugadora?</h3>
              <p className="text-xs text-slate-600">
                Se eliminará permanentemente a{' '}
                <span className="font-extrabold capitalize text-slate-900">
                  {playerToDelete.name}
                </span>{' '}
                (#{playerToDelete.jerseyNumber}) de la plantilla.
              </p>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setPlayerToDelete(null)}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-extrabold cursor-pointer transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onDeletePlayer) {
                    onDeletePlayer(playerToDelete.id);
                  }
                  setPlayerToDelete(null);
                }}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-extrabold cursor-pointer transition-colors shadow-xs"
              >
                Sí, eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
