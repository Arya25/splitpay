import { supabase } from "@/src/config/supabase";
import { User } from "@/src/types/models";

export const UserService = {
  getAllUsers: async (): Promise<User[]> => {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('user_name', { ascending: true });
    
    if (error) {
      console.error('Error fetching users:', error);
      throw error;
    }
    return data || [];
  },

  getUserById: async (user_id: string): Promise<User | undefined> => {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('user_id', user_id)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') {
        // No rows returned
        return undefined;
      }
      console.error('Error fetching user:', error);
      throw error;
    }
    return data || undefined;
  },

  createUser: async (user: Omit<User, 'user_id' | 'member_since'>): Promise<User> => {
    const { data, error } = await supabase
      .from('users')
      .insert({
        user_name: user.user_name,
        email: user.email,
        phone: user.phone,
        profile_image_url: user.profile_image_url,
      })
      .select()
      .single();
    
    if (error) {
      console.error('Error creating user:', error);
      throw error;
    }
    return data;
  },

  updateUser: async (user_id: string, updates: Partial<User>): Promise<User> => {
    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('user_id', user_id)
      .select()
      .single();
    
    if (error) {
      console.error('Error updating user:', error);
      throw error;
    }
    return data;
  },
};