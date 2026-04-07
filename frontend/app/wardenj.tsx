import { View, Text, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import { useState, useEffect } from 'react';
import axios from 'axios';

export default function WardenDashboard() {
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Change 'localhost' to '10.0.2.2' if using Android Emulator
    // Or use your Computer's IP address if using physical phone
    const fetchStaff = async () => {
      try {
        const response = await axios.get('http://localhost:3000/api/warden/staff');
        setStaff(response.data);
      } catch (error) {
        console.error("Fetch error:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStaff();
  }, []);

  if (loading) return <ActivityIndicator size="large" style={{flex: 1}} />;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Staff Members</Text>
      <FlatList
        data={staff}
        keyExtractor={(item) => item._id}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.name}>{item.name}</Text>
            <Text>{item.staffSpecialization}</Text>
          </View>
        )}
        ListEmptyComponent={<Text>No staff found. Add some in the DB!</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#fff', paddingTop: 60 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20 },
  card: { padding: 15, backgroundColor: '#f9f9f9', marginBottom: 10, borderRadius: 8, borderLeftWidth: 5, borderLeftColor: '#007AFF' },
  name: { fontSize: 18, fontWeight: 'bold' }
});