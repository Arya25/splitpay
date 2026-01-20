// User types
export interface User {
  user_id: string;
  member_since: string;
  phone: string;
  email: string;
  profile_image_url: string;
  user_name: string;
  default_currency?: string; // e.g., "USD", "INR"
  upi_id?: string; // UPI VPA (Virtual Payment Address) e.g., "user@paytm"
}

// Group types
export interface Group {
  group_id: string;
  created_by: string;
  created_date: string;
  group_name: string;
  group_icon: string;
  members: string[]; // list of user_ids
}

// Expense types
export type SplitType = "equal" | "percentage" | "share";

export interface ExpenseScope {
  type: "user" | "group" | "both";
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
  expense_id: string;
  amount: number;
  description: string;
  currency: string;
  created_by: string;
  split_type: SplitType;
  scopes: ExpenseScope[];
  participants?: ExpenseParticipant[];
  payers: ExpensePayer[];
  created_at?: string;
  updated_at?: string;
}

// Balance and Activity types (for future use)
export type Balance = {
  fromUserId: string;
  toUserId: string;
  amount: number;
};

export type Activity =
  | {
      id: string;
      type: "EXPENSE";
      expenseId: string;
      groupId?: string;
      createdAt: string;
    }
  | {
      id: string;
      type: "SETTLEMENT";
      fromUserId: string;
      toUserId: string;
      amount: number;
      status: "SUCCESS" | "FAILED";
      createdAt: string;
    };
