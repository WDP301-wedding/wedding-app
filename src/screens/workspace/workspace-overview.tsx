import { useCallback, useState } from 'react';
import { ImageBackground, Pressable, View } from 'react-native';
import { HyText as Text } from '@/components/hy-ui';
import { createWorkspaceGateway } from '@/features/couple-workspace/workspace-api';
import { hy } from '@/theme';
import { createCoupleBillingGateway } from '@/features/payments-billing/billing-api';
import {
  depositPercentage,
  journeyIndex,
  money,
  phaseLabel,
  tableCapacityMessage,
  vietnamToday,
  bookingDisplayName,
  shiftLabel,
  settlementStatus,
  settlementLabels,
} from '@/features/couple-workspace/policies';
import {
  Action,
  Feedback,
  Disclosure,
  Field,
  Notice,
  Page,
  Section,
  s,
  useClock,
  useCommand,
  useRead,
  ReadState,
  type WorkspaceProps,
} from './workspace-common';

const api = createWorkspaceGateway();
const billing = createCoupleBillingGateway();
const journey = ['Tư vấn', 'Thoả thuận', 'Đặt cọc', 'Chuẩn bị', 'Ngày cưới', 'Quyết toán'];

export function CompletionNotice({
  booking,
  proposal,
  navigate,
}: Pick<WorkspaceProps, 'booking' | 'proposal' | 'navigate'>) {
  if (booking.phase === 'COMPLETED') return null;
  const completion = proposal?.completion;
  const parties = [
    completion?.managerApproved !== true && 'nhà hàng',
    completion?.coupleApproved !== true && 'hai bạn',
  ]
    .filter(Boolean)
    .join(' và ');
  return (
    <View style={{ gap: 12 }}>
      <Notice>
        {booking.phase === 'CANCELLED'
          ? 'Tiệc đã hủy. Hai bạn vẫn có thể xem lịch sử thanh toán và khoản hoàn.'
          : completion?.pending
            ? `Phụ lục phiên bản ${completion.appendixRevisionNumber ?? 'hiện tại'} chưa hoàn tất duyệt hai bên; đang chờ ${parties}. Nhà hàng chỉ có thể đánh dấu tiệc đã tổ chức xong khi phụ lục được giải quyết.`
            : 'Chờ nhà hàng đánh dấu tiệc đã tổ chức xong. Quyết toán và thanh toán phần còn lại chỉ mở sau bước này.'}
      </Notice>
      {completion?.pending && (
        <Action
          label="Xem phụ lục hợp đồng"
          onPress={() => navigate('prepare', { prepareSection: 'appendix' })}
          secondary
        />
      )}
    </View>
  );
}

