import { useRef, useState } from 'react';
import { useResultFeedback } from '@/lib/toast/feedback';
import type {
  AppDesignView,
  AppInvitationGateway,
} from '@/features/invitation-studio/app-invitation-api';
import { ApiClientError } from '@/lib/api/client';
import type { ConflictState } from './invite-edit-view';

export interface UseInviteSaveParams {
  session?: { authorize: <T>(op: (token: string) => Promise<T>) => Promise<T> } | undefined;
  activeBooking?: { bookingId: string } | null | undefined;
  selectedDesign: AppDesignView | null;
  setSelectedDesign: (d: AppDesignView | null) => void;
  gateway: AppInvitationGateway;
  brideName: string;
  groomName: string;
  greeting: string;
  message: string;
  footer: string;
  setGroomName: (v: string) => void;
  setBrideName: (v: string) => void;
  setGreeting: (v: string) => void;
  setMessage: (v: string) => void;
  setFooter: (v: string) => void;
  setToastMessage: (msg: string | null) => void;
  setSubscreen: (s: 'preview' | 'edit' | 'share') => void;
  onNavigate: (s: any) => void;
  toastTimeoutRef: React.MutableRefObject<ReturnType<typeof setTimeout> | null>;
}

export function useInviteSave({
  session,
  activeBooking,
  selectedDesign,
  setSelectedDesign,
  gateway,
  brideName,
  groomName,
  greeting,
  message,
  footer,
  setGroomName,
  setBrideName,
  setGreeting,
  setMessage,
  setFooter,
  setToastMessage,
  setSubscreen,
  onNavigate,
  toastTimeoutRef,
}: UseInviteSaveParams) {
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  useResultFeedback({ error: editError });
  const [conflictState, setConflictState] = useState<ConflictState | null>(null);

  const pendingSaveRef = useRef(false);
  const activeIntentKeyRef = useRef<string | null>(null);
  const activeIntentPayloadRef = useRef<string | null>(null);

  const handleSaveEdit = async (overrideRevision?: number) => {
    if (pendingSaveRef.current || saving) return;
    if (!session || !activeBooking?.bookingId || !selectedDesign) {
      setEditError('Chưa có thông tin phiên làm việc hoặc mẫu thiệp cưới.');
      return;
    }

    pendingSaveRef.current = true;
    setSaving(true);
    setEditError(null);

    // NFC normalization without destroying multiline content
    const normalizedPayload = {
      brideName: brideName.normalize('NFC'),
      groomName: groomName.normalize('NFC'),
      greeting: greeting.normalize('NFC'),
      message: message.normalize('NFC'),
      footer: footer.normalize('NFC'),
    };

    const targetRevision = overrideRevision ?? selectedDesign.revisionNumber;
    const currentPayloadKey = JSON.stringify({
      designId: selectedDesign.designId,
      targetRevision,
      normalizedPayload,
    });

    let currentIntentKey = activeIntentKeyRef.current;
    if (!currentIntentKey || activeIntentPayloadRef.current !== currentPayloadKey) {
      currentIntentKey = `app-quick-edit:${crypto.randomUUID()}`;
      activeIntentKeyRef.current = currentIntentKey;
      activeIntentPayloadRef.current = currentPayloadKey;
    }

    try {
      const updated = await session.authorize((token) =>
        gateway.quickEditTextFields(
          token,
          activeBooking.bookingId,
          selectedDesign.designId,
          targetRevision,
          normalizedPayload,
          currentIntentKey,
        ),
      );
      setSelectedDesign(updated);
      setConflictState(null);
      activeIntentKeyRef.current = null;
      activeIntentPayloadRef.current = null;
      setToastMessage(`Đã lưu phiên bản ${updated.revisionNumber}`);
      setSubscreen('preview');
      onNavigate('invite');

      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
      toastTimeoutRef.current = setTimeout(() => {
        setToastMessage(null);
      }, 3500);
    } catch (caught: unknown) {
      if (caught instanceof ApiClientError && caught.status === 409) {
        const isRevisionConflict =
          caught.code === 'REVISION_CONFLICT' ||
          caught.code === 'CONCURRENT_MODIFICATION' ||
          caught.code === 'STALE_REVISION';
        setEditError(
          `Xung đột (${caught.code}): ${caught.message} (Yêu cầu #${caught.requestId.slice(0, 8)})`,
        );
        if (isRevisionConflict) {
          try {
            const fresh = await session.authorize((token) =>
              gateway.getDesign(token, activeBooking.bookingId, selectedDesign.designId),
            );
            setConflictState({
              hasConflict: true,
              serverRevision: fresh.revisionNumber,
              clientRevision: selectedDesign.revisionNumber,
              serverDesign: fresh,
            });
          } catch {
            setConflictState({
              hasConflict: true,
              serverRevision: null,
              clientRevision: selectedDesign.revisionNumber,
              serverDesign: null,
            });
          }
        }
      } else if (caught instanceof ApiClientError && caught.kind === 'timeout') {
        setEditError(
          `Quá thời gian kết nối (${caught.code}): ${caught.message} (Yêu cầu #${caught.requestId.slice(0, 8)}). Bạn có thể bấm Lưu lại để gửi lại an toàn.`,
        );
      } else if (caught instanceof ApiClientError && caught.kind === 'network') {
        setEditError(
          `Lỗi kết nối mạng (${caught.code}): ${caught.message}. Bạn có thể bấm Lưu lại để gửi lại an toàn.`,
        );
      } else if (caught instanceof ApiClientError && caught.status === 401) {
        setEditError('Phiên đăng nhập đã hết hạn (401). Vui lòng đăng nhập lại để tiếp tục.');
      } else if (caught instanceof ApiClientError && caught.status === 403) {
        setEditError(
          `Không có quyền chỉnh sửa (${caught.code}): ${caught.message} (Yêu cầu #${caught.requestId.slice(0, 8)})`,
        );
      } else {
        setEditError(
          caught instanceof Error
            ? caught.message
            : 'Chưa lưu được chỉnh sửa. Dữ liệu của bạn vẫn được giữ trên màn hình.',
        );
      }
    } finally {
      pendingSaveRef.current = false;
      setSaving(false);
    }
  };

  const handleAcceptServerVersion = () => {
    if (!conflictState?.serverDesign) {
      setConflictState(null);
      return;
    }
    const fresh = conflictState.serverDesign;
    setSelectedDesign(fresh);
    setGroomName(fresh.textFields?.groomName ?? '');
    setBrideName(fresh.textFields?.brideName ?? '');
    setGreeting(fresh.textFields?.greeting ?? '');
    setMessage(fresh.textFields?.message ?? '');
    setFooter(fresh.textFields?.footer ?? '');
    setConflictState(null);
    setEditError(null);
    setToastMessage(`Đã cập nhật theo phiên bản mới nhất (#${fresh.revisionNumber})`);
  };

  const handleReapplyOnServerVersion = async () => {
    if (!conflictState) return;
    if (conflictState.serverRevision === null) {
      if (!session || !activeBooking?.bookingId || !selectedDesign) return;
      try {
        const fresh = await session.authorize((token) =>
          gateway.getDesign(token, activeBooking.bookingId, selectedDesign.designId),
        );
        await handleSaveEdit(fresh.revisionNumber);
      } catch {
        setEditError('Chưa tải được phiên bản máy chủ mới nhất để lưu đè. Vui lòng thử lại sau.');
      }
      return;
    }
    await handleSaveEdit(conflictState.serverRevision);
  };

  return {
    saving,
    editError,
    setEditError,
    conflictState,
    setConflictState,
    handleSaveEdit,
    handleAcceptServerVersion,
    handleReapplyOnServerVersion,
  };
}
