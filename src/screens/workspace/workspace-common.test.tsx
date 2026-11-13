import { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { Disclosure, Field } from './workspace-common';

function Draft() {
  const [value, setValue] = useState('');
  return <Field label="Nội dung đang soạn" value={value} onChangeText={setValue} />;
}
it('exposes expansion state and retains a form draft when details are collapsed and reopened', async () => {
  await render(
    <Disclosure title="Thông tin thêm">
      <Draft />
    </Disclosure>,
  );
  expect(screen.queryByLabelText('Nội dung đang soạn')).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: 'Thông tin thêm', expanded: false }));
  await fireEvent.changeText(screen.getByLabelText('Nội dung đang soạn'), 'Giữ nội dung này');
  await fireEvent.press(screen.getByRole('button', { name: 'Thông tin thêm', expanded: true }));
  expect(screen.queryByLabelText('Nội dung đang soạn')).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: 'Thông tin thêm', expanded: false }));
  expect(screen.getByLabelText('Nội dung đang soạn')).toHaveProp('value', 'Giữ nội dung này');
});
