import { fireEvent, render, screen } from '@testing-library/react-native';
import { canViewContractPdf, ContractDetails } from './workspace-agreement';
import {
  bookingFixture,
  contractFixture,
  contractListFixture,
  proposalFixture,
  sessionFixture,
} from './workspace-test-support';

it('hides the unsent standard draft PDF and keeps a submitted preview available', () => {
  expect(canViewContractPdf(contractFixture({ state: 'DRAFT', submittedAt: null }))).toBe(false);
  expect(canViewContractPdf(contractFixture({ state: 'AWAITING_APPROVAL' }))).toBe(true);
});
it('locks withdrawal and exposes official PDF for an approved standard contract', async () => {
  const session = await sessionFixture();
  const contract = contractFixture();
  await render(
    <ContractDetails
      session={session}
      booking={bookingFixture()}
      proposal={proposalFixture()}
      revision={0}
      refresh={jest.fn()}
      navigate={jest.fn()}
      contracts={contractListFixture(contract)}
      contract={contract}
    />,
  );
  expect(screen.getByRole('button', { name: 'Mở PDF chính thức' })).toBeOnTheScreen();
  expect(screen.queryByRole('button', { name: 'Rút duyệt hợp đồng' })).toBeNull();
  expect(screen.queryByRole('button', { name: 'Yêu cầu nhà hàng chỉnh sửa' })).toBeNull();
  expect(screen.queryByText(/Giá đã bao gồm VAT/)).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: 'Chi tiết hợp đồng', expanded: false }));
  expect(screen.getByText(/Giá đã bao gồm VAT/)).toBeOnTheScreen();
});
it('keeps the legal details visible before approval while surfacing the immutable total', async () => {
  const contract = contractFixture({ state: 'AWAITING_APPROVAL', approvals: [] });
  await render(
    <ContractDetails
      session={await sessionFixture()}
      booking={bookingFixture({ phase: 'AWAITING_DEPOSIT' })}
      proposal={proposalFixture()}
      revision={0}
      refresh={jest.fn()}
      navigate={jest.fn()}
      contracts={contractListFixture(contract)}
      contract={contract}
    />,
  );
  expect(screen.getByText('10.000.000 ₫')).toBeOnTheScreen();
  expect(
    screen.getByRole('button', { name: 'Chi tiết hợp đồng', expanded: true }),
  ).toBeOnTheScreen();
  expect(screen.getByText(/Giá đã bao gồm VAT/)).toBeOnTheScreen();
  expect(screen.getByRole('button', { name: 'Đồng ý & duyệt hợp đồng' })).toBeEnabled();
});
it('requires explicit server capability before offering contract changes', async () => {
  const session = await sessionFixture();
  const contract = contractFixture({ state: 'AWAITING_APPROVAL', approvals: [] });
  const contracts = contractListFixture(contract);
  const result = await render(
    <ContractDetails
      session={session}
      booking={bookingFixture({ phase: 'AWAITING_DEPOSIT' })}
      proposal={proposalFixture()}
      revision={0}
      refresh={jest.fn()}
      navigate={jest.fn()}
      contracts={{
        ...contracts,
        capabilities: { ...contracts.capabilities, canRequestChanges: false },
      }}
      contract={contract}
    />,
  );
  expect(screen.queryByRole('button', { name: 'Yêu cầu nhà hàng chỉnh sửa' })).toBeNull();
  await result.rerender(
    <ContractDetails
      session={session}
      booking={bookingFixture({ phase: 'AWAITING_DEPOSIT' })}
      proposal={proposalFixture()}
      revision={0}
      refresh={jest.fn()}
      navigate={jest.fn()}
      contracts={contracts}
      contract={contract}
    />,
  );
  expect(screen.getByRole('button', { name: 'Yêu cầu nhà hàng chỉnh sửa' })).toBeDisabled();
});
