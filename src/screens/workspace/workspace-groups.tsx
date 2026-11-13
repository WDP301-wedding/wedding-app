import { useCallback, useState } from 'react';
import { View } from 'react-native';
import { HyText as Text } from '@/components/hy-ui';
import { createWorkspaceGateway } from '@/features/couple-workspace/workspace-api';
import { createCoupleBillingGateway } from '@/features/payments-billing/billing-api';
import { closed } from '@/features/couple-workspace/policies';
import { groupLabel } from '@/features/couple-workspace/links';
import {
  Action,
  commandKey,
  Feedback,
  Field,
  Notice,
  ReadState,
  Section,
  s,
  useCommand,
  useRead,
  type WorkspaceProps,
} from './workspace-common';

const api = createWorkspaceGateway();
const billing = createCoupleBillingGateway();
export function WorkspaceGroups({
  session,
  booking,
  proposal,
  refresh,
  revision,
  contextReady = true,
}: WorkspaceProps) {
  const load = useCallback(
    () => session.authorize((token) => api.preparationGroups(token, booking.bookingId)),
    [session, booking.bookingId],
  );
  const state = useRead(load, revision);
  const command = useCommand(() => {
    state.reload();
    refresh();
  });
  const [editingPlan, setEditingPlan] = useState(false);
  const [headcount, setHeadcount] = useState('');
  const [planRevision, setPlanRevision] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [groupRevision, setGroupRevision] = useState<number | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const locked = booking.accessLevel !== 'FULL' || closed(booking.phase);
  const readOnly = locked || !contextReady || state.loading || !!state.error;
  const maximum = proposal
    ? Math.min(
        proposal.proposal.hall.maxGuests,
        proposal.proposal.tableCount * 10,
        (proposal.capacity?.maximumTables ?? 10000) * 10,
      )
    : null;
  const parsed = /^\d+$/.test(headcount) ? Number(headcount) : NaN;
  const stalePlan = planRevision !== state.data?.plan.revision;
  const editedGroup = state.data?.groups.find((group) => group.guestGroupId === editingId);
  const staleGroup = editingId !== null && editedGroup?.revision !== groupRevision;
  const validHeadcount =
    !stalePlan &&
    maximum !== null &&
    Number.isSafeInteger(parsed) &&
    parsed >= 0 &&
    parsed <= maximum;
  return (
    <View style={{ gap: 16 }}>
      <ReadState state={state} />
      <Feedback command={command} />
      {state.data && (
        <>
          <Section title="Số khách dự kiến">
            <Text style={s.amount}>{state.data.plan.planningHeadcount} khách</Text>
            {proposal && (
              <Text style={s.muted}>
                {proposal.proposal.tableCount} bàn đã chốt · tối đa 10 người/bàn
              </Text>
            )}
            {!readOnly && (
              <Action
                label="Sửa số khách dự kiến"
                disabled={!proposal || command.pending}
                secondary
                onPress={() => {
                  setHeadcount(String(state.data!.plan.planningHeadcount));
                  setPlanRevision(state.data!.plan.revision);
                  setEditingPlan(!editingPlan);
                }}
              />
            )}
            {editingPlan && !readOnly && (
              <>
                <Field
                  label="Số khách dự kiến"
                  disabled={command.pending}
                  value={headcount}
                  onChangeText={setHeadcount}
                  numeric
                />
                <Text style={s.muted}>
                  Từ 0 đến {maximum ?? '…'} khách theo số bàn và sức chứa hiện tại.
                </Text>
                {stalePlan && (
                  <Notice>
                    Số khách đã thay đổi ở nơi khác. Nội dung đang nhập được giữ nguyên. Đóng và mở
                    lại mục sửa số khách để lấy bản mới.
                  </Notice>
                )}
                <Action
                  label="Lưu số khách"
                  disabled={!validHeadcount || command.pending}
                  onPress={() => {
                    const body = {
                      expectedRevision: planRevision!,
                      planningHeadcount: parsed,
                    };
                    void command
                      .run(
                        () =>
                          session.authorize((token) =>
                            billing.updateGuestPlan!(
                              token,
                              booking.bookingId,
                              body.expectedRevision,
                              parsed,
                              commandKey('headcount', booking.bookingId, body),
                            ),
                          ),
                        'Đã cập nhật số khách dự kiến.',
                      )
                      .then((ok) => {
                        if (ok) setEditingPlan(false);
                      });
                  }}
                />
              </>
            )}
          </Section>
          <Section title="Nhóm khách">
            <Text style={s.muted}>
              Dùng nhóm để bố trí sơ đồ bàn. Không cần thu thập danh sách từng khách.
            </Text>
            {state.data.groups
              .filter((group) => (group.status === 'ARCHIVED') === showArchived)
              .map((group) => (
                <View key={group.guestGroupId} style={s.item}>
                  <Text style={s.heading}>{groupLabel(group.name)}</Text>
                  <Text style={s.muted}>
                    {group.status === 'ACTIVE' ? 'Đang sử dụng' : 'Đã lưu trữ'}
                  </Text>
                  {!readOnly && (
                    <View style={s.row}>
                      <Action
                        label={`Đổi tên ${groupLabel(group.name)}`}
                        secondary
                        disabled={command.pending}
                        onPress={() => {
                          setEditingId(group.guestGroupId);
                          setGroupRevision(group.revision);
                          setName(groupLabel(group.name));
                        }}
                      />
                      <Action
                        label={
                          group.status === 'ACTIVE'
                            ? `Lưu trữ ${groupLabel(group.name)}`
                            : `Khôi phục ${groupLabel(group.name)}`
                        }
                        secondary
                        disabled={command.pending}
                        onPress={() => {
                          const body = {
                            expectedRevision: group.revision,
                            status:
                              group.status === 'ACTIVE'
                                ? ('ARCHIVED' as const)
                                : ('ACTIVE' as const),
                          };
                          void command.run(() =>
                            session.authorize((token) =>
                              api.updateGroup(
                                token,
                                booking.bookingId,
                                group.guestGroupId,
                                body,
                                commandKey('group-status', group.guestGroupId, body),
                              ),
                            ),
                          );
                        }}
                      />
                    </View>
                  )}
                </View>
              ))}
            {!state.data.groups.some((group) => (group.status === 'ARCHIVED') === showArchived) && (
              <Text style={s.muted}>Chưa có nhóm trong mục này.</Text>
            )}
            <Action
              label={showArchived ? 'Xem nhóm đang dùng' : 'Xem nhóm đã lưu trữ'}
              onPress={() => setShowArchived(!showArchived)}
              secondary
            />
            {!readOnly && (
              <>
                <Field
                  disabled={command.pending}
                  label={editingId ? 'Tên nhóm mới' : 'Tên nhóm khách'}
                  value={name}
                  onChangeText={setName}
                />
                <Action
                  label={editingId ? 'Lưu tên nhóm' : 'Thêm nhóm'}
                  disabled={
                    staleGroup || command.pending || !name.trim() || name.trim().length > 120
                  }
                  onPress={() => {
                    const group = state.data!.groups.find(
                      (item) => item.guestGroupId === editingId,
                    );
                    const body = group
                      ? { expectedRevision: groupRevision!, name: name.trim() }
                      : { name: name.trim(), color: '#7A1F3D' };
                    void command
                      .run(
                        () =>
                          session.authorize((token) =>
                            group
                              ? api.updateGroup(
                                  token,
                                  booking.bookingId,
                                  group.guestGroupId,
                                  { expectedRevision: groupRevision!, name: name.trim() },
                                  commandKey('group-name', group.guestGroupId, body),
                                )
                              : api.createGroup(
                                  token,
                                  booking.bookingId,
                                  { name: name.trim(), color: '#7A1F3D' },
                                  commandKey('group-create', booking.bookingId, body),
                                ),
                          ),
                        'Đã lưu nhóm khách.',
                      )
                      .then((ok) => {
                        if (ok) {
                          setName('');
                          setEditingId(null);
                        }
                      });
                  }}
                />
                {staleGroup && (
                  <Notice>
                    Nhóm đã thay đổi hoặc không còn tồn tại. Nội dung đang nhập được giữ nguyên;
                    chọn Đổi tên trên nhóm mới nhất trước khi lưu.
                  </Notice>
                )}
                {editingId && (
                  <Action
                    label="Huỷ đổi tên"
                    onPress={() => {
                      setEditingId(null);
                      setName('');
                    }}
                    secondary
                  />
                )}
              </>
            )}
          </Section>
          {readOnly && (
            <Notice>
              {!locked
                ? 'Đang cập nhật hoặc chưa kiểm tra được thông tin mới nhất. Hãy tải lại trước khi thay đổi.'
                : closed(booking.phase)
                  ? 'Tiệc đã đóng. Hai bạn có thể xem lại quy mô và nhóm đã lưu.'
                  : 'Chức năng chuẩn bị mở sau đặt cọc.'}
            </Notice>
          )}
        </>
      )}
    </View>
  );
}
