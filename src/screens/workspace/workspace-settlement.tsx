import { useCallback, useState } from 'react';
import { View } from 'react-native';
import { HyText as Text } from '@/components/hy-ui';
import { createWorkspaceGateway } from '@/features/couple-workspace/workspace-api';
import {
  createCoupleBillingGateway,
  type IncidentalExpensesView,
} from '@/features/payments-billing/billing-api';
import { balanceGate, money } from '@/features/couple-workspace/policies';
import { CompletionNotice } from './workspace-overview';
import {
  Action,
  commandKey,
  Feedback,
  Field,
  Notice,
  Page,
  ReadState,
  Section,
  s,
  useCommand,
  useRead,
  type WorkspaceProps,
} from './workspace-common';

const api = createWorkspaceGateway();
const billing = createCoupleBillingGateway();
const reviewLabel = (state: string) =>
  ({
    AWAITING_APPROVAL: 'Chờ hai bạn duyệt',
    APPROVED: 'Đã duyệt',
    CHANGES_REQUESTED: 'Đã yêu cầu chỉnh sửa',
    WITHDRAWN: 'Nhà hàng đang sửa',
  })[state] ?? 'Đang cập nhật';

export function ExpenseDecision({
  session,
  bookingId,
  expenses,
  refresh,
  disabled = false,
}: {
  session: Pick<WorkspaceProps['session'], 'authorize'>;
  bookingId: string;
  expenses: IncidentalExpensesView;
  refresh: () => void;
  disabled?: boolean;
}) {
  const [reason, setReason] = useState('');
  const [history, setHistory] = useState(false);
  const command = useCommand(refresh);
  const review = expenses.currentReview;
  const adjustment = review?.document.adjustment;
  const decide = (decision: 'APPROVE' | 'REQUEST_CHANGES') => {
    if (
      !review ||
      review.state !== 'AWAITING_APPROVAL' ||
      disabled ||
      (decision === 'REQUEST_CHANGES' && !reason.trim())
    )
      return;
    const body = {
      expectedRevision: expenses.revision,
      reviewId: review.id,
      documentDigest: review.documentDigest,
      decision,
      ...(decision === 'REQUEST_CHANGES' ? { reason: reason.trim() } : {}),
    };
    void command.run(
      () =>
        session.authorize((token) =>
          api.decideExpenses(
            token,
            bookingId,
            body,
            commandKey('expense-decision', bookingId, body),
          ),
        ),
      decision === 'APPROVE'
        ? 'Đã ghi nhận phê duyệt toàn bộ bảng chi phí.'
        : 'Đã gửi yêu cầu chỉnh sửa.',
    );
  };
  if (!expenses.approvalRequired)
    return (
      <Notice>
        Chi phí phát sinh của tiệc này được xử lý theo thỏa thuận trước đây với nhà hàng.
      </Notice>
    );
  return (
    <View style={{ gap: 12 }}>
      <Text style={s.heading}>
        {review
          ? review.type === 'NONE' && review.state === 'APPROVED'
            ? 'Nhà hàng xác nhận không phát sinh'
            : reviewLabel(review.state)
          : 'Nhà hàng chưa gửi bảng phát sinh hoặc xác nhận không phát sinh.'}
      </Text>
      {review?.decisionReason && <Notice>Lý do: {review.decisionReason}</Notice>}
      {review && (
        <>
          <Text style={s.muted}>Bản {review.revisionNumber} · Toàn bộ nội dung gửi duyệt</Text>
          {review.document.lines.map((line) => (
            <View key={line.id} style={s.item}>
              <Text>{line.name}</Text>
              <Text style={s.muted}>
                {line.quantity} {line.unit} × {money(line.unitPriceVnd)}
                {line.reason ? ` · ${line.reason}` : ''}
              </Text>
              <Text>{money(line.totalVnd)}</Text>
            </View>
          ))}
          <Text style={s.heading}>Tổng bảng gửi duyệt: {money(review.document.totalVnd)}</Text>
        </>
      )}
      {adjustment && (
        <Section title="Đề xuất điều chỉnh hóa đơn">
          <Text>{adjustment.reason}</Text>
          {adjustment.lines.map((line, index) => (
            <View key={index} style={s.item}>
              <Text>
                {line.kind === 'DEBIT' ? 'Tăng' : 'Giảm'} · {line.name}
              </Text>
              <Text style={s.muted}>
                {line.quantity} {line.unit} × {money(line.unitPriceVnd)}
                {line.reason ? ` · ${line.reason}` : ''}
              </Text>
            </View>
          ))}
        </Section>
      )}
      {review?.state === 'AWAITING_APPROVAL' && (
        <>
          <Notice>
            Hai bạn hãy kiểm tra toàn bộ số lượng, đơn giá và lý do trước khi duyệt. Nếu nội dung
            thay đổi, hai bạn cần duyệt lại.
          </Notice>
          <Action
            label={adjustment ? 'Duyệt toàn bộ điều chỉnh' : 'Duyệt toàn bộ chi phí phát sinh'}
            disabled={disabled || command.pending}
            onPress={() => decide('APPROVE')}
          />
          <Field
            label="Lý do yêu cầu chỉnh sửa"
            disabled={command.pending}
            value={reason}
            onChangeText={setReason}
            multiline
          />
          <Action
            label="Yêu cầu chỉnh sửa"
            disabled={disabled || command.pending || !reason.trim() || reason.trim().length > 1000}
            onPress={() => decide('REQUEST_CHANGES')}
            secondary
          />
        </>
      )}
      <Feedback command={command} />
      {expenses.reviewHistory.length > 0 && (
        <>
          <Action
            label={history ? 'Ẩn lịch sử gửi và duyệt' : 'Lịch sử gửi và duyệt'}
            onPress={() => setHistory(!history)}
            secondary
          />
          {history &&
            expenses.reviewHistory.map((item) => (
              <View key={item.id} style={s.item}>
                <Text>
                  Bản {item.revisionNumber} · {reviewLabel(item.state)}
                </Text>
                {item.decisionReason && <Text style={s.muted}>{item.decisionReason}</Text>}
              </View>
            ))}
        </>
      )}
    </View>
  );
}

