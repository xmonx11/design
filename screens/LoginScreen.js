import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  StatusBar, Image, KeyboardAvoidingView, Platform, Animated, Dimensions, ScrollView
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSQLiteContext } from 'expo-sqlite';
import { getUser } from '../services/Database';
import { Mail, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react-native'; // Updated icons
import { useTheme } from '../context/ThemeContext';
import CustomAlert from '../components/CustomAlert';

const { width, height } = Dimensions.get('window');

const LoginScreen = ({ onLoginSuccess, onSignUpPress }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const db = useSQLiteContext();
  const { colors } = useTheme();

  // --- Custom Alert State ---
  const [alertConfig, setAlertConfig] = useState({
    visible: false,
    title: '',
    message: '',
    type: 'info',
    buttons: []
  });

  const showAlert = (title, message, type = 'info', buttons = []) => {
    setAlertConfig({ visible: true, title, message, type, buttons });
  };

  const closeAlert = () => {
    setAlertConfig(prev => ({ ...prev, visible: false }));
  };

  // Animations
  const logoScale = useRef(new Animated.Value(0.8)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
        Animated.spring(logoScale, {
            toValue: 1,
            friction: 6,
            useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
        })
    ]).start();
  }, []);

  const handleLogin = async () => {
    try {
      if (!email || !password) {
         showAlert('Missing Fields', 'Please enter both email and password.', 'error');
         return;
      }

      const users = await getUser(db, email, password);

      if (users.length > 0) {
        onLoginSuccess(users[0]);
      } else {
        showAlert('Login Failed', 'Invalid email or password.', 'error');
      }
    } catch (err) {
      console.error('Login database error:', err);
      showAlert('Error', 'An unexpected error occurred.', 'error');
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

      {/* Decorative Background Elements */}
      <View style={[styles.circleOne, { backgroundColor: colors.accentOrange + '20' }]} />
      <View style={[styles.circleTwo, { backgroundColor: colors.purpleAccent + '20' }]} />

      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView
            style={styles.keyboardView}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                
                {/* Header / Logo Section */}
                <Animated.View style={[styles.headerContainer, { transform: [{ scale: logoScale }], opacity: fadeAnim }]}>
                    <View style={[styles.logoWrapper, { shadowColor: colors.accentOrange }]}>
                        <Image
                            source={require('../assets/logo.gif')}
                            style={styles.logoImage}
                            resizeMode="cover"
                        />
                    </View>
                    <Text style={[styles.appName, { color: colors.textPrimary }]}>Smart Scheduler</Text>
                    <Text style={[styles.tagline, { color: colors.textSecondary }]}>Plan smarter, achieve more.</Text>
                </Animated.View>

                {/* Form Section */}
                <Animated.View style={[styles.formContainer, { opacity: fadeAnim }]}>
                    
                    {/* Email Input */}
                    <View style={[styles.inputWrapper, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        <Mail size={20} color={colors.textSecondary} style={styles.inputIcon} />
                        <TextInput
                            style={[styles.input, { color: colors.textPrimary }]}
                            placeholder="Email Address"
                            placeholderTextColor={colors.textSecondary}
                            value={email}
                            onChangeText={setEmail}
                            keyboardType="email-address"
                            autoCapitalize="none"
                        />
                    </View>

                    {/* Password Input */}
                    <View style={[styles.inputWrapper, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        <Lock size={20} color={colors.textSecondary} style={styles.inputIcon} />
                        <TextInput
                            style={[styles.input, { color: colors.textPrimary }]}
                            placeholder="Password"
                            placeholderTextColor={colors.textSecondary}
                            value={password}
                            onChangeText={setPassword}
                            secureTextEntry={!showPassword}
                        />
                        <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
                            {showPassword ? 
                                <EyeOff size={20} color={colors.textSecondary} /> : 
                                <Eye size={20} color={colors.textSecondary} />
                            }
                        </TouchableOpacity>
                    </View>

                    <TouchableOpacity style={styles.forgotPass}>
                        <Text style={[styles.forgotPassText, { color: colors.textSecondary }]}>Forgot Password?</Text>
                    </TouchableOpacity>

                    {/* Login Button */}
                    <TouchableOpacity onPress={handleLogin} activeOpacity={0.8} style={styles.loginBtnWrapper}>
                        <LinearGradient
                            colors={[colors.accentOrange, colors.progressRed]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.loginBtn}
                        >
                            <Text style={styles.loginBtnText}>Sign In</Text>
                           
                        </LinearGradient>
                    </TouchableOpacity>

                </Animated.View>

                {/* Footer */}
                <View style={styles.footer}>
                    <Text style={[styles.footerText, { color: colors.textSecondary }]}>Don't have an account? </Text>
                    <TouchableOpacity onPress={onSignUpPress}>
                        <Text style={[styles.signupText, { color: colors.accentOrange }]}>Create Account</Text>
                    </TouchableOpacity>
                </View>

            </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>

      {/* Custom Alert */}
      <CustomAlert 
        visible={alertConfig.visible}
        title={alertConfig.title}
        message={alertConfig.message}
        type={alertConfig.type}
        buttons={alertConfig.buttons}
        onClose={closeAlert}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  // Background Decorations
  circleOne: {
    position: 'absolute',
    top: -height * 0.1,
    left: -width * 0.2,
    width: width * 0.7,
    height: width * 0.7,
    borderRadius: width * 0.35,
  },
  circleTwo: {
    position: 'absolute',
    bottom: -height * 0.1,
    right: -width * 0.2,
    width: width * 0.8,
    height: width * 0.8,
    borderRadius: width * 0.4,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 30,
    paddingVertical: 20,
  },
  
  // Header
  headerContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoWrapper: {
    width: 110,
    height: 110,
    borderRadius: 55,
    marginBottom: 20,
    elevation: 10,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    backgroundColor: '#fff', 
    padding: 2, // Border effect
  },
  logoImage: {
    width: '100%',
    height: '100%',
    borderRadius: 55,
  },
  appName: {
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 5,
    letterSpacing: 0.5,
  },
  tagline: {
    fontSize: 16,
    fontWeight: '500',
  },

  // Form
  formContainer: {
    width: '100%',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 15,
    marginBottom: 15,
    height: 56,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    height: '100%',
  },
  eyeIcon: {
    padding: 8,
  },
  forgotPass: {
    alignSelf: 'flex-end',
    marginBottom: 25,
  },
  forgotPassText: {
    fontSize: 14,
    fontWeight: '500',
  },
  loginBtnWrapper: {
    shadowColor: '#FF4500',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  loginBtn: {
    flexDirection: 'row',
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loginBtnText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
  },

  // Footer
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 30,
  },
  footerText: {
    fontSize: 15,
  },
  signupText: {
    fontSize: 15,
    fontWeight: 'bold',
  },
});

export default LoginScreen;