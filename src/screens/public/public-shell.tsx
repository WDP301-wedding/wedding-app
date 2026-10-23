import React, { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useAppInsets } from '@/lib/safe-area';
import { HyText as Text, HyButton, HyCard, HyBadge } from '@/components/hy-ui';
import { SparklesIcon, WalletIcon } from '@/components/v0-icons';
import { V0CatalogSubflow } from '../v0/v0-catalog-subflow';
import type { V0EventFacts } from '../v0/v0-types';
import { ConsultationScreen, type ConsultationPrefill } from './consultation-screen';
import { EstimatorScreen } from './estimator-screen';
import { useWeddingTheme, hy } from '@/theme';

export type PublicTab = 'home' | 'halls' | 'menus' | 'estimate' | 'consultation';

const publicFacts: V0EventFacts = {
  brideName: '',
  groomName: '',
  coupleDisplay: 'Hỷ Yến',
  eventDate: '',
  formattedDate: '',
  venueName: 'Trung tâm Hội nghị & Tiệc cưới Hỷ Yến',
  hallName: 'Hỷ Yến',
  shiftTime: '11:00 - 14:00 / 17:30 - 21:30',
  planningHeadcount: 0,
  revisionNumber: 1,
};

export interface PublicShellProps {
  readonly onOpenLogin: () => void;
}

