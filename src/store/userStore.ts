import { onAuthStateChanged } from "firebase/auth";
import { create } from "zustand";
import { auth } from "../config/firebase";
import { User } from "../types/models";
import { UserService } from "../../services/UserService";

type UserState = {
  currentUser: User | null;
  loading: boolean;
  initializeAuth: () => void;
  setMockUser: () => Promise<void>;
  logout: () => void;
  setCurrentUser: (user: User) => void;
};

export const useUserStore = create<UserState>((set) => ({
  currentUser: null,
  loading: true,

  initializeAuth: () => {
    try {
      onAuthStateChanged(auth, async (firebaseUser) => {
        if (firebaseUser) {
          // First, sync Firebase user to Supabase
          try {
            const { supabase } = await import("../config/supabase");
            await supabase
              .from('users')
              .upsert({
                user_id: firebaseUser.uid,
                user_name: firebaseUser.displayName || "User",
                email: firebaseUser.email || "",
                phone: firebaseUser.phoneNumber || "",
                profile_image_url: firebaseUser.photoURL || "",
              }, {
                onConflict: 'user_id',
                ignoreDuplicates: false,
              });
          } catch (error) {
            console.warn('Could not sync Firebase user to Supabase:', error);
            // Continue anyway
          }

          // Fetch full user data from database (includes default_currency, upi_id, etc.)
          try {
            const dbUser = await UserService.getUserById(firebaseUser.uid);
            if (dbUser) {
              set({ currentUser: dbUser, loading: false });
            } else {
              // Fallback to Firebase data if database fetch fails
              const user: User = {
                user_id: firebaseUser.uid,
                user_name: firebaseUser.displayName || "User",
                phone: firebaseUser.phoneNumber || "",
                email: firebaseUser.email || "",
                profile_image_url: firebaseUser.photoURL || "",
                member_since: new Date().toISOString(),
                default_currency: "INR", // Default to INR
              };
              set({ currentUser: user, loading: false });
            }
          } catch (error) {
            console.warn('Could not fetch user from database, using Firebase data:', error);
            // Fallback to Firebase data
            const user: User = {
              user_id: firebaseUser.uid,
              user_name: firebaseUser.displayName || "User",
              phone: firebaseUser.phoneNumber || "",
              email: firebaseUser.email || "",
              profile_image_url: firebaseUser.photoURL || "",
              member_since: new Date().toISOString(),
              default_currency: "INR", // Default to INR
            };
            set({ currentUser: user, loading: false });
          }
        } else {
          set({ currentUser: null, loading: false });
        }
      });
    } catch (error) {
      // Firebase auth not available or misconfigured - allow development with mock user
      console.warn('Firebase auth initialization failed, you can use mock user for development:', error);
      set({ currentUser: null, loading: false });
    }
  },

  setMockUser: async () => {
    // Use a valid UUID format for mock user
    const mockUserId = "00000000-0000-0000-0000-000000000001";
    
    // Sync mock user to Supabase (create if doesn't exist)
    try {
      const { supabase } = await import("../config/supabase");
      await supabase
        .from('users')
        .upsert({
          user_id: mockUserId,
          user_name: "Test User",
          email: "test@example.com",
          phone: "9999999999",
          profile_image_url: "",
          default_currency: "INR", // Default to INR
        }, {
          onConflict: 'user_id',
          ignoreDuplicates: false,
        });

      // Fetch full user data from database
      const dbUser = await UserService.getUserById(mockUserId);
      if (dbUser) {
        set({ currentUser: dbUser, loading: false });
        return;
      }
    } catch (error) {
      console.warn('Could not sync mock user to Supabase:', error);
      // Continue anyway - user might not have Supabase configured yet
    }

    // Fallback if database fetch fails
    const mockUser: User = {
      user_id: mockUserId,
      user_name: "Test User",
      phone: "9999999999",
      email: "test@example.com",
      profile_image_url: "",
      member_since: new Date().toISOString(),
      default_currency: "INR", // Default to INR
    };
    set({ currentUser: mockUser, loading: false });
  },

  logout: () => {
    set({ currentUser: null });
  },

  setCurrentUser: (user: User) => {
    set({ currentUser: user });
  },
}));
