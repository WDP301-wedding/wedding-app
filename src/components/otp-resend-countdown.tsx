import { memo, useEffect, useState } from 'react';
import type { StyleProp, TextStyle } from 'react-native';
import { HyText } from './hy-ui';

/** Only this label ticks; the profile form and session inventory stay untouched. */
export const OtpResendCountdown = memo(function OtpResendCountdown({
  seconds,
  onComplete,
  style,
}: {
  seconds: number;
  onComplete: () => void;
  style?: StyleProp<TextStyle>;
}) {
  const [deadline] = useState(() => Date.now() + seconds * 1000);
  const [remaining, setRemaining] = useState(seconds);
  useEffect(() => {
    const timer = setInterval(() => {
      const next = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      setRemaining(next);
      if (next === 0) {
        clearInterval(timer);
        onComplete();
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [deadline, onComplete]);
  return <HyText style={style}>Gửi lại sau {remaining}s</HyText>;
});
