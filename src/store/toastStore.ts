/**
 * Toast queue. Call `toast(...)` / `toast.success(...)` from anywhere (components, mutation
 * callbacks, services). The ui-kit `<Toaster />` (mounted once in AppLayout) renders the queue
 * and owns auto-dismiss timing (pausing on hover/focus).
 */
import type { ReactNode } from 'react';
import { create } from 'zustand';
import type { Toast, ToastInput, ToastVariant } from '@/types';

export const MAX_TOASTS = 5;

/** Default auto-dismiss delay per variant (ms). */
export const DEFAULT_TOAST_DURATION: Readonly<Record<ToastVariant, number>> = {
  default: 4000,
  success: 4000,
  error: 6500,
  achievement: 7000,
};

/**
 * Toasts with an action button stay at least this long (ms) so there is time to reach the
 * button (timers also pause while the stack is hovered or focused).
 */
export const MIN_ACTION_TOAST_DURATION = 8000;

/** Identical toasts pushed within this window are collapsed into one. */
const DEDUPE_WINDOW_MS = 1200;

export interface ToastState {
  toasts: Toast[];
  push: (input: ToastInput) => string;
  dismiss: (id: string) => void;
  clear: () => void;
}

let counter = 0;
const nextId = (): string => {
  counter += 1;
  return `toast_${Date.now().toString(36)}_${counter}`;
};

export const useToastStore = create<ToastState>()((set, get) => ({
  toasts: [],

  push: (input) => {
    const variant = input.variant ?? 'default';
    const now = Date.now();
    const duplicate = get().toasts.find(
      (existing) =>
        existing.title === input.title &&
        existing.description === input.description &&
        existing.variant === variant &&
        now - existing.createdAt < DEDUPE_WINDOW_MS,
    );
    if (duplicate) return duplicate.id;

    const baseDuration = input.duration ?? DEFAULT_TOAST_DURATION[variant];
    const toastItem: Toast = {
      id: nextId(),
      title: input.title,
      variant,
      duration: input.action ? Math.max(baseDuration, MIN_ACTION_TOAST_DURATION) : baseDuration,
      createdAt: now,
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.icon !== undefined ? { icon: input.icon } : {}),
      ...(input.action !== undefined ? { action: input.action } : {}),
    };
    set((state) => ({ toasts: [...state.toasts, toastItem].slice(-MAX_TOASTS) }));
    return toastItem.id;
  },

  dismiss: (id) => set((state) => ({ toasts: state.toasts.filter((item) => item.id !== id) })),

  clear: () => set({ toasts: [] }),
}));

type ShortcutOptions = Omit<ToastInput, 'title' | 'description' | 'variant'>;

export interface ToastFn {
  (input: ToastInput): string;
  success: (title: string, description?: string, options?: ShortcutOptions) => string;
  error: (title: string, description?: string, options?: ShortcutOptions) => string;
  achievement: (title: string, description?: string, icon?: ReactNode) => string;
  dismiss: (id: string) => void;
  clear: () => void;
}

const shortcut =
  (variant: ToastVariant) =>
  (title: string, description?: string, options: ShortcutOptions = {}): string =>
    useToastStore.getState().push({
      ...options,
      title,
      variant,
      ...(description !== undefined ? { description } : {}),
    });

/** Imperative toast API usable outside React. Returns the toast id. */
export const toast: ToastFn = Object.assign(
  (input: ToastInput): string => useToastStore.getState().push(input),
  {
    success: shortcut('success'),
    error: shortcut('error'),
    achievement: (title: string, description?: string, icon?: ReactNode): string =>
      useToastStore.getState().push({
        title,
        variant: 'achievement',
        ...(description !== undefined ? { description } : {}),
        ...(icon !== undefined ? { icon } : {}),
      }),
    dismiss: (id: string): void => useToastStore.getState().dismiss(id),
    clear: (): void => useToastStore.getState().clear(),
  },
);

export const useToasts = (): Toast[] => useToastStore((state) => state.toasts);
