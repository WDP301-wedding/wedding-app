import { Button, Host } from '@expo/ui';
import { Text, TextInput, View } from 'react-native';
import { ApiClientError } from '@/lib/api/client';
import type {
  AttemptView,
  BillingView,
  CheckoutView,
} from '@/features/payments-billing/billing-api';
import { type, useWeddingTheme } from '@/theme';
import { billingStyles as styles } from './billing.styles';

export const money = (value: number) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);

export const labels: Record<keyof BillingView['totals'], string> = {
  acceptedChargesVnd: 'Tổng tiền phải thanh toán',
  paidVnd: 'Đã thanh toán',
  refundedVnd: 'Đã hoàn tiền',
  netPaidVnd: 'Đã thanh toán sau hoàn tiền',
  outstandingVnd: 'Còn phải thanh toán',
  creditVnd: 'Tiền thanh toán thừa',
};

export const states: Record<string, string> = {
  CREATED: 'Đã tạo · chờ thanh toán',
  PENDING: 'Đang chờ xác minh',
  SUCCEEDED: 'Đã xác minh nhận tiền',
  FAILED: 'Thanh toán không thành công',
  UNKNOWN: 'Chưa rõ kết quả · đang kiểm tra',
};

export const kinds: Record<string, string> = {
  CHARGE: 'Khoản phải thu',
  PAYMENT: 'Thanh toán',
  REFUND: 'Hoàn tiền',
  CREDIT_ADJUSTMENT: 'Điều chỉnh giảm',
};

export function denied(error: unknown): boolean {
  return error instanceof ApiClientError && [401, 403, 404].includes(error.status ?? 0);
}

export function unknown(error: unknown): boolean {
  return (
    !(error instanceof ApiClientError) ||
    error.kind !== 'api' ||
    (error.status ?? 500) >= 500 ||
    error.status === 429 ||
    error.code === 'REQUEST_IN_PROGRESS'
  );
}

