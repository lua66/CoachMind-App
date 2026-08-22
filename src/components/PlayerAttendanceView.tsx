import React, { useState, useEffect, useMemo } from 'react';
import {
  CalendarDays,
  CheckCircle2,
  Clock,
  AlertCircle,
  XCircle,
  Save,
  Check,
  RotateCcw,
  Search,
  Download,
  Share2,
  History,
  TrendingUp,
  BarChart3,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Filter,
  CheckCheck,
  Sparkles,
  Info,
  Trash2,
  Edit3,
} from 'lucide-react';
import {
  Player,
  PlayerDailyAttendance,
  DailyAttendanceSession,
  AttendanceStatus,
  PlayerRole,
  UserProfile,
} from '../types';

interface PlayerAttendanceViewProps {
  players: Player[];
  onUpdatePlayer?: (player: Player) => void;
  userProfile?: UserProfile | null;
  onOpenTrialModal?: (mode?: 'general_action' | 'ficha_entrenador') => void;
}

const ATTENDANCE_STORAGE_KEY = 'coachmind_attendance_sessions';

const SESSION_TYPE_CONFIG = {
  training: { label: 'Entrenamiento de Pista', icon: '🏀', color: 'bg-emerald-500 text-white' },
  match: { label: 'Partido', icon: '🏆', color: 'bg-blue-500 text-white' },
  gym: { label: 'Gimnasio / Físico', icon: '🏋️', color: 'bg-amber-500 text-white' },
  video: { label: 'Vídeo / Charla', icon: '📹', color: 'bg-purple-500 text-white' },
  other: { label: 'Otra Actividad', icon: '📌', color: 'bg-slate-600 text-white' },
};

const STATUS_CONFIG: Record<
  AttendanceStatus,
  {
    label: string;
    shortLabel: string;
    icon: React.ReactNode;
    colorBg: string;
    activeBorder: string;
    text: string;
    badgeBg: string;
  }
> = {
  present: {
    label: 'Presente',
    shortLabel: 'Pres.',
    icon: <CheckCircle2 className="w-4 h-4" />,
    colorBg: 'bg-emerald-600 hover:bg-emerald-700 text-white',
    activeBorder: 'border-emerald-600 bg-emerald-50 text-emerald-800 ring-2 ring-emerald-500/20',
    text: 'text-emerald-700',
    badgeBg: 'bg-emerald-100 text-emerald-800',
  },
  late: {
    label: 'Retraso / Parcial',
    shortLabel: 'Retr.',
    icon: <Clock className="w-4 h-4" />,
    colorBg: 'bg-amber-600 hover:bg-amber-700 text-white',
    activeBorder: 'border-amber-500 bg-amber-50 text-amber-800 ring-2 ring-amber-500/20',
    text: 'text-amber-700',
    badgeBg: 'bg-amber-100 text-amber-800',
  },
  absent_justified: {
    label: 'Aus. Justificada',
    shortLabel: 'Just.',
    icon: <AlertCircle className="w-4 h-4" />,
    colorBg: 'bg-blue-600 hover:bg-blue-700 text-white',
    activeBorder: 'border-blue-500 bg-blue-50 text-blue-800 ring-2 ring-blue-500/20',
    text: 'text-blue-700',
    badgeBg: 'bg-blue-100 text-blue-800',
  },
  absent_unjustified: {
    label: 'Aus. Injustificada',
    shortLabel: 'Injust.',
    icon: <XCircle className="w-4 h-4" />,
    colorBg: 'bg-rose-600 hover:bg-rose-700 text-white',
    activeBorder: 'border-rose-500 bg-rose-50 text-rose-800 ring-2 ring-rose-500/20',
    text: 'text-rose-700',
    badgeBg: 'bg-rose-100 text-rose-800',
  },
};

