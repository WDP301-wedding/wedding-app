import * as Clipboard from 'expo-clipboard';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  BackHandler,
  Pressable,
  ScrollView,
  Share as NativeShare,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  CheckIcon,
  ChevronRightIcon,
  CircleHelpIcon,
  LinkIcon,
  LockIcon,
  MoreIcon,
  RotateCcwIcon,
  ShareIcon,
  SparklesIcon,
  StatusTag,
  UsersIcon,
} from '@/components/v0-primitives';
import {
  createAppInvitationGateway,
  type AppDesignView,
  type AppPublicationView,
} from '@/features/invitation-studio/app-invitation-api';
import { ApiClientError } from '@/lib/api/client';
import { CanonicalQrCode } from '@/lib/qr';
import { useWeddingTheme } from '@/theme';
import { deriveInitials } from '../couple-overview';
import type { V0CommonProps } from './v0-types';

export interface V0InviteTabProps extends V0CommonProps {
  readonly initialSubscreen?: 'preview' | 'edit' | 'share';
}

interface ConflictState {
  readonly hasConflict: boolean;
  readonly serverRevision: number;
  readonly clientRevision: number;
  readonly serverDesign: AppDesignView | null;
}

export function V0InviteTab({
  activeBooking,
  facts,
  initialSubscreen = 'preview',
  invitationGateway,
  onNavigate,
  session,
}: V0InviteTabProps) {
  const { tokens } = useWeddingTheme();
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
  const [greeting, setGreeting] = useState('Trân trọng kính mời');
  const [message, setMessage] = useState(
    'Mong bạn đến chung vui cùng gia đình chúng tôi trong ngày hạnh phúc.',
  );
  const [footer, setFooter] = useState('Rất mong được đón tiếp bạn');

  // Persistence and feedback state
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [conflictState, setConflictState] = useState<ConflictState | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingSaveRef = useRef(false);
  const activeIntentKeyRef = useRef<string | null>(null);
  const activeIntentPayloadRef = useRef<string | null>(null);
  const activeRequestCounterRef = useRef(0);

  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
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
          setGreeting(detail.textFields?.greeting ?? 'Trân trọng kính mời');
          setMessage(
            detail.textFields?.message ??
              'Mong bạn đến chung vui cùng gia đình chúng tôi trong ngày hạnh phúc.',
          );
          setFooter(detail.textFields?.footer ?? 'Rất mong được đón tiếp bạn');
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
  }, [session, activeBooking?.bookingId, gateway]);

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
                setGreeting(selectedDesign.textFields.greeting ?? 'Trân trọng kính mời');
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
  }, [isDirty, onNavigate, selectedDesign]);

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
      // Clear fields not present on new design
      setGroomName(detail.textFields?.groomName ?? '');
      setBrideName(detail.textFields?.brideName ?? '');
      setGreeting(detail.textFields?.greeting ?? 'Trân trọng kính mời');
      setMessage(
        detail.textFields?.message ??
          'Mong bạn đến chung vui cùng gia đình chúng tôi trong ngày hạnh phúc.',
      );
      setFooter(detail.textFields?.footer ?? 'Rất mong được đón tiếp bạn');
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
        setEditError(
          'Xung đột phiên bản (409): Thiệp cưới đã được cập nhật từ phiên làm việc khác.',
        );
        try {
          const fresh = await session.authorize((token) =>
            gateway.getDesign(token, activeBooking.bookingId, selectedDesign.designId),
          );
          setConflictState({
            hasConflict: true,
            serverRevision: Math.max(fresh.revisionNumber, selectedDesign.revisionNumber + 1),
            clientRevision: selectedDesign.revisionNumber,
            serverDesign: fresh,
          });
        } catch {
          setConflictState({
            hasConflict: true,
            serverRevision: selectedDesign.revisionNumber + 1,
            clientRevision: selectedDesign.revisionNumber,
            serverDesign: null,
          });
        }
      } else if (caught instanceof ApiClientError && caught.kind === 'timeout') {
        setEditError(
          'Quá thời gian kết nối tới máy chủ (Timeout). Dữ liệu được giữ nguyên, bạn có thể bấm Lưu lại để thử lại an toàn với cùng mã giao dịch.',
        );
      } else if (caught instanceof ApiClientError && caught.kind === 'network') {
        setEditError(
          'Lỗi kết nối mạng trước khi nhận kết quả. Bạn có thể bấm Lưu lại để gửi lại an toàn.',
        );
      } else if (caught instanceof ApiClientError && caught.status === 401) {
        setEditError('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại để tiếp tục.');
      } else if (caught instanceof ApiClientError && caught.status === 403) {
        setEditError('Bạn không có quyền chỉnh sửa thiệp cưới này.');
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
    setGreeting(fresh.textFields?.greeting ?? 'Trân trọng kính mời');
    setMessage(
      fresh.textFields?.message ??
        'Mong bạn đến chung vui cùng gia đình chúng tôi trong ngày hạnh phúc.',
    );
    setFooter(fresh.textFields?.footer ?? 'Rất mong được đón tiếp bạn');
    setConflictState(null);
    setEditError(null);
    setToastMessage(`Đã cập nhật theo phiên bản mới nhất (#${fresh.revisionNumber})`);
  };

  const handleReapplyOnServerVersion = async () => {
    if (!conflictState) return;
    await handleSaveEdit(conflictState.serverRevision);
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

  // ----------------------------------------------------
  // SUB-SCREEN: EDIT
  // ----------------------------------------------------
  if (subscreen === 'edit') {
    return (
      <ScrollView
        style={[styles.container, { backgroundColor: tokens.canvas }]}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.pageHeader}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Quay lại thiệp"
            onPress={handleBackFromEdit}
            style={styles.backButton}
          >
            <Text style={[styles.backGlyph, { color: tokens.primary }]}>‹</Text>
          </Pressable>
          <View style={styles.headerTitleWrap}>
            <Text style={[styles.eyebrow, { color: tokens.sage }]}>
              Phiên bản {selectedDesign?.revisionNumber ?? 1}
            </Text>
            <Text style={[styles.heading, { color: tokens.text }]}>Chỉnh sửa nội dung</Text>
          </View>
        </View>

        {conflictState?.hasConflict ? (
          <View
            style={[
              {
                backgroundColor: tokens.tagWarmBg,
                borderColor: tokens.tagWarmText,
                padding: 16,
                borderRadius: 8,
                borderWidth: 1,
                marginBottom: 16,
              },
            ]}
          >
            <Text style={{ fontWeight: '700', color: tokens.tagWarmText, fontSize: 14 }}>
              Xung đột phiên bản (409 Conflict)
            </Text>
            <Text style={{ color: tokens.text, fontSize: 13, marginTop: 4, lineHeight: 18 }}>
              Máy chủ hiện đang ở phiên bản #{conflictState.serverRevision} (bản bạn đang sửa dựa
              trên phiên bản #{conflictState.clientRevision}). Nội dung bạn vừa nhập vẫn được giữ
              nguyên bên dưới. Bạn có thể xem bản máy chủ hoặc xác nhận lưu đè nội dung của mình lên
              phiên bản mới.
            </Text>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Xem bản máy chủ"
                onPress={handleAcceptServerVersion}
                style={[
                  styles.outlineButton,
                  { flex: 1, borderColor: tokens.rule, paddingVertical: 8 },
                ]}
              >
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: '600',
                    color: tokens.text,
                    textAlign: 'center',
                  }}
                >
                  Xem bản máy chủ
                </Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Xác nhận lưu đè"
                onPress={() => void handleReapplyOnServerVersion()}
                style={[
                  styles.primaryButton,
                  { flex: 1, backgroundColor: tokens.primary, paddingVertical: 8 },
                ]}
              >
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: '600',
                    color: tokens.onPrimary,
                    textAlign: 'center',
                  }}
                >
                  Xác nhận lưu đè
                </Text>
              </Pressable>
            </View>
          </View>
        ) : null}

        {editError ? (
          <View
            accessibilityRole="alert"
            style={[
              styles.revisionAlert,
              {
                backgroundColor: tokens.tagWarmBg,
                borderColor: tokens.champagne,
                marginBottom: 12,
              },
            ]}
          >
            <Text style={{ color: tokens.tagWarmText, fontSize: 13 }}>{editError}</Text>
          </View>
        ) : null}

        <View
          style={[
            styles.revisionAlert,
            { backgroundColor: tokens.revisionAlertBg, borderColor: tokens.sage },
          ]}
        >
          <RotateCcwIcon size={18} color={tokens.sage} />
          <View style={styles.revisionAlertText}>
            <Text style={[styles.revisionAlertTitle, { color: tokens.sage }]}>
              Chỉnh sửa văn bản
            </Text>
            <Text style={[styles.revisionAlertDesc, { color: tokens.muted }]}>
              Thiết kế và bố cục được giữ nguyên theo chuẩn xưởng in.
            </Text>
          </View>
        </View>

        <View style={styles.formFields}>
          <View style={styles.formGroup}>
            <Text style={[styles.label, { color: tokens.primary }]}>Tên chú rể</Text>
            <TextInput
              value={groomName}
              onChangeText={setGroomName}
              placeholder="Tên chú rể"
              placeholderTextColor={tokens.muted}
              accessibilityLabel="Tên chú rể"
              style={[
                styles.input,
                {
                  backgroundColor: tokens.surface,
                  borderColor: tokens.rule,
                  color: tokens.text,
                },
              ]}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={[styles.label, { color: tokens.primary }]}>Tên cô dâu</Text>
            <TextInput
              value={brideName}
              onChangeText={setBrideName}
              placeholder="Tên cô dâu"
              placeholderTextColor={tokens.muted}
              accessibilityLabel="Tên cô dâu"
              style={[
                styles.input,
                {
                  backgroundColor: tokens.surface,
                  borderColor: tokens.rule,
                  color: tokens.text,
                },
              ]}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={[styles.label, { color: tokens.primary }]}>Lời chào</Text>
            <TextInput
              value={greeting}
              onChangeText={setGreeting}
              placeholder="Lời chào mở đầu"
              placeholderTextColor={tokens.muted}
              accessibilityLabel="Lời chào mở đầu"
              style={[
                styles.input,
                {
                  backgroundColor: tokens.surface,
                  borderColor: tokens.rule,
                  color: tokens.text,
                },
              ]}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={[styles.label, { color: tokens.primary }]}>Lời nhắn</Text>
            <TextInput
              value={message}
              onChangeText={setMessage}
              multiline
              numberOfLines={4}
              placeholder="Lời nhắn gửi khách mời"
              placeholderTextColor={tokens.muted}
              accessibilityLabel="Lời nhắn gửi khách mời"
              style={[
                styles.input,
                styles.textArea,
                {
                  backgroundColor: tokens.surface,
                  borderColor: tokens.rule,
                  color: tokens.text,
                },
              ]}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={[styles.label, { color: tokens.primary }]}>Chân trang / Lời cảm ơn</Text>
            <TextInput
              value={footer}
              onChangeText={setFooter}
              placeholder="Chân trang"
              placeholderTextColor={tokens.muted}
              accessibilityLabel="Chân trang"
              style={[
                styles.input,
                {
                  backgroundColor: tokens.surface,
                  borderColor: tokens.rule,
                  color: tokens.text,
                },
              ]}
            />
          </View>
        </View>

        <View style={styles.saveNote}>
          <LockIcon size={14} color={tokens.sage} />
          <Text style={[styles.saveNoteText, { color: tokens.muted }]}>
            Lưu thay đổi sẽ tạo một bản chỉnh sửa mới trên máy chủ.
          </Text>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Lưu bản chỉnh sửa"
          disabled={saving}
          onPress={() => void handleSaveEdit()}
          style={({ pressed }) => [
            styles.primaryButton,
            {
              backgroundColor: tokens.primary,
              borderColor: tokens.primary,
              opacity: pressed || saving ? 0.8 : 1,
            },
          ]}
        >
          {saving ? (
            <ActivityIndicator color={tokens.onPrimary} size="small" />
          ) : (
            <Text style={[styles.primaryButtonText, { color: tokens.onPrimary }]}>
              Lưu bản chỉnh sửa
            </Text>
          )}
        </Pressable>
      </ScrollView>
    );
  }

  // ----------------------------------------------------
  // SUB-SCREEN: SHARE
  // ----------------------------------------------------
  if (subscreen === 'share') {
    return (
      <ScrollView
        style={[styles.container, { backgroundColor: tokens.canvas }]}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.pageHeader}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Quay lại thiệp"
            onPress={() => {
              setSubscreen('preview');
              onNavigate('invite');
            }}
            style={styles.backButton}
          >
            <Text style={[styles.backGlyph, { color: tokens.primary }]}>‹</Text>
          </Pressable>
          <View style={styles.headerTitleWrap}>
            <Text style={[styles.eyebrow, { color: tokens.sage }]}>Chia sẻ</Text>
            <Text style={[styles.heading, { color: tokens.text }]}>Gửi thiệp đi</Text>
          </View>
        </View>

        <View
          style={[
            styles.shareCard,
            {
              backgroundColor: tokens.surface,
              borderColor: tokens.rule,
            },
          ]}
        >
          <View
            style={[
              styles.qrContainer,
              {
                backgroundColor: tokens.surfaceMuted,
                alignItems: 'center',
                justifyContent: 'center',
                paddingVertical: 16,
              },
            ]}
          >
            {publicUrl ? (
              <CanonicalQrCode payload={publicUrl} size={160} />
            ) : (
              <View style={{ alignItems: 'center', padding: 20 }}>
                <LockIcon size={56} color={tokens.muted} />
                <Text
                  style={{
                    fontSize: 13,
                    color: tokens.muted,
                    marginTop: 8,
                    textAlign: 'center',
                  }}
                >
                  Thiệp chưa được xuất bản công khai
                </Text>
              </View>
            )}
          </View>

          <Text style={[styles.shareCardTitle, { color: tokens.text }]}>
            Link thiệp cưới chính thức
          </Text>
          <Text style={[styles.shareCardDesc, { color: tokens.muted }]}>
            {publicUrl
              ? `Mã QR và liên kết mã hóa canonical payload do máy chủ cung cấp (Phiên bản xuất bản #${publication?.publicationRevision ?? 1}). Khách mời có thể xem thiệp trực tuyến.`
              : 'Thiệp chưa được xuất bản. Vui lòng bấm "Xuất bản thiệp cưới" bên dưới để nhận liên kết canonical và kích hoạt mã QR thật từ máy chủ.'}
          </Text>

          {publishError ? (
            <View
              accessibilityRole="alert"
              style={[
                styles.revisionAlert,
                {
                  backgroundColor: tokens.tagWarmBg,
                  borderColor: tokens.champagne,
                  marginBottom: 12,
                },
              ]}
            >
              <Text style={{ color: tokens.tagWarmText, fontSize: 13 }}>{publishError}</Text>
            </View>
          ) : null}

          {publicUrl ? (
            <View style={[styles.shareLinkBox, { backgroundColor: tokens.surfaceMuted }]}>
              <LinkIcon size={16} color={tokens.sage} />
              <Text style={[styles.shareLinkText, { color: tokens.sage }]} numberOfLines={1}>
                {publicUrl}
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Sao chép link"
                onPress={() => void handleCopyLink()}
                style={styles.copyButton}
              >
                {copied ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <CheckIcon size={14} color={tokens.sage} />
                    <Text style={{ fontSize: 11, color: tokens.sage, fontWeight: '600' }}>
                      Đã sao chép
                    </Text>
                  </View>
                ) : (
                  <Text style={{ fontSize: 11, color: tokens.sage, fontWeight: '600' }}>
                    Sao chép
                  </Text>
                )}
              </Pressable>
            </View>
          ) : null}

          {publicUrl ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Mở bảng chia sẻ"
              onPress={() => void handleOpenShare()}
              style={({ pressed }) => [
                styles.primaryButton,
                {
                  backgroundColor: tokens.primary,
                  borderColor: tokens.primary,
                  opacity: pressed ? 0.9 : 1,
                  marginBottom: 8,
                },
              ]}
            >
              <ShareIcon size={16} color={tokens.onPrimary} />
              <Text style={[styles.primaryButtonText, { color: tokens.onPrimary }]}>
                Mở bảng chia sẻ
              </Text>
            </Pressable>
          ) : (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Xuất bản thiệp cưới"
              disabled={publishing}
              onPress={() => void handlePublish()}
              style={({ pressed }) => [
                styles.primaryButton,
                {
                  backgroundColor: tokens.primary,
                  borderColor: tokens.primary,
                  opacity: pressed || publishing ? 0.8 : 1,
                  marginBottom: 8,
                },
              ]}
            >
              {publishing ? (
                <ActivityIndicator color={tokens.onPrimary} size="small" />
              ) : (
                <Text style={[styles.primaryButtonText, { color: tokens.onPrimary }]}>
                  Xuất bản thiệp cưới
                </Text>
              )}
            </Pressable>
          )}

          {publicUrl ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Thu hồi xuất bản"
              disabled={publishing}
              onPress={() => void handleUnpublish()}
              style={({ pressed }) => [
                styles.outlineButton,
                {
                  borderColor: tokens.rule,
                  opacity: pressed || publishing ? 0.7 : 1,
                  marginTop: 6,
                },
              ]}
            >
              <Text style={[styles.outlineButtonText, { color: tokens.muted, fontSize: 12 }]}>
                Thu hồi xuất bản (Gỡ liên kết)
              </Text>
            </Pressable>
          ) : null}

          <Text style={[styles.simulatedLabel, { color: tokens.earth, marginTop: 12 }]}>
            Hợp đồng OpenAPI pin 0a77391 không hỗ trợ GET đọc lại xuất bản (Blocker) · Trạng thái
            được duy trì trong phiên
          </Text>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Chia sẻ link riêng cho từng khách mời"
          onPress={() => onNavigate('guests')}
          style={[styles.secondaryRow, { borderBottomColor: tokens.rule }]}
        >
          <UsersIcon size={18} color={tokens.sage} />
          <View style={styles.secondaryRowCopy}>
            <Text style={[styles.secondaryRowTitle, { color: tokens.text }]}>
              Chia sẻ link riêng cho từng khách mời
            </Text>
            <Text style={[styles.secondaryRowSub, { color: tokens.muted }]}>
              Khác với link thiệp chung · xem thiệp cá nhân hóa theo nhóm
            </Text>
          </View>
          <ChevronRightIcon size={17} color={tokens.muted} />
        </Pressable>

        <View style={[styles.infoCallout, { borderTopColor: tokens.premium }]}>
          <CircleHelpIcon size={17} color={tokens.sage} />
          <Text style={[styles.infoCalloutText, { color: tokens.muted }]}>
            Link chung chỉ hiển thị nội dung công khai đã được duyệt.
          </Text>
        </View>
      </ScrollView>
    );
  }

  // ----------------------------------------------------
  // SUB-SCREEN: PREVIEW (DEFAULT)
  // ----------------------------------------------------
  return (
    <ScrollView
      style={[styles.container, { backgroundColor: tokens.canvas }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.pageHeader}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Về tổng quan"
          onPress={() => onNavigate('overview')}
          style={styles.backButton}
        >
          <Text style={[styles.backGlyph, { color: tokens.primary }]}>‹</Text>
        </Pressable>
        <View style={styles.headerTitleWrap}>
          <Text style={[styles.eyebrow, { color: tokens.sage }]}>Thiệp cưới</Text>
          <Text style={[styles.heading, { color: tokens.text }]}>Thiệp của hai bạn</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Tùy chọn khác"
          onPress={handleMorePress}
          style={styles.iconButton}
        >
          <MoreIcon size={20} color={tokens.primary} />
        </Pressable>
      </View>

      {loading && <ActivityIndicator color={tokens.primary} style={{ marginBottom: 12 }} />}

      {loadError && (
        <View
          accessibilityRole="alert"
          style={[
            styles.prototypeNote,
            {
              backgroundColor: tokens.tagWarmBg,
              borderLeftColor: tokens.champagne,
              marginBottom: 12,
            },
          ]}
        >
          <Text style={{ color: tokens.tagWarmText, fontSize: 13 }}>{loadError}</Text>
        </View>
      )}

      {/* Truthful Note */}
      <View
        style={[
          styles.prototypeNote,
          { backgroundColor: tokens.calloutBg, borderLeftColor: tokens.champagne },
        ]}
      >
        <SparklesIcon size={16} color={tokens.champagne} />
        <Text style={[styles.prototypeNoteText, { color: tokens.calloutText }]}>
          {selectedDesign
            ? `Bản xem trước thiệp cưới (${selectedDesign.title || 'Mẫu tiêu chuẩn'})`
            : 'Đang tải dữ liệu thiết kế từ máy chủ…'}
        </Text>
      </View>

      {/* Invitation Preview Card */}
      <View style={[styles.invitationPreview, { backgroundColor: tokens.previewBg }]}>
        <View
          style={[
            styles.previewArt,
            {
              backgroundColor: tokens.previewArt,
              borderColor: tokens.premium,
            },
          ]}
        >
          {/* Subtle Decorative Floral/Leaf Lines */}
          <View style={[styles.leafLine, styles.leafOne, { borderColor: tokens.champagne }]} />
          <View style={[styles.leafLine, styles.leafTwo, { borderColor: tokens.champagne }]} />

          <Text style={[styles.previewScript, { color: tokens.primary }]}>{coupleDisplay}</Text>

          <View style={[styles.previewRule, { borderTopColor: tokens.champagne }]} />

          <Text style={[styles.previewSmall, { color: tokens.earth }]}>{greeting}</Text>
          <Text style={[styles.previewDate, { color: tokens.earth }]}>{facts.formattedDate}</Text>
          <Text style={[styles.previewVenue, { color: tokens.primary }]}>
            {facts.venueName}
            {'\n'}
            <Text style={[styles.previewVenueSub, { color: tokens.muted }]}>
              {facts.hallName} · {facts.shiftTime}
            </Text>
          </Text>
        </View>

        <View style={styles.previewFooter}>
          <StatusTag
            tone={
              (selectedDesign as { status?: string })?.status === 'APPROVED'
                ? 'success'
                : (selectedDesign as { status?: string })?.status === 'IN_REVIEW'
                  ? 'warm'
                  : 'neutral'
            }
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <CheckIcon size={12} color={tokens.sage} />
              <Text style={{ fontSize: 10, color: tokens.sage, fontWeight: '600' }}>
                {(selectedDesign as { status?: string })?.status === 'APPROVED'
                  ? 'Đã duyệt nội dung'
                  : (selectedDesign as { status?: string })?.status === 'IN_REVIEW'
                    ? 'Đang xem lại'
                    : 'Bản nháp'}
              </Text>
            </View>
          </StatusTag>
          <Text style={[styles.previewVersion, { color: tokens.muted }]}>
            Phiên bản {selectedDesign?.revisionNumber ?? 1}
          </Text>
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.buttonRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Chỉnh sửa chữ"
          onPress={() => {
            setSubscreen('edit');
            onNavigate('edit');
          }}
          style={({ pressed }) => [
            styles.outlineButton,
            {
              borderColor: tokens.primary,
              backgroundColor: pressed ? tokens.surfaceMuted : 'transparent',
            },
          ]}
        >
          <Text style={[styles.outlineButtonText, { color: tokens.primary }]}>Chỉnh sửa chữ</Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Chia sẻ"
          onPress={() => {
            setSubscreen('share');
            onNavigate('share');
          }}
          style={({ pressed }) => [
            styles.primaryButton,
            {
              backgroundColor: tokens.primary,
              borderColor: tokens.primary,
              flex: 1,
              marginTop: 0,
              opacity: pressed ? 0.9 : 1,
            },
          ]}
        >
          <ShareIcon size={16} color={tokens.onPrimary} />
          <Text style={[styles.primaryButtonText, { color: tokens.onPrimary }]}>Chia sẻ</Text>
        </Pressable>
      </View>

      {/* Selected Variant Section */}
      <View style={styles.sectionBlock}>
        <View style={styles.sectionHeading}>
          <Text style={[styles.sectionTitle, { color: tokens.text }]}>Thiết kế thiệp</Text>
          <Text style={[styles.countBadge, { color: tokens.muted }]}>
            {designs.length > 0 ? `${designs.length} mẫu` : 'Chưa có'}
          </Text>
        </View>

        {designs.length > 0 ? (
          designs.map((item, idx) => {
            const isSelected = selectedDesign?.designId === item.designId;
            const initials = deriveInitials(
              item.textFields?.brideName,
              item.textFields?.groomName,
              facts.coupleDisplay,
            );
            return (
              <Pressable
                key={item.designId}
                accessibilityRole="radio"
                accessibilityState={{ checked: isSelected }}
                accessibilityLabel={item.title || `Thiết kế ${idx + 1}`}
                onPress={() => void handleSelectDesign(item)}
                style={[
                  styles.variantRow,
                  {
                    borderBottomColor: tokens.rule,
                    borderBottomWidth: idx === designs.length - 1 ? 0 : 1,
                  },
                ]}
              >
                <View
                  style={[
                    styles.variantThumb,
                    {
                      backgroundColor: isSelected ? '#E6DED1' : '#F3EFEA',
                      borderColor: tokens.champagne,
                    },
                  ]}
                >
                  <Text style={[styles.variantThumbText, { color: tokens.primary }]}>
                    {initials}
                  </Text>
                </View>
                <View style={styles.variantCopy}>
                  <Text style={[styles.variantTitle, { color: tokens.primary }]}>
                    {item.title || `Mẫu thiệp #${idx + 1}`}
                  </Text>
                  <Text style={[styles.variantDesc, { color: tokens.muted }]}>
                    Phiên bản {item.revisionNumber}
                  </Text>
                </View>
                {isSelected ? (
                  <CheckIcon size={18} color={tokens.primary} />
                ) : (
                  <ChevronRightIcon size={18} color={tokens.muted} />
                )}
              </Pressable>
            );
          })
        ) : (
          <View style={{ paddingVertical: 12 }}>
            <Text style={{ color: tokens.muted, fontSize: 13 }}>
              Chưa có mẫu thiệp nào được khởi tạo cho tiệc cưới này.
            </Text>
          </View>
        )}
      </View>

      {/* Toast */}
      {toastMessage ? (
        <View style={[styles.toast, { backgroundColor: tokens.primary }]}>
          <CheckIcon size={16} color={tokens.onPrimary} />
          <Text style={[styles.toastText, { color: tokens.onPrimary }]}>{toastMessage}</Text>
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 22,
    paddingTop: 18,
    paddingBottom: 96,
  },
  pageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 8,
  },
  backButton: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 4,
  },
  backGlyph: {
    fontSize: 32,
    lineHeight: 34,
    fontWeight: '300',
  },
  headerTitleWrap: {
    flex: 1,
  },
  eyebrow: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  heading: {
    fontSize: 21,
    lineHeight: 27,
    fontWeight: '600',
  },
  iconButton: {
    minWidth: 44,
    minHeight: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  prototypeNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    padding: 12,
    borderLeftWidth: 2,
    borderRadius: 4,
    marginBottom: 17,
  },
  prototypeNoteText: {
    fontSize: 12,
    lineHeight: 18,
    flex: 1,
  },
  invitationPreview: {
    borderRadius: 10,
    padding: 12,
  },
  previewArt: {
    height: 315,
    borderWidth: 1,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  leafLine: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderWidth: 1,
    borderRadius: 30,
    opacity: 0.35,
  },
  leafOne: {
    top: -20,
    left: -20,
  },
  leafTwo: {
    bottom: -20,
    right: -20,
  },
  previewScript: {
    fontSize: 24,
    lineHeight: 32,
    fontWeight: '600',
    textAlign: 'center',
    paddingHorizontal: 16,
  },
  previewRule: {
    width: 44,
    borderTopWidth: 1,
    marginVertical: 14,
  },
  previewSmall: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600',
    marginBottom: 6,
  },
  previewDate: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
    marginBottom: 8,
  },
  previewVenue: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  previewVenueSub: {
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '400',
  },
  previewFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  previewVersion: {
    fontSize: 11,
    lineHeight: 15,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  outlineButton: {
    minHeight: 44,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  outlineButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  primaryButton: {
    minHeight: 44,
    paddingHorizontal: 18,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  sectionBlock: {
    marginTop: 24,
  },
  sectionHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '600',
  },
  countBadge: {
    fontSize: 11,
    lineHeight: 15,
  },
  variantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  variantThumb: {
    width: 38,
    height: 38,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  variantThumbText: {
    fontSize: 12,
    fontWeight: '700',
  },
  variantCopy: {
    flex: 1,
  },
  variantTitle: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
  },
  variantDesc: {
    fontSize: 11,
    lineHeight: 15,
  },
  toast: {
    position: 'absolute',
    bottom: 24,
    left: 22,
    right: 22,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    shadowColor: '#000000',
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  toastText: {
    fontSize: 13,
    fontWeight: '600',
  },
  revisionAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 18,
  },
  revisionAlertText: {
    flex: 1,
  },
  revisionAlertTitle: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
  },
  revisionAlertDesc: {
    fontSize: 11,
    lineHeight: 15,
  },
  formFields: {
    gap: 14,
  },
  formGroup: {
    gap: 6,
  },
  label: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600',
  },
  input: {
    minHeight: 44,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 14,
  },
  textArea: {
    minHeight: 88,
    paddingTop: 10,
    textAlignVertical: 'top',
  },
  saveNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginVertical: 14,
  },
  saveNoteText: {
    fontSize: 11,
    lineHeight: 15,
  },
  shareCard: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
    marginBottom: 20,
  },
  qrContainer: {
    width: 140,
    height: 140,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  shareCardTitle: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '600',
    marginBottom: 4,
  },
  shareCardDesc: {
    fontSize: 12,
    lineHeight: 17,
    textAlign: 'center',
    paddingHorizontal: 8,
    marginBottom: 14,
  },
  shareLinkBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 6,
    marginBottom: 14,
    width: '100%',
  },
  shareLinkText: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '500',
    flex: 1,
  },
  copyButton: {
    minHeight: 44,
    paddingHorizontal: 10,
    justifyContent: 'center',
  },
  simulatedLabel: {
    fontSize: 11,
    lineHeight: 15,
    marginTop: 8,
  },
  secondaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    gap: 12,
  },
  secondaryRowCopy: {
    flex: 1,
  },
  secondaryRowTitle: {
    fontSize: 14,
    lineHeight: 19,
    fontWeight: '600',
  },
  secondaryRowSub: {
    fontSize: 11,
    lineHeight: 15,
  },
  infoCallout: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: 14,
    marginTop: 8,
    borderTopWidth: 1,
  },
  infoCalloutText: {
    fontSize: 11,
    lineHeight: 16,
    flex: 1,
  },
});
