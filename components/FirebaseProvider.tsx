import React, { useState, useEffect, useCallback } from 'react';
import { 
  User, 
  onAuthStateChanged, 
  GoogleAuthProvider, 
  signOut as firebaseSignOut, 
  signInWithCredential,
  signInWithPopup,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInAnonymously,
  updateProfile as firebaseUpdateProfile
} from 'firebase/auth';
import { doc, onSnapshot, updateDoc, setDoc } from 'firebase/firestore';
import { FirebaseContext, UserProfile, FirebaseContextType } from '../types';
import { auth, db } from '../firebase';

const USE_MOCK_DATA = false;

export const FirebaseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const MOCK_USER = {
    uid: 'dev-user-123',
    email: 'dev@truckeros.com',
    displayName: 'Dev Driver',
    emailVerified: true,
    isAnonymous: false,
    providerData: [],
  } as any;

  const MOCK_PROFILE: UserProfile = {
    uid: 'dev-user-123',
    email: 'dev@truckeros.com',
    displayName: 'Dev Driver',
    role: 'admin',
    truckProfile: {
      height: 13.5,
      weight: 78500,
      length: 53,
      width: 8.5,
      hazmat: false,
      hazmatClasses: [],
      tunnelCategory: 'NONE',
      axleCount: 5,
      axleWeight: 12000,
      trailerCount: 1,
      make: 'Volvo',
      model: 'VNL 660',
      year: 2026
    },
    autoReroute: true,
    weeklyEarnings: 1250.50,
    milesThisWeek: 2450,
    fuelCost: 450.25,
    truckCost: 300.00,
    weekDeductions: 150.00,
    takeHomePercentage: 100
  };

  const [user, setUser] = useState<User | null>(USE_MOCK_DATA ? MOCK_USER : null);
  const [profile, setProfile] = useState<UserProfile | null>(USE_MOCK_DATA ? MOCK_PROFILE : null);
  const [loading, setLoading] = useState(!USE_MOCK_DATA);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    if (USE_MOCK_DATA) {
      setLoading(false);
      return;
    }
    
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (USE_MOCK_DATA || !user) return;

    // For anonymous users, skip Firestore entirely — use local profile
    if (user.isAnonymous) {
      const localProfile: UserProfile = {
        uid: user.uid,
        email: '',
        displayName: 'Guest Driver',
        truckProfile: {
          height: 13.5, weight: 78500, length: 53, width: 8.5,
          hazmat: false, hazmatClasses: [], tunnelCategory: 'NONE',
          axleCount: 5, axleWeight: 12000, trailerCount: 1,
          make: 'Volvo', model: 'VNL 660', year: 2026
        }
      };
      setProfile(localProfile);
      return;
    }

    const userDocRef = doc(db, 'users', user.uid);
    const unsubscribe = onSnapshot(userDocRef, (docSnap) => {
      if (docSnap.exists()) {
        setProfile(docSnap.data() as UserProfile);
      } else {
        const initialProfile: UserProfile = {
          uid: user.uid,
          email: user.email || '',
          displayName: user.displayName || (user.isAnonymous ? 'Guest Driver' : ''),
          truckProfile: {
            height: 13.5,
            weight: 78500,
            length: 53,
            width: 8.5,
            hazmat: false,
            hazmatClasses: [],
            tunnelCategory: 'NONE',
            axleCount: 5,
            axleWeight: 12000,
            trailerCount: 1,
            make: 'Volvo',
            model: 'VNL 660',
            year: 2026
          }
        };
        setDoc(userDocRef, initialProfile).catch(() => {
          // Permission denied for anonymous/email users - use local profile
          setProfile(initialProfile);
        });
      }
    }, (error) => {
      // Firestore permission error - create local profile
      console.warn('Firestore read denied, using local profile');
      const localProfile: UserProfile = {
        uid: user.uid,
        email: user.email || '',
        displayName: user.displayName || (user.isAnonymous ? 'Guest Driver' : ''),
        truckProfile: {
          height: 13.5, weight: 78500, length: 53, width: 8.5,
          hazmat: false, hazmatClasses: [], tunnelCategory: 'NONE',
          axleCount: 5, axleWeight: 12000, trailerCount: 1,
          make: 'Volvo', model: 'VNL 660', year: 2026
        }
      };
      setProfile(localProfile);
    });
    return () => unsubscribe();
  }, [user]);

  // Google Sign-In — uses signInWithPopup (standard Firebase flow)
  // Falls back to GSI if popup flow fails
  const signIn = useCallback(async () => {
    if (USE_MOCK_DATA) return;
    try {
      setAuthError(null);
      
      const provider = new GoogleAuthProvider();
      provider.addScope('email');
      provider.addScope('profile');
      
      try {
        // Primary: Firebase signInWithPopup
        await signInWithPopup(auth, provider);
        return;
      } catch (popupError: any) {
        console.warn('signInWithPopup failed, trying GSI fallback:', popupError.code, popupError.message);
        
        // If user closed popup or popup blocked, don't fallback
        if (popupError.code === 'auth/popup-closed-by-user' || 
            popupError.code === 'auth/cancelled-popup-request') {
          return;
        }
        if (popupError.code === 'auth/popup-blocked') {
          setAuthError('Popup was blocked. Please allow popups for this site.');
          return;
        }
      }
      
      // Fallback: GSI (Google Identity Services)
      try {
        const google = (window as any).google;
        if (!google?.accounts?.oauth2) {
          throw new Error('GSI not loaded');
        }
        
        let clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
        if (!clientId) {
          const res = await fetch('/api/auth/google-client-id');
          const data = await res.json();
          clientId = data.clientId;
        }
        
        if (!clientId) {
          throw new Error('Missing client ID');
        }
        
        await new Promise<void>((resolve, reject) => {
          const client = google.accounts.oauth2.initCodeClient({
            client_id: clientId,
            scope: 'openid email profile',
            ux_mode: 'popup',
            callback: async (response: any) => {
              if (response.error) {
                reject(new Error(response.error_description || response.error));
                return;
              }
              try {
                const tokenRes = await fetch('/api/google-auth-exchange', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ code: response.code }),
                });
                const tokenData = await tokenRes.json();
                if (tokenData.error) { reject(new Error(tokenData.error)); return; }
                const idToken = tokenData.id_token || tokenData.idToken;
                if (idToken) {
                  const credential = GoogleAuthProvider.credential(idToken);
                  await signInWithCredential(auth, credential);
                  resolve();
                } else {
                  reject(new Error('No ID token'));
                }
              } catch (err) { reject(err); }
            },
          });
          client.requestCode();
        });
      } catch (gsiError: any) {
        console.warn('GSI fallback also failed:', gsiError.message);
        
        // Final fallback: server-side redirect in popup
        try {
          await signInViaServerRedirect();
        } catch (redirectError: any) {
          setAuthError('Google Sign-In failed. Please try again or use email login.');
        }
      }
    } catch (error: any) {
      setAuthError(error.message);
    }
  }, []);

  // Server-side redirect fallback (opens popup to /api/auth/google)
  const signInViaServerRedirect = useCallback(async () => {
    return new Promise<void>((resolve, reject) => {
      const width = 500, height = 600;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;
      const popup = window.open(
        '/api/auth/google',
        'GoogleAuth',
        `width=${width},height=${height},left=${left},top=${top},popup=true`
      );
      
      if (!popup) {
        reject(new Error('Popup blocked'));
        return;
      }
      
      // Listen for postMessage from callback page
      const messageHandler = async (event: MessageEvent) => {
        if (event.data?.type === 'google-auth-callback' && event.data?.idToken) {
          window.removeEventListener('message', messageHandler);
          clearInterval(pollTimer);
          popup.close();
          try {
            const credential = GoogleAuthProvider.credential(event.data.idToken);
            await signInWithCredential(auth, credential);
            resolve();
          } catch (err) { reject(err); }
        }
      };
      window.addEventListener('message', messageHandler);
      
      // Also poll for popup closure
      const pollTimer = setInterval(() => {
        if (popup.closed) {
          clearInterval(pollTimer);
          window.removeEventListener('message', messageHandler);
          resolve();
        }
      }, 500);
      
      // Timeout
      setTimeout(() => {
        clearInterval(pollTimer);
        window.removeEventListener('message', messageHandler);
        if (!popup.closed) popup.close();
        resolve();
      }, 120000);
    });
  }, []);

  // Apple Sign-In (Firebase handler is broken for this project)
  const signInWithApple = useCallback(async () => {
    if (USE_MOCK_DATA) return;
    setAuthError('Apple Sign-In requires additional configuration. Please use Google Sign-In, Email, or Guest access.');
  }, []);

  // Email/Password Sign-In
  const signInWithEmail = async (email: string, password: string) => {
    if (USE_MOCK_DATA) return;
    try {
      setAuthError(null);
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error: any) {
      const code = error.code;
      if (code === 'auth/user-not-found' || code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
        setAuthError('Invalid email or password.');
      } else if (code === 'auth/too-many-requests') {
        setAuthError('Too many attempts. Please try again later.');
      } else {
        setAuthError(error.message);
      }
    }
  };

  // Email/Password Registration
  const signUpWithEmail = async (email: string, password: string, displayName?: string) => {
    if (USE_MOCK_DATA) return;
    try {
      setAuthError(null);
      const result = await createUserWithEmailAndPassword(auth, email, password);
      if (displayName && result.user) {
        await firebaseUpdateProfile(result.user, { displayName });
      }
    } catch (error: any) {
      const code = error.code;
      if (code === 'auth/email-already-in-use') {
        setAuthError('An account with this email already exists.');
      } else if (code === 'auth/weak-password') {
        setAuthError('Password must be at least 6 characters.');
      } else if (code === 'auth/invalid-email') {
        setAuthError('Invalid email address.');
      } else {
        setAuthError(error.message);
      }
    }
  };

  // Anonymous/Guest Sign-In
  const signInAsGuest = async () => {
    if (USE_MOCK_DATA) return;
    try {
      setAuthError(null);
      await signInAnonymously(auth);
    } catch (error: any) {
      setAuthError(error.message);
    }
  };

  const signOut = async () => {
    if (USE_MOCK_DATA) return;
    try {
      await firebaseSignOut(auth);
    } catch (error: any) {
      setAuthError(error.message);
    }
  };

  const updateProfileData = async (data: Partial<UserProfile>) => {
    if (USE_MOCK_DATA) {
      setProfile(prev => prev ? { ...prev, ...data } : null);
      return;
    }
    if (!user) return;
    // Skip Firestore writes for anonymous users — data is saved locally via localStorage
    if (user.isAnonymous) {
      setProfile(prev => prev ? { ...prev, ...data } : null);
      return;
    }
    try {
      const userDocRef = doc(db, 'users', user.uid);
      await updateDoc(userDocRef, data);
    } catch (err: any) {
      // Silently handle permission errors - data is saved locally
      if (!err?.message?.includes('permission')) {
        console.error('Profile update error:', err?.message);
      }
    }
  };

  const value: FirebaseContextType = {
    user,
    profile,
    loading,
    signIn,
    signInWithApple,
    signInWithEmail,
    signUpWithEmail,
    signInAsGuest,
    signOut,
    updateProfile: updateProfileData,
    authError
  };

  return (
    <FirebaseContext.Provider value={value}>
      {children}
    </FirebaseContext.Provider>
  );
};

export const useFirebase = () => {
  const context = React.useContext(FirebaseContext);
  if (context === undefined) {
    throw new Error('useFirebase must be used within a FirebaseProvider');
  }
  return context;
};
