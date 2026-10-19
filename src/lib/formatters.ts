export function money(value: number): string {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
}

export function formatVnd(value: number): string {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
}

export function formatDateTime(value: string | number | Date): string {
  return new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' }).format(
    new Date(value),
  );
}

export function formatDate(value: string | number | Date): string {
  return new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short' }).format(new Date(value));
}
