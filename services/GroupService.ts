import groupsData from "../app/data/groups.json";
import { Group } from "../src/types/models";
import { User, UserService } from "./UserService";

export const GroupService = {
  getAllGroups: async (): Promise<Group[]> => {
    return new Promise((resolve) => setTimeout(() => resolve(groupsData), 300));
  },

  getGroupById: async (group_id: string): Promise<Group | undefined> => {
    return new Promise((resolve) =>
      setTimeout(
        () => resolve(groupsData.find((g) => g.group_id === group_id)),
        300
      )
    );
  },

  // Expand group members into full user objects
  getGroupMembers: async (group_id: string): Promise<User[]> => {
    const group = groupsData.find((g) => g.group_id === group_id);
    if (!group) return [];
    const allUsers = await UserService.getAllUsers();
    return allUsers.filter((u) => group.members.includes(u.user_id));
  },
};
