import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User, signInWithPopup, signOut } from 'firebase/auth';
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
import { NicheData, ScheduledPost } from '../types/tiktok';

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
  saveCustomNiche: (niche: NicheData) => Promise<void>;
  saveScheduledPost: (post: ScheduledPost) => Promise<void>;
  removeScheduledPost: (postId: string) => Promise<void>;
  firestoreCustomNiches: Record<string, NicheData>;
  firestoreScheduledPosts: ScheduledPost[];
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

  const [firestoreCustomNiches, setFirestoreCustomNiches] = useState<Record<string, NicheData>>({});
  const [firestoreScheduledPosts, setFirestoreScheduledPosts] = useState<ScheduledPost[]>([]);

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
              // Sync user profile document in Firestore
              const userDocPath = `users/${currentUser.uid}`;
              try {
                const userRef = doc(db, 'users', currentUser.uid);
                const existingSnap = await getDoc(userRef);

                if (!existingSnap.exists()) {
                  await setDoc(userRef, {
                    uid: currentUser.uid,
                    email: currentUser.email || '',
                    displayName: currentUser.displayName || 'tikvo creator',
                    photoURL: currentUser.photoURL || '',
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                  });
                } else {
                  await setDoc(
                    userRef,
                    {
                      displayName: currentUser.displayName || 'tikvo creator',
                      photoURL: currentUser.photoURL || '',
                      updatedAt: new Date().toISOString(),
                    },
                    { merge: true }
                  );
                }
              } catch (err) {
                handleFirestoreError(err, OperationType.WRITE, userDocPath);
              }
            }
          } else {
            if (!isDemoUser) {
              setUser(null);
              setFirestoreCustomNiches({});
              setFirestoreScheduledPosts([]);
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

  // 2. Listen to custom niches if authenticated and db is ready
  useEffect(() => {
    if (!isFirebaseConfigured || !db || !user || isDemoUser) return;

    const nichesPath = `users/${user.uid}/customNiches`;
    try {
      const nichesCol = collection(db, 'users', user.uid, 'customNiches');

      const unsubscribe = onSnapshot(
        nichesCol,
        (snapshot) => {
          const nichesMap: Record<string, NicheData> = {};
          snapshot.docs.forEach((docSnap) => {
            const data = docSnap.data() as any;
            if (data && data.id) {
              nichesMap[data.id] = {
                id: data.id,
                name: data.name,
                emoji: data.emoji,
                tagline: data.tagline || '',
                description: data.description || '',
                kpis: {
                  totalViews: '1.2M',
                  viewsGrowth: '+45.0%',
                  followers: '32.4K',
                  followersGrowth: '+18.2%',
                  viralityRate: '9.4%',
                  viralityGrowth: '+2.1%',
                  estimatedRevenue: '1 250 €',
                  revenueGrowth: '+30.0%',
                },
                templates: [
                  {
                    id: `${data.id}-tpl-1`,
                    title: `3 Erreurs fatales dans ${data.name}`,
                    structure: 'Hook choc -> Problème n°1 -> Solution inédite',
                    avgRetention: '86%',
                    bestDuration: '20s',
                    exampleHook: data.firstHook || `Si tu fais ça dans ${data.name}, arrête.`,
                    description: `Template optimisé pour l'engagement dans ${data.name}`,
                    recommendedSoundType: 'Beat énergique',
                  },
                ],
                hooks: [
                  {
                    id: `${data.id}-hook-1`,
                    category: 'choc',
                    text: data.firstHook || `Le secret de ${data.name} que 99% ignorent.`,
                    retentionRate: 91,
                    difficulty: 'Facile',
                  },
                ],
                sounds: [
                  {
                    id: `${data.id}-snd-1`,
                    title: `Viral Pulse for ${data.name}`,
                    artist: 'tikvo Sounds',
                    usageCount: '142.0K',
                    growth: '+210%',
                    isHot: true,
                    bpm: 120,
                    genre: 'Cyber Electronic',
                    viralScore: 95,
                  },
                ],
                hashtags: [
                  {
                    id: `${data.id}-tag-1`,
                    tag: data.firstHashtag || `#${data.name.replace(/\s+/g, '')}Tok`,
                    views: '1.4B',
                    growth: '+85%',
                    competition: 'Moyenne',
                    trendScore: 94,
                  },
                ],
                formats: [
                  {
                    id: `${data.id}-fmt-1`,
                    name: 'Face Cam Dynamique',
                    badge: 'Rétention Forte',
                    description: 'Présentation rythmée avec zoom',
                    avgWatchTime: '90%',
                    viralMultiplier: '3.0x',
                  },
                ],
                products: [
                  {
                    id: `${data.id}-prd-1`,
                    name: `Kit Démarrage ${data.name}`,
                    price: '29,90 €',
                    commission: '7,50 €',
                    commissionRate: 25,
                    sales24h: 310,
                    category: 'Produit Niche',
                    sampleAvailable: true,
                    rating: 4.9,
                  },
                ],
                affiliates: [
                  {
                    id: `${data.id}-aff-1`,
                    brand: `Partenaire ${data.name}`,
                    offer: '15% de commission',
                    payout: '15% net',
                    conversionRate: '4.2%',
                    status: 'Top Performer',
                    link: 'https://creators.tiktok.com/custom',
                  },
                ],
                accounts: [
                  {
                    id: `${data.id}-acc-1`,
                    handle: `@tikvo_${data.name.toLowerCase().replace(/[^a-z0-9]/g, '')}`,
                    displayName: `${data.name} Master Studio`,
                    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
                    nicheId: data.id,
                    followers: 32400,
                    totalLikes: '840K',
                    avgViews: '45K',
                    engagementRate: '9.4%',
                    apiConnected: true,
                    autoPostEnabled: true,
                    shadowbanRisk: 'Aucun',
                    creatorRewardsEligible: true,
                  },
                ],
                targetAudience: {
                  ageRange: data.targetAudience || '18 - 35 ans',
                  genderRatio: '50% Hommes / 50% Femmes',
                  peakHours: ['12:30', '18:30', '21:00'],
                  topGeo: ['France', 'Belgique', 'Suisse'],
                },
              };
            }
          });
          setFirestoreCustomNiches(nichesMap);
        },
        (error) => {
          handleFirestoreError(error, OperationType.GET, nichesPath);
        }
      );

      return () => unsubscribe();
    } catch (err) {
      console.warn('[Firebase] Erreur listener niches:', err);
    }
  }, [user, isDemoUser]);

  // 3. Listen to scheduled posts if authenticated and db is ready
  useEffect(() => {
    if (!isFirebaseConfigured || !db || !user || isDemoUser) return;

    const postsPath = `users/${user.uid}/scheduledPosts`;
    try {
      const postsCol = collection(db, 'users', user.uid, 'scheduledPosts');

      const unsubscribe = onSnapshot(
        postsCol,
        (snapshot) => {
          const postsList: ScheduledPost[] = [];
          snapshot.docs.forEach((docSnap) => {
            const data = docSnap.data() as ScheduledPost;
            if (data && data.id) {
              postsList.push(data);
            }
          });
          setFirestoreScheduledPosts(postsList);
        },
        (error) => {
          handleFirestoreError(error, OperationType.GET, postsPath);
        }
      );

      return () => unsubscribe();
    } catch (err) {
      console.warn('[Firebase] Erreur listener posts:', err);
    }
  }, [user, isDemoUser]);

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

  const saveCustomNiche = async (niche: NicheData) => {
    if (!user) return;

    // In tester mode, save to localStorage
    if (isDemoUser) {
      try {
        const saved = JSON.parse(localStorage.getItem('TIKVO_NICHES') || '{}');
        saved[niche.id] = niche;
        localStorage.setItem('TIKVO_NICHES', JSON.stringify(saved));
        setFirestoreCustomNiches((prev) => ({ ...prev, [niche.id]: niche }));
      } catch (e) {
        console.error(e);
      }
      return;
    }

    if (!isFirebaseConfigured || !db) return;
    const path = `users/${user.uid}/customNiches/${niche.id}`;
    try {
      const nicheDoc = doc(db, 'users', user.uid, 'customNiches', niche.id);
      await setDoc(nicheDoc, {
        id: niche.id,
        userId: user.uid,
        name: niche.name,
        emoji: niche.emoji,
        tagline: niche.tagline || '',
        description: niche.description || '',
        targetAudience: niche.targetAudience.ageRange || '18 - 35 ans',
        firstHashtag: niche.hashtags[0]?.tag || '',
        firstHook: niche.hooks[0]?.text || '',
        createdAt: new Date().toISOString(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, path);
    }
  };

  const saveScheduledPost = async (post: ScheduledPost) => {
    if (!user) return;

    if (isDemoUser) {
      try {
        const saved: ScheduledPost[] = JSON.parse(localStorage.getItem('TIKVO_SCHEDULED_POSTS') || '[]');
        const updated = [post, ...saved.filter((p) => p.id !== post.id)];
        localStorage.setItem('TIKVO_SCHEDULED_POSTS', JSON.stringify(updated));
        setFirestoreScheduledPosts(updated);
      } catch (e) {
        console.error(e);
      }
      return;
    }

    if (!isFirebaseConfigured || !db) return;
    const path = `users/${user.uid}/scheduledPosts/${post.id}`;
    try {
      const postDoc = doc(db, 'users', user.uid, 'scheduledPosts', post.id);
      await setDoc(postDoc, {
        ...post,
        userId: user.uid,
        createdAt: new Date().toISOString(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, path);
    }
  };

  const removeScheduledPost = async (postId: string) => {
    if (!user) return;

    if (isDemoUser) {
      try {
        const saved: ScheduledPost[] = JSON.parse(localStorage.getItem('TIKVO_SCHEDULED_POSTS') || '[]');
        const updated = saved.filter((p) => p.id !== postId);
        localStorage.setItem('TIKVO_SCHEDULED_POSTS', JSON.stringify(updated));
        setFirestoreScheduledPosts(updated);
      } catch (e) {
        console.error(e);
      }
      return;
    }

    if (!isFirebaseConfigured || !db) return;
    const path = `users/${user.uid}/scheduledPosts/${postId}`;
    try {
      const postDoc = doc(db, 'users', user.uid, 'scheduledPosts', postId);
      await deleteDoc(postDoc);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, path);
    }
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
        saveCustomNiche,
        saveScheduledPost,
        removeScheduledPost,
        firestoreCustomNiches,
        firestoreScheduledPosts,
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
