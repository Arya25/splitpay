const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const api = {
  getBalances: async () => {
    await delay(400);
    return {
      owedByYou: 1200,
      owedToYou: 8000,
    };
  },

  getGroups: async () => {
    await delay(400);
    return [
      { id: "1", name: "Flatmates", members: 3 },
      { id: "2", name: "Goa Trip", members: 5 },
    ];
  },
};
