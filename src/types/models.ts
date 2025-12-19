export type User = {
  id: string;
  name: string;
  phoneNumber: string;
  upiVpa?: string;
};

export type Group = {
  id: string;
  name: string;
  members: User[];
  settings: {
    smartSettlementEnabled: boolean;
  };
  createdAt: string;
};

export type ExpenseParticipant = {
  userId: string;
  shareAmount: number;
};

export type Expense = {
  id: string;
  amount: number;
  payerUserId: string;
  groupId?: string;
  participants: ExpenseParticipant[];
  description?: string;
  createdAt: string;
};

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
