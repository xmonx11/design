import React, { useState, useEffect } from 'react';
import SplashScreen from './screens/SplashScreen';
import LoginScreen from './screens/LoginScreen';
import SignUpScreen from './screens/SignUpScreen';
import HomeScreen from './screens/HomeScreen';
import { initDB } from './services/Database'; 
import { SQLiteProvider } from 'expo-sqlite'; 

const ScreenManager = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [currentScreen, setCurrentScreen] = useState('login'); 
  const [loggedInUser, setLoggedInUser] = useState(null);

  useEffect(() => {
    
    setTimeout(() => setIsLoading(false), 3000);
  }, []);

  if (isLoading) return <SplashScreen />;

  if (currentScreen === 'login') {
    return (
      <LoginScreen
        onLoginSuccess={(user) => { 
          setLoggedInUser(user);
          setCurrentScreen('home');
        }} 
        onSignUpPress={() => setCurrentScreen('signup')}
      />
    );
  }

  if (currentScreen === 'signup') {
    return (
      <SignUpScreen
        onSignUp={(user) => {
          setLoggedInUser(user);
          setCurrentScreen('home');
        }}
        onBackToLogin={() => setCurrentScreen('login')}
      />
    );
  }

  if (currentScreen === 'home') {
    return <HomeScreen user={loggedInUser} onLogout={() => setCurrentScreen('login')} />;
  }

  return null;
};

export default function App() {
  return (
    <SQLiteProvider
      databaseName="smartReminderDB.db"
      onInit={initDB} 
      options={{ useNewConnection: false }}
    >
      <ScreenManager />
    </SQLiteProvider>
  );
}