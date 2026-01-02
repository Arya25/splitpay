import groupsData from "../data/groups.json";
import { User, UserService } from "./userService";

export interface Group {
  group_id: string;
  created_by: string;
  created_date: string;
  group_name: string;
  group_icon: string;
  members: string[]; // list of user_ids
}

export const GroupService = {
  getAllGroups: async (): Promise<Group[]> => {
    return new Promise((resolve) => setTimeout(() => resolve(groupsData), 300));
  },

  getGroupById: async (group_id: string): Promise<Group | undefined> => {
    return new Promise((resolve) =>
      setTimeout(() => resolve(groupsData.find((g) => g.group_id === group_id)), 300)
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
