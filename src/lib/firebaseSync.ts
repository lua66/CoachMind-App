import { 
  UserProfile, 
  CoachPhilosophy, 
  Player, 
  SavedTraining, 
  CalendarEvent, 
  MatchRecord 
} from '../types';

export async function saveCoachProfileToFirestore(_uid: string, _profile: UserProfile) {}
export async function savePhilosophyToFirestore(_uid: string, _philosophy: CoachPhilosophy) {}
export async function deletePhilosophyFromFirestore(_uid: string) {}
export async function savePlayersToFirestore(_uid: string, _players: Player[]) {}
export async function saveTrainingsToFirestore(_uid: string, _trainings: SavedTraining[]) {}
export async function saveCalendarToFirestore(_uid: string, _events: CalendarEvent[]) {}
export async function saveMatchesToFirestore(_uid: string, _matches: MatchRecord[]) {}

export function subscribeToCoachData(
  _uid: string,
  _callbacks: {
    onProfileLoaded: (profile: UserProfile | null) => void;
    onPhilosophyLoaded: (philosophy: CoachPhilosophy | null) => void;
    onPlayersLoaded: (players: Player[]) => void;
    onTrainingsLoaded: (trainings: SavedTraining[]) => void;
    onCalendarLoaded: (events: CalendarEvent[]) => void;
    onMatchesLoaded: (matches: MatchRecord[]) => void;
  }
) {
  return () => {};
}

