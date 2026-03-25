'use client';

import { create } from 'zustand';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message: string;
}

type ToastStoreState = {
  toasts: Toast[];
};

type ToastStoreActions = {
  addToast: (type: ToastType, title: string, message: string) => void;
  removeToast: (id: string) => void;
};

export const useToastStore = create<ToastStoreState & ToastStoreActions>()(
  set => ({
    toasts: [],
    addToast: (type, title, message) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      set(state => ({ toasts: [...state.toasts, { id, type, title, message }] }));
      setTimeout(() => {
        set(state => ({ toasts: state.toasts.filter(t => t.id !== id) }));
      }, 5000);
    },
    removeToast: id =>
      set(state => ({ toasts: state.toasts.filter(t => t.id !== id) })),
  })
);
