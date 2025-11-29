import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch, Image, Animated, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { useSQLiteContext } from 'expo-sqlite';
import { updateProfilePicture } from '../services/Database';
import { User, Camera, Moon, Sun, Bell, LogOut, Mail, ChevronRight, Shield } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';
import CustomAlert from '../components/CustomAlert';

const ProfileScreen = ({ user, onLogout }) => {
    const db = useSQLiteContext();
    const { theme, toggleTheme, colors, isNotificationsEnabled, toggleNotifications } = useTheme();
    
    const [profilePicture, setProfilePicture] = useState(user?.profile_picture);
    
    // --- Alert & Toast State ---
    const [alertConfig, setAlertConfig] = useState({ visible: false, title: '', message: '', type: 'info', buttons: [] });
    const [toastMessage, setToastMessage] = useState(null);
    const fadeAnim = useRef(new Animated.Value(0)).current;

    const showAlert = (title, message, type = 'info', buttons = []) => {
        setAlertConfig({ visible: true, title, message, type, buttons });
    };

    const closeAlert = () => setAlertConfig(prev => ({ ...prev, visible: false }));

    const showToast = (message) => {
        setToastMessage(message);
        Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }).start();
        setTimeout(() => {
            Animated.timing(fadeAnim, { toValue: 0, duration: 300, useNativeDriver: true }).start(() => setToastMessage(null));
        }, 2000);
    };

    // --- Handlers ---
    const handleThemeSwitch = () => {
        toggleTheme();
        const newMode = theme === 'light' ? 'Dark Mode' : 'Light Mode';
        showToast(`${newMode} Enabled`);
    };

    const handleNotificationSwitch = () => {
        toggleNotifications();
        showToast(`Notifications turned ${!isNotificationsEnabled ? 'On' : 'Off'}`);
    };

    const handleLogoutPress = () => {
        showAlert(
            'Logout',
            'Are you sure you want to log out?',
            'info',
            [
                { text: 'Cancel', style: 'cancel', onPress: closeAlert },
                { text: 'Logout', onPress: () => { closeAlert(); onLogout(); } }
            ]
        );
    };
    
    const pickImage = async () => {
        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 1,
        });
    
        if (!result.canceled) {
            const newUri = result.assets[0].uri;
            setProfilePicture(newUri);
            try {
                await updateProfilePicture(db, user.id, newUri);
                showToast("Profile picture updated");
            } catch (error) {
                console.error("Failed to update profile picture:", error);
                showAlert('Error', 'Could not save profile picture.', 'error');
            }
        }
    };

    // --- Components ---
    const SettingItem = ({ icon: Icon, label, value, onToggle, type = 'switch' }) => (
        <View style={[styles.settingItem, { borderBottomColor: colors.border }]}>
            <View style={styles.settingLeft}>
                <View style={[styles.iconContainer, { backgroundColor: colors.inputBackground }]}>
                    <Icon size={20} color={colors.textPrimary} />
                </View>
                <Text style={[styles.settingLabel, { color: colors.textPrimary }]}>{label}</Text>
            </View>
            {type === 'switch' ? (
                <Switch
                    trackColor={{ false: colors.border, true: colors.accentOrange }}
                    thumbColor={'#fff'}
                    onValueChange={onToggle}
                    value={value}
                />
            ) : (
                <ChevronRight size={20} color={colors.textSecondary} />
            )}
        </View>
    );

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'left', 'right']}>
            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                
                <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>My Profile</Text>

                {/* Profile Card */}
                <LinearGradient
                    colors={[colors.accentOrange, colors.progressRed]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.profileCard}
                >
                    <View style={styles.profileHeader}>
                        <TouchableOpacity onPress={pickImage} activeOpacity={0.8}>
                            <View style={styles.avatarWrapper}>
                                {profilePicture ? (
                                    <Image source={{ uri: profilePicture }} style={styles.avatar} />
                                ) : (
                                    <View style={[styles.avatarPlaceholder, { backgroundColor: colors.card }]}>
                                        <User size={40} color={colors.textSecondary} />
                                    </View>
                                )}
                                <View style={[styles.editBadge, { backgroundColor: colors.card }]}>
                                    <Camera size={14} color={colors.textPrimary} />
                                </View>
                            </View>
                        </TouchableOpacity>
                        <View style={styles.userInfo}>
                            <Text style={styles.userName}>{user.name}</Text>
                            <View style={styles.emailContainer}>
                                <Mail size={14} color="rgba(255,255,255,0.8)" style={{ marginRight: 6 }} />
                                <Text style={styles.userEmail}>{user.email}</Text>
                            </View>
                        </View>
                    </View>
                </LinearGradient>

                {/* Preferences Section */}
                <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Preferences</Text>
                <View style={[styles.settingsContainer, { backgroundColor: colors.card }]}>
                    <SettingItem 
                        icon={theme === 'dark' ? Moon : Sun} 
                        label="Dark Mode" 
                        value={theme === 'dark'} 
                        onToggle={handleThemeSwitch} 
                    />
                    <SettingItem 
                        icon={Bell} 
                        label="Notifications" 
                        value={isNotificationsEnabled} 
                        onToggle={handleNotificationSwitch} 
                    />
                </View>

                {/* Account Section */}
                <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Account</Text>
                <View style={[styles.settingsContainer, { backgroundColor: colors.card }]}>
                    <TouchableOpacity style={styles.logoutButton} onPress={handleLogoutPress}>
                        <View style={styles.settingLeft}>
                            <View style={[styles.iconContainer, { backgroundColor: colors.cancelRed + '15' }]}>
                                <LogOut size={20} color={colors.cancelRed} />
                            </View>
                            <Text style={[styles.settingLabel, { color: colors.cancelRed }]}>Log Out</Text>
                        </View>
                    </TouchableOpacity>
                </View>

                <View style={styles.footer}>
                    <Text style={[styles.versionText, { color: colors.textSecondary }]}>App Version 1.0.0</Text>
                </View>

            </ScrollView>

            {/* Toast */}
            {toastMessage && (
                <Animated.View style={[
                    styles.toastContainer, 
                    { opacity: fadeAnim, backgroundColor: colors.card, borderColor: colors.border }
                ]}>
                    <Text style={[styles.toastText, { color: colors.textPrimary }]}>{toastMessage}</Text>
                </Animated.View>
            )}

            <CustomAlert 
                visible={alertConfig.visible}
                title={alertConfig.title}
                message={alertConfig.message}
                type={alertConfig.type}
                buttons={alertConfig.buttons}
                onClose={closeAlert}
            />
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 10,
        paddingBottom: 40,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 20,
        marginTop: 10,
    },
    // Profile Card
    profileCard: {
        borderRadius: 24,
        padding: 24,
        marginBottom: 30,
        shadowColor: '#FF9500',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.25,
        shadowRadius: 15,
        elevation: 8,
    },
    profileHeader: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    avatarWrapper: {
        position: 'relative',
        marginRight: 20,
    },
    avatar: {
        width: 70,
        height: 70,
        borderRadius: 35,
        borderWidth: 3,
        borderColor: 'rgba(255,255,255,0.3)',
    },
    avatarPlaceholder: {
        width: 70,
        height: 70,
        borderRadius: 35,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 3,
        borderColor: 'rgba(255,255,255,0.3)',
    },
    editBadge: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        padding: 6,
        borderRadius: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 3,
        elevation: 3,
    },
    userInfo: {
        flex: 1,
    },
    userName: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#FFF',
        marginBottom: 4,
    },
    emailContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    userEmail: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.9)',
    },
    
    // Settings
    sectionTitle: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 10,
        marginLeft: 5,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    settingsContainer: {
        borderRadius: 16,
        overflow: 'hidden',
        marginBottom: 25,
    },
    settingItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 16,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
    },
    settingLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    iconContainer: {
        width: 36,
        height: 36,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    settingLabel: {
        fontSize: 16,
        fontWeight: '500',
    },
    logoutButton: {
        paddingVertical: 16,
        paddingHorizontal: 16,
    },
    
    // Footer
    footer: {
        alignItems: 'center',
        marginTop: 10,
    },
    versionText: {
        fontSize: 12,
    },

    // Toast
    toastContainer: {
        position: 'absolute',
        bottom: 50,
        alignSelf: 'center',
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 30,
        borderWidth: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 5,
    },
    toastText: {
        fontSize: 14,
        fontWeight: '600',
    }
});

export default ProfileScreen;