export function PublicShell({ onOpenLogin }: PublicShellProps) {
  const { brand, colors } = useWeddingTheme();
  const insets = useAppInsets();

  const [activeTab, setActiveTab] = useState<PublicTab>('home');
  const [consultationPrefill, setConsultationPrefill] = useState<ConsultationPrefill>({});

  const handleOpenConsultationWithPrefill = (prefill: ConsultationPrefill) => {
    setConsultationPrefill(prefill);
    setActiveTab('consultation');
  };

  const tabs = [
    { id: 'home', label: 'Khám phá' },
    { id: 'halls', label: 'Sảnh tiệc' },
    { id: 'menus', label: 'Thực đơn' },
    { id: 'estimate', label: 'Tính giá' },
    { id: 'consultation', label: 'Tư vấn' },
  ] as const;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Top Bar */}
      <View
        style={{
          paddingTop: Math.max(insets.top, 16),
          paddingBottom: 12,
          paddingHorizontal: 16,
          backgroundColor: hy.surface,
          borderBottomWidth: 1,
          borderBottomColor: hy.outline,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: brand.primary,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ fontFamily: 'HyDisplay', fontSize: 16, color: '#FFF8F1' }}>HY</Text>
          </View>
          <View>
            <Text style={{ fontSize: 18, fontWeight: '700', color: brand.display, lineHeight: 22 }}>
              Hỷ Yến
            </Text>
            <Text style={{ fontSize: 11, color: brand.script, marginTop: -2 }}>
              Trung tâm tiệc cưới
            </Text>
          </View>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Đăng nhập tài khoản cặp đôi"
          onPress={onOpenLogin}
          style={({ pressed }) => [
            {
              paddingVertical: 8,
              paddingHorizontal: 16,
              borderRadius: 20,
              backgroundColor: brand.primary,
            },
            pressed && { opacity: 0.8 },
          ]}
        >
          <Text style={{ fontSize: 13, fontWeight: '700', color: '#FFF8F1' }}>Đăng nhập</Text>
        </Pressable>
      </View>

      {/* Main Content Area */}
      <View style={{ flex: 1 }}>
        {activeTab === 'home' ? (
          <ScrollView
            contentContainerStyle={{
              padding: 16,
              paddingBottom: 32,
              gap: 20,
            }}
          >
            {/* Hero Card */}
            <View
              style={{
                borderRadius: 20,
                backgroundColor: brand.primary,
                padding: 24,
                overflow: 'hidden',
              }}
            >
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: '700',
                  color: brand.goldSoft,
                  letterSpacing: 0.5,
                  marginBottom: 6,
                }}
              >
                TRUNG TÂM TIỆC CƯỚI HỶ YẾN
              </Text>
              <Text
                style={{
                  fontSize: 24,
                  fontWeight: '700',
                  color: '#FFF8F1',
                  lineHeight: 32,
                  marginBottom: 8,
                }}
              >
                Cùng bạn chuẩn bị ngày chung đôi
              </Text>
              <Text style={{ fontSize: 14, color: '#F8E9EE', lineHeight: 20, marginBottom: 20 }}>
                Không gian tiệc cưới trang nhã, ẩm thực tinh hoa cùng dịch vụ quản lý tiệc cưới số
                đồng hành cùng hai bạn từ ngày đầu gặp gỡ.
              </Text>

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <HyButton
                    label="Dự toán ngân sách"
                    variant="outline"
                    onPress={() => setActiveTab('estimate')}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <HyButton label="Đặt lịch tư vấn" onPress={() => setActiveTab('consultation')} />
                </View>
              </View>
            </View>

            {/* Quick Navigation Bento */}
            <Text style={{ fontSize: 16, fontWeight: '700', color: colors.label, marginTop: 4 }}>
              Khám phá dịch vụ tiệc cưới
            </Text>

            <View style={{ flexDirection: 'row', gap: 12 }}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Xem không gian sảnh cưới"
                onPress={() => setActiveTab('halls')}
                style={{
                  flex: 1,
                  padding: 16,
                  borderRadius: 16,
                  backgroundColor: hy.surface,
                  borderWidth: 1,
                  borderColor: hy.outline,
                  gap: 8,
                }}
              >
                <View
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    backgroundColor: '#F7EDEE',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <SparklesIcon size={20} color={brand.primary} />
                </View>
                <Text style={{ fontSize: 15, fontWeight: '700', color: colors.label }}>
                  Sảnh tiệc cưới
                </Text>
                <Text style={{ fontSize: 12, color: hy.muted, lineHeight: 16 }}>
                  Sảnh tiệc sang trọng, sức chứa đa dạng từ 100 đến 800 khách.
                </Text>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Xem thực đơn tiệc cưới"
                onPress={() => setActiveTab('menus')}
                style={{
                  flex: 1,
                  padding: 16,
                  borderRadius: 16,
                  backgroundColor: hy.surface,
                  borderWidth: 1,
                  borderColor: hy.outline,
                  gap: 8,
                }}
              >
                <View
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    backgroundColor: '#FFF7EE',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <WalletIcon size={20} color={brand.script} />
                </View>
                <Text style={{ fontSize: 15, fontWeight: '700', color: colors.label }}>
                  Thực đơn ẩm thực
                </Text>
                <Text style={{ fontSize: 12, color: hy.muted, lineHeight: 16 }}>
                  Các set menu cưới tinh hoa, phong vị Việt Nam & Á Đông.
                </Text>
              </Pressable>
            </View>

            {/* Moments Showcase Card */}
            <HyCard style={{ gap: 12 }}>
              <Text style={{ fontSize: 15, fontWeight: '700', color: brand.display }}>
                Khoảnh khắc ngày chung đôi
              </Text>
              <Text style={{ fontSize: 13, color: colors.secondaryLabel, lineHeight: 18 }}>
                Mỗi tiệc cưới tại Hỷ Yến là một câu chuyện tình yêu được khắc họa trọn vẹn từ ánh
                sáng, âm nhạc đến từng nụ cười hạnh phúc của hai bên gia đình.
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                <HyBadge label="Nghi thức cưới trọn vẹn" status="done" />
                <HyBadge label="Không gian chuẩn 5 sao" status="info" />
                <HyBadge label="Âm thanh & Ánh sáng hiện đại" status="info" />
              </View>
            </HyCard>

            {/* CTA Banner to Login */}
            <HyCard
              style={{
                backgroundColor: '#FBF4F6',
                borderColor: brand.primary,
                borderWidth: 1,
                alignItems: 'center',
                paddingVertical: 20,
                gap: 8,
              }}
            >
              <Text style={{ fontSize: 15, fontWeight: '700', color: brand.primary }}>
                Hai bạn đã có hồ sơ đặt tiệc?
              </Text>
              <Text
                style={{
                  fontSize: 13,
                  color: colors.secondaryLabel,
                  textAlign: 'center',
                  lineHeight: 18,
                }}
              >
                Đăng nhập ngay để theo dõi tiến độ, duyệt kịch bản tiệc, quản lý khách mời và thiệp
                cưới.
              </Text>
              <View style={{ marginTop: 6, minWidth: 200 }}>
                <HyButton label="Đăng nhập tài khoản" onPress={onOpenLogin} />
              </View>
            </HyCard>
          </ScrollView>
        ) : null}

        {activeTab === 'halls' ? (
          <V0CatalogSubflow facts={publicFacts} onNavigate={() => {}} />
        ) : null}

        {activeTab === 'menus' ? (
          <V0CatalogSubflow facts={publicFacts} onNavigate={() => {}} />
        ) : null}

        {activeTab === 'estimate' ? (
          <EstimatorScreen
            onProceedToConsultation={handleOpenConsultationWithPrefill}
            onBack={() => setActiveTab('home')}
          />
        ) : null}

        {activeTab === 'consultation' ? (
          <ConsultationScreen
            prefill={consultationPrefill}
            onBack={() => setActiveTab('home')}
            onExploreHalls={() => setActiveTab('halls')}
          />
        ) : null}
      </View>

      {/* Bottom Navigation Bar */}
      <View
        style={{
          flexDirection: 'row',
          backgroundColor: hy.surface,
          borderTopWidth: 1,
          borderTopColor: hy.outline,
          paddingBottom: Math.max(insets.bottom, 8),
          paddingTop: 8,
        }}
      >
        {tabs.map((tab) => {
          const isSelected = activeTab === tab.id;
          return (
            <Pressable
              key={tab.id}
              accessibilityRole="tab"
              accessibilityState={{ selected: isSelected }}
              accessibilityLabel={tab.label}
              onPress={() => setActiveTab(tab.id)}
              style={{
                flex: 1,
                alignItems: 'center',
                justifyContent: 'center',
                paddingVertical: 6,
              }}
            >
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: isSelected ? '700' : '500',
                  color: isSelected ? brand.primary : hy.muted,
                }}
              >
                {tab.label}
              </Text>
              {isSelected ? (
                <View
                  style={{
                    width: 16,
                    height: 3,
                    borderRadius: 1.5,
                    backgroundColor: brand.primary,
                    marginTop: 4,
                  }}
                />
              ) : (
                <View style={{ width: 16, height: 3, marginTop: 4 }} />
              )}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
