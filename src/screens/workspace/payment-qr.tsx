import { useRef, useState } from 'react';
import { Platform, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { File, Paths } from 'expo-file-system';
import { HyText as Text } from '@/components/hy-ui';
import { checkedCheckoutUrl } from '@/features/couple-workspace/policies';
import { hy } from '@/theme';
import { Action, Notice, s } from './workspace-common';

export function PaymentQr({
  checkoutUrl,
  expiresAt,
  now,
}: {
  checkoutUrl: string;
  expiresAt: string;
  now: number;
}) {
  const svg = useRef<{ toDataURL: (callback: (data: string) => void) => void } | null>(null);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  let url: string;
  try {
    url = checkedCheckoutUrl(checkoutUrl);
  } catch {
    return (
      <Notice error>Đường dẫn thanh toán không hợp lệ. Hãy kiểm tra trạng thái giao dịch.</Notice>
    );
  }
  const save = async () => {
    if (saving || !svg.current || Date.now() >= Date.parse(expiresAt)) return;
    setSaving(true);
    setFeedback(null);
    let file: File | undefined;
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('Không tạo được ảnh QR.')), 5000);
        try {
          svg.current!.toDataURL((value) => {
            clearTimeout(timer);
            resolve(value.replace(/^data:image\/png;base64,/, ''));
          });
        } catch (error) {
          clearTimeout(timer);
          reject(error);
        }
      });
      if (Date.now() >= Date.parse(expiresAt)) throw new Error('Mã QR đã hết hạn.');
      const name = `vnpay-qr-${Date.now()}.png`;
      if (Platform.OS === 'web') {
        const link = document.createElement('a');
        link.download = name;
        link.href = `data:image/png;base64,${base64}`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        setFeedback('Đã tải mã QR.');
      } else {
        const { Asset, requestPermissionsAsync } = await import('expo-media-library');
        const permission = await requestPermissionsAsync(true, ['photo']);
        if (!permission.granted)
          throw new Error('Hãy cho phép Hỷ Yến lưu ảnh trong cài đặt thiết bị.');
        file = new File(Paths.cache, name);
        await file.write(base64, { encoding: 'base64' });
        await Asset.create(file.uri);
        setFeedback('Đã lưu mã QR vào thư viện ảnh.');
      }
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'Không lưu được mã QR. Hãy thử lại.');
    } finally {
      if (file?.exists) file.delete();
      setSaving(false);
    }
  };
  return (
    <View style={{ alignItems: 'center', gap: 12 }}>
      <Text style={s.heading}>Quét mã để thanh toán</Text>
      {failed ? (
        <Notice error>Không hiển thị được mã QR. Hãy kiểm tra trạng thái giao dịch.</Notice>
      ) : (
        <View
          accessible
          accessibilityLabel="Mã QR mở trang thanh toán VNPay"
          style={{ padding: 20, backgroundColor: hy.surface }}
        >
          <QRCode
            value={url}
            size={200}
            quietZone={20}
            backgroundColor={hy.surface}
            color={hy.ink}
            getRef={(ref) => {
              svg.current = ref;
            }}
            onError={() => setFailed(true)}
          />
        </View>
      )}
      <Action
        label={saving ? 'Đang lưu…' : 'Lưu mã QR'}
        onPress={() => void save()}
        disabled={saving || failed || now >= Date.parse(expiresAt)}
        secondary
      />
      {feedback && <Notice>{feedback}</Notice>}
    </View>
  );
}
