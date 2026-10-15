import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },
  pageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backGlyph: {
    fontSize: 26,
    lineHeight: 28,
  },
  headerTitleWrap: { flex: 1 },
  refreshButton: {
    width: 36,
    height: 36,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '600',

    letterSpacing: 0.5,
  },
  heading: {
    fontSize: 20,
    fontWeight: '700',
    lineHeight: 26,
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    marginBottom: 16,
  },
  tabButton: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginRight: 8,
  },
  tabText: {
    fontSize: 13,
  },
  badge: {
    borderRadius: 16,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  calloutCard: {
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  calloutTitle: {
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 20,
  },
  calloutSubtitle: {
    fontSize: 12,
    lineHeight: 18,
  },
  emptyCard: {
    padding: 24,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    gap: 8,
  },
  emptyCardTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  emptyCardDesc: {
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
  },
  factRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 3,
  },
  prefRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  input: {
    minHeight: 56,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    fontSize: 13,
  },
  primaryButton: {
    minHeight: 38,
    paddingHorizontal: 16,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  outlineButton: {
    minHeight: 32,
    paddingHorizontal: 12,
    borderRadius: 28,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  policyTitle: {
    fontSize: 13,
    fontWeight: '600',
  },
});
