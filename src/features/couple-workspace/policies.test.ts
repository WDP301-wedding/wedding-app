import {
  balanceGate,
  checkedCheckoutUrl,
  defaultBooking,
  depositPercentage,
  journeyIndex,
  tableCapacityMessage,
  vietnamToday,
} from './policies';

const eligible = { canPay: true, reasonCode: null, nextAction: 'PAY_BALANCE', billingRevision: 4 };

describe('business policies ported from PRM-app', () => {
  it('opens only the source-approved VNPay sandbox host and payment path', () => {
    expect(checkedCheckoutUrl('https://sandbox.vnpayment.vn/paymentv2/vpcpay.html?a=1')).toContain(
      '?a=1',
    );
    for (const value of [
      'http://sandbox.vnpayment.vn/paymentv2/vpcpay.html',
      'https://user@sandbox.vnpayment.vn/paymentv2/vpcpay.html',
      'https://sandbox.vnpayment.vn.evil.example/paymentv2/vpcpay.html',
      'https://sandbox.vnpayment.vn:444/paymentv2/vpcpay.html',
      'https://sandbox.vnpayment.vn/other',
    ])
      expect(() => checkedCheckoutUrl(value)).toThrow();
  });
  it('requires completed event and exact server billing eligibility, even for a positive balance', () => {
    for (const phase of [undefined, 'DRAFT', 'AWAITING_DEPOSIT', 'CONFIRMED', 'CANCELLED']) {
      expect(balanceGate(phase, 4, eligible).allowed).toBe(false);
    }
    expect(balanceGate('COMPLETED', 4, eligible).allowed).toBe(true);
    expect(balanceGate('COMPLETED', 5, eligible).allowed).toBe(false);
    for (const raw of [
      undefined,
      null,
      {},
      { ...eligible, canPay: false },
      { ...eligible, nextAction: 'UNKNOWN' },
      { ...eligible, billingRevision: -1 },
    ]) {
      expect(balanceGate('COMPLETED', 4, raw).allowed).toBe(false);
    }
  });

  it('uses Vietnam calendar dates rather than the host timezone', () => {
    const now = new Date('2026-11-11T18:00:00Z');
    expect(vietnamToday(now)).toBe('2026-11-12');
    expect(journeyIndex('CONFIRMED', '2026-11-12', now)).toBe(4);
    expect(journeyIndex('CONFIRMED', '2026-11-13', now)).toBe(3);
    expect(journeyIndex('CANCELLED', '2026-11-12', now)).toBe(-1);
    expect(journeyIndex('COMPLETED', '2026-11-12', now)).toBe(5);
  });

  it('selects the nearest active event and retains history when none is active', () => {
    const completed = { bookingId: 'old', phase: 'COMPLETED', eventDate: '2026-10-01' };
    const later = { bookingId: 'later', phase: 'CONFIRMED', eventDate: '2026-12-01' };
    const sooner = { bookingId: 'soon', phase: 'AWAITING_DEPOSIT', eventDate: '2026-11-20' };
    expect(defaultBooking([completed, later, sooner])).toBe(sooner);
    expect(defaultBooking([completed])).toBe(completed);
    expect(defaultBooking([])).toBeNull();
  });

  it('preserves 10-per-table, published layout and hall capacity boundaries', () => {
    expect(tableCapacityMessage(95, 10, 12)).toBeNull();
    expect(tableCapacityMessage(101, 10, 12)).toContain('11 bàn');
    expect(tableCapacityMessage(100, 20, 12)).toContain('12 bàn');
    expect(tableCapacityMessage(1, 1, 0)).toContain('chưa có sơ đồ');
    expect(tableCapacityMessage(101, 11, 12, 100)).toContain('100 khách');
  });

  it('keeps the 30% legacy deposit default only for an absent policy snapshot', () => {
    expect(depositPercentage({})).toBe(30);
    expect(depositPercentage({ depositPercentage: 50 })).toBe(50);
    for (const value of [null, '30', 9, 101, 30.5])
      expect(() => depositPercentage({ depositPercentage: value })).toThrow();
  });
});
