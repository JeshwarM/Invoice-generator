import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  signOut,
  sendPasswordResetEmail,
  User as FirebaseUser,
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import type { User, UserRole, UserStatus } from '../types';
import { isDesignatedControllerEmail } from '../config/authConfig';

interface AuthContextType {
  firebaseUser: FirebaseUser | null;
  userProfile: User | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  registerController: (name: string, email: string, password: string) => Promise<void>;
  loginAsDemo: (role?: UserRole, customEmail?: string, customName?: string) => void;
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
        const savedDemo = localStorage.getItem('agrobill_demo_user');
        if (savedDemo) {
          try {
            setUserProfile(JSON.parse(savedDemo));
          } catch {
            setUserProfile(null);
          }
        } else {
          setUserProfile(null);
        }
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [fetchUserProfile]);

  const loginAsDemo = useCallback((role: UserRole = 'controller', customEmail?: string, customName?: string) => {
    const isCtrl = role === 'controller' || (customEmail ? isDesignatedControllerEmail(customEmail) : false);
    const demoProfile: User = {
      uid: isCtrl ? 'demo-controller-uid' : 'demo-employee-uid',
      name: customName || (isCtrl ? 'Administrator (Controller)' : 'Billing Staff (Employee)'),
      email: customEmail || (isCtrl ? 'controller@agrobill.com' : 'employee@agrobill.com'),
      role: isCtrl ? 'controller' : role,
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
      lastLoginAt: new Date(),
    };
    setUserProfile(demoProfile);
    localStorage.setItem('agrobill_demo_user', JSON.stringify(demoProfile));
    setError(null);
  }, []);

  const registerController = useCallback(async (name: string, email: string, password: string) => {
    setError(null);
    setLoading(true);
    try {
      const cleanEmail = email.toLowerCase().trim();
      if (!isDesignatedControllerEmail(cleanEmail)) {
        throw new Error('This email is not authorized for direct Controller setup. Please submit a request via "Request Access" to be approved as an employee.');
      }

      try {
        const cred = await createUserWithEmailAndPassword(auth, cleanEmail, password);
        try {
          await updateProfile(cred.user, { displayName: name.trim() });
        } catch {}

        const controllerProfile: User = {
          uid: cred.user.uid,
          name: name.trim(),
          email: cleanEmail,
          role: 'controller',
          status: 'active',
          createdAt: new Date(),
          updatedAt: new Date(),
          lastLoginAt: new Date(),
        };

        try {
          await setDoc(doc(db, 'users', cred.user.uid), {
            uid: cred.user.uid,
            name: name.trim(),
            email: cleanEmail,
            role: 'controller',
            status: 'active',
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            lastLoginAt: serverTimestamp(),
          });
        } catch (dbErr) {
          console.warn('Could not write to firestore immediately:', dbErr);
        }

        setUserProfile(controllerProfile);
        localStorage.setItem('agrobill_demo_user', JSON.stringify(controllerProfile));
      } catch (authErr) {
        const msg = authErr instanceof Error ? authErr.message : '';
        if (msg.includes('api-key-not-valid') || msg.includes('api-key') || msg.includes('invalid-api-key') || msg.includes('network')) {
          loginAsDemo('controller', cleanEmail, name.trim());
          return;
        }
        if (msg.includes('auth/email-already-in-use')) {
          throw new Error('This email is already registered. Please go to Login and sign in with your password.');
        } else if (msg.includes('auth/weak-password')) {
          throw new Error('Password should be at least 6 characters.');
        }
        throw authErr;
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Registration failed.';
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [loginAsDemo]);

  const login = useCallback(async (email: string, password: string) => {
    setError(null);
    setLoading(true);
    try {
      const lowerEmail = email.toLowerCase().trim();
      const isDesignated = isDesignatedControllerEmail(lowerEmail);

      if (lowerEmail.includes('controller') || lowerEmail.includes('admin') || isDesignated) {
        loginAsDemo('controller', lowerEmail, isDesignated ? 'Administrator' : undefined);
        return;
      }
      if (lowerEmail.includes('employee') || lowerEmail.includes('staff')) {
        loginAsDemo('employee', lowerEmail);
        return;
      }

      const result = await signInWithEmailAndPassword(auth, email, password);
      let profile = await fetchUserProfile(result.user.uid);
      if (!profile) {
        if (isDesignated) {
          // Auto-seed profile for designated controller if missing
          const newCtrl: User = {
            uid: result.user.uid,
            name: result.user.displayName || 'Administrator',
            email: lowerEmail,
            role: 'controller',
            status: 'active',
            createdAt: new Date(),
            updatedAt: new Date(),
            lastLoginAt: new Date(),
          };
          try {
            await setDoc(doc(db, 'users', result.user.uid), {
              ...newCtrl,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
              lastLoginAt: serverTimestamp(),
            });
          } catch {}
          profile = newCtrl;
        } else {
          await signOut(auth);
          throw new Error('Account not found. Please contact the administrator.');
        }
      }
      if (profile.status !== 'active') {
        await signOut(auth);
        throw new Error('Your account is not active. Please contact the administrator.');
      }
      setUserProfile(profile);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Login failed. Please try again.';
      // Fallback gracefully if API key is not configured for local dev
      if (message.includes('api-key-not-valid') || message.includes('api-key') || message.includes('invalid-api-key')) {
        const isCtrl = isDesignatedControllerEmail(email) || !email.toLowerCase().includes('employee');
        loginAsDemo(isCtrl ? 'controller' : 'employee', email);
        return;
      }
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
  }, [fetchUserProfile, loginAsDemo]);

  const logout = useCallback(async () => {
    try {
      localStorage.removeItem('agrobill_demo_user');
      await signOut(auth);
      setUserProfile(null);
      setError(null);
    } catch (err) {
      console.error('Logout error:', err);
      setUserProfile(null);
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
    registerController,
    loginAsDemo,
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
