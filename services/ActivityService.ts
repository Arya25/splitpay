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
    // Get all groups user is a member of (for group target filtering)
    const { data: userGroups } = await supabase
      .from('group_members')
      .select('group_id')
      .eq('user_id', user_id);

    const groupIds = (userGroups || []).map((g: any) => g.group_id);

    // Get activity IDs where user is involved via activity_targets
    const targetQueries: Promise<any>[] = [];

    // Activities where user is a direct target
    targetQueries.push(
      supabase
        .from('activity_targets')
        .select('activity_id')
        .eq('target_type', 'user')
        .eq('target_id', user_id)
    );

    // Activities where user's groups are targets (if user is in any groups)
    if (groupIds.length > 0) {
      targetQueries.push(
        supabase
          .from('activity_targets')
          .select('activity_id')
          .eq('target_type', 'group')
          .in('target_id', groupIds)
      );
    }

    const targetResults = await Promise.all(targetQueries);
    
    // Collect all activity IDs from targets
    const targetActivityIds = new Set<string>();
    targetResults.forEach((result) => {
      if (result.data) {
        result.data.forEach((item: any) => {
          targetActivityIds.add(item.activity_id);
        });
      }
    });

    // Fetch activities where:
    // 1. User is the actor (created the expense/settlement)
    // 2. Activity ID is in targetActivityIds (user is a target)
    const activityQueries: Promise<any>[] = [];

    // Activities where user is the actor
    activityQueries.push(
      supabase
        .from('activities')
        .select('*')
        .eq('actor_user_id', user_id)
    );

    // Activities where user is a target
    if (targetActivityIds.size > 0) {
      activityQueries.push(
        supabase
          .from('activities')
          .select('*')
          .in('activity_id', Array.from(targetActivityIds))
      );
    }

    const results = await Promise.all(activityQueries);

    // Combine and deduplicate activities
    const activityMap = new Map<string, any>();
    
    results.forEach((result) => {
      if (result.data) {
        result.data.forEach((activity: any) => {
          // Remove activity_targets from the activity object (it was just for filtering)
          const { activity_targets, ...cleanActivity } = activity;
          if (!activityMap.has(cleanActivity.activity_id)) {
            activityMap.set(cleanActivity.activity_id, cleanActivity);
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
      // Batch fetch expenses, participants, and payers
      const [expensesResult, participantsResult, payersResult] = await Promise.all([
        supabase
          .from('expenses')
          .select('*')
          .in('expense_id', expenseIdsToFetch),
        supabase
          .from('expense_participants')
          .select('*')
          .in('expense_id', expenseIdsToFetch),
        supabase
          .from('expense_payers')
          .select('*')
          .in('expense_id', expenseIdsToFetch),
      ]);

      const expensesData = expensesResult.data || [];
      const allParticipants = participantsResult.data || [];
      const allPayers = payersResult.data || [];

      // Group participants and payers by expense_id
      const participantsByExpense: Record<string, any[]> = {};
      const payersByExpense: Record<string, any[]> = {};

      allParticipants.forEach((participant: any) => {
        if (!participantsByExpense[participant.expense_id]) {
          participantsByExpense[participant.expense_id] = [];
        }
        participantsByExpense[participant.expense_id].push(participant);
      });

      allPayers.forEach((payer: any) => {
        if (!payersByExpense[payer.expense_id]) {
          payersByExpense[payer.expense_id] = [];
        }
        payersByExpense[payer.expense_id].push(payer);
      });

      // Map expenses with their participants and payers
      const expensesWithDetails = expensesData.map((expense: any) => ({
        ...expense,
        scopes: expense.scopes || [],
        participants: participantsByExpense[expense.expense_id] || [],
        payers: payersByExpense[expense.expense_id] || [],
      }));

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
