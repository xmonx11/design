import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  StatusBar,
  Image,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Dimensions,
  ScrollView
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { User, Mail, Lock, Eye, EyeOff, ArrowRight, CheckCircle2 } from 'lucide-react-native';
import { useSQLiteContext } from 'expo-sqlite'; 
import { insertUser } from '../services/Database'; 
import { useTheme } from '../context/ThemeContext';
import CustomAlert from '../components/CustomAlert';

const { width, height } = Dimensions.get('window');

const SignUpScreen = ({ onSignUp, onBackToLogin }) => {
  const { colors } = useTheme();
  const db = useSQLiteContext();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isConfirmPasswordVisible, setIsConfirmPasswordVisible] = useState(false);
  
  const [passwordError, setPasswordError] = useState(''); 
  const [confirmPasswordError, setConfirmPasswordError] = useState(''); 

  // --- Animations ---
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

  const validatePasswordStrength = (pwd) => {
    if (pwd.length < 8) return 'Password must be at least 8 characters.';
    if (!/[A-Z]/.test(pwd)) return 'Password must contain an uppercase letter.';
    if (!/[0-9]/.test(pwd)) return 'Password must contain a number.';
    return '';
  };

  const validateMatch = (pwd1, pwd2) => pwd1 !== pwd2 ? 'Passwords do not match.' : '';

  const handlePasswordChange = (text) => {
    setPassword(text);
    setPasswordError(text.length ? validatePasswordStrength(text) : '');
    if (confirmPassword.length > 0) {
        setConfirmPasswordError(validateMatch(text, confirmPassword));
    }
  };

  const handleConfirmPasswordChange = (text) => {
    setConfirmPassword(text);
    setConfirmPasswordError(text.length ? validateMatch(password, text) : '');
  };

  const handleSignUp = async () => { 
    const strengthError = validatePasswordStrength(password);
    const matchError = validateMatch(password, confirmPassword);

    setPasswordError(strengthError);
    setConfirmPasswordError(matchError);
    
    if (!name || !email || !password || !confirmPassword) {
      showAlert('Missing Fields', 'Please fill in all fields.', 'error');
      return;
    }
    
    if (strengthError || matchError) {
      showAlert('Validation Error', 'Please correct the errors before proceeding.', 'error');
      return;
    }

    try {
      const newUser = await insertUser(db, name, email, password); 
      showAlert('Success', 'Account created successfully!', 'success', [{
          text: 'Get Started',
          onPress: () => { 
              closeAlert();
              if (onSignUp) onSignUp(newUser); 
          }
      }]);
    } catch (error) {
      if (error.message.includes('already registered')) {
        showAlert('Signup Failed', error.message, 'error');
      } else {
        console.error('Signup database error:', error); 
        showAlert('Signup Error', 'An error occurred during signup. Please try again.', 'error');
      }
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

      {/* Decorative Background Elements (Matching Login Screen) */}
      <View style={[styles.circleOne, { backgroundColor: colors.accentOrange + '20' }]} />
      <View style={[styles.circleTwo, { backgroundColor: colors.purpleAccent + '20' }]} />

      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView
            style={styles.keyboardView}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                
                {/* Header Section */}
                <Animated.View style={[styles.headerContainer, { transform: [{ scale: logoScale }], opacity: fadeAnim }]}>
                    <View style={[styles.logoWrapper, { shadowColor: colors.accentOrange }]}>
                        <Image 
                            source={require('../assets/logo.gif')} 
                            style={styles.logoImage} 
                            resizeMode="cover" 
                        />
                    </View>
                    <Text style={[styles.title, { color: colors.textPrimary }]}>Join Us!</Text>
                    <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Create your account to get started</Text>
                </Animated.View>

                {/* Form Section */}
                <Animated.View style={[styles.formContainer, { opacity: fadeAnim }]}>
                    
                    {/* Name Input */}
                    <View style={[styles.inputWrapper, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        <User size={20} color={colors.textSecondary} style={styles.inputIcon} />
                        <TextInput
                            style={[styles.input, { color: colors.textPrimary }]}
                            placeholder="Full Name"
                            placeholderTextColor={colors.textSecondary}
                            value={name}
                            onChangeText={setName}
                        />
                    </View>

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
                    <View style={[styles.inputWrapper, { backgroundColor: colors.card, borderColor: passwordError ? colors.cancelRed : colors.border }]}>
                        <Lock size={20} color={colors.textSecondary} style={styles.inputIcon} />
                        <TextInput
                            style={[styles.input, { color: colors.textPrimary }]}
                            placeholder="Password"
                            placeholderTextColor={colors.textSecondary}
                            value={password}
                            onChangeText={handlePasswordChange}
                            secureTextEntry={!isPasswordVisible}
                        />
                        <TouchableOpacity onPress={() => setIsPasswordVisible(!isPasswordVisible)} style={styles.eyeIcon}>
                            {isPasswordVisible ? <EyeOff size={20} color={colors.textSecondary} /> : <Eye size={20} color={colors.textSecondary} />}
                        </TouchableOpacity>
                    </View>
                    {passwordError ? <Text style={[styles.errorText, { color: colors.cancelRed }]}>{passwordError}</Text> : null}

                    {/* Confirm Password Input */}
                    <View style={[styles.inputWrapper, { backgroundColor: colors.card, borderColor: confirmPasswordError ? colors.cancelRed : colors.border }]}>
                        <Lock size={20} color={colors.textSecondary} style={styles.inputIcon} />
                        <TextInput
                            style={[styles.input, { color: colors.textPrimary }]}
                            placeholder="Confirm Password"
                            placeholderTextColor={colors.textSecondary}
                            value={confirmPassword}
                            onChangeText={handleConfirmPasswordChange}
                            secureTextEntry={!isConfirmPasswordVisible}
                        />
                        <TouchableOpacity onPress={() => setIsConfirmPasswordVisible(!isConfirmPasswordVisible)} style={styles.eyeIcon}>
                            {isConfirmPasswordVisible ? <EyeOff size={20} color={colors.textSecondary} /> : <Eye size={20} color={colors.textSecondary} />}
                        </TouchableOpacity>
                    </View>
                    {confirmPasswordError ? <Text style={[styles.errorText, { color: colors.cancelRed }]}>{confirmPasswordError}</Text> : null}

                    {/* Sign Up Button */}
                    <TouchableOpacity onPress={handleSignUp} activeOpacity={0.8} style={styles.signUpBtnWrapper}>
                        <LinearGradient
                            colors={[colors.accentOrange, colors.progressRed]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.signUpBtn}
                        >
                            <Text style={styles.signUpBtnText}>Create Account</Text>
                            
                        </LinearGradient>
                    </TouchableOpacity>

                </Animated.View>

                {/* Footer */}
                <View style={styles.footer}>
                    <Text style={[styles.footerText, { color: colors.textSecondary }]}>Already have an account? </Text>
                    <TouchableOpacity onPress={onBackToLogin}>
                        <Text style={[styles.loginLink, { color: colors.accentOrange }]}>Login</Text>
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
    top: -height * 0.15,
    right: -width * 0.2,
    width: width * 0.7,
    height: width * 0.7,
    borderRadius: width * 0.35,
  },
  circleTwo: {
    position: 'absolute',
    bottom: -height * 0.1,
    left: -width * 0.2,
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
    marginBottom: 30,
  },
  logoWrapper: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 15,
    elevation: 8,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    backgroundColor: '#fff', 
    padding: 2,
  },
  logoImage: {
    width: '100%',
    height: '100%',
    borderRadius: 50,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 5,
    letterSpacing: 0.5,
  },
  subtitle: {
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
  errorText: {
    fontSize: 12,
    marginTop: -10,
    marginBottom: 10,
    marginLeft: 5,
  },
  signUpBtnWrapper: {
    marginTop: 10,
    shadowColor: '#FF4500',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  signUpBtn: {
    flexDirection: 'row',
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  signUpBtnText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
  },

  // Footer
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 30,
    marginBottom: 10,
  },
  footerText: {
    fontSize: 15,
  },
  loginLink: {
    fontSize: 15,
    fontWeight: 'bold',
  },
});

export default SignUpScreen;