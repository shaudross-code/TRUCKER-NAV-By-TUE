import { initializeApp } from 'firebase/app';
import { initializeAuth, browserPopupRedirectResolver, indexedDBLocalPersistence, browserLocalPersistence, browserSessionPersistence, inMemoryPersistence } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from './firebase-applet-config.json';
import { safeStringify } from './utils';

// Patch: The Firebase Identity Toolkit REST API (/v1/projects) for this project
// doesn't return `authorizedDomains`, causing "authorizedDomains is not iterable"
// in signInWithPopup. Intercept that specific fetch to inject the missing field.
if (typeof window !== 'undefined') {
  const _origFetch = window.fetch;
  window.fetch = async function patchedFetch(input: RequestInfo | URL, init?: RequestInit) {
    const response = await _origFetch.call(this, input, init);
    const url = typeof input === 'string' ? input : input instanceof Request ? input.url : input.toString();
    if (url.includes('identitytoolkit.googleapis.com/v1/projects')) {
      const clone = response.clone();
      const body = await clone.json().catch(() => null);
      if (body && !body.authorizedDomains) {
        body.authorizedDomains = [
          'localhost',
          window.location.hostname,
          `${firebaseConfig.projectId}.firebaseapp.com`,
          `${firebaseConfig.projectId}.web.app`,
        ];
        return new Response(JSON.stringify(body), {
          status: response.status,
          statusText: response.statusText,
          headers: response.headers,
        });
      }
    }
    return response;
  };
}

// Initialize Firebase SDK
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

// Initialize Auth with browserPopupRedirectResolver for signInWithPopup
export const auth = initializeAuth(app, {
  persistence: [indexedDBLocalPersistence, browserLocalPersistence, browserSessionPersistence, inMemoryPersistence],
  popupRedirectResolver: browserPopupRedirectResolver,
});
auth.useDeviceLanguage();


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
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errMsg = error instanceof Error ? error.message : String(error);
  const isPermissionDenied = errMsg.includes('permission') || errMsg.includes('Permission');
  
  const errInfo: FirestoreErrorInfo = {
    error: errMsg,
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  
  // For permission errors, just log once without throwing (expected for guest/email users)
  if (isPermissionDenied) {
    if (!(handleFirestoreError as any)._permWarnShown) {
      console.warn('Firestore: permission denied for', operationType, path, '- using local storage fallback');
      (handleFirestoreError as any)._permWarnShown = true;
    }
    return;
  }
  
  console.error('Firestore Error: ', safeStringify(errInfo));
  throw new Error(safeStringify(errInfo));
}

// Validate Connection to Firestore
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if(error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration. ");
    }
  }
}
testConnection();
