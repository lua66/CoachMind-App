import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Timer,
  Users,
  Plus,
  Trash2,
  RotateCcw,
  Check,
  AlertTriangle,
  ChevronRight,
  Flame,
  Clock,
  Sparkles,
  Award,
  ArrowUpDown,
  Filter,
  Eye,
  CheckCircle2,
  XCircle,
  TrendingUp,
  Shield,
  Zap,
  Star,
  RefreshCw,
  SlidersHorizontal,
  FileText,
  X,
  Share2,
  Edit3,
  CheckSquare,
  Square,
  UserCheck,
  LogIn,
  LogOut,
  Play,
  Pause,
  Download,
  FileSpreadsheet,
  FileType,
  Image as ImageIcon,
  ChevronDown,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { Player, UserProfile, ViewMode, PlayerRole } from '../types';

interface LiveMatchViewProps {
  players: Player[];
  userProfile?: UserProfile | null;
  onNavigate?: (view: ViewMode) => void;
}

export type QuarterKey = 'Q1' | 'Q2' | 'Q3' | 'Q4' | 'PR';

export interface StintRange {
  start: number;
  end: number;
  isOpen: boolean;
}

export interface LivePlayerRow {
  id: string;
  name: string;
  jerseyNumber: number;
  role: PlayerRole | string;
  onCourt: boolean;
  isStartingFive: boolean;
  // Events sequence for each quarter, e.g. [0, 3, 7] -> 0 enters (PISTA), 3 exits (BANCA), 7 enters (PISTA)
  quarterEvents: Record<QuarterKey, number[]>;
  // Derived active minute list [0, 1, 2, 3, 7, 8, 9, 10]
  quarterMinutes: Record<QuarterKey, number[]>;
  customAdded?: boolean;
}

export interface LineupStint {
  id: string;
  quarter: QuarterKey;
  minute: number;
  playerIds: string[];
  pointsScored: number;
  pointsConceded: number;
}

export interface SubstitutionLog {
  id: string;
  timestamp: string;
  quarter: QuarterKey;
  minute: number;
  playerOutId: string;
  playerOutName: string;
  playerOutNumber: number;
  playerInId: string;
  playerInName: string;
  playerInNumber: number;
  scoreHome: number;
  scoreAway: number;
}

const STORAGE_KEY = 'coachmind_live_match_state_v4';

