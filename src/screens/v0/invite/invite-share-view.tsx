import React from 'react';
import { ActivityIndicator, Pressable, ScrollView, View } from 'react-native';
import { HyText as Text } from '@/components/hy-ui';
import {
  CheckIcon,
  ChevronRightIcon,
  CircleHelpIcon,
  LinkIcon,
  LockIcon,
  ShareIcon,
  UsersIcon,
} from '@/components/v0-primitives';
import type { AppPublicationView } from '@/features/invitation-studio/app-invitation-api';
import { CanonicalQrCode } from '@/lib/qr';
import { useWeddingTheme } from '@/theme';
import type { V0Screen } from '../v0-types';
import { styles } from './invite.styles';

export function InviteShareView({
  publicUrl,
  publication,
  publishError,
  copied,
  publishing,
  onCopyLink,
  onOpenShare,
  onPublish,
  onUnpublish,
  onNavigate,
}: {
  publicUrl: string | null;
  publication: AppPublicationView | null;
  publishError: string | null;
  copied: boolean;
  publishing: boolean;
  onBack: () => void;
  onCopyLink: () => void;
  onOpenShare: () => void;
  onPublish: () => void;
  onUnpublish: () => void;
  onNavigate: (screen: V0Screen) => void;
}) {
  const { tokens } = useWeddingTheme();

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: tokens.canvas }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View
        style={[
          styles.shareCard,
          {
            backgroundColor: tokens.surface,
            borderColor: tokens.rule,
          },
        ]}
      >
        <View
          style={[
            styles.qrContainer,
            {
              backgroundColor: tokens.surfaceMuted,
              alignItems: 'center',
              justifyContent: 'center',
              paddingVertical: 16,
            },
          ]}
        >
          {publicUrl ? (
            <CanonicalQrCode payload={publicUrl} size={160} />
          ) : (
            <View style={{ alignItems: 'center', padding: 20 }}>
              <LockIcon size={56} color={tokens.muted} />
              <Text
                style={{
                  fontSize: 13,
                  color: tokens.muted,
                  marginTop: 8,
                  textAlign: 'center',
                }}
              >
                Thiệp chưa được xuất bản công khai
              </Text>
            </View>
          )}
        </View>

        <Text style={[styles.shareCardTitle, { color: tokens.text }]}>
          Link thiệp cưới chính thức
        </Text>
        <Text style={[styles.shareCardDesc, { color: tokens.muted }]}>
          {publicUrl
            ? `Quét mã QR hoặc gửi liên kết này cho khách mời (Phiên bản xuất bản #${publication?.publicationRevision ?? 1}). Khách mời có thể xem thiệp trực tuyến.`
            : 'Thiệp chưa được xuất bản. Vui lòng bấm "Xuất bản thiệp cưới" bên dưới để nhận liên kết chính thức và kích hoạt mã QR thật từ máy chủ.'}
        </Text>

        {publishError ? (
          <View
            accessibilityRole="alert"
            style={[
              styles.revisionAlert,
              {
                backgroundColor: tokens.tagWarmBg,
                borderColor: tokens.champagne,
                marginBottom: 12,
              },
            ]}
          >
            <Text style={{ color: tokens.tagWarmText, fontSize: 13 }}>{publishError}</Text>
          </View>
        ) : null}

        {publicUrl ? (
          <View style={[styles.shareLinkBox, { backgroundColor: tokens.surfaceMuted }]}>
            <LinkIcon size={16} color={tokens.sage} />
            <Text style={[styles.shareLinkText, { color: tokens.sage }]} numberOfLines={1}>
              {publicUrl}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Sao chép link"
              onPress={onCopyLink}
              style={styles.copyButton}
            >
              {copied ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <CheckIcon size={14} color={tokens.sage} />
                  <Text style={{ fontSize: 11, color: tokens.sage, fontWeight: '600' }}>
                    Đã sao chép
                  </Text>
                </View>
              ) : (
                <Text style={{ fontSize: 11, color: tokens.sage, fontWeight: '600' }}>
                  Sao chép
                </Text>
              )}
            </Pressable>
          </View>
        ) : null}

        {publicUrl ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Mở bảng chia sẻ"
            onPress={onOpenShare}
            style={({ pressed }) => [
              styles.primaryButton,
              {
                backgroundColor: tokens.primary,
                borderColor: tokens.primary,
                opacity: pressed ? 0.9 : 1,
                marginBottom: 8,
              },
            ]}
          >
            <ShareIcon size={16} color={tokens.onPrimary} />
            <Text style={[styles.primaryButtonText, { color: tokens.onPrimary }]}>
              Mở bảng chia sẻ
            </Text>
          </Pressable>
        ) : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Xuất bản thiệp cưới"
            disabled={publishing}
            onPress={onPublish}
            style={({ pressed }) => [
              styles.primaryButton,
              {
                backgroundColor: tokens.primary,
                borderColor: tokens.primary,
                opacity: pressed || publishing ? 0.8 : 1,
                marginBottom: 8,
              },
            ]}
          >
            {publishing ? (
              <ActivityIndicator color={tokens.onPrimary} size="small" />
            ) : (
              <Text style={[styles.primaryButtonText, { color: tokens.onPrimary }]}>
                Xuất bản thiệp cưới
              </Text>
            )}
          </Pressable>
        )}

        {publicUrl ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Thu hồi xuất bản"
            disabled={publishing}
            onPress={onUnpublish}
            style={({ pressed }) => [
              styles.outlineButton,
              {
                borderColor: tokens.rule,
                opacity: pressed || publishing ? 0.7 : 1,
                marginTop: 6,
              },
            ]}
          >
            <Text style={[styles.outlineButtonText, { color: tokens.muted, fontSize: 12 }]}>
              Thu hồi xuất bản (Gỡ liên kết)
            </Text>
          </Pressable>
        ) : null}

        <Text style={[styles.simulatedLabel, { color: tokens.earth, marginTop: 12 }]}>
          Máy chủ chưa hỗ trợ endpoint đọc lại trạng thái xuất bản (GET /publication) · Trạng thái
          được duy trì trong phiên làm việc hiện tại
        </Text>
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Chia sẻ link riêng cho từng khách mời"
        onPress={() => onNavigate('guests')}
        style={[styles.secondaryRow, { borderBottomColor: tokens.rule }]}
      >
        <UsersIcon size={18} color={tokens.sage} />
        <View style={styles.secondaryRowCopy}>
          <Text style={[styles.secondaryRowTitle, { color: tokens.text }]}>
            Chia sẻ link riêng cho từng khách mời
          </Text>
          <Text style={[styles.secondaryRowSub, { color: tokens.muted }]}>
            Khác với link thiệp chung · xem thiệp cá nhân hóa theo nhóm
          </Text>
        </View>
        <ChevronRightIcon size={17} color={tokens.muted} />
      </Pressable>

      <View style={[styles.infoCallout, { borderTopColor: tokens.premium }]}>
        <CircleHelpIcon size={17} color={tokens.sage} />
        <Text style={[styles.infoCalloutText, { color: tokens.muted }]}>
          Link chung chỉ hiển thị nội dung công khai đã được duyệt.
        </Text>
      </View>
    </ScrollView>
  );
}
