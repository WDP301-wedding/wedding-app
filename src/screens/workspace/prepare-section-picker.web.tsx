import { hy } from '@/theme';
import type { PrepareSectionPickerProps } from './workspace-prepare';

// The installed universal web picker cannot forward a label or styling props.
// Keep a native browser select here for keyboard access, theme typography and a 56px target.
export function PrepareSectionPicker({ value, onChange, options }: PrepareSectionPickerProps) {
  return (
    <select
      aria-label="Mục chuẩn bị"
      value={value}
      onChange={(event) => {
        const option = options.find(([id]) => id === event.currentTarget.value);
        if (option) onChange(option[0]);
      }}
      style={{
        width: '100%',
        minWidth: 0,
        minHeight: 56,
        padding: '12px 16px',
        border: `1px solid ${hy.outline}`,
        borderRadius: 8,
        backgroundColor: hy.surface,
        color: hy.primary,
        fontFamily: hy.medium,
        fontSize: 15,
        lineHeight: 1.5,
        cursor: 'pointer',
      }}
    >
      {options.map(([id, label]) => (
        <option key={id} value={id}>
          {label}
        </option>
      ))}
    </select>
  );
}
