import { Platform } from 'react-native';

export type ToastKind = 'success' | 'error' | 'info' | 'warning';
export interface ToastOptions {
  message: string;
  title?: string;
  durationMs?: number;
  id?: string;
  kind?: ToastKind;
}
export interface ToastItem {
  id: string;
  title: string;
  message: string;
  kind: ToastKind;
  durationMs: number;
}
interface Snapshot {
  items: readonly ToastItem[];
  outlets: readonly string[];
}
const policy = { maxQueue: 5, successMs: 4000, errorMs: 8000, dedupMs: 2000 } as const;
const labels: Record<ToastKind, string> = {
  success: 'Thành công',
  error: 'Chưa hoàn tất',
  info: 'Thông báo',
  warning: 'Cần lưu ý',
};
const empty: Snapshot = { items: [], outlets: [] };
let snapshot = empty;
const listeners = new Set<() => void>();
let timer: ReturnType<typeof setTimeout> | undefined;
let deadline = 0;
let remaining = 0;
let foreground = true;
let reader = false;
let announced: string | null = null;
let recent = new Map<string, number>();
function publish(next: Snapshot) {
  snapshot = next;
  listeners.forEach((listener) => listener());
}
function schedule() {
  if (timer) clearTimeout(timer);
  timer = undefined;
  if (!snapshot.items[0] || remaining <= 0) return;
  if (!foreground && Platform.OS !== 'web') return;
  deadline = Date.now() + remaining;
  timer = setTimeout(() => {
    const first = snapshot.items[0];
    if (first) dismiss(first.id);
  }, remaining);
}
function selectFirst() {
  announced = null;
  remaining = snapshot.items[0]?.durationMs ?? 0;
  schedule();
}
export function dismiss(id: string) {
  const wasFirst = snapshot.items[0]?.id === id;
  publish({ ...snapshot, items: snapshot.items.filter((item) => item.id !== id) });
  if (wasFirst) selectFirst();
}
export function show(options: ToastOptions): string {
  const kind = options.kind ?? 'info';
  const key = options.id ?? `${kind}:${options.title ?? ''}:${options.message}`;
  const now = Date.now();
  if (
    snapshot.items.some((item) => item.id === key) ||
    now - (recent.get(key) ?? 0) < policy.dedupMs
  )
    return key;
  if (recent.size > policy.maxQueue * 4)
    recent = new Map([...recent].filter(([, time]) => now - time < policy.dedupMs));
  recent.set(key, now);
  const item: ToastItem = {
    id: key,
    kind,
    title: options.title ?? labels[kind],
    message: options.message,
    durationMs:
      options.durationMs ??
      (kind === 'error' || kind === 'warning'
        ? policy.errorMs
        : reader
          ? policy.errorMs
          : policy.successMs),
  };
  const wasEmpty = snapshot.items.length === 0;
  const queued = [...snapshot.items, item];
  publish({
    ...snapshot,
    items:
      queued.length <= policy.maxQueue
        ? queued
        : [queued[0]!, ...queued.slice(-(policy.maxQueue - 1))],
  });
  if (wasEmpty) selectFirst();
  return key;
}
export const toast = {
  show,
  dismiss,
  success: (message: string, options?: Omit<ToastOptions, 'message' | 'kind'>) =>
    show({ ...options, message, kind: 'success' }),
  error: (message: string, options?: Omit<ToastOptions, 'message' | 'kind'>) =>
    show({ ...options, message, kind: 'error' }),
  info: (message: string, options?: Omit<ToastOptions, 'message' | 'kind'>) =>
    show({ ...options, message, kind: 'info' }),
  warning: (message: string, options?: Omit<ToastOptions, 'message' | 'kind'>) =>
    show({ ...options, message, kind: 'warning' }),
  update: (id: string, options: Partial<Omit<ToastItem, 'id'>>) => {
    const first = snapshot.items[0]?.id === id;
    publish({
      ...snapshot,
      items: snapshot.items.map((item) => (item.id === id ? { ...item, ...options } : item)),
    });
    if (first) selectFirst();
  },
  clear: () => {
    if (timer) clearTimeout(timer);
    timer = undefined;
    remaining = 0;
    recent.clear();
    announced = null;
    publish({ ...snapshot, items: [] });
  },
};
export const toastStore = {
  subscribe: (listener: () => void) => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
  getSnapshot: () => snapshot,
  getServerSnapshot: () => empty,
  register: (id: string) => {
    publish({ ...snapshot, outlets: [...snapshot.outlets.filter((outlet) => outlet !== id), id] });
  },
  unregister: (id: string) =>
    publish({ ...snapshot, outlets: snapshot.outlets.filter((outlet) => outlet !== id) }),
  announce: (id: string) => {
    if (announced === id) return false;
    announced = id;
    return true;
  },
  setForeground: (active: boolean) => {
    if (foreground === active) return;
    if (timer) remaining = Math.max(1, deadline - Date.now());
    foreground = active;
    schedule();
  },
  setScreenReader: (enabled: boolean) => {
    reader = enabled;
  },
};
