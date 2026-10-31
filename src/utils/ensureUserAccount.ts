// Point unique d'écriture du profil users/{uid}. Respecte les règles Firestore (chaînes ISO, pas de champs inconnus).
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../services/firebase';

interface AccountSource {
  uid: string;
  email?: string | null;
  displayName?: string | null;
  photoURL?: string | null;
}

export async function ensureUserAccount(user: AccountSource): Promise<void> {
  if (!db || !user?.uid) return;

  const ref = doc(db, 'users', user.uid);
  const now = new Date().toISOString();
  const base = {
    email: user.email || '',
    displayName: user.displayName || 'tikvo creator',
    photoURL: user.photoURL || '',
    updatedAt: now,
  };

  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, { uid: user.uid, ...base, createdAt: now });
  } else {
    await setDoc(ref, base, { merge: true });
  }
}
