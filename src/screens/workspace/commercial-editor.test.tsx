import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { CommercialEditor } from './commercial-editor';
import { bookingFixture, proposalFixture, sessionFixture } from './workspace-test-support';
import type { PricedLine } from '@/features/couple-workspace/commercial-policies';
import { createWorkspaceGateway } from '@/features/couple-workspace/workspace-api';
import { AndroidIdentitySession } from '@/features/identity-access/session';
import { ApiClientError } from '@/lib/api/client';

afterEach(() => jest.clearAllMocks());

const mockMenu: PricedLine = {
  category: 'MENU',
  sourceId: 'menu',
  sourceRevisionId: 'menu-version',
  name: 'Thực đơn',
  description: '',
  unit: 'table',
  quantity: 10,
  unitPriceVnd: 1000000,
  lineTotalVnd: 10000000,
};
jest.mock('@/features/couple-workspace/workspace-api', () => {
  const api = {
    selectionChoices: jest.fn(async () => [mockMenu]),
    previewSelection: jest.fn(),
    saveSelection: jest.fn(),
  };
  return { createWorkspaceGateway: () => api };
});
it('retains the quantity draft and blocks a stale booking revision instead of silently overwriting it', async () => {
  const session = await sessionFixture();
  const props = {
    session,
    booking: bookingFixture(),
    proposal: proposalFixture(),
    revision: 0,
    refresh: jest.fn(),
    navigate: jest.fn(),
    bookingRevision: 4,
    baseLines: [mockMenu],
  };
  const view = await render(<CommercialEditor {...props} />);
  await screen.findByLabelText('Số bàn · Thực đơn');
  await fireEvent.changeText(screen.getByLabelText('Số bàn · Thực đơn'), '11');
  await view.rerender(<CommercialEditor {...props} bookingRevision={5} />);
  expect(screen.getByLabelText('Số bàn · Thực đơn')).toHaveProp('value', '11');
  expect(screen.getByText(/Nội dung đang soạn được giữ nguyên/)).toBeOnTheScreen();
  expect(screen.getByRole('button', { name: 'Lưu nháp' })).toBeDisabled();
  expect(createWorkspaceGateway().saveSelection).not.toHaveBeenCalled();
});

it('refreshes an expired credential when loading choices instead of showing a false expired-session notice', async () => {
  const credential = {
    accessToken: 'fixture-old-access',
    refreshToken: 'fixture-refresh',
    sessionId: 'fixture-session',
  };
  let savedRefresh: string | null = null;
  const refreshSession = jest.fn(async () => ({
    ...credential,
    accessToken: 'fixture-fresh-access',
    refreshToken: 'fixture-rotated-refresh',
  }));
  const session = new AndroidIdentitySession(
    {
      createSession: async () => credential,
      refreshSession,
      getCurrentUser: async () => ({
        accountId: 'fixture-account',
        displayEmail: 'couple@example.invalid',
        roles: ['COUPLE'],
        sessionId: credential.sessionId,
      }),
      logout: async () => {},
      requestPasswordReset: async () => {},
      completePasswordReset: async () => {},
    },
    {
      read: async () => savedRefresh,
      replace: async (token) => {
        savedRefresh = token;
      },
      clear: async () => {
        savedRefresh = null;
      },
    },
  );
  await session.login('couple@example.invalid', 'fixture-password');
  const choices = jest.mocked(createWorkspaceGateway().selectionChoices);
  choices.mockRejectedValueOnce(
    new ApiClientError({
      kind: 'api',
      status: 401,
      code: 'AUTHENTICATION_REQUIRED',
      message: 'Authentication is required.',
      requestId: 'fixture-request',
    }),
  );
  try {
    await render(
      <CommercialEditor
        session={session}
        booking={bookingFixture()}
        proposal={proposalFixture()}
        revision={0}
        refresh={jest.fn()}
        navigate={jest.fn()}
        bookingRevision={4}
        baseLines={[mockMenu]}
      />,
    );
    await screen.findByLabelText('Số bàn · Thực đơn');
    await waitFor(() => expect(refreshSession).toHaveBeenCalledTimes(1));
    expect(refreshSession).toHaveBeenCalledWith('fixture-refresh');
    expect(choices.mock.calls).toEqual([['fixture-old-access'], ['fixture-fresh-access']]);
    expect(session.snapshot().status).toBe('authenticated');
    expect(savedRefresh).toBe('fixture-rotated-refresh');
    expect(screen.queryByText('Phiên đăng nhập đã hết hạn. Hãy đăng nhập lại.')).toBeNull();
  } finally {
    session.dispose();
  }
});