export function WorkspaceSettlement(props: WorkspaceProps) {
  return (
    <Page title="Quyết toán">
      <Text style={s.muted}>
        Nhà hàng ghi nhận chi phí phát sinh sau khi tiệc kết thúc và chốt hoá đơn cuối. Hai bạn xem
        chi tiết và thanh toán phần còn lại.
      </Text>
      {props.booking.accessLevel !== 'FULL' ? (
        <Notice>Chức năng này mở sau đặt cọc.</Notice>
      ) : props.booking.phase !== 'COMPLETED' ? (
        <>
          <CompletionNotice {...props} />
          <Action
            label="Xem khoản cọc & lịch sử thanh toán"
            onPress={() => props.navigate('payment')}
            secondary
          />
        </>
      ) : (
        <SettlementContent {...props} />
      )}
    </Page>
  );
}

function SettlementContent({
  session,
  booking,
  proposal,
  refresh,
  revision,
  navigate,
  contextReady = true,
}: WorkspaceProps) {
  const load = useCallback(async () => {
    const [expenses, invoices, view] = await Promise.all([
      session.authorize((token) => billing.loadIncidentals(token, booking.bookingId)),
      session.authorize((token) => billing.loadFinalInvoices(token, booking.bookingId)),
      session.authorize((token) => billing.load(token, booking.bookingId)),
    ]);
    const revisions = [...invoices.revisions];
    let cursor = invoices.nextCursor;
    const seen = new Set<string>();
    while (cursor) {
      if (seen.has(cursor)) throw new Error('Không thể tải đầy đủ lịch sử hoá đơn. Hãy thử lại.');
      seen.add(cursor);
      const page = await session.authorize((token) =>
        billing.loadFinalInvoices(token, booking.bookingId, cursor!),
      );
      revisions.push(...page.revisions);
      cursor = page.nextCursor;
    }
    return { expenses, invoices: { ...invoices, revisions }, view };
  }, [session, booking.bookingId]);
  const state = useRead(load, revision);
  const [selected, setSelected] = useState<string | null>(null);
  const data = state.data;
  const invoice = data?.invoices.revisions.find(
    (item) => item.invoiceRevisionId === (selected ?? data.invoices.currentRevisionId),
  );
  const gate = data
    ? balanceGate(booking.phase, data.view.billingRevision, data.view.balancePaymentEligibility)
    : null;
  return (
    <>
      <ReadState state={state} />
      {data && (
        <>
          <Section title="Công nợ hiện tại">
            <Text style={s.amount}>{money(data.view.totals.outstandingVnd)}</Text>
            <Text style={s.muted}>Thanh toán thừa: {money(data.view.totals.creditVnd)}</Text>
            {gate && !gate.allowed && <Notice>{gate.message}</Notice>}
            <Action
              label="Xem thanh toán & giao dịch"
              onPress={() => navigate('payment')}
              secondary
            />
          </Section>
          <Section title="Chi phí phát sinh">
            <Text style={s.muted}>
              {data.expenses.finalized ? 'Đã chốt phát sinh' : 'Chưa chốt phát sinh'}
            </Text>
            {data.expenses.lines.map((line) => (
              <View key={line.id} style={s.item}>
                <Text>{line.name}</Text>
                <Text style={s.muted}>
                  {line.quantity} {line.unit} × {money(line.unitPriceVnd)}
                  {line.note ? ` · ${line.note}` : ''}
                </Text>
                <Text>{money(line.totalVnd)}</Text>
              </View>
            ))}
            <Text style={s.heading}>Tổng phát sinh: {money(data.expenses.totalVnd)}</Text>
            <ExpenseDecision
              session={session}
              bookingId={booking.bookingId}
              expenses={data.expenses}
              refresh={() => {
                state.reload();
                refresh();
              }}
              disabled={
                !contextReady ||
                state.loading ||
                !!state.error ||
                proposal?.capabilities.accessLevel !== 'FULL'
              }
            />
          </Section>
          <Section title="Hoá đơn cuối">
            {!invoice && <Notice>Nhà hàng chưa chốt hoá đơn cuối.</Notice>}
            {invoice && (
              <>
                <Text style={s.heading}>
                  {invoice.invoiceNumber} · Bản {invoice.revisionNumber}
                </Text>
                <Text style={s.muted}>
                  Ngày lập: {new Date(invoice.issuedAt).toLocaleString('vi-VN')}
                </Text>
                {invoice.document.contract.document.lines.map((line, index) => (
                  <View style={s.item} key={index}>
                    <Text>
                      {line.name} · {line.quantity} {line.unit}
                    </Text>
                    <Text>{money(line.lineTotalVnd)}</Text>
                  </View>
                ))}
                <Text>Hợp đồng: {money(invoice.document.contract.document.contractTotalVnd)}</Text>
                {invoice.document.appendices.map((item) => (
                  <Text key={item.revisionId}>
                    Phụ lục · {item.document.reason}: {money(item.document.deltaVnd)}
                  </Text>
                ))}
                {invoice.document.adjustments.map((item) => (
                  <Text key={item.id}>
                    Điều chỉnh · {item.reason}: {money(item.deltaVnd)}
                  </Text>
                ))}
                <Text>Tổng thoả thuận: {money(invoice.document.commercialTotalVnd)}</Text>
                <Text>Phát sinh: {money(invoice.document.incidentalTotalVnd)}</Text>
                <Text style={s.amount}>Tổng hoá đơn: {money(invoice.document.totalVnd)}</Text>
                <Notice>
                  Hoá đơn đã chốt không bị sửa; mọi thay đổi sau đó được ghi thành bản điều chỉnh có
                  lý do.
                </Notice>
              </>
            )}
            {data.invoices.revisions.length > 1 && (
              <Section title="Lịch sử hoá đơn">
                {data.invoices.revisions.map((item) => (
                  <Action
                    key={item.invoiceRevisionId}
                    label={`Xem hoá đơn bản ${item.revisionNumber}`}
                    secondary
                    onPress={() => setSelected(item.invoiceRevisionId)}
                  />
                ))}
              </Section>
            )}
          </Section>
        </>
      )}
    </>
  );
}
