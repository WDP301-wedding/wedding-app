import { StyleSheet } from 'react-native';
import { spacing } from '@/theme';

export const billingStyles = StyleSheet.create({
  screen: { padding: spacing.lg, gap: spacing.lg, flexGrow: 1 },
  section: { gap: spacing.md, paddingVertical: spacing.lg, borderBottomWidth: 1 },
  row: { gap: spacing.xs, paddingVertical: spacing.sm, borderBottomWidth: 1 },
  totals: { gap: spacing.md, padding: spacing.lg, borderWidth: 1, borderRadius: 4 },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: spacing.md,
    fontSize: 16,
  },
  title: { fontSize: 22, fontWeight: '600', lineHeight: 30, letterSpacing: 0 },
  amount: { fontSize: 26, fontWeight: '600', lineHeight: 34, fontVariant: ['tabular-nums'] },
  notice: { padding: spacing.md, gap: spacing.sm, borderWidth: 1, borderRadius: 4 },
});
