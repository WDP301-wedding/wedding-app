import React, { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { HyText as Text, HyInput, HyButton, HyAlert, HyCard, HyBadge } from '@/components/hy-ui';
import {
  createCatalogGateway,
  minimumPreferredDate,
  type ConsultationRequestBody,
} from '@/features/catalog/catalog-api';
import { useWeddingTheme, hy } from '@/theme';
import { randomUUID } from 'expo-crypto';

export type ConsultationPrefill = Readonly<{
  hallName?: string;
  menuName?: string;
  shift?: 'LUNCH' | 'DINNER';
  expectedGuests?: number;
}>;

export interface ConsultationScreenProps {
  readonly prefill?: ConsultationPrefill;
  readonly onBack?: () => void;
  readonly onExploreHalls?: () => void;
}

const catalogGateway = createCatalogGateway();

export function ConsultationScreen({
  prefill = {},
  onBack,
  onExploreHalls,
}: ConsultationScreenProps) {
  const { brand, colors } = useWeddingTheme();

  const [displayName, setDisplayName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [preferredDate, setPreferredDate] = useState(() => minimumPreferredDate());
  const [expectedGuests, setExpectedGuests] = useState(() =>
    prefill.expectedGuests ? String(prefill.expectedGuests) : '200',
  );
  const [shift, setShift] = useState<'LUNCH' | 'DINNER' | ''>(prefill.shift ?? 'DINNER');
  const [userNote, setUserNote] = useState('');

  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const minDate = minimumPreferredDate();

  const handleSubmit = async () => {
    if (pending) return;

    const trimmedName = displayName.trim().normalize('NFC');
    const trimmedPhone = phone.trim().replace(/\s+/g, '');
    const trimmedEmail = email.trim();
    const trimmedDate = preferredDate.trim();

    if (!trimmedName) {
      setError('Vui lòng nhập họ và tên của bạn.');
      return;
    }
    if (!trimmedPhone || !/^(0|\+84)[3|5|7|8|9][0-9]{8}$/.test(trimmedPhone)) {
      setError('Vui lòng nhập số điện thoại hợp lệ (10 chữ số).');
      return;
    }
    if (!trimmedEmail || !trimmedEmail.includes('@')) {
      setError('Vui lòng nhập địa chỉ email hợp lệ.');
      return;
    }
    if (trimmedDate && trimmedDate < minDate) {
      setError(`Ngày tổ chức dự kiến phải từ ngày ${minDate} trở đi (tối thiểu 2 ngày tới).`);
      return;
    }

    const guestsNum = expectedGuests.trim() ? Number(expectedGuests.trim()) : null;
    if (guestsNum !== null && (!Number.isSafeInteger(guestsNum) || guestsNum <= 0)) {
      setError('Số khách dự kiến phải là số nguyên dương.');
      return;
    }

    const fullMessageParts = [
      prefill.hallName ? `Sảnh quan tâm: ${prefill.hallName}` : '',
      prefill.menuName ? `Thực đơn quan tâm: ${prefill.menuName}` : '',
      shift ? `Ca mong muốn: ${shift === 'LUNCH' ? 'Ca trưa' : 'Ca tối'}` : '',
      userNote.trim() ? `Ghi chú thêm: ${userNote.trim()}` : '',
    ].filter(Boolean);

    const body: ConsultationRequestBody = {
      displayName: trimmedName,
      phone: trimmedPhone,
      email: trimmedEmail,
      preferredDate: trimmedDate || null,
      expectedGuests: guestsNum,
      message: fullMessageParts.join('\n\n') || 'Yêu cầu tư vấn đặt tiệc cưới từ ứng dụng di động.',
      submissionId: randomUUID(),
    };

    setPending(true);
    setError(null);
    try {
      await catalogGateway.submitConsultation(body);
      setSubmitted(true);
    } catch (caught: any) {
      setError(caught?.message || 'Chưa thể gửi yêu cầu tư vấn. Vui lòng kiểm tra kết nối.');
    } finally {
      setPending(false);
    }
  };

  if (submitted) {
    return (
      <ScrollView
        contentContainerStyle={{
          padding: 24,
          paddingTop: 48,
          alignItems: 'center',
          backgroundColor: colors.background,
          minHeight: '100%',
        }}
      >
        <View
          style={{
            width: 72,
            height: 72,
            borderRadius: 36,
            backgroundColor: '#F3E8EC',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 20,
          }}
        >
          <Text style={{ fontSize: 32, color: brand.primary }}>✓</Text>
        </View>

        <Text
          style={{
            fontSize: 22,
            fontWeight: '700',
            color: brand.display,
            textAlign: 'center',
            marginBottom: 12,
            lineHeight: 30,
          }}
        >
          Cảm ơn hai bạn đã mở lời!
        </Text>

        <Text
          style={{
            fontSize: 15,
            color: colors.secondaryLabel,
            textAlign: 'center',
            lineHeight: 22,
            marginBottom: 24,
          }}
        >
          Chuyên viên tiệc cưới Hỷ Yến đã tiếp nhận thông tin và sẽ liên hệ với bạn qua SĐT/Email
          trong thời gian sớm nhất. Hai bạn sẽ nhận được lời mời vào không gian tiệc cưới riêng khi
          hồ sơ được khởi tạo.
        </Text>

        <HyCard style={{ width: '100%', marginBottom: 24, gap: 8 }}>
          <Text style={{ fontSize: 13, color: hy.muted }}>Họ và tên:</Text>
          <Text style={{ fontSize: 15, fontWeight: '600' }}>{displayName}</Text>
          <Text style={{ fontSize: 13, color: hy.muted, marginTop: 4 }}>Liên hệ:</Text>
          <Text style={{ fontSize: 14 }}>
            {phone} · {email}
          </Text>
          {preferredDate ? (
            <>
              <Text style={{ fontSize: 13, color: hy.muted, marginTop: 4 }}>
                Ngày cưới dự kiến:
              </Text>
              <Text style={{ fontSize: 14, fontWeight: '500' }}>
                {preferredDate} {shift === 'LUNCH' ? '(Ca trưa)' : '(Ca tối)'}
              </Text>
            </>
          ) : null}
        </HyCard>

        <View style={{ width: '100%', marginBottom: 12 }}>
          <HyButton
            label="Khám phá các sảnh cưới"
            onPress={onExploreHalls ?? onBack ?? (() => setSubmitted(false))}
          />
        </View>
        <View style={{ width: '100%' }}>
          <HyButton
            label="Gửi yêu cầu tư vấn khác"
            variant="outline"
            onPress={() => {
              setSubmitted(false);
              setUserNote('');
            }}
          />
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{
        padding: 20,
        paddingTop: 24,
        paddingBottom: 48,
        backgroundColor: colors.background,
      }}
    >
      {/* Header bar */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 16,
        }}
      >
        <View>
          <Text style={{ fontSize: 13, color: brand.script, fontWeight: '600' }}>
            HỶ YẾN WEDDING
          </Text>
          <Text style={{ fontSize: 24, fontWeight: '700', color: brand.display, lineHeight: 32 }}>
            Đăng ký tư vấn tiệc cưới
          </Text>
        </View>
        {onBack ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Quay lại"
            onPress={onBack}
            style={{ padding: 8 }}
          >
            <Text style={{ fontSize: 15, color: brand.primary, fontWeight: '600' }}>Đóng</Text>
          </Pressable>
        ) : null}
      </View>

      <Text
        style={{ fontSize: 14, color: colors.secondaryLabel, lineHeight: 20, marginBottom: 20 }}
      >
        Chia sẻ mong muốn của hai bạn để Hỷ Yến đồng hành, chuẩn bị chu toàn cho ngày trọng đại.
      </Text>

      {/* Choice summary chip banner if prefilled */}
      {prefill.hallName || prefill.menuName ? (
        <HyCard
          style={{
            marginBottom: 20,
            backgroundColor: '#FFF8F1',
            borderColor: brand.gold,
            gap: 6,
          }}
        >
          <Text style={{ fontSize: 12, fontWeight: '600', color: brand.script }}>
            LỰA CHỌN TỪ CÔNG CỤ TÍNH GIÁ
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
            {prefill.hallName ? <HyBadge label={prefill.hallName} status="done" /> : null}
            {prefill.menuName ? <HyBadge label={prefill.menuName} status="info" /> : null}
            {prefill.expectedGuests ? (
              <HyBadge label={`~${prefill.expectedGuests} khách`} status="neutral" />
            ) : null}
          </View>
        </HyCard>
      ) : null}

      {/* Form Fields */}
      <View style={{ gap: 16 }}>
        <View>
          <Text style={{ fontSize: 14, fontWeight: '600', marginBottom: 6, color: colors.label }}>
            Họ và tên của bạn *
          </Text>
          <HyInput
            accessibilityLabel="Họ và tên"
            placeholder="Ví dụ: Nguyễn Văn A & Trần Thị B"
            value={displayName}
            onChangeText={setDisplayName}
            editable={!pending}
          />
        </View>

        <View>
          <Text style={{ fontSize: 14, fontWeight: '600', marginBottom: 6, color: colors.label }}>
            Số điện thoại liên hệ *
          </Text>
          <HyInput
            accessibilityLabel="Số điện thoại"
            placeholder="0912345678"
            keyboardType="phone-pad"
            value={phone}
            onChangeText={setPhone}
            editable={!pending}
          />
        </View>

        <View>
          <Text style={{ fontSize: 14, fontWeight: '600', marginBottom: 6, color: colors.label }}>
            Địa chỉ email nhận báo giá *
          </Text>
          <HyInput
            accessibilityLabel="Email"
            placeholder="email@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
            editable={!pending}
          />
        </View>

        <View style={{ flexDirection: 'row', gap: 12 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 14, fontWeight: '600', marginBottom: 6, color: colors.label }}>
              Ngày cưới dự kiến
            </Text>
            <HyInput
              accessibilityLabel="Ngày cưới dự kiến"
              placeholder={minDate}
              value={preferredDate}
              onChangeText={setPreferredDate}
              editable={!pending}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 14, fontWeight: '600', marginBottom: 6, color: colors.label }}>
              Số khách dự kiến
            </Text>
            <HyInput
              accessibilityLabel="Số khách"
              placeholder="200"
              keyboardType="number-pad"
              value={expectedGuests}
              onChangeText={setExpectedGuests}
              editable={!pending}
            />
          </View>
        </View>

        {/* Shift selector */}
        <View>
          <Text style={{ fontSize: 14, fontWeight: '600', marginBottom: 8, color: colors.label }}>
            Ca tổ chức mong muốn
          </Text>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Ca trưa"
              onPress={() => setShift('LUNCH')}
              style={{
                flex: 1,
                paddingVertical: 12,
                borderRadius: 12,
                borderWidth: 1.5,
                borderColor: shift === 'LUNCH' ? brand.primary : hy.outline,
                backgroundColor: shift === 'LUNCH' ? '#FBF0F4' : hy.surface,
                alignItems: 'center',
              }}
            >
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: '600',
                  color: shift === 'LUNCH' ? brand.primary : colors.label,
                }}
              >
                Ca trưa (11:00 - 14:00)
              </Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Ca tối"
              onPress={() => setShift('DINNER')}
              style={{
                flex: 1,
                paddingVertical: 12,
                borderRadius: 12,
                borderWidth: 1.5,
                borderColor: shift === 'DINNER' ? brand.primary : hy.outline,
                backgroundColor: shift === 'DINNER' ? '#FBF0F4' : hy.surface,
                alignItems: 'center',
              }}
            >
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: '600',
                  color: shift === 'DINNER' ? brand.primary : colors.label,
                }}
              >
                Ca tối (17:30 - 21:30)
              </Text>
            </Pressable>
          </View>
        </View>

        <View>
          <Text style={{ fontSize: 14, fontWeight: '600', marginBottom: 6, color: colors.label }}>
            Lời nhắn / Mong muốn đặc biệt
          </Text>
          <HyInput
            accessibilityLabel="Lời nhắn"
            placeholder="Bạn có mong muốn gì về phong cách trang trí, nghi thức cưới hay thực đơn?"
            value={userNote}
            onChangeText={setUserNote}
            multiline
            style={{ minHeight: 90, textAlignVertical: 'top', paddingTop: 12 }}
            editable={!pending}
          />
        </View>

        {error ? (
          <HyAlert
            variant="error"
            message={error}
            onDismiss={() => setError(null)}
            style={{ marginVertical: 4 }}
          />
        ) : null}

        <View style={{ marginTop: 8 }}>
          <HyButton
            label={pending ? 'Đang gửi yêu cầu...' : 'Gửi yêu cầu tư vấn'}
            disabled={pending}
            busy={pending}
            onPress={() => void handleSubmit()}
          />
        </View>
      </View>
    </ScrollView>
  );
}
