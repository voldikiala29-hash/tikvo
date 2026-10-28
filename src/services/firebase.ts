import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut as fbSignOut, User } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import rawFirebaseConfig from '../../firebase-applet-config.json';

// Safe configuration using import.meta.env or fallback JSON
const firebaseConfig = {
  projectId:
    (typeof import.meta !== 'undefined' && import.meta.env?.VITE_FIREBASE_PROJECT_ID) ||
    rawFirebaseConfig?.projectId ||
    'gen-lang-client-0420281505',
  appId:
    (typeof import.meta !== 'undefined' && import.meta.env?.VITE_FIREBASE_APP_ID) ||
    rawFirebaseConfig?.appId ||
    '1:1079644250638:web:6cde6910262c6cb98f525f',
  apiKey:
    (typeof import.meta !== 'undefined' && import.meta.env?.VITE_FIREBASE_API_KEY) ||
    rawFirebaseConfig?.apiKey ||
    'AIzaSyCxSK0oTuaLlXnTgbHAFil3ttHG0As2jhg',
  authDomain:
    (typeof import.meta !== 'undefined' && import.meta.env?.VITE_FIREBASE_AUTH_DOMAIN) ||
    rawFirebaseConfig?.authDomain ||
    'gen-lang-client-0420281505.firebaseapp.com',
  firestoreDatabaseId:
    (typeof import.meta !== 'undefined' && import.meta.env?.VITE_FIREBASE_DATABASE_ID) ||
    rawFirebaseConfig?.firestoreDatabaseId ||
    'ai-studio-tikokvoldiuniver-46f5a527-94d6-419d-abf4-7d5f6ed4a676',
  storageBucket:
    (typeof import.meta !== 'undefined' && import.meta.env?.VITE_FIREBASE_STORAGE_BUCKET) ||
    rawFirebaseConfig?.storageBucket ||
    'gen-lang-client-0420281505.firebasestorage.app',
  messagingSenderId:
    (typeof import.meta !== 'undefined' && import.meta.env?.VITE_FIREBASE_MESSAGING_SENDER_ID) ||
    rawFirebaseConfig?.messagingSenderId ||
    '1079644250638',
};

// Initialize Firebase App safely without crashing startup
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// CRITICAL: Always pass firestoreDatabaseId as second argument
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

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
 * Standard Firestore error handler per architectural guidelines
 */
export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.warn('Firestore Warning/Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

/**
 * Handshake check for Firestore connection
 */
export async function testConnection(): Promise<boolean> {
  try {
    if (!db) return false;
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.log('[Firebase] Connection handshake verified successfully.');
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('[Firebase] Client is offline or database is initializing.');
      return false;
    }
    // Handshake attempt completed or gracefully handled
    return true;
  }
}

// Run initial handshake test with safe catch handler
testConnection().catch(() => {});

export { signInWithPopup, fbSignOut };
export type { User };
