import * as ImagePicker from 'expo-image-picker';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  CircleHelpIcon,
  ClockIcon,
  FileTextIcon,
  ImageIcon,
  LockIcon,
  StatusTag,
  UsersIcon,
} from '@/components/v0-primitives';
import {
  createAppInvitationGateway,
  type AppPrintOrderView,
} from '@/features/invitation-studio/app-invitation-api';
import { ApiClientError } from '@/lib/api/client';
import { useWeddingTheme } from '@/theme';
import {
  RestoredInvoicePanel,
  RestoredTimelinePanel,
  RestoredCommercialPanel,
  RestoredGuestPanel,
  RestoredPrintPanel,
} from '../restored-flow-controls';
import { saveOrShareDownloadedFile } from '@/lib/save-downloaded-file';
import type { V0CommonProps } from '../v0-types';
import { styles } from './subflows.styles';
import {
  money,
  coupleBilling,
  printStatusMeta,
  type CommercialContractView,
  type CommercialAppendixView,
  type IncidentalExpensesView,
  type CommercialInvoiceView,
  type GuestGroupView,
  type NamedGuestView,
} from './subflows-common';

export function V0MediaSubflow({
  activeBooking,
  facts,
  invitationGateway,
  onNavigate,
  session,
}: V0CommonProps) {
  const { tokens } = useWeddingTheme();
  const gateway = invitationGateway ?? createAppInvitationGateway();

  const [uploading, setUploading] = useState(false);
  const [altText, setAltText] = useState('');
  const [uploadedAssets, setUploadedAssets] = useState<
    readonly { assetId: string; previewPath: string; name: string; altText: string }[]
  >([]);
  const [currentTime] = useState(() => Date.now());
  const activeUploadIntentRef = useRef<string | null>(null);

  // Dynamic cutoff check against event date and shift start time
  const shiftStartTime = activeBooking?.shift?.startTime ?? '11:00';
  const eventDateTime = facts.eventDate
    ? new Date(`${facts.eventDate}T${shiftStartTime}:00+07:00`)
    : new Date();
  const cutoffTime = new Date(eventDateTime.getTime() - 72 * 60 * 60 * 1000);
  const isCutoffPassed = currentTime > cutoffTime.getTime();
  const cutoffFormatted = cutoffTime.toLocaleString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  const handlePickAndUpload = async () => {
    if (isCutoffPassed) {
      Alert.alert(
        'Đã quá thời hạn cutoff',
        `Thời hạn tải ảnh đã kết thúc vào ${cutoffFormatted} (72 giờ trước giờ bắt đầu tiệc cưới). Kho ảnh đã được khóa để nhà hàng chuẩn bị trình chiếu.`,
      );
      return;
    }
    if (!session || !activeBooking?.bookingId || uploading) return;

    const trimmedAlt = altText.trim().normalize('NFC');
    if (!trimmedAlt) {
      Alert.alert(
        'Yêu cầu mô tả ảnh',
        'Vui lòng nhập mô tả ảnh (alt text) từ 1 đến 250 ký tự trước khi chọn tệp ảnh để tải lên.',
      );
      return;
    }
    if (trimmedAlt.length > 250) {
      Alert.alert('Mô tả quá dài', 'Mô tả ảnh tối đa 250 ký tự.');
      return;
    }

    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert(
          'Quyền truy cập thư viện ảnh',
          'Ứng dụng cần quyền truy cập thư viện ảnh để hai bạn chọn ảnh trình chiếu trong lễ cưới.',
        );
        return;
      }

      const pickerResult = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 1,
      });

      if (pickerResult.canceled || !pickerResult.assets || pickerResult.assets.length === 0) {
        return;
      }

      const pickedAsset = pickerResult.assets[0];
      if (!pickedAsset || !pickedAsset.uri) return;

      // 25 MiB maximum limit check
      const maxBytes = 25 * 1024 * 1024;
      if (pickedAsset.fileSize && pickedAsset.fileSize > maxBytes) {
        Alert.alert(
          'Tệp quá lớn',
          `Dung lượng ảnh là ${(pickedAsset.fileSize / (1024 * 1024)).toFixed(1)} MiB, vượt quá giới hạn tối đa 25 MiB mỗi tệp ảnh.`,
        );
        return;
      }

      // Check allowed MIME types
      const mime = pickedAsset.mimeType ?? 'image/jpeg';
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(mime)) {
        Alert.alert('Định dạng không hỗ trợ', 'Vui lòng chọn ảnh định dạng JPEG, PNG hoặc WebP.');
        return;
      }

      setUploading(true);

      let intentKey = activeUploadIntentRef.current;
      if (!intentKey) {
        intentKey = `app-media-upload:${crypto.randomUUID()}`;
        activeUploadIntentRef.current = intentKey;
      }

      const fileName = pickedAsset.fileName || `wedding-photo-${Date.now()}.jpg`;
      const filePayload = {
        uri: pickedAsset.uri,
        name: fileName,
        type: mime,
      };

      const asset = await session.authorize((token) =>
        gateway.uploadWeddingMedia(
          token,
          activeBooking.bookingId,
          activeBooking.revision,
          filePayload,
          trimmedAlt,
          intentKey,
        ),
      );

      activeUploadIntentRef.current = null;
      setUploadedAssets((prev) => [
        ...prev,
        {
          assetId: asset.mediaAssetId,
          previewPath: asset.previewPath,
          name: fileName,
          altText: trimmedAlt,
        },
      ]);
      setAltText('');
      Alert.alert('Thành công', 'Đã tải ảnh lên kho ảnh cưới thành công.');
    } catch (caught: unknown) {
      if (caught instanceof ApiClientError && caught.status === 403) {
        Alert.alert(
          'Đã khóa kho ảnh (403)',
          'Thời hạn tải ảnh đã kết thúc hoặc kho ảnh đã được khóa bởi người quản lý.',
        );
      } else if (caught instanceof ApiClientError && caught.status === 409) {
        Alert.alert(
          'Xung đột phiên bản (409)',
          'Hồ sơ đặt tiệc vừa có cập nhật mới. Vui lòng làm mới trang trước khi tải ảnh tiếp.',
        );
      } else if (caught instanceof ApiClientError && caught.status === 413) {
        Alert.alert(
          'Tệp quá dung lượng (413)',
          'Ảnh vượt quá dung lượng tối đa cho phép (25 MiB).',
        );
      } else if (caught instanceof ApiClientError && caught.status === 422) {
        Alert.alert('Tệp không hợp lệ (422)', 'Định dạng tệp ảnh không đúng chuẩn JPEG/PNG/WebP.');
      } else {
        Alert.alert(
          'Lỗi tải ảnh',
          caught instanceof Error ? caught.message : 'Không thể tải ảnh lên kho ảnh.',
        );
      }
    } finally {
      setUploading(false);
    }
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: tokens.canvas }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.pageHeader}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Về kế hoạch"
          onPress={() => onNavigate('plan')}
          style={styles.backButton}
        >
          <Text style={[styles.backGlyph, { color: tokens.primary }]}>‹</Text>
        </Pressable>
        <View style={styles.headerTitleWrap}>
          <Text style={[styles.eyebrow, { color: tokens.sage }]}>Kế hoạch</Text>
          <Text style={[styles.heading, { color: tokens.text }]}>Ảnh trình chiếu</Text>
        </View>
      </View>

      <View
        style={[styles.calloutCard, { backgroundColor: tokens.surface, borderColor: tokens.rule }]}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <LockIcon size={16} color={tokens.sage} />
          <Text style={[styles.calloutTitle, { color: tokens.primary }]}>Kho ảnh cưới bảo mật</Text>
        </View>
        <Text style={[styles.calloutSubtitle, { color: tokens.muted }]}>
          Ảnh chỉ hiển thị trong không gian tiệc cưới và màn hình trình chiếu của hai bạn tại{' '}
          {facts.hallName}.
        </Text>
      </View>

      {/* Cutoff Status Card */}
      <View
        style={[
          styles.calloutCard,
          {
            backgroundColor: isCutoffPassed ? tokens.tagWarmBg : tokens.surface,
            borderColor: isCutoffPassed ? tokens.champagne : tokens.rule,
          },
        ]}
      >
        <Text style={[styles.calloutTitle, { color: tokens.text, marginBottom: 4 }]}>
          Thời hạn tải ảnh (Cutoff 72 giờ)
        </Text>
        <Text style={{ fontSize: 13, color: isCutoffPassed ? tokens.tagWarmText : tokens.sage }}>
          {isCutoffPassed
            ? `Đã khóa tải ảnh từ ${cutoffFormatted}`
            : `Hạn chót tải ảnh: ${cutoffFormatted}`}
        </Text>
      </View>

      <View style={styles.policyBlock}>
        <Text style={[styles.policyTitle, { color: tokens.text }]}>Quy định lưu trữ ảnh tiệc</Text>
        <Text style={[styles.policyText, { color: tokens.muted }]}>
          • Tối đa 100 ảnh / 1 GiB cho mỗi tiệc cưới.{'\n'}• Giới hạn dung lượng tối đa 25 MiB mỗi
          tệp ảnh (định dạng JPEG, PNG, WebP).{'\n'}• Bắt buộc nhập mô tả ảnh (alt text từ 1 đến 250
          ký tự).{'\n'}• Thời hạn cutoff: Ảnh cần được tải lên trước 72 giờ so với giờ tiệc (
          {cutoffFormatted}). Sau thời điểm này, kho ảnh sẽ được khóa để đội ngũ kỹ thuật nhà hàng
          chuẩn bị trình chiếu.
        </Text>
      </View>

      {/* Uploaded Assets in Session */}
      {uploadedAssets.length > 0 ? (
        <View style={{ marginTop: 16 }}>
          <Text style={[styles.policyTitle, { color: tokens.text, marginBottom: 8 }]}>
            Ảnh đã tải lên trong phiên ({uploadedAssets.length} ảnh)
          </Text>
          {uploadedAssets.map((asset) => (
            <View
              key={asset.assetId}
              style={[
                styles.factRow,
                {
                  paddingVertical: 10,
                  borderBottomWidth: 1,
                  borderBottomColor: tokens.rule,
                },
              ]}
            >
              <View style={{ flex: 1, gap: 2 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <ImageIcon size={16} color={tokens.sage} />
                  <Text style={{ fontSize: 13, color: tokens.text, fontWeight: '600' }}>
                    {asset.name}
                  </Text>
                </View>
                <Text style={{ fontSize: 11, color: tokens.muted }}>Mô tả: {asset.altText}</Text>
                <Text style={{ fontSize: 10, color: tokens.sage }}>Mã ảnh: {asset.assetId}</Text>
              </View>
            </View>
          ))}
        </View>
      ) : null}

      <View style={{ marginTop: 16 }}>
        <TextInput
          value={altText}
          onChangeText={setAltText}
          placeholder="Nhập mô tả ảnh trình chiếu (bắt buộc, 1-250 ký tự)"
          placeholderTextColor={tokens.muted}
          editable={!isCutoffPassed && !uploading}
          maxLength={250}
          style={[
            styles.input,
            {
              backgroundColor: tokens.surface,
              borderColor: tokens.rule,
              color: tokens.text,
              marginBottom: 12,
            },
          ]}
        />

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Chọn ảnh từ máy"
          disabled={uploading || isCutoffPassed}
          onPress={() => void handlePickAndUpload()}
          style={({ pressed }) => [
            styles.primaryButton,
            {
              backgroundColor: isCutoffPassed ? tokens.surfaceMuted : tokens.primary,
              borderColor: isCutoffPassed ? tokens.rule : tokens.primary,
              opacity: pressed || uploading ? 0.8 : 1,
            },
          ]}
        >
          {uploading ? (
            <ActivityIndicator color={tokens.onPrimary} size="small" />
          ) : (
            <>
              <ImageIcon size={16} color={isCutoffPassed ? tokens.muted : tokens.onPrimary} />
              <Text
                style={[
                  styles.primaryButtonText,
                  { color: isCutoffPassed ? tokens.muted : tokens.onPrimary },
                ]}
              >
                {isCutoffPassed ? 'Đã khóa kho ảnh' : 'Chọn ảnh thực tế từ thiết bị'}
              </Text>
            </>
          )}
        </Pressable>
      </View>

      <Text style={{ fontSize: 11, color: tokens.earth, marginTop: 16, lineHeight: 16 }}>
        Lưu ý: Hợp đồng máy chủ chưa có endpoint GET /bookings/{'{id}'}/media để tải lại toàn bộ
        danh sách ảnh cũ đã tải từ trước (Blocker). Ứng dụng hiển thị các ảnh được tải lên trong
        phiên làm việc hiện tại.
      </Text>
    </ScrollView>
  );
}

// ====================================================
// 3. PRINT SUBFLOW (READ-ONLY MOBILE MVP)
// ====================================================
