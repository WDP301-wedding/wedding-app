import { downloadContractPdf, openContractPdf, requirePdfBytes } from './contract-files';
import { File } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { waitFor } from '@testing-library/react-native';

jest.mock('expo-file-system', () => ({
  File: jest
    .fn()
    .mockImplementation(() => ({ uri: 'file:///cache/contract.pdf', write: jest.fn() })),
  Paths: { cache: 'file:///cache' },
}));
jest.mock('expo-sharing', () => ({
  isAvailableAsync: jest.fn().mockResolvedValue(true),
  shareAsync: jest.fn().mockResolvedValue(undefined),
}));

it('waits for SDK 58 asynchronous file writing before sharing a native PDF', async () => {
  let finishWrite!: () => void;
  const file = new File('file:///cache/contract.pdf');
  const write = jest.spyOn(file, 'write').mockImplementationOnce(
    () =>
      new Promise<void>((resolve) => {
        finishWrite = resolve;
      }),
  );
  jest.mocked(File).mockReturnValueOnce(file);
  const opening = openContractPdf(new Uint8Array([37, 80, 68, 70, 45]), 'revision');
  // Dynamic imports are asynchronous; wait until writing has actually started.
  await waitFor(() => expect(write).toHaveBeenCalled());
  expect(Sharing.shareAsync).not.toHaveBeenCalled();
  finishWrite();
  await opening;
  expect(Sharing.shareAsync).toHaveBeenCalledWith(
    'file:///cache/contract.pdf',
    expect.objectContaining({ mimeType: 'application/pdf' }),
  );
});

it('rejects successful JSON/HTML and truncated responses before they can be saved as PDF', () => {
  for (const input of ['{"data":{}}', '<html>error</html>', '%PDF'])
    expect(() => requirePdfBytes(new TextEncoder().encode(input).buffer)).toThrow('PDF hợp lệ');
  expect(requirePdfBytes(new TextEncoder().encode('%PDF-1.7\ncontent').buffer)[0]).toBe(37);
});
it('downloads only the requested revision with authenticated no-store headers and explicit readable layout', async () => {
  const requests: Request[] = [];
  const fetcher: NonNullable<Parameters<typeof downloadContractPdf>[4]> = async (request) => {
    requests.push(request as Request);
    return new Response('%PDF-1.7\nfixture', { headers: { 'Content-Type': 'application/pdf' } });
  };
  await downloadContractPdf('secret-token', 'booking', 'revision', true, fetcher);
  const request = requests[0]!;
  expect(new URL(request.url).pathname).toMatch(/\/bookings\/booking\/contracts\/revision\/pdf$/);
  expect(new URL(request.url).search).toBe('?layout=readable');
  expect(request.headers.get('Authorization')).toBe('Bearer secret-token');
  expect(request.headers.get('Accept')).toBe('application/pdf');
  expect(request.headers.get('x-request-id')).toBeTruthy();
  expect(request.headers.get('Cache-Control')).toBe('no-store, no-cache');
});
