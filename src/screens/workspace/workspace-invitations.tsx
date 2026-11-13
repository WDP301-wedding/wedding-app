import { useCallback, useState } from 'react';
import { Image, Share, View } from 'react-native';
import { openURL } from 'expo-linking';
import { setStringAsync } from 'expo-clipboard';
import { HyText as Text } from '@/components/hy-ui';
import { createWorkspaceGateway } from '@/features/couple-workspace/workspace-api';
import { createAppInvitationGateway } from '@/features/invitation-studio/app-invitation-api';
import {
  openWebPrepare,
  publicInvitationQrUrl,
  publicInvitationUrl,
} from '@/features/couple-workspace/links';
import { closed, money } from '@/features/couple-workspace/policies';
import { confirmModal } from '@/lib/confirm';
import {
  Action,
  commandKey,
  Feedback,
  Notice,
  ReadState,
  Section,
  s,
  useCommand,
  useRead,
  type WorkspaceProps,
} from './workspace-common';

const api = createWorkspaceGateway();
const invitations = createAppInvitationGateway();
type Design = Awaited<ReturnType<typeof api.invitations>>[number];
export function WorkspaceInvitations(props: WorkspaceProps) {
  const { session, booking, revision } = props;
  const load = useCallback(
    () => session.authorize((token) => api.invitations(token, booking.bookingId)),
    [session, booking.bookingId],
  );
  const printLoad = useCallback(
    () => session.authorize((token) => api.printRequests(token, booking.bookingId)),
    [session, booking.bookingId],
  );
  const state = useRead(load, revision);
  const print = useRead(printLoad, revision);
  const command = useCommand(() => {});
  const readOnly = closed(booking.phase);
  return (
    <View style={{ gap: 16 }}>
      <ReadState state={state} />
      {state.data?.length === 0 && (
        <Notice>
          Chưa có thiệp cưới. Hai bạn chọn mẫu, chỉnh nội dung và ảnh trên web; thiệp đã lưu sẽ hiện
          ở đây để xuất bản và chia sẻ.
        </Notice>
      )}
      {state.data?.map((design) => (
        <InvitationCard
          key={`${design.designId}:${design.revisionId}`}
          {...props}
          design={design}
          readOnly={readOnly}
        />
      ))}
      <Action
        label={readOnly ? 'Xem thiết kế trên web' : 'Chọn hoặc sửa thiết kế trên web'}
        secondary
        disabled={command.pending}
        onPress={() =>
          void command.run(
            () => openWebPrepare(booking.bookingId, '/khong-gian/chuan-bi/thiep'),
            'Đã mở thiết kế thiệp trên web.',
          )
        }
      />
      <Section title="Yêu cầu in thiệp">
        <ReadState state={print} />
        {print.data?.length === 0 && (
          <Text style={s.muted}>
            Chưa có yêu cầu in. Đặt in thiệp giấy trên web; mỗi yêu cầu tạo một phụ lục để hai bên
            duyệt.
          </Text>
        )}
        {print.data?.map((request) => (
          <View key={request.requestId} style={s.item}>
            <Text style={s.heading}>
              {request.state === 'APPROVED'
                ? 'Đã duyệt'
                : request.state === 'AWAITING_APPROVAL'
                  ? 'Chờ hai bên duyệt'
                  : request.state === 'DRAFT'
                    ? 'Bản nháp'
                    : 'Đã lưu trữ'}{' '}
              · {money(request.document.totalVnd)}
            </Text>
            {Array.from(request.document.lines).map((line, index) => (
              <Text key={index}>
                {line.title} · {line.quantity} thiệp · {money(line.line.lineTotalVnd)}
              </Text>
            ))}
          </View>
        ))}
        <Action
          label={readOnly ? 'Xem yêu cầu in trên web' : 'Đặt in hoặc xử lý yêu cầu in trên web'}
          secondary
          onPress={() =>
            void command.run(
              () => openWebPrepare(booking.bookingId, '/khong-gian/chuan-bi/thiep'),
              'Đã mở yêu cầu in trên web.',
            )
          }
          disabled={command.pending}
        />
      </Section>
      <Feedback command={command} />
    </View>
  );
}

