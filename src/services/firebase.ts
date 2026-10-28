import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut as fbSignOut, User, Auth } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer, Firestore } from 'firebase/firestore';

// 1. Safely retrieve Firebase configuration from firebase-applet-config.json if available
let rawFirebaseConfig: Record<string, any> = {};
try {
  // Use Vite's glob eager import so that if the file is absent on GitHub, it will NOT fail build
  const configModules = import.meta.glob<{ default: Record<string, any> }>('/firebase-applet-config.json', {
    eager: true,
  });
  if (configModules['/firebase-applet-config.json']?.default) {
    rawFirebaseConfig = configModules['/firebase-applet-config.json'].default;
  }
} catch {
  rawFirebaseConfig = {};
}

// 2. Fallback to Vite environment variables (VITE_FIREBASE_*)
const env = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env : ({} as Record<string, string>);

const projectId =
  (env.VITE_FIREBASE_PROJECT_ID as string) ||
  rawFirebaseConfig?.projectId ||
  '';

const appId =
  (env.VITE_FIREBASE_APP_ID as string) ||
  rawFirebaseConfig?.appId ||
  '';

const apiKey =
  (env.VITE_FIREBASE_API_KEY as string) ||
  rawFirebaseConfig?.apiKey ||
  '';

const authDomain =
  (env.VITE_FIREBASE_AUTH_DOMAIN as string) ||
  rawFirebaseConfig?.authDomain ||
  (projectId ? `${projectId}.firebaseapp.com` : '');

const firestoreDatabaseId =
  (env.VITE_FIREBASE_DATABASE_ID as string) ||
  rawFirebaseConfig?.firestoreDatabaseId ||
  '';

const storageBucket =
  (env.VITE_FIREBASE_STORAGE_BUCKET as string) ||
  rawFirebaseConfig?.storageBucket ||
  (projectId ? `${projectId}.firebasestorage.app` : '');

const messagingSenderId =
  (env.VITE_FIREBASE_MESSAGING_SENDER_ID as string) ||
  rawFirebaseConfig?.messagingSenderId ||
  '';

// Determine if valid Firebase credentials exist
export const isFirebaseConfigured: boolean = Boolean(apiKey && projectId && apiKey.trim() !== '');

let app: FirebaseApp | null = null;
let db: Firestore | null = null;
let auth: Auth | null = null;
let googleProvider: GoogleAuthProvider | null = null;

// 3. Initialize Firebase safely inside a try/catch block without crashing the app
if (isFirebaseConfigured) {
  try {
    app = getApps().length > 0
      ? getApp()
      : initializeApp({
          apiKey,
          authDomain,
          projectId,
          storageBucket,
          messagingSenderId,
          appId,
        });

    auth = getAuth(app);
    googleProvider = new GoogleAuthProvider();

    // Pass custom firestoreDatabaseId if configured
    db = firestoreDatabaseId ? getFirestore(app, firestoreDatabaseId) : getFirestore(app);
    console.info('[Firebase] Initialisé avec succès.');
  } catch (err) {
    console.warn('[Firebase] Initialisation échouée, passage en mode hors-ligne/local :', err);
    app = null;
    auth = null;
    db = null;
    googleProvider = null;
  }
} else {
  console.info('[Firebase] Aucune configuration Firebase détectée. Mode démonstration local actif.');
}

export { app, auth, db, googleProvider };

// Standard operation types for error tracing
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

/**
 * Standard Firestore error handler - Non-crashing logger
 */
export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): void {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth?.currentUser?.uid,
      email: auth?.currentUser?.email,
      emailVerified: auth?.currentUser?.emailVerified,
      isAnonymous: auth?.currentUser?.isAnonymous,
      tenantId: auth?.currentUser?.tenantId,
      providerInfo:
        auth?.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.warn('[Firebase Firestore Warning]', JSON.stringify(errInfo));
}

/**
 * Handshake check for Firestore connection
 */
export async function testConnection(): Promise<boolean> {
  if (!db) return false;
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.log('[Firebase] Connexion serveur vérifiée.');
    return true;
  } catch (error) {
    console.warn('[Firebase] Mode hors-ligne ou base Firestore non accessible.');
    return false;
  }
}

// Optional handshake if configured
if (isFirebaseConfigured && db) {
  testConnection().catch(() => {});
}

export { signInWithPopup, fbSignOut };
export type { User };
