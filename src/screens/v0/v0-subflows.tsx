import React, { useCallback, useEffect, useRef, useState } from 'react';
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
  CheckIcon,
  CircleHelpIcon,
  ClockIcon,
  FileTextIcon,
  ImageIcon,
  LockIcon,
  StatusTag,
} from '@/components/v0-primitives';
import {
  createAppInvitationGateway,
  type AppPrintOrderView,
} from '@/features/invitation-studio/app-invitation-api';
import { ApiClientError } from '@/lib/api/client';
import { useWeddingTheme } from '@/theme';
import type { V0CommonProps } from './v0-types';

const money = (value: number) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);

function printStatusMeta(status: AppPrintOrderView['status']) {
  switch (status) {
    case 'REQUESTED':
      return { label: 'Chờ báo giá', tone: 'neutral' as const };
    case 'QUOTED':
      return { label: 'Đã có báo giá (Chờ duyệt)', tone: 'warm' as const };
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
export function V0ScheduleSubflow({ activeBooking, facts, onNavigate }: V0CommonProps) {
  const { tokens } = useWeddingTheme();
  const timelineItems = activeBooking?.timeline ?? [];
  const timelineRevision = activeBooking?.timelineRevision;

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
          {timelineRevision !== null && timelineRevision !== undefined
            ? `Phiên bản lịch trình #${timelineRevision}`
            : 'Lịch trình dự kiến ban đầu'}
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
              khi được quản lý tiệc cưới hoàn thiện.
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
export function V0MediaSubflow({ activeBooking, facts, onNavigate }: V0CommonProps) {
  const { tokens } = useWeddingTheme();

  const [uploading] = useState(false);
  const [altText, setAltText] = useState('');
  const [uploadedAssets] = useState<
    readonly { assetId: string; previewPath: string; name: string }[]
  >([]);
  const [currentTime] = useState(() => Date.now());

  // Calculate 72-hour cutoff time dynamically against event date and shift start time
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

  const handleUploadPhoto = async () => {
    if (isCutoffPassed) {
      Alert.alert(
        'Đã quá thời hạn cutoff',
        `Thời hạn tải ảnh đã kết thúc vào ${cutoffFormatted} (72 giờ trước giờ bắt đầu tiệc cưới). Kho ảnh đã được khóa để nhà hàng chuẩn bị trình chiếu.`,
      );
      return;
    }
    Alert.alert(
      'Tải ảnh cưới riêng tư',
      'Tính năng chọn tệp ảnh thực tế từ bộ nhớ thiết bị và API liệt kê kho ảnh (media) của tiệc cưới hiện chưa được backend cung cấp cho ứng dụng (Blocker theo Handoff Q6). Vui lòng truy cập phiên bản Web để tải và quản lý kho ảnh tiệc cưới.',
      [{ text: 'Đã hiểu', style: 'default' }],
    );
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
          <Text style={[styles.heading, { color: tokens.text }]}>Ảnh riêng tư</Text>
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
          tệp ảnh.{'\n'}• Thời hạn cutoff: Ảnh cần được tải lên trước 72 giờ so với giờ tiệc (
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
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <ImageIcon size={16} color={tokens.sage} />
                <Text style={{ fontSize: 13, color: tokens.text, fontWeight: '500' }}>
                  {asset.name}
                </Text>
              </View>
              <Text style={{ fontSize: 11, color: tokens.muted }}>{asset.previewPath}</Text>
            </View>
          ))}
        </View>
      ) : null}

      <View style={{ marginTop: 16 }}>
        <TextInput
          value={altText}
          onChangeText={setAltText}
          placeholder="Mô tả ảnh trình chiếu (alt text tùy chọn)"
          placeholderTextColor={tokens.muted}
          editable={!isCutoffPassed && !uploading}
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
          accessibilityLabel="Tải thêm ảnh từ máy"
          disabled={uploading}
          onPress={() => void handleUploadPhoto()}
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
                {isCutoffPassed ? 'Đã khóa kho ảnh' : 'Tải thêm ảnh từ máy'}
              </Text>
            </>
          )}
        </Pressable>
      </View>

      <Text style={{ fontSize: 11, color: tokens.earth, marginTop: 16, lineHeight: 16 }}>
        Hợp đồng OpenAPI pin 0a77391 không hỗ trợ GET /bookings/{'{id}'}/media để đọc lại danh sách
        ảnh cũ từ máy chủ (Blocker). Ảnh tải lên trong phiên hiện tại được hiển thị trực tiếp.
      </Text>
    </ScrollView>
  );
}

