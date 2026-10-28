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
import { auth, db, googleProvider, handleFirestoreError, OperationType } from '../services/firebase';
import { NicheData, ScheduledPost } from '../types/tiktok';

interface FirebaseContextType {
  user: User | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  saveCustomNiche: (niche: NicheData) => Promise<void>;
  saveScheduledPost: (post: ScheduledPost) => Promise<void>;
  removeScheduledPost: (postId: string) => Promise<void>;
  firestoreCustomNiches: Record<string, NicheData>;
  firestoreScheduledPosts: ScheduledPost[];
}

const FirebaseContext = createContext<FirebaseContextType | undefined>(undefined);

export const FirebaseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [firestoreCustomNiches, setFirestoreCustomNiches] = useState<Record<string, NicheData>>({});
  const [firestoreScheduledPosts, setFirestoreScheduledPosts] = useState<ScheduledPost[]>([]);

  // Listen to auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setLoading(false);

      if (currentUser) {
        // Sync user profile document
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
      } else {
        setFirestoreCustomNiches({});
        setFirestoreScheduledPosts([]);
      }
    });

    return () => unsubscribe();
  }, []);

  // Listen to custom niches if authenticated
  useEffect(() => {
    if (!user) return;

    const nichesPath = `users/${user.uid}/customNiches`;
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
  }, [user]);

  // Listen to scheduled posts if authenticated
  useEffect(() => {
    if (!user) return;

    const postsPath = `users/${user.uid}/scheduledPosts`;
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
  }, [user]);

  const signInWithGoogle = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      console.error('[Firebase Auth Error]', err);
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error('[Firebase SignOut Error]', err);
    }
  };

  const saveCustomNiche = async (niche: NicheData) => {
    if (!user) return;
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
        loading,
        signInWithGoogle,
        logout,
        saveCustomNiche,
        saveScheduledPost,
        removeScheduledPost,
        firestoreCustomNiches,
        firestoreScheduledPosts,
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
