import React, { useRef, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { HyText as Text } from '@/components/hy-ui';
import { FileTextIcon, StatusTag } from '@/components/v0-primitives';
import {
  createAppInvitationGateway,
  type AppPrintOrderView,
} from '@/features/invitation-studio/app-invitation-api';
import { useWeddingTheme } from '@/theme';
import { RestoredPrintPanel } from '../restored-flow-controls';
import type { V0CommonProps } from '../v0-types';
import { styles } from './subflows.styles';
import { money } from '@/lib/formatters';
import { printStatusMeta } from './subflows-common';

export function V0PrintSubflow({ activeBooking, invitationGateway, session }: V0CommonProps) {
  const { tokens } = useWeddingTheme();
  const fallbackGatewayRef = useRef<ReturnType<typeof createAppInvitationGateway> | null>(null);
  const gateway =
    invitationGateway ?? (fallbackGatewayRef.current ??= createAppInvitationGateway());

  const [orders, setOrders] = useState<readonly AppPrintOrderView[]>([]);
  const [currentTime] = useState(() => Date.now());

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: tokens.canvas }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <RestoredPrintPanel
        activeBooking={activeBooking}
        session={session}
        invitationGateway={gateway}
        onOrdersChanged={setOrders}
      />

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
                    borderRadius: 16,
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
      ) : orders.length === 0 ? (
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
