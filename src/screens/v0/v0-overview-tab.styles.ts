import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 22,
    paddingTop: 18,
    paddingBottom: 96,
  },
  topbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  topbarLeft: {
    flex: 1,
  },
  eyebrow: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  heading: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '600',
  },
  iconButton: {
    minWidth: 44,
    minHeight: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eventAnchor: {
    borderRadius: 10,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 16,
  },
  dateBlock: {
    alignItems: 'center',
    paddingRight: 16,
    borderRightWidth: 1,
    borderRightColor: 'rgba(255, 255, 255, 0.25)',
  },
  dateDay: {
    fontSize: 32,
    lineHeight: 38,
    fontWeight: '700',
  },
  dateMonthYear: {
    fontSize: 11,
    lineHeight: 14,
    textAlign: 'center',
    fontWeight: '500',
  },
  eventDetail: {
    flex: 1,
  },
  eventSub: {
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '500',
    opacity: 0.85,
    marginBottom: 2,
  },
  eventVenue: {
    fontSize: 16,
    lineHeight: 21,
    fontWeight: '600',
    marginBottom: 2,
  },
  eventHall: {
    fontSize: 12,
    lineHeight: 16,
  },
  nextAction: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 16,
    marginBottom: 20,
  },
  sectionLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  labelLine: {
    width: 3,
    height: 12,
    borderRadius: 2,
  },
  sectionLabel: {
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '700',
  },
  actionMain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionCopy: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 14,
    lineHeight: 19,
    fontWeight: '600',
    marginBottom: 2,
  },
  actionDesc: {
    fontSize: 12,
    lineHeight: 16,
  },
  textButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(74, 93, 78, 0.08)',
    minHeight: 44,
  },
  textButtonLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  sectionBlock: {
    marginBottom: 20,
  },
  sectionHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    lineHeight: 21,
    fontWeight: '600',
  },
  subtleButton: {
    fontSize: 12,
    fontWeight: '600',
  },
  countBadge: {
    fontSize: 12,
  },
  milestoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    gap: 14,
  },
  milestoneDate: {
    alignItems: 'center',
    paddingRight: 14,
    borderRightWidth: 1,
    width: 68,
  },
  milestoneDay: {
    fontSize: 18,
    lineHeight: 23,
    fontWeight: '700',
  },
  milestoneMonth: {
    fontSize: 10,
    lineHeight: 14,
    fontWeight: '600',
  },
  milestoneInfo: {
    flex: 1,
  },
  milestoneTitle: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
    marginBottom: 2,
  },
  milestoneSub: {
    fontSize: 11,
    lineHeight: 15,
  },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    gap: 12,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  taskCopy: {
    flex: 1,
  },
  taskLabel: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
    marginBottom: 2,
  },
  taskDoneText: {
    textDecorationLine: 'line-through',
    opacity: 0.6,
  },
  taskDetail: {
    fontSize: 11,
    lineHeight: 15,
  },
  chevronTarget: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
