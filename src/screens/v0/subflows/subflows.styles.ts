import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 32,
  },
  calloutCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 16,
  },
  calloutTitle: {
    fontSize: 14,
    lineHeight: 19,
    fontWeight: '600',
  },
  calloutSubtitle: {
    fontSize: 12,
    lineHeight: 17,
    marginTop: 4,
  },
  scheduleList: {
    marginTop: 8,
  },
  scheduleRow: {
    flexDirection: 'row',
    paddingVertical: 14,
    gap: 12,
  },
  scheduleTimeWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    width: 68,
  },
  scheduleTime: {
    fontSize: 13,
    fontWeight: '600',
  },
  scheduleBody: {
    flex: 1,
  },
  scheduleHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  scheduleItemTitle: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
  },
  scheduleItemDesc: {
    fontSize: 11,
    lineHeight: 15,
  },
  emptyCard: {
    padding: 18,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(74, 93, 78, 0.14)',
    alignItems: 'flex-start',
    gap: 8,
  },
  emptyCardTitle: {
    fontSize: 14,
    lineHeight: 19,
    fontWeight: '600',
  },
  emptyCardDesc: {
    fontSize: 12,
    lineHeight: 17,
  },
  policyBlock: {
    padding: 14,
    borderRadius: 16,
    backgroundColor: 'rgba(74, 93, 78, 0.06)',
    marginTop: 10,
  },
  policyTitle: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
    marginBottom: 6,
  },
  policyText: {
    fontSize: 12,
    lineHeight: 18,
  },
  factRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 3,
  },
  input: {
    minHeight: 56,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    fontSize: 13,
  },
  primaryButton: {
    minHeight: 56,
    paddingHorizontal: 18,
    borderRadius: 28,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