export function WorkspaceOverview(props: WorkspaceProps) {
  const { booking, proposal, session, refresh, navigate } = props;
  const [editing, setEditing] = useState(false);
  const [alias, setAlias] = useState(booking.alias ?? '');
  const [aliasRevision, setAliasRevision] = useState(booking.revision);
  const command = useCommand(refresh);
  const now = useClock();
  const currentStep = journeyIndex(booking.phase, booking.eventDate, new Date(now));
  const days = Math.round(
    (Date.parse(booking.eventDate) - Date.parse(vietnamToday(new Date(now)))) / 86400000,
  );
  const display = bookingDisplayName(booking);
  const capacity = proposal
    ? tableCapacityMessage(
        proposal.planningHeadcount,
        proposal.proposal.tableCount,
        proposal.capacity?.maximumTables,
        proposal.proposal.hall.maxGuests,
      )
    : null;
  return (
    <Page title="Tổng quan">
      <View style={[s.detailRow, { alignItems: 'flex-start' }]}>
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={s.heading}>{display}</Text>
          <Text style={s.muted}>
            {booking.eventDate.split('-').reverse().join('/')} · {booking.hallName} ·{' '}
            {shiftLabel(booking.shiftCode)}
          </Text>
          <Text style={s.disclosureLabel}>{phaseLabel(booking.phase)}</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={booking.alias?.trim() ? 'Đổi tên gợi nhớ' : 'Đặt tên gợi nhớ'}
          onPress={() => {
            setAlias(booking.alias ?? '');
            setAliasRevision(booking.revision);
            setEditing(!editing);
          }}
          style={({ pressed }) => [
            { minHeight: 44, justifyContent: 'center', paddingHorizontal: 4 },
            pressed && s.pressed,
          ]}
        >
          <Text style={s.disclosureLabel}>Đổi tên</Text>
        </Pressable>
      </View>
      {editing && (
        <Section title="Tên gợi nhớ của tiệc">
          {aliasRevision !== booking.revision && (
            <Notice>
              Tên gợi nhớ đã thay đổi. Nội dung đang nhập được giữ nguyên; mở lại mục đổi tên để lấy
              bản mới.
            </Notice>
          )}
          <Field
            label="Tên gợi nhớ"
            disabled={command.pending}
            value={alias}
            onChangeText={setAlias}
          />
          <Action
            label="Lưu tên gợi nhớ"
            disabled={
              aliasRevision !== booking.revision ||
              props.contextReady === false ||
              command.pending ||
              alias.trim().length > 80
            }
            onPress={() => {
              const body = {
                alias: alias.trim() || null,
                ...(aliasRevision !== undefined ? { expectedRevision: aliasRevision } : {}),
              };
              void command
                .run(
                  () =>
                    session.authorize((token) => api.updateAlias(token, booking.bookingId, body)),
                  'Đã lưu tên gợi nhớ.',
                )
                .then((ok) => {
                  if (ok) setEditing(false);
                });
            }}
          />
        </Section>
      )}
      <Feedback command={command} />

      {capacity && (
        <Notice>
          {capacity} Thỏa thuận đã duyệt được giữ nguyên; hãy liên hệ nhà hàng để điều chỉnh.
        </Notice>
      )}
      <Section title="Việc cần làm tiếp theo">
        {booking.phase === 'DRAFT' && (
          <>
            <Text>
              {!booking.hasTimeline && !proposal?.effectiveTimeline
                ? 'Chờ nhà hàng gửi kịch bản'
                : !booking.coupleApproved
                  ? 'Duyệt kịch bản và điền tên cô dâu chú rể'
                  : 'Chờ nhà hàng duyệt kịch bản'}
            </Text>
            <Text style={s.muted}>
              Xem các mốc chương trình và lựa chọn thực đơn, dịch vụ trước khi chốt hợp đồng.
            </Text>
            <Action
              label="Xem đề xuất"
              onPress={() => navigate('agreement', { agreementStep: 'timeline' })}
            />
            {(booking.hasTimeline || proposal?.effectiveTimeline) && !booking.coupleApproved && (
              <Action
                label="Nhập tên cô dâu chú rể"
                secondary
                onPress={() => navigate('agreement', { agreementStep: 'contract' })}
              />
            )}
          </>
        )}
        {booking.phase === 'AWAITING_DEPOSIT' && (
          <>
            <Text>Cần hai bên duyệt cùng một phiên bản hợp đồng trước khi đặt cọc.</Text>
            <Action
              label="Xem hợp đồng"
              onPress={() => navigate('agreement', { agreementStep: 'contract' })}
            />
            {proposal && (
              <Text style={s.muted}>
                Đặt cọc {money(proposal.proposal.depositAmountVnd)} ·{' '}
                {depositPercentage(proposal.proposal)}% theo đề xuất. Số tiền chính thức theo hợp
                đồng đã duyệt.
              </Text>
            )}
            <Action label="Đi tới Thanh toán" onPress={() => navigate('payment')} secondary />
          </>
        )}
        {booking.phase === 'CONFIRMED' && (
          <>
            {days >= 0 && (
              <>
                <Text>Chốt số khách dự kiến, nhóm khách, sơ đồ và thiệp cưới.</Text>
                <Action
                  label="Mở quy mô & nhóm"
                  onPress={() => navigate('prepare', { prepareSection: 'groups' })}
                />
                <Action
                  variant="text"
                  label="Xếp sơ đồ"
                  secondary
                  onPress={() => navigate('prepare', { prepareSection: 'seating' })}
                />
                <Action
                  variant="text"
                  label="Mở thiệp"
                  secondary
                  onPress={() => navigate('prepare', { prepareSection: 'invitation' })}
                />
              </>
            )}
            <CompletionNotice {...props} />
          </>
        )}
        {booking.phase === 'COMPLETED' && <CompletedTask {...props} />}
        {booking.phase === 'CANCELLED' && (
          <Notice>
            Tiệc cưới đã huỷ. Hồ sơ được lưu trữ để hai bạn xem lại hợp đồng và giao dịch. Các chức
            năng chuẩn bị đã ngừng hoạt động.
          </Notice>
        )}
      </Section>
      <ImageBackground
        source={require('../../../assets/images/hero-sanh-tiec-1080.webp')}
        accessible={false}
        imageStyle={{ borderRadius: 12 }}
        style={{ overflow: 'hidden', borderRadius: 12, backgroundColor: hy.ink }}
      >
        <View
          style={{
            minHeight: 132,
            padding: 20,
            gap: 10,
            justifyContent: 'flex-end',
            backgroundColor: 'rgba(43,29,34,0.68)',
          }}
        >
          <Text style={{ fontFamily: hy.bold, fontSize: 22, lineHeight: 30, color: hy.surface }}>
            {booking.phase === 'CANCELLED'
              ? 'Tiệc đã huỷ'
              : booking.phase === 'COMPLETED'
                ? 'Tiệc đã hoàn thành'
                : days > 0
                  ? `${days} ngày nữa tới tiệc`
                  : days === 0
                    ? 'Hôm nay là ngày tiệc!'
                    : 'Tiệc đã diễn ra'}
          </Text>

          <Text style={{ color: hy.surface }}>
            {proposal?.planningHeadcount ?? booking.planningHeadcount} khách dự kiến
            {proposal
              ? ` · ${proposal.proposal.tableCount} bàn · ${proposal.proposal.menus.length} thực đơn`
              : ''}
          </Text>
          {booking.totalVnd != null && (
            <Text style={{ color: hy.surface }}>Tổng {money(booking.totalVnd)}</Text>
          )}
        </View>
      </ImageBackground>
      <Section title="Hành trình của hai bạn">
        <Text style={s.heading}>
          {currentStep < 0
            ? 'Hành trình đã dừng'
            : `Bước ${currentStep + 1}/6 · ${journey[currentStep]}`}
        </Text>
        <Disclosure title="Xem toàn bộ hành trình">
          {journey.map((step, index) => (
            <View key={step} style={[s.detailRow, { paddingVertical: 6 }]}>
              <Text style={index === currentStep ? s.disclosureLabel : s.muted}>
                {index + 1}. {step}
              </Text>
              {index === currentStep && <Text style={s.muted}>Hiện tại</Text>}
            </View>
          ))}
        </Disclosure>
      </Section>
      <Action label="Cập nhật tổng quan" onPress={refresh} variant="text" />
    </Page>
  );
}

