import { create } from "zustand";
import { api } from "../api/mockClient";

type BalanceState = {
  owedByYou: number;
  owedToYou: number;
  fetchBalances: () => Promise<void>;
};

export const useBalanceStore = create<BalanceState>((set) => ({
  owedByYou: 0,
  owedToYou: 0,

  fetchBalances: async () => {
    const data = await api.getBalances();
    set(data);
  },
}));
