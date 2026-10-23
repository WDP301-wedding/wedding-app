import React from 'react';
import { act, fireEvent, render } from '@testing-library/react-native';
import { ToastHost } from './toast-host';
import { toast } from './store';

describe('ToastHost', () => {
  beforeEach(async () => {
    await act(async () => {
      toast.clear();
    });
  });

  it('renders null when there are no active toast notifications', async () => {
    const { queryByText } = await render(<ToastHost />);
    expect(queryByText('Chào mừng bạn')).toBeNull();
  });

  it('renders toast with box-none pointer events on mobile container and auto on the card', async () => {
    const { findByText, getByLabelText, queryByText } = await render(<ToastHost />);

    await act(async () => {
      toast.info('Chào mừng bạn');
    });

    const cardText = await findByText('Chào mừng bạn');
    expect(cardText).toBeDefined();

    // Verify card has pointerEvents="auto" so user can tap close or interact with toast
    let card: any = cardText.parent;
    while (card && card.props?.pointerEvents !== 'auto') {
      card = card.parent;
    }
    expect(card?.props?.pointerEvents).toBe('auto');

    // Verify outer container has pointerEvents="box-none" so user can tap through outside the toast
    let root = card?.parent;
    while (root && root.props?.pointerEvents !== 'box-none') {
      root = root.parent;
    }
    expect(root?.props?.pointerEvents).toBe('box-none');

    // Verify container does NOT have bottom: 0 (StyleSheet.absoluteFill was removed)
    const flatStyle = Object.assign(
      {},
      ...(Array.isArray(root?.props?.style) ? root.props.style : [root?.props?.style]),
    );
    expect(flatStyle.bottom).toBeUndefined();

    const closeBtn = getByLabelText('Đóng thông báo');
    await act(async () => {
      fireEvent.press(closeBtn);
    });

    expect(queryByText('Chào mừng bạn')).toBeNull();
  });
});
