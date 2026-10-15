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
  outlineButton: {
    minHeight: 56,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  outlineButtonText: {
    fontSize: 13,
    fontWeight: '600',
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
  revisionAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderWidth: 1,
    borderRadius: 16,
    marginBottom: 18,
  },
  revisionAlertText: {
    flex: 1,
  },
  revisionAlertTitle: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
  },
  revisionAlertDesc: {
    fontSize: 11,
    lineHeight: 15,
  },
  formFields: {
    gap: 14,
  },
  formGroup: {
    gap: 6,
  },
  label: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600',
  },
  input: {
    minHeight: 56,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    fontSize: 14,
  },
  textArea: {
    minHeight: 88,
    paddingTop: 10,
    textAlignVertical: 'top',
  },
  saveNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginVertical: 14,
  },
  saveNoteText: {
    fontSize: 11,
    lineHeight: 15,
  },
  shareCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    marginBottom: 20,
  },
  qrContainer: {
    width: 200,
    minHeight: 200,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  shareCardTitle: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '600',
    marginBottom: 4,
  },
  shareCardDesc: {
    fontSize: 12,
    lineHeight: 17,
    textAlign: 'center',
    paddingHorizontal: 8,
    marginBottom: 14,
  },
  shareLinkBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 16,
    marginBottom: 14,
    width: '100%',
  },
  shareLinkText: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '500',
    flex: 1,
  },
  copyButton: {
    minHeight: 56,
    paddingHorizontal: 10,
    justifyContent: 'center',
  },
  simulatedLabel: {
    fontSize: 11,
    lineHeight: 15,
    marginTop: 8,
  },
  secondaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    gap: 12,
  },
  secondaryRowCopy: {
    flex: 1,
  },
  secondaryRowTitle: {
    fontSize: 14,
    lineHeight: 19,
    fontWeight: '600',
  },
  secondaryRowSub: {
    fontSize: 11,
    lineHeight: 15,
  },
  infoCallout: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: 14,
    marginTop: 8,
    borderTopWidth: 1,
  },
  infoCalloutText: {
    fontSize: 11,
    lineHeight: 16,
    flex: 1,
  },
});
