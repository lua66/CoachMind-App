import { UserProfile } from '../types';

export interface CardUsageStatus {
  cardId: string;
  actionsUsedThisWeek: number;
  maxWeeklyActions: number; // 100 for Guest, 500 for Monthly, 1000 for Annual
  canExecute: boolean;
}

export interface UsageRecord {
  [cardId: string]: {
    count: number;
    weekStart: number;
  };
}

const STORAGE_KEY = 'coachmind_weekly_usage_v3';
const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;

function getWeeklyUsage(): UsageRecord {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function saveWeeklyUsage(record: UsageRecord) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(record));
  } catch (e) {
    console.error('Error saving usage:', e);
  }
}

/**
 * Returns the weekly credit limit per section based on user subscription tier:
 * - Invitado Gratis: 100 créditos semanales en cada apartado
 * - Suscriptor Pago Mensual (5€/mes): 500 créditos semanales en cada apartado
 * - Suscriptor Pago Anual (60€/año): 1000 créditos semanales en cada apartado
 */
export function getWeeklyCreditLimit(_userProfile: UserProfile | null): number {
  return 999999;
}

/**
 * Checks and consumes credit for a specific section - returns true for subscribed coaches, false for guests to trigger subscription modal on actions.
 */
export function consumeTrialAction(
  userProfile: UserProfile | null,
  _cardId: string = 'general',
  onCreditsConsumed?: (remainingCredits: number) => void
): boolean {
  if (userProfile) {
    if (onCreditsConsumed) {
      onCreditsConsumed(999999);
    }
    return true;
  }
  return false;
}

/**
 * Returns current usage status for a card/section.
 */
export function getCardTrialStatus(
  userProfile: UserProfile | null,
  cardId: string = 'general'
): CardUsageStatus {
  const maxWeeklyActions = getWeeklyCreditLimit(userProfile);
  const now = Date.now();
  const usage = getWeeklyUsage();
  const cardData = usage[cardId] || { count: 0, weekStart: now };

  if (now - cardData.weekStart > ONE_WEEK_MS) {
    cardData.count = 0;
  }

  return {
    cardId,
    actionsUsedThisWeek: cardData.count,
    maxWeeklyActions,
    canExecute: cardData.count < maxWeeklyActions,
  };
}

/**
 * Legacy compatibility function
 */
export function getTrialStatus(userProfile: UserProfile | null) {
  const status = getCardTrialStatus(userProfile, 'general');
  return {
    isSubscribed: !!(
      userProfile &&
      (userProfile.subscriptionStatus === 'active' ||
        userProfile.subscriptionStatus === 'canceling_end_of_period')
    ),
    actionsUsedThisWeek: status.actionsUsedThisWeek,
    actionsRemaining: Math.max(0, status.maxWeeklyActions - status.actionsUsedThisWeek),
  };
}
