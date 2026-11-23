import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';

// Temporary screen until the real screens land in M1-10.
export function PlaceholderScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Mental Maths</Text>
      <Text>Voice trainer coming soon.</Text>
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
  },
});
