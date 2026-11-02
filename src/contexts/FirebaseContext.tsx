import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User, signInWithPopup, signOut } from 'firebase/auth';
import { ensureUserAccount } from '../utils/ensureUserAccount';
import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  getDoc,
} from 'firebase/firestore';
import {
  auth,
  db,
  googleProvider,
  isFirebaseConfigured,
  handleFirestoreError,
  OperationType,
  testConnection,
  projectId,
  firestoreDatabaseId,
} from '../services/firebase';

export interface FirebaseContextType {
  user: User | null;
  isDemoUser: boolean;
  loading: boolean;
  authLoading: boolean;
  authError: string | null;
  clearAuthError: () => void;
  isFirebaseConfigured: boolean;
  isFirebaseModalOpen: boolean;
  setIsFirebaseModalOpen: (open: boolean) => void;
  signInWithGoogle: () => Promise<boolean>;
  signInAsTester: () => void;
  logout: () => Promise<void>;
  testFirestorePing: () => Promise<{ success: boolean; latencyMs?: number; message?: string }>;
  projectId: string;
  firestoreDatabaseId: string;
}

const FirebaseContext = createContext<FirebaseContextType | undefined>(undefined);

// Helper to create a local tester mock user
const createMockTesterUser = (): User => {
  return {
    uid: 'tikvo-creator-test-01',
    email: 'voldikiala6@gmail.com',
    displayName: 'Voldi (tikvo Creator)',
    photoURL: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
    emailVerified: true,
    isAnonymous: false,
    metadata: {} as any,
    providerData: [],
    refreshToken: '',
    tenantId: null,
    delete: async () => {},
    getIdToken: async () => '',
    getIdTokenResult: async () => ({} as any),
    reload: async () => {},
    toJSON: () => ({}),
    phoneNumber: null,
    providerId: 'google.com',
  };
};

export const FirebaseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isDemoUser, setIsDemoUser] = useState<boolean>(() => {
    return localStorage.getItem('TIKVO_TESTER_MODE') === 'true';
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [authLoading, setAuthLoading] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isFirebaseModalOpen, setIsFirebaseModalOpen] = useState<boolean>(false);


  // 1. Listen to real Firebase auth state safely
  useEffect(() => {
    // If user previously chose tester mode, load tester user
    if (localStorage.getItem('TIKVO_TESTER_MODE') === 'true') {
      setUser(createMockTesterUser());
      setIsDemoUser(true);
      setLoading(false);
      return;
    }

    if (!isFirebaseConfigured || !auth) {
      setLoading(false);
      return;
    }

    try {
      const unsubscribe = onAuthStateChanged(
        auth,
        async (currentUser) => {
          if (currentUser) {
            setUser(currentUser);
            setIsDemoUser(false);
            setLoading(false);

            if (db) {
              try {
                await ensureUserAccount(currentUser);
              } catch (err) {
                handleFirestoreError(err, OperationType.WRITE, `users/${currentUser.uid}`);
              }
            }
          } else {
            if (!isDemoUser) {
              setUser(null);
              setFirestoreCustomNiches({});
            }
            setLoading(false);
          }
        },
        (error) => {
          console.warn('[Firebase Auth] Erreur d’état utilisateur:', error);
          setLoading(false);
        }
      );

      return () => unsubscribe();
    } catch (err) {
      console.warn('[Firebase Auth] Impossible d’attacher le listener:', err);
      setLoading(false);
    }
  }, [isDemoUser]);


  // Clear authentication error
  const clearAuthError = () => setAuthError(null);

  // Authenticate with Google
  const signInWithGoogle = async (): Promise<boolean> => {
    setAuthLoading(true);
    setAuthError(null);

    if (!isFirebaseConfigured || !auth || !googleProvider) {
      setAuthLoading(false);
      setAuthError("Configuration Firebase introuvable dans l'environnement.");
      setIsFirebaseModalOpen(true);
      return false;
    }

    try {
      await signInWithPopup(auth, googleProvider);
      localStorage.removeItem('TIKVO_TESTER_MODE');
      setIsDemoUser(false);
      setAuthLoading(false);
      return true;
    } catch (err: any) {
      console.error('[Firebase Auth Error]', err);
      setAuthLoading(false);

      const errorCode = err?.code || '';
      let message = "Impossible d'ouvrir la fenêtre de connexion Google.";

      if (errorCode === 'auth/popup-blocked') {
        message = "La fenêtre pop-up de connexion Google a été bloquée par votre navigateur. Autorisez les pop-ups pour ce site, ou utilisez le bouton 'Mode Testeur' ci-dessous pour voir l'application immédiatement.";
      } else if (errorCode === 'auth/unauthorized-domain') {
        const currentHost = window.location.hostname;
        message = `Le domaine '${currentHost}' n'est pas encore autorisé dans votre console Firebase. Pour connecter votre compte Google sur ce domaine, ajoutez '${currentHost}' dans : Firebase Console -> Authentication -> Paramètres -> Domaines autorisés.`;
      } else if (errorCode === 'auth/popup-closed-by-user') {
        message = "La fenêtre de connexion a été fermée avant la validation.";
      } else if (errorCode === 'auth/cancelled-popup-request') {
        message = "Une tentative de connexion était déjà en cours.";
      } else if (err?.message) {
        message = err.message;
      }

      setAuthError(message);
      setIsFirebaseModalOpen(true);
      return false;
    }
  };

  // Immediate Tester Mode Login
  const signInAsTester = () => {
    localStorage.setItem('TIKVO_TESTER_MODE', 'true');
    setUser(createMockTesterUser());
    setIsDemoUser(true);
    setAuthError(null);
    setIsFirebaseModalOpen(false);
  };

  // Sign out
  const logout = async () => {
    localStorage.removeItem('TIKVO_TESTER_MODE');
    setIsDemoUser(false);
    setUser(null);
    if (auth) {
      try {
        await signOut(auth);
      } catch (err) {
        console.error('[Firebase SignOut Error]', err);
      }
    }
  };

  // Ping Firestore
  const testFirestorePing = async () => {
    return await testConnection();
  };

  return (
    <FirebaseContext.Provider
      value={{
        user,
        isDemoUser,
        loading,
        authLoading,
        authError,
        clearAuthError,
        isFirebaseConfigured,
        isFirebaseModalOpen,
        setIsFirebaseModalOpen,
        signInWithGoogle,
        signInAsTester,
        logout,
        testFirestorePing,
        projectId,
        firestoreDatabaseId,
      }}
    >
      {children}
    </FirebaseContext.Provider>
  );
};

export const useFirebase = () => {
  const context = useContext(FirebaseContext);
  if (!context) {
    throw new Error('useFirebase must be used within a FirebaseProvider');
  }
  return context;
};
