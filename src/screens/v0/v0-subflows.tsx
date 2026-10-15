import * as ImagePicker from 'expo-image-picker';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  CircleHelpIcon,
  ClockIcon,
  FileTextIcon,
  ImageIcon,
  LockIcon,
  StatusTag,
  UsersIcon,
} from '@/components/v0-primitives';
import {
  createAppInvitationGateway,
  type AppPrintOrderView,
} from '@/features/invitation-studio/app-invitation-api';
import {
  createCoupleBillingGateway,
  type CommercialContractView,
  type CommercialAppendixView,
  type IncidentalExpensesView,
  type CommercialInvoiceView,
  type GuestGroupView,
  type NamedGuestView,
} from '@/features/payments-billing/billing-api';
import { ApiClientError } from '@/lib/api/client';
import { useWeddingTheme } from '@/theme';
import {
  RestoredInvoicePanel,
  RestoredTimelinePanel,
  RestoredCommercialPanel,
  RestoredGuestPanel,
  RestoredPrintPanel,
} from './restored-flow-controls';
import { saveOrShareDownloadedFile } from '@/lib/save-downloaded-file';
import type { V0CommonProps } from './v0-types';

const money = (value: number) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);

const coupleBilling = createCoupleBillingGateway();

function printStatusMeta(status: AppPrintOrderView['status']) {
  switch (status) {
    case 'REQUESTED':
      return { label: 'Chờ báo giá', tone: 'neutral' as const };
    case 'QUOTED':
      return { label: 'Đã có báo giá', tone: 'warm' as const };
    case 'APPROVED':
      return { label: 'Đã duyệt báo giá', tone: 'success' as const };
    case 'IN_PRODUCTION':
      return { label: 'Đang sản xuất', tone: 'warm' as const };
    case 'READY_FOR_HANDOVER':
      return { label: 'Sẵn sàng bàn giao', tone: 'success' as const };
    case 'HANDED_OVER':
      return { label: 'Đã bàn giao', tone: 'success' as const };
    case 'CANCELLED':
      return { label: 'Đã hủy đơn', tone: 'neutral' as const };
    default:
      return { label: status, tone: 'neutral' as const };
  }
}

