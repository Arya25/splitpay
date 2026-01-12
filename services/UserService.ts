import usersData from "../app/data/users.json";
import { User } from "../src/types/models";

export const UserService = {
  getAllUsers: async (): Promise<User[]> => {
    // Mimic network delay
    return new Promise((resolve) => setTimeout(() => resolve(usersData), 300));
  },

  getUserById: async (user_id: string): Promise<User | undefined> => {
    return new Promise((resolve) =>
      setTimeout(
        () => resolve(usersData.find((u) => u.user_id === user_id)),
        300
      )
    );
  },
};
