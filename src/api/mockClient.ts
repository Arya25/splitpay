import { Expense, Group, User } from "../types/models";
import { GroupService } from "../../services/GroupService";
import { UserService } from "../../services/UserService";

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const api = {
  getCurrentUser: async (): Promise<User> => {
    await delay(300);
    const users = await UserService.getAllUsers();
    return users[0];
  },

  getGroups: async (userId: string): Promise<Group[]> => {
    await delay(300);
    return GroupService.getAllGroups(userId);
  },

  getGroupExpenses: async (groupId: string): Promise<Expense[]> => {
    await delay(300);
    // Mock expenses - will be replaced with actual service later
    return [];
  },

  getBalances: async (): Promise<any[]> => {
    await delay(300);
    // Mock balances - will be replaced with actual service later
    return [];
  },

  getActivity: async (): Promise<any[]> => {
    await delay(300);
    // Mock activities - will be replaced with actual service later
    return [];
  },
};
