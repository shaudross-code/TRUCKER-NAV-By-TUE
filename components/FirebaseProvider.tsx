import React, { useState, useEffect, useCallback } from 'react';
import { 
  User, 
  onAuthStateChanged, 
  signOut as firebaseSignOut, 
  signInWithCustomToken,
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

    // For anonymous users, skip Firestore entirely — use local profile from localStorage
    if (user.isAnonymous) {
      const storageKey = `trucker_profile_${user.uid}`;
      let stored: UserProfile | null = null;
      try {
        const raw = localStorage.getItem(storageKey);
        if (raw) stored = JSON.parse(raw);
      } catch {}
      const localProfile: UserProfile = stored || {
        uid: user.uid,
        email: '',
        displayName: 'Guest Driver',
        truckProfile: {
          height: 13.5, weight: 78500, length: 53, width: 8.5,
          hazmat: false, hazmatClasses: [], tunnelCategory: 'NONE',
          axleCount: 5, axleWeight: 12000, trailerCount: 1,
          make: '', model: '', year: 2024
        }
      };
      setProfile(localProfile);
      return;
    }

    const userDocRef = doc(db, 'users', user.uid);
    const unsubscribe = onSnapshot(userDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const firestoreProfile = docSnap.data() as UserProfile;
        setProfile(firestoreProfile);
        // Sync Firestore data to localStorage as backup
        try { localStorage.setItem(`trucker_profile_${user.uid}`, JSON.stringify(firestoreProfile)); } catch {}
      } else {
        // No Firestore doc — check localStorage first, then create defaults
        let localStored: UserProfile | null = null;
        try {
          const raw = localStorage.getItem(`trucker_profile_${user.uid}`);
          if (raw) localStored = JSON.parse(raw);
        } catch {}
        
        const initialProfile: UserProfile = localStored || {
          uid: user.uid,
          email: user.email || '',
          displayName: user.displayName || '',
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
            make: '',
            model: '',
            year: 2024
          }
        };
        setProfile(initialProfile);
        try { localStorage.setItem(`trucker_profile_${user.uid}`, JSON.stringify(initialProfile)); } catch {}
        setDoc(userDocRef, initialProfile).catch(() => {});
      }
    }, (error) => {
      // Firestore permission error — load from localStorage
      console.warn('Firestore read denied, using local profile');
      let localStored: UserProfile | null = null;
      try {
        const raw = localStorage.getItem(`trucker_profile_${user.uid}`);
        if (raw) localStored = JSON.parse(raw);
      } catch {}
      
      const localProfile: UserProfile = localStored || {
        uid: user.uid,
        email: user.email || '',
        displayName: user.displayName || (user.isAnonymous ? 'Guest Driver' : ''),
        truckProfile: {
          height: 13.5, weight: 78500, length: 53, width: 8.5,
          hazmat: false, hazmatClasses: [], tunnelCategory: 'NONE',
          axleCount: 5, axleWeight: 12000, trailerCount: 1,
          make: '', model: '', year: 2024
        }
      };
      setProfile(localProfile);
    });
    return () => unsubscribe();
  }, [user]);

  // Check for Google OAuth callback token on mount (from full-page redirect flow)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const customToken = params.get('__gauth_custom');
    if (customToken) {
      // Clean the URL immediately
      window.history.replaceState({}, '', '/');
      // Sign into Firebase with the custom token (created by our server)
      signInWithCustomToken(auth, customToken).catch((err) => {
        setAuthError('Google Sign-In failed: ' + (err.message || 'Unknown error'));
      });
    }
  }, []);

  // Google Sign-In — full-page redirect (no popups).
  // Works on Safari, Chrome, all browsers. No COOP or redirect_uri issues.
  const signIn = useCallback(async () => {
    if (USE_MOCK_DATA) return;
    setAuthError(null);

    let clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
    if (!clientId) {
      try {
        const res = await fetch('/api/auth/google-client-id');
        const data = await res.json();
        clientId = data.clientId;
      } catch {}
    }
    if (!clientId) {
      setAuthError('Google Sign-In configuration missing.');
      return;
    }

    // Full-page redirect to Google — no popups, no COOP issues
    const redirectUri = `${window.location.origin}/api/auth/google/callback`;
    const state = btoa(JSON.stringify({ redirect_uri: redirectUri }));
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'openid email profile',
      prompt: 'select_account',
      access_type: 'offline',
      state,
    });
    window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
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
    
    // ALWAYS update React state + localStorage immediately (primary store)
    setProfile(prev => {
      const updated = prev ? { ...prev, ...data } : null;
      if (updated) {
        try { localStorage.setItem(`trucker_profile_${user.uid}`, JSON.stringify(updated)); } catch {}
      }
      return updated;
    });

    // For non-anonymous users, also try Firestore sync (secondary store)
    if (!user.isAnonymous) {
      try {
        const userDocRef = doc(db, 'users', user.uid);
        await updateDoc(userDocRef, data);
      } catch (err: any) {
        // Firestore write failed — data is already saved locally above
        if (!err?.message?.includes('permission')) {
          console.error('Profile Firestore sync error:', err?.message);
        }
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
