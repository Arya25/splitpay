export type SplitType = "equal" | "percentage" | "share";

export interface ExpenseScope {
  type: "user" | "group";
  id: string;
}

export interface ExpenseParticipant {
  user_id: string;
  amount_owed?: number;
  percentage?: number;
}

export interface ExpensePayer {
  user_id: string;
  amount_paid: number;
}

export interface Expense {
  amount: number;
  desc: string;
  currency: string;
  created_by: string;
  split_type: SplitType;
  scopes: ExpenseScope[];
  participants?: ExpenseParticipant[];
  payers: ExpensePayer[];
}

export const ExpenseService = {
  addExpense: async (expense: Expense): Promise<Expense> => {
    // In real backend, this will POST
    console.log("Mock Expense created:", expense);
    return new Promise((resolve) => setTimeout(() => resolve(expense), 500));
  },
};