export function completed(attempt: AttemptView): boolean {
  return (
    attempt.status === 'FAILED' ||
    (attempt.status === 'SUCCEEDED' && attempt.applicationStatus === 'SUCCEEDED')
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

export function Action({
  label,
  disabled = false,
  onPress,
  secondary = false,
}: Readonly<{ label: string; disabled?: boolean; onPress: () => void; secondary?: boolean }>) {
  const { brand } = useWeddingTheme();
  return (
    <Host matchContents seedColor={brand.primary}>
      <Button
        label={label}
        disabled={disabled}
        onPress={onPress}
        variant={secondary ? 'outlined' : 'filled'}
        style={{ paddingVertical: 12, borderRadius: 4 }}
      />
    </Host>
  );
}

export function BillingTotalsSection({
  view,
}: Readonly<{
  view: BillingView;
}>) {
  const { brand, colors } = useWeddingTheme();
  return (
    <View style={[styles.totals, { backgroundColor: brand.powder, borderColor: brand.gold }]}>
      {Object.entries(view.totals).map(([key, value]) => (
        <View key={key}>
          <Text style={[type.subhead, { color: colors.secondaryLabel }]}>
            {labels[key as keyof typeof labels]}
          </Text>
          <Text selectable style={[styles.amount, { color: colors.label }]}>
            {money(value)}
          </Text>
        </View>
      ))}
    </View>
  );
}

export function BillingAttemptSection({
  attemptId,
  setAttemptId,
  attempt,
  pending,
  intent,
  checkout,
  onCheckStatus,
}: Readonly<{
  attemptId: string;
  setAttemptId: (val: string) => void;
  attempt: AttemptView | null;
  pending: boolean;
  intent: unknown;
  checkout: unknown;
  onCheckStatus: () => void;
}>) {
  const { colors } = useWeddingTheme();
  return (
    <View style={[styles.section, { borderColor: colors.separator }]}>
      <Text style={[styles.title, { color: colors.label }]}>Trạng thái thanh toán</Text>
      <Text style={[type.subhead, { color: colors.label }]}>Mã giao dịch thanh toán</Text>
      <TextInput
        accessibilityLabel="Mã giao dịch thanh toán"
        autoCapitalize="none"
        autoCorrect={false}
        value={attemptId}
        onChangeText={setAttemptId}
        editable={!pending && intent === null && checkout === null}
        style={[styles.input, { borderColor: colors.separator, color: colors.label }]}
      />
      <Action
        label="Kiểm tra trạng thái"
        disabled={pending || intent !== null || !attemptId.trim()}
        onPress={onCheckStatus}
      />
      {attempt !== null && (
        <View accessibilityLiveRegion="polite">
          <Text style={[styles.title, { color: colors.label }]}>{states[attempt.status]}</Text>
          <Text selectable style={[type.body, { color: colors.label }]}>
            {money(attempt.amountVnd)} ·{' '}
            {attempt.purpose === 'DEPOSIT' ? 'Đặt cọc' : 'Thanh toán còn lại'}
          </Text>
          {attempt.status === 'SUCCEEDED' ? (
            <Text style={[type.body, { color: colors.label }]}>
              {attempt.applicationStatus === 'SUCCEEDED'
                ? 'Đã hoàn tất cập nhật hồ sơ.'
                : 'Tiền đã được xác minh; hồ sơ đang chờ cập nhật.'}
            </Text>
          ) : (
            attempt.status !== 'FAILED' && (
              <Text style={[type.body, { color: colors.label }]}>
                Chờ xác minh kết quả, không tạo giao dịch khác.
              </Text>
            )
          )}
        </View>
      )}
    </View>
  );
}

export function BillingHistorySection({
  view,
  cursors,
  pending,
  onPageBack,
  onPageForward,
}: Readonly<{
  view: BillingView;
  cursors: (string | null)[];
  pending: boolean;
  onPageBack: () => void;
  onPageForward: () => void;
}>) {
  const { colors } = useWeddingTheme();
  return (
    <View style={[styles.section, { borderColor: colors.separator }]}>
      <Text style={[styles.title, { color: colors.label }]}>Lịch sử giao dịch</Text>
      {view.history.length === 0 ? (
        <Text style={[type.body, { color: colors.label }]}>Chưa có giao dịch</Text>
      ) : (
        view.history.map((entry) => (
          <View key={entry.ledgerEntryId} style={[styles.row, { borderColor: colors.separator }]}>
            <Text style={[type.headline, { color: colors.label }]}>
              {kinds[entry.kind]} · {money(entry.amountVnd)}
            </Text>
            <Text style={[type.subhead, { color: colors.secondaryLabel }]}>
              {new Date(entry.occurredAt).toLocaleString('vi-VN')}
            </Text>
            <Text selectable style={[type.caption, { color: colors.secondaryLabel }]}>
              {entry.ledgerEntryId}
            </Text>
          </View>
        ))
      )}
      <Text style={[type.caption, { color: colors.secondaryLabel }]}>Trang {cursors.length}</Text>
      <Action
        label="Trang lịch sử trước"
        secondary
        disabled={pending || cursors.length <= 1}
        onPress={onPageBack}
      />
      <Action
        label="Trang lịch sử tiếp theo"
        secondary
        disabled={pending || view.nextCursor === null}
        onPress={onPageForward}
      />
    </View>
  );
}

export function BillingIntentSection({
  intent,
  pending,
  retry,
  onStart,
  onCancel,
}: Readonly<{
  intent: { revision: number; amountVnd: number | null };
  pending: boolean;
  retry: boolean;
  onStart: () => void;
  onCancel: () => void;
}>) {
  const { brand, colors } = useWeddingTheme();
  return (
    <View style={[styles.notice, { borderColor: brand.gold }]}>
      <Text style={[styles.title, { color: colors.label }]}>Kiểm tra khoản còn lại</Text>
      <Text selectable style={[styles.amount, { color: colors.label }]}>
        {intent.amountVnd === null
          ? 'Khôi phục yêu cầu trước; kiểm tra số tiền qua trạng thái đã xác minh.'
          : money(intent.amountVnd)}
      </Text>
      <Text style={[type.body, { color: colors.label }]}>
        Máy chủ kiểm tra lại toàn bộ số dư trước khi tạo giao dịch.
      </Text>
      <Action
        label={retry ? 'Thử lại cùng yêu cầu' : 'Xác nhận mở VNPay'}
        disabled={pending}
        onPress={onStart}
      />
      <Action
        label="Quay lại"
        secondary
        disabled={pending || retry}
        onPress={onCancel}
      />
    </View>
  );
}

export function BillingCheckoutSection({
  checkout,
  attempt,
  pending,
  onContinue,
}: Readonly<{
  checkout: CheckoutView;
  attempt: AttemptView | null;
  pending: boolean;
  onContinue: () => void;
}>) {
  const { brand, colors } = useWeddingTheme();
  const status = attempt?.status ?? checkout.status;
  return (
    <View style={[styles.notice, { borderColor: brand.gold }]}>
      <Text style={[styles.title, { color: colors.label }]}>
        Đường dẫn thanh toán đã được tạo
      </Text>
      <Text selectable style={[type.body, { color: colors.label }]}>
        {checkout.paymentAttemptId}
      </Text>
      <Text style={[type.body, { color: colors.secondaryLabel }]}>
        Hết hạn: {new Date(checkout.expiresAt).toLocaleString('vi-VN')}. Hết hạn không chứng
        minh thất bại.
      </Text>
      {(status === 'CREATED' || status === 'PENDING') && (
        <Action
          label="Tiếp tục trên VNPay"
          disabled={pending}
          onPress={onContinue}
        />
      )}
    </View>
  );
}
