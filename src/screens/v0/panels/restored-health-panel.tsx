import React, { useState } from 'react';
import { Text } from 'react-native';
import { api, message, Button, ErrorNote, Panel } from './panels-common';

export function RestoredHealthPanel() {
  const [value, setValue] = useState<{ live: string; ready: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const load = async () => {
    setPending(true);
    setError(null);
    const results = await Promise.allSettled([api.liveHealth(), api.readyHealth()]);
    setValue({
      live: results[0].status === 'fulfilled' ? results[0].value.status : 'Không xác định',
      ready: results[1].status === 'fulfilled' ? results[1].value.status : 'Không xác định',
    });
    const failure = results.find((r) => r.status === 'rejected');
    if (failure?.status === 'rejected') setError(message(failure.reason));
    setPending(false);
  };
  return (
    <Panel title="Trạng thái hệ thống">
      <Text>Máy chủ: {value?.live ?? 'Chưa kiểm tra'}</Text>
      <Text>Sẵn sàng: {value?.ready ?? 'Chưa kiểm tra'}</Text>
      <ErrorNote error={error} />
      <Button label="Kiểm tra trạng thái" disabled={pending} onPress={() => void load()} />
    </Panel>
  );
}
