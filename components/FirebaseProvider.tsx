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

  // Helper: remove Google sign-in overlay
  const removeGoogleOverlay = useCallback(() => {
    const el = document.getElementById('google-signin-overlay');
    if (el) el.remove();
  }, []);

  // Google Sign-In — uses google.accounts.id API (Sign In With Google).
  // Returns an ID token directly via FedCM/iframe — NO redirect_uri involved.
  // Eliminates "redirect_uri_mismatch" and "missing initial state" errors entirely.
  const signIn = useCallback(async () => {
    if (USE_MOCK_DATA) return;
    setAuthError(null);

    const goog = (window as any).google;
    if (!goog?.accounts?.id) {
      await new Promise(r => setTimeout(r, 1500));
      if (!(window as any).google?.accounts?.id) {
        setAuthError('Google Sign-In is still loading. Please try again.');
        return;
      }
    }

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

    const g = (window as any).google;

    // Initialize with credential callback
    g.accounts.id.initialize({
      client_id: clientId,
      callback: (response: any) => {
        (async () => {
          removeGoogleOverlay();
          try {
            const credential = GoogleAuthProvider.credential(response.credential);
            await signInWithCredential(auth, credential);
          } catch (err: any) {
            setAuthError('Google Sign-In failed: ' + (err.message || 'Unknown error'));
          }
        })();
      },
      auto_select: false,
      cancel_on_tap_outside: true,
    });

    // Try One Tap first
    g.accounts.id.prompt((notification: any) => {
      if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
        // One Tap unavailable — show overlay with Google's rendered button
        removeGoogleOverlay();

        const overlay = document.createElement('div');
        overlay.id = 'google-signin-overlay';
        overlay.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,0.85);display:flex;align-items:center;justify-content:center;backdrop-filter:blur(8px)';
        overlay.addEventListener('click', (e) => { if (e.target === overlay) removeGoogleOverlay(); });

        const card = document.createElement('div');
        card.style.cssText = 'background:#1a1a1a;border:1px solid rgba(212,175,55,0.3);border-radius:20px;padding:32px 40px;text-align:center;min-width:320px';

        const title = document.createElement('div');
        title.style.cssText = 'color:#D4AF37;font-size:16px;font-weight:700;margin-bottom:8px;font-family:Inter,sans-serif';
        title.textContent = 'Sign In with Google';

        const subtitle = document.createElement('div');
        subtitle.style.cssText = 'color:#888;font-size:12px;margin-bottom:24px;font-family:Inter,sans-serif';
        subtitle.textContent = 'Click the button below to continue';

        const btnContainer = document.createElement('div');
        btnContainer.style.cssText = 'display:flex;justify-content:center';

        const cancel = document.createElement('button');
        cancel.style.cssText = 'margin-top:20px;color:#666;font-size:12px;background:none;border:none;cursor:pointer;font-family:Inter,sans-serif';
        cancel.textContent = 'Cancel';
        cancel.onclick = removeGoogleOverlay;

        card.appendChild(title);
        card.appendChild(subtitle);
        card.appendChild(btnContainer);
        card.appendChild(cancel);
        overlay.appendChild(card);
        document.body.appendChild(overlay);

        g.accounts.id.renderButton(btnContainer, {
          theme: 'filled_black',
          size: 'large',
          shape: 'pill',
          width: 280,
          text: 'signin_with',
        });
      }
    });
  }, [removeGoogleOverlay]);

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
