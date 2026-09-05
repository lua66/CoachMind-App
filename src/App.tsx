import React, { useState, useEffect, useRef } from 'react';
import { Menu, Dumbbell, MessageSquare } from 'lucide-react';
import { ViewMode, SavedTraining, Player, MatchRecord, UserProfile, CalendarEvent, CoachPhilosophy } from './types';

import { Sidebar } from './components/Sidebar';
import { DashboardView } from './components/DashboardView';
import { CoachView } from './components/CoachView';
import { CalendarView } from './components/CalendarView';
import { PhilosophyView } from './components/PhilosophyView';
import { TrainingsView } from './components/TrainingsView';
import { CreateTrainingView } from './components/CreateTrainingView';
import { StatsView } from './components/StatsView';
import { MatchAnalysisView } from './components/MatchAnalysisView';
import { MatchManagementView } from './components/MatchManagementView';
import { LiveMatchView } from './components/LiveMatchView';
import { WhiteboardView } from './components/WhiteboardView';
import { PlayersView } from './components/PlayersView';
import { CoachAiView } from './components/CoachAiView';
import { SettingsView } from './components/SettingsView';
import { RegistrationModal } from './components/RegistrationModal';
import { TrialLimitModal } from './components/TrialLimitModal';
import { ExitLikeModal } from './components/ExitLikeModal';
import { WhatsAppInterviewModal } from './components/WhatsAppInterviewModal';
import { consumeTrialAction } from './utils/trialManager';
import { INITIAL_PLAYERS } from './data/initialData';
import { auth, onAuthStateChanged, signOut, User } from './lib/firebase';
import {
  subscribeToCoachData,
  saveCoachProfileToFirestore,
  savePhilosophyToFirestore,
  deletePhilosophyFromFirestore,
  savePlayersToFirestore,
  saveTrainingsToFirestore,
  saveCalendarToFirestore,
  saveMatchesToFirestore,
} from './lib/firebaseSync';

