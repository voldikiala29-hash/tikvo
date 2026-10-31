// Lecture et écriture Firestore de l'onboarding et des programmes (collections users et userPrograms).
import { doc, getDoc, onSnapshot, serverTimestamp, setDoc, Unsubscribe } from 'firebase/firestore';
import { db } from './firebase';
import type { GeneratedProgram, NicheId, ProgramDuration } from './programGenerator';

export type OnboardingStep = 'niches' | 'duration' | 'generating' | 'done';

export interface UserProfile {
  niches: NicheId[];
  nicheActive: NicheId | null;
  onboardingStep: OnboardingStep | null;
  programDuration: ProgramDuration | null;
  currentProgramId: string | null;
}

export interface StoredProgram extends GeneratedProgram {
  id: string;
  uid: string;
  niches: NicheId[];
  duration: ProgramDuration;
}

function requireDb() {
  if (!db) throw new Error("Firestore n'est pas configuré : impossible d'enregistrer.");
  return db;
}

const nowIso = () => new Date().toISOString();

export function watchUserProfile(
  uid: string,
  onChange: (profile: UserProfile | null, error: string | null) => void,
): Unsubscribe {
  if (!db) {
    onChange(null, "Firestore n'est pas configuré.");
    return () => {};
  }
  return onSnapshot(
    doc(db, 'users', uid),
    (snap) => {
      if (!snap.exists()) return onChange(null, null);
      const d = snap.data();
      onChange({
        niches: Array.isArray(d.niches) ? (d.niches as NicheId[]) : [],
        nicheActive: (d.nicheActive as NicheId) ?? null,
        onboardingStep: (d.onboardingStep as OnboardingStep) ?? null,
        programDuration: (d.programDuration as ProgramDuration) ?? null,
        currentProgramId: (d.currentProgramId as string) ?? null,
      }, null);
    },
    (err) => {
      console.error('[Firestore] lecture du profil refusée ou en échec :', err.code, err.message);
      onChange(null, `Lecture du profil impossible (${err.code || 'erreur'}) : ${err.message}`);
    },
  );
}

export async function saveNiches(uid: string, niches: NicheId[]): Promise<void> {
  await setDoc(
    doc(requireDb(), 'users', uid),
    { niches, nicheActive: niches[0], onboardingStep: 'duration', updatedAt: nowIso() },
    { merge: true },
  );
}

export async function saveDuration(uid: string, duration: ProgramDuration): Promise<void> {
  await setDoc(
    doc(requireDb(), 'users', uid),
    { programDuration: duration, onboardingStep: 'generating', updatedAt: nowIso() },
    { merge: true },
  );
}

export async function setOnboardingStep(uid: string, step: OnboardingStep): Promise<void> {
  await setDoc(doc(requireDb(), 'users', uid), { onboardingStep: step, updatedAt: nowIso() }, { merge: true });
}

/** Enregistre le programme puis pointe le profil dessus (étape « done »). */
export async function saveGeneratedProgram(
  uid: string,
  program: GeneratedProgram & { niches: NicheId[]; duration: ProgramDuration },
): Promise<string> {
  const database = requireDb();
  const id = `${uid}_${Date.now()}`;
  await setDoc(doc(database, 'userPrograms', id), {
    uid,
    niches: program.niches,
    duration: program.duration,
    days: program.days,
    totalVideos: program.totalVideos,
    createdAt: serverTimestamp(),
  });
  await setDoc(
    doc(database, 'users', uid),
    { currentProgramId: id, onboardingStep: 'done', updatedAt: nowIso() },
    { merge: true },
  );
  return id;
}

export async function loadProgram(id: string): Promise<StoredProgram | null> {
  const snap = await getDoc(doc(requireDb(), 'userPrograms', id));
  if (!snap.exists()) return null;
  return { id, ...(snap.data() as Omit<StoredProgram, 'id'>) };
}
