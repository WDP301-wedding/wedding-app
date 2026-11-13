import { Host, Picker } from '@expo/ui';
import { hy } from '@/theme';
import type { PrepareSectionPickerProps } from './workspace-prepare';

export function PrepareSectionPicker({ value, onChange, options }: PrepareSectionPickerProps) {
  return (
    <Host matchContents={{ vertical: true }} seedColor={hy.primary} style={{ width: '100%' }}>
      <Picker
        selectedValue={value}
        onValueChange={onChange}
        appearance="menu"
        testID="prepare-section-picker"
      >
        {options.map(([id, label]) => (
          <Picker.Item key={id} value={id} label={label} />
        ))}
      </Picker>
    </Host>
  );
}