// ====================================================
// 1. SCHEDULE SUBFLOW
// ====================================================
export function V0ScheduleSubflow({ activeBooking, facts, onNavigate, session }: V0CommonProps) {
  const { tokens } = useWeddingTheme();
  const timelineItems = activeBooking?.timeline ?? [];
  const timelineRevision = activeBooking?.timelineRevision;
  const hasEffectiveTimeline = timelineRevision !== null && timelineRevision !== undefined;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: tokens.canvas }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <RestoredTimelinePanel activeBooking={activeBooking} session={session} />
      <View style={styles.pageHeader}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Về kế hoạch"
          onPress={() => onNavigate('plan')}
          style={styles.backButton}
        >
          <Text style={[styles.backGlyph, { color: tokens.primary }]}>‹</Text>
        </Pressable>
        <View style={styles.headerTitleWrap}>
          <Text style={[styles.eyebrow, { color: tokens.sage }]}>Kế hoạch</Text>
          <Text style={[styles.heading, { color: tokens.text }]}>Lịch trình buổi tiệc</Text>
        </View>
      </View>

      <View
        style={[
          styles.calloutCard,
          { backgroundColor: tokens.surface, borderColor: tokens.premium },
        ]}
      >
        <Text style={[styles.calloutTitle, { color: tokens.primary }]}>
          Lễ cưới {facts.coupleDisplay}
        </Text>
        <Text style={[styles.calloutSubtitle, { color: tokens.muted }]}>
          {facts.formattedDate} · {facts.shiftTime} · {facts.hallName}
        </Text>
        <Text style={{ fontSize: 11, color: tokens.sage, marginTop: 6, fontWeight: '600' }}>
          {hasEffectiveTimeline
            ? `Phiên bản lịch trình #${timelineRevision} đang có hiệu lực`
            : 'Chưa có lịch trình có hiệu lực (đang hoàn thiện kịch bản)'}
        </Text>
      </View>

      <View style={styles.scheduleList}>
        {timelineItems.length > 0 ? (
          timelineItems.map((item, idx) => (
            <View
              key={item.itemId || idx}
              style={[
                styles.scheduleRow,
                {
                  borderBottomColor: tokens.rule,
                  borderBottomWidth: idx === timelineItems.length - 1 ? 0 : 1,
                },
              ]}
            >
              <View style={styles.scheduleTimeWrap}>
                <ClockIcon size={14} color={tokens.sage} />
                <Text style={[styles.scheduleTime, { color: tokens.primary }]}>
                  {item.startTime}
                </Text>
              </View>
              <View style={styles.scheduleBody}>
                <View style={styles.scheduleHeaderRow}>
                  <Text style={[styles.scheduleItemTitle, { color: tokens.text }]}>
                    {item.title}
                  </Text>
                </View>
                {item.description ? (
                  <Text style={[styles.scheduleItemDesc, { color: tokens.muted }]}>
                    {item.description}
                  </Text>
                ) : null}
              </View>
            </View>
          ))
        ) : (
          <View style={styles.emptyCard}>
            <ClockIcon size={24} color={tokens.sage} />
            <Text style={[styles.emptyCardTitle, { color: tokens.text }]}>
              Kịch bản chi tiết đang được chuẩn bị
            </Text>
            <Text style={[styles.emptyCardDesc, { color: tokens.muted }]}>
              Lịch trình điều phối các phần nghi thức và tiệc sẽ được cập nhật trực tiếp tại đây sau
              khi được quản lý tiệc cưới hoàn thiện và phê duyệt.
            </Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

// ====================================================
// 2. MEDIA SUBFLOW
// ====================================================
export function V0MediaSubflow({
  activeBooking,
  facts,
  invitationGateway,
  onNavigate,
  session,
}: V0CommonProps) {
  const { tokens } = useWeddingTheme();
  const gateway = invitationGateway ?? createAppInvitationGateway();

  const [uploading, setUploading] = useState(false);
  const [altText, setAltText] = useState('');
  const [uploadedAssets, setUploadedAssets] = useState<
    readonly { assetId: string; previewPath: string; name: string; altText: string }[]
  >([]);
  const [currentTime] = useState(() => Date.now());
  const activeUploadIntentRef = useRef<string | null>(null);

  // Dynamic cutoff check against event date and shift start time
  const shiftStartTime = activeBooking?.shift?.startTime ?? '11:00';
  const eventDateTime = facts.eventDate
    ? new Date(`${facts.eventDate}T${shiftStartTime}:00+07:00`)
    : new Date();
  const cutoffTime = new Date(eventDateTime.getTime() - 72 * 60 * 60 * 1000);
  const isCutoffPassed = currentTime > cutoffTime.getTime();
  const cutoffFormatted = cutoffTime.toLocaleString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  const handlePickAndUpload = async () => {
    if (isCutoffPassed) {
      Alert.alert(
        'Đã quá thời hạn cutoff',
        `Thời hạn tải ảnh đã kết thúc vào ${cutoffFormatted} (72 giờ trước giờ bắt đầu tiệc cưới). Kho ảnh đã được khóa để nhà hàng chuẩn bị trình chiếu.`,
      );
      return;
    }
    if (!session || !activeBooking?.bookingId || uploading) return;

    const trimmedAlt = altText.trim().normalize('NFC');
    if (!trimmedAlt) {
      Alert.alert(
        'Yêu cầu mô tả ảnh',
        'Vui lòng nhập mô tả ảnh (alt text) từ 1 đến 250 ký tự trước khi chọn tệp ảnh để tải lên.',
      );
      return;
    }
    if (trimmedAlt.length > 250) {
      Alert.alert('Mô tả quá dài', 'Mô tả ảnh tối đa 250 ký tự.');
      return;
    }

    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert(
          'Quyền truy cập thư viện ảnh',
          'Ứng dụng cần quyền truy cập thư viện ảnh để hai bạn chọn ảnh trình chiếu trong lễ cưới.',
        );
        return;
      }

      const pickerResult = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 1,
      });

      if (pickerResult.canceled || !pickerResult.assets || pickerResult.assets.length === 0) {
        return;
      }

      const pickedAsset = pickerResult.assets[0];
      if (!pickedAsset || !pickedAsset.uri) return;

      // 25 MiB maximum limit check
      const maxBytes = 25 * 1024 * 1024;
      if (pickedAsset.fileSize && pickedAsset.fileSize > maxBytes) {
        Alert.alert(
          'Tệp quá lớn',
          `Dung lượng ảnh là ${(pickedAsset.fileSize / (1024 * 1024)).toFixed(1)} MiB, vượt quá giới hạn tối đa 25 MiB mỗi tệp ảnh.`,
        );
        return;
      }

      // Check allowed MIME types
      const mime = pickedAsset.mimeType ?? 'image/jpeg';
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(mime)) {
        Alert.alert('Định dạng không hỗ trợ', 'Vui lòng chọn ảnh định dạng JPEG, PNG hoặc WebP.');
        return;
      }

      setUploading(true);

      let intentKey = activeUploadIntentRef.current;
      if (!intentKey) {
        intentKey = `app-media-upload:${crypto.randomUUID()}`;
        activeUploadIntentRef.current = intentKey;
      }

      const fileName = pickedAsset.fileName || `wedding-photo-${Date.now()}.jpg`;
      const filePayload = {
        uri: pickedAsset.uri,
        name: fileName,
        type: mime,
      };

      const asset = await session.authorize((token) =>
        gateway.uploadWeddingMedia(
          token,
          activeBooking.bookingId,
          activeBooking.revision,
          filePayload,
          trimmedAlt,
          intentKey,
        ),
      );

      activeUploadIntentRef.current = null;
      setUploadedAssets((prev) => [
        ...prev,
        {
          assetId: asset.mediaAssetId,
          previewPath: asset.previewPath,
          name: fileName,
          altText: trimmedAlt,
        },
      ]);
      setAltText('');
      Alert.alert('Thành công', 'Đã tải ảnh lên kho ảnh cưới thành công.');
    } catch (caught: unknown) {
      if (caught instanceof ApiClientError && caught.status === 403) {
        Alert.alert(
          'Đã khóa kho ảnh (403)',
          'Thời hạn tải ảnh đã kết thúc hoặc kho ảnh đã được khóa bởi người quản lý.',
        );
      } else if (caught instanceof ApiClientError && caught.status === 409) {
        Alert.alert(
          'Xung đột phiên bản (409)',
          'Hồ sơ đặt tiệc vừa có cập nhật mới. Vui lòng làm mới trang trước khi tải ảnh tiếp.',
        );
      } else if (caught instanceof ApiClientError && caught.status === 413) {
        Alert.alert(
          'Tệp quá dung lượng (413)',
          'Ảnh vượt quá dung lượng tối đa cho phép (25 MiB).',
        );
      } else if (caught instanceof ApiClientError && caught.status === 422) {
        Alert.alert('Tệp không hợp lệ (422)', 'Định dạng tệp ảnh không đúng chuẩn JPEG/PNG/WebP.');
      } else {
        Alert.alert(
          'Lỗi tải ảnh',
          caught instanceof Error ? caught.message : 'Không thể tải ảnh lên kho ảnh.',
        );
      }
    } finally {
      setUploading(false);
    }
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: tokens.canvas }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.pageHeader}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Về kế hoạch"
          onPress={() => onNavigate('plan')}
          style={styles.backButton}
        >
          <Text style={[styles.backGlyph, { color: tokens.primary }]}>‹</Text>
        </Pressable>
        <View style={styles.headerTitleWrap}>
          <Text style={[styles.eyebrow, { color: tokens.sage }]}>Kế hoạch</Text>
          <Text style={[styles.heading, { color: tokens.text }]}>Ảnh trình chiếu</Text>
        </View>
      </View>

      <View
        style={[styles.calloutCard, { backgroundColor: tokens.surface, borderColor: tokens.rule }]}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <LockIcon size={16} color={tokens.sage} />
          <Text style={[styles.calloutTitle, { color: tokens.primary }]}>Kho ảnh cưới bảo mật</Text>
        </View>
        <Text style={[styles.calloutSubtitle, { color: tokens.muted }]}>
          Ảnh chỉ hiển thị trong không gian tiệc cưới và màn hình trình chiếu của hai bạn tại{' '}
          {facts.hallName}.
        </Text>
      </View>

      {/* Cutoff Status Card */}
      <View
        style={[
          styles.calloutCard,
          {
            backgroundColor: isCutoffPassed ? tokens.tagWarmBg : tokens.surface,
            borderColor: isCutoffPassed ? tokens.champagne : tokens.rule,
          },
        ]}
      >
        <Text style={[styles.calloutTitle, { color: tokens.text, marginBottom: 4 }]}>
          Thời hạn tải ảnh (Cutoff 72 giờ)
        </Text>
        <Text style={{ fontSize: 13, color: isCutoffPassed ? tokens.tagWarmText : tokens.sage }}>
          {isCutoffPassed
            ? `Đã khóa tải ảnh từ ${cutoffFormatted}`
            : `Hạn chót tải ảnh: ${cutoffFormatted}`}
        </Text>
      </View>

      <View style={styles.policyBlock}>
        <Text style={[styles.policyTitle, { color: tokens.text }]}>Quy định lưu trữ ảnh tiệc</Text>
        <Text style={[styles.policyText, { color: tokens.muted }]}>
          • Tối đa 100 ảnh / 1 GiB cho mỗi tiệc cưới.{'\n'}• Giới hạn dung lượng tối đa 25 MiB mỗi
          tệp ảnh (định dạng JPEG, PNG, WebP).{'\n'}• Bắt buộc nhập mô tả ảnh (alt text từ 1 đến 250
          ký tự).{'\n'}• Thời hạn cutoff: Ảnh cần được tải lên trước 72 giờ so với giờ tiệc (
          {cutoffFormatted}). Sau thời điểm này, kho ảnh sẽ được khóa để đội ngũ kỹ thuật nhà hàng
          chuẩn bị trình chiếu.
        </Text>
      </View>

      {/* Uploaded Assets in Session */}
      {uploadedAssets.length > 0 ? (
        <View style={{ marginTop: 16 }}>
          <Text style={[styles.policyTitle, { color: tokens.text, marginBottom: 8 }]}>
            Ảnh đã tải lên trong phiên ({uploadedAssets.length} ảnh)
          </Text>
          {uploadedAssets.map((asset) => (
            <View
              key={asset.assetId}
              style={[
                styles.factRow,
                {
                  paddingVertical: 10,
                  borderBottomWidth: 1,
                  borderBottomColor: tokens.rule,
                },
              ]}
            >
              <View style={{ flex: 1, gap: 2 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <ImageIcon size={16} color={tokens.sage} />
                  <Text style={{ fontSize: 13, color: tokens.text, fontWeight: '600' }}>
                    {asset.name}
                  </Text>
                </View>
                <Text style={{ fontSize: 11, color: tokens.muted }}>Mô tả: {asset.altText}</Text>
                <Text style={{ fontSize: 10, color: tokens.sage }}>Mã ảnh: {asset.assetId}</Text>
              </View>
            </View>
          ))}
        </View>
      ) : null}

      <View style={{ marginTop: 16 }}>
        <TextInput
          value={altText}
          onChangeText={setAltText}
          placeholder="Nhập mô tả ảnh trình chiếu (bắt buộc, 1-250 ký tự)"
          placeholderTextColor={tokens.muted}
          editable={!isCutoffPassed && !uploading}
          maxLength={250}
          style={[
            styles.input,
            {
              backgroundColor: tokens.surface,
              borderColor: tokens.rule,
              color: tokens.text,
              marginBottom: 12,
            },
          ]}
        />

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Chọn ảnh từ máy"
          disabled={uploading || isCutoffPassed}
          onPress={() => void handlePickAndUpload()}
          style={({ pressed }) => [
            styles.primaryButton,
            {
              backgroundColor: isCutoffPassed ? tokens.surfaceMuted : tokens.primary,
              borderColor: isCutoffPassed ? tokens.rule : tokens.primary,
              opacity: pressed || uploading ? 0.8 : 1,
            },
          ]}
        >
          {uploading ? (
            <ActivityIndicator color={tokens.onPrimary} size="small" />
          ) : (
            <>
              <ImageIcon size={16} color={isCutoffPassed ? tokens.muted : tokens.onPrimary} />
              <Text
                style={[
                  styles.primaryButtonText,
                  { color: isCutoffPassed ? tokens.muted : tokens.onPrimary },
                ]}
              >
                {isCutoffPassed ? 'Đã khóa kho ảnh' : 'Chọn ảnh thực tế từ thiết bị'}
              </Text>
            </>
          )}
        </Pressable>
      </View>

      <Text style={{ fontSize: 11, color: tokens.earth, marginTop: 16, lineHeight: 16 }}>
        Lưu ý: Hợp đồng máy chủ chưa có endpoint GET /bookings/{'{id}'}/media để tải lại toàn bộ
        danh sách ảnh cũ đã tải từ trước (Blocker). Ứng dụng hiển thị các ảnh được tải lên trong
        phiên làm việc hiện tại.
      </Text>
    </ScrollView>
  );
}

