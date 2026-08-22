import React, { useState } from 'react';
import {
  BarChart3,
  Plus,
  Pencil,
  Trash2,
  X,
  Users,
  Trophy,
  Flame,
  Save,
  Award,
} from 'lucide-react';
import { Player, PlayerRole, UserProfile } from '../types';
import { consumeTrialAction } from '../utils/trialManager';

interface StatsViewProps {
  players: Player[];
  onAddPlayer: (player: Player) => void;
  onDeletePlayer: (id: string) => void;
  onUpdatePlayerStats: (player: Player) => void;
  userProfile?: UserProfile | null;
  onCheckRegistration?: (action: () => void, notice?: string) => void;
  onOpenTrialModal?: (mode?: 'general_action' | 'ficha_entrenador') => void;
}

// Función para calcular la valoración / PER estimada de la jugadora
const getPlayerPerformance = (player: Player): number => {
  if (!player.stats) return 0;
  const {
    pointsPerGame = 0,
    reboundsPerGame = 0,
    assistsPerGame = 0,
    stealsPerGame = 0,
    turnoversPerGame = 0,
  } = player.stats;

  // Valoración estándar PER: Puntos + Rebotes + Asistencias + Robos - Pérdidas
  return pointsPerGame + reboundsPerGame + assistsPerGame + stealsPerGame - turnoversPerGame;
};

