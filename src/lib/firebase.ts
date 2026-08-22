export interface User {
  uid: string;
  email: string | null;
  displayName: string | null;
  getIdToken: () => Promise<string>;
}

export const auth = {
  currentUser: null as User | null,
};

export const googleAuthProvider = {};
export const googleProvider = googleAuthProvider;

export function onAuthStateChanged(
  _auth: any,
  callback: (user: User | null) => void
) {
  if (typeof window !== 'undefined') {
    const storedProfile = localStorage.getItem('coachmind_user_profile');
    if (storedProfile) {
      try {
        const profile = JSON.parse(storedProfile);
        const user: User = {
          uid: profile.uid || 'local-coach-id',
          email: profile.email || 'coach@example.com',
          displayName: `${profile.firstName || ''} ${profile.lastName || ''}`.trim() || 'Entrenador Local',
          getIdToken: async () => 'mock-local-token',
        };
        auth.currentUser = user;
        callback(user);
        return () => {};
      } catch {
        // ignore
      }
    }
  }
  callback(auth.currentUser);
  return () => {};
}

export async function createUserWithEmailAndPassword(_auth: any, email: string, _pass: string) {
  const user: User = {
    uid: 'user-' + Date.now(),
    email,
    displayName: email.split('@')[0],
    getIdToken: async () => 'mock-local-token',
  };
  auth.currentUser = user;
  return { user };
}

export async function signInWithEmailAndPassword(_auth: any, email: string, _pass: string) {
  const user: User = {
    uid: 'user-' + Date.now(),
    email,
    displayName: email.split('@')[0],
    getIdToken: async () => 'mock-local-token',
  };
  auth.currentUser = user;
  return { user };
}

export async function signInWithPopup(_auth: any, _provider: any) {
  const user: User = {
    uid: 'user-google-' + Date.now(),
    email: 'coach.google@example.com',
    displayName: 'Entrenador Google',
    getIdToken: async () => 'mock-local-token',
  };
  auth.currentUser = user;
  return { user };
}

export async function signOut(_auth: any) {
  auth.currentUser = null;
  return Promise.resolve();
}

// Stubs for Firebase Firestore functions to maintain compatibility without Firebase SDK
export const db = {};
export const doc = (..._args: any[]) => ({});
export const getDoc = async (..._args: any[]) => ({ exists: () => false, data: () => null });
export const setDoc = async (..._args: any[]) => {};
export const deleteDoc = async (..._args: any[]) => {};
export const updateDoc = async (..._args: any[]) => {};
export const collection = (..._args: any[]) => ({});
export const getDocs = async (..._args: any[]) => ({ docs: [] });
export const onSnapshot = (..._args: any[]) => (() => {});