// ====================================================
// 3. PRINT SUBFLOW
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
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [currentTime] = useState(() => Date.now());
  const activeApprovalIntentsRef = useRef<Record<string, string>>({});

  const reloadOrders = useCallback(async () => {
    if (!session || !activeBooking?.bookingId) return;
    setLoading(true);
    setError(null);
    try {
      const items = await session.authorize((token) =>
        gateway.listPrintOrders(token, activeBooking.bookingId),
      );
      setOrders(items);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Chưa tải được danh sách đơn in thiệp.');
    } finally {
      setLoading(false);
    }
  }, [session, activeBooking, gateway]);

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

  const handleApprove = async (order: AppPrintOrderView) => {
    if (!session || !activeBooking?.bookingId || !order.currentCommercialRevision) return;
    const rev = order.currentCommercialRevision;
    if (new Date(rev.expiresAt).getTime() <= Date.now()) {
      Alert.alert(
        'Hết hạn báo giá',
        'Báo giá in thiệp cưới đã hết hạn. Vui lòng liên hệ nhà hàng để nhận báo giá mới.',
      );
      return;
    }

    setApprovingId(order.orderId);
    let intentKey = activeApprovalIntentsRef.current[order.orderId];
    if (!intentKey) {
      intentKey = `app-print-approval:${crypto.randomUUID()}`;
      activeApprovalIntentsRef.current[order.orderId] = intentKey;
    }

    try {
      const updated = await session.authorize((token) =>
        gateway.approvePrintOrder(
          token,
          activeBooking.bookingId,
          order.orderId,
          rev.commercialRevisionId,
          order.revision,
          intentKey,
        ),
      );
      delete activeApprovalIntentsRef.current[order.orderId];
      setOrders((prev) => prev.map((o) => (o.orderId === updated.orderId ? updated : o)));
      Alert.alert('Thành công', 'Đã duyệt báo giá in thiệp cưới thành công.');
    } catch (caught: unknown) {
      if (caught instanceof ApiClientError && caught.status === 409) {
        Alert.alert(
          'Xung đột phiên bản (409)',
          'Đơn in hoặc báo giá đã được cập nhật phiên bản mới trên máy chủ. Đang làm mới dữ liệu để bạn xác nhận lại.',
          [{ text: 'Đồng ý', onPress: () => void reloadOrders() }],
        );
      } else {
        Alert.alert(
          'Lỗi phê duyệt',
          caught instanceof Error
            ? caught.message
            : 'Không thể duyệt báo giá. Vui lòng thử lại an toàn.',
        );
      }
    } finally {
      setApprovingId(null);
    }
  };

  const handleApproveReplacement = async (order: AppPrintOrderView) => {
    if (!session || !activeBooking?.bookingId || !order.pendingReplacementProposal) return;
    const rep = order.pendingReplacementProposal;
    if (new Date(rep.expiresAt).getTime() <= currentTime) {
      Alert.alert('Hết hạn', 'Báo giá thay thế đã hết hạn phê duyệt.');
      return;
    }

    setApprovingId(order.orderId);
    try {
      const updated = await session.authorize((token) =>
        gateway.approveReplacementProposal(
          token,
          activeBooking.bookingId,
          order.orderId,
          rep.commercialRevisionId,
          order.revision,
        ),
      );
      setOrders((prev) => prev.map((o) => (o.orderId === updated.orderId ? updated : o)));
      Alert.alert('Thành công', 'Đã xác nhận duyệt báo giá thay thế thành công.');
    } catch (caught: unknown) {
      if (caught instanceof ApiClientError && caught.status === 409) {
        Alert.alert(
          'Xung đột phiên bản (409)',
          'Đơn in đã được cập nhật phiên bản mới trên máy chủ. Đang làm mới dữ liệu...',
          [{ text: 'Đồng ý', onPress: () => void reloadOrders() }],
        );
      } else {
        Alert.alert(
          'Lỗi phê duyệt',
          caught instanceof Error ? caught.message : 'Không thể duyệt báo giá thay thế.',
        );
      }
    } finally {
      setApprovingId(null);
    }
  };

  const handleCancelOrder = async (order: AppPrintOrderView) => {
    if (!session || !activeBooking?.bookingId) return;
    Alert.alert(
      'Hủy đơn in thiệp',
      'Bạn có chắc chắn muốn hủy đơn in thiệp cưới này không? Thao tác chỉ được thực hiện trước khi xưởng bắt đầu sản xuất.',
      [
        { text: 'Không', style: 'cancel' },
        {
          text: 'Xác nhận hủy',
          style: 'destructive',
          onPress: async () => {
            setApprovingId(order.orderId);
            try {
              const updated = await session.authorize((token) =>
                gateway.cancelApprovedPrintOrder(
                  token,
                  activeBooking.bookingId,
                  order.orderId,
                  order.revision,
                ),
              );
              setOrders((prev) => prev.map((o) => (o.orderId === updated.orderId ? updated : o)));
              Alert.alert('Đã hủy', 'Đơn in thiệp cưới đã được hủy thành công.');
            } catch (caught) {
              Alert.alert(
                'Lỗi hủy đơn',
                caught instanceof Error ? caught.message : 'Không thể hủy đơn in thiệp cưới.',
              );
            } finally {
              setApprovingId(null);
            }
          },
        },
      ],
    );
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
          <Text style={[styles.heading, { color: tokens.text }]}>Đơn in thiệp cưới</Text>
        </View>
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
          const canApprove = order.status === 'QUOTED' && rev !== null;
          const canCancel = ['REQUESTED', 'QUOTED', 'APPROVED'].includes(order.status);

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
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Duyệt báo giá thay thế"
                    disabled={approvingId === order.orderId}
                    onPress={() => void handleApproveReplacement(order)}
                    style={({ pressed }) => [
                      styles.primaryButton,
                      {
                        backgroundColor: tokens.primary,
                        borderColor: tokens.primary,
                        marginTop: 10,
                        opacity: pressed || approvingId === order.orderId ? 0.8 : 1,
                      },
                    ]}
                  >
                    <Text style={[styles.primaryButtonText, { color: tokens.onPrimary }]}>
                      Xác nhận duyệt báo giá thay thế
                    </Text>
                  </Pressable>
                </View>
              ) : null}

              {/* Action Buttons for Couple */}
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 14 }}>
                {canApprove ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Xác nhận duyệt báo giá in"
                    disabled={approvingId === order.orderId}
                    onPress={() => void handleApprove(order)}
                    style={({ pressed }) => [
                      styles.primaryButton,
                      {
                        backgroundColor: tokens.primary,
                        borderColor: tokens.primary,
                        flex: 1,
                        opacity: pressed || approvingId === order.orderId ? 0.8 : 1,
                      },
                    ]}
                  >
                    {approvingId === order.orderId ? (
                      <ActivityIndicator color={tokens.onPrimary} size="small" />
                    ) : (
                      <>
                        <CheckIcon size={16} color={tokens.onPrimary} />
                        <Text style={[styles.primaryButtonText, { color: tokens.onPrimary }]}>
                          Duyệt báo giá
                        </Text>
                      </>
                    )}
                  </Pressable>
                ) : null}

                {canCancel ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Hủy đơn in"
                    disabled={approvingId === order.orderId}
                    onPress={() => void handleCancelOrder(order)}
                    style={({ pressed }) => [
                      styles.outlineButton,
                      {
                        borderColor: tokens.rule,
                        paddingVertical: 10,
                        paddingHorizontal: 14,
                        opacity: pressed || approvingId === order.orderId ? 0.7 : 1,
                      },
                    ]}
                  >
                    <Text style={{ fontSize: 12, color: tokens.muted, fontWeight: '600' }}>
                      Hủy đơn
                    </Text>
                  </Pressable>
                ) : null}
              </View>
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
            Hai bạn có thể gửi yêu cầu in thiệp giấy từ mẫu thiết kế đã chọn thông qua cổng quản lý
            Web hoặc liên hệ nhân viên quản lý tiệc cưới.
          </Text>
        </View>
      ) : null}
    </ScrollView>
  );
}

