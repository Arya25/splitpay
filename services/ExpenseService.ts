import { supabase } from "@/src/config/supabase";
import {
  Expense
} from '../src/types/models';

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

    // Fetch all expenses
    const { data: expensesData, error: expensesError } = await supabase
      .from('expenses')
      .select('*')
      .in('expense_id', Array.from(expenseIds));

    if (expensesError) {
      console.error('Error fetching user expenses:', expensesError);
      throw expensesError;
    }

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
};