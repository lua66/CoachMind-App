import React, { useState, useEffect, useMemo } from 'react';
import {
  Timer,
  Users,
  Plus,
  Trash2,
  RotateCcw,
  Check,
  AlertTriangle,
  Copy,
  ChevronRight,
  ChevronLeft,
  Flame,
  Clock,
  Sparkles,
  Award,
  ArrowUpDown,
  Filter,
  Eye,
  CheckCircle2,
  XCircle,
  HelpCircle,
  TrendingUp,
  SlidersHorizontal,
} from 'lucide-react';
import { Player, UserProfile, ViewMode, PlayerRole } from '../types';

interface LiveMatchViewProps {
  players: Player[];
  userProfile?: UserProfile | null;
  onNavigate?: (view: ViewMode) => void;
}

type QuarterKey = 'Q1' | 'Q2' | 'Q3' | 'Q4' | 'PR';

interface PlayerQuarterBoxes {
  Q1: boolean[];
  Q2: boolean[];
  Q3: boolean[];
  Q4: boolean[];
  PR: boolean[];
}

interface LivePlayerRow {
  id: string;
  name: string;
  jerseyNumber: number;
  role: PlayerRole | string;
  onCourt: boolean;
  boxes: PlayerQuarterBoxes;
  customAdded?: boolean;
}

const STORAGE_KEY = 'coachmind_live_match_state';

