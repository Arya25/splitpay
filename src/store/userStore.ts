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
          user_id: firebaseUser.uid,
          user_name: firebaseUser.displayName || "User",
          phone: firebaseUser.phoneNumber || "",
          email: firebaseUser.email || "",
          profile_image_url: firebaseUser.photoURL || "",
          member_since: new Date().toISOString(),
        };
        set({ currentUser: user, loading: false });
      } else {
        set({ currentUser: null, loading: false });
      }
    });
  },

  setMockUser: () => {
    const mockUser: User = {
      user_id: "mock-phone-user",
      user_name: "Test User",
      phone: "9999999999",
      email: "test@example.com",
      profile_image_url: "",
      member_since: new Date().toISOString(),
    };

    set({ currentUser: mockUser, loading: false });
  },

  logout: () => {
    set({ currentUser: null });
  },
}));
