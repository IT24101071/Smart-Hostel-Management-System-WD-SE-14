import { View, Text, StyleSheet, ScrollView } from 'react-native';

export default function WardenDashboard() {
  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Warden Dashboard</Text>
      <Text style={styles.subtitle}>Welcome, Jathusha!</Text>
      
      <View style={styles.card}>
        <Text style={styles.cardText}>Manage Staff Members</Text>
        {/* We will add a Button here later to add new staff */}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#fff' },
  title: { fontSize: 24, fontWeight: 'bold', marginTop: 40 },
  subtitle: { fontSize: 16, color: 'gray', marginBottom: 20 },
  card: { padding: 20, backgroundColor: '#f9f9f9', borderRadius: 10, borderWidth: 1, borderColor: '#ddd' },
  cardText: { fontSize: 18, fontWeight: '600' }
});