import { StyleSheet } from 'react-native';

import { hy, spacing } from '@/theme';

export const styles = StyleSheet.create({
  pressed: { opacity: 0.62 },
  authContent: { flexGrow: 1, paddingBottom: spacing.xxl },
  authBrand: {
    width: '100%',
    maxWidth: 440,
    alignSelf: 'center',
    flexDirection: 'row',
    gap: 12,
    paddingTop: 24,
    paddingBottom: 24,
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  authPanel: {
    gap: spacing.md,
    width: '100%',
    maxWidth: 440,
    alignSelf: 'center',
    marginTop: 0,
    padding: 20,
  },
  authTitle: {
    fontFamily: hy.semibold,
    fontSize: 26,
    fontWeight: '500',
    lineHeight: 34,
  },
  authField: { gap: spacing.sm },
  authFieldLabel: { fontSize: 13, fontWeight: '700' },
  authInput: {
    minHeight: 56,
    paddingHorizontal: spacing.md,
    color: '#2B1D22',
    backgroundColor: '#FFFFFF',
    borderColor: '#9A877F',
    borderWidth: 1,
    borderRadius: 12,
    fontSize: 16,
  },
  authPrimaryAction: {
    minHeight: 56,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 12,
  },
  authPrimaryLabel: { fontSize: 14, fontWeight: '600', lineHeight: 21 },
  authTextAction: {
    minHeight: 56,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
});