const ROLE_COLORS: Record<string, { bg: string; text: string; badge: string }> = {
  Base: { bg: 'bg-blue-600', text: 'text-blue-700', badge: 'bg-blue-50 text-blue-700 border-blue-200' },
  Escolta: { bg: 'bg-emerald-600', text: 'text-emerald-700', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  Alero: { bg: 'bg-amber-600', text: 'text-amber-700', badge: 'bg-amber-50 text-amber-700 border-amber-200' },
  'Ala-Pívot': { bg: 'bg-indigo-600', text: 'text-indigo-700', badge: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  Pívot: { bg: 'bg-purple-600', text: 'text-purple-700', badge: 'bg-purple-50 text-purple-700 border-purple-200' },
};

const createEmptyQuarterEvents = (): Record<QuarterKey, number[]> => ({
  Q1: [],
  Q2: [],
  Q3: [],
  Q4: [],
  PR: [],
});

const createEmptyQuarterMinutes = (): Record<QuarterKey, number[]> => ({
  Q1: [],
  Q2: [],
  Q3: [],
  Q4: [],
  PR: [],
});

// Helper: Convert chronological events list (e.g. [0, 3, 7]) to structured stints
export function getStintsFromEvents(events: number[], maxMinute: number): StintRange[] {
  if (!events || events.length === 0) return [];
  const sorted = Array.from(new Set(events)).sort((a, b) => a - b);
  const stints: StintRange[] = [];

  for (let i = 0; i < sorted.length; i += 2) {
    const start = sorted[i];
    const hasEnd = i + 1 < sorted.length;
    const end = hasEnd ? sorted[i + 1] : maxMinute;
    stints.push({
      start,
      end,
      isOpen: !hasEnd,
    });
  }

  return stints;
}

// Helper: Calculate total minutes played in a quarter from events
export function calculateQuarterMinutesPlayed(events: number[], maxMinute: number): number {
  const stints = getStintsFromEvents(events, maxMinute);
  return stints.reduce((acc, s) => acc + Math.max(0, s.end - s.start), 0);
}

// Helper: Get list of active integer minute indices
export function getActiveMinutesList(events: number[], maxMinute: number): number[] {
  const stints = getStintsFromEvents(events, maxMinute);
  const minuteSet = new Set<number>();
  for (const s of stints) {
    for (let m = s.start; m <= s.end; m++) {
      minuteSet.add(m);
    }
  }
  return Array.from(minuteSet).sort((a, b) => a - b);
}

// Helper: Format readable ranges e.g. "0'➜3', 7'➜10'"
export function formatStintsReadable(events: number[], maxMinute: number): string {
  const stints = getStintsFromEvents(events, maxMinute);
  if (stints.length === 0) return 'Sin minutos';
  return stints
    .map((s) => (s.isOpen ? `${s.start}'➜${s.end}' (en pista)` : `${s.start}'➜${s.end}'`))
    .join(', ');
}

// Helper: Parse string like "0-3, 7-10" or "0 3 7" into events number[]
function parseEventsString(str: string, maxMinute: number): number[] {
  const events: number[] = [];
  const parts = str.split(/[,;\s]+/).filter(Boolean);

  for (const part of parts) {
    if (part.includes('-') || part.includes('➜') || part.includes('>')) {
      const [startStr, endStr] = part.split(/[-➜>]+/);
      const s = parseInt(startStr?.replace(/\D/g, '') || '0', 10);
      const e = parseInt(endStr?.replace(/\D/g, '') || `${maxMinute}`, 10);
      if (!isNaN(s) && !isNaN(e)) {
        const minVal = Math.max(0, Math.min(s, e));
        const maxVal = Math.min(maxMinute, Math.max(s, e));
        if (!events.includes(minVal)) events.push(minVal);
        if (maxVal !== minVal && !events.includes(maxVal)) events.push(maxVal);
      }
    } else {
      const num = parseInt(part.replace(/\D/g, ''), 10);
      if (!isNaN(num) && num >= 0 && num <= maxMinute) {
        if (!events.includes(num)) events.push(num);
      }
    }
  }

  return Array.from(new Set(events)).sort((a, b) => a - b);
}

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
  const [activeMinute, setActiveMinute] = useState<number>(0); // Current minute cursor
  const [includeOvertime, setIncludeOvertime] = useState<boolean>(false);
  const [focusQuarterMode, setFocusQuarterMode] = useState<boolean>(false);
  const [copiedNotification, setCopiedNotification] = useState<string | null>(null);

  // Modals
  const [showSubModal, setShowSubModal] = useState<boolean>(false);
  const [showSummaryModal, setShowSummaryModal] = useState<boolean>(false);
  const [showStartingFiveModal, setShowStartingFiveModal] = useState<boolean>(false);
  const [showAddPlayerModal, setShowAddPlayerModal] = useState<boolean>(false);
  const [showExportDropdown, setShowExportDropdown] = useState<boolean>(false);
  const summaryCaptureRef = useRef<HTMLDivElement>(null);
  const [directInputModalPlayer, setDirectInputModalPlayer] = useState<{
    player: LivePlayerRow;
    quarter: QuarterKey;
    currentText: string;
  } | null>(null);

  // Substitution Form State
  const [subOutPlayerId, setSubOutPlayerId] = useState<string>('');
  const [subInPlayerId, setSubInPlayerId] = useState<string>('');
  const [subMinute, setSubMinute] = useState<number>(0);

  // Filters & Sorting
  const [filterAlertsOnly, setFilterAlertsOnly] = useState<'all' | 'unplayed' | 'low' | 'oncourt'>('all');
  const [sortBy, setSortBy] = useState<'jersey' | 'minutesAsc' | 'minutesDesc'>('jersey');

  // Form for quick guest/temp player
  const [newPlayerName, setNewPlayerName] = useState('');
  const [newPlayerNumber, setNewPlayerNumber] = useState<number>(99);
  const [newPlayerRole, setNewPlayerRole] = useState<PlayerRole>('Alero');

  // Logs & Stints
  const [lineupStints, setLineupStints] = useState<LineupStint[]>([]);
  const [substitutionLogs, setSubstitutionLogs] = useState<SubstitutionLog[]>([]);

  // Main Player Rows State
  const [playerRows, setPlayerRows] = useState<LivePlayerRow[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) || localStorage.getItem('coachmind_live_match_state_v3');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed.rows) && parsed.rows.length > 0) {
          return parsed.rows.map((r: any) => ({
            ...r,
            quarterEvents: r.quarterEvents || createEmptyQuarterEvents(),
            quarterMinutes: r.quarterMinutes || createEmptyQuarterMinutes(),
          }));
        }
      }
    } catch (e) {
      console.warn('Failed to load saved state', e);
    }

    if (players && players.length > 0) {
      return players.map((p) => ({
        id: p.id,
        name: p.name,
        jerseyNumber: p.jerseyNumber,
        role: p.role,
        onCourt: false,
        isStartingFive: false,
        quarterEvents: createEmptyQuarterEvents(),
        quarterMinutes: createEmptyQuarterMinutes(),
        customAdded: false,
      }));
    }

    return [];
  });

  // Load configuration from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) || localStorage.getItem('coachmind_live_match_state_v3');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.rivalName) setRivalName(parsed.rivalName);
        if (parsed.matchDate) setMatchDate(parsed.matchDate);
        if (parsed.quarterMinutes) setQuarterMinutes(parsed.quarterMinutes);
        if (typeof parsed.scoreHome === 'number') setScoreHome(parsed.scoreHome);
        if (typeof parsed.scoreAway === 'number') setScoreAway(parsed.scoreAway);
        if (parsed.activeQuarter) setActiveQuarter(parsed.activeQuarter);
        if (typeof parsed.activeMinute === 'number') setActiveMinute(parsed.activeMinute);
        if (typeof parsed.includeOvertime === 'boolean') setIncludeOvertime(parsed.includeOvertime);
        if (Array.isArray(parsed.lineupStints)) setLineupStints(parsed.lineupStints);
        if (Array.isArray(parsed.substitutionLogs)) setSubstitutionLogs(parsed.substitutionLogs);
      }
    } catch (e) {}
  }, []);

  // Sync Player List whenever the team roster (`players`) changes
  useEffect(() => {
    if (!players || players.length === 0) return;

    setPlayerRows((currentRows) => {
      const existingMap = new Map<string, LivePlayerRow>(currentRows.map((r) => [r.id, r]));
      let hasChanges = false;

      const updatedList: LivePlayerRow[] = [];

      // 1. Process roster players
      players.forEach((p) => {
        const existing = existingMap.get(p.id);
        if (existing) {
          const isProfileChanged =
            existing.name !== p.name ||
            existing.jerseyNumber !== p.jerseyNumber ||
            existing.role !== p.role;

          if (isProfileChanged) {
            hasChanges = true;
            updatedList.push({
              ...existing,
              name: p.name,
              jerseyNumber: p.jerseyNumber,
              role: p.role,
            });
          } else {
            updatedList.push(existing);
          }
          existingMap.delete(p.id);
        } else {
          // Newly added player from roster
          hasChanges = true;
          updatedList.push({
            id: p.id,
            name: p.name,
            jerseyNumber: p.jerseyNumber,
            role: p.role,
            onCourt: false,
            isStartingFive: false,
            quarterEvents: createEmptyQuarterEvents(),
            quarterMinutes: createEmptyQuarterMinutes(),
            customAdded: false,
          });
        }
      });

      // 2. Keep any customAdded guest players
      existingMap.forEach((leftover) => {
        if (leftover.customAdded) {
          updatedList.push(leftover);
        } else {
          hasChanges = true;
        }
      });

      return hasChanges ? updatedList : currentRows;
    });
  }, [players]);

  // Persist state to localStorage
  useEffect(() => {
    const dataToSave = {
      rivalName,
      matchDate,
      quarterMinutes,
      scoreHome,
      scoreAway,
      activeQuarter,
      activeMinute,
      includeOvertime,
      rows: playerRows,
      lineupStints,
      substitutionLogs,
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
    } catch (e) {}
  }, [
    rivalName,
    matchDate,
    quarterMinutes,
    scoreHome,
    scoreAway,
    activeQuarter,
    activeMinute,
    includeOvertime,
    playerRows,
    lineupStints,
    substitutionLogs,
  ]);

  // Toast Helper
  const showToast = (msg: string) => {
    setCopiedNotification(msg);
    setTimeout(() => {
      setCopiedNotification(null);
    }, 3500);
  };

  // Quarters List
  const quartersList: QuarterKey[] = includeOvertime
    ? ['Q1', 'Q2', 'Q3', 'Q4', 'PR']
    : ['Q1', 'Q2', 'Q3', 'Q4'];

  const maxPossibleMatchMinutes = quarterMinutes * quartersList.length;

  // Total minutes played for a player across all quarters
  const getPlayerTotalMinutes = (player: LivePlayerRow): number => {
    return quartersList.reduce((acc, q) => {
      const events = player.quarterEvents?.[q] || [];
      return acc + calculateQuarterMinutesPlayed(events, quarterMinutes);
    }, 0);
  };

  // Players currently on court and on bench
  const onCourtPlayers = useMemo(() => playerRows.filter((r) => r.onCourt), [playerRows]);
  const benchPlayers = useMemo(() => playerRows.filter((r) => !r.onCourt), [playerRows]);
  const onCourtCount = onCourtPlayers.length;

  // Starting 5 players (strictly players who started Q1 at min 0 or marked as starting five)
  const startingFivePlayers = useMemo(() => {
    return playerRows.filter((r) => {
      const q1Events = r.quarterEvents?.Q1 || [];
      return r.isStartingFive || (q1Events.length > 0 && q1Events[0] === 0);
    });
  }, [playerRows]);

  // Unplayed and low-minute alerts
  const unplayedPlayers = useMemo(() => {
    return playerRows.filter((r) => getPlayerTotalMinutes(r) === 0);
  }, [playerRows, includeOvertime, quarterMinutes]);

  const lowMinutesPlayers = useMemo(() => {
    return playerRows.filter((r) => {
      const m = getPlayerTotalMinutes(r);
      return m > 0 && m <= quarterMinutes * 0.5;
    });
  }, [playerRows, includeOvertime, quarterMinutes]);

  /**
   * CORE INTERACTION: Click on a minute pill
   * 1st click (any minute M1):
   *   - Automatically puts player on court (onCourt = true, 🟢 PISTA)
   *   - If in Q1 and minute 0: marked automatically as Starting 5 (🌟 Quinteto Inicial)
   *   - Opens stint from M1 to end of quarter
   * 2nd click (minute M2 > M1):
   *   - Automatically takes player off court (onCourt = false, ⚪ BANCA)
   *   - Closes stint [M1, M2] (e.g. 0' ➜ 3' = 3 min played)
   *   - Minutes after M2 turn off
   * 3rd click (minute M3 > M2):
   *   - Player enters again (onCourt = true, 🟢 PISTA)
   *   - Opens new stint [M3, end] (e.g. 7' ➜ 10' = 3 min, total 6 min)
   * Click on existing event:
   *   - Toggles/removes that event (undo action)
   */
  const handleToggleMinutePill = (playerId: string, quarter: QuarterKey, clickedMinute: number) => {
    setPlayerRows((prev) =>
      prev.map((r) => {
        if (r.id !== playerId) return r;

        const currentEvents = r.quarterEvents?.[quarter] || [];
        let nextEvents = [...currentEvents];

        const existingIdx = nextEvents.indexOf(clickedMinute);
        if (existingIdx !== -1) {
          // Remove/undo clicked event
          nextEvents.splice(existingIdx, 1);
        } else {
          // Add event and sort chronologically
          nextEvents.push(clickedMinute);
          nextEvents.sort((a, b) => a - b);
        }

        // Determine if player is on court:
        // Odd count of events means last action was an Entry (🟢 PISTA)
        // Even count means last action was an Exit (⚪ BANCA)
        const isOddCount = nextEvents.length % 2 === 1;
        const isNowOnCourt = quarter === activeQuarter ? isOddCount : r.onCourt;

        // Check starting five status if in Q1 at minute 0
        let nextStartingFive = r.isStartingFive;
        if (quarter === 'Q1') {
          nextStartingFive = nextEvents.length > 0 && nextEvents[0] === 0;
        }

        const activeMins = getActiveMinutesList(nextEvents, quarterMinutes);

        // Feedback toast
        if (existingIdx === -1) {
          const eventPos = nextEvents.indexOf(clickedMinute);
          const isEntry = eventPos % 2 === 0;
          if (isEntry) {
            const startTag = quarter === 'Q1' && clickedMinute === 0 ? ' · ⭐ Quinteto Inicial' : '';
            showToast(`🟢 #${r.jerseyNumber} ${r.name} ENTRA a pista en min ${clickedMinute}'${startTag}`);
          } else {
            const stintLength = clickedMinute - nextEvents[eventPos - 1];
            showToast(`🔴 #${r.jerseyNumber} ${r.name} SALE a la banca en min ${clickedMinute}' (${stintLength}m en este tramo)`);
          }
        } else {
          showToast(`↩️ Minuto ${clickedMinute}' desmarcado para #${r.jerseyNumber} ${r.name}`);
        }

        return {
          ...r,
          onCourt: isNowOnCourt,
          isStartingFive: nextStartingFive,
          quarterEvents: {
            ...r.quarterEvents,
            [quarter]: nextEvents,
          },
          quarterMinutes: {
            ...r.quarterMinutes,
            [quarter]: activeMins,
          },
        };
      })
    );
  };

  // Quick preset: Select full quarter (0 to quarterMinutes)
  const handleSetFullQuarter = (playerId: string, quarter: QuarterKey) => {
    setPlayerRows((prev) =>
      prev.map((r) => {
        if (r.id !== playerId) return r;
        const nextEvents = [0]; // Open stint from 0 to quarterMinutes
        const activeMins = getActiveMinutesList(nextEvents, quarterMinutes);
        return {
          ...r,
          onCourt: quarter === activeQuarter ? true : r.onCourt,
          isStartingFive: quarter === 'Q1' ? true : r.isStartingFive,
          quarterEvents: {
            ...r.quarterEvents,
            [quarter]: nextEvents,
          },
          quarterMinutes: {
            ...r.quarterMinutes,
            [quarter]: activeMins,
          },
        };
      })
    );
    showToast(`⏱️ Cuarto completo (0'-${quarterMinutes}') asignado`);
  };

  // Quick preset: Clear quarter
  const handleClearQuarter = (playerId: string, quarter: QuarterKey) => {
    setPlayerRows((prev) =>
      prev.map((r) => {
        if (r.id !== playerId) return r;
        return {
          ...r,
          onCourt: quarter === activeQuarter ? false : r.onCourt,
          isStartingFive: quarter === 'Q1' ? false : r.isStartingFive,
          quarterEvents: {
            ...r.quarterEvents,
            [quarter]: [],
          },
          quarterMinutes: {
            ...r.quarterMinutes,
            [quarter]: [],
          },
        };
      })
    );
    showToast(`🗑️ Minutos del cuarto borrados`);
  };

  // Save manually typed minute ranges (e.g. "0-3, 7-10")
  const handleSaveDirectMinuteInput = (text: string) => {
    if (!directInputModalPlayer) return;
    const { player, quarter } = directInputModalPlayer;
    const parsedEvents = parseEventsString(text, quarterMinutes);
    const activeMins = getActiveMinutesList(parsedEvents, quarterMinutes);
    const isOdd = parsedEvents.length % 2 === 1;

    setPlayerRows((prev) =>
      prev.map((r) => {
        if (r.id !== player.id) return r;
        return {
          ...r,
          onCourt: quarter === activeQuarter ? isOdd : r.onCourt,
          isStartingFive: quarter === 'Q1' && parsedEvents.length > 0 && parsedEvents[0] === 0 ? true : r.isStartingFive,
          quarterEvents: {
            ...r.quarterEvents,
            [quarter]: parsedEvents,
          },
          quarterMinutes: {
            ...r.quarterMinutes,
            [quarter]: activeMins,
          },
        };
      })
    );

    setDirectInputModalPlayer(null);
    showToast(`✅ Minutos de ${player.name} guardados: ${formatStintsReadable(parsedEvents, quarterMinutes)}`);
  };

  // Toggle Pista / Banca manually on player badge
  const handleToggleOnCourt = (playerId: string) => {
    const targetPlayer = playerRows.find((p) => p.id === playerId);
    if (!targetPlayer) return;

    setPlayerRows((prev) =>
      prev.map((r) => {
        if (r.id !== playerId) return r;
        const nextOnCourt = !r.onCourt;
        showToast(
          nextOnCourt
            ? `🟢 #${r.jerseyNumber} ${r.name} en PISTA`
            : `⚪ #${r.jerseyNumber} ${r.name} a BANCA`
        );
        return {
          ...r,
          onCourt: nextOnCourt,
        };
      })
    );
  };

  // Toggle Starting 5 selection in modal
  const handleToggleStartingFivePlayer = (playerId: string) => {
    setPlayerRows((prev) =>
      prev.map((r) => {
        if (r.id !== playerId) return r;
        const nextStart = !r.isStartingFive;
        let q1Events = [...(r.quarterEvents?.Q1 || [])];

        if (nextStart) {
          if (!q1Events.includes(0)) q1Events = [0, ...q1Events].sort((a, b) => a - b);
        } else {
          q1Events = q1Events.filter((m) => m !== 0);
        }

        const activeMins = getActiveMinutesList(q1Events, quarterMinutes);

        return {
          ...r,
          isStartingFive: nextStart,
          onCourt: nextStart ? true : r.onCourt,
          quarterEvents: {
            ...r.quarterEvents,
            Q1: q1Events,
          },
          quarterMinutes: {
            ...r.quarterMinutes,
            Q1: activeMins,
          },
        };
      })
    );
  };

  // Save Starting 5 from Modal
  const handleConfirmStartingFive = () => {
    if (startingFivePlayers.length !== 5) {
      showToast(`⚠️ Tienes ${startingFivePlayers.length} jugadoras seleccionadas. Deben ser exactamente 5.`);
      return;
    }

    setPlayerRows((prev) =>
      prev.map((r) => {
        const isStart = r.isStartingFive;
        let q1Events = isStart ? (r.quarterEvents?.Q1?.includes(0) ? r.quarterEvents.Q1 : [0]) : r.quarterEvents?.Q1 || [];
        const activeMins = getActiveMinutesList(q1Events, quarterMinutes);

        return {
          ...r,
          isStartingFive: isStart,
          onCourt: isStart ? true : false,
          quarterEvents: {
            ...r.quarterEvents,
            Q1: q1Events,
          },
          quarterMinutes: {
            ...r.quarterMinutes,
            Q1: activeMins,
          },
        };
      })
    );

    setShowStartingFiveModal(false);
    showToast('🌟 ¡Quinteto Inicial confirmado y puesto en pista para el inicio!');
  };

  // Quick action: Set all 5 on court to starting 5
  const handleSetCurrentOnCourtAsStartingFive = () => {
    if (onCourtCount !== 5) {
      showToast('⚠️ Debes tener exactamente 5 jugadoras en pista para fijar el Quinteto Inicial.');
      return;
    }
    setPlayerRows((prev) =>
      prev.map((r) => {
        const isStart = r.onCourt;
        let q1Events = isStart ? (r.quarterEvents?.Q1?.includes(0) ? r.quarterEvents.Q1 : [0]) : r.quarterEvents?.Q1 || [];
        const activeMins = getActiveMinutesList(q1Events, quarterMinutes);

        return {
          ...r,
          isStartingFive: isStart,
          quarterEvents: {
            ...r.quarterEvents,
            Q1: isStart ? q1Events : r.quarterEvents?.Q1 || [],
          },
          quarterMinutes: {
            ...r.quarterMinutes,
            Q1: isStart ? activeMins : r.quarterMinutes?.Q1 || [],
          },
        };
      })
    );
    showToast('🌟 ¡Quinteto Inicial actualizado con las 5 jugadoras en pista!');
  };

  // EXECUTE SUBSTITUTION (Sale X, Entra Y en Minuto Z)
  const handleExecuteSubstitution = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subOutPlayerId || !subInPlayerId) {
      showToast('⚠️ Selecciona qué jugadora sale y cuál entra.');
      return;
    }

    const outPlayer = playerRows.find((p) => p.id === subOutPlayerId);
    const inPlayer = playerRows.find((p) => p.id === subInPlayerId);

    if (!outPlayer || !inPlayer) return;

    const minute = Math.max(0, Math.min(quarterMinutes, Number(subMinute)));

    setPlayerRows((prev) =>
      prev.map((r) => {
        // Player OUT: adds exit event at minute
        if (r.id === subOutPlayerId) {
          const curEvents = r.quarterEvents?.[activeQuarter] || [];
          let nextEvents = [...curEvents];
          if (!nextEvents.includes(minute)) {
            nextEvents.push(minute);
            nextEvents.sort((a, b) => a - b);
          }
          const activeMins = getActiveMinutesList(nextEvents, quarterMinutes);

          return {
            ...r,
            onCourt: false,
            quarterEvents: {
              ...r.quarterEvents,
              [activeQuarter]: nextEvents,
            },
            quarterMinutes: {
              ...r.quarterMinutes,
              [activeQuarter]: activeMins,
            },
          };
        }

        // Player IN: adds entry event at minute
        if (r.id === subInPlayerId) {
          const curEvents = r.quarterEvents?.[activeQuarter] || [];
          let nextEvents = [...curEvents];
          if (!nextEvents.includes(minute)) {
            nextEvents.push(minute);
            nextEvents.sort((a, b) => a - b);
          }
          const activeMins = getActiveMinutesList(nextEvents, quarterMinutes);

          return {
            ...r,
            onCourt: true,
            quarterEvents: {
              ...r.quarterEvents,
              [activeQuarter]: nextEvents,
            },
            quarterMinutes: {
              ...r.quarterMinutes,
              [activeQuarter]: activeMins,
            },
          };
        }

        return r;
      })
    );

    // Add Substitution Log
    const newLog: SubstitutionLog = {
      id: `sub-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      quarter: activeQuarter,
      minute,
      playerOutId: outPlayer.id,
      playerOutName: outPlayer.name,
      playerOutNumber: outPlayer.jerseyNumber,
      playerInId: inPlayer.id,
      playerInName: inPlayer.name,
      playerInNumber: inPlayer.jerseyNumber,
      scoreHome,
      scoreAway,
    };
    setSubstitutionLogs((prev) => [newLog, ...prev]);

    setShowSubModal(false);
    setSubOutPlayerId('');
    setSubInPlayerId('');
    showToast(
      `🔄 [${activeQuarter} · Min ${minute}'] Sale #${outPlayer.jerseyNumber} ${outPlayer.name} ➔ Entra #${inPlayer.jerseyNumber} ${inPlayer.name}`
    );
  };

  // Add temporary guest player
  const handleAddCustomPlayer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlayerName.trim()) return;

    const newPlayer: LivePlayerRow = {
      id: `guest-${Date.now()}`,
      name: newPlayerName.trim(),
      jerseyNumber: Number(newPlayerNumber) || 0,
      role: newPlayerRole,
      onCourt: false,
      isStartingFive: false,
      quarterEvents: createEmptyQuarterEvents(),
      quarterMinutes: createEmptyQuarterMinutes(),
      customAdded: true,
    };

    setPlayerRows((prev) => [...prev, newPlayer]);
    setNewPlayerName('');
    setShowAddPlayerModal(false);
    showToast(`✅ Jugadora #${newPlayer.jerseyNumber} ${newPlayer.name} añadida al partido`);
  };

  // Lineup Analysis: Most Offensive & Most Defensive Lineups
  const lineupAnalysis = useMemo(() => {
    const sortedByMinutes = [...playerRows].sort(
      (a, b) => getPlayerTotalMinutes(b) - getPlayerTotalMinutes(a)
    );
    const topFive = sortedByMinutes.slice(0, 5);

    const offensiveLineup = startingFivePlayers.length === 5 ? startingFivePlayers : topFive;
    const defensiveLineup =
      playerRows.filter((p) => p.role === 'Base' || p.role === 'Pívot' || p.role === 'Ala-Pívot')
        .length >= 5
        ? playerRows
            .filter((p) => p.role === 'Base' || p.role === 'Pívot' || p.role === 'Ala-Pívot')
            .slice(0, 5)
        : topFive;

    return {
      offensiveLineup,
      defensiveLineup,
    };
  }, [playerRows, startingFivePlayers]);

  // ==========================================
  // EXPORT FUNCTIONS (EXCEL, WORD, PDF, PNG)
  // ==========================================

  // 1. EXPORT TO EXCEL (.xlsx)
  const handleExportExcel = () => {
    try {
      const sorted = [...playerRows].sort(
        (a, b) => getPlayerTotalMinutes(b) - getPlayerTotalMinutes(a)
      );

      // Sheet 1: General Summary & Players
      const generalData: (string | number)[][] = [
        ['COACHMIND BASKETBALL - CONTROL DE MINUTOS Y ROTACIONES'],
        ['Fecha:', matchDate, '', 'Partido:', `Nosotros ${scoreHome} - ${scoreAway} ${rivalName || 'Rival'}`],
        ['Formato:', `${quartersList.length} cuartos de ${quarterMinutes} min`, '', 'Marcador:', `${scoreHome} - ${scoreAway}`],
        [''],
        ['QUINTETOS DESTACADOS'],
        ['Quinteto Inicial:', startingFivePlayers.length > 0 ? startingFivePlayers.map(p => `#${p.jerseyNumber} ${p.name} (${p.role})`).join(' | ') : 'No fijado'],
        ['Quinteto Más Ofensivo:', lineupAnalysis.offensiveLineup.map(p => `#${p.jerseyNumber} ${p.name} (${p.role})`).join(' | ')],
        ['Quinteto Más Defensivo:', lineupAnalysis.defensiveLineup.map(p => `#${p.jerseyNumber} ${p.name} (${p.role})`).join(' | ')],
        [''],
        ['DESGLOSE INDIVIDUAL DE MINUTOS'],
        [
          'Dorsal',
          'Jugadora',
          'Posición',
          'Titular',
          ...quartersList.map(q => `Minutos ${q}`),
          'Total Minutos',
          '% Minutos',
          'Tramos de Juego'
        ],
        ...sorted.map(p => {
          const totalMins = getPlayerTotalMinutes(p);
          const pct = Math.round((totalMins / maxPossibleMatchMinutes) * 100);
          const qMins = quartersList.map(q => calculateQuarterMinutesPlayed(p.quarterEvents?.[q] || [], quarterMinutes));
          const stintsStr = quartersList.map(q => {
            const evts = p.quarterEvents?.[q] || [];
            const str = formatStintsReadable(evts, quarterMinutes);
            return str ? `${q}: ${str}` : '';
          }).filter(Boolean).join(' | ');

          return [
            p.jerseyNumber,
            p.name,
            p.role,
            p.isStartingFive ? 'SÍ' : 'NO',
            ...qMins,
            totalMins,
            `${pct}%`,
            stintsStr || '-'
          ];
        })
      ];

      // Sheet 2: Substitutions Log
      const subData: (string | number)[][] = [
        ['HISTORIAL DE SUSTITUCIONES EN VIVO'],
        ['Cuarto', 'Minuto', 'Sale', 'Entra', 'Marcador al momento', 'Hora'],
        ...substitutionLogs.map(s => [
          s.quarter,
          `${s.minute}'`,
          `#${s.playerOutNumber} ${s.playerOutName}`,
          `#${s.playerInNumber} ${s.playerInName}`,
          `${s.scoreHome} - ${s.scoreAway}`,
          s.timestamp
        ])
      ];

      const wb = XLSX.utils.book_new();
      const ws1 = XLSX.utils.aoa_to_sheet(generalData);
      const ws2 = XLSX.utils.aoa_to_sheet(subData);

      XLSX.utils.book_append_sheet(wb, ws1, 'Minutos y Quintetos');
      XLSX.utils.book_append_sheet(wb, ws2, 'Historial Sustituciones');

      const cleanRival = (rivalName || 'Rival').replace(/[^a-zA-Z0-9_-]/g, '_');
      XLSX.writeFile(wb, `Resumen_Partido_${cleanRival}_${matchDate}.xlsx`);
      showToast('📊 ¡Resumen descargado en Excel (.xlsx)!');
    } catch (err) {
      console.error(err);
      showToast('❌ Error al exportar a Excel');
    }
  };

  // 2. EXPORT TO WORD (.doc)
  const handleExportWord = () => {
    try {
      const sorted = [...playerRows].sort(
        (a, b) => getPlayerTotalMinutes(b) - getPlayerTotalMinutes(a)
      );

      const rowsHtml = sorted.map((p, idx) => {
        const totalMins = getPlayerTotalMinutes(p);
        const pct = Math.round((totalMins / maxPossibleMatchMinutes) * 100);
        const qCells = quartersList.map(q => {
          const evts = p.quarterEvents?.[q] || [];
          const m = calculateQuarterMinutesPlayed(evts, quarterMinutes);
          return `<td style="padding: 7px; text-align: center; border: 1px solid #cbd5e1; font-weight: 600;">${m}'</td>`;
        }).join('');

        const stints = quartersList.map(q => {
          const evts = p.quarterEvents?.[q] || [];
          const str = formatStintsReadable(evts, quarterMinutes);
          return str ? `<b>${q}:</b> ${str}` : '';
        }).filter(Boolean).join(' &bull; ');

        return `
          <tr style="background-color: ${idx % 2 === 0 ? '#ffffff' : '#f8fafc'};">
            <td style="padding: 7px; border: 1px solid #cbd5e1; font-weight: bold; text-align: center; color: #0f172a;">#${p.jerseyNumber}</td>
            <td style="padding: 7px; border: 1px solid #cbd5e1; font-weight: bold; color: #0f172a;">${p.name} ${p.isStartingFive ? '<span style="color:#d97706;">★ (Titular)</span>' : ''}</td>
            <td style="padding: 7px; border: 1px solid #cbd5e1; text-align: center; color: #475569;">${p.role}</td>
            ${qCells}
            <td style="padding: 7px; border: 1px solid #cbd5e1; font-weight: bold; text-align: center; color: #059669; font-size: 13px;">${totalMins}'</td>
            <td style="padding: 7px; border: 1px solid #cbd5e1; text-align: center; color: #475569; font-weight: 600;">${pct}%</td>
            <td style="padding: 7px; border: 1px solid #cbd5e1; font-size: 11px; color: #334155;">${stints || '-'}</td>
          </tr>
        `;
      }).join('');

      const cleanRival = rivalName || 'Rival';

      const wordHtml = `
        <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
        <head>
          <meta charset="utf-8">
          <title>Resumen de Partido - CoachMind Basketball</title>
          <style>
            body { font-family: 'Segoe UI', Calibri, Arial, sans-serif; margin: 24px; color: #0f172a; line-height: 1.4; }
            h1 { color: #0f172a; margin-bottom: 2px; font-size: 24px; }
            .subtitle { color: #64748b; font-size: 13px; margin-bottom: 18px; font-weight: 500; }
            .box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px; margin-bottom: 18px; }
            .badge-amber { background: #fef3c7; color: #92400e; padding: 3px 8px; border-radius: 4px; font-weight: bold; font-size: 12px; }
            .badge-emerald { background: #d1fae5; color: #065f46; padding: 3px 8px; border-radius: 4px; font-weight: bold; font-size: 12px; }
            .badge-blue { background: #dbeafe; color: #1e40af; padding: 3px 8px; border-radius: 4px; font-weight: bold; font-size: 12px; }
            table { width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 12px; }
            th { background: #0f172a; color: #ffffff; padding: 8px; border: 1px solid #0f172a; font-weight: bold; text-align: center; }
          </style>
        </head>
        <body>
          <h1>🏀 CONTROL DE MINUTOS Y ROTACIONES</h1>
          <div class="subtitle">CoachMind Basketball · Informe Oficial de Partido</div>

          <div class="box">
            <p style="margin: 0 0 8px 0; font-size: 14px;">
              <b>Partido:</b> Nosotros <b>${scoreHome} - ${scoreAway}</b> ${cleanRival} &nbsp;|&nbsp; 
              <b>Fecha:</b> ${matchDate} &nbsp;|&nbsp; 
              <b>Formato:</b> ${quartersList.length} cuartos de ${quarterMinutes} min
            </p>
            <p style="margin: 6px 0;">
              <span class="badge-amber">QUINTETO INICIAL</span> 
              ${startingFivePlayers.length > 0 ? startingFivePlayers.map(p => `#${p.jerseyNumber} ${p.name}`).join(' · ') : 'No fijado'}
            </p>
            <p style="margin: 6px 0;">
              <span class="badge-emerald">MÁS OFENSIVO</span> 
              ${lineupAnalysis.offensiveLineup.map(p => `#${p.jerseyNumber} ${p.name}`).join(' · ')}
            </p>
            <p style="margin: 6px 0;">
              <span class="badge-blue">MÁS DEFENSIVO</span> 
              ${lineupAnalysis.defensiveLineup.map(p => `#${p.jerseyNumber} ${p.name}`).join(' · ')}
            </p>
          </div>

          <h3 style="margin-bottom: 6px; color: #0f172a;">📊 Desglose Individual de Minutos y Tramos</h3>
          <table>
            <thead>
              <tr>
                <th style="width: 50px;">Dorsal</th>
                <th>Jugadora</th>
                <th style="width: 80px;">Posición</th>
                ${quartersList.map(q => `<th style="width: 45px;">${q}</th>`).join('')}
                <th style="width: 60px;">Total</th>
                <th style="width: 50px;">%</th>
                <th>Tramos de Entrada / Salida</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>

          <p style="font-size: 11px; color: #94a3b8; margin-top: 20px; text-align: right;">
            Generado automáticamente con CoachMind Basketball · ${new Date().toLocaleString()}
          </p>
        </body>
        </html>
      `;

      const blob = new Blob(['\ufeff', wordHtml], { type: 'application/msword' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const cleanRivalName = cleanRival.replace(/[^a-zA-Z0-9_-]/g, '_');
      a.download = `Resumen_Partido_${cleanRivalName}_${matchDate}.doc`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast('📝 ¡Resumen descargado en formato Word (.doc)!');
    } catch (err) {
      console.error(err);
      showToast('❌ Error al exportar a Word');
    }
  };

  // 3. EXPORT TO PDF (.pdf)
  const handleExportPdf = () => {
    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const pageWidth = doc.internal.pageSize.getWidth();

      // Header Banner
      doc.setFillColor(15, 23, 42); // slate-900
      doc.rect(0, 0, pageWidth, 28, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('COACHMIND BASKETBALL', 14, 11);

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(251, 191, 36); // amber-400
      doc.text('CONTROL DE MINUTOS Y ROTACIONES EN VIVO', 14, 17);

      doc.setTextColor(203, 213, 225);
      doc.setFontSize(7.5);
      doc.text(`Fecha: ${matchDate} | Generado: ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`, 14, 23);

      // Match Score Card
      doc.setFillColor(241, 245, 249); // slate-100
      doc.roundedRect(14, 32, pageWidth - 28, 20, 2.5, 2.5, 'F');

      doc.setFontSize(11);
      doc.setTextColor(15, 23, 42);
      doc.setFont('helvetica', 'bold');
      doc.text(`PARTIDO: Nosotros ${scoreHome} - ${scoreAway} ${rivalName || 'Rival'}`, 18, 40);

      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(71, 85, 105);
      doc.text(`Formato: ${quartersList.length} cuartos de ${quarterMinutes} min | Prórroga: ${includeOvertime ? 'Sí' : 'No'}`, 18, 47);

      // Lineups Card
      let y = 56;
      doc.setFillColor(254, 243, 199); // amber-100
      doc.roundedRect(14, y, pageWidth - 28, 24, 2.5, 2.5, 'F');

      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(146, 64, 14); // amber-800
      doc.text('QUINTETO INICIAL:', 18, y + 5.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(15, 23, 42);
      const startStr = startingFivePlayers.length > 0 ? startingFivePlayers.map(p => `#${p.jerseyNumber} ${p.name}`).join(' · ') : 'No fijado';
      doc.text(startStr, 52, y + 5.5);

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(4, 120, 87); // emerald-700
      doc.text('MÁS OFENSIVO:', 18, y + 12);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(15, 23, 42);
      doc.text(lineupAnalysis.offensiveLineup.map(p => `#${p.jerseyNumber} ${p.name}`).join(' · '), 52, y + 12);

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(29, 78, 216); // blue-700
      doc.text('MÁS DEFENSIVO:', 18, y + 18.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(15, 23, 42);
      doc.text(lineupAnalysis.defensiveLineup.map(p => `#${p.jerseyNumber} ${p.name}`).join(' · '), 52, y + 18.5);

      // Player Breakdown Table
      y = 85;
      doc.setFontSize(9.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text('DESGLOSE DE MINUTOS POR JUGADORA', 14, y);

      y += 4;
      // Header
      doc.setFillColor(30, 41, 59); // slate-800
      doc.rect(14, y, pageWidth - 28, 6.5, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(7);
      doc.setFont('helvetica', 'bold');
      doc.text('#', 17, y + 4.5);
      doc.text('JUGADORA', 25, y + 4.5);
      doc.text('POS', 65, y + 4.5);

      let qOffset = 82;
      quartersList.forEach(q => {
        doc.text(q, qOffset, y + 4.5);
        qOffset += 11;
      });
      doc.text('TOTAL', qOffset + 2, y + 4.5);
      doc.text('%', qOffset + 15, y + 4.5);
      doc.text('TRAMOS', qOffset + 25, y + 4.5);

      y += 6.5;
      const sorted = [...playerRows].sort((a, b) => getPlayerTotalMinutes(b) - getPlayerTotalMinutes(a));

      sorted.forEach((p, idx) => {
        if (y > 275) {
          doc.addPage();
          y = 15;
        }
        const totalMins = getPlayerTotalMinutes(p);
        const pct = Math.round((totalMins / maxPossibleMatchMinutes) * 100);

        doc.setFillColor(idx % 2 === 0 ? 255 : 248, idx % 2 === 0 ? 255 : 250, idx % 2 === 0 ? 255 : 252);
        doc.rect(14, y, pageWidth - 28, 6, 'F');

        doc.setTextColor(15, 23, 42);
        doc.setFontSize(7);
        doc.setFont('helvetica', p.isStartingFive ? 'bold' : 'normal');
        doc.text(`${p.jerseyNumber}`, 17, y + 4.2);
        doc.text(`${p.name}${p.isStartingFive ? ' *' : ''}`, 25, y + 4.2);
        doc.text(`${p.role.slice(0, 6)}`, 65, y + 4.2);

        let curQOffset = 82;
        quartersList.forEach(q => {
          const evts = p.quarterEvents?.[q] || [];
          const m = calculateQuarterMinutesPlayed(evts, quarterMinutes);
          doc.text(`${m}'`, curQOffset, y + 4.2);
          curQOffset += 11;
        });

        doc.setFont('helvetica', 'bold');
        doc.setTextColor(4, 120, 87);
        doc.text(`${totalMins}'`, curQOffset + 2, y + 4.2);

        doc.setFont('helvetica', 'normal');
        doc.setTextColor(71, 85, 105);
        doc.text(`${pct}%`, curQOffset + 15, y + 4.2);

        const stintsStr = quartersList.map(q => {
          const evts = p.quarterEvents?.[q] || [];
          const str = formatStintsReadable(evts, quarterMinutes);
          return str ? `${q}:${str}` : '';
        }).filter(Boolean).join(' ');

        doc.setFontSize(6.2);
        doc.text(stintsStr.slice(0, 38) || '-', curQOffset + 25, y + 4.2);

        y += 6;
      });

      const cleanRival = (rivalName || 'Rival').replace(/[^a-zA-Z0-9_-]/g, '_');
      doc.save(`Resumen_Partido_${cleanRival}_${matchDate}.pdf`);
      showToast('📄 ¡Resumen descargado en PDF!');
    } catch (err) {
      console.error(err);
      showToast('❌ Error al exportar PDF');
    }
  };

  // 4. EXPORT TO PNG (.png)
  const handleExportPng = async () => {
    const element = document.getElementById('match-summary-capture-container') || summaryCaptureRef.current;
    if (!element) {
      showToast('⚠️ No se encontró la vista del resumen para capturar.');
      return;
    }

    showToast('🖼️ Generando imagen PNG en alta definición...');
    try {
      const canvas = await html2canvas(element, {
        scale: 2,
        backgroundColor: '#0f172a',
        useCORS: true,
        logging: false,
      });
      const imgData = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = imgData;
      const cleanRival = (rivalName || 'Rival').replace(/[^a-zA-Z0-9_-]/g, '_');
      a.download = `Resumen_Partido_${cleanRival}_${matchDate}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      showToast('🖼️ ¡Imagen PNG descargada con éxito!');
    } catch (err) {
      console.error(err);
      showToast('❌ Error al exportar imagen PNG');
    }
  };

  // Unified export dispatcher
  const handleExport = (format: 'excel' | 'word' | 'pdf' | 'png') => {
    setShowExportDropdown(false);
    if (format === 'excel') handleExportExcel();
    else if (format === 'word') handleExportWord();
    else if (format === 'pdf') handleExportPdf();
    else if (format === 'png') handleExportPng();
  };

  // Reset Match
  const handleResetMatch = () => {
    if (
      window.confirm(
        '¿Seguro que deseas reiniciar el partido en vivo? Se borrarán los minutos y cambios anotados.'
      )
    ) {
      setPlayerRows((prev) =>
        prev.map((r) => ({
          ...r,
          onCourt: false,
          isStartingFive: false,
          quarterEvents: createEmptyQuarterEvents(),
          quarterMinutes: createEmptyQuarterMinutes(),
        }))
      );
      setScoreHome(0);
      setScoreAway(0);
      setActiveQuarter('Q1');
      setActiveMinute(0);
      setLineupStints([]);
      setSubstitutionLogs([]);
      showToast('🔄 Partido reiniciado');
    }
  };

  // Filtered and Sorted Player Rows
  const displayedRows = useMemo(() => {
    let list = [...playerRows];

    if (filterAlertsOnly === 'unplayed') {
      list = list.filter((r) => getPlayerTotalMinutes(r) === 0);
    } else if (filterAlertsOnly === 'low') {
      list = list.filter((r) => {
        const m = getPlayerTotalMinutes(r);
        return m > 0 && m <= quarterMinutes * 0.5;
      });
    } else if (filterAlertsOnly === 'oncourt') {
      list = list.filter((r) => r.onCourt);
    }

    if (sortBy === 'jersey') {
      list.sort((a, b) => a.jerseyNumber - b.jerseyNumber);
    } else if (sortBy === 'minutesAsc') {
      list.sort((a, b) => getPlayerTotalMinutes(a) - getPlayerTotalMinutes(b));
    } else if (sortBy === 'minutesDesc') {
      list.sort((a, b) => getPlayerTotalMinutes(b) - getPlayerTotalMinutes(a));
    }

    return list;
  }, [playerRows, filterAlertsOnly, sortBy, quarterMinutes, includeOvertime]);

  return (
    <div className="space-y-6 pb-24">
      {/* Toast Notification */}
      {copiedNotification && (
        <div className="fixed top-5 right-5 z-50 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-2xl border border-emerald-500/40 text-sm font-bold flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-300">
          <Sparkles className="w-5 h-5 text-amber-400 shrink-0" />
          <span>{copiedNotification}</span>
        </div>
      )}

      {/* Main Header / Scoreboard & Substitution Trigger */}
      <div className="bg-slate-900 rounded-3xl p-4 sm:p-6 md:p-8 text-white shadow-xl border border-slate-800/80 relative overflow-hidden">
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
                  1er Clic: entra a Pista 🟢 · 2º Clic: sale a Banca 🔴 · Minutos exactos y Quinteto Inicial
                </p>
              </div>
            </div>

            {/* Top Action Buttons */}
            <div className="flex flex-wrap items-center gap-2">
              {/* BUTTON: SELECCIONAR QUINTETO INICIAL */}
              <button
                type="button"
                onClick={() => setShowStartingFiveModal(true)}
                className={`inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-black transition-all cursor-pointer border ${
                  startingFivePlayers.length === 5
                    ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md shadow-amber-500/20'
                    : 'bg-slate-800 hover:bg-slate-700 text-amber-300 border-amber-500/30'
                }`}
              >
                <Star
                  className={`w-4 h-4 ${
                    startingFivePlayers.length === 5 ? 'fill-slate-950' : 'fill-amber-400'
                  }`}
                />
                <span>
                  Quinteto Inicial ({startingFivePlayers.length}/5)
                </span>
              </button>

              {/* BUTTON: FIJAR PISTA COMO QUINTETO */}
              <button
                type="button"
                onClick={handleSetCurrentOnCourtAsStartingFive}
                className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all cursor-pointer border border-slate-700"
                title="Fijar las 5 de pista como Quinteto Inicial"
              >
                <UserCheck className="w-4 h-4 text-amber-400" />
                <span>Fijar Pista</span>
              </button>

              {/* BUTTON: REALIZAR CAMBIO */}
              <button
                type="button"
                onClick={() => {
                  setSubMinute(0);
                  setShowSubModal(true);
                }}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 text-xs sm:text-sm font-black transition-all cursor-pointer shadow-lg shadow-emerald-500/30 active:scale-95"
              >
                <RefreshCw className="w-4 h-4 stroke-[3]" />
                <span>Hacer Cambio (Sale / Entra)</span>
              </button>

              {/* BUTTON: VER RESUMEN FINAL */}
              <button
                type="button"
                onClick={() => setShowSummaryModal(true)}
                className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all cursor-pointer shadow-md shadow-blue-600/20"
              >
                <FileText className="w-4 h-4" />
                <span>Resumen Final</span>
              </button>

              {/* DROPDOWN: DESCARGAR RESUMEN (EXCEL, WORD, PDF, PNG) */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowExportDropdown((v) => !v)}
                  className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 text-xs font-bold transition-all cursor-pointer border border-slate-700 shadow-sm"
                  title="Descargar resumen del partido"
                >
                  <Download className="w-4 h-4 text-emerald-400" />
                  <span>Descargar</span>
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showExportDropdown ? 'rotate-180' : ''}`} />
                </button>

                {showExportDropdown && (
                  <div className="absolute right-0 mt-2 w-52 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                    <div className="px-3 py-1.5 border-b border-slate-800 text-[10px] font-black uppercase tracking-wider text-slate-400">
                      Formato de descarga
                    </div>
                    <button
                      type="button"
                      onClick={() => handleExport('excel')}
                      className="w-full px-3 py-2 text-left text-xs font-bold text-slate-200 hover:bg-slate-800 hover:text-emerald-400 flex items-center gap-2.5 cursor-pointer"
                    >
                      <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                      <div>
                        <div>Excel (.xlsx)</div>
                        <div className="text-[10px] text-slate-400 font-normal">Hojas con datos y cambios</div>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleExport('pdf')}
                      className="w-full px-3 py-2 text-left text-xs font-bold text-slate-200 hover:bg-slate-800 hover:text-red-400 flex items-center gap-2.5 cursor-pointer"
                    >
                      <FileType className="w-4 h-4 text-red-400" />
                      <div>
                        <div>PDF (.pdf)</div>
                        <div className="text-[10px] text-slate-400 font-normal">Documento oficial listo para imprimir</div>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleExport('word')}
                      className="w-full px-3 py-2 text-left text-xs font-bold text-slate-200 hover:bg-slate-800 hover:text-blue-400 flex items-center gap-2.5 cursor-pointer"
                    >
                      <FileText className="w-4 h-4 text-blue-400" />
                      <div>
                        <div>Word (.doc)</div>
                        <div className="text-[10px] text-slate-400 font-normal">Documento editable con formato</div>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleExport('png')}
                      className="w-full px-3 py-2 text-left text-xs font-bold text-slate-200 hover:bg-slate-800 hover:text-amber-400 flex items-center gap-2.5 cursor-pointer"
                    >
                      <ImageIcon className="w-4 h-4 text-amber-400" />
                      <div>
                        <div>Imagen PNG (.png)</div>
                        <div className="text-[10px] text-slate-400 font-normal">Captura gráfica en alta calidad</div>
                      </div>
                    </button>
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={handleResetMatch}
                className="inline-flex items-center gap-2 px-3 py-2.5 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 text-xs font-bold transition-all cursor-pointer border border-rose-500/30"
                title="Reiniciar partido"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Match Scoreboard */}
          <div className="bg-slate-950/70 border border-slate-800/80 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-6 max-w-3xl mx-auto shadow-inner">
            {/* Home */}
            <div className="text-center flex-1 w-full sm:w-auto">
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
                  className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs cursor-pointer"
                >
                  -1
                </button>
                <button
                  type="button"
                  onClick={() => setScoreHome((s) => s + 1)}
                  className="w-7 h-7 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-bold text-xs border border-amber-500/40 cursor-pointer"
                >
                  +1
                </button>
                <button
                  type="button"
                  onClick={() => setScoreHome((s) => s + 2)}
                  className="w-7 h-7 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs cursor-pointer"
                >
                  +2
                </button>
                <button
                  type="button"
                  onClick={() => setScoreHome((s) => s + 3)}
                  className="w-7 h-7 rounded-lg bg-orange-600 hover:bg-orange-500 text-white font-black text-xs cursor-pointer"
                >
                  +3
                </button>
              </div>
            </div>

            {/* VS & Match Options */}
            <div className="flex flex-col items-center justify-center gap-2 shrink-0">
              <div className="text-slate-500 font-black text-xl px-2">VS</div>
              <div className="flex items-center gap-2">
                <select
                  value={quarterMinutes}
                  onChange={(e) => setQuarterMinutes(Number(e.target.value))}
                  className="bg-slate-900 text-slate-300 border border-slate-700 text-xs rounded-lg px-2 py-1 font-bold focus:outline-none cursor-pointer"
                  title="Duración del cuarto"
                >
                  <option value={8}>8 min / cuarto</option>
                  <option value={10}>10 min / cuarto</option>
                  <option value={12}>12 min / cuarto</option>
                </select>

                <button
                  type="button"
                  onClick={() => setIncludeOvertime((v) => !v)}
                  className={`text-[11px] font-bold px-2 py-1 rounded-lg border transition-all cursor-pointer ${
                    includeOvertime
                      ? 'bg-orange-500/20 text-orange-300 border-orange-500/40'
                      : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
                  }`}
                  title="Añadir prórroga al partido"
                >
                  {includeOvertime ? 'Con PR' : '+ PR'}
                </button>
              </div>
            </div>

            {/* Away */}
            <div className="text-center flex-1 w-full sm:w-auto">
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
                  className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs cursor-pointer"
                >
                  -1
                </button>
                <button
                  type="button"
                  onClick={() => setScoreAway((s) => s + 1)}
                  className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs cursor-pointer"
                >
                  +1
                </button>
                <button
                  type="button"
                  onClick={() => setScoreAway((s) => s + 2)}
                  className="w-7 h-7 rounded-lg bg-slate-700 hover:bg-slate-600 text-white font-black text-xs cursor-pointer"
                >
                  +2
                </button>
                <button
                  type="button"
                  onClick={() => setScoreAway((s) => s + 3)}
                  className="w-7 h-7 rounded-lg bg-slate-600 hover:bg-slate-500 text-white font-black text-xs cursor-pointer"
                >
                  +3
                </button>
              </div>
            </div>
          </div>

          {/* Quick Lineups Banner (Starting 5 + Most Offensive + Most Defensive) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
            {/* 1. Starting Five */}
            <div
              onClick={() => setShowStartingFiveModal(true)}
              className="p-3.5 rounded-2xl bg-amber-950/40 border border-amber-500/40 space-y-1 cursor-pointer hover:bg-amber-950/60 transition-all"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-amber-300 flex items-center gap-1.5">
                  <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                  Quinteto Inicial:
                </span>
                <span className="text-[10px] font-bold text-amber-400/80 bg-amber-500/20 px-2 py-0.5 rounded-full">
                  {startingFivePlayers.length}/5 jugadoras
                </span>
              </div>
              <p className="text-xs font-bold text-white truncate">
                {startingFivePlayers.length > 0
                  ? startingFivePlayers.map((p) => `#${p.jerseyNumber} ${p.name}`).join(', ')
                  : 'Pulsa aquí para seleccionar las 5 titulares'}
              </p>
            </div>

            {/* 2. Most Offensive Lineup */}
            <div className="p-3.5 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-emerald-300 flex items-center gap-1.5">
                  <Zap className="w-4 h-4 text-emerald-400" />
                  Quinteto Más Ofensivo:
                </span>
                <span className="text-[10px] font-bold text-emerald-400/80">
                  {scoreHome} pts anotados
                </span>
              </div>
              <p className="text-xs font-bold text-white truncate">
                {lineupAnalysis.offensiveLineup.map((p) => `#${p.jerseyNumber} ${p.name}`).join(', ')}
              </p>
            </div>

            {/* 3. Most Defensive Lineup */}
            <div className="p-3.5 rounded-2xl bg-blue-950/40 border border-blue-500/40 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-blue-300 flex items-center gap-1.5">
                  <Shield className="w-4 h-4 text-blue-400" />
                  Quinteto Más Defensivo:
                </span>
                <span className="text-[10px] font-bold text-blue-400/80">
                  {scoreAway} pts encajados
                </span>
              </div>
              <p className="text-xs font-bold text-white truncate">
                {lineupAnalysis.defensiveLineup.map((p) => `#${p.jerseyNumber} ${p.name}`).join(', ')}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Guide Banner for Coach */}
      <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-2xl p-3 sm:p-4 flex items-center gap-3 text-xs text-emerald-900 font-medium">
        <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 font-black">
          💡
        </div>
        <div className="leading-relaxed">
          <span className="font-extrabold text-emerald-950">Cómo funciona el registro rápido:</span>
          {' '}
          1er clic en un minuto (ej. <span className="font-bold text-emerald-800">0'</span> o <span className="font-bold text-emerald-800">7'</span>) = 🟢 <span className="font-bold">Entra a Pista</span> · 2º clic (ej. <span className="font-bold text-rose-800">3'</span>) = 🔴 <span className="font-bold">Sale a la Banca</span> · Los minutos jugados se calculan solos y las que empiecen en el 0' forman el <span className="font-bold text-amber-800">Quinteto Inicial</span>.
        </div>
      </div>

      {/* Main Table / Grid with Exact Minute Pill Buttons */}
      <div className="bg-white rounded-3xl p-4 sm:p-6 shadow-sm border border-slate-200/80 space-y-4">
        {/* Filters and Controls */}
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
              Sin Minutos ({unplayedPlayers.length})
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
            <button
              type="button"
              onClick={() => setShowAddPlayerModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-black transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 stroke-[3]" />
              <span>Añadir Jugadora</span>
            </button>

            {/* View Mode Toggle & Quarter Selector */}
            <div className="flex items-center gap-2">
              {focusQuarterMode && (
                <div className="flex items-center gap-1 bg-amber-50 p-1 rounded-xl border border-amber-200">
                  {(['Q1', 'Q2', 'Q3', 'Q4'] as QuarterKey[]).map((q, idx) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => setActiveQuarter(q)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-black transition-all cursor-pointer ${
                        activeQuarter === q
                          ? 'bg-amber-500 text-slate-950 shadow-xs'
                          : 'text-amber-800 hover:bg-amber-100'
                      }`}
                    >
                      {idx + 1}Q
                    </button>
                  ))}
                  {includeOvertime && (
                    <button
                      type="button"
                      onClick={() => setActiveQuarter('PR')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-black transition-all cursor-pointer ${
                        activeQuarter === 'PR'
                          ? 'bg-orange-500 text-white shadow-xs'
                          : 'text-orange-800 hover:bg-orange-100'
                      }`}
                    >
                      PR
                    </button>
                  )}
                </div>
              )}

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
                  Vista 4 Cuartos
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
                  Foco {activeQuarter}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* The Main Table with Exact Minute Pills */}
        <div className="overflow-x-auto pb-4 custom-scrollbar">
          <table className="w-full text-left border-collapse min-w-[750px]">
            <thead>
              <tr className="border-b-2 border-slate-200 text-xs font-black text-slate-700">
                <th className="py-3 px-3 w-56 sticky left-0 bg-white z-20 shadow-r">
                  Jugadora & Estado
                </th>

                {/* Quarters Columns */}
                {!focusQuarterMode ? (
                  quartersList.map((q, qIdx) => (
                    <th
                      key={q}
                      className={`py-3 px-3 text-center border-l border-slate-200 ${
                        activeQuarter === q
                          ? 'bg-amber-50/70 text-amber-900 font-extrabold'
                          : 'bg-slate-50/50'
                      }`}
                    >
                      <div className="flex items-center justify-center gap-1.5">
                        <span>{q === 'PR' ? 'PRÓRROGA' : `${qIdx + 1}º CUARTO (${q})`}</span>
                        {activeQuarter === q && (
                          <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400 font-medium block">
                        Minutos 0' a {quarterMinutes}'
                      </span>
                    </th>
                  ))
                ) : (
                  <th className="py-3 px-3 text-center border-l border-slate-200 bg-amber-50 text-amber-900 font-black">
                    <div className="flex items-center justify-center gap-2 text-sm">
                      <Flame className="w-4 h-4 text-amber-500" />
                      <span>{activeQuarter === 'PR' ? 'PRÓRROGA' : `CUARTO EN JUEGO: ${activeQuarter}`}</span>
                      <span className="text-xs bg-amber-200 text-amber-900 px-2.5 py-0.5 rounded-full font-bold">
                        Toca los minutos jugados (0' a {quarterMinutes}')
                      </span>
                    </div>
                  </th>
                )}

                <th className="py-3 px-4 text-right w-36 border-l border-slate-200 bg-slate-50/50">
                  Total
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {displayedRows.map((player) => {
                const totalMins = getPlayerTotalMinutes(player);
                const pct = Math.round((totalMins / maxPossibleMatchMinutes) * 100);
                const isUnplayed = totalMins === 0;
                const isLow = totalMins > 0 && totalMins <= quarterMinutes * 0.5;
                const cfg = ROLE_COLORS[player.role] || {
                  bg: 'bg-slate-700',
                  text: 'text-slate-700',
                  badge: 'bg-slate-100 text-slate-700 border-slate-200',
                };

                return (
                  <tr
                    key={player.id}
                    className={`hover:bg-slate-50/80 transition-colors ${
                      player.onCourt ? 'bg-emerald-50/20' : ''
                    }`}
                  >
                    {/* Player Info & OnCourt Toggle */}
                    <td className="py-3 px-3 sticky left-0 bg-white z-10 shadow-r">
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm text-white shadow-xs shrink-0 ${cfg.bg}`}
                        >
                          {player.jerseyNumber}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="font-extrabold text-sm text-slate-900 truncate">
                              {player.name}
                            </span>
                            {player.isStartingFive && (
                              <Star
                                className="w-3.5 h-3.5 text-amber-500 fill-amber-400 shrink-0"
                                title="Titular (Quinteto Inicial)"
                              />
                            )}
                          </div>

                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span
                              className={`text-[10px] font-bold px-1.5 py-0.2 rounded border ${cfg.badge}`}
                            >
                              {player.role}
                            </span>

                            {/* PISTA / BANCA TOGGLE */}
                            <button
                              type="button"
                              onClick={() => handleToggleOnCourt(player.id)}
                              className={`text-[10px] font-black px-2 py-0.5 rounded-full transition-all cursor-pointer ${
                                player.onCourt
                                  ? 'bg-emerald-500 text-white shadow-xs animate-pulse'
                                  : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                              }`}
                              title={player.onCourt ? 'En pista (pulsa para sentar en banquillo)' : 'En banquillo (pulsa para entrar a pista)'}
                            >
                              {player.onCourt ? '🟢 PISTA' : '⚪ BANCA'}
                            </button>
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Quarter Cells */}
                    {!focusQuarterMode ? (
                      quartersList.map((q) => {
                        const events = player.quarterEvents?.[q] || [];
                        const stints = getStintsFromEvents(events, quarterMinutes);
                        const activeMins = getActiveMinutesList(events, quarterMinutes);
                        const rangesStr = formatStintsReadable(events, quarterMinutes);
                        const qMinsPlayed = calculateQuarterMinutesPlayed(events, quarterMinutes);
                        const isActiveQ = activeQuarter === q;

                        return (
                          <td
                            key={q}
                            className={`py-3 px-2 border-l border-slate-200 align-top ${
                              isActiveQ ? 'bg-amber-50/30' : ''
                            }`}
                          >
                            <div className="space-y-1.5">
                              {/* Minute Pills Row */}
                              <div className="flex items-center gap-1 flex-wrap">
                                {Array.from({ length: quarterMinutes + 1 }).map((_, mIdx) => {
                                  const isEvent = events.includes(mIdx);
                                  const eventIndex = events.indexOf(mIdx);
                                  const isEntry = isEvent && eventIndex % 2 === 0;
                                  const isExit = isEvent && eventIndex % 2 === 1;
                                  const isPlaying = activeMins.includes(mIdx);

                                  return (
                                    <button
                                      key={mIdx}
                                      type="button"
                                      onClick={() => handleToggleMinutePill(player.id, q, mIdx)}
                                      className={`w-6 h-6 rounded-md text-[10px] font-black transition-all cursor-pointer relative ${
                                        isEntry
                                          ? 'bg-emerald-600 text-white ring-2 ring-emerald-400 font-black shadow-xs'
                                          : isExit
                                          ? 'bg-rose-500 text-white ring-2 ring-rose-300 font-black shadow-xs'
                                          : isPlaying
                                          ? 'bg-emerald-400 text-slate-950 font-bold'
                                          : 'bg-slate-100 hover:bg-slate-200 text-slate-400'
                                      }`}
                                      title={
                                        isEntry
                                          ? `🟢 Entrada en Min ${mIdx}'`
                                          : isExit
                                          ? `🔴 Salida en Min ${mIdx}'`
                                          : isPlaying
                                          ? `Jugando en Min ${mIdx}'`
                                          : `Minuto ${mIdx}' (pulsa para anotar entrada/salida)`
                                      }
                                    >
                                      {mIdx}'
                                    </button>
                                  );
                                })}
                              </div>

                              {/* Text info & direct write button */}
                              <div className="flex items-center justify-between text-[10px] text-slate-500 pt-0.5">
                                <span className="font-bold text-slate-700 truncate max-w-[120px]">
                                  {rangesStr} ({qMinsPlayed}m)
                                </span>

                                <button
                                  type="button"
                                  onClick={() =>
                                    setDirectInputModalPlayer({
                                      player,
                                      quarter: q,
                                      currentText: rangesStr === 'Sin minutos' ? '' : rangesStr,
                                    })
                                  }
                                  className="text-slate-400 hover:text-slate-800 p-0.5 rounded cursor-pointer"
                                  title="Escribir minutos a mano (ej: 0-3, 7-10)"
                                >
                                  <Edit3 className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          </td>
                        );
                      })
                    ) : (
                      /* Focus Active Quarter Mode: Big Minute Buttons */
                      <td className="py-4 px-4 border-l border-slate-200 bg-amber-50/20">
                        {(() => {
                          const events = player.quarterEvents?.[activeQuarter] || [];
                          const activeMins = getActiveMinutesList(events, quarterMinutes);
                          const rangesStr = formatStintsReadable(events, quarterMinutes);
                          const qMinsPlayed = calculateQuarterMinutesPlayed(events, quarterMinutes);

                          return (
                            <div className="space-y-2">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                {Array.from({ length: quarterMinutes + 1 }).map((_, mIdx) => {
                                  const isEvent = events.includes(mIdx);
                                  const eventIndex = events.indexOf(mIdx);
                                  const isEntry = isEvent && eventIndex % 2 === 0;
                                  const isExit = isEvent && eventIndex % 2 === 1;
                                  const isPlaying = activeMins.includes(mIdx);

                                  return (
                                    <button
                                      key={mIdx}
                                      type="button"
                                      onClick={() =>
                                        handleToggleMinutePill(player.id, activeQuarter, mIdx)
                                      }
                                      className={`w-9 h-10 rounded-xl text-xs font-black transition-all cursor-pointer ${
                                        isEntry
                                          ? 'bg-emerald-600 text-white shadow-md ring-2 ring-emerald-300 scale-105'
                                          : isExit
                                          ? 'bg-rose-500 text-white shadow-md ring-2 ring-rose-300 scale-105'
                                          : isPlaying
                                          ? 'bg-emerald-400 text-slate-950 font-bold shadow-xs'
                                          : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                                      }`}
                                    >
                                      {mIdx}'
                                    </button>
                                  );
                                })}
                              </div>

                              <div className="flex items-center justify-between text-xs pt-1">
                                <span className="font-extrabold text-slate-800">
                                  {rangesStr} · {qMinsPlayed} min
                                </span>

                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => handleSetFullQuarter(player.id, activeQuarter)}
                                    className="text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2 py-0.5 rounded-lg cursor-pointer"
                                  >
                                    Todo (0-{quarterMinutes}')
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleClearQuarter(player.id, activeQuarter)}
                                    className="text-[11px] font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 px-2 py-0.5 rounded-lg cursor-pointer"
                                  >
                                    Borrar
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setDirectInputModalPlayer({
                                        player,
                                        quarter: activeQuarter,
                                        currentText: rangesStr === 'Sin minutos' ? '' : rangesStr,
                                      })
                                    }
                                    className="text-[11px] font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 px-2 py-0.5 rounded-lg flex items-center gap-1 cursor-pointer"
                                  >
                                    <Edit3 className="w-3 h-3" /> Escribir
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })()}
                      </td>
                    )}

                    {/* Total Time & Progress */}
                    <td className="py-3 px-4 text-right border-l border-slate-200 bg-slate-50/50">
                      <div className="space-y-1">
                        <div className="font-black text-sm text-slate-900 tabular-nums">
                          {totalMins} min
                        </div>
                        <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              isUnplayed
                                ? 'bg-red-500'
                                : isLow
                                ? 'bg-amber-500'
                                : 'bg-emerald-500'
                            }`}
                            style={{ width: `${Math.min(100, pct)}%` }}
                          />
                        </div>
                        <span
                          className={`text-[10px] font-bold block ${
                            isUnplayed
                              ? 'text-red-600 font-extrabold'
                              : isLow
                              ? 'text-amber-600'
                              : 'text-emerald-700'
                          }`}
                        >
                          {isUnplayed ? '🔴 Sin jugar' : isLow ? '🟡 Pocos min' : `${pct}%`}
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: SELECCIONAR QUINTETO INICIAL */}
      {showStartingFiveModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center text-slate-950">
                  <Star className="w-5 h-5 fill-slate-950" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900">
                    Seleccionar Quinteto Inicial
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Elige las 5 jugadoras titulares que comenzarán el partido en el minuto 0'
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowStartingFiveModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Counter Badge */}
            <div
              className={`p-3 rounded-2xl flex items-center justify-between text-xs font-black ${
                startingFivePlayers.length === 5
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'bg-amber-50 text-amber-800 border border-amber-200'
              }`}
            >
              <span>Jugadoras seleccionadas:</span>
              <span className="text-sm">{startingFivePlayers.length} / 5</span>
            </div>

            {/* Players List with Checkboxes */}
            <div className="max-h-72 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
              {playerRows.map((p) => {
                const isSelected = p.isStartingFive || (p.quarterEvents?.Q1?.length > 0 && p.quarterEvents.Q1[0] === 0);
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleToggleStartingFivePlayer(p.id)}
                    className={`w-full p-3 rounded-2xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-amber-50/80 border-amber-400 shadow-xs'
                        : 'bg-white border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs text-white ${
                          ROLE_COLORS[p.role]?.bg || 'bg-slate-700'
                        }`}
                      >
                        {p.jerseyNumber}
                      </div>
                      <div>
                        <div className="font-extrabold text-sm text-slate-900">{p.name}</div>
                        <div className="text-[11px] text-slate-500 font-medium">{p.role}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {isSelected ? (
                        <div className="w-6 h-6 rounded-lg bg-amber-500 text-slate-950 flex items-center justify-center font-black shadow-xs">
                          <Check className="w-4 h-4 stroke-[3]" />
                        </div>
                      ) : (
                        <div className="w-6 h-6 rounded-lg border-2 border-slate-300" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={() => setShowStartingFiveModal(false)}
                className="px-4 py-2.5 rounded-xl text-slate-600 font-bold text-xs hover:bg-slate-100 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmStartingFive}
                disabled={startingFivePlayers.length !== 5}
                className={`px-5 py-2.5 rounded-xl font-black text-xs transition-all cursor-pointer ${
                  startingFivePlayers.length === 5
                    ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-md shadow-amber-500/20'
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                }`}
              >
                Confirmar Quinteto Inicial (5)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: SUSTITUCIÓN RÁPIDA (SALE X, ENTRA Y EN MINUTO Z) */}
      {showSubModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-600 flex items-center justify-center text-slate-950 shadow-md">
                  <RefreshCw className="w-5 h-5 stroke-[2.5]" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900">
                    Realizar Cambio ({activeQuarter})
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Actualiza automáticamente minutos y estado de Pista / Banca
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowSubModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleExecuteSubstitution} className="space-y-4">
              {/* Minute of substitution */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
                <label className="block text-xs font-black text-slate-700">
                  ⏱️ Minuto del Cambio en el {activeQuarter}:
                </label>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {Array.from({ length: quarterMinutes + 1 }).map((_, mIdx) => (
                    <button
                      key={mIdx}
                      type="button"
                      onClick={() => setSubMinute(mIdx)}
                      className={`w-8 h-8 rounded-lg text-xs font-black transition-all cursor-pointer ${
                        subMinute === mIdx
                          ? 'bg-emerald-500 text-slate-950 ring-2 ring-emerald-300 shadow-md'
                          : 'bg-white text-slate-700 hover:bg-slate-200 border border-slate-200'
                      }`}
                    >
                      {mIdx}'
                    </button>
                  ))}
                </div>
              </div>

              {/* Player OUT */}
              <div className="space-y-1.5">
                <label className="block text-xs font-black text-rose-700">
                  🔴 SALE DE PISTA (Hacia el Banquillo):
                </label>
                <select
                  value={subOutPlayerId}
                  onChange={(e) => setSubOutPlayerId(e.target.value)}
                  required
                  className="w-full bg-white border-2 border-rose-200 focus:border-rose-500 rounded-xl p-3 text-sm font-bold text-slate-900 focus:outline-none"
                >
                  <option value="">-- Selecciona jugadora que SALE --</option>
                  {onCourtPlayers.map((p) => (
                    <option key={p.id} value={p.id}>
                      #{p.jerseyNumber} {p.name} ({p.role}) - {getPlayerTotalMinutes(p)}m totales
                    </option>
                  ))}
                  {benchPlayers.map((p) => (
                    <option key={p.id} value={p.id}>
                      (Banquillo) #{p.jerseyNumber} {p.name} ({p.role})
                    </option>
                  ))}
                </select>
              </div>

              {/* Player IN */}
              <div className="space-y-1.5">
                <label className="block text-xs font-black text-emerald-700">
                  🟢 ENTRA A PISTA (A jugar desde el min {subMinute}'):
                </label>
                <select
                  value={subInPlayerId}
                  onChange={(e) => setSubInPlayerId(e.target.value)}
                  required
                  className="w-full bg-white border-2 border-emerald-200 focus:border-emerald-500 rounded-xl p-3 text-sm font-bold text-slate-900 focus:outline-none"
                >
                  <option value="">-- Selecciona jugadora que ENTRA --</option>
                  {benchPlayers.map((p) => {
                    const totalM = getPlayerTotalMinutes(p);
                    const tag = totalM === 0 ? ' [🚨 SIN MINUTOS]' : ` [${totalM}m]`;
                    return (
                      <option key={p.id} value={p.id}>
                        #{p.jerseyNumber} {p.name} ({p.role}){tag}
                      </option>
                    );
                  })}
                  {onCourtPlayers.map((p) => (
                    <option key={p.id} value={p.id}>
                      (Ya en pista) #{p.jerseyNumber} {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowSubModal(false)}
                  className="px-4 py-2.5 rounded-xl text-slate-600 font-bold text-xs hover:bg-slate-100 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs shadow-md shadow-emerald-500/20 cursor-pointer"
                >
                  Confirmar Cambio en Min {subMinute}'
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ESCRIBIR MINUTOS DIRECTAMENTE (EJ: 0-3, 7-10) */}
      {directInputModalPlayer && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-blue-600" />
                <h3 className="text-base font-black text-slate-900">
                  Escribir Minutos: #{directInputModalPlayer.player.jerseyNumber}{' '}
                  {directInputModalPlayer.player.name} ({directInputModalPlayer.quarter})
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setDirectInputModalPlayer(null)}
                className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const form = e.target as HTMLFormElement;
                const input = form.elements.namedItem('minutesText') as HTMLInputElement;
                handleSaveDirectMinuteInput(input.value);
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">
                  Escribe los tramos o intervalos (ejemplo: <span className="text-blue-600 font-mono font-bold">0-3, 7-10</span>):
                </label>
                <input
                  name="minutesText"
                  type="text"
                  defaultValue={directInputModalPlayer.currentText}
                  autoFocus
                  placeholder="0-3, 7-10"
                  className="w-full p-3 border-2 border-slate-200 focus:border-blue-500 rounded-xl text-base font-bold text-slate-900 focus:outline-none font-mono"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Introduce los minutos de entrada y salida separados por guiones o comas.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setDirectInputModalPlayer(null)}
                  className="px-4 py-2 rounded-xl text-slate-600 text-xs font-bold hover:bg-slate-100 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-black shadow-md shadow-blue-600/20 cursor-pointer"
                >
                  Guardar Minutos
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: RESUMEN FINAL COMPLETO */}
      {showSummaryModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-3xl w-full p-6 shadow-2xl border border-slate-200 space-y-5 max-h-[90vh] overflow-y-auto custom-scrollbar animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900">
                    Resumen Final del Partido
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Quinteto inicial, más ofensivo/defensivo y desglose completo de minutos
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowSummaryModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Printable & Capturable Report Content */}
            <div
              id="match-summary-capture-container"
              ref={summaryCaptureRef}
              className="bg-white rounded-2xl p-4 border border-slate-200 space-y-4"
            >
              {/* Match Header Info */}
              <div className="bg-slate-900 text-white rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <div className="text-[10px] font-extrabold uppercase text-amber-400 tracking-wider">
                    Control de Minutos · CoachMind Basketball
                  </div>
                  <div className="text-base font-black">
                    Nosotros {scoreHome} - {scoreAway} {rivalName || 'Rival'}
                  </div>
                </div>
                <div className="text-right text-xs text-slate-300">
                  <div>Fecha: <span className="font-bold text-white">{matchDate}</span></div>
                  <div className="text-[11px] text-slate-400">{quartersList.length} cuartos de {quarterMinutes} min</div>
                </div>
              </div>

              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200">
                  <span className="text-xs font-black text-amber-900 flex items-center gap-1">
                    <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                    Quinteto Inicial
                  </span>
                  <p className="text-xs font-bold text-slate-800 mt-1">
                    {startingFivePlayers.length > 0
                      ? startingFivePlayers.map((p) => `#${p.jerseyNumber} ${p.name}`).join(', ')
                      : 'No registrado'}
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200">
                  <span className="text-xs font-black text-emerald-900 flex items-center gap-1">
                    <Zap className="w-3.5 h-3.5 text-emerald-600" />
                    Más Ofensivo
                  </span>
                  <p className="text-xs font-bold text-slate-800 mt-1">
                    {lineupAnalysis.offensiveLineup.map((p) => `#${p.jerseyNumber} ${p.name}`).join(', ')}
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-blue-50 border border-blue-200">
                  <span className="text-xs font-black text-blue-900 flex items-center gap-1">
                    <Shield className="w-3.5 h-3.5 text-blue-600" />
                    Más Defensivo
                  </span>
                  <p className="text-xs font-bold text-slate-800 mt-1">
                    {lineupAnalysis.defensiveLineup.map((p) => `#${p.jerseyNumber} ${p.name}`).join(', ')}
                  </p>
                </div>
              </div>

              {/* Detailed Player Breakdown */}
              <div className="space-y-2">
                <h4 className="text-xs font-black text-slate-500 uppercase tracking-wider">
                  Desglose Individual de Minutos y Tramos
                </h4>
                <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden">
                  {[...playerRows]
                    .sort((a, b) => getPlayerTotalMinutes(b) - getPlayerTotalMinutes(a))
                    .map((p, idx) => {
                      const totalMins = getPlayerTotalMinutes(p);
                      return (
                        <div
                          key={p.id}
                          className="p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-400 w-4">{idx + 1}.</span>
                            <span className="font-extrabold text-slate-900">
                              #{p.jerseyNumber} {p.name}
                            </span>
                            <span className="text-slate-500 font-medium">({p.role})</span>
                            {p.isStartingFive && (
                              <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.2 rounded font-bold">
                                Titular
                              </span>
                            )}
                          </div>

                          <div className="text-slate-600 font-mono text-[11px]">
                            {quartersList.map((q) => {
                              const events = p.quarterEvents?.[q] || [];
                              const str = formatStintsReadable(events, quarterMinutes);
                              const qMins = calculateQuarterMinutesPlayed(events, quarterMinutes);
                              return `${q}: ${str} (${qMins}m)`;
                            }).join(' | ')}
                          </div>

                          <div className="font-black text-slate-900 shrink-0">
                            {totalMins} min
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            </div>

            {/* Export Toolbar Section */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-black text-slate-800 uppercase tracking-wider">
                  <Download className="w-4 h-4 text-emerald-600" />
                  <span>Descargar Informe de Partido:</span>
                </div>
                <span className="text-[11px] text-slate-400 font-medium">Elige el formato</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {/* EXCEL */}
                <button
                  type="button"
                  onClick={handleExportExcel}
                  className="inline-flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs cursor-pointer shadow-sm transition-all active:scale-95"
                  title="Descargar tabla completa y cambios en Excel"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>Excel (.xlsx)</span>
                </button>

                {/* PDF */}
                <button
                  type="button"
                  onClick={handleExportPdf}
                  className="inline-flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-black text-xs cursor-pointer shadow-sm transition-all active:scale-95"
                  title="Descargar informe oficial en PDF"
                >
                  <FileType className="w-4 h-4" />
                  <span>PDF (.pdf)</span>
                </button>

                {/* WORD */}
                <button
                  type="button"
                  onClick={handleExportWord}
                  className="inline-flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black text-xs cursor-pointer shadow-sm transition-all active:scale-95"
                  title="Descargar documento editable en Word"
                >
                  <FileText className="w-4 h-4" />
                  <span>Word (.doc)</span>
                </button>

                {/* PNG */}
                <button
                  type="button"
                  onClick={handleExportPng}
                  className="inline-flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs cursor-pointer shadow-sm transition-all active:scale-95"
                  title="Descargar imagen en alta resolución"
                >
                  <ImageIcon className="w-4 h-4" />
                  <span>Imagen PNG</span>
                </button>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowSummaryModal(false)}
                className="px-5 py-2.5 rounded-xl text-slate-600 font-bold text-xs hover:bg-slate-100 cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: AÑADIR JUGADORA INVITADA/TEMPORAL */}
      {showAddPlayerModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-black text-slate-900">
                Añadir Jugadora al Partido
              </h3>
              <button
                type="button"
                onClick={() => setShowAddPlayerModal(false)}
                className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddCustomPlayer} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Nombre:</label>
                <input
                  type="text"
                  required
                  value={newPlayerName}
                  onChange={(e) => setNewPlayerName(e.target.value)}
                  placeholder="Ej: Laura"
                  className="w-full p-2.5 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:border-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Dorsal:</label>
                  <input
                    type="number"
                    required
                    value={newPlayerNumber}
                    onChange={(e) => setNewPlayerNumber(Number(e.target.value))}
                    className="w-full p-2.5 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:border-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Posición:</label>
                  <select
                    value={newPlayerRole}
                    onChange={(e) => setNewPlayerRole(e.target.value as PlayerRole)}
                    className="w-full p-2.5 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-slate-800"
                  >
                    <option value="Base">Base</option>
                    <option value="Escolta">Escolta</option>
                    <option value="Alero">Alero</option>
                    <option value="Ala-Pívot">Ala-Pívot</option>
                    <option value="Pívot">Pívot</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddPlayerModal(false)}
                  className="px-3 py-2 rounded-xl text-slate-600 text-xs font-bold hover:bg-slate-100 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-black cursor-pointer"
                >
                  Añadir
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
