import React from 'react';
import { View } from 'react-native';
import { HyText as Text, HyScreen, HyCard, HyRow, HyState } from '@/components/hy-ui';
import { hy } from '@/theme';
import type { V0CommonProps } from '../v0/v0-types';
export function HyPartyDetail({ activeBooking, facts, onNavigate }: V0CommonProps) {
  return (
    <HyScreen>
      <HyCard>
        <Text style={{ fontFamily: hy.display, fontSize: 26, color: hy.primary }}>
          {facts.coupleDisplay}
        </Text>
        {[
          ['Ngày tiệc', facts.formattedDate],
          ['Sảnh', facts.hallName],
          ['Ca tiệc', facts.shiftTime],
          ['Khách dự kiến', String(facts.planningHeadcount)],
        ].map(([label, value]) => (
          <View
            key={label}
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              gap: 16,
              borderBottomWidth: 1,
              borderBottomColor: hy.rule,
              paddingVertical: 12,
            }}
          >
            <Text style={{ color: hy.muted, fontSize: 14 }}>{label}</Text>
            <Text style={{ flex: 1, textAlign: 'right', fontWeight: '500' }}>{value}</Text>
          </View>
        ))}
      </HyCard>
      <HyRow
        title="Lịch trình chính thức"
        subtitle={
          activeBooking?.timelineRevision
            ? `Phiên bản ${activeBooking.timelineRevision} · xem chi tiết và cập nhật`
            : 'Xem đề xuất và phê duyệt cùng nhà hàng'
        }
        onPress={() => onNavigate('schedule')}
      />
      {activeBooking?.timelineRevision && activeBooking.timeline.length > 0 ? (
        <HyCard>
          {activeBooking.timeline.map((item, i) => (
            <View key={item.itemId} style={{ flexDirection: 'row', gap: 12, paddingVertical: 10 }}>
              <View
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  backgroundColor: hy.primarySoft,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ fontSize: 12, color: hy.primary }}>{i + 1}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: '600' }}>{item.title}</Text>
                <Text style={{ fontSize: 13, color: hy.muted }}>{item.startTime}</Text>
              </View>
            </View>
          ))}
        </HyCard>
      ) : (
        <HyState
          kind="empty"
          title="Chưa có lịch trình chính thức"
          body="Lịch trình chỉ có hiệu lực khi hai bên thống nhất cùng một phiên bản."
        />
      )}
      <HyRow
        title="Nhóm khách & sơ đồ bàn"
        subtitle="Theo dõi nhóm khách, sức chứa và hướng dẫn chỗ ngồi"
        onPress={() => onNavigate('seating')}
      />
      <HyRow
        title="Ảnh cưới"
        subtitle="Tải ảnh riêng tư theo thời hạn của tiệc"
        onPress={() => onNavigate('media')}
      />
    </HyScreen>
  );
}
