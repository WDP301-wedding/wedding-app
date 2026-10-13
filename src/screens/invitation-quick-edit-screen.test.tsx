import { describe, expect, it } from '@jest/globals';
import {
  render,
  screen,
  fireEvent,
  userEvent,
  waitFor,
  cleanup,
} from '@testing-library/react-native';
import React from 'react';
import { InvitationQuickEditScreen } from './invitation-quick-edit-screen';
import type {
  AppInvitationGateway,
  AppDesignView,
} from '../features/invitation-studio/app-invitation-api';

afterEach(async () => {
  await cleanup();
});

describe('InvitationQuickEditScreen (IS-W7 Android App Component)', () => {
  const token = 'app-couple-token';
  const bookingId = '11111111-1111-1111-1111-111111111111';

  const initialDesign: AppDesignView = {
    designId: 'des-123',
    revisionId: 'rev-1',
    revisionNumber: 1,
    title: 'Thiệp Cưới',
    textFields: {
      brideName: 'Thùy Trang',
      groomName: 'Minh Quân',
      greeting: 'Kính mời',
      message: 'Chung vui',
      footer: 'Cảm ơn',
    },
    sections: [],
    derivedAssetIds: [],
    includesSeating: false,
    updatedAt: '2026-10-09T00:00:00Z',
  };

  const mockGateway: AppInvitationGateway = {
    listDesigns: jest.fn().mockResolvedValue([initialDesign]),
    getDesign: jest.fn().mockResolvedValue(initialDesign),
    quickEditTextFields: jest.fn().mockResolvedValue({
      ...initialDesign,
      revisionNumber: 2,
      textFields: { ...initialDesign.textFields, brideName: 'Nguyễn Thùy Trang' },
    }),
    publishInvitation: jest.fn().mockResolvedValue({} as never),
    unpublishInvitation: jest.fn().mockResolvedValue(undefined),
    listPrintOrders: jest.fn().mockResolvedValue([]),
    approvePrintOrder: jest.fn().mockResolvedValue(undefined as never),
    approveReplacementProposal: jest.fn().mockResolvedValue(undefined as never),
    cancelApprovedPrintOrder: jest.fn().mockResolvedValue(undefined as never),
    getRestaurantCatalog: jest.fn().mockResolvedValue({ displayName: 'Nhà hàng Wedding Estate' }),
    uploadWeddingMedia: jest
      .fn()
      .mockResolvedValue({ mediaAssetId: 'm-1', previewPath: '/preview' }),
    getPublicInvitation: jest.fn().mockResolvedValue({} as never),
  };

  it('renders live preview with couple names and inputs', async () => {
    await render(
      <InvitationQuickEditScreen
        accessToken={token}
        bookingId={bookingId}
        gateway={mockGateway}
        initialDesign={initialDesign}
      />,
    );

    expect(await screen.findByText('Chỉnh Sửa Nhanh Thiệp Cưới')).toBeTruthy();
    expect(screen.getByText('THIỆP CƯỚI BÁO HỶ')).toBeTruthy();
    expect(screen.getByText('Minh Quân')).toBeTruthy();
    expect(screen.getByText('Thùy Trang')).toBeTruthy();
  });

  it('edits brideName and saves quick edit through gateway', async () => {
    const user = userEvent.setup();
    await render(
      <InvitationQuickEditScreen
        accessToken={token}
        bookingId={bookingId}
        gateway={mockGateway}
        initialDesign={initialDesign}
      />,
    );

    const brideInput = screen.getByLabelText('Tên cô dâu');
    await fireEvent.changeText(brideInput, 'Nguyễn Thùy Trang');

    const saveBtn = screen.getByLabelText('Lưu chỉnh sửa thiệp');
    await user.press(saveBtn);

    await waitFor(() => {
      expect(mockGateway.quickEditTextFields).toHaveBeenCalledWith(
        token,
        bookingId,
        'des-123',
        1,
        expect.objectContaining({
          brideName: 'Nguyễn Thùy Trang',
          groomName: 'Minh Quân',
        }),
      );
    });

    expect(await screen.findByText('Đã lưu chỉnh sửa thành công (Bản 2)!')).toBeTruthy();
  });

  it('displays error notice when saving without an initial design', async () => {
    const user = userEvent.setup();
    await render(
      <InvitationQuickEditScreen
        accessToken={token}
        bookingId={bookingId}
        gateway={mockGateway}
        initialDesign={null}
      />,
    );

    const saveBtn = screen.getByLabelText('Lưu chỉnh sửa thiệp');
    await user.press(saveBtn);

    expect(await screen.findByText('Chưa có bản thiết kế thiệp để chỉnh sửa.')).toBeTruthy();
  });

  it('displays error notice when gateway quickEditTextFields fails', async () => {
    const user = userEvent.setup();
    const failingGateway: AppInvitationGateway = {
      ...mockGateway,
      quickEditTextFields: jest.fn().mockRejectedValueOnce(new Error('Lỗi lưu thiệp từ máy chủ')),
    };

    await render(
      <InvitationQuickEditScreen
        accessToken={token}
        bookingId={bookingId}
        gateway={failingGateway}
        initialDesign={initialDesign}
      />,
    );

    const saveBtn = screen.getByLabelText('Lưu chỉnh sửa thiệp');
    await user.press(saveBtn);

    expect(await screen.findByText('Lỗi lưu thiệp từ máy chủ')).toBeTruthy();
  });

  it('renders initial print orders section when initialOrders is provided', async () => {
    const mockOrder = {
      orderId: 'ord-12345678',
      status: 'APPROVED' as const,
      revision: 1,
      bookingId,
      createdAt: '2026-10-01T00:00:00Z',
      updatedAt: '2026-10-01T00:00:00Z',
      receivableChargeId: null,
      currentCommercialRevision: null,
      lines: [],
      currentCommercialRevisionId: null,
      evidenceReference: null,
      handedOverAt: null,
      readyAt: null,
      pendingReplacementProposal: null,
    };

    await render(
      <InvitationQuickEditScreen
        accessToken={token}
        bookingId={bookingId}
        gateway={mockGateway}
        initialDesign={initialDesign}
        initialOrders={[mockOrder]}
      />,
    );

    expect(await screen.findByText('Tình Trạng Đơn In Ấn')).toBeTruthy();
    expect(screen.getByText('Đơn in #ord-1234')).toBeTruthy();
    expect(screen.getByText('Phiên bản: 1')).toBeTruthy();
    expect(screen.getByText('APPROVED')).toBeTruthy();
  });
});
