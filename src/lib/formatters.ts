let currencyFormatter: Intl.NumberFormat | undefined;
let dateTimeFormatter: Intl.DateTimeFormat | undefined;
let dateFormatter: Intl.DateTimeFormat | undefined;

export function money(value: number): string {
  currencyFormatter ??= new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' });
  return currencyFormatter.format(value);
}

export function formatVnd(value: number): string {
  return money(value);
}

export function formatDateTime(value: string | number | Date): string {
  dateTimeFormatter ??= new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'short',
    timeStyle: 'short',
  });
  return dateTimeFormatter.format(new Date(value));
}

export function formatDate(value: string | number | Date): string {
  dateFormatter ??= new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short' });
  return dateFormatter.format(new Date(value));
}
