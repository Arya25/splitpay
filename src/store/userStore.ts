import { onAuthStateChanged } from "firebase/auth";
import { create } from "zustand";
import { auth } from "../config/firebase";
import { User } from "../types/models";

type UserState = {
  currentUser: User | null;
  loading: boolean;
  initializeAuth: () => void;
  setMockUser: () => void;
  logout: () => void;
};

export const useUserStore = create<UserState>((set) => ({
  currentUser: null,
  loading: true,

  initializeAuth: () => {
    onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        const user: User = {
          id: firebaseUser.uid,
          name: firebaseUser.displayName || "User",
          phoneNumber: firebaseUser.phoneNumber || "",
          upiVpa: "",
        };
        set({ currentUser: user, loading: false });
      } else {
        set({ currentUser: null, loading: false });
      }
    });
  },

  setMockUser: () => {
    const mockUser: User = {
      id: "mock-phone-user",
      name: "Test User",
      phoneNumber: "9999999999",
      upiVpa: "",
    };

    set({ currentUser: mockUser, loading: false });
  },

  logout: () => {
    set({ currentUser: null });
  },
}));
