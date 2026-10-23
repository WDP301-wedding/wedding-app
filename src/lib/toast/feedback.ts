import { useEffect, useRef } from 'react';
import { Alert, type AlertButton, type AlertOptions } from 'react-native';
import { ApiClientError } from '@/lib/api/client';
import { toast } from './store';
/** User-facing text only: never expose transport details, stack traces or credentials. */
export function safeMessage(
  value: string,
  fallback = 'Chưa thể hoàn tất. Vui lòng thử lại.',
): string {
  const text = value.trim();
  if (
    !text ||
    /https?:\/\/|Bearer\s|eyJ[A-Za-z0-9_-]+\.|<[^>]+>|\bat\s+\w+.*\(|password\s*[:=]|token\s*[:=]/i.test(
      text,
    )
  )
    return fallback;
  // Keep authored Vietnamese feedback; technical English errors stay in inline diagnostics.
  if (!/[À-ỹĐđ]/u.test(text)) return fallback;
  return text.length > 240 ? `${text.slice(0, 237)}…` : text;
}
export function reportError(error: unknown, fallback?: string): void {
  if (error instanceof ApiClientError && error.kind === 'aborted') return;
  if (error instanceof ApiClientError && (error.kind === 'timeout' || error.kind === 'network')) {
    toast.warning(
      'Chưa nhận được kết quả từ máy chủ. Kiểm tra trạng thái trước khi gửi lại thao tác.',
    );
    return;
  }
  const text = error instanceof Error ? error.message : typeof error === 'string' ? error : '';
  toast.error(safeMessage(text, fallback));
}
/** Call explicitly instead of monkeypatching Alert. Confirmations remain native dialogs. */
export function notify(
  title: string,
  message?: string,
  buttons?: AlertButton[],
  options?: AlertOptions,
): void {
  if (buttons?.length) {
    Alert.alert(title, message, buttons, options);
    return;
  }
  const kind = /thành công|đã lưu|đã sao chép/iu.test(title)
    ? 'success'
    : /lỗi|thất bại|không thể|không hợp lệ/iu.test(title)
      ? 'error'
      : 'info';
  toast.show({
    kind,
    title: safeMessage(title, 'Thông báo'),
    message: safeMessage(message ?? title),
  });
}
/**
 * @deprecated Use mutually exclusive feedback:
 * If an error/message is already displayed inline (e.g. HyAlert), do NOT fire a toast.
 * If feedback is delivered as a toast, do NOT show an inline alert banner.
 */
export function useResultFeedback({
  success,
  error,
}: {
  success?: string | null | undefined;
  error?: string | null | undefined;
}): void {
  const previous = useRef<{
    success?: string | null | undefined;
    error?: string | null | undefined;
  }>({});
  useEffect(() => {
    if (success && previous.current.success !== success)
      toast.success(safeMessage(success, 'Đã hoàn tất thao tác.'));
    if (error && previous.current.error !== error) reportError(error);
    previous.current = { success, error };
  }, [success, error]);
}
export function useToast() {
  return toast;
}
