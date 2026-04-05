import React, { useState, useEffect, useCallback } from 'react';
import { 
  User, 
  onAuthStateChanged, 
  GoogleAuthProvider, 
  signOut as firebaseSignOut, 
  signInWithCredential,
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

  // Google Sign-In via custom server-side OAuth
  const signIn = useCallback(async () => {
    if (USE_MOCK_DATA) return;
    try {
      setAuthError(null);
      
      // Open popup to our backend Google OAuth endpoint
      const width = 500, height = 600;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;
      const popup = window.open(
        '/api/auth/google',
        'GoogleAuth',
        `width=${width},height=${height},left=${left},top=${top},popup=true`
      );
      
      if (!popup) {
        setAuthError('Popup was blocked. Please allow popups for this site.');
        return;
      }
      
      // The Firebase handler at /__/auth/handler will receive the OAuth callback.
      // It shows "The requested action is invalid" but the URL contains the auth code.
      // Poll the popup URL to extract the auth code.
      return new Promise<void>((resolve, reject) => {
        const pollTimer = setInterval(async () => {
          try {
            if (popup.closed) {
              clearInterval(pollTimer);
              resolve();
              return;
            }
            
            // Try to read the popup URL (may fail due to cross-origin)
            let popupUrl = '';
            try { popupUrl = popup.location.href; } catch { return; }
            
            // Check if we're back at the handler with an auth code
            if (popupUrl.includes('code=') && popupUrl.includes('__/auth/handler')) {
              clearInterval(pollTimer);
              const url = new URL(popupUrl);
              const code = url.searchParams.get('code');
              const state = url.searchParams.get('state');
              popup.close();
              
              if (code) {
                try {
                  // Exchange code for ID token via our backend
                  const tokenRes = await fetch('/api/auth/google/callback?' + new URLSearchParams({ code, state: state || '' }));
                  const html = await tokenRes.text();
                  
                  // Extract ID token from the response
                  const match = html.match(/"idToken":\s*"([^"]+)"/);
                  if (match) {
                    const credential = GoogleAuthProvider.credential(match[1]);
                    await signInWithCredential(auth, credential);
                    resolve();
                  } else {
                    setAuthError('Failed to complete sign-in');
                    reject(new Error('No ID token'));
                  }
                } catch (err: any) {
                  setAuthError(err.message);
                  reject(err);
                }
              }
            }
          } catch {}
        }, 500);
        
        // Timeout after 2 minutes
        setTimeout(() => {
          clearInterval(pollTimer);
          if (!popup.closed) popup.close();
          resolve();
        }, 120000);
      });
    } catch (error: any) {
      setAuthError(error.message);
    }
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
