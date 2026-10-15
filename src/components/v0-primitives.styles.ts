import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  bottomNav: {
    flexDirection: 'row',
    borderTopWidth: 1,
    minHeight: 64,
    paddingTop: 8,
    paddingHorizontal: 8,
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
  tabButton: {
    flex: 1,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  tabLabel: {
    fontSize: 10,
    lineHeight: 13,
  },
});
