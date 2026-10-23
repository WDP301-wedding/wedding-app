import React from 'react';
import { act, fireEvent, render } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { confirmModal, confirmModalStore } from './store';
import { HyConfirmModal } from '@/components/hy-confirm-modal';
import { ConfirmHost } from '@/components/hy-confirm-host';
import '@/lib/alert';

describe('HyConfirmModal and confirmModalStore', () => {
  beforeEach(() => {
    confirmModalStore.dismiss();
  });

  it('manages confirmation requests in confirmModalStore', () => {
    expect(confirmModalStore.getSnapshot()).toBeNull();

    const onConfirm = jest.fn();
    const onCancel = jest.fn();

    confirmModal.show({
      title: 'Đăng xuất',
      message: 'Bạn muốn đăng xuất trên thiết bị này?',
      confirmText: 'Đăng xuất',
      cancelText: 'Ở lại',
      variant: 'destructive',
      onConfirm,
      onCancel,
    });

    const snapshot = confirmModalStore.getSnapshot();
    expect(snapshot).not.toBeNull();
    expect(snapshot?.title).toBe('Đăng xuất');
    expect(snapshot?.message).toBe('Bạn muốn đăng xuất trên thiết bị này?');
    expect(snapshot?.variant).toBe('destructive');
    expect(snapshot?.buttons).toHaveLength(2);

    // Press cancel button
    snapshot?.buttons[0]?.onPress?.();
    expect(onCancel).toHaveBeenCalled();
    expect(confirmModalStore.getSnapshot()).toBeNull();
  });

  it('provides a promise-based confirmModal.confirm API', async () => {
    const promise = confirmModal.confirm({
      title: 'Xóa dữ liệu',
      message: 'Bạn có chắc chắn muốn xóa?',
      confirmText: 'Xóa',
      cancelText: 'Hủy',
      destructive: true,
    });

    const snapshot = confirmModalStore.getSnapshot();
    expect(snapshot?.title).toBe('Xóa dữ liệu');
    expect(snapshot?.variant).toBe('destructive');

    // Simulate clicking confirm (button index 1)
    snapshot?.buttons[1]?.onPress?.();

    const result = await promise;
    expect(result).toBe(true);
    expect(confirmModalStore.getSnapshot()).toBeNull();
  });

  it('renders HyConfirmModal with custom styling and handles button clicks', async () => {
    const onConfirm = jest.fn();
    const onCancel = jest.fn();

    const { getAllByText, getByText, getAllByRole, getByRole } = await render(
      <HyConfirmModal
        visible
        title="Đăng xuất"
        message="Bạn muốn đăng xuất trên thiết bị này?"
        confirmText="Đăng xuất"
        cancelText="Ở lại"
        variant="destructive"
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    );

    expect(getAllByText('Đăng xuất').length).toBeGreaterThanOrEqual(1);
    expect(getByText('Bạn muốn đăng xuất trên thiết bị này?')).toBeDefined();
    expect(getByRole('button', { name: 'Ở lại' })).toBeDefined();

    // Find and press confirm button
    const buttons = getAllByRole('button');
    const confirmButton = buttons.find((btn) => btn.props.accessibilityLabel === 'Đăng xuất');
    expect(confirmButton).toBeDefined();
    fireEvent.press(confirmButton!);
    expect(onConfirm).toHaveBeenCalled();
  });

  it('renders ConfirmHost when store has an active request', async () => {
    const { findByText, findByRole, queryByRole } = await render(<ConfirmHost />);
    expect(queryByRole('alert')).toBeNull();

    const onConfirm = jest.fn();
    await act(async () => {
      confirmModal.show({
        title: 'Thu hồi phiên',
        message: 'Bạn có chắc chắn muốn thu hồi phiên đăng nhập?',
        confirmText: 'Thu hồi',
        cancelText: 'Hủy',
        onConfirm,
      });
    });

    expect(await findByText('Thu hồi phiên')).toBeDefined();
    const confirmBtn = await findByRole('button', { name: 'Thu hồi' });
    fireEvent.press(confirmBtn);

    expect(onConfirm).toHaveBeenCalled();
    expect(confirmModalStore.getSnapshot()).toBeNull();
  });

  it('routes Alert.alert calls to confirmModalStore', () => {
    const onLogout = jest.fn();
    Alert.alert('Đăng xuất', 'Bạn muốn đăng xuất trên thiết bị này?', [
      { text: 'Ở lại', style: 'cancel' },
      { text: 'Đăng xuất', style: 'destructive', onPress: onLogout },
    ]);

    const snapshot = confirmModalStore.getSnapshot();
    expect(snapshot).not.toBeNull();
    expect(snapshot?.title).toBe('Đăng xuất');
    expect(snapshot?.variant).toBe('destructive');
    expect(snapshot?.buttons).toHaveLength(2);

    snapshot?.buttons[1]?.onPress?.();
    expect(onLogout).toHaveBeenCalled();
  });
});
