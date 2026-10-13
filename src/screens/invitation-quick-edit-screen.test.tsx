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
});
