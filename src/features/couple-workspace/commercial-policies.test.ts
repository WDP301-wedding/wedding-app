import {
  inputLine,
  selectionDifferences,
  selectionValidation,
  type PricedLine,
} from './commercial-policies';

const menu: PricedLine = {
  category: 'MENU',
  sourceId: 'menu',
  sourceRevisionId: 'old',
  quantity: 10,
  name: 'Thực đơn đã chốt',
  description: '',
  unit: 'table',
  unitPriceVnd: 1000000,
  lineTotalVnd: 10000000,
};
const options = { planningHeadcount: 95, hallMaxGuests: 120, maximumTables: 12 };
it('compares submitted and contract snapshots including price and version changes', () => {
  const after = {
    ...menu,
    sourceRevisionId: 'new',
    quantity: 11,
    unitPriceVnd: 2000000,
    description: 'Đổi món',
  };
  expect(selectionDifferences([menu], [after])).toEqual([
    {
      name: menu.name,
      kind: 'changed',
      fields: ['số lượng', 'đơn giá', 'mô tả', 'phiên bản hạng mục'],
    },
  ]);
  expect(selectionDifferences([menu], [])).toEqual([
    { name: menu.name, kind: 'removed', fields: [] },
  ]);
});
it('preserves unchanged frozen prices but requires the live revision when changing quantity', () => {
  const catalog = [{ ...menu, sourceRevisionId: 'new', unitPriceVnd: 2000000 }];
  expect(
    selectionValidation([inputLine(menu)], catalog, {
      ...options,
      frozen: [menu],
      reason: 'Giữ nguyên',
    }),
  ).toBeNull();
  expect(
    selectionValidation([{ ...inputLine(menu), quantity: 11 }], catalog, {
      ...options,
      frozen: [menu],
      reason: 'Thêm bàn',
    }),
  ).toContain('giá hiện hành');
  expect(
    selectionValidation([{ ...inputLine(menu), sourceRevisionId: 'new', quantity: 11 }], catalog, {
      ...options,
      frozen: [menu],
      reason: 'Thêm bàn',
    }),
  ).toBeNull();
});
it('allows discontinued items only unchanged or removed and preserves the capacity limit', () => {
  expect(
    selectionValidation([inputLine(menu)], [], {
      ...options,
      frozen: [menu],
      reason: 'Giữ nguyên',
    }),
  ).toBeNull();
  expect(
    selectionValidation([{ ...inputLine(menu), quantity: 11 }], [], {
      ...options,
      frozen: [menu],
      reason: 'Thêm bàn',
    }),
  ).toContain('ngừng bán');
  expect(selectionValidation([{ ...inputLine(menu), quantity: 13 }], [menu], options)).toContain(
    '12 bàn',
  );
  expect(selectionValidation([{ ...inputLine(menu), quantity: 9 }], [menu], options)).toContain(
    '10 bàn',
  );
  expect(
    selectionValidation([inputLine(menu)], [menu], { ...options, frozen: [menu], reason: '' }),
  ).toContain('lý do');
});
