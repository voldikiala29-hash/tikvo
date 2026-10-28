import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';

export async function ensureUserAccount(user: any) {
  if (!user?.uid) return;
  
  const userRef = doc(db, 'users', user.uid);
  const snap = await getDoc(userRef);

  if (!snap.exists()) {
    await setDoc(userRef, {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName || user.email?.split('@')[0],
      photoURL: user.photoURL || '',
      createdAt: serverTimestamp(),
      lastLogin: serverTimestamp(),
      plan: 'free',
      nicheActive: 'Mode',
      customNiches: [],
      scheduledPosts: [],
      accountsTikTok: [],
      stats: { views: 0, followers: 0, earnings: 0 }
    });
  } else {
    await setDoc(userRef, {
      lastLogin: serverTimestamp(),
      email: user.email,
      displayName: user.displayName,
      photoURL: user.photoURL
    }, { merge: true });
  }
}
