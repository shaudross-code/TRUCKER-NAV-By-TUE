import React, { useState, useEffect } from 'react';
import { User, onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut as firebaseSignOut, browserPopupRedirectResolver } from 'firebase/auth';
import { doc, onSnapshot, updateDoc, setDoc } from 'firebase/firestore';
import { FirebaseContext, UserProfile, FirebaseContextType } from '../types';
import { auth, db } from '../firebase';

const USE_MOCK_DATA = false; // Toggle this to switch between Mock and Firebase

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

    const userDocRef = doc(db, 'users', user.uid);
    const unsubscribe = onSnapshot(userDocRef, (docSnap) => {
      if (docSnap.exists()) {
        setProfile(docSnap.data() as UserProfile);
      } else {
        const initialProfile: UserProfile = {
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
            make: 'Volvo',
            model: 'VNL 660',
            year: 2026
          }
        };
        setDoc(userDocRef, initialProfile);
      }
    });
    return () => unsubscribe();
  }, [user]);

  const signIn = async () => {
    if (USE_MOCK_DATA) return;
    try {
      setAuthError(null);
      const provider = new GoogleAuthProvider();
      // Add custom parameters if needed, e.g., prompt: 'select_account'
      provider.setCustomParameters({
        prompt: 'select_account'
      });
      await signInWithPopup(auth, provider, browserPopupRedirectResolver);
    } catch (error) {
      setAuthError((error as Error).message);
    }
  };

  const signOut = async () => {
    if (USE_MOCK_DATA) return;
    try {
      await firebaseSignOut(auth);
    } catch (error) {
      setAuthError((error as Error).message);
    }
  };

  const updateProfileData = async (data: Partial<UserProfile>) => {
    if (USE_MOCK_DATA) {
      setProfile(prev => prev ? { ...prev, ...data } : null);
      return;
    }
    if (!user) return;
    const userDocRef = doc(db, 'users', user.uid);
    await updateDoc(userDocRef, data);
  };

  const value: FirebaseContextType = {
    user,
    profile,
    loading,
    signIn,
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
