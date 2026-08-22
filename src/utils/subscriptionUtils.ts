import { UserProfile } from '../types';

export interface SubscriptionPeriodInfo {
  isPaid: boolean;
  planLabel: 'Anual' | 'Mensual' | 'Invitado / Prueba';
  daysTotal: number; // 360 for annual, 28 for monthly, 0 for guest
  daysRemaining: number;
  expirationDateStr: string;
  expiryDateObj: Date;
  isExpired: boolean;
}

/**
 * Parses a date string formatted as DD/MM/YYYY or YYYY-MM-DD or ISO string.
 */
export function parseRegistrationDate(dateStr?: string): Date {
  if (!dateStr) return new Date();

  const trimmed = dateStr.trim();
  if (trimmed.includes('/')) {
    const parts = trimmed.split('/');
    if (parts.length === 3) {
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const year = parseInt(parts[2], 10);
      const d = new Date(year, month, day);
      if (!isNaN(d.getTime())) return d;
    }
  }

  const parsed = new Date(trimmed);
  return isNaN(parsed.getTime()) ? new Date() : parsed;
}

/**
 * Calculates subscription period & remaining time according to rules:
 * - Paid Annual: 360 days from registration date.
 * - Paid Monthly: 28 days from registration date.
 * - Guest Mode (unpaid): 0 days (immediate cancellation).
 */
export function getSubscriptionPeriodInfo(profile: UserProfile | null): SubscriptionPeriodInfo {
  if (!profile) {
    return {
      isPaid: false,
      planLabel: 'Invitado / Prueba',
      daysTotal: 0,
      daysRemaining: 0,
      expirationDateStr: 'Inmediata (Al momento)',
      expiryDateObj: new Date(),
      isExpired: true,
    };
  }

  // A profile is paid if subscriptionStatus is active/canceling_end_of_period AND paymentMethod exists & != 'none'
  const isPaid =
    (profile.subscriptionStatus === 'active' || profile.subscriptionStatus === 'canceling_end_of_period') &&
    Boolean(profile.paymentMethod && profile.paymentMethod !== 'none') &&
    (profile.subscriptionStatus as string) !== 'trial';

  if (!isPaid) {
    return {
      isPaid: false,
      planLabel: 'Invitado / Prueba',
      daysTotal: 0,
      daysRemaining: 0,
      expirationDateStr: 'Inmediata (Al momento)',
      expiryDateObj: new Date(),
      isExpired: true,
    };
  }

  const isAnnual = profile.subscriptionPlan === 'annual';
  const daysTotal = isAnnual ? 360 : 28;
  const startDate = parseRegistrationDate(profile.registeredAt);

  const expiryDateObj = new Date(startDate.getTime() + daysTotal * 24 * 60 * 60 * 1000);
  const now = new Date();
  const diffTime = expiryDateObj.getTime() - now.getTime();
  const daysRemaining = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
  const isExpired = diffTime <= 0;

  const expirationDateStr = expiryDateObj.toLocaleDateString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  return {
    isPaid: true,
    planLabel: isAnnual ? 'Anual' : 'Mensual',
    daysTotal,
    daysRemaining,
    expirationDateStr,
    expiryDateObj,
    isExpired,
  };
}

/**
 * Generates and triggers a browser download for a JSON backup file containing
 * all user profile data, saved trainings, players, matches, philosophy, calendar events, and plays.
 */
export function downloadLibraryBackup(userProfile: UserProfile | null): boolean {
  try {
    const trainings = JSON.parse(localStorage.getItem('coachmind_trainings') || '[]');
    const players = JSON.parse(localStorage.getItem('coachmind_players') || '[]');
    const matches = JSON.parse(localStorage.getItem('coachmind_matches') || '[]');
    const philosophy = JSON.parse(localStorage.getItem('coachmind_philosophy') || 'null');
    const calendarEvents = JSON.parse(localStorage.getItem('coachmind_calendar_events') || '[]');
    const savedPlays = JSON.parse(localStorage.getItem('coach_saved_plays') || '[]');

    const backupData = {
      nombreApp: 'CoachMind Baloncesto',
      fechaRespaldo: new Date().toLocaleDateString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
      perfilEntrenador: userProfile,
      entrenamientosGuardados: trainings,
      plantillaJugadores: players,
      partidosYAnalisis: matches,
      filosofiaEntrenador: philosophy,
      eventosCalendario: calendarEvents,
      jugadasPizarraTactica: savedPlays,
    };

    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(backupData, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    const dateStr = new Date().toISOString().split('T')[0];
    const coachName = userProfile ? `${userProfile.firstName}_${userProfile.lastName}`.replace(/\s+/g, '_') : 'Entrenador';
    downloadAnchor.setAttribute('download', `CoachMind_Biblioteca_${coachName}_${dateStr}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    return true;
  } catch (err) {
    console.error('Error al descargar la biblioteca:', err);
    return false;
  }
}
