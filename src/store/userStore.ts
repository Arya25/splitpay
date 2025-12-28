import { onAuthStateChanged } from 'firebase/auth';
import { create } from "zustand";
import { auth } from '../config/firebase';
import { User } from "../types/models";

type UserState = {
  currentUser: User | null;
  loading: boolean;
  initializeAuth: () => void;
};

export const useUserStore = create<UserState>((set, get) => ({
  currentUser: null,
  loading: true,

  initializeAuth: () => {
    onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        // Convert Firebase user to our User type
        const user: User = {
          id: firebaseUser.uid,
          name: firebaseUser.displayName || 'User',
          phoneNumber: firebaseUser.phoneNumber || '',
          upiVpa: '', // You can add this later from user profile
        };
        set({ currentUser: user, loading: false });
      } else {
        set({ currentUser: null, loading: false });
      }
    });
  },
}));
