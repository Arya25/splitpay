import { User, Group, Expense, Balance, Activity } from "../types/models";

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const users: User[] = [
  {
    id: "u1",
    name: "You",
    phoneNumber: "9999999999",
    upiVpa: "you@upi",
  },
  {
    id: "u2",
    name: "Aman",
    phoneNumber: "8888888888",
    upiVpa: "aman@upi",
  },
  {
    id: "u3",
    name: "Riya",
    phoneNumber: "7777777777",
    upiVpa: "riya@upi",
  },
];

const groups: Group[] = [
  {
    id: "g1",
    name: "Flatmates",
    members: users,
    settings: { smartSettlementEnabled: true },
    createdAt: new Date().toISOString(),
  },
];

const expenses: Expense[] = [
  {
    id: "e1",
    amount: 900,
    payerUserId: "u1",
    groupId: "g1",
    participants: [
      { userId: "u1", shareAmount: 300 },
      { userId: "u2", shareAmount: 300 },
      { userId: "u3", shareAmount: 300 },
    ],
    description: "Groceries",
    createdAt: new Date().toISOString(),
  },
];

const balances: Balance[] = [
  { fromUserId: "u2", toUserId: "u1", amount: 300 },
  { fromUserId: "u3", toUserId: "u1", amount: 300 },
];

const activities: Activity[] = [
  {
    id: "a1",
    type: "EXPENSE",
    expenseId: "e1",
    groupId: "g1",
    createdAt: new Date().toISOString(),
  },
];

export const api = {
  getCurrentUser: async (): Promise<User> => {
    await delay(300);
    return users[0];
  },

  getGroups: async (): Promise<Group[]> => {
    await delay(300);
    return groups;
  },

  getGroupExpenses: async (groupId: string): Promise<Expense[]> => {
    await delay(300);
    return expenses.filter((e) => e.groupId === groupId);
  },

  getBalances: async (): Promise<Balance[]> => {
    await delay(300);
    return balances;
  },

  getActivity: async (): Promise<Activity[]> => {
    await delay(300);
    return activities;
  },
};