export const StatsView: React.FC<StatsViewProps> = ({
  players,
  onAddPlayer,
  onDeletePlayer,
  onUpdatePlayerStats,
  userProfile,
  onOpenTrialModal,
}) => {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [jerseyNumber, setJerseyNumber] = useState<number | ''>('');
  const [role, setRole] = useState<PlayerRole>('Base');

  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [isEditingStats, setIsEditingStats] = useState(false);

  // Formulario de edición de estadísticas
  const [editPpg, setEditPpg] = useState<number | ''>('');
  const [editRpg, setEditRpg] = useState<number | ''>('');
  const [editApg, setEditApg] = useState<number | ''>('');
  const [editSpg, setEditSpg] = useState<number | ''>('');
  const [editTpg, setEditTpg] = useState<number | ''>('');
  const [editFgPct, setEditFgPct] = useState<number | ''>('');

  // Ordenación requerida:
  // 1. Mayor rendimiento (PER / Valoración) primero.
  // 2. Si no tienen valores (PER = 0 o igual), ordenadas por número de dorsal de menor a mayor.
  const sortedPlayers = [...players].sort((a, b) => {
    const perA = getPlayerPerformance(a);
    const perB = getPlayerPerformance(b);

    if (perB !== perA) {
      return perB - perA;
    }

    const jerseyA = a.jerseyNumber ?? 999;
    const jerseyB = b.jerseyNumber ?? 999;
    return jerseyA - jerseyB;
  });

  const handleOpenDetail = (player: Player, edit = false) => {
    setSelectedPlayer(player);
    setIsEditingStats(edit);
    setEditPpg(player.stats?.pointsPerGame ?? 0);
    setEditRpg(player.stats?.reboundsPerGame ?? 0);
    setEditApg(player.stats?.assistsPerGame ?? 0);
    setEditSpg(player.stats?.stealsPerGame ?? 0);
    setEditTpg(player.stats?.turnoversPerGame ?? 0);
    setEditFgPct(player.stats?.fieldGoalPct ?? 0);
  };

  const handleSaveStats = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlayer) return;

    const updatedPlayer: Player = {
      ...selectedPlayer,
      stats: {
        ...selectedPlayer.stats,
        pointsPerGame: editPpg !== '' ? Number(editPpg) : 0,
        reboundsPerGame: editRpg !== '' ? Number(editRpg) : 0,
        assistsPerGame: editApg !== '' ? Number(editApg) : 0,
        stealsPerGame: editSpg !== '' ? Number(editSpg) : 0,
        turnoversPerGame: editTpg !== '' ? Number(editTpg) : 0,
        fieldGoalPct: editFgPct !== '' ? Number(editFgPct) : 0,
      },
    };

    onUpdatePlayerStats(updatedPlayer);
    setSelectedPlayer(updatedPlayer);
    setIsEditingStats(false);
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || jerseyNumber === '') return;

    if (!consumeTrialAction(userProfile, 'stats')) {
      setIsAddModalOpen(false);
      if (onOpenTrialModal) onOpenTrialModal('general_action');
      return;
    }

    const newPlayer: Player = {
      id: `pl-${Date.now()}`,
      name: name.trim().toLowerCase(),
      jerseyNumber: Number(jerseyNumber),
      role,
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
      strengths: ['Compromiso', 'Esfuerzo'],
      areasToImprove: ['Técnica de tiro'],
    };

    onAddPlayer(newPlayer);
    setName('');
    setJerseyNumber('');
    setRole('Base');
    setIsAddModalOpen(false);
  };

  return (
    <div className="space-y-6 animate-fadeIn max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-600/20 shrink-0">
            <BarChart3 className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              Estadísticas de la Plantilla
            </h1>
            <p className="text-xs text-slate-500">
              Ordenadas automáticamente por rendimiento (PER) y por número de dorsal (#)
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md shadow-blue-600/20 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Añadir jugadora</span>
        </button>
      </div>

      {/* Roster Counter and Sorting Badge */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-bold text-slate-600 px-1">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-blue-600" />
          <span>{players.length} jugadoras en plantilla</span>
        </div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-800 text-[11px] font-extrabold border border-blue-200/60">
          <Award className="w-3.5 h-3.5 text-blue-600" />
          <span>Orden: Mejor PER primero · Dorsal menor a mayor</span>
        </div>
      </div>

      {/* Player Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {sortedPlayers.map((player, index) => {
          const per = getPlayerPerformance(player);
          const hasStats = per !== 0 || (player.stats && (player.stats.pointsPerGame > 0 || player.stats.reboundsPerGame > 0 || player.stats.assistsPerGame > 0));

          return (
            <div
              key={player.id}
              onClick={() => handleOpenDetail(player, false)}
              className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition-all cursor-pointer flex items-center justify-between group relative"
            >
              <div className="flex items-center gap-4">
                {/* Jersey Pill Badge */}
                <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white font-extrabold text-lg flex items-center justify-center shadow-md shadow-blue-600/20 group-hover:scale-105 transition-transform shrink-0 relative">
                  #{player.jerseyNumber}
                  {/* Position ranking badge if top 3 PER */}
                  {hasStats && index < 3 && (
                    <span
                      className={`absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full text-[10px] font-black flex items-center justify-center shadow-xs border border-white ${
                        index === 0
                          ? 'bg-amber-400 text-slate-900'
                          : index === 1
                          ? 'bg-slate-300 text-slate-900'
                          : 'bg-amber-700 text-white'
                      }`}
                      title={`Puesto #${index + 1} en rendimiento`}
                    >
                      {index + 1}
                    </span>
                  )}
                </div>

                <div>
                  <h3 className="font-extrabold text-slate-900 text-base capitalize group-hover:text-blue-600 transition-colors">
                    {player.name}
                  </h3>
                  <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                    <span>{player.role}</span>
                  </div>

                  <div className="mt-1 flex items-center gap-2 text-[11px] font-bold text-slate-700">
                    <span>{player.stats?.pointsPerGame ?? 0} PPG</span>
                    <span>·</span>
                    <span>{player.stats?.reboundsPerGame ?? 0} RPG</span>
                    <span>·</span>
                    <span>{player.stats?.assistsPerGame ?? 0} APG</span>
                  </div>

                  {/* Rating / PER Indicator */}
                  <div className="mt-1.5">
                    {hasStats ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 text-blue-800 text-[10px] font-black border border-blue-100">
                        VAL / PER: {per > 0 ? `+${per.toFixed(1)}` : per.toFixed(1)}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-500 text-[10px] font-bold">
                        Sin métricas · Dorsal #{player.jerseyNumber}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenDetail(player, true);
                  }}
                  className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors cursor-pointer"
                  title="Editar estadísticas"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeletePlayer(player.id);
                  }}
                  className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors cursor-pointer"
                  title="Eliminar jugadora"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal Añadir Jugadora */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl overflow-hidden border border-slate-200 animate-scaleUp">
            <div className="bg-blue-600 p-6 text-white flex items-center justify-between">
              <div>
                <h3 className="text-xl font-extrabold">Añadir jugadora</h3>
                <p className="text-xs text-blue-100 mt-0.5">Registro de plantilla</p>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="p-1.5 rounded-full hover:bg-blue-700 text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="p-6 space-y-5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Nombre</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ej. María García"
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Dorsal</label>
                  <input
                    type="number"
                    required
                    min={0}
                    max={99}
                    value={jerseyNumber}
                    onChange={(e) =>
                      setJerseyNumber(e.target.value === '' ? '' : Number(e.target.value))
                    }
                    placeholder="Ej. 7"
                    className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Rol de juego
                  </label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as PlayerRole)}
                    className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  >
                    <option value="Base">Base</option>
                    <option value="Escolta">Escolta</option>
                    <option value="Alero">Alero</option>
                    <option value="Ala-Pívot">Ala-Pívot</option>
                    <option value="Pívot">Pívot</option>
                  </select>
                </div>
              </div>

              <div className="pt-2 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="py-3 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm transition-colors text-center cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md shadow-blue-600/30 transition-all text-center cursor-pointer"
                >
                  Añadir
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal / Drawer de Detalle y Edición de Estadísticas */}
      {selectedPlayer && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full border border-slate-200 shadow-2xl p-6 sm:p-8 space-y-6 my-8 animate-scaleUp">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-blue-600 text-white font-extrabold text-2xl flex items-center justify-center shadow-lg shadow-blue-600/30">
                  #{selectedPlayer.jerseyNumber}
                </div>
                <div>
                  <h2 className="text-2xl font-extrabold text-slate-900 capitalize">
                    {selectedPlayer.name}
                  </h2>
                  <p className="text-xs text-slate-500 font-semibold">
                    Posición: {selectedPlayer.role} · Asistencia: {selectedPlayer.attendancePct || 95}%
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditingStats(!isEditingStats)}
                  className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer ${
                    isEditingStats
                      ? 'bg-blue-50 text-blue-700 border border-blue-200'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <Pencil className="w-3.5 h-3.5" />
                  <span>{isEditingStats ? 'Modo Lectura' : 'Editar Estadísticas'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedPlayer(null);
                    setIsEditingStats(false);
                  }}
                  className="p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* FORMULARIO DE EDICIÓN O VISTA DE ESTADÍSTICAS */}
            {isEditingStats ? (
              <form onSubmit={handleSaveStats} className="space-y-5">
                <div className="bg-blue-50/60 p-4 rounded-2xl border border-blue-100 text-xs text-blue-900 font-medium">
                  Actualiza las estadísticas medias por partido. El sistema calculará el nuevo PER y reordenará la plantilla automáticamente.
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Puntos (PPG)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      value={editPpg}
                      onChange={(e) =>
                        setEditPpg(e.target.value === '' ? '' : Number(e.target.value))
                      }
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Rebotes (RPG)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      value={editRpg}
                      onChange={(e) =>
                        setEditRpg(e.target.value === '' ? '' : Number(e.target.value))
                      }
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Asistencias (APG)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      value={editApg}
                      onChange={(e) =>
                        setEditApg(e.target.value === '' ? '' : Number(e.target.value))
                      }
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Robos (SPG)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      value={editSpg}
                      onChange={(e) =>
                        setEditSpg(e.target.value === '' ? '' : Number(e.target.value))
                      }
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Pérdidas (TPG)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      value={editTpg}
                      onChange={(e) =>
                        setEditTpg(e.target.value === '' ? '' : Number(e.target.value))
                      }
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      % Tiro de campo
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="100"
                      value={editFgPct}
                      onChange={(e) =>
                        setEditFgPct(e.target.value === '' ? '' : Number(e.target.value))
                      }
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsEditingStats(false)}
                    className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-600/20 transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <Save className="w-4 h-4" />
                    <span>Guardar Estadísticas</span>
                  </button>
                </div>
              </form>
            ) : (
              <>
                {/* Stat Cards Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Puntos / Partido</span>
                    <p className="text-xl font-extrabold text-slate-900">{selectedPlayer.stats?.pointsPerGame ?? 0}</p>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Rebotes / Partido</span>
                    <p className="text-xl font-extrabold text-slate-900">{selectedPlayer.stats?.reboundsPerGame ?? 0}</p>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Asistencias / Partido</span>
                    <p className="text-xl font-extrabold text-slate-900">{selectedPlayer.stats?.assistsPerGame ?? 0}</p>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">% Tiro de Campo</span>
                    <p className="text-xl font-extrabold text-slate-900">{selectedPlayer.stats?.fieldGoalPct ?? 0}%</p>
                  </div>
                </div>

                {/* Valoración / PER global */}
                <div className="p-4 rounded-2xl bg-blue-50/80 border border-blue-200/60 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Award className="w-5 h-5 text-blue-600" />
                    <div>
                      <h4 className="text-xs font-black text-blue-900 uppercase tracking-wider">
                        Valoración General PER
                      </h4>
                      <p className="text-[11px] text-blue-700 font-medium">
                        Puntos + Rebotes + Asistencias + Robos - Pérdidas
                      </p>
                    </div>
                  </div>
                  <div className="text-2xl font-black text-blue-700">
                    {getPlayerPerformance(selectedPlayer).toFixed(1)}
                  </div>
                </div>

                {/* Strengths & Areas to improve */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200/50 space-y-2">
                    <h4 className="text-xs font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-1.5">
                      <Trophy className="w-4 h-4 text-emerald-600" />
                      Fortalezas
                    </h4>
                    <ul className="space-y-1 text-xs text-emerald-900 font-medium">
                      {selectedPlayer.strengths?.map((s, idx) => (
                        <li key={idx}>✓ {s}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200/50 space-y-2">
                    <h4 className="text-xs font-bold text-amber-800 uppercase tracking-wider flex items-center gap-1.5">
                      <Flame className="w-4 h-4 text-amber-600" />
                      Áreas a mejorar
                    </h4>
                    <ul className="space-y-1 text-xs text-amber-900 font-medium">
                      {selectedPlayer.areasToImprove?.map((a, idx) => (
                        <li key={idx}>→ {a}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Notes */}
                {selectedPlayer.notes && (
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1">
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                      Notas de seguimiento del entrenador
                    </h4>
                    <p className="text-xs text-slate-700">{selectedPlayer.notes}</p>
                  </div>
                )}

                <div className="pt-4 border-t border-slate-100 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsEditingStats(true)}
                    className="px-4 py-2.5 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 font-bold text-xs transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    <Pencil className="w-4 h-4" />
                    <span>Editar Métricas</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedPlayer(null)}
                    className="px-6 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs transition-colors cursor-pointer"
                  >
                    Cerrar
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
