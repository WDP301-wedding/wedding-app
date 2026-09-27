import { ScrollView, StyleSheet, Text } from 'react-native';

export function HomeScreen() {
  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content}>
      <Text style={styles.message}>The Android app foundation is ready.</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  message: {
    fontSize: 18,
    lineHeight: 26,
    textAlign: 'center',
  },
});
