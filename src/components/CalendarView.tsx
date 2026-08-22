import React, { useState } from 'react';
import {
  Calendar as CalendarIcon,
  Plus,
  Trash2,
  Clock,
  MapPin,
  Users,
  ShieldAlert,
  Home,
  Navigation,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Info,
  CheckCircle2,
  CalendarDays,
  Handshake,
  X,
} from 'lucide-react';
import { CalendarEvent, EventType, MatchLeg, Player, UserProfile } from '../types';
import { consumeTrialAction } from '../utils/trialManager';

interface CalendarViewProps {
  events: CalendarEvent[];
  onAddEvent: (event: CalendarEvent) => void;
  onDeleteEvent: (id: string) => void;
  players?: Player[];
  userProfile?: UserProfile | null;
  onOpenTrialModal?: (mode?: 'general_action' | 'ficha_entrenador') => void;
}

export const CalendarView: React.FC<CalendarViewProps> = ({
  events,
  onAddEvent,
  onDeleteEvent,
  players = [],
  userProfile,
  onOpenTrialModal,
}) => {
  const [filterType, setFilterType] = useState<'all' | 'training' | 'match' | 'friendly' | 'home' | 'away'>('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [eventToDelete, setEventToDelete] = useState<CalendarEvent | null>(null);

  // Month navigation state
  const [currentDate, setCurrentDate] = useState<Date>(new Date());

  // Form State
  const [eventType, setEventType] = useState<EventType>('match');
  const [title, setTitle] = useState('');
  const [dateStr, setDateStr] = useState(new Date().toISOString().split('T')[0]);
  const [arrivalTime, setArrivalTime] = useState('17:00');
  const [startTime, setStartTime] = useState('18:00');
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');

  // Match specific form state
  const [isHome, setIsHome] = useState(true);
  const [opponent, setOpponent] = useState('');
  const [leg, setLeg] = useState<MatchLeg>('ida');
  const [selectedAbsentPlayers, setSelectedAbsentPlayers] = useState<string[]>([]);
  const [customAbsentText, setCustomAbsentText] = useState('');

  // Handle month change
  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };
  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();

  const monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  // Days in month calculation
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(currentYear, currentMonth, 1).getDay(); // 0 = Sun
  // Convert Sun-based (0-6) to Mon-based (0-6)
  const startOffset = (firstDayOfWeek + 6) % 7;

  const handleDayClick = (date: string) => {
    setDateStr(date);
    setIsAddModalOpen(true);
  };

  // Filter events
  const filteredEvents = events.filter((ev) => {
    if (filterType === 'training') return ev.type === 'training';
    if (filterType === 'match') return ev.type === 'match' && ev.leg !== 'pretemporada';
    if (filterType === 'friendly') return ev.type === 'friendly' || ev.leg === 'pretemporada';
    if (filterType === 'home') return (ev.type === 'match' || ev.type === 'friendly') && ev.isHome === true;
    if (filterType === 'away') return (ev.type === 'match' || ev.type === 'friendly') && ev.isHome === false;
    return true;
  });

  const handleOpenAddModal = (type: 'friendly' | 'match' | 'training') => {
    if (!userProfile) {
      if (onOpenTrialModal) onOpenTrialModal('general_action');
      return;
    }
    setEventType(type);
    if (type === 'friendly') setLeg('pretemporada');
    setIsAddModalOpen(true);
  };

  const handleToggleAbsentPlayer = (playerName: string) => {
    if (selectedAbsentPlayers.includes(playerName)) {
      setSelectedAbsentPlayers(selectedAbsentPlayers.filter((p) => p !== playerName));
    } else {
      setSelectedAbsentPlayers([...selectedAbsentPlayers, playerName]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!consumeTrialAction(userProfile, 'calendar')) {
      setIsAddModalOpen(false);
      if (onOpenTrialModal) onOpenTrialModal('general_action');
      return;
    }

    let absentList = [...selectedAbsentPlayers];
    if (customAbsentText.trim()) {
      const extras = customAbsentText.split(',').map((s) => s.trim()).filter(Boolean);
      absentList = Array.from(new Set([...absentList, ...extras]));
    }

    const isMatchOrFriendly = eventType === 'match' || eventType === 'friendly';

    const newEvent: CalendarEvent = {
      id: `ev-${Date.now()}`,
      title: eventType === 'training' ? (title || 'Entrenamiento de Equipo') : `vs ${opponent || 'Rival'}`,
      type: eventType,
      date: dateStr,
      arrivalTime,
      startTime,
      location: location || (isHome ? 'Pabellón Local' : 'Pabellón Visitante'),
      notes,
      isHome: isMatchOrFriendly ? isHome : undefined,
      opponent: isMatchOrFriendly ? opponent : undefined,
      leg: eventType === 'friendly' ? 'pretemporada' : (isMatchOrFriendly ? leg : undefined),
      absentPlayers: isMatchOrFriendly ? absentList : undefined,
    };

    onAddEvent(newEvent);
    setIsAddModalOpen(false);

    // Auto navigate calendar to the month of the newly added event
    if (dateStr) {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        const y = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10);
        if (!isNaN(y) && !isNaN(m)) {
          setCurrentDate(new Date(y, m - 1, 1));
        }
      }
    }

    // Set filter tab so the user immediately sees their new event
    if (eventType === 'friendly') {
      setFilterType('friendly');
    } else if (eventType === 'match') {
      setFilterType('match');
    } else if (eventType === 'training') {
      setFilterType('training');
    }

    // Reset Form
    setTitle('');
    setOpponent('');
    setNotes('');
    setCustomAbsentText('');
    setSelectedAbsentPlayers([]);
  };

  return (
    <div className="space-y-6 animate-fadeIn w-full max-w-7xl mx-auto pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-600/20 shrink-0">
            <CalendarDays className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Calendario de Equipo
            </h1>
            <p className="text-sm text-slate-500">
              Planifica entrenamientos, partidos (Local/Visitante), horarios de cita y jugadoras ausentes
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => handleOpenAddModal('friendly')}
            className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-extrabold text-xs sm:text-sm shadow-md shadow-purple-600/20 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
          >
            <Handshake className="w-5 h-5 text-purple-200" />
            <span>+ Amistoso Pretemporada</span>
          </button>

          <button
            onClick={() => handleOpenAddModal('match')}
            className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs sm:text-sm shadow-md shadow-blue-600/20 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
          >
            <Plus className="w-5 h-5" />
            <span>Añadir Entreno / Partido</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 custom-scrollbar">
        {[
          { id: 'all', label: 'Todos los Eventos' },
          { id: 'friendly', label: '🤝 Amistosos Pretemporada' },
          { id: 'match', label: '🏆 Partidos Oficiales' },
          { id: 'training', label: '🏀 Entrenamientos' },
          { id: 'home', label: '🏠 Partidos de Local' },
          { id: 'away', label: '✈️ Partidos de Visitante' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setFilterType(tab.id as any)}
            className={`px-4 py-2 rounded-xl font-bold text-xs whitespace-nowrap transition-all cursor-pointer ${
              filterType === tab.id
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Interactive Calendar Grid */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <CalendarIcon className="w-5 h-5 text-blue-600" />
              <span>
                {monthNames[currentMonth]} {currentYear}
              </span>
            </h2>
            <div className="flex items-center gap-1">
              <button
                onClick={prevMonth}
                className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={nextMonth}
                className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Days of Week Header */}
          <div className="grid grid-cols-7 gap-1 text-center font-bold text-xs text-slate-400 py-1">
            <span>Lun</span>
            <span>Mar</span>
            <span>Mié</span>
            <span>Jue</span>
            <span>Vie</span>
            <span>Sáb</span>
            <span>Dom</span>
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1">
            {/* Empty Offset cells */}
            {Array.from({ length: startOffset }).map((_, i) => (
              <div key={`offset-${i}`} className="h-16 rounded-xl bg-slate-50/50" />
            ))}

            {/* Days in Month */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const dayNum = i + 1;
              const formattedDate = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
              const dayEvents = events.filter((e) => e.date === formattedDate);
              const isToday = formattedDate === new Date().toISOString().split('T')[0];

              return (
                <div
                  key={`day-${dayNum}`}
                  onClick={() => handleDayClick(formattedDate)}
                  className={`h-20 p-1.5 rounded-xl border flex flex-col justify-between transition-all cursor-pointer group ${
                    isToday
                      ? 'border-blue-500 bg-blue-50/30 font-bold hover:bg-blue-100/50'
                      : 'border-slate-100 bg-white hover:bg-blue-50/40 hover:border-blue-200 hover:shadow-xs'
                  }`}
                  title={`Haz clic para añadir un evento el ${dayNum} de ${monthNames[currentMonth]}`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs ${
                        isToday
                          ? 'w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center font-extrabold'
                          : 'text-slate-700 group-hover:text-blue-600 font-bold'
                      }`}
                    >
                      {dayNum}
                    </span>
                    <Plus className="w-3 h-3 text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                  </div>

                  <div className="space-y-1 overflow-y-auto custom-scrollbar">
                    {dayEvents.map((ev) => {
                      const isFriendly = ev.type === 'friendly' || ev.leg === 'pretemporada';
                      return (
                        <div
                          key={ev.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedEvent(ev);
                          }}
                          className={`text-[9px] font-bold px-1.5 py-0.5 rounded truncate cursor-pointer transition-transform hover:scale-105 shadow-2xs ${
                            ev.type === 'training'
                              ? 'bg-amber-100 text-amber-900 border border-amber-200 hover:bg-amber-200'
                              : isFriendly
                              ? 'bg-purple-100 text-purple-900 border border-purple-200 hover:bg-purple-200'
                              : ev.isHome
                              ? 'bg-emerald-100 text-emerald-900 border border-emerald-200 hover:bg-emerald-200'
                              : 'bg-blue-100 text-blue-900 border border-blue-200 hover:bg-blue-200'
                          }`}
                          title={`${ev.title} (${ev.startTime}) - Haz clic para ver detalles`}
                        >
                          {isFriendly
                            ? '🤝 vs '
                            : ev.type === 'match'
                            ? (ev.isHome ? '🏠 vs ' : '✈️ vs ')
                            : '🏀 '}
                          {ev.opponent || ev.title}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Upcoming Events Agenda */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 space-y-4 flex flex-col">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-600" />
              <span>Agenda de Eventos ({filteredEvents.length})</span>
            </h3>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto max-h-[500px] custom-scrollbar pr-1">
            {filteredEvents.length === 0 ? (
              <div className="text-center py-12 px-4 space-y-2">
                <CalendarIcon className="w-10 h-10 text-slate-300 mx-auto" />
                <p className="text-sm font-semibold text-slate-600">No hay eventos programados</p>
                <p className="text-xs text-slate-400">
                  Haz clic en "+ Amistoso Pretemporada" o "Añadir Entreno / Partido" para empezar la agenda.
                </p>
              </div>
            ) : (
              filteredEvents
                .sort((a, b) => a.date.localeCompare(b.date))
                .map((ev) => {
                  const isFriendly = ev.type === 'friendly' || ev.leg === 'pretemporada';
                  return (
                    <div
                      key={ev.id}
                      className={`p-4 rounded-xl border transition-all space-y-2.5 ${
                        ev.type === 'training'
                          ? 'bg-amber-50/40 border-amber-200/80 hover:border-amber-300'
                          : isFriendly
                          ? 'bg-purple-50/40 border-purple-200/80 hover:border-purple-300'
                          : ev.isHome
                          ? 'bg-emerald-50/40 border-emerald-200/80 hover:border-emerald-300'
                          : 'bg-blue-50/40 border-blue-200/80 hover:border-blue-300'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide ${
                                ev.type === 'training'
                                  ? 'bg-amber-200 text-amber-900'
                                  : isFriendly
                                  ? 'bg-purple-200 text-purple-900'
                                  : ev.isHome
                                  ? 'bg-emerald-200 text-emerald-900'
                                  : 'bg-blue-200 text-blue-900'
                              }`}
                            >
                              {ev.type === 'training'
                                ? 'Entrenamiento'
                                : isFriendly
                                ? 'Amistoso Pretemporada 🤝'
                                : ev.isHome
                                ? 'Partido Local 🏠'
                                : 'Partido Visitante ✈️'}
                            </span>
                            {ev.leg && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 text-slate-700 uppercase">
                                {ev.leg === 'pretemporada'
                                  ? 'Pretemporada'
                                  : ev.leg === 'ida'
                                  ? 'Partido de Ida'
                                  : ev.leg === 'vuelta'
                                  ? 'Partido de Vuelta'
                                  : 'Partido Único'}
                              </span>
                            )}
                          </div>

                          <h4 className="font-extrabold text-slate-900 text-base">
                            {ev.type === 'match' || isFriendly ? `vs ${ev.opponent || 'Rival'}` : ev.title}
                          </h4>
                        </div>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEventToDelete(ev);
                          }}
                          className="p-1.5 rounded-lg bg-red-100 hover:bg-red-200 text-red-600 transition-colors cursor-pointer shrink-0"
                          title="Eliminar evento"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 pt-1">
                        <div className="flex items-center gap-1.5">
                          <CalendarIcon className="w-3.5 h-3.5 text-slate-400" />
                          <span className="font-semibold">{ev.date}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span>
                            {ev.arrivalTime ? `Cita: ${ev.arrivalTime} | ` : ''}
                            <strong>Inicio: {ev.startTime}</strong>
                          </span>
                        </div>
                        <div className="col-span-2 flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate">{ev.location}</span>
                        </div>
                      </div>

                      {/* Absent / Injured players */}
                      {ev.absentPlayers && ev.absentPlayers.length > 0 && (
                        <div className="p-2.5 rounded-lg bg-red-50 border border-red-100 space-y-1">
                          <span className="text-[10px] font-extrabold uppercase text-red-700 flex items-center gap-1">
                            <ShieldAlert className="w-3 h-3 text-red-600" />
                            Jugadoras Bajas / Lesionadas ({ev.absentPlayers.length}):
                          </span>
                          <div className="flex flex-wrap gap-1">
                            {ev.absentPlayers.map((p, idx) => (
                              <span
                                key={idx}
                                className="px-2 py-0.5 rounded-md bg-red-100 text-red-800 text-[11px] font-bold"
                              >
                                {p}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {ev.notes && (
                        <p className="text-xs text-slate-500 italic bg-white/60 p-2 rounded-lg border border-slate-100">
                          "{ev.notes}"
                        </p>
                      )}
                    </div>
                  );
                })
            )}
          </div>
        </div>
      </div>

      {/* Modal: Add New Calendar Event */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-5 bg-[#0B132B] text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CalendarDays className="w-5 h-5 text-amber-400" />
                <h3 className="font-extrabold text-lg">Añadir Nuevo Evento al Calendario</h3>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto custom-scrollbar">
              {/* Type Selector (3 options) */}
              <div className="grid grid-cols-3 gap-2 sm:gap-3">
                <button
                  type="button"
                  onClick={() => setEventType('match')}
                  className={`p-2.5 sm:p-3 rounded-xl border text-center font-bold text-xs sm:text-sm flex flex-col sm:flex-row items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    eventType === 'match'
                      ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <TrophyIcon className="w-4 h-4" />
                  <span>Partido Oficial</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEventType('friendly');
                    setLeg('pretemporada');
                  }}
                  className={`p-2.5 sm:p-3 rounded-xl border text-center font-bold text-xs sm:text-sm flex flex-col sm:flex-row items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    eventType === 'friendly'
                      ? 'bg-purple-600 text-white border-purple-600 shadow-md'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <Handshake className="w-4 h-4" />
                  <span>Amistoso Pretemporada</span>
                </button>
                <button
                  type="button"
                  onClick={() => setEventType('training')}
                  className={`p-2.5 sm:p-3 rounded-xl border text-center font-bold text-xs sm:text-sm flex flex-col sm:flex-row items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    eventType === 'training'
                      ? 'bg-amber-600 text-white border-amber-600 shadow-md'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <BasketballIcon className="w-4 h-4" />
                  <span>Entrenamiento</span>
                </button>
              </div>

              {(eventType === 'match' || eventType === 'friendly') ? (
                <>
                  {/* Home vs Away Selector */}
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setIsHome(true)}
                      className={`p-3 rounded-xl border text-center font-extrabold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
                        isHome
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow'
                          : 'bg-slate-50 text-slate-600 border-slate-200'
                      }`}
                    >
                      <Home className="w-4 h-4" />
                      <span>PARTIDO COMO LOCAL 🏠</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsHome(false)}
                      className={`p-3 rounded-xl border text-center font-extrabold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
                        !isHome
                          ? 'bg-blue-600 text-white border-blue-600 shadow'
                          : 'bg-slate-50 text-slate-600 border-slate-200'
                      }`}
                    >
                      <Navigation className="w-4 h-4" />
                      <span>PARTIDO COMO VISITANTE ✈️</span>
                    </button>
                  </div>

                  {/* Rival & Leg */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Nombre del Rival *
                      </label>
                      <input
                        type="text"
                        required
                        value={opponent}
                        onChange={(e) => setOpponent(e.target.value)}
                        placeholder="ej. CB San Agustín (Amistoso)"
                        className="w-full p-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Tipo de Partido
                      </label>
                      <select
                        value={leg}
                        onChange={(e) => setLeg(e.target.value as MatchLeg)}
                        className="w-full p-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="pretemporada">Amistoso de Pretemporada</option>
                        <option value="ida">Partido de Ida</option>
                        <option value="vuelta">Partido de Vuelta</option>
                        <option value="unico">Partido Único / Torneo</option>
                      </select>
                    </div>
                  </div>
                </>
              ) : (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Título / Enfoque del Entrenamiento
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="ej. Sesión Táctica y Táctica Individual"
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}

              {/* Date & Times */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Fecha *</label>
                  <input
                    type="date"
                    required
                    value={dateStr}
                    onChange={(e) => setDateStr(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Hora de Cita / Llegada
                  </label>
                  <input
                    type="time"
                    value={arrivalTime}
                    onChange={(e) => setArrivalTime(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Hora Inicio Partido/Entreno *
                  </label>
                  <input
                    type="time"
                    required
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Location */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Dónde será / Pabellón o Campo
                </label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder={
                    isHome ? 'ej. Pabellón Municipal Polideportivo' : 'ej. Pabellón Rival Central'
                  }
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Absent / Injured Players Section */}
              {(eventType === 'match' || eventType === 'friendly') && (
                <div className="space-y-2 p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                  <label className="block text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
                    <ShieldAlert className="w-4 h-4 text-red-600" />
                    <span>Jugadoras que NO pueden ir (por lesión u otra causa)</span>
                  </label>

                  {players.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {players.map((p) => {
                        const isSelected = selectedAbsentPlayers.includes(p.name);
                        return (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => handleToggleAbsentPlayer(p.name)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-red-600 text-white shadow-sm'
                                : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            #{p.jerseyNumber} {p.name} {isSelected ? '✓' : ''}
                          </button>
                        );
                      })}
                    </div>
                  ) : null}

                  <input
                    type="text"
                    value={customAbsentText}
                    onChange={(e) => setCustomAbsentText(e.target.value)}
                    placeholder="Escribe otros nombres de bajas separados por comas..."
                    className="w-full p-2 rounded-xl border border-slate-200 text-xs mt-1"
                  />
                </div>
              )}

              {/* Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Notas / Indicaciones del Entrenador
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="ej. Llevar equipación oscura y blanca, llevar botiquín, ropa de calentamiento..."
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs shadow-md shadow-blue-600/20 cursor-pointer"
                >
                  Guardar Evento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Selected Event Detail Modal */}
      {selectedEvent && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className={`p-5 flex items-center justify-between text-white ${
              selectedEvent.type === 'training'
                ? 'bg-amber-600'
                : selectedEvent.type === 'friendly' || selectedEvent.leg === 'pretemporada'
                ? 'bg-purple-600'
                : selectedEvent.isHome
                ? 'bg-emerald-600'
                : 'bg-blue-600'
            }`}>
              <div className="space-y-1">
                <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded bg-white/20 tracking-wider">
                  {selectedEvent.type === 'training'
                    ? 'Entrenamiento 🏀'
                    : selectedEvent.type === 'friendly' || selectedEvent.leg === 'pretemporada'
                    ? 'Amistoso Pretemporada 🤝'
                    : selectedEvent.isHome
                    ? 'Partido Local 🏠'
                    : 'Partido Visitante ✈️'}
                </span>
                <h3 className="text-lg font-black leading-tight">
                  {selectedEvent.type === 'match' || selectedEvent.type === 'friendly' || selectedEvent.leg === 'pretemporada'
                    ? `vs ${selectedEvent.opponent || 'Rival'}`
                    : selectedEvent.title}
                </h3>
              </div>
              <button
                onClick={() => setSelectedEvent(null)}
                className="p-1.5 rounded-xl hover:bg-white/20 transition-colors cursor-pointer text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                <div>
                  <span className="text-slate-400 block font-bold">Fecha:</span>
                  <span className="font-extrabold text-slate-800">{selectedEvent.date}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-bold">Hora de Inicio:</span>
                  <span className="font-extrabold text-slate-800">{selectedEvent.startTime}</span>
                </div>
                {selectedEvent.arrivalTime && (
                  <div>
                    <span className="text-slate-400 block font-bold">Hora de Cita:</span>
                    <span className="font-extrabold text-slate-800">{selectedEvent.arrivalTime}</span>
                  </div>
                )}
                <div>
                  <span className="text-slate-400 block font-bold">Lugar:</span>
                  <span className="font-extrabold text-slate-800 truncate block">{selectedEvent.location}</span>
                </div>
              </div>

              {selectedEvent.absentPlayers && selectedEvent.absentPlayers.length > 0 && (
                <div className="p-3.5 rounded-xl bg-red-50 border border-red-100 space-y-1.5">
                  <span className="text-xs font-black uppercase text-red-700 flex items-center gap-1.5">
                    <ShieldAlert className="w-4 h-4 text-red-600" />
                    Jugadoras Bajas / Lesionadas ({selectedEvent.absentPlayers.length}):
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {selectedEvent.absentPlayers.map((p, idx) => (
                      <span key={idx} className="px-2 py-0.5 rounded-md bg-red-100 text-red-800 text-xs font-bold">
                        {p}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {selectedEvent.notes && (
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-xs font-bold text-slate-400 block mb-1">Notas del Entrenador:</span>
                  <p className="text-xs text-slate-700 italic">{selectedEvent.notes}</p>
                </div>
              )}

              <div className="pt-2 flex items-center justify-between gap-3">
                <button
                  onClick={() => setEventToDelete(selectedEvent)}
                  className="px-4 py-2.5 rounded-xl bg-red-100 hover:bg-red-200 text-red-700 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Eliminar Evento</span>
                </button>

                <button
                  onClick={() => setSelectedEvent(null)}
                  className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs cursor-pointer"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {eventToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-100 space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-lg font-black text-slate-900">¿Eliminar este evento?</h3>
              <p className="text-xs text-slate-600">
                Se eliminará permanentemente &quot;{eventToDelete.title || (eventToDelete.opponent ? `vs ${eventToDelete.opponent}` : 'Evento')}&quot; de tu calendario.
              </p>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEventToDelete(null)}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-extrabold cursor-pointer transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeleteEvent(eventToDelete.id);
                  if (selectedEvent?.id === eventToDelete.id) {
                    setSelectedEvent(null);
                  }
                  setEventToDelete(null);
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

function TrophyIcon(props: any) {
  return (
    <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 21h8m-4-4v4m0-11a5 5 0 005 5h1a3 3 0 003-3V6a2 2 0 00-2-2h-3a5 5 0 00-5 5zm0 0a5 5 0 01-5 5H3a3 3 0 01-3-3V6a2 2 0 012-2h3a5 5 0 015 5z" />
    </svg>
  );
}

function BasketballIcon(props: any) {
  return (
    <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <path d="M5.5 5.5l13 13M5.5 18.5l13-13M12 2v20M2 12h20" />
    </svg>
  );
}
