import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Text as MockText } from 'react-native';
import { Asset } from 'expo-media-library';
import { PaymentQr } from './payment-qr';

const mockWrite = jest.fn();
const mockDelete = jest.fn();
jest.mock('expo-file-system', () => ({
  File: jest.fn().mockImplementation(() => ({
    uri: 'file:///cache/qr.png',
    exists: true,
    write: mockWrite,
    delete: mockDelete,
  })),
  Paths: { cache: 'file:///cache' },
}));
jest.mock('expo-media-library', () => ({
  requestPermissionsAsync: jest.fn().mockResolvedValue({ granted: true }),
  Asset: { create: jest.fn().mockResolvedValue({}) },
}));
jest.mock('react-native-qrcode-svg', () => ({
  __esModule: true,
  default: ({
    getRef,
  }: {
    getRef: (ref: { toDataURL: (callback: (value: string) => void) => void }) => void;
  }) => {
    getRef({ toDataURL: (callback) => callback('c3ludGhldGljLXFy') });
    return <MockText>Ảnh QR thử</MockText>;
  },
}));

afterEach(async () => {
  await cleanup();
  jest.clearAllMocks();
});
const props = {
  checkoutUrl: 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html',
  expiresAt: '2099-01-01T00:00:00Z',
  now: Date.now(),
};

it('waits for asynchronous PNG writing before adding it to the native photo library', async () => {
  let finishWrite!: () => void;
  mockWrite.mockImplementationOnce(
    () =>
      new Promise<void>((resolve) => {
        finishWrite = resolve;
      }),
  );
  await render(<PaymentQr {...props} />);
  await fireEvent.press(screen.getByRole('button', { name: 'Lưu mã QR' }));
  await waitFor(() => expect(mockWrite).toHaveBeenCalled());
  expect(Asset.create).not.toHaveBeenCalled();
  expect(screen.getByRole('button', { name: 'Đang lưu…' })).toBeDisabled();
  finishWrite();
  expect(await screen.findByText('Đã lưu mã QR vào thư viện ảnh.')).toBeOnTheScreen();
  expect(Asset.create).toHaveBeenCalledWith('file:///cache/qr.png');
  expect(mockDelete).toHaveBeenCalledTimes(1);
});

it('reports an asynchronous write failure without attempting to save an incomplete PNG', async () => {
  mockWrite.mockRejectedValueOnce(new Error('Không ghi được ảnh QR.'));
  await render(<PaymentQr {...props} />);
  await fireEvent.press(screen.getByRole('button', { name: 'Lưu mã QR' }));
  expect(await screen.findByText('Không ghi được ảnh QR.')).toBeOnTheScreen();
  expect(Asset.create).not.toHaveBeenCalled();
  expect(screen.getByRole('button', { name: 'Lưu mã QR' })).toBeEnabled();
});
