import {
  Expense,
  ExpenseParticipant,
  ExpensePayer,
  ExpenseScope,
  SplitType,
} from "../src/types/models";

export { Expense, ExpenseParticipant, ExpensePayer, ExpenseScope, SplitType };

export const ExpenseService = {
  addExpense: async (expense: Expense): Promise<Expense> => {
    // In real backend, this will POST
    console.log("Mock Expense created:", expense);
    return new Promise((resolve) => setTimeout(() => resolve(expense), 500));
  },
};
