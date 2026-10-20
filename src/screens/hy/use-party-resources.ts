import { useCallback } from 'react';
import { createRestoredFlowsGateway } from '@/features/restored-flows/restored-flows-api';
import { createAppInvitationGateway } from '@/features/invitation-studio/app-invitation-api';
import { createCoupleBillingGateway } from '@/features/payments-billing/billing-api';
import type { V0CommonProps } from '../v0/v0-types';
import { resourcePolicy } from './resource-store';
import { useHyResource } from './use-hy-resource';
const api = createRestoredFlowsGateway();
const invitations = createAppInvitationGateway();
const billing = createCoupleBillingGateway();
/** Independent sections publish as soon as their own request completes. */
export function usePartyResources(
  session: V0CommonProps['session'],
  bookingId: string | undefined,
) {
  const proposalLoader = useCallback(() => {
    if (!session || !bookingId) throw new Error('Chưa chọn tiệc.');
    return session.authorize((token) => api.loadProposal(token, bookingId));
  }, [session, bookingId]);
  const contractLoader = useCallback(() => {
    if (!session || !bookingId) throw new Error('Chưa chọn tiệc.');
    return session.authorize((token) => api.readContracts(token, bookingId));
  }, [session, bookingId]);
  const billingLoader = useCallback(() => {
    if (!session || !bookingId) throw new Error('Chưa chọn tiệc.');
    return session.authorize((token) => billing.load(token, bookingId));
  }, [session, bookingId]);
  const restaurantLoader = useCallback(() => invitations.getRestaurantCatalog(), []);
  const enabled = Boolean(session && bookingId);
  const proposal = useHyResource(proposalLoader, {
    key: bookingId ? `booking:${bookingId}:proposal` : undefined,
    enabled,
    ttlMs: resourcePolicy.bookingTtlMs,
  });
  const contracts = useHyResource(contractLoader, {
    key: bookingId ? `booking:${bookingId}:contracts` : undefined,
    enabled,
    ttlMs: resourcePolicy.bookingTtlMs,
  });
  // Billing tab caches a view/error envelope; raw billing deliberately uses a different key.
  const ledger = useHyResource(billingLoader, {
    key: bookingId ? `booking:${bookingId}:ledger` : undefined,
    enabled,
  });
  const restaurant = useHyResource(restaurantLoader, {
    key: 'restaurantCatalog',
    enabled,
    ttlMs: resourcePolicy.catalogTtlMs,
  });
  const reloadProposal = proposal.reload;
  const reloadContracts = contracts.reload;
  const reloadLedger = ledger.reload;
  const reloadRestaurant = restaurant.reload;
  const reload = useCallback(async () => {
    await Promise.all([reloadProposal(), reloadContracts(), reloadLedger(), reloadRestaurant()]);
  }, [reloadProposal, reloadContracts, reloadLedger, reloadRestaurant]);
  return {
    data: {
      proposal: proposal.data,
      contracts: contracts.data,
      billing: ledger.data,
      restaurant: restaurant.data,
    },
    loading: proposal.loading,
    error: proposal.error,
    sectionError: contracts.error ?? ledger.error ?? restaurant.error,
    reload,
  };
}
