import { supabase } from "@/src/config/supabase";
import { Group, User } from "@/src/types/models";

export const GroupService = {
  getAllGroups: async (userId: string): Promise<Group[]> => {
    // First, get all groups the user belongs to
    const { data: userGroupsData, error: userGroupsError } = await supabase
      .from('group_members')
      .select('group_id')
      .eq('user_id', userId);
    
    if (userGroupsError) {
      console.error('Error fetching user groups:', userGroupsError);
      throw userGroupsError;
    }

    if (!userGroupsData || userGroupsData.length === 0) {
      return [];
    }

    const groupIds = userGroupsData.map((item: any) => item.group_id);

    // Fetch group details and all members for these groups in parallel
    const [groupsResult, membersResult] = await Promise.all([
      supabase
        .from('groups')
        .select('*')
        .in('group_id', groupIds),
      supabase
        .from('group_members')
        .select(`
          group_id,
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
        .in('group_id', groupIds),
    ]);

    if (groupsResult.error) {
      console.error('Error fetching groups:', groupsResult.error);
      throw groupsResult.error;
    }

    // Group members by group_id
    const membersByGroup: Record<string, any[]> = {};
    (membersResult.data || []).forEach((item: any) => {
      if (!membersByGroup[item.group_id]) {
        membersByGroup[item.group_id] = [];
      }
      if (item.users) {
        membersByGroup[item.group_id].push(item.users);
      }
    });

    // Transform to match Group interface
    return (groupsResult.data || []).map((group: any) => ({
      group_id: group.group_id,
      group_name: group.group_name,
      group_icon: group.group_icon || '',
      created_by: group.created_by,
      created_date: group.created_date,
      members: (membersByGroup[group.group_id] || []).map((u: any) => u.user_id),
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

  getGroupMembersBatch: async (group_ids: string[]): Promise<Record<string, User[]>> => {
    if (group_ids.length === 0) {
      return {};
    }

    // Batch fetch all group members for all groups in one query
    const { data, error } = await supabase
      .from('group_members')
      .select(`
        group_id,
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
      .in('group_id', group_ids);
    
    if (error) {
      console.error('Error fetching group members batch:', error);
      throw error;
    }

    // Group members by group_id
    const membersByGroup: Record<string, User[]> = {};
    
    (data || []).forEach((item: any) => {
      if (!membersByGroup[item.group_id]) {
        membersByGroup[item.group_id] = [];
      }
      if (item.users) {
        membersByGroup[item.group_id].push(item.users);
      }
    });

    return membersByGroup;
  },

  getAllGroupsWithMembers: async (userId: string): Promise<Array<Group & { membersData: User[] }>> => {
    // Step 1: Get all groups the user belongs to (with group details)
    const { data: userGroupsData, error: userGroupsError } = await supabase
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
    
    if (userGroupsError) {
      console.error('Error fetching user groups:', userGroupsError);
      throw userGroupsError;
    }

    if (!userGroupsData || userGroupsData.length === 0) {
      return [];
    }

    const groupIds = userGroupsData.map((item: any) => item.groups.group_id);

    // Step 2: Get all members for these groups in one query
    const { data: membersData, error: membersError } = await supabase
      .from('group_members')
      .select(`
        group_id,
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
      .in('group_id', groupIds);
    
    if (membersError) {
      console.error('Error fetching group members:', membersError);
      throw membersError;
    }

    // Group members by group_id
    const membersByGroup: Record<string, User[]> = {};
    (membersData || []).forEach((item: any) => {
      if (!membersByGroup[item.group_id]) {
        membersByGroup[item.group_id] = [];
      }
      if (item.users) {
        membersByGroup[item.group_id].push(item.users);
      }
    });

    // Transform to match Group interface with membersData
    return userGroupsData.map((item: any) => {
      const group = item.groups;
      return {
        group_id: group.group_id,
        group_name: group.group_name,
        group_icon: group.group_icon || '',
        created_by: group.created_by,
        created_date: group.created_date,
        members: (membersByGroup[group.group_id] || []).map((u: User) => u.user_id),
        membersData: membersByGroup[group.group_id] || [],
      };
    });
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