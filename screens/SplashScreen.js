import React from 'react';
import { View, Text, StyleSheet, StatusBar, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient'; 
import { SafeAreaView } from 'react-native-safe-area-context'; 

const Colors = {
  background: 'white', 
  orangeAccent: '#FF8C00', 
  redAccent: '#FF3B30', 
  textPrimary: 'black', 
  textSecondary: '#696969', 
};

const GradientLogo = () => (
  <View style={styles.iconContainer}>
    <Image 
      source={require('../assets/logo.gif')} 
      style={styles.logoImage}
      resizeMode="cover" 
    />
  </View>
);

const SplashScreen = () => {
  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background} /> 
      
      <View style={styles.content}>
        <GradientLogo />
        
        <Text style={styles.title}>SMART REMINDER</Text>
        
        <Text style={styles.tagline}>
          Your daily productivity companion.
        </Text>
      </View>
      
      <View style={styles.footer} />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background, 
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%', 
  },
  iconContainer: {
    marginBottom: 40,
    width: 180, 
    height: 180, 
    borderRadius: 90, 
    overflow: 'hidden', 
  },
  logoImage: { 
    width: '100%', 
    height: '100%', 
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: Colors.textPrimary,
    letterSpacing: 2, 
    marginBottom: 8,
  },
  tagline: {
    fontSize: 16,
    color: Colors.textSecondary, 
    fontWeight: '400',
    opacity: 0.85,
  },
  footer: {
    paddingBottom: 20,
  }
});

export default SplashScreen;