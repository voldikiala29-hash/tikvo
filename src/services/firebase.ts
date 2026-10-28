import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut as fbSignOut, User, Auth } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer, Firestore } from 'firebase/firestore';

// 1. Fallback configuration from provisioned Firebase project
const DEFAULT_CONFIG = {
  projectId: 'gen-lang-client-0420281505',
  appId: '1:1079644250638:web:6cde6910262c6cb98f525f',
  apiKey: 'AIzaSyCxSK0oTuaLlXnTgbHAFil3ttHG0As2jhg',
  authDomain: 'gen-lang-client-0420281505.firebaseapp.com',
  firestoreDatabaseId: 'ai-studio-tikokvoldiuniver-46f5a527-94d6-419d-abf4-7d5f6ed4a676',
  storageBucket: 'gen-lang-client-0420281505.firebasestorage.app',
  messagingSenderId: '1079644250638',
};

// Safely retrieve Firebase configuration from firebase-applet-config.json if available
let rawFirebaseConfig: Record<string, any> = {};
try {
  // Use Vite's glob eager import so that if the file is absent on GitHub, it will NOT fail build
  const configModules = import.meta.glob<{ default: Record<string, any> }>([
    '/firebase-applet-config.json',
    '../../firebase-applet-config.json',
  ], {
    eager: true,
  });
  for (const key of Object.keys(configModules)) {
    if (configModules[key]?.default) {
      rawFirebaseConfig = configModules[key].default;
      break;
    }
  }
} catch {
  rawFirebaseConfig = {};
}

// 2. Priority: Vite environment variables (VITE_FIREBASE_*) -> applet config -> DEFAULT_CONFIG
const env = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env : ({} as Record<string, string>);

export const projectId =
  (env.VITE_FIREBASE_PROJECT_ID as string) ||
  rawFirebaseConfig?.projectId ||
  DEFAULT_CONFIG.projectId;

export const appId =
  (env.VITE_FIREBASE_APP_ID as string) ||
  rawFirebaseConfig?.appId ||
  DEFAULT_CONFIG.appId;

export const apiKey =
  (env.VITE_FIREBASE_API_KEY as string) ||
  rawFirebaseConfig?.apiKey ||
  DEFAULT_CONFIG.apiKey;

export const authDomain =
  (env.VITE_FIREBASE_AUTH_DOMAIN as string) ||
  rawFirebaseConfig?.authDomain ||
  DEFAULT_CONFIG.authDomain;

export const firestoreDatabaseId =
  (env.VITE_FIREBASE_DATABASE_ID as string) ||
  rawFirebaseConfig?.firestoreDatabaseId ||
  DEFAULT_CONFIG.firestoreDatabaseId;

export const storageBucket =
  (env.VITE_FIREBASE_STORAGE_BUCKET as string) ||
  rawFirebaseConfig?.storageBucket ||
  DEFAULT_CONFIG.storageBucket;

export const messagingSenderId =
  (env.VITE_FIREBASE_MESSAGING_SENDER_ID as string) ||
  rawFirebaseConfig?.messagingSenderId ||
  DEFAULT_CONFIG.messagingSenderId;

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
 * Handshake check for Firestore connection with latency calculation
 */
export async function testConnection(): Promise<{ success: boolean; latencyMs?: number; message?: string }> {
  if (!db) {
    return { success: false, message: 'Base Firestore non initialisée.' };
  }
  const startTime = Date.now();
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    const latency = Date.now() - startTime;
    console.info(`[Firebase] Connexion serveur vérifiée en ${latency}ms.`);
    return { success: true, latencyMs: latency, message: `Connecté à Firestore (${latency}ms)` };
  } catch (error: any) {
    console.warn('[Firebase] Erreur handshake Firestore :', error);
    return {
      success: false,
      message: error?.message || 'Serveur distant inaccessible en direct.',
    };
  }
}

// Optional handshake if configured
if (isFirebaseConfigured && db) {
  testConnection().catch(() => {});
}

export { signInWithPopup, fbSignOut };
export type { User };
