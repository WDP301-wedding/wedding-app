import { fetch as expoFetch } from 'expo/fetch';
import { randomUUID } from 'expo-crypto';
import { Platform } from 'react-native';
import { readPublicEnv } from '@/lib/env';
import { ApiClientError } from '@/lib/api/client';
import { ApiRequest } from '@/lib/api/api-request';
type PdfFetch = (
  request: Request,
) => Promise<Pick<Response, 'ok' | 'status' | 'headers' | 'json' | 'arrayBuffer'>>;

export function requirePdfBytes(buffer: ArrayBuffer): Uint8Array {
  const bytes = new Uint8Array(buffer);
  if (![37, 80, 68, 70, 45].every((byte, index) => bytes[index] === byte))
    throw new Error('Máy chủ chưa trả về tệp PDF hợp lệ. Vui lòng thử lại.');
  return bytes;
}
export async function downloadContractPdf(
  token: string,
  bookingId: string,
  revisionId: string,
  readable = false,
  fetcher: PdfFetch = expoFetch,
): Promise<Uint8Array> {
  const base = readPublicEnv().EXPO_PUBLIC_API_BASE_URL.replace(/\/$/, '');
  const url = `${base}/bookings/${encodeURIComponent(bookingId)}/contracts/${encodeURIComponent(revisionId)}/pdf${readable ? '?layout=readable' : ''}`;
  const requestId = randomUUID();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 25000);
  try {
    const response = await fetcher(
      new ApiRequest(url, {
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/pdf',
          'x-request-id': requestId,
        },
        cache: 'no-store',
      }),
    );
    if (!response.ok) {
      const body = await response.json().catch(() => null);
      throw new ApiClientError({
        kind: 'api',
        code: typeof body?.error?.code === 'string' ? body.error.code : 'PDF_DOWNLOAD_FAILED',
        message: 'Chưa tải được PDF hợp đồng.',
        status: response.status,
        requestId: response.headers.get('x-request-id') ?? requestId,
      });
    }
    return requirePdfBytes(await response.arrayBuffer());
  } catch (error) {
    if (controller.signal.aborted)
      throw new ApiClientError({
        kind: 'timeout',
        code: 'REQUEST_TIMEOUT',
        message: 'Quá thời gian tải PDF. Hãy thử lại.',
        requestId,
        cause: error,
      });
    throw error;
  } finally {
    clearTimeout(timer);
  }
}
export async function openContractPdf(
  bytes: Uint8Array,
  revisionId: string,
  readable = false,
): Promise<void> {
  const name = `hop-dong-${revisionId.replace(/[^a-zA-Z0-9-]/g, '')}${readable ? '-de-doc' : ''}.pdf`;
  if (Platform.OS === 'web') {
    const blob = new Blob([new Uint8Array(bytes)], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = name;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } else {
    const { File, Paths } = await import('expo-file-system');
    const Sharing = await import('expo-sharing');
    const file = new File(Paths.cache, name);
    await file.write(bytes);
    if (!(await Sharing.isAvailableAsync()))
      throw new Error('Thiết bị chưa có trình mở hoặc chia sẻ PDF.');
    await Sharing.shareAsync(file.uri, {
      mimeType: 'application/pdf',
      UTI: 'com.adobe.pdf',
      dialogTitle: 'Mở hoặc lưu hợp đồng PDF',
    });
  }
}