function InvitationCard({
  session,
  booking,
  design,
  readOnly,
  revision,
  refresh,
  contextReady = true,
}: WorkspaceProps & { design: Design; readOnly: boolean }) {
  const load = useCallback(
    () => session.authorize((token) => api.publication(token, booking.bookingId, design.designId)),
    [session, booking.bookingId, design.designId],
  );
  const state = useRead(load, revision);
  const command = useCommand(() => {
    state.reload();
    refresh();
  });
  const [qrError, setQrError] = useState(false);
  const publication = state.data;
  const slug = publication?.published ? publication.publicSlug : null;
  const url = slug ? publicInvitationUrl(slug) : null;
  const behind = !!publication?.published && publication.publishedRevisionId !== design.revisionId;
  const names = [design.textFields.groomName, design.textFields.brideName].filter(
    (name) => !!name?.trim(),
  );
  const publish = () => {
    if (readOnly || !publication) return;
    const body = {
      expectedRevision: design.revisionNumber,
      designRevisionId: design.revisionId,
      expectedPublicationRevision: publication.publicationRevision,
    };
    void command.run(
      () =>
        session.authorize((token) =>
          invitations.publishInvitation(
            token,
            booking.bookingId,
            design.designId,
            design.revisionNumber,
            design.revisionId,
            publication.publicationRevision,
            commandKey('invitation-publish', design.designId, body),
          ),
        ),
      'Đã xuất bản thiệp.',
    );
  };
  return (
    <Section title={design.title}>
      <Text style={s.muted}>
        Bản {design.revisionNumber} · {new Date(design.updatedAt).toLocaleString('vi-VN')}
      </Text>
      {names.length > 0 && <Text style={s.heading}>{names.join(' & ')}</Text>}
      {design.textFields.greeting && <Text>{design.textFields.greeting}</Text>}
      {design.textFields.message && <Text>{design.textFields.message}</Text>}
      <ReadState state={state} />
      {publication && !publication.published && (
        <>
          <Notice>Thiệp chưa được chia sẻ công khai.</Notice>
          {!readOnly && (
            <Action
              label={`Xuất bản thiệp · ${design.title}`}
              disabled={!contextReady || command.pending || state.loading || !!state.error}
              onPress={publish}
            />
          )}
        </>
      )}
      {publication && behind && (
        <>
          <Notice>Khách đang xem bản cũ. Xuất bản lại để cập nhật bản mới nhất.</Notice>
          {!readOnly && (
            <Action
              label={`Xuất bản bản mới · ${design.title}`}
              disabled={!contextReady || command.pending || state.loading || !!state.error}
              onPress={publish}
            />
          )}
        </>
      )}
      {url && slug && publication && (
        <>
          {qrError ? (
            <Notice>Không tải được mã QR.</Notice>
          ) : (
            <Image
              key={slug}
              source={{ uri: publicInvitationQrUrl(slug) }}
              accessibilityLabel={`Mã QR ${design.title}`}
              style={{ width: 180, height: 180, alignSelf: 'center' }}
              onError={() => setQrError(true)}
            />
          )}
          <Text selectable style={s.muted}>
            {url}
          </Text>
          <View style={s.row}>
            <Action
              label={`Gửi link · ${design.title}`}
              disabled={command.pending}
              onPress={() =>
                void command.run(
                  () =>
                    Share.share({
                      title: design.title,
                      message: names.length
                        ? `Thiệp cưới của ${names.join(' & ')}: ${url}`
                        : `Thiệp cưới: ${url}`,
                    }),
                  'Đã mở bảng chia sẻ.',
                )
              }
            />
            <Action
              label={`Sao chép link · ${design.title}`}
              secondary
              disabled={command.pending}
              onPress={() =>
                void command.run(() => setStringAsync(url), 'Đã sao chép liên kết thiệp.')
              }
            />
            <Action
              label={`Xem thiệp · ${design.title}`}
              secondary
              disabled={command.pending}
              onPress={() => void command.run(() => openURL(url), 'Đã mở thiệp cưới.')}
            />
          </View>
          {!readOnly && (
            <Action
              label={`Ngừng chia sẻ · ${design.title}`}
              disabled={!contextReady || command.pending || state.loading || !!state.error}
              secondary
              onPress={() =>
                void command.run(async () => {
                  if (
                    !(await confirmModal.confirm({
                      title: 'Ngừng chia sẻ thiệp?',
                      message:
                        'Liên kết công khai của thiệp này sẽ ngừng truy cập cho đến khi xuất bản lại.',
                      confirmText: 'Ngừng chia sẻ',
                      destructive: true,
                    }))
                  )
                    return false;
                  const body = { expectedRevision: publication.publicationRevision };
                  await session.authorize((token) =>
                    invitations.unpublishInvitation(
                      token,
                      booking.bookingId,
                      design.designId,
                      publication.publicationRevision,
                      commandKey('invitation-unpublish', design.designId, body),
                    ),
                  );
                  return true;
                }, 'Đã ngừng chia sẻ thiệp cưới.')
              }
            />
          )}
        </>
      )}
      <Feedback command={command} />
    </Section>
  );
}
