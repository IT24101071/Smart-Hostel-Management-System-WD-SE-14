<FlatList
  data={staff}
  keyExtractor={(item) => item._id}
  renderItem={({ item }) => (
   // Inside your FlatList renderItem:
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