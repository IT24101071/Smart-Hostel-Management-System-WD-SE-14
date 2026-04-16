import React, { useState } from "react";
import {
  FlatList,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from "react-native";

export default function WardenDashboard() {
  const [staff, setStaff] = useState([
    {
      _id: "1",
      name: "John Doe",
      email: "john@example.com",
      isApproved: false,
    },
    {
      _id: "2",
      name: "Jane Smith",
      email: "jane@example.com",
      isApproved: true,
    },
  ]);

  const handleApprove = (id) => {
    const updated = staff.map((item) =>
      item._id === id ? { ...item, isApproved: true } : item,
    );
    setStaff(updated);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Warden Dashboard</Text>
      <Text style={styles.subtitle}>Welcome, Jathusha!</Text>

      <FlatList
        data={staff}
        keyExtractor={(item) => item._id}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.name}>{item.name}</Text>
            <Text>{item.email}</Text>

            {!item.isApproved && (
              <TouchableOpacity
                style={styles.approveButton}
                onPress={() => handleApprove(item._id)}
              >
                <Text style={styles.buttonText}>Approve Student</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
        ListEmptyComponent={<Text>No other Wardens found.</Text>}
      />
    </View>
  );
}
