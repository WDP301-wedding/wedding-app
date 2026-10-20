import React, { useState } from 'react';
import { View } from 'react-native';
import { HySegmentedControl } from '@/components/hy-ui';
import { hy } from '@/theme';
import { HyGuests } from '../hy/hy-guests';
import { HySeatingTab } from '../hy/hy-seating-tab';
import { V0InviteTab } from '../v0/v0-invite-tab';
import { V0PrintSubflow } from '../v0/v0-subflows';
import type { V0CommonProps } from '../v0/v0-types';

export type PrepareSegment = 'guests' | 'seating' | 'card' | 'print';

export function V2PrepareTab(props: V0CommonProps) {
  const [segment, setSegment] = useState<PrepareSegment>('guests');

  return (
    <View style={{ flex: 1, backgroundColor: hy.canvas }}>
      {/* Top Segmented Control */}
      <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 }}>
        <HySegmentedControl<PrepareSegment>
          items={[
            { key: 'guests', label: 'Khách' },
            { key: 'seating', label: 'Sơ đồ' },
            { key: 'card', label: 'Thiệp' },
            { key: 'print', label: 'Đơn in' },
          ]}
          selected={segment}
          onSelect={setSegment}
        />
      </View>

      {/* Segment Content */}
      <View style={{ flex: 1 }}>
        {segment === 'guests' && <HyGuests {...props} />}

        {segment === 'seating' && <HySeatingTab {...props} />}

        {segment === 'card' && <V0InviteTab {...props} initialSubscreen="preview" />}

        {segment === 'print' && <V0PrintSubflow {...props} />}
      </View>
    </View>
  );
}
