import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { openBrowserAsync } from 'expo-web-browser';
import { randomUUID } from 'expo-crypto';

import { HyAlert, HyBadge, HyButton, HyCard, HyInput, HyText as Text } from '@/components/hy-ui';
import type { AndroidIdentitySession } from '@/features/identity-access/session';
import {
  createProposalGateway,
  type CommercialContractView,
  type CoupleProfileView,
  type ProposalView,
} from '@/features/booking-lifecycle/proposal-api';
import {
  createCoupleBillingGateway,
  type DepositBody,
} from '@/features/payments-billing/billing-api';
import { hy } from '@/theme';

type StepKey = 'script' | 'names' | 'contract';

export function AgreementWorkspace({
  bookingId,
  session,
  onBack,
  onCompleted,
}: Readonly<{
  bookingId: string;
  session: AndroidIdentitySession;
  onBack: () => void;
  onCompleted?: () => void;
}>) {
  const proposalGateway = useRef(createProposalGateway()).current;
  const billingGateway = useRef(createCoupleBillingGateway()).current;

  const [currentStep, setCurrentStep] = useState<StepKey>('script');
  const [proposal, setProposal] = useState<ProposalView | null>(null);
  const [profile, setProfile] = useState<CoupleProfileView | null>(null);
  const [contracts, setContracts] = useState<CommercialContractView | null>(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionPending, setActionPending] = useState(false);

  // Form state for names
  const [brideName, setBrideName] = useState('');
  const [groomName, setGroomName] = useState('');

  const loadAll = useCallback(async () => {
    setError(null);
    try {
      const prop = await session.authorize((token) =>
        proposalGateway.loadProposal(token, bookingId),
      );
      setProposal(prop);

      let prof: CoupleProfileView | null = null;
      if (prop.consultationId) {
        prof = await session
          .authorize((token) => proposalGateway.loadCoupleProfile(token, prop.consultationId!))
          .catch(() => null);
        if (prof) {
          setProfile(prof);
          setBrideName(prof.brideName ?? '');
          setGroomName(prof.groomName ?? '');
        }
      }

      const cont = await session
        .authorize((token) => proposalGateway.loadContracts(token, bookingId))
        .catch(() => null);
      if (cont) {
        setContracts(cont);
      }
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'Không thể tải dữ liệu thỏa thuận. Vui lòng thử lại.',
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [bookingId, proposalGateway, session]);

  useEffect(() => {
    queueMicrotask(() => void loadAll());
  }, [loadAll]);

  // Handler: Approve Timeline
  const handleApproveTimeline = async () => {
    if (!proposal || !proposal.timeline?.revisionId) return;
    setActionPending(true);
    setError(null);
    setActionSuccess(null);
    try {
      await session.authorize((token) =>
        proposalGateway.approveTimeline(
          token,
          bookingId,
          proposal.timeline!.revisionId,
          proposal.revision,
        ),
      );
      setActionSuccess('Bạn đã duyệt kịch bản tiệc cưới thành công.');
      await loadAll();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'Không thể duyệt kịch bản. Vui lòng kiểm tra lại.',
      );
    } finally {
      setActionPending(false);
    }
  };

  // Handler: Save Names
  const handleSaveNames = async () => {
    if (!proposal?.consultationId || !profile) return;
    const trimmedBride = brideName.trim();
    const trimmedGroom = groomName.trim();
    if (!trimmedBride || !trimmedGroom) {
      setError('Vui lòng nhập đầy đủ tên cô dâu và chú rể.');
      return;
    }

    setActionPending(true);
    setError(null);
    setActionSuccess(null);
    try {
      const updated = await session.authorize((token) =>
        proposalGateway.updateCoupleProfile(token, proposal.consultationId!, {
          brideName: trimmedBride,
          groomName: trimmedGroom,
          expectedRevision: profile.revision,
        }),
      );
      setProfile(updated);
      setBrideName(updated.brideName ?? '');
      setGroomName(updated.groomName ?? '');
      setActionSuccess('Đã cập nhật tên cô dâu và chú rể thành công.');
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : 'Không thể cập nhật tên. Vui lòng thử lại.',
      );
    } finally {
      setActionPending(false);
    }
  };

  // Handler: VNPay Deposit
  const handleStartDeposit = async () => {
    if (!proposal) return;
    setActionPending(true);
    setError(null);
    setActionSuccess(null);
    try {
      const context = await session.authorize((token) =>
        billingGateway.loadContext(token, bookingId),
      );

      if (!context.timelineRevisionId) {
        setError('Kịch bản tiệc cưới cần được hai bên duyệt trước khi tiến hành đặt cọc.');
        return;
      }

      const depositBody: DepositBody = {
        timelineRevisionId: context.timelineRevisionId,
        ...(context.contractRevisionId
          ? {
              contractRevisionId: context.contractRevisionId,
              ...(context.documentDigest ? { documentDigest: context.documentDigest } : {}),
            }
          : {}),
      };

      const key = `deposit:${bookingId}:${randomUUID()}`;
      const checkout = await session.authorize((token) =>
        billingGateway.startDeposit(token, bookingId, depositBody, key),
      );

      await openBrowserAsync(checkout.checkoutUrl);
      await loadAll();
      if (onCompleted) {
        onCompleted();
      }
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'Chưa thể khởi tạo cổng thanh toán VNPay. Vui lòng thử lại.',
      );
    } finally {
      setActionPending(false);
    }
  };

  if (loading) {
    return (
      <View style={s.centerContainer}>
        <ActivityIndicator size="large" color={hy.primary} />
        <Text style={[s.loadingText, { marginTop: 12 }]}>Đang tải thỏa thuận tiệc cưới…</Text>
      </View>
    );
  }

  const timeline = proposal?.effectiveTimeline ?? proposal?.timeline ?? null;
  const timelineDone = proposal?.phase !== 'DRAFT';
  const managerApproved = Boolean(timeline?.managerApprovedAt);
  const coupleApproved = Boolean(timeline?.coupleApprovedAt);
  const canApproveTimeline = !coupleApproved && managerApproved && Boolean(timeline?.revisionId);

  const depositAmount =
    contracts?.revisions?.find((r) => r.state === 'APPROVED')?.document.depositAmountVnd ??
    proposal?.proposal.depositAmountVnd ??
    0;

  return (
    <View style={s.root}>
      {/* Top Header */}
      <View style={s.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Quay lại"
          onPress={onBack}
          style={s.backBtn}
        >
          <Text style={s.backBtnText}>← Danh sách tiệc</Text>
        </Pressable>
        <Text style={s.headerTitle}>Thỏa thuận & Đặt cọc</Text>
        <Text style={s.headerSubtitle}>
          {proposal?.proposal.hall.name ?? 'Tiệc cưới'} • {proposal?.eventDate ?? ''}
        </Text>
      </View>

      {/* Stepper Tabs */}
      <View style={s.stepper}>
        <Pressable
          onPress={() => {
            setCurrentStep('script');
            setError(null);
            setActionSuccess(null);
          }}
          style={[s.stepTab, currentStep === 'script' && s.stepTabActive]}
        >
          <View style={[s.stepBadge, timelineDone && s.stepBadgeDone]}>
            <Text style={[s.stepBadgeText, timelineDone && s.stepBadgeTextDone]}>
              {timelineDone ? '✓' : '1'}
            </Text>
          </View>
          <Text style={[s.stepLabel, currentStep === 'script' && s.stepLabelActive]}>Kịch bản</Text>
        </Pressable>

        <Pressable
          onPress={() => {
            setCurrentStep('names');
            setError(null);
            setActionSuccess(null);
          }}
          style={[s.stepTab, currentStep === 'names' && s.stepTabActive]}
        >
          <View style={[s.stepBadge, profile?.brideName && profile?.groomName && s.stepBadgeDone]}>
            <Text
              style={[
                s.stepBadgeText,
                profile?.brideName && profile?.groomName && s.stepBadgeTextDone,
              ]}
            >
              {profile?.brideName && profile?.groomName ? '✓' : '2'}
            </Text>
          </View>
          <Text style={[s.stepLabel, currentStep === 'names' && s.stepLabelActive]}>
            Tên cô dâu chú rể
          </Text>
        </Pressable>

        <Pressable
          onPress={() => {
            setCurrentStep('contract');
            setError(null);
            setActionSuccess(null);
          }}
          style={[s.stepTab, currentStep === 'contract' && s.stepTabActive]}
        >
          <View style={[s.stepBadge, proposal?.phase === 'CONFIRMED' && s.stepBadgeDone]}>
            <Text style={[s.stepBadgeText, proposal?.phase === 'CONFIRMED' && s.stepBadgeTextDone]}>
              {proposal?.phase === 'CONFIRMED' ? '✓' : '3'}
            </Text>
          </View>
          <Text style={[s.stepLabel, currentStep === 'contract' && s.stepLabelActive]}>
            Hợp đồng & Đặt cọc
          </Text>
        </Pressable>
      </View>

      {/* Content */}
      <ScrollView
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              void loadAll();
            }}
            tintColor={hy.primary}
            colors={[hy.primary]}
          />
        }
      >
        {/* Alerts */}
        {error ? (
          <HyAlert
            variant="error"
            message={error}
            onDismiss={() => setError(null)}
            style={{ marginBottom: 16 }}
          />
        ) : null}

        {actionSuccess ? (
          <HyAlert
            variant="success"
            message={actionSuccess}
            onDismiss={() => setActionSuccess(null)}
            style={{ marginBottom: 16 }}
          />
        ) : null}

        {/* STEP 1: KỊCH BẢN */}
        {currentStep === 'script' && (
          <View style={s.stepSection}>
            <View style={s.stepHeader}>
              <Text style={s.stepTitle}>Kịch bản chương trình cưới</Text>
              <Text style={s.stepDesc}>
                Các mốc thời gian chi tiết được nhà hàng xây dựng cùng cặp đôi trước khi diễn ra
                tiệc cưới.
              </Text>
            </View>

            {/* Approval Status Badges */}
            <HyCard style={s.approvalCard}>
              <View style={s.approvalRow}>
                <Text style={s.approvalLabel}>Trạng thái nhà hàng:</Text>
                <HyBadge
                  status={managerApproved ? 'done' : 'waiting'}
                  label={managerApproved ? 'Quản lý đã duyệt' : 'Chờ quản lý duyệt'}
                />
              </View>
              <View style={s.approvalRow}>
                <Text style={s.approvalLabel}>Trạng thái cặp đôi:</Text>
                <HyBadge
                  status={coupleApproved ? 'done' : 'waiting'}
                  label={coupleApproved ? 'Bạn đã duyệt' : 'Chờ bạn duyệt'}
                />
              </View>
            </HyCard>

            {/* Timeline items list */}
            {timeline?.items && timeline.items.length > 0 ? (
              <View style={s.timelineList}>
                {timeline.items.map((item, index) => (
                  <HyCard key={item.itemId ?? index} style={s.timelineCard}>
                    <View style={s.timelineItemHeader}>
                      <Text style={s.timelineTime}>{item.startTime}</Text>
                      <Text style={s.timelineItemTitle}>{item.title}</Text>
                    </View>
                    {item.description ? (
                      <Text style={s.timelineDesc}>{item.description}</Text>
                    ) : null}
                  </HyCard>
                ))}
              </View>
            ) : (
              <HyCard style={s.emptyCard}>
                <Text style={s.emptyText}>
                  Kịch bản tiệc cưới đang được quản lý soạn thảo. Các mốc thời gian sẽ sớm được hiển
                  thị tại đây.
                </Text>
              </HyCard>
            )}

            {/* Action button */}
            <View style={{ marginTop: 20 }}>
              {coupleApproved ? (
                <HyAlert
                  variant="info"
                  message="Bạn đã duyệt kịch bản tiệc này. Vui lòng chuyển sang bước tiếp theo."
                />
              ) : (
                <HyButton
                  label={
                    canApproveTimeline
                      ? 'Duyệt kịch bản tiệc cưới'
                      : 'Đang chờ nhà hàng hoàn tất bản thảo'
                  }
                  onPress={handleApproveTimeline}
                  disabled={!canApproveTimeline || actionPending}
                  busy={actionPending}
                />
              )}
            </View>
          </View>
        )}

        {/* STEP 2: TÊN CÔ DÂU & CHÚ RỂ */}
        {currentStep === 'names' && (
          <View style={s.stepSection}>
            <View style={s.stepHeader}>
              <Text style={s.stepTitle}>Tên cô dâu & chú rể</Text>
              <Text style={s.stepDesc}>
                Tên chính thức sẽ được in trang trọng trên hợp đồng kinh tế và thiệp mời gửi tới
                khách quý.
              </Text>
            </View>

            <HyCard style={s.formCard}>
              <View style={s.fieldGroup}>
                <Text style={s.fieldLabel}>Họ và tên Cô dâu *</Text>
                <HyInput
                  placeholder="Ví dụ: Nguyễn Thị Mai"
                  value={brideName}
                  onChangeText={setBrideName}
                />
              </View>

              <View style={s.fieldGroup}>
                <Text style={s.fieldLabel}>Họ và tên Chú rể *</Text>
                <HyInput
                  placeholder="Ví dụ: Trần Quốc Bảo"
                  value={groomName}
                  onChangeText={setGroomName}
                />
              </View>

              <View style={{ marginTop: 12 }}>
                <HyButton
                  label="Lưu tên cô dâu & chú rể"
                  onPress={handleSaveNames}
                  disabled={actionPending || !brideName.trim() || !groomName.trim()}
                  busy={actionPending}
                />
              </View>
            </HyCard>
          </View>
        )}

        {/* STEP 3: HỢP ĐỒNG & ĐẶT CỌC */}
        {currentStep === 'contract' && (
          <View style={s.stepSection}>
            <View style={s.stepHeader}>
              <Text style={s.stepTitle}>Hợp đồng & Thanh toán đặt cọc</Text>
              <Text style={s.stepDesc}>
                Xác nhận các điều khoản tiệc cưới và tiến hành đặt cọc trực tuyến bảo mật qua cổng
                VNPay.
              </Text>
            </View>

            <HyCard style={s.summaryCard}>
              <Text style={s.summaryTitle}>Thông tin tiệc cưới</Text>

              <View style={s.summaryRow}>
                <Text style={s.summaryLabel}>Sảnh tiệc:</Text>
                <Text style={s.summaryValue}>{proposal?.proposal.hall.name ?? 'Chưa rõ'}</Text>
              </View>

              <View style={s.summaryRow}>
                <Text style={s.summaryLabel}>Ngày cưới:</Text>
                <Text style={s.summaryValue}>{proposal?.eventDate ?? ''}</Text>
              </View>

              <View style={s.summaryRow}>
                <Text style={s.summaryLabel}>Khung giờ:</Text>
                <Text style={s.summaryValue}>
                  {proposal?.proposal.shift.startTime} - {proposal?.proposal.shift.endTime}
                </Text>
              </View>

              <View style={s.summaryRow}>
                <Text style={s.summaryLabel}>Số khách dự kiến:</Text>
                <Text style={s.summaryValue}>{proposal?.planningHeadcount ?? 0} khách</Text>
              </View>

              <View style={s.divider} />

              <View style={s.summaryRow}>
                <Text style={s.summaryLabel}>Số tiền đặt cọc:</Text>
                <Text style={s.depositValue}>{depositAmount.toLocaleString('vi-VN')} đ</Text>
              </View>
            </HyCard>

            <View style={{ marginTop: 24 }}>
              {proposal?.phase === 'CONFIRMED' ? (
                <HyAlert
                  variant="success"
                  title="Đặt cọc hoàn tất"
                  message="Tiệc cưới của bạn đã được xác nhận chính thức. Hãy bắt đầu quản lý danh sách khách mời và sơ đồ chỗ ngồi."
                  action={{
                    label: 'Vào không gian chuẩn bị →',
                    onPress: () => onCompleted?.(),
                  }}
                />
              ) : (
                <HyButton
                  label={`Thanh toán đặt cọc (${depositAmount.toLocaleString('vi-VN')} đ)`}
                  onPress={handleStartDeposit}
                  disabled={actionPending || depositAmount <= 0}
                  busy={actionPending}
                />
              )}
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: hy.canvas,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: hy.canvas,
    padding: 24,
  },
  loadingText: {
    fontSize: 15,
    color: hy.secondary,
  },
  header: {
    paddingTop: 16,
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: hy.surface,
    borderBottomWidth: 1,
    borderBottomColor: hy.outline,
  },
  backBtn: {
    marginBottom: 8,
  },
  backBtnText: {
    fontSize: 14,
    color: hy.primary,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: hy.ink,
    lineHeight: 28,
  },
  headerSubtitle: {
    fontSize: 14,
    color: hy.secondary,
    marginTop: 2,
    lineHeight: 20,
  },
  stepper: {
    flexDirection: 'row',
    backgroundColor: hy.surface,
    borderBottomWidth: 1,
    borderBottomColor: hy.outline,
    paddingHorizontal: 12,
  },
  stepTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 6,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  stepTabActive: {
    borderBottomColor: hy.primary,
  },
  stepBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: hy.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBadgeDone: {
    backgroundColor: hy.successBg,
  },
  stepBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: hy.secondary,
  },
  stepBadgeTextDone: {
    color: hy.success,
  },
  stepLabel: {
    fontSize: 13,
    color: hy.secondary,
    fontWeight: '500',
  },
  stepLabelActive: {
    color: hy.primary,
    fontWeight: '700',
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  stepSection: {
    gap: 16,
  },
  stepHeader: {
    marginBottom: 4,
  },
  stepTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: hy.ink,
    lineHeight: 24,
  },
  stepDesc: {
    fontSize: 14,
    color: hy.secondary,
    lineHeight: 20,
    marginTop: 4,
  },
  approvalCard: {
    padding: 16,
    gap: 12,
  },
  approvalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  approvalLabel: {
    fontSize: 14,
    color: hy.ink,
    fontWeight: '500',
  },
  timelineList: {
    gap: 12,
  },
  timelineCard: {
    padding: 16,
  },
  timelineItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  timelineTime: {
    fontSize: 14,
    fontWeight: '700',
    color: hy.primary,
  },
  timelineItemTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: hy.ink,
    flex: 1,
  },
  timelineDesc: {
    fontSize: 13,
    color: hy.secondary,
    lineHeight: 18,
    marginTop: 6,
  },
  emptyCard: {
    padding: 24,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: hy.secondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  formCard: {
    padding: 20,
    gap: 16,
  },
  fieldGroup: {
    gap: 6,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: hy.ink,
  },
  summaryCard: {
    padding: 20,
    gap: 12,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: hy.ink,
    marginBottom: 4,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 14,
    color: hy.secondary,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: hy.ink,
  },
  divider: {
    height: 1,
    backgroundColor: hy.outline,
    marginVertical: 4,
  },
  depositValue: {
    fontSize: 18,
    fontWeight: '700',
    color: hy.primary,
  },
});
