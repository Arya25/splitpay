import { supabase } from "@/src/config/supabase";
import { Group, User } from "@/src/types/models";

export const GroupService = {
  getAllGroups: async (userId: string): Promise<Group[]> => {
    const { data, error } = await supabase
      .from('group_members')
      .select(`
        group_id,
        groups (
          group_id,
          group_name,
          group_icon,
          created_by,
          created_date
        )
      `)
      .eq('user_id', userId);
    
    if (error) {
      console.error('Error fetching groups:', error);
      throw error;
    }

    // Transform to match Group interface
    return (data || []).map((item: any) => ({
      group_id: item.groups.group_id,
      group_name: item.groups.group_name,
      group_icon: item.groups.group_icon || '',
      created_by: item.groups.created_by,
      created_date: item.groups.created_date,
      members: [], // Will be populated separately if needed
    }));
  },

  getGroupById: async (group_id: string): Promise<Group | undefined> => {
    const { data: groupData, error: groupError } = await supabase
      .from('groups')
      .select('*')
      .eq('group_id', group_id)
      .single();
    
    if (groupError) {
      if (groupError.code === 'PGRST116') {
        return undefined;
      }
      console.error('Error fetching group:', groupError);
      throw groupError;
    }

    const { data: membersData, error: membersError } = await supabase
      .from('group_members')
      .select('user_id')
      .eq('group_id', group_id);
    
    if (membersError) {
      console.error('Error fetching group members:', membersError);
      throw membersError;
    }

    return {
      ...groupData,
      members: (membersData || []).map((m: any) => m.user_id),
    };
  },

  getGroupMembers: async (group_id: string): Promise<User[]> => {
    const { data, error } = await supabase
      .from('group_members')
      .select(`
        user_id,
        users (
          user_id,
          user_name,
          email,
          phone,
          profile_image_url,
          member_since
        )
      `)
      .eq('group_id', group_id);
    
    if (error) {
      console.error('Error fetching group members:', error);
      throw error;
    }
    
    return (data || []).map((item: any) => item.users);
  },

  createGroup: async (group: Omit<Group, 'group_id' | 'created_date' | 'members'>, memberIds: string[]): Promise<Group> => {
    // Create group
    const { data: groupData, error: groupError } = await supabase
      .from('groups')
      .insert({
        group_name: group.group_name,
        group_icon: group.group_icon || '',
        created_by: group.created_by,
      })
      .select()
      .single();
    
    if (groupError) {
      console.error('Error creating group:', groupError);
      throw groupError;
    }

    // Add members
    if (memberIds.length > 0) {
      const membersToInsert = memberIds.map(user_id => ({
        group_id: groupData.group_id,
        user_id,
      }));

      const { error: membersError } = await supabase
        .from('group_members')
        .insert(membersToInsert);
      
      if (membersError) {
        console.error('Error adding group members:', membersError);
        throw membersError;
      }
    }

    return {
      ...groupData,
      members: memberIds,
    };
  },
};