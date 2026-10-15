import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { HyText as Text, HyScreen, HyButton, HyCard, HyState, HySheet } from '@/components/hy-ui';
import { hy } from '@/theme';
import type { AppDesignView } from '@/features/invitation-studio/app-invitation-api';
import type { V0CommonProps, V0Screen } from '../v0-types';
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
  const [full, setFull] = useState(false);
  const card = () => (
    <View
      style={{
        aspectRatio: 3 / 4,
        width: '100%',
        borderRadius: 20,
        backgroundColor: hy.canvas,
        borderWidth: 1,
        borderColor: hy.gold,
        padding: 20,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 14,
        overflow: 'hidden',
      }}
    >
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          height: 200,
          width: 200,
          borderRadius: 100,
          backgroundColor: hy.peach,
          opacity: 0.26,
          right: -95,
          top: -80,
        }}
      />
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          height: 160,
          width: 160,
          borderRadius: 80,
          backgroundColor: hy.peach,
          opacity: 0.2,
          left: -90,
          bottom: -45,
        }}
      />
      <Text style={{ fontSize: 12, letterSpacing: 3, color: hy.muted }}>THIỆP MỜI</Text>
      <Text
        style={{
          fontFamily: hy.display,
          fontSize: 32,
          lineHeight: 42,
          textAlign: 'center',
          color: hy.primary,
        }}
      >
        {coupleDisplay}
      </Text>
      <View style={{ height: 1, width: 48, backgroundColor: hy.gold }} />
      {greeting && <Text style={{ textAlign: 'center', fontSize: 13 }}>{greeting}</Text>}
      {message && (
        <Text style={{ textAlign: 'center', fontSize: 13, color: hy.secondary }}>{message}</Text>
      )}
      <Text style={{ fontWeight: '600', textAlign: 'center' }}>{facts.formattedDate}</Text>
      <Text style={{ fontSize: 13, textAlign: 'center', color: hy.muted }}>
        {facts.hallName} · {facts.shiftTime}
      </Text>
      <Text style={{ fontSize: 13, textAlign: 'center' }}>{facts.venueName}</Text>
      {footer && (
        <Text style={{ fontSize: 12, textAlign: 'center', color: hy.muted }}>{footer}</Text>
      )}
    </View>
  );
  return (
    <HyScreen>
      {loading ? (
        <HyState kind="loading" />
      ) : loadError ? (
        <HyState kind="error" body={loadError} />
      ) : selectedDesign ? (
        <>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Phóng to bản xem nội dung thiệp"
            onPress={() => setFull(true)}
          >
            {card()}
          </Pressable>
          <View
            style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
          >
            <Text style={{ fontSize: 12, color: hy.muted }}>{selectedDesign.title}</Text>
            <Text style={{ fontSize: 12, color: hy.muted }}>
              Phiên bản {selectedDesign.revisionNumber}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ flex: 1 }}>
              <HyButton label="Sửa nhanh" variant="outline" onPress={onEditPress} />
            </View>
            <View style={{ flex: 1 }}>
              <HyButton label="Chia sẻ" onPress={onSharePress} />
            </View>
          </View>
          <HyCard>
            <Text style={{ fontSize: 13, color: hy.secondary }}>
              Bản xem nội dung trên mobile. Bố cục in chính thức được lưu theo phiên bản thiết kế
              của nhà hàng.
            </Text>
            <HyButton label="Tùy chọn thiệp & bản in" variant="text" onPress={onMorePress} />
          </HyCard>
        </>
      ) : (
        <HyState
          kind="empty"
          title="Thiệp đang được chuẩn bị"
          body="Thiết kế sẽ xuất hiện khi nhà hàng tạo thiệp cho tiệc của hai bạn."
        />
      )}
      {designs.length > 0 && (
        <>
          <Text style={{ fontSize: 16, fontWeight: '600' }}>Thiết kế của hai bạn</Text>
          {designs.map((item) => (
            <Pressable
              key={item.designId}
              accessibilityRole="radio"
              accessibilityState={{ checked: selectedDesign?.designId === item.designId }}
              onPress={() => onSelectDesign(item)}
              style={{
                minHeight: 76,
                backgroundColor: hy.surface,
                borderWidth: 1,
                borderColor: selectedDesign?.designId === item.designId ? hy.primary : hy.rule,
                borderRadius: 16,
                padding: 16,
                flexDirection: 'row',
                gap: 12,
                alignItems: 'center',
              }}
            >
              <View
                style={{
                  width: 40,
                  height: 48,
                  borderRadius: 8,
                  backgroundColor: hy.primarySoft,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ color: hy.primary }}>❀</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: '600' }}>{item.title}</Text>
                <Text style={{ fontSize: 12, color: hy.muted }}>
                  Phiên bản {item.revisionNumber}
                </Text>
              </View>
              <Text style={{ color: hy.primary }}>
                {selectedDesign?.designId === item.designId ? '✓' : '›'}
              </Text>
            </Pressable>
          ))}
        </>
      )}
      {toastMessage && (
        <Text
          accessibilityLiveRegion="polite"
          style={{ backgroundColor: hy.primary, color: hy.canvas, padding: 16, borderRadius: 16 }}
        >
          {toastMessage}
        </Text>
      )}
      <HySheet visible={full} title="Nội dung thiệp" onClose={() => setFull(false)}>
        {card()}
      </HySheet>
    </HyScreen>
  );
}
