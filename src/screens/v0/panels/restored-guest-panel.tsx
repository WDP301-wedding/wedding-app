import React, { useCallback, useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import {
  api,
  message,
  useMutation,
  Button,
  Field,
  ErrorNote,
  Panel,
  type ContextProps,
} from './panels-common';
import { styles } from './panels.styles';

export function RestoredGuestPanel({ activeBooking, session }: ContextProps) {
  const bookingId = activeBooking?.bookingId;
  const [data, setData] = useState<{
    settings: Awaited<ReturnType<typeof api.checkInSettings>>;
    attendance: Awaited<ReturnType<typeof api.attendanceSummary>>;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const mutation = useMutation(session);
  const load = useCallback(async () => {
    if (!session || !bookingId) return;
    try {
      const result = await session.authorize(async (token) => {
        const [settings, attendance] = await Promise.all([
          api.checkInSettings(token, bookingId),
          api.attendanceSummary(token, bookingId),
        ]);
        return { settings, attendance };
      });
      setData(result);
      setError(null);
    } catch (e) {
      setData(null);
      setError(message(e));
    }
  }, [session, bookingId]);
  useEffect(() => {
    const task = setTimeout(() => void load(), 0);
    return () => clearTimeout(task);
  }, [load]);
  if (!session || !bookingId) return null;
  const toggle = async () => {
    if (!data || data.settings.locked) return;
    const body = {
      expectedRevision: data.settings.revision,
      checkInMode:
        data.settings.checkInMode === 'NONE' ? ('BY_GUEST_NAME' as const) : ('NONE' as const),
    };
    if (
      await mutation.run(`${bookingId}:checkin-settings`, body, (key) =>
        session.authorize((token) => api.configureCheckIn(token, bookingId, body, key)),
      )
    )
      await load();
  };
  return (
    <Panel title="Điểm danh theo tên">
      <ErrorNote error={error ?? mutation.error} />
      <Button label="Tải cài đặt và số liệu điểm danh" onPress={() => void load()} />
      {data && (
        <>
          <Text>
            {data.settings.checkInMode === 'NONE'
              ? 'Điểm danh đang tắt — không ghi nhận số khách thực tế.'
              : `Chỉ tính khách có tên: ${data.attendance.checkedInGuestCount ?? 'Chưa ghi nhận'}. Không phải tổng khách dự tiệc.`}
          </Text>
          <Button
            label={
              data.settings.checkInMode === 'NONE'
                ? 'Bật điểm danh theo tên'
                : 'Tắt điểm danh theo tên'
            }
            disabled={mutation.pending || data.settings.locked}
            onPress={() => void toggle()}
          />
        </>
      )}
    </Panel>
  );
}
