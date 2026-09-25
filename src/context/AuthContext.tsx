import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  User as FirebaseUser,
} from 'firebase/auth';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import type { User, UserRole, UserStatus } from '../types';

interface AuthContextType {
  firebaseUser: FirebaseUser | null;
  userProfile: User | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  isController: boolean;
  isEmployee: boolean;
  isActive: boolean;
  hasRole: (roles: UserRole[]) => boolean;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => setError(null), []);

  // Fetch user profile from Firestore
  const fetchUserProfile = useCallback(async (uid: string): Promise<User | null> => {
    try {
      const userDoc = await getDoc(doc(db, 'users', uid));
      if (userDoc.exists()) {
        const data = userDoc.data();
        return {
          uid: data.uid,
          name: data.name,
          email: data.email,
          role: data.role as UserRole,
          status: data.status as UserStatus,
          createdAt: data.createdAt?.toDate?.() || new Date(),
          updatedAt: data.updatedAt?.toDate?.() || new Date(),
          lastLoginAt: data.lastLoginAt?.toDate?.() || null,
        };
      }
      return null;
    } catch (err) {
      console.error('Error fetching user profile:', err);
      return null;
    }
  }, []);

  // Listen to auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (user) {
        const profile = await fetchUserProfile(user.uid);
        if (profile) {
          if (profile.status !== 'active') {
            // User account is not active — sign them out
            setUserProfile(null);
            setError('Your account is not active. Please contact the administrator.');
            await signOut(auth);
          } else {
            setUserProfile(profile);
            // Update last login time
            try {
              await updateDoc(doc(db, 'users', user.uid), {
                lastLoginAt: serverTimestamp(),
              });
            } catch {
              // Non-critical — user may not have write permission to their own doc
            }
          }
        } else {
          setUserProfile(null);
          setError('Account not found. Please contact the administrator.');
          await signOut(auth);
        }
      } else {
        setUserProfile(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [fetchUserProfile]);

  const login = useCallback(async (email: string, password: string) => {
    setError(null);
    setLoading(true);
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      const profile = await fetchUserProfile(result.user.uid);
      if (!profile) {
        await signOut(auth);
        throw new Error('Account not found. Please contact the administrator.');
      }
      if (profile.status !== 'active') {
        await signOut(auth);
        throw new Error('Your account is not active. Please contact the administrator.');
      }
      setUserProfile(profile);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Login failed. Please try again.';
      // Map Firebase error codes to user-friendly messages
      if (message.includes('auth/invalid-credential') || message.includes('auth/wrong-password') || message.includes('auth/user-not-found')) {
        setError('Invalid email or password.');
      } else if (message.includes('auth/too-many-requests')) {
        setError('Too many failed attempts. Please try again later.');
      } else if (message.includes('auth/network-request-failed')) {
        setError('Network error. Please check your connection.');
      } else {
        setError(message);
      }
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchUserProfile]);

  const logout = useCallback(async () => {
    try {
      await signOut(auth);
      setUserProfile(null);
      setError(null);
    } catch (err) {
      console.error('Logout error:', err);
      setError('Failed to log out. Please try again.');
    }
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    setError(null);
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to send reset email.';
      if (message.includes('auth/user-not-found')) {
        // Don't reveal whether email exists
        return;
      }
      setError('Failed to send password reset email. Please try again.');
      throw err;
    }
  }, []);

  const isController = userProfile?.role === 'controller';
  const isEmployee = userProfile?.role === 'employee';
  const isActive = userProfile?.status === 'active';

  const hasRole = useCallback(
    (roles: UserRole[]) => {
      if (!userProfile) return false;
      return roles.includes(userProfile.role);
    },
    [userProfile]
  );

  const value: AuthContextType = {
    firebaseUser,
    userProfile,
    loading,
    error,
    login,
    logout,
    resetPassword,
    isController,
    isEmployee,
    isActive,
    hasRole,
    clearError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;