// ====================================================
// 4. GUESTS & SEATING SUBFLOW
// ====================================================
export function V0GuestsSubflow({ facts, onNavigate }: V0CommonProps) {
  const { tokens } = useWeddingTheme();

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
            Quy định danh sách & sơ đồ bàn tiệc
          </Text>
        </View>
        <Text style={[styles.calloutSubtitle, { color: tokens.muted }]}>
          • Quản lý theo Nhóm (Group) và Danh sách khách mời tùy chọn.{'\n'}• Sơ đồ bàn tiệc hoạt
          động theo Nhóm mà không bắt buộc phải có tên khách cụ thể.{'\n'}• Hệ thống không lưu trữ
          danh tính theo Hộ gia đình (Household).{'\n'}• Khách mời chỉ xem thiệp trực tuyến, không
          có tính năng phản hồi RSVP.{'\n'}• Điểm danh (Check-in) là tùy chọn opt-in cho từng tiệc
          và mặc định TẮT (NONE). Khi tắt, hệ thống không ghi nhận chứ không phải là 0 khách tham
          dự.
        </Text>
      </View>

      <View
        style={[
          styles.calloutCard,
          { backgroundColor: tokens.surface, borderColor: tokens.rule, marginTop: 12 },
        ]}
      >
        <Text style={[styles.calloutTitle, { color: tokens.text, marginBottom: 8 }]}>
          Kế hoạch sảnh tiệc & số lượng khách từ máy chủ
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
          Số lượng khách kế hoạch do Cặp đôi / Quản lý nhập độc lập từ hợp đồng, không bị phụ thuộc
          hoặc suy diễn từ số lượng tên khách trong danh sách.
        </Text>
      </View>

      <View style={[styles.policyBlock, { marginTop: 18 }]}>
        <Text style={[styles.policyTitle, { color: tokens.text }]}>Trạng thái kết nối máy chủ</Text>
        <Text style={[styles.policyText, { color: tokens.muted }]}>
          Chức năng quản lý danh sách khách mời (/guests) và gán sơ đồ bàn tiệc (/seating) hiện được
          quản lý trên phiên bản Web của hệ thống. Ứng dụng di động chỉ hỗ trợ theo dõi kế hoạch
          tổng thể và sẽ hiển thị danh sách đầy đủ khi API di động được kết nối hoàn tất.
        </Text>
      </View>
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
