import { ApiClientError } from './client';

function denied(error: unknown): boolean {
  return error instanceof ApiClientError && [401, 403, 404].includes(error.status ?? 0);
}

function unknown(error: unknown): boolean {
  return (
    !(error instanceof ApiClientError) ||
    error.kind !== 'api' ||
    (error.status ?? 500) >= 500 ||
    error.status === 429 ||
    error.code === 'REQUEST_IN_PROGRESS'
  );
}

export function message(error: unknown): string {
  if (denied(error))
    return 'Phiên đăng nhập hoặc quyền xem hồ sơ không còn hợp lệ. Đăng nhập và kiểm tra quyền truy cập.';
  if (error instanceof ApiClientError && error.code === 'STALE_BILLING_REVISION')
    return 'Số dư đã thay đổi. Làm mới hồ sơ và kiểm tra lại trước khi thanh toán.';
  return unknown(error)
    ? 'Chưa rõ kết quả. Giữ nguyên yêu cầu để thử lại và kiểm tra kết quả.'
    : 'Yêu cầu bị từ chối. Kiểm tra số dư và trạng thái trước khi tiếp tục.';
}
