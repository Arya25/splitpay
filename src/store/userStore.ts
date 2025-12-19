import { create } from "zustand";
import { User } from "../types/models";
import { api } from "../api/mockClient";

type UserState = {
  currentUser: User | null;
  loading: boolean;
  fetchCurrentUser: () => Promise<void>;
};

export const useUserStore = create<UserState>((set) => ({
  currentUser: null,
  loading: false,

  fetchCurrentUser: async () => {
    set({ loading: true });
    const user = await api.getCurrentUser();
    set({ currentUser: user, loading: false });
  },
}));
