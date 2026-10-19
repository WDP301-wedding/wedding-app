import { AndroidIdentitySession, createIdentityApi, createSecureRefreshStore } from './session';

let sharedDeviceSessionInstance: AndroidIdentitySession | null = null;

export function getSharedDeviceSession(): AndroidIdentitySession {
  if (!sharedDeviceSessionInstance) {
    sharedDeviceSessionInstance = new AndroidIdentitySession(
      createIdentityApi(),
      createSecureRefreshStore(),
    );
  }
  return sharedDeviceSessionInstance;
}

export const sharedDeviceSession = getSharedDeviceSession();
