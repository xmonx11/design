import React from 'react';
import { View, Text, StyleSheet, Button } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const Colors = {
  redAccent: '#FF3B30',
  textPrimary: '#1C1C1C',
};

const ProfileScreen = ({ onLogout }) => {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>User Profile</Text>
        <Text style={styles.text}>Manage your account settings.</Text>
        <View style={{ marginTop: 20 }}>
          <Button 
            title="Logout" 
            onPress={onLogout} 
            color={Colors.redAccent} 
          />
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 10, color: Colors.textPrimary },
  text: { fontSize: 16, color: '#696969' },
});

export default ProfileScreen;