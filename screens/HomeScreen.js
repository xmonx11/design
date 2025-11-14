import React from 'react';
import { View, Text, StyleSheet, Button } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const Colors = {
  background: '#FFFFFF',
  textPrimary: '#1C1C1C',
  redAccent: '#FF3B30',
};

const HomeScreen = ({ user, onLogout }) => {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Welcome to Smart Reminder!</Text>
        {user && <Text style={styles.userText}>Logged in as: {user.name} ({user.email})</Text>}
        <Text style={styles.instructionText}>
          This is your main application screen.
        </Text>
        <Button 
          title="Logout" 
          onPress={onLogout} 
          color={Colors.redAccent} 
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    color: Colors.textPrimary,
  },
  userText: {
    fontSize: 16,
    marginBottom: 30,
    textAlign: 'center',
    color: Colors.textPrimary,
  },
  instructionText: {
    fontSize: 14,
    marginBottom: 50,
    textAlign: 'center',
    color: Colors.textPrimary,
  }
});

export default HomeScreen;