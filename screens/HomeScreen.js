import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const Colors = {
  background: '#FFFFFF',
  textPrimary: '#1C1C1C',
};

const HomeScreen = ({ user }) => {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Hello, {user ? user.name : 'User'}!</Text>
        <Text style={styles.instructionText}>
          Welcome to your Smart Reminder Dashboard.
        </Text>
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
  instructionText: {
    fontSize: 14,
    marginBottom: 50,
    textAlign: 'center',
    color: Colors.textPrimary,
  }
});

export default HomeScreen;