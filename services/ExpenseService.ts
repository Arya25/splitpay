import { supabase } from "@/src/config/supabase";
import {
  Expense
} from '../src/types/models';
import { GroupService } from './GroupService';

export const ExpenseService = {
  addExpense: async (expense: Omit<Expense, 'expense_id' | 'created_at' | 'updated_at'>): Promise<Expense> => {
    // Insert expense with scopes as JSONB
    const { data: expenseData, error: expenseError } = await supabase
      .from('expenses')
      .insert({
        amount: expense.amount,
        description: expense.description,
        currency: expense.currency,
        created_by: expense.created_by,
        split_type: expense.split_type,
        scopes: expense.scopes, // Store as JSONB array
      })
      .select()
      .single();
    
    if (expenseError) {
      console.error('Error creating expense:', expenseError);
      throw expenseError;
    }

    // Insert participants
    if (expense.participants && expense.participants.length > 0) {
      const participantsToInsert = expense.participants.map(participant => ({
        expense_id: expenseData.expense_id,
        user_id: participant.user_id,
        amount_owed: participant.amount_owed || null,
        percentage: participant.percentage || null,
      }));

      const { error: participantsError } = await supabase
        .from('expense_participants')
        .insert(participantsToInsert);
      
      if (participantsError) {
        console.error('Error creating expense participants:', participantsError);
        throw participantsError;
      }
    }

    // Insert payers
    if (expense.payers.length > 0) {
      const payersToInsert = expense.payers.map(payer => ({
        expense_id: expenseData.expense_id,
        user_id: payer.user_id,
        amount_paid: payer.amount_paid,
      }));

      const { error: payersError } = await supabase
        .from('expense_payers')
        .insert(payersToInsert);
      
      if (payersError) {
        console.error('Error creating expense payers:', payersError);
        throw payersError;
      }
    }

    // Create activity entry for the expense with actor_user_id and targets
    // Find group_id from scopes if expense is for a group
    const groupScope = expense.scopes.find((scope) => scope.type === "group");
    const groupId = groupScope ? groupScope.id : null;

    // Insert activity with actor_user_id (the expense creator)
    const { data: activityData, error: activityError } = await supabase
      .from('activities')
      .insert({
        activity_type: 'EXPENSE',
        expense_id: expenseData.expense_id,
        group_id: groupId || null,
        actor_user_id: expense.created_by, // Who created the expense
      })
      .select()
      .single();

    if (activityError) {
      console.error('Error creating activity entry:', activityError);
      // Don't throw - activity is not critical, expense is already saved
    } else if (activityData) {
      // Create activity targets for all involved users and groups
      const targetsToInsert: Array<{ activity_id: string; target_type: 'user' | 'group'; target_id: string }> = [];

      // Add all participants as targets
      if (expense.participants && expense.participants.length > 0) {
        expense.participants.forEach((participant) => {
          targetsToInsert.push({
            activity_id: activityData.activity_id,
            target_type: 'user',
            target_id: participant.user_id,
          });
        });
      }

      // Add all payers as targets
      if (expense.payers.length > 0) {
        expense.payers.forEach((payer) => {
          // Avoid duplicates if payer is also a participant
          if (!targetsToInsert.some(t => t.target_type === 'user' && t.target_id === payer.user_id)) {
            targetsToInsert.push({
              activity_id: activityData.activity_id,
              target_type: 'user',
              target_id: payer.user_id,
            });
          }
        });
      }

      // Add group as target if expense is for a group
      if (groupId) {
        targetsToInsert.push({
          activity_id: activityData.activity_id,
          target_type: 'group',
          target_id: groupId,
        });
      }

      // Batch insert all targets
      if (targetsToInsert.length > 0) {
        const { error: targetsError } = await supabase
          .from('activity_targets')
          .insert(targetsToInsert);

        if (targetsError) {
          console.error('Error creating activity targets:', targetsError);
          // Don't throw - targets are not critical
        }
      }
    }

    return {
      ...expenseData,
      scopes: expense.scopes,
      participants: expense.participants,
      payers: expense.payers,
    };
  },

  getExpensesByGroup: async (group_id: string): Promise<Expense[]> => {
    // Get expenses that have this group in their scopes (using JSONB query)
    // Query: scopes contains an object with type='group' and id=group_id
    const { data, error } = await supabase
      .from('expenses')
      .select('*')
      .filter('scopes', 'cs', `[{"type":"group","id":"${group_id}"}]`);
    
    if (error) {
      console.error('Error fetching group expenses:', error);
      throw error;
    }

    // Fetch participants and payers for each expense
    const expensesWithDetails = await Promise.all(
      (data || []).map(async (expense: any) => {
        // Fetch participants
        const { data: participantsData } = await supabase
          .from('expense_participants')
          .select('*')
          .eq('expense_id', expense.expense_id);

        // Fetch payers
        const { data: payersData } = await supabase
          .from('expense_payers')
          .select('*')
          .eq('expense_id', expense.expense_id);

        return {
          ...expense,
          scopes: expense.scopes || [], // Ensure scopes is an array
          participants: participantsData || [],
          payers: payersData || [],
        };
      })
    );

    return expensesWithDetails;
  },

  getUserExpenses: async (user_id: string): Promise<Expense[]> => {
    // Get all expense IDs where user is involved (as participant or payer)
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

    if (expenseIds.size === 0) {
      return [];
    }

    const expenseIdsArray = Array.from(expenseIds);

    // Fetch all expenses, participants, and payers in parallel (batch fetch)
    const [expensesResult, participantsResult, payersResult] = await Promise.all([
      supabase
        .from('expenses')
        .select('*')
        .in('expense_id', expenseIdsArray),
      supabase
        .from('expense_participants')
        .select('*')
        .in('expense_id', expenseIdsArray),
      supabase
        .from('expense_payers')
        .select('*')
        .in('expense_id', expenseIdsArray),
    ]);

    if (expensesResult.error) {
      console.error('Error fetching user expenses:', expensesResult.error);
      throw expensesResult.error;
    }

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

    // Sort by created_at descending (newest first)
    return expensesWithDetails.sort((a, b) => {
      const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
      return dateB - dateA;
    });
  },

  calculateUserBalance: async (user_id: string): Promise<{ totalOwed: number; totalOwedTo: number; netBalance: number }> => {
    const expenses = await ExpenseService.getUserExpenses(user_id);
    
    let totalOwed = 0; // Money user owes to others
    let totalOwedTo = 0; // Money others owe to user

    expenses.forEach((expense) => {
      // Calculate what user paid
      const userPaid = expense.payers
        .filter((p) => p.user_id === user_id)
        .reduce((sum, p) => sum + Number(p.amount_paid), 0);

      // Calculate what user owes
      const userOwed = expense.participants
        ?.filter((p) => p.user_id === user_id)
        .reduce((sum, p) => sum + Number(p.amount_owed || 0), 0) || 0;

      // Net for this expense
      const net = userPaid - userOwed;

      if (net > 0) {
        // User paid more than owed, others owe user
        totalOwedTo += net;
      } else if (net < 0) {
        // User owes more than paid
        totalOwed += Math.abs(net);
      }
    });

    const netBalance = totalOwedTo - totalOwed;

    return {
      totalOwed: Math.round(totalOwed * 100) / 100,
      totalOwedTo: Math.round(totalOwedTo * 100) / 100,
      netBalance: Math.round(netBalance * 100) / 100,
    };
  },

  getUserBalancesByPerson: async (user_id: string): Promise<Array<{ user_id: string; amount: number; currency: string }>> => {
    const expenses = await ExpenseService.getUserExpenses(user_id);
    
    // Map to store balances per person: { user_id: { amount: number, currency: string } }
    const balancesMap: Record<string, { amount: number; currency: string }> = {};

    expenses.forEach((expense) => {
      // Skip group expenses - they will be handled separately
      const hasGroupScope = expense.scopes?.some((scope) => scope.type === "group");
      if (hasGroupScope) {
        return;
      }

      const currency = expense.currency || "INR";
      
      // Calculate what current user paid
      const userPaid = expense.payers
        .filter((p) => p.user_id === user_id)
        .reduce((sum, p) => sum + Number(p.amount_paid), 0);

      // Calculate what current user owes
      const userOwed = expense.participants
        ?.filter((p) => p.user_id === user_id)
        .reduce((sum, p) => sum + Number(p.amount_owed || 0), 0) || 0;

      // Net amount for this expense (positive if user paid more, negative if user owes more)
      const netForUser = userPaid - userOwed;

      if (netForUser > 0) {
        // User paid more than owed - distribute what others owe to user
        const totalOwedByOthers = expense.participants
          ?.filter((p) => p.user_id !== user_id)
          .reduce((sum, p) => sum + Number(p.amount_owed || 0), 0) || 0;

        if (totalOwedByOthers > 0) {
          // Distribute proportionally based on what each person owes
          expense.participants
            ?.filter((p) => p.user_id !== user_id)
            .forEach((participant) => {
              const participantOwed = Number(participant.amount_owed || 0);
              if (participantOwed > 0) {
                const proportion = participantOwed / totalOwedByOthers;
                const amountOwedToUser = netForUser * proportion;

                if (!balancesMap[participant.user_id]) {
                  balancesMap[participant.user_id] = { amount: 0, currency };
                }
                balancesMap[participant.user_id].amount += amountOwedToUser;
              }
            });
        }
      } else if (netForUser < 0) {
        // User owes more than paid - calculate what user owes to each payer
        const totalPaidByOthers = expense.payers
          .filter((p) => p.user_id !== user_id)
          .reduce((sum, p) => sum + Number(p.amount_paid), 0);

        if (totalPaidByOthers > 0) {
          // Distribute proportionally based on what each payer paid
          expense.payers
            .filter((p) => p.user_id !== user_id)
            .forEach((payer) => {
              const payerPaid = Number(payer.amount_paid);
              if (payerPaid > 0) {
                const proportion = payerPaid / totalPaidByOthers;
                const amountUserOwes = Math.abs(netForUser) * proportion;

                if (!balancesMap[payer.user_id]) {
                  balancesMap[payer.user_id] = { amount: 0, currency };
                }
                // Negative amount means user owes them
                balancesMap[payer.user_id].amount -= amountUserOwes;
              }
            });
        }
      }
    });

    // Convert map to array and round amounts
    return Object.entries(balancesMap)
      .map(([user_id, balance]) => ({
        user_id,
        amount: Math.round(balance.amount * 100) / 100,
        currency: balance.currency,
      }))
      .filter((balance) => balance.amount !== 0) // Only include non-zero balances
      .sort((a, b) => b.amount - a.amount); // Sort by amount descending (people who owe most first)
  },

  getUserGroupBalances: async (user_id: string): Promise<Array<{ 
    group_id: string; 
    group_name: string; 
    group_icon: string | null;
    netAmount: number; 
    currency: string;
    memberBalances: Array<{ user_id: string; amount: number }>;
  }>> => {
    const expenses = await ExpenseService.getUserExpenses(user_id);
    
    // Map to store balances per group: { group_id: { ... } }
    const groupBalancesMap: Record<string, {
      group_id: string;
      group_name: string;
      group_icon: string | null;
      netAmount: number;
      currency: string;
      memberBalances: Record<string, number>;
    }> = {};

    expenses.forEach((expense) => {
      // Only process group expenses
      const groupScope = expense.scopes?.find((scope) => scope.type === "group");
      if (!groupScope) {
        return;
      }

      const groupId = groupScope.id;
      const currency = expense.currency || "INR";
      
      // Calculate what current user paid
      const userPaid = expense.payers
        .filter((p) => p.user_id === user_id)
        .reduce((sum, p) => sum + Number(p.amount_paid), 0);

      // Calculate what current user owes
      const userOwed = expense.participants
        ?.filter((p) => p.user_id === user_id)
        .reduce((sum, p) => sum + Number(p.amount_owed || 0), 0) || 0;

      // Net amount for this expense (positive if user paid more, negative if user owes more)
      const netForUser = userPaid - userOwed;

      // Initialize group if not exists
      if (!groupBalancesMap[groupId]) {
        groupBalancesMap[groupId] = {
          group_id: groupId,
          group_name: "", // Will be fetched separately
          group_icon: null,
          netAmount: 0,
          currency,
          memberBalances: {},
        };
      }

      // Add to net amount for the group
      groupBalancesMap[groupId].netAmount += netForUser;

      // Calculate balances with each member
      if (netForUser > 0) {
        // User paid more than owed - others owe user
        const totalOwedByOthers = expense.participants
          ?.filter((p) => p.user_id !== user_id)
          .reduce((sum, p) => sum + Number(p.amount_owed || 0), 0) || 0;

        if (totalOwedByOthers > 0) {
          expense.participants
            ?.filter((p) => p.user_id !== user_id)
            .forEach((participant) => {
              const participantOwed = Number(participant.amount_owed || 0);
              if (participantOwed > 0) {
                const proportion = participantOwed / totalOwedByOthers;
                const amountOwedToUser = netForUser * proportion;

                if (!groupBalancesMap[groupId].memberBalances[participant.user_id]) {
                  groupBalancesMap[groupId].memberBalances[participant.user_id] = 0;
                }
                groupBalancesMap[groupId].memberBalances[participant.user_id] += amountOwedToUser;
              }
            });
        }
      } else if (netForUser < 0) {
        // User owes more than paid - user owes to payers
        const totalPaidByOthers = expense.payers
          .filter((p) => p.user_id !== user_id)
          .reduce((sum, p) => sum + Number(p.amount_paid), 0);

        if (totalPaidByOthers > 0) {
          expense.payers
            .filter((p) => p.user_id !== user_id)
            .forEach((payer) => {
              const payerPaid = Number(payer.amount_paid);
              if (payerPaid > 0) {
                const proportion = payerPaid / totalPaidByOthers;
                const amountUserOwes = Math.abs(netForUser) * proportion;

                if (!groupBalancesMap[groupId].memberBalances[payer.user_id]) {
                  groupBalancesMap[groupId].memberBalances[payer.user_id] = 0;
                }
                // Negative amount means user owes them
                groupBalancesMap[groupId].memberBalances[payer.user_id] -= amountUserOwes;
              }
            });
        }
      }
    });

    // Fetch group details and convert to array
    const groupBalances = await Promise.all(
      Object.values(groupBalancesMap).map(async (groupBalance) => {
        const group = await GroupService.getGroupById(groupBalance.group_id);
        return {
          group_id: groupBalance.group_id,
          group_name: group?.group_name || "Unknown Group",
          group_icon: group?.group_icon || null,
          netAmount: Math.round(groupBalance.netAmount * 100) / 100,
          currency: groupBalance.currency,
          memberBalances: Object.entries(groupBalance.memberBalances)
            .map(([user_id, amount]) => ({
              user_id,
              amount: Math.round(amount * 100) / 100,
            }))
            .filter((mb) => mb.amount !== 0) // Only include non-zero balances
            .sort((a, b) => b.amount - a.amount), // Sort by amount descending
        };
      })
    );

    // Filter out groups with zero net amount and no member balances
    return groupBalances
      .filter((gb) => gb.netAmount !== 0 || gb.memberBalances.length > 0)
      .sort((a, b) => b.netAmount - a.netAmount); // Sort by net amount descending
  },
};