export const PlayerAttendanceView: React.FC<PlayerAttendanceViewProps> = ({
  players,
  onUpdatePlayer,
  userProfile,
  onOpenTrialModal,
}) => {
  // Current session parameters
  const [sessionDate, setSessionDate] = useState<string>(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [sessionType, setSessionType] = useState<DailyAttendanceSession['sessionType']>('training');
  const [sessionTitle, setSessionTitle] = useState('');
  const [sessionGeneralNotes, setSessionGeneralNotes] = useState('');

  // Daily records map: playerId -> { status, notes }
  const [attendanceRecords, setAttendanceRecords] = useState<Record<string, { status: AttendanceStatus; notes: string }>>({});

  // Saved attendance history sessions
  const [savedSessions, setSavedSessions] = useState<DailyAttendanceSession[]>(() => {
    const local = localStorage.getItem(ATTENDANCE_STORAGE_KEY);
    if (!local) return [];
    try {
      const parsed = JSON.parse(local);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });

  // UI state
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<PlayerRole | 'ALL'>('ALL');
  const [isSavedBannerVisible, setIsSavedBannerVisible] = useState(false);
  const [subTab, setSubTab] = useState<'daily' | 'history' | 'rankings'>('daily');
  const [selectedHistorySession, setSelectedHistorySession] = useState<DailyAttendanceSession | null>(null);

  // Initialize or load attendance state when date changes or players load
  useEffect(() => {
    const existingSession = savedSessions.find((s) => s.date === sessionDate && s.sessionType === sessionType);
    
    if (existingSession) {
      // Load existing records for this day
      const map: Record<string, { status: AttendanceStatus; notes: string }> = {};
      players.forEach((p) => {
        const found = existingSession.records.find((r) => r.playerId === p.id);
        map[p.id] = {
          status: found ? found.status : 'present',
          notes: found?.notes || '',
        };
      });
      setAttendanceRecords(map);
      setSessionTitle(existingSession.title || '');
      setSessionGeneralNotes(existingSession.notes || '');
    } else {
      // Default all to 'present' for today
      const map: Record<string, { status: AttendanceStatus; notes: string }> = {};
      players.forEach((p) => {
        map[p.id] = {
          status: 'present',
          notes: '',
        };
      });
      setAttendanceRecords(map);
      setSessionTitle('');
      setSessionGeneralNotes('');
    }
  }, [sessionDate, sessionType, savedSessions, players]);

  // Quick date modifiers
  const handleShiftDate = (days: number) => {
    const current = new Date(sessionDate);
    if (isNaN(current.getTime())) return;
    current.setDate(current.getDate() + days);
    setSessionDate(current.toISOString().split('T')[0]);
  };

  const handleSetToday = () => {
    const today = new Date().toISOString().split('T')[0];
    setSessionDate(today);
  };

  // Change individual player status
  const handleSetPlayerStatus = (playerId: string, status: AttendanceStatus) => {
    setAttendanceRecords((prev) => ({
      ...prev,
      [playerId]: {
        ...prev[playerId],
        status,
      },
    }));
  };

  // Change individual player note
  const handleSetPlayerNotes = (playerId: string, notes: string) => {
    setAttendanceRecords((prev) => ({
      ...prev,
      [playerId]: {
        ...prev[playerId],
        notes,
      },
    }));
  };

  // Bulk actions
  const handleMarkAllPresent = () => {
    const updated: Record<string, { status: AttendanceStatus; notes: string }> = {};
    players.forEach((p) => {
      updated[p.id] = {
        status: 'present',
        notes: attendanceRecords[p.id]?.notes || '',
      };
    });
    setAttendanceRecords(updated);
  };

  const handleResetAttendance = () => {
    const updated: Record<string, { status: AttendanceStatus; notes: string }> = {};
    players.forEach((p) => {
      updated[p.id] = {
        status: 'present',
        notes: '',
      };
    });
    setAttendanceRecords(updated);
  };

  // Save session to history & recalculate global attendance for players
  const handleSaveAttendance = () => {
    if (!userProfile && onOpenTrialModal) {
      onOpenTrialModal('general_action');
    }

    const recordsArray: PlayerDailyAttendance[] = players.map((p) => ({
      playerId: p.id,
      playerName: p.name,
      jerseyNumber: p.jerseyNumber,
      role: p.role,
      status: attendanceRecords[p.id]?.status || 'present',
      notes: attendanceRecords[p.id]?.notes || '',
    }));

    const newSession: DailyAttendanceSession = {
      id: `att-${sessionDate}-${sessionType}-${Date.now()}`,
      date: sessionDate,
      sessionType,
      title: sessionTitle.trim() || undefined,
      notes: sessionGeneralNotes.trim() || undefined,
      records: recordsArray,
      createdAt: new Date().toISOString(),
    };

    // Replace if already exists on same date and session type, otherwise add
    const updatedSessions = [
      newSession,
      ...savedSessions.filter((s) => !(s.date === sessionDate && s.sessionType === sessionType)),
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    setSavedSessions(updatedSessions);
    localStorage.setItem(ATTENDANCE_STORAGE_KEY, JSON.stringify(updatedSessions));

    // Recalculate each player's global attendance % across all saved sessions
    if (onUpdatePlayer) {
      players.forEach((player) => {
        let totalSessionsForPlayer = 0;
        let attendedOrJustifiedScore = 0;

        updatedSessions.forEach((sess) => {
          const rec = sess.records.find((r) => r.playerId === player.id);
          if (rec) {
            totalSessionsForPlayer += 1;
            if (rec.status === 'present') {
              attendedOrJustifiedScore += 1;
            } else if (rec.status === 'late') {
              attendedOrJustifiedScore += 0.8;
            } else if (rec.status === 'absent_justified') {
              attendedOrJustifiedScore += 0.5; // neutral/half weight
            }
          }
        });

        if (totalSessionsForPlayer > 0) {
          const calculatedPct = Math.round((attendedOrJustifiedScore / totalSessionsForPlayer) * 100);
          onUpdatePlayer({
            ...player,
            attendancePct: calculatedPct,
          });
        }
      });
    }

    setIsSavedBannerVisible(true);
    setTimeout(() => {
      setIsSavedBannerVisible(false);
    }, 4000);
  };

  const handleDeleteSession = (sessionId: string) => {
    const filtered = savedSessions.filter((s) => s.id !== sessionId);
    setSavedSessions(filtered);
    localStorage.setItem(ATTENDANCE_STORAGE_KEY, JSON.stringify(filtered));
    if (selectedHistorySession?.id === sessionId) {
      setSelectedHistorySession(null);
    }
  };

  // Summary Metrics of current session
  const summaryStats = useMemo(() => {
    let presentCount = 0;
    let lateCount = 0;
    let justCount = 0;
    let unjustCount = 0;

    players.forEach((p) => {
      const st = attendanceRecords[p.id]?.status || 'present';
      if (st === 'present') presentCount += 1;
      else if (st === 'late') lateCount += 1;
      else if (st === 'absent_justified') justCount += 1;
      else if (st === 'absent_unjustified') unjustCount += 1;
    });

    const total = players.length;
    const rate = total > 0 ? Math.round(((presentCount + lateCount * 0.8) / total) * 100) : 100;

    return {
      total,
      presentCount,
      lateCount,
      justCount,
      unjustCount,
      rate,
    };
  }, [players, attendanceRecords]);

  // Filtered Players
  const filteredPlayers = useMemo(() => {
    return players
      .filter((p) => {
        if (selectedRoleFilter !== 'ALL' && p.role !== selectedRoleFilter) {
          return false;
        }
        if (!searchTerm.trim()) return true;
        const term = searchTerm.trim().toLowerCase();
        const numStr = (p.jerseyNumber ?? '').toString();
        return p.name.toLowerCase().includes(term) || numStr.includes(term);
      })
      .sort((a, b) => (a.jerseyNumber ?? 0) - (b.jerseyNumber ?? 0));
  }, [players, selectedRoleFilter, searchTerm]);

  // Overall Global Attendance Stats per Player (across all sessions in history)
  const playerGlobalStats = useMemo(() => {
    return players.map((p) => {
      let sessionsCount = 0;
      let presentCount = 0;
      let lateCount = 0;
      let justCount = 0;
      let unjustCount = 0;

      savedSessions.forEach((s) => {
        const rec = s.records.find((r) => r.playerId === p.id);
        if (rec) {
          sessionsCount += 1;
          if (rec.status === 'present') presentCount += 1;
          else if (rec.status === 'late') lateCount += 1;
          else if (rec.status === 'absent_justified') justCount += 1;
          else if (rec.status === 'absent_unjustified') unjustCount += 1;
        }
      });

      const effectiveAttendance =
        sessionsCount > 0
          ? Math.round(((presentCount + lateCount * 0.8) / sessionsCount) * 100)
          : (p.attendancePct ?? 100);

      return {
        player: p,
        sessionsCount,
        presentCount,
        lateCount,
        justCount,
        unjustCount,
        attendanceRate: effectiveAttendance,
      };
    }).sort((a, b) => b.attendanceRate - a.attendanceRate);
  }, [players, savedSessions]);

  // WhatsApp formatted attendance message
  const handleCopyWhatsAppAttendance = () => {
    const formattedDate = new Date(sessionDate).toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const presentList = players
      .filter((p) => attendanceRecords[p.id]?.status === 'present')
      .map((p) => `• #${p.jerseyNumber} ${p.name.toUpperCase()}`)
      .join('\n');

    const lateList = players
      .filter((p) => attendanceRecords[p.id]?.status === 'late')
      .map((p) => `• #${p.jerseyNumber} ${p.name.toUpperCase()} (${attendanceRecords[p.id]?.notes || 'Retraso'})`)
      .join('\n');

    const justifiedList = players
      .filter((p) => attendanceRecords[p.id]?.status === 'absent_justified')
      .map((p) => `• #${p.jerseyNumber} ${p.name.toUpperCase()} (${attendanceRecords[p.id]?.notes || 'Justificada'})`)
      .join('\n');

    const unjustifiedList = players
      .filter((p) => attendanceRecords[p.id]?.status === 'absent_unjustified')
      .map((p) => `• #${p.jerseyNumber} ${p.name.toUpperCase()} (${attendanceRecords[p.id]?.notes || 'Sin justificar'})`)
      .join('\n');

    const text = `📋 *CONTROL DE ASISTENCIA - COACHMIND*
📅 *Fecha:* ${formattedDate}
🏀 *Sesión:* ${SESSION_TYPE_CONFIG[sessionType].label} ${sessionTitle ? `(${sessionTitle})` : ''}
📊 *Asistencia Global:* ${summaryStats.rate}% (${summaryStats.presentCount}/${summaryStats.total} presentes)

✅ *PRESENTES (${summaryStats.presentCount}):*
${presentList || 'Ninguna'}

🟡 *RETRASOS / PARCIALES (${summaryStats.lateCount}):*
${lateList || 'Ninguna'}

🔵 *AUSENCIAS JUSTIFICADAS (${summaryStats.justCount}):*
${justifiedList || 'Ninguna'}

🔴 *AUSENCIAS INJUSTIFICADAS (${summaryStats.unjustCount}):*
${unjustifiedList || 'Ninguna'}
${sessionGeneralNotes ? `\n📝 *Notas del Cuerpo Técnico:*\n${sessionGeneralNotes}` : ''}`;

    navigator.clipboard.writeText(text);
    alert('📋 Resumen de asistencia copiado al portapapeles. ¡Listo para pegar en WhatsApp!');
  };

  // Export CSV
  const handleExportCSV = () => {
    if (savedSessions.length === 0) {
      alert('Aún no hay sesiones guardadas en el historial para exportar.');
      return;
    }

    let csvContent = 'data:text/csv;charset=utf-8,';
    csvContent += 'Fecha,Tipo de Sesión,Título,Dorsal,Jugadora,Posición,Estado de Asistencia,Notas\n';

    savedSessions.forEach((sess) => {
      sess.records.forEach((rec) => {
        const row = [
          sess.date,
          `"${SESSION_TYPE_CONFIG[sess.sessionType]?.label || sess.sessionType}"`,
          `"${sess.title || ''}"`,
          rec.jerseyNumber,
          `"${rec.playerName}"`,
          `"${rec.role || ''}"`,
          `"${STATUS_CONFIG[rec.status]?.label || rec.status}"`,
          `"${rec.notes || ''}"`,
        ].join(',');
        csvContent += row + '\n';
      });
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `asistencias_coachmind_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Sub Navigation Bar for Attendance */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 sm:p-4 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          <button
            type="button"
            onClick={() => setSubTab('daily')}
            className={`px-4 py-2 rounded-xl font-black text-xs transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
              subTab === 'daily'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            <CalendarDays className="w-4 h-4" />
            <span>Pase de Asistencia Diario</span>
          </button>

          <button
            type="button"
            onClick={() => setSubTab('history')}
            className={`px-4 py-2 rounded-xl font-black text-xs transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
              subTab === 'history'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            <History className="w-4 h-4" />
            <span>Historial ({savedSessions.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setSubTab('rankings')}
            className={`px-4 py-2 rounded-xl font-black text-xs transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
              subTab === 'rankings'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            <span>Resumen & Ratios</span>
          </button>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <button
            type="button"
            onClick={handleCopyWhatsAppAttendance}
            className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
            title="Copiar formato WhatsApp"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>Copiar para WhatsApp</span>
          </button>

          {savedSessions.length > 0 && (
            <button
              type="button"
              onClick={handleExportCSV}
              className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer"
              title="Exportar archivo CSV"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Exportar CSV</span>
            </button>
          )}
        </div>
      </div>

      {/* Confirmation Banner */}
      {isSavedBannerVisible && (
        <div className="p-4 rounded-2xl bg-emerald-500 text-white shadow-lg flex items-center justify-between animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center font-bold">
              <Check className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-black">¡Asistencia registrada y guardada con éxito!</p>
              <p className="text-[11px] text-emerald-100 font-semibold">
                Se han recalculado los porcentajes de asistencia de todas las jugadoras.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsSavedBannerVisible(false)}
            className="text-xs font-extrabold bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
          >
            Entendido
          </button>
        </div>
      )}

      {/* TAB 1: PASE DE ASISTENCIA DIARIO */}
      {subTab === 'daily' && (
        <div className="space-y-6">
          {/* Header de Configuración de la Sesión */}
          <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              {/* Date Controls */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
                  <button
                    type="button"
                    onClick={() => handleShiftDate(-1)}
                    className="p-1.5 hover:bg-white rounded-lg text-slate-700 transition-colors cursor-pointer"
                    title="Día anterior"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <input
                    type="date"
                    value={sessionDate}
                    onChange={(e) => setSessionDate(e.target.value)}
                    className="px-2.5 py-1 bg-transparent text-xs font-extrabold text-slate-900 focus:outline-none cursor-pointer"
                  />
                  <button
                    type="button"
                    onClick={() => handleShiftDate(1)}
                    className="p-1.5 hover:bg-white rounded-lg text-slate-700 transition-colors cursor-pointer"
                    title="Día siguiente"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleSetToday}
                  className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
                >
                  Hoy
                </button>

                {/* Session Type Picker */}
                <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
                  {(Object.keys(SESSION_TYPE_CONFIG) as Array<keyof typeof SESSION_TYPE_CONFIG>).map((typeKey) => {
                    const cfg = SESSION_TYPE_CONFIG[typeKey];
                    const isSelected = sessionType === typeKey;
                    return (
                      <button
                        key={typeKey}
                        type="button"
                        onClick={() => setSessionType(typeKey)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                          isSelected
                            ? `${cfg.color} shadow-xs ring-2 ring-emerald-500/20`
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        <span>{cfg.icon}</span>
                        <span>{cfg.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Save Session CTA */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSaveAttendance}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-md shadow-emerald-600/20 transition-all hover:scale-[1.02] active:scale-95 cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>Guardar Asistencia del Día</span>
                </button>
              </div>
            </div>

            {/* Inputs: Optional Session Title & Coach Notes */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-black text-slate-600 uppercase tracking-wider mb-1">
                  Enfoque o Título de la Sesión (Opcional)
                </label>
                <input
                  type="text"
                  value={sessionTitle}
                  onChange={(e) => setSessionTitle(e.target.value)}
                  placeholder="Ej. Táctica 5c5 contra zona, Toma de decisiones, Sesión tiro..."
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>
              <div>
                <label className="block text-[11px] font-black text-slate-600 uppercase tracking-wider mb-1">
                  Observaciones Generales del Cuerpo Técnico
                </label>
                <input
                  type="text"
                  value={sessionGeneralNotes}
                  onChange={(e) => setSessionGeneralNotes(e.target.value)}
                  placeholder="Ej. Buena intensidad defensiva, descanso preventivo de tobillo..."
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>
            </div>

            {/* Resumen en Vivo del Día */}
            <div className="p-4 rounded-xl bg-slate-900 text-white flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="flex flex-col">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                    Ratio de Asistencia
                  </span>
                  <span className="text-2xl font-black text-emerald-400 tracking-tight">
                    {summaryStats.rate}%
                  </span>
                </div>
                <div className="h-8 w-px bg-slate-800" />
                <div className="flex items-center gap-2 sm:gap-4 flex-wrap">
                  <div className="flex items-center gap-1.5 bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-700">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    <span className="text-xs font-bold text-slate-300">
                      Presentes: <strong className="text-white">{summaryStats.presentCount}</strong>
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-700">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                    <span className="text-xs font-bold text-slate-300">
                      Retrasos: <strong className="text-white">{summaryStats.lateCount}</strong>
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-700">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                    <span className="text-xs font-bold text-slate-300">
                      Justificadas: <strong className="text-white">{summaryStats.justCount}</strong>
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-700">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                    <span className="text-xs font-bold text-slate-300">
                      Injustificadas: <strong className="text-white">{summaryStats.unjustCount}</strong>
                    </span>
                  </div>
                </div>
              </div>

              {/* Bulk Quick Actions */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleMarkAllPresent}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-300 border border-emerald-500/40 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  <span>Todos Presentes</span>
                </button>
                <button
                  type="button"
                  onClick={handleResetAttendance}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                  title="Restablecer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Restablecer</span>
                </button>
              </div>
            </div>
          </div>

          {/* Filtros de Lista de Jugadoras */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
            <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
              <span className="text-xs font-extrabold text-slate-500 mr-1 flex items-center gap-1">
                <Filter className="w-3.5 h-3.5" /> Posición:
              </span>
              {(['ALL', 'Base', 'Escolta', 'Alero', 'Ala-Pívot', 'Pívot'] as const).map((role) => (
                <button
                  key={role}
                  type="button"
                  onClick={() => setSelectedRoleFilter(role)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    selectedRoleFilter === role
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                  }`}
                >
                  {role === 'ALL' ? 'Todas' : role}
                </button>
              ))}
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por dorsal o nombre..."
                className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>
          </div>

          {/* Matriz de Jugadoras para Pase de Asistencia */}
          {filteredPlayers.length === 0 ? (
            <div className="bg-white p-12 text-center rounded-2xl border border-slate-200 space-y-3">
              <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto text-xl">
                👥
              </div>
              <p className="text-sm font-extrabold text-slate-800">No se encontraron jugadoras</p>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                No hay jugadoras que coincidan con los filtros seleccionados o aún no has añadido jugadoras a tu plantilla.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredPlayers.map((player) => {
                const currentStatus: AttendanceStatus = attendanceRecords[player.id]?.status || 'present';
                const playerNote = attendanceRecords[player.id]?.notes || '';

                return (
                  <div
                    key={player.id}
                    className={`bg-white p-4 rounded-2xl border transition-all shadow-2xs hover:shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                      currentStatus === 'present'
                        ? 'border-emerald-200 bg-emerald-50/20'
                        : currentStatus === 'late'
                        ? 'border-amber-200 bg-amber-50/20'
                        : currentStatus === 'absent_justified'
                        ? 'border-blue-200 bg-blue-50/20'
                        : 'border-rose-200 bg-rose-50/20'
                    }`}
                  >
                    {/* Info de la Jugadora */}
                    <div className="flex items-center gap-3.5 min-w-[240px]">
                      <div className="w-11 h-11 rounded-xl bg-slate-900 text-white font-black text-base flex items-center justify-center shadow-xs shrink-0">
                        #{player.jerseyNumber}
                      </div>
                      <div>
                        <h4 className="font-extrabold text-slate-900 text-sm capitalize leading-tight">
                          {player.name}
                        </h4>
                        <div className="flex items-center gap-2 text-[11px] font-bold text-slate-500 mt-0.5">
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                            {player.role}
                          </span>
                          <span>•</span>
                          <span>Asist. Global: <strong className="text-emerald-700">{player.attendancePct ?? 95}%</strong></span>
                        </div>
                      </div>
                    </div>

                    {/* Botones de Estado Interactivo */}
                    <div className="flex flex-wrap items-center gap-1.5">
                      {(Object.keys(STATUS_CONFIG) as AttendanceStatus[]).map((stKey) => {
                        const isSelected = currentStatus === stKey;
                        const cfg = STATUS_CONFIG[stKey];

                        return (
                          <button
                            key={stKey}
                            type="button"
                            onClick={() => handleSetPlayerStatus(player.id, stKey)}
                            className={`px-3 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer shrink-0 border ${
                              isSelected
                                ? `${cfg.colorBg} border-transparent shadow-xs scale-[1.02]`
                                : 'bg-white hover:bg-slate-100 text-slate-600 border-slate-200'
                            }`}
                          >
                            <span>{cfg.icon}</span>
                            <span className="hidden sm:inline">{cfg.label}</span>
                            <span className="sm:hidden">{cfg.shortLabel}</span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Motivo o Nota Individual */}
                    <div className="w-full md:w-64 shrink-0">
                      <input
                        type="text"
                        value={playerNote}
                        onChange={(e) => handleSetPlayerNotes(player.id, e.target.value)}
                        placeholder={
                          currentStatus === 'present'
                            ? 'Nota individual (ej. gran ritmo)...'
                            : currentStatus === 'late'
                            ? 'Motivo retraso (ej. 15m tráfico)...'
                            : currentStatus === 'absent_justified'
                            ? 'Motivo justificación (ej. examen)...'
                            : 'Motivo ausencia injustificada...'
                        }
                        className={`w-full px-3 py-1.5 rounded-xl border text-xs font-semibold focus:outline-none transition-colors ${
                          playerNote
                            ? 'bg-white border-slate-300 text-slate-900 font-bold'
                            : 'bg-slate-50/80 border-slate-200 text-slate-600 focus:bg-white'
                        }`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Botón flotante inferior para guardar */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={handleSaveAttendance}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-lg shadow-emerald-600/30 transition-all hover:scale-[1.02] cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>Guardar Registro de Asistencia</span>
            </button>
          </div>
        </div>
      )}

      {/* TAB 2: HISTORIAL DE SESIONES PASADAS */}
      {subTab === 'history' && (
        <div className="space-y-6">
          <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-black text-slate-900 tracking-tight flex items-center gap-2">
                  <History className="w-5 h-5 text-emerald-600" />
                  Registro Histórico de Asistencias
                </h3>
                <p className="text-xs font-medium text-slate-500">
                  Listado cronológico de entrenamientos, partidos y sesiones con control de asistencia guardado.
                </p>
              </div>

              {savedSessions.length > 0 && (
                <button
                  type="button"
                  onClick={handleExportCSV}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Descargar Todo (CSV)</span>
                </button>
              )}
            </div>

            {savedSessions.length === 0 ? (
              <div className="py-12 text-center border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50 space-y-3">
                <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto text-xl">
                  📅
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-extrabold text-slate-800">No hay sesiones guardadas en el historial</p>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    Pasa asistencia en la pestaña principal y pulsa "Guardar Asistencia del Día" para acumular historial.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSubTab('daily')}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-md transition-all cursor-pointer"
                >
                  Pasar Asistencia Hoy
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {savedSessions.map((session) => {
                  const presentCount = session.records.filter((r) => r.status === 'present').length;
                  const lateCount = session.records.filter((r) => r.status === 'late').length;
                  const justCount = session.records.filter((r) => r.status === 'absent_justified').length;
                  const unjustCount = session.records.filter((r) => r.status === 'absent_unjustified').length;
                  const total = session.records.length;
                  const pct = total > 0 ? Math.round(((presentCount + lateCount * 0.8) / total) * 100) : 100;
                  const isExpanded = selectedHistorySession?.id === session.id;

                  return (
                    <div
                      key={session.id}
                      className="bg-white rounded-2xl border border-slate-200 shadow-2xs hover:border-slate-300 transition-all overflow-hidden"
                    >
                      <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-3.5">
                          <div className="w-11 h-11 rounded-xl bg-slate-900 text-white flex items-center justify-center text-xl shrink-0">
                            {SESSION_TYPE_CONFIG[session.sessionType]?.icon || '🏀'}
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-black text-slate-900">
                                {new Date(session.date).toLocaleDateString('es-ES', {
                                  weekday: 'short',
                                  day: 'numeric',
                                  month: 'short',
                                  year: 'numeric',
                                })}
                              </span>
                              <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-bold text-[11px]">
                                {SESSION_TYPE_CONFIG[session.sessionType]?.label || session.sessionType}
                              </span>
                              {session.title && (
                                <span className="text-xs text-slate-600 font-medium italic">
                                  "{session.title}"
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-3 text-xs font-semibold text-slate-500 mt-1">
                              <span>
                                Asistencia: <strong className="text-emerald-600 font-black">{pct}%</strong> ({presentCount}/{total})
                              </span>
                              {lateCount > 0 && <span className="text-amber-600 font-bold">• {lateCount} retrasos</span>}
                              {unjustCount > 0 && <span className="text-rose-600 font-bold">• {unjustCount} injustificadas</span>}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setSessionDate(session.date);
                              setSessionType(session.sessionType);
                              setSubTab('daily');
                            }}
                            className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                            title="Cargar sesión para editar"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>Cargar / Editar</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setSelectedHistorySession(isExpanded ? null : session)}
                            className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
                          >
                            {isExpanded ? 'Ocultar Detalle' : 'Ver Detalle'}
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              if (confirm('¿Eliminar este registro histórico de asistencia?')) {
                                handleDeleteSession(session.id);
                              }
                            }}
                            className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                            title="Eliminar sesión"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Detalle Desplegado de la Sesión */}
                      {isExpanded && (
                        <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-200 space-y-3">
                          {session.notes && (
                            <div className="p-3 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-700">
                              <strong className="text-slate-900 block mb-0.5">Notas generales:</strong>
                              {session.notes}
                            </div>
                          )}

                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                            {session.records.map((rec) => {
                              const cfg = STATUS_CONFIG[rec.status];
                              return (
                                <div
                                  key={rec.playerId}
                                  className="p-2.5 rounded-xl bg-white border border-slate-200 flex items-center justify-between text-xs"
                                >
                                  <div className="flex items-center gap-2">
                                    <span className="w-6 h-6 rounded-md bg-slate-900 text-white font-black text-[11px] flex items-center justify-center">
                                      #{rec.jerseyNumber}
                                    </span>
                                    <span className="font-bold text-slate-900 capitalize truncate max-w-[110px]">
                                      {rec.playerName}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-1.5">
                                    <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${cfg.badgeBg}`}>
                                      {cfg.shortLabel}
                                    </span>
                                    {rec.notes && (
                                      <span
                                        className="text-[10px] text-slate-400 max-w-[80px] truncate"
                                        title={rec.notes}
                                      >
                                        ({rec.notes})
                                      </span>
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
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: RESUMEN Y RANKING DE ASISTENCIA GLOBAL */}
      {subTab === 'rankings' && (
        <div className="space-y-6">
          <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-6">
            <div>
              <h3 className="text-base font-black text-slate-900 tracking-tight flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-emerald-600" />
                Rendimiento y Compromiso de Asistencia
              </h3>
              <p className="text-xs font-medium text-slate-500">
                Clasificación acumulada de jugadoras por compromiso y porcentaje de asistencia total.
              </p>
            </div>

            {/* Tabla de Jugadoras */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 font-black uppercase text-[10px] tracking-wider">
                    <th className="pb-3 px-3">Dorsal</th>
                    <th className="pb-3 px-3">Jugadora</th>
                    <th className="pb-3 px-3">Posición</th>
                    <th className="pb-3 px-3 text-center">Sesiones Totales</th>
                    <th className="pb-3 px-3 text-center">Presente</th>
                    <th className="pb-3 px-3 text-center">Retrasos</th>
                    <th className="pb-3 px-3 text-center">Justificadas</th>
                    <th className="pb-3 px-3 text-center">Injustificadas</th>
                    <th className="pb-3 px-3 text-right">% Asistencia</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {playerGlobalStats.map(({ player, sessionsCount, presentCount, lateCount, justCount, unjustCount, attendanceRate }) => (
                    <tr key={player.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-3 font-black text-slate-900">
                        <span className="w-7 h-7 rounded-lg bg-slate-900 text-white font-black text-xs flex items-center justify-center">
                          #{player.jerseyNumber}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-extrabold text-slate-900 capitalize">
                        {player.name}
                      </td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-bold text-[11px]">
                          {player.role}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center font-bold text-slate-700">
                        {sessionsCount}
                      </td>
                      <td className="py-3 px-3 text-center font-bold text-emerald-600">
                        {presentCount}
                      </td>
                      <td className="py-3 px-3 text-center font-bold text-amber-600">
                        {lateCount}
                      </td>
                      <td className="py-3 px-3 text-center font-bold text-blue-600">
                        {justCount}
                      </td>
                      <td className="py-3 px-3 text-center font-bold text-rose-600">
                        {unjustCount}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full font-black text-xs ${
                            attendanceRate >= 90
                              ? 'bg-emerald-100 text-emerald-800'
                              : attendanceRate >= 75
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {attendanceRate}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