function CompletedTask({
  session,
  booking,
  revision,
  navigate,
  contextReady = true,
}: WorkspaceProps) {
  const load = useCallback(async () => {
    const [view, invoices] = await Promise.all([
      session.authorize((token) => billing.load(token, booking.bookingId)),
      session.authorize((token) => billing.loadFinalInvoices(token, booking.bookingId)),
    ]);
    const invoice = invoices.revisions.find(
      (item) => item.invoiceRevisionId === invoices.currentRevisionId,
    );
    if (invoices.currentRevisionId && !invoice) return 'unknown' as const;
    return settlementStatus(view, invoice?.document.totalVnd ?? null);
  }, [session, booking.bookingId]);
  const state = useRead(load, revision);
  const status =
    !contextReady || state.loading || state.error ? 'unknown' : (state.data ?? 'unknown');
  return (
    <>
      <Text style={s.heading}>{settlementLabels[status]}</Text>
      <Text>
        {status === 'settled'
          ? 'Hoá đơn cuối đã chốt và đã thanh toán đủ. Hai bạn có thể xem lại hoá đơn và giao dịch.'
          : status === 'credit'
            ? 'Liên hệ nhà hàng để xử lý khoản thanh toán thừa theo chứng từ.'
            : 'Xem hoá đơn cuối và công nợ mới nhất của tiệc.'}
      </Text>
      <ReadState state={state} />
      <Action
        label={status === 'settled' ? 'Xem hoá đơn & giao dịch' : 'Xem quyết toán'}
        onPress={() => navigate(status === 'outstanding' ? 'payment' : 'settlement')}
      />
    </>
  );
}
