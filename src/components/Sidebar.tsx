import React from 'react';
import {
  LayoutDashboard,
  CalendarDays,
  Compass,
  Calendar,
  BarChart3,
  Video,
  ClipboardList,
  Users,
  Brain,
  Settings,
  Dumbbell,
  Sparkles,
  Share2,
  Check,
  X,
  MessageSquare,
  Award,
  Activity,
} from 'lucide-react';
import { ViewMode, UserProfile } from '../types';

interface SidebarProps {
  currentView: ViewMode;
  onNavigate: (view: ViewMode) => void;
  savedTrainingsCount?: number;
  playersCount?: number;
  isMobileOpen?: boolean;
  onMobileClose?: () => void;
  userProfile?: UserProfile | null;
  onOpenRegisterModal?: () => void;
  onOpenWhatsAppInterview?: () => void;
  authUser?: any;
  onSignOut?: () => void;
  onClearProfile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  onNavigate,
  savedTrainingsCount = 0,
  playersCount = 0,
  isMobileOpen = false,
  onMobileClose,
  userProfile,
  onOpenRegisterModal,
  onOpenWhatsAppInterview,
  authUser,
  onSignOut,
  onClearProfile,
}) => {
  const [copiedCleanLink, setCopiedCleanLink] = React.useState(false);

  const handleCopyCleanLink = () => {
    const cleanUrl = `${window.location.origin}/?clean=true`;
    navigator.clipboard.writeText(cleanUrl);
    setCopiedCleanLink(true);
    setTimeout(() => setCopiedCleanLink(false), 3000);
  };

  const navItems = [
    {
      id: 'dashboard' as ViewMode,
      label: 'Dashboard',
      icon: LayoutDashboard,
    },
    {
      id: 'coach' as ViewMode,
      label: 'Entrenador',
      icon: Award,
    },
    {
      id: 'calendar' as ViewMode,
      label: 'Calendario',
      icon: CalendarDays,
    },
    {
      id: 'philosophy' as ViewMode,
      label: 'Filosofía del Entrenador',
      icon: Compass,
    },
    {
      id: 'players' as ViewMode,
      label: 'Jugadores',
      icon: Users,
      badge: playersCount > 0 ? `${playersCount}` : undefined,
    },
    {
      id: 'trainings' as ViewMode,
      label: 'Entrenamientos',
      icon: Calendar,
      badge: savedTrainingsCount > 0 ? savedTrainingsCount : undefined,
    },
    {
      id: 'stats' as ViewMode,
      label: 'Estadísticas',
      icon: BarChart3,
    },
    {
      id: 'match-analysis' as ViewMode,
      label: 'Análisis de Partido',
      icon: Video,
    },
    {
      id: 'match-management' as ViewMode,
      label: 'Gestión del Partido',
      icon: Activity,
      highlight: true,
    },
    {
      id: 'whiteboard' as ViewMode,
      label: 'Pizarra',
      icon: ClipboardList,
    },
    {
      id: 'coach-ai' as ViewMode,
      label: 'IA Entrenadora',
      icon: Brain,
      highlight: true,
    },
    {
      id: 'settings' as ViewMode,
      label: 'Configuración',
      icon: Settings,
    },
  ];

  const handleItemClick = (id: ViewMode) => {
    onNavigate(id);
    if (onMobileClose) {
      onMobileClose();
    }
  };

  const sidebarContent = (
    <div className="flex flex-col h-full bg-[#0B132B] text-slate-200 select-none">
      {/* Brand Header */}
      <div
        onClick={() => handleItemClick('dashboard')}
        data-allow-nav="true"
        className="p-4 sm:p-5 flex items-center justify-between border-b border-slate-800/80 cursor-pointer hover:bg-slate-800/40 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-600 to-orange-500 flex items-center justify-center shadow-lg shadow-orange-500/20 text-white font-bold shrink-0">
            <Dumbbell className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="font-extrabold text-lg text-white tracking-tight">CoachMind</h1>
            </div>
            <p className="text-[10px] font-semibold tracking-wider text-slate-400 uppercase">
              BASKETBALL
            </p>
          </div>
        </div>

        {/* Mobile Close Button */}
        {onMobileClose && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onMobileClose();
            }}
            className="md:hidden p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            aria-label="Cerrar menú"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Navigation List */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto custom-scrollbar">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;

          return (
            <button
              key={item.id}
              onClick={() => handleItemClick(item.id)}
              className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl font-medium text-sm transition-all duration-200 group cursor-pointer ${
                isActive
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30 font-semibold'
                  : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon
                  className={`w-5 h-5 transition-transform duration-200 group-hover:scale-105 ${
                    isActive ? 'text-white' : 'text-slate-400 group-hover:text-white'
                  }`}
                />
                <span>{item.label}</span>
              </div>

              {item.badge !== undefined && (
                <span
                  className={`px-2 py-0.5 text-xs font-bold rounded-full ${
                    isActive
                      ? 'bg-blue-700 text-white'
                      : 'bg-slate-800 text-slate-300 group-hover:bg-slate-700'
                  }`}
                >
                  {item.badge}
                </span>
              )}

              {item.highlight && !isActive && (
                <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer Account / Modo Invitado Panel */}
      <div className="p-3.5 m-3 rounded-xl bg-slate-900/90 border border-slate-800/80 space-y-2">
        {authUser || userProfile ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-wider font-extrabold text-emerald-400 flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shadow-sm shadow-emerald-400/50" />
                Registrado
              </span>
            </div>

            <button
              type="button"
              onClick={onOpenRegisterModal}
              className="w-full py-2 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black transition-all cursor-pointer shadow-md shadow-emerald-500/20 flex items-center justify-center gap-2 text-center"
            >
              <Check className="w-4 h-4 text-slate-950 stroke-[3]" />
              <span className="truncate">
                {userProfile ? `${userProfile.firstName} ${userProfile.lastName}` : 'Licencia Activa'}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                if (onSignOut) onSignOut();
                if (onClearProfile) onClearProfile();
              }}
              className="w-full py-1.5 px-2.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-300 text-[11px] font-bold border border-red-500/30 flex items-center justify-center gap-1.5 transition-all cursor-pointer text-center"
            >
              <X className="w-3.5 h-3.5 text-red-400 shrink-0" />
              <span>Cerrar Sesión</span>
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-wider font-extrabold text-amber-400 flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse shadow-sm shadow-amber-500/50" />
                Modo Invitado
              </span>
            </div>

            <button
              type="button"
              onClick={onOpenRegisterModal}
              className="w-full py-2 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black transition-all cursor-pointer shadow-md shadow-amber-500/20 flex items-center justify-center gap-2 text-center"
            >
              <span className="w-2 h-2 rounded-full bg-slate-950" />
              <span>Modo Invitado Activo</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sticky Sidebar (hidden on mobile) */}
      <aside data-sidebar="true" data-allow-nav="true" className="hidden md:flex w-64 shrink-0 h-screen sticky top-0 border-r border-slate-800/80 shadow-xl z-30">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer Overlay */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm transition-opacity"
            onClick={onMobileClose}
          />
          {/* Slide-over panel */}
          <div data-sidebar="true" data-allow-nav="true" className="relative w-72 max-w-[80vw] bg-[#0B132B] h-full shadow-2xl z-10 flex flex-col">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};

