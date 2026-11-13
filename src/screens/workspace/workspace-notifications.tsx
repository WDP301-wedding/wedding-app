import { useCallback, useState } from 'react';
import { Pressable } from 'react-native';
import { HyText as Text } from '@/components/hy-ui';
import {
  createNotificationGateway,
  type InboxItem,
} from '@/features/notifications/notification-api';
import {
  notificationTarget,
  readableNotificationMessage,
  type NotificationTarget,
} from '@/features/couple-workspace/notification-policies';
import { vietnamToday } from '@/features/couple-workspace/policies';
import {
  Action,
  commandKey,
  Feedback,
  Notice,
  Page,
  ReadState,
  Section,
  s,
  useClock,
  useCommand,
  useRead,
  type WorkspaceProps,
} from './workspace-common';

const api = createNotificationGateway();
export function WorkspaceNotifications({
  session,
  revision,
  onOpenBooking,
  onUnreadChanged,
}: Pick<WorkspaceProps, 'session' | 'revision'> & {
  onOpenBooking: (bookingId: string, target: NotificationTarget) => void;
  onUnreadChanged: () => void;
}) {
  const load = useCallback(
    () => session.authorize((token) => api.listInbox(token, { limit: 25 })),
    [session],
  );
  const state = useRead(load, revision);
  const [extra, setExtra] = useState<readonly InboxItem[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null | undefined>(undefined);
  const [readIds, setReadIds] = useState<ReadonlySet<string>>(() => new Set());
  const command = useCommand(() => {
    onUnreadChanged();
  });
  const byId = new Map<string, InboxItem>();
  for (const item of [...(state.data?.items ?? []), ...extra])
    if (!byId.has(item.id)) byId.set(item.id, item);
  const items = Array.from(byId.values());
  const cursor = nextCursor === undefined ? state.data?.nextCursor : nextCursor;
  const unread = items.filter((item) => !item.readAt && !readIds.has(item.id)).length;
  const groups = new Map<string, InboxItem[]>();
  for (const item of items) {
    const key = vietnamToday(new Date(item.createdAt));
    const group = groups.get(key) ?? [];
    group.push(item);
    groups.set(key, group);
  }
  const open = (item: InboxItem) => {
    if (!item.readAt && !readIds.has(item.id)) {
      void session
        .authorize((token) =>
          api.readNotification(
            token,
            item.id,
            item.revision,
            commandKey('notification-read', item.id, { expectedRevision: item.revision }),
          ),
        )
        .then(() => {
          setReadIds((old) => new Set([...old, item.id]));
          onUnreadChanged();
        })
        .catch(() => {
          /* Reading the destination must not depend on marking the notification read. */
        });
    }
    const target = notificationTarget(item.purpose, item.resource.bookingId);
    if (target && item.resource.bookingId) onOpenBooking(item.resource.bookingId, target);
  };
  const now = useClock();
  const today = vietnamToday(new Date(now));
  const yesterday = vietnamToday(new Date(now - 86400000));
  return (
    <Page title="Thông báo">
      <ReadState state={state} />
      <Feedback command={command} />
      {state.data && (
        <>
          <Text style={s.muted}>
            {unread
              ? `${unread} thông báo chưa đọc trong danh sách`
              : 'Đã đọc hết danh sách đang xem'}
          </Text>
          <Action
            label="Đánh dấu tất cả đã đọc"
            secondary
            disabled={command.pending || unread === 0}
            onPress={() => {
              const throughCreatedAt = new Date().toISOString();
              void command.run(async () => {
                await session.authorize((token) =>
                  api.readAllNotifications(
                    token,
                    throughCreatedAt,
                    commandKey('notifications-read-all', 'account', { throughCreatedAt }),
                  ),
                );
                setReadIds(
                  (old) =>
                    new Set([
                      ...old,
                      ...items
                        .filter((item) => item.createdAt <= throughCreatedAt)
                        .map((item) => item.id),
                    ]),
                );
              }, 'Đã đánh dấu các thông báo trước đó là đã đọc.');
            }}
          />
        </>
      )}
      {!state.loading && !state.error && items.length === 0 && (
        <Notice>
          Chưa có thông báo nào. Khi nhà hàng duyệt, gửi hợp đồng hay xác nhận thanh toán, thông báo
          sẽ hiện ở đây.
        </Notice>
      )}
      {Array.from(groups.entries()).map(([day, messages]) => (
        <Section
          key={day}
          title={
            day === today
              ? 'Hôm nay'
              : day === yesterday
                ? 'Hôm qua'
                : day.split('-').reverse().join('/')
          }
        >
          {messages.map((item) => (
            <Pressable
              key={item.id}
              accessibilityRole="button"
              accessibilityLabel={item.title}
              accessibilityHint={
                !item.readAt && !readIds.has(item.id) ? 'Thông báo chưa đọc' : 'Thông báo đã đọc'
              }
              onPress={() => open(item)}
              style={s.item}
            >
              <Text style={!item.readAt && !readIds.has(item.id) ? s.heading : undefined}>
                {item.title}
              </Text>
              {readableNotificationMessage(item.message) && (
                <Text style={s.muted}>{readableNotificationMessage(item.message)}</Text>
              )}
              <Text style={s.muted}>
                {new Date(item.createdAt).toLocaleTimeString('vi-VN', {
                  timeZone: 'Asia/Ho_Chi_Minh',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
                {!item.readAt && !readIds.has(item.id) ? ' · Chưa đọc' : ''}
              </Text>
            </Pressable>
          ))}
        </Section>
      ))}
      {cursor && (
        <Action
          label="Xem thêm thông báo"
          secondary
          disabled={command.pending}
          onPress={() =>
            void command.run(async () => {
              const page = await session.authorize((token) =>
                api.listInbox(token, { limit: 25, cursor }),
              );
              setExtra((old) => [...old, ...page.items]);
              setNextCursor(page.nextCursor);
            }, 'Đã tải thêm thông báo.')
          }
        />
      )}
      <Action
        label="Tải lại thông báo"
        secondary
        onPress={() => {
          setExtra([]);
          setNextCursor(undefined);
          state.reload();
          onUnreadChanged();
        }}
      />
    </Page>
  );
}
