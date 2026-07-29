import React, { createContext, useEffect, useState } from "react";
import {
  User,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  updateProfile,
} from "firebase/auth";
import { auth, isFirebaseConfigured } from "@/lib/firebase";

export interface AuthContextType {
  user: User | null;
  loading: boolean;
  isConfigured: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, displayName?: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateDisplayName: (name: string) => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isFirebaseConfigured || !auth) {
      setLoading(false);
      return;
    }
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const signIn = async (email: string, password: string) => {
    if (!auth) return;
    await signInWithEmailAndPassword(auth, email, password);
  };

  const signUp = async (email: string, password: string, displayName?: string) => {
    if (!auth) return;
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    if (displayName) {
      await updateProfile(cred.user, { displayName });
    }
  };

  const signOut = async () => {
    if (!auth) return;
    await firebaseSignOut(auth);
  };

  const updateDisplayName = async (name: string) => {
    if (user && auth) {
      await updateProfile(user, { displayName: name });
      setUser({ ...user, displayName: name } as User);
    }
  };

  return (
    <AuthContext.Provider
      value={{ user, loading, isConfigured: isFirebaseConfigured, signIn, signUp, signOut, updateDisplayName }}
    >
      {children}
    </AuthContext.Provider>
  );
}
