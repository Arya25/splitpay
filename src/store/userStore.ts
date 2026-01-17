import { onAuthStateChanged } from "firebase/auth";
import { create } from "zustand";
import { auth } from "../config/firebase";
import { User } from "../types/models";

type UserState = {
  currentUser: User | null;
  loading: boolean;
  initializeAuth: () => void;
  setMockUser: () => Promise<void>;
  logout: () => void;
};

export const useUserStore = create<UserState>((set) => ({
  currentUser: null,
  loading: true,

  initializeAuth: () => {
    try {
      onAuthStateChanged(auth, async (firebaseUser) => {
        if (firebaseUser) {
          const user: User = {
            user_id: firebaseUser.uid,
            user_name: firebaseUser.displayName || "User",
            phone: firebaseUser.phoneNumber || "",
            email: firebaseUser.email || "",
            profile_image_url: firebaseUser.photoURL || "",
            member_since: new Date().toISOString(),
          };

          // Sync Firebase user to Supabase
          try {
            const { supabase } = await import("../config/supabase");
            await supabase
              .from('users')
              .upsert({
                user_id: firebaseUser.uid,
                user_name: user.user_name,
                email: user.email,
                phone: user.phone,
                profile_image_url: user.profile_image_url,
              }, {
                onConflict: 'user_id',
                ignoreDuplicates: false,
              });
          } catch (error) {
            console.warn('Could not sync Firebase user to Supabase:', error);
            // Continue anyway
          }

          set({ currentUser: user, loading: false });
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
    const mockUser: User = {
      user_id: mockUserId,
      user_name: "Test User",
      phone: "9999999999",
      email: "test@example.com",
      profile_image_url: "",
      member_since: new Date().toISOString(),
    };

    // Sync mock user to Supabase (create if doesn't exist)
    try {
      const { supabase } = await import("../config/supabase");
      await supabase
        .from('users')
        .upsert({
          user_id: mockUserId,
          user_name: mockUser.user_name,
          email: mockUser.email,
          phone: mockUser.phone,
          profile_image_url: mockUser.profile_image_url,
        }, {
          onConflict: 'user_id',
          ignoreDuplicates: false,
        });
    } catch (error) {
      console.warn('Could not sync mock user to Supabase:', error);
      // Continue anyway - user might not have Supabase configured yet
    }

    set({ currentUser: mockUser, loading: false });
  },

  logout: () => {
    set({ currentUser: null });
  },
}));
