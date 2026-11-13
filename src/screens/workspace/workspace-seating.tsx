import { useCallback, useState } from 'react';
import { ScrollView, View } from 'react-native';
import Svg, { Ellipse, G, Rect, Text as SvgText } from 'react-native-svg';
import { HyText as Text } from '@/components/hy-ui';
import {
  createCoupleBillingGateway,
  type SeatingPlanData,
} from '@/features/payments-billing/billing-api';
import { groupLabel, openWebPrepare } from '@/features/couple-workspace/links';
import { closed } from '@/features/couple-workspace/policies';
import { hy } from '@/theme';
import {
  Action,
  Feedback,
  Notice,
  ReadState,
  Section,
  s,
  useCommand,
  useRead,
  type WorkspaceProps,
} from './workspace-common';

const api = createCoupleBillingGateway();
type Table = SeatingPlanData['renderSnapshot'][number];
export function seatingBounds(tables: readonly Table[]): readonly [number, number, number, number] {
  if (tables.length === 0) return [0, 0, 100, 100];
  const points = tables.flatMap((table) => {
    const cx = table.x + table.width / 2;
    const cy = table.y + table.height / 2;
    const angle = (table.rotationDegrees * Math.PI) / 180;
    return [-1, 1].flatMap((dx) =>
      [-1, 1].map((dy) => ({
        x:
          cx +
          ((dx * table.width) / 2) * Math.cos(angle) -
          ((dy * table.height) / 2) * Math.sin(angle),
        y:
          cy +
          ((dx * table.width) / 2) * Math.sin(angle) +
          ((dy * table.height) / 2) * Math.cos(angle),
      })),
    );
  });
  const left = Math.min(...points.map((point) => point.x)) - 24;
  const top = Math.min(...points.map((point) => point.y)) - 24;
  return [
    left,
    top,
    Math.max(...points.map((point) => point.x)) + 24 - left,
    Math.max(...points.map((point) => point.y)) + 24 - top,
  ];
}
export function WorkspaceSeating({ session, booking, revision }: WorkspaceProps) {
  const [zoom, setZoom] = useState(1);
  const [width, setWidth] = useState(320);
  const load = useCallback(
    () => session.authorize((token) => api.loadCurrentSeatingPlan!(token, booking.bookingId)),
    [session, booking.bookingId],
  );
  const state = useRead(load, revision);
  const command = useCommand(() => {});
  const plan = state.data;
  const bounds = plan ? seatingBounds(plan.renderSnapshot) : ([0, 0, 100, 100] as const);
  const readOnly = closed(booking.phase);
  return (
    <View style={{ gap: 16 }}>
      <ReadState state={state} />
      {!state.loading && !state.error && !plan && (
        <Notice>
          Chưa có sơ đồ bàn. Hai bạn chọn mẫu và gắn nhóm khách cho từng bàn trên web. Sơ đồ sẽ hiện
          ở đây để xem nhanh.
        </Notice>
      )}
      {plan && (
        <>
          <Section title={plan.layoutName}>
            <Text>
              Bản {plan.revisionNumber} ·{' '}
              {plan.status === 'CONFIRMED'
                ? 'Đã xác nhận'
                : plan.status === 'REQUIRES_REVIEW'
                  ? 'Cần xem lại'
                  : 'Bản nháp'}
            </Text>
            <Text>
              {plan.renderSnapshot.length} bàn · {plan.totalSeatCapacity} chỗ · dự kiến{' '}
              {plan.expectedAttendees} khách
            </Text>
            <Text style={s.muted}>
              Mẫu phù hợp {plan.minGuests}–{plan.maxGuests} khách
            </Text>
            {plan.warnings.map((warning, index) => (
              <Notice key={index}>{warning}</Notice>
            ))}
          </Section>
          <View
            onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
            style={{ borderWidth: 1, borderColor: hy.rule, backgroundColor: hy.surface }}
          >
            <ScrollView style={{ maxHeight: 350 }} nestedScrollEnabled>
              <ScrollView horizontal nestedScrollEnabled>
                <Svg
                  accessibilityLabel={`Sơ đồ ${plan.renderSnapshot.length} bàn`}
                  width={Math.max(width, 1) * zoom}
                  height={Math.max(width, 1) * zoom}
                  viewBox={bounds.join(' ')}
                >
                  {plan.renderSnapshot.map((table) => {
                    const cx = table.x + table.width / 2;
                    const cy = table.y + table.height / 2;
                    const color =
                      table.color && /^#[0-9a-fA-F]{6}$/.test(table.color)
                        ? table.color
                        : hy.primary;
                    return (
                      <G key={table.layoutTableId}>
                        <G transform={`rotate(${table.rotationDegrees} ${cx} ${cy})`}>
                          {table.shape === 'RECTANGLE' ? (
                            <Rect
                              x={table.x}
                              y={table.y}
                              width={table.width}
                              height={table.height}
                              rx={4}
                              fill={color}
                              fillOpacity={0.18}
                              stroke={color}
                              strokeWidth={2}
                            />
                          ) : (
                            <Ellipse
                              cx={cx}
                              cy={cy}
                              rx={table.width / 2}
                              ry={table.height / 2}
                              fill={color}
                              fillOpacity={0.18}
                              stroke={color}
                              strokeWidth={2}
                            />
                          )}
                        </G>
                        <SvgText
                          x={cx}
                          y={cy}
                          textAnchor="middle"
                          alignmentBaseline="middle"
                          fontFamily={hy.medium}
                          fontSize={Math.max(
                            6,
                            Math.min(
                              14,
                              (table.width * 0.8) / Math.max(table.tableLabel.length * 0.6, 1),
                            ),
                          )}
                          fill={hy.ink}
                        >
                          {table.tableLabel}
                        </SvgText>
                      </G>
                    );
                  })}
                </Svg>
              </ScrollView>
            </ScrollView>
          </View>
          <View style={s.row}>
            <Action
              label="Thu nhỏ sơ đồ"
              secondary
              disabled={zoom <= 1}
              onPress={() => setZoom((value) => Math.max(1, value - 0.5))}
            />
            <Action
              label="Phóng to sơ đồ"
              secondary
              disabled={zoom >= 4}
              onPress={() => setZoom((value) => Math.min(4, value + 0.5))}
            />
          </View>
          <Section title="Nhóm theo bàn">
            {plan.renderSnapshot.map((table) => (
              <Text key={table.layoutTableId}>
                {table.tableLabel}:{' '}
                {table.guestGroupName ? groupLabel(table.guestGroupName) : 'Chưa gắn nhóm'}
              </Text>
            ))}
          </Section>
        </>
      )}
      <Action
        label={readOnly ? 'Xem sơ đồ trên web' : 'Phân bàn trên web'}
        secondary
        disabled={command.pending}
        onPress={() =>
          void command.run(
            () => openWebPrepare(booking.bookingId, '/khong-gian/chuan-bi/khach?xem=so-do'),
            'Đã mở sơ đồ trên web.',
          )
        }
      />
      <Feedback command={command} />
    </View>
  );
}