const ROLE_COLORS: Record<string, { bg: string; text: string; badge: string }> = {
  Base: { bg: 'bg-blue-600', text: 'text-blue-700', badge: 'bg-blue-50 text-blue-700 border-blue-200' },
  Escolta: { bg: 'bg-emerald-600', text: 'text-emerald-700', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  Alero: { bg: 'bg-amber-600', text: 'text-amber-700', badge: 'bg-amber-50 text-amber-700 border-amber-200' },
  'Ala-Pívot': { bg: 'bg-indigo-600', text: 'text-indigo-700', badge: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  Pívot: { bg: 'bg-purple-600', text: 'text-purple-700', badge: 'bg-purple-50 text-purple-700 border-purple-200' },
};

const createEmptyBoxes = (): PlayerQuarterBoxes => ({
  Q1: [false, false, false, false, false, false],
  Q2: [false, false, false, false, false, false],
  Q3: [false, false, false, false, false, false],
  Q4: [false, false, false, false, false, false],
  PR: [false, false, false, false, false, false],
});

export const LiveMatchView: React.FC<LiveMatchViewProps> = ({
  players,
  userProfile,
  onNavigate,
}) => {
  // Match Info State
  const [rivalName, setRivalName] = useState<string>('Rival');
  const [matchDate, setMatchDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [quarterMinutes, setQuarterMinutes] = useState<number>(10); // 8, 10, 12 min
  const [scoreHome, setScoreHome] = useState<number>(0);
  const [scoreAway, setScoreAway] = useState<number>(0);
  const [activeQuarter, setActiveQuarter] = useState<QuarterKey>('Q1');
  const [activeInterval, setActiveInterval] = useState<number>(1); // 1 to 6
  const [includeOvertime, setIncludeOvertime] = useState<boolean>(false);
  const [focusQuarterMode, setFocusQuarterMode] = useState<boolean>(false); // Foco en cuarto actual vs todos
  const [copiedNotification, setCopiedNotification] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [filterAlertsOnly, setFilterAlertsOnly] = useState<'all' | 'unplayed' | 'low' | 'oncourt'>('all');
  const [sortBy, setSortBy] = useState<'jersey' | 'minutesAsc' | 'minutesDesc'>('jersey');

  // Form for quick guest/temp player
  const [newPlayerName, setNewPlayerName] = useState('');
  const [newPlayerNumber, setNewPlayerNumber] = useState<number>(99);
  const [newPlayerRole, setNewPlayerRole] = useState<PlayerRole>('Alero');

  // Player Rows State
  const [playerRows, setPlayerRows] = useState<LivePlayerRow[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed.rows) && parsed.rows.length > 0) {
          return parsed.rows;
        }
      }
    } catch (e) {
      console.warn('Failed to parse saved live match state', e);
    }

    // Default initialization from props.players
    if (players && players.length > 0) {
      return players.map((p, idx) => ({
        id: p.id || `p-${idx}`,
        name: p.name,
        jerseyNumber: p.jerseyNumber,
        role: p.role,
        onCourt: idx < 5, // First 5 start on court by default
        boxes: createEmptyBoxes(),
        customAdded: false,
      }));
    }

    return [];
  });

  // Load remaining match header from storage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.rivalName) setRivalName(parsed.rivalName);
        if (parsed.matchDate) setMatchDate(parsed.matchDate);
        if (parsed.quarterMinutes) setQuarterMinutes(parsed.quarterMinutes);
        if (typeof parsed.scoreHome === 'number') setScoreHome(parsed.scoreHome);
        if (typeof parsed.scoreAway === 'number') setScoreAway(parsed.scoreAway);
        if (parsed.activeQuarter) setActiveQuarter(parsed.activeQuarter);
        if (parsed.activeInterval) setActiveInterval(parsed.activeInterval);
        if (typeof parsed.includeOvertime === 'boolean') setIncludeOvertime(parsed.includeOvertime);
      }
    } catch (e) {}
  }, []);

  // Sync with incoming players if playerRows is empty and players arrive
  useEffect(() => {
    if (playerRows.length === 0 && players && players.length > 0) {
      setPlayerRows(
        players.map((p, idx) => ({
          id: p.id || `p-${idx}`,
          name: p.name,
          jerseyNumber: p.jerseyNumber,
          role: p.role,
          onCourt: idx < 5,
          boxes: createEmptyBoxes(),
          customAdded: false,
        }))
      );
    }
  }, [players]);

  // Save to localStorage on state change
  useEffect(() => {
    const dataToSave = {
      rivalName,
      matchDate,
      quarterMinutes,
      scoreHome,
      scoreAway,
      activeQuarter,
      activeInterval,
      includeOvertime,
      rows: playerRows,
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
    } catch (e) {}
  }, [rivalName, matchDate, quarterMinutes, scoreHome, scoreAway, activeQuarter, activeInterval, includeOvertime, playerRows]);

  // Calculations: Total boxes per player and minutes
  // Minutes per box = quarterMinutes / 6 (e.g. 10 / 6 = 1.67 min)
  const minutesPerBox = quarterMinutes / 6;
  const maxPossibleBoxes = includeOvertime ? 30 : 24;

  const onCourtCount = useMemo(() => {
    return playerRows.filter((r) => r.onCourt).length;
  }, [playerRows]);

  // Toggle individual box
  const handleToggleBox = (playerId: string, quarter: QuarterKey, boxIndex: number) => {
    setPlayerRows((prev) =>
      prev.map((r) => {
        if (r.id !== playerId) return r;
        const currentQBoxes = [...r.boxes[quarter]];
        currentQBoxes[boxIndex] = !currentQBoxes[boxIndex];
        return {
          ...r,
          boxes: {
            ...r.boxes,
            [quarter]: currentQBoxes,
          },
        };
      })
    );
  };

  // Toggle OnCourt status
  const handleToggleOnCourt = (playerId: string) => {
    setPlayerRows((prev) =>
      prev.map((r) => (r.id === playerId ? { ...r, onCourt: !r.onCourt } : r))
    );
  };

  // Mark current interval to all 5 active players on court
  const handleMarkActiveIntervalForOnCourt = () => {
    const onCourtPlayers = playerRows.filter((r) => r.onCourt);
    if (onCourtPlayers.length === 0) {
      showToast('⚠️ No hay jugadoras marcadas "En Pista". Selecciona el quinteto.');
      return;
    }

    setPlayerRows((prev) =>
      prev.map((r) => {
        if (!r.onCourt) return r;
        const currentQBoxes = [...r.boxes[activeQuarter]];
        currentQBoxes[activeInterval - 1] = true;
        return {
          ...r,
          boxes: {
            ...r.boxes,
            [activeQuarter]: currentQBoxes,
          },
        };
      })
    );

    showToast(`✅ Intervalo ${activeInterval} de ${activeQuarter} anotado a las ${onCourtPlayers.length} jugadoras en pista`);

    // Auto-advance interval
    if (activeInterval < 6) {
      setActiveInterval((prev) => prev + 1);
    } else {
      // Prompt quarter change if on interval 6
      if (activeQuarter === 'Q1') setActiveQuarter('Q2');
      else if (activeQuarter === 'Q2') setActiveQuarter('Q3');
      else if (activeQuarter === 'Q3') setActiveQuarter('Q4');
      else if (activeQuarter === 'Q4' && includeOvertime) setActiveQuarter('PR');
      setActiveInterval(1);
    }
  };

  // Mark all 6 boxes of active quarter for a single player
  const handleFillQuarter = (playerId: string, quarter: QuarterKey, fill: boolean) => {
    setPlayerRows((prev) =>
      prev.map((r) => {
        if (r.id !== playerId) return r;
        return {
          ...r,
          boxes: {
            ...r.boxes,
            [quarter]: [fill, fill, fill, fill, fill, fill],
          },
        };
      })
    );
  };

  // Reset entire match
  const handleResetMatch = () => {
    if (window.confirm('¿Seguro que deseas reiniciar el partido en vivo? Se borrarán todas las casillas anotadas para empezar de cero.')) {
      setPlayerRows((prev) =>
        prev.map((r, idx) => ({
          ...r,
          onCourt: idx < 5,
          boxes: createEmptyBoxes(),
        }))
      );
      setScoreHome(0);
      setScoreAway(0);
      setActiveQuarter('Q1');
      setActiveInterval(1);
      showToast('🔄 Partido reiniciado con éxito');
    }
  };

  // Add temporary player
  const handleAddTempPlayer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlayerName.trim()) return;

    const newRow: LivePlayerRow = {
      id: `temp-${Date.now()}`,
      name: newPlayerName.trim(),
      jerseyNumber: Number(newPlayerNumber) || 0,
      role: newPlayerRole,
      onCourt: false,
      boxes: createEmptyBoxes(),
      customAdded: true,
    };

    setPlayerRows((prev) => [...prev, newRow]);
    setNewPlayerName('');
    setShowAddModal(false);
    showToast(`Jugadora #${newPlayerNumber} ${newPlayerName} añadida a la rotación`);
  };

  // Remove temporary player
  const handleRemoveTempPlayer = (id: string) => {
    setPlayerRows((prev) => prev.filter((r) => r.id !== id));
  };

  // Helper Toast
  const showToast = (msg: string) => {
    setCopiedNotification(msg);
    setTimeout(() => {
      setCopiedNotification(null);
    }, 3500);
  };

  // Copy Summary to WhatsApp
  const handleCopySummary = () => {
    const sorted = [...playerRows].sort((a, b) => {
      const aTotal = getPlayerTotalBoxes(a);
      const bTotal = getPlayerTotalBoxes(b);
      return bTotal - aTotal;
    });

    const unplayed = sorted.filter((r) => getPlayerTotalBoxes(r) === 0);
    const lowTime = sorted.filter((r) => {
      const b = getPlayerTotalBoxes(r);
      return b > 0 && b <= 4;
    });

    let text = `🏀 *CONTROL DE MINUTOS • COACHMIND BASKETBALL*\n`;
    text += `🆚 *Partido:* ${rivalName || 'Amistoso'}\n`;
    text += `📅 *Fecha:* ${matchDate}\n`;
    text += `🔢 *Marcador:* Nosotros ${scoreHome} - ${scoreAway} Rival\n`;
    text += `⏱️ *Formato:* 4 cuartos de ${quarterMinutes} min (Total: ${quarterMinutes * 4} min)\n\n`;

    text += `📊 *REPARTO DE MINUTOS POR JUGADORA:*\n`;
    sorted.forEach((p, idx) => {
      const totalBoxes = getPlayerTotalBoxes(p);
      const mins = (totalBoxes * minutesPerBox).toFixed(1);
      const pct = Math.round((totalBoxes / maxPossibleBoxes) * 100);
      const statusIcon = totalBoxes === 0 ? '🔴' : totalBoxes <= 4 ? '🟡' : '🟢';
      text += `${idx + 1}. ${statusIcon} #${p.jerseyNumber} ${p.name.toUpperCase()} (${p.role}): *${mins} min* (${totalBoxes}/${maxPossibleBoxes} casillas · ${pct}%)\n`;
    });

    if (unplayed.length > 0) {
      text += `\n🚨 *Jugadoras sin debutar:* ${unplayed.map((u) => `#${u.jerseyNumber} ${u.name}`).join(', ')}\n`;
    }
    if (lowTime.length > 0) {
      text += `⚠️ *Pocos minutos:* ${lowTime.map((u) => `#${u.jerseyNumber} ${u.name} (${(getPlayerTotalBoxes(u) * minutesPerBox).toFixed(1)}m)`).join(', ')}\n`;
    }

    text += `\n_Generado automáticamente por CoachMind Basketball Live_`;

    navigator.clipboard.writeText(text);
    showToast('📋 ¡Resumen copiado al portapapeles! Listo para pegar en WhatsApp.');
  };

  // Helper count total boxes for player
  function getPlayerTotalBoxes(row: LivePlayerRow): number {
    let count = 0;
    const quarters: QuarterKey[] = includeOvertime
      ? ['Q1', 'Q2', 'Q3', 'Q4', 'PR']
      : ['Q1', 'Q2', 'Q3', 'Q4'];
    quarters.forEach((q) => {
      count += row.boxes[q].filter(Boolean).length;
    });
    return count;
  }

  function getPlayerQuarterBoxesCount(row: LivePlayerRow, quarter: QuarterKey): number {
    return row.boxes[quarter].filter(Boolean).length;
  }

  // Filter & Sort rows
  const displayedRows = useMemo(() => {
    let list = [...playerRows];

    if (filterAlertsOnly === 'unplayed') {
      list = list.filter((r) => getPlayerTotalBoxes(r) === 0);
    } else if (filterAlertsOnly === 'low') {
      list = list.filter((r) => {
        const t = getPlayerTotalBoxes(r);
        return t > 0 && t <= 4;
      });
    } else if (filterAlertsOnly === 'oncourt') {
      list = list.filter((r) => r.onCourt);
    }

    if (sortBy === 'jersey') {
      list.sort((a, b) => a.jerseyNumber - b.jerseyNumber);
    } else if (sortBy === 'minutesAsc') {
      list.sort((a, b) => getPlayerTotalBoxes(a) - getPlayerTotalBoxes(b));
    } else if (sortBy === 'minutesDesc') {
      list.sort((a, b) => getPlayerTotalBoxes(b) - getPlayerTotalBoxes(a));
    }

    return list;
  }, [playerRows, filterAlertsOnly, sortBy, includeOvertime]);

  // Identify players with 0 or few minutes
  const unplayedPlayers = useMemo(() => {
    return playerRows.filter((r) => getPlayerTotalBoxes(r) === 0);
  }, [playerRows, includeOvertime]);

  const lowMinutesPlayers = useMemo(() => {
    return playerRows.filter((r) => {
      const b = getPlayerTotalBoxes(r);
      return b > 0 && b <= 4;
    });
  }, [playerRows, includeOvertime]);

  const quartersList: QuarterKey[] = includeOvertime
    ? ['Q1', 'Q2', 'Q3', 'Q4', 'PR']
    : ['Q1', 'Q2', 'Q3', 'Q4'];

  return (
    <div className="space-y-6 pb-20">
      {/* Toast Notification */}
      {copiedNotification && (
        <div className="fixed top-5 right-5 z-50 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-2xl border border-emerald-500/40 text-sm font-bold flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-300">
          <Sparkles className="w-5 h-5 text-amber-400 shrink-0" />
          <span>{copiedNotification}</span>
        </div>
      )}

      {/* Main Header / Live Controls */}
      <div className="bg-slate-900 rounded-3xl p-4 sm:p-6 md:p-8 text-white shadow-xl border border-slate-800/80 relative overflow-hidden">
        {/* Glow effect */}
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-amber-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-6">
          {/* Top Title Bar */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800 pb-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-red-600 via-orange-600 to-amber-500 flex items-center justify-center text-white shadow-lg shadow-red-600/30">
                <Timer className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
                    Partido Live
                  </h1>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/30 text-xs font-black tracking-wider uppercase">
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                    LIVE
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-slate-400 font-medium">
                  Control visual de rotaciones y minutos en vivo para que todas las jugadoras jueguen
                </p>
              </div>
            </div>

            {/* Top Action Buttons */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleCopySummary}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all cursor-pointer border border-slate-700"
                title="Copiar reporte al portapapeles"
              >
                <Copy className="w-4 h-4 text-emerald-400" />
                <span>Copiar WhatsApp</span>
              </button>

              <button
                type="button"
                onClick={() => setShowAddModal(true)}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all cursor-pointer shadow-md shadow-emerald-600/20"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
                <span>Añadir Jugadora</span>
              </button>

              <button
                type="button"
                onClick={handleResetMatch}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 text-xs font-bold transition-all cursor-pointer border border-rose-500/30"
                title="Reiniciar casillas para un nuevo partido"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Reiniciar</span>
              </button>
            </div>
          </div>

          {/* Match Scoreboard & Quarter Controller */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
            {/* Scoreboard */}
            <div className="md:col-span-5 bg-slate-950/70 border border-slate-800/80 rounded-2xl p-4 flex items-center justify-between gap-3">
              {/* Home */}
              <div className="text-center flex-1">
                <span className="text-[11px] font-bold uppercase text-slate-400 tracking-wider block mb-1">
                  Nosotros
                </span>
                <div className="text-3xl sm:text-4xl font-black text-amber-400 tabular-nums">
                  {scoreHome}
                </div>
                <div className="flex items-center justify-center gap-1 mt-2">
                  <button
                    type="button"
                    onClick={() => setScoreHome((s) => Math.max(0, s - 1))}
                    className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs"
                  >
                    -1
                  </button>
                  <button
                    type="button"
                    onClick={() => setScoreHome((s) => s + 1)}
                    className="w-7 h-7 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-bold text-xs border border-amber-500/40"
                  >
                    +1
                  </button>
                  <button
                    type="button"
                    onClick={() => setScoreHome((s) => s + 2)}
                    className="w-7 h-7 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs"
                  >
                    +2
                  </button>
                  <button
                    type="button"
                    onClick={() => setScoreHome((s) => s + 3)}
                    className="w-7 h-7 rounded-lg bg-orange-600 hover:bg-orange-500 text-white font-black text-xs"
                  >
                    +3
                  </button>
                </div>
              </div>

              <div className="text-slate-600 font-black text-xl px-2">VS</div>

              {/* Away */}
              <div className="text-center flex-1">
                <input
                  type="text"
                  value={rivalName}
                  onChange={(e) => setRivalName(e.target.value)}
                  className="text-[11px] font-bold uppercase text-slate-400 tracking-wider bg-transparent border-b border-dashed border-slate-700 hover:border-slate-500 text-center w-full focus:outline-none focus:text-white"
                  placeholder="Rival"
                />
                <div className="text-3xl sm:text-4xl font-black text-slate-200 tabular-nums">
                  {scoreAway}
                </div>
                <div className="flex items-center justify-center gap-1 mt-2">
                  <button
                    type="button"
                    onClick={() => setScoreAway((s) => Math.max(0, s - 1))}
                    className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs"
                  >
                    -1
                  </button>
                  <button
                    type="button"
                    onClick={() => setScoreAway((s) => s + 1)}
                    className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs"
                  >
                    +1
                  </button>
                  <button
                    type="button"
                    onClick={() => setScoreAway((s) => s + 2)}
                    className="w-7 h-7 rounded-lg bg-slate-700 hover:bg-slate-600 text-white font-black text-xs"
                  >
                    +2
                  </button>
                  <button
                    type="button"
                    onClick={() => setScoreAway((s) => s + 3)}
                    className="w-7 h-7 rounded-lg bg-slate-600 hover:bg-slate-500 text-white font-black text-xs"
                  >
                    +3
                  </button>
                </div>
              </div>
            </div>

            {/* Quarter Selector & Active Interval */}
            <div className="md:col-span-7 bg-slate-950/70 border border-slate-800/80 rounded-2xl p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-bold text-slate-300 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-400" />
                  Cuarto en Juego:
                </span>

                <div className="flex items-center gap-1.5 bg-slate-900 p-1 rounded-xl border border-slate-800">
                  {(['Q1', 'Q2', 'Q3', 'Q4'] as QuarterKey[]).map((q, idx) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => setActiveQuarter(q)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                        activeQuarter === q
                          ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/30'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800'
                      }`}
                    >
                      {idx + 1}Q
                    </button>
                  ))}

                  {includeOvertime && (
                    <button
                      type="button"
                      onClick={() => setActiveQuarter('PR')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                        activeQuarter === 'PR'
                          ? 'bg-orange-500 text-white shadow-md shadow-orange-500/30'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800'
                      }`}
                    >
                      PR
                    </button>
                  )}
                </div>

                {/* Overtime Toggle */}
                <button
                  type="button"
                  onClick={() => setIncludeOvertime((v) => !v)}
                  className={`text-[11px] font-bold px-2 py-1 rounded-lg border transition-all cursor-pointer ${
                    includeOvertime
                      ? 'bg-orange-950/50 border-orange-500 text-orange-300'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {includeOvertime ? 'Prórroga ON' : '+ Prórroga'}
                </button>
              </div>

              {/* Interval Fast Selector (1 to 6) & Quick Button */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-slate-800/80">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold text-slate-400">Casilla activa:</span>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5, 6].map((num) => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => setActiveInterval(num)}
                        className={`w-7 h-7 rounded-lg text-xs font-black transition-all cursor-pointer ${
                          activeInterval === num
                            ? 'bg-emerald-500 text-slate-950 ring-2 ring-emerald-300 shadow-md'
                            : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                        }`}
                        title={`Casilla ${num} (~${((num - 1) * minutesPerBox).toFixed(1)}-${(num * minutesPerBox).toFixed(1)}m)`}
                      >
                        {num}
                      </button>
                    ))}
                  </div>
                </div>

                {/* BIG BUTTON: ANOTAR INTERVALO AL QUINTETO */}
                <button
                  type="button"
                  onClick={handleMarkActiveIntervalForOnCourt}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 text-xs sm:text-sm font-black transition-all shadow-lg shadow-emerald-500/25 cursor-pointer active:scale-95"
                >
                  <CheckCircle2 className="w-4 h-4 stroke-[3]" />
                  <span>Anotar Casilla {activeInterval} ({activeQuarter}) al Quinteto</span>
                </button>
              </div>
            </div>
          </div>

          {/* Status Bar: Quinteto Count + Equity Alerts */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
            {/* 1. On Court Monitor */}
            <div
              className={`p-3 rounded-2xl border flex items-center gap-3 transition-colors ${
                onCourtCount === 5
                  ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                  : 'bg-rose-950/40 border-rose-500/40 text-rose-300'
              }`}
            >
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm shrink-0 ${
                  onCourtCount === 5 ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white animate-bounce'
                }`}
              >
                {onCourtCount}
              </div>
              <div>
                <div className="text-xs font-black">
                  {onCourtCount === 5 ? 'Quinteto Completo (5 en pista)' : `¡Atención! ${onCourtCount} jugadoras en pista`}
                </div>
                <div className="text-[11px] opacity-80">
                  {onCourtCount === 5
                    ? 'Rotación lista para anotar en vivo'
                    : onCourtCount < 5
                    ? `Faltan ${5 - onCourtCount} por poner en pista`
                    : `Sobran ${onCourtCount - 5} jugadoras en pista`}
                </div>
              </div>
            </div>

            {/* 2. Unplayed Alert (El objetivo principal del usuario) */}
            <div
              className={`p-3 rounded-2xl border flex items-center gap-3 transition-colors ${
                unplayedPlayers.length > 0
                  ? 'bg-amber-950/50 border-amber-500/50 text-amber-200'
                  : 'bg-slate-950/40 border-slate-800 text-slate-300'
              }`}
            >
              <AlertTriangle
                className={`w-6 h-6 shrink-0 ${
                  unplayedPlayers.length > 0 ? 'text-amber-400 animate-pulse' : 'text-slate-500'
                }`}
              />
              <div className="min-w-0">
                <div className="text-xs font-black">
                  {unplayedPlayers.length > 0
                    ? `🚨 ${unplayedPlayers.length} Sin Jugar Todavía:`
                    : '✅ Todas han debutado en pista'}
                </div>
                <div className="text-[11px] truncate opacity-90 font-medium">
                  {unplayedPlayers.length > 0
                    ? unplayedPlayers.map((p) => `#${p.jerseyNumber} ${p.name}`).join(', ')
                    : 'Excelente rotación equilibrada'}
                </div>
              </div>
            </div>

            {/* 3. Low Minutes Alert */}
            <div
              className={`p-3 rounded-2xl border flex items-center gap-3 transition-colors ${
                lowMinutesPlayers.length > 0
                  ? 'bg-orange-950/40 border-orange-500/40 text-orange-200'
                  : 'bg-slate-950/40 border-slate-800 text-slate-300'
              }`}
            >
              <TrendingUp className="w-6 h-6 text-orange-400 shrink-0" />
              <div className="min-w-0">
                <div className="text-xs font-black">
                  {lowMinutesPlayers.length > 0
                    ? `⚠️ ${lowMinutesPlayers.length} Con Pocos Minutos (≤4 casillas):`
                    : 'Equilibrio de minutos óptimo'}
                </div>
                <div className="text-[11px] truncate opacity-90 font-medium">
                  {lowMinutesPlayers.length > 0
                    ? lowMinutesPlayers.map((p) => `#${p.jerseyNumber} ${p.name}`).join(', ')
                    : 'Ninguna jugadora está descolgada'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Table Controls & Filters */}
      <div className="bg-white rounded-3xl p-4 sm:p-6 shadow-sm border border-slate-200/80 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-slate-500 flex items-center gap-1.5 mr-1">
              <Filter className="w-3.5 h-3.5" /> Filtrar:
            </span>

            <button
              type="button"
              onClick={() => setFilterAlertsOnly('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                filterAlertsOnly === 'all'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
              }`}
            >
              Todas ({playerRows.length})
            </button>

            <button
              type="button"
              onClick={() => setFilterAlertsOnly('oncourt')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                filterAlertsOnly === 'oncourt'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800'
              }`}
            >
              En Pista ({onCourtCount})
            </button>

            <button
              type="button"
              onClick={() => setFilterAlertsOnly('unplayed')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                filterAlertsOnly === 'unplayed'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'bg-amber-50 hover:bg-amber-100 text-amber-800'
              }`}
            >
              Sin Debut ({unplayedPlayers.length})
            </button>

            <button
              type="button"
              onClick={() => setFilterAlertsOnly('low')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                filterAlertsOnly === 'low'
                  ? 'bg-orange-600 text-white shadow-sm'
                  : 'bg-orange-50 hover:bg-orange-100 text-orange-800'
              }`}
            >
              Pocos Minutos ({lowMinutesPlayers.length})
            </button>
          </div>

          <div className="flex items-center gap-3">
            {/* View Mode: All Quarters vs Single Quarter Focus */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={() => setFocusQuarterMode(false)}
                className={`px-3 py-1 rounded-lg text-xs font-black transition-all cursor-pointer ${
                  !focusQuarterMode
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Vista Completa (4Q)
              </button>
              <button
                type="button"
                onClick={() => setFocusQuarterMode(true)}
                className={`px-3 py-1 rounded-lg text-xs font-black transition-all cursor-pointer ${
                  focusQuarterMode
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Foco {activeQuarter} (Gigante)
              </button>
            </div>

            {/* Quarter duration selector */}
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-500 font-semibold">
              <span>Cuarto:</span>
              <select
                value={quarterMinutes}
                onChange={(e) => setQuarterMinutes(Number(e.target.value))}
                className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold text-slate-800 focus:outline-none"
              >
                <option value={8}>8 min (Mini/Infantil)</option>
                <option value={10}>10 min (Junior/Senior)</option>
                <option value={12}>12 min (NBA/Pro)</option>
              </select>
            </div>
          </div>
        </div>

        {/* The Grid / Table of Players & 6 Boxes per Quarter */}
        {displayedRows.length === 0 ? (
          <div className="py-16 text-center text-slate-400 space-y-3">
            <Users className="w-12 h-12 mx-auto text-slate-300 stroke-[1.5]" />
            <h3 className="text-base font-bold text-slate-700">No hay jugadoras que mostrar</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Añade jugadoras a tu plantilla en la sección "Jugadores" o añade jugadoras temporales para este partido con el botón superior.
            </p>
            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              className="mt-2 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 text-white font-black text-xs cursor-pointer shadow-md shadow-emerald-600/20"
            >
              <Plus className="w-4 h-4" /> Añadir Jugadora Ahora
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto pb-4 custom-scrollbar">
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead>
                <tr className="border-b-2 border-slate-200 text-xs font-black text-slate-700">
                  <th className="py-3 px-3 w-56 sticky left-0 bg-white z-20 shadow-r">
                    Jugadora & Quinteto
                  </th>

                  {/* Quarters Headers */}
                  {!focusQuarterMode ? (
                    quartersList.map((q, qIdx) => (
                      <th
                        key={q}
                        className={`py-3 px-2 text-center border-l border-slate-200 ${
                          activeQuarter === q ? 'bg-amber-50/70 text-amber-900 font-extrabold' : 'bg-slate-50/50'
                        }`}
                      >
                        <div className="flex items-center justify-center gap-1.5">
                          <span>{q === 'PR' ? 'PRÓRROGA' : `${qIdx + 1}º CUARTO (${q})`}</span>
                          {activeQuarter === q && (
                            <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                          )}
                        </div>
                        <span className="text-[10px] text-slate-400 font-medium block">
                          6 intervalos (~{(minutesPerBox).toFixed(1)}m c/u)
                        </span>
                      </th>
                    ))
                  ) : (
                    <th className="py-3 px-2 text-center border-l border-slate-200 bg-amber-50 text-amber-900 font-black">
                      <div className="flex items-center justify-center gap-2 text-sm">
                        <Flame className="w-4 h-4 text-amber-500" />
                        <span>{activeQuarter === 'PR' ? 'PRÓRROGA' : `CUARTO EN JUEGO: ${activeQuarter}`}</span>
                        <span className="text-xs bg-amber-200 text-amber-900 px-2 py-0.5 rounded-full">
                          Casillas Grandes Táctiles
                        </span>
                      </div>
                    </th>
                  )}

                  <th className="py-3 px-4 text-right w-40 border-l border-slate-200 bg-slate-50/50">
                    Tiempo Total
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {displayedRows.map((player) => {
                  const totalBoxes = getPlayerTotalBoxes(player);
                  const totalMins = (totalBoxes * minutesPerBox).toFixed(1);
                  const pct = Math.round((totalBoxes / maxPossibleBoxes) * 100);
                  const isUnplayed = totalBoxes === 0;
                  const isLowMinutes = totalBoxes > 0 && totalBoxes <= 4;
                  const cfg = ROLE_COLORS[player.role] || {
                    bg: 'bg-slate-700',
                    text: 'text-slate-700',
                    badge: 'bg-slate-100 text-slate-700 border-slate-200',
                  };

                  return (
                    <tr
                      key={player.id}
                      className={`transition-colors hover:bg-slate-50/80 ${
                        player.onCourt ? 'bg-emerald-50/30' : ''
                      } ${isUnplayed ? 'bg-amber-50/20' : ''}`}
                    >
                      {/* Player Info & On-Court Toggle (Sticky Left) */}
                      <td className="py-3 px-3 sticky left-0 bg-white z-10 shadow-r">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2.5 min-w-0">
                            {/* Jersey Number */}
                            <span
                              className={`w-9 h-9 rounded-xl ${cfg.bg} text-white font-black text-xs flex items-center justify-center shrink-0 shadow-xs`}
                            >
                              #{player.jerseyNumber}
                            </span>

                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="font-black text-sm text-slate-900 capitalize truncate block">
                                  {player.name}
                                </span>
                                {player.customAdded && (
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveTempPlayer(player.id)}
                                    className="text-slate-400 hover:text-rose-600 p-0.5"
                                    title="Eliminar jugadora invitada"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
                              <span className={`inline-block px-1.5 py-0.2 rounded text-[10px] font-bold border ${cfg.badge}`}>
                                {player.role}
                              </span>
                            </div>
                          </div>

                          {/* On Court Switcher Button */}
                          <button
                            type="button"
                            onClick={() => handleToggleOnCourt(player.id)}
                            className={`px-2.5 py-1.5 rounded-xl font-black text-[11px] transition-all cursor-pointer shrink-0 flex items-center gap-1.5 shadow-xs ${
                              player.onCourt
                                ? 'bg-emerald-600 text-white hover:bg-emerald-500 shadow-emerald-600/30'
                                : 'bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-800'
                            }`}
                            title={player.onCourt ? 'En pista (Click para banquillo)' : 'En banquillo (Click para poner en pista)'}
                          >
                            <span
                              className={`w-2 h-2 rounded-full ${
                                player.onCourt ? 'bg-white animate-pulse' : 'bg-slate-400'
                              }`}
                            />
                            <span>{player.onCourt ? 'PISTA' : 'BANCA'}</span>
                          </button>
                        </div>
                      </td>

                      {/* Quarters Rendering */}
                      {!focusQuarterMode ? (
                        quartersList.map((q) => {
                          const isActiveQ = activeQuarter === q;
                          return (
                            <td
                              key={q}
                              className={`py-3 px-2 border-l border-slate-200 align-middle ${
                                isActiveQ ? 'bg-amber-50/30' : ''
                              }`}
                            >
                              <div className="flex items-center justify-center gap-1 sm:gap-1.5">
                                {player.boxes[q].map((isChecked, bIdx) => {
                                  const isCurrentActiveBox = isActiveQ && activeInterval === bIdx + 1;
                                  return (
                                    <button
                                      key={bIdx}
                                      type="button"
                                      onClick={() => handleToggleBox(player.id, q, bIdx)}
                                      className={`w-8 h-8 sm:w-10 sm:h-10 md:w-11 md:h-11 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center select-none active:scale-90 ${
                                        isChecked
                                          ? 'bg-emerald-600 border-2 border-emerald-700 text-white shadow-md shadow-emerald-600/30 scale-100'
                                          : 'bg-white border-2 border-slate-200 text-slate-400 hover:border-emerald-400 hover:bg-emerald-50/50 hover:text-emerald-700'
                                      } ${
                                        isCurrentActiveBox
                                          ? 'ring-2 ring-amber-400 ring-offset-1 border-amber-400'
                                          : ''
                                      }`}
                                      title={`${q} - Intervalo ${bIdx + 1} (${((bIdx) * minutesPerBox).toFixed(1)}-${((bIdx + 1) * minutesPerBox).toFixed(1)} min)`}
                                    >
                                      {isChecked ? (
                                        <Check className="w-4 h-4 sm:w-5 sm:h-5 stroke-[3]" />
                                      ) : (
                                        <span>{bIdx + 1}</span>
                                      )}
                                    </button>
                                  );
                                })}

                                {/* Quick Fill / Unfill Quarter */}
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleFillQuarter(
                                      player.id,
                                      q,
                                      getPlayerQuarterBoxesCount(player, q) < 6
                                    )
                                  }
                                  className="w-5 h-8 text-[9px] font-extrabold text-slate-300 hover:text-slate-700 hover:bg-slate-200 rounded flex items-center justify-center transition-colors ml-0.5"
                                  title="Marcar o desmarcar todo el cuarto para esta jugadora"
                                >
                                  {getPlayerQuarterBoxesCount(player, q) === 6 ? '×' : '+'}
                                </button>
                              </div>
                            </td>
                          );
                        })
                      ) : (
                        /* Single Quarter Focus Mode: HUGE TACTILE BOXES */
                        <td className="py-4 px-3 border-l border-slate-200 bg-amber-50/30 align-middle">
                          <div className="flex items-center justify-center gap-2 sm:gap-3">
                            {player.boxes[activeQuarter].map((isChecked, bIdx) => {
                              const isCurrentActiveBox = activeInterval === bIdx + 1;
                              return (
                                <button
                                  key={bIdx}
                                  type="button"
                                  onClick={() => handleToggleBox(player.id, activeQuarter, bIdx)}
                                  className={`w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 rounded-2xl text-base font-black transition-all cursor-pointer flex flex-col items-center justify-center select-none active:scale-90 ${
                                    isChecked
                                      ? 'bg-emerald-600 border-3 border-emerald-700 text-white shadow-lg shadow-emerald-600/35'
                                      : 'bg-white border-2 border-slate-300 text-slate-500 hover:border-emerald-500 hover:bg-emerald-50 hover:text-emerald-800'
                                  } ${
                                    isCurrentActiveBox
                                      ? 'ring-3 ring-amber-400 ring-offset-2 border-amber-500'
                                      : ''
                                  }`}
                                >
                                  {isChecked ? (
                                    <>
                                      <Check className="w-6 h-6 stroke-[3]" />
                                      <span className="text-[10px] font-bold opacity-80 mt-0.5">
                                        {bIdx + 1}
                                      </span>
                                    </>
                                  ) : (
                                    <>
                                      <span className="text-sm sm:text-base font-black">{bIdx + 1}</span>
                                      <span className="text-[9px] font-medium text-slate-400">
                                        ~{((bIdx + 1) * minutesPerBox).toFixed(0)}m
                                      </span>
                                    </>
                                  )}
                                </button>
                              );
                            })}

                            <button
                              type="button"
                              onClick={() =>
                                handleFillQuarter(
                                  player.id,
                                  activeQuarter,
                                  getPlayerQuarterBoxesCount(player, activeQuarter) < 6
                                )
                              }
                              className="px-2 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-black transition-colors"
                              title="Rellenar cuarto entero"
                            >
                              {getPlayerQuarterBoxesCount(player, activeQuarter) === 6 ? 'Vaciar' : 'Llenar'}
                            </button>
                          </div>
                        </td>
                      )}

                      {/* Total Minutes & Equity Badge */}
                      <td className="py-3 px-4 border-l border-slate-200 text-right align-middle bg-slate-50/40">
                        <div className="flex flex-col items-end">
                          <div className="flex items-center gap-1.5">
                            <span className="text-base font-black text-slate-900 tabular-nums">
                              {totalMins}
                            </span>
                            <span className="text-xs text-slate-500 font-bold">min</span>
                          </div>

                          <span className="text-[11px] font-bold text-slate-500 tabular-nums">
                            {totalBoxes} / {maxPossibleBoxes} casillas ({pct}%)
                          </span>

                          {/* Progress bar */}
                          <div className="w-24 h-2 bg-slate-200 rounded-full overflow-hidden mt-1.5">
                            <div
                              className={`h-full rounded-full transition-all duration-300 ${
                                isUnplayed
                                  ? 'bg-rose-500'
                                  : isLowMinutes
                                  ? 'bg-amber-500'
                                  : 'bg-emerald-500'
                              }`}
                              style={{ width: `${Math.min(100, pct)}%` }}
                            />
                          </div>

                          {/* Status Tag */}
                          <div className="mt-1">
                            {isUnplayed ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 text-[10px] font-black animate-pulse">
                                🔴 Sin jugar
                              </span>
                            ) : isLowMinutes ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 text-[10px] font-black">
                                🟡 Poco tiempo
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-black">
                                🟢 Equilibrada
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Equity & Coaching Tips Card */}
      <div className="bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-slate-50 border border-amber-200/80 rounded-3xl p-5 sm:p-6 space-y-3">
        <div className="flex items-center gap-2.5">
          <Award className="w-5 h-5 text-amber-600 shrink-0" />
          <h3 className="text-sm font-black text-slate-900">
            Guía Metodológica: ¿Cómo repartir minutos para que todas jueguen al máximo?
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-slate-600 pt-1">
          <div className="bg-white p-3.5 rounded-2xl border border-amber-200/60 space-y-1">
            <span className="font-extrabold text-amber-900 block">1. Regla de los 3 Intervalos Mínimos</span>
            <p className="leading-relaxed">
              En partidos formativos o autonómicos, procura que ninguna jugadora tenga menos de 3 casillas (~5 min). Si una jugadora no sale en la 1ª mitad (Q1-Q2), debe iniciar en el quinteto del 3º cuarto (Q3).
            </p>
          </div>

          <div className="bg-white p-3.5 rounded-2xl border border-amber-200/60 space-y-1">
            <span className="font-extrabold text-amber-900 block">2. Rotaciones por Parejas o Tríos</span>
            <p className="leading-relaxed">
              En lugar de cambiar 5 jugadoras a la vez (lo que desajusta el ritmo), realiza cambios de 2 en 2 en cada 2 casillas (~3 minutos). Esto mantiene fresco al equipo sin perder química en pista.
            </p>
          </div>

          <div className="bg-white p-3.5 rounded-2xl border border-amber-200/60 space-y-1">
            <span className="font-extrabold text-amber-900 block">3. Recompensa el Esfuerzo en Directo</span>
            <p className="leading-relaxed">
              Si una jugadora menos habitual entra y lucha un rebote o un balance defensivo, mantenla un intervalo extra. Verás cómo sube su confianza y compromiso con el equipo.
            </p>
          </div>
        </div>
      </div>

      {/* Modal: Add Temporary / Guest Player */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                  <Plus className="w-5 h-5 stroke-[3]" />
                </div>
                <h3 className="font-black text-slate-900 text-base">Añadir Jugadora al Partido</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold p-1 text-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddTempPlayer} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nombre de la Jugadora *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Sofía, Carla..."
                  value={newPlayerName}
                  onChange={(e) => setNewPlayerName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Dorsal *
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={99}
                    required
                    value={newPlayerNumber}
                    onChange={(e) => setNewPlayerNumber(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Posición
                  </label>
                  <select
                    value={newPlayerRole}
                    onChange={(e) => setNewPlayerRole(e.target.value as PlayerRole)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold focus:outline-none focus:border-emerald-500"
                  >
                    <option value="Base">Base</option>
                    <option value="Escolta">Escolta</option>
                    <option value="Alero">Alero</option>
                    <option value="Ala-Pívot">Ala-Pívot</option>
                    <option value="Pívot">Pívot</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black transition-all cursor-pointer shadow-md shadow-emerald-600/20"
                >
                  Añadir a la Rotación
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
