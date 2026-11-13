import { useCallback, useRef, useState } from 'react';
import { type ScrollViewInstance, View } from 'react-native';
import { HyText as Text } from '@/components/hy-ui';
import {
  createCoupleBillingGateway,
  type CommercialContractView,
} from '@/features/payments-billing/billing-api';
import {
  createProposalGateway,
  type CoupleProfileView,
} from '@/features/booking-lifecycle/proposal-api';
import { createRestoredFlowsGateway } from '@/features/restored-flows/restored-flows-api';
import { createWorkspaceGateway } from '@/features/couple-workspace/workspace-api';
import { downloadContractPdf, openContractPdf } from '@/features/couple-workspace/contract-files';
import { depositPercentage, money } from '@/features/couple-workspace/policies';
import { codeMessages } from '@/lib/api/error-messages.vi';
import { confirmModal } from '@/lib/confirm';
import { CommercialEditor, PricedLines } from './commercial-editor';
import { selectionDifferences } from '@/features/couple-workspace/commercial-policies';
import { WorkspaceTimeline } from './workspace-timeline';
import {
  Action,
  commandKey,
  Feedback,
  Disclosure,
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

const billing = createCoupleBillingGateway();
const proposalApi = createProposalGateway();
const commercial = createRestoredFlowsGateway();
const api = createWorkspaceGateway();
type Contract = CommercialContractView['revisions'][number];
export const canViewContractPdf = (contract: Contract) =>
  !contract.document.standardTerms || !!contract.submittedAt;

export function WorkspaceAgreement(
  props: WorkspaceProps & {
    step?: 'timeline' | 'contract';
    onStepChange?: (step: 'timeline' | 'contract') => void;
  },
) {
  const { session, booking, revision, proposal } = props;
  const [localTab, setLocalTab] = useState<'timeline' | 'contract'>('timeline');
  const scroll = useRef<ScrollViewInstance | null>(null);
  const [contractY, setContractY] = useState(0);
  const [editorVersion, setEditorVersion] = useState(0);
  const tab = props.step ?? localTab;
  const setTab = (next: 'timeline' | 'contract') => {
    setLocalTab(next);
    props.onStepChange?.(next);
  };
  const load = useCallback(async () => {
    let page = await session.authorize((token) => billing.loadContracts(token, booking.bookingId));
    const revisions = [...page.revisions];
    const seen = new Set<string>();
    while (page.nextCursor) {
      if (seen.has(page.nextCursor)) throw new Error('Chưa tải đầy đủ lịch sử hợp đồng.');
      seen.add(page.nextCursor);
      const cursor = page.nextCursor;
      page = await session.authorize((token) =>
        billing.loadContracts(token, booking.bookingId, cursor),
      );
      revisions.push(...page.revisions);
    }
    return { ...page, revisions };
  }, [session, booking.bookingId]);
  const state = useRead(load, revision);
  const current = state.data?.revisions.find(
    (item) => item.revisionId === state.data?.currentRevisionId,
  );
  const locked = !!current?.document.standardTerms && current.state === 'APPROVED';
  const differences =
    current && state.data?.customerSelection?.status === 'SUBMITTED'
      ? selectionDifferences(state.data.customerSelection.lines, current.document.lines)
      : [];
  const contractPanel = state.data ? (
    <View onLayout={(event) => setContractY(event.nativeEvent.layout.y)}>
      <ContractDetails
        key={current?.revisionId ?? 'none'}
        {...props}
        contracts={state.data}
        contract={current ?? null}
        disabled={state.loading || !!state.error || props.contextReady === false}
      />
    </View>
  ) : null;
  return (
    <Page title="Thoả thuận" scrollRef={scroll}>
      <View style={s.row}>
        <Action
          label="Kịch bản"
          onPress={() => setTab('timeline')}
          secondary={tab !== 'timeline'}
        />
        <Action
          label="Hợp đồng"
          onPress={() => setTab('contract')}
          secondary={tab !== 'contract'}
        />
      </View>
      <ReadState state={state} />
      {state.data &&
        proposal &&
        (tab === 'timeline' ? (
          <WorkspaceTimeline
            {...props}
            contextReady={props.contextReady !== false && !state.loading && !state.error}
            locked={locked}
            onContract={() => setTab('contract')}
          />
        ) : (
          <>
            {differences.length > 0 && (
              <Section title="Nhà hàng đã điều chỉnh so với lựa chọn bạn gửi">
                {differences.map((item, index) => (
                  <Text key={index}>
                    {item.kind === 'added' ? 'Thêm' : item.kind === 'removed' ? 'Bỏ' : 'Điều chỉnh'}{' '}
                    · {item.name}
                    {item.fields.length ? `: ${item.fields.join(', ')}` : ''}
                  </Text>
                ))}
                <Action
                  label="Xem hợp đồng bên dưới"
                  secondary
                  onPress={() =>
                    scroll.current?.scrollTo({ y: Math.max(0, contractY), animated: true })
                  }
                />
              </Section>
            )}
            {current && contractPanel}
            <CoupleNames
              {...props}
              initiallyOpen={!current || !current.document.brideName || !current.document.groomName}
            />
            {state.data.changeRequestReason && (
              <Notice>Yêu cầu chỉnh sửa: {state.data.changeRequestReason}</Notice>
            )}
            {state.data.selectionAccess?.canEdit && state.data.customerSelection ? (
              <CommercialEditor
                key={`${state.data.customerSelection.revisionId ?? 'new'}:${editorVersion}`}
                {...props}
                contextReady={props.contextReady !== false && !state.loading && !state.error}
                bookingRevision={state.data.bookingRevision}
                baseLines={state.data.customerSelection.lines}
                selection={state.data.customerSelection}
                onReload={() => {
                  setEditorVersion((value) => value + 1);
                  state.reload();
                  props.refresh();
                }}
              />
            ) : (
              state.data.customerSelection && (
                <Disclosure title="Lựa chọn gửi nhà hàng">
                  <PricedLines
                    lines={state.data.customerSelection.lines}
                    total={state.data.customerSelection.totalVnd}
                    label="Tổng lựa chọn"
                  />
                  {state.data.selectionAccess?.blockReason && (
                    <Notice>
                      {codeMessages[state.data.selectionAccess.blockReason] ??
                        'Lựa chọn hiện không thể chỉnh sửa.'}
                    </Notice>
                  )}
                </Disclosure>
              )
            )}
            {!current && contractPanel}
            {state.data.revisions.length > 1 && (
              <Disclosure title="Lịch sử hợp đồng">
                {state.data.revisions
                  .filter((item) => item.revisionId !== current?.revisionId)
                  .map((item) => (
                    <HistoricalPdf
                      key={item.revisionId}
                      session={session}
                      bookingId={booking.bookingId}
                      contract={item}
                    />
                  ))}
              </Disclosure>
            )}
          </>
        ))}
      <Action
        label="Cập nhật thoả thuận"
        variant="text"
        onPress={() => {
          state.reload();
          props.refresh();
        }}
      />
    </Page>
  );
}

function CoupleNames(props: WorkspaceProps & { initiallyOpen: boolean }) {
  const { session, booking, revision } = props;
  const load = useCallback(
    () =>
      session.authorize((token) => proposalApi.loadCoupleProfile(token, booking.consultationId)),
    [session, booking.consultationId],
  );
  const state = useRead(load, revision);
  return (
    <Disclosure title="Tên cô dâu & chú rể" initiallyOpen={props.initiallyOpen}>
      <ReadState state={state} />
      {state.data && (
        <NamesEditor
          key={state.data.revision}
          {...props}
          contextReady={props.contextReady !== false && !state.loading && !state.error}
          profile={state.data}
        />
      )}
    </Disclosure>
  );
}
function NamesEditor({
  session,
  booking,
  refresh,
  profile,
  contextReady = true,
}: WorkspaceProps & { profile: CoupleProfileView }) {
  const [bride, setBride] = useState(profile.brideName ?? '');
  const [groom, setGroom] = useState(profile.groomName ?? '');
  const command = useCommand(refresh);
  return (
    <View style={{ gap: 12 }}>
      <Text style={s.muted}>
        Tên này được dùng trên hợp đồng và thiệp cưới. Đổi tên tại đây không làm thay đổi các chứng
        từ đã chốt.
      </Text>
      <Field label="Tên cô dâu" disabled={command.pending} value={bride} onChangeText={setBride} />
      <Field label="Tên chú rể" disabled={command.pending} value={groom} onChangeText={setGroom} />
      <Action
        label="Lưu tên cô dâu & chú rể"
        secondary
        disabled={
          !contextReady ||
          command.pending ||
          !bride.trim() ||
          !groom.trim() ||
          bride.trim().length > 100 ||
          groom.trim().length > 100
        }
        onPress={() => {
          const body = {
            brideName: bride.trim(),
            groomName: groom.trim(),
            expectedRevision: profile.revision,
          };
          void command.run(
            () =>
              session.authorize((token) =>
                proposalApi.updateCoupleProfile(
                  token,
                  booking.consultationId,
                  body,
                  commandKey('couple-names', booking.consultationId, body),
                ),
              ),
            'Đã lưu tên cô dâu & chú rể.',
          );
        }}
      />
      <Feedback command={command} />
    </View>
  );
}

export function ContractDetails({
  session,
  booking,
  refresh,
  contracts,
  contract,
  navigate,
  disabled = false,
}: WorkspaceProps & {
  contracts: CommercialContractView;
  contract: Contract | null;
  disabled?: boolean;
}) {
  const [reason, setReason] = useState('');
  const command = useCommand(refresh);
  if (!contract)
    return (
      <Section title="Hợp đồng hiện tại">
        <Notice>Nhà hàng đang chuẩn bị hợp đồng theo kịch bản và lựa chọn đã thống nhất.</Notice>
      </Section>
    );
  const doc = contract.document;
  const coupleApproved = contract.approvals.some((item) => item.party === 'COUPLE');
  const locked = !!doc.standardTerms && contract.state === 'APPROVED';
  const requestChanges =
    contract.state === 'AWAITING_APPROVAL' && contracts.capabilities.canRequestChanges === true;
  const withdraw =
    !locked &&
    !requestChanges &&
    booking.phase !== 'CONFIRMED' &&
    booking.phase !== 'COMPLETED' &&
    contracts.capabilities.canWithdrawApproval &&
    ((contract.state === 'AWAITING_APPROVAL' && coupleApproved) || contract.state === 'APPROVED');
  const pdf = (readable: boolean) =>
    command.run(
      async () =>
        openContractPdf(
          await session.authorize((token) =>
            downloadContractPdf(token, booking.bookingId, contract.revisionId, readable),
          ),
          contract.revisionId,
          readable,
        ),
      'Đã mở hoặc tải PDF hợp đồng.',
    );
  return (
    <Section title={`Hợp đồng bản ${contract.revisionNumber}`}>
      <Text style={s.heading}>
        {doc.brideName ?? 'Chưa có tên cô dâu'} & {doc.groomName ?? 'Chưa có tên chú rể'}
      </Text>
      <Text style={s.muted}>
        {doc.hallName} · {doc.eventDate} · {doc.tableCount} bàn
      </Text>
      <Text>
        Nhà hàng:{' '}
        {contract.approvals.some((item) => item.party === 'MANAGER') ? 'Đã duyệt' : 'Chờ duyệt'} ·
        Hai bạn: {coupleApproved ? 'Đã duyệt' : 'Chờ duyệt'}
      </Text>
      <View style={s.summaryPanel}>
        <Text style={s.muted}>
          {contract.state === 'APPROVED'
            ? 'Hợp đồng đã duyệt'
            : contract.state === 'AWAITING_APPROVAL'
              ? 'Hợp đồng chờ hai bên duyệt'
              : contract.state === 'DRAFT'
                ? 'Hợp đồng bản nháp'
                : 'Hợp đồng đã thay thế'}
        </Text>
        <Text style={s.muted}>Tổng hợp đồng</Text>
        <Text selectable style={s.amount}>
          {money(doc.contractTotalVnd)}
        </Text>
        <Text>
          Khoản đặt cọc: {money(doc.depositAmountVnd)} · {depositPercentage(doc, 'depositRate')}%
        </Text>
      </View>
      {canViewContractPdf(contract) && (
        <>
          <Action
            label={contract.state === 'APPROVED' ? 'Mở PDF chính thức' : 'Xem trước PDF hợp đồng'}
            onPress={() => void pdf(false)}
            disabled={disabled || command.pending}
            secondary={contract.state !== 'APPROVED'}
          />
          <Action
            label="Mở PDF dễ đọc"
            variant="text"
            onPress={() => void pdf(true)}
            disabled={disabled || command.pending}
            secondary
          />
        </>
      )}
      <Disclosure title="Chi tiết hợp đồng" initiallyOpen={contract.state !== 'APPROVED'}>
        <PricedLines
          lines={doc.lines}
          total={doc.contractTotalVnd}
          label="Tổng hợp đồng"
          showTotal={false}
        />
        {doc.standardTerms && (
          <>
            <Notice>
              Giá đã bao gồm VAT. Hãy đọc bản PDF để xem đầy đủ điều khoản trước khi duyệt hợp đồng.
            </Notice>
            <Text>Thực đơn dự phòng: {doc.standardTerms.reserveMenu.name}</Text>
            {doc.standardTerms.reserveMenu.dishes.map((dish, index) => (
              <Text style={s.muted} key={index}>
                {dish}
              </Text>
            ))}
          </>
        )}
        <Text>{doc.incidentalClause}</Text>
        {doc.incidentalPricing && doc.incidentalPricing.length > 0 && (
          <Section title="Đơn giá phát sinh đã chốt">
            {doc.incidentalPricing.map((item) => (
              <View key={item.offeringId} style={s.item}>
                <Text>
                  {item.name} · {money(item.unitPriceVnd)} / {item.unit}
                </Text>
                <Text style={s.muted}>{item.description}</Text>
              </View>
            ))}
          </Section>
        )}
      </Disclosure>
      {contract.state === 'AWAITING_APPROVAL' &&
        !coupleApproved &&
        contracts.capabilities.canApprove && (
          <Action
            label="Đồng ý & duyệt hợp đồng"
            disabled={disabled || command.pending}
            onPress={() =>
              void command.run(async () => {
                if (
                  !(await confirmModal.confirm({
                    title: 'Duyệt hợp đồng này?',
                    message:
                      'Xác nhận hai bạn đã đọc và đồng ý với toàn bộ nội dung bản hợp đồng này. Hệ thống khóa bản chính thức khi cả hai bên đã duyệt.',
                    confirmText: 'Đồng ý & duyệt',
                  }))
                )
                  return false;
                const body = { expectedRevision: contracts.bookingRevision };
                await session.authorize((token) =>
                  commercial.approveContract(
                    token,
                    booking.bookingId,
                    contract.revisionId,
                    body,
                    commandKey('contract-approve', contract.revisionId, body),
                  ),
                );
                return true;
              }, 'Đã ghi nhận hai bạn duyệt hợp đồng.')
            }
          />
        )}
      {(requestChanges || withdraw) && (
        <>
          <Field
            label={requestChanges ? 'Lý do yêu cầu chỉnh sửa hợp đồng' : 'Lý do rút duyệt hợp đồng'}
            value={reason}
            onChangeText={setReason}
            multiline
          />
          <Action
            label={requestChanges ? 'Yêu cầu nhà hàng chỉnh sửa' : 'Rút duyệt hợp đồng'}
            secondary
            disabled={disabled || command.pending || !reason.trim() || reason.trim().length > 500}
            onPress={() => {
              const body = { expectedRevision: contracts.bookingRevision, reason: reason.trim() };
              void command.run(async () => {
                if (requestChanges)
                  await session.authorize((token) =>
                    api.requestContractChanges(
                      token,
                      booking.bookingId,
                      contract.revisionId,
                      body,
                      commandKey('contract-change-request', contract.revisionId, body),
                    ),
                  );
                else
                  await session.authorize((token) =>
                    commercial.withdrawContract(
                      token,
                      booking.bookingId,
                      contract.revisionId,
                      body,
                      commandKey('contract-withdraw', contract.revisionId, body),
                    ),
                  );
              }, 'Đã gửi yêu cầu cho nhà hàng.');
            }}
          />
        </>
      )}
      {locked && (
        <Notice>
          Hợp đồng chuẩn đã được hai bên duyệt và giữ nguyên để in/ký tay theo Điều 10. Thay đổi
          thương mại sau cọc thực hiện qua phụ lục.
        </Notice>
      )}
      <Feedback command={command} />
      <Action label="Xem thanh toán" onPress={() => navigate('payment')} variant="text" />
    </Section>
  );
}

function HistoricalPdf({
  session,
  bookingId,
  contract,
}: {
  session: WorkspaceProps['session'];
  bookingId: string;
  contract: Contract;
}) {
  const command = useCommand(() => {});
  return (
    <View style={s.item}>
      <Text>
        Hợp đồng bản {contract.revisionNumber} ·{' '}
        {new Date(contract.createdAt).toLocaleString('vi-VN')}
      </Text>
      {canViewContractPdf(contract) && (
        <Action
          label={`Mở PDF hợp đồng bản ${contract.revisionNumber}`}
          disabled={command.pending}
          secondary
          onPress={() =>
            void command.run(
              async () =>
                openContractPdf(
                  await session.authorize((token) =>
                    downloadContractPdf(token, bookingId, contract.revisionId),
                  ),
                  contract.revisionId,
                ),
              'Đã mở đúng PDF phiên bản đã chọn.',
            )
          }
        />
      )}
      <Feedback command={command} />
    </View>
  );
}
