import { supabase } from "@/src/config/supabase";
import { Expense, User } from "../src/types/models";

export interface ActivityExpense {
  activity_id: string;
  activity_type: "EXPENSE";
  expense_id: string;
  group_id: string | null;
  created_at: string;
  expense?: Expense;
  group?: {
    group_id: string;
    group_name: string;
    group_icon: string;
  };
}

export interface ActivitySettlement {
  activity_id: string;
  activity_type: "SETTLEMENT";
  from_user_id: string;
  to_user_id: string;
  amount: number;
  status: "SUCCESS" | "FAILED";
  created_at: string;
  from_user?: User;
  to_user?: User;
}

export type Activity = ActivityExpense | ActivitySettlement;

export const ActivityService = {
  getUserActivities: async (user_id: string): Promise<Activity[]> => {
    // Get all activities where user is involved:
    // 1. Expenses user created
    // 2. Expenses user is a participant in
    // 3. Expenses user is a payer in
    // 4. Expenses in groups user is a member of

    // First, get all groups user is a member of
    const { data: userGroups, error: groupsError } = await supabase
      .from('group_members')
      .select('group_id')
      .eq('user_id', user_id);

    if (groupsError) {
      console.error('Error fetching user groups:', groupsError);
    }

    const groupIds = (userGroups || []).map((g: any) => g.group_id);

    // Get all expense IDs where user is involved
    const [participantResult, payerResult, createdResult] = await Promise.all([
      supabase
        .from('expense_participants')
        .select('expense_id')
        .eq('user_id', user_id),
      supabase
        .from('expense_payers')
        .select('expense_id')
        .eq('user_id', user_id),
      supabase
        .from('expenses')
        .select('expense_id')
        .eq('created_by', user_id),
    ]);

    // Collect all unique expense IDs
    const expenseIds = new Set<string>();
    
    (participantResult.data || []).forEach((item: any) => {
      expenseIds.add(item.expense_id);
    });
    
    (payerResult.data || []).forEach((item: any) => {
      expenseIds.add(item.expense_id);
    });
    
    (createdResult.data || []).forEach((item: any) => {
      expenseIds.add(item.expense_id);
    });

    // Get activities for:
    // 1. Expenses user is involved in
    // 2. Expenses in groups user is a member of
    const activityQueries: Promise<any>[] = [];

    // Activities for expenses user is directly involved in
    if (expenseIds.size > 0) {
      activityQueries.push(
        supabase
          .from('activities')
          .select('*')
          .eq('activity_type', 'EXPENSE')
          .in('expense_id', Array.from(expenseIds))
      );
    }

    // Activities for expenses in groups user is a member of
    if (groupIds.length > 0) {
      activityQueries.push(
        supabase
          .from('activities')
          .select('*')
          .eq('activity_type', 'EXPENSE')
          .in('group_id', groupIds)
      );
    }

    // Activities for settlements (if any)
    activityQueries.push(
      supabase
        .from('activities')
        .select('*')
        .eq('activity_type', 'SETTLEMENT')
        .or(`from_user_id.eq.${user_id},to_user_id.eq.${user_id}`)
    );

    const results = await Promise.all(activityQueries);

    // Combine and deduplicate activities
    const activityMap = new Map<string, any>();
    
    results.forEach((result) => {
      if (result.data) {
        result.data.forEach((activity: any) => {
          if (!activityMap.has(activity.activity_id)) {
            activityMap.set(activity.activity_id, activity);
          }
        });
      }
    });

    const activities = Array.from(activityMap.values());

    // Fetch expense details for EXPENSE activities
    const expenseActivities = activities.filter((a: any) => a.activity_type === 'EXPENSE');
    const expenseIdsToFetch = expenseActivities
      .map((a: any) => a.expense_id)
      .filter((id: string) => id);

    if (expenseIdsToFetch.length > 0) {
      const { data: expensesData } = await supabase
        .from('expenses')
        .select('*')
        .in('expense_id', expenseIdsToFetch);

      // Fetch participants and payers for each expense
      const expensesWithDetails = await Promise.all(
        (expensesData || []).map(async (expense: any) => {
          const [participantsResult, payersResult] = await Promise.all([
            supabase
              .from('expense_participants')
              .select('*')
              .eq('expense_id', expense.expense_id),
            supabase
              .from('expense_payers')
              .select('*')
              .eq('expense_id', expense.expense_id),
          ]);

          return {
            ...expense,
            scopes: expense.scopes || [],
            participants: participantsResult.data || [],
            payers: payersResult.data || [],
          };
        })
      );

      // Attach expense details to activities
      expenseActivities.forEach((activity: any) => {
        const expense = expensesWithDetails.find(
          (e: any) => e.expense_id === activity.expense_id
        );
        if (expense) {
          activity.expense = expense;
        }
      });
    }

    // Fetch group details for activities with group_id
    const groupIdsToFetch = activities
      .filter((a: any) => a.group_id)
      .map((a: any) => a.group_id)
      .filter((id: string, index: number, self: string[]) => self.indexOf(id) === index);

    if (groupIdsToFetch.length > 0) {
      const { data: groupsData } = await supabase
        .from('groups')
        .select('group_id, group_name, group_icon')
        .in('group_id', groupIdsToFetch);

      // Attach group details to activities
      activities.forEach((activity: any) => {
        if (activity.group_id) {
          const group = groupsData?.find((g: any) => g.group_id === activity.group_id);
          if (group) {
            activity.group = group;
          }
        }
      });
    }

    // Fetch user details for SETTLEMENT activities
    const settlementActivities = activities.filter((a: any) => a.activity_type === 'SETTLEMENT');
    const userIdsToFetch = new Set<string>();
    settlementActivities.forEach((activity: any) => {
      if (activity.from_user_id) userIdsToFetch.add(activity.from_user_id);
      if (activity.to_user_id) userIdsToFetch.add(activity.to_user_id);
    });

    if (userIdsToFetch.size > 0) {
      const { data: usersData } = await supabase
        .from('users')
        .select('user_id, user_name, profile_image_url')
        .in('user_id', Array.from(userIdsToFetch));

      // Attach user details to activities
      settlementActivities.forEach((activity: any) => {
        if (activity.from_user_id) {
          const user = usersData?.find((u: any) => u.user_id === activity.from_user_id);
          if (user) {
            activity.from_user = user;
          }
        }
        if (activity.to_user_id) {
          const user = usersData?.find((u: any) => u.user_id === activity.to_user_id);
          if (user) {
            activity.to_user = user;
          }
        }
      });
    }

    // Sort by created_at descending (newest first)
    return activities.sort((a: any, b: any) => {
      const dateA = new Date(a.created_at).getTime();
      const dateB = new Date(b.created_at).getTime();
      return dateB - dateA;
    });
  },
};
