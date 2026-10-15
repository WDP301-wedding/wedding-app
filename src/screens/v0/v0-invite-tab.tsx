import * as Clipboard from 'expo-clipboard';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, BackHandler, Share as NativeShare } from 'react-native';
import {
  createAppInvitationGateway,
  type AppDesignView,
  type AppPublicationView,
} from '@/features/invitation-studio/app-invitation-api';
import type { V0CommonProps } from './v0-types';
import { styles } from './invite/invite.styles';
import { InviteEditView } from './invite/invite-edit-view';
import { InviteShareView } from './invite/invite-share-view';
import { InvitePreviewView } from './invite/invite-preview-view';
import { useInviteSave } from './invite/use-invite-save';

export { styles };

export interface V0InviteTabProps extends V0CommonProps {
  readonly initialSubscreen?: 'preview' | 'edit' | 'share';
}

export function V0InviteTab({
  activeBooking,
  facts,
  initialSubscreen = 'preview',
  invitationGateway,
  onNavigate,
  session,
}: V0InviteTabProps) {
  const gateway = invitationGateway ?? createAppInvitationGateway();

  // Internal screen view: 'preview' | 'edit' | 'share'
  const [subscreen, setSubscreen] = useState<'preview' | 'edit' | 'share'>(initialSubscreen);
  const [prevInitial, setPrevInitial] = useState(initialSubscreen);

  if (prevInitial !== initialSubscreen) {
    setPrevInitial(initialSubscreen);
    setSubscreen(initialSubscreen);
  }

  // Designs list from server
  const [designs, setDesigns] = useState<readonly AppDesignView[]>([]);
  const [selectedDesign, setSelectedDesign] = useState<AppDesignView | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Publication state
  const [publication, setPublication] = useState<AppPublicationView | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);

  // Text fields state
  const [groomName, setGroomName] = useState(facts.groomName);
  const [brideName, setBrideName] = useState(facts.brideName);
  const [greeting, setGreeting] = useState('');
  const [message, setMessage] = useState('');
  const [footer, setFooter] = useState('');

  // Toast and copy feedback state
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeRequestCounterRef = useRef(0);

  const {
    saving,
    editError,
    setEditError,
    conflictState,
    setConflictState,
    handleSaveEdit,
    handleAcceptServerVersion,
    handleReapplyOnServerVersion,
  } = useInviteSave({
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
  });

  useEffect(() => {
    const toastTimeout = toastTimeoutRef.current;
    const copyTimeout = copyTimeoutRef.current;
    return () => {
      if (toastTimeout) clearTimeout(toastTimeout);
      if (copyTimeout) clearTimeout(copyTimeout);
    };
  }, []);

  // Fetch designs for active booking
  useEffect(() => {
    if (!session || !activeBooking?.bookingId) return;
    const reqId = ++activeRequestCounterRef.current;

    void (async () => {
      setConflictState(null);
      setEditError(null);
      setLoading(true);
      setLoadError(null);
      setSelectedDesign(null);
      setPublication(null);
      setPublishError(null);
      try {
        const items = await session.authorize((token) =>
          gateway.listDesigns(token, activeBooking.bookingId),
        );
        if (reqId !== activeRequestCounterRef.current) return;
        setDesigns(items);
        const firstItem = items[0];
        if (firstItem) {
          const detail = await session.authorize((token) =>
            gateway.getDesign(token, activeBooking.bookingId, firstItem.designId),
          );
          if (reqId !== activeRequestCounterRef.current) return;
          setSelectedDesign(detail);
          setGroomName(detail.textFields?.groomName ?? '');
          setBrideName(detail.textFields?.brideName ?? '');
          setGreeting(detail.textFields?.greeting ?? '');
          setMessage(detail.textFields?.message ?? '');
          setFooter(detail.textFields?.footer ?? '');
        }
      } catch (caught) {
        if (reqId === activeRequestCounterRef.current) {
          setLoadError(
            caught instanceof Error ? caught.message : 'Chưa tải được danh sách thiệp cưới.',
          );
        }
      } finally {
        if (reqId === activeRequestCounterRef.current) setLoading(false);
      }
    })();
  }, [session, activeBooking?.bookingId, gateway, setConflictState, setEditError]);

  const coupleDisplay =
    brideName && groomName ? `${brideName} & ${groomName}` : facts.coupleDisplay || 'Cặp đôi';

  // Canonical public URL is genericQrPayload from server publication (not synthetic fake URL)
  const publicUrl = publication?.genericQrPayload || '';

  // Check if text inputs differ from server design
  const isDirty = Boolean(
    selectedDesign &&
    selectedDesign.textFields &&
    (groomName.trim().normalize('NFC') !==
      (selectedDesign.textFields.groomName ?? '').trim().normalize('NFC') ||
      brideName.trim().normalize('NFC') !==
        (selectedDesign.textFields.brideName ?? '').trim().normalize('NFC') ||
      greeting.trim().normalize('NFC') !==
        (selectedDesign.textFields.greeting ?? '').trim().normalize('NFC') ||
      message.trim().normalize('NFC') !==
        (selectedDesign.textFields.message ?? '').trim().normalize('NFC') ||
      footer.trim().normalize('NFC') !==
        (selectedDesign.textFields.footer ?? '').trim().normalize('NFC')),
  );

  const handleBackFromEdit = useCallback(() => {
    if (isDirty) {
      Alert.alert(
        'Hủy thay đổi?',
        'Bạn có thay đổi chưa lưu trên thiệp cưới. Bạn có chắc muốn quay lại?',
        [
          { text: 'Tiếp tục sửa', style: 'cancel' },
          {
            text: 'Rời đi',
            style: 'destructive',
            onPress: () => {
              if (selectedDesign?.textFields) {
                setGroomName(selectedDesign.textFields.groomName ?? '');
                setBrideName(selectedDesign.textFields.brideName ?? '');
                setGreeting(selectedDesign.textFields.greeting ?? '');
                setMessage(selectedDesign.textFields.message ?? '');
                setFooter(selectedDesign.textFields.footer ?? '');
              }
              setConflictState(null);
              setEditError(null);
              setSubscreen('preview');
              onNavigate('invite');
            },
          },
        ],
      );
    } else {
      setConflictState(null);
      setEditError(null);
      setSubscreen('preview');
      onNavigate('invite');
    }
  }, [isDirty, onNavigate, selectedDesign, setConflictState, setEditError]);

  // Hardware back handling for edit and share
  useEffect(() => {
    if (subscreen === 'edit') {
      const sub = BackHandler.addEventListener('hardwareBackPress', () => {
        handleBackFromEdit();
        return true;
      });
      return () => sub.remove();
    }
    if (subscreen === 'share') {
      const sub = BackHandler.addEventListener('hardwareBackPress', () => {
        setSubscreen('preview');
        onNavigate('invite');
        return true;
      });
      return () => sub.remove();
    }
    return undefined;
  }, [subscreen, handleBackFromEdit, onNavigate]);

  const handleSelectDesign = async (design: AppDesignView) => {
    if (!session || !activeBooking?.bookingId) return;
    const reqId = ++activeRequestCounterRef.current;
    setLoading(true);
    setLoadError(null);
    setConflictState(null);
    setEditError(null);
    try {
      const detail = await session.authorize((token) =>
        gateway.getDesign(token, activeBooking.bookingId, design.designId),
      );
      if (reqId !== activeRequestCounterRef.current) return;
      setSelectedDesign(detail);
      setPublication(null);
      // Clear fields not present on new design
      setGroomName(detail.textFields?.groomName ?? '');
      setBrideName(detail.textFields?.brideName ?? '');
      setGreeting(detail.textFields?.greeting ?? '');
      setMessage(detail.textFields?.message ?? '');
      setFooter(detail.textFields?.footer ?? '');
    } catch (caught) {
      if (reqId === activeRequestCounterRef.current) {
        setLoadError(
          caught instanceof Error ? caught.message : 'Không tải được chi tiết mẫu thiệp.',
        );
      }
    } finally {
      if (reqId === activeRequestCounterRef.current) setLoading(false);
    }
  };

  const handlePublish = async () => {
    if (!session || !activeBooking?.bookingId || !selectedDesign || publishing) return;
    setPublishing(true);
    setPublishError(null);
    try {
      const result = await session.authorize((token) =>
        gateway.publishInvitation(
          token,
          activeBooking.bookingId,
          selectedDesign.designId,
          selectedDesign.revisionNumber,
          selectedDesign.revisionId,
          publication?.publicationRevision,
        ),
      );
      setPublication(result);
      setToastMessage('Đã xuất bản thiệp cưới công khai thành công');
    } catch (caught: unknown) {
      setPublishError(caught instanceof Error ? caught.message : 'Không thể xuất bản thiệp cưới.');
    } finally {
      setPublishing(false);
    }
  };

  const handleUnpublish = async () => {
    if (!session || !activeBooking?.bookingId || !selectedDesign || publishing) return;
    setPublishing(true);
    setPublishError(null);
    try {
      await session.authorize((token) =>
        gateway.unpublishInvitation(
          token,
          activeBooking.bookingId,
          selectedDesign.designId,
          selectedDesign.revisionNumber,
        ),
      );
      setPublication(null);
      setToastMessage('Đã thu hồi xuất bản thiệp cưới');
    } catch (caught: unknown) {
      setPublishError(
        caught instanceof Error ? caught.message : 'Không thể thu hồi xuất bản thiệp.',
      );
    } finally {
      setPublishing(false);
    }
  };

  const handleOpenShare = async () => {
    if (!publicUrl) {
      Alert.alert(
        'Thiệp chưa xuất bản',
        'Thiệp chưa có liên kết công khai. Vui lòng bấm Xuất bản thiệp cưới trước khi chia sẻ.',
      );
      return;
    }
    try {
      const result = await NativeShare.share({
        message: `Trân trọng kính mời bạn đến dự lễ cưới của ${coupleDisplay} vào ngày ${facts.formattedDate} tại ${facts.venueName}: ${publicUrl}`,
        url: publicUrl,
        title: `Thiệp cưới ${coupleDisplay}`,
      });
      if (result.action === NativeShare.sharedAction) {
        // Shared successfully
      }
    } catch {
      // User dismissed or share error
    }
  };

  const handleCopyLink = async () => {
    if (!publicUrl) {
      Alert.alert('Thiệp chưa xuất bản', 'Chưa có liên kết công khai để sao chép.');
      return;
    }
    try {
      await Clipboard.setStringAsync(publicUrl);
      setCopied(true);
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
      copyTimeoutRef.current = setTimeout(() => {
        setCopied(false);
      }, 2500);
    } catch {
      Alert.alert('Lỗi sao chép', 'Không thể sao chép liên kết vào bộ nhớ tạm.');
    }
  };

  const handleMorePress = () => {
    Alert.alert('Tùy chọn thiệp cưới', undefined, [
      {
        text: 'Chỉnh sửa nội dung',
        onPress: () => {
          setSubscreen('edit');
          onNavigate('edit');
        },
      },
      {
        text: 'Chia sẻ thiệp cưới',
        onPress: () => {
          setSubscreen('share');
          onNavigate('share');
        },
      },
      {
        text: 'Làm mới thiết kế',
        onPress: () => {
          if (selectedDesign) void handleSelectDesign(selectedDesign);
        },
      },
      { text: 'Đóng', style: 'cancel' },
    ]);
  };

  if (subscreen === 'edit') {
    return (
      <InviteEditView
        selectedDesign={selectedDesign}
        conflictState={conflictState}
        editError={editError}
        groomName={groomName}
        setGroomName={setGroomName}
        brideName={brideName}
        setBrideName={setBrideName}
        greeting={greeting}
        setGreeting={setGreeting}
        message={message}
        setMessage={setMessage}
        footer={footer}
        setFooter={setFooter}
        saving={saving}
        onBack={handleBackFromEdit}
        onAcceptServerVersion={handleAcceptServerVersion}
        onReapplyOnServerVersion={() => void handleReapplyOnServerVersion()}
        onSave={() => void handleSaveEdit()}
      />
    );
  }

  if (subscreen === 'share') {
    return (
      <InviteShareView
        publicUrl={publicUrl}
        publication={publication}
        publishError={publishError}
        copied={copied}
        publishing={publishing}
        onBack={() => {
          setSubscreen('preview');
          onNavigate('invite');
        }}
        onCopyLink={() => void handleCopyLink()}
        onOpenShare={() => void handleOpenShare()}
        onPublish={() => void handlePublish()}
        onUnpublish={() => void handleUnpublish()}
        onNavigate={onNavigate}
      />
    );
  }

  return (
    <InvitePreviewView
      coupleDisplay={coupleDisplay}
      greeting={greeting}
      message={message}
      footer={footer}
      facts={facts}
      selectedDesign={selectedDesign}
      loading={loading}
      loadError={loadError}
      designs={designs}
      toastMessage={toastMessage}
      onNavigate={onNavigate}
      onMorePress={handleMorePress}
      onEditPress={() => {
        setSubscreen('edit');
        onNavigate('edit');
      }}
      onSharePress={() => {
        setSubscreen('share');
        onNavigate('share');
      }}
      onSelectDesign={(item) => void handleSelectDesign(item)}
    />
  );
}
