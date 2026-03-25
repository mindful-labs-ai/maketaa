'use client';

import { create } from 'zustand';

interface CreditState {
  balance: number | null;
  loading: boolean;
}

interface CreditActions {
  fetch: () => Promise<void>;
  deduct: (amount: number) => void;
  setBalance: (balance: number) => void;
}

export const useCreditStore = create<CreditState & CreditActions>()(set => ({
  balance: null,
  loading: true,

  fetch: async () => {
    try {
      const res = await fetch('/api/credits');
      if (res.ok) {
        const data = await res.json();
        set({ balance: data.balance, loading: false });
      } else {
        set({ loading: false });
      }
    } catch {
      set({ loading: false });
    }
  },

  deduct: (amount) =>
    set(s => ({
      balance: s.balance !== null ? Math.max(0, s.balance - amount) : null,
    })),

  setBalance: (balance) => set({ balance }),
}));
