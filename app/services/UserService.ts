import usersData from "../data/users.json";

export interface User {
  user_id: string;
  member_since: string;
  phone: string;
  email: string;
  profile_image_url: string;
  user_name: string;
}

export const UserService = {
  getAllUsers: async (): Promise<User[]> => {
    // Mimic network delay
    return new Promise((resolve) => setTimeout(() => resolve(usersData), 300));
  },

  getUserById: async (user_id: string): Promise<User | undefined> => {
    return new Promise((resolve) =>
      setTimeout(() => resolve(usersData.find((u) => u.user_id === user_id)), 300)
    );
  },
};