// ====================================================
// 3. PRINT SUBFLOW (READ-ONLY MOBILE MVP)
// ====================================================
export function V0PrintSubflow({
  activeBooking,
  invitationGateway,
  onNavigate,
  session,
}: V0CommonProps) {
  const { tokens } = useWeddingTheme();
  const gateway = invitationGateway ?? createAppInvitationGateway();

  const [orders, setOrders] = useState<readonly AppPrintOrderView[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentTime] = useState(() => Date.now());

  useEffect(() => {
    let active = true;
    void (async () => {
      if (!session || !activeBooking?.bookingId) return;
      setLoading(true);
      setError(null);
      try {
        const items = await session.authorize((token) =>
          gateway.listPrintOrders(token, activeBooking.bookingId),
        );
        if (active) setOrders(items);
      } catch (caught) {
        if (active) {
          setError(
            caught instanceof Error ? caught.message : 'Chưa tải được danh sách đơn in thiệp.',
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [session, activeBooking?.bookingId, gateway]);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: tokens.canvas }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <RestoredPrintPanel activeBooking={activeBooking} session={session} />
      <View style={styles.pageHeader}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Về kế hoạch"
          onPress={() => onNavigate('plan')}
          style={styles.backButton}
        >
          <Text style={[styles.backGlyph, { color: tokens.primary }]}>‹</Text>
        </Pressable>
        <View style={styles.headerTitleWrap}>
          <Text style={[styles.eyebrow, { color: tokens.sage }]}>Kế hoạch</Text>
          <Text style={[styles.heading, { color: tokens.text }]}>Đơn in thiệp cưới</Text>
        </View>
      </View>

      {/* Read-Only MVP Notice */}
      <View
        style={[
          styles.calloutCard,
          { backgroundColor: tokens.surface, borderColor: tokens.champagne },
        ]}
      >
        <Text style={[styles.calloutTitle, { color: tokens.primary, marginBottom: 4 }]}>
          Thông tin đơn in và thao tác theo trạng thái
        </Text>
        <Text style={[styles.calloutSubtitle, { color: tokens.muted }]}>
          Chỉ thao tác khi máy chủ cho phép. Báo giá, phiên bản và thời hạn được lấy từ dữ liệu thực
          tế của đơn in.
        </Text>
      </View>

      {loading && <ActivityIndicator color={tokens.primary} style={{ marginVertical: 16 }} />}

      {error ? (
        <View style={[styles.emptyCard, { borderColor: tokens.champagne, marginBottom: 16 }]}>
          <Text style={{ color: tokens.tagWarmText, fontSize: 13 }}>{error}</Text>
        </View>
      ) : null}

      {orders.length > 0 ? (
        orders.map((order) => {
          const rev = order.currentCommercialRevision;
          const statusInfo = printStatusMeta(order.status);
          const isExpired = rev?.expiresAt
            ? new Date(rev.expiresAt).getTime() <= currentTime
            : false;

          return (
            <View
              key={order.orderId}
              style={[
                styles.calloutCard,
                { backgroundColor: tokens.surface, borderColor: tokens.rule, marginBottom: 16 },
              ]}
            >
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <Text style={[styles.calloutTitle, { color: tokens.text }]}>
                  Đơn in #{order.orderId.slice(0, 8)}
                </Text>
                <StatusTag tone={statusInfo.tone}>{statusInfo.label}</StatusTag>
              </View>

              <Text style={{ fontSize: 11, color: tokens.muted, marginTop: 4 }}>
                Phiên bản đơn in: #{order.revision}
              </Text>

              {rev ? (
                <View style={{ gap: 6, marginTop: 12 }}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: tokens.sage }}>
                    Chi tiết các dòng in (Bản thương mại #{rev.revisionNumber}):
                  </Text>
                  {rev.lines.map((line, lIdx) => (
                    <View
                      key={line.lineId || lIdx}
                      style={{
                        paddingVertical: 6,
                        borderBottomWidth: 1,
                        borderBottomColor: tokens.rule,
                      }}
                    >
                      <View style={styles.factRow}>
                        <Text style={{ fontSize: 12, color: tokens.text, fontWeight: '600' }}>
                          Mẫu: {line.designId.slice(0, 8)}
                          {line.designRevisionId
                            ? ` (Rev ${line.designRevisionId.slice(0, 6)})`
                            : ''}
                        </Text>
                        <Text style={{ fontSize: 12, fontWeight: '600', color: tokens.primary }}>
                          {line.quantity} bộ × {money(line.unitPriceVnd)}
                        </Text>
                      </View>
                      <View style={styles.factRow}>
                        <Text style={{ fontSize: 11, color: tokens.muted }}>Thành tiền dòng:</Text>
                        <Text style={{ fontSize: 12, fontWeight: '600', color: tokens.text }}>
                          {money(line.lineTotalVnd)}
                        </Text>
                      </View>
                    </View>
                  ))}

                  <View
                    style={[
                      styles.factRow,
                      {
                        borderTopWidth: 1,
                        borderTopColor: tokens.rule,
                        paddingTop: 8,
                        marginTop: 4,
                      },
                    ]}
                  >
                    <Text style={{ fontSize: 13, fontWeight: '700', color: tokens.primary }}>
                      Tổng tiền báo giá:
                    </Text>
                    <Text style={{ fontSize: 15, fontWeight: '700', color: tokens.primary }}>
                      {money(rev.orderTotalVnd)}
                    </Text>
                  </View>

                  {rev.estimatedHandoverAt ? (
                    <Text style={{ fontSize: 11, color: tokens.muted, marginTop: 4 }}>
                      Dự kiến bàn giao:{' '}
                      {new Date(rev.estimatedHandoverAt).toLocaleDateString('vi-VN')}
                    </Text>
                  ) : null}

                  {rev.expiresAt ? (
                    <Text
                      style={{
                        fontSize: 11,
                        color: isExpired ? tokens.tagWarmText : tokens.earth,
                        marginTop: 4,
                      }}
                    >
                      {isExpired ? 'Đã hết hạn duyệt: ' : 'Hạn duyệt báo giá: '}
                      {new Date(rev.expiresAt).toLocaleDateString('vi-VN')}
                    </Text>
                  ) : null}
                </View>
              ) : (
                <Text style={{ fontSize: 13, color: tokens.muted, marginTop: 8 }}>
                  Xưởng in đang chuẩn bị báo giá chi tiết.
                </Text>
              )}

              {/* Pending Replacement Proposal Block */}
              {order.pendingReplacementProposal ? (
                <View
                  style={{
                    backgroundColor: tokens.surfaceMuted,
                    borderRadius: 8,
                    padding: 12,
                    marginTop: 12,
                    borderWidth: 1,
                    borderColor: tokens.champagne,
                  }}
                >
                  <Text style={{ fontSize: 12, fontWeight: '700', color: tokens.primary }}>
                    Đề xuất báo giá thay thế mới (#{order.pendingReplacementProposal.revisionNumber}
                    ):
                  </Text>
                  <Text
                    style={{ fontSize: 13, fontWeight: '600', color: tokens.primary, marginTop: 4 }}
                  >
                    Tổng tiền mới: {money(order.pendingReplacementProposal.orderTotalVnd)}
                  </Text>
                  {order.pendingReplacementProposal.expiresAt ? (
                    <Text style={{ fontSize: 11, color: tokens.earth, marginTop: 2 }}>
                      Hạn duyệt:{' '}
                      {new Date(order.pendingReplacementProposal.expiresAt).toLocaleDateString(
                        'vi-VN',
                      )}
                    </Text>
                  ) : null}
                </View>
              ) : null}
            </View>
          );
        })
      ) : !loading ? (
        <View style={styles.emptyCard}>
          <FileTextIcon size={24} color={tokens.sage} />
          <Text style={[styles.emptyCardTitle, { color: tokens.text }]}>
            Chưa có đơn in thiệp cưới
          </Text>
          <Text style={[styles.emptyCardDesc, { color: tokens.muted }]}>
            Hai bạn có thể gửi yêu cầu in thiệp giấy từ mẫu thiết kế đã chọn thông qua Cổng quản lý
            Web hoặc liên hệ nhân viên quản lý tiệc cưới.
          </Text>
        </View>
      ) : null}
    </ScrollView>
  );
}

// ====================================================
// 4. GUESTS & SEATING SUBFLOW (REAL SERVER READ-ONLY)
// ====================================================
export function V0GuestsSubflow({ activeBooking, facts, onNavigate, session }: V0CommonProps) {
  const { tokens } = useWeddingTheme();
  const [groups, setGroups] = useState<GuestGroupView>([]);
  const [guests, setGuests] = useState<NamedGuestView['items']>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void (async () => {
      if (!session || !activeBooking?.bookingId) return;
      setLoading(true);
      setError(null);
      try {
        const [loadedGroups, loadedGuests] = await session.authorize(async (token) => {
          const gGroups = await coupleBilling.loadGuestGroups(token, activeBooking.bookingId);
          const gGuests = await coupleBilling.loadGuests(token, activeBooking.bookingId);
          return [gGroups, gGuests.items] as const;
        });
        if (active) {
          setGroups(loadedGroups);
          setGuests(loadedGuests);
        }
      } catch (caught) {
        if (active) {
          setError(
            caught instanceof Error
              ? caught.message
              : 'Chưa tải được danh sách nhóm khách mời từ máy chủ.',
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [session, activeBooking?.bookingId]);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: tokens.canvas }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <RestoredGuestPanel activeBooking={activeBooking} session={session} />
      <View style={styles.pageHeader}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Về kế hoạch"
          onPress={() => onNavigate('plan')}
          style={styles.backButton}
        >
          <Text style={[styles.backGlyph, { color: tokens.primary }]}>‹</Text>
        </Pressable>
        <View style={styles.headerTitleWrap}>
          <Text style={[styles.eyebrow, { color: tokens.sage }]}>Kế hoạch</Text>
          <Text style={[styles.heading, { color: tokens.text }]}>Khách mời & chỗ ngồi</Text>
        </View>
      </View>

      <View
        style={[
          styles.calloutCard,
          { backgroundColor: tokens.surface, borderColor: tokens.premium },
        ]}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
          <CircleHelpIcon size={16} color={tokens.sage} />
          <Text style={[styles.calloutTitle, { color: tokens.primary }]}>
            Quy định danh sách & sơ đồ bàn
          </Text>
        </View>
        <Text style={[styles.calloutSubtitle, { color: tokens.muted }]}>
          • Quản lý theo Nhóm (Group) và Danh sách khách mời tùy chọn.{'\n'}• Sơ đồ bàn tiệc hoạt
          động theo Nhóm mà không bắt buộc phải có tên khách cụ thể.{'\n'}• Hệ thống không lưu trữ
          danh tính theo Hộ gia đình (Household).{'\n'}• Khách mời chỉ xem thiệp trực tuyến, không
          có tính năng phản hồi RSVP.{'\n'}• Điểm danh (Check-in) là tùy chọn opt-in cho từng tiệc
          và mặc định TẮT. Khi tắt, hệ thống không ghi nhận chứ không phải là 0 khách tham dự.
        </Text>
      </View>

      <View
        style={[
          styles.calloutCard,
          { backgroundColor: tokens.surface, borderColor: tokens.rule, marginTop: 12 },
        ]}
      >
        <Text style={[styles.calloutTitle, { color: tokens.text, marginBottom: 8 }]}>
          Kế hoạch sảnh tiệc & số lượng khách
        </Text>
        <View style={styles.factRow}>
          <Text style={{ fontSize: 13, color: tokens.muted }}>Sảnh tiệc đã xác nhận:</Text>
          <Text style={{ fontSize: 13, fontWeight: '600', color: tokens.text }}>
            {facts.hallName}
          </Text>
        </View>
        <View style={styles.factRow}>
          <Text style={{ fontSize: 13, color: tokens.muted }}>Khung giờ tiệc:</Text>
          <Text style={{ fontSize: 13, fontWeight: '600', color: tokens.text }}>
            {facts.shiftTime}
          </Text>
        </View>
        <View style={styles.factRow}>
          <Text style={{ fontSize: 13, color: tokens.muted }}>Số lượng khách kế hoạch:</Text>
          <Text style={{ fontSize: 14, fontWeight: '700', color: tokens.primary }}>
            {facts.planningHeadcount} khách
          </Text>
        </View>
        <Text style={{ fontSize: 11, color: tokens.earth, marginTop: 4 }}>
          Số lượng khách kế hoạch do Cặp đôi / Quản lý nhập độc lập, không phụ thuộc và không bị ảnh
          hưởng bởi số lượng tên khách trong danh sách.
        </Text>
      </View>

      {loading && <ActivityIndicator color={tokens.primary} style={{ marginVertical: 16 }} />}

      {error ? (
        <View style={[styles.emptyCard, { borderColor: tokens.champagne, marginBottom: 16 }]}>
          <Text style={{ color: tokens.tagWarmText, fontSize: 13 }}>{error}</Text>
        </View>
      ) : null}

      <View style={{ marginTop: 18 }}>
        <Text style={[styles.policyTitle, { color: tokens.text, marginBottom: 8 }]}>
          Danh sách Nhóm khách mời từ máy chủ ({groups.length} nhóm)
        </Text>

        {groups.length > 0 ? (
          groups.map((grp) => {
            const groupGuests = guests.filter((g) => g.guestGroupId === grp.guestGroupId);
            return (
              <View
                key={grp.guestGroupId}
                style={[
                  styles.calloutCard,
                  {
                    backgroundColor: tokens.surface,
                    borderColor: tokens.rule,
                    marginBottom: 10,
                  },
                ]}
              >
                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <Text style={{ fontSize: 14, fontWeight: '700', color: tokens.text }}>
                    {grp.name}
                  </Text>
                  <StatusTag tone={grp.status === 'ACTIVE' ? 'success' : 'neutral'}>
                    {grp.status}
                  </StatusTag>
                </View>
                <Text style={{ fontSize: 12, color: tokens.muted, marginTop: 4 }}>
                  Khách mời đã gán ({groupGuests.length} người):{' '}
                  {groupGuests.length > 0
                    ? groupGuests.map((g) => g.name).join(', ')
                    : 'Chưa có tên cụ thể (xếp theo nhóm)'}
                </Text>
              </View>
            );
          })
        ) : !loading ? (
          <View style={styles.emptyCard}>
            <UsersIcon size={24} color={tokens.sage} />
            <Text style={[styles.emptyCardTitle, { color: tokens.text }]}>
              Chưa có nhóm khách mời nào được lưu trên máy chủ
            </Text>
            <Text style={[styles.emptyCardDesc, { color: tokens.muted }]}>
              Hai bạn có thể tổ chức nhóm khách mời và phân bổ bàn tiệc thông qua Cổng quản lý Web.
            </Text>
          </View>
        ) : null}
      </View>
    </ScrollView>
  );
}

// ====================================================
// 5. CONTRACTS SUBFLOW
// ====================================================
export function V0ContractsSubflow({ activeBooking, onNavigate, session }: V0CommonProps) {
  const { tokens } = useWeddingTheme();
  const [contract, setContract] = useState<CommercialContractView | null>(null);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void (async () => {
      if (!session || !activeBooking?.bookingId) return;
      setLoading(true);
      setError(null);
      try {
        const loaded = await session.authorize((token) =>
          coupleBilling.loadContracts(token, activeBooking.bookingId),
        );
        if (active) setContract(loaded);
      } catch (caught) {
        if (active) {
          setError(
            caught instanceof Error
              ? caught.message
              : 'Chưa tải được thông tin hợp đồng thương mại.',
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [session, activeBooking?.bookingId]);

  const handleDownloadPdf = async (revisionId: string) => {
    if (!session || !activeBooking?.bookingId) return;
    setDownloading(revisionId);
    try {
      const blob = await session.authorize((token) =>
        coupleBilling.downloadContractPdf(token, activeBooking.bookingId, revisionId),
      );
      await saveOrShareDownloadedFile(blob, `hop-dong-${revisionId}.pdf`, 'application/pdf');
    } catch (caught) {
      Alert.alert(
        'Lỗi tải tệp PDF',
        caught instanceof Error ? caught.message : 'Không thể tải tệp PDF hợp đồng.',
      );
    } finally {
      setDownloading(null);
    }
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: tokens.canvas }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <RestoredCommercialPanel mode="contract" activeBooking={activeBooking} session={session} />
      <View style={styles.pageHeader}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Về tài khoản"
          onPress={() => onNavigate('account')}
          style={styles.backButton}
        >
          <Text style={[styles.backGlyph, { color: tokens.primary }]}>‹</Text>
        </Pressable>
        <View style={styles.headerTitleWrap}>
          <Text style={[styles.eyebrow, { color: tokens.sage }]}>Thương mại & Pháp lý</Text>
          <Text style={[styles.heading, { color: tokens.text }]}>Hợp đồng tiệc cưới</Text>
        </View>
      </View>

      {loading && <ActivityIndicator color={tokens.primary} style={{ marginVertical: 16 }} />}

      {error ? (
        <View style={[styles.emptyCard, { borderColor: tokens.champagne, marginBottom: 16 }]}>
          <Text style={{ color: tokens.tagWarmText, fontSize: 13 }}>{error}</Text>
        </View>
      ) : null}

      {contract ? (
        <View style={{ gap: 14 }}>
          <View
            style={[
              styles.calloutCard,
              { backgroundColor: tokens.surface, borderColor: tokens.premium },
            ]}
          >
            <Text style={[styles.calloutTitle, { color: tokens.primary }]}>Hợp đồng tiệc cưới</Text>
            <Text style={[styles.calloutSubtitle, { color: tokens.muted }]}>
              Phiên bản đang hiệu lực:{' '}
              {contract.currentRevisionId
                ? `#${contract.currentRevisionId.slice(0, 8)}`
                : 'Chưa có'}
            </Text>
            <Text style={{ fontSize: 11, color: tokens.sage, marginTop: 4 }}>
              Mô hình: {contract.modelVersion} •{' '}
              {contract.eligibleForDeposit ? 'Đủ điều kiện đặt cọc' : 'Chưa đủ điều kiện đặt cọc'}
            </Text>
          </View>

          <Text style={[styles.policyTitle, { color: tokens.text, marginTop: 8 }]}>
            Lịch sử các phiên bản hợp đồng ({contract.revisions?.length ?? 0} bản)
          </Text>

          {contract.revisions && contract.revisions.length > 0 ? (
            contract.revisions.map((rev) => (
              <View
                key={rev.revisionId}
                style={[
                  styles.calloutCard,
                  { backgroundColor: tokens.surface, borderColor: tokens.rule },
                ]}
              >
                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <Text style={{ fontSize: 14, fontWeight: '700', color: tokens.text }}>
                    Phiên bản #{rev.revisionNumber}
                  </Text>
                  <StatusTag tone={rev.state === 'APPROVED' ? 'success' : 'neutral'}>
                    {rev.state}
                  </StatusTag>
                </View>

                <View style={[styles.factRow, { marginTop: 8 }]}>
                  <Text style={{ fontSize: 12, color: tokens.muted }}>Giá trị hợp đồng:</Text>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: tokens.primary }}>
                    {money(rev.document.contractTotalVnd)}
                  </Text>
                </View>

                <View style={[styles.factRow, { marginTop: 4 }]}>
                  <Text style={{ fontSize: 12, color: tokens.muted }}>Tiền cọc yêu cầu:</Text>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: tokens.text }}>
                    {money(rev.document.depositAmountVnd)}
                  </Text>
                </View>

                {rev.createdAt ? (
                  <Text style={{ fontSize: 11, color: tokens.muted, marginTop: 4 }}>
                    Ngày tạo: {new Date(rev.createdAt).toLocaleDateString('vi-VN')}
                  </Text>
                ) : null}

                {rev.documentDigest ? (
                  <Text style={{ fontSize: 10, color: tokens.earth, marginTop: 2 }}>
                    Mã xác thực: {rev.documentDigest.slice(0, 16)}…
                  </Text>
                ) : null}

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Tải PDF bản ${rev.revisionNumber}`}
                  disabled={downloading === rev.revisionId}
                  onPress={() => void handleDownloadPdf(rev.revisionId)}
                  style={({ pressed }) => [
                    styles.primaryButton,
                    {
                      backgroundColor: tokens.primary,
                      borderColor: tokens.primary,
                      marginTop: 12,
                      opacity: pressed || downloading === rev.revisionId ? 0.8 : 1,
                    },
                  ]}
                >
                  {downloading === rev.revisionId ? (
                    <ActivityIndicator color={tokens.onPrimary} size="small" />
                  ) : (
                    <>
                      <FileTextIcon size={16} color={tokens.onPrimary} />
                      <Text style={[styles.primaryButtonText, { color: tokens.onPrimary }]}>
                        Tải tệp PDF hợp đồng (Bảo mật)
                      </Text>
                    </>
                  )}
                </Pressable>
              </View>
            ))
          ) : (
            <Text style={{ fontSize: 12, color: tokens.muted }}>
              Chưa có phiên bản hợp đồng nào.
            </Text>
          )}
        </View>
      ) : !loading ? (
        <View style={styles.emptyCard}>
          <FileTextIcon size={24} color={tokens.sage} />
          <Text style={[styles.emptyCardTitle, { color: tokens.text }]}>
            Chưa có hợp đồng thương mại
          </Text>
          <Text style={[styles.emptyCardDesc, { color: tokens.muted }]}>
            Hợp đồng đặt tiệc chính thức sẽ xuất hiện tại đây khi hai bạn chốt đề xuất với nhà hàng.
          </Text>
        </View>
      ) : null}
    </ScrollView>
  );
}

// ====================================================
// 6. APPENDICES SUBFLOW
// ====================================================
export function V0AppendicesSubflow({ activeBooking, onNavigate, session }: V0CommonProps) {
  const { tokens } = useWeddingTheme();
  const [appendixData, setAppendixData] = useState<CommercialAppendixView | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void (async () => {
      if (!session || !activeBooking?.bookingId) return;
      setLoading(true);
      setError(null);
      try {
        const loaded = await session.authorize((token) =>
          coupleBilling.loadAppendices(token, activeBooking.bookingId),
        );
        if (active) setAppendixData(loaded);
      } catch (caught) {
        if (active) {
          setError(
            caught instanceof Error ? caught.message : 'Chưa tải được danh sách phụ lục hợp đồng.',
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [session, activeBooking?.bookingId]);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: tokens.canvas }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <RestoredCommercialPanel mode="appendix" activeBooking={activeBooking} session={session} />
      <View style={styles.pageHeader}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Về tài khoản"
          onPress={() => onNavigate('account')}
          style={styles.backButton}
        >
          <Text style={[styles.backGlyph, { color: tokens.primary }]}>‹</Text>
        </Pressable>
        <View style={styles.headerTitleWrap}>
          <Text style={[styles.eyebrow, { color: tokens.sage }]}>Thương mại & Pháp lý</Text>
          <Text style={[styles.heading, { color: tokens.text }]}>Phụ lục hợp đồng</Text>
        </View>
      </View>

      {loading && <ActivityIndicator color={tokens.primary} style={{ marginVertical: 16 }} />}

      {error ? (
        <View style={[styles.emptyCard, { borderColor: tokens.champagne, marginBottom: 16 }]}>
          <Text style={{ color: tokens.tagWarmText, fontSize: 13 }}>{error}</Text>
        </View>
      ) : null}

      {appendixData ? (
        <View style={{ gap: 14 }}>
          <View
            style={[
              styles.calloutCard,
              { backgroundColor: tokens.surface, borderColor: tokens.premium },
            ]}
          >
            <Text style={[styles.calloutTitle, { color: tokens.primary }]}>
              Tổng giá trị phụ lục hiệu lực
            </Text>
            <Text
              style={[
                styles.calloutSubtitle,
                { color: tokens.text, fontSize: 16, fontWeight: '700' },
              ]}
            >
              {money(appendixData.effectiveTotalVnd)}
            </Text>
            <Text style={{ fontSize: 11, color: tokens.sage, marginTop: 4 }}>
              Phiên bản hiệu lực: #{appendixData.effectiveRevisionId.slice(0, 8)}
            </Text>
          </View>

          <Text style={[styles.policyTitle, { color: tokens.text, marginTop: 8 }]}>
            Danh sách phụ lục ({appendixData.revisions.length} bản)
          </Text>

          {appendixData.revisions.map((app) => (
            <View
              key={app.revisionId}
              style={[
                styles.calloutCard,
                { backgroundColor: tokens.surface, borderColor: tokens.rule, marginBottom: 12 },
              ]}
            >
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <Text style={{ fontSize: 14, fontWeight: '700', color: tokens.text }}>
                  Phụ lục #{app.revisionNumber}
                </Text>
                <StatusTag tone={app.state === 'APPROVED' ? 'success' : 'neutral'}>
                  {app.state}
                </StatusTag>
              </View>

              <View style={[styles.factRow, { marginTop: 8 }]}>
                <Text style={{ fontSize: 12, color: tokens.muted }}>Giá trị điều chỉnh:</Text>
                <Text style={{ fontSize: 13, fontWeight: '700', color: tokens.primary }}>
                  {app.document.deltaVnd >= 0 ? '+' : ''}
                  {money(app.document.deltaVnd)}
                </Text>
              </View>

              <Text style={{ fontSize: 12, color: tokens.text, marginTop: 4 }}>
                Lý do điều chỉnh: {app.document.reason}
              </Text>

              {app.createdAt ? (
                <Text style={{ fontSize: 11, color: tokens.muted, marginTop: 4 }}>
                  Ngày tạo: {new Date(app.createdAt).toLocaleDateString('vi-VN')}
                </Text>
              ) : null}

              {app.documentDigest ? (
                <Text style={{ fontSize: 10, color: tokens.earth, marginTop: 2 }}>
                  Mã xác thực: {app.documentDigest.slice(0, 16)}…
                </Text>
              ) : null}
            </View>
          ))}
        </View>
      ) : !loading ? (
        <View style={styles.emptyCard}>
          <FileTextIcon size={24} color={tokens.sage} />
          <Text style={[styles.emptyCardTitle, { color: tokens.text }]}>
            Không có phụ lục hợp đồng
          </Text>
          <Text style={[styles.emptyCardDesc, { color: tokens.muted }]}>
            Các thay đổi về dịch vụ, số lượng bàn hoặc trang trí phát sinh sau khi ký hợp đồng sẽ
            được ghi nhận trong các phụ lục tại đây.
          </Text>
        </View>
      ) : null}
    </ScrollView>
  );
}

// ====================================================
// 7. INCIDENTAL EXPENSES SUBFLOW
// ====================================================
export function V0IncidentalsSubflow({ activeBooking, onNavigate, session }: V0CommonProps) {
  const { tokens } = useWeddingTheme();
  const [sheet, setSheet] = useState<IncidentalExpensesView | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void (async () => {
      if (!session || !activeBooking?.bookingId) return;
      setLoading(true);
      setError(null);
      try {
        const loaded = await session.authorize((token) =>
          coupleBilling.loadIncidentals(token, activeBooking.bookingId),
        );
        if (active) setSheet(loaded);
      } catch (caught) {
        if (active) {
          setError(
            caught instanceof Error ? caught.message : 'Chưa tải được danh sách chi phí phát sinh.',
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [session, activeBooking?.bookingId]);

  const lines = sheet?.lines ?? [];
  const totalVnd = sheet?.totalVnd ?? 0;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: tokens.canvas }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.pageHeader}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Về tài khoản"
          onPress={() => onNavigate('account')}
          style={styles.backButton}
        >
          <Text style={[styles.backGlyph, { color: tokens.primary }]}>‹</Text>
        </Pressable>
        <View style={styles.headerTitleWrap}>
          <Text style={[styles.eyebrow, { color: tokens.sage }]}>Thương mại & Pháp lý</Text>
          <Text style={[styles.heading, { color: tokens.text }]}>Chi phí phát sinh</Text>
        </View>
      </View>

      <View
        style={[
          styles.calloutCard,
          { backgroundColor: tokens.surface, borderColor: tokens.rule, marginBottom: 16 },
        ]}
      >
        <Text style={[styles.calloutTitle, { color: tokens.primary }]}>
          Tổng chi phí phát sinh: {money(totalVnd)}
        </Text>
        <Text style={[styles.calloutSubtitle, { color: tokens.muted }]}>
          Gồm các khoản dịch vụ thêm, đồ uống phát sinh thực tế trong tiệc được nhà hàng ghi nhận
          (Bản #{sheet?.revision ?? 1} · {sheet?.finalized ? 'Đã chốt phát sinh' : 'Chưa chốt'}).
        </Text>
      </View>

      {loading && <ActivityIndicator color={tokens.primary} style={{ marginVertical: 16 }} />}

      {error ? (
        <View style={[styles.emptyCard, { borderColor: tokens.champagne, marginBottom: 16 }]}>
          <Text style={{ color: tokens.tagWarmText, fontSize: 13 }}>{error}</Text>
        </View>
      ) : null}

      {lines.length > 0 ? (
        lines.map((item) => (
          <View
            key={item.id}
            style={[
              styles.calloutCard,
              { backgroundColor: tokens.surface, borderColor: tokens.rule, marginBottom: 10 },
            ]}
          >
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <Text style={{ fontSize: 14, fontWeight: '700', color: tokens.text }}>
                {item.name}
              </Text>
              <StatusTag tone="neutral">
                {item.quantity} {item.unit}
              </StatusTag>
            </View>
            <View style={[styles.factRow, { marginTop: 6 }]}>
              <Text style={{ fontSize: 12, color: tokens.muted }}>
                Đơn giá: {money(item.unitPriceVnd)}
              </Text>
              <Text style={{ fontSize: 13, fontWeight: '700', color: tokens.primary }}>
                Thành tiền: {money(item.totalVnd)}
              </Text>
            </View>
            {item.note ? (
              <Text style={{ fontSize: 11, color: tokens.muted, marginTop: 4 }}>
                Ghi chú: {item.note}
              </Text>
            ) : null}
          </View>
        ))
      ) : !loading ? (
        <View style={styles.emptyCard}>
          <FileTextIcon size={24} color={tokens.sage} />
          <Text style={[styles.emptyCardTitle, { color: tokens.text }]}>
            Không có chi phí phát sinh
          </Text>
          <Text style={[styles.emptyCardDesc, { color: tokens.muted }]}>
            Tiệc cưới của hai bạn hiện không có khoản chi phí phát sinh nào ngoài hợp đồng ban đầu.
          </Text>
        </View>
      ) : null}
    </ScrollView>
  );
}

// ====================================================
// 8. FINAL INVOICES SUBFLOW
// ====================================================
export function V0InvoicesSubflow({ activeBooking, onNavigate, session }: V0CommonProps) {
  const { tokens } = useWeddingTheme();
  const [invoicesData, setInvoicesData] = useState<CommercialInvoiceView | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void (async () => {
      if (!session || !activeBooking?.bookingId) return;
      setLoading(true);
      setError(null);
      try {
        const loaded = await session.authorize((token) =>
          coupleBilling.loadFinalInvoices(token, activeBooking.bookingId),
        );
        if (active) setInvoicesData(loaded);
      } catch (caught) {
        if (active) {
          setError(
            caught instanceof Error
              ? caught.message
              : 'Chưa tải được danh sách hóa đơn quyết toán.',
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [session, activeBooking?.bookingId]);

  const revisions = invoicesData?.revisions ?? [];

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: tokens.canvas }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <RestoredInvoicePanel activeBooking={activeBooking} session={session} />
      <View style={styles.pageHeader}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Về tài khoản"
          onPress={() => onNavigate('account')}
          style={styles.backButton}
        >
          <Text style={[styles.backGlyph, { color: tokens.primary }]}>‹</Text>
        </Pressable>
        <View style={styles.headerTitleWrap}>
          <Text style={[styles.eyebrow, { color: tokens.sage }]}>Thương mại & Pháp lý</Text>
          <Text style={[styles.heading, { color: tokens.text }]}>Hóa đơn quyết toán cuối</Text>
        </View>
      </View>

      <View
        style={[
          styles.calloutCard,
          { backgroundColor: tokens.surface, borderColor: tokens.champagne, marginBottom: 16 },
        ]}
      >
        <Text style={[styles.calloutTitle, { color: tokens.primary, marginBottom: 4 }]}>
          Hóa đơn quyết toán tiệc chính thức
        </Text>
        <Text style={[styles.calloutSubtitle, { color: tokens.muted }]}>
          Đây là danh sách hóa đơn quyết toán cuối cùng được phát hành chính thức sau khi hoàn tất
          tiệc, hoàn toàn phân biệt với sổ cái lịch sử giao dịch tạm thời.
        </Text>
      </View>

      {loading && <ActivityIndicator color={tokens.primary} style={{ marginVertical: 16 }} />}

      {error ? (
        <View style={[styles.emptyCard, { borderColor: tokens.champagne, marginBottom: 16 }]}>
          <Text style={{ color: tokens.tagWarmText, fontSize: 13 }}>{error}</Text>
        </View>
      ) : null}

      {revisions.length > 0 ? (
        revisions.map((rev) => (
          <View
            key={rev.invoiceRevisionId}
            style={[
              styles.calloutCard,
              { backgroundColor: tokens.surface, borderColor: tokens.rule, marginBottom: 12 },
            ]}
          >
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <Text style={{ fontSize: 14, fontWeight: '700', color: tokens.text }}>
                Bản hóa đơn #{rev.revisionNumber} ({rev.invoiceNumber})
              </Text>
              <StatusTag tone="success">#{rev.invoiceRevisionId.slice(0, 8)}</StatusTag>
            </View>

            <View style={[styles.factRow, { marginTop: 8 }]}>
              <Text style={{ fontSize: 12, color: tokens.muted }}>Tổng tiền quyết toán:</Text>
              <Text style={{ fontSize: 14, fontWeight: '700', color: tokens.primary }}>
                {money(rev.document.totalVnd)}
              </Text>
            </View>

            {rev.issuedAt ? (
              <Text style={{ fontSize: 11, color: tokens.muted, marginTop: 4 }}>
                Ngày phát hành: {new Date(rev.issuedAt).toLocaleDateString('vi-VN')}
              </Text>
            ) : null}

            {rev.documentDigest ? (
              <Text style={{ fontSize: 10, color: tokens.earth, marginTop: 2 }}>
                Mã xác thực: {rev.documentDigest.slice(0, 16)}…
              </Text>
            ) : null}
          </View>
        ))
      ) : !loading ? (
        <View style={styles.emptyCard}>
          <FileTextIcon size={24} color={tokens.sage} />
          <Text style={[styles.emptyCardTitle, { color: tokens.text }]}>
            Chưa có hóa đơn quyết toán
          </Text>
          <Text style={[styles.emptyCardDesc, { color: tokens.muted }]}>
            Hóa đơn quyết toán cuối sẽ được ban quản lý nhà hàng phát hành sau khi tiệc cưới hoàn
            tất nghiệm thu.
          </Text>
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
  calloutCard: {
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 16,
  },
  calloutTitle: {
    fontSize: 14,
    lineHeight: 19,
    fontWeight: '600',
  },
  calloutSubtitle: {
    fontSize: 12,
    lineHeight: 17,
    marginTop: 4,
  },
  scheduleList: {
    marginTop: 8,
  },
  scheduleRow: {
    flexDirection: 'row',
    paddingVertical: 14,
    gap: 12,
  },
  scheduleTimeWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    width: 68,
  },
  scheduleTime: {
    fontSize: 13,
    fontWeight: '600',
  },
  scheduleBody: {
    flex: 1,
  },
  scheduleHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  scheduleItemTitle: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
  },
  scheduleItemDesc: {
    fontSize: 11,
    lineHeight: 15,
  },
  emptyCard: {
    padding: 18,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(74, 93, 78, 0.14)',
    alignItems: 'flex-start',
    gap: 8,
  },
  emptyCardTitle: {
    fontSize: 14,
    lineHeight: 19,
    fontWeight: '600',
  },
  emptyCardDesc: {
    fontSize: 12,
    lineHeight: 17,
  },
  policyBlock: {
    padding: 14,
    borderRadius: 8,
    backgroundColor: 'rgba(74, 93, 78, 0.06)',
    marginTop: 10,
  },
  policyTitle: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
    marginBottom: 6,
  },
  policyText: {
    fontSize: 12,
    lineHeight: 18,
  },
  factRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 3,
  },
  input: {
    minHeight: 44,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    fontSize: 13,
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
  outlineButton: {
    minHeight: 44,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
