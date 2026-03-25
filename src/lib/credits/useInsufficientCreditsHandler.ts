'use client';

import { useCallback } from 'react';
import { create } from 'zustand';

interface InsufficientCreditsDialogState {
  open: boolean;
  balance: number;
  required: number;
  show: (balance: number, required: number) => void;
  close: () => void;
}

export const useInsufficientCreditsDialog = create<InsufficientCreditsDialogState>(set => ({
  open: false,
  balance: 0,
  required: 0,
  show: (balance, required) => set({ open: true, balance, required }),
  close: () => set({ open: false }),
}));

/**
 * Hook to handle API responses that may return 402 (insufficient credits).
 * Returns a wrapper function that checks if the response is 402 and shows the dialog.
 */
export function useHandleCreditError() {
  const show = useInsufficientCreditsDialog(s => s.show);

  const handleResponse = useCallback(async (res: Response): Promise<boolean> => {
    if (res.status === 402) {
      const data = await res.json();
      show(data.balance ?? 0, data.required ?? 0);
      return true; // was a credit error
    }
    return false; // not a credit error
  }, [show]);

  return handleResponse;
}