export default function App() {
  const [currentView, setCurrentView] = useState<ViewMode>('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isRegistrationModalOpen, setIsRegistrationModalOpen] = useState(false);
  const [isTrialModalOpen, setIsTrialModalOpen] = useState(false);
  const [trialModalMode, setTrialModalMode] = useState<'general_action' | 'ficha_entrenador'>('general_action');
  const [isExitLikeModalOpen, setIsExitLikeModalOpen] = useState(false);
  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false);
  const [authUser, setAuthUser] = useState<User | null>(null);

  // Exit-Intent Mouse Listener ("no te vayas sin dejar tu like")
  useEffect(() => {
    const handleMouseLeave = (e: MouseEvent) => {
      // Trigger strictly when the cursor leaves the document viewport (top or bottom edge)
      const isLeavingTop = e.clientY <= 0;
      const isLeavingBottom = e.clientY >= window.innerHeight;
      const isLeavingLeftOrRight = e.clientX <= 0 || e.clientX >= window.innerWidth;

      if (!e.relatedTarget && (isLeavingTop || isLeavingBottom || isLeavingLeftOrRight)) {
        const hasShownInSession = sessionStorage.getItem('coachmind_exit_like_shown');
        if (!hasShownInSession) {
          setIsExitLikeModalOpen(true);
          sessionStorage.setItem('coachmind_exit_like_shown', 'true');
        }
      }
    };

    document.documentElement.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      document.documentElement.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, []);

  // Auto cleanup on initial publication launch & Clean Shareable URL Handler (?clean=true or ?register=true)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const isCleanRequested = params.has('clean') || params.has('guest') || params.has('register') || params.has('new');

    if (isCleanRequested) {
      localStorage.removeItem('coachmind_user_profile');
      setUserProfile(null);
      setIsRegistrationModalOpen(true);
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    const hasCleaned = localStorage.getItem('coachmind_cleaned_launch_v9');
    if (!hasCleaned && !isCleanRequested) {
      localStorage.removeItem('coachmind_user_profile');
      localStorage.removeItem('coachmind_calendar_events');
      localStorage.removeItem('coachmind_philosophy');
      localStorage.removeItem('coachmind_trainings');
      localStorage.removeItem('coachmind_players');
      localStorage.removeItem('coachmind_matches');
      localStorage.removeItem('coach_saved_plays');
      localStorage.removeItem('coachmind_google_sheet_records');
      localStorage.removeItem('coachmind_ai_library');
      localStorage.removeItem('coachmind_app_reviews');
      localStorage.removeItem('coachmind_trial_action_count');
      localStorage.removeItem('coachmind_trial_action_timestamp');
      localStorage.removeItem('coachmind_guest_weekly_usage_v2');
      localStorage.setItem('coachmind_cleaned_launch_v9', 'true');

      setUserProfile(null);
      setCalendarEvents([]);
      setCoachPhilosophy(null);
      setTrainings([]);
      setPlayers([]);
      setMatches([]);
    }
  }, []);

  // Firebase Auth Listener & Firestore Sync
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setAuthUser(user);
      if (user) {
        // Sync user and fetch data from Cloud SQL
        user.getIdToken().then(async (token) => {
          try {
            await fetch('/api/auth/sync', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
              },
            });

            // Sync players from Cloud SQL
            const pRes = await fetch('/api/db/players', {
              headers: { 'Authorization': `Bearer ${token}` },
            });
            const pData = await pRes.json();
            if (pData.success && Array.isArray(pData.players) && pData.players.length > 0) {
              setPlayers(pData.players);
              localStorage.setItem('coachmind_players', JSON.stringify(pData.players));
            }

            // Sync philosophy from Cloud SQL
            const philRes = await fetch('/api/db/philosophy', {
              headers: { 'Authorization': `Bearer ${token}` },
            });
            const philData = await philRes.json();
            if (philData.success && philData.philosophy) {
              setCoachPhilosophy(philData.philosophy);
              localStorage.setItem('coachmind_philosophy', JSON.stringify(philData.philosophy));
            }
          } catch (err) {
            console.warn('Cloud SQL sync notification:', err);
          }
        });

        // Subscribe to Firestore data for logged in coach
        const unsubscribeFirestore = subscribeToCoachData(user.uid, {
          onProfileLoaded: (prof) => {
            if (prof) {
              setUserProfile(prof);
              localStorage.setItem('coachmind_user_profile', JSON.stringify(prof));
            }
          },
          onPhilosophyLoaded: (philo) => {
            if (philo) {
              setCoachPhilosophy(philo);
              localStorage.setItem('coachmind_philosophy', JSON.stringify(philo));
            }
          },
          onPlayersLoaded: (pls) => {
            setPlayers(pls);
            localStorage.setItem('coachmind_players', JSON.stringify(pls));
          },
          onTrainingsLoaded: (trns) => {
            setTrainings(trns);
            localStorage.setItem('coachmind_trainings', JSON.stringify(trns));
          },
          onCalendarLoaded: (evs) => {
            setCalendarEvents(evs);
            localStorage.setItem('coachmind_calendar_events', JSON.stringify(evs));
          },
          onMatchesLoaded: (mts) => {
            setMatches(mts);
            localStorage.setItem('coachmind_matches', JSON.stringify(mts));
          },
        });

        return () => {
          unsubscribeFirestore();
        };
      }
    });

    return () => {
      unsubscribeAuth();
    };
  }, []);

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      setAuthUser(null);
      setUserProfile(null);
      setTrainings([]);
      setPlayers([]);
      setMatches([]);
      setCalendarEvents([]);
      setCoachPhilosophy(null);
      localStorage.removeItem('coachmind_user_profile');
      localStorage.removeItem('coachmind_calendar_events');
      localStorage.removeItem('coachmind_philosophy');
      localStorage.removeItem('coachmind_trainings');
      localStorage.removeItem('coachmind_players');
      localStorage.removeItem('coachmind_matches');
    } catch (err) {
      console.error('Sign out error:', err);
    }
  };

  const handleOpenTrialModal = (mode: 'general_action' | 'ficha_entrenador' = 'general_action') => {
    setTrialModalMode(mode);
    setIsRegistrationModalOpen(true);
  };

  const handleCheckAndRunTrialAction = (actionCallback: () => void) => {
    if (consumeTrialAction(userProfile)) {
      actionCallback();
    } else {
      handleOpenTrialModal('general_action');
    }
  };

  // User Profile
  const [userProfile, setUserProfile] = useState<UserProfile | null>(() => {
    const local = localStorage.getItem('coachmind_user_profile');
    return local ? JSON.parse(local) : null;
  });

  // Require registration form when clicking ANY button if user is not registered
  useEffect(() => {
    if (userProfile) return;

    const handleGlobalButtonClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;

      // Allow clicks inside Registration Modal, Exit Like Modal, Photo Selector, or any Interactive Board/Canvas
      const isExempt = target.closest(
        '[data-registration-modal="true"], [data-exit-like-modal="true"], #coach-photo-selector-container, #coach-camera-modal, [data-allow-action="true"], [data-board="true"], [data-interactive="true"], svg, .whiteboard-view, .tactical-board'
      );
      if (isExempt) return;

      // Allow clicks inside Sidebar or elements explicitly marked with data-allow-nav="true" or data-sidebar="true"
      const insideSidebar = target.closest('aside, [data-sidebar="true"], [data-allow-nav="true"]');
      if (insideSidebar) return;

      // Check if target is a button, link, or interactive element
      const buttonTarget = target.closest('button, [role="button"], a, input[type="button"], input[type="submit"]');
      if (!buttonTarget) return;

      // Also check if button itself is an interactive board/tool/playback control
      const isBoardOrToolControl =
        buttonTarget.closest('[data-allow-action="true"], [data-board="true"]') ||
        buttonTarget.getAttribute('data-allow-action') === 'true' ||
        buttonTarget.getAttribute('data-tool') !== null;
      if (isBoardOrToolControl) return;

      // Extract text content and attributes to identify Back / Return / Dashboard navigation
      const text = (buttonTarget.textContent || '').toLowerCase().trim();
      const ariaLabel = (buttonTarget.getAttribute('aria-label') || '').toLowerCase();
      const title = (buttonTarget.getAttribute('title') || '').toLowerCase();

      const isNavOrBack =
        text.includes('dashboard') ||
        text.includes('inicio') ||
        text.includes('volver') ||
        text.includes('atrás') ||
        text.includes('atras') ||
        text.includes('regresar') ||
        text.includes('panel') ||
        text.includes('coachmind') ||
        ariaLabel.includes('dashboard') ||
        ariaLabel.includes('volver') ||
        ariaLabel.includes('cerrar') ||
        title.includes('dashboard') ||
        title.includes('volver') ||
        buttonTarget.getAttribute('data-allow-nav') === 'true';

      // If it's a navigation or back button (like returning to Dashboard), ALLOW it!
      if (isNavOrBack) {
        if (
          text.includes('dashboard') ||
          text.includes('inicio') ||
          text.includes('coachmind') ||
          text.includes('volver al panel') ||
          ariaLabel.includes('dashboard')
        ) {
          setCurrentView('dashboard');
        }
        return; // Do NOT block or open modal
      }

      // Intercept functional action buttons inside views (e.g. creating, editing, AI tools) to request registration
      e.preventDefault();
      e.stopPropagation();
      setIsRegistrationModalOpen(true);
    };

    window.addEventListener('click', handleGlobalButtonClick, true);
    return () => {
      window.removeEventListener('click', handleGlobalButtonClick, true);
    };
  }, [userProfile]);

  // Calendar Events State
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>(() => {
    const local = localStorage.getItem('coachmind_calendar_events');
    if (!local) return [];
    try {
      const parsed = JSON.parse(local);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });

  // Coach Philosophy State
  const [coachPhilosophy, setCoachPhilosophy] = useState<CoachPhilosophy | null>(() => {
    const local = localStorage.getItem('coachmind_philosophy');
    if (!local) return null;
    try {
      return JSON.parse(local);
    } catch {
      return null;
    }
  });

  // Clean initial state for every coach
  const [trainings, setTrainings] = useState<SavedTraining[]>(() => {
    const local = localStorage.getItem('coachmind_trainings');
    if (!local) return [];
    try {
      const parsed = JSON.parse(local);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });

  const [players, setPlayers] = useState<Player[]>(() => {
    const local = localStorage.getItem('coachmind_players');
    if (!local) return [];
    try {
      const parsed = JSON.parse(local);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });

  const [matches, setMatches] = useState<MatchRecord[]>(() => {
    const local = localStorage.getItem('coachmind_matches');
    if (!local) return [];
    try {
      const parsed = JSON.parse(local);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });

  const [quickAiQuestion, setQuickAiQuestion] = useState<string | undefined>(
    undefined
  );

  useEffect(() => {
    localStorage.setItem('coachmind_calendar_events', JSON.stringify(calendarEvents));
    if (authUser) {
      saveCalendarToFirestore(authUser.uid, calendarEvents);
    }
  }, [calendarEvents, authUser]);

  useEffect(() => {
    if (coachPhilosophy) {
      localStorage.setItem('coachmind_philosophy', JSON.stringify(coachPhilosophy));
      if (authUser) {
        savePhilosophyToFirestore(authUser.uid, coachPhilosophy);
        authUser.getIdToken().then((token) => {
          fetch('/api/db/philosophy', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(coachPhilosophy),
          }).catch(err => console.warn('Cloud SQL philosophy save error:', err));
        });
      }
    } else {
      localStorage.removeItem('coachmind_philosophy');
      if (authUser) {
        deletePhilosophyFromFirestore(authUser.uid);
      }
    }
  }, [coachPhilosophy, authUser]);

  useEffect(() => {
    localStorage.setItem('coachmind_trainings', JSON.stringify(trainings));
    if (authUser) {
      saveTrainingsToFirestore(authUser.uid, trainings);
    }
  }, [trainings, authUser]);

  useEffect(() => {
    localStorage.setItem('coachmind_players', JSON.stringify(players));
    if (authUser) {
      savePlayersToFirestore(authUser.uid, players);
      authUser.getIdToken().then((token) => {
        fetch('/api/db/players/sync', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ players }),
        }).catch(err => console.warn('Cloud SQL players sync error:', err));
      });
    }
  }, [players, authUser]);

  useEffect(() => {
    localStorage.setItem('coachmind_matches', JSON.stringify(matches));
    if (authUser) {
      saveMatchesToFirestore(authUser.uid, matches);
    }
  }, [matches, authUser]);

  const handleUpdateProfile = (updated: UserProfile | null) => {
    setUserProfile(updated);
    if (updated) {
      localStorage.setItem('coachmind_user_profile', JSON.stringify(updated));
    } else {
      localStorage.removeItem('coachmind_user_profile');
    }
  };

  const handleAddCalendarEvent = (newEvent: CalendarEvent) => {
    handleCheckAndRunTrialAction(() => {
      setCalendarEvents((prev) => [newEvent, ...prev]);
    });
  };

  const handleUpdateCalendarEvent = (updatedEvent: CalendarEvent) => {
    setCalendarEvents((prev) =>
      prev.map((ev) => (ev.id === updatedEvent.id ? updatedEvent : ev))
    );
  };

  const handleDeleteCalendarEvent = (id: string) => {
    setCalendarEvents((prev) => prev.filter((ev) => ev.id !== id));
  };

  const handleSavePhilosophy = (updated: CoachPhilosophy) => {
    const isAllEmpty = !updated.playStyle?.trim() && !updated.offensiveFocus?.trim() && !updated.defensiveFocus?.trim() && !updated.trainingGoals?.trim() && !updated.matchGoals?.trim() && !updated.coreValues?.trim() && !updated.additionalNotes?.trim();
    if (isAllEmpty) {
      handleDeletePhilosophy();
      return;
    }
    handleCheckAndRunTrialAction(() => {
      setCoachPhilosophy(updated);
    });
  };

  const handleDeletePhilosophy = () => {
    setCoachPhilosophy(null);
    localStorage.removeItem('coachmind_philosophy');
    if (authUser) {
      deletePhilosophyFromFirestore(authUser.uid);
    }
  };

  // Handlers
  const handleSaveTraining = (newTraining: SavedTraining) => {
    handleCheckAndRunTrialAction(() => {
      setTrainings((prev) => [newTraining, ...prev]);
    });
  };

  const handleDeleteTraining = (id: string) => {
    setTrainings((prev) => prev.filter((t) => t.id !== id));
  };

  const handleAddPlayer = (newPlayer: Player) => {
    handleCheckAndRunTrialAction(() => {
      setPlayers((prev) => [...prev, newPlayer]);
    });
  };

  const handleDeletePlayer = (id: string) => {
    setPlayers((prev) => prev.filter((p) => p.id !== id));
  };

  const handleUpdatePlayerStats = (updated: Player) => {
    setPlayers((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
  };

  const handleAddMatch = (newMatch: MatchRecord) => {
    handleCheckAndRunTrialAction(() => {
      setMatches((prev) => [newMatch, ...prev]);
    });
  };

  const handleDeleteMatch = (id: string) => {
    setMatches((prev) => prev.filter((m) => m.id !== id));
  };

  const handleClearMatches = () => {
    setMatches([]);
    localStorage.removeItem('coachmind_matches');
  };

  const handleUpdateMatches = (newMatches: MatchRecord[]) => {
    setMatches(newMatches);
    localStorage.setItem('coachmind_matches', JSON.stringify(newMatches));
  };

  const handleQuickAskAi = (question: string) => {
    handleCheckAndRunTrialAction(() => {
      setQuickAiQuestion(question);
    });
  };

  const handleClearProfile = () => {
    localStorage.removeItem('coachmind_user_profile');
    setUserProfile(null);
  };

  const handleClearAllData = () => {
    localStorage.removeItem('coachmind_trainings');
    localStorage.removeItem('coachmind_players');
    localStorage.removeItem('coachmind_matches');
    localStorage.removeItem('coachmind_user_profile');
    localStorage.removeItem('coach_saved_plays');
    localStorage.removeItem('coachmind_calendar_events');
    localStorage.removeItem('coachmind_philosophy');
    localStorage.removeItem('coachmind_ai_library');
    localStorage.removeItem('coachmind_app_reviews');
    localStorage.removeItem('coachmind_trial_action_count');
    localStorage.removeItem('coachmind_trial_action_timestamp');
    setTrainings([]);
    setPlayers([]);
    setMatches([]);
    setCalendarEvents([]);
    setCoachPhilosophy(null);
    setUserProfile(null);
  };

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-[#F8FAFC] text-slate-800 font-sans antialiased">
      {/* Mobile Header Bar */}
      <header className="md:hidden sticky top-0 z-20 bg-[#0B132B] text-white p-3.5 flex items-center justify-between border-b border-slate-800 shadow-md">
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setIsMobileMenuOpen(true)}
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-white transition-colors cursor-pointer"
            aria-label="Abrir menú de navegación"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-amber-600 to-orange-500 flex items-center justify-center text-white font-bold shrink-0">
              <Dumbbell className="w-4 h-4" />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="font-black text-base tracking-tight">CoachMind</span>
              <span className="px-1.5 py-0.5 rounded bg-amber-500/20 border border-amber-500/30 text-amber-400 text-[9px] font-black tracking-wide">
                Beta-v1
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Temporada 2026</span>
        </div>
      </header>

      {/* Navigation Sidebar */}
      <Sidebar
        currentView={currentView}
        onNavigate={setCurrentView}
        savedTrainingsCount={trainings.length}
        playersCount={players.length}
        isMobileOpen={isMobileMenuOpen}
        onMobileClose={() => setIsMobileMenuOpen(false)}
        userProfile={userProfile}
        onOpenRegisterModal={() => setIsRegistrationModalOpen(true)}
        authUser={authUser}
        onSignOut={handleSignOut}
        onClearProfile={handleClearProfile}
      />

      {/* Main Content Workspace Area */}
      <main className="flex-1 min-w-0 p-3 sm:p-6 md:p-8 overflow-y-auto">
        {currentView === 'dashboard' && (
          <DashboardView
            onNavigate={setCurrentView}
            trainings={trainings}
            players={players}
            matches={matches}
            calendarEvents={calendarEvents}
            coachPhilosophy={coachPhilosophy}
            onQuickAskAi={handleQuickAskAi}
            userProfile={userProfile}
            onUpdateProfile={handleUpdateProfile}
            onDeleteMatch={handleDeleteMatch}
            onClearMatches={handleClearMatches}
            onUpdateMatches={handleUpdateMatches}
            onOpenRegisterModal={() => setIsRegistrationModalOpen(true)}
            onOpenFichaLockModal={() => handleOpenTrialModal('ficha_entrenador')}
            onClearProfile={handleClearProfile}
          />
        )}

        {currentView === 'coach' && (
          <CoachView
            onNavigate={setCurrentView}
            trainings={trainings}
            players={players}
            matches={matches}
            calendarEvents={calendarEvents}
            coachPhilosophy={coachPhilosophy}
            userProfile={userProfile}
            onUpdateProfile={handleUpdateProfile}
            onDeleteMatch={handleDeleteMatch}
            onClearMatches={handleClearMatches}
            onUpdateMatches={handleUpdateMatches}
            onOpenRegisterModal={() => setIsRegistrationModalOpen(true)}
            onOpenFichaLockModal={() => handleOpenTrialModal('ficha_entrenador')}
            onClearProfile={handleClearProfile}
          />
        )}

        {currentView === 'calendar' && (
          <CalendarView
            events={calendarEvents}
            onAddEvent={handleAddCalendarEvent}
            onUpdateEvent={handleUpdateCalendarEvent}
            onDeleteEvent={handleDeleteCalendarEvent}
            players={players}
            userProfile={userProfile}
            onOpenTrialModal={handleOpenTrialModal}
          />
        )}

        {currentView === 'philosophy' && (
          <PhilosophyView
            philosophy={coachPhilosophy}
            onSavePhilosophy={handleSavePhilosophy}
            userProfile={userProfile}
            onOpenTrialModal={handleOpenTrialModal}
            players={players}
          />
        )}

        {currentView === 'trainings' && (
          <TrainingsView
            trainings={trainings}
            onNavigate={setCurrentView}
            onDeleteTraining={handleDeleteTraining}
            userProfile={userProfile}
            onOpenTrialModal={handleOpenTrialModal}
          />
        )}

        {currentView === 'create-training' && (
          <CreateTrainingView
            onSaveTraining={handleSaveTraining}
            onNavigate={setCurrentView}
            userProfile={userProfile}
            onOpenTrialModal={handleOpenTrialModal}
          />
        )}

        {currentView === 'stats' && (
          <StatsView
            players={players}
            onAddPlayer={handleAddPlayer}
            onDeletePlayer={handleDeletePlayer}
            onUpdatePlayerStats={handleUpdatePlayerStats}
            userProfile={userProfile}
            onOpenTrialModal={handleOpenTrialModal}
          />
        )}

        {currentView === 'match-analysis' && (
          <MatchAnalysisView
            matches={matches}
            players={players}
            onAddMatch={handleAddMatch}
            onDeleteMatch={handleDeleteMatch}
            onClearMatches={handleClearMatches}
            userProfile={userProfile}
            onNavigate={setCurrentView}
            onOpenTrialModal={handleOpenTrialModal}
          />
        )}

        {currentView === 'match-management' && (
          <MatchManagementView />
        )}

        {currentView === 'live-match' && (
          <LiveMatchView
            players={players}
            userProfile={userProfile}
            onNavigate={setCurrentView}
          />
        )}

        {currentView === 'whiteboard' && (
          <WhiteboardView
            userProfile={userProfile}
            onOpenTrialModal={handleOpenTrialModal}
          />
        )}

        {currentView === 'players' && (
          <PlayersView
            players={players}
            calendarEvents={calendarEvents}
            onAddPlayer={handleAddPlayer}
            onDeletePlayer={handleDeletePlayer}
            onUpdatePlayer={handleUpdatePlayerStats}
            onUpdateCalendarEvent={handleUpdateCalendarEvent}
            onNavigateToStats={() => setCurrentView('stats')}
            onNavigateToCalendar={() => setCurrentView('calendar')}
            userProfile={userProfile}
            onOpenTrialModal={handleOpenTrialModal}
          />
        )}

        {currentView === 'coach-ai' && (
          <CoachAiView
            initialQuestion={quickAiQuestion}
            onClearInitialQuestion={() => setQuickAiQuestion(undefined)}
            userProfile={userProfile}
            players={players}
            onOpenTrialModal={handleOpenTrialModal}
          />
        )}

        {currentView === 'settings' && (
          <SettingsView
            userProfile={userProfile}
            onUpdateProfile={handleUpdateProfile}
            onClearAllData={handleClearAllData}
            onOpenRegisterModal={() => setIsRegistrationModalOpen(true)}
            onOpenFichaLockModal={() => handleOpenTrialModal('ficha_entrenador')}
            onOpenWhatsAppInterview={() => setIsWhatsAppModalOpen(true)}
          />
        )}
      </main>

      <RegistrationModal
        isOpen={isRegistrationModalOpen}
        userProfile={userProfile}
        onClose={() => setIsRegistrationModalOpen(false)}
        onRegister={(profile) => {
          handleUpdateProfile(profile);
          setIsRegistrationModalOpen(false);
        }}
      />

      <TrialLimitModal
        isOpen={isTrialModalOpen}
        onClose={() => setIsTrialModalOpen(false)}
        onOpenRegisterModal={() => setIsRegistrationModalOpen(true)}
        mode={trialModalMode}
      />

      <ExitLikeModal
        isOpen={isExitLikeModalOpen}
        onClose={() => setIsExitLikeModalOpen(false)}
        userProfile={userProfile}
        onReviewSubmitted={() => {
          // Trigger a custom event to notify components that reviews updated
          window.dispatchEvent(new Event('coachmind_reviews_updated'));
        }}
      />

      <WhatsAppInterviewModal
        isOpen={isWhatsAppModalOpen}
        onClose={() => setIsWhatsAppModalOpen(false)}
        userProfile={userProfile}
      />
    </div>
  );
}
