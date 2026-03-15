"use client";

import { useState, useCallback } from "react";

export interface Toast {
  id: string;
  title?: string;
  description?: string;
  variant?: "default" | "destructive";
  duration?: number;
}

// Simple global toast store
const toastSubscribers = new Set<(toasts: Toast[]) => void>();
let toastState: Toast[] = [];

function notifySubscribers() {
  toastSubscribers.forEach((sub) => sub([...toastState]));
}

export function toast(options: Omit<Toast, "id">) {
  const id = Math.random().toString(36).slice(2);
  const duration = options.duration ?? 4000;

  toastState = [...toastState, { ...options, id }];
  notifySubscribers();

  setTimeout(() => {
    toastState = toastState.filter((t) => t.id !== id);
    notifySubscribers();
  }, duration);
}

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>(toastState);

  // Subscribe to global toast state
  useState(() => {
    toastSubscribers.add(setToasts);
    return () => {
      toastSubscribers.delete(setToasts);
    };
  });

  const dismiss = useCallback((id: string) => {
    toastState = toastState.filter((t) => t.id !== id);
    notifySubscribers();
  }, []);

  return {
    toasts,
    toast: (options: Omit<Toast, "id">) => toast(options),
    dismiss,
  };
}
