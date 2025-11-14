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
  Alert,
  Dimensions
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Eye, EyeOff } from 'lucide-react-native';
import { useSQLiteContext } from 'expo-sqlite'; 
import { insertUser } from '../services/Database'; 

const { width, height } = Dimensions.get('window');

const Colors = {
  primary: '#007AFF',
  background: '#FFFFFF',
  orangeAccent: '#FF8C00',
  redAccent: '#FF3B30',
  textPrimary: '#1C1C1C',
  textSecondary: '#8E8E93',
  inputBackground: '#F7F7F7',
  inputBorder: '#D1D1D6',
  error: '#FF3B30'
};

const SignUpScreen = ({ onSignUp, onBackToLogin }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isConfirmPasswordVisible, setIsConfirmPasswordVisible] = useState(false);
  
  const [passwordError, setPasswordError] = useState(''); 
  const [confirmPasswordError, setConfirmPasswordError] = useState(''); 

  const [isNameFocused, setIsNameFocused] = useState(false);
  const [isEmailFocused, setIsEmailFocused] = useState(false);
  const [isPasswordFocused, setIsPasswordFocused] = useState(false);
  const [isConfirmPasswordFocused, setIsConfirmPasswordFocused] = useState(false);

  const db = useSQLiteContext(); 

  const logoScale = useRef(new Animated.Value(0.8)).current;
  useEffect(() => {
    Animated.spring(logoScale, {
      toValue: 1,
      friction: 6,
      useNativeDriver: true,
    }).start();
  }, []);

  const validatePasswordStrength = (pwd) => {
    if (pwd.length < 8) return 'Password must be at least 8 characters.';
    if (!/[A-Z]/.test(pwd)) return 'Password must contain an uppercase letter.';
    if (!/[0-9]/.test(pwd)) return 'Password must contain a number.';
    if (!/[^a-zA-Z0-9]/.test(pwd)) return 'Password must contain a symbol.';
    return '';
  };

  const validateMatch = (pwd1, pwd2) => pwd1 !== pwd2 ? 'Passwords do not match.' : '';

  const handlePasswordChange = (text) => {
    setPassword(text);
    setPasswordError(text.length ? validatePasswordStrength(text) : '');
    setConfirmPasswordError(confirmPassword.length ? validateMatch(text, confirmPassword) : '');
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
      Alert.alert('Error', 'Please fill in all fields.');
      return;
    }
    
    if (strengthError || matchError) {
      Alert.alert('Error', 'Please correct the highlighted errors.');
      return;
    }

    try {
      const newUser = await insertUser(db, name, email, password); 
      Alert.alert('Success', 'Account created successfully!');
      if (onSignUp) onSignUp(newUser); 
    } catch (error) {
      if (error.message.includes('already registered')) {
        Alert.alert('Signup Failed', error.message);
      } else {
        console.error('Signup database error:', error); 
        Alert.alert('Signup Error', 'An error occurred during signup. Please try again.');
      }
    }
  };

  const isButtonDisabled = !!passwordError || !!confirmPasswordError || !name || !email || !password || !confirmPassword;
  const buttonColors = isButtonDisabled ? ['#CCCCCC', '#999999'] : [Colors.orangeAccent, Colors.redAccent];
  const getInputContainerStyle = (isFocused, isError) => [
    styles.inputContainer,
    isFocused && styles.inputFocused,
    isError && styles.inputError
  ];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />

      <LinearGradient
        colors={['rgba(255,140,0,0.3)', 'rgba(255,69,0,0.3)']}
        style={styles.diagonalWave}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      <KeyboardAvoidingView
        style={styles.wrapper}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.content}>
          <Animated.View style={{ transform: [{ scale: logoScale }], marginBottom: 36 }}>
            <Image 
              source={require('../assets/logo.gif')} 
              style={styles.logoImage} 
              resizeMode="cover" 
            />
          </Animated.View>

          <Text style={styles.title}>CREATE ACCOUNT</Text>
          <Text style={styles.subtitle}>Join Smart Reminder today</Text>

          <View style={getInputContainerStyle(isNameFocused, false)}>
            <TextInput
              style={styles.textInput}
              placeholder="Full Name"
              placeholderTextColor={Colors.textSecondary}
              value={name}
              onChangeText={setName}
              onFocus={() => setIsNameFocused(true)}
              onBlur={() => setIsNameFocused(false)}
            />
          </View>
          <View style={styles.errorPlaceholder} />

          <View style={getInputContainerStyle(isEmailFocused, false)}>
            <TextInput
              style={styles.textInput}
              placeholder="Email"
              placeholderTextColor={Colors.textSecondary}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              onFocus={() => setIsEmailFocused(true)}
              onBlur={() => setIsEmailFocused(false)}
            />
          </View>
          <View style={styles.errorPlaceholder} />

          <View style={getInputContainerStyle(isPasswordFocused, !!passwordError)}>
            <TextInput
              style={styles.passwordInput}
              placeholder="Password"
              placeholderTextColor={Colors.textSecondary}
              value={password}
              onChangeText={handlePasswordChange}
              secureTextEntry={!isPasswordVisible}
              onFocus={() => setIsPasswordFocused(true)}
              onBlur={() => setIsPasswordFocused(false)}
            />
            <TouchableOpacity onPress={() => setIsPasswordVisible(!isPasswordVisible)} style={styles.iconButton}>
              {isPasswordVisible 
                ? <EyeOff size={22} color={Colors.textSecondary} /> 
                : <Eye size={22} color={Colors.textSecondary} />
              }
            </TouchableOpacity>
          </View>
          {passwordError ? <Text style={styles.errorText}>{passwordError}</Text> : <View style={styles.errorPlaceholder} />}

          <View style={getInputContainerStyle(isConfirmPasswordFocused, !!confirmPasswordError)}>
            <TextInput
              style={styles.passwordInput}
              placeholder="Confirm Password"
              placeholderTextColor={Colors.textSecondary}
              value={confirmPassword}
              onChangeText={handleConfirmPasswordChange}
              secureTextEntry={!isConfirmPasswordVisible}
              onFocus={() => setIsConfirmPasswordFocused(true)}
              onBlur={() => setIsConfirmPasswordFocused(false)}
            />
            <TouchableOpacity onPress={() => setIsConfirmPasswordVisible(!isConfirmPasswordVisible)} style={styles.iconButton}>
              {isConfirmPasswordVisible 
                ? <EyeOff size={22} color={Colors.textSecondary} /> 
                : <Eye size={22} color={Colors.textSecondary} />
              }
            </TouchableOpacity>
          </View>
          {confirmPasswordError ? <Text style={styles.errorText}>{confirmPasswordError}</Text> : <View style={styles.errorPlaceholder} />}

          <TouchableOpacity 
            onPress={handleSignUp} 
            style={[styles.buttonWrapper, isButtonDisabled && styles.disabledButtonWrapper]}
            disabled={isButtonDisabled}
          >
            <LinearGradient
              colors={buttonColors}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.button}
            >
              <Text style={styles.buttonText}>Sign Up</Text>
            </LinearGradient>
          </TouchableOpacity>

          <View style={styles.loginContainer}>
            <Text style={styles.loginText}>Already have an account? </Text>
            <TouchableOpacity onPress={onBackToLogin}>
              <Text style={styles.loginLink}>Login</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Developed by Mawii</Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  diagonalWave: {
    position: 'absolute',
    width: width * 2,
    height: height * 0.4,
    bottom: -height * 0.1,
    left: -width * 0.5,
    borderRadius: width,
    transform: [{ rotate: '-10deg' }],
    opacity: 0.5,
  },
  wrapper: { flex: 1, justifyContent: 'space-between', alignItems: 'center', paddingVertical: 20 },
  content: { width: '85%', alignItems: 'center', marginTop: 20 },
  logoImage: { width: 140, height: 140, borderRadius: 70 },
  title: { fontSize: 30, fontWeight: '800', color: Colors.textPrimary, letterSpacing: 0.5, marginBottom: 4, textAlign: 'center' },
  subtitle: { fontSize: 16, color: Colors.textSecondary, marginBottom: 30, textAlign: 'center' },
  inputContainer: { width: '100%', flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.inputBackground, borderRadius: 12, borderWidth: 1, borderColor: 'transparent', paddingHorizontal: 8 },
  inputFocused: { borderColor: Colors.inputBorder, backgroundColor: Colors.background },
  inputError: { borderColor: Colors.error },
  textInput: { flex: 1, color: Colors.textPrimary, paddingHorizontal: 18, paddingVertical: 14, fontSize: 16, height: 50 },
  passwordInput: { flex: 1, color: Colors.textPrimary, paddingHorizontal: 18, paddingVertical: 14, fontSize: 16, height: 50 },
  iconButton: { padding: 10, marginRight: 8 },
  errorText: { color: Colors.error, fontSize: 12, marginBottom: 2, alignSelf: 'flex-start', width: '100%', paddingHorizontal: 5, height: 18 },
  errorPlaceholder: { marginBottom: 2, height: 18 },
  buttonWrapper: { width: '100%', borderRadius: 14, overflow: 'hidden', marginBottom: 20, marginTop: 5 },
  disabledButtonWrapper: { opacity: 0.6 },
  button: { paddingVertical: 16, alignItems: 'center', borderRadius: 14 },
  buttonText: { color: '#FFFFFF', fontSize: 18, fontWeight: '700' },
  loginContainer: { flexDirection: 'row', alignItems: 'center' },
  loginText: { color: Colors.textSecondary, fontSize: 14 },
  loginLink: { color: Colors.orangeAccent, fontSize: 14, fontWeight: '600' },
  footer: { paddingBottom: 10 },
  footerText: { fontSize: 12, color: Colors.textSecondary, textAlign: 'center' }
});

export default SignUpScreen;