import { create } from "zustand";
import { Group } from "../types/models";
import { GroupService } from "../../services/GroupService";
import { useUserStore } from "./userStore";

type GroupState = {
  groups: Group[];
  loading: boolean;
  fetchGroups: () => Promise<void>;
};

export const useGroupStore = create<GroupState>((set) => ({
  groups: [],
  loading: false,

  fetchGroups: async () => {
    const currentUser = useUserStore.getState().currentUser;
    if (!currentUser) {
      console.warn('Cannot fetch groups: No user logged in');
      set({ groups: [], loading: false });
      return;
    }

    set({ loading: true });
    try {
      const data = await GroupService.getAllGroups(currentUser.user_id);
      set({ groups: data, loading: false });
    } catch (error) {
      console.error('Error fetching groups:', error);
      set({ groups: [], loading: false });
    }
  },
}));
