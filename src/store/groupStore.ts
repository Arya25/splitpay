import { create } from "zustand";
import { Group } from "../types/models";
import { api } from "../api/mockClient";

type GroupState = {
  groups: Group[];
  loading: boolean;
  fetchGroups: () => Promise<void>;
};

export const useGroupStore = create<GroupState>((set) => ({
  groups: [],
  loading: false,

  fetchGroups: async () => {
    set({ loading: true });
    const data = await api.getGroups();
    set({ groups: data, loading: false });
  },
}));
