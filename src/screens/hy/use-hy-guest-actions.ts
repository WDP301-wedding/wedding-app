import * as Clipboard from 'expo-clipboard';
import { randomUUID } from 'expo-crypto';
import { useCallback, useState } from 'react';
import {
  createCoupleBillingGateway,
  type PersonalInvitationLinkView,
} from '@/features/payments-billing/billing-api';
import { readPublicEnv } from '@/lib/env';
import { useResultFeedback } from '@/lib/toast/feedback';
import { toast } from '@/lib/toast/store';
import type { V0CommonProps } from '../v0/v0-types';
import {
  normalizePhone,
  type Guest,
  type Group,
  type AttendanceSummary,
  type GuestPlan,
} from './hy-guest-types';
import { sharedResourceStore } from './resource-store';

const billing = createCoupleBillingGateway();

export function useHyGuestActions({
  session,
  bookingId,
  auxData,
  currentHeadcount,
  groups,
  reload,
  reloadAux,
}: {
  session: V0CommonProps['session'];
  bookingId: string | undefined;
  auxData: { attendance: AttendanceSummary | null; guestPlan: GuestPlan | null } | null;
  currentHeadcount: number;
  groups: readonly Group[];
  reload: (force?: boolean) => Promise<any>;
  reloadAux: (force?: boolean) => Promise<any>;
}) {
  const [selected, setSelected] = useState<Guest | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [archivedOpen, setArchivedOpen] = useState(false);

  // Planned headcount edit state
  const [editHeadcountOpen, setEditHeadcountOpen] = useState(false);
  const [headcountValue, setHeadcountValue] = useState(String(currentHeadcount));
  const [headcountSaving, setHeadcountSaving] = useState(false);
  const [headcountError, setHeadcountError] = useState<string | null>(null);

  // Create guest state
  const [createGuestOpen, setCreateGuestOpen] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createGroupId, setCreateGroupId] = useState('');
  const [createPhone, setCreatePhone] = useState('');
  const [createNote, setCreateNote] = useState('');
  const [createSaving, setCreateSaving] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Edit guest state
  const [editGuestOpen, setEditGuestOpen] = useState(false);
  const [editingGuest, setEditingGuest] = useState<Guest | null>(null);
  const [editName, setEditName] = useState('');
  const [editGroupId, setEditGroupId] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editNote, setEditNote] = useState('');
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Archive confirmation state
  const [confirmArchiveGuest, setConfirmArchiveGuest] = useState<Guest | null>(null);
  const [archiveSaving, setArchiveSaving] = useState(false);

  // Personalized link state
  const [issuingLink, setIssuingLink] = useState(false);
  const [issuedLink, setIssuedLink] = useState<{
    readonly url: string;
    readonly expiresAt: string;
    readonly guestId: string;
  } | null>(null);
  const [issueError, setIssueError] = useState<string | null>(null);

  useResultFeedback({ error: headcountError || createError || editError || issueError });

  const handleOpenHeadcount = useCallback(() => {
    setHeadcountValue(String(currentHeadcount));
    setHeadcountError(null);
    setEditHeadcountOpen(true);
  }, [currentHeadcount]);

  const handleSaveHeadcount = async () => {
    const trimmed = headcountValue.trim();
    if (!/^\d+$/.test(trimmed)) {
      setHeadcountError('Vui lòng nhập số nguyên hợp lệ (ví dụ: 150).');
      return;
    }
    const num = Number(trimmed);
    if (!Number.isSafeInteger(num) || num < 0) {
      setHeadcountError('Vui lòng nhập số khách nguyên không âm.');
      return;
    }
    const freshPlan = auxData?.guestPlan;
    if (!freshPlan) {
      setHeadcountError('Đang đồng bộ dữ liệu từ máy chủ. Vui lòng thử lại sau giây lát.');
      return;
    }
    if (!session || !bookingId || !billing.updateGuestPlan) {
      setHeadcountError('Tính năng cập nhật số khách chưa sẵn sàng.');
      return;
    }
    setHeadcountSaving(true);
    setHeadcountError(null);
    try {
      await session.authorize((t) =>
        billing.updateGuestPlan!(t, bookingId, freshPlan.revision, num),
      );
      if (bookingId) {
        sharedResourceStore.invalidate(`booking:${bookingId}:guests-data`);
        sharedResourceStore.invalidate(`booking:${bookingId}:guests-aux`);
      }
      toast.success('Đã cập nhật số khách dự kiến.');
      setEditHeadcountOpen(false);
      await Promise.all([reload(), reloadAux()]);
    } catch (caught: any) {
      const msg = caught?.message || 'Chưa thể lưu số lượng khách. Vui lòng thử lại.';
      setHeadcountError(`${msg}${caught?.code ? ` [${caught.code}]` : ''}`);
    } finally {
      setHeadcountSaving(false);
    }
  };

  const handleOpenCreate = useCallback(() => {
    setCreateName('');
    setCreateGroupId(groups[0]?.guestGroupId ?? '');
    setCreatePhone('');
    setCreateNote('');
    setCreateError(null);
    setCreateGuestOpen(true);
  }, [groups]);

  const handleCreateGuest = async () => {
    const trimmed = createName.trim().normalize('NFC');
    if (!trimmed) {
      setCreateError('Vui lòng nhập họ và tên khách mời.');
      return;
    }
    const targetGroupId = createGroupId || groups[0]?.guestGroupId;
    if (!targetGroupId) {
      setCreateError('Chưa có nhóm khách mời. Vui lòng thử lại sau.');
      return;
    }
    let normPhone: string | null = null;
    try {
      normPhone = normalizePhone(createPhone);
    } catch (e: any) {
      setCreateError(e?.message || 'Số điện thoại không hợp lệ.');
      return;
    }

    if (!session || !bookingId || !billing.createGuest) {
      setCreateError('Dịch vụ thêm khách chưa sẵn sàng.');
      return;
    }

    setCreateSaving(true);
    setCreateError(null);
    try {
      await session.authorize((t) =>
        billing.createGuest!(t, bookingId, {
          name: trimmed,
          guestGroupId: targetGroupId,
          phone: normPhone,
          operationalNote: createNote.trim().normalize('NFC') || null,
        }),
      );
      if (bookingId) {
        sharedResourceStore.invalidate(`booking:${bookingId}:guests-data`);
      }
      toast.success(`Đã thêm khách "${trimmed}".`);
      setCreateGuestOpen(false);
      await reload();
    } catch (caught: any) {
      setCreateError(caught?.message || 'Chưa thể thêm khách mời. Vui lòng thử lại.');
    } finally {
      setCreateSaving(false);
    }
  };

  const handleOpenEdit = useCallback((target: Guest) => {
    setEditingGuest(target);
    setEditName(target.name);
    setEditGroupId(target.guestGroupId);
    setEditPhone(target.phone ?? '');
    setEditNote(target.operationalNote ?? '');
    setEditError(null);
    setEditGuestOpen(true);
  }, []);

  const handleSaveEditGuest = async () => {
    if (!editingGuest) return;
    const trimmed = editName.trim().normalize('NFC');
    if (!trimmed) {
      setEditError('Vui lòng nhập họ và tên khách mời.');
      return;
    }
    const targetGroupId = editGroupId || editingGuest.guestGroupId;
    let normPhone: string | null = null;
    try {
      normPhone = normalizePhone(editPhone);
    } catch (e: any) {
      setEditError(e?.message || 'Số điện thoại không hợp lệ.');
      return;
    }

    if (!session || !bookingId || !billing.updateGuest) {
      setEditError('Dịch vụ sửa thông tin khách chưa sẵn sàng.');
      return;
    }

    setEditSaving(true);
    setEditError(null);
    try {
      const updated = await session.authorize((t) =>
        billing.updateGuest!(t, bookingId, editingGuest.guestId, {
          expectedRevision: editingGuest.revision,
          name: trimmed,
          guestGroupId: targetGroupId,
          phone: normPhone,
          operationalNote: editNote.trim().normalize('NFC') || null,
        }),
      );
      if (bookingId) {
        sharedResourceStore.invalidate(`booking:${bookingId}:guests-data`);
      }
      toast.success(`Đã cập nhật thông tin "${trimmed}".`);
      setEditGuestOpen(false);
      if (selected?.guestId === editingGuest.guestId) {
        setSelected(updated);
      }
      await reload();
    } catch (caught: any) {
      setEditError(caught?.message || 'Chưa thể cập nhật thông tin khách. Vui lòng thử lại.');
    } finally {
      setEditSaving(false);
    }
  };

  // Popup confirmation trigger for Delete/Archive
  const handleRequestArchive = useCallback((target: Guest) => {
    setEditGuestOpen(false);
    setConfirmArchiveGuest(target);
  }, []);

  const handleConfirmArchive = async (target: Guest) => {
    if (!session || !bookingId || !billing.updateGuest) return;
    setArchiveSaving(true);
    try {
      await session.authorize((t) =>
        billing.updateGuest!(t, bookingId, target.guestId, {
          expectedRevision: target.revision,
          status: 'ARCHIVED',
        }),
      );
      if (bookingId) {
        sharedResourceStore.invalidate(`booking:${bookingId}:guests-data`);
      }
      toast.success(`Đã lưu trữ khách "${target.name}".`);
      setConfirmArchiveGuest(null);
      if (selected?.guestId === target.guestId) {
        setSelected(null);
      }
      await reload();
    } catch (caught: any) {
      toast.error(caught?.message || 'Chưa thể lưu trữ khách. Vui lòng thử lại.');
    } finally {
      setArchiveSaving(false);
    }
  };

  const handleIssueInvitationLink = async (target: Guest) => {
    if (!session || !bookingId || !billing.issueGuestInvitationLink) {
      setIssueError('Tính năng cấp liên kết thiệp chưa sẵn sàng.');
      return;
    }
    setIssuingLink(true);
    setIssueError(null);
    try {
      let revision = target.revision ?? 0;
      let issued: PersonalInvitationLinkView | null = null;
      for (let attempt = 0; attempt < 10; attempt += 1) {
        try {
          issued = await session.authorize((t) =>
            billing.issueGuestInvitationLink!(t, bookingId, target.guestId, revision, randomUUID()),
          );
          break;
        } catch (caught: any) {
          if (caught?.code === 'GUEST_INVITATION_REVISION_STALE') {
            revision += 1;
            continue;
          }
          throw caught;
        }
      }
      if (!issued) {
        throw new Error('Không xác định được phiên bản liên kết hiện tại. Hãy thử lại sau.');
      }

      const env = readPublicEnv();
      const base = (
        env.EXPO_PUBLIC_WEB_PORTAL_URL ||
        env.EXPO_PUBLIC_API_BASE_URL.replace(/\/api(\/v1)?\/?$/, '')
      ).replace(/\/+$/, '');
      const fullUrl = `${base}/invitation/personal${issued.fragment}`;

      setIssuedLink({ url: fullUrl, expiresAt: issued.expiresAt, guestId: target.guestId });
      await Clipboard.setStringAsync(fullUrl);
      toast.success(`Đã cấp và sao chép liên kết thiệp cho ${target.name}!`);
    } catch (caught: any) {
      if (caught?.code === 'INVITATION_LINK_UNAVAILABLE') {
        setIssueError(
          'Chưa thể cấp liên kết: Hãy xuất bản thiệp trước trên trang Thiệp cưới, hoặc tiệc đã kết thúc.',
        );
      } else {
        setIssueError(caught?.message || 'Chưa thể cấp liên kết thiệp riêng.');
      }
    } finally {
      setIssuingLink(false);
    }
  };

  return {
    selected,
    setSelected,
    settingsOpen,
    setSettingsOpen,
    archivedOpen,
    setArchivedOpen,
    // Headcount
    editHeadcountOpen,
    setEditHeadcountOpen,
    headcountValue,
    setHeadcountValue,
    headcountSaving,
    headcountError,
    setHeadcountError,
    handleOpenHeadcount,
    handleSaveHeadcount,
    // Create
    createGuestOpen,
    setCreateGuestOpen,
    createName,
    setCreateName,
    createGroupId,
    setCreateGroupId,
    createPhone,
    setCreatePhone,
    createNote,
    setCreateNote,
    createSaving,
    createError,
    setCreateError,
    handleOpenCreate,
    handleCreateGuest,
    // Edit
    editGuestOpen,
    setEditGuestOpen,
    editingGuest,
    editName,
    setEditName,
    editGroupId,
    setEditGroupId,
    editPhone,
    setEditPhone,
    editNote,
    setEditNote,
    editSaving,
    editError,
    setEditError,
    handleOpenEdit,
    handleSaveEditGuest,
    // Archive confirmation
    confirmArchiveGuest,
    setConfirmArchiveGuest,
    archiveSaving,
    handleRequestArchive,
    handleConfirmArchive,
    // Personalized link
    issuingLink,
    issuedLink,
    setIssuedLink,
    issueError,
    setIssueError,
    handleIssueInvitationLink,
  };
}
