import React from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import {
  CheckIcon,
  ChevronRightIcon,
  MoreIcon,
  ShareIcon,
  SparklesIcon,
  StatusTag,
} from '@/components/v0-primitives';
import type { AppDesignView } from '@/features/invitation-studio/app-invitation-api';
import { useWeddingTheme } from '@/theme';
import { deriveInitials } from '../../couple-overview';
import type { V0CommonProps, V0Screen } from '../v0-types';
import { styles } from './invite.styles';

export function InvitePreviewView({
  coupleDisplay,
  greeting,
  message,
  footer,
  facts,
  selectedDesign,
  loading,
  loadError,
  designs,
  toastMessage,
  onNavigate,
  onMorePress,
  onEditPress,
  onSharePress,
  onSelectDesign,
}: {
  coupleDisplay: string;
  greeting: string;
  message: string;
  footer: string;
  facts: V0CommonProps['facts'];
  selectedDesign: AppDesignView | null;
  loading: boolean;
  loadError: string | null;
  designs: readonly AppDesignView[];
  toastMessage: string | null;
  onNavigate: (screen: V0Screen) => void;
  onMorePress: () => void;
  onEditPress: () => void;
  onSharePress: () => void;
  onSelectDesign: (item: AppDesignView) => void;
}) {
  const { tokens } = useWeddingTheme();

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: tokens.canvas }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.pageHeader}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Về tổng quan"
          onPress={() => onNavigate('overview')}
          style={styles.backButton}
        >
          <Text style={[styles.backGlyph, { color: tokens.primary }]}>‹</Text>
        </Pressable>
        <View style={styles.headerTitleWrap}>
          <Text style={[styles.eyebrow, { color: tokens.sage }]}>Thiệp cưới</Text>
          <Text style={[styles.heading, { color: tokens.text }]}>Thiệp của hai bạn</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Tùy chọn khác"
          onPress={onMorePress}
          style={styles.iconButton}
        >
          <MoreIcon size={20} color={tokens.primary} />
        </Pressable>
      </View>

      {loading && <ActivityIndicator color={tokens.primary} style={{ marginBottom: 12 }} />}

      {loadError && (
        <View
          accessibilityRole="alert"
          style={[
            styles.prototypeNote,
            {
              backgroundColor: tokens.tagWarmBg,
              borderLeftColor: tokens.champagne,
              marginBottom: 12,
            },
          ]}
        >
          <Text style={{ color: tokens.tagWarmText, fontSize: 13 }}>{loadError}</Text>
        </View>
      )}

      {/* Truthful Note */}
      <View
        style={[
          styles.prototypeNote,
          { backgroundColor: tokens.calloutBg, borderLeftColor: tokens.champagne },
        ]}
      >
        <SparklesIcon size={16} color={tokens.champagne} />
        <Text style={[styles.prototypeNoteText, { color: tokens.calloutText }]}>
          {selectedDesign
            ? `Bản xem trước thiệp cưới (${selectedDesign.title || 'Mẫu tiêu chuẩn'})`
            : 'Đang tải dữ liệu thiết kế từ máy chủ…'}
        </Text>
      </View>

      {/* Invitation Preview Card */}
      <View style={[styles.invitationPreview, { backgroundColor: tokens.previewBg }]}>
        <View
          style={[
            styles.previewArt,
            {
              backgroundColor: tokens.previewArt,
              borderColor: tokens.premium,
            },
          ]}
        >
          <Text style={[styles.previewScript, { color: tokens.primary }]}>{coupleDisplay}</Text>

          <View style={[styles.previewRule, { borderTopColor: tokens.champagne }]} />

          {greeting ? (
            <Text style={[styles.previewSmall, { color: tokens.earth }]}>{greeting}</Text>
          ) : null}
          {message ? (
            <Text
              style={[
                styles.previewSmall,
                {
                  color: tokens.muted,
                  textAlign: 'center',
                  marginVertical: 4,
                  paddingHorizontal: 12,
                },
              ]}
            >
              {message}
            </Text>
          ) : null}
          <Text style={[styles.previewDate, { color: tokens.earth }]}>{facts.formattedDate}</Text>
          <Text style={[styles.previewVenue, { color: tokens.primary }]}>
            {facts.venueName}
            {'\n'}
            <Text style={[styles.previewVenueSub, { color: tokens.muted }]}>
              {facts.hallName} · {facts.shiftTime}
            </Text>
          </Text>
          {footer ? (
            <Text style={[styles.previewSmall, { color: tokens.earth, marginTop: 6 }]}>
              {footer}
            </Text>
          ) : null}
        </View>

        <View style={styles.previewFooter}>
          <StatusTag
            tone={
              (selectedDesign as { status?: string })?.status === 'APPROVED'
                ? 'success'
                : (selectedDesign as { status?: string })?.status === 'IN_REVIEW'
                  ? 'warm'
                  : 'neutral'
            }
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <CheckIcon size={12} color={tokens.sage} />
              <Text style={{ fontSize: 10, color: tokens.sage, fontWeight: '600' }}>
                {(selectedDesign as { status?: string })?.status === 'APPROVED'
                  ? 'Đã duyệt nội dung'
                  : (selectedDesign as { status?: string })?.status === 'IN_REVIEW'
                    ? 'Đang xem lại'
                    : 'Bản nháp'}
              </Text>
            </View>
          </StatusTag>
          <Text style={[styles.previewVersion, { color: tokens.muted }]}>
            Phiên bản {selectedDesign?.revisionNumber ?? 1}
          </Text>
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.buttonRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Chỉnh sửa chữ"
          onPress={onEditPress}
          style={({ pressed }) => [
            styles.outlineButton,
            {
              borderColor: tokens.primary,
              backgroundColor: pressed ? tokens.surfaceMuted : 'transparent',
            },
          ]}
        >
          <Text style={[styles.outlineButtonText, { color: tokens.primary }]}>Chỉnh sửa chữ</Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Chia sẻ"
          onPress={onSharePress}
          style={({ pressed }) => [
            styles.primaryButton,
            {
              backgroundColor: tokens.primary,
              borderColor: tokens.primary,
              flex: 1,
              marginTop: 0,
              opacity: pressed ? 0.9 : 1,
            },
          ]}
        >
          <ShareIcon size={16} color={tokens.onPrimary} />
          <Text style={[styles.primaryButtonText, { color: tokens.onPrimary }]}>Chia sẻ</Text>
        </Pressable>
      </View>

      {/* Selected Variant Section */}
      <View style={styles.sectionBlock}>
        <View style={styles.sectionHeading}>
          <Text style={[styles.sectionTitle, { color: tokens.text }]}>Thiết kế thiệp</Text>
          <Text style={[styles.countBadge, { color: tokens.muted }]}>
            {designs.length > 0 ? `${designs.length} mẫu` : 'Chưa có'}
          </Text>
        </View>

        {designs.length > 0 ? (
          designs.map((item, idx) => {
            const isSelected = selectedDesign?.designId === item.designId;
            const initials = deriveInitials(
              item.textFields?.brideName,
              item.textFields?.groomName,
              facts.coupleDisplay,
            );
            return (
              <Pressable
                key={item.designId}
                accessibilityRole="radio"
                accessibilityState={{ checked: isSelected }}
                accessibilityLabel={item.title || `Thiết kế ${idx + 1}`}
                onPress={() => onSelectDesign(item)}
                style={[
                  styles.variantRow,
                  {
                    borderBottomColor: tokens.rule,
                    borderBottomWidth: idx === designs.length - 1 ? 0 : 1,
                  },
                ]}
              >
                <View
                  style={[
                    styles.variantThumb,
                    {
                      backgroundColor: isSelected ? '#E6DED1' : '#F3EFEA',
                      borderColor: tokens.champagne,
                    },
                  ]}
                >
                  <Text style={[styles.variantThumbText, { color: tokens.primary }]}>
                    {initials}
                  </Text>
                </View>
                <View style={styles.variantCopy}>
                  <Text style={[styles.variantTitle, { color: tokens.primary }]}>
                    {item.title || `Mẫu thiệp #${idx + 1}`}
                  </Text>
                  <Text style={[styles.variantDesc, { color: tokens.muted }]}>
                    Phiên bản {item.revisionNumber}
                  </Text>
                </View>
                {isSelected ? (
                  <CheckIcon size={18} color={tokens.primary} />
                ) : (
                  <ChevronRightIcon size={18} color={tokens.muted} />
                )}
              </Pressable>
            );
          })
        ) : (
          <View style={{ paddingVertical: 12 }}>
            <Text style={{ color: tokens.muted, fontSize: 13 }}>
              Chưa có mẫu thiệp nào được khởi tạo cho tiệc cưới này.
            </Text>
          </View>
        )}
      </View>

      {/* Toast */}
      {toastMessage ? (
        <View style={[styles.toast, { backgroundColor: tokens.primary }]}>
          <CheckIcon size={16} color={tokens.onPrimary} />
          <Text style={[styles.toastText, { color: tokens.onPrimary }]}>{toastMessage}</Text>
        </View>
      ) : null}
    </ScrollView>
  );
